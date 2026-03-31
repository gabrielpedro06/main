import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../services/supabase";
import { useAuth } from "../context/AuthContext";
import "./../styles/dashboard.css";

// Portal para os Modais/Pop-ups ficarem sempre por cima de tudo
const ModalPortal = ({ children }) => {
  return createPortal(children, document.body);
};

const Icons = {
  Car: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 16H9m10 0h3v-3.15a1 1 0 0 0-.84-.99L16 11l-2.7-3.6a2 2 0 0 0-1.6-.8H9.3a2 2 0 0 0-1.6.8L5 11l-5.16.86a1 1 0 0 0-.84.99V16h3m14 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM7 16a2 2 0 1 1-4 0 2 2 0 0 1 4 0z"></path></svg>,
  Trash: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>,
  Plus: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
};

export default function Perfil() {
  const { user, userProfile, setUserProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });

  // Estados do Formulário Completo
  const [formData, setFormData] = useState({
    nome: "",
    email: "", 
    data_nascimento: "",
    avatar_url: "",
    
    nome_completo: "",
    telemovel: "",
    morada: "",
    nif: "",
    niss: "",
    ncc: "",
    validade_cc: "", 
    nr_dependentes: 0,
    estado_civil: "",
    nacionalidade: "Portuguesa",
    sexo: "",
    concelho: "",
    
    empresa_interna: "",
    funcao: "",
    tipo_contrato: "",
    veiculos: [] // 💡 NOVO: Array para guardar os veículos
  });
  
  const [newPassword, setNewPassword] = useState("");
  
  // 💡 NOVO: Estado temporário para adicionar veículo
  const [novoVeiculo, setNovoVeiculo] = useState({ matricula: "", marca: "" });

  const cropImgRef = useRef(null);
  const cropContainerRef = useRef(null);
  const [cropModal, setCropModal] = useState({ show: false, src: null });
  const [cropScale, setCropScale] = useState(1);
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 });
  const [cropDragStart, setCropDragStart] = useState(null);
  const [cropImgNatural, setCropImgNatural] = useState({ w: 1, h: 1 });
  const [cropContainerSize, setCropContainerSize] = useState({ w: 400, h: 400 });

  useEffect(() => {
    if (user && userProfile) {
      setFormData({
        nome: userProfile.nome || "",
        email: user.email || "",
        data_nascimento: userProfile.data_nascimento || "",
        avatar_url: userProfile.avatar_url || "",
        
        nome_completo: userProfile.nome_completo || "",
        telemovel: userProfile.telemovel || "",
        morada: userProfile.morada || "",
        nif: userProfile.nif || "",
        niss: userProfile.niss || "",
        ncc: userProfile.ncc || "",
        validade_cc: userProfile.validade_cc || "", 
        nr_dependentes: userProfile.nr_dependentes || 0,
        estado_civil: userProfile.estado_civil || "",
        nacionalidade: userProfile.nacionalidade || "Portuguesa",
        sexo: userProfile.sexo || "",
        concelho: userProfile.concelho || "",
        
        empresa_interna: userProfile.empresa_interna || "",
        funcao: userProfile.funcao || "",
        tipo_contrato: userProfile.tipo_contrato || "",
        veiculos: Array.isArray(userProfile.veiculos) ? userProfile.veiculos : [] // Carrega os veículos
      });
    }
  }, [user, userProfile]);

  // --- LÓGICA DE VEÍCULOS ---
  const formatarMatricula = (valor) => {
      let v = valor.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
      if (v.length > 6) v = v.substring(0, 6);
      if (v.length > 4) return `${v.substring(0, 2)}-${v.substring(2, 4)}-${v.substring(4, 6)}`;
      if (v.length > 2) return `${v.substring(0, 2)}-${v.substring(2, 4)}`;
      return v;
  };

  const handleAddVeiculo = () => {
      if (novoVeiculo.matricula.length < 6) {
          setNotification({ show: true, message: "Matrícula inválida.", type: 'warning' });
          return;
      }
      setFormData(prev => ({
          ...prev,
          veiculos: [...prev.veiculos, { ...novoVeiculo }]
      }));
      setNovoVeiculo({ matricula: "", marca: "" });
  };

  const handleRemoveVeiculo = (indexToRemove) => {
      setFormData(prev => ({
          ...prev,
          veiculos: prev.veiculos.filter((_, index) => index !== indexToRemove)
      }));
  };

  const handleCCChange = (e) => {
      let value = e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
      if (value.length > 12) value = value.slice(0, 12);
      let formattedValue = value;
      if (value.length > 8) formattedValue = value.slice(0, 8) + ' - ' + value.slice(8);
      if (value.length > 9) formattedValue = value.slice(0, 8) + ' - ' + value.slice(8, 9) + ' - ' + value.slice(9);
      if (value.length > 11) formattedValue = value.slice(0, 8) + ' - ' + value.slice(8, 9) + ' - ' + value.slice(9, 11) + ' - ' + value.slice(11);
      setFormData({ ...formData, ncc: formattedValue });
  };

  function handleAvatarUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setCropModal({ show: true, src: ev.target.result });
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  useEffect(() => {
    const el = cropContainerRef.current;
    if (!cropModal.show || !el) return;
    const onWheel = (e) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.1 : 0.9;
      setCropScale(prev => {
        const minScale = Math.max((cropContainerSize.w * 0.8) / cropImgNatural.w, (cropContainerSize.h * 0.8) / cropImgNatural.h);
        return Math.max(minScale, Math.min(prev * factor, minScale * 8));
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [cropModal.show, cropContainerSize, cropImgNatural]);

  function handleCropMouseDown(e) {
    e.preventDefault();
    setCropDragStart({ mx: e.clientX, my: e.clientY, ox: cropOffset.x, oy: cropOffset.y });
  }

  function handleCropMouseMove(e) {
    if (!cropDragStart) return;
    const dx = e.clientX - cropDragStart.mx;
    const dy = e.clientY - cropDragStart.my;
    setCropOffset(clampCropOffset(cropDragStart.ox + dx, cropDragStart.oy + dy, cropScale));
  }

  function handleCropMouseUp() { setCropDragStart(null); }

  function clampCropOffset(ox, oy, scale) {
    const { w: cw, h: ch } = cropContainerSize;
    const { w: iw, h: ih } = cropImgNatural;
    const cropRadius = Math.round(Math.min(cw, ch) * 0.4);
    const imgDisplayW = iw * scale;
    const imgDisplayH = ih * scale;
    const maxX = cw / 2 - cropRadius - (cw / 2 - imgDisplayW / 2);
    const minX = cw / 2 + cropRadius - (cw / 2 + imgDisplayW / 2);
    const maxY = ch / 2 - cropRadius - (ch / 2 - imgDisplayH / 2);
    const minY = ch / 2 + cropRadius - (ch / 2 + imgDisplayH / 2);
    return { x: Math.max(minX, Math.min(maxX, ox)), y: Math.max(minY, Math.min(maxY, oy)) };
  }

  async function confirmCrop() {
    try {
      setUploading(true);
      const img = cropImgRef.current;
      if (!img) throw new Error('Imagem não encontrada.');

      const { w: cw, h: ch } = cropContainerSize;
      const cropRadius = Math.round(Math.min(cw, ch) * 0.4);
      const cropDiameter = cropRadius * 2;
      const imgDispW = cropImgNatural.w * cropScale;
      const imgDispH = cropImgNatural.h * cropScale;
      const imgLeft = cw / 2 + cropOffset.x - imgDispW / 2;
      const imgTop  = ch / 2 + cropOffset.y - imgDispH / 2;
      const circleLeft = cw / 2 - cropRadius;
      const circleTop  = ch / 2 - cropRadius;
      const sx    = (circleLeft - imgLeft) / cropScale;
      const sy    = (circleTop  - imgTop)  / cropScale;
      const sSize = cropDiameter / cropScale;

      const OUTPUT = 400;
      const canvas = document.createElement('canvas');
      canvas.width = OUTPUT; canvas.height = OUTPUT;
      canvas.getContext('2d').drawImage(img, sx, sy, sSize, sSize, 0, 0, OUTPUT, OUTPUT);

      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.92));
      setCropModal({ show: false, src: null });

      const fileName = `${user.id}-${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, blob, { contentType: 'image/jpeg', upsert: true });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
      setFormData(prev => ({ ...prev, avatar_url: publicUrl }));
      setNotification({ show: true, message: "Foto recortada e carregada! Clica em 'Guardar Alterações' para finalizar.", type: 'success' });
    } catch (error) {
      setNotification({ show: true, message: 'Erro no upload: ' + error.message, type: 'error' });
    } finally {
      setUploading(false);
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    setLoading(true);

    try {
        const { error } = await supabase
            .from('profiles')
            .update({
                nome: formData.nome,
                data_nascimento: formData.data_nascimento,
                avatar_url: formData.avatar_url,
                nome_completo: formData.nome_completo,
                telemovel: formData.telemovel,
                morada: formData.morada,
                nif: formData.nif,
                niss: formData.niss,
                ncc: formData.ncc,
                validade_cc: formData.validade_cc || null, 
                nr_dependentes: formData.nr_dependentes,
                estado_civil: formData.estado_civil,
                nacionalidade: formData.nacionalidade,
                sexo: formData.sexo,
                concelho: formData.concelho,
                veiculos: formData.veiculos, // 💡 Guarda a lista de carros!
                updated_at: new Date()
            })
            .eq('id', user.id);

        if (error) throw error;

        if (newPassword) {
            if (newPassword.length < 6) throw new Error("A password deve ter pelo menos 6 caracteres.");
            const { error: passError } = await supabase.auth.updateUser({ password: newPassword });
            if (passError) throw passError;
        }

        setUserProfile(prev => ({ ...prev, ...formData }));
        setNotification({ show: true, message: "Perfil atualizado com sucesso! 🎉", type: "success" });
        setNewPassword("");

    } catch (error) {
        setNotification({ show: true, message: error.message, type: "error" });
    } finally {
        setLoading(false);
    }
  }

  const sectionTitleStyle = { display: 'flex', alignItems: 'center', gap: '8px', color: '#1e293b', fontSize: '1rem', fontWeight: 'bold', marginTop: '35px', marginBottom: '15px', paddingBottom: '5px', borderBottom: '1px solid #e2e8f0' };
  const labelStyle = { fontSize: '0.8rem', color: '#64748b', marginBottom: '4px', display: 'block', fontWeight: '600' };
  const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', marginBottom: '15px', boxSizing: 'border-box', outline: 'none' };

  return (
    <div className="page-container">
      
      <div className="card" style={{marginBottom: '20px', display:'flex', alignItems:'center', gap:'15px', padding: '20px 25px'}}>
          <div style={{fontSize:'2rem'}}>👤</div>
          <div>
              <h2 style={{margin:0, color:'#1e293b', fontSize: '1.5rem', fontWeight: '900'}}>O Meu Perfil</h2>
              <p style={{margin:0, color:'#64748b', fontWeight: '500'}}>Gere a tua conta, dados pessoais e veículos.</p>
          </div>
      </div>

      <div className="factorial-wrapper">
          <div className="main-column">
              <div className="card" style={{padding: '30px'}}>
                  <form onSubmit={handleSave}>
                      
                      <div style={{display:'flex', alignItems:'center', gap:'20px', marginBottom:'20px'}}>
                          <div style={{width:'80px', height:'80px', borderRadius:'50%', overflow:'hidden', border:'3px solid #e2e8f0', background: '#f1f5f9', display:'flex', alignItems:'center', justifyContent:'center'}}>
                              {formData.avatar_url ? <img src={formData.avatar_url} alt="Avatar" style={{width:'100%', height:'100%', objectFit:'cover'}} /> : <span style={{fontSize:'2rem', color:'#cbd5e1'}}>📷</span>}
                          </div>
                          <div>
                              <label style={{cursor:'pointer', background:'#f1f5f9', padding:'8px 15px', borderRadius:'8px', fontSize:'0.9rem', fontWeight:'600', color:'#475569', border:'1px solid #cbd5e1', transition: '0.2s'}} className="hover-shadow">
                                  {uploading ? "A carregar..." : "📸 Alterar Foto"}
                                  <input type="file" accept="image/*" hidden onChange={handleAvatarUpload} disabled={uploading} />
                              </label>
                          </div>
                      </div>

                      <div style={sectionTitleStyle}>Informação Básica</div>
                      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px'}}>
                          <div>
                              <label style={labelStyle}>Nome de Exibição (Curto)</label>
                              <input type="text" value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} style={inputStyle} className="input-focus" required />
                          </div>
                          <div>
                              <label style={labelStyle}>Email (Login)</label>
                              <input type="email" value={formData.email} disabled style={{...inputStyle, background: '#f1f5f9', color:'#94a3b8', cursor:'not-allowed'}} />
                          </div>
                      </div>
                      <label style={labelStyle}>Nome Completo (Oficial)</label>
                      <input type="text" value={formData.nome_completo} onChange={e => setFormData({...formData, nome_completo: e.target.value})} style={inputStyle} className="input-focus" />

                      <div style={sectionTitleStyle}>Dados Pessoais</div>
                      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px'}}>
                          <div>
                              <label style={labelStyle}>Data de Nascimento</label>
                              <input type="date" value={formData.data_nascimento} onChange={e => setFormData({...formData, data_nascimento: e.target.value})} style={inputStyle} className="input-focus" />
                          </div>
                          <div>
                              <label style={labelStyle}>Nacionalidade</label>
                              <input type="text" value={formData.nacionalidade} onChange={e => setFormData({...formData, nacionalidade: e.target.value})} style={inputStyle} className="input-focus" />
                          </div>
                          <div>
                              <label style={labelStyle}>Telemóvel</label>
                              <input type="text" value={formData.telemovel} onChange={e => setFormData({...formData, telemovel: e.target.value})} style={inputStyle} className="input-focus" />
                          </div>
                          <div>
                              <label style={labelStyle}>Concelho</label>
                              <input type="text" value={formData.concelho} onChange={e => setFormData({...formData, concelho: e.target.value})} style={inputStyle} className="input-focus" />
                          </div>
                      </div>

                      <label style={labelStyle}>Morada Completa</label>
                      <input type="text" value={formData.morada} onChange={e => setFormData({...formData, morada: e.target.value})} style={inputStyle} className="input-focus" />

                      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px'}}>
                          <div>
                              <label style={labelStyle}>Estado Civil</label>
                              <select value={formData.estado_civil} onChange={e => setFormData({...formData, estado_civil: e.target.value})} style={inputStyle} className="input-focus">
                                  <option value="">Selecione...</option>
                                  <option value="Solteiro">Solteiro</option>
                                  <option value="Casado">Casado</option>
                                  <option value="Divorciado">Divorciado</option>
                                  <option value="União Facto">União Facto</option>
                              </select>
                          </div>
                          <div>
                              <label style={labelStyle}>Sexo</label>
                              <select value={formData.sexo} onChange={e => setFormData({...formData, sexo: e.target.value})} style={inputStyle} className="input-focus">
                                  <option value="">Selecione...</option>
                                  <option value="Masculino">Masculino</option>
                                  <option value="Feminino">Feminino</option>
                                  <option value="Outro">Outro</option>
                              </select>
                          </div>
                          <div>
                              <label style={labelStyle}>Nr Dependentes</label>
                              <input type="number" value={formData.nr_dependentes} onChange={e => setFormData({...formData, nr_dependentes: e.target.value})} style={inputStyle} className="input-focus" />
                          </div>
                      </div>

                      <div style={sectionTitleStyle}>Dados Fiscais e Civis (Privado)</div>
                      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px'}}>
                          <div><label style={labelStyle}>NIF (Nº de Contribuinte)</label><input type="text" maxLength="9" value={formData.nif} onChange={e => setFormData({...formData, nif: e.target.value})} style={inputStyle} className="input-focus" /></div>
                          <div><label style={labelStyle}>NISS (Segurança Social)</label><input type="text" maxLength="11" value={formData.niss} onChange={e => setFormData({...formData, niss: e.target.value})} style={inputStyle} className="input-focus" /></div>
                      </div>

                      <div style={{display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '15px'}}>
                          <div>
                              <label style={labelStyle}>Cartão Cidadão (Ex: 12345678 - 9 - ZZ - 0)</label>
                              <input 
                                  type="text" 
                                  value={formData.ncc} 
                                  onChange={handleCCChange} 
                                  placeholder="00000000 - 0 - XX - 0"
                                  style={{...inputStyle, letterSpacing: '1px', fontFamily: 'monospace', fontWeight: 'bold', color: '#1e40af', background: '#f8fafc'}} 
                                  className="input-focus"
                              />
                          </div>
                          <div>
                              <label style={labelStyle}>Data de Validade (CC)</label>
                              <input type="date" value={formData.validade_cc} onChange={e => setFormData({...formData, validade_cc: e.target.value})} style={inputStyle} className="input-focus" />
                          </div>
                      </div>

                      {/* 💡 NOVA SECÇÃO: VEÍCULOS */}
                      <div style={{...sectionTitleStyle, color: '#0369a1', borderColor: '#bae6fd'}}><Icons.Car /> Veículos e Deslocações</div>
                      <div style={{background: '#f0f9ff', padding: '20px', borderRadius: '12px', border: '1px solid #bae6fd', marginBottom: '25px'}}>
                          <p style={{margin: '0 0 15px 0', fontSize: '0.85rem', color: '#0284c7'}}>Adiciona os teus veículos para serem usados rapidamente nos pedidos de Km's.</p>
                          
                          {formData.veiculos.length > 0 && (
                              <div style={{display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '15px'}}>
                                  {formData.veiculos.map((v, idx) => (
                                      <div key={idx} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '10px 15px', borderRadius: '8px', border: '1px solid #e0f2fe'}}>
                                          <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                                              <span style={{fontFamily: 'monospace', fontWeight: '800', background: '#e2e8f0', color: '#1e293b', padding: '4px 10px', borderRadius: '6px', letterSpacing: '1px'}}>{v.matricula}</span>
                                              <span style={{color: '#475569', fontSize: '0.9rem', fontWeight: '600'}}>{v.marca}</span>
                                          </div>
                                          <button type="button" onClick={() => handleRemoveVeiculo(idx)} style={{background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px'}} title="Remover Veículo"><Icons.Trash /></button>
                                      </div>
                                  ))}
                              </div>
                          )}

                          <div style={{display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: '10px', alignItems: 'flex-end'}}>
                              <div>
                                  <label style={labelStyle}>Matrícula</label>
                                  <input 
                                      type="text" 
                                      placeholder="AA-00-AA" 
                                      value={novoVeiculo.matricula} 
                                      onChange={(e) => setNovoVeiculo({...novoVeiculo, matricula: formatarMatricula(e.target.value)})} 
                                      style={{...inputStyle, marginBottom: 0, fontFamily: 'monospace', textTransform: 'uppercase'}} 
                                      className="input-focus"
                                  />
                              </div>
                              <div>
                                  <label style={labelStyle}>Marca / Modelo</label>
                                  <input 
                                      type="text" 
                                      placeholder="Ex: Renault Clio Branco" 
                                      value={novoVeiculo.marca} 
                                      onChange={(e) => setNovoVeiculo({...novoVeiculo, marca: e.target.value})} 
                                      style={{...inputStyle, marginBottom: 0}} 
                                      className="input-focus"
                                  />
                              </div>
                              <button type="button" onClick={handleAddVeiculo} disabled={novoVeiculo.matricula.length < 6} style={{background: '#0284c7', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 15px', height: '42px', fontWeight: 'bold', cursor: novoVeiculo.matricula.length < 6 ? 'not-allowed' : 'pointer', opacity: novoVeiculo.matricula.length < 6 ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '6px'}} className="hover-shadow">
                                  <Icons.Plus /> Adicionar
                              </button>
                          </div>
                      </div>

                      <div style={sectionTitleStyle}>Dados da Empresa (Apenas Leitura)</div>
                      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px'}}>
                          <div>
                              <label style={labelStyle}>Empresa</label>
                              <input type="text" value={formData.empresa_interna} disabled style={{...inputStyle, background: '#f8fafc', color:'#94a3b8', borderColor: 'transparent'}} />
                          </div>
                          <div>
                              <label style={labelStyle}>Tipo de Contrato</label>
                              <input type="text" value={formData.tipo_contrato} disabled style={{...inputStyle, background: '#f8fafc', color:'#94a3b8', borderColor: 'transparent'}} />
                          </div>
                      </div>

                      <div style={{marginTop: '30px', paddingTop:'20px', borderTop:'1px solid #f1f5f9'}}>
                          <h4 style={{margin:'0 0 15px 0', color:'#1e293b'}}>Alterar Password</h4>
                          <label style={labelStyle}>Nova Password <small>(Deixa em branco para não alterar)</small></label>
                          <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Mínimo 6 caracteres" style={inputStyle} className="input-focus" />
                      </div>

                      <button type="submit" className="btn-primary hover-shadow" style={{width:'100%', marginTop:'20px', padding: '15px', fontSize: '1.05rem', fontWeight: '800'}} disabled={loading}>
                          {loading ? "A guardar..." : "💾 Guardar Perfil e Alterações"}
                      </button>
                  </form>
              </div>
          </div>

          <div className="side-column">
              <div className="card" style={{textAlign:'center', position: 'sticky', top: '20px', padding: '30px 20px'}}>
                  <h4 style={{margin:'0 0 10px 0', fontSize: '1.2rem', color: '#0f172a'}}>A Minha Conta</h4>
                  <span className="badge" style={{fontSize:'0.8rem', background: '#fefce8', color: '#a16207', padding: '4px 12px', border: '1px solid #fef08a'}}>{userProfile?.role?.toUpperCase()}</span>
                  <div style={{marginTop:'25px', fontSize:'0.95rem', color:'#64748b'}}>
                      <p>Membro desde:<br/><strong style={{color:'#1e293b', fontSize: '1.1rem'}}>{new Date(user?.created_at).toLocaleDateString('pt-PT')}</strong></p>
                  </div>
              </div>
          </div>
      </div>

      {/* --- MODAIS MANTIDOS INTACTOS --- */}
      {cropModal.show && (
        <ModalPortal>
          <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(15, 23, 42, 0.92)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',zIndex:99999,padding:'16px',boxSizing:'border-box'}} onMouseMove={handleCropMouseMove} onMouseUp={handleCropMouseUp} onMouseLeave={handleCropMouseUp}>
            <div style={{color:'white',marginBottom:'12px',textAlign:'center'}}>
              <div style={{fontSize:'1.1rem',fontWeight:'bold'}}>✂️ Recortar Foto de Perfil</div>
              <div style={{fontSize:'0.78rem',color:'rgba(255,255,255,0.55)',marginTop:'3px'}}>Arrasta para mover · Scroll para aproximar/afastar</div>
            </div>
            <div ref={(el) => { cropContainerRef.current = el; if (el) { const s = Math.min(el.offsetWidth, el.offsetHeight); if (s !== cropContainerSize.w) setCropContainerSize({ w: s, h: s }); } }} onMouseDown={handleCropMouseDown} style={{ position: 'relative', width: 'min(80vw, 80vh, 440px)', height: 'min(80vw, 80vh, 440px)', background: '#111', borderRadius: '12px', overflow: 'hidden', cursor: cropDragStart ? 'grabbing' : 'grab', userSelect: 'none' }}>
              {cropModal.src && <img ref={cropImgRef} src={cropModal.src} alt="crop" draggable={false} style={{ position: 'absolute', top: '50%', left: '50%', transform: `translate(calc(-50% + ${cropOffset.x}px), calc(-50% + ${cropOffset.y}px)) scale(${cropScale})`, transformOrigin: 'center center', width: cropImgNatural.w > 0 ? cropImgNatural.w : 'auto', height: 'auto', maxWidth: 'none', pointerEvents: 'none', userSelect: 'none' }} onLoad={(e) => { const img = e.target; const nw = img.naturalWidth; const nh = img.naturalHeight; setCropImgNatural({ w: nw, h: nh }); const size = cropContainerRef.current ? Math.min(cropContainerRef.current.offsetWidth, cropContainerRef.current.offsetHeight) : 400; setCropContainerSize({ w: size, h: size }); const cropRadius = Math.round(size * 0.4); const minScale = Math.max((cropRadius * 2) / nw, (cropRadius * 2) / nh); setCropScale(minScale); setCropOffset({ x: 0, y: 0 }); }} />}
              <svg style={{position:'absolute',top:0,left:0,width:'100%',height:'100%',pointerEvents:'none'}} xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <mask id="cropMask"><rect width="100%" height="100%" fill="white" /><circle cx="50%" cy="50%" r={`${Math.round(Math.min(cropContainerSize.w, cropContainerSize.h) * 0.4)}px`} fill="black" /></mask>
                </defs>
                <rect width="100%" height="100%" fill="rgba(0,0,0,0.58)" mask="url(#cropMask)" />
                <circle cx="50%" cy="50%" r={Math.round(Math.min(cropContainerSize.w, cropContainerSize.h) * 0.4)} fill="none" stroke="white" strokeWidth="2" />
              </svg>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:'10px',marginTop:'14px',width:'min(80vw,440px)'}}>
              <span style={{color:'rgba(255,255,255,0.5)',fontSize:'0.8rem'}}>−</span>
              <input type="range" min={1} max={100} step={1} value={Math.round((() => { const minS = Math.max((Math.round(Math.min(cropContainerSize.w,cropContainerSize.h)*0.8)) / Math.max(cropImgNatural.w,1), (Math.round(Math.min(cropContainerSize.w,cropContainerSize.h)*0.8)) / Math.max(cropImgNatural.h,1)); const maxS = minS * 8; return ((cropScale - minS) / (maxS - minS)) * 99 + 1; })())} onChange={(ev) => { const pct = (Number(ev.target.value) - 1) / 99; const minS = Math.max((Math.round(Math.min(cropContainerSize.w,cropContainerSize.h)*0.8)) / Math.max(cropImgNatural.w,1), (Math.round(Math.min(cropContainerSize.w,cropContainerSize.h)*0.8)) / Math.max(cropImgNatural.h,1)); const newScale = minS + pct * (minS * 7); setCropScale(newScale); setCropOffset((prev) => clampCropOffset(prev.x, prev.y, newScale)); }} style={{flex:1,accentColor:'white'}} />
              <span style={{color:'rgba(255,255,255,0.5)',fontSize:'0.8rem'}}>+</span>
            </div>
            <div style={{display:'flex',gap:'10px',marginTop:'16px'}}>
              <button type="button" onClick={() => setCropModal({ show: false, src: null })} style={{padding:'10px 22px',borderRadius:'8px',border:'1px solid rgba(255,255,255,0.2)',background:'transparent',color:'white',cursor:'pointer',fontWeight:'bold'}}>Cancelar</button>
              <button type="button" onClick={confirmCrop} disabled={uploading} style={{padding:'10px 28px',borderRadius:'8px',border:'none',background:'#2563eb',color:'white',cursor:'pointer',fontWeight:'bold',fontSize:'0.95rem'}}>{uploading ? 'A guardar...' : 'Confirmar Recorte'}</button>
            </div>
          </div>
        </ModalPortal>
      )}

      {notification.show && (
          <ModalPortal>
              <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:99999}}>
                  <div style={{background:'white', padding:'30px', borderRadius:'16px', width:'350px', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', animation: 'fadeIn 0.2s ease-out'}}>
                      <div style={{fontSize: '3.5rem', marginBottom: '15px'}}>{notification.type === 'success' ? '✅' : '❌'}</div>
                      <h3 style={{marginTop: 0, color: '#1e293b'}}>{notification.type === 'success' ? 'Sucesso!' : 'Atenção'}</h3>
                      <p style={{color: '#64748b', marginBottom: '25px', lineHeight: '1.5'}}>{notification.message}</p>
                      <button onClick={() => setNotification({ show: false, message: '', type: 'success' })} className="btn-primary" style={{width: '100%', padding: '12px', borderRadius: '8px', fontSize: '1rem', fontWeight: 'bold'}}>Fechar</button>
                  </div>
              </div>
          </ModalPortal>
      )}

      <style>{`
          .input-focus:focus { border-color: #3b82f6 !important; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }
          .hover-shadow:hover { transform: translateY(-1px); box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
          .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 10px; }
          @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}