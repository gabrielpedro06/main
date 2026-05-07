import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../services/supabase";
import PropostasFinanciamento from "./PropostasFinanciamento";
import PropostasFormacao from "./PropostasFormacao";
import "./../styles/dashboard.css";

const normalizeCliente = (item) => ({
  ...item,
  nome: item.marca || item.nome || "",
  nipc: item.nipc || item.nif || "",
  sigla: item.sigla || (item.marca || item.nome || "").substring(0, 3).toUpperCase(),
});

export default function PropostasComerciais() {
  const { id: propostaId } = useParams();
  const [empresasConsultoras, setEmpresasConsultoras] = useState([]);
  const [selectedEmpresaId, setSelectedEmpresaId] = useState("");
  const [tipoProposta, setTipoProposta] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadEmpresas = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("clientes")
          .select("*")
          .eq("ativo", true)
          .order("marca", { ascending: true });

        if (error) throw error;

        const clientesAtivos = (data || []).map(normalizeCliente);
        const hasConsultoraFlag = clientesAtivos.some((item) => typeof item.eh_empresa_consultora === "boolean");
        const consultoras = hasConsultoraFlag
          ? clientesAtivos.filter((item) => item.eh_empresa_consultora === true)
          : clientesAtivos;

        setEmpresasConsultoras(consultoras);

        if (propostaId) {
          const { data: propostaData, error: propostaError } = await supabase
            .from("propostas_comerciais")
            .select("empresa_consultora_id, payload")
            .eq("id", propostaId)
            .single();

          if (propostaError) throw propostaError;

          const payload = typeof propostaData?.payload === "string"
            ? JSON.parse(propostaData.payload)
            : propostaData?.payload || {};
          const empresaId = propostaData?.empresa_consultora_id || payload?.empresa_consultora?.id || "";
          const empresa = consultoras.find((item) => String(item.id) === String(empresaId));

          setSelectedEmpresaId(empresaId);
          setTipoProposta(resolveTipoProposta(empresa, payload));
        }
      } catch (error) {
        console.error("Erro ao preparar propostas comerciais:", error);
      } finally {
        setIsLoading(false);
      }
    };

    void loadEmpresas();
  }, [propostaId]);

  const empresasOrdenadas = useMemo(
    () =>
      [...empresasConsultoras].sort((a, b) =>
        String(a?.nome || "").localeCompare(String(b?.nome || ""), "pt-PT", { sensitivity: "base" })
      ),
    [empresasConsultoras]
  );

  const resolveTipoProposta = (empresa, payload = {}) => {
    const payloadTipo = String(payload?.tipo_proposta || payload?.proposta?.tipo || "").toLowerCase();
    if (payloadTipo.includes("form")) return "formacao";
    if (payloadTipo.includes("financ")) return "financiamento";
    return empresa?.tem_cursos ? "formacao" : "financiamento";
  };

  const handleSelectEmpresa = (empresaId) => {
    setSelectedEmpresaId(empresaId);
    const empresa = empresasConsultoras.find((item) => String(item.id) === String(empresaId));
    setTipoProposta(empresaId ? resolveTipoProposta(empresa) : "");
  };

  const handleEmpresaConsultoraChange = (empresa) => {
    if (!empresa?.id) return;
    setSelectedEmpresaId(empresa.id);
    setTipoProposta(resolveTipoProposta(empresa));
  };

  if (isLoading) {
    return (
      <div className="page-container" style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "80vh" }}>
        <div className="pulse-dot-white" style={{ background: "var(--color-btnPrimary)" }}></div>
      </div>
    );
  }

  if (!tipoProposta) {
    return (
      <div className="page-container" style={{ maxWidth: 900, margin: "0 auto" }}>
        <section className="card propostas-section">
          <div className="section-heading">Nova Proposta Comercial</div>
          <div className="field-grid field-grid-1">
            <div className="field">
              <label>Empresa consultora</label>
              <select value={selectedEmpresaId} onChange={(event) => handleSelectEmpresa(event.target.value)}>
                <option value="">Selecionar empresa para continuar</option>
                {empresasOrdenadas.map((empresa) => (
                  <option key={empresa.id} value={empresa.id}>
                    {empresa.nome} - {empresa.tem_cursos ? "Cursos/Formacao" : "Financiamento"}
                  </option>
                ))}
              </select>
              <div className="field-hint">
                Os campos seguintes sao escolhidos automaticamente conforme a empresa selecionada.
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (tipoProposta === "formacao") {
    return (
      <PropostasFormacao
        propostaId={propostaId}
        initialEmpresaConsultoraId={selectedEmpresaId}
        onEmpresaConsultoraChange={handleEmpresaConsultoraChange}
      />
    );
  }

  return (
    <PropostasFinanciamento
      propostaId={propostaId}
      initialEmpresaConsultoraId={selectedEmpresaId}
      onEmpresaConsultoraChange={handleEmpresaConsultoraChange}
    />
  );
}
