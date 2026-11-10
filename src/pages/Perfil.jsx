import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../services/supabase";
import { useAuth } from "../context/AuthContext";
import "./../styles/dashboard.css";
import "../styles/profile.css";
import FancySelect from "../components/FancySelect";

// Portal para os Modais/Pop-ups ficarem sempre por cima de tudo
const ModalPortal = ({ children }) => {
  return createPortal(children, document.body);
};

const Icons = {
  Car: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 16H9m10 0h3v-3.15a1 1 0 0 0-.84-.99L16 11l-2.7-3.6a2 2 0 0 0-1.6-.8H9.3a2 2 0 0 0-1.6.8L5 11l-5.16.86a1 1 0 0 0-.84.99V16h3m14 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM7 16a2 2 0 1 1-4 0 2 2 0 0 1 4 0z"></path></svg>,
  Trash: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>,
  Camera: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>,
  User: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  Heart: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z"/></svg>,
  Shield: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  Building: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01"/></svg>,
  Key: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  Lock: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  Mail: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/></svg>,
  Calendar: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  Briefcase: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>,
  Eye: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  EyeOff: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>,
  Check: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  Alert: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  X: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Plus: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
};

const PF_SECTIONS = [
  { id: 'basico', label: 'Informação básica', icon: 'User' },
  { id: 'pessoal', label: 'Dados pessoais', icon: 'Heart' },
  { id: 'fiscal', label: 'Fiscal e civil', icon: 'Shield' },
  { id: 'veiculos', label: 'Veículos', icon: 'Car' },
  { id: 'empresa', label: 'Empresa', icon: 'Building' },
  { id: 'seguranca', label: 'Segurança', icon: 'Key' },
];

const ESTADO_CIVIL_OPTIONS = ['Solteiro', 'Casado', 'Divorciado', 'União Facto'].map((v) => ({ value: v, label: v }));
const SEXO_OPTIONS = ['Masculino', 'Feminino', 'Outro'].map((v) => ({ value: v, label: v }));

// Converte o perfil guardado no estado do formulário (usado também para detetar alterações)
const profileToForm = (user, userProfile) => ({
  nome: userProfile?.nome || "",
  email: user?.email || "",
  email_pessoal: userProfile?.email_pessoal || "",
  data_nascimento: userProfile?.data_nascimento || "",
  avatar_url: userProfile?.avatar_url || "",
  nome_completo: userProfile?.nome_completo || "",
  telemovel: userProfile?.telemovel || "",
  morada: userProfile?.morada || "",
  nif: userProfile?.nif || "",
  niss: userProfile?.niss || "",
  ncc: userProfile?.ncc || "",
  validade_cc: userProfile?.validade_cc || "",
  nr_dependentes: userProfile?.nr_dependentes || 0,
  estado_civil: userProfile?.estado_civil || "",
  nacionalidade: userProfile?.nacionalidade || "Portuguesa",
  sexo: userProfile?.sexo || "",
  concelho: userProfile?.concelho || "",
  empresa_interna: userProfile?.empresa_interna || "",
  funcao: userProfile?.funcao || "",
  tipo_contrato: userProfile?.tipo_contrato || "",
  veiculos: Array.isArray(userProfile?.veiculos) ? userProfile.veiculos : [],
});

const Field = ({ label, hint, span, children }) => (
  <div className={`pf-field ${span === 2 ? 'is-wide' : ''}`}>
    <span className="pf-label">{label}{hint && <em>{hint}</em>}</span>
    {children}
  </div>
);

const SectionHead = ({ icon, title, subtitle, badge }) => {
  const Ico = Icons[icon];
  return (
    <div className="pf-section-head">
      <span className="pf-section-icon"><Ico size={18} /></span>
      <div>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {badge}
    </div>
  );
};

// Função auxiliar para verificar se está em localhost
const isLocalHost = (hostname) => !!(
  hostname === 'localhost' ||
  hostname === '[::1]' ||
  hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/)
);

// A função que foste buscar aos projetos!
const getProjectNotificationsApiBase = () => {
    const rawBase = import.meta.env.VITE_PROJECT_NOTIFICATIONS_API_BASE || import.meta.env.VITE_MARKETING_API_BASE || "";
    const trimmed = String(rawBase || "").trim().replace(/\/+$/, "");

    if (trimmed) return trimmed;

    if (typeof window !== "undefined" && isLocalHost(window.location.hostname)) {
        return null;
    }

    return "";
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
    email_pessoal: "",
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
    veiculos: []
  });
  
  const [newPassword, setNewPassword] = useState("");
  
  const [novoVeiculo, setNovoVeiculo] = useState({ matricula: "", marca: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [activeSection, setActiveSection] = useState('basico');

  // Destaca a secção visível na navegação lateral
  useEffect(() => {
    const els = PF_SECTIONS.map((sec) => document.getElementById(`pf-${sec.id}`)).filter(Boolean);
    if (!els.length || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver((entries) => {
      const hit = entries.filter((e) => e.isIntersecting).sort((x, y) => x.boundingClientRect.top - y.boundingClientRect.top)[0];
      if (hit) setActiveSection(hit.target.dataset.section);
    }, { rootMargin: '-20% 0px -65% 0px' });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

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
      setFormData(profileToForm(user, userProfile));
    }
  }, [user, userProfile]);

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
                email_pessoal: formData.email_pessoal,
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
                veiculos: formData.veiculos,
                updated_at: new Date()
            })
            .eq('id', user.id);

        if (error) throw error;

        // Se o user quiser mudar a password
        if (newPassword) {
            if (newPassword.length < 6) throw new Error("A password deve ter pelo menos 6 caracteres.");
            const { error: passError } = await supabase.auth.updateUser({ password: newPassword });
            if (passError) throw passError;
        }

        // ==========================================
        // LÓGICA DE NOTIFICAÇÃO AOS RH (USANDO A SUA API BREVO)
        // ==========================================
        // 1. Verificar se o número do CC ou a validade foram efetivamente alterados
        const ccMudou = formData.ncc !== (userProfile.ncc || "") || 
                        formData.validade_cc !== (userProfile.validade_cc || "");

        // 2. Se mudou, enviamos o email através do nosso backend
        if (ccMudou) {
            try {
                const apiBase = getProjectNotificationsApiBase(); 
                
                if (apiBase === null) {
                    console.info("Envio de email de CC desativado neste ambiente.");
                } else {
                    const colaboradorNome = formData.nome || formData.nome_completo || "Colaborador";
                    const endpoint = `${apiBase}/api/cc-alerts/send`; 
                    
                    const response = await fetch(endpoint, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            emailDestino: "rh@neomarca.eu", // Ajuste para o email correto dos RH
                            colaboradorNome: colaboradorNome,
                            dataValidade: formData.validade_cc || "N/A",
                            ncc: formData.ncc || "N/A"
                        }),
                    });

                    if (!response.ok) {
                        console.error("Falha na API ao enviar email de aviso aos RH.");
                    } else {
                        console.log("Email de aviso de atualização de CC enviado aos RH com sucesso!");
                    }
                }
            } catch (emailErr) {
                console.error("Falha de rede ao tentar enviar email aos RH:", emailErr);
            }
        }
        // ==========================================

        // Atualizar estado global
        setUserProfile(prev => ({ ...prev, ...formData }));
        setNotification({ show: true, message: "Perfil atualizado com sucesso! 🎉", type: "success" });
        setNewPassword("");

    } catch (error) {
        setNotification({ show: true, message: error.message, type: "error" });
    } finally {
        setLoading(false);
    }
  }

  // ==========================================
  // DERIVADOS PARA O NOVO LAYOUT
  // ==========================================
  const baseline = profileToForm(user, userProfile);
  const isDirty = Boolean(newPassword) || JSON.stringify(formData) !== JSON.stringify(baseline);
  const discardChanges = () => { setFormData(baseline); setNewPassword(""); };
  const set = (key) => (e) => setFormData((prev) => ({ ...prev, [key]: e.target.value }));

  const completionKeys = ['avatar_url', 'nome', 'nome_completo', 'email_pessoal', 'data_nascimento', 'telemovel', 'morada', 'concelho', 'nif', 'niss', 'ncc', 'validade_cc', 'estado_civil', 'sexo'];
  const completion = Math.round((completionKeys.filter((k) => String(formData[k] || '').trim()).length / completionKeys.length) * 100);

  const ccStatus = (() => {
      if (!formData.validade_cc) return { tone: 'muted', label: 'Sem validade indicada' };
      const d = new Date(`${formData.validade_cc}T00:00:00`);
      if (Number.isNaN(d.getTime())) return { tone: 'muted', label: 'Data inválida' };
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const days = Math.round((d - today) / 86400000);
      const fmt = d.toLocaleDateString('pt-PT');
      if (days < 0) return { tone: 'bad', label: `Expirou a ${fmt}` };
      if (days <= 60) return { tone: 'warn', label: `Expira em ${days} ${days === 1 ? 'dia' : 'dias'}` };
      return { tone: 'ok', label: `Válido até ${fmt}` };
  })();

  const pwdScore = (() => {
      if (!newPassword) return 0;
      let s = 0;
      if (newPassword.length >= 6) s++;
      if (newPassword.length >= 10) s++;
      if (/[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword)) s++;
      if (/\d/.test(newPassword) && /[^A-Za-z0-9]/.test(newPassword)) s++;
      return Math.max(1, s);
  })();
  const pwdLabels = ['', 'Fraca', 'Razoável', 'Boa', 'Forte'];

  const firstName = (formData.nome || formData.nome_completo || 'Colaborador').split(' ')[0];
  const initials = (formData.nome || formData.nome_completo || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  const memberSince = user?.created_at ? new Date(user.created_at).toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' }) : '—';

  const scrollToSection = (id) => {
      setActiveSection(id);
      document.getElementById(`pf-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="page-container pf-page">
      <form onSubmit={handleSave} autoComplete="off">

          {/* --- HERO --- */}
          <header className="pf-hero">
              <div className="pf-hero-glow" aria-hidden="true" />
              <div className="pf-avatar-wrap">
                  <div className={`pf-avatar ${uploading ? 'is-loading' : ''}`}>
                      {formData.avatar_url ? <img src={formData.avatar_url} alt="Foto de perfil" /> : <span>{initials}</span>}
                  </div>
                  <label className="pf-avatar-btn" title="Alterar foto">
                      {uploading ? <span className="pf-spinner" /> : <Icons.Camera size={16} />}
                      <input type="file" accept="image/*" hidden onChange={handleAvatarUpload} disabled={uploading} />
                  </label>
              </div>

              <div className="pf-hero-main">
                  <span className="pf-eyebrow">O meu perfil</span>
                  <h1>Olá, {firstName}</h1>
                  <div className="pf-hero-meta">
                      {userProfile?.role && <span className="pf-chip pf-chip-role">{String(userProfile.role).toUpperCase()}</span>}
                      {formData.funcao && <span className="pf-chip"><Icons.Briefcase size={13} />{formData.funcao}</span>}
                      <span className="pf-chip"><Icons.Mail size={13} />{formData.email}</span>
                      <span className="pf-chip"><Icons.Calendar size={13} />Desde {memberSince}</span>
                  </div>
              </div>

              <div className="pf-hero-ring" style={{ '--p': completion }} title="Perfil preenchido">
                  <svg viewBox="0 0 44 44" aria-hidden="true">
                      <circle cx="22" cy="22" r="19" className="pf-ring-track" />
                      <circle cx="22" cy="22" r="19" className="pf-ring-fill" pathLength="100" />
                  </svg>
                  <div className="pf-ring-text"><strong>{completion}%</strong><span>completo</span></div>
              </div>
          </header>

          <div className="pf-layout">
              {/* --- NAVEGAÇÃO DAS SECÇÕES --- */}
              <nav className="pf-nav" aria-label="Secções do perfil">
                  {PF_SECTIONS.map((sec) => {
                      const Ico = Icons[sec.icon];
                      return (
                          <button key={sec.id} type="button" className={`pf-nav-item ${activeSection === sec.id ? 'is-active' : ''}`} onClick={() => scrollToSection(sec.id)}>
                              <span className="pf-nav-icon"><Ico size={16} /></span>
                              <span>{sec.label}</span>
                              {sec.id === 'veiculos' && formData.veiculos.length > 0 && <span className="pf-nav-count">{formData.veiculos.length}</span>}
                          </button>
                      );
                  })}
              </nav>

              <div className="pf-sections">
                  {/* BÁSICO */}
                  <section id="pf-basico" data-section="basico" className="pf-card">
                      <SectionHead icon="User" title="Informação básica" subtitle="Como apareces para a equipa." />
                      <div className="pf-grid">
                          <Field label="Nome de exibição"><input type="text" value={formData.nome} onChange={set('nome')} required placeholder="Ex: Gabriel" /></Field>
                          <Field label="Email de login" hint="Não pode ser alterado aqui">
                              <div className="pf-locked"><Icons.Lock size={13} />{formData.email}</div>
                          </Field>
                          <Field label="Nome completo (oficial)" span={2}><input type="text" value={formData.nome_completo} onChange={set('nome_completo')} placeholder="Como está no Cartão de Cidadão" /></Field>
                          <Field label="Email pessoal" span={2}><input type="email" value={formData.email_pessoal} onChange={set('email_pessoal')} placeholder="nome@exemplo.com" /></Field>
                      </div>
                  </section>

                  {/* PESSOAL */}
                  <section id="pf-pessoal" data-section="pessoal" className="pf-card">
                      <SectionHead icon="Heart" title="Dados pessoais" subtitle="Contactos e informação para os RH." />
                      <div className="pf-grid">
                          <Field label="Data de nascimento"><input type="date" value={formData.data_nascimento} onChange={set('data_nascimento')} /></Field>
                          <Field label="Nacionalidade"><input type="text" value={formData.nacionalidade} onChange={set('nacionalidade')} /></Field>
                          <Field label="Telemóvel"><input type="tel" value={formData.telemovel} onChange={set('telemovel')} placeholder="9xx xxx xxx" /></Field>
                          <Field label="Concelho"><input type="text" value={formData.concelho} onChange={set('concelho')} /></Field>
                          <Field label="Morada completa" span={2}><input type="text" value={formData.morada} onChange={set('morada')} placeholder="Rua, nº, código postal, localidade" /></Field>
                      </div>
                      <div className="pf-grid pf-grid-3">
                          <Field label="Estado civil">
                              <FancySelect value={formData.estado_civil} onChange={(v) => setFormData((prev) => ({ ...prev, estado_civil: v }))} options={ESTADO_CIVIL_OPTIONS} placeholder="Selecionar..." menuWidth={240} className="pf-select" ariaLabel="Estado civil" />
                          </Field>
                          <Field label="Sexo">
                              <FancySelect value={formData.sexo} onChange={(v) => setFormData((prev) => ({ ...prev, sexo: v }))} options={SEXO_OPTIONS} placeholder="Selecionar..." menuWidth={240} className="pf-select" ariaLabel="Sexo" />
                          </Field>
                          <Field label="Nº de dependentes">
                              <div className="pf-stepper">
                                  <button type="button" onClick={() => setFormData((prev) => ({ ...prev, nr_dependentes: Math.max(0, Number(prev.nr_dependentes || 0) - 1) }))} aria-label="Menos">−</button>
                                  <input type="number" min="0" value={formData.nr_dependentes} onChange={set('nr_dependentes')} />
                                  <button type="button" onClick={() => setFormData((prev) => ({ ...prev, nr_dependentes: Number(prev.nr_dependentes || 0) + 1 }))} aria-label="Mais">+</button>
                              </div>
                          </Field>
                      </div>
                  </section>

                  {/* FISCAL */}
                  <section id="pf-fiscal" data-section="fiscal" className="pf-card">
                      <SectionHead icon="Shield" title="Dados fiscais e civis" subtitle="Privado — só tu e os RH vêem isto." badge={<span className="pf-private"><Icons.Lock size={12} />Privado</span>} />
                      <div className="pf-grid">
                          <Field label="NIF"><input type="text" inputMode="numeric" maxLength="9" value={formData.nif} onChange={set('nif')} className="pf-mono" placeholder="000000000" /></Field>
                          <Field label="NISS"><input type="text" inputMode="numeric" maxLength="11" value={formData.niss} onChange={set('niss')} className="pf-mono" placeholder="00000000000" /></Field>
                      </div>

                      <div className="pf-cc">
                          <div className="pf-cc-card" aria-hidden="true">
                              <div className="pf-cc-top"><span className="pf-cc-flag" /><span>CARTÃO DE CIDADÃO</span></div>
                              <div className="pf-cc-number">{formData.ncc || '00000000 - 0 - ZZ - 0'}</div>
                              <div className="pf-cc-bottom">
                                  <span>{(formData.nome_completo || formData.nome || 'Nome').toUpperCase()}</span>
                                  <span>{formData.validade_cc ? new Date(`${formData.validade_cc}T00:00:00`).toLocaleDateString('pt-PT') : '--/--/----'}</span>
                              </div>
                          </div>
                          <div className="pf-cc-fields">
                              <Field label="Nº do Cartão de Cidadão" hint="Ex: 12345678 - 9 - ZZ - 0">
                                  <input type="text" value={formData.ncc} onChange={handleCCChange} className="pf-mono" placeholder="12345678 - 9 - ZZ - 0" />
                              </Field>
                              <Field label="Data de validade">
                                  <input type="date" value={formData.validade_cc} onChange={set('validade_cc')} />
                              </Field>
                              <span className={`pf-status is-${ccStatus.tone}`}><span className="pf-status-dot" />{ccStatus.label}</span>
                              <p className="pf-note">Ao alterar o cartão ou a validade, os RH são avisados automaticamente.</p>
                          </div>
                      </div>
                  </section>

                  {/* VEÍCULOS */}
                  <section id="pf-veiculos" data-section="veiculos" className="pf-card">
                      <SectionHead icon="Car" title="Veículos e deslocações" subtitle="Usados rapidamente nos pedidos de Km's." />

                      {formData.veiculos.length > 0 ? (
                          <div className="pf-vehicles">
                              {formData.veiculos.map((v, idx) => (
                                  <div key={`${v.matricula}-${idx}`} className="pf-vehicle" style={{ '--k': idx }}>
                                      <span className="pf-plate"><span className="pf-plate-eu">P</span><span className="pf-plate-num">{v.matricula}</span></span>
                                      <span className="pf-vehicle-name">{v.marca || 'Sem descrição'}</span>
                                      <button type="button" className="pf-icon-btn is-danger" onClick={() => handleRemoveVeiculo(idx)} title="Remover veículo" aria-label="Remover veículo"><Icons.Trash size={15} /></button>
                                  </div>
                              ))}
                          </div>
                      ) : (
                          <div className="pf-empty"><Icons.Car size={20} /><span>Ainda não tens veículos registados.</span></div>
                      )}

                      <div className="pf-vehicle-add">
                          <label className="pf-plate pf-plate-input">
                              <span className="pf-plate-eu">P</span>
                              <input
                                  type="text"
                                  placeholder="AA-00-AA"
                                  value={novoVeiculo.matricula}
                                  onChange={(e) => setNovoVeiculo({ ...novoVeiculo, matricula: formatarMatricula(e.target.value) })}
                                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddVeiculo(); } }}
                                  aria-label="Matrícula"
                              />
                          </label>
                          <input
                              type="text"
                              className="pf-input"
                              placeholder="Marca / modelo — ex: Renault Clio branco"
                              value={novoVeiculo.marca}
                              onChange={(e) => setNovoVeiculo({ ...novoVeiculo, marca: e.target.value })}
                              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddVeiculo(); } }}
                              aria-label="Marca e modelo"
                          />
                          <button type="button" className="pf-btn pf-btn-soft" onClick={handleAddVeiculo} disabled={novoVeiculo.matricula.length < 6}>
                              <Icons.Plus size={15} /> Adicionar
                          </button>
                      </div>
                  </section>

                  {/* EMPRESA */}
                  <section id="pf-empresa" data-section="empresa" className="pf-card">
                      <SectionHead icon="Building" title="Dados da empresa" subtitle="Geridos pelos RH." badge={<span className="pf-private"><Icons.Lock size={12} />Só leitura</span>} />
                      <div className="pf-info-tiles">
                          <div className="pf-info"><span>Empresa</span><strong>{formData.empresa_interna || '—'}</strong></div>
                          <div className="pf-info"><span>Função</span><strong>{formData.funcao || '—'}</strong></div>
                          <div className="pf-info"><span>Tipo de contrato</span><strong>{formData.tipo_contrato || '—'}</strong></div>
                          <div className="pf-info"><span>Membro desde</span><strong>{user?.created_at ? new Date(user.created_at).toLocaleDateString('pt-PT') : '—'}</strong></div>
                      </div>
                  </section>

                  {/* SEGURANÇA */}
                  <section id="pf-seguranca" data-section="seguranca" className="pf-card">
                      <SectionHead icon="Key" title="Segurança" subtitle="Deixa em branco para manter a password atual." />
                      <Field label="Nova password" hint="Mínimo 6 caracteres">
                          <div className="pf-password">
                              <input
                                  type={showPassword ? 'text' : 'password'}
                                  id="pwd_nova_user"
                                  name="pwd_nova_user"
                                  autoComplete="new-password"
                                  value={newPassword}
                                  onChange={(e) => setNewPassword(e.target.value)}
                                  placeholder="••••••••"
                              />
                              <button type="button" className="pf-icon-btn" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? 'Esconder password' : 'Mostrar password'}>
                                  {showPassword ? <Icons.EyeOff size={16} /> : <Icons.Eye size={16} />}
                              </button>
                          </div>
                      </Field>
                      {newPassword && (
                          <div className={`pf-strength s-${pwdScore}`}>
                              <div className="pf-strength-bars"><span /><span /><span /><span /></div>
                              <span>{newPassword.length < 6 ? 'Demasiado curta' : pwdLabels[pwdScore]}</span>
                          </div>
                      )}
                  </section>
              </div>
          </div>

          {/* --- BARRA DE GUARDAR --- */}
          <div className={`pf-savebar ${isDirty ? 'is-visible' : ''}`} aria-hidden={!isDirty}>
              <span className="pf-savebar-dot" />
              <span className="pf-savebar-text">Tens alterações por guardar</span>
              <button type="button" className="pf-btn pf-btn-ghost" onClick={discardChanges} disabled={loading} tabIndex={isDirty ? 0 : -1}>Descartar</button>
              <button type="submit" className="pf-btn pf-btn-primary" disabled={loading} tabIndex={isDirty ? 0 : -1}>
                  {loading ? <><span className="pf-spinner" />A guardar...</> : <><Icons.Check size={15} />Guardar alterações</>}
              </button>
          </div>
      </form>

      {cropModal.show && (
        <ModalPortal>
          <div className="pf-crop-overlay" onMouseMove={handleCropMouseMove} onMouseUp={handleCropMouseUp} onMouseLeave={handleCropMouseUp}>
            <div className="pf-crop">
              <div className="pf-crop-head">
                <div>
                  <h3>Recortar foto</h3>
                  <p>Arrasta para mover · scroll para aproximar</p>
                </div>
                <button type="button" className="pf-icon-btn" onClick={() => setCropModal({ show: false, src: null })} aria-label="Fechar"><Icons.X size={16} /></button>
              </div>
              <div ref={(el) => { cropContainerRef.current = el; if (el) { const s = Math.min(el.offsetWidth, el.offsetHeight); if (s !== cropContainerSize.w) setCropContainerSize({ w: s, h: s }); } }} onMouseDown={handleCropMouseDown} className="pf-crop-stage" style={{ cursor: cropDragStart ? 'grabbing' : 'grab' }}>
                {cropModal.src && <img ref={cropImgRef} src={cropModal.src} alt="crop" draggable={false} style={{ position: 'absolute', top: '50%', left: '50%', transform: `translate(calc(-50% + ${cropOffset.x}px), calc(-50% + ${cropOffset.y}px)) scale(${cropScale})`, transformOrigin: 'center center', width: cropImgNatural.w > 0 ? cropImgNatural.w : 'auto', height: 'auto', maxWidth: 'none', pointerEvents: 'none', userSelect: 'none' }} onLoad={(e) => { const img = e.target; const nw = img.naturalWidth; const nh = img.naturalHeight; setCropImgNatural({ w: nw, h: nh }); const size = cropContainerRef.current ? Math.min(cropContainerRef.current.offsetWidth, cropContainerRef.current.offsetHeight) : 400; setCropContainerSize({ w: size, h: size }); const cropRadius = Math.round(size * 0.4); const minScale = Math.max((cropRadius * 2) / nw, (cropRadius * 2) / nh); setCropScale(minScale); setCropOffset({ x: 0, y: 0 }); }} />}
                <svg style={{position:'absolute',top:0,left:0,width:'100%',height:'100%',pointerEvents:'none'}} xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <mask id="cropMask"><rect width="100%" height="100%" fill="white" /><circle cx="50%" cy="50%" r={`${Math.round(Math.min(cropContainerSize.w, cropContainerSize.h) * 0.4)}px`} fill="black" /></mask>
                  </defs>
                  <rect width="100%" height="100%" fill="rgba(0,0,0,0.58)" mask="url(#cropMask)" />
                  <circle cx="50%" cy="50%" r={Math.round(Math.min(cropContainerSize.w, cropContainerSize.h) * 0.4)} fill="none" stroke="white" strokeWidth="2" />
                </svg>
              </div>
              <div className="pf-crop-zoom">
                <span>−</span>
                <input type="range" min={1} max={100} step={1} value={Math.round((() => { const minS = Math.max((Math.round(Math.min(cropContainerSize.w,cropContainerSize.h)*0.8)) / Math.max(cropImgNatural.w,1), (Math.round(Math.min(cropContainerSize.w,cropContainerSize.h)*0.8)) / Math.max(cropImgNatural.h,1)); const maxS = minS * 8; return ((cropScale - minS) / (maxS - minS)) * 99 + 1; })())} onChange={(ev) => { const pct = (Number(ev.target.value) - 1) / 99; const minS = Math.max((Math.round(Math.min(cropContainerSize.w,cropContainerSize.h)*0.8)) / Math.max(cropImgNatural.w,1), (Math.round(Math.min(cropContainerSize.w,cropContainerSize.h)*0.8)) / Math.max(cropImgNatural.h,1)); const newScale = minS + pct * (minS * 7); setCropScale(newScale); setCropOffset((prev) => clampCropOffset(prev.x, prev.y, newScale)); }} />
                <span>+</span>
              </div>
              <div className="pf-crop-actions">
                <button type="button" className="pf-btn pf-btn-ghost" onClick={() => setCropModal({ show: false, src: null })}>Cancelar</button>
                <button type="button" className="pf-btn pf-btn-primary" onClick={confirmCrop} disabled={uploading}>{uploading ? 'A guardar...' : 'Usar esta foto'}</button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {notification.show && (
          <ModalPortal>
              <div className="pf-dialog-overlay" onClick={(e) => { if (e.target === e.currentTarget) setNotification({ show: false, message: '', type: 'success' }); }}>
                  <div className={`pf-dialog is-${notification.type}`} role="alertdialog">
                      <div className="pf-dialog-icon">{notification.type === 'success' ? <Icons.Check size={26} /> : <Icons.Alert size={26} />}</div>
                      <h3>{notification.type === 'success' ? 'Feito!' : 'Atenção'}</h3>
                      <p>{notification.message}</p>
                      <button type="button" autoFocus onClick={() => setNotification({ show: false, message: '', type: 'success' })} className="pf-btn pf-btn-primary pf-btn-block">Fechar</button>
                  </div>
              </div>
          </ModalPortal>
      )}
    </div>
  );
}
