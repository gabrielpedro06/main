import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../services/supabase";
import { useAuth } from "../context/AuthContext";
import "./../styles/dashboard.css";

const MODEL_NAME = "Formação Profissional";

// Novas constantes para os Anos
const CURRENT_YEAR = new Date().getFullYear();
const START_YEAR = 2000;
const END_YEAR = 2100;
const YEARS_OPTIONS = Array.from(
  { length: END_YEAR - START_YEAR + 1 },
  (_, i) => END_YEAR - i
);

const COURSE_STATUS_OPTIONS = ["Adiado", "Em Andamento", "Concluído", "Cancelado"];
const REGIME_OPTIONS = ["Online", "Hibrido", "Presencial"];
const DTP_OPTIONS = ["Concluído", "Pendente de Revisão"];
const SIM_NAO_OPTIONS = ["Sim", "Não"];
const SIM_NAO_NA_OPTIONS = ["Sim", "N/A"];

const CHECKLIST_ORDER = ["na", "em_falta", "incompleto", "falta_assinar", "concluido"];
const CHECKLIST_META = {
  concluido: { label: "Concluído", color: "#10b981" },
  falta_assinar: { label: "Falta assinar", color: "#f59e0b" },
  incompleto: { label: "Incompleto", color: "#f97316" },
  em_falta: { label: "Em falta", color: "#ef4444" },
  na: { label: "N/A", color: "#cbd5e1" },
};

const Icons = {
  Folder: ({ size = 20, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>,
  Plus: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>,
  Close: ({ size = 18, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>,
  Edit: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>,
  Save: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>,
  Settings: ({ size = 18, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>,
  Alert: ({ size = 18, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>,
};

const ModalPortal = ({ children }) => createPortal(children, document.body);

function buildCodigo(year, sequencia) {
  const yearSuffix = String(year).slice(-2);
  return `C${yearSuffix}${String(Number(sequencia) || 1).padStart(2, "0")}`;
}

function createInitialForm(year = CURRENT_YEAR, sequencia = 1) {
  return {
    ano: year,
    sequencia,
    codigo: buildCodigo(year, sequencia),
    nome_curso: "",
    nome_formador: "",
    area_formacao_id: "",
    carga_horaria: 0,
    local: "",
    data_inicio: "",
    data_fim: "",
    regime: "Presencial",
    homologacao_id: "",
    status_curso: "Em Andamento",
    total_inscritos: 0,
    n_empresas: 0,
    n_particulares: 0,
    n_desistencias: 0,
    n_certificados: 0,
    certificados_emitidos: 0,
    certificados_enviados: 0,
    certificados_aguardar: 0,
    doc_formador: false,
    pag_formador: false,
    data_pagamento: "",
    status_dtp: "Pendente de Revisão",
    ccdr_paga: false,
    ccdr_data_envio: "",
    ccdr_n_homologacao: "",
    ccdr_data_comunicacao: "",
    ccdr_pag_exame: "N/A",
    ccdr_cert_data_envio: "",
    ccdr_cert_faturacao: "N/A",
    ccdr_data_rececao: "",
    ccdr_envio_cert_data: "",
    ccdr_modalidade: "",
    dgadr_data_caracterizacao: "",
    dgadr_paga: false,
    dgadr_data_envio: "",
    dgadr_n_homologacao: "",
    dgadr_data_comunicacao: "",
    dgadr_pag_exame: "N/A",
    dgadr_cert_data_envio: "",
    dgadr_cert_faturacao: "N/A",
    dgadr_data_rececao: "",
    dgadr_envio_cert_data: "",
    dgadr_modalidade: "",
    dgadr_pedido_cartoes: "",
  };
}

function formatDateInput(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function formatDateTimeInput(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 16);
}

function toDateOrNull(value) {
  return value ? value : null;
}

function toDateTimeOrNull(value) {
  if (!value) return null;
  return new Date(value).toISOString();
}

function getNextChecklistState(current) {
  const index = CHECKLIST_ORDER.indexOf(current);
  return CHECKLIST_ORDER[(index + 1) % CHECKLIST_ORDER.length];
}

function mapChecklistRows(rows = []) {
  return rows.reduce((accumulator, row) => {
    if (!accumulator[row.acao_formacao_id]) {
      accumulator[row.acao_formacao_id] = {};
    }
    // Agora verifica pela ordem de especificidade: Subtarefa > Tarefa > Atividade
    const key = row.template_subtarefa_id || row.template_tarefa_id || row.template_atividade_id;
    accumulator[row.acao_formacao_id][key] = row.estado;
    return accumulator;
  }, {});
}

async function fetchChecklistTemplate() {
  const { data: tipoProjeto, error: tipoError } = await supabase
    .from("tipos_projeto")
    .select("id, nome")
    .eq("nome", MODEL_NAME)
    .maybeSingle();

  if (tipoError) throw tipoError;
  if (!tipoProjeto) return [];

  const { data: atividades, error: atividadesError } = await supabase
    .from("template_atividades")
    .select("id, nome, ordem")
    .eq("tipo_projeto_id", tipoProjeto.id)
    .order("ordem", { ascending: true });

  if (atividadesError) throw atividadesError;

  const atividadeIds = (atividades || []).map((atividade) => atividade.id);
  if (atividadeIds.length === 0) return [];

  const { data: tarefas, error: tarefasError } = await supabase
    .from("template_tarefas")
    .select("id, nome, ordem, template_atividade_id")
    .in("template_atividade_id", atividadeIds)
    .order("ordem", { ascending: true });

  if (tarefasError) throw tarefasError;

  const tarefaIds = (tarefas || []).map((tarefa) => tarefa.id);
  const { data: subtarefas, error: subtarefasError } = tarefaIds.length > 0
    ? await supabase
      .from("template_subtarefas")
      .select("*")
      .in("template_tarefa_id", tarefaIds)
      .order("ordem", { ascending: true })
    : { data: [], error: null };

  if (subtarefasError) throw subtarefasError;

  const subtarefasPorTarefa = new Map();
  (subtarefas || []).forEach((subtarefa) => {
    const tarefaId = subtarefa.template_tarefa_id;
    if (!subtarefasPorTarefa.has(tarefaId)) {
      subtarefasPorTarefa.set(tarefaId, []);
    }
    subtarefasPorTarefa.get(tarefaId).push(subtarefa);
  });

  return (atividades || []).map((atividade) => ({
    id: atividade.id,
    nome: atividade.nome,
    ordem: Number(atividade.ordem || 0),
    tarefas: (tarefas || [])
      .filter((tarefa) => String(tarefa.template_atividade_id) === String(atividade.id))
      .map((tarefa) => ({
        id: tarefa.id,
        nome: tarefa.nome,
        ordem: Number(tarefa.ordem || 0),
        subtarefas: (subtarefasPorTarefa.get(tarefa.id) || []).map((subtarefa) => ({
          id: subtarefa.id,
          nome: subtarefa.nome || subtarefa.titulo || "Passo",
          ordem: Number(subtarefa.ordem || 0),
        })),
      })),
  }));
}

function Field({ label, children, hint }) {
  return (
    <div>
      <label style={{ display: "block", marginBottom: 6, fontSize: "0.85rem", fontWeight: 600, color: "#475569" }}>{label}</label>
      {children}
      {hint ? <div style={{ marginTop: 6, fontSize: "0.6rem", color: "#94a3b8" }}>{hint}</div> : null}
    </div>
  );
}

function SectionTitle({ children }) {
  return <div style={{ fontSize: "0.8rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", margin: "18px 0 14px", borderBottom: "1px solid #e2e8f0", paddingBottom: 6 }}>{children}</div>;
}

function SettingsList({ title, items, createFields, itemFields, emptyLabel, onCreate, onSaveItem, onUpdate, onToggle }) {
  return (
    <div style={{ border: "1px solid #e2e8f0", borderRadius: 14, overflow: "hidden", background: "#fff" }}>
      <div style={{ padding: "16px 18px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
        <div style={{ fontWeight: 800, color: "#0f172a" }}>{title}</div>
      </div>
      <div style={{ padding: 18, display: "grid", gap: 16 }}>
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "grid", gap: 10, gridTemplateColumns: createFields.length > 1 ? `repeat(${createFields.length}, minmax(0, 1fr))` : "1fr" }}>
            {createFields.map((field) => (
              <input
                key={field.key}
                value={field.value}
                onChange={(event) => field.onChange(event.target.value)}
                placeholder={field.placeholder}
                style={{ width: "100%", padding: "11px 12px", borderRadius: 10, border: "1px solid #cbd5e1", fontSize: "0.95rem" }}
              />
            ))}
          </div>
          <button type="button" onClick={onCreate} style={{ padding: "10px 14px", borderRadius: 10, border: "none", background: "var(--color-btnPrimary)", color: "#fff", fontWeight: 800, cursor: "pointer", width: "fit-content" }}>
            Adicionar
          </button>
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          {items.length === 0 ? (
            <div style={{ color: "#94a3b8", fontSize: "0.9rem" }}>{emptyLabel}</div>
          ) : (
            items.map((item) => (
              <div key={item.id} style={{ display: "grid", gridTemplateColumns: `${Array.from({ length: itemFields.length }, () => "1fr").join(" ")} auto auto`, gap: 10, alignItems: "center", padding: 12, border: "1px solid #e2e8f0", borderRadius: 12, background: item.ativo ? "#fff" : "#f8fafc" }}>
                {itemFields.map((field) => (
                  <input
                    key={field.key}
                    value={item[field.key] || ""}
                    onChange={(event) => onUpdate(item.id, field.key, event.target.value)}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #cbd5e1", background: item.ativo ? "#fff" : "#f8fafc" }}
                  />
                ))}
                <button type="button" onClick={() => onToggle(item.id)} style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #cbd5e1", background: item.ativo ? "#ecfdf5" : "#f8fafc", color: item.ativo ? "#047857" : "#64748b", fontWeight: 800, cursor: "pointer" }}>
                  {item.ativo ? "Ativa" : "Inativa"}
                </button>
                <button type="button" onClick={() => onSaveItem(item)} style={{ padding: "10px 12px", borderRadius: 10, border: "none", background: "var(--color-btnPrimary)", color: "#fff", fontWeight: 800, cursor: "pointer" }}>
                  Guardar
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function InlineTableCell({
  rowId,
  field,
  value,
  display,
  type = "text",
  options = [],
  align = "left",
  editingCell,
  setEditingCell,
  onSave,
  disabled = false,
  style = {},
}) {
  const isEditing = editingCell?.rowId === rowId && editingCell?.field === field;
  const [draft, setDraft] = useState(value ?? "");
  const inputRef = useRef(null);

  useEffect(() => {
    if (isEditing) {
      window.requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isEditing]);

  const closeEditor = () => setEditingCell(null);

  const commitValue = async (nextValue = draft) => {
    if (disabled || !onSave) {
      closeEditor();
      return;
    }

    await onSave(nextValue);
    closeEditor();
  };

  const baseStyle = {
    padding: 4, 
    fontSize: "0.64rem", 
    textAlign: align,
    verticalAlign: "middle",
    cursor: disabled ? "default" : "text",
    background: isEditing ? "#f8fafc" : "transparent",
    borderRight: "1px solid #e2e8f0",
    ...style,
  };
  
  if (!isEditing) {
    return (
      <td
        style={baseStyle}
        title={disabled ? undefined : "Duplo clique para editar"}
        onDoubleClick={disabled ? undefined : () => {
          setDraft(value ?? "");
          setEditingCell({ rowId, field });
        }}
      >
        {display}
      </td>
    );
  }

  if (type === "select") {
    return (
      <td style={baseStyle}>
        <select
          ref={inputRef}
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            void commitValue(event.target.value);
          }}
          onBlur={() => closeEditor()}
          style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #cbd5e1", background: "white", fontSize: "0.9rem" }}
        >
          {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </td>
    );
  }

  return (
    <td style={baseStyle}>
      <input
        ref={inputRef}
        type={type}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => void commitValue()}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            void commitValue();
          }
          if (event.key === "Escape") {
            event.preventDefault();
            closeEditor();
          }
        }}
        style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #cbd5e1", background: "white", fontSize: "0.9rem" }}
      />
    </td>
  );
}

export default function AcoesFormacao() {
  const { user } = useAuth();
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
  const [activeTab, setActiveTab] = useState("formacoes");
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const [formacoes, setFormacoes] = useState([]);
  const [areasFormacao, setAreasFormacao] = useState([]);
  const [homologacoesFormacao, setHomologacoesFormacao] = useState([]);
  const [templateTasks, setTemplateTasks] = useState([]);
  const [checklistMap, setChecklistMap] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState(createInitialForm(CURRENT_YEAR, 1));
  const [editingCell, setEditingCell] = useState(null);
  const [settingsAreas, setSettingsAreas] = useState([]);
  const [settingsHomologacoes, setSettingsHomologacoes] = useState([]);
  const [newAreaNome, setNewAreaNome] = useState("");
  const [newHomologacaoCodigo, setNewHomologacaoCodigo] = useState("CCDR");
  const [newHomologacaoNome, setNewHomologacaoNome] = useState("");
  const toastTimerRef = useRef(null);
  const isSubmittingRef = useRef(false);

  const showToast = useCallback((message, type = "success") => {
    setNotification({ message, type });
    window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setNotification(null), 3500);
  }, []);

  const loadData = useCallback(async (year) => {
    setLoading(true);
    try {
      const [areasResult, homologacoesResult, templateResult, formacoesResult] = await Promise.all([
        supabase.from("areas_formacao").select("id, nome, descricao, ativo").order("nome", { ascending: true }),
        supabase.from("homologacoes_formacao").select("id, codigo, nome, descricao, ativo").order("codigo", { ascending: true }),
        fetchChecklistTemplate(),
        supabase.from("acoes_formacao").select("*").eq("ano", year).order("sequencia", { ascending: true }),
      ]);

      if (areasResult.error) throw areasResult.error;
      if (homologacoesResult.error) throw homologacoesResult.error;
      if (formacoesResult.error) throw formacoesResult.error;

      setAreasFormacao(areasResult.data || []);
      setSettingsAreas((areasResult.data || []).map((area) => ({ ...area })));
      setHomologacoesFormacao(homologacoesResult.data || []);
      setSettingsHomologacoes((homologacoesResult.data || []).map((item) => ({ ...item })));
      setTemplateTasks(templateResult || []);
      setFormacoes(formacoesResult.data || []);

      const formacaoIds = (formacoesResult.data || []).map((item) => item.id);
      if (formacaoIds.length > 0) {
        const { data: checklistRows, error: checklistError } = await supabase
          .from("acoes_formacao_checklist")
          .select("*")
          .in("acao_formacao_id", formacaoIds)
          .order("created_at", { ascending: true });

        if (checklistError) throw checklistError;
        setChecklistMap(mapChecklistRows(checklistRows || []));
      } else {
        setChecklistMap({});
      }
    } catch (error) {
      console.error(error);
      showToast("Erro ao carregar os dados da página.", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void loadData(selectedYear);
  }, [loadData, selectedYear]);

  const areasById = useMemo(() => new Map(areasFormacao.map((area) => [area.id, area])), [areasFormacao]);
  const homologacoesById = useMemo(() => new Map(homologacoesFormacao.map((item) => [item.id, item])), [homologacoesFormacao]);

  const formacoesComContexto = useMemo(() => formacoes.map((acao) => ({
    ...acao,
    area_nome: areasById.get(acao.area_formacao_id)?.nome || "",
    homologacao_codigo: homologacoesById.get(acao.homologacao_id)?.codigo || "",
    homologacao_nome: homologacoesById.get(acao.homologacao_id)?.nome || "",
    checklist: checklistMap[acao.id] || {},
  })), [areasById, checklistMap, formacoes, homologacoesById]);

  const checklistGrid = useMemo(() => templateTasks.map((atividade) => ({
    ...atividade,
    tarefas: (atividade.tarefas || []).map((tarefa) => ({
      ...tarefa,
      subtarefas: Array.isArray(tarefa.subtarefas) ? tarefa.subtarefas : [],
    })),
  })), [templateTasks]);

const checklistActivityGroups = useMemo(() => {
  let cursor = 0;

  return checklistGrid.map((atividade) => {
    const hasTasks = atividade.tarefas && atividade.tarefas.length > 0;
    const leafCount = hasTasks 
      ? atividade.tarefas.reduce((total, tarefa) => total + (tarefa.subtarefas?.length || 1), 0) 
      : 1;

    const startIndex = cursor;
    const endIndex = cursor + leafCount - 1;
    cursor += leafCount;

    return {
      ...atividade,
      hasTasks,
      leafCount,
      startIndex,
      endIndex,
    };
  });
}, [checklistGrid]);

const checklistBodyColumns = useMemo(() => checklistGrid.flatMap((atividade) => {
  const hasTasks = atividade.tarefas && atividade.tarefas.length > 0;
  
  if (!hasTasks) {
    return [{
      atividadeId: atividade.id,
      atividadeNome: atividade.nome,
      tarefaId: null,         // Alterado para null
      tarefaNome: atividade.nome,
      passoId: null,          // Alterado para null
      passoNome: atividade.nome,
      storageKey: atividade.id,
      isActivityLeaf: true,   // Nova flag
    }];
  }

  return atividade.tarefas.flatMap((tarefa) => (
    (tarefa.subtarefas && tarefa.subtarefas.length > 0)
      ? tarefa.subtarefas.map((passo) => ({
        atividadeId: atividade.id,
        atividadeNome: atividade.nome,
        tarefaId: tarefa.id,
        tarefaNome: tarefa.nome,
        passoId: passo.id,
        passoNome: passo.nome,
        storageKey: passo.id,
      }))
      : [{
        atividadeId: atividade.id,
        atividadeNome: atividade.nome,
        tarefaId: tarefa.id,
        tarefaNome: tarefa.nome,
        passoId: tarefa.id,
        passoNome: tarefa.nome,
        storageKey: tarefa.id,
        isTaskLeaf: true,
      }]
  ));
}), [checklistGrid]);

  const checklistStepHeaders = useMemo(() => checklistGrid.flatMap((atividade) => (
    (atividade.tarefas || []).flatMap((tarefa) => (
      (tarefa.subtarefas || []).map((passo) => ({
        atividadeId: atividade.id,
        atividadeNome: atividade.nome,
        tarefaId: tarefa.id,
        tarefaNome: tarefa.nome,
        passoId: passo.id,
        passoNome: passo.nome,
      }))
    ))
  )), [checklistGrid]);

  const checklistVisibleCount = checklistBodyColumns.length;

  const updateFormacaoLocal = useCallback((acaoId, field, value) => {
    setFormacoes((previous) => previous.map((item) => (item.id === acaoId ? { ...item, [field]: value } : item)));
  }, []);

  const normalizeInlineValue = useCallback((field, value) => {
    if (value === undefined) return null;

    const numericFields = new Set([
      "carga_horaria",
      "total_inscritos",
      "n_empresas",
      "n_particulares",
      "n_desistencias",
      "n_certificados",
      "certificados_emitidos",
      "certificados_enviados",
      "certificados_aguardar",
    ]);

    const booleanFields = new Set(["doc_formador", "pag_formador", "ccdr_paga", "dgadr_paga"]);
    const dateFields = new Set(["data_inicio", "data_fim", "ccdr_data_comunicacao", "ccdr_cert_data_envio", "ccdr_data_rececao", "ccdr_envio_cert_data", "dgadr_data_caracterizacao", "dgadr_data_comunicacao", "dgadr_cert_data_envio", "dgadr_data_rececao", "dgadr_envio_cert_data", "dgadr_pedido_cartoes", "data_pagamento", "ccdr_data_envio", "dgadr_data_envio"]);
    const dateTimeFields = new Set([]);
    const selectTextFields = new Set(["regime", "status_curso", "status_dtp", "ccdr_pag_exame", "ccdr_cert_faturacao", "dgadr_pag_exame", "dgadr_cert_faturacao"]);

    if (numericFields.has(field)) return Number(value || 0);
    if (booleanFields.has(field)) return value === "Sim" || value === true;
    if (dateFields.has(field)) return value || null;
    if (dateTimeFields.has(field)) return value ? new Date(value).toISOString() : null;
    if (selectTextFields.has(field)) return value;
    return typeof value === "string" ? value.trim() : value;
  }, []);

  const persistInlineField = useCallback(async (acao, field, rawValue) => {
    const normalizedValue = normalizeInlineValue(field, rawValue);
    const { error } = await supabase.from("acoes_formacao").update({
      [field]: normalizedValue,
      updated_at: new Date().toISOString(),
    }).eq("id", acao.id);

    if (error) throw error;

    updateFormacaoLocal(acao.id, field, normalizedValue);
    showToast("Campo atualizado.");
  }, [normalizeInlineValue, showToast, updateFormacaoLocal]);

  const handleInlineCellSave = useCallback(async (acao, field, value) => {
    try {
      await persistInlineField(acao, field, value);
    } catch (error) {
      console.error(error);
      showToast("Não foi possível guardar a alteração.", "error");
    }
  }, [persistInlineField, showToast]);

  const displayBoolean = (value) => (value ? "Sim" : "Não");
  const displayDate = (value) => formatDateInput(value) || "-";
  const displayDateTime = (value) => formatDateTimeInput(value) || "-";

  const visibleAreasForForm = useMemo(() => areasFormacao.filter((area) => area.ativo || area.id === form.area_formacao_id), [areasFormacao, form.area_formacao_id]);
  const visibleHomologacoesForForm = useMemo(() => homologacoesFormacao.filter((item) => item.ativo || item.id === form.homologacao_id), [form.homologacao_id, homologacoesFormacao]);

  const nextSequence = useMemo(() => {
    const sequences = formacoes.filter((item) => Number(item.ano) === Number(selectedYear)).map((item) => Number(item.sequencia || 0));
    return sequences.length > 0 ? Math.max(...sequences) + 1 : 1;
  }, [formacoes, selectedYear]);

  const visibleFormacoes = useMemo(() => {
    if (activeTab === "ccdr") return formacoesComContexto.filter((item) => item.homologacao_codigo === "CCDR");
    if (activeTab === "dgadr") return formacoesComContexto.filter((item) => item.homologacao_codigo === "DGADR");
    return formacoesComContexto;
  }, [activeTab, formacoesComContexto]);

  const handleOpenCreate = () => {
    setEditId(null);
    setForm(createInitialForm(selectedYear, nextSequence));
    setShowModal(true);
  };

  const handleOpenEdit = (acao) => {
    setEditId(acao.id);
    setForm({
      ...createInitialForm(acao.ano, acao.sequencia),
      ...acao,
      codigo: acao.codigo || buildCodigo(acao.ano, acao.sequencia),
      data_inicio: formatDateInput(acao.data_inicio),
      data_fim: formatDateInput(acao.data_fim),
      data_pagamento: formatDateInput(acao.data_pagamento),
      ccdr_data_envio: formatDateInput(acao.ccdr_data_envio),
      dgadr_data_envio: formatDateInput(acao.dgadr_data_envio),
      ccdr_cert_data_envio: formatDateInput(acao.ccdr_cert_data_envio),
      ccdr_data_rececao: formatDateInput(acao.ccdr_data_rececao),
      ccdr_envio_cert_data: formatDateInput(acao.ccdr_envio_cert_data),
      dgadr_data_caracterizacao: formatDateInput(acao.dgadr_data_caracterizacao),
      dgadr_data_envio: formatDateTimeInput(acao.dgadr_data_envio),
      dgadr_data_comunicacao: formatDateInput(acao.dgadr_data_comunicacao),
      dgadr_cert_data_envio: formatDateInput(acao.dgadr_cert_data_envio),
      dgadr_data_rececao: formatDateInput(acao.dgadr_data_rececao),
      dgadr_envio_cert_data: formatDateInput(acao.dgadr_envio_cert_data),
      dgadr_pedido_cartoes: formatDateInput(acao.dgadr_pedido_cartoes),
    });
    setShowModal(true);
  };

  const handleChecklistCellClick = async (acaoId, leaf, currentState) => {
    const nextState = getNextChecklistState(currentState || "na");
    try {
      const checklistKey = leaf.storageKey;
      
      const atividadeId = leaf.atividadeId; // Agora é sempre obrigatório
      const tarefaId = leaf.tarefaId || null;
      const subtarefaId = (leaf.isActivityLeaf || leaf.isTaskLeaf) ? null : leaf.passoId;

      // 1. Atualizar primeiro
      let query = supabase
        .from("acoes_formacao_checklist")
        .update({ estado: nextState, updated_at: new Date().toISOString() })
        .eq("acao_formacao_id", acaoId)
        .eq("template_atividade_id", atividadeId);
        
      if (tarefaId) query = query.eq("template_tarefa_id", tarefaId);
      else query = query.is("template_tarefa_id", null);

      if (subtarefaId) query = query.eq("template_subtarefa_id", subtarefaId);
      else query = query.is("template_subtarefa_id", null);

      const { data: updatedRows, error: updateError } = await query.select();
      if (updateError) throw updateError;

      // 2. Se não atualizou nada, inserimos um novo
      if (!updatedRows || updatedRows.length === 0) {
        const { error: insertError } = await supabase.from("acoes_formacao_checklist").insert([{
          acao_formacao_id: acaoId,
          template_atividade_id: atividadeId,
          template_tarefa_id: tarefaId,
          template_subtarefa_id: subtarefaId,
          estado: nextState
        }]);
        if (insertError) throw insertError;
      }

      // 3. Atualizar UI
      setChecklistMap((previous) => ({
        ...previous,
        [acaoId]: {
          ...(previous[acaoId] || {}),
          [checklistKey]: nextState,
        },
      }));
    } catch (error) {
      console.error(error);
      showToast("Não foi possível atualizar o checklist.", "error");
    }
  };

  const handleFormSubmit = async (event) => {
    event.preventDefault();

    // Bloqueia os duplos cliques instantaneamente
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      const payload = {
        ano: Number(selectedYear),
        sequencia: Number(form.sequencia || nextSequence),
        nome_curso: form.nome_curso.trim(),
        nome_formador: form.nome_formador.trim(),
        area_formacao_id: form.area_formacao_id,
        carga_horaria: Number(form.carga_horaria || 0),
        local: form.local.trim(),
        data_inicio: toDateOrNull(form.data_inicio),
        data_fim: toDateOrNull(form.data_fim),
        regime: form.regime,
        homologacao_id: form.homologacao_id,
        status_curso: form.status_curso,
        total_inscritos: Number(form.total_inscritos || 0),
        n_empresas: Number(form.n_empresas || 0),
        n_particulares: Number(form.n_particulares || 0),
        n_desistencias: Number(form.n_desistencias || 0),
        n_certificados: Number(form.n_certificados || 0),
        certificados_emitidos: Number(form.certificados_emitidos || 0),
        certificados_enviados: Number(form.certificados_enviados || 0),
        certificados_aguardar: Number(form.certificados_aguardar || 0),
        doc_formador: Boolean(form.doc_formador),
        pag_formador: Boolean(form.pag_formador),
        data_pagamento: toDateOrNull(form.data_pagamento),
        status_dtp: form.status_dtp,
        ccdr_paga: Boolean(form.ccdr_paga),
        ccdr_data_envio: toDateOrNull(form.ccdr_data_envio),
        ccdr_n_homologacao: form.ccdr_n_homologacao.trim(),
        ccdr_data_comunicacao: toDateOrNull(form.ccdr_data_comunicacao),
        ccdr_pag_exame: form.ccdr_pag_exame,
        ccdr_cert_data_envio: toDateOrNull(form.ccdr_cert_data_envio),
        ccdr_cert_faturacao: form.ccdr_cert_faturacao,
        ccdr_data_rececao: toDateOrNull(form.ccdr_data_rececao),
        ccdr_envio_cert_data: toDateOrNull(form.ccdr_envio_cert_data),
        ccdr_modalidade: form.ccdr_modalidade.trim(),
        dgadr_data_caracterizacao: toDateOrNull(form.dgadr_data_caracterizacao),
        dgadr_paga: Boolean(form.dgadr_paga),
        dgadr_data_envio: toDateOrNull(form.dgadr_data_envio),
        dgadr_n_homologacao: form.dgadr_n_homologacao.trim(),
        dgadr_data_comunicacao: toDateOrNull(form.dgadr_data_comunicacao),
        dgadr_pag_exame: form.dgadr_pag_exame,
        dgadr_cert_data_envio: toDateOrNull(form.dgadr_cert_data_envio),
        dgadr_cert_faturacao: form.dgadr_cert_faturacao,
        dgadr_data_rececao: toDateOrNull(form.dgadr_data_rececao),
        dgadr_envio_cert_data: toDateOrNull(form.dgadr_envio_cert_data),
        dgadr_modalidade: form.dgadr_modalidade.trim(),
        dgadr_pedido_cartoes: toDateOrNull(form.dgadr_pedido_cartoes),
        updated_at: new Date().toISOString(),
      };

      if (!payload.nome_curso || !payload.nome_formador || !payload.area_formacao_id || !payload.local || !payload.homologacao_id) {
        showToast("Preenche os campos obrigatórios antes de guardar.", "error");
        isSubmittingRef.current = false;
        setIsSubmitting(false);
        return;
      }

      if (editId) {
        const { error } = await supabase.from("acoes_formacao").update(payload).eq("id", editId);
        if (error) throw error;
        showToast("Formação atualizada.");
      } else {
        // Garantir que a sequência é a correta verificando a BD na hora h
        const { data: maxSeqData, error: seqError } = await supabase
          .from("acoes_formacao")
          .select("sequencia")
          .eq("ano", payload.ano)
          .order("sequencia", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (seqError) throw seqError;

        payload.sequencia = maxSeqData ? Number(maxSeqData.sequencia) + 1 : 1;

        // Insere a ação de formação
        const { data, error } = await supabase.from("acoes_formacao").insert([payload]).select("id").single();
        if (error) throw error;

        // Insere a checklist se houver
        if (data?.id && checklistBodyColumns.length > 0) {
          try {
            const checklistPayload = checklistBodyColumns.map((column) => ({
              acao_formacao_id: data.id,
              template_atividade_id: column.atividadeId, // <- OBRIGATÓRIO!
              template_tarefa_id: column.tarefaId || null,
              template_subtarefa_id: column.isActivityLeaf || column.storageKey === column.tarefaId ? null : column.passoId,
              estado: "na",
            }));

            const { error: checklistError } = await supabase.from("acoes_formacao_checklist").insert(checklistPayload);
            if (checklistError) throw checklistError;
          } catch (chkError) {
             console.error("Erro no checklist:", chkError);
             showToast("Formação criada, mas o checklist inicial não foi totalmente gerado.", "error");
          }
        }
        showToast("Formação criada com sucesso.");
      }

      setShowModal(false);
      setEditId(null);
      setForm(createInitialForm(selectedYear, nextSequence));
      await loadData(selectedYear);
    } catch (error) {
      console.error(error);
      showToast("Erro ao guardar a formação.", "error");
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const updateAreaDraft = (id, key, value) => {
    setSettingsAreas((previous) => previous.map((item) => (item.id === id ? { ...item, [key]: value } : item)));
  };

  const updateHomologacaoDraft = (id, key, value) => {
    setSettingsHomologacoes((previous) => previous.map((item) => (item.id === id ? { ...item, [key]: value } : item)));
  };

  const saveArea = async (area) => {
    try {
      const payload = { nome: area.nome.trim(), ativo: Boolean(area.ativo), updated_at: new Date().toISOString() };
      if (!payload.nome) {
        showToast("A área precisa de um nome.", "error");
        return;
      }
      const { error } = await supabase.from("areas_formacao").update(payload).eq("id", area.id);
      if (error) throw error;
      showToast("Área atualizada.");
      await loadData(selectedYear);
    } catch (error) {
      console.error(error);
      showToast("Erro ao guardar a área.", "error");
    }
  };

  const createArea = async () => {
    try {
      const nome = newAreaNome.trim();
      if (!nome) {
        showToast("Escreve o nome da área.", "error");
        return;
      }
      const { error } = await supabase.from("areas_formacao").insert([{ nome, ativo: true }]);
      if (error) throw error;
      setNewAreaNome("");
      showToast("Área criada.");
      await loadData(selectedYear);
    } catch (error) {
      console.error(error);
      showToast("Erro ao criar a área.", "error");
    }
  };

  const toggleArea = async (id) => {
    const area = settingsAreas.find((item) => item.id === id);
    if (!area) return;
    await saveArea({ ...area, ativo: !area.ativo });
  };

  const saveHomologacao = async (homologacao) => {
    try {
      const payload = {
        nome: homologacao.nome.trim(),
        ativo: Boolean(homologacao.ativo),
        updated_at: new Date().toISOString(),
      };
      if (!payload.nome) {
        showToast("A homologação precisa de um nome.", "error");
        return;
      }
      const { error } = await supabase.from("homologacoes_formacao").update(payload).eq("id", homologacao.id);
      if (error) throw error;
      showToast("Homologação atualizada.");
      await loadData(selectedYear);
    } catch (error) {
      console.error(error);
      showToast("Erro ao guardar a homologação.", "error");
    }
  };

  const createHomologacao = async () => {
    try {
      const codigo = newHomologacaoCodigo.trim();
      const nome = newHomologacaoNome.trim();
      if (!codigo || !nome) {
        showToast("Indica código e nome para a homologação.", "error");
        return;
      }
      const { error } = await supabase.from("homologacoes_formacao").insert([{ codigo, nome, ativo: true }]);
      if (error) throw error;
      setNewHomologacaoCodigo("CCDR");
      setNewHomologacaoNome("");
      showToast("Homologação criada.");
      await loadData(selectedYear);
    } catch (error) {
      console.error(error);
      showToast("Erro ao criar a homologação.", "error");
    }
  };

  const toggleHomologacao = async (id) => {
    const homologacao = settingsHomologacoes.find((item) => item.id === id);
    if (!homologacao) return;
    await saveHomologacao({ ...homologacao, ativo: !homologacao.ativo });
  };

  const selectedTotalVolume = Number(form.n_certificados || 0) * Number(form.carga_horaria || 0);
  const isCreating = !editId;
  const formHomologacaoCodigo = homologacoesById.get(form.homologacao_id)?.codigo;

  return (
    <div className="page-container" style={{ maxWidth: 1600, margin: "0 auto", padding: 15 }}>
      <div style={{ background: "white", padding: "20px 25px", borderRadius: 12, border: "1px solid #e2e8f0", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)", flexWrap: "wrap", gap: 15 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ background: "var(--color-bgSecondary)", color: "var(--color-btnPrimary)", padding: 12, borderRadius: 12, display: "flex" }}>
            <Icons.Folder size={24} />
          </div>
          <div>
            <h1 style={{ margin: 0, color: "#0f172a", fontSize: "1.8rem", fontWeight: 900, letterSpacing: "-0.02em" }}>Ações de Formação</h1>
            <div style={{ marginTop: 8 }}>
              <select 
                value={selectedYear} 
                onChange={(event) => setSelectedYear(Number(event.target.value))}
                style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#f8fafc", color: "#0f172a", fontWeight: 800, fontSize: "0.95rem", cursor: "pointer", outline: "none", width: "130px" }}
              >
                {YEARS_OPTIONS.map((ano) => (
                  <option key={ano} value={ano}>Ano {ano}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 15, alignItems: "center" }}>
          <button onClick={() => setShowSettingsModal(true)} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: 10, borderRadius: 8, color: "#475569", cursor: "pointer" }} title="Definições">
            <Icons.Settings />
          </button>
          <button onClick={handleOpenCreate} style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 800, padding: "10px 20px", borderRadius: 8, border: "none", background: "var(--color-btnPrimary)", color: "white", cursor: "pointer" }} disabled={!user?.id}>
            <Icons.Plus /> Nova Formação
          </button>
        </div>
      </div>

      <div style={{ display: "flex", background: "#f1f5f9", padding: 6, borderRadius: 10, marginBottom: 20, border: "1px solid #e2e8f0", width: "fit-content", flexWrap: "wrap", gap: 6 }}>
        {[
          { id: "formacoes", label: "Formações" },
          { id: "checklist", label: "Checklist" },
          { id: "ccdr", label: "CCDR" },
          { id: "dgadr", label: "DGADR" },
        ].map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ padding: "8px 20px", borderRadius: 8, border: "none", fontWeight: 800, fontSize: "0.9rem", cursor: "pointer", background: activeTab === tab.id ? "white" : "transparent", color: activeTab === tab.id ? "var(--color-btnPrimary)" : "#64748b", boxShadow: activeTab === tab.id ? "0 2px 4px rgba(0,0,0,0.05)" : "none" }}>
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ background: "white", borderRadius: 14, border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
        {loading ? (
          <div style={{ padding: 50, textAlign: "center", color: "#64748b" }}>A carregar dados...</div>
        ) : (
          <div className="table-responsive custom-scrollbar" style={{ overflowX: "auto" }}>
            <table 
              className="data-table project-list-table" 
              style={{ 
                minWidth: activeTab === "formacoes" ? 1950 : activeTab === "checklist" ? 1000 : "100%", 
                width: "100%", 
                borderCollapse: "collapse" 
              }}
            >
              {activeTab === "formacoes" && (
                <>
                  <thead style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                    <tr>
                      <th style={{ padding: 4, textAlign: "left", color: "#475569", fontSize: "0.6rem", fontWeight: 700, position: "sticky", left: 0, background: "#f8fafc", zIndex: 2, borderRight: "1px solid #e2e8f0", whiteSpace: "nowrap" }}>Código</th>
                      <th style={{ padding: 4, textAlign: "left", color: "#475569", fontSize: "0.6rem", fontWeight: 700, whiteSpace: "nowrap" }}>Nome do Curso</th>
                      <th style={{ padding: 4, textAlign: "left", color: "#475569", fontSize: "0.6rem", fontWeight: 700, whiteSpace: "nowrap" }}>Formador</th>
                      <th style={{ padding: 4, textAlign: "left", color: "#475569", fontSize: "0.6rem", fontWeight: 700, whiteSpace: "nowrap" }}>Área</th>
                      <th style={{ padding: 4, textAlign: "center", color: "#475569", fontSize: "0.6rem", fontWeight: 700, whiteSpace: "nowrap" }}>Carga (h)</th>
                      <th style={{ padding: 4, textAlign: "center", color: "#475569", fontSize: "0.6rem", fontWeight: 700, whiteSpace: "nowrap" }}>Data Início</th>
                      <th style={{ padding: 4, textAlign: "center", color: "#475569", fontSize: "0.6rem", fontWeight: 700, whiteSpace: "nowrap" }}>Data Fim</th>
                      <th style={{ padding: 4, textAlign: "center", color: "#475569", fontSize: "0.6rem", fontWeight: 700, whiteSpace: "nowrap" }}>Regime</th>
                      <th style={{ padding: 4, textAlign: "center", color: "#475569", fontSize: "0.6rem", fontWeight: 700, whiteSpace: "nowrap" }}>Homolog.</th>
                      <th style={{ padding: 4, textAlign: "center", color: "#475569", fontSize: "0.6rem", fontWeight: 700, whiteSpace: "nowrap" }}>Status</th>
                      <th style={{ padding: 4, textAlign: "center", color: "#475569", fontSize: "0.6rem", fontWeight: 700, whiteSpace: "nowrap" }}>Inscritos</th>
                      <th style={{ padding: 4, textAlign: "center", color: "#475569", fontSize: "0.6rem", fontWeight: 700, whiteSpace: "nowrap" }}>Empresas</th>
                      <th style={{ padding: 4, textAlign: "center", color: "#475569", fontSize: "0.6rem", fontWeight: 700, whiteSpace: "nowrap" }}>Particulares</th>
                      <th style={{ padding: 4, textAlign: "center", color: "#475569", fontSize: "0.6rem", fontWeight: 700, whiteSpace: "nowrap" }}>Desistências</th>
                      <th style={{ padding: 4, textAlign: "center", color: "#475569", fontSize: "0.6rem", fontWeight: 700, whiteSpace: "nowrap" }}>Certificados</th>
                      <th style={{ padding: 4, textAlign: "center", color: "#475569", fontSize: "0.6rem", fontWeight: 700, whiteSpace: "nowrap" }}>Volume</th>
                      <th style={{ padding: 4, textAlign: "center", color: "#475569", fontSize: "0.6rem", fontWeight: 700, whiteSpace: "nowrap" }}>Emitidos</th>
                      <th style={{ padding: 4, textAlign: "center", color: "#475569", fontSize: "0.6rem", fontWeight: 700, whiteSpace: "nowrap" }}>Enviados</th>
                      <th style={{ padding: 4, textAlign: "center", color: "#475569", fontSize: "0.6rem", fontWeight: 700, whiteSpace: "nowrap" }}>A Aguardar</th>
                      <th style={{ padding: 4, textAlign: "center", color: "#475569", fontSize: "0.6rem", fontWeight: 700, whiteSpace: "nowrap" }}>Docs Formador</th>
                      <th style={{ padding: 4, textAlign: "center", color: "#475569", fontSize: "0.6rem", fontWeight: 700, whiteSpace: "nowrap" }}>Pag. Formador</th>
                      <th style={{ padding: 4, textAlign: "center", color: "#475569", fontSize: "0.6rem", fontWeight: 700, whiteSpace: "nowrap" }}>Data Pagamento</th>
                      <th style={{ padding: 4, textAlign: "center", color: "#475569", fontSize: "0.6rem", fontWeight: 700, whiteSpace: "nowrap" }}>Status DTP</th>
                      <th style={{ padding: 4, textAlign: "right", color: "#475569", fontSize: "0.6rem", fontWeight: 700, whiteSpace: "nowrap" }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleFormacoes.length === 0 && <tr><td colSpan="24" style={{ textAlign: "center", padding: 30, color: "#94a3b8" }}>Nenhuma formação registada neste ano.</td></tr>}
                    {visibleFormacoes.map((acao) => (
                      <tr key={acao.id} style={{ borderBottom: "1px solid #f1f5f9" }} className="project-list-row">
                        <td style={{ padding: 4, fontSize: "0.64rem", fontWeight: 800, color: "#1e293b", position: "sticky", left: 0, background: "white", zIndex: 1, borderRight: "1px solid #e2e8f0" }}>{acao.codigo}</td>
                        <InlineTableCell
                          key={`${acao.id}-nome_curso-${editingCell?.rowId === acao.id && editingCell?.field === "nome_curso" ? "edit" : "view"}`}
                          rowId={acao.id}
                          field="nome_curso"
                          value={acao.nome_curso}
                          display={acao.nome_curso || "-"}
                          editingCell={editingCell}
                          setEditingCell={setEditingCell}
                          onSave={(nextValue) => handleInlineCellSave(acao, "nome_curso", nextValue)}
                        />
                        <InlineTableCell
                          key={`${acao.id}-nome_formador-${editingCell?.rowId === acao.id && editingCell?.field === "nome_formador" ? "edit" : "view"}`}
                          rowId={acao.id}
                          field="nome_formador"
                          value={acao.nome_formador}
                          display={acao.nome_formador || "-"}
                          editingCell={editingCell}
                          setEditingCell={setEditingCell}
                          onSave={(nextValue) => handleInlineCellSave(acao, "nome_formador", nextValue)}
                        />
                        <InlineTableCell
                          key={`${acao.id}-area_formacao_id-${editingCell?.rowId === acao.id && editingCell?.field === "area_formacao_id" ? "edit" : "view"}`}
                          rowId={acao.id}
                          field="area_formacao_id"
                          value={acao.area_formacao_id || ""}
                          display={acao.area_nome || "-"}
                          type="select"
                          options={visibleAreasForForm.map((area) => ({ value: area.id, label: area.nome }))}
                          editingCell={editingCell}
                          setEditingCell={setEditingCell}
                          onSave={(nextValue) => handleInlineCellSave(acao, "area_formacao_id", nextValue)}
                        />
                        <InlineTableCell
                          key={`${acao.id}-carga_horaria-${editingCell?.rowId === acao.id && editingCell?.field === "carga_horaria" ? "edit" : "view"}`}
                          rowId={acao.id}
                          field="carga_horaria"
                          value={acao.carga_horaria ?? 0}
                          display={acao.carga_horaria ?? 0}
                          type="number"
                          align="center"
                          editingCell={editingCell}
                          setEditingCell={setEditingCell}
                          onSave={(nextValue) => handleInlineCellSave(acao, "carga_horaria", nextValue)}
                        />
                        <InlineTableCell
                          key={`${acao.id}-data_inicio-${editingCell?.rowId === acao.id && editingCell?.field === "data_inicio" ? "edit" : "view"}`}
                          rowId={acao.id}
                          field="data_inicio"
                          value={acao.data_inicio || ""}
                          display={displayDate(acao.data_inicio)}
                          type="date"
                          align="center"
                          editingCell={editingCell}
                          setEditingCell={setEditingCell}
                          onSave={(nextValue) => handleInlineCellSave(acao, "data_inicio", nextValue)}
                        />
                        <InlineTableCell
                          key={`${acao.id}-data_fim-${editingCell?.rowId === acao.id && editingCell?.field === "data_fim" ? "edit" : "view"}`}
                          rowId={acao.id}
                          field="data_fim"
                          value={acao.data_fim || ""}
                          display={displayDate(acao.data_fim)}
                          type="date"
                          align="center"
                          editingCell={editingCell}
                          setEditingCell={setEditingCell}
                          onSave={(nextValue) => handleInlineCellSave(acao, "data_fim", nextValue)}
                        />
                        <InlineTableCell
                          key={`${acao.id}-regime-${editingCell?.rowId === acao.id && editingCell?.field === "regime" ? "edit" : "view"}`}
                          rowId={acao.id}
                          field="regime"
                          value={acao.regime || ""}
                          display={<span style={{ background: "#f1f5f9", padding: "2px 6px", borderRadius: 4, fontSize: "0.6rem", fontWeight: 800 }}>{acao.regime}</span>}
                          type="select"
                          options={REGIME_OPTIONS.map((option) => ({ value: option, label: option }))}
                          align="center"
                          editingCell={editingCell}
                          setEditingCell={setEditingCell}
                          onSave={(nextValue) => handleInlineCellSave(acao, "regime", nextValue)}
                        />
                        <InlineTableCell
                          key={`${acao.id}-homologacao_id-${editingCell?.rowId === acao.id && editingCell?.field === "homologacao_id" ? "edit" : "view"}`}
                          rowId={acao.id}
                          field="homologacao_id"
                          value={acao.homologacao_id || ""}
                          display={acao.homologacao_codigo || acao.homologacao_nome || "-"}
                          type="select"
                          options={visibleHomologacoesForForm.map((item) => ({ value: item.id, label: `${item.codigo} - ${item.nome}` }))}
                          align="center"
                          editingCell={editingCell}
                          setEditingCell={setEditingCell}
                          onSave={(nextValue) => handleInlineCellSave(acao, "homologacao_id", nextValue)}
                        />
                        <InlineTableCell
                          key={`${acao.id}-status_curso-${editingCell?.rowId === acao.id && editingCell?.field === "status_curso" ? "edit" : "view"}`}
                          rowId={acao.id}
                          field="status_curso"
                          value={acao.status_curso || ""}
                          display={<span style={{ fontSize: "0.6rem", padding: "2px 6px", borderRadius: 8, background: "#dcfce7", color: "#166534", fontWeight: 800 }}>{acao.status_curso}</span>}
                          type="select"
                          options={COURSE_STATUS_OPTIONS.map((option) => ({ value: option, label: option }))}
                          align="center"
                          editingCell={editingCell}
                          setEditingCell={setEditingCell}
                          onSave={(nextValue) => handleInlineCellSave(acao, "status_curso", nextValue)}
                        />
                        <InlineTableCell key={`${acao.id}-total_inscritos-${editingCell?.rowId === acao.id && editingCell?.field === "total_inscritos" ? "edit" : "view"}`} rowId={acao.id} field="total_inscritos" value={acao.total_inscritos ?? 0} display={acao.total_inscritos ?? 0} type="number" align="center" editingCell={editingCell} setEditingCell={setEditingCell} onSave={(nextValue) => handleInlineCellSave(acao, "total_inscritos", nextValue)} />
                        <InlineTableCell key={`${acao.id}-n_empresas-${editingCell?.rowId === acao.id && editingCell?.field === "n_empresas" ? "edit" : "view"}`} rowId={acao.id} field="n_empresas" value={acao.n_empresas ?? 0} display={acao.n_empresas ?? 0} type="number" align="center" editingCell={editingCell} setEditingCell={setEditingCell} onSave={(nextValue) => handleInlineCellSave(acao, "n_empresas", nextValue)} />
                        <InlineTableCell key={`${acao.id}-n_particulares-${editingCell?.rowId === acao.id && editingCell?.field === "n_particulares" ? "edit" : "view"}`} rowId={acao.id} field="n_particulares" value={acao.n_particulares ?? 0} display={acao.n_particulares ?? 0} type="number" align="center" editingCell={editingCell} setEditingCell={setEditingCell} onSave={(nextValue) => handleInlineCellSave(acao, "n_particulares", nextValue)} />
                        <InlineTableCell key={`${acao.id}-n_desistencias-${editingCell?.rowId === acao.id && editingCell?.field === "n_desistencias" ? "edit" : "view"}`} rowId={acao.id} field="n_desistencias" value={acao.n_desistencias ?? 0} display={acao.n_desistencias ?? 0} type="number" align="center" editingCell={editingCell} setEditingCell={setEditingCell} onSave={(nextValue) => handleInlineCellSave(acao, "n_desistencias", nextValue)} />
                        <InlineTableCell key={`${acao.id}-n_certificados-${editingCell?.rowId === acao.id && editingCell?.field === "n_certificados" ? "edit" : "view"}`} rowId={acao.id} field="n_certificados" value={acao.n_certificados ?? 0} display={acao.n_certificados ?? 0} type="number" align="center" editingCell={editingCell} setEditingCell={setEditingCell} onSave={(nextValue) => handleInlineCellSave(acao, "n_certificados", nextValue)} />
                        <td style={{ padding: 4, textAlign: "center", fontSize: "0.64rem", fontWeight: 700 }}>{Number(acao.n_certificados || 0) * Number(acao.carga_horaria || 0)}</td>
                        <InlineTableCell key={`${acao.id}-certificados_emitidos-${editingCell?.rowId === acao.id && editingCell?.field === "certificados_emitidos" ? "edit" : "view"}`} rowId={acao.id} field="certificados_emitidos" value={acao.certificados_emitidos ?? 0} display={acao.certificados_emitidos ?? 0} type="number" align="center" editingCell={editingCell} setEditingCell={setEditingCell} onSave={(nextValue) => handleInlineCellSave(acao, "certificados_emitidos", nextValue)} />
                        <InlineTableCell key={`${acao.id}-certificados_enviados-${editingCell?.rowId === acao.id && editingCell?.field === "certificados_enviados" ? "edit" : "view"}`} rowId={acao.id} field="certificados_enviados" value={acao.certificados_enviados ?? 0} display={acao.certificados_enviados ?? 0} type="number" align="center" editingCell={editingCell} setEditingCell={setEditingCell} onSave={(nextValue) => handleInlineCellSave(acao, "certificados_enviados", nextValue)} />
                        <InlineTableCell key={`${acao.id}-certificados_aguardar-${editingCell?.rowId === acao.id && editingCell?.field === "certificados_aguardar" ? "edit" : "view"}`} rowId={acao.id} field="certificados_aguardar" value={acao.certificados_aguardar ?? 0} display={acao.certificados_aguardar ?? 0} type="number" align="center" editingCell={editingCell} setEditingCell={setEditingCell} onSave={(nextValue) => handleInlineCellSave(acao, "certificados_aguardar", nextValue)} />
                        <InlineTableCell key={`${acao.id}-doc_formador-${editingCell?.rowId === acao.id && editingCell?.field === "doc_formador" ? "edit" : "view"}`} rowId={acao.id} field="doc_formador" value={acao.doc_formador ? "Sim" : "Não"} display={displayBoolean(acao.doc_formador)} type="select" options={SIM_NAO_OPTIONS.map((option) => ({ value: option, label: option }))} align="center" editingCell={editingCell} setEditingCell={setEditingCell} onSave={(nextValue) => handleInlineCellSave(acao, "doc_formador", nextValue)} />
                        <InlineTableCell key={`${acao.id}-pag_formador-${editingCell?.rowId === acao.id && editingCell?.field === "pag_formador" ? "edit" : "view"}`} rowId={acao.id} field="pag_formador" value={acao.pag_formador ? "Sim" : "Não"} display={displayBoolean(acao.pag_formador)} type="select" options={SIM_NAO_OPTIONS.map((option) => ({ value: option, label: option }))} align="center" editingCell={editingCell} setEditingCell={setEditingCell} onSave={(nextValue) => handleInlineCellSave(acao, "pag_formador", nextValue)} />
                        <InlineTableCell key={`${acao.id}-data_pagamento-${editingCell?.rowId === acao.id && editingCell?.field === "data_pagamento" ? "edit" : "view"}`} rowId={acao.id} field="data_pagamento" value={acao.data_pagamento || ""} display={displayDate(acao.data_pagamento)} type="date" align="center" editingCell={editingCell} setEditingCell={setEditingCell} onSave={(nextValue) => handleInlineCellSave(acao, "data_pagamento", nextValue)} />
                        <InlineTableCell key={`${acao.id}-status_dtp-${editingCell?.rowId === acao.id && editingCell?.field === "status_dtp" ? "edit" : "view"}`} rowId={acao.id} field="status_dtp" value={acao.status_dtp || ""} display={acao.status_dtp} type="select" options={DTP_OPTIONS.map((option) => ({ value: option, label: option }))} align="center" editingCell={editingCell} setEditingCell={setEditingCell} onSave={(nextValue) => handleInlineCellSave(acao, "status_dtp", nextValue)} />
                        <td style={{ padding: 4, textAlign: "right", fontSize: "0.64rem" }}>
                          <button onClick={() => handleOpenEdit(acao)} title="Abrir edição completa" style={{ background: "transparent", border: "none", cursor: "pointer", color: "#94a3b8" }}>
                            <Icons.Edit size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}

            {activeTab === "checklist" && (
                <>
                    <thead style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                    {/* LINHA 1: ATIVIDADES */}
                    <tr>
                        <th rowSpan="3" style={{ padding: 4, textAlign: "left", color: "#475569", position: "sticky", left: 0, background: "#f8fafc", zIndex: 2, minWidth: 130, fontSize: "0.56rem", letterSpacing: "0.04em" }}>Curso</th>
                        
                        {checklistActivityGroups.map((atividade) => {
                        const rowSpan = atividade.hasTasks ? 1 : 3;
                        return (
                            <th key={atividade.id} colSpan={atividade.leafCount} rowSpan={rowSpan} style={{ padding: 4, textAlign: "center", color: "#1e293b", minWidth: Math.max(atividade.leafCount, 1) * 56, fontSize: "0.52rem", fontWeight: 800, background: "#fff7ed", lineHeight: 1.02, borderRight: "2px solid #94a3b8", boxShadow: "inset -1px 0 0 rgba(148, 163, 184, 0.35)", verticalAlign: "middle" }}>
                            {atividade.nome}
                            </th>
                        );
                        })}
                    </tr>
                    
                    {/* LINHA 2: TAREFAS */}
                    <tr>
                        {checklistActivityGroups
                        .filter((atividade) => atividade.hasTasks)
                        .flatMap((atividade) => atividade.tarefas.map((tarefa) => {
                            const isLastTaskInActivity = atividade.tarefas[atividade.tarefas.length - 1]?.id === tarefa.id;
                            const hasSubtasks = (tarefa.subtarefas || []).length > 0;
                            return (
                            <th key={tarefa.id} colSpan={hasSubtasks ? tarefa.subtarefas.length : 1} rowSpan={hasSubtasks ? 1 : 2} style={{ padding: 4, textAlign: "center", color: "#1e293b", fontSize: "0.5rem", fontWeight: 800, background: hasSubtasks ? "#eff6ff" : "#eef2ff", lineHeight: 1.02, borderRight: isLastTaskInActivity ? "2px solid #94a3b8" : "1px solid #e2e8f0", borderBottom: hasSubtasks ? "1px solid #e2e8f0" : "none", verticalAlign: "middle" }}>
                                {tarefa.nome}
                            </th>
                            );
                        }))}
                    </tr>
                    
                    {/* LINHA 3: PASSOS */}
                    <tr>
                        {checklistStepHeaders.map((leaf, index) => {
                        // 1. Encontrar a atividade a que este passo pertence
                        const atividade = checklistActivityGroups.find(a => a.id === leaf.atividadeId);
                        // 2. Verificar se a tarefa deste passo é a ÚLTIMA tarefa dessa atividade
                        const isLastTask = atividade && atividade.tarefas[atividade.tarefas.length - 1].id === leaf.tarefaId;
                        // 3. Verificar se é o último passo dentro da sua própria tarefa
                        const isLastStepInTask = index === checklistStepHeaders.length - 1 || checklistStepHeaders[index + 1].tarefaId !== leaf.tarefaId;
                        
                        // A divisória grossa só acontece se estivermos mesmo no limite final da atividade!
                        const isActivityBoundary = isLastTask && isLastStepInTask;

                        return (
                            <th key={`${leaf.tarefaId}-${leaf.passoId}`} style={{ padding: 3, textAlign: "center", color: "#475569", minWidth: 64, fontSize: "0.48rem", fontWeight: 700, background: "#f8fafc", lineHeight: 1.0, borderRight: isActivityBoundary ? "2px solid #94a3b8" : "1px solid #e2e8f0" }}>
                            {leaf.passoNome}
                            </th>
                        );
                        })}
                    </tr>
                    </thead>
                    
                    <tbody>
                    {visibleFormacoes.length === 0 && <tr><td colSpan={checklistVisibleCount + 1} style={{ textAlign: "center", padding: 30, color: "#94a3b8" }}>Nenhuma formação para avaliar.</td></tr>}
                    {visibleFormacoes.map((acao) => (
                        <tr key={acao.id} style={{ borderBottom: "1px solid #f1f5f9" }} className="project-list-row">
                        <td style={{ padding: 4, fontSize: "0.64rem", fontWeight: 800, color: "#1e293b", position: "sticky", left: 0, background: "white", zIndex: 1, borderRight: "1px solid #e2e8f0", lineHeight: 1.2 }}>
                          {acao.codigo}
                        </td>
                        
                        {checklistBodyColumns.map((leaf, index) => {
                            const isActivityBoundary = checklistActivityGroups.some((atividade) => atividade.endIndex === index);
                            const borderStyle = isActivityBoundary ? "2px solid #94a3b8" : "1px solid #f1f5f9";
                            const bgStyle = isActivityBoundary ? "#fafafa" : "transparent";

                            const checklistKey = leaf.storageKey;
                            const state = acao.checklist?.[checklistKey] || "na";
                            const meta = CHECKLIST_META[state] || CHECKLIST_META.na;
                            
                            return (
                            <td key={`${acao.id}-${leaf.tarefaId}-${leaf.passoId}`} style={{ padding: 3, textAlign: "center", borderRight: borderStyle, background: bgStyle }}>
                                <button type="button" onClick={() => handleChecklistCellClick(acao.id, leaf, state)} title={`${leaf.atividadeNome} · ${leaf.tarefaNome} · ${leaf.passoNome}: ${meta.label}`} style={{ width: 18, height: 18, borderRadius: "50%", border: "none", background: meta.color, cursor: "pointer", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }} />
                            </td>
                            );
                        })}
                        </tr>
                    ))}
                    </tbody>
                </>
                )}

              {activeTab === "ccdr" && (
                <>
                  <thead style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                    <tr>
                      <th style={{ padding: 4, textAlign: "left", color: "#475569", fontSize: "0.6rem", fontWeight: 700, position: "sticky", left: 0, background: "#f8fafc", zIndex: 2, borderRight: "1px solid #e2e8f0", whiteSpace: "nowrap" }}>Curso</th>
                      <th style={{ padding: 4, textAlign: "center", color: "#475569", fontSize: "0.6rem", fontWeight: 700, whiteSpace: "nowrap" }}>Data realização</th>
                      <th style={{ padding: 4, textAlign: "center", color: "#475569", fontSize: "0.6rem", fontWeight: 700, whiteSpace: "nowrap" }}>Homol. Paga</th>
                      <th style={{ padding: 4, textAlign: "center", color: "#475569", fontSize: "0.6rem", fontWeight: 700, whiteSpace: "nowrap" }}>Data Envio Homol.</th>
                      <th style={{ padding: 4, textAlign: "center", color: "#475569", fontSize: "0.6rem", fontWeight: 700, whiteSpace: "nowrap" }}>Nº Homologação</th>
                      <th style={{ padding: 4, textAlign: "center", color: "#475569", fontSize: "0.6rem", fontWeight: 700, whiteSpace: "nowrap" }}>Comunicação Prévia</th>
                      <th style={{ padding: 4, textAlign: "center", color: "#475569", fontSize: "0.6rem", fontWeight: 700, whiteSpace: "nowrap" }}>Pagamento Exame</th>
                      <th style={{ padding: 4, textAlign: "center", color: "#475569", fontSize: "0.6rem", fontWeight: 700, whiteSpace: "nowrap" }}>Data Envio Cert.</th>
                      <th style={{ padding: 4, textAlign: "center", color: "#475569", fontSize: "0.6rem", fontWeight: 700, whiteSpace: "nowrap" }}>Faturação Cert.</th>
                      <th style={{ padding: 4, textAlign: "center", color: "#475569", fontSize: "0.6rem", fontWeight: 700, whiteSpace: "nowrap" }}>Receção Cert.</th>
                      <th style={{ padding: 4, textAlign: "center", color: "#475569", fontSize: "0.6rem", fontWeight: 700, whiteSpace: "nowrap" }}>Envio Formandos</th>
                      <th style={{ padding: 4, textAlign: "center", color: "#475569", fontSize: "0.6rem", fontWeight: 700, whiteSpace: "nowrap" }}>Modalidade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleFormacoes.length === 0 && <tr><td colSpan="12" style={{ textAlign: "center", padding: 30, color: "#94a3b8" }}>Nenhuma formação CCDR.</td></tr>}
                    {visibleFormacoes.map((acao) => (
                      <tr key={acao.id} style={{ borderBottom: "1px solid #f1f5f9" }} className="project-list-row">
                        <td style={{ padding: 4, fontSize: "0.64rem", fontWeight: 800, color: "#1e293b", position: "sticky", left: 0, background: "white", zIndex: 1, borderRight: "1px solid #e2e8f0", lineHeight: 1.2 }}>
                          {acao.codigo}
                        </td>
                        <InlineTableCell key={`${acao.id}-data_inicio`} rowId={acao.id} field="data_inicio" value={acao.data_inicio || ""} display={displayDate(acao.data_inicio)} type="date" align="center" editingCell={editingCell} setEditingCell={setEditingCell} onSave={(nextValue) => handleInlineCellSave(acao, "data_inicio", nextValue)} />
                        <InlineTableCell key={`${acao.id}-ccdr_paga`} rowId={acao.id} field="ccdr_paga" value={acao.ccdr_paga ? "Sim" : "Não"} display={displayBoolean(acao.ccdr_paga)} type="select" options={SIM_NAO_OPTIONS.map(o => ({ value: o, label: o }))} align="center" editingCell={editingCell} setEditingCell={setEditingCell} onSave={(nextValue) => handleInlineCellSave(acao, "ccdr_paga", nextValue)} />
                        <InlineTableCell key={`${acao.id}-ccdr_data_envio`} rowId={acao.id} field="ccdr_data_envio" value={acao.ccdr_data_envio || ""} display={displayDate(acao.ccdr_data_envio)} type="date" align="center" editingCell={editingCell} setEditingCell={setEditingCell} onSave={(nextValue) => handleInlineCellSave(acao, "ccdr_data_envio", nextValue)} />
                        <InlineTableCell key={`${acao.id}-ccdr_n_homologacao`} rowId={acao.id} field="ccdr_n_homologacao" value={acao.ccdr_n_homologacao || ""} display={acao.ccdr_n_homologacao || "-"} align="center" editingCell={editingCell} setEditingCell={setEditingCell} onSave={(nextValue) => handleInlineCellSave(acao, "ccdr_n_homologacao", nextValue)} />
                        <InlineTableCell key={`${acao.id}-ccdr_data_comunicacao`} rowId={acao.id} field="ccdr_data_comunicacao" value={acao.ccdr_data_comunicacao || ""} display={displayDate(acao.ccdr_data_comunicacao)} type="date" align="center" editingCell={editingCell} setEditingCell={setEditingCell} onSave={(nextValue) => handleInlineCellSave(acao, "ccdr_data_comunicacao", nextValue)} />
                        <InlineTableCell key={`${acao.id}-ccdr_pag_exame`} rowId={acao.id} field="ccdr_pag_exame" value={acao.ccdr_pag_exame || ""} display={acao.ccdr_pag_exame} type="select" options={SIM_NAO_NA_OPTIONS.map(o => ({ value: o, label: o }))} align="center" editingCell={editingCell} setEditingCell={setEditingCell} onSave={(nextValue) => handleInlineCellSave(acao, "ccdr_pag_exame", nextValue)} />
                        <InlineTableCell key={`${acao.id}-ccdr_cert_data_envio`} rowId={acao.id} field="ccdr_cert_data_envio" value={acao.ccdr_cert_data_envio || ""} display={displayDate(acao.ccdr_cert_data_envio)} type="date" align="center" editingCell={editingCell} setEditingCell={setEditingCell} onSave={(nextValue) => handleInlineCellSave(acao, "ccdr_cert_data_envio", nextValue)} />
                        <InlineTableCell key={`${acao.id}-ccdr_cert_faturacao`} rowId={acao.id} field="ccdr_cert_faturacao" value={acao.ccdr_cert_faturacao || ""} display={acao.ccdr_cert_faturacao} type="select" options={SIM_NAO_NA_OPTIONS.map(o => ({ value: o, label: o }))} align="center" editingCell={editingCell} setEditingCell={setEditingCell} onSave={(nextValue) => handleInlineCellSave(acao, "ccdr_cert_faturacao", nextValue)} />
                        <InlineTableCell key={`${acao.id}-ccdr_data_rececao`} rowId={acao.id} field="ccdr_data_rececao" value={acao.ccdr_data_rececao || ""} display={displayDate(acao.ccdr_data_rececao)} type="date" align="center" editingCell={editingCell} setEditingCell={setEditingCell} onSave={(nextValue) => handleInlineCellSave(acao, "ccdr_data_rececao", nextValue)} />
                        <InlineTableCell key={`${acao.id}-ccdr_envio_cert_data`} rowId={acao.id} field="ccdr_envio_cert_data" value={acao.ccdr_envio_cert_data || ""} display={displayDate(acao.ccdr_envio_cert_data)} type="date" align="center" editingCell={editingCell} setEditingCell={setEditingCell} onSave={(nextValue) => handleInlineCellSave(acao, "ccdr_envio_cert_data", nextValue)} />
                        <InlineTableCell key={`${acao.id}-ccdr_modalidade`} rowId={acao.id} field="ccdr_modalidade" value={acao.ccdr_modalidade || ""} display={acao.ccdr_modalidade || "-"} align="center" editingCell={editingCell} setEditingCell={setEditingCell} onSave={(nextValue) => handleInlineCellSave(acao, "ccdr_modalidade", nextValue)} />
                      </tr>
                    ))}
                  </tbody>
                </>
              )}

              {activeTab === "dgadr" && (
                <>
                  <thead style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                    <tr>
                      <th style={{ padding: 4, textAlign: "left", color: "#475569", fontSize: "0.6rem", fontWeight: 700, position: "sticky", left: 0, background: "#f8fafc", zIndex: 2, borderRight: "1px solid #e2e8f0", whiteSpace: "nowrap" }}>Curso</th>
                      <th style={{ padding: 4, textAlign: "center", color: "#475569", fontSize: "0.6rem", fontWeight: 700, whiteSpace: "nowrap" }}>Caract. Formandos</th>
                      <th style={{ padding: 4, textAlign: "center", color: "#475569", fontSize: "0.6rem", fontWeight: 700, whiteSpace: "nowrap" }}>Data realização</th>
                      <th style={{ padding: 4, textAlign: "center", color: "#475569", fontSize: "0.6rem", fontWeight: 700, whiteSpace: "nowrap" }}>Homol. Paga</th>
                      <th style={{ padding: 4, textAlign: "center", color: "#475569", fontSize: "0.6rem", fontWeight: 700, whiteSpace: "nowrap" }}>Data Envio Homol.</th>
                      <th style={{ padding: 4, textAlign: "center", color: "#475569", fontSize: "0.6rem", fontWeight: 700, whiteSpace: "nowrap" }}>Nº Homologação</th>
                      <th style={{ padding: 4, textAlign: "center", color: "#475569", fontSize: "0.6rem", fontWeight: 700, whiteSpace: "nowrap" }}>Comunicação Prévia</th>
                      <th style={{ padding: 4, textAlign: "center", color: "#475569", fontSize: "0.6rem", fontWeight: 700, whiteSpace: "nowrap" }}>Pagamento Exame</th>
                      <th style={{ padding: 4, textAlign: "center", color: "#475569", fontSize: "0.6rem", fontWeight: 700, whiteSpace: "nowrap" }}>Data Envio Cert.</th>
                      <th style={{ padding: 4, textAlign: "center", color: "#475569", fontSize: "0.6rem", fontWeight: 700, whiteSpace: "nowrap" }}>Faturação Cert.</th>
                      <th style={{ padding: 4, textAlign: "center", color: "#475569", fontSize: "0.6rem", fontWeight: 700, whiteSpace: "nowrap" }}>Receção Cert.</th>
                      <th style={{ padding: 4, textAlign: "center", color: "#475569", fontSize: "0.6rem", fontWeight: 700, whiteSpace: "nowrap" }}>Envio Formandos</th>
                      <th style={{ padding: 4, textAlign: "center", color: "#475569", fontSize: "0.6rem", fontWeight: 700, whiteSpace: "nowrap" }}>Modalidade</th>
                      <th style={{ padding: 4, textAlign: "center", color: "#475569", fontSize: "0.6rem", fontWeight: 700, whiteSpace: "nowrap" }}>Pedido Cartões</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleFormacoes.length === 0 && <tr><td colSpan="14" style={{ textAlign: "center", padding: 30, color: "#94a3b8" }}>Nenhuma formação DGADR.</td></tr>}
                    {visibleFormacoes.map((acao) => (
                      <tr key={acao.id} style={{ borderBottom: "1px solid #f1f5f9" }} className="project-list-row">
                        <td style={{ padding: 4, fontSize: "0.64rem", fontWeight: 800, color: "#1e293b", position: "sticky", left: 0, background: "white", zIndex: 1, borderRight: "1px solid #e2e8f0", lineHeight: 1.2 }}>
                          {acao.codigo}
                        </td>
                        <InlineTableCell key={`${acao.id}-dgadr_data_caracterizacao`} rowId={acao.id} field="dgadr_data_caracterizacao" value={acao.dgadr_data_caracterizacao || ""} display={displayDate(acao.dgadr_data_caracterizacao)} type="date" align="center" editingCell={editingCell} setEditingCell={setEditingCell} onSave={(nextValue) => handleInlineCellSave(acao, "dgadr_data_caracterizacao", nextValue)} />
                        <InlineTableCell key={`${acao.id}-data_inicio`} rowId={acao.id} field="data_inicio" value={acao.data_inicio || ""} display={displayDate(acao.data_inicio)} type="date" align="center" editingCell={editingCell} setEditingCell={setEditingCell} onSave={(nextValue) => handleInlineCellSave(acao, "data_inicio", nextValue)} />
                        <InlineTableCell key={`${acao.id}-dgadr_paga`} rowId={acao.id} field="dgadr_paga" value={acao.dgadr_paga ? "Sim" : "Não"} display={displayBoolean(acao.dgadr_paga)} type="select" options={SIM_NAO_OPTIONS.map(o => ({ value: o, label: o }))} align="center" editingCell={editingCell} setEditingCell={setEditingCell} onSave={(nextValue) => handleInlineCellSave(acao, "dgadr_paga", nextValue)} />
                        <InlineTableCell key={`${acao.id}-dgadr_data_envio`} rowId={acao.id} field="dgadr_data_envio" value={acao.dgadr_data_envio || ""} display={displayDate(acao.dgadr_data_envio)} type="date" align="center" editingCell={editingCell} setEditingCell={setEditingCell} onSave={(nextValue) => handleInlineCellSave(acao, "dgadr_data_envio", nextValue)} />
                        <InlineTableCell key={`${acao.id}-dgadr_n_homologacao`} rowId={acao.id} field="dgadr_n_homologacao" value={acao.dgadr_n_homologacao || ""} display={acao.dgadr_n_homologacao || "-"} align="center" editingCell={editingCell} setEditingCell={setEditingCell} onSave={(nextValue) => handleInlineCellSave(acao, "dgadr_n_homologacao", nextValue)} />
                        <InlineTableCell key={`${acao.id}-dgadr_data_comunicacao`} rowId={acao.id} field="dgadr_data_comunicacao" value={acao.dgadr_data_comunicacao || ""} display={displayDate(acao.dgadr_data_comunicacao)} type="date" align="center" editingCell={editingCell} setEditingCell={setEditingCell} onSave={(nextValue) => handleInlineCellSave(acao, "dgadr_data_comunicacao", nextValue)} />
                        <InlineTableCell key={`${acao.id}-dgadr_pag_exame`} rowId={acao.id} field="dgadr_pag_exame" value={acao.dgadr_pag_exame || ""} display={acao.dgadr_pag_exame} type="select" options={SIM_NAO_NA_OPTIONS.map(o => ({ value: o, label: o }))} align="center" editingCell={editingCell} setEditingCell={setEditingCell} onSave={(nextValue) => handleInlineCellSave(acao, "dgadr_pag_exame", nextValue)} />
                        <InlineTableCell key={`${acao.id}-dgadr_cert_data_envio`} rowId={acao.id} field="dgadr_cert_data_envio" value={acao.dgadr_cert_data_envio || ""} display={displayDate(acao.dgadr_cert_data_envio)} type="date" align="center" editingCell={editingCell} setEditingCell={setEditingCell} onSave={(nextValue) => handleInlineCellSave(acao, "dgadr_cert_data_envio", nextValue)} />
                        <InlineTableCell key={`${acao.id}-dgadr_cert_faturacao`} rowId={acao.id} field="dgadr_cert_faturacao" value={acao.dgadr_cert_faturacao || ""} display={acao.dgadr_cert_faturacao} type="select" options={SIM_NAO_NA_OPTIONS.map(o => ({ value: o, label: o }))} align="center" editingCell={editingCell} setEditingCell={setEditingCell} onSave={(nextValue) => handleInlineCellSave(acao, "dgadr_cert_faturacao", nextValue)} />
                        <InlineTableCell key={`${acao.id}-dgadr_data_rececao`} rowId={acao.id} field="dgadr_data_rececao" value={acao.dgadr_data_rececao || ""} display={displayDate(acao.dgadr_data_rececao)} type="date" align="center" editingCell={editingCell} setEditingCell={setEditingCell} onSave={(nextValue) => handleInlineCellSave(acao, "dgadr_data_rececao", nextValue)} />
                        <InlineTableCell key={`${acao.id}-dgadr_envio_cert_data`} rowId={acao.id} field="dgadr_envio_cert_data" value={acao.dgadr_envio_cert_data || ""} display={displayDate(acao.dgadr_envio_cert_data)} type="date" align="center" editingCell={editingCell} setEditingCell={setEditingCell} onSave={(nextValue) => handleInlineCellSave(acao, "dgadr_envio_cert_data", nextValue)} />
                        <InlineTableCell key={`${acao.id}-dgadr_modalidade`} rowId={acao.id} field="dgadr_modalidade" value={acao.dgadr_modalidade || ""} display={acao.dgadr_modalidade || "-"} align="center" editingCell={editingCell} setEditingCell={setEditingCell} onSave={(nextValue) => handleInlineCellSave(acao, "dgadr_modalidade", nextValue)} />
                        <InlineTableCell key={`${acao.id}-dgadr_pedido_cartoes`} rowId={acao.id} field="dgadr_pedido_cartoes" value={acao.dgadr_pedido_cartoes || ""} display={displayDate(acao.dgadr_pedido_cartoes)} type="date" align="center" editingCell={editingCell} setEditingCell={setEditingCell} onSave={(nextValue) => handleInlineCellSave(acao, "dgadr_pedido_cartoes", nextValue)} />
                      </tr>
                    ))}
                  </tbody>
                </>
              )}
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <ModalPortal>
          <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15, 23, 42, 0.7)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 99999, padding: 16 }} onClick={() => setShowModal(false)}>
            <div style={{ background: "#fff", width: "95%", maxWidth: 1120, borderRadius: 16, boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)", overflow: "hidden", display: "flex", flexDirection: "column", maxHeight: "92vh" }} onClick={(event) => event.stopPropagation()}>
              <div style={{ padding: "20px 25px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ background: "var(--color-bgSecondary)", color: "var(--color-btnPrimary)", padding: 10, borderRadius: 10, display: "flex" }}><Icons.Folder size={20} /></span>
                  <div>
                    <h3 style={{ margin: 0, color: "#1e293b", fontSize: "1.25rem", fontWeight: 800 }}>{editId ? "Editar Formação" : "Criar Nova Formação"}</h3>
                    <div style={{ fontSize: "0.82rem", color: "#64748b" }}>{buildCodigo(selectedYear, form.sequencia)} · ano {selectedYear}</div>
                  </div>
                </div>
                <button onClick={() => setShowModal(false)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#94a3b8" }}><Icons.Close size={20} /></button>
              </div>

              <div style={{ padding: 24, overflowY: "auto", background: "white", flex: 1 }} className="custom-scrollbar">
                <form onSubmit={handleFormSubmit}>
                  <SectionTitle>Dados Gerais</SectionTitle>
                  <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 16, marginBottom: 18 }}>
                    <Field label="Código *">
                      <input value={buildCodigo(selectedYear, form.sequencia)} readOnly style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#f8fafc", fontWeight: 800 }} />
                    </Field>
                    <Field label="Nome do Curso *">
                      <input value={form.nome_curso} onChange={(event) => setForm({ ...form, nome_curso: event.target.value })} required style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1" }} />
                    </Field>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 18 }}>
                    <Field label="Nome do Formador *">
                      <input value={form.nome_formador} onChange={(event) => setForm({ ...form, nome_formador: event.target.value })} required style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1" }} />
                    </Field>
                    <Field label="Área de Formação *">
                      <select value={form.area_formacao_id} onChange={(event) => setForm({ ...form, area_formacao_id: event.target.value })} required style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1", background: "white" }}>
                        <option value="">-- Selecione --</option>
                        {visibleAreasForForm.map((area) => <option key={area.id} value={area.id}>{area.nome}{area.ativo ? "" : " (Inativa)"}</option>)}
                      </select>
                    </Field>
                    <Field label="Homologação *">
                      <select value={form.homologacao_id} onChange={(event) => setForm({ ...form, homologacao_id: event.target.value })} required style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1", background: "white" }}>
                        <option value="">-- Selecione --</option>
                        {visibleHomologacoesForForm.map((item) => <option key={item.id} value={item.id}>{item.codigo} - {item.nome}{item.ativo ? "" : " (Inativa)"}</option>)}
                      </select>
                    </Field>
                  </div>

                  {isCreating ? (
                    <>
                      <SectionTitle>Dados Iniciais</SectionTitle>
                      <div style={{ display: "grid", gridTemplateColumns: "100px 1fr 1fr", gap: 16, marginBottom: 18 }}>
                        <Field label="Carga (h) *">
                          <input type="number" min="1" value={form.carga_horaria} onChange={(event) => setForm({ ...form, carga_horaria: Number(event.target.value) })} required style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1" }} />
                        </Field>
                        <Field label="Local *">
                          <input value={form.local} onChange={(event) => setForm({ ...form, local: event.target.value })} required style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1" }} />
                        </Field>
                        <Field label="Regime *">
                          <select value={form.regime} onChange={(event) => setForm({ ...form, regime: event.target.value })} required style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1", background: "white" }}>
                            {REGIME_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                          </select>
                        </Field>
                      </div>
                      <p style={{ margin: 0, color: "#64748b", fontSize: "0.88rem", lineHeight: 1.5 }}>
                        No momento da criação só precisas de preencher os campos obrigatórios. O resto dos dados de planeamento, execução, certificados e homologações fica disponível depois, na edição da formação.
                      </p>
                    </>
                  ) : (
                    <>
                      <div style={{ display: "grid", gridTemplateColumns: "100px 1fr 1fr 1fr", gap: 16, marginBottom: 18 }}>
                        <Field label="Carga (h) *">
                          <input type="number" min="1" value={form.carga_horaria} onChange={(event) => setForm({ ...form, carga_horaria: Number(event.target.value) })} required style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1" }} />
                        </Field>
                        <Field label="Local *">
                          <input value={form.local} onChange={(event) => setForm({ ...form, local: event.target.value })} required style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1" }} />
                        </Field>
                        <Field label="Data início">
                          <input type="date" value={form.data_inicio} onChange={(event) => setForm({ ...form, data_inicio: event.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1" }} />
                        </Field>
                        <Field label="Data fim">
                          <input type="date" value={form.data_fim} onChange={(event) => setForm({ ...form, data_fim: event.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1" }} />
                        </Field>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 16, marginBottom: 18 }}>
                        <Field label="Regime *">
                          <select value={form.regime} onChange={(event) => setForm({ ...form, regime: event.target.value })} required style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1", background: "white" }}>
                            {REGIME_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                          </select>
                        </Field>
                        <Field label="Status do Curso *">
                          <select value={form.status_curso} onChange={(event) => setForm({ ...form, status_curso: event.target.value })} required style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1", background: "white" }}>
                            {COURSE_STATUS_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                          </select>
                        </Field>
                        <Field label="Status DTP *">
                          <select value={form.status_dtp} onChange={(event) => setForm({ ...form, status_dtp: event.target.value })} required style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1", background: "white" }}>
                            {DTP_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                          </select>
                        </Field>
                        <Field label="Homologação rápida">
                          <div style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#f8fafc", fontWeight: 800, color: "#475569" }}>{homologacoesById.get(form.homologacao_id)?.codigo || "-"}</div>
                        </Field>
                      </div>

                      <SectionTitle>Participantes e Certificados</SectionTitle>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 16, marginBottom: 18 }}>
                        {[
                          ["Total de Inscritos", "total_inscritos"],
                          ["Nº de Empresas", "n_empresas"],
                          ["Nº de Particulares", "n_particulares"],
                          ["Nº de Desistências", "n_desistencias"],
                          ["Nº de Certificados", "n_certificados"],
                        ].map(([label, key]) => (
                          <Field key={key} label={label}>
                            <input type="number" min="0" value={form[key]} onChange={(event) => setForm({ ...form, [key]: Number(event.target.value) })} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1" }} />
                          </Field>
                        ))}
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 16, marginBottom: 18 }}>
                        <Field label="Certificados Emitidos">
                          <input type="number" min="0" value={form.certificados_emitidos} onChange={(event) => setForm({ ...form, certificados_emitidos: Number(event.target.value) })} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1" }} />
                        </Field>
                        <Field label="Certificados Enviados">
                          <input type="number" min="0" value={form.certificados_enviados} onChange={(event) => setForm({ ...form, certificados_enviados: Number(event.target.value) })} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1" }} />
                        </Field>
                        <Field label="Certificados A Aguardar">
                          <input type="number" min="0" value={form.certificados_aguardar} onChange={(event) => setForm({ ...form, certificados_aguardar: Number(event.target.value) })} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1" }} />
                        </Field>
                        <Field label="Volume de Formação">
                          <input type="number" readOnly value={selectedTotalVolume} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#f8fafc", fontWeight: 800 }} />
                        </Field>
                      </div>

                      <SectionTitle>Documentos e Pagamento</SectionTitle>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 16, marginBottom: 18 }}>
                        <Field label="Documentos do Formador">
                          <select value={form.doc_formador ? "Sim" : "Não"} onChange={(event) => setForm({ ...form, doc_formador: event.target.value === "Sim" })} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1", background: "white" }}>
                            {SIM_NAO_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                          </select>
                        </Field>
                        <Field label="Pagamento Formador">
                          <select value={form.pag_formador ? "Sim" : "Não"} onChange={(event) => setForm({ ...form, pag_formador: event.target.value === "Sim" })} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1", background: "white" }}>
                            {SIM_NAO_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                          </select>
                        </Field>
                        <Field label="Data de Pagamento">
                          <input type="date" value={form.data_pagamento} onChange={(event) => setForm({ ...form, data_pagamento: event.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1" }} />
                        </Field>
                        <Field label="Status DTP">
                          <div style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#f8fafc", fontWeight: 800, color: "#475569" }}>{form.status_dtp}</div>
                        </Field>
                      </div>

                      {formHomologacaoCodigo === "CCDR" && (
                        <>
                          <SectionTitle>CCDR</SectionTitle>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 16, marginBottom: 18 }}>
                            <Field label="Ação paga">
                              <select value={form.ccdr_paga ? "Sim" : "Não"} onChange={(event) => setForm({ ...form, ccdr_paga: event.target.value === "Sim" })} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1", background: "white" }}>
                                {SIM_NAO_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                              </select>
                            </Field>
                            <Field label="Data de envio para CCDR">
                              <input type="date" value={form.ccdr_data_envio} onChange={(event) => setForm({ ...form, ccdr_data_envio: event.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1" }} />
                            </Field>
                            <Field label="Nº homologação">
                              <input value={form.ccdr_n_homologacao} onChange={(event) => setForm({ ...form, ccdr_n_homologacao: event.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1" }} />
                            </Field>
                            <Field label="Data da comunicação prévia">
                              <input type="date" value={form.ccdr_data_comunicacao} onChange={(event) => setForm({ ...form, ccdr_data_comunicacao: event.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1" }} />
                            </Field>
                          </div>

                          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 16, marginBottom: 18 }}>
                            <Field label="Pagamento Exame">
                              <select value={form.ccdr_pag_exame} onChange={(event) => setForm({ ...form, ccdr_pag_exame: event.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1", background: "white" }}>
                                {SIM_NAO_NA_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                              </select>
                            </Field>
                            <Field label="Homologação certificados - Data envio">
                              <input type="date" value={form.ccdr_cert_data_envio} onChange={(event) => setForm({ ...form, ccdr_cert_data_envio: event.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1" }} />
                            </Field>
                            <Field label="Dados para faturação">
                              <select value={form.ccdr_cert_faturacao} onChange={(event) => setForm({ ...form, ccdr_cert_faturacao: event.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1", background: "white" }}>
                                {SIM_NAO_NA_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                              </select>
                            </Field>
                            <Field label="Data de receção dos certificados">
                              <input type="date" value={form.ccdr_data_rececao} onChange={(event) => setForm({ ...form, ccdr_data_rececao: event.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1" }} />
                            </Field>
                          </div>

                          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 16, marginBottom: 18 }}>
                            <Field label="Envio Certificados/Cartões - Data de envio">
                              <input type="date" value={form.ccdr_envio_cert_data} onChange={(event) => setForm({ ...form, ccdr_envio_cert_data: event.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1" }} />
                            </Field>
                            <Field label="Modalidade">
                              <input value={form.ccdr_modalidade} onChange={(event) => setForm({ ...form, ccdr_modalidade: event.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1" }} />
                            </Field>
                          </div>
                        </>
                      )}

                      {formHomologacaoCodigo === "DGADR" && (
                        <>
                          <SectionTitle>DGADR</SectionTitle>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 16, marginBottom: 18 }}>
                            <Field label="Data envio caracterização formandos">
                              <input type="date" value={form.dgadr_data_caracterizacao} onChange={(event) => setForm({ ...form, dgadr_data_caracterizacao: event.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1" }} />
                            </Field>
                            <Field label="Ação paga">
                              <select value={form.dgadr_paga ? "Sim" : "Não"} onChange={(event) => setForm({ ...form, dgadr_paga: event.target.value === "Sim" })} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1", background: "white" }}>
                                {SIM_NAO_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                              </select>
                            </Field>
                            <Field label="Data de envio para DGADR">
                              <input type="date" value={form.dgadr_data_envio} onChange={(event) => setForm({ ...form, dgadr_data_envio: event.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1" }} />
                            </Field>
                            <Field label="Nº homologação">
                              <input value={form.dgadr_n_homologacao} onChange={(event) => setForm({ ...form, dgadr_n_homologacao: event.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1" }} />
                            </Field>
                          </div>

                          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 16, marginBottom: 18 }}>
                            <Field label="Data da comunicação prévia">
                              <input type="date" value={form.dgadr_data_comunicacao} onChange={(event) => setForm({ ...form, dgadr_data_comunicacao: event.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1" }} />
                            </Field>
                            <Field label="Pagamento Exame">
                              <select value={form.dgadr_pag_exame} onChange={(event) => setForm({ ...form, dgadr_pag_exame: event.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1", background: "white" }}>
                                {SIM_NAO_NA_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                              </select>
                            </Field>
                            <Field label="Homologação certificados - Data envio">
                              <input type="date" value={form.dgadr_cert_data_envio} onChange={(event) => setForm({ ...form, dgadr_cert_data_envio: event.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1" }} />
                            </Field>
                            <Field label="Dados para faturação">
                              <select value={form.dgadr_cert_faturacao} onChange={(event) => setForm({ ...form, dgadr_cert_faturacao: event.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1", background: "white" }}>
                                {SIM_NAO_NA_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                              </select>
                            </Field>
                          </div>

                          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 16, marginBottom: 18 }}>
                            <Field label="Data de receção dos certificados">
                              <input type="date" value={form.dgadr_data_rececao} onChange={(event) => setForm({ ...form, dgadr_data_rececao: event.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1" }} />
                            </Field>
                            <Field label="Envio Certificados/Cartões - Data de envio">
                              <input type="date" value={form.dgadr_envio_cert_data} onChange={(event) => setForm({ ...form, dgadr_envio_cert_data: event.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1" }} />
                            </Field>
                            <Field label="Modalidade / Pedido de Cartões">
                              <input value={form.dgadr_modalidade || form.dgadr_pedido_cartoes} onChange={(event) => setForm({ ...form, dgadr_modalidade: event.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1" }} />
                            </Field>
                          </div>
                        </>
                      )}
                    </>
                  )}

                  <div style={{ padding: "20px 0 0 0", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
                    <button type="button" onClick={() => setShowModal(false)} style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid #cbd5e1", background: "white", color: "#475569", fontWeight: 700, cursor: "pointer" }}>Cancelar</button>
                    <button type="submit" disabled={isSubmitting} style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: "var(--color-btnPrimary)", color: "white", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
                      <Icons.Save /> {isSubmitting ? "A guardar..." : "Guardar"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {showSettingsModal && (
        <ModalPortal>
          <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15, 23, 42, 0.7)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 99999, padding: 16 }} onClick={() => setShowSettingsModal(false)}>
            <div style={{ background: "#fff", width: "95%", maxWidth: 980, borderRadius: 16, boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)", overflow: "hidden", display: "flex", flexDirection: "column", maxHeight: "92vh" }} onClick={(event) => event.stopPropagation()}>
              
              {/* CABEÇALHO COM FLEX-SHRINK: 0 PARA NÃO SER ESMAGADO */}
              <div style={{ padding: "20px 25px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc", flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Icons.Settings color="#475569" />
                  <div>
                    <h3 style={{ margin: 0, color: "#1e293b", fontSize: "1.1rem", fontWeight: 800 }}>Definições do Sistema</h3>
                    <div style={{ fontSize: "0.82rem", color: "#64748b" }}>Áreas de formação e entidades de homologação</div>
                  </div>
                </div>
                <button onClick={() => setShowSettingsModal(false)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#94a3b8" }}><Icons.Close size={20} /></button>
              </div>

              {/* CORPO DO MODAL DIVIDIDO: UMA DIV PARA SCROLL E OUTRA PARA ESPAÇAMENTO */}
              <div style={{ padding: 24, overflowY: "auto", flex: 1 }} className="custom-scrollbar">
                <div style={{ display: "grid", gap: 24 }}>
                  <SettingsList
                    title="Áreas de Formação"
                    items={settingsAreas}
                    createFields={[{ key: "newAreaNome", value: newAreaNome, onChange: setNewAreaNome, placeholder: "Nova área" }]}
                    itemFields={[{ key: "nome" }]}
                    emptyLabel="Ainda não existem áreas de formação."
                    onCreate={createArea}
                    onSaveItem={saveArea}
                    onUpdate={updateAreaDraft}
                    onToggle={toggleArea}
                  />

                  <SettingsList
                    title="Homologações"
                    items={settingsHomologacoes}
                    createFields={[
                      { key: "newHomologacaoCodigo", value: newHomologacaoCodigo, onChange: setNewHomologacaoCodigo, placeholder: "Código" },
                      { key: "newHomologacaoNome", value: newHomologacaoNome, onChange: setNewHomologacaoNome, placeholder: "Nome da homologação" },
                    ]}
                    itemFields={[{ key: "nome" }]}
                    emptyLabel="Ainda não existem homologações."
                    onCreate={createHomologacao}
                    onSaveItem={saveHomologacao}
                    onUpdate={updateHomologacaoDraft}
                    onToggle={toggleHomologacao}
                  />
                </div>
              </div>
              
            </div>
          </div>
        </ModalPortal>
      )}

      {notification && (
        <div className={`toast-container ${notification.type}`}>
          {notification.type === "success" ? "✅" : <Icons.Alert />} {notification.message}
        </div>
      )}
    </div>
  );
}