// =====================================================================
// "Como correu a chamada?" (CRM das Leads).
// Quando se toca num número na ficha, crm.js guarda a chamada
// (iniciarChamada). Ao voltar à app (separador visível de novo / janela com
// foco, pelo menos 4 s depois), abre esta janela: resultado, nota e próximo
// passo. Grava em marketing_leads_interacoes (tipo "chamada"); "Atendeu"
// numa lead em Novo passa-a para Contactado.
// =====================================================================
import { useEffect, useState } from "react";
import { supabase } from "../../services/supabase";
import { toast } from "../../utils/toast";
import Janela from "../Janela";
import { chamadaPendente, esquecerChamada, haQuanto } from "./crm";
import { Ic } from "./crmIcones";

const RESULTADOS = [
  { valor: "atendeu", label: "Atendeu", texto: "Atendeu" },
  { valor: "nao", label: "Não atendeu", texto: "Não atendeu" },
  { valor: "voicemail", label: "Caixa de correio", texto: "Deixei mensagem na caixa de correio" },
  { valor: "errado", label: "Número errado", texto: "Número errado / não existe" },
];

const somarDias = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const PROXIMOS = [
  { label: "Sem próximo passo", dias: null },
  { label: "Amanhã", dias: 1 },
  { label: "Daqui a 3 dias", dias: 3 },
  { label: "Daqui a 1 semana", dias: 7 },
];

/**
 * @param {object} props
 * @param {object[]} props.leads
 * @param {string} props.userId
 * @param {(lead: object, patch: object, opcoes?: object) => Promise<boolean>} props.onPatch
 * @param {(lead: object, estado: string) => void} props.onMudarEtapa
 */
export default function RegistoChamada({ leads, userId, onPatch, onMudarEtapa }) {
  const [chamada, setChamada] = useState(null);
  const [resultado, setResultado] = useState("atendeu");
  const [nota, setNota] = useState("");
  const [proximo, setProximo] = useState(null); // dias
  const [proximoTexto, setProximoTexto] = useState("");
  const [aGravar, setAGravar] = useState(false);

  // ao voltar à app depois de tocar num número
  useEffect(() => {
    const verificar = () => {
      if (document.visibilityState !== "visible") return;
      const c = chamadaPendente();
      if (!c || Date.now() - c.em < 4000) return;
      setChamada((atual) => atual || c);
    };
    document.addEventListener("visibilitychange", verificar);
    window.addEventListener("focus", verificar);
    verificar(); // ex.: a página foi recarregada depois da chamada
    return () => {
      document.removeEventListener("visibilitychange", verificar);
      window.removeEventListener("focus", verificar);
    };
  }, []);

  const fechar = () => {
    esquecerChamada();
    setChamada(null);
    setResultado("atendeu"); setNota(""); setProximo(null); setProximoTexto("");
  };

  const lead = chamada ? leads.find((l) => String(l.id) === String(chamada.leadId)) : null;

  // sugestão de próximo passo conforme o resultado
  const escolherResultado = (r) => {
    setResultado(r);
    if (r === "nao" || r === "voicemail") { setProximo((p) => p ?? 1); setProximoTexto((t) => t || "Voltar a ligar"); }
  };

  async function registar(e) {
    e?.preventDefault();
    if (!lead) { fechar(); return; }
    const r = RESULTADOS.find((x) => x.valor === resultado);
    const quem = chamada.pessoa ? ` (${chamada.pessoa})` : "";
    const texto = `${r.texto}${quem}${nota.trim() ? ` — ${nota.trim()}` : ""}`;
    setAGravar(true);
    const { data, error } = await supabase
      .from("marketing_leads_interacoes")
      .insert([{ lead_id: lead.id, tipo: "chamada", texto, autor_id: userId }])
      .select("id, feito_em")
      .single();
    setAGravar(false);
    if (error) { toast("Não foi possível registar: " + error.message, { tipo: "erro" }); return; }

    const mudancas = { ultimo_contacto_em: data.feito_em };
    await onPatch(lead, mudancas, { soEcra: true });
    if (proximo != null) {
      await onPatch(lead, { proxima_acao: proximoTexto.trim() || "Voltar a ligar", proxima_acao_em: somarDias(proximo) });
    }
    if (resultado === "atendeu" && lead.estado === "novo") onMudarEtapa(lead, "contactado");
    window.dispatchEvent(new CustomEvent("crm-historico", { detail: { leadId: lead.id } }));
    toast("Chamada registada.");
    fechar();
  }

  if (!chamada) return null;

  return (
    <Janela
      aberta
      aoFechar={fechar}
      bloquear={aGravar}
      largura={500}
      camada="calc(var(--z-modal) + 45)"
      icone={<Ic.Phone />}
      titulo="Como correu a chamada?"
      subtitulo={<>{chamada.leadNome}{chamada.pessoa ? ` · ${chamada.pessoa}` : ""} · {haQuanto(new Date(chamada.em).toISOString()) === "hoje" ? "agora há pouco" : haQuanto(new Date(chamada.em).toISOString())}</>}
      rodape={<>
        <button type="button" onClick={fechar}>Não registar</button>
        <button type="submit" form="crm-chamada" className="is-primary" disabled={aGravar || !lead}>{aGravar ? "A registar…" : "Registar"}</button>
      </>}
    >
      <form id="crm-chamada" onSubmit={registar} className="crm-chamada">
        {!lead && <p className="crm-dica is-mau">Esta lead já não está na lista (arquivada ou filtrada).</p>}
        <div className="crm-chamada-res" role="radiogroup" aria-label="Resultado">
          {RESULTADOS.map((r) => (
            <button key={r.valor} type="button" role="radio" aria-checked={resultado === r.valor} className={`${resultado === r.valor ? "is-on" : ""} is-${r.valor}`} onClick={() => escolherResultado(r.valor)}>
              {r.label}
            </button>
          ))}
        </div>
        <textarea
          className="bz-campo"
          rows={3}
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          placeholder={resultado === "atendeu" ? "O que ficou combinado?" : "Nota (opcional)"}
          aria-label="Nota da chamada"
          autoFocus
        />
        <label className="bz-rotulo" style={{ marginTop: 4 }}>Próximo passo</label>
        <div className="crm-atalhos">
          {PROXIMOS.map((p) => (
            <button key={p.label} type="button" className={proximo === p.dias ? "is-on" : ""} onClick={() => setProximo(p.dias)}>{p.label}</button>
          ))}
        </div>
        {proximo != null && (
          <input className="bz-campo" value={proximoTexto} onChange={(e) => setProximoTexto(e.target.value)} placeholder="Ex.: voltar a ligar, enviar proposta…" aria-label="Próximo passo" />
        )}
      </form>
    </Janela>
  );
}
