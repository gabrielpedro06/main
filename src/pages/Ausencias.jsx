import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../services/supabase";
import { useAuth } from "../context/AuthContext";
import {
    calcularDiasUteis,
    buildToleranciasSkipSet,
    formatAbsenceTypeLabel,
    getAnnualVacationLimitFromProfile,
    isVacationType,
    isVacationBookingBeforeAnnualOpening,
    obterSaldoFeriasAnoComTransicao,
    parseLocalDate,
    validarSaldoFeriasParaIntervalo,
} from "../utils/feriasSaldo";
import CalculadoraKm from "../components/CalculadoraKm";
import "./../styles/dashboard.css";
import "../styles/absences.css";
import FancySelect from "../components/FancySelect";

// --- ÍCONES SVG PROFISSIONAIS ---
const Icons = {
  Sun: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>,
  Users: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>,
  User: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>,
  AlertTriangle: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>,
  Activity: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>,
  Heart: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>,
  BookOpen: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>,
  MinusCircle: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="8" y1="12" x2="16" y2="12"></line></svg>,
  FileText: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>,
  Scale: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="3" x2="12" y2="21"></line><path d="M3 11l4-4 4 4"></path><path d="M13 11l4-4 4 4"></path><path d="M4 11v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path></svg>,
  Briefcase: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>,
  Calendar: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>,
  Clock: ({ size = 14, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>,
  CheckCircle: ({ size = 48, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>,
  XCircle: ({ size = 48, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>,
  Info: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>,
  Eye: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>,
  Refresh: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"></polyline><polyline points="23 20 23 14 17 14"></polyline><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"></path></svg>,
  Plus: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>,
  Edit: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>,
  Trash: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>,
  Paperclip: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>,
  Close: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
};

const ModalPortal = ({ children }) => {
  return createPortal(children, document.body);
};

// --- TIPOS DE AUSÊNCIA: cor e ícone de cada um ---
const ABSENCE_TYPES = [
  "Férias",
  "Assistência à família",
  "Outros - Assuntos pessoais",
  "Ausência sem motivo - injustificada",
  "Doença, acidente e obrigação legal",
  "Casamento",
  "Deslocação a estabelecimento de ensino",
  "Licença maternal/paternal",
  "Licença sem vencimento",
  "Falecimento de familiar",
  "Prestação de provas de avaliação",
  "Candidato a cargo público",
];

const TYPE_META = {
  "Pedido de Km's": { Icon: Icons.Briefcase, c1: "color-mix(in srgb, var(--color-btnPrimary) 55%, #fff)", c2: "var(--color-btnPrimary)", hint: "Deslocação" },
  "Férias": { Icon: Icons.Sun, c1: "#fbbf24", c2: "#ea580c" },
  "Assistência à família": { Icon: Icons.Users, c1: "#60a5fa", c2: "#2563eb", hint: "Justificação legal" },
  "Outros - Assuntos pessoais": { Icon: Icons.User, c1: "#94a3b8", c2: "#475569", hint: "Assuntos pessoais" },
  "Ausência sem motivo - injustificada": { Icon: Icons.AlertTriangle, c1: "#f87171", c2: "#dc2626", hint: "Injustificada" },
  "Doença, acidente e obrigação legal": { Icon: Icons.Activity, c1: "#a78bfa", c2: "#7c3aed", hint: "Justificação legal" },
  "Casamento": { Icon: Icons.Heart, c1: "#f9a8d4", c2: "#db2777", hint: "Justificação legal" },
  "Deslocação a estabelecimento de ensino": { Icon: Icons.BookOpen, c1: "#67e8f9", c2: "#0891b2", hint: "Justificação legal" },
  "Licença maternal/paternal": { Icon: Icons.Heart, c1: "#fda4af", c2: "#e11d48", hint: "Licença" },
  "Licença sem vencimento": { Icon: Icons.MinusCircle, c1: "#cbd5e1", c2: "#64748b", hint: "Licença" },
  "Falecimento de familiar": { Icon: Icons.MinusCircle, c1: "#64748b", c2: "#0f172a", hint: "Justificação legal" },
  "Prestação de provas de avaliação": { Icon: Icons.FileText, c1: "#5eead4", c2: "#0f766e", hint: "Justificação legal" },
  "Candidato a cargo público": { Icon: Icons.Scale, c1: "#a5b4fc", c2: "#4f46e5", hint: "Justificação legal" },
};
const getTypeMeta = (label) => TYPE_META[label] || { Icon: Icons.AlertTriangle, c1: "#fcd34d", c2: "#d97706", hint: "" };

const STATUS_META = {
  pendente: { label: "Pendente", tone: "warn" },
  aprovado: { label: "Aprovado", tone: "ok" },
  rejeitado: { label: "Rejeitado", tone: "bad" },
  cancelado: { label: "Cancelado", tone: "muted" },
  pedido_cancelamento: { label: "A cancelar", tone: "warn" },
};

function formatHourShort(value) {
    if (!value) return '--:--';
    const text = String(value);
    return text.slice(0, 5) || '--:--';
}

export default function Ferias({ forcedType = null }) {
    const KM_REQUEST_TYPE = "Pedido de Km's";
    const TOLERANCIA_TIPO = "Tolerância de Ponto";
    const TOLERANCIA_TIPOS = [
        TOLERANCIA_TIPO,
        "Tolerancia de Ponto",
        "tolerancia",
        "tolerância",
    ];
    const isKmOnlyMode = forcedType === KM_REQUEST_TYPE;

  const { user } = useAuth(); 
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [diasFerias, setDiasFerias] = useState(null); 
        const [diasFeriasDisponiveis, setDiasFeriasDisponiveis] = useState(null);
    const [diasFeriasTotal, setDiasFeriasTotal] = useState(null);
        const [dataAdmissao, setDataAdmissao] = useState(null);
    const [hasDiasFeriasTotalColumn, setHasDiasFeriasTotalColumn] = useState(true);
  const [tolerancias, setTolerancias] = useState([]);
  
  // 💡 NOVO: Estado para guardar os veículos do perfil
  const [meusVeiculos, setMeusVeiculos] = useState([]);
  
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
  const [confirmCancel, setConfirmCancel] = useState({ show: false, pedido: null });

  // ESTADOS PARA EDIÇÃO DE PEDIDO
  const [statusFilter, setStatusFilter] = useState('todos');
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // ESTADOS PARA ANEXAR DOCUMENTO A POSTERIORI
  const [uploadModal, setUploadModal] = useState({ show: false, pedido: null });
  const [uploadFile, setUploadFile] = useState(null);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);

  const [form, setForm] = useState({ 
      tipo: forcedType || "Férias", 
      data_inicio: "", 
      data_fim: "", 
      is_parcial: false, 
      hora_inicio: "", 
      hora_fim: "", 
      motivo: "",
      km_origem: "",
      km_destino: "",
      km_total: "",
      veiculo: "", // 💡 Adicionado campo de veículo
      km_ida_volta: false
  });
  const [file, setFile] = useState(null); 
  const [diasUteis, setDiasUteis] = useState(0); 

    // Sem a migração 051: guarda o "ida e volta" no texto do destino
    const isKmIdaVoltaMissing = (error) => /km_ida_volta/i.test(`${error?.message || ""} ${error?.details || ""}`) || error?.code === "PGRST204";
    const withoutIdaVolta = (payload) => {
        const { km_ida_volta, ...rest } = payload;
        if (km_ida_volta && rest.km_destino && !/ida e volta/i.test(rest.km_destino)) rest.km_destino = `${rest.km_destino} (ida e volta)`;
        return rest;
    };

    const isMissingColumnError = (error) => {
            if (!error) return false;
            return error.code === "42703" || /column .* does not exist/i.test(error.message || "");
    };

  useEffect(() => {
    if (user) {
        fetchPedidos();
        fetchDiasReais();
        fetchTolerancias();
    }
  }, [user]);

  useEffect(() => {
      if (!form.is_parcial && form.data_inicio && form.data_fim) {
          const skipDates = buildToleranciasSkipSet(tolerancias, user?.id || null);
          setDiasUteis(calcularDiasUteis(form.data_inicio, form.data_fim, skipDates));
      } 
      else if (form.is_parcial && form.data_inicio && form.hora_inicio && form.hora_fim) {
          // Lógica do pedido Parcial (Horas)
          const [hInicio, mInicio] = form.hora_inicio.split(':').map(Number);
          const [hFim, mFim] = form.hora_fim.split(':').map(Number);
          
          // Calcula a diferença em horas decimais (ex: 4h30 = 4.5)
          const diferencaHoras = (hFim - hInicio) + ((mFim - mInicio) / 60);

          if (diferencaHoras >= 8) {
              // Se for >= 8 horas, avisa e muda para dia completo
              setNotification({ 
                  show: true, 
                  message: "O intervalo inserido é de 8 horas ou mais. O pedido foi automaticamente alterado para um dia completo (Total).", 
                  type: "success" // Opcional: podes usar "success" ou "error" consoante o estilo visual desejado
              });
              
              setForm(prev => ({
                  ...prev,
                  is_parcial: false,
                  hora_inicio: "",
                  hora_fim: "",
                  data_fim: prev.data_inicio // Força a data de fim a ser igual à de início
              }));
          } else if (diferencaHoras > 0) {
              // Desconta as horas no formato de fração de dia (ex: 4h / 8 = 0.5 dias)
              setDiasUteis(diferencaHoras / 8);
          } else {
              setDiasUteis(0);
          }
      } else { 
          setDiasUteis(0); 
      }
  }, [form.data_inicio, form.data_fim, form.is_parcial, form.hora_inicio, form.hora_fim, tolerancias]);

  async function fetchDiasReais() {
      let data = null;
      let error = null;

      ({ data, error } = await supabase
          .from('profiles')
          .select('dias_ferias, dias_ferias_total, data_admissao, veiculos') // 💡 Adicionada query de veiculos
          .eq('id', user.id)
          .single());

      if (error && isMissingColumnError(error)) {
          setHasDiasFeriasTotalColumn(false);
          ({ data, error } = await supabase
              .from('profiles')
              .select('dias_ferias, data_admissao, veiculos') // Mantém veiculos no fallback
              .eq('id', user.id)
              .single());
      } else {
          setHasDiasFeriasTotalColumn(true);
      }

      if (error) {
          console.error("Erro ao carregar saldo de férias:", error);
          return;
      }

      if (data) {
          setDiasFerias(data.dias_ferias);
          setDiasFeriasTotal(getAnnualVacationLimitFromProfile(data));
          setDataAdmissao(data.data_admissao || null);
          const saldoAnual = await obterSaldoFeriasAnoComTransicao({
              supabaseClient: supabase,
              userId: user.id,
              ano: new Date().getFullYear(),
              diasLimiteAnual: getAnnualVacationLimitFromProfile(data),
              dataAdmissao: data.data_admissao,
              dataReferencia: new Date(),
              tolerancias,
          });
          setDiasFeriasDisponiveis(saldoAnual.diasDisponiveis);
          setMeusVeiculos(Array.isArray(data.veiculos) ? data.veiculos : []); // 💡 Guarda veículos
      }
  }

  async function fetchTolerancias() {
      try {
          const { data, error } = await supabase
              .from("ferias")
              .select("id, user_id, tipo, motivo, data_inicio, estado")
              .in("tipo", TOLERANCIA_TIPOS)
              .neq("estado", "cancelado")
              .neq("estado", "rejeitado")
              .or(`user_id.is.null,user_id.eq.${user.id}`);
          if (error) throw error;

          const mapped = (data || []).map((item) => ({
              id: item.id,
              user_id: item.user_id,
              nome: item.motivo || item.tipo || TOLERANCIA_TIPO,
              data: item.data_inicio,
          }));

          setTolerancias(mapped);
      } catch (err) {
          console.error("Erro ao carregar tolerâncias:", err);
      }
  }

  async function fetchPedidos() {
    setLoading(true);
        let query = supabase.from("ferias").select("*").eq("user_id", user.id);
        if (forcedType) {
            query = query.eq("tipo", forcedType);
        } else {
            query = query.neq("tipo", KM_REQUEST_TYPE);
        }
        const { data, error } = await query.order("created_at", { ascending: false });
    if (!error) setPedidos(data || []);
    setLoading(false);
  }

  const handleEditClick = (pedido) => {
      setIsEditing(true);
      setEditingId(pedido.id);
      setForm({
          tipo: pedido.tipo === KM_REQUEST_TYPE ? KM_REQUEST_TYPE : formatAbsenceTypeLabel(pedido.tipo),
          data_inicio: pedido.data_inicio,
          data_fim: pedido.data_fim,
          is_parcial: pedido.is_parcial || false,
          hora_inicio: pedido.hora_inicio || "",
          hora_fim: pedido.hora_fim || "",
          motivo: pedido.motivo || "",
          km_origem: pedido.km_origem || "",
          km_destino: pedido.km_destino || "",
          km_total: pedido.km_total ?? "",
          veiculo: pedido.veiculo || "", // 💡 Recupera o veículo ao editar
          km_ida_volta: Boolean(pedido.km_ida_volta)
      });
      setShowModal(true);
  };

  const handleCloseModal = () => {
      setShowModal(false);
      setIsEditing(false);
      setEditingId(null);
      setFile(null);
      setForm({ tipo: forcedType || "Férias", data_inicio: "", data_fim: "", is_parcial: false, hora_inicio: "", hora_fim: "", motivo: "", km_origem: "", km_destino: "", km_total: "", veiculo: "", km_ida_volta: false });
  };

  async function handleSubmit(e) {
    e.preventDefault();
        const normalizedTipo = form.tipo === KM_REQUEST_TYPE ? KM_REQUEST_TYPE : formatAbsenceTypeLabel(form.tipo);
        const isKmRequest = normalizedTipo === KM_REQUEST_TYPE;

    if (isKmRequest) {
        const kmTotal = Number(form.km_total);
        if (!form.data_inicio) {
            setNotification({ show: true, message: "Selecione a data da deslocação.", type: "error" });
            return;
        }
        if (!form.veiculo) { // 💡 Bloqueia se não escolheu carro
            setNotification({ show: true, message: "Selecione o veículo utilizado.", type: "error" });
            return;
        }
        if (!form.km_origem.trim() || !form.km_destino.trim()) {
            setNotification({ show: true, message: "Preencha os campos De e Para.", type: "error" });
            return;
        }
        if (!Number.isFinite(kmTotal) || kmTotal <= 0) {
            setNotification({ show: true, message: "Introduza um Km total válido.", type: "error" });
            return;
        }
    }

    if (!isKmRequest && !form.is_parcial && diasUteis === 0) {
        setNotification({ show: true, message: "O período selecionado contém apenas fins de semana ou feriados.", type: "error" });
        return;
    }
    
    if (!isKmRequest && !form.is_parcial && parseLocalDate(form.data_inicio) > parseLocalDate(form.data_fim)) {
        setNotification({ show: true, message: "A data de fim não pode ser anterior à data de início.", type: "error" });
        return;
    }

    // 💡 NOVA VALIDAÇÃO: Bloquear sobreposição de datas
    if (!isKmRequest) {
        const startNovo = form.data_inicio;
        const endNovo = form.is_parcial ? form.data_inicio : (form.data_fim || form.data_inicio);

        const hasOverlap = pedidos.some(p => {
            // 1. Ignorar o próprio pedido se estivermos a editar
            if (isEditing && p.id === editingId) return false;
            
            // 2. Ignorar pedidos que já foram rejeitados ou cancelados
            if (['rejeitado', 'cancelado'].includes(p.estado?.toLowerCase())) return false;
            
            // 3. Ignorar pedidos de Km's (pode registar kms num dia em que faltou/teve ausência parcial)
            if (p.tipo === KM_REQUEST_TYPE) return false;

            const startExistente = p.data_inicio;
            const endExistente = p.is_parcial ? p.data_inicio : (p.data_fim || p.data_inicio);

            // 4. Lógica matemática de sobreposição de intervalos
            return startNovo <= endExistente && endNovo >= startExistente;
        });

        if (hasOverlap) {
            setNotification({ 
                show: true, 
                message: "Já tem um pedido registado e ativo para estas datas. Por favor, verifique o seu histórico.", 
                type: "error" 
            });
            return;
        }
    }

    const isVacationRequest = !isKmRequest && isVacationType(normalizedTipo);
    if (isVacationRequest) {
        if (isVacationBookingBeforeAnnualOpening(form.data_inicio)) {
            setNotification({
                show: true,
                message: "A marcação de férias para o ano seguinte só fica disponível a partir de 1 de dezembro.",
                type: "error",
            });
            return;
        }

        if (!hasDiasFeriasTotalColumn) {
            const saldoAtual = Number(diasFerias) || 0;
            if (diasUteis > saldoAtual) {
                setNotification({
                    show: true,
                    message: saldoAtual <= 0
                        ? "Não tem férias disponíveis e, por isso, o pedido não pode avançar."
                        : `Saldo insuficiente: pedido de ${diasUteis} dia(s), disponível ${saldoAtual}.`,
                    type: "error",
                });
                return;
            }
        } else {
            const saldoCheck = await validarSaldoFeriasParaIntervalo({
                supabaseClient: supabase,
                userId: user.id,
                dataInicio: form.data_inicio,
                dataFim: form.data_fim || form.data_inicio, // Proteção caso falhe
                is_parcial: form.is_parcial, // 💡 CORREÇÃO 0.5 DIAS
                hora_inicio: form.hora_inicio, // 💡 CORREÇÃO 0.5 DIAS
                hora_fim: form.hora_fim, // 💡 CORREÇÃO 0.5 DIAS
                excluirPedidoId: isEditing ? editingId : null, // 💡 IGNORAR SE FOR EDIÇÃO
                diasLimiteAnual: diasFeriasTotal ?? diasFerias,
                dataAdmissao,
                tolerancias,
            });

            if (!saldoCheck.ok) {
                setNotification({
                    show: true,
                    message: saldoCheck.diasDisponiveis <= 0
                        ? "Não tem férias disponíveis e, por isso, o pedido não pode avançar."
                        : `Saldo insuficiente para ${saldoCheck.ano}: pedido de ${saldoCheck.diasPedidoNoAno} dia(s), disponível ${saldoCheck.diasDisponiveis}.`,
                    type: "error",
                });
                return;
            }
        }
    }

    setIsSubmitting(true);
    try {
      let anexo_url = null;
      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}_${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from("rh_anexos").upload(fileName, file);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from("rh_anexos").getPublicUrl(fileName);
        anexo_url = publicUrl;
      } else if (isEditing) {
          const oldData = pedidos.find(p => p.id === editingId);
          anexo_url = oldData?.anexo_url || null;
      }
      
      const payload = { 
          user_id: user.id, 
          tipo: normalizedTipo,
          data_inicio: form.data_inicio,
          data_fim: isKmRequest ? form.data_inicio : (form.is_parcial ? form.data_inicio : form.data_fim), 
          is_parcial: isKmRequest ? false : form.is_parcial,
          hora_inicio: isKmRequest ? null : (form.is_parcial ? form.hora_inicio : null),
          hora_fim: isKmRequest ? null : (form.is_parcial ? form.hora_fim || null : null),
          motivo: form.motivo,
          km_origem: isKmRequest ? form.km_origem.trim() : null,
          km_destino: isKmRequest ? form.km_destino.trim() : null,
          km_total: isKmRequest ? Number(form.km_total) : null,
          veiculo: isKmRequest ? form.veiculo : null, // 💡 Adiciona o carro ao gravar
          km_ida_volta: isKmRequest ? Boolean(form.km_ida_volta) : false
      };

      if (anexo_url) payload.anexo_url = anexo_url;

      let dbError;
      let savedRequestId = editingId;
      if (isEditing) {
          payload.estado = 'pendente';
          let { error } = await supabase.from("ferias").update(payload).eq("id", editingId);
          if (error && isKmIdaVoltaMissing(error)) {
              ({ error } = await supabase.from("ferias").update(withoutIdaVolta(payload)).eq("id", editingId));
          }
          dbError = error;
      } else {
          payload.estado = 'pendente';
          let { data: savedRequest, error } = await supabase.from("ferias").insert([payload]).select("id").single();
          if (error && isKmIdaVoltaMissing(error)) {
              ({ data: savedRequest, error } = await supabase.from("ferias").insert([withoutIdaVolta(payload)]).select("id").single());
          }
          savedRequestId = savedRequest?.id || null;
          dbError = error;
      }

      if (dbError) throw dbError;

      try {
          const { data: adminProfiles, error: adminError } = await supabase
              .from("profiles")
              .select("id, role, tipo, ativo, email");
          if (adminError) throw adminError;

          const adminEmails = (adminProfiles || [])
              .filter((profile) => {
                  const roles = [profile.role, profile.tipo].map((value) => String(value || "").toLowerCase());
                  return profile.ativo !== false
                      && roles.some((role) => ["admin", "administrador"].includes(role))
                      && profile.email;
              })
              .map((profile) => profile.email.trim().toLowerCase())
              .filter((email, index, emails) => emails.indexOf(email) === index);

          const dateLabel = form.data_inicio ? new Date(form.data_inicio).toLocaleDateString("pt-PT") : "";
          if (adminEmails.length > 0 && savedRequestId) {
              const apiBase = import.meta.env.VITE_MARKETING_API_BASE || "";
              const requestUrl = `${window.location.origin}/dashboard/rh?pedidoId=${encodeURIComponent(savedRequestId)}`;
              const response = await fetch(`${apiBase}/api/absence-notifications/send-request`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                      emails: adminEmails,
                      requestType: normalizedTipo,
                      requesterName: user.user_metadata?.nome || user.email,
                      dateLabel,
                      requestUrl,
                      requestId: savedRequestId,
                      isEditing,
                      // Detalhes completos do pedido
                      details: {
                          data_inicio: form.data_inicio,
                          data_fim: isKmRequest ? form.data_inicio : (form.is_parcial ? form.data_inicio : form.data_fim),
                          is_parcial: form.is_parcial,
                          hora_inicio: form.is_parcial ? form.hora_inicio : null,
                          hora_fim: form.is_parcial ? form.hora_fim : null,
                          motivo: form.motivo,
                          km_origem: isKmRequest ? form.km_origem : null,
                          km_destino: isKmRequest ? form.km_destino : null,
                          km_total: isKmRequest ? form.km_total : null,
                          veiculo: isKmRequest ? form.veiculo : null,
                          km_ida_volta: isKmRequest ? Boolean(form.km_ida_volta) : false,
                          isKmRequest,
                      },
                  }),
              });
              if (!response.ok) throw new Error(`Dispatcher de email respondeu ${response.status}.`);
          }
      } catch (notificationError) {
          console.error("Erro ao enviar email aos administradores sobre pedido de ausência:", notificationError);
          // Pedido guardado mas email falhou — avisa o utilizador
          setNotification({ show: true, message: "O teu pedido foi guardado com sucesso, mas houve um problema ao enviar o email de notificação aos administradores. Podes contactá-los diretamente.", type: "error" });
          handleCloseModal();
          fetchPedidos();
          fetchDiasReais();
          return;
      }

      handleCloseModal();
      fetchPedidos();
      fetchDiasReais(); 
      setNotification({ show: true, message: isEditing ? "Pedido atualizado com sucesso!" : "Pedido enviado com sucesso para os Recursos Humanos!", type: "success" });
    } catch (error) {
      setNotification({ show: true, message: "Erro ao guardar pedido: " + error.message, type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  }
  // --- ANEXAR DOCUMENTO A POSTERIORI ---
  async function handleUploadOnly(e) {
      e.preventDefault();
      if (!uploadFile) return;
      
      setIsUploadingDoc(true);
      try {
          const fileExt = uploadFile.name.split('.').pop();
          const fileName = `${user.id}_doc_extra_${Date.now()}.${fileExt}`;
          
          const { error: uploadError } = await supabase.storage.from("rh_anexos").upload(fileName, uploadFile);
          if (uploadError) throw uploadError;
          
          const { data: { publicUrl } } = supabase.storage.from("rh_anexos").getPublicUrl(fileName);

          const { error: dbError } = await supabase.from("ferias").update({ anexo_url: publicUrl }).eq("id", uploadModal.pedido.id);
          if (dbError) throw dbError;

          fetchPedidos();
          setUploadModal({ show: false, pedido: null });
          setUploadFile(null);
          setNotification({ show: true, message: "Documento anexado com sucesso!", type: "success" });
      } catch (error) {
          setNotification({ show: true, message: "Erro ao enviar documento: " + error.message, type: "error" });
      } finally {
          setIsUploadingDoc(false);
      }
  }

  async function executarCancelamento() {
      const { pedido } = confirmCancel;
      try {
          const novoEstado = pedido.estado === 'pendente' ? 'cancelado' : 'pedido_cancelamento';
          const { error } = await supabase.from("ferias").update({ estado: novoEstado }).eq("id", pedido.id);
          if (error) throw error;
          fetchPedidos();
          setConfirmCancel({ show: false, pedido: null });
          setNotification({ show: true, message: novoEstado === 'cancelado' ? "Pedido cancelado com sucesso!" : "Pedido de cancelamento enviado aos RH.", type: "success" });
      } catch (error) {
          setNotification({ show: true, message: "Erro ao cancelar: " + error.message, type: "error" });
      }
  }

  // ==========================================
  // DERIVADOS PARA O NOVO LAYOUT
  // ==========================================
  const toLocal = (value) => (value ? parseLocalDate(value) : null);
  const fmtShort = (value) => {
      const d = toLocal(value);
      if (!d || Number.isNaN(d.getTime())) return '-';
      return d.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' }).replace('.', '');
  };
  const formatDate = (value) => {
      const d = toLocal(value);
      if (!d || Number.isNaN(d.getTime())) return '-';
      return d.toLocaleDateString('pt-PT');
  };
  const skipSet = buildToleranciasSkipSet(tolerancias, user?.id || null);
  const duracaoPedido = (p) => {
      if (p.tipo === KM_REQUEST_TYPE) return p.km_total != null ? `${p.km_total} km` : null;
      if (p.is_parcial) {
          if (!p.hora_inicio || !p.hora_fim) return 'Parcial';
          const [h1, m1] = String(p.hora_inicio).split(':').map(Number);
          const [h2, m2] = String(p.hora_fim).split(':').map(Number);
          const mins = (h2 * 60 + m2) - (h1 * 60 + m1);
          if (!(mins > 0)) return 'Parcial';
          return `${Math.floor(mins / 60)}h${mins % 60 ? String(mins % 60).padStart(2, '0') : ''}`;
      }
      if (!p.data_inicio) return null;
      const n = calcularDiasUteis(p.data_inicio, p.data_fim || p.data_inicio, skipSet);
      return `${n} ${n === 1 ? 'dia útil' : 'dias úteis'}`;
  };

  const estadoKey = (p) => String(p.estado || 'pendente').toLowerCase();
  const counts = {
      todos: pedidos.length,
      pendente: pedidos.filter((p) => ['pendente', 'pedido_cancelamento'].includes(estadoKey(p))).length,
      aprovado: pedidos.filter((p) => estadoKey(p) === 'aprovado').length,
      outros: pedidos.filter((p) => ['rejeitado', 'cancelado'].includes(estadoKey(p))).length,
  };
  const pedidosFiltrados = pedidos.filter((p) => {
      const k = estadoKey(p);
      if (statusFilter === 'pendente') return ['pendente', 'pedido_cancelamento'].includes(k);
      if (statusFilter === 'aprovado') return k === 'aprovado';
      if (statusFilter === 'outros') return ['rejeitado', 'cancelado'].includes(k);
      return true;
  });

  const anoAtual = new Date().getFullYear();
  const kmAprovadosAno = pedidos
      .filter((p) => estadoKey(p) === 'aprovado' && String(p.data_inicio || '').startsWith(String(anoAtual)))
      .reduce((acc, p) => acc + (Number(p.km_total) || 0), 0);

  const saldo = diasFeriasDisponiveis ?? diasFerias;
  const saldoTotal = Number(diasFeriasTotal) || 0;
  const saldoPct = saldoTotal > 0 && saldo != null ? Math.max(0, Math.min(100, (Number(saldo) / saldoTotal) * 100)) : 0;

  const openNewRequest = () => { setIsEditing(false); setEditingId(null); setShowModal(true); };

  const absenceTypeOptions = ABSENCE_TYPES.map((t) => {
      const meta = getTypeMeta(t);
      return {
          value: t,
          label: t,
          hint: isVacationType(t) ? 'Desconta no saldo de férias' : meta.hint,
          icon: <span className="fs-tile" style={{ '--t1': meta.c1, '--t2': meta.c2 }}><meta.Icon size={14} color="#fff" /></span>,
      };
  });
  const vehicleOptions = [
      ...meusVeiculos.map((v) => ({ value: v.matricula, label: v.matricula, hint: v.marca || 'Veículo registado', icon: <span className="ab-mini-plate"><i>P</i></span> })),
      { value: 'Outro (Não registado)', label: 'Outro veículo', hint: 'Não registado no perfil', icon: <span className="fs-tile" style={{ '--t1': '#cbd5e1', '--t2': '#64748b' }}><Icons.Briefcase size={13} color="#fff" /></span> },
  ];

  const renderDropzone = (current, onPick, required = false) => (
      <label
          className={`ab-drop ${current ? 'has-file' : ''}`}
          onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('is-over'); }}
          onDragLeave={(e) => e.currentTarget.classList.remove('is-over')}
          onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove('is-over'); const f = e.dataTransfer.files?.[0]; if (f) onPick(f); }}
      >
          <input type="file" accept=".pdf, image/*" hidden required={required && !current} onChange={(e) => { onPick(e.target.files?.[0] || null); e.target.value = ''; }} />
          <span className="ab-drop-icon"><Icons.Paperclip /></span>
          {current ? (
              <span className="ab-drop-text"><strong>{current.name}</strong><em>{(current.size / 1024 / 1024).toFixed(2)} MB · clica para trocar</em></span>
          ) : (
              <span className="ab-drop-text"><strong>Arrasta um ficheiro ou clica para escolher</strong><em>PDF, JPG ou PNG · máx. 5MB</em></span>
          )}
          {current && <button type="button" className="ab-icon-btn" onClick={(e) => { e.preventDefault(); onPick(null); }} aria-label="Remover ficheiro"><Icons.Close /></button>}
      </label>
  );

  return (
    <div className="page-container ab-page">

      {/* --- HERO --- */}
      <header className="ab-hero">
          <div className="ab-hero-glow" aria-hidden="true" />
          <div className="ab-hero-main">
              <span className="ab-eyebrow">{isKmOnlyMode ? 'Deslocações' : 'Tempo pessoal'}</span>
              <h1>{isKmOnlyMode ? 'Pedidos de Km\'s' : 'Férias & Ausências'}</h1>
              <p>{isKmOnlyMode ? 'Regista deslocações extra para aprovação dos RH.' : 'Marca férias, justifica ausências e acompanha os teus pedidos.'}</p>
              <button type="button" className="ab-cta" onClick={openNewRequest}>
                  <Icons.Plus /> {isKmOnlyMode ? 'Nova deslocação' : 'Novo pedido'}
              </button>
          </div>

          <div className="ab-hero-stats">
              {!isKmOnlyMode ? (
                  <div className="ab-balance" style={{ '--p': saldoPct }}>
                      <svg viewBox="0 0 44 44" aria-hidden="true">
                          <circle cx="22" cy="22" r="19" className="ab-ring-track" />
                          <circle cx="22" cy="22" r="19" className="ab-ring-fill" pathLength="100" />
                      </svg>
                      <div className="ab-balance-text">
                          <strong>{saldo ?? '--'}</strong>
                          <span>{saldoTotal ? `de ${saldoTotal} dias` : 'dias'}</span>
                      </div>
                  </div>
              ) : (
                  <div className="ab-stat ab-stat-big">
                      <strong>{kmAprovadosAno.toLocaleString('pt-PT')}</strong>
                      <span>km aprovados em {anoAtual}</span>
                  </div>
              )}
              <div className="ab-stat-col">
                  <div className="ab-stat"><strong>{counts.pendente}</strong><span>Pendentes</span></div>
                  <div className="ab-stat"><strong>{counts.aprovado}</strong><span>Aprovados</span></div>
              </div>
          </div>
      </header>
      {!isKmOnlyMode && (
          <p className="ab-hint"><Icons.Info size={14} /> Os dias de férias não gozados transitam até 31 de março do ano seguinte e depois expiram.</p>
      )}

      {/* --- HISTÓRICO --- */}
      <section className="ab-card">
          <div className="ab-card-head">
              <div>
                  <h2>O meu histórico</h2>
                  <p>{pedidos.length} {pedidos.length === 1 ? 'pedido' : 'pedidos'} no total</p>
              </div>
              <div className="ab-segment" role="tablist">
                  {[['todos', 'Todos'], ['pendente', 'Pendentes'], ['aprovado', 'Aprovados'], ['outros', 'Arquivados']].map(([key, label]) => (
                      <button key={key} type="button" role="tab" aria-selected={statusFilter === key} className={statusFilter === key ? 'is-on' : ''} onClick={() => setStatusFilter(key)}>
                          {label}<span>{counts[key]}</span>
                      </button>
                  ))}
              </div>
          </div>

          {loading ? (
              <div className="ab-list">
                  {[0, 1, 2].map((i) => <div key={i} className="ab-row ab-skeleton" />)}
              </div>
          ) : pedidosFiltrados.length > 0 ? (
              <div className="ab-list">
                  {pedidosFiltrados.map((p, idx) => {
                      const meta = getTypeMeta(p.tipo === KM_REQUEST_TYPE ? KM_REQUEST_TYPE : formatAbsenceTypeLabel(p.tipo));
                      const st = STATUS_META[estadoKey(p)] || STATUS_META.pendente;
                      const isKm = p.tipo === KM_REQUEST_TYPE;
                      const multi = !isKm && !p.is_parcial && p.data_fim && p.data_fim !== p.data_inicio;
                      const start = toLocal(p.data_inicio);
                      const dur = duracaoPedido(p);
                      const isClosed = ['rejeitado', 'cancelado'].includes(estadoKey(p));
                      return (
                          <article key={p.id} className={`ab-row ${isClosed ? 'is-closed' : ''}`} style={{ '--k': Math.min(idx, 12), '--t1': meta.c1, '--t2': meta.c2 }}>
                              <div className="ab-date" aria-hidden="true">
                                  <span className="ab-date-month">{start ? start.toLocaleDateString('pt-PT', { month: 'short' }).replace('.', '') : '--'}</span>
                                  <span className="ab-date-day">{start ? start.getDate() : '--'}</span>
                              </div>

                              <div className="ab-row-main">
                                  <div className="ab-row-title">
                                      <span className="ab-type-icon"><meta.Icon size={14} color="#fff" /></span>
                                      <strong>{isKm ? 'Deslocação' : (formatAbsenceTypeLabel(p.tipo) || '-')}</strong>
                                  </div>
                                  <div className="ab-row-meta">
                                      <span><Icons.Calendar size={13} />{multi ? `${fmtShort(p.data_inicio)} → ${fmtShort(p.data_fim)}` : formatDate(p.data_inicio)}</span>
                                      {p.is_parcial && <span><Icons.Clock size={13} />{formatHourShort(p.hora_inicio)}{p.hora_fim ? ` – ${formatHourShort(p.hora_fim)}` : ' (saída)'}</span>}
                                      {dur && <span className="ab-pill">{dur}</span>}
                                  </div>
                                  {isKm ? (
                                      <div className="ab-route">
                                          <span>{p.km_origem || '-'}</span><i className={p.km_ida_volta ? 'is-both' : ''} />
                                          <span>{p.km_destino || '-'}</span>
                                          {p.km_ida_volta && <span className="ab-pill ab-pill-trip">⇄ Ida e volta</span>}
                                          {p.veiculo && <em className="ab-mini-plate is-text"><i>P</i>{p.veiculo}</em>}
                                      </div>
                                  ) : null}
                                  {p.motivo && <p className="ab-row-note" title={p.motivo}>{p.motivo}</p>}
                              </div>

                              <div className="ab-row-side">
                                  <span className={`ab-status is-${st.tone}`}><span className="ab-status-dot" />{st.label}</span>
                                  <div className="ab-row-actions">
                                      {p.anexo_url ? (
                                          <>
                                              <a href={p.anexo_url} target="_blank" rel="noreferrer" className="ab-chip-btn" title="Ver documento"><Icons.Eye /> Documento</a>
                                              <button type="button" className="ab-icon-btn" onClick={() => setUploadModal({ show: true, pedido: p })} title="Substituir documento" aria-label="Substituir documento"><Icons.Refresh /></button>
                                          </>
                                      ) : !isClosed && (
                                          <button type="button" className="ab-chip-btn is-dashed" onClick={() => setUploadModal({ show: true, pedido: p })}><Icons.Paperclip /> Anexar</button>
                                      )}
                                      {p.estado === 'pendente' && (
                                          <>
                                              <button type="button" className="ab-icon-btn" onClick={() => handleEditClick(p)} title="Editar pedido" aria-label="Editar pedido"><Icons.Edit /></button>
                                              <button type="button" className="ab-icon-btn is-danger" onClick={() => setConfirmCancel({ show: true, pedido: p })} title="Cancelar pedido" aria-label="Cancelar pedido"><Icons.Trash /></button>
                                          </>
                                      )}
                                      {p.estado === 'aprovado' && (
                                          <button type="button" className="ab-chip-btn is-warn" onClick={() => setConfirmCancel({ show: true, pedido: p })} title="Pedir cancelamento aos RH"><Icons.Refresh /> Pedir cancelamento</button>
                                      )}
                                  </div>
                              </div>
                          </article>
                      );
                  })}
              </div>
          ) : (
              <div className="ab-empty">
                  <div className="ab-empty-icon">{isKmOnlyMode ? <Icons.Briefcase size={26} /> : <Icons.Sun size={26} />}</div>
                  <strong>{statusFilter === 'todos' ? (isKmOnlyMode ? 'Ainda não registaste deslocações' : 'Ainda não fizeste nenhum pedido') : 'Nada por aqui'}</strong>
                  <span>{statusFilter === 'todos' ? 'Quando fizeres um pedido, aparece aqui com o estado da aprovação.' : 'Não há pedidos neste filtro.'}</span>
                  {statusFilter === 'todos' && <button type="button" className="ab-btn ab-btn-primary" onClick={openNewRequest}><Icons.Plus /> {isKmOnlyMode ? 'Nova deslocação' : 'Novo pedido'}</button>}
              </div>
          )}
      </section>

      {/* MODAL DE NOVO / EDITAR PEDIDO */}
      {showModal && (
        <ModalPortal>
            <div className="ab-overlay" onClick={(e) => { if (e.target === e.currentTarget) handleCloseModal(); }}>
                {(() => {
                    const isKmRequest = form.tipo === KM_REQUEST_TYPE;
                    const meta = getTypeMeta(isKmRequest ? KM_REQUEST_TYPE : form.tipo);
                    const saldoOk = !isVacationType(form.tipo) || diasFeriasDisponiveis === null || diasFeriasDisponiveis > 0;
                    const summaryTone = diasUteis > 0 && saldoOk ? 'ok' : 'bad';
                    const summaryText = diasUteis > 0 && isVacationType(form.tipo) && diasFeriasDisponiveis !== null && diasFeriasDisponiveis <= 0
                        ? 'Não tens férias disponíveis para este período. O pedido não pode avançar.'
                        : diasUteis > 0
                            ? (isVacationType(form.tipo)
                                ? `Este pedido consome ${Number(diasUteis.toFixed(2))} dia(s) útil(eis) do teu saldo de férias.`
                                : `Corresponde a ${Number(diasUteis.toFixed(2))} dia(s) útil(eis). Sendo uma justificação legal, não desconta férias.`)
                            : (form.is_parcial && (!form.hora_inicio || !form.hora_fim))
                                ? 'Indica a hora de saída e de regresso para calcular o desconto.'
                                : form.is_parcial
                                    ? 'As horas não são válidas: o regresso tem de ser depois da saída.'
                                    : 'O período calha num fim de semana ou feriado. Não é preciso marcar.';
                    const submitBlocked = !isKmRequest && !form.is_parcial && diasUteis === 0;
                    return (
                        <form className={`ab-modal ${isKmRequest ? 'ab-modal-wide' : ''}`} onSubmit={handleSubmit} style={{ '--t1': meta.c1, '--t2': meta.c2 }}>
                            <div className="ab-modal-head">
                                <span className="ab-modal-icon"><meta.Icon size={20} color="#fff" /></span>
                                <div>
                                    <h3>{isEditing ? (isKmOnlyMode ? 'Editar deslocação' : 'Editar pedido') : (isKmOnlyMode ? 'Nova deslocação' : 'Novo pedido de ausência')}</h3>
                                    <p>{isKmOnlyMode ? 'Fica pendente até aprovação dos RH.' : 'Os RH recebem o pedido por email.'}</p>
                                </div>
                                <button type="button" className="ab-icon-btn" onClick={handleCloseModal} aria-label="Fechar"><Icons.Close /></button>
                            </div>

                            <div className="ab-modal-body">
                                {!isKmOnlyMode && (
                                    <div className="ab-field">
                                        <span className="ab-label">Motivo da ausência</span>
                                        <FancySelect
                                            value={form.tipo}
                                            onChange={(v) => setForm({ ...form, tipo: v })}
                                            options={absenceTypeOptions}
                                            className="ab-select"
                                            menuWidth={380}
                                            searchPlaceholder="Procurar motivo..."
                                            ariaLabel="Motivo da ausência"
                                        />
                                    </div>
                                )}

                                {isKmRequest ? (
                                    <>
                                        <div className="ab-grid">
                                            <div className="ab-field">
                                                <span className="ab-label">Data da deslocação</span>
                                                <input type="date" value={form.data_inicio} onChange={e => setForm({ ...form, data_inicio: e.target.value, data_fim: e.target.value })} required />
                                            </div>
                                            <div className="ab-field">
                                                <span className="ab-label">Veículo utilizado</span>
                                                <FancySelect
                                                    value={form.veiculo}
                                                    onChange={(v) => setForm({ ...form, veiculo: v })}
                                                    options={vehicleOptions}
                                                    placeholder="Escolher matrícula..."
                                                    className="ab-select"
                                                    menuWidth={300}
                                                    ariaLabel="Veículo utilizado"
                                                />
                                            </div>
                                        </div>
                                        <div className="ab-km">
                                            <CalculadoraKm form={form} setForm={setForm} />
                                        </div>
                                        <div className="ab-summary is-ok"><Icons.Info size={16} /><span>A deslocação vai para aprovação dos RH e fica refletida nos relatórios mensal individual e geral.</span></div>
                                    </>
                                ) : (
                                    <>
                                        <div className="ab-segment ab-segment-full" role="tablist">
                                            <button type="button" className={!form.is_parcial ? 'is-on' : ''} onClick={() => setForm({ ...form, is_parcial: false })}><Icons.Calendar size={14} /> Dias completos</button>
                                            <button type="button" className={form.is_parcial ? 'is-on' : ''} onClick={() => setForm({ ...form, is_parcial: true, data_fim: form.data_inicio })}><Icons.Clock size={14} /> Algumas horas</button>
                                        </div>

                                        {!form.is_parcial ? (
                                            <div className="ab-range">
                                                <div className="ab-field">
                                                    <span className="ab-label">De</span>
                                                    <input type="date" value={form.data_inicio} onChange={e => setForm({ ...form, data_inicio: e.target.value, data_fim: form.data_fim && form.data_fim >= e.target.value ? form.data_fim : e.target.value })} required />
                                                </div>
                                                <span className="ab-range-arrow" aria-hidden="true">→</span>
                                                <div className="ab-field">
                                                    <span className="ab-label">Até</span>
                                                    <input type="date" value={form.data_fim} min={form.data_inicio || undefined} onChange={e => setForm({ ...form, data_fim: e.target.value })} required />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="ab-grid ab-grid-3">
                                                <div className="ab-field">
                                                    <span className="ab-label">Dia</span>
                                                    <input type="date" value={form.data_inicio} onChange={e => setForm({ ...form, data_inicio: e.target.value, data_fim: e.target.value })} required />
                                                </div>
                                                <div className="ab-field">
                                                    <span className="ab-label">Saída</span>
                                                    <input type="time" value={form.hora_inicio} onChange={e => setForm({ ...form, hora_inicio: e.target.value })} required />
                                                </div>
                                                <div className="ab-field">
                                                    <span className="ab-label">Regresso</span>
                                                    <input type="time" value={form.hora_fim} onChange={e => setForm({ ...form, hora_fim: e.target.value })} required />
                                                </div>
                                            </div>
                                        )}

                                        {form.data_inicio && (
                                            <div className={`ab-summary is-${summaryTone}`} key={summaryText}>
                                                {summaryTone === 'ok' ? <Icons.Info size={16} /> : <Icons.AlertTriangle size={16} />}
                                                <span>{summaryText}</span>
                                                {diasUteis > 0 && <strong className="ab-summary-num">{Number(diasUteis.toFixed(2))}<small>{diasUteis === 1 ? 'dia' : 'dias'}</small></strong>}
                                            </div>
                                        )}
                                    </>
                                )}

                                <div className="ab-field">
                                    <span className="ab-label">Notas <em>opcional</em></span>
                                    <textarea rows="3" value={form.motivo} onChange={e => setForm({ ...form, motivo: e.target.value })} placeholder="Mais detalhes sobre o pedido..." />
                                </div>

                                <div className="ab-field">
                                    <span className="ab-label">Documento <em>opcional</em></span>
                                    {renderDropzone(file, setFile)}
                                </div>
                            </div>

                            <div className="ab-modal-foot">
                                <button type="button" className="ab-btn ab-btn-ghost" onClick={handleCloseModal}>Cancelar</button>
                                <button type="submit" className="ab-btn ab-btn-primary" disabled={isSubmitting || submitBlocked}>
                                    {isSubmitting ? <><span className="ab-spinner" />A enviar...</> : (isEditing ? <><Icons.Edit /> Guardar alterações</> : <><Icons.Plus /> Submeter pedido</>)}
                                </button>
                            </div>
                        </form>
                    );
                })()}
            </div>
        </ModalPortal>
      )}

      {/* MODAL: ANEXAR DOCUMENTO */}
      {uploadModal.show && (
          <ModalPortal>
              <div className="ab-overlay" onClick={(e) => { if (e.target === e.currentTarget) { setUploadModal({ show: false, pedido: null }); setUploadFile(null); } }}>
                  <form className="ab-modal ab-modal-sm" onSubmit={handleUploadOnly}>
                      <div className="ab-modal-head">
                          <span className="ab-modal-icon is-accent"><Icons.Paperclip /></span>
                          <div>
                              <h3>{uploadModal.pedido?.anexo_url ? 'Substituir documento' : 'Anexar documento'}</h3>
                              <p>Justificativo da ausência de {formatDate(uploadModal.pedido?.data_inicio)}.</p>
                          </div>
                          <button type="button" className="ab-icon-btn" onClick={() => { setUploadModal({ show: false, pedido: null }); setUploadFile(null); }} aria-label="Fechar"><Icons.Close /></button>
                      </div>
                      <div className="ab-modal-body">
                          {renderDropzone(uploadFile, setUploadFile, true)}
                      </div>
                      <div className="ab-modal-foot">
                          <button type="button" className="ab-btn ab-btn-ghost" onClick={() => { setUploadModal({ show: false, pedido: null }); setUploadFile(null); }}>Cancelar</button>
                          <button type="submit" className="ab-btn ab-btn-primary" disabled={isUploadingDoc || !uploadFile}>
                              {isUploadingDoc ? <><span className="ab-spinner" />A enviar...</> : 'Guardar documento'}
                          </button>
                      </div>
                  </form>
              </div>
          </ModalPortal>
      )}

      {/* CONFIRMAR CANCELAMENTO */}
      {confirmCancel.show && (
          <ModalPortal>
              <div className="ab-overlay" onClick={(e) => { if (e.target === e.currentTarget) setConfirmCancel({ show: false, pedido: null }); }}>
                  <div className="ab-dialog is-error" role="alertdialog">
                      <div className="ab-dialog-icon"><Icons.AlertTriangle size={26} /></div>
                      <h3>{confirmCancel.pedido?.estado === 'pendente' ? 'Cancelar pedido?' : 'Pedir cancelamento?'}</h3>
                      <p>{confirmCancel.pedido?.estado === 'pendente' ? 'O pedido pendente vai ser removido.' : 'Este pedido já foi aprovado. Vamos pedir aos RH que o cancelem e devolvam os dias.'}</p>
                      <div className="ab-dialog-actions">
                          <button type="button" className="ab-btn ab-btn-ghost" onClick={() => setConfirmCancel({ show: false, pedido: null })}>Voltar</button>
                          <button type="button" className="ab-btn ab-btn-danger" onClick={executarCancelamento}>Sim, cancelar</button>
                      </div>
                  </div>
              </div>
          </ModalPortal>
      )}

      {/* NOTIFICAÇÃO GLOBAL */}
      {notification.show && (
          <ModalPortal>
              <div className="ab-overlay ab-overlay-top" onClick={(e) => { if (e.target === e.currentTarget) setNotification({ show: false, message: '', type: 'success' }); }}>
                  <div className={`ab-dialog is-${notification.type}`} role="alertdialog">
                      <div className="ab-dialog-icon">{notification.type === 'success' ? <Icons.CheckCircle size={28} /> : <Icons.XCircle size={28} />}</div>
                      <h3>{notification.type === 'success' ? 'Feito!' : 'Atenção'}</h3>
                      <p>{notification.message}</p>
                      <button type="button" autoFocus className="ab-btn ab-btn-primary ab-btn-block" onClick={() => setNotification({ show: false, message: '', type: 'success' })}>Fechar</button>
                  </div>
              </div>
          </ModalPortal>
      )}
    </div>
  );
}
