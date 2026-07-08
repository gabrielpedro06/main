import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../services/supabase";

// --- ÍCONES SVG PROFISSIONAIS ---
const Icons = {
  Search: ({ size = 14, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>,
  Plus: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>,
  Folder: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>,
  Laptop: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="2" y1="20" x2="22" y2="20"></line></svg>,
  Lock: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>,
  Activity: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>,
  Eye: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>,
  EyeOff: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>,
  Copy: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>,
  Close: ({ size = 18, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>,
  Save: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>,
  AlertTriangle: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>,
};

/* ------------------------------------------------------------------ */
/* Subcomponentes Visuais                                             */
/* ------------------------------------------------------------------ */

const ModalPortal = ({ children }) => createPortal(children, document.body);

const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box', marginBottom: '10px', color: '#1e293b' };
const labelStyle = { display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600', color: '#475569' };

function StatCard({ label, valor, borderColor, badgeColor, badgeBg, onClick }) {
  return (
    <div onClick={onClick} className="hover-shadow" style={{background: 'white', borderRadius: '16px', padding: '20px', border: '1px solid #e2e8f0', borderTop: `5px solid ${borderColor}`, position: 'relative', cursor: 'pointer', display: 'flex', flexDirection: 'column', minHeight: '120px', transition: 'all 0.2s'}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '4px'}}>
        <div style={{fontSize: '1.05rem', fontWeight: '800', color: '#1e293b'}}>{label}</div>
        <div style={{width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: '800', backgroundColor: badgeBg, color: badgeColor}}>{valor}</div>
      </div>
      <div className="hover-blue-text" style={{marginTop: 'auto', paddingTop: '15px', fontSize: '0.85rem', color: '#64748b', fontWeight: '700'}}>
        Ver detalhes &rarr;
      </div>
    </div>
  );
}

function StatusBadge({ estado }) {
  const map = {
    em_uso: { txt: "Em uso", bg: "#dcfce7", color: "#166534" },
    em_stock: { txt: "Em stock", bg: "#f1f5f9", color: "#475569" },
    em_reparacao: { txt: "Em reparação", bg: "#fef3c7", color: "#d97706" },
    reservado: { txt: "Reservado", bg: "#e0e7ff", color: "#6d28d9" },
    abatido: { txt: "Abatido", bg: "#fee2e2", color: "#ef4444" }
  };
  const { txt, bg, color } = map[estado] || { txt: "—", bg: "#f1f5f9", color: "#475569" };
  return (
    <span style={{fontSize: '0.7rem', background: bg, color: color, padding: '4px 10px', borderRadius: '12px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.04em'}}>{txt}</span>
  );
}

// NOVO: Card Simplificado para Acessos
function AcessoCard({ acesso }) {
  const [visible, setVisible] = useState(false);
  const expirado = acesso.estado === 'expirado';

  return (
    <div className="hover-shadow" style={{background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px'}}>
      
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
        <div>
          <h3 style={{margin: '0 0 5px 0', color: '#0f172a', fontSize: '1.1rem'}}>{acesso.nome_plataforma}</h3>
          <a href={acesso.url} target="_blank" rel="noopener noreferrer" style={{color: '#3b82f6', fontSize: '0.85rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px'}}>
            Aceder ao URL &rarr;
          </a>
        </div>
        <span style={{fontSize: '0.7rem', fontWeight: '800', textTransform: 'uppercase', padding: '4px 10px', borderRadius: '8px', background: expirado ? '#fee2e2' : '#dcfce7', color: expirado ? '#ef4444' : '#16a34a'}}>
          {acesso.estado || 'ativo'}
        </span>
      </div>

      <div style={{background: '#f8fafc', borderRadius: '8px', padding: '12px', border: '1px solid #f1f5f9'}}>
        <div style={{marginBottom: '8px', fontSize: '0.85rem', color: '#475569'}}>
          <strong>User:</strong> {acesso.username}
        </div>
        <div style={{display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', color: '#475569'}}>
          <strong>Pass:</strong> 
          <span style={{fontFamily: 'monospace', background: 'white', padding: '4px 8px', borderRadius: '4px', border: '1px solid #e2e8f0', flex: 1}}>
            {visible ? acesso.password : '••••••••••••'}
          </span>
          <button onClick={() => setVisible(!visible)} className="action-btn" title="Mostrar/Ocultar">
            {visible ? <Icons.EyeOff size={14} /> : <Icons.Eye size={14} />}
          </button>
          <button className="action-btn" title="Copiar" onClick={() => navigator.clipboard.writeText(acesso.password)}>
            <Icons.Copy size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

async function gerarProximoInventario() {
  const { data, error } = await supabase.from("equipamentos").select("num_inventario").order("num_inventario", { ascending: false }).limit(1);
  if (error || !data || data.length === 0 || !data[0].num_inventario) return "0001";
  const proximo = parseInt(data[0].num_inventario, 10) + 1;
  return proximo.toString().padStart(4, '0');
}

/* ------------------------------------------------------------------ */
/* Página principal - AtivosTIDashboard                               */
/* ------------------------------------------------------------------ */
export default function AtivosTIDashboard() {
  const [tab, setTab] = useState("painel");
  const [query, setQuery] = useState("");
  
  // Dados Reais
  const [equipamentos, setEquipamentos] = useState([]);
  const [acessos, setAcessos] = useState([]);
  const [utilizadores, setUtilizadores] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Estados do Modal
  const [showModal, setShowModal] = useState(false);
  const [isClosingPanel, setIsClosingPanel] = useState(false);
  const [modalType, setModalType] = useState('equipamento'); // equipamento | acesso
  
  // Estados dos Formulários
  const initEquip = { num_inventario: "", tipo: "Computador", modelo: "", colaborador_id: "", estado: "em_stock", nome_pc: "" };
  const initAcesso = { nome_plataforma: "", url: "", username: "", password: "", estado: "ativo" };
  
  const [formEquip, setFormEquip] = useState(initEquip);
  const [formAcesso, setFormAcesso] = useState(initAcesso);

  // Carregar Dados
  const carregarDados = useCallback(async () => {
    setIsLoading(true);
    try {
      const [equipResult, acessosResult, perfisResult] = await Promise.all([
        supabase.from("equipamentos").select("*").order("created_at", { ascending: false }),
        supabase.from("acessos").select("*").order("nome_plataforma", { ascending: true }),
        supabase.from("profiles").select("id, nome").eq("ativo", true)
      ]);

      if (equipResult.data) setEquipamentos(equipResult.data);
      if (acessosResult.data) setAcessos(acessosResult.data);
      if (perfisResult.data) setUtilizadores(perfisResult.data);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  // Handlers
  async function handleNovo() {
    setModalType(tab === 'acessos' ? 'acesso' : 'equipamento');
    setFormEquip({ ...initEquip });
    setFormAcesso({ ...initAcesso });

    if (tab === 'equip' || tab === 'painel') {
      const proximo = await gerarProximoInventario();
      setFormEquip(prev => ({ ...prev, num_inventario: proximo }));
    }

    setIsClosingPanel(false);
    setShowModal(true);
  }

  function closePanel() {
    if (isClosingPanel) return;
    setIsClosingPanel(true);
    setTimeout(() => {
      setShowModal(false);
      setIsClosingPanel(false);
    }, 360);
  }

  // Submissão
  async function handleSubmitAtivo(e) {
    e.preventDefault();

    try {
      if (modalType === 'equipamento') {
        const { error } = await supabase.from('equipamentos').insert([{ ...formEquip, colaborador_id: formEquip.colaborador_id || null }]);
        if (error) throw error;
        alert("Equipamento gravado com sucesso!");
      } 
      else if (modalType === 'acesso') {
        const { error } = await supabase.from('acessos').insert([formAcesso]);
        if (error) throw error;
        alert("Acesso gravado com sucesso!");
      }
      
      carregarDados();
      closePanel();
    } catch (err) {
      console.error(err);
      alert("Erro ao gravar dados: " + err.message);
    }
  }

  // Cálculos KPIs e Filtros
  const equipFiltrados = equipamentos.filter((e) =>
    (e.num_inventario + e.modelo + (e.colaborador || '')).toLowerCase().includes(query.toLowerCase())
  );
  
  const acessosFiltrados = acessos.filter((a) =>
    (a.nome_plataforma + a.url + a.username).toLowerCase().includes(query.toLowerCase())
  );

  const kpisDinamic = [
    { label: "Total Equipamentos", valor: equipamentos.length, borderColor: "#3b82f6", badgeColor: "#1d4ed8", badgeBg: "#dbeafe", onClick: () => setTab("equip") },
    { label: "Total de Acessos", valor: acessos.length, borderColor: "#8b5cf6", badgeColor: "#6d28d9", badgeBg: "#ede9fe", onClick: () => setTab("acessos") },
    { label: "Acessos Expirados", valor: acessos.filter(a => a.estado === 'expirado').length, borderColor: "#ef4444", badgeColor: "#b91c1c", badgeBg: "#fee2e2", onClick: () => setTab("acessos") },
  ];

  return (
    <div className="page-container" style={{maxWidth: '1500px', margin: '0 auto'}}>
      
      {/* CABEÇALHO */}
      <div className="page-header" style={{background: 'white', padding: '20px 25px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '15px', flexWrap: 'wrap'}}>
        <div style={{display:'flex', alignItems:'center', gap:'15px'}}>
            <div style={{background: 'var(--color-bgSecondary)', color: 'var(--color-btnPrimary)', padding: '12px', borderRadius: '12px', display: 'flex'}}>
              <Icons.Folder size={24} />
            </div>
            <div>
                <h1 style={{margin: 0, color: '#0f172a', fontSize: '1.8rem', fontWeight: '900', letterSpacing: '-0.02em'}}>Ativos TI</h1>
                <p style={{color: '#64748b', margin: 0, fontWeight: '500', fontSize: '0.9rem'}}>Gestão simples de equipamentos e acessos web.</p>
            </div>
        </div>
        <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
          <button onClick={handleNovo} className="btn-primary hover-shadow" style={{padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold'}}>
            <Icons.Plus /> Novo Registo
          </button>
        </div>
      </div>

      {/* TABS DE NAVEGAÇÃO */}
      <div style={{display:'flex', gap:'5px', paddingLeft: '10px'}}>
        <button onClick={() => setTab("painel")} style={{padding: '12px 25px', background: tab === 'painel' ? 'white' : '#e2e8f0', color: tab === 'painel' ? 'var(--color-btnPrimary)' : '#64748b', border: 'none', borderRadius: '12px 12px 0 0', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s', display:'flex', alignItems:'center', gap:'8px'}}>
          <Icons.Activity /> Painel Geral
        </button>
        <button onClick={() => setTab("equip")} style={{padding: '12px 25px', background: tab === 'equip' ? 'white' : '#e2e8f0', color: tab === 'equip' ? 'var(--color-btnPrimary)' : '#64748b', border: 'none', borderRadius: '12px 12px 0 0', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s', display:'flex', alignItems:'center', gap:'8px'}}>
          <Icons.Laptop /> Equipamentos
        </button>
        <button onClick={() => setTab("acessos")} style={{padding: '12px 25px', background: tab === 'acessos' ? 'white' : '#e2e8f0', color: tab === 'acessos' ? 'var(--color-btnPrimary)' : '#64748b', border: 'none', borderRadius: '12px 12px 0 0', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s', display:'flex', alignItems:'center', gap:'8px'}}>
          <Icons.Lock /> Acessos
        </button>
      </div>

      {/* BARRA DE PESQUISA */}
      <div style={{background: 'white', padding: '12px 20px', borderRadius: '0 10px 10px 10px', border: '1px solid #e2e8f0', marginBottom: '25px', display: 'flex', gap: '15px', alignItems: 'center'}}>
        {(tab === "equip" || tab === "acessos") ? (
          <div style={{flex: 1, position: 'relative'}}>
            <span style={{position: 'absolute', left: '12px', top: '10px', color: '#94a3b8'}}><Icons.Search /></span>
            <input type="text" placeholder="Procurar..." value={query} onChange={(e) => setQuery(e.target.value)} style={{width: '100%', padding: '8px 12px 8px 38px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none'}} className="input-focus" />
          </div>
        ) : (
          <div style={{color: '#64748b', fontSize: '0.9rem', fontWeight: '600'}}>Resumo global da sua organização.</div>
        )}
      </div>

      {/* ÁREA DE CONTEÚDO */}
      {isLoading ? (
        <div style={{display:'flex', justifyContent:'center', alignItems:'center', height:'40vh'}}><div className="pulse-dot-white" style={{background:'#3b82f6'}}></div></div>
      ) : (
        <>
          {/* TAB: PAINEL */}
          {tab === "painel" && (
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '20px'}}>
              {kpisDinamic.map((k) => <StatCard key={k.label} {...k} />)}
            </div>
          )}

          {/* TAB: EQUIPAMENTOS */}
          {tab === "equip" && (
            <div className="table-responsive" style={{borderRadius: '14px', background: 'white', border: '1px solid #e2e8f0'}}>
              <table style={{minWidth: '980px', width: '100%', borderCollapse: 'collapse'}}>
                <thead>
                  <tr>
                    <th style={{padding: '16px', textAlign: 'left', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0'}}>Nº inventário</th>
                    <th style={{padding: '16px', textAlign: 'left', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0'}}>Tipo</th>
                    <th style={{padding: '16px', textAlign: 'left', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0'}}>Modelo</th>
                    <th style={{padding: '16px', textAlign: 'left', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0'}}>Nome PC</th>
                    <th style={{padding: '16px', textAlign: 'left', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0'}}>Colaborador</th>
                    <th style={{padding: '16px', textAlign: 'left', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0'}}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {equipFiltrados.map((e) => (
                    <tr key={e.id} className="hover-row" style={{borderBottom: '1px solid #f1f5f9'}}>
                      <td style={{padding: '16px', fontFamily: 'monospace', fontWeight: '700'}}>{e.num_inventario}</td>
                      <td style={{padding: '16px', color: '#64748b'}}>{e.tipo}</td>
                      <td style={{padding: '16px', fontWeight: '800'}}>{e.modelo}</td>
                      <td style={{padding: '16px', color: '#334155'}}>{e.nome_pc || "—"}</td>
                      <td style={{padding: '16px', color: '#475569'}}>{e.colaborador || "—"}</td>
                      <td style={{padding: '16px'}}><StatusBadge estado={e.estado} /></td>
                    </tr>
                  ))}
                  {equipFiltrados.length === 0 && (
                    <tr><td colSpan={6} style={{padding: '40px', textAlign: 'center', color: '#94a3b8'}}>Nenhum resultado.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB: ACESSOS (SIMPLIFICADO) */}
          {tab === "acessos" && (
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '20px'}}>
              {acessosFiltrados.length > 0 ? (
                acessosFiltrados.map((a) => <AcessoCard key={a.id} acesso={a} />)
              ) : (
                <div style={{gridColumn: '1 / -1', textAlign: 'center', padding: '60px', background: 'white', borderRadius: '16px', border: '1px dashed #cbd5e1'}}>
                  <Icons.Lock size={48} color="#cbd5e1" />
                  <h3 style={{color: '#1e293b', margin: '15px 0 5px 0'}}>Nenhum acesso registado.</h3>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* --- MODAL DE CRIAÇÃO --- */}
      {showModal && (
        <ModalPortal>
          <div onClick={closePanel} style={{position:'fixed', top:0, left:0, right:0, bottom:0, backgroundColor:'rgba(15, 23, 42, 0.58)', backdropFilter:'blur(3px)', display:'flex', alignItems:'stretch', justifyContent:'flex-end', zIndex:99999}}>
            <div style={{background:'#fff', width:'min(98vw, 600px)', height:'100vh', margin:'0', borderRadius:'18px 0 0 18px', boxShadow:'0 25px 50px -12px rgba(0, 0, 0, 0.35)', display:'flex', flexDirection:'column', animation: isClosingPanel ? 'sidePanelPullOut 0.3s forwards' : 'sidePanelPullIn 0.4s'}} onClick={e => e.stopPropagation()}>
              
              <div style={{padding:'20px 30px', borderBottom:'1px solid #e2e8f0', display:'flex', justifyContent:'space-between', alignItems:'center', background:'#f8fafc'}}>
                <h3 style={{margin:0, color:'#1e293b', fontSize:'1.4rem', fontWeight:'800'}}>Adicionar Registo</h3>
                <button onClick={closePanel} style={{background:'#e2e8f0', border:'none', width:'36px', height:'36px', borderRadius:'50%', cursor:'pointer'}}><Icons.Close/></button>
              </div>

              <div style={{padding:'30px', overflowY:'auto', flex:1}} className="custom-scrollbar">
                
                {/* TOGGLE TIPO */}
                <div style={{display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '10px', marginBottom: '30px'}}>
                  <button type="button" onClick={() => setModalType('equipamento')} style={{flex: 1, padding: '10px', border: 'none', background: modalType === 'equipamento' ? 'white' : 'transparent', color: modalType === 'equipamento' ? '#3b82f6' : '#64748b', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'}}>
                    <Icons.Laptop /> Equipamento
                  </button>
                  <button type="button" onClick={() => setModalType('acesso')} style={{flex: 1, padding: '10px', border: 'none', background: modalType === 'acesso' ? 'white' : 'transparent', color: modalType === 'acesso' ? '#3b82f6' : '#64748b', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'}}>
                    <Icons.Lock /> Acessos
                  </button>
                </div>

                <form onSubmit={handleSubmitAtivo}>
                  
                  {/* FORM EQUIPAMENTO */}
                  {modalType === 'equipamento' && (
                    <div style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
                      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px'}}>
                        <div><label style={labelStyle}>Nº Inventário</label><input type="text" required value={formEquip.num_inventario} onChange={e => setFormEquip({...formEquip, num_inventario: e.target.value})} style={inputStyle} className="input-focus" /></div>
                        <div><label style={labelStyle}>Tipo</label>
                          <select value={formEquip.tipo} onChange={e => setFormEquip({...formEquip, tipo: e.target.value})} style={inputStyle} className="input-focus">
                            <option value="Computador">Computador</option><option value="Monitor">Monitor</option><option value="Outro">Outro</option>
                          </select>
                        </div>
                      </div>
                      <div><label style={labelStyle}>Modelo</label><input type="text" required value={formEquip.modelo} onChange={e => setFormEquip({...formEquip, modelo: e.target.value})} style={inputStyle} className="input-focus" /></div>
                      <div><label style={labelStyle}>Nome do PC (Opcional)</label><input type="text" value={formEquip.nome_pc} onChange={e => setFormEquip({...formEquip, nome_pc: e.target.value})} style={inputStyle} className="input-focus" /></div>
                      <div><label style={labelStyle}>Estado</label>
                        <select value={formEquip.estado} onChange={e => setFormEquip({...formEquip, estado: e.target.value})} style={inputStyle} className="input-focus">
                          <option value="em_stock">Em stock</option><option value="em_uso">Em uso</option><option value="em_reparacao">Em reparação</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {/* FORM ACESSO SIMPLIFICADO */}
                  {modalType === 'acesso' && (
                    <div style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
                      <div><label style={labelStyle}>Nome da Plataforma / Sistema *</label>
                        <input type="text" required value={formAcesso.nome_plataforma} onChange={e => setFormAcesso({...formAcesso, nome_plataforma: e.target.value})} placeholder="Ex: WordPress Empresa" style={inputStyle} className="input-focus" />
                      </div>
                      
                      <div><label style={labelStyle}>URL de Acesso *</label>
                        <input type="url" required value={formAcesso.url} onChange={e => setFormAcesso({...formAcesso, url: e.target.value})} placeholder="Ex: https://site.pt/admin" style={inputStyle} className="input-focus" />
                      </div>
                      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px'}}>
                        <div><label style={labelStyle}>Utilizador / Email *</label>
                          <input type="text" required value={formAcesso.username} onChange={e => setFormAcesso({...formAcesso, username: e.target.value})} placeholder="admin@..." style={inputStyle} className="input-focus" />
                        </div>
                        <div><label style={labelStyle}>Password *</label>
                          <input type="password" required value={formAcesso.password} onChange={e => setFormAcesso({...formAcesso, password: e.target.value})} placeholder="••••••••" style={inputStyle} className="input-focus" />
                        </div>
                      </div>
                      <div><label style={labelStyle}>Estado</label>
                        <select value={formAcesso.estado} onChange={e => setFormAcesso({...formAcesso, estado: e.target.value})} style={inputStyle} className="input-focus">
                          <option value="ativo">Ativo</option>
                          <option value="expirado">Expirado / Bloqueado</option>
                        </select>
                      </div>
                    </div>
                  )}

                  <div style={{marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '15px'}}>
                    <button type="button" onClick={closePanel} style={{padding: '12px 24px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '10px', cursor: 'pointer'}}>Cancelar</button>
                    <button type="submit" className="btn-primary" style={{padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold'}}><Icons.Save /> Guardar</button>
                  </div>
                </form>

              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* --- ESTILOS NATIVOS --- */}
      <style>{`
        .btn-primary {
          background: linear-gradient(135deg, var(--color-btnPrimary, #3b82f6), var(--color-btnPrimaryDark, #1d4ed8));
          color: white; border: none; border-radius: 10px; cursor: pointer; transition: 0.2s;
        }
        .hover-shadow:hover { box-shadow: 0 4px 10px rgba(0,0,0,0.08); transform: translateY(-2px); }
        .input-focus:focus { border-color: #3b82f6 !important; box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1); }
        .action-btn { background: transparent; border: none; cursor: pointer; opacity: 0.5; transition: 0.2s; display: flex; align-items: center; justify-content: center; padding: 6px; border-radius: 6px; }
        .action-btn:hover { opacity: 1; transform: scale(1.1); background: #f1f5f9; }
        .hover-blue-text:hover { color: #3b82f6 !important; }
        .hover-row:hover { background: #f8fafc !important; }
        .pulse-dot-white { width: 12px; height: 12px; border-radius: 50%; display: inline-block; animation: pulse 1.5s infinite; }
        .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 10px; }
        @keyframes pulse { 0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); } 70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(59, 130, 246, 0); } 100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); } }
        @keyframes sidePanelPullIn { 0% { transform: translateX(100%); opacity: 0.72; } 72% { transform: translateX(-10px); opacity: 1; } 100% { transform: translateX(0); opacity: 1; } }
        @keyframes sidePanelPullOut { 0% { transform: translateX(0); opacity: 1; } 100% { transform: translateX(100%); opacity: 0.78; } }
      `}</style>
    </div>
  );
}