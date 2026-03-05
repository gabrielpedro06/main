import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import { supabase } from "../services/supabase";
import { useAuth } from "../context/AuthContext";
import "./../styles/dashboard.css";

// 💡 IMPORTAÇÃO CORRIGIDA (SEM CHAVETAS):
import gerarRelatorioProjeto from "../components/pdfGenerator"; 

// --- ÍCONES SVG PROFISSIONAIS COMPLETOS ---
const Icons = {
  Building: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><path d="M9 22v-4h6v4"></path><path d="M8 6h.01"></path><path d="M16 6h.01"></path><path d="M12 6h.01"></path><path d="M12 10h.01"></path><path d="M12 14h.01"></path><path d="M16 10h.01"></path><path d="M16 14h.01"></path><path d="M8 10h.01"></path><path d="M8 14h.01"></path></svg>,
  Tag: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>,
  User: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>,
  Users: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>,
  Target: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>,
  ArrowLeft: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>,
  ClipboardList: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><path d="M12 11h4"></path><path d="M12 16h4"></path><path d="M8 11h.01"></path><path d="M8 16h.01"></path></svg>,
  Clock: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>,
  Settings: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>,
  Check: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>,
  Edit: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>,
  Trash: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>,
  Play: ({ size = 12, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>,
  Stop: ({ size = 10, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none"><rect x="6" y="6" width="12" height="12" rx="2" ry="2"></rect></svg>,
  ChevronDown: ({ size = 14, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>,
  ChevronUp: ({ size = 14, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>,
  CornerDownRight: ({ size = 14, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 10 20 15 15 20"></polyline><path d="M4 4v7a4 4 0 0 0 4 4h12"></path></svg>,
  Folder: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>,
  Calendar: ({ size = 14, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>,
  AlertTriangle: ({ size = 14, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>,
  Flame: ({ size = 14, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path></svg>,
  Close: ({ size = 18, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>,
  Save: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>,
  Eye: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>,
  Dollar: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>,
  FileText: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>,
  Layers: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 12 12 17 22 12"></polyline><polyline points="2 17 12 22 22 17"></polyline></svg>,
  Activity: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>,
  Download: ({ size = 18, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>,
  GripVertical: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="12" r="1"></circle><circle cx="9" cy="5" r="1"></circle><circle cx="9" cy="19" r="1"></circle><circle cx="15" cy="12" r="1"></circle><circle cx="15" cy="5" r="1"></circle><circle cx="15" cy="19" r="1"></circle></svg>,
  Plus: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>,
  Rocket: ({ size = 20, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"></path><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"></path><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"></path><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"></path></svg>,
  Search: ({ size = 14, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>,
  Globe: ({ size = 14, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>,
  ListTree: ({ size = 14, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
};

const ModalPortal = ({ children }) => createPortal(children, document.body);

export default function ProjetoDetalhe() {
  const { id } = useParams(); 
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [projeto, setProjeto] = useState(null);
  const [atividades, setAtividades] = useState([]);
  const [logs, setLogs] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("atividades");
  const [notification, setNotification] = useState(null);
  
  const [activeLog, setActiveLog] = useState(null);

  // Estados UI - Visão Geral
  const [isEditingGeral, setIsEditingGeral] = useState(false);
  const [formGeral, setFormGeral] = useState({});
  const [clientes, setClientes] = useState([]);
  const [staff, setStaff] = useState([]);

  // Estados de Expansão
  const [expandedTasks, setExpandedTasks] = useState({});
  const [collapsedAtivs, setCollapsedAtivs] = useState({}); 

  const [novaAtividadeNome, setNovaAtividadeNome] = useState("");
  const [novaTarefaNome, setNovaTarefaNome] = useState({ ativId: null, nome: "" });
  const [novaSubtarefaNome, setNovaSubtarefaNome] = useState({ tarId: null, nome: "" });

  // MODAIS
  const [atividadeModal, setAtividadeModal] = useState({ show: false, data: null });
  const [tarefaModal, setTarefaModal] = useState({ show: false, data: null, atividadeNome: '' });
  const [subtarefaModal, setSubtarefaModal] = useState({ show: false, data: null, tarefaNome: '' }); 

  // --- REFS PARA DRAG & DROP NATIVO ---
  const dragAtivItem = useRef();
  const dragAtivOverItem = useRef();
  
  const dragTarItem = useRef();
  const dragTarOverItem = useRef();

  useEffect(() => {
    fetchProjetoDetails();
    checkActiveLog();
  }, [id, user]);

  const showToast = (message, type = 'success') => {
      setNotification({ message, type });
      setTimeout(() => setNotification(null), 3000);
  };

  async function checkActiveLog() {
      if(!user?.id) return;
      const { data } = await supabase.from("task_logs").select("*").eq("user_id", user.id).is("end_time", null).maybeSingle();
      setActiveLog(data || null);
  }

  async function fetchProjetoDetails() {
    setLoading(true);
    
    const { data: projData } = await supabase.from("projetos").select("*, clientes(marca), tipos_projeto(nome), profiles(nome)").eq("id", id).single();
    if (projData) { setProjeto(projData); setFormGeral(projData); }

    const { data: cliData } = await supabase.from("clientes").select("id, marca").order("marca");
    setClientes(cliData || []);
    
    const { data: staffData } = await supabase.from("profiles").select("id, nome").order("nome");
    setStaff(staffData || []);

    const { data: ativData, error: ativError } = await supabase
        .from("atividades")
        .select(`
            id, titulo, estado, responsavel_id, data_inicio, data_fim, investimento, incentivo, descricao, observacoes, created_at, ordem,
            tarefas(id, titulo, estado, responsavel_id, data_inicio, data_fim, prioridade, descricao, created_at, ordem,
                subtarefas(id, titulo, estado, data_fim, created_at, ordem)
            )
        `)
        .eq("projeto_id", id)
        .order("ordem", { ascending: true }) 
        .order("created_at", { ascending: true });

    if (ativError) {
        console.error("Erro no fetch:", ativError);
        showToast("Erro ao carregar atividades.", "error");
    } else if (ativData) {
        const sortedData = ativData.map(a => ({
            ...a,
            tarefas: (a.tarefas || []).sort((t1, t2) => {
                if (t1.ordem != null && t2.ordem != null && t1.ordem !== t2.ordem) return t1.ordem - t2.ordem;
                const d1 = new Date(t1.created_at).getTime();
                const d2 = new Date(t2.created_at).getTime();
                if (d1 !== d2) return d1 - d2;
                return t1.id.localeCompare(t2.id);
            }).map(t => ({
                ...t,
                subtarefas: (t.subtarefas || []).sort((s1, s2) => {
                    if (s1.ordem != null && s2.ordem != null && s1.ordem !== s2.ordem) return s1.ordem - s2.ordem;
                    const d1 = new Date(s1.created_at).getTime();
                    const d2 = new Date(s2.created_at).getTime();
                    if (d1 !== d2) return d1 - d2;
                    return s1.id.localeCompare(s2.id);
                })
            }))
        }));
        setAtividades(sortedData);
    }

    const { data: logsData } = await supabase.from("task_logs").select("*").eq("projeto_id", id);
    if (logsData) setLogs(logsData);
    
    setLoading(false);
  }

  // --- LÓGICA DE DRAG & DROP (NATIVO HTML5) ---
  const handleDragStartAtiv = (e, index) => {
      dragAtivItem.current = index;
      e.dataTransfer.effectAllowed = "move";
      e.currentTarget.style.opacity = '0.5';
  };

  const handleDragEnterAtiv = (e, index) => {
      e.preventDefault();
      dragAtivOverItem.current = index;
  };

  const handleDropAtiv = async (e) => {
      e.preventDefault();
      const draggedElement = e.currentTarget;
      draggedElement.style.opacity = '1';

      if (dragAtivItem.current === null || dragAtivOverItem.current === null || dragAtivItem.current === dragAtivOverItem.current) return;

      const copyList = [...atividades];
      const draggedContent = copyList[dragAtivItem.current];
      copyList.splice(dragAtivItem.current, 1);
      copyList.splice(dragAtivOverItem.current, 0, draggedContent);
      
      dragAtivItem.current = null;
      dragAtivOverItem.current = null;
      
      setAtividades(copyList); // UI Update instantâneo

      // Gravar na DB (em background)
      const updates = copyList.map((a, index) => ({ id: a.id, ordem: index }));
      await Promise.all(updates.map(u => supabase.from("atividades").update({ ordem: u.ordem }).eq("id", u.id)));
  };

  const handleDragStartTar = (e, ativIndex, tarIndex) => {
      e.stopPropagation();
      dragTarItem.current = { ativIndex, tarIndex };
      e.dataTransfer.effectAllowed = "move";
      e.currentTarget.style.opacity = '0.5';
  };

  const handleDragEnterTar = (e, ativIndex, tarIndex) => {
      e.preventDefault();
      e.stopPropagation();
      if (dragTarItem.current?.ativIndex === ativIndex) { // Só permite reordenar dentro da mesma atividade
          dragTarOverItem.current = { ativIndex, tarIndex };
      }
  };

  const handleDropTar = async (e, ativIndex) => {
      e.preventDefault();
      e.stopPropagation();
      e.currentTarget.style.opacity = '1';

      if (!dragTarItem.current || !dragTarOverItem.current) return;
      if (dragTarItem.current.ativIndex !== ativIndex || dragTarOverItem.current.ativIndex !== ativIndex) return;
      if (dragTarItem.current.tarIndex === dragTarOverItem.current.tarIndex) return;

      const copyAtivs = [...atividades];
      const copyTarefas = [...copyAtivs[ativIndex].tarefas];
      
      const draggedContent = copyTarefas[dragTarItem.current.tarIndex];
      copyTarefas.splice(dragTarItem.current.tarIndex, 1);
      copyTarefas.splice(dragTarOverItem.current.tarIndex, 0, draggedContent);
      
      copyAtivs[ativIndex].tarefas = copyTarefas;
      setAtividades(copyAtivs);

      dragTarItem.current = null;
      dragTarOverItem.current = null;

      // Update DB
      const updates = copyTarefas.map((t, idx) => ({ id: t.id, ordem: idx }));
      await Promise.all(updates.map(u => supabase.from("tarefas").update({ ordem: u.ordem }).eq("id", u.id)));
  };

  // --- MATEMÁTICA DOS TEMPOS E DATAS INTELIGENTES ---
  const getTaskTime = (taskId) => {
      return logs.filter(l => l.task_id === taskId).reduce((acc, curr) => acc + (curr.duration_minutes || 0), 0);
  };
  const getActivityTime = (ativ) => {
      if (ativ.tarefas?.length > 0) {
          return ativ.tarefas.reduce((acc, t) => acc + getTaskTime(t.id), 0);
      } else {
          return logs.filter(l => l.atividade_id === ativ.id).reduce((acc, curr) => acc + (curr.duration_minutes || 0), 0);
      }
  };
  const getProjectTotalTime = () => atividades.reduce((acc, a) => acc + getActivityTime(a), 0);

  const formatTime = (totalMinutes) => {
      if (totalMinutes === 0) return "0 min";
      const h = Math.floor(totalMinutes / 60);
      const m = totalMinutes % 60;
      return h > 0 ? `${h}h ${m}m` : `${m} min`;
  };

  const renderDeadline = (dateString, isCompleted, isLarge = false) => {
      if (!dateString) return null;
      
      const deadline = new Date(dateString);
      deadline.setHours(0,0,0,0);
      const today = new Date();
      today.setHours(0,0,0,0);
      
      const diffTime = deadline.getTime() - today.getTime();
      const diffDays = Math.round(diffTime / (1000 * 3600 * 24));
      const dateFormatted = deadline.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' });
      
      let bg = '#f1f5f9';
      let color = '#64748b';
      let text = dateFormatted;
      let icon = <Icons.Calendar size={isLarge ? 14 : 12} />;
      
      if (isCompleted) {
          bg = '#f8fafc'; color = '#94a3b8'; text = dateFormatted; icon = <Icons.Check size={isLarge ? 14 : 12} />;
      } else if (diffDays < 0) {
          bg = '#fee2e2'; color = '#ef4444'; text = `${dateFormatted} (Atraso: ${Math.abs(diffDays)}d)`; icon = <Icons.AlertTriangle size={isLarge ? 14 : 12} />;
      } else if (diffDays === 0) {
          bg = '#fefce8'; color = '#d97706'; text = `HOJE`; icon = <Icons.Flame size={isLarge ? 14 : 12} />;
      } else if (diffDays <= 3) {
          bg = '#ffedd5'; color = '#ea580c'; text = `${dateFormatted} (${diffDays}d)`; icon = <Icons.Clock size={isLarge ? 14 : 12} />;
      }

      return (
          <span style={{
              fontSize: isLarge ? '0.75rem' : '0.65rem', 
              background: bg, color: color, 
              padding: isLarge ? '4px 8px' : '2px 6px', 
              borderRadius: '6px', fontWeight: 'bold',
              display: 'inline-flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap'
          }}>
              {icon} {text}
          </span>
      );
  };

  async function handleToggleTimer(targetId, type) {
      if (activeLog) {
          const isSameTarget = (type === 'task' && activeLog.task_id === targetId) || (type === 'activity' && activeLog.atividade_id === targetId);
          
          if (isSameTarget) {
              const diffMins = Math.max(1, Math.floor((new Date() - new Date(activeLog.start_time)) / 60000));
              await supabase.from("task_logs").update({ end_time: new Date().toISOString(), duration_minutes: diffMins }).eq("id", activeLog.id);
              setActiveLog(null);
              showToast(`Tempo guardado: ${diffMins} min.`);
              fetchProjetoDetails(); 
          } else {
              showToast("Já tens um cronómetro ativo noutro local! Pára-o primeiro.", "error");
          }
      } else {
          const payload = { user_id: user.id, projeto_id: id, start_time: new Date().toISOString() };
          if (type === 'task') payload.task_id = targetId;
          else payload.atividade_id = targetId;

          const { data, error } = await supabase.from("task_logs").insert([payload]).select().single();
          if (!error) { setActiveLog(data); showToast("Cronómetro iniciado!"); }
      }
  }

  async function toggleAtividadeStatus(ativId, estadoAtual) {
      const novoEstado = estadoAtual === 'concluido' ? 'pendente' : 'concluido';
      setAtividades(prev => prev.map(a => a.id === ativId ? {...a, estado: novoEstado} : a));
      await supabase.from("atividades").update({ estado: novoEstado }).eq("id", ativId);
  }

  async function toggleTarefaStatus(tarefaId, estadoAtual) {
      const novoEstado = estadoAtual === 'concluido' ? 'pendente' : 'concluido';
      setAtividades(prev => prev.map(a => ({
          ...a, tarefas: a.tarefas.map(t => t.id === tarefaId ? {...t, estado: novoEstado} : t)
      })));
      await supabase.from("tarefas").update({ estado: novoEstado }).eq("id", tarefaId);
  }

  async function toggleSubtarefaStatus(subId, estadoAtual) {
      const novoEstado = estadoAtual === 'concluido' ? 'pendente' : 'concluido';
      setAtividades(prev => prev.map(a => ({
          ...a, tarefas: a.tarefas.map(t => ({
              ...t, subtarefas: t.subtarefas.map(s => s.id === subId ? {...s, estado: novoEstado} : s)
          }))
      })));
      await supabase.from("subtarefas").update({ estado: novoEstado }).eq("id", subId);
  }

  async function handleSaveAtividade(e) {
      e.preventDefault();
      const payload = { ...atividadeModal.data };
      delete payload.tarefas; 
      const { error } = await supabase.from("atividades").update(payload).eq("id", payload.id);
      if (!error) {
          setAtividadeModal({ show: false, data: null });
          fetchProjetoDetails();
          showToast("Atividade atualizada com sucesso!");
      } else showToast(error.message, "error");
  }

  async function handleSaveTarefa(e) {
      e.preventDefault();
      const payload = { ...tarefaModal.data };
      delete payload.subtarefas; 
      const { error } = await supabase.from("tarefas").update(payload).eq("id", payload.id);
      if (!error) {
          setTarefaModal({ show: false, data: null, atividadeNome: '' });
          fetchProjetoDetails();
          showToast("Tarefa atualizada com sucesso!");
      } else showToast(error.message, "error");
  }

  async function handleSaveSubtarefa(e) {
      e.preventDefault();
      const payload = { 
          titulo: subtarefaModal.data.titulo,
          data_fim: subtarefaModal.data.data_fim || null,
          estado: subtarefaModal.data.estado
      };
      const { error } = await supabase.from("subtarefas").update(payload).eq("id", subtarefaModal.data.id);
      if (!error) {
          setSubtarefaModal({ show: false, data: null, tarefaNome: '' });
          fetchProjetoDetails();
          showToast("Sub-tarefa atualizada!");
      } else showToast(error.message, "error");
  }

  async function handleUpdateProjeto(e) {
      e.preventDefault();
      try {
          const payload = {
              titulo: formGeral.titulo, cliente_id: formGeral.cliente_id, responsavel_id: formGeral.responsavel_id,
              estado: formGeral.estado, data_inicio: formGeral.data_inicio, data_fim: formGeral.data_fim,
              programa: formGeral.programa, aviso: formGeral.aviso, codigo_projeto: formGeral.codigo_projeto,
              descricao: formGeral.descricao, observacoes: formGeral.observacoes,
              investimento: formGeral.investimento, incentivo: formGeral.incentivo
          };
          const { error } = await supabase.from("projetos").update(payload).eq("id", id);
          if (error) throw error;
          showToast("Projeto atualizado com sucesso!");
          setIsEditingGeral(false);
          fetchProjetoDetails();
      } catch (err) { showToast("Erro: " + err.message, "error"); }
  }

  async function handleAddAtividade(e) {
      e.preventDefault();
      if(!novaAtividadeNome.trim()) return;
      await supabase.from("atividades").insert([{ projeto_id: id, titulo: novaAtividadeNome, estado: 'pendente', ordem: atividades.length }]);
      setNovaAtividadeNome(""); fetchProjetoDetails();
  }
  async function handleAddTarefa(e, ativId) {
      e.preventDefault();
      if(!novaTarefaNome.nome.trim()) return;
      const tOrdem = atividades.find(a=>a.id===ativId)?.tarefas?.length || 0;
      await supabase.from("tarefas").insert([{ atividade_id: ativId, titulo: novaTarefaNome.nome, responsavel_id: projeto.responsavel_id, estado: 'pendente', ordem: tOrdem }]);
      setNovaTarefaNome({ ativId: null, nome: "" }); fetchProjetoDetails();
  }
  async function handleAddSubtarefa(e, tarId) {
      e.preventDefault();
      if(!novaSubtarefaNome.nome.trim()) return;
      await supabase.from("subtarefas").insert([{ tarefa_id: tarId, titulo: novaSubtarefaNome.nome, estado: 'pendente' }]);
      setNovaSubtarefaNome({ tarId: null, nome: "" }); fetchProjetoDetails();
  }

  async function handleDeleteItem(tabela, itemId) {
      if(!window.confirm("Tens a certeza que desejas apagar isto permanentemente?")) return;
      await supabase.from(tabela).delete().eq("id", itemId);
      fetchProjetoDetails();
  }

  // 💡 FUNÇÕES DE TOGGLE (Expandir/Recolher)
  const toggleExpand = (taskId) => {
      setExpandedTasks(prev => ({ ...prev, [taskId]: !prev[taskId] }));
  };
  const toggleCollapseAtiv = (ativId) => {
      setCollapsedAtivs(prev => ({ ...prev, [ativId]: !prev[ativId] }));
  };

  const getProjectStatusTheme = (estado) => {
      if(estado === 'concluido') return { bg: '#dcfce7', text: '#16a34a', border: '#bbf7d0', dot: '#16a34a' };
      if(estado === 'em_curso') return { bg: '#fefce8', text: '#ca8a04', border: '#fde047', dot: '#eab308' };
      if(estado === 'cancelado') return { bg: '#f1f5f9', text: '#64748b', border: '#e2e8f0', dot: '#64748b' };
      return { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe', dot: '#2563eb' }; 
  };

  if (loading) return <div className="page-container" style={{display:'flex', justifyContent:'center', alignItems:'center', height:'80vh'}}><div className="pulse-dot-white" style={{background:'#2563eb'}}></div></div>;
  if (!projeto) return <div className="page-container"><p>Projeto não encontrado.</p><button onClick={() => navigate(-1)}>Voltar</button></div>;

  const statusTheme = getProjectStatusTheme(projeto.estado);
  const labelStyle = { display: 'block', marginBottom: '6px', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' };
  const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box', marginBottom: '15px', transition: 'all 0.2s', color: '#1e293b' };
  const sectionTitleStyle = { fontSize: '0.8rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '15px', marginTop: '5px' };

  const renderStatePills = (currentState, onChange) => {
      const states = [
          { val: 'pendente', label: 'PENDENTE', color: '#3b82f6' },
          { val: 'em_curso', label: 'EM CURSO', color: '#f59e0b' },
          { val: 'concluido', label: 'CONCLUÍDO', color: '#10b981' },
          { val: 'cancelado', label: 'CANCELADO', color: '#64748b' }
      ];
      return (
          <div style={{display: 'flex', gap: '10px', marginBottom: '20px'}}>
              {states.map(s => (
                  <div key={s.val} onClick={() => onChange(s.val)} style={{
                      flex: 1, textAlign: 'center', padding: '10px', borderRadius: '8px', cursor: 'pointer',
                      fontSize: '0.75rem', fontWeight: 'bold', border: `1px solid ${currentState === s.val ? s.color : '#cbd5e1'}`,
                      background: currentState === s.val ? s.color : '#f8fafc', color: currentState === s.val ? '#fff' : '#64748b', transition: 'all 0.2s'
                  }}>
                      {s.label}
                  </div>
              ))}
          </div>
      );
  };

  return (
    <div className="page-container" style={{maxWidth: '1200px', margin: '0 auto', paddingBottom: '50px'}}>
      
      {/* =========================================
          CABEÇALHO DO PROJETO 
      ========================================= */}
      <div style={{
          position: 'relative', background: 'white', borderRadius: '24px', border: '1px solid #e2e8f0', 
          padding: '35px 40px', marginBottom: '35px', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.08)', overflow: 'hidden'
      }}>
          <div style={{
              position: 'absolute', top: '-50%', right: '-10%', width: '60%', height: '200%',
              background: `radial-gradient(ellipse at right, ${statusTheme.bg} 0%, transparent 70%)`,
              opacity: 0.8, pointerEvents: 'none'
          }}></div>

          <div style={{position: 'relative', zIndex: 1}}>
              
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', flexWrap: 'wrap', gap: '15px'}}>
                  <button onClick={() => navigate('/dashboard/projetos')} style={{background: 'transparent', border: 'none', color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', fontWeight: '700', cursor: 'pointer', padding: 0}} className="hover-blue-text hover-shadow">
                      <span style={{background: '#f1f5f9', borderRadius: '8px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '0.2s'}}>
                          <Icons.ArrowLeft />
                      </span> 
                      Voltar ao Portfólio
                  </button>

                  <div style={{display: 'flex', gap: '12px', alignItems: 'center'}}>
                      <button onClick={() => gerarRelatorioProjeto(projeto, atividades, logs, staff)} className="btn-small hover-shadow" style={{display:'flex', alignItems:'center', gap:'6px', background:'white', color:'#1e40af', border:'1px solid #bfdbfe'}}>
                          <Icons.Download size={14}/> Gerar PDF
                      </button>
                      
                      {(projeto?.codigo_projeto) && (
                          <span style={{background: 'white', border: '1px solid #cbd5e1', color: '#475569', padding: '6px 12px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '800', letterSpacing: '0.05em', boxShadow: '0 2px 4px rgba(0,0,0,0.02)'}}>
                              {projeto.codigo_projeto}
                          </span>
                      )}
                      <span style={{
                          background: statusTheme.bg, color: statusTheme.text, border: `1px solid ${statusTheme.border}`,
                          padding: '6px 14px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em',
                          display: 'flex', alignItems: 'center', gap: '6px'
                      }}>
                          <span style={{width: '6px', height: '6px', borderRadius: '50%', background: statusTheme.dot}}></span>
                          {(projeto?.estado || '').replace('_', ' ')}
                      </span>
                  </div>
              </div>

              <h1 style={{margin: '0 0 30px 0', fontSize: '2.5rem', fontWeight: '900', color: '#0f172a', letterSpacing: '-0.04em', lineHeight: '1.2', maxWidth: '85%'}}>
                  {projeto?.titulo}
              </h1>

              <div style={{display: 'flex', gap: '25px', flexWrap: 'wrap', alignItems: 'center'}}>
                  <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                      <div style={{width: '40px', height: '40px', borderRadius: '10px', background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'}}>
                          <Icons.Building />
                      </div>
                      <div>
                          <div style={{fontSize: '0.65rem', color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase', marginBottom: '2px', letterSpacing: '0.05em'}}>Cliente / Local</div>
                          <div style={{fontSize: '0.95rem', color: '#1e293b', fontWeight: '700'}}>{projeto?.cliente_texto || projeto?.clientes?.marca || 'Não Definido'}</div>
                      </div>
                  </div>

                  <div style={{width: '1px', height: '35px', background: '#e2e8f0'}}></div>

                  <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                      <div style={{width: '40px', height: '40px', borderRadius: '10px', background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'}}>
                          <Icons.Tag />
                      </div>
                      <div>
                          <div style={{fontSize: '0.65rem', color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase', marginBottom: '2px', letterSpacing: '0.05em'}}>Tipo / Área</div>
                          <div style={{fontSize: '0.95rem', color: '#1e293b', fontWeight: '700'}}>{projeto?.tipos_projeto?.nome || 'Customizado'}</div>
                      </div>
                  </div>

                  <div style={{width: '1px', height: '35px', background: '#e2e8f0'}}></div>

                  <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                      <div style={{width: '40px', height: '40px', borderRadius: '10px', background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'}}>
                          <Icons.User />
                      </div>
                      <div>
                          <div style={{fontSize: '0.65rem', color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase', marginBottom: '2px', letterSpacing: '0.05em'}}>Responsável</div>
                          <div style={{fontSize: '0.95rem', color: '#1e293b', fontWeight: '700'}}>{projeto?.profiles?.nome || 'Não Atribuído'}</div>
                      </div>
                  </div>

                  <div style={{width: '1px', height: '35px', background: '#e2e8f0'}}></div>

                  <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                      <div style={{width: '40px', height: '40px', borderRadius: '10px', background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'}}>
                          <Icons.Target />
                      </div>
                      <div>
                          <div style={{fontSize: '0.65rem', color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase', marginBottom: '2px', letterSpacing: '0.05em'}}>Deadline Final</div>
                          <div style={{fontSize: '0.95rem', color: (projeto?.data_fim && new Date(projeto.data_fim) < new Date() && projeto.estado !== 'concluido') ? '#ef4444' : '#1e293b', fontWeight: '700'}}>
                              {projeto?.data_fim ? new Date(projeto.data_fim).toLocaleDateString('pt-PT') : 'Sem Prazo'}
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      </div>

      {/* NAVEGAÇÃO INTERNA */}
      <div style={{display: 'flex', gap: '5px', marginBottom: '25px', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px', overflowX: 'auto', whiteSpace: 'nowrap'}} className="custom-scrollbar">
        <button style={{background: 'none', border: 'none', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: activeTab === 'atividades' ? '800' : '600', color: activeTab === 'atividades' ? '#2563eb' : '#64748b', cursor: 'pointer', padding: '10px 20px', position: 'relative', transition: '0.2s'}} onClick={() => setActiveTab('atividades')} className="tab-hover">
            <Icons.ClipboardList /> Board de Atividades
            {activeTab === 'atividades' && <div style={{position:'absolute', bottom:'-12px', left:0, right:0, height:'3px', background:'#2563eb', borderRadius:'3px 3px 0 0'}} />}
        </button>
        <button style={{background: 'none', border: 'none', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: activeTab === 'relatorio' ? '800' : '600', color: activeTab === 'relatorio' ? '#2563eb' : '#64748b', cursor: 'pointer', padding: '10px 20px', position: 'relative', transition: '0.2s'}} onClick={() => setActiveTab('relatorio')} className="tab-hover">
            <Icons.Clock /> Relatório de Tempos
            {activeTab === 'relatorio' && <div style={{position:'absolute', bottom:'-12px', left:0, right:0, height:'3px', background:'#2563eb', borderRadius:'3px 3px 0 0'}} />}
        </button>
        <button style={{background: 'none', border: 'none', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: activeTab === 'geral' ? '800' : '600', color: activeTab === 'geral' ? '#2563eb' : '#64748b', cursor: 'pointer', padding: '10px 20px', position: 'relative', transition: '0.2s'}} onClick={() => setActiveTab('geral')} className="tab-hover">
            <Icons.Settings /> Configurações e Dados
            {activeTab === 'geral' && <div style={{position:'absolute', bottom:'-12px', left:0, right:0, height:'3px', background:'#2563eb', borderRadius:'3px 3px 0 0'}} />}
        </button>
      </div>

      <div style={{minHeight: '50vh'}}>
        
        {/* =========================================
            ABA 1: BOARD DE ATIVIDADES (C/ DRAG & DROP)
        ========================================= */}
        {activeTab === 'atividades' && (
            <div style={{width: '100%'}}>
                {atividades.map((ativ, aIndex) => {
                    const isAtivDone = ativ.estado === 'concluido';
                    const progresso = ativ.tarefas?.length > 0 ? Math.round((ativ.tarefas.filter(t => t.estado === 'concluido').length / ativ.tarefas.length) * 100) : 0;
                    
                    const hasNoTasks = !ativ.tarefas || ativ.tarefas.length === 0;
                    const isAtivTimerActive = activeLog?.atividade_id === ativ.id;
                    const ativTime = getActivityTime(ativ);
                    
                    const isCollapsed = collapsedAtivs[ativ.id];

                    return (
                    <div 
                        key={ativ.id} 
                        draggable={!isCollapsed} 
                        onDragStart={(e) => handleDragStartAtiv(e, aIndex)}
                        onDragEnter={(e) => handleDragEnterAtiv(e, aIndex)}
                        onDragEnd={handleDropAtiv}
                        onDragOver={(e) => e.preventDefault()}
                        style={{background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '20px', boxShadow: '0 2px 4px rgba(0, 0, 0, 0.02)', overflow: 'hidden', opacity: isAtivDone ? 0.6 : 1, transition: 'opacity 0.3s'}}
                    >
                        
                        {/* CABEÇALHO DA ATIVIDADE */}
                        <div style={{padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: isAtivDone ? '#f8fafc' : 'white', position: 'relative'}}>
                            <div style={{position: 'absolute', bottom: 0, left: 0, height: '3px', background: '#f1f5f9', width: '100%'}}>
                                <div style={{height: '100%', background: progresso === 100 ? '#10b981' : '#3b82f6', width: `${progresso}%`, transition: 'width 0.4s ease-in-out'}}></div>
                            </div>
                            
                            <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
                                <div style={{cursor: 'grab', color: '#cbd5e1', display:'flex'}} title="Arraste para reordenar" className="hover-blue-text"><Icons.GripVertical /></div>
                                <div onClick={() => toggleAtividadeStatus(ativ.id, ativ.estado)} style={{width: '26px', height: '26px', borderRadius: '8px', cursor: 'pointer', background: isAtivDone ? '#10b981' : '#f8fafc', border: isAtivDone ? 'none' : '2px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', transition: 'all 0.2s'}}>
                                    {isAtivDone && <Icons.Check size={16} />}
                                </div>
                                <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                                    <h3 style={{margin: 0, color: isAtivDone ? '#94a3b8' : '#0f172a', textDecoration: isAtivDone ? 'line-through' : 'none', fontSize: '1.1rem', fontWeight: '700'}}>
                                        {ativ.titulo}
                                    </h3>
                                    {renderDeadline(ativ.data_fim, isAtivDone, true)}
                                    
                                    <button onClick={() => setAtividadeModal({show: true, data: ativ})} style={{background:'none', border:'none', color:'#3b82f6', cursor:'pointer'}} title="Editar Atividade" className="hover-shadow">
                                        <Icons.Edit size={16} />
                                    </button>
                                </div>
                            </div>

                            <div style={{display: 'flex', gap: '15px', alignItems: 'center'}}>
                                {!isAtivDone && <span style={{fontSize: '0.75rem', color: '#64748b', background: '#f1f5f9', padding: '4px 10px', borderRadius: '12px', fontWeight: '600'}}>{progresso}% Concluído</span>}
                                
                                <span style={{fontSize: '0.8rem', color: '#3b82f6', fontWeight: 'bold', background: '#eff6ff', padding: '4px 10px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '4px'}}>
                                    <Icons.Clock size={12} /> {formatTime(ativTime)}
                                </span>
                                
                                {hasNoTasks && !isAtivDone && (
                                    <button onClick={() => handleToggleTimer(ativ.id, 'activity')} style={{ background: isAtivTimerActive ? '#fee2e2' : '#f1f5f9', color: isAtivTimerActive ? '#ef4444' : '#64748b', border: 'none', padding: '6px 12px', borderRadius: '20px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', animation: isAtivTimerActive ? 'pulse 1.5s infinite' : 'none'}} className="hover-shadow">
                                        {isAtivTimerActive ? <><Icons.Stop size={12} /> Parar</> : <><Icons.Play size={12} /> Play</>}
                                    </button>
                                )}

                                {/* BOTÃO PARA RECOLHER/EXPANDIR A ATIVIDADE */}
                                {!isAtivDone && !hasNoTasks && (
                                    <button 
                                        onClick={() => toggleCollapseAtiv(ativ.id)} 
                                        style={{background: 'transparent', border: '1px solid #cbd5e1', color: '#64748b', padding: '4px 10px', borderRadius: '12px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', transition: '0.2s'}} 
                                        className="hover-shadow"
                                    >
                                        {isCollapsed ? <><Icons.ChevronDown /> Mostrar</> : <><Icons.ChevronUp /> Recolher</>}
                                    </button>
                                )}

                                <button onClick={() => handleDeleteItem("atividades", ativ.id)} style={{background:'none', border:'none', color:'#ef4444', cursor:'pointer', opacity:0.4}} className="hover-red">
                                    <Icons.Trash size={16} />
                                </button>
                            </div>
                        </div>

                        {/* LISTA DE TAREFAS */}
                        {!isAtivDone && !isCollapsed && (
                            <div style={{padding: '10px 20px 20px 20px', background: '#f8fafc'}}>
                                {ativ.tarefas?.map((tar, tIndex) => {
                                    const isTarDone = tar.estado === 'concluido';
                                    const hasSubs = tar.subtarefas?.length > 0;
                                    const subsDone = hasSubs ? tar.subtarefas.filter(s => s.estado === 'concluido').length : 0;
                                    const isExpanded = expandedTasks[tar.id];
                                    
                                    const isTimerActive = activeLog?.task_id === tar.id;
                                    const taskTime = getTaskTime(tar.id);
                                    const respName = staff.find(s => s.id === tar.responsavel_id)?.nome;

                                    return (
                                    <div 
                                        key={tar.id} 
                                        draggable
                                        onDragStart={(e) => handleDragStartTar(e, aIndex, tIndex)}
                                        onDragEnter={(e) => handleDragEnterTar(e, aIndex, tIndex)}
                                        onDragEnd={(e) => handleDropTar(e, aIndex)}
                                        onDragOver={(e) => e.preventDefault()}
                                        style={{background: 'white', border: isTimerActive ? '1px solid #3b82f6' : '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '8px', overflow: 'hidden', boxShadow: isTimerActive ? '0 0 0 2px rgba(59, 130, 246, 0.2)' : 'none', transition: 'all 0.2s'}}
                                    >
                                        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 15px', opacity: tar.estado === 'concluido' ? 0.6 : 1}}>
                                            <div style={{display: 'flex', alignItems: 'center', gap: '12px', flex: 1}}>
                                                <div style={{cursor: 'grab', color: '#cbd5e1', display:'flex'}} title="Arraste para reordenar"><Icons.GripVertical /></div>
                                                <div onClick={() => toggleTarefaStatus(tar.id, tar.estado)} style={{ width: '20px', height: '20px', borderRadius: '50%', cursor: 'pointer', border: tar.estado === 'concluido' ? 'none' : '2px solid #cbd5e1', background: tar.estado === 'concluido' ? '#10b981' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0 }}>
                                                    {tar.estado === 'concluido' && <Icons.Check size={12} />}
                                                </div>
                                                
                                                <span onClick={() => setTarefaModal({ show: true, data: tar, atividadeNome: ativ.titulo })} style={{textDecoration: tar.estado === 'concluido' ? 'line-through' : 'none', color: '#334155', fontWeight: '600', cursor: 'pointer', fontSize: '0.95rem'}} className="hover-underline" title="Clique para editar detalhes">
                                                    {tar.titulo}
                                                </span>
                                                
                                                <div style={{display: 'flex', gap: '6px', marginLeft: '10px'}}>
                                                    {tar.prioridade === 'Alta' || tar.prioridade === 'Urgente' ? <span style={{fontSize: '0.65rem', background: '#fee2e2', color: '#ef4444', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold'}}>{tar.prioridade}</span> : null}
                                                    {respName && <span style={{fontSize: '0.65rem', background: '#eff6ff', color: '#2563eb', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold'}}>{respName.split(' ')[0]}</span>}
                                                    {renderDeadline(tar.data_fim, isTarDone)}
                                                    {hasSubs && <span style={{fontSize: '0.65rem', background: subsDone === tar.subtarefas.length ? '#dcfce7' : '#f1f5f9', color: subsDone === tar.subtarefas.length ? '#16a34a' : '#64748b', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px'}}><Icons.ClipboardList size={10} /> {subsDone}/{tar.subtarefas.length}</span>}
                                                </div>
                                            </div>

                                            <div style={{display: 'flex', gap: '15px', alignItems: 'center'}}>
                                                <span style={{fontSize: '0.75rem', color: '#64748b', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px'}}><Icons.Clock size={12} /> {formatTime(taskTime)}</span>

                                                <button onClick={() => handleToggleTimer(tar.id, 'task')} style={{ background: isTimerActive ? '#fee2e2' : '#f1f5f9', color: isTimerActive ? '#ef4444' : '#64748b', border: 'none', padding: '4px 10px', borderRadius: '20px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', animation: isTimerActive ? 'pulse 1.5s infinite' : 'none'}} className="hover-shadow">
                                                    {isTimerActive ? <><Icons.Stop /> Parar</> : <><Icons.Play /> Play</>}
                                                </button>
                                                {hasSubs && <button onClick={() => toggleExpand(tar.id)} style={{background:'none', border:'none', color:'#94a3b8', cursor:'pointer', display: 'flex'}} className="hover-blue-text">{isExpanded ? <Icons.ChevronUp /> : <Icons.ChevronDown />}</button>}
                                                <button onClick={() => handleDeleteItem("tarefas", tar.id)} style={{background:'none', border:'none', color:'#ef4444', cursor:'pointer', opacity:0.4}} className="hover-red"><Icons.Close size={16} /></button>
                                            </div>
                                        </div>

                                        {/* ÁREA EXPANDIDA (CHECKLISTS) */}
                                        {isExpanded && (
                                            <div style={{padding: '0 15px 10px 45px', background: 'white', borderTop: '1px dashed #f1f5f9'}}>
                                                {tar.subtarefas?.map(sub => {
                                                    const isSubCompleted = sub.estado === 'concluido';
                                                    
                                                    return (
                                                        <div key={sub.id} style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', opacity: sub.estado === 'concluido' ? 0.5 : 1}}>
                                                            <div style={{display: 'flex', alignItems: 'center', gap: '10px', flex: 1}}>
                                                                <input type="checkbox" checked={sub.estado === 'concluido'} onChange={() => toggleSubtarefaStatus(sub.id, sub.estado)} style={{width: '14px', height: '14px', cursor: 'pointer', accentColor: '#3b82f6'}} />
                                                                
                                                                <span onClick={() => setSubtarefaModal({show: true, data: sub, tarefaNome: tar.titulo})} style={{fontSize: '0.85rem', color: '#475569', textDecoration: sub.estado === 'concluido' ? 'line-through' : 'none', cursor: 'pointer'}} className="hover-underline" title="Editar Sub-tarefa">
                                                                    {sub.titulo}
                                                                </span>

                                                                {renderDeadline(sub.data_fim, isSubCompleted)}
                                                            </div>

                                                            <button onClick={() => handleDeleteItem("subtarefas", sub.id)} style={{background:'none', border:'none', color:'#ef4444', cursor:'pointer', opacity:0.4, marginLeft: 'auto'}} className="hover-red"><Icons.Close size={14} /></button>
                                                        </div>
                                                    )
                                                })}
                                                <form onSubmit={(e) => handleAddSubtarefa(e, tar.id)} style={{marginTop: '6px'}}>
                                                    <input type="text" placeholder="+ Novo passo (Enter)" value={novaSubtarefaNome.tarId === tar.id ? novaSubtarefaNome.nome : ""} onChange={e => setNovaSubtarefaNome({ tarId: tar.id, nome: e.target.value })} style={{width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px dashed #cbd5e1', background: '#f8fafc', outline: 'none', fontSize: '0.8rem', color: '#64748b'}} className="input-focus" />
                                                </form>
                                            </div>
                                        )}
                                    </div>
                                    );
                                })}

                                <form onSubmit={(e) => handleAddTarefa(e, ativ.id)} style={{marginTop: '10px'}}>
                                    <input type="text" placeholder="+ Adicionar Tarefa Principal (Enter)..." value={novaTarefaNome.ativId === ativ.id ? novaTarefaNome.nome : ""} onChange={e => setNovaTarefaNome({ ativId: ativ.id, nome: e.target.value })} style={{width: '100%', padding: '12px 15px', borderRadius: '8px', border: '1px dashed #cbd5e1', background: 'white', outline: 'none', fontSize: '0.9rem', color: '#64748b'}} className="input-focus" />
                                </form>
                            </div>
                        )}
                    </div>
                )})}

                <form onSubmit={handleAddAtividade} style={{marginTop: '25px', background: 'transparent', padding: '0'}}>
                    <div style={{display: 'flex', gap: '10px'}}>
                        <input type="text" placeholder="+ Nome de uma nova Atividade (Agrupador)..." value={novaAtividadeNome} onChange={e => setNovaAtividadeNome(e.target.value)} style={{flex: 1, padding: '14px 15px', borderRadius: '8px', border: '1px dashed #cbd5e1', background: 'white', outline: 'none', fontSize: '0.95rem', color: '#1e293b'}} className="input-focus" />
                        <button type="submit" className="btn-primary hover-shadow" style={{borderRadius: '8px', padding: '0 25px', fontSize: '0.95rem', background: '#64748b', display: 'flex', alignItems: 'center', gap: '8px'}}>
                            <Icons.Plus /> Criar Bloco
                        </button>
                    </div>
                </form>
            </div>
        )}

        {/* =========================================
            ABA 2: RELATÓRIO DE TEMPOS
        ========================================= */}
        {activeTab === 'relatorio' && (
            <div style={{background: 'white', padding: '30px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', border: '1px solid #e2e8f0'}}>
                <h2 style={{margin: '0 0 20px 0', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '10px'}}><Icons.Clock size={24} color="#2563eb" /> Relatório de Execução</h2>
                
                <div style={{background: '#eff6ff', padding: '20px', borderRadius: '12px', border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '30px'}}>
                    <div>
                        <h4 style={{margin: 0, color: '#1e40af'}}>Tempo Total Gasto no Projeto</h4>
                        <p style={{margin: '5px 0 0 0', color: '#3b82f6', fontSize: '0.85rem'}}>Soma de todas as sessões do cronómetro.</p>
                    </div>
                    <div style={{fontSize: '2.5rem', fontWeight: '900', color: '#1d4ed8'}}>
                        {formatTime(getProjectTotalTime())}
                    </div>
                </div>

                <table className="data-table" style={{width: '100%', borderCollapse: 'collapse'}}>
                    <thead>
                        <tr style={{background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left', fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase'}}>
                            <th style={{padding: '12px'}}>Atividade / Tarefa</th>
                            <th style={{padding: '12px'}}>Responsável</th>
                            <th style={{padding: '12px', textAlign: 'right'}}>Tempo Gasto</th>
                        </tr>
                    </thead>
                    <tbody>
                        {atividades.map(ativ => (
                            <React.Fragment key={ativ.id}>
                                <tr style={{background: '#f1f5f9', borderBottom: '1px solid #e2e8f0'}}>
                                    <td style={{padding: '12px', fontWeight: 'bold', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px'}}><Icons.Folder size={16} /> {ativ.titulo}</td>
                                    <td style={{padding: '12px', color: '#64748b', fontSize: '0.85rem'}}>{staff.find(s => s.id === ativ.responsavel_id)?.nome || '-'}</td>
                                    <td style={{padding: '12px', textAlign: 'right', fontWeight: 'bold', color: '#3b82f6'}}>{formatTime(getActivityTime(ativ))}</td>
                                </tr>
                                {ativ.tarefas?.map(tar => {
                                    const time = getTaskTime(tar.id);
                                    if (time === 0) return null; 
                                    return (
                                        <tr key={tar.id} style={{borderBottom: '1px solid #f1f5f9'}}>
                                            <td style={{padding: '10px 12px 10px 40px', color: '#475569', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px'}}><Icons.CornerDownRight size={14} /> {tar.titulo}</td>
                                            <td style={{padding: '10px 12px', color: '#64748b', fontSize: '0.85rem'}}>{staff.find(s => s.id === tar.responsavel_id)?.nome || '-'}</td>
                                            <td style={{padding: '10px 12px', textAlign: 'right', color: '#475569', fontSize: '0.9rem'}}>{formatTime(time)}</td>
                                        </tr>
                                    )
                                })}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
        )}

        {/* =========================================
            ABA 3: VISÃO GERAL (Formulário)
        ========================================= */}
        {activeTab === 'geral' && (
            <div style={{background: 'white', padding: '35px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', border: '1px solid #e2e8f0'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', borderBottom: '1px solid #f1f5f9', paddingBottom: '15px'}}>
                    <h2 style={{margin: 0, color: '#0f172a', fontSize: '1.3rem'}}>Ficha do Projeto</h2>
                    {!isEditingGeral ? (
                        <button onClick={() => setIsEditingGeral(true)} className="btn-primary hover-shadow" style={{background: 'white', color: '#1e293b', border: '1px solid #cbd5e1', padding: '8px 16px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px'}}>
                            <Icons.Edit /> Ativar Edição
                        </button>
                    ) : (
                        <div style={{display: 'flex', gap: '10px'}}>
                            <button onClick={() => { setIsEditingGeral(false); setFormGeral(projeto); }} className="btn-small hover-shadow" style={{padding: '8px 16px', borderRadius: '8px', fontSize: '0.9rem', background: 'white', border: '1px solid #cbd5e1', color: '#64748b', fontWeight: 'bold'}}>Cancelar</button>
                            <button onClick={handleUpdateProjeto} className="btn-primary hover-shadow" style={{padding: '8px 20px', borderRadius: '8px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px'}}>
                                <Icons.Save /> Gravar Modificações
                            </button>
                        </div>
                    )}
                </div>

                <fieldset disabled={!isEditingGeral} style={{border: 'none', padding: 0, margin: 0, opacity: !isEditingGeral ? 0.8 : 1, transition: 'opacity 0.3s'}}>
                    <div style={{display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '40px'}}>
                        <div>
                            <label style={labelStyle}>Nome do Projeto</label>
                            <input type="text" value={formGeral.titulo || ''} onChange={e => setFormGeral({...formGeral, titulo: e.target.value})} style={{...inputStyle, fontWeight: 'bold', color: '#0f172a'}} className="input-focus" />
                            
                            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px'}}>
                                <div><label style={labelStyle}>Cliente (Opção Livre ou Registado)</label>
                                    <div style={{display:'flex', gap:'10px'}}>
                                        <select value={formGeral.cliente_id || ''} onChange={e => setFormGeral({...formGeral, cliente_id: e.target.value, cliente_texto: ""})} style={{...inputStyle, flex:1}} className="input-focus">
                                            <option value="">- NENHUM -</option>{clientes.map(c => <option key={c.id} value={c.id}>{c.marca}</option>)}
                                        </select>
                                        <input type="text" placeholder="Texto livre" value={formGeral.cliente_texto || ''} onChange={e => setFormGeral({...formGeral, cliente_texto: e.target.value, cliente_id: null})} style={{...inputStyle, flex:1}} className="input-focus" />
                                    </div>
                                </div>
                                <div><label style={labelStyle}>Responsável</label>
                                    <select value={formGeral.responsavel_id || ''} onChange={e => setFormGeral({...formGeral, responsavel_id: e.target.value})} style={inputStyle} className="input-focus">
                                        <option value="">- NENHUM -</option>{staff.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px'}}>
                                <div><label style={labelStyle}>Código</label><input type="text" value={formGeral.codigo_projeto || ''} onChange={e => setFormGeral({...formGeral, codigo_projeto: e.target.value})} style={inputStyle} className="input-focus" /></div>
                                <div><label style={labelStyle}>Programa</label><input type="text" value={formGeral.programa || ''} onChange={e => setFormGeral({...formGeral, programa: e.target.value})} style={inputStyle} className="input-focus" /></div>
                                <div><label style={labelStyle}>Aviso</label><input type="text" value={formGeral.aviso || ''} onChange={e => setFormGeral({...formGeral, aviso: e.target.value})} style={inputStyle} className="input-focus" /></div>
                            </div>

                            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px'}}>
                                <div><label style={labelStyle}>Data Início</label><input type="date" value={formGeral.data_inicio || ''} onChange={e => setFormGeral({...formGeral, data_inicio: e.target.value})} style={inputStyle} className="input-focus" /></div>
                                <div><label style={labelStyle}>Deadline</label><input type="date" value={formGeral.data_fim || ''} onChange={e => setFormGeral({...formGeral, data_fim: e.target.value})} style={inputStyle} className="input-focus" /></div>
                                <div>
                                    <label style={labelStyle}>Estado</label>
                                    <select value={formGeral.estado || 'pendente'} onChange={e => setFormGeral({...formGeral, estado: e.target.value})} style={{...inputStyle, fontWeight: 'bold'}} className="input-focus">
                                        <option value="pendente">Pendente</option><option value="em_curso">Em Curso</option><option value="concluido">Concluído</option><option value="cancelado">Cancelado</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div>
                            <div style={{background: '#eff6ff', padding: '20px', borderRadius: '12px', border: '1px solid #bfdbfe', marginBottom: '20px'}}>
                                <h4 style={{margin: '0 0 15px 0', color: '#1e40af', display: 'flex', alignItems: 'center', gap: '8px', fontSize:'1rem'}}><Icons.Dollar /> Financeiro</h4>
                                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px'}}>
                                    <div><label style={{...labelStyle, color: '#1e3a8a'}}>Investimento (€)</label><input type="number" step="0.01" value={formGeral.investimento || 0} onChange={e => setFormGeral({...formGeral, investimento: e.target.value})} style={{...inputStyle, borderColor: '#bfdbfe', marginBottom:0}} className="input-focus" /></div>
                                    <div><label style={{...labelStyle, color: '#1e3a8a'}}>Incentivo (€)</label><input type="number" step="0.01" value={formGeral.incentivo || 0} onChange={e => setFormGeral({...formGeral, incentivo: e.target.value})} style={{...inputStyle, borderColor: '#bfdbfe', color: '#16a34a', marginBottom:0}} className="input-focus" /></div>
                                </div>
                            </div>
                            <label style={labelStyle}>Descrição Pública</label>
                            <textarea rows="3" value={formGeral.descricao || ''} onChange={e => setFormGeral({...formGeral, descricao: e.target.value})} style={{...inputStyle, resize: 'vertical', fontSize:'0.85rem'}} className="input-focus" />
                            <label style={{...labelStyle, color: '#b45309', marginTop: '5px'}}>Observações Internas</label>
                            <textarea rows="3" value={formGeral.observacoes || ''} onChange={e => setFormGeral({...formGeral, observacoes: e.target.value})} style={{...inputStyle, resize: 'vertical', background: '#fffbeb', borderColor: '#fcd34d', fontSize:'0.85rem'}} className="input-focus-alert" />
                        </div>
                    </div>
                </fieldset>
            </div>
        )}

      </div>

      {/* =========================================
          MODAIS DE EDIÇÃO AVANÇADOS
      ========================================= */}

      {/* MODAL 1: EDITAR ATIVIDADE */}
      {atividadeModal.show && atividadeModal.data && (
          <ModalPortal>
              <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999}}>
                  <div style={{background: 'white', padding: '30px', borderRadius: '16px', width: '600px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'}}>
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
                          <h3 style={{margin: 0, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px'}}><Icons.ClipboardList size={20} color="#2563eb" /> Editar Atividade</h3>
                          <button onClick={() => setAtividadeModal({show:false, data:null})} style={{background:'none', border:'none', fontSize:'1.2rem', color:'#94a3b8', cursor:'pointer'}}>✕</button>
                      </div>
                      
                      <form onSubmit={handleSaveAtividade}>
                          <label style={labelStyle}>Título da Atividade *</label>
                          <input type="text" value={atividadeModal.data.titulo} onChange={e => setAtividadeModal({show: true, data: {...atividadeModal.data, titulo: e.target.value}})} style={{...inputStyle, fontWeight: 'bold'}} className="input-focus" required />
                          
                          <div style={sectionTitleStyle}><Icons.Layers /> Projeto & Responsável</div>
                          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px'}}>
                              <div>
                                  <label style={{fontSize: '0.75rem', color: '#64748b', marginBottom: '4px', display:'block', fontWeight: 'bold'}}>Projeto Pai</label>
                                  <input type="text" value={projeto.titulo} disabled style={{...inputStyle, background: '#f1f5f9', marginBottom: 0}} />
                              </div>
                              <div>
                                  <label style={{fontSize: '0.75rem', color: '#64748b', marginBottom: '4px', display:'block', fontWeight: 'bold'}}>Responsável</label>
                                  <select value={atividadeModal.data.responsavel_id || ''} onChange={e => setAtividadeModal({show: true, data: {...atividadeModal.data, responsavel_id: e.target.value}})} style={{...inputStyle, marginBottom: 0}} className="input-focus">
                                      <option value="">- Ninguém -</option>
                                      {staff.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                                  </select>
                              </div>
                          </div>

                          <div style={sectionTitleStyle}><Icons.Calendar /> Planeamento & Financeiro</div>
                          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px', marginBottom: '15px'}}>
                              <div><label style={{fontSize: '0.75rem', color: '#64748b', marginBottom: '4px', display:'block', fontWeight: 'bold'}}>Data Início</label><input type="date" value={atividadeModal.data.data_inicio || ''} onChange={e => setAtividadeModal({show: true, data: {...atividadeModal.data, data_inicio: e.target.value}})} style={{...inputStyle, padding:'10px', fontSize:'0.85rem', marginBottom: 0}} className="input-focus" /></div>
                              <div><label style={{fontSize: '0.75rem', color: '#64748b', marginBottom: '4px', display:'block', fontWeight: 'bold'}}>Data Fim</label><input type="date" value={atividadeModal.data.data_fim || ''} onChange={e => setAtividadeModal({show: true, data: {...atividadeModal.data, data_fim: e.target.value}})} style={{...inputStyle, padding:'10px', fontSize:'0.85rem', marginBottom: 0}} className="input-focus" /></div>
                              <div><label style={{fontSize: '0.75rem', color: '#64748b', marginBottom: '4px', display:'block', fontWeight: 'bold'}}>Invest. (€)</label><input type="number" step="0.01" value={atividadeModal.data.investimento || 0} onChange={e => setAtividadeModal({show: true, data: {...atividadeModal.data, investimento: e.target.value}})} style={{...inputStyle, padding:'10px', fontSize:'0.85rem', marginBottom: 0}} className="input-focus" /></div>
                              <div><label style={{fontSize: '0.75rem', color: '#64748b', marginBottom: '4px', display:'block', fontWeight: 'bold'}}>Incentivo (€)</label><input type="number" step="0.01" value={atividadeModal.data.incentivo || 0} onChange={e => setAtividadeModal({show: true, data: {...atividadeModal.data, incentivo: e.target.value}})} style={{...inputStyle, padding:'10px', fontSize:'0.85rem', marginBottom: 0}} className="input-focus" /></div>
                          </div>

                          <div style={sectionTitleStyle}><Icons.Activity /> Estado</div>
                          {renderStatePills(atividadeModal.data.estado, (val) => setAtividadeModal({show: true, data: {...atividadeModal.data, estado: val}}))}

                          <div style={sectionTitleStyle}><Icons.FileText /> Notas</div>
                          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px'}}>
                              <textarea rows="3" placeholder="Descrição..." value={atividadeModal.data.descricao || ''} onChange={e => setAtividadeModal({show: true, data: {...atividadeModal.data, descricao: e.target.value}})} style={{...inputStyle, resize:'none'}} className="input-focus" />
                              <textarea rows="3" placeholder="Observações..." value={atividadeModal.data.observacoes || ''} onChange={e => setAtividadeModal({show: true, data: {...atividadeModal.data, observacoes: e.target.value}})} style={{...inputStyle, resize:'none', background:'#fffbeb', borderColor:'#fcd34d'}} className="input-focus-alert" />
                          </div>

                          <div style={{display: 'flex', gap: '10px', marginTop: '20px', paddingTop: '15px', borderTop: '1px solid #f1f5f9'}}>
                              <button type="button" onClick={() => setAtividadeModal({show:false, data:null})} style={{flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', background: 'white', color: '#64748b', fontWeight: 'bold', cursor:'pointer'}} className="hover-shadow">Cancelar</button>
                              <button type="submit" style={{flex: 2, padding: '12px', borderRadius: '10px', border: 'none', background: '#2563eb', color: 'white', fontWeight: 'bold', cursor:'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'}} className="hover-shadow"><Icons.Save /> Guardar Alterações</button>
                          </div>
                      </form>
                  </div>
              </div>
          </ModalPortal>
      )}

      {/* MODAL 2: EDITAR TAREFA */}
      {tarefaModal.show && tarefaModal.data && (
          <ModalPortal>
              <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999}}>
                  <div style={{background: 'white', padding: '30px', borderRadius: '16px', width: '500px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', animation: 'fadeIn 0.2s ease-out'}}>
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
                          <h3 style={{margin: 0, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px'}}><Icons.Eye size={20} color="#2563eb" /> Detalhes da Tarefa</h3>
                          <button onClick={() => setTarefaModal({show:false, data:null, atividadeNome:''})} style={{background:'none', border:'none', cursor:'pointer'}} className="hover-red-text"><Icons.Close size={20} /></button>
                      </div>
                      
                      <form onSubmit={handleSaveTarefa}>
                          <label style={labelStyle}>Título da Tarefa *</label>
                          <input type="text" value={tarefaModal.data.titulo} onChange={e => setTarefaModal({...tarefaModal, data: {...tarefaModal.data, titulo: e.target.value}})} style={{...inputStyle, fontWeight: 'bold'}} className="input-focus" required />
                          
                          <div style={sectionTitleStyle}><Icons.Layers /> Enquadramento</div>
                          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px'}}>
                              <div>
                                  <label style={{fontSize: '0.75rem', color: '#64748b', marginBottom: '4px', display:'block', fontWeight:'bold'}}>Atividade Pai</label>
                                  <input type="text" value={tarefaModal.atividadeNome} disabled style={{...inputStyle, background: '#f1f5f9', marginBottom: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap'}} />
                              </div>
                              <div>
                                  <label style={{fontSize: '0.75rem', color: '#64748b', marginBottom: '4px', display:'block', fontWeight:'bold'}}>Responsável</label>
                                  <select value={tarefaModal.data.responsavel_id || ''} onChange={e => setTarefaModal({...tarefaModal, data: {...tarefaModal.data, responsavel_id: e.target.value}})} style={{...inputStyle, marginBottom: 0}} className="input-focus">
                                      <option value="">- Ninguém -</option>
                                      {staff.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                                  </select>
                              </div>
                          </div>

                          <div style={sectionTitleStyle}><Icons.Calendar /> Planeamento & Estado</div>
                          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '15px'}}>
                              <div>
                                  <label style={{fontSize: '0.75rem', color: '#64748b', marginBottom: '4px', display:'block', fontWeight:'bold'}}>Data Início</label>
                                  <input type="date" value={tarefaModal.data.data_inicio || ''} onChange={e => setTarefaModal({...tarefaModal, data: {...tarefaModal.data, data_inicio: e.target.value}})} style={{...inputStyle, padding:'10px', fontSize:'0.85rem', marginBottom: 0}} className="input-focus" />
                              </div>
                              <div>
                                  <label style={{fontSize: '0.75rem', color: '#64748b', marginBottom: '4px', display:'block', fontWeight:'bold'}}>Prazo Limite</label>
                                  <input type="date" value={tarefaModal.data.data_fim || ''} onChange={e => setTarefaModal({...tarefaModal, data: {...tarefaModal.data, data_fim: e.target.value}})} style={{...inputStyle, padding:'10px', fontSize:'0.85rem', marginBottom: 0}} className="input-focus" />
                              </div>
                              <div>
                                  <label style={{fontSize: '0.75rem', color: '#64748b', marginBottom: '4px', display:'block', fontWeight:'bold'}}>Prioridade</label>
                                  <select value={tarefaModal.data.prioridade || 'Normal'} onChange={e => setTarefaModal({...tarefaModal, data: {...tarefaModal.data, prioridade: e.target.value}})} style={{...inputStyle, padding:'10px', fontSize:'0.85rem', marginBottom: 0}} className="input-focus">
                                      <option value="Baixa">🔵 Baixa</option>
                                      <option value="Normal">🟢 Normal</option>
                                      <option value="Alta">🟠 Alta</option>
                                      <option value="Urgente">🔴 Urgente</option>
                                  </select>
                              </div>
                          </div>

                          <label style={{...labelStyle, marginTop:'15px'}}>Estado Atual</label>
                          {renderStatePills(tarefaModal.data.estado, (val) => setTarefaModal({...tarefaModal, data: {...tarefaModal.data, estado: val}}))}

                          <div style={sectionTitleStyle}><Icons.FileText /> Detalhes</div>
                          <textarea rows="4" placeholder="Descreva o que é necessário fazer..." value={tarefaModal.data.descricao || ''} onChange={e => setTarefaModal({...tarefaModal, data: {...tarefaModal.data, descricao: e.target.value}})} style={{...inputStyle, resize:'none'}} className="input-focus" />

                          <div style={{display: 'flex', gap: '10px', marginTop: '20px', paddingTop: '15px', borderTop: '1px solid #f1f5f9'}}>
                              <button type="button" onClick={() => setTarefaModal({show:false, data:null, atividadeNome:''})} style={{flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', background: 'white', color: '#64748b', fontWeight: 'bold', cursor:'pointer'}} className="hover-shadow">Cancelar</button>
                              <button type="submit" style={{flex: 2, padding: '12px', borderRadius: '10px', border: 'none', background: '#2563eb', color: 'white', fontWeight: 'bold', cursor:'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'}} className="hover-shadow"><Icons.Save /> Guardar Tarefa</button>
                          </div>
                      </form>
                  </div>
              </div>
          </ModalPortal>
      )}

      {/* MODAL 3: EDITAR SUB-TAREFA COM DATA E ESTADO */}
      {subtarefaModal.show && subtarefaModal.data && (
          <ModalPortal>
              <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999}}>
                  <div style={{background: 'white', padding: '30px', borderRadius: '16px', width: '400px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'}}>
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
                          <h3 style={{margin: 0, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px'}}><Icons.Check size={20} color="#2563eb" /> Detalhes do Passo</h3>
                          <button onClick={() => setSubtarefaModal({show:false, data:null, tarefaNome:''})} style={{background:'none', border:'none', cursor:'pointer'}} className="hover-red-text"><Icons.Close size={20} /></button>
                      </div>
                      
                      <form onSubmit={handleSaveSubtarefa}>
                          <label style={labelStyle}>Nome do Passo / Checklist *</label>
                          <input type="text" autoFocus value={subtarefaModal.data.titulo} onChange={e => setSubtarefaModal({...subtarefaModal, data: {...subtarefaModal.data, titulo: e.target.value}})} style={{...inputStyle, fontWeight: 'bold'}} className="input-focus" required />
                          
                          <div style={sectionTitleStyle}><Icons.Layers /> Enquadramento</div>
                          <div style={{marginBottom: '15px'}}>
                              <label style={{fontSize: '0.75rem', color: '#64748b', marginBottom: '4px', display:'block', fontWeight:'bold'}}>Pertence à Tarefa</label>
                              <input type="text" value={subtarefaModal.tarefaNome} disabled style={{...inputStyle, background: '#f1f5f9', marginBottom: 0}} />
                          </div>

                          <div style={sectionTitleStyle}><Icons.Calendar /> Prazo (Opcional)</div>
                          <div style={{marginBottom: '15px'}}>
                              <label style={{fontSize: '0.75rem', color: '#64748b', marginBottom: '4px', display:'block', fontWeight:'bold'}}>Data Limite para concluir este passo</label>
                              <input type="date" value={subtarefaModal.data.data_fim || ''} onChange={e => setSubtarefaModal({...subtarefaModal, data: {...subtarefaModal.data, data_fim: e.target.value}})} style={{...inputStyle, marginBottom: 0}} className="input-focus" />
                          </div>

                          <label style={{...labelStyle, marginTop:'15px'}}>Estado Atual</label>
                          {renderStatePills(subtarefaModal.data.estado, (val) => setSubtarefaModal({...subtarefaModal, data: {...subtarefaModal.data, estado: val}}))}

                          <div style={{display: 'flex', gap: '10px', marginTop: '20px', paddingTop: '15px', borderTop: '1px solid #f1f5f9'}}>
                              <button type="button" onClick={() => setSubtarefaModal({show:false, data:null, tarefaNome:''})} style={{flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', background: 'white', color: '#64748b', fontWeight: 'bold', cursor:'pointer'}} className="hover-shadow">Cancelar</button>
                              <button type="submit" style={{flex: 2, padding: '12px', borderRadius: '10px', border: 'none', background: '#2563eb', color: 'white', fontWeight: 'bold', cursor:'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'}} className="hover-shadow"><Icons.Save /> Guardar</button>
                          </div>
                      </form>
                  </div>
              </div>
          </ModalPortal>
      )}

      {notification && <div className={`toast-container ${notification.type}`}>{notification.type === 'success' ? '✅' : '⚠️'} {notification.message}</div>}
      
      <style>{`
          .hover-blue-text:hover { color: #2563eb !important; }
          .hover-blue-text:hover span { background: #e0f2fe !important; color: #2563eb !important; }
          .tab-hover:hover { color: #0f172a !important; }
          .hover-red:hover { opacity: 1 !important; color: #dc2626 !important; }
          .hover-red-text:hover { color: #ef4444 !important; }
          .hover-underline:hover { text-decoration: underline !important; }
          
          /* Animação suave para os botões e painéis */
          .hover-shadow:hover { transform: translateY(-1px); box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
          
          .input-focus:focus { border-color: #3b82f6 !important; box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1); }
          .input-focus-alert:focus { border-color: #f59e0b !important; box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.1); }

          /* Scrollbar Limpa */
          .custom-scrollbar::-webkit-scrollbar { height: 6px; width: 6px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 10px; }

          @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
          
          @keyframes pulse { 0% {box-shadow:0 0 0 0 rgba(239,68,68,0.7)} 70% {box-shadow:0 0 0 6px rgba(239,68,68,0)} 100% {box-shadow:0 0 0 0 rgba(239,68,68,0)}} 
          .pulse-dot-white { width: 8px; height: 8px; background-color: white; border-radius: 50%; display: inline-block; animation: pulse 1.5s infinite; }
      `}</style>
    </div>
  );
}