import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../services/supabase";
import { useAuth } from "../context/AuthContext";
import TimerSwitchModal from "../components/TimerSwitchModal";
import StopTimerNoteModal from "../components/StopTimerNoteModal";
import "./../styles/dashboard.css";

// --- ÍCONES SVG PROFISSIONAIS (SaaS Premium) ---
const Icons = {
  Search: ({ size = 14, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>,
  User: ({ size = 14, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>,
  Users: ({ size = 14, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>,
  Handshake: ({ size = 14, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m11 17 2 2a1 1 0 1 0 3-3"></path><path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06 7.06l-4.28 4.28a1 1 0 0 1-1.42 0l-3-3a1 1 0 0 1-1.42 0l-3 3a1 1 0 0 1 1.42 0l3 3a1 1 0 0 1 0 1.42l-3 3a1 1 0 0 1-1.42 0l-2.5-2.5a1 1 0 1 1 3-3l3.88-3.88a3 3 0 0 1 4.24 0z"></path></svg>,
  Globe: ({ size = 14, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>,
  Building: ({ size = 14, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><path d="M9 22v-4h6v4"></path><path d="M8 6h.01"></path><path d="M16 6h.01"></path><path d="M12 6h.01"></path><path d="M12 10h.01"></path><path d="M12 14h.01"></path><path d="M16 10h.01"></path><path d="M16 14h.01"></path><path d="M8 10h.01"></path><path d="M8 14h.01"></path></svg>,
  Stop: ({ size = 10, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none"><rect x="6" y="6" width="12" height="12" rx="2" ry="2"></rect></svg>,
  Play: ({ size = 12, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>,
  Plus: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>,
  Folder: ({ size = 20, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>,
  FolderOpen: ({ size = 20, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path><line x1="12" y1="11" x2="12" y2="17"></line><line x1="9" y1="14" x2="15" y2="14"></line></svg>,
  Calendar: ({ size = 14, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>,
  ArrowRight: ({ size = 14, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>,
  ArrowLeft: ({ size = 14, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>,
  Inbox: ({ size = 48, color = "#cbd5e1" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"></polyline><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path></svg>,
  Edit: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>,
  Trash: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>,
  Alert: ({ size = 40, color = "#ef4444" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>,
  Close: ({ size = 18, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>,
  Rocket: ({ size = 20, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"></path><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"></path><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"></path><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"></path></svg>,
  ClipboardList: ({ size = 20, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path></svg>,
  FileText: ({ size = 20, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>,
  Dollar: ({ size = 20, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>,
  Check: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>,
  Save: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>,
  ListTree: ({ size = 14, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
};

const ModalPortal = ({ children }) => {
  return createPortal(children, document.body);
};

const addDays = (dateStr, days) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    d.setDate(d.getDate() + (days || 0));
    return d.toISOString().split('T')[0];
};

const getClientDisplayName = (client) => {
    if (!client) return "";
    return client.sigla?.trim() || client.marca || "";
};

export default function Projetos() {
  const { user } = useAuth();
  const navigate = useNavigate(); 
  const location = useLocation(); 

  const [projetos, setProjetos] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [activeLog, setActiveLog] = useState(null); 
  const [notification, setNotification] = useState(null);
    const [timerSwitchModal, setTimerSwitchModal] = useState({ show: false, message: "", pendingProject: null });
        const [stopNoteModal, setStopNoteModal] = useState({ show: false });
  
  const [confirmDialog, setConfirmDialog] = useState({ show: false, message: '', confirmText: 'Confirmar', isDanger: true, onConfirm: null });
  
  const [busca, setBusca] = useState("");
  const [mostrarConcluidos, setMostrarConcluidos] = useState(false);
  const [showOnlyMine, setShowOnlyMine] = useState(true); 
  const [selectedCategoria, setSelectedCategoria] = useState(null); 

  const [clientes, setClientes] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [staff, setStaff] = useState([]); 
    const [entidadePessoas, setEntidadePessoas] = useState([]);

  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [isViewOnly, setIsViewOnly] = useState(false);
  const [activeTab, setActiveTab] = useState("geral");
    const [parceiroSelecionado, setParceiroSelecionado] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  // States para a Preview de Atividades
  const [templateTree, setTemplateTree] = useState([]);
  const [templateSelection, setTemplateSelection] = useState({});

  const initialForm = {
    titulo: "", descricao: "", 
    cliente_id: "", cliente_texto: "", 
    is_parceria: false, parceiros_ids: [],
    tipo_projeto_id: "",
    responsavel_id: "", colaboradores: [],
    estado: "pendente", data_inicio: "", data_fim: "",
    observacoes: "", programa: "", aviso: "", codigo_projeto: "",
    investimento: 0, incentivo: 0
  };

  const [form, setForm] = useState(initialForm);

  useEffect(() => {
    fetchData();
    checkActiveLog();
  }, [user]);

  // Efeito para carregar a árvore de atividades quando selecionamos um Tipo de Projeto
  useEffect(() => {
      if (!editId && form.tipo_projeto_id) {
          loadTemplateData(form.tipo_projeto_id);
      } else {
          setTemplateTree([]);
          setTemplateSelection({});
      }
  }, [form.tipo_projeto_id, editId]);

  useEffect(() => {
      if (location.state?.openNewProjectModal && location.state?.prefillClienteId) {
          setForm({ 
              ...initialForm, 
              cliente_id: location.state.prefillClienteId,
              data_inicio: new Date().toISOString().split('T')[0] 
          });
          setEditId(null);
          setIsViewOnly(false);
          setActiveTab("geral");
          setShowModal(true); 
          
          navigate(location.pathname, { replace: true, state: {} });
      }
  }, [location.state, navigate]);

  useEffect(() => {
      if (!showModal) {
          setEntidadePessoas([]);
          return;
      }

      const targetClientIds = [
          ...(form.cliente_id ? [String(form.cliente_id)] : []),
          ...((form.parceiros_ids || []).map((id) => String(id)) || [])
      ];
      const uniqueClientIds = [...new Set(targetClientIds.filter(Boolean))];

      if (uniqueClientIds.length === 0) {
          setEntidadePessoas([]);
          return;
      }

      let cancelled = false;
      (async () => {
          const { data } = await supabase
              .from("contactos_cliente")
              .select("id, cliente_id, nome_contacto, cargo, email, clientes(marca, sigla)")
              .in("cliente_id", uniqueClientIds)
              .order("nome_contacto", { ascending: true });
          if (!cancelled) setEntidadePessoas(data || []);
      })();

      return () => { cancelled = true; };
  }, [showModal, form.cliente_id, form.parceiros_ids]);

  const showToast = (message, type = 'success') => {
      setNotification({ message, type });
      setTimeout(() => setNotification(null), 3500);
  };

  async function loadTemplateData(tipoId) {
      try {
          const { data: ativs } = await supabase.from("template_atividades").select("*").eq("tipo_projeto_id", tipoId).order("ordem");
          if (!ativs || ativs.length === 0) {
              setTemplateTree([]); return;
          }

          const { data: tars } = await supabase.from("template_tarefas").select("*").in("template_atividade_id", ativs.map(a => a.id)).order("ordem");
          
          let subs = [];
          if (tars && tars.length > 0) {
             const res = await supabase.from("template_subtarefas").select("*").in("template_tarefa_id", tars.map(t => t.id)).order("ordem");
             subs = res.data || [];
          }

          const tree = ativs.map(a => ({
              ...a,
              tarefas: (tars || []).filter(t => t.template_atividade_id === a.id).map(t => ({
                  ...t,
                  subtarefas: (subs || []).filter(s => s.template_tarefa_id === t.id)
              }))
          }));
          
          setTemplateTree(tree);

          // By default, select everything
          const sel = {};
          ativs.forEach(a => sel[`a_${a.id}`] = true);
          (tars || []).forEach(t => sel[`t_${t.id}`] = true);
          (subs || []).forEach(s => sel[`s_${s.id}`] = true);
          setTemplateSelection(sel);

      } catch (err) {
          console.error("Erro ao carregar templates", err);
      }
  }

  const toggleTemplateSelection = (type, id) => {
      setTemplateSelection(prev => ({ ...prev, [`${type}_${id}`]: !prev[`${type}_${id}`] }));
  };

  async function fetchData() {
    setLoading(true);
    const { data: projData, error } = await supabase
      .from("projetos")
      .select(`
          *, 
                    clientes ( marca, sigla ), 
          tipos_projeto ( nome ), 
          profiles ( nome, email ),
          atividades ( 
              responsavel_id, 
              tarefas ( 
                  responsavel_id, 
                  subtarefas ( responsavel_id ) 
              ) 
          )
      `)
      .order("created_at", { ascending: false });

    if (error) console.error("Erro no fetch:", error);
    else setProjetos(projData || []);

    const { data: cliData } = await supabase.from("clientes").select("id, marca, sigla").order("marca");
    setClientes(cliData || []);

    const { data: tipoData } = await supabase.from("tipos_projeto").select("id, nome").order("nome");
    setTipos(tipoData || []);

    const { data: staffData } = await supabase.from("profiles").select("id, nome, email").order("nome");
    setStaff(staffData || []);

    setLoading(false);
  }

  async function checkActiveLog() {
    if(!user?.id) return;
    const { data } = await supabase.from("task_logs").select("*").eq("user_id", user.id).is("end_time", null).maybeSingle();
        setActiveLog(data || null);
  }

    async function stopLogById(logToStop, stopNote = "") {
        if (!logToStop) return null;
        const diffMins = Math.max(1, Math.floor((new Date() - new Date(logToStop.start_time)) / 60000));
        const stopTimestamp = new Date().toISOString();
        const note = typeof stopNote === "string" ? stopNote.trim() : "";
        const payload = { end_time: stopTimestamp, duration_minutes: diffMins };
        if (note) payload.observacoes = note;

        let { error } = await supabase
            .from("task_logs")
            .update(payload)
            .eq("id", logToStop.id);

        if (error && note) {
            const retry = await supabase
                .from("task_logs")
                .update({ end_time: stopTimestamp, duration_minutes: diffMins })
                .eq("id", logToStop.id);
            error = retry.error;
        }

        if (error) {
            showToast("Erro ao terminar o cronómetro atual.", "error");
            return null;
        }

        return diffMins;
    }

    async function getActiveLogLabel() {
        if (!activeLog) return "atividade em curso";

        if (activeLog.projeto_id) {
            const proj = projetos.find(p => p.id === activeLog.projeto_id);
            if (proj?.titulo) return `projeto \"${proj.titulo}\"`;
        }

        if (activeLog.task_id || activeLog.tarefa_id) {
            const taskId = activeLog.task_id || activeLog.tarefa_id;
            const { data } = await supabase.from("tarefas").select("titulo").eq("id", taskId).maybeSingle();
            if (data?.titulo) return `tarefa \"${data.titulo}\"`;
        }

        if (activeLog.atividade_id) {
            const { data } = await supabase.from("atividades").select("titulo").eq("id", activeLog.atividade_id).maybeSingle();
            if (data?.titulo) return `atividade \"${data.titulo}\"`;
        }

        return "atividade em curso";
    }

    async function startProjectDirect(proj) {
        const { data, error } = await supabase
            .from("task_logs")
            .insert([{ user_id: user.id, projeto_id: proj.id, start_time: new Date().toISOString() }])
            .select()
            .single();
        if (!error) { setActiveLog(data); showToast("Cronómetro iniciado!"); }
    }

    async function confirmTimerSwitch() {
        const nextProj = timerSwitchModal.pendingProject;
        setTimerSwitchModal({ show: false, message: "", pendingProject: null });
        if (!nextProj) return;

        const mins = await stopLogById(activeLog);
        if (mins === null) return;

        showToast(`Cronómetro anterior terminado (${mins} min).`, "success");
        await startProjectDirect(nextProj);
    }

    function cancelTimerSwitch() {
        setTimerSwitchModal({ show: false, message: "", pendingProject: null });
        showToast("Mantivemos o cronómetro atual em execução.", "info");
    }

      function getStopCompleteLabel(logEntry) {
          if (logEntry?.projeto_id) return "Marcar projeto como concluido";
          if (logEntry?.atividade_id) return "Marcar atividade como concluida";
          if (logEntry?.task_id) return "Marcar tarefa como concluida";
          return "Marcar item como concluido";
      }

      async function completeLogItem(logEntry) {
          if (!logEntry) return;

          if (logEntry.projeto_id) {
              await supabase.from("projetos").update({ estado: "concluido" }).eq("id", logEntry.projeto_id);
              return;
          }

          if (logEntry.atividade_id) {
              await supabase.from("atividades").update({ estado: "concluido" }).eq("id", logEntry.atividade_id);
              return;
          }

          if (logEntry.task_id) {
              await supabase
                  .from("tarefas")
                  .update({ estado: "concluido", data_conclusao: new Date().toISOString() })
                  .eq("id", logEntry.task_id);
          }
      }

  async function handleStartProjeto(e, proj) {
    e.stopPropagation(); 
        if (activeLog) {
            const atual = await getActiveLogLabel();
            setTimerSwitchModal({
                show: true,
                message: `Deseja terminar ${atual} para iniciar o projeto \"${proj.titulo}\"?`,
                pendingProject: proj
            });
            return;
        }

        await startProjectDirect(proj);
  }

    function handleStopLog(e) {
        if (e) e.stopPropagation();
        if (!activeLog) return;
        setStopNoteModal({ show: true });
    }

    function closeStopNoteModal() {
        setStopNoteModal({ show: false });
    }

    async function confirmStopWithNote(note, shouldComplete) {
        setStopNoteModal({ show: false });
        if (!activeLog) return;

        const logToStop = activeLog;

        const mins = await stopLogById(logToStop, note);
        if (mins === null) return;

        if (shouldComplete) await completeLogItem(logToStop);

        setActiveLog(null);
        showToast(shouldComplete ? `Tempo registado: ${mins} min. Item concluido.` : `Tempo registado: ${mins} min.`);
        fetchData();
    }

  function handleNovo() {
    setEditId(null); setIsViewOnly(false);
        setParceiroSelecionado("");
    setForm({ 
        ...initialForm, 
        tipo_projeto_id: (selectedCategoria && selectedCategoria !== 'sem-categoria') ? selectedCategoria : "", 
        data_inicio: new Date().toISOString().split('T')[0] 
    });
    setActiveTab("geral"); 
    setShowModal(true);
  }

  function handleEdit(e, proj) {
    e.stopPropagation();
    setEditId(proj.id); setIsViewOnly(false);
        setParceiroSelecionado("");
    setForm({
        titulo: proj.titulo || "", descricao: proj.descricao || "", 
        cliente_id: proj.cliente_id || "", cliente_texto: proj.cliente_texto || "",
        is_parceria: proj.is_parceria || false, parceiros_ids: proj.parceiros_ids || [],
        tipo_projeto_id: proj.tipo_projeto_id || "", 
        responsavel_id: proj.responsavel_id || "", colaboradores: proj.colaboradores || [],
        estado: proj.estado || "pendente", data_inicio: proj.data_inicio || "",
        data_fim: proj.data_fim || "", observacoes: proj.observacoes || "",
        programa: proj.programa || "", aviso: proj.aviso || "",
        codigo_projeto: proj.codigo_projeto || "", investimento: proj.investimento || 0, incentivo: proj.incentivo || 0
    });
    setActiveTab("geral");
    setShowModal(true);
  }

  function askDeleteProjeto(e, id, titulo) {
      e.stopPropagation();
      setConfirmDialog({
          show: true,
          message: `Tens a certeza que queres apagar o projeto "${titulo}"?\nEsta ação apagará todas as atividades e tempos associados de forma irreversível.`,
          confirmText: "Sim, Apagar",
          isDanger: true,
          onConfirm: async () => {
              setConfirmDialog({ show: false, message: '', confirmText: '', isDanger: true, onConfirm: null });
              
              try {
                  const { error } = await supabase.from("projetos").delete().eq("id", id);
                  if (error) throw error;
                  showToast("Projeto apagado com sucesso!");
                  setShowModal(false); 
                  fetchData();
              } catch (err) { 
                  showToast("Erro ao apagar. O projeto tem atividades ativas.", "error"); 
              }
          }
      });
  }

  // Toggles de Pills UI
  const handleToggleParceiro = (cId) => {
      setForm(prev => {
          if (String(cId) === String(prev.cliente_id)) return prev;
          return {
              ...prev,
              parceiros_ids: prev.parceiros_ids.includes(cId)
                  ? prev.parceiros_ids.filter(id => id !== cId)
                  : [...prev.parceiros_ids, cId]
          };
      });
  };

  const handleToggleColaborador = (sId) => {
      setForm(prev => {
          const selectedId = String(sId);
          const current = (prev.colaboradores || []).map((id) => String(id));
          return {
              ...prev,
              colaboradores: current.includes(selectedId)
                  ? current.filter(id => id !== selectedId)
                  : [...current, selectedId]
          };
      });
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setIsSubmitting(true);
    const payload = { ...form };

    if (payload.cliente_id === "") payload.cliente_id = null;
    if (payload.tipo_projeto_id === "") payload.tipo_projeto_id = null;
    if (payload.responsavel_id === "") payload.responsavel_id = null;
    if (payload.data_fim === "") payload.data_fim = null;

    if (!payload.cliente_id) {
        showToast("Seleciona um cliente principal para o projeto.", "warning");
        setIsSubmitting(false);
        return;
    }

    if (!payload.is_parceria) payload.parceiros_ids = [];
    payload.parceiros_ids = (payload.parceiros_ids || []).filter(
        (pid) => String(pid) !== String(payload.cliente_id)
    );
    payload.cliente_texto = "";

    try {
        if (editId) {
            const { error } = await supabase.from("projetos").update(payload).eq("id", editId);
            if (error) throw error;
            showToast("Projeto atualizado!");
            setShowModal(false); 
            fetchData(); 
        } else {
            const { data: newProj, error: errProj } = await supabase.from("projetos").insert([payload]).select().single();
            if (errProj) throw errProj;

            // Gerar Árvore de Atividades
            if (payload.tipo_projeto_id && templateTree.length > 0) {
                showToast("A preparar as atividades do projeto...", "info");
                let projDateStr = payload.data_inicio || new Date().toISOString().split('T')[0];
                const projEndStr = payload.data_fim || null; 
                let currentAtivDate = projDateStr;

                for (const tAtiv of templateTree) {
                    if (!templateSelection[`a_${tAtiv.id}`]) continue; 

                    const ativStart = currentAtivDate;
                    const ativEnd = (tAtiv.dias_estimados > 0) ? addDays(ativStart, tAtiv.dias_estimados) : (projEndStr || ativStart);

                    const { data: realAtiv } = await supabase.from("atividades").insert([{ 
                        projeto_id: newProj.id, titulo: tAtiv.nome, estado: 'pendente', ordem: tAtiv.ordem,
                        data_inicio: ativStart, data_fim: ativEnd, 
                        responsavel_id: payload.responsavel_id || null, colaboradores: payload.colaboradores,
                        descricao: tAtiv.descricao || null
                    }]).select().single();

                    currentAtivDate = addDays(currentAtivDate, tAtiv.dias_estimados || 0);

                    if (realAtiv && tAtiv.tarefas) {
                        let currentTarDate = ativStart;
                        
                        for (const tTar of tAtiv.tarefas) {
                            if (!templateSelection[`t_${tTar.id}`]) continue;

                            const tarStart = currentTarDate;
                            const tarEnd = (tTar.dias_estimados > 0) ? addDays(tarStart, tTar.dias_estimados) : (projEndStr || tarStart);

                            const { data: realTar } = await supabase.from("tarefas").insert([{ 
                                atividade_id: realAtiv.id, titulo: tTar.nome, estado: 'pendente', 
                                responsavel_id: payload.responsavel_id || null, colaboradores: payload.colaboradores,
                                ordem: tTar.ordem, data_inicio: tarStart, data_fim: tarEnd, descricao: tTar.descricao || null
                            }]).select().single();

                            currentTarDate = addDays(currentTarDate, tTar.dias_estimados || 0);
                            
                            if (realTar && tTar.subtarefas) {
                                let currentSubDate = tarStart;
                                const subTarefasParaInserir = [];

                                for (const ts of tTar.subtarefas) {
                                    if (!templateSelection[`s_${ts.id}`]) continue;

                                    const subEnd = (ts.dias_estimados > 0) ? addDays(currentSubDate, ts.dias_estimados) : (projEndStr || currentSubDate);
                                    currentSubDate = addDays(currentSubDate, ts.dias_estimados || 0); 
                                    
                                    subTarefasParaInserir.push({ 
                                        tarefa_id: realTar.id, titulo: ts.nome, estado: 'pendente',
                                        ordem: ts.ordem, data_fim: subEnd, 
                                        responsavel_id: payload.responsavel_id || null, colaboradores: payload.colaboradores
                                    });
                                }
                                
                                if (subTarefasParaInserir.length > 0) {
                                    await supabase.from("subtarefas").insert(subTarefasParaInserir);
                                }
                            }
                        }
                    }
                }
                if (!payload.data_fim) await supabase.from("projetos").update({ data_fim: currentAtivDate }).eq("id", newProj.id);
            }
            
            showToast("Projeto criado com sucesso!");
            setShowModal(false); 
            navigate(`/dashboard/projetos/${newProj.id}`);
        }
    } catch (err) { 
        showToast("Erro: " + err.message, "error"); 
    } finally { 
        setIsSubmitting(false); 
    }
  }

  const checkUserInvolvement = (p) => {
      if (!showOnlyMine) return true; 
      if (p.responsavel_id === user.id) return true; 
      if (p.colaboradores?.includes(user.id)) return true;
      
      if (p.atividades && p.atividades.some(a => {
          if (a.responsavel_id === user.id) return true;
          if (a.tarefas && a.tarefas.some(t => {
              if (t.responsavel_id === user.id) return true;
              if (t.subtarefas && t.subtarefas.some(s => s.responsavel_id === user.id)) return true;
              return false;
          })) return true;
          return false;
      })) return true;

      return false; 
  };

  const projetosFiltrados = projetos.filter(p => {
    if (!checkUserInvolvement(p)) return false;

    const termo = busca.toLowerCase();
        const matchBusca = p.titulo?.toLowerCase().includes(termo) || p.clientes?.marca?.toLowerCase().includes(termo) || p.clientes?.sigla?.toLowerCase().includes(termo) || p.codigo_projeto?.toLowerCase().includes(termo);
    if (!matchBusca) return false;

    const isInactive = p.estado === 'concluido' || p.estado === 'cancelado';
    if (!mostrarConcluidos && isInactive) return false;
    
    if (selectedCategoria) {
        if (selectedCategoria === 'sem-categoria' && p.tipo_projeto_id) return false;
        if (selectedCategoria !== 'sem-categoria' && p.tipo_projeto_id !== selectedCategoria) return false;
    }

    return true;
  });

  const countsPerCategory = {};
  projetos.forEach(p => {
      if (!checkUserInvolvement(p)) return;
      const termo = busca.toLowerCase();
      if (!(p.titulo?.toLowerCase().includes(termo) || p.clientes?.marca?.toLowerCase().includes(termo) || p.clientes?.sigla?.toLowerCase().includes(termo) || p.codigo_projeto?.toLowerCase().includes(termo))) return;
      if (!mostrarConcluidos && (p.estado === 'concluido' || p.estado === 'cancelado')) return;

      const catId = p.tipo_projeto_id || 'sem-categoria';
      countsPerCategory[catId] = (countsPerCategory[catId] || 0) + 1;
  });

  const renderDeadline = (dateString, estado) => {
    if (!dateString) return <span style={{fontSize: '0.75rem', color: '#cbd5e1', fontWeight: 'bold'}}>Sem prazo</span>;
    const deadline = new Date(dateString); deadline.setHours(0,0,0,0);
    const today = new Date(); today.setHours(0,0,0,0);
    const diffDays = Math.round((deadline.getTime() - today.getTime()) / (1000 * 3600 * 24));
    
    let color = '#64748b'; let bg = '#f1f5f9'; let text = `⏳ ${new Date(dateString).toLocaleDateString('pt-PT')}`;
    let icon = <Icons.Calendar />;

    if (estado === 'concluido') { color = '#94a3b8'; bg = 'transparent'; text = `Concluído`; icon = <span style={{fontSize:'0.65rem'}}>✔️</span>; } 
    else if (diffDays < 0) { color = '#ef4444'; bg = '#fee2e2'; text = `Atrasado (${Math.abs(diffDays)}d)`; icon = <span style={{fontSize:'0.65rem'}}>🔴</span>; } 
    else if (diffDays === 0) { color = '#d97706'; bg = '#fef3c7'; text = `Termina Hoje!`; icon = <span style={{fontSize:'0.65rem'}}>⚠️</span>; } 
    else if (diffDays <= 5) { color = '#ea580c'; bg = '#ffedd5'; text = `Em ${diffDays} dias`; icon = <span style={{fontSize:'0.65rem'}}>⏳</span>; }

    return <span style={{background: bg, color: color, padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px'}}>{icon} {text}</span>;
  };

  const projectColors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#f43f5e', '#14b8a6', '#0ea5e9', '#6366f1'];
  const getColorForCategory = (id) => {
      if (!id) return '#94a3b8'; 
      const hash = String(id).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      return projectColors[hash % projectColors.length];
  };

  const sectionTitleStyle = { fontSize: '0.8rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '15px', marginTop: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '5px', display: 'flex', alignItems: 'center', gap: '6px' };
  const labelStyle = { display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600', color: '#475569' };
  const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box' };
  const actionBtnStyle = { background: 'transparent', border: 'none', cursor: 'pointer', padding: '6px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.6, transition: '0.2s' };

  const tipoSelecionadoUI = tipos.find(t => String(t.id) === String(form.tipo_projeto_id));
  const isFormacaoSelected = tipoSelecionadoUI?.nome?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes('forma');

  if (loading) return <div className="page-container" style={{display:'flex', justifyContent:'center', alignItems:'center', height:'80vh'}}><div className="pulse-dot-white" style={{background:'#2563eb'}}></div></div>;

  return (
    <div className="page-container" style={{maxWidth: '1400px', margin: '0 auto', padding: '15px'}}>
      
      <div style={{background: 'white', padding: '20px 25px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', flexWrap: 'wrap', gap: '15px'}}>
        <div style={{display:'flex', alignItems:'center', gap:'20px'}}>
            <div style={{background: '#eff6ff', color: '#2563eb', padding: '12px', borderRadius: '12px', display: 'flex'}}><Icons.Folder size={24} /></div>
            <h1 style={{margin: 0, color: '#0f172a', fontSize: '1.8rem', fontWeight: '900', letterSpacing: '-0.02em'}}>Portfólio</h1>
            
            <div style={{display: 'flex', background: '#f1f5f9', borderRadius: '8px', padding: '4px', border: '1px solid #e2e8f0'}}>
                <button 
                    onClick={() => setShowOnlyMine(true)} 
                    style={{padding: '6px 16px', borderRadius: '6px', border: 'none', fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer', transition: '0.2s', background: showOnlyMine ? 'white' : 'transparent', color: showOnlyMine ? '#2563eb' : '#64748b', boxShadow: showOnlyMine ? '0 2px 4px rgba(0,0,0,0.05)' : 'none', display:'flex', alignItems:'center', gap:'6px'}}
                >
                    <Icons.User /> Os Meus
                </button>
                <button 
                    onClick={() => setShowOnlyMine(false)} 
                    style={{padding: '6px 16px', borderRadius: '6px', border: 'none', fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer', transition: '0.2s', background: !showOnlyMine ? 'white' : 'transparent', color: !showOnlyMine ? '#2563eb' : '#64748b', boxShadow: !showOnlyMine ? '0 2px 4px rgba(0,0,0,0.05)' : 'none', display:'flex', alignItems:'center', gap:'6px'}}
                >
                    <Icons.Globe /> Empresa
                </button>
            </div>
        </div>

        <div style={{display: 'flex', gap: '15px', alignItems: 'center'}}>
            {activeLog?.projeto_id && (
                <div style={{background:'#fee2e2', color:'#ef4444', padding:'6px 12px', borderRadius:'8px', fontSize:'0.8rem', display:'flex', alignItems:'center', gap:'8px', fontWeight: 'bold'}}>
                <span className="pulse-dot-red"></span> Em curso... 
                <button onClick={handleStopLog} style={{background:'white', color:'#ef4444', border:'1px solid #fecaca', borderRadius:'4px', padding:'4px 8px', cursor:'pointer', fontWeight:'bold', display:'flex', alignItems:'center', gap:'4px'}}><Icons.Stop /> Parar</button>
                </div>
            )}
            <button className="btn-primary hover-shadow" onClick={handleNovo} style={{display:'flex', alignItems:'center', gap:'8px', fontWeight:'bold'}}><Icons.Plus /> Novo Projeto</button>
        </div>
      </div>

      <div style={{background: '#f8fafc', padding: '12px 20px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '25px', display: 'flex', gap: '15px', alignItems: 'center'}}>
        <div style={{flex: 1, position: 'relative'}}>
            <span style={{position: 'absolute', left: '12px', top: '9px', color: '#94a3b8', fontSize: '0.85rem'}}><Icons.Search /></span>
            <input type="text" placeholder="Procurar projeto, código ou cliente..." value={busca} onChange={e => setBusca(e.target.value)} style={{width: '100%', padding: '8px 12px 8px 36px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.85rem', boxSizing: 'border-box'}} className="input-focus" />
        </div>
        <label style={{display:'flex', alignItems:'center', gap:'6px', cursor:'pointer', fontSize:'0.85rem', color: '#475569', fontWeight: 'bold'}}>
          <input type="checkbox" checked={mostrarConcluidos} onChange={e => setMostrarConcluidos(e.target.checked)} style={{width:'16px', height:'16px', accentColor: '#10b981'}} /> Mostrar Arquivados
        </label>
      </div>

      {!selectedCategoria && (
          <div className="fade-in">
              <h2 style={{fontSize: '1.2rem', color: '#475569', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px'}}><Icons.FolderOpen /> Áreas de Projeto</h2>
              
              <div className="category-grid">
                  {tipos.map(t => {
                      const count = countsPerCategory[t.id] || 0;
                      const color = getColorForCategory(t.id);
                      if (count === 0 && !busca && !mostrarConcluidos) return null; 

                      return (
                          <div 
                              key={t.id} 
                              onClick={() => setSelectedCategoria(t.id)}
                              className="category-card"
                              style={{ borderTop: `5px solid ${color}` }}
                          >
                              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                  <h3 style={{margin: 0, color: '#1e293b', fontSize: '1.2rem'}}>{t.nome}</h3>
                                  <span style={{background: `${color}20`, color: color, padding: '4px 12px', borderRadius: '20px', fontWeight: 'bold', fontSize: '0.85rem'}}>{count}</span>
                              </div>
                              <p style={{margin: '15px 0 0 0', fontSize: '0.85rem', color: '#94a3b8', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px'}}>Abrir portfólio <Icons.ArrowRight /></p>
                          </div>
                      );
                  })}

                  {(countsPerCategory['sem-categoria'] > 0) && (
                      <div 
                          onClick={() => setSelectedCategoria('sem-categoria')}
                          className="category-card"
                          style={{ borderTop: `5px solid #94a3b8` }}
                      >
                          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                              <h3 style={{margin: 0, color: '#1e293b', fontSize: '1.2rem'}}>Projetos Avulsos</h3>
                              <span style={{background: `#f1f5f9`, color: '#64748b', padding: '4px 12px', borderRadius: '20px', fontWeight: 'bold', fontSize: '0.85rem'}}>{countsPerCategory['sem-categoria']}</span>
                          </div>
                          <p style={{margin: '15px 0 0 0', fontSize: '0.85rem', color: '#94a3b8', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px'}}>Ver projetos sem modelo <Icons.ArrowRight /></p>
                      </div>
                  )}
              </div>
              
              {Object.keys(countsPerCategory).length === 0 && (
                  <div style={{textAlign: 'center', padding: '60px', background: 'white', borderRadius: '16px', border: '1px dashed #cbd5e1'}}>
                      <div style={{display: 'flex', justifyContent: 'center', marginBottom: '15px', color: '#cbd5e1'}}><Icons.Inbox /></div>
                      <h3 style={{color: '#1e293b', margin: '0 0 5px 0'}}>Nenhum projeto encontrado.</h3>
                      <p style={{color: '#64748b', margin: 0}}>Clica em "Novo Projeto" para começar a trabalhar.</p>
                  </div>
              )}
          </div>
      )}

      {selectedCategoria && (
          <div className="fade-in">
              <div style={{display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px', borderBottom: '1px solid #cbd5e1', paddingBottom: '15px'}}>
                  <button 
                      onClick={() => setSelectedCategoria(null)}
                      style={{background: 'white', border: '1px solid #cbd5e1', padding: '8px 15px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px', transition: '0.2s'}}
                      className="hover-shadow"
                  >
                      <Icons.ArrowLeft /> Voltar às Áreas
                  </button>
                  <h2 style={{margin: 0, fontSize: '1.4rem', color: '#1e293b', fontWeight: '800'}}>
                      {selectedCategoria === 'sem-categoria' ? 'Projetos Avulsos' : tipos.find(t => t.id === selectedCategoria)?.nome}
                  </h2>
              </div>

              <div className="project-grid">
                  {projetosFiltrados.length > 0 ? projetosFiltrados.map(p => {
                      const isCompleted = p.estado === 'concluido';
                      const isTimerActive = activeLog?.projeto_id === p.id;
                      const catColor = getColorForCategory(p.tipo_projeto_id);

                      // Lógica Display Cliente/Parceria
                      let clientDisplay = p.cliente_texto ? p.cliente_texto : (getClientDisplayName(p.clientes) || 'Sem Cliente');
                      let clientIcon = p.cliente_texto ? <Icons.FileText size={14} /> : <Icons.Building size={14} />;
                      
                      if (p.is_parceria && p.parceiros_ids?.length > 0) {
                          const parceirosNomes = p.parceiros_ids.map(id => getClientDisplayName(clientes.find(c => c.id === id))).filter(Boolean).join(', ');
                          clientDisplay = `Parceria: ${parceirosNomes}`;
                          clientIcon = <Icons.Handshake size={14} />;
                      }

                      return (
                          <div 
                              key={p.id} 
                              onClick={() => navigate(`/dashboard/projetos/${p.id}`)}
                              className="project-card hover-shadow"
                              style={{
                                  background: 'white', borderRadius: '16px', border: isTimerActive ? '2px solid #3b82f6' : '1px solid #e2e8f0', 
                                  padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px', cursor: 'pointer', transition: 'all 0.2s',
                                  opacity: isCompleted ? 0.6 : 1, position: 'relative', overflow: 'hidden'
                              }}
                          >
                              <div style={{position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: isCompleted ? '#cbd5e1' : catColor}}></div>

                              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
                                  <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '5px'}}>
                                      {p.codigo_projeto && <span style={{fontSize: '0.65rem', background: '#eff6ff', color: '#2563eb', padding: '2px 8px', borderRadius: '6px', fontWeight: '800', border: '1px solid #bfdbfe', fontFamily: 'monospace'}}>{p.codigo_projeto}</span>}
                                      <span style={{fontSize: '0.65rem', background: isCompleted ? '#f1f5f9' : '#f8fafc', color: isCompleted ? '#64748b' : '#475569', padding: '2px 8px', borderRadius: '6px', fontWeight: '800', border: '1px solid #e2e8f0', textTransform: 'uppercase'}}>{(p.estado || '').replace('_', ' ')}</span>
                                  </div>
                                  
                                  {!isCompleted && (
                                      <button 
                                          onClick={(e) => isTimerActive ? handleStopLog(e) : handleStartProjeto(e, p)} 
                                          style={{ background: isTimerActive ? '#fee2e2' : '#eff6ff', color: isTimerActive ? '#ef4444' : '#2563eb', border: 'none', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '0.2s' }}
                                          title={isTimerActive ? "Parar Timer" : "Iniciar Timer"}
                                          className={!isTimerActive ? "hover-blue-btn hover-shadow" : "hover-shadow"}
                                      >
                                          {isTimerActive ? <Icons.Stop /> : <Icons.Play />}
                                      </button>
                                  )}
                              </div>

                              <div>
                                  <h2 style={{margin: '0 0 8px 0', fontSize: '1.2rem', color: '#0f172a', fontWeight: '800', lineHeight: '1.2'}}>{p.titulo}</h2>
                                  <div style={{fontSize: '0.85rem', color: p.is_parceria ? '#8b5cf6' : '#475569', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                                      {clientIcon} {clientDisplay}
                                  </div>
                              </div>

                              <div style={{background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #f1f5f9'}}>
                                  <div style={{fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '4px'}}>Responsável Global</div>
                                  <div style={{fontSize: '0.85rem', color: '#334155', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                                      <Icons.User /> {p.profiles?.nome || '-'}
                                  </div>
                              </div>

                              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid #f1f5f9'}}>
                                  {renderDeadline(p.data_fim, p.estado)}
                                  <div style={{display: 'flex', gap: '6px'}}>
                                      <button onClick={(e) => handleEdit(e, p)} style={actionBtnStyle} className="hover-orange-text" title="Editar Projeto"><Icons.Edit /></button>
                                      <button onClick={(e) => askDeleteProjeto(e, p.id, p.titulo)} style={actionBtnStyle} className="hover-red-text" title="Apagar"><Icons.Trash /></button>
                                  </div>
                              </div>
                          </div>
                      );
                  }) : (
                      <div style={{gridColumn: '1 / -1', textAlign: 'center', padding: '60px', background: 'white', borderRadius: '16px', border: '1px dashed #cbd5e1'}}>
                          <div style={{display: 'flex', justifyContent: 'center', marginBottom: '15px', color: '#cbd5e1'}}><Icons.Inbox /></div>
                          <h3 style={{color: '#1e293b', margin: '0 0 5px 0'}}>Vazio por aqui.</h3>
                          <p style={{color: '#64748b', margin: 0}}>Não há projetos ativos nesta área.</p>
                      </div>
                  )}
              </div>
          </div>
      )}

      {/* 💡 MODAL DE CONFIRMAÇÃO GLOBAL */}
      {confirmDialog.show && (
          <ModalPortal>
              <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999}}>
                  <div style={{background: 'white', padding: '30px', borderRadius: '16px', width: '90%', maxWidth: '400px', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', animation: 'fadeIn 0.2s ease-out'}}>
                      <div style={{display: 'flex', justifyContent: 'center', marginBottom: '15px'}}><Icons.Alert color={confirmDialog.isDanger ? "#ef4444" : "#3b82f6"} /></div>
                      <h3 style={{margin: '0 0 10px 0', color: '#1e293b', fontSize: '1.25rem'}}>Confirmação</h3>
                      <p style={{color: '#64748b', fontSize: '0.95rem', marginBottom: '25px', lineHeight: '1.5', whiteSpace: 'pre-line'}}>
                          {confirmDialog.message}
                      </p>
                      <div style={{display: 'flex', gap: '10px'}}>
                          <button onClick={() => setConfirmDialog({show: false})} style={{flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', background: 'white', color: '#475569', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s'}} className="hover-shadow">Cancelar</button>
                          <button onClick={() => { confirmDialog.onConfirm(); }} style={{flex: 1, padding: '12px', borderRadius: '10px', border: 'none', background: confirmDialog.isDanger ? '#ef4444' : '#2563eb', color: 'white', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s'}} className="hover-shadow">{confirmDialog.confirmText}</button>
                      </div>
                  </div>
              </div>
          </ModalPortal>
      )}

      <TimerSwitchModal
          open={timerSwitchModal.show}
          title="Trocar Cronometro Ativo"
          message={timerSwitchModal.message}
          onCancel={cancelTimerSwitch}
          onConfirm={confirmTimerSwitch}
      />

      <StopTimerNoteModal
          open={stopNoteModal.show}
          title="Parar cronometro"
          message="Podes registar uma nota breve neste fecho (opcional)."
          placeholder="Ex: Fechado após alinhamento de objetivos"
          showCompleteOption={Boolean(activeLog)}
          completeLabel={getStopCompleteLabel(activeLog)}
          onCancel={closeStopNoteModal}
          onConfirm={confirmStopWithNote}
      />

      {/* --- MODAL CRIAR/EDITAR PROJETO --- */}
      {showModal && (
        <ModalPortal>
          <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, backgroundColor:'rgba(15, 23, 42, 0.7)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:99999}} onClick={() => setShowModal(false)}>
            <div style={{background:'#fff', width:'95%', maxWidth:'850px', borderRadius:'16px', boxShadow:'0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow:'hidden', display:'flex', flexDirection:'column', maxHeight:'92vh', animation: 'fadeIn 0.2s ease-out'}} onClick={e => e.stopPropagation()}>
              
              <div style={{padding:'20px 25px', borderBottom:'1px solid #e2e8f0', display:'flex', justifyContent:'space-between', alignItems:'center', background:'#f8fafc'}}>
                <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
                    <span style={{background:'#eff6ff', color: '#2563eb', padding:'10px', borderRadius:'10px', display: 'flex'}}><Icons.Rocket size={24} /></span>
                    <h3 style={{margin:0, color:'#1e293b', fontSize:'1.25rem', fontWeight: '800'}}>{isViewOnly ? "Ver Projeto" : (editId ? "Editar Projeto" : "Novo Projeto")}</h3>
                </div>
                <button onClick={() => setShowModal(false)} style={{background:'transparent', border:'none', cursor:'pointer', color:'#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center'}} className="hover-red-text"><Icons.Close size={20} /></button>
              </div>

              <div className="tabs" style={{padding: '15px 30px 0 30px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '5px'}}>
                <button className={activeTab === 'geral' ? 'active' : ''} onClick={() => setActiveTab('geral')} style={{display: 'flex', alignItems: 'center', gap: '6px'}}><Icons.ClipboardList /> Geral & Atividades</button>
                <button className={activeTab === 'investimento' ? 'active' : ''} onClick={() => setActiveTab('investimento')} style={{display: 'flex', alignItems: 'center', gap: '6px'}}><Icons.Dollar /> Investimento</button>
                <button className={activeTab === 'notas' ? 'active' : ''} onClick={() => setActiveTab('notas')} style={{display: 'flex', alignItems: 'center', gap: '6px'}}><Icons.FileText /> Notas</button>
              </div>

              <div style={{padding:'30px', overflowY:'auto', background:'white', flex: 1}} className="custom-scrollbar">
                <form onSubmit={handleSubmit}>
                  <fieldset disabled={isViewOnly} style={{border:'none', padding:0, margin: 0}}>
                    
                    {activeTab === 'geral' && (
                      <div>
                        {/* 1. ENQUADRAMENTO MOVEU-SE PARA O TOPO */}
                        <div style={{...sectionTitleStyle, marginTop: 0}}><Icons.Building /> Enquadramento</div>
                        
                        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '20px'}}>
                            <div>
                                <label style={labelStyle}>Tipologia</label>
                                <select value={form.is_parceria ? 'parceria' : 'unico'} onChange={e => {
                                    const isParc = e.target.value === 'parceria';
                                    setForm({...form, is_parceria: isParc, parceiros_ids: isParc ? form.parceiros_ids : []});
                                }} style={{...inputStyle, cursor: 'pointer'}} className="input-focus">
                                    <option value="unico">👤 Individual </option>
                                    <option value="parceria">🤝 Parceria (Vários)</option>
                                </select>
                            </div>
                            <div>
                                <label style={labelStyle}>Tipo de Projeto (Modelo)</label>
                                <select value={form.tipo_projeto_id || ''} onChange={e => setForm({...form, tipo_projeto_id: e.target.value})} style={{...inputStyle, cursor: 'pointer'}} disabled={!!editId} className="input-focus">
                                    <option value="">-- Em Branco --</option>
                                    {tipos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={labelStyle}>Responsável Global</label>
                                <select 
                                    value={form.responsavel_id || ''} 
                                    onChange={e => {
                                        const newResp = e.target.value;
                                        setForm(prev => ({
                                            ...prev, 
                                            responsavel_id: newResp,
                                            // Se o novo responsável estava na lista de colaboradores extras, removemo-lo
                                            colaboradores: prev.colaboradores.filter(id => id !== newResp) 
                                        }));
                                    }} 
                                    style={{...inputStyle, cursor: 'pointer'}} 
                                    className="input-focus"
                                >
                                    <option value="">-- Selecione --</option>
                                    {staff.map(s => <option key={s.id} value={s.id}>{s.nome || s.email}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* ROW: Cliente principal + parceiros */}
                        <div style={{display: 'grid', gridTemplateColumns: form.is_parceria ? '1fr 1fr' : '1fr', gap: '15px', marginBottom: form.is_parceria ? '10px' : '20px'}}>
                            <div>
                                <label style={labelStyle}>Entidade Lider *</label>
                                <select
                                    value={form.cliente_id || ''}
                                    onChange={e => {
                                        const selectedId = e.target.value;
                                        setForm(prev => ({
                                            ...prev,
                                            cliente_id: selectedId,
                                            parceiros_ids: (prev.parceiros_ids || []).filter(pid => String(pid) !== String(selectedId))
                                        }));
                                        setParceiroSelecionado("");
                                    }}
                                    required
                                    style={{...inputStyle, cursor: 'pointer'}}
                                    className="input-focus"
                                >
                                    <option value="">-- Selecione o Cliente --</option>
                                    {clientes.map(c => <option key={c.id} value={c.id}>{getClientDisplayName(c) || c.marca}</option>)}
                                </select>
                            </div>

                            {form.is_parceria && (
                                <div>
                                    <label style={labelStyle}>Entidades Parceiras</label>
                                    <select
                                        value={parceiroSelecionado}
                                        onChange={e => {
                                            const selected = e.target.value;
                                            setParceiroSelecionado(selected);
                                            if (!selected) return;
                                            setForm(prev => {
                                                if (String(selected) === String(prev.cliente_id)) return prev;
                                                if ((prev.parceiros_ids || []).includes(selected)) return prev;
                                                return { ...prev, parceiros_ids: [...(prev.parceiros_ids || []), selected] };
                                            });
                                            setParceiroSelecionado("");
                                        }}
                                        style={{...inputStyle, cursor: 'pointer'}}
                                        className="input-focus"
                                    >
                                        <option value="">-- Adicionar entidade parceira --</option>
                                        {clientes
                                            .filter(c => String(c.id) !== String(form.cliente_id || ''))
                                            .filter(c => !(form.parceiros_ids || []).includes(c.id))
                                            .map(c => <option key={c.id} value={c.id}>{getClientDisplayName(c) || c.marca}</option>)}
                                    </select>
                                </div>
                            )}
                        </div>

                        {form.is_parceria && (
                            <div style={{marginBottom: '20px'}}>
                                <label style={labelStyle}>Entidades Selecionadas</label>
                                <div className="pill-container" style={{width: '100%', boxSizing: 'border-box'}}>
                                    {(form.parceiros_ids || []).length === 0 && <span style={{color: '#94a3b8', fontSize: '0.85rem', fontStyle: 'italic'}}>Sem parceiros selecionados.</span>}
                                    {(form.parceiros_ids || []).map(pid => {
                                        const parceiro = clientes.find(c => String(c.id) === String(pid));
                                        if (!parceiro) return null;
                                        return (
                                            <div
                                                key={pid}
                                                onClick={() => !isViewOnly && handleToggleParceiro(pid)}
                                                className="pill-checkbox selected"
                                                title="Remover parceiro"
                                            >
                                                {getClientDisplayName(parceiro) || parceiro.marca} ✕
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* ROW: Colaboradores em formato PILL com filtro do Responsável */}
                        <div style={{marginBottom: '30px'}}>
                            <label style={labelStyle}>Outros Colaboradores Envolvidos</label>
                            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px'}}>
                                <div>
                                    <div style={{fontSize: '0.74rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px'}}>Equipa Interna</div>
                                    <div className="pill-container" style={{minHeight: '60px'}}>
                                        {staff
                                            .filter(s => String(s.id) !== String(form.responsavel_id || ''))
                                            .map(s => {
                                                const isSelected = (form.colaboradores || []).map(id => String(id)).includes(String(s.id));
                                                return (
                                                    <div 
                                                        key={`int-${s.id}`}
                                                        onClick={() => !isViewOnly && handleToggleColaborador(s.id)}
                                                        className={`pill-checkbox ${isSelected ? 'selected' : ''}`}
                                                    >
                                                        {s.nome || s.email}
                                                    </div>
                                                )
                                        })}
                                        {staff.filter(s => String(s.id) !== String(form.responsavel_id || '')).length === 0 && (
                                            <span style={{color: '#94a3b8', fontSize: '0.85rem', fontStyle: 'italic'}}>Sem pessoas internas disponíveis.</span>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <div style={{fontSize: '0.74rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px'}}>Pessoas das Entidades</div>
                                    <div className="pill-container" style={{minHeight: '60px'}}>
                                        {entidadePessoas
                                            .filter(s => String(s.id) !== String(form.responsavel_id || ''))
                                            .map(s => {
                                                const isSelected = (form.colaboradores || []).map(id => String(id)).includes(String(s.id));
                                                const base = s.nome_contacto || s.email || 'Contacto';
                                                const cargo = s.cargo ? ` (${s.cargo})` : '';
                                                const marca = getClientDisplayName(s.clientes) ? ` - ${getClientDisplayName(s.clientes)}` : '';
                                                return (
                                                    <div 
                                                        key={`ent-${s.id}`}
                                                        onClick={() => !isViewOnly && handleToggleColaborador(s.id)}
                                                        className={`pill-checkbox ${isSelected ? 'selected' : ''}`}
                                                    >
                                                        {`${base}${cargo}${marca}`}
                                                    </div>
                                                )
                                        })}
                                        {entidadePessoas.filter(s => String(s.id) !== String(form.responsavel_id || '')).length === 0 && (
                                            <span style={{color: '#94a3b8', fontSize: '0.85rem', fontStyle: 'italic'}}>Sem contactos das entidades selecionadas.</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 2. TÍTULO E CÓDIGO */}
                        <div style={sectionTitleStyle}><Icons.FileText /> Identificação</div>
                        <div style={{display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '30px'}}>
                            <div>
                                <label style={labelStyle}>Título do Projeto *</label>
                                <input type="text" value={form.titulo} onChange={e => setForm({...form, titulo: e.target.value})} required style={{...inputStyle, fontSize:'1.1rem', padding:'12px', fontWeight: 'bold'}} className="input-focus" />
                            </div>
                            <div>
                                <label style={labelStyle}>Código de Projeto</label>
                                <input type="text" value={form.codigo_projeto} onChange={e => setForm({...form, codigo_projeto: e.target.value})} placeholder="Ex: P2026-001" style={inputStyle} className="input-focus" />
                            </div>
                        </div>

                        {/* 3. PLANEAMENTO */}
                        <div style={sectionTitleStyle}><Icons.Calendar /> Planeamento & Avisos</div>
                        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '15px', marginBottom: '30px'}}>
                            <div><label style={labelStyle}>Data Início Base</label><input type="date" value={form.data_inicio || ''} onChange={e => setForm({...form, data_inicio: e.target.value})} style={inputStyle} className="input-focus" required /></div>
                            <div><label style={labelStyle}>Data Fim Final</label><input type="date" value={form.data_fim || ''} onChange={e => setForm({...form, data_fim: e.target.value})} style={{...inputStyle, border: form.data_fim ? '1px solid #fca5a5' : '1px solid #cbd5e1'}} className="input-focus" /></div>
                            <div><label style={labelStyle}>Programa</label><input type="text" value={form.programa || ''} onChange={e => setForm({...form, programa: e.target.value})} placeholder="P2030 / PRR" style={inputStyle} className="input-focus" /></div>
                            <div><label style={labelStyle}>Aviso</label><input type="text" value={form.aviso || ''} onChange={e => setForm({...form, aviso: e.target.value})} placeholder="Ex: 01/C16" style={inputStyle} className="input-focus" /></div>
                        </div>

                        {/* 4. PREVIEW DAS ATIVIDADES (APENAS CRIAÇÃO E SE HOUVER MODELO) */}
                        {!editId && templateTree.length > 0 && (
                            <>
                                <div style={sectionTitleStyle}><Icons.ListTree /> Pré-visualização de Atividades Geradas</div>
                                <div style={{background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '30px'}}>
                                    <p style={{fontSize: '0.85rem', color: '#64748b', margin: '0 0 15px 0'}}>
                                        O modelo escolhido inclui a seguinte estrutura. Desmarca os itens que não precisas gerar para este projeto em específico. O responsável global e os colaboradores selecionados acima serão automaticamente atribuídos.
                                    </p>
                                    
                                    {/* Árvore Estilo Acordeão/Cards */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {templateTree.map(ativ => {
                                            const isSelected = templateSelection[`a_${ativ.id}`];
                                            return (
                                                <div key={`a_${ativ.id}`} style={{ background: 'white', borderRadius: '10px', border: `1px solid ${isSelected ? '#bfdbfe' : '#e2e8f0'}`, overflow: 'hidden', transition: 'all 0.2s', boxShadow: isSelected ? '0 2px 8px rgba(59,130,246,0.05)' : 'none' }}>
                                                    
                                                    {/* Activity Header */}
                                                    <div 
                                                        onClick={() => toggleTemplateSelection('a', ativ.id)}
                                                        style={{ background: isSelected ? '#eff6ff' : '#f8fafc', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', borderBottom: isSelected && ativ.tarefas?.length ? '1px solid #e2e8f0' : 'none' }}
                                                    >
                                                        <input type="checkbox" checked={isSelected} readOnly style={{ accentColor: '#3b82f6', width: '18px', height: '18px', pointerEvents: 'none' }} />
                                                        <span style={{ fontWeight: '700', fontSize: '1rem', color: isSelected ? '#1e3a8a' : '#64748b' }}>{ativ.nome}</span>
                                                    </div>

                                                    {/* Tasks Container */}
                                                    {isSelected && ativ.tarefas?.length > 0 && (
                                                        <div style={{ padding: '15px 18px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                                            {ativ.tarefas.map(tar => {
                                                                const isTarSelected = templateSelection[`t_${tar.id}`];
                                                                return (
                                                                    <div key={`t_${tar.id}`} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                            <Icons.ArrowRight size={14} color={isTarSelected ? "#3b82f6" : "#cbd5e1"} />
                                                                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: isTarSelected ? '700' : '500', color: isTarSelected ? '#334155' : '#94a3b8', fontSize: '0.95rem' }}>
                                                                                <input type="checkbox" checked={isTarSelected} onChange={() => toggleTemplateSelection('t', tar.id)} style={{ accentColor: '#3b82f6', width: '16px', height: '16px', cursor: 'pointer' }} />
                                                                                {tar.nome}
                                                                            </label>
                                                                        </div>
                                                                        
                                                                        {/* Subtasks Container */}
                                                                        {isTarSelected && tar.subtarefas?.length > 0 && (
                                                                            <div style={{ paddingLeft: '32px', display: 'flex', flexDirection: 'column', gap: '8px', borderLeft: '2px solid #f1f5f9', marginLeft: '7px' }}>
                                                                                {tar.subtarefas.map(sub => {
                                                                                    const isSubSelected = templateSelection[`s_${sub.id}`];
                                                                                    return (
                                                                                        <label key={`s_${sub.id}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: isSubSelected ? '#475569' : '#94a3b8', fontSize: '0.85rem', fontWeight: isSubSelected ? '600' : '400' }}>
                                                                                            <input type="checkbox" checked={isSubSelected} onChange={() => toggleTemplateSelection('s', sub.id)} style={{ accentColor: '#3b82f6', width: '14px', height: '14px', cursor: 'pointer' }} />
                                                                                            {sub.nome}
                                                                                        </label>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>

                                </div>
                            </>
                        )}

                        <div style={sectionTitleStyle}><Icons.Check /> Estado do Projeto</div>
                        <div style={{display: 'flex', gap: '10px', marginBottom: '25px'}}>
                            {[
                                {val: 'pendente', label: 'Pendente'}, 
                                {val: 'em_curso', label: 'Em Curso'}, 
                                {val: 'concluido', label: 'Concluído'}, 
                                {val: 'cancelado', label: 'Cancelado'}
                            ].map(st => (
                                <div key={st.val} onClick={() => !isViewOnly && setForm({...form, estado: st.val})}
                                    style={{
                                        flex: 1, textAlign: 'center', padding: '10px', borderRadius: '8px', cursor: isViewOnly ? 'default' : 'pointer',
                                        fontSize: '0.8rem', fontWeight: '700',
                                        background: form.estado === st.val ? '#2563eb' : '#f8fafc',
                                        color: form.estado === st.val ? 'white' : '#64748b',
                                        border: form.estado === st.val ? '1px solid #2563eb' : '1px solid #e2e8f0',
                                        transition: 'all 0.2s', textTransform: 'uppercase', letterSpacing: '0.05em'
                                    }}
                                >
                                    {st.label}
                                </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {activeTab === 'investimento' && (
                      <div style={{background:'#f8fafc', padding:'30px', borderRadius:'12px', border:'1px solid #e2e8f0'}}>
                        <h4 style={{marginTop:0, marginBottom:'20px', color:'#1e293b', display: 'flex', alignItems: 'center', gap: '8px'}}><Icons.Dollar color="#2563eb" /> Valores Aprovados</h4>
                        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px'}}>
                            <div>
                                <label style={labelStyle}>Investimento Elegível (€)</label>
                                <input type="number" step="0.01" value={form.investimento} onChange={e => setForm({...form, investimento: e.target.value})} style={{...inputStyle, fontSize:'1.2rem', padding:'15px', borderColor:'#cbd5e1', background: 'white'}} className="input-focus" />
                            </div>
                            <div>
                                <label style={labelStyle}>Incentivo Atribuído (€)</label>
                                <input type="number" step="0.01" value={form.incentivo} onChange={e => setForm({...form, incentivo: e.target.value})} style={{...inputStyle, fontSize:'1.2rem', padding:'15px', borderColor:'#cbd5e1', background: 'white'}} className="input-focus" />
                            </div>
                        </div>
                      </div>
                    )}

                    {activeTab === 'notas' && (
                      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px'}}>
                          <div>
                              <label style={labelStyle}>Descrição Geral</label>
                              <textarea rows="8" value={form.descricao || ''} onChange={e => setForm({...form, descricao: e.target.value})} style={{...inputStyle, resize:'none'}} placeholder="Resumo do projeto..." className="input-focus" />
                          </div>
                          <div>
                              <label style={labelStyle}>Observações Internas</label>
                              <textarea rows="8" value={form.observacoes || ''} onChange={e => setForm({...form, observacoes: e.target.value})} style={{...inputStyle, resize:'none', background:'#fffbeb', borderColor:'#fde68a'}} placeholder="Notas importantes..." className="input-focus-alert" />
                          </div>
                      </div>
                    )}

                  </fieldset>

                  {!isViewOnly && (
                      <div style={{display:'flex', gap:'15px', marginTop:'30px', paddingTop:'20px', borderTop:'1px solid #f1f5f9', justifyContent: 'flex-end'}}>
                          <button type="button" onClick={() => setShowModal(false)} style={{padding:'14px 20px', borderRadius:'10px', border:'1px solid #cbd5e1', background:'white', color:'#64748b', fontWeight:'700', cursor:'pointer', transition: '0.2s'}} className="hover-shadow">Cancelar</button>
                          <button type="submit" disabled={isSubmitting} className="btn-primary hover-shadow" style={{padding:'14px 30px', borderRadius:'10px', border:'none', background:'#2563eb', color:'white', fontWeight:'700', cursor:'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: '0.2s'}}>
                              {isSubmitting ? "A guardar..." : (editId ? <><Icons.Save /> Guardar Alterações</> : <><Icons.Rocket /> Criar Projeto</>)}
                          </button>
                      </div>
                  )}
                </form>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {notification && <div className={`toast-container ${notification.type}`}>{notification.type === 'success' ? '✅' : '⚠️'} {notification.message}</div>}
      
      <style>{`
          .fade-in { animation: fadeIn 0.4s ease-in-out; }
          @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

          .category-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
          .category-card {
              background: white; padding: 25px; border-radius: 12px;
              box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;
              cursor: pointer; transition: all 0.2s ease;
          }
          .category-card:hover { transform: translateY(-5px); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); border-color: #cbd5e1; }

          .project-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px; }
          .project-card:hover { border-color: #cbd5e1 !important; box-shadow: 0 12px 20px -5px rgba(0,0,0,0.1) !important; transform: translateY(-2px); }

          .hover-shadow:hover { box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); transform: translateY(-1px); }

          .hover-blue-btn:hover { background: #dbeafe !important; color: #2563eb !important; border-color: #bfdbfe !important; }
          .hover-orange-text:hover { color: #f59e0b !important; opacity: 1 !important; }
          .hover-red-text:hover { color: #ef4444 !important; opacity: 1 !important; }
          
          .input-focus:focus { border-color: #3b82f6 !important; box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1); }
          .input-focus-alert:focus { border-color: #f59e0b !important; box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.1); }

          /* Action Buttons para Sub-itens */
          .action-btn { background: transparent; border: none; cursor: pointer; padding: 6px; border-radius: 6px; display: flex; align-items: center; justify-content: center; opacity: 0.6; transition: 0.2s; }
          .action-btn:hover { opacity: 1; transform: scale(1.1); }

          /* PILL CONTAINER & CHECKBOX (Para Parceiros e Colaboradores) */
          .pill-container {
              display: flex;
              flex-wrap: wrap;
              gap: 8px;
              padding: 15px;
              background: #ffffff;
              border-radius: 8px;
              border: 1px solid #cbd5e1;
          }
          .pill-checkbox {
              padding: 8px 18px;
              border-radius: 20px;
              font-size: 0.85rem;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.2s ease;
              border: 1px solid #e2e8f0;
              background: #f8fafc;
              color: #64748b;
              user-select: none;
          }
          .pill-checkbox:hover {
              border-color: #cbd5e1;
              background: #f1f5f9;
          }
          .pill-checkbox.selected {
              background: #eff6ff;
              border-color: #3b82f6;
              color: #2563eb;
              box-shadow: 0 2px 4px rgba(59, 130, 246, 0.1);
          }

          /* Botão Glow Principal */
          .btn-glow {
              position: relative; overflow: hidden; background: #10b981; color: white; border: none; padding: 10px 20px; border-radius: 8px;
              font-weight: bold; font-size: 0.95rem; cursor: pointer; box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.4); transition: all 0.3s ease; display: flex; align-items: center; gap: 8px;
          }
          .btn-glow::after {
              content: ''; position: absolute; top: 0; left: -150%; width: 50%; height: 100%;
              background: linear-gradient(to right, rgba(255,255,255,0) 0%, rgba(255,255,255,0.4) 50%, rgba(255,255,255,0) 100%);
              transform: skewX(-25deg); transition: left 0.7s ease-in-out;
          }
          .btn-glow:hover { background: #059669; transform: translateY(-1px); box-shadow: 0 6px 12px rgba(16, 185, 129, 0.3); }
          .btn-glow:hover::after { animation: shine-sweep 1.2s infinite alternate ease-in-out; }
          @keyframes shine-sweep { 0% { left: -150%; } 100% { left: 200%; } }
          
          .pulse-dot-red { width: 8px; height: 8px; background-color: #ef4444; border-radius: 50%; display: inline-block; animation: pulseRed 1.5s infinite; } 
          @keyframes pulseRed { 0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); } 70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); } 100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); } }
          
          .pulse-dot-white { width: 8px; height: 8px; background-color: white; border-radius: 50%; display: inline-block; animation: pulse 1.5s infinite; }
          @keyframes pulse { 0% { transform: scale(0.95); opacity: 0.7; } 70% { transform: scale(1); opacity: 0; } 100% { transform: scale(0.95); opacity: 0; } }
          
          .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 10px; }
      `}</style>
    </div>
  );
}