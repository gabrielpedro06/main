import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../services/supabase";
import "./../styles/dashboard.css";

// --- ÍCONES SVG PROFISSIONAIS ---
const Icons = {
  Search: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>,
  MapPin: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>,
  Building: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><path d="M9 22v-4h6v4"></path><path d="M8 6h.01"></path><path d="M16 6h.01"></path><path d="M12 6h.01"></path><path d="M12 10h.01"></path><path d="M12 14h.01"></path><path d="M16 10h.01"></path><path d="M16 14h.01"></path><path d="M8 10h.01"></path><path d="M8 14h.01"></path></svg>,
  Phone: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>,
  Mail: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>,
  User: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>,
  Eye: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>,
  Edit: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>,
  Rocket: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"></path><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"></path><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"></path><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"></path></svg>,
  Handshake: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path></svg>,
  Archive: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg>,
  Restore: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>,
  Download: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>,
  Upload: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>,
  Copy: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>,
  Close: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>,
  Alert: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>,
  Doc: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg> // <-- 💡 O ÍCONE QUE FALTAVA
};

const ModalPortal = ({ children }) => createPortal(children, document.body);

export default function GestaoLeads() {
  const [dataList, setDataList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("leads");
  const [viewMode, setViewMode] = useState("kanban"); 

  const [notification, setNotification] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ show: false, message: '', confirmText: '', onConfirm: null, isDanger: false });

  const [draggedItemId, setDraggedItemId] = useState(null);

  const [filterLocalidade, setFilterLocalidade] = useState("");
  const [filterSetor, setFilterSetor] = useState("");
  const [filterCae, setFilterCae] = useState(""); 
  const [searchTerm, setSearchTerm] = useState(""); 
  const [mostrarInativos, setMostrarInativos] = useState(false); 

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  const [showImportModal, setShowImportModal] = useState(false);
  const [modalForm, setModalForm] = useState({ show: false, isEdit: false, data: {} });
  
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importSetor, setImportSetor] = useState(""); 

  const initialForm = { nome: "", nif: "", localidade: "", contacto: "", email: "", titular: "", cae: "", setor: "", estado: "novo", ativo: true };

  // Emojis removidos dos labels
  const statusOptions = [
    { value: "novo", label: "Novo", color: "#3b82f6", bg: "#eff6ff", border: "#bfdbfe" },
    { value: "contactado", label: "Contactado", color: "#eab308", bg: "#fefce8", border: "#fef08a" },
    { value: "reuniao", label: "Reunião", color: "#a855f7", bg: "#faf5ff", border: "#e9d5ff" },
    { value: "proposta", label: "Proposta", color: "#f97316", bg: "#fff7ed", border: "#fed7aa" },
    { value: "convertido", label: "Ganho", color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0" },
    { value: "perdido", label: "Perdido", color: "#64748b", bg: "#f1f5f9", border: "#e2e8f0" },
  ];

  const setorOptions = ["Industria", "Saúde", "Tecnologia", "AudioVisual", "Turismo", "Comércio", "Serviços"];

  useEffect(() => {
    fetchData();
    setCurrentPage(1);
    if (activeTab === "leads" && viewMode === "grid") setViewMode("kanban");
    if (activeTab === "prospects" && viewMode === "kanban") setViewMode("grid");
  }, [activeTab]);

  const showToast = (message, type = 'success') => {
      setNotification({ message, type });
      setTimeout(() => setNotification(null), 3000);
  };

  async function fetchData() {
    setLoading(true);
    const tableName = activeTab === "leads" ? "marketing_leads" : "marketing_prospects";
    const { data, error } = await supabase.from(tableName).select("*").order("created_at", { ascending: false });
    if (!error) setDataList(data || []);
    setLoading(false);
  }

  async function updateStatus(id, newStatus) {
    const tableName = activeTab === "leads" ? "marketing_leads" : "marketing_prospects";
    setDataList(prev => prev.map(item => item.id === id ? { ...item, estado: newStatus } : item));
    await supabase.from(tableName).update({ estado: newStatus }).eq("id", id);
  }

  async function toggleAtivo(id, estadoAtual) {
      const novoEstado = !estadoAtual;
      const tableName = activeTab === "leads" ? "marketing_leads" : "marketing_prospects";
      setConfirmDialog({
          show: true,
          message: `Tem a certeza que deseja ${novoEstado ? 'reativar' : 'arquivar'} este registo?`,
          confirmText: novoEstado ? "Reativar" : "Arquivar",
          isDanger: !novoEstado,
          onConfirm: async () => {
              setConfirmDialog({ show: false });
              const { error } = await supabase.from(tableName).update({ ativo: novoEstado }).eq("id", id);
              if (!error) {
                  setDataList(prev => prev.map(item => item.id === id ? { ...item, ativo: novoEstado } : item));
                  showToast(`Registo ${novoEstado ? 'reativado' : 'arquivado'}.`);
              }
          }
      });
  }

  async function promoteToLead(prospect) {
    setConfirmDialog({
        show: true, message: `Promover "${prospect.nome}" para os Leads?`, confirmText: "Promover a Lead", isDanger: false,
        onConfirm: async () => {
            setConfirmDialog({ show: false });
            const { error } = await supabase.from("marketing_leads").insert([{
              nome: prospect.nome, nif: prospect.nif, localidade: prospect.localidade,
              email: prospect.email, contacto: prospect.contacto, titular: prospect.titular,
              setor: prospect.setor, cae: prospect.cae, estado: "novo", ativo: true
            }]);
            if (!error) {
                await supabase.from("marketing_prospects").update({ ativo: false }).eq("id", prospect.id); 
                setDataList(dataList.map(l => l.id === prospect.id ? {...l, ativo: false} : l));
                showToast("Promovido a Lead com sucesso!");
            } else showToast("Erro: " + error.message, "error");
        }
    });
  }

  async function promoteToClient(lead) {
      setConfirmDialog({
          show: true, message: `Promover "${lead.nome}" a Cliente Oficial no sistema?\nA Lead será transferida para a carteira de Clientes e arquivada.`, confirmText: "Tornar Cliente", isDanger: false,
          onConfirm: async () => {
              setConfirmDialog({ show: false });
              const { error } = await supabase.from("clientes").insert([{
                marca: lead.nome, entidade: lead.nome, nif: lead.nif, ativo: true
              }]);
              if (!error) {
                  await supabase.from("marketing_leads").update({ ativo: false, estado: 'convertido' }).eq("id", lead.id);
                  setDataList(dataList.map(l => l.id === lead.id ? {...l, ativo: false, estado: 'convertido'} : l));
                  showToast("Cliente criado e Lead arquivada!");
              } else showToast("Erro: NIF duplicado ou inválido nas regras de clientes.", "error");
          }
      });
  }

  function openForm(isEdit = false, data = null) {
      setModalForm({ show: true, isEdit, data: data ? { ...data } : { ...initialForm } });
  }

  async function handleSaveForm(e) {
      e.preventDefault();
      const tableName = activeTab === "leads" ? "marketing_leads" : "marketing_prospects";
      const payload = { ...modalForm.data };

      try {
          if (modalForm.isEdit) {
              const { error } = await supabase.from(tableName).update(payload).eq("id", payload.id);
              if (error) throw error;
              setDataList(prev => prev.map(item => item.id === payload.id ? payload : item));
              showToast("Dados atualizados com sucesso.");
          } else {
              const { data, error } = await supabase.from(tableName).insert([payload]).select().single();
              if (error) throw error;
              setDataList([data, ...dataList]);
              showToast("Registo criado com sucesso.");
          }
          setModalForm({ show: false, isEdit: false, data: {} });
      } catch (err) { showToast("Erro: " + err.message, "error"); }
  }

  const isDuplicateNif = modalForm.data.nif && dataList.some(d => d.nif === modalForm.data.nif && d.id !== modalForm.data.id);
  const isMissingCrucialData = modalForm.isEdit && (!modalForm.data.email && !modalForm.data.contacto);

  function exportToCSV() {
      if (filteredList.length === 0) return showToast("Nenhum dado para exportar.", "warning");
      const headers = ["Nome", "NIF", "Localidade", "Setor", "CAE", "Titular", "Email", "Contacto", "Estado"];
      const csvRows = [headers.join(",")];
      
      filteredList.forEach(item => {
          const row = [
              `"${item.nome || ''}"`, `"${item.nif || ''}"`, `"${item.localidade || ''}"`, `"${item.setor || ''}"`,
              `"${item.cae || ''}"`, `"${item.titular || ''}"`, `"${item.email || ''}"`, `"${item.contacto || ''}"`, `"${item.estado || ''}"`
          ];
          csvRows.push(row.join(","));
      });
      
      const blob = new Blob([csvRows.join("\n")], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Exportacao_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  }

  function copyAllEmails() {
      const emails = filteredList.map(item => item.email).filter(e => e && e.includes('@'));
      if (emails.length === 0) return showToast("Nenhum email válido encontrado.", "warning");
      const emailString = emails.join("; ");
      navigator.clipboard.writeText(emailString);
      showToast(`${emails.length} emails copiados!`);
  }

  // 💡 LÓGICA DE IMPORTAÇÃO CORRIGIDA: À prova de falhas com NIFs vazios!
  async function handleFileUpload(e) {
    e.preventDefault();
    if (!file) return showToast("Escolhe um ficheiro CSV primeiro.", "warning");
    setImporting(true);
    const tableName = activeTab === "leads" ? "marketing_leads" : "marketing_prospects";

    const reader = new FileReader();
    reader.onload = async ({ target }) => {
      try {
          const lines = target.result.split("\n");
          const rawData = [];
          const regexSplit = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;

          for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            const cols = line.split(regexSplit);
            const clean = (val) => val ? val.trim().replace(/^"|"$/g, '') : null;
            
            if (cols.length >= 2) {
              rawData.push({
                nome: clean(cols[0]) || "Sem Nome", 
                nif: clean(cols[1]), 
                localidade: clean(cols[2]),
                contacto: clean(cols[3]), 
                email: clean(cols[4]), 
                titular: clean(cols[5]),
                cae: clean(cols[6]), 
                setor: importSetor || null, 
                estado: "novo", 
                ativo: true
              });
            }
          }

          if (rawData.length > 0) {
            // Filtrar apenas NIFs que existam realmente (remover nulos e vazios)
            const nifsToCheck = rawData.map(item => item.nif).filter(nif => nif && nif.trim() !== "");
            
            let existingNifs = new Set();

            // Só fazemos a query ao Supabase se houver efetivamente NIFs para verificar!
            if (nifsToCheck.length > 0) {
                const { data: existingRecords, error: checkError } = await supabase
                    .from(tableName)
                    .select('nif')
                    .in('nif', nifsToCheck);
                    
                if (checkError) throw checkError;
                existingNifs = new Set(existingRecords?.map(r => r.nif) || []);
            }

            // Filtrar rawData para inserir APENAS os que não existem.
            // Se o item não tem NIF (é null ou ""), ele PASSA e é inserido (não é duplicado por NIF).
            const newRecords = rawData.filter(item => {
                if (!item.nif || item.nif.trim() === "") return true; 
                return !existingNifs.has(item.nif);
            });
            
            const duplicateCount = rawData.length - newRecords.length;

            if (newRecords.length > 0) {
                const { error } = await supabase.from(tableName).insert(newRecords);
                if (error) {
                    showToast("Erro ao gravar: " + error.message, "error");
                } else {
                    showToast(`${newRecords.length} importados. ${duplicateCount > 0 ? `(${duplicateCount} ignorados repetidos)` : ''}`);
                    setShowImportModal(false); 
                    fetchData();
                }
            } else {
                showToast("Todos os registos do CSV já existem no sistema.", "warning");
            }
          } else {
            showToast("O ficheiro CSV parece estar vazio.", "warning");
          }
      } catch (err) {
          showToast("Erro inesperado a ler o ficheiro: " + err.message, "error");
      } finally {
          setImporting(false); 
          setFile(null);
      }
    };
    reader.readAsText(file);
  }

  const filteredList = dataList.filter((item) => {
    if (!mostrarInativos && item.ativo === false) return false;
    const matchLocalidade = filterLocalidade ? item.localidade?.toLowerCase().includes(filterLocalidade.toLowerCase()) : true;
    const matchSetor = filterSetor ? item.setor === filterSetor : true;
    const matchCae = filterCae ? item.cae?.toLowerCase().includes(filterCae.toLowerCase()) : true;
    const matchSearch = searchTerm ? item.nome?.toLowerCase().includes(searchTerm.toLowerCase()) || item.nif?.includes(searchTerm) : true;
    return matchLocalidade && matchSetor && matchCae && matchSearch;
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredList.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredList.length / itemsPerPage);

  const inputStyle = { padding: '10px 15px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', color: '#334155' };
  const labelStyle = { display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' };

  const CardActions = ({ item, isInactive, isMissingData }) => (
    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '15px', borderTop: '1px solid #f1f5f9'}}>
        <button onClick={() => openForm(true, item)} title="Ver Dados Completos" style={{background: '#f8fafc', border: '1px solid #cbd5e1', color: '#475569', width: '30px', height: '30px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '0.2s', position: 'relative'}} className="hover-shadow">
            <Icons.Eye />
            {isMissingData && <span style={{position: 'absolute', top: '-4px', right: '-4px', width: '8px', height: '8px', background: '#ef4444', borderRadius: '50%', border: '2px solid white'}}></span>}
        </button>

        <div style={{display: 'flex', gap: '6px'}}>
            <button onClick={() => openForm(true, item)} title="Editar" className="action-btn hover-orange-text"><Icons.Edit /></button>
            
            {!isInactive && activeTab === "prospects" && (
                <button onClick={() => promoteToLead(item)} title="Promover a Lead" className="action-btn hover-blue-text"><Icons.Rocket /></button>
            )}
            {!isInactive && activeTab === "leads" && item.estado === 'convertido' && (
                <button onClick={() => promoteToClient(item)} title="Tornar Cliente Oficial" className="action-btn hover-green-text"><Icons.Handshake /></button>
            )}

            <button onClick={() => toggleAtivo(item.id, item.ativo)} title={isInactive ? "Restaurar" : "Arquivar"} className={`action-btn ${isInactive ? "hover-green-text" : "hover-red-text"}`}>
                {isInactive ? <Icons.Restore /> : <Icons.Archive />}
            </button>
        </div>
    </div>
  );

  return (
    <div className="page-container" style={{maxWidth: '100%', margin: '0 auto', paddingBottom: '50px'}}>
      
      {/* HEADER */}
      <div className="card" style={{ marginBottom: 20, padding: '25px', display: "flex", justifyContent: "space-between", alignItems: 'center', flexWrap: 'wrap', gap: '15px', background: 'white', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        <div>
          <h1 style={{fontSize: '1.8rem', color: '#0f172a', margin: '0 0 5px 0', fontWeight: '900', letterSpacing: '-0.02em'}}>Marketing Hub</h1>
          <p style={{color: '#64748b', margin: 0, fontWeight: '500'}}>Gestão de {activeTab === 'leads' ? 'Leads Comerciais' : 'Prospects'}</p>
        </div>
        <div style={{display: 'flex', gap: '10px', flexWrap: 'wrap'}}>
            <button className="btn-outline hover-shadow" onClick={copyAllEmails}><Icons.Copy /> Copiar Emails</button>
            <button className="btn-outline hover-shadow" onClick={exportToCSV}><Icons.Upload /> Exportar CSV</button>
            <button className="btn-outline hover-shadow" onClick={() => setShowImportModal(true)}><Icons.Download /> Importar</button>
            <button className="btn-primary hover-shadow" onClick={() => openForm(false)} style={{fontWeight: 'bold'}}>Novo {activeTab === 'leads' ? 'Lead' : 'Prospect'}</button>
        </div>
      </div>

      {/* TABS */}
      <div style={{display:'flex', gap:'5px', paddingLeft: '10px'}}>
          <button onClick={() => {setActiveTab("leads"); setViewMode('kanban'); setCurrentPage(1);}} style={{padding: '12px 25px', background: activeTab === 'leads' ? 'white' : '#e2e8f0', color: activeTab === 'leads' ? '#2563eb' : '#64748b', border: 'none', borderRadius: '12px 12px 0 0', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s', display:'flex', alignItems:'center', gap:'8px'}}><Icons.Rocket /> Leads</button>
          <button onClick={() => {setActiveTab("prospects"); setViewMode('table'); setCurrentPage(1);}} style={{padding: '12px 25px', background: activeTab === 'prospects' ? 'white' : '#e2e8f0', color: activeTab === 'prospects' ? '#2563eb' : '#64748b', border: 'none', borderRadius: '12px 12px 0 0', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s', display:'flex', alignItems:'center', gap:'8px'}}><Icons.Building /> Prospects</button>
      </div>

      <div className="card" style={{ padding: '20px', borderRadius: '0 12px 12px 12px', background: viewMode === 'kanban' ? 'transparent' : 'white', border: viewMode === 'kanban' ? 'none' : '1px solid #e2e8f0', boxShadow: viewMode === 'kanban' ? 'none' : '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        
        {/* FILTROS E ALTERNADOR DE VISTA */}
        <div style={{ display: "flex", flexWrap: 'wrap', gap: 15, marginBottom: 20, paddingBottom: 20, borderBottom: viewMode === 'kanban' ? 'none' : '1px solid #f1f5f9', alignItems: 'center', background: viewMode==='kanban' ? 'white' : 'transparent', padding: viewMode==='kanban' ? '20px' : '0', borderRadius: viewMode==='kanban' ? '12px' : '0', border: viewMode==='kanban' ? '1px solid #e2e8f0' : 'none' }}>
          <div style={{flex: 1, minWidth: '250px', position: 'relative'}}>
            <span style={{position: 'absolute', left: '12px', top: '12px', color: '#94a3b8'}}><Icons.Search /></span>
            <input placeholder="Pesquisar empresa ou NIF..." value={searchTerm} onChange={e => {setSearchTerm(e.target.value); setCurrentPage(1);}} style={{...inputStyle, width: '100%', paddingLeft: '38px'}} />
          </div>
          <input placeholder="Localidade..." value={filterLocalidade} onChange={(e) => {setFilterLocalidade(e.target.value); setCurrentPage(1);}} style={{...inputStyle, width: '150px'}} />
          <input placeholder="CAE..." value={filterCae} onChange={(e) => {setFilterCae(e.target.value); setCurrentPage(1);}} style={{...inputStyle, width: '100px'}} />
          <select value={filterSetor} onChange={(e) => {setFilterSetor(e.target.value); setCurrentPage(1);}} style={{...inputStyle, background: 'white', width: '160px', cursor:'pointer'}}>
            <option value="">Setor...</option>
            {setorOptions.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <label style={{display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold', color: '#475569', background: '#f8fafc', padding: '10px 15px', borderRadius: '8px', border: '1px solid #e2e8f0'}}>
              <input type="checkbox" checked={mostrarInativos} onChange={e => {setMostrarInativos(e.target.checked); setCurrentPage(1);}} style={{accentColor:'#1e293b', width:'14px', height:'14px'}} /> Arquivo
          </label>
          
          <div style={{display: 'flex', background: '#f1f5f9', borderRadius: '8px', padding: '4px', border: '1px solid #e2e8f0', marginLeft: 'auto'}}>
              <button onClick={() => setViewMode("table")} style={{padding: '6px 12px', borderRadius: '6px', border: 'none', background: viewMode === "table" ? 'white' : 'transparent', color: viewMode === "table" ? '#2563eb' : '#64748b', boxShadow: viewMode === "table" ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', cursor: 'pointer', transition: '0.2s', fontWeight: 'bold'}}>
                  Lista
              </button>
              {activeTab === 'prospects' ? (
                  <button onClick={() => setViewMode("grid")} style={{padding: '6px 12px', borderRadius: '6px', border: 'none', background: viewMode === "grid" ? 'white' : 'transparent', color: viewMode === "grid" ? '#2563eb' : '#64748b', boxShadow: viewMode === "grid" ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', cursor: 'pointer', transition: '0.2s', fontWeight: 'bold'}}>
                      Cartões
                  </button>
              ) : (
                  <button onClick={() => setViewMode("kanban")} style={{padding: '6px 12px', borderRadius: '6px', border: 'none', background: viewMode === "kanban" ? 'white' : 'transparent', color: viewMode === "kanban" ? '#2563eb' : '#64748b', boxShadow: viewMode === "kanban" ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', cursor: 'pointer', transition: '0.2s', fontWeight: 'bold'}}>
                      Cartões
                  </button>
              )}
          </div>
        </div>

        {/* 💡 VISTA 1: KANBAN BOARD */}
        {viewMode === "kanban" && activeTab === "leads" && (
            <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '20px', minHeight: '600px', alignItems: 'flex-start' }} className="custom-scrollbar">
                {statusOptions.map(col => {
                    const colItems = filteredList.filter(item => item.estado === col.value); 
                    
                    return (
                        <div 
                            key={col.value}
                            onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.background = col.bg; }}
                            onDragLeave={(e) => { e.currentTarget.style.background = '#f8fafc'; }}
                            onDrop={(e) => {
                                e.preventDefault();
                                e.currentTarget.style.background = '#f8fafc';
                                if (draggedItemId) {
                                    updateStatus(draggedItemId, col.value);
                                    setDraggedItemId(null);
                                }
                            }}
                            style={{ flex: 1, minWidth: '220px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', transition: 'background 0.2s', overflow: 'hidden' }}
                        >
                            <div style={{ padding: '12px 15px', borderBottom: `2px solid ${col.color}`, background: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h4 style={{ margin: 0, color: col.color, fontSize: '0.85rem', fontWeight: '800', textTransform: 'uppercase' }}>
                                    {col.label}
                                </h4>
                                <span style={{background: col.bg, color: col.color, padding: '2px 6px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 'bold', border: `1px solid ${col.border}`}}>{colItems.length}</span>
                            </div>
                            
                            <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, overflowY: 'auto', maxHeight: '70vh' }} className="custom-scrollbar hide-scrollbar-kanban">
                                {colItems.map(item => {
                                    const isInactive = item.ativo === false;
                                    const isMissingData = !item.email && !item.contacto;
                                    
                                    return (
                                    <div
                                        key={item.id}
                                        draggable={!isInactive}
                                        onDragStart={() => setDraggedItemId(item.id)}
                                        onDragEnd={() => setDraggedItemId(null)}
                                        style={{ 
                                            background: isInactive ? '#f1f5f9' : 'white', padding: '12px', borderRadius: '8px', 
                                            border: '1px solid #cbd5e1', cursor: isInactive ? 'default' : 'grab', opacity: draggedItemId === item.id ? 0.4 : (isInactive ? 0.6 : 1), 
                                            boxShadow: draggedItemId === item.id ? 'none' : '0 2px 4px rgba(0,0,0,0.04)',
                                            transition: 'transform 0.1s', position: 'relative'
                                        }}
                                        className={isInactive ? "" : "hover-shadow-kanban drag-item"}
                                    >
                                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px'}}>
                                            <strong style={{color: '#1e293b', fontSize: '0.9rem', lineHeight: '1.2'}}>{item.nome}</strong>
                                            <button onClick={() => openForm(true, item)} style={{background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '0 0 0 5px'}} className="hover-blue-text"><Icons.Edit/></button>
                                        </div>
                                        
                                        <div style={{fontSize: '0.7rem', color: '#64748b', display: 'flex', flexDirection: 'column', gap: '4px'}}>
                                            {item.localidade && <span style={{display:'flex', alignItems:'center', gap:'4px'}}><Icons.MapPin/> {item.localidade}</span>}
                                            {item.setor && <span style={{display:'flex', alignItems:'center', gap:'4px'}}><Icons.Building/> {item.setor}</span>}
                                            {item.contacto && <span style={{display:'flex', alignItems:'center', gap:'4px'}}><Icons.Phone/> {item.contacto}</span>}
                                            {isMissingData && <span style={{color: '#b45309', background: '#fef3c7', padding: '2px 4px', borderRadius: '4px', width: 'fit-content', fontWeight: 'bold', display:'flex', alignItems:'center', gap:'4px'}}><Icons.Alert/> Faltam Contactos</span>}
                                        </div>

                                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #f1f5f9'}}>
                                            <span style={{fontFamily: 'monospace', fontSize: '0.65rem', background: '#f8fafc', padding: '2px 6px', borderRadius: '4px', color: '#94a3b8'}}>{item.nif || 'S/ NIF'}</span>
                                            
                                            {item.estado === 'convertido' && !isInactive && (
                                                <button onClick={() => promoteToClient(item)} title="Criar Cliente Oficial" style={{background: '#dcfce7', color: '#16a34a', border: '1px solid #bbf7d0', padding: '4px 6px', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 'bold', cursor: 'pointer', display:'flex', alignItems:'center', gap:'4px'}}><Icons.Rocket /> Cliente</button>
                                            )}
                                        </div>
                                    </div>
                                )})}
                                {colItems.length === 0 && <div style={{textAlign: 'center', padding: '15px', color: '#cbd5e1', fontSize: '0.75rem', fontStyle: 'italic', border: '1px dashed #e2e8f0', borderRadius: '8px'}}>Larga aqui...</div>}
                            </div>
                        </div>
                    )
                })}
            </div>
        )}

        {/* 💡 VISTA 2: GRID DE CARTÕES */}
        {viewMode === "grid" && (
            <div className="leads-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '15px' }}>
                {currentItems.map((item) => {
                    const isInactive = item.ativo === false;
                    const isMissingData = !item.email && !item.contacto;
                    const statusObj = statusOptions.find(o => o.value === item.estado) || {};

                    return (
                        <div key={item.id} className="lead-card hover-shadow" style={{background: isInactive ? '#f8fafc' : 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '15px', display: 'flex', flexDirection: 'column', opacity: isInactive ? 0.6 : 1, transition: 'all 0.2s', borderTop: `4px solid ${activeTab === 'leads' ? statusObj.color : '#cbd5e1'}`}}>
                            
                            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px'}}>
                                <div style={{display: 'flex', gap: '6px', alignItems: 'center'}}>
                                    {item.nif && <span style={{fontFamily: 'monospace', fontSize: '0.7rem', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', color: '#64748b'}}>{item.nif}</span>}
                                    {isInactive && <span style={{fontSize: '0.65rem', background: '#fee2e2', color: '#ef4444', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold'}}>ARQUIVADO</span>}
                                </div>
                                {activeTab === "leads" && (
                                    <span style={{fontSize: '0.65rem', background: statusObj.bg, color: statusObj.color, padding: '2px 8px', borderRadius: '12px', fontWeight: '800', textTransform: 'uppercase'}}>{statusObj.label}</span>
                                )}
                            </div>

                            <h3 style={{margin: '0 0 8px 0', fontSize: '1.1rem', color: '#1e293b', fontWeight: '800', lineHeight: '1.2'}}>{item.nome}</h3>
                            
                            <div style={{display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '15px', flex: 1}}>
                                <div style={{fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px'}}><Icons.MapPin/> {item.localidade || 'Sem Localidade'}</div>
                                <div style={{display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center'}}>
                                    {item.setor && <span style={{fontSize: '0.7rem', background: '#eff6ff', color: '#2563eb', padding: '2px 6px', borderRadius: '8px', fontWeight: 'bold', border: '1px solid #bfdbfe'}}>{item.setor}</span>}
                                    {item.cae && <span style={{fontSize: '0.7rem', color: '#64748b', fontWeight: '600'}}>CAE: {item.cae}</span>}
                                </div>
                            </div>

                            <CardActions item={item} isInactive={isInactive} isMissingData={isMissingData} />
                        </div>
                    );
                })}
            </div>
        )}

        {/* 💡 VISTA 3: TABELA CLÁSSICA */}
        {viewMode === "table" && (
            <div className="table-responsive" style={{overflowX: 'auto'}}>
                <table className="data-table" style={{ width: "100%", borderCollapse: 'collapse', minWidth: '900px' }}>
                <thead>
                    <tr style={{color: '#64748b', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', borderBottom: '2px solid #f1f5f9'}}>
                        <th style={{padding: '15px', textAlign: 'left', width: '30%'}}>Empresa / Local</th>
                        <th style={{padding: '15px', textAlign: 'left', width: '25%'}}>Contactos</th>
                        <th style={{padding: '15px', textAlign: 'left', width: '15%'}}>Setor & CAE</th>
                        {activeTab === "leads" && <th style={{padding: '15px', textAlign: 'left', width: '15%'}}>Estado</th>}
                        <th style={{padding: '15px', textAlign: 'right', width: '15%'}}>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    {currentItems.map((item) => {
                        const isInactive = item.ativo === false;
                        const isMissingData = !item.email && !item.contacto;

                        return (
                        <tr key={item.id} style={{borderBottom: '1px solid #f8fafc', opacity: isInactive ? 0.6 : 1, background: isInactive ? '#f8fafc' : 'white', transition: '0.2s'}} className={!isInactive ? "table-row-hover" : ""}>
                            <td style={{padding: '15px'}}>
                                <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                                    <span style={{fontWeight: '800', color: isInactive ? '#94a3b8' : '#1e293b', fontSize: '0.95rem'}}>{item.nome}</span>
                                    {isInactive && <span style={{fontSize: '0.6rem', background: '#fee2e2', color: '#ef4444', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold'}}>ARQUIVADO</span>}
                                </div>
                                <div style={{display: 'flex', gap: '10px', fontSize: '0.8rem', color: '#64748b', marginTop: '4px', alignItems: 'center'}}>
                                    {item.nif && <span style={{background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace', fontWeight: 'bold'}}>{item.nif}</span>}
                                    {item.localidade && <span style={{display:'flex', alignItems:'center', gap:'4px'}}><Icons.MapPin/> {item.localidade}</span>}
                                </div>
                            </td>

                            <td style={{padding: '15px'}}>
                                <div style={{display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.85rem'}}>
                                    {item.titular && <span style={{fontWeight: '600', color: '#475569', display:'flex', alignItems:'center', gap:'4px'}}><Icons.User/> {item.titular}</span>}
                                    {item.contacto && <span style={{display:'flex', alignItems:'center', gap:'4px'}}><Icons.Phone/> {item.contacto}</span>}
                                    {item.email && <span style={{color: '#2563eb', display:'flex', alignItems:'center', gap:'4px'}}><Icons.Mail/> <a href={`mailto:${item.email}`} style={{color: 'inherit', textDecoration: 'none'}}>{item.email}</a></span>}
                                    {isMissingData && <span style={{fontSize: '0.7rem', color: '#b45309', background: '#fef3c7', padding: '2px 6px', borderRadius: '4px', alignSelf: 'flex-start', fontWeight: 'bold', display:'flex', alignItems:'center', gap:'4px'}}><Icons.Alert/> Faltam Contactos</span>}
                                </div>
                            </td>

                            <td style={{padding: '15px'}}>
                                <div style={{display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-start'}}>
                                    {item.setor ? <span style={{fontSize: '0.7rem', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold'}}>{item.setor}</span> : <span style={{color: '#cbd5e1'}}>-</span>}
                                    {item.cae && <span style={{fontSize: '0.7rem', color: '#64748b', fontWeight: '600'}}>CAE: {item.cae}</span>}
                                </div>
                            </td>

                            {activeTab === "leads" && (
                            <td style={{padding: '15px'}}>
                                <select
                                    value={item.estado}
                                    onChange={(e) => updateStatus(item.id, e.target.value)}
                                    disabled={isInactive}
                                    style={{
                                        padding: '6px 12px', borderRadius: '8px', border: '1px solid transparent', fontSize: '0.8rem', fontWeight: 'bold', cursor: isInactive ? 'not-allowed' : 'pointer',
                                        background: statusOptions.find(o => o.value === item.estado)?.bg || '#f1f5f9',
                                        color: statusOptions.find(o => o.value === item.estado)?.color || '#64748b',
                                    }}
                                >
                                {statusOptions.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                                </select>
                            </td>
                            )}

                            <td style={{padding: '15px', textAlign: 'right'}}>
                                <div style={{display: 'flex', justifyContent: 'flex-end', gap: '6px'}}>
                                    <button onClick={() => openForm(true, item)} title="Ver / Completar Dados" style={{background: 'white', border: '1px solid #cbd5e1', color: '#475569', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '0.2s', position: 'relative'}} className="hover-shadow">
                                        <Icons.Eye />
                                        {isMissingData && <span style={{position: 'absolute', top: '-4px', right: '-4px', width: '10px', height: '10px', background: '#ef4444', borderRadius: '50%', border: '2px solid white'}}></span>}
                                    </button>

                                    {!isInactive && activeTab === "prospects" && (
                                        <button onClick={() => promoteToLead(item)} title="Mover para Leads" style={{background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '0.2s'}} className="hover-shadow"><Icons.Rocket /></button>
                                    )}
                                    {!isInactive && activeTab === "leads" && item.estado === 'convertido' && (
                                        <button onClick={() => promoteToClient(item)} title="Criar Cliente Oficial" style={{background: '#dcfce7', color: '#16a34a', border: '1px solid #bbf7d0', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '0.2s'}} className="hover-shadow"><Icons.Rocket /></button>
                                    )}

                                    <button onClick={() => toggleAtivo(item.id, item.ativo)} title={isInactive ? "Restaurar" : "Arquivar"} style={{background: isInactive ? '#dcfce7' : '#fee2e2', color: isInactive ? '#16a34a' : '#ef4444', border: 'none', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '0.2s'}} className="hover-shadow">
                                        {isInactive ? <Icons.Restore /> : <Icons.Archive />}
                                    </button>
                                </div>
                            </td>
                        </tr>
                    )})}
                </tbody>
                </table>
            </div>
        )}
        
        {/* MENSAGEM VAZIA */}
        {filteredList.length === 0 && viewMode !== "kanban" && (
            <div style={{textAlign: 'center', padding: '60px', color: '#94a3b8'}}>
                <span style={{display: 'block', marginBottom: '10px', opacity: 0.5}}><Icons.Search /></span>
                <p style={{margin: 0, fontWeight: '500'}}>Nenhum registo encontrado com estes filtros.</p>
            </div>
        )}

        {/* CONTROLOS DE PAGINAÇÃO */}
        {totalPages > 1 && viewMode !== "kanban" && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #e2e8f0', flexWrap: 'wrap', gap: '15px' }}>
                <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                    <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Mostrar:</span>
                    <select value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} style={{ padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', background: 'white', fontSize: '0.85rem' }}>
                        <option value={10}>10</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                    </select>
                </div>
                
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)} className="btn-small" style={{ opacity: currentPage === 1 ? 0.5 : 1, cursor: currentPage === 1 ? 'not-allowed' : 'pointer', background: 'white', border: '1px solid #cbd5e1' }}>◀ Ant</button>
                    <span style={{ fontSize: '0.85rem', color: '#334155', fontWeight: 'bold' }}>Pág {currentPage} de {totalPages}</span>
                    <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => prev + 1)} className="btn-small" style={{ opacity: currentPage === totalPages ? 0.5 : 1, cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', background: 'white', border: '1px solid #cbd5e1' }}>Seg ▶</button>
                </div>
            </div>
        )}
      </div>

      {/* --- MODAL FORMULÁRIO (CRIAR / COMPLETAR DADOS) --- */}
      {modalForm.show && (
          <ModalPortal>
              <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999}}>
                  <div style={{background: 'white', width: '95%', maxWidth: '700px', borderRadius: '16px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden'}}>
                      <div style={{padding: '20px 25px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                          <h3 style={{margin: 0, color: '#0f172a', fontSize: '1.25rem', fontWeight: '800'}}>
                              {modalForm.isEdit ? `Completar Dados: ${modalForm.data.nome}` : `Novo Registo (${activeTab === 'leads' ? 'Lead' : 'Prospect'})`}
                          </h3>
                          <button onClick={() => setModalForm({show: false, isEdit: false, data: {}})} style={{background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer'}}><Icons.Close /></button>
                      </div>

                      <form onSubmit={handleSaveForm} style={{padding: '25px'}}>
                          {isMissingCrucialData && (
                              <div style={{background: '#fffbeb', border: '1px solid #fde68a', color: '#b45309', padding: '12px 15px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.85rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px'}}>
                                  <Icons.Alert /> Este registo não tem dados de contacto.
                              </div>
                          )}

                          <div style={{display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '15px'}}>
                              <div>
                                  <label style={labelStyle}>Nome da Empresa *</label>
                                  <input type="text" value={modalForm.data.nome || ''} onChange={e => setModalForm({...modalForm, data: {...modalForm.data, nome: e.target.value}})} required style={{...inputStyle, width: '100%', fontWeight: 'bold'}} />
                              </div>
                              <div>
                                  <label style={labelStyle}>NIF</label>
                                  <input type="text" value={modalForm.data.nif || ''} onChange={e => setModalForm({...modalForm, data: {...modalForm.data, nif: e.target.value}})} maxLength="9" style={{...inputStyle, width: '100%', borderColor: isDuplicateNif ? '#ef4444' : '#cbd5e1', background: isDuplicateNif ? '#fef2f2' : 'white'}} placeholder="Ex: 500000000" />
                                  {isDuplicateNif && <span style={{fontSize: '0.7rem', color: '#ef4444', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px'}}><Icons.Alert /> NIF já existe!</span>}
                              </div>
                          </div>

                          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '15px'}}>
                              <div><label style={labelStyle}>Localidade</label><input type="text" value={modalForm.data.localidade || ''} onChange={e => setModalForm({...modalForm, data: {...modalForm.data, localidade: e.target.value}})} style={{...inputStyle, width: '100%'}} /></div>
                              <div>
                                  <label style={labelStyle}>Setor</label>
                                  <select value={modalForm.data.setor || ''} onChange={e => setModalForm({...modalForm, data: {...modalForm.data, setor: e.target.value}})} style={{...inputStyle, width: '100%', background: 'white'}}>
                                      <option value="">-- Selecione --</option>
                                      {setorOptions.map(s => <option key={s} value={s}>{s}</option>)}
                                  </select>
                              </div>
                              <div><label style={labelStyle}>Código CAE</label><input type="text" value={modalForm.data.cae || ''} onChange={e => setModalForm({...modalForm, data: {...modalForm.data, cae: e.target.value}})} style={{...inputStyle, width: '100%'}} /></div>
                          </div>

                          <div style={{background: '#f8fafc', padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '25px'}}>
                              <h4 style={{margin: '0 0 10px 0', fontSize: '0.9rem', color: '#1e293b'}}>Informação de Contacto</h4>
                              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px'}}>
                                  <div style={{gridColumn: '1 / -1'}}><label style={labelStyle}>Pessoa Titular / Responsável</label><input type="text" value={modalForm.data.titular || ''} onChange={e => setModalForm({...modalForm, data: {...modalForm.data, titular: e.target.value}})} style={{...inputStyle, width: '100%'}} placeholder="Nome da pessoa..." /></div>
                                  <div><label style={labelStyle}>Email</label><input type="email" value={modalForm.data.email || ''} onChange={e => setModalForm({...modalForm, data: {...modalForm.data, email: e.target.value}})} style={{...inputStyle, width: '100%'}} /></div>
                                  <div><label style={labelStyle}>Telefone / Telemóvel</label><input type="text" value={modalForm.data.contacto || ''} onChange={e => setModalForm({...modalForm, data: {...modalForm.data, contacto: e.target.value}})} style={{...inputStyle, width: '100%'}} /></div>
                              </div>
                          </div>

                          <div style={{display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '15px', borderTop: '1px solid #f1f5f9'}}>
                              <button type="button" onClick={() => setModalForm({show: false, isEdit: false, data: {}})} style={{padding: '12px 20px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', color: '#64748b', fontWeight: 'bold', cursor: 'pointer'}}>Cancelar</button>
                              <button type="submit" disabled={isDuplicateNif && !modalForm.isEdit} className="btn-primary" style={{padding: '12px 30px', borderRadius: '8px', fontSize: '0.95rem'}}>{modalForm.isEdit ? 'Guardar Alterações' : 'Adicionar Registo'}</button>
                          </div>
                      </form>
                  </div>
              </div>
          </ModalPortal>
      )}

      {/* --- MODAL DE IMPORTAÇÃO CSV --- */}
      {showImportModal && (
        <ModalPortal>
            <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999}}>
                <div style={{background: 'white', width: '90%', maxWidth: '500px', borderRadius: '16px', padding: '30px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'}}>
                    <div style={{marginBottom: '20px'}}>
                        <h3 style={{margin: 0, color: '#1e293b', fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px'}}><Icons.Download /> Importar CSV</h3>
                        <p style={{margin: '5px 0 0 0', color: '#64748b', fontSize: '0.9rem'}}>Destino: <b>{activeTab === 'leads' ? 'Leads' : 'Prospects'}</b></p>
                    </div>

                    <div style={{background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '15px', marginBottom: '25px'}}>
                        <p style={{margin: 0, fontSize: '0.85rem', color: '#1e40af', lineHeight: '1.5'}}>
                            <strong>Colunas Obrigatórias (nesta ordem exata):</strong><br/>
                            Nome, NIF, Localidade, Contacto, Email, Titular, CAE
                        </p>
                    </div>

                    <div style={{marginBottom: '20px'}}>
                        <label style={labelStyle}>Atribuir Setor em Lote (Opcional)</label>
                        <select value={importSetor} onChange={(e) => setImportSetor(e.target.value)} style={{...inputStyle, background: 'white', width: '100%'}}>
                            <option value="">-- Deixar em branco --</option>
                            {setorOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>

                    <div style={{marginBottom: '25px'}}>
                        <label 
                            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '30px', border: '2px dashed #cbd5e1', borderRadius: '12px', cursor: 'pointer', background: '#f8fafc', transition: 'all 0.2s' }}
                            onMouseOver={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
                            onMouseOut={(e) => e.currentTarget.style.borderColor = '#cbd5e1'}
                        >
                            <span style={{marginBottom: '10px', color: '#94a3b8'}}><Icons.Doc /></span>
                            <span style={{fontSize: '0.9rem', color: '#64748b', fontWeight: '500', textAlign: 'center'}}>
                                {file ? file.name : "Clica aqui para escolher o ficheiro CSV"}
                            </span>
                            <input type="file" accept=".csv" onChange={(e) => setFile(e.target.files[0])} style={{display: 'none'}} />
                        </label>
                    </div>

                    <div style={{display: 'flex', gap: '10px'}}>
                        <button onClick={() => setShowImportModal(false)} style={{flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', color: '#64748b', fontWeight: 'bold', cursor: 'pointer'}}>Cancelar</button>
                        <button className="btn-primary" onClick={handleFileUpload} disabled={importing} style={{flex: 1, borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px'}}>
                            {importing ? "A processar..." : "Carregar Dados"}
                        </button>
                    </div>
                </div>
            </div>
        </ModalPortal>
      )}

      {/* --- MODAL CONFIRMAÇÃO GLOBAL --- */}
      {confirmDialog.show && (
          <ModalPortal>
              <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999}}>
                  <div style={{background: 'white', padding: '30px', borderRadius: '16px', width: '90%', maxWidth: '400px', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', animation: 'fadeIn 0.2s ease-out'}}>
                      <div style={{display: 'flex', justifyContent: 'center', marginBottom: '15px'}}><Icons.Alert /></div>
                      <h3 style={{margin: '0 0 10px 0', color: '#1e293b', fontSize: '1.25rem'}}>Confirmação</h3>
                      <p style={{color: '#64748b', fontSize: '0.95rem', marginBottom: '25px', lineHeight: '1.5', whiteSpace: 'pre-line'}}>{confirmDialog.message}</p>
                      <div style={{display: 'flex', gap: '10px'}}>
                          <button onClick={() => setConfirmDialog({show: false})} style={{flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', background: 'white', color: '#475569', fontWeight: 'bold', cursor: 'pointer'}} className="hover-shadow">Cancelar</button>
                          <button onClick={confirmDialog.onConfirm} style={{flex: 1, padding: '12px', borderRadius: '10px', border: 'none', background: confirmDialog.isDanger ? '#ef4444' : '#2563eb', color: 'white', fontWeight: 'bold', cursor: 'pointer'}} className="hover-shadow">{confirmDialog.confirmText}</button>
                      </div>
                  </div>
              </div>
          </ModalPortal>
      )}

      {notification && <div className={`toast-container ${notification.type}`}>{notification.type === 'success' ? '✅' : '⚠️'} {notification.message}</div>}

      <style>{`
        .table-row-hover:hover { background-color: #f8faf     c !important; }
        .hover-shadow:hover { transform: translateY(-1px); box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
        .hover-orange-text:hover { color: #f97316 !important; opacity: 1 !important; }
        .hover-blue-text:hover { color: #3b82f6 !important; opacity: 1 !important; }
        .hover-green-text:hover { color: #16a34a !important; opacity: 1 !important; }
        .hover-red-text:hover { color: #ef4444 !important; opacity: 1 !important; }
        
        .hover-shadow-kanban:hover { transform: translateY(-3px); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1) !important; border-color: #cbd5e1 !important; }
        .drag-item { cursor: grab; }
        .drag-item:active { cursor: grabbing; opacity: 0.8 !important; transform: scale(0.98); }
        .hide-scrollbar-kanban::-webkit-scrollbar { display: none; }
        
        /* Outline Buttons */
        .btn-outline { background: white; border: 1px solid #cbd5e1; color: #475569; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer; display: flex; alignItems: center; gap: 8px; transition: 0.2s; }
        .btn-outline:hover { background: #f8fafc; border-color: #94a3b8; color: #1e293b; }
        
        /* Action Buttons */
        .action-btn { background: transparent; border: none; cursor: pointer; opacity: 0.5; transition: 0.2s; display: flex; align-items: center; justify-content: center; padding: 4px; }
        .action-btn:hover { opacity: 1; transform: scale(1.1); }

        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}