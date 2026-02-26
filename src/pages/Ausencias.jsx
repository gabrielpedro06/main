import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../services/supabase";
import { useAuth } from "../context/AuthContext";
import "./../styles/dashboard.css";

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

export default function Ferias() {
  const { user } = useAuth(); 
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [diasFerias, setDiasFerias] = useState(null); 
  
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
  const [confirmCancel, setConfirmCancel] = useState({ show: false, pedido: null });

  // ESTADOS PARA EDIÇÃO DE PEDIDO
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // ESTADOS PARA ANEXAR DOCUMENTO A POSTERIORI
  const [uploadModal, setUploadModal] = useState({ show: false, pedido: null });
  const [uploadFile, setUploadFile] = useState(null);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);

  const [form, setForm] = useState({ 
      tipo: "Férias", 
      data_inicio: "", 
      data_fim: "", 
      is_parcial: false, 
      hora_inicio: "", 
      hora_fim: "", 
      motivo: "" 
  });
  const [file, setFile] = useState(null); 
  const [diasUteis, setDiasUteis] = useState(0); 

  // --- ALGORITMO DE FERIADOS ---
  const getFeriados = (ano) => {
      const a = ano % 19; const b = Math.floor(ano / 100); const c = ano % 100;
      const d = Math.floor(b / 4); const e = b % 4;
      const f = Math.floor((b + 8) / 25); const g = Math.floor((b - f + 1) / 3);
      const h = (19 * a + b - d - g + 15) % 30;
      const i = Math.floor(c / 4); const k = c % 4;
      const l = (32 + 2 * e + 2 * i - h - k) % 7;
      const m = Math.floor((a + 11 * h + 22 * l) / 451);
      const mesPascoa = Math.floor((h + l - 7 * m + 114) / 31) - 1;
      const diaPascoa = ((h + l - 7 * m + 114) % 31) + 1;
      
      const pascoa = new Date(ano, mesPascoa, diaPascoa);
      const sextaSanta = new Date(pascoa); sextaSanta.setDate(pascoa.getDate() - 2);
      const carnaval = new Date(pascoa); carnaval.setDate(pascoa.getDate() - 47);
      const corpoDeus = new Date(pascoa); corpoDeus.setDate(pascoa.getDate() + 60);

      return [
          { d: 1, m: 0, nome: "Ano Novo" },
          { d: carnaval.getDate(), m: carnaval.getMonth(), nome: "Carnaval" },
          { d: sextaSanta.getDate(), m: sextaSanta.getMonth(), nome: "Sexta-feira Santa" },
          { d: pascoa.getDate(), m: pascoa.getMonth(), nome: "Páscoa" },
          { d: 25, m: 3, nome: "Dia da Liberdade" },
          { d: 1, m: 4, nome: "Dia do Trabalhador" },
          { d: corpoDeus.getDate(), m: corpoDeus.getMonth(), nome: "Corpo de Deus" },
          { d: 10, m: 5, nome: "Dia de Portugal" },
          { d: 15, m: 7, nome: "Assunção de N. Senhora" },
          { d: 7, m: 8, nome: "Feriado de Faro" }, 
          { d: 5, m: 9, nome: "Implantação da República" },
          { d: 1, m: 10, nome: "Todos os Santos" },
          { d: 1, m: 11, nome: "Restauração da Independência" },
          { d: 8, m: 11, nome: "Imaculada Conceição" },
          { d: 25, m: 11, nome: "Natal" }
      ];
  };

  useEffect(() => {
    if (user) {
        fetchPedidos();
        fetchDiasReais(); 
    }
  }, [user]);

  useEffect(() => {
      if (!form.is_parcial && form.data_inicio && form.data_fim) {
          const inicio = new Date(form.data_inicio);
          const fim = new Date(form.data_fim);
          
          if (inicio <= fim) {
              let count = 0;
              for (let d = new Date(inicio); d <= fim; d.setDate(d.getDate() + 1)) {
                  const dayOfWeek = d.getDay();
                  if (dayOfWeek !== 0 && dayOfWeek !== 6) { 
                      const feriados = getFeriados(d.getFullYear());
                      const isFeriado = feriados.some(f => f.d === d.getDate() && f.m === d.getMonth());
                      if (!isFeriado) { count++; }
                  }
              }
              setDiasUteis(count);
          } else { setDiasUteis(0); }
      } else { setDiasUteis(0); }
  }, [form.data_inicio, form.data_fim, form.is_parcial]);

  async function fetchDiasReais() {
      const { data } = await supabase.from('profiles').select('dias_ferias').eq('id', user.id).single();
      if (data) setDiasFerias(data.dias_ferias);
  }

  async function fetchPedidos() {
    setLoading(true);
    const { data, error } = await supabase.from("ferias").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    if (!error) setPedidos(data || []);
    setLoading(false);
  }

  const handleEditClick = (pedido) => {
      setIsEditing(true);
      setEditingId(pedido.id);
      setForm({
          tipo: pedido.tipo,
          data_inicio: pedido.data_inicio,
          data_fim: pedido.data_fim,
          is_parcial: pedido.is_parcial || false,
          hora_inicio: pedido.hora_inicio || "",
          hora_fim: pedido.hora_fim || "",
          motivo: pedido.motivo || ""
      });
      setShowModal(true);
  };

  const handleCloseModal = () => {
      setShowModal(false);
      setIsEditing(false);
      setEditingId(null);
      setFile(null);
      setForm({ tipo: "Férias", data_inicio: "", data_fim: "", is_parcial: false, hora_inicio: "", hora_fim: "", motivo: "" });
  };

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.is_parcial && diasUteis === 0) {
        setNotification({ show: true, message: "O período selecionado contém apenas fins de semana ou feriados.", type: "error" });
        return;
    }
    if (!form.is_parcial && new Date(form.data_inicio) > new Date(form.data_fim)) {
        setNotification({ show: true, message: "A data de fim não pode ser anterior à data de início.", type: "error" });
        return;
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
          tipo: form.tipo,
          data_inicio: form.data_inicio,
          data_fim: form.is_parcial ? form.data_inicio : form.data_fim, 
          is_parcial: form.is_parcial,
          hora_inicio: form.is_parcial ? form.hora_inicio : null,
          hora_fim: form.is_parcial ? form.hora_fim || null : null,
          motivo: form.motivo
      };

      if (anexo_url) payload.anexo_url = anexo_url;

      let dbError;
      if (isEditing) {
          payload.estado = 'pendente';
          const { error } = await supabase.from("ferias").update(payload).eq("id", editingId);
          dbError = error;
      } else {
          payload.estado = 'pendente';
          const { error } = await supabase.from("ferias").insert([payload]);
          dbError = error;
      }

      if (dbError) throw dbError;

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

  const getStatusBadge = (estado) => {
    switch (estado?.toLowerCase()) {
      case 'aprovado': return <span className="badge" style={{background: '#dcfce7', color: '#166534', fontWeight: 'bold'}}>Aprovado</span>;
      case 'rejeitado': return <span className="badge" style={{background: '#fee2e2', color: '#991b1b', fontWeight: 'bold'}}>Rejeitado</span>;
      case 'cancelado': return <span className="badge" style={{background: '#f1f5f9', color: '#64748b', fontWeight: 'bold'}}>Cancelado</span>;
      case 'pedido_cancelamento': return <span className="badge" style={{background: '#fefce8', color: '#a16207', fontWeight: 'bold'}}>A pedir cancelamento...</span>;
      default: return <span className="badge" style={{background: '#fef3c7', color: '#b45309', fontWeight: 'bold'}}>Pendente</span>;
    }
  };

  const getTipoEstilo = (tipo) => {
    let icon, color;
    switch (tipo) {
      case 'Férias': icon = <Icons.Sun color="#d97706" />; color = "#b45309"; break;
      case 'Assistência à família': icon = <Icons.Users color="#2563eb" />; color = "#1d4ed8"; break;
      case 'Outros - Assuntos pessoais': icon = <Icons.User color="#475569" />; color = "#334155"; break;
      case 'Ausência sem motivo - injustificada': icon = <Icons.AlertTriangle color="#ef4444" />; color = "#b91c1c"; break;
      case 'Doença, acidente e obrigação legal': icon = <Icons.Activity color="#8b5cf6" />; color = "#7e22ce"; break;
      case 'Casamento': icon = <Icons.Heart color="#ec4899" />; color = "#be185d"; break;
      case 'Deslocação a estabelecimento de ensino': icon = <Icons.BookOpen color="#0ea5e9" />; color = "#0369a1"; break;
      case 'Licença maternal/paternal': icon = <Icons.Heart color="#f43f5e" />; color = "#e11d48"; break;
      case 'Licença sem vencimento': icon = <Icons.MinusCircle color="#64748b" />; color = "#475569"; break;
      case 'Falecimento de familiar': icon = <Icons.MinusCircle color="#1e293b" />; color = "#0f172a"; break;
      case 'Prestação de provas de avaliação': icon = <Icons.FileText color="#14b8a6" />; color = "#0f766e"; break;
      case 'Candidato a cargo público': icon = <Icons.Scale color="#6366f1" />; color = "#4338ca"; break;
      default: icon = <Icons.AlertTriangle color="#f59e0b" />; color = "#b45309"; break;
    }
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: color, fontWeight: '700', fontSize: '0.9rem' }}>
            {icon} {tipo}
        </div>
    );
  };

  const formatDate = (dateString) => {
      if (!dateString) return '-';
      return new Date(dateString).toLocaleDateString('pt-PT');
  };

  const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.95rem', color: '#1e293b', outline: 'none', boxSizing: 'border-box' };
  const labelStyle = { display: 'block', marginBottom: '6px', fontSize: '0.8rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' };

  return (
    <div className="page-container" style={{maxWidth: '1200px', margin: '0 auto', paddingBottom: '40px'}}>
      
      {/* HEADER */}
      <div className="card" style={{ marginBottom: 25, padding: '25px', display: "flex", justifyContent: "space-between", alignItems: 'center', flexWrap: 'wrap', gap: '15px', background: 'white', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        <div style={{display:'flex', alignItems:'center', gap:'15px'}}>
            <div style={{background: '#eff6ff', color: '#2563eb', padding: '12px', borderRadius: '12px', display: 'flex'}}><Icons.Sun size={24} /></div>
            <div>
                <h1 style={{margin: 0, color: '#0f172a', fontSize: '1.8rem', fontWeight: '900', letterSpacing: '-0.02em'}}>Férias & Ausências</h1>
                <p style={{color: '#64748b', margin: 0, fontWeight: '500', fontSize: '0.9rem'}}>Gestão pessoal de tempo e calendário</p>
            </div>
        </div>
        <button className="btn-primary hover-shadow" onClick={() => { setIsEditing(false); setEditingId(null); setShowModal(true); }} style={{display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', padding: '12px 24px'}}>
            <Icons.Plus /> Novo Pedido
        </button>
      </div>

      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '25px'}}>
        <div className="card" style={{padding: '25px', display: 'flex', alignItems: 'center', gap: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)'}}>
            <div style={{background: '#eff6ff', color: '#2563eb', padding: '15px', borderRadius: '50%'}}><Icons.Sun size={24} /></div>
            <div>
                <h3 style={{margin: '0 0 5px 0', fontSize: '0.9rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em'}}>Dias Disponíveis</h3>
                <p style={{margin: 0, color: '#1e293b', fontSize: '1.8rem', fontWeight: '900'}}>{diasFerias ?? '--'}</p>
            </div>
        </div>
        <div className="card" style={{padding: '25px', display: 'flex', alignItems: 'center', gap: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)'}}>
            <div style={{background: '#fefce8', color: '#d97706', padding: '15px', borderRadius: '50%'}}><Icons.Clock size={24} color="#d97706" /></div>
            <div>
                <h3 style={{margin: '0 0 5px 0', fontSize: '0.9rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em'}}>Pedidos Pendentes</h3>
                <p style={{margin: 0, color: '#1e293b', fontSize: '1.8rem', fontWeight: '900'}}>{pedidos.filter(p => p.estado?.toLowerCase() === 'pendente').length}</p>
            </div>
        </div>
      </div>

      <div className="card" style={{ padding: '25px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
        <h3 style={{marginTop: 0, marginBottom: '20px', color: '#1e293b', fontSize: '1.2rem', fontWeight: '800'}}>O Meu Histórico</h3>
        <div className="table-responsive">
          <table className="data-table" style={{ width: "100%", borderCollapse: 'collapse', minWidth: '800px' }}>
            <thead>
              <tr style={{color: '#64748b', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', borderBottom: '2px solid #f1f5f9'}}>
                <th style={{padding: '15px', textAlign: 'left'}}>Tipo de Ausência</th>
                <th style={{padding: '15px', textAlign: 'left'}}>Período</th>
                <th style={{padding: '15px', textAlign: 'left'}}>Motivo / Notas</th>
                <th style={{padding: '15px', textAlign: 'center'}}>Documento</th>
                <th style={{padding: '15px', textAlign: 'left'}}>Estado</th>
                <th style={{padding: '15px', textAlign: 'right'}}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {pedidos.length > 0 ? pedidos.map(p => (
                <tr key={p.id} style={{borderBottom: '1px solid #f8fafc'}} className="table-row-hover">
                  <td style={{padding: '15px'}}>
                      {getTipoEstilo(p.tipo)}
                  </td>
                  
                  <td style={{padding: '15px'}}>
                    {p.is_parcial ? (
                        <>
                            <div style={{fontWeight: '600', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px'}}><Icons.Calendar size={14} /> {formatDate(p.data_inicio)}</div>
                            <div style={{fontSize: '0.75rem', color: '#64748b', marginTop: '6px', background: '#f1f5f9', padding: '4px 8px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 'bold'}}>
                                <Icons.Clock size={12} /> {p.hora_inicio.slice(0,5)} {p.hora_fim ? `às ${p.hora_fim.slice(0,5)}` : '(Saída)'}
                            </div>
                        </>
                    ) : (
                        <div style={{fontWeight: '600', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px'}}>
                            <Icons.Calendar size={14} /> {formatDate(p.data_inicio)} <span style={{color: '#cbd5e1', fontWeight: 'normal'}}>até</span> {formatDate(p.data_fim)}
                        </div>
                    )}
                  </td>

                  <td style={{padding: '15px', maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#64748b', fontSize: '0.9rem'}} title={p.motivo}>
                      {p.motivo || '-'}
                  </td>
                  
                  <td style={{padding: '15px', textAlign: 'center'}}>
                      {p.anexo_url ? (
                          <div style={{display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center'}}>
                              <a href={p.anexo_url} target="_blank" rel="noreferrer" className="action-btn hover-blue-text hover-shadow" style={{background: '#eff6ff', color: '#2563eb', padding: '6px', borderRadius: '6px'}} title="Ver Documento"><Icons.Eye size={16} /></a>
                              <button onClick={() => setUploadModal({ show: true, pedido: p })} className="action-btn hover-orange-text hover-shadow" style={{background: '#f8fafc', color: '#64748b', padding: '6px', borderRadius: '6px'}} title="Substituir Documento"><Icons.Refresh size={16} /></button>
                          </div>
                      ) : (
                          <button onClick={() => setUploadModal({ show: true, pedido: p })} className="hover-shadow" style={{background: 'white', border: '1px dashed #cbd5e1', color: '#64748b', padding: '6px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s', display: 'flex', alignItems: 'center', gap: '6px', margin: '0 auto'}}>
                              <Icons.Paperclip size={14} /> Anexar
                          </button>
                      )}
                  </td>

                  <td style={{padding: '15px'}}>
                      {getStatusBadge(p.estado)}
                  </td>
                  
                  <td style={{padding: '15px', textAlign: 'right'}}>
                      <div style={{display:'flex', gap:'6px', justifyContent:'flex-end'}}>
                          {p.estado === 'pendente' && (
                              <>
                                  <button onClick={() => handleEditClick(p)} className="action-btn hover-blue-text" title="Editar Pedido"><Icons.Edit /></button>
                                  <button onClick={() => setConfirmCancel({ show: true, pedido: p })} className="action-btn hover-red-text" title="Cancelar Pedido"><Icons.Trash /></button>
                              </>
                          )}
                          {p.estado === 'aprovado' && (
                              <button onClick={() => setConfirmCancel({ show: true, pedido: p })} style={{background: 'white', border: '1px solid #fde68a', color: '#d97706', padding: '6px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s', display: 'flex', alignItems: 'center', gap: '6px'}} className="hover-shadow" title="Pedir Cancelamento aos RH">
                                  <Icons.Refresh size={14} /> Cancelar Aprovado
                              </button>
                          )}
                          {['rejeitado', 'cancelado', 'pedido_cancelamento'].includes(p.estado) && (
                              <span style={{fontSize: '0.8rem', color: '#cbd5e1'}}>- - -</span>
                          )}
                      </div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan="6" style={{textAlign: 'center', padding: '50px', color: '#94a3b8'}}>
                    <Icons.Calendar size={40} color="#cbd5e1" />
                    <p style={{marginTop: '10px', fontWeight: '500'}}>Ainda não fizeste nenhum pedido.</p>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE NOVO / EDITAR PEDIDO */}
      {showModal && (
        <ModalPortal>
            <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:99999}}>
                <div style={{background:'white', width:'95%', maxWidth:'650px', borderRadius:'16px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden', animation: 'fadeIn 0.2s ease-out'}}>
                    
                    <div style={{padding:'20px 25px', background:'#f8fafc', borderBottom:'1px solid #e2e8f0', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                        <h3 style={{margin:0, color:'#1e293b', fontSize:'1.25rem', fontWeight:'800', display: 'flex', alignItems: 'center', gap: '10px'}}>
                            <span style={{color: '#2563eb'}}><Icons.Calendar size={22} /></span>
                            {isEditing ? 'Editar Pedido de Ausência' : 'Novo Pedido de Ausência'}
                        </h3>
                        <button onClick={handleCloseModal} style={{background:'transparent', border:'none', cursor:'pointer', color:'#94a3b8'}} className="hover-red-text"><Icons.Close size={20} /></button>
                    </div>

                    <div style={{padding: '25px', overflowY: 'auto', maxHeight: '75vh'}}>
                        <form onSubmit={handleSubmit}>
                            
                            <div style={{marginBottom: '20px'}}>
                                <label style={labelStyle}>Motivo da Ausência *</label>
                                <select value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})} style={{...inputStyle, cursor: 'pointer'}} className="input-focus" required>
                                    <option value="Férias">Férias</option>
                                    <option value="Assistência à família">Assistência à família</option>
                                    <option value="Outros - Assuntos pessoais">Outros - Assuntos pessoais</option>
                                    <option value="Ausência sem motivo - injustificada">Ausência sem motivo - injustificada</option>
                                    <option value="Doença, acidente e obrigação legal">Doença, acidente e obrigação legal</option>
                                    <option value="Casamento">Casamento</option>
                                    <option value="Deslocação a estabelecimento de ensino">Deslocação a estabelecimento de ensino</option>
                                    <option value="Licença maternal/paternal">Licença maternal/paternal</option>
                                    <option value="Licença sem vencimento">Licença sem vencimento</option>
                                    <option value="Falecimento de familiar">Falecimento de familiar</option>
                                    <option value="Prestação de provas de avaliação">Prestação de provas de avaliação</option>
                                    <option value="Candidato a cargo público">Candidato a cargo público</option>
                                </select>
                            </div>
                            
                            <label style={{display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginBottom: '20px', color: '#1e40af', fontWeight: 'bold', fontSize: '0.9rem', background: '#eff6ff', padding: '15px', borderRadius: '10px', border: '1px solid #bfdbfe', transition: '0.2s'}}>
                                <input type="checkbox" checked={form.is_parcial} onChange={e => setForm({...form, is_parcial: e.target.checked, data_fim: e.target.checked ? form.data_inicio : form.data_fim})} style={{width: '18px', height: '18px', accentColor: '#2563eb'}} />
                                <Icons.Clock size={18} /> Ausência Parcial (Apenas algumas horas no próprio dia)
                            </label>

                            <div style={{background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '20px'}}>
                                {!form.is_parcial ? (
                                    <div style={{display: 'flex', gap: '20px'}}>
                                        <div style={{flex: 1}}>
                                            <label style={labelStyle}>Data Início *</label>
                                            <input type="date" value={form.data_inicio} onChange={e => setForm({...form, data_inicio: e.target.value})} style={inputStyle} className="input-focus" required />
                                        </div>
                                        <div style={{flex: 1}}>
                                            <label style={labelStyle}>Data Fim *</label>
                                            <input type="date" value={form.data_fim} onChange={e => setForm({...form, data_fim: e.target.value})} style={inputStyle} className="input-focus" required />
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{display: 'flex', gap: '15px'}}>
                                        <div style={{flex: 2}}>
                                            <label style={labelStyle}>Data da Ocorrência *</label>
                                            <input type="date" value={form.data_inicio} onChange={e => setForm({...form, data_inicio: e.target.value, data_fim: e.target.value})} style={inputStyle} className="input-focus" required />
                                        </div>
                                        <div style={{flex: 1}}>
                                            <label style={labelStyle}>Hora Saída *</label>
                                            <input type="time" value={form.hora_inicio} onChange={e => setForm({...form, hora_inicio: e.target.value})} style={inputStyle} className="input-focus" required />
                                        </div>
                                        <div style={{flex: 1}}>
                                            <label style={labelStyle}>Regresso</label>
                                            <input type="time" value={form.hora_fim} onChange={e => setForm({...form, hora_fim: e.target.value})} style={inputStyle} className="input-focus" />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {form.data_inicio && form.data_fim && !form.is_parcial && (
                                <div style={{background: diasUteis > 0 ? '#eff6ff' : '#fef2f2', color: diasUteis > 0 ? '#1e40af' : '#b91c1c', border: `1px solid ${diasUteis > 0 ? '#bfdbfe' : '#fecaca'}`, padding: '12px 15px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '500'}}>
                                    {diasUteis > 0 ? <Icons.Info size={18} /> : <Icons.AlertTriangle size={18} />}
                                    <span>{diasUteis > 0 ? (form.tipo === 'Férias' ? `Este pedido consumirá ${diasUteis} dia(s) útil(eis) do seu saldo de férias.` : `Este pedido corresponde a ${diasUteis} dia(s) útil(eis). Tratando-se de justificação legal, não desconta férias.`) : `Atenção: O período selecionado calha num fim de semana ou feriado. Não é necessário marcar.`}</span>
                                </div>
                            )}
                            
                            {form.data_inicio && form.is_parcial && (
                                <div style={{background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e40af', padding: '12px 15px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '500'}}>
                                    <Icons.Info size={18} /> <span>Ausência parcial de algumas horas. <b>Este registo não consome saldo de férias.</b></span>
                                </div>
                            )}

                            <div style={{marginBottom: '20px'}}>
                                <label style={labelStyle}>Notas / Observações</label>
                                <textarea rows="3" value={form.motivo} onChange={e => setForm({...form, motivo: e.target.value})} placeholder="Mais detalhes sobre o pedido (Opcional)..." style={{...inputStyle, resize: 'vertical'}} className="input-focus" />
                            </div>
                            
                            <div style={{marginBottom: '30px', background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px dashed #cbd5e1'}}>
                                <label style={{...labelStyle, display: 'flex', alignItems: 'center', gap: '8px'}}><Icons.Paperclip size={14} /> Anexar Documento (Opcional)</label>
                                <input type="file" accept=".pdf, image/*" onChange={e => setFile(e.target.files[0])} style={{width: '100%', padding: '10px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#475569', fontSize: '0.85rem', cursor: 'pointer'}} />
                                <div style={{fontSize: '0.75rem', color: '#94a3b8', marginTop: '6px'}}>Formatos aceites: PDF, JPG, PNG. (Máx 5MB)</div>
                            </div>
                            
                            <div style={{display: 'flex', gap: '15px', borderTop: '1px solid #e2e8f0', paddingTop: '20px'}}>
                                <button type="button" onClick={handleCloseModal} style={{flex: 1, padding: '14px', borderRadius: '10px', border: '1px solid #cbd5e1', background: 'white', color: '#64748b', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s'}} className="hover-shadow">Cancelar</button>
                                <button type="submit" disabled={isSubmitting || (!form.is_parcial && diasUteis === 0)} className="btn-primary hover-shadow" style={{flex: 2, padding: '14px', borderRadius: '10px', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: (!form.is_parcial && diasUteis === 0) ? 0.5 : 1}}>
                                    {isSubmitting ? "A Guardar..." : (isEditing ? <><Icons.Edit size={18}/> Guardar Alterações</> : <><Icons.Plus size={18}/> Submeter Pedido</>)}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </ModalPortal>
      )}

      {/* NOVO MODAL: ANEXAR DOCUMENTO LATER */}
      {uploadModal.show && (
          <ModalPortal>
              <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:99999}}>
                  <div style={{background:'white', padding:'30px', borderRadius:'16px', width:'90%', maxWidth: '450px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', animation: 'fadeIn 0.2s ease-out'}}>
                      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'15px'}}>
                          <h3 style={{margin: 0, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '10px'}}><Icons.Paperclip size={24} color="#2563eb" /> Anexar Documento</h3>
                          <button onClick={() => {setUploadModal({show: false, pedido: null}); setUploadFile(null);}} style={{background:'none', border:'none', cursor:'pointer', color:'#94a3b8'}} className="hover-red-text"><Icons.Close size={20} /></button>
                      </div>
                      
                      <div style={{background: '#f8fafc', padding: '15px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #e2e8f0'}}>
                          <p style={{margin: 0, color: '#475569', fontSize: '0.9rem', lineHeight: '1.5'}}>
                              Adiciona ou substitui o justificativo (atestado, declaração, etc) para a ausência de <strong style={{color: '#1e293b'}}>{formatDate(uploadModal.pedido?.data_inicio)}</strong>.
                          </p>
                      </div>

                      <form onSubmit={handleUploadOnly}>
                          <div style={{border: '2px dashed #cbd5e1', padding: '30px 20px', borderRadius: '12px', textAlign: 'center', marginBottom: '25px', background: '#fafafa'}}>
                              <input type="file" accept=".pdf, image/*" required onChange={e => setUploadFile(e.target.files[0])} style={{width:'100%', color: '#475569', cursor: 'pointer'}} />
                          </div>

                          <div style={{display: 'flex', gap: '10px'}}>
                              <button type="button" onClick={() => {setUploadModal({show: false, pedido: null}); setUploadFile(null);}} style={{flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', background: 'white', color: '#64748b', fontWeight: 'bold', cursor: 'pointer'}} className="hover-shadow">Cancelar</button>
                              <button type="submit" className="btn-primary hover-shadow" style={{flex: 2, padding: '12px', borderRadius: '10px', fontWeight: 'bold'}} disabled={isUploadingDoc}>
                                  {isUploadingDoc ? "A enviar..." : "Guardar Documento"}
                              </button>
                          </div>
                      </form>
                  </div>
              </div>
          </ModalPortal>
      )}

      {/* POP-UPS DE CONFIRMAÇÃO */}
      {confirmCancel.show && (
          <ModalPortal>
              <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:99999}}>
                  <div style={{background:'white', padding:'30px', borderRadius:'16px', width:'90%', maxWidth: '400px', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', animation: 'fadeIn 0.2s ease-out'}}>
                      <div style={{display: 'flex', justifyContent: 'center', marginBottom: '15px'}}><Icons.AlertTriangle size={48} color="#ef4444" /></div>
                      <h3 style={{margin: '0 0 10px 0', color: '#1e293b', fontSize: '1.25rem'}}>Cancelar Pedido</h3>
                      <p style={{color: '#64748b', marginBottom: '25px', lineHeight: '1.5', fontSize: '0.95rem'}}>
                          {confirmCancel.pedido?.estado === 'pendente' ? "Tem a certeza que deseja apagar este pedido pendente?" : "Como este pedido já foi aprovado, será enviado um pedido de cancelamento aos RH para que os seus dias sejam devolvidos. Confirma?"}
                      </p>
                      <div style={{display: 'flex', gap: '10px'}}>
                          <button onClick={() => setConfirmCancel({ show: false, pedido: null })} style={{flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', background: 'white', fontWeight: 'bold', color: '#475569', cursor: 'pointer', transition: '0.2s'}} className="hover-shadow">Voltar</button>
                          <button onClick={executarCancelamento} style={{flex: 1, padding: '12px', borderRadius: '10px', border: 'none', background: '#ef4444', color: 'white', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s'}} className="hover-shadow">Sim, Cancelar</button>
                      </div>
                  </div>
              </div>
          </ModalPortal>
      )}

      {/* NOTIFICAÇÃO GLOBAL */}
      {notification.show && (
          <ModalPortal>
              <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:99999}}>
                  <div style={{background:'white', padding:'30px', borderRadius:'16px', width:'90%', maxWidth: '350px', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', animation: 'fadeIn 0.2s ease-out'}}>
                      <div style={{display: 'flex', justifyContent: 'center', marginBottom: '15px'}}>
                          {notification.type === 'success' ? <Icons.CheckCircle size={48} color="#10b981" /> : <Icons.XCircle size={48} color="#ef4444" />}
                      </div>
                      <h3 style={{margin: '0 0 10px 0', color: '#1e293b', fontSize: '1.25rem'}}>{notification.type === 'success' ? 'Sucesso!' : 'Atenção'}</h3>
                      <p style={{color: '#64748b', marginBottom: '25px', lineHeight: '1.5', fontSize: '0.95rem'}}>{notification.message}</p>
                      <button onClick={() => setNotification({ show: false, message: '', type: 'success' })} className="btn-primary hover-shadow" style={{width: '100%', padding: '12px', borderRadius: '10px', fontWeight: 'bold'}}>Fechar</button>
                  </div>
              </div>
          </ModalPortal>
      )}

      <style>{`
        .table-row-hover:hover { background-color: #f8fafc !important; }
        .hover-shadow:hover { transform: translateY(-1px); box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
        .hover-orange-text:hover { color: #f97316 !important; opacity: 1 !important; }
        .hover-blue-text:hover { color: #3b82f6 !important; opacity: 1 !important; }
        .hover-red-text:hover { color: #ef4444 !important; opacity: 1 !important; }
        
        .input-focus:focus { border-color: #3b82f6 !important; box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1); }
        
        .action-btn { background: transparent; border: none; cursor: pointer; opacity: 0.5; transition: 0.2s; display: flex; align-items: center; justify-content: center; padding: 4px; }
        .action-btn:hover { opacity: 1; transform: scale(1.1); }

        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}