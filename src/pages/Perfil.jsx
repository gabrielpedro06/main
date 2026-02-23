import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../services/supabase";
import { useAuth } from "../context/AuthContext";
import "./../styles/dashboard.css";

// Portal para os Modais/Pop-ups ficarem sempre por cima de tudo
const ModalPortal = ({ children }) => {
  return createPortal(children, document.body);
};

export default function Perfil() {
  const { user, userProfile, setUserProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // NOVO: Estado para o Pop-up de Notificação
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
    tipo_contrato: ""
  });
  
  const [newPassword, setNewPassword] = useState("");

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
        tipo_contrato: userProfile.tipo_contrato || ""
      });
    }
  }, [user, userProfile]);

  // --- MÁSCARA AUTOMÁTICA DO CARTÃO DE CIDADÃO (EX: 12345678 - 9 - ZZ - 0) ---
  const handleCCChange = (e) => {
      let value = e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
      
      if (value.length > 12) value = value.slice(0, 12);

      let formattedValue = value;
      if (value.length > 8) {
          formattedValue = value.slice(0, 8) + ' - ' + value.slice(8);
      }
      if (value.length > 9) {
          formattedValue = value.slice(0, 8) + ' - ' + value.slice(8, 9) + ' - ' + value.slice(9);
      }
      if (value.length > 11) {
          formattedValue = value.slice(0, 8) + ' - ' + value.slice(8, 9) + ' - ' + value.slice(9, 11) + ' - ' + value.slice(11);
      }

      setFormData({ ...formData, ncc: formattedValue });
  };

  // --- UPLOAD FOTO ---
  async function handleAvatarUpload(e) {
    try {
      setUploading(true);
      const file = e.target.files[0];
      if (!file) return;

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, avatar_url: publicUrl }));
      
      // Mostrar Pop-up de Sucesso
      setNotification({ show: true, message: "Foto carregada! Clica em 'Guardar Alterações' no fundo da página para finalizar.", type: "success" });

    } catch (error) {
      // Mostrar Pop-up de Erro
      setNotification({ show: true, message: "Erro no upload: " + error.message, type: "error" });
    } finally {
      setUploading(false);
    }
  }

  // --- GUARDAR DADOS ---
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
        
        // Mostrar Pop-up de Sucesso
        setNotification({ show: true, message: "Perfil atualizado com sucesso! 🎉", type: "success" });
        setNewPassword("");

    } catch (error) {
        // Mostrar Pop-up de Erro
        setNotification({ show: true, message: error.message, type: "error" });
    } finally {
        setLoading(false);
    }
  }

  const sectionTitleStyle = { color: '#1e293b', fontSize: '1rem', fontWeight: 'bold', marginTop: '25px', marginBottom: '15px', paddingBottom: '5px', borderBottom: '1px solid #e2e8f0' };
  const labelStyle = { fontSize: '0.8rem', color: '#64748b', marginBottom: '4px', display: 'block' };
  const inputStyle = { width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', marginBottom: '15px', boxSizing: 'border-box' };

  return (
    <div className="page-container">
      
      {/* Cabeçalho */}
      <div className="card" style={{marginBottom: '20px', display:'flex', alignItems:'center', gap:'15px'}}>
          <div style={{fontSize:'2rem'}}>👤</div>
          <div>
              <h2 style={{margin:0, color:'#1e293b'}}>O Meu Perfil</h2>
              <p style={{margin:0, color:'#64748b'}}>Gere a tua conta e dados pessoais.</p>
          </div>
      </div>

      <div className="factorial-wrapper">
          {/* Coluna Principal: Formulário */}
          <div className="main-column">
              <div className="card">

                  <form onSubmit={handleSave}>
                      
                      {/* FOTO E NOME DE EXIBIÇÃO */}
                      <div style={{display:'flex', alignItems:'center', gap:'20px', marginBottom:'20px'}}>
                          <div style={{width:'80px', height:'80px', borderRadius:'50%', overflow:'hidden', border:'3px solid #e2e8f0', background: '#f1f5f9', display:'flex', alignItems:'center', justifyContent:'center'}}>
                              {formData.avatar_url ? <img src={formData.avatar_url} alt="Avatar" style={{width:'100%', height:'100%', objectFit:'cover'}} /> : <span style={{fontSize:'2rem', color:'#cbd5e1'}}>📷</span>}
                          </div>
                          <div>
                              <label style={{cursor:'pointer', background:'#f1f5f9', padding:'8px 15px', borderRadius:'8px', fontSize:'0.9rem', fontWeight:'600', color:'#475569', border:'1px solid #cbd5e1'}}>
                                  {uploading ? "A carregar..." : "📸 Alterar Foto"}
                                  <input type="file" accept="image/*" hidden onChange={handleAvatarUpload} disabled={uploading} />
                              </label>
                          </div>
                      </div>

                      <div style={sectionTitleStyle}>Informação Básica</div>
                      
                      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px'}}>
                          <div>
                              <label style={labelStyle}>Nome de Exibição (Curto)</label>
                              <input type="text" value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} style={inputStyle} required />
                          </div>
                          <div>
                              <label style={labelStyle}>Email (Login)</label>
                              <input type="email" value={formData.email} disabled style={{...inputStyle, background: '#f1f5f9', color:'#94a3b8', cursor:'not-allowed'}} />
                          </div>
                      </div>

                      <label style={labelStyle}>Nome Completo (Oficial)</label>
                      <input type="text" value={formData.nome_completo} onChange={e => setFormData({...formData, nome_completo: e.target.value})} style={inputStyle} />

                      <div style={sectionTitleStyle}>Dados Pessoais</div>

                      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px'}}>
                          <div>
                              <label style={labelStyle}>Data de Nascimento</label>
                              <input type="date" value={formData.data_nascimento} onChange={e => setFormData({...formData, data_nascimento: e.target.value})} style={inputStyle} />
                          </div>
                          <div>
                              <label style={labelStyle}>Nacionalidade</label>
                              <input type="text" value={formData.nacionalidade} onChange={e => setFormData({...formData, nacionalidade: e.target.value})} style={inputStyle} />
                          </div>
                          <div>
                              <label style={labelStyle}>Telemóvel</label>
                              <input type="text" value={formData.telemovel} onChange={e => setFormData({...formData, telemovel: e.target.value})} style={inputStyle} />
                          </div>
                          <div>
                              <label style={labelStyle}>Concelho</label>
                              <input type="text" value={formData.concelho} onChange={e => setFormData({...formData, concelho: e.target.value})} style={inputStyle} />
                          </div>
                      </div>

                      <label style={labelStyle}>Morada Completa</label>
                      <input type="text" value={formData.morada} onChange={e => setFormData({...formData, morada: e.target.value})} style={inputStyle} />

                      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px'}}>
                          <div>
                              <label style={labelStyle}>Estado Civil</label>
                              <select value={formData.estado_civil} onChange={e => setFormData({...formData, estado_civil: e.target.value})} style={inputStyle}>
                                  <option value="">Selecione...</option>
                                  <option value="Solteiro">Solteiro</option>
                                  <option value="Casado">Casado</option>
                                  <option value="Divorciado">Divorciado</option>
                                  <option value="União Facto">União Facto</option>
                              </select>
                          </div>
                          <div>
                              <label style={labelStyle}>Sexo</label>
                              <select value={formData.sexo} onChange={e => setFormData({...formData, sexo: e.target.value})} style={inputStyle}>
                                  <option value="">Selecione...</option>
                                  <option value="Masculino">Masculino</option>
                                  <option value="Feminino">Feminino</option>
                                  <option value="Outro">Outro</option>
                              </select>
                          </div>
                          <div>
                              <label style={labelStyle}>Nr Dependentes</label>
                              <input type="number" value={formData.nr_dependentes} onChange={e => setFormData({...formData, nr_dependentes: e.target.value})} style={inputStyle} />
                          </div>
                      </div>

                      <div style={sectionTitleStyle}>Dados Fiscais e Civis (Privado)</div>
                      
                      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px'}}>
                          <div><label style={labelStyle}>NIF (Nº de Contribuinte)</label><input type="text" maxLength="9" value={formData.nif} onChange={e => setFormData({...formData, nif: e.target.value})} style={inputStyle} /></div>
                          <div><label style={labelStyle}>NISS (Segurança Social)</label><input type="text" maxLength="11" value={formData.niss} onChange={e => setFormData({...formData, niss: e.target.value})} style={inputStyle} /></div>
                      </div>

                      <div style={{display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '15px'}}>
                          <div>
                              <label style={labelStyle}>Cartão Cidadão (Ex: 12345678 / 9ZZ0)</label>
                              <input 
                                  type="text" 
                                  value={formData.ncc} 
                                  onChange={handleCCChange} 
                                  placeholder="00000000 - 0XX0"
                                  style={{...inputStyle, letterSpacing: '1px', fontFamily: 'monospace', fontWeight: 'bold', color: '#1e40af', background: '#f8fafc'}} 
                              />
                          </div>
                          <div>
                              <label style={labelStyle}>Data de Validade (CC)</label>
                              <input 
                                  type="date" 
                                  value={formData.validade_cc} 
                                  onChange={e => setFormData({...formData, validade_cc: e.target.value})} 
                                  style={inputStyle} 
                              />
                          </div>
                      </div>

                      <div style={sectionTitleStyle}>Dados da Empresa (Apenas Leitura)</div>
                      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px'}}>
                          <div>
                              <label style={labelStyle}>Empresa</label>
                              <input type="text" value={formData.empresa_interna} disabled style={{...inputStyle, background: '#f1f5f9', color:'#64748b'}} />
                          </div>
                          <div>
                              <label style={labelStyle}>Tipo de Contrato</label>
                              <input type="text" value={formData.tipo_contrato} disabled style={{...inputStyle, background: '#f1f5f9', color:'#64748b'}} />
                          </div>
                      </div>

                      <div style={{marginTop: '30px', paddingTop:'20px', borderTop:'1px solid #f1f5f9'}}>
                          <h4 style={{margin:'0 0 15px 0', color:'#1e293b'}}>Alterar Password</h4>
                          <label style={labelStyle}>Nova Password <small>(Deixa em branco para não alterar)</small></label>
                          <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Mínimo 6 caracteres" style={inputStyle} />
                      </div>

                      <button type="submit" className="btn-primary" style={{width:'100%', marginTop:'10px'}} disabled={loading}>
                          {loading ? "A guardar..." : "💾 Guardar Alterações"}
                      </button>
                  </form>
              </div>
          </div>

          {/* Coluna Lateral: Resumo */}
          <div className="side-column">
              <div className="card" style={{textAlign:'center', position: 'sticky', top: '20px'}}>
                  <h4 style={{margin:'0 0 10px 0'}}>A Minha Conta</h4>
                  <span className="badge badge-warning" style={{fontSize:'0.8rem'}}>{userProfile?.role?.toUpperCase()}</span>
                  <div style={{marginTop:'20px', fontSize:'0.9rem', color:'#64748b'}}>
                      <p>Membro desde:<br/><strong style={{color:'#334155'}}>{new Date(user?.created_at).toLocaleDateString('pt-PT')}</strong></p>
                  </div>
              </div>
          </div>
      </div>

      {/* --- POP-UP DE NOTIFICAÇÃO (SUCESSO / ERRO) --- */}
      {notification.show && (
          <ModalPortal>
              <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999}}>
                  <div style={{background:'white', padding:'30px', borderRadius:'16px', width:'350px', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'}}>
                      <div style={{fontSize: '3.5rem', marginBottom: '15px'}}>{notification.type === 'success' ? '✅' : '❌'}</div>
                      <h3 style={{marginTop: 0, color: '#1e293b'}}>{notification.type === 'success' ? 'Sucesso!' : 'Atenção'}</h3>
                      <p style={{color: '#64748b', marginBottom: '25px', lineHeight: '1.5'}}>{notification.message}</p>
                      <button onClick={() => setNotification({ show: false, message: '', type: 'success' })} className="btn-primary" style={{width: '100%'}}>Fechar</button>
                  </div>
              </div>
          </ModalPortal>
      )}

    </div>
  );
}