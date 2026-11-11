import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import "../styles/entidades.css";
import * as XLSX from "xlsx";
import { useNavigate, useLocation } from "react-router-dom"; 
import { supabase } from "../services/supabase";
import { useAuth } from "../context/AuthContext";
import TimerSwitchModal from "../components/TimerSwitchModal";
import StopTimerNoteModal from "../components/StopTimerNoteModal";
import { resolveActiveTimerMeta } from "../utils/activeTimerResolver";
import { applyStopStatusUpdateForLogTarget } from "../utils/taskTimerLifecycle";
import "./../styles/dashboard.css";

// --- ÍCONES SVG PROFISSIONAIS (SaaS Premium) ---
const Icons = {
  Search: ({ size = 14, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>,
  Users: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>,
  Building: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><path d="M9 22v-4h6v4"></path><path d="M8 6h.01"></path><path d="M16 6h.01"></path><path d="M12 6h.01"></path><path d="M12 10h.01"></path><path d="M12 14h.01"></path><path d="M16 10h.01"></path><path d="M16 14h.01"></path><path d="M8 10h.01"></path><path d="M8 14h.01"></path></svg>,
  MapPin: ({ size = 14, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>,
  User: ({ size = 14, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>,
  ExternalLink: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>,
  Edit: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>,
  Trash: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>,
  Restore: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>,
  Archive: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg>,
  Eye: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>,
  Plus: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>,
  Save: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>,
  Copy: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>,
  Close: ({ size = 18, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>,
  ClipboardList: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><path d="M12 11h4"></path><path d="M12 16h4"></path><path d="M8 11h.01"></path><path d="M8 16h.01"></path></svg>,
  Activity: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>,
  FileText: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>,
  Diamond: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3h12l4 6-10 13L2 9Z"></path><path d="M11 3 8 9l4 13 4-13-3-6"></path><path d="M2 9h20"></path></svg>,
  Lock: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>,
  Rocket: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"></path><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"></path><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"></path><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"></path></svg>,
  Calendar: ({ size = 14, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>,
  ArrowRight: ({ size = 14, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>,
  Alert: ({ size = 40, color = "#ef4444" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>,
  Inbox: ({ size = 48, color = "#cbd5e1" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"></polyline><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path></svg>,
  Phone: ({ size = 14, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>,
  Mail: ({ size = 14, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>,
  Play: ({ size = 12, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>,
  Stop: ({ size = 12, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none"><rect x="6" y="6" width="12" height="12" rx="2" ry="2"></rect></svg>,
  Landmark: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="22" x2="21" y2="22"></line><line x1="6" y1="18" x2="6" y2="11"></line><line x1="10" y1="18" x2="10" y2="11"></line><line x1="14" y1="18" x2="14" y2="11"></line><line x1="18" y1="18" x2="18" y2="11"></line><polygon points="12 2 20 7 4 7"></polygon></svg>
};

Icons.Check = ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>;
Icons.EyeOff = ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"></path><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"></path><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>;
Icons.Download = ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>;
Icons.Grid = ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"></rect><rect x="14" y="3" width="7" height="7" rx="1.5"></rect><rect x="3" y="14" width="7" height="7" rx="1.5"></rect><rect x="14" y="14" width="7" height="7" rx="1.5"></rect></svg>;
Icons.ListIcon = ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>;

const ModalPortal = ({ children }) => {
  return createPortal(children, document.body);
};

const ToggleSwitch = ({ checked, onChange, disabled = false, labelOn = "Sim", labelOff = "Não" }) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => {
        if (disabled) return;
        onChange(!checked);
      }}
      disabled={disabled}
      style={{
        width: '100%',
        border: '1px solid #cbd5e1',
        borderRadius: '12px',
        background: checked ? 'var(--color-bgSecondary)' : '#fff',
        padding: '10px 12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        color: checked ? 'var(--color-btnPrimaryDark)' : '#475569',
        fontWeight: '700',
        boxSizing: 'border-box',
        opacity: disabled ? 0.7 : 1,
      }}
    >
      <span style={{fontSize: '0.92rem'}}>{checked ? labelOn : labelOff}</span>
      <span
        aria-hidden="true"
        style={{
          width: '44px',
          height: '26px',
          borderRadius: '999px',
          background: checked ? 'var(--color-btnPrimary)' : '#cbd5e1',
          position: 'relative',
          flexShrink: 0,
          transition: 'background 0.18s ease',
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: '3px',
            left: checked ? '22px' : '3px',
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            background: '#fff',
            boxShadow: '0 1px 4px rgba(15, 23, 42, 0.2)',
            transition: 'left 0.18s ease',
          }}
        />
      </span>
    </button>
  );
};

const CARGO_OPTIONS = [
  "Gerente",
  "Contabilista Certificado(CC)",
  "Presidente",
  "Diretor(a)",
  "Técnico(a) de Contabilidade",
  "Responsável de Operações",
  "Comercial",
  "Sócio(a)",
  "Gestor(a) de Projetos",
  "Administrativo(a)",
  "Diretor(a) Financeiro",
  "Administrador(a)",
  "Marketing",
  "Coordenador(a) de Formação",
  "Formador(a) Interno",
];

const OUTRO_CARGO_VALUE = "__outro__";

const isKnownCargo = (cargo) => CARGO_OPTIONS.includes(String(cargo || ""));

const getCargoSelectValue = (cargo) => {
  const value = String(cargo || "").trim();
  if (!value) return "";
  return isKnownCargo(value) ? value : OUTRO_CARGO_VALUE;
};

export default function Clientes() {
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [podeVerAcessos, setPodeVerAcessos] = useState(false);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [statusTab, setStatusTab] = useState("ativos");
  const [viewMode, setViewMode] = useState("cards");
  const [notification, setNotification] = useState(null);
  const [activeLog, setActiveLog] = useState(null);
  const [activeLogTitle, setActiveLogTitle] = useState("");
  const [activeLogRoute, setActiveLogRoute] = useState("/dashboard/tarefas");
  const [stopNoteModal, setStopNoteModal] = useState({ show: false });
  const [timerSwitchModal, setTimerSwitchModal] = useState({ show: false, message: "", pending: null });
  const [projectTimerModal, setProjectTimerModal] = useState({
    show: false,
    loading: false,
    project: null,
    atividades: [],
    selectedAtividadeId: "",
    selectedTaskId: ""
  });

  const [showModal, setShowModal] = useState(false);
  const [isClosingPanel, setIsClosingPanel] = useState(false);
  const [editId, setEditId] = useState(null); 
  const [isViewOnly, setIsViewOnly] = useState(false);
  const [activeTab, setActiveTab] = useState("geral");
  const [uploading, setUploading] = useState(false);
  const [isFetchingCaeByNif, setIsFetchingCaeByNif] = useState(false);

  const cropImgRef = useRef(null);
  const cropContainerRef = useRef(null);
  const [cropModal, setCropModal] = useState({ show: false, src: null });
  const [cropScale, setCropScale] = useState(1);
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 });
  const [cropDragStart, setCropDragStart] = useState(null);
  const [cropImgNatural, setCropImgNatural] = useState({ w: 1, h: 1 });
  const [cropContainerSize, setCropContainerSize] = useState({ w: 400, h: 400 });

  const [showAddContacto, setShowAddContacto] = useState(false);
  const [showAddMorada, setShowAddMorada] = useState(false);
  const [showAddCae, setShowAddCae] = useState(false);
  const [showAddAcesso, setShowAddAcesso] = useState(false);
  const [revealedPass, setRevealedPass] = useState({});
  const [isExporting, setIsExporting] = useState(false);

  // FORMULÁRIO GERAL 
  const initialForm = {
    marca: "", sigla: "", nif: "", entidade: "", website: "",
    objeto_social: "", plano: "Standard",
    certidao_permanente: "", validade_certidao: "",
    rcbe: "", validade_rcbe: "", ativo: true,
    eh_empresa_consultora: false,
    eh_organismo: false,
    tem_cursos: false,
    avatar_url: "",
    termos_gerais: ""
  };
  const [form, setForm] = useState(initialForm);

  const [contactos, setContactos] = useState([]);
  const [moradas, setMoradas] = useState([]);
  const [acessos, setAcessos] = useState([]);
  const [tiposAcessosCatalogo, setTiposAcessosCatalogo] = useState([]);
  const [caes, setCaes] = useState([]);
  const [pendingAutoCaes, setPendingAutoCaes] = useState([]);
  const [pendingAutoMorada, setPendingAutoMorada] = useState(null);
  
  // Configurações de Entidade (textos internos)
  
  // Histórico de Projetos do Cliente
  const [projetosCliente, setProjetosCliente] = useState([]);

  // Modais Confirmação Global
  const [confirmDialog, setConfirmDialog] = useState({ show: false, message: '', confirmText: '', onConfirm: null, isDanger: false });

  // SUB-FORMS INICIAIS
  const initContacto = { nome_contacto: "", email: "", telefone: "", cargo: "", faz_propostas: false };
  const initMorada = { morada: "", localidade: "", codigo_postal: "", concelho: "", distrito: "", regiao: "", notas: "" };
  const initAcesso = { tipo_acesso_id: "", utilizador: "", codigo: "" };
  const initCae = { codigo: "", descricao: "", principal: false };
  const initialEntidadeConfig = {
    texto_compromisso: "",
    texto_esperamos_que_corresponda: "",
    texto_para_aprovacao: "",
    signatario_nome: "",
    signatario_cargo: "",
    signatario_telefone: "",
    signatario_email: "",
    texto_apresentacao_empresa: "",
    texto_documentos_empresa: "",
    texto_documentos_incentivo: "",
    texto_demonstracao_financiamento: "",
    texto_como_ajudamos: "",
    texto_processo_trabalho: "",
    texto_plano_pagamento: "",
    texto_exclusoes: "",
    texto_nota_honorarios: "",
    texto_apresentacao_empresa_formacao: "",
    texto_areas_formacao: "",
    texto_proposta_formacao: "",
    texto_descricao_servico: "",
    texto_obrigacoes_consultora: "",
    texto_obrigacoes_cliente: "",
    texto_condicoes_realizacao: "",
    texto_coordenacao_formacao: "",
    imagem_certificacoes: "",
  };

  const [entidadeConfig, setEntidadeConfig] = useState(initialEntidadeConfig);

  const [novoContacto, setNovoContacto] = useState(initContacto);
  const [isOutroCargo, setIsOutroCargo] = useState(false);
  const [novaMorada, setNovaMorada] = useState(initMorada);
  const [novoAcesso, setNovoAcesso] = useState(initAcesso);

  const normalizeParceirosIds = (rawParceiros) => {
    if (Array.isArray(rawParceiros)) return rawParceiros.map(id => String(id));

    if (typeof rawParceiros === "string") {
      const raw = rawParceiros.trim();
      if (!raw) return [];

      // Handles Postgres array literal format: {id1,id2}
      if (raw.startsWith("{") && raw.endsWith("}")) {
        return raw
          .slice(1, -1)
          .split(",")
          .map(item => item.replace(/^"|"$/g, "").trim())
          .filter(Boolean);
      }

      // Handles JSON string format: ["id1","id2"]
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed.map(id => String(id));
      } catch (err) {
        return [];
      }
    }

    return [];
  };
  const [novoCae, setNovoCae] = useState(initCae);

  useEffect(() => {
    fetchClientes();
  }, []);

  useEffect(() => {
    if (user?.id) checkActiveLog();
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    const refresh = () => checkActiveLog();
    const intervalId = setInterval(refresh, 45000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [user?.id]);

  useEffect(() => {
    let cancelled = false;

    const resolveActiveTitle = async () => {
      if (!activeLog) {
        if (!cancelled) {
          setActiveLogTitle("");
          setActiveLogRoute("/dashboard/tarefas");
        }
        return;
      }

      const timerMeta = await resolveActiveTimerMeta(supabase, activeLog);
      if (cancelled) return;

      setActiveLogTitle(timerMeta.title || "Tempo a decorrer...");
      setActiveLogRoute(timerMeta.route || "/dashboard/tarefas");
    };

    resolveActiveTitle();

    return () => {
      cancelled = true;
    };
  }, [activeLog]);

  useEffect(() => {
    const el = cropContainerRef.current;
    if (!cropModal.show || !el) return;
    const onWheel = (e) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.1 : 0.9;
      setCropScale((prev) => {
        const minScale = Math.max(
          (cropContainerSize.w * 0.8) / cropImgNatural.w,
          (cropContainerSize.h * 0.8) / cropImgNatural.h
        );
        return Math.max(minScale, Math.min(prev * factor, minScale * 8));
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [cropModal.show, cropContainerSize, cropImgNatural]);

  const showToast = (message, type = 'success') => {
      setNotification({ message, type });
      setTimeout(() => setNotification(null), 3500);
  };

  async function checkActiveLog() {
    if (!user?.id) {
      setActiveLog(null);
      return;
    }

    const { data, error } = await supabase
      .from("task_logs")
      .select("*")
      .eq("user_id", user.id)
      .is("end_time", null)
      .order("start_time", { ascending: false })
      .limit(1);

    if (error) {
      setActiveLog(null);
      return;
    }

    setActiveLog(Array.isArray(data) ? data[0] || null : null);
  }

  async function stopLogById(logToStop, stopNote = "") {
    if (!logToStop) return null;
    const diffMins = Math.max(1, Math.floor((new Date() - new Date(logToStop.start_time)) / 60000));
    const stopTimestamp = new Date().toISOString();
    const note = typeof stopNote === "string" ? stopNote.trim() : "";
    const payload = { end_time: stopTimestamp, duration_minutes: diffMins };
    if (note) payload.observacoes = note;

    let { error } = await supabase.from("task_logs").update(payload).eq("id", logToStop.id);

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

  function openStopNoteModal(e) {
    if (e?.stopPropagation) e.stopPropagation();
    if (!activeLog) return;
    setStopNoteModal({ show: true });
  }

  function closeStopNoteModal() {
    setStopNoteModal({ show: false });
  }

  async function confirmStopWithNote(note, _shouldComplete, statusMeta) {
    setStopNoteModal({ show: false });
    if (!activeLog) return;

    const logToStop = activeLog;
    const diffMins = await stopLogById(logToStop, note);
    if (diffMins === null) return;

    await applyStopStatusUpdateForLogTarget(supabase, logToStop, statusMeta);

    setActiveLog(null);
    showToast(`Tempo registado: ${diffMins} min.`, "success");
  }

  function closeProjectTimerModal() {
    setProjectTimerModal({
      show: false,
      loading: false,
      project: null,
      atividades: [],
      selectedAtividadeId: "",
      selectedTaskId: ""
    });
  }

  async function openProjectTimerModal(project, event) {
    if (event?.stopPropagation) event.stopPropagation();
    if (!project?.id) return;

    setProjectTimerModal({
      show: true,
      loading: true,
      project,
      atividades: [],
      selectedAtividadeId: "",
      selectedTaskId: ""
    });

    const { data, error } = await supabase
      .from("atividades")
      .select("id, titulo, estado, ordem, created_at, tarefas(id, titulo, estado, ordem, created_at)")
      .eq("projeto_id", project.id)
      .order("ordem", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      showToast("Erro ao carregar atividades do projeto.", "error");
      setProjectTimerModal((prev) => ({ ...prev, loading: false }));
      return;
    }

    const atividadesOrdenadas = (data || []).map((atividade) => ({
      ...atividade,
      tarefas: [...(atividade.tarefas || [])].sort((a, b) => {
        if (a.ordem != null && b.ordem != null && a.ordem !== b.ordem) return a.ordem - b.ordem;
        const da = a.created_at ? new Date(a.created_at).getTime() : 0;
        const db = b.created_at ? new Date(b.created_at).getTime() : 0;
        return da - db;
      })
    }));

    const atividadeInicial = atividadesOrdenadas.find((a) => a.estado !== "concluido") || atividadesOrdenadas[0] || null;

    setProjectTimerModal((prev) => ({
      ...prev,
      loading: false,
      atividades: atividadesOrdenadas,
      selectedAtividadeId: atividadeInicial?.id || "",
      selectedTaskId: ""
    }));
  }

  async function startTimerDirect({ targetId, targetType, projectId }) {
    if (!user?.id || !targetId) return false;

    const payload = {
      user_id: user.id,
      projeto_id: projectId,
      start_time: new Date().toISOString()
    };

    if (targetType === "task") payload.task_id = targetId;
    else payload.atividade_id = targetId;

    const { data, error } = await supabase.from("task_logs").insert([payload]).select().single();

    if (error) {
      showToast("Erro ao iniciar o cronómetro.", "error");
      return false;
    }

    setActiveLog(data);
    showToast("Cronómetro iniciado com sucesso.", "success");
    return true;
  }

  async function handleStartTimerFromProjectSelection() {
    if (projectTimerModal.project?.estado === "concluido") {
      showToast("Este projeto está concluído e não permite iniciar cronómetro.", "warning");
      return;
    }

    const atividadeSelecionada = projectTimerModal.atividades.find(
      (atividade) => String(atividade.id) === String(projectTimerModal.selectedAtividadeId)
    );

    if (!atividadeSelecionada) {
      showToast("Escolhe uma atividade para iniciar o cronómetro.", "warning");
      return;
    }

    const tarefaSelecionada = (atividadeSelecionada.tarefas || []).find(
      (tarefa) => String(tarefa.id) === String(projectTimerModal.selectedTaskId)
    );

    if (tarefaSelecionada?.estado === "concluido") {
      showToast("A tarefa selecionada está concluída e não permite iniciar cronómetro.", "warning");
      return;
    }

    if (!tarefaSelecionada && atividadeSelecionada.estado === "concluido") {
      showToast("A atividade selecionada está concluída e não permite iniciar cronómetro.", "warning");
      return;
    }

    const pending = {
      targetId: tarefaSelecionada?.id || atividadeSelecionada.id,
      targetType: tarefaSelecionada ? "task" : "activity",
      projectId: projectTimerModal.project?.id,
      targetLabel: tarefaSelecionada?.titulo || atividadeSelecionada.titulo || "item selecionado"
    };

    const isSameTarget =
      (pending.targetType === "task" && String(activeLog?.task_id || "") === String(pending.targetId)) ||
      (pending.targetType === "activity" && String(activeLog?.atividade_id || "") === String(pending.targetId));

    if (isSameTarget) {
      showToast("Este cronómetro já está em execução.", "info");
      return;
    }

    if (activeLog) {
      setTimerSwitchModal({
        show: true,
        message: `Já tens um cronómetro ativo em "${activeLogTitle || "Tempo a decorrer..."}". Pretendes parar o atual para iniciar "${pending.targetLabel}"?`,
        pending
      });
      return;
    }

    const started = await startTimerDirect(pending);
    if (started) closeProjectTimerModal();
  }

  async function confirmTimerSwitch() {
    const pending = timerSwitchModal.pending;
    if (!pending) return;

    const diffMins = await stopLogById(activeLog);
    if (diffMins === null) return;

    showToast(`Cronómetro anterior terminado (${diffMins} min).`, "success");
    const started = await startTimerDirect(pending);
    if (started) closeProjectTimerModal();

    setTimerSwitchModal({ show: false, message: "", pending: null });
  }

  function cancelTimerSwitch() {
    setTimerSwitchModal({ show: false, message: "", pending: null });
    showToast("Mantivemos o cronómetro atual em execução.", "info");
  }

  function handleAvatarUpload(e) {
    if (isViewOnly) return;
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setCropModal({ show: true, src: ev.target.result });
    reader.readAsDataURL(file);
    e.target.value = "";
  }

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

  function handleCropMouseUp() {
    setCropDragStart(null);
  }

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
      if (!img) throw new Error("Imagem não encontrada.");

      const { w: cw, h: ch } = cropContainerSize;
      const cropRadius = Math.round(Math.min(cw, ch) * 0.4);
      const cropDiameter = cropRadius * 2;

      const imgDispW = cropImgNatural.w * cropScale;
      const imgDispH = cropImgNatural.h * cropScale;
      const imgLeft = cw / 2 + cropOffset.x - imgDispW / 2;
      const imgTop = ch / 2 + cropOffset.y - imgDispH / 2;

      const circleLeft = cw / 2 - cropRadius;
      const circleTop = ch / 2 - cropRadius;

      const sx = (circleLeft - imgLeft) / cropScale;
      const sy = (circleTop - imgTop) / cropScale;
      const sSize = cropDiameter / cropScale;

      const OUTPUT = 400;
      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT;
      canvas.height = OUTPUT;
      canvas.getContext("2d").drawImage(img, sx, sy, sSize, sSize, 0, 0, OUTPUT, OUTPUT);

      const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
      if (!blob) throw new Error("Não foi possível gerar a imagem.");

      const fileName = `clientes/${editId || "novo"}-${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, blob, { contentType: "image/jpeg", upsert: true });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(fileName);
      setForm((prev) => ({ ...prev, avatar_url: publicUrl }));
      setCropModal({ show: false, src: null });
      showToast("Foto carregada com sucesso. Guarda para finalizar.", "success");
    } catch (error) {
      showToast(`Erro no upload da foto: ${error.message}`, "error");
    } finally {
      setUploading(false);
    }
  }

  const extractNifApiErrorMessage = (data) => {
    if (!data || typeof data !== "object") return null;

    const candidates = [data.error, data.message, data.msg, data.detail, data.status];
    const found = candidates.find(
      (value) => typeof value === "string" && value.trim().length > 0
    );

    return found ? found.trim() : null;
  };

  const normalizeCaeList = (caeValue) => {
    if (Array.isArray(caeValue)) return caeValue.map((item) => String(item).trim()).filter(Boolean);
    if (caeValue === null || caeValue === undefined) return [];
    const single = String(caeValue).trim();
    return single ? [single] : [];
  };

  const sanitizeNif = (value) => String(value || "").replace(/\D/g, "").slice(0, 9);

  const extractCaesFromFunctionPayload = (payload) => {
    if (!payload || !Array.isArray(payload.caes)) return [];

    const dedup = new Map();

    payload.caes.forEach((item) => {
      const codigo = String(typeof item === "string" ? item : item?.codigo || "").trim();
      if (!/^\d{5}$/.test(codigo)) return;

      const descricao = typeof item === "object" && item?.descricao
        ? String(item.descricao).trim()
        : null;

      if (!dedup.has(codigo)) {
        dedup.set(codigo, { codigo, descricao });
      }
    });

    return [...dedup.values()];
  };

  async function fetchCaesFromSicae(nif) {
    const nifSanitizado = sanitizeNif(nif);
    if (nifSanitizado.length !== 9) return [];

    try {
      const response = await fetch(`/api/sicae-caes?nif=${encodeURIComponent(nifSanitizado)}`);
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || payload?.ok === false) {
        const message = payload?.error || "Falha ao consultar CAEs no endpoint /api/sicae-caes.";
        throw new Error(message);
      }

      return extractCaesFromFunctionPayload(payload);
    } catch (apiError) {
      const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
      if (isLocalhost) {
        throw new Error(
          apiError?.message || "A API local /api/sicae-caes não está disponível. Inicia `npm run dev:server`."
        );
      }

      const { data, error } = await supabase.functions.invoke("fetch-caes-sicae", {
        body: { nif: nifSanitizado }
      });

      if (error) {
        throw new Error(error.message || apiError?.message || "Falha ao consultar CAEs no SICAE.");
      }

      return extractCaesFromFunctionPayload(data);
    }
  }

  async function fetchCatalogDescriptionsByCodes(codes) {
    const dedup = [...new Set((codes || []).map((code) => String(code || "").trim()).filter((code) => /^\d{5}$/.test(code)))];
    if (dedup.length === 0) return [];

    const response = await fetch(`/api/cae-descriptions?codes=${encodeURIComponent(dedup.join(","))}`);
    const payload = await response.json().catch(() => ({}));

    if (!response.ok || payload?.ok === false) {
      throw new Error(payload?.error || "Falha ao consultar descrições de CAE no catálogo.");
    }

    return extractCaesFromFunctionPayload(payload);
  }

  async function handleFetchCaesByNif() {
    const nif = sanitizeNif(form.nif);

    if (nif.length !== 9) {
      showToast("Indica um NIF válido (9 dígitos) para procurar CAEs.", "warning");
      return;
    }

    try {
      setIsFetchingCaeByNif(true);
      showToast("A consultar CAEs no SICAE...", "info");

      const caesSicae = await fetchCaesFromSicae(nif);
      if (caesSicae.length === 0) {
        showToast("Não foram encontrados CAEs para este NIF no SICAE.", "warning");
        return;
      }

      const codigosExistentes = new Set(
        [
          ...caes.map((item) => String(item?.codigo || "").trim()),
          ...pendingAutoCaes.map((item) => String(item?.codigo || "").trim())
        ].filter(Boolean)
      );

      let updated = 0;
      if (editId) {
        const codigosParaAtualizar = [
          ...caes.map((item) => item?.codigo),
          ...caesSicae.map((item) => item?.codigo)
        ];

        let catalogCaes = [];
        try {
          catalogCaes = await fetchCatalogDescriptionsByCodes(codigosParaAtualizar);
        } catch (_catalogError) {
          catalogCaes = [];
        }

        const mergedLookup = [...caesSicae, ...catalogCaes];
        const result = await updateExistingCaeDescriptions(editId, mergedLookup);
        updated = result.updated || 0;
      }

      const novosCaesBase = caesSicae.filter((item) => !codigosExistentes.has(item.codigo));
      if (novosCaesBase.length === 0) {
        if (updated > 0) {
          showToast(`${updated} descrição(ões) de CAE existentes foram atualizadas.`, "success");
        } else {
          showToast("Os CAEs encontrados já estão associados a esta Entidade.", "info");
        }
        return;
      }

      const principalJaExiste = caes.some((item) => Boolean(item?.principal));
      const novosCaes = novosCaesBase.map((item, index) => ({
        codigo: item.codigo,
        descricao: item.descricao || (index === 0 ? "Atividade principal importada do SICAE" : "Atividade secundária importada do SICAE"),
        principal: !principalJaExiste && index === 0
      }));

      if (editId) {
        const { inserted, skipped } = await insertAutoCaesForCliente(editId, novosCaes);
        if (inserted > 0) {
          showToast(`${inserted} CAE importados e guardados automaticamente.`, "success");
        } else {
          showToast("Os CAEs encontrados já estavam associados a esta Entidade.", "info");
        }
        if (updated > 0) {
          showToast(`${updated} descrição(ões) de CAE existentes foram atualizadas.`, "success");
        }
        if (skipped > 0 && inserted > 0) {
          showToast(`${skipped} CAE já existiam e foram ignorados.`, "info");
        }
        return;
      }

      setPendingAutoCaes((prev) => [...prev, ...novosCaes]);
      setNovoCae(novosCaes[0]);
      setShowAddCae(true);

      showToast(`Foram encontrados ${novosCaesBase.length} novos CAE no SICAE.`, "success");
    } catch (error) {
      showToast(error?.message || "Falha ao procurar CAEs no SICAE.", "warning");
    } finally {
      setIsFetchingCaeByNif(false);
    }
  }

  const buildSiglaFromTitle = (title) => {
    if (!title || typeof title !== "string") return "";

    const stopWords = new Set(["de", "da", "do", "das", "dos", "e", "a", "o", "the", "and"]);
    const words = title
      .replace(/[.,;:()]/g, " ")
      .split(/\s+/)
      .map((word) => word.trim())
      .filter(Boolean)
      .filter((word) => !stopWords.has(word.toLowerCase()));

    if (!words.length) return "";
    const sigla = words.slice(0, 5).map((word) => word[0]).join("").toUpperCase();
    return sigla.slice(0, 20);
  };

  const buildObjetoSocialFromRecord = (record, currentValue) => {
    if (currentValue?.trim()) return currentValue;

    const parts = [];
    if (record?.activity) parts.push(record.activity);

    const nature = record?.structure?.nature;
    const capital = record?.structure?.capital;
    const currency = record?.structure?.capital_currency;
    if (nature || capital) {
      const details = [
        nature ? `Natureza jurídica: ${nature}` : null,
        capital ? `Capital social: ${capital}${currency ? ` ${currency}` : ""}` : null
      ].filter(Boolean);

      if (details.length) parts.push(details.join(" | "));
    }

    if (record?.start_date) parts.push(`Início de atividade: ${record.start_date}`);

    return parts.join("\n\n").trim();
  };

  async function findExistingClienteByNif(nif) {
    if (!nif) return null;

    const { data, error } = await supabase
      .from("clientes")
      .select("id, marca, nif")
      .eq("nif", nif)
      .limit(1);

    if (error) throw error;
    return data?.[0] || null;
  }

  async function fetchClientes() {
    setLoading(true);
    
    try {
      // 1. Vamos buscar os clientes e contactos de forma simples e segura
      const { data: cliData, error: errCli } = await supabase
          .from("clientes")
          .select("*, contactos_cliente(nome_contacto, email, telefone)")
          .order("created_at", { ascending: false });

      // 2. Vamos buscar as moradas
      const { data: morData } = await supabase
          .from("moradas_cliente")
          .select("cliente_id, localidade, concelho");

      // 3. Vamos buscar TODOS os projetos de forma independente para cruzar os dados
      const { data: projData, error: errProj } = await supabase
          .from("projetos")
          .select("id, estado, cliente_id, parceiros_ids");

      if (!errCli && cliData) {
          const clientesComDados = cliData.map(c => {
              // Filtrar moradas deste cliente
              const moradas = morData?.filter(m => m.cliente_id === c.id) || [];
              
              // Mapear e cruzar os projetos deste cliente (seja como dono ou parceiro)
              const projetosDoCliente = (projData || []).filter(p => {
                const isMainClient = String(p.cliente_id || "") === String(c.id);
                
                // Trata o PostgreSQL array literal ou JSON string dos parceiros
                let parceiros = [];
                if (Array.isArray(p.parceiros_ids)) {
                  parceiros = p.parceiros_ids.map(String);
                } else if (typeof p.parceiros_ids === "string") {
                  try {
                    parceiros = JSON.parse(p.parceiros_ids).map(String);
                  } catch {
                    parceiros = p.parceiros_ids.replace(/[{}]/g, "").split(",").map(id => id.trim());
                  }
                }
                const isPartner = parceiros.includes(String(c.id));
                
                return isMainClient || isPartner;
              });

              return { 
                ...c, 
                moradas_cliente: moradas, 
                projetos: projetosDoCliente, // Injeta os projetos calculados com segurança aqui
                ativo: c.ativo !== false 
              }; 
          });
          
          setClientes(clientesComDados);
      } else if (errCli) {
          console.error("Erro ao carregar clientes:", errCli);
          showToast("Erro ao carregar lista de Entidades", "error");
      }
    } catch (err) {
      console.error("Erro inesperado no fetchClientes:", err);
    } finally {
      setLoading(false);
    }
  }

  // --- INTEGRAÇÃO NIF.PT + SICAE ---
  async function handleNifChange(e) {
    const nifDigitado = e.target.value.replace(/\D/g, "");
    setForm((prev) => ({ ...prev, nif: nifDigitado }));

    if (nifDigitado.length < 9) {
      setPendingAutoCaes([]);
      setPendingAutoMorada(null);
    }

    if (nifDigitado.length === 9 && !isViewOnly) {
      try {
        const clienteExistente = await findExistingClienteByNif(nifDigitado);
        if (clienteExistente && String(clienteExistente.id) !== String(editId || "")) {
          showToast(
            `Já existe uma Entidade com este NIF: ${clienteExistente.marca || "Sem nome"}.`,
            "warning"
          );
          return;
        }

        showToast("A consultar dados no NIF.pt e SICAE...", "info");

        let caesSicae = [];
        try {
          caesSicae = await fetchCaesFromSicae(nifDigitado);
        } catch (sicaeError) {
          showToast(`SICAE indisponível: ${sicaeError.message}`, "warning");
        }

        const params = new URLSearchParams({ json: "1", q: nifDigitado });
        const nifApiKey = (import.meta.env.VITE_NIFPT_KEY || "9beb59d324c1477245e04e0b5988bdd2").trim();
        if (nifApiKey) params.set("key", nifApiKey);

        let record = null;
        try {
          const response = await fetch(`/nif-api/?${params.toString()}`);
          if (!response.ok) throw new Error("Erro na comunicação com a API.");

          const contentType = response.headers.get("content-type") || "";
          if (!contentType.includes("application/json")) {
            throw new Error("Resposta inválida do serviço NIF. Verifica o proxy /nif-api.");
          }

          const data = await response.json();
          const apiErrorMessage = extractNifApiErrorMessage(data);
          if (apiErrorMessage) {
            showToast(`NIF.pt: ${apiErrorMessage}`, "warning");
          } else if (data?.credits?.left?.day === 0) {
            showToast("NIF.pt indisponível: limite diário de consultas atingido.", "warning");
          } else {
            if (data.records && data.records[nifDigitado]) record = data.records[nifDigitado];
            else if (data[nifDigitado]) record = data[nifDigitado];
          }
        } catch (nifPtError) {
          showToast(`NIF.pt indisponível: ${nifPtError.message}`, "warning");
        }

        if (record || caesSicae.length > 0) {
          const recordData = record || {};
          const sicaeDescricaoByCodigo = new Map(
            caesSicae
              .filter((item) => item?.codigo)
              .map((item) => [item.codigo, item.descricao || null])
          );
          const caeList = [...new Set([
            ...caesSicae.map((item) => item.codigo),
            ...normalizeCaeList(recordData.cae)
          ])];
          const posto = recordData.place || {};
          const postal4 = posto.pc4 || recordData.pc4;
          const postal3 = posto.pc3 || recordData.pc3;
          const codigoPostal = postal4 && postal3 ? `${postal4}-${postal3}` : "";
          const generatedSigla = buildSiglaFromTitle(recordData.title);
          const website = recordData.contacts?.website || "";
          const phone = recordData.contacts?.phone || "";
          const email = recordData.contacts?.email || "";
          const mainAddress = posto.address || recordData.address || "";
          const locality = posto.city || recordData.city || recordData.geo?.parish || "";
          const county = recordData.geo?.county || "";
          const region = recordData.geo?.region || "";

          setForm(prev => ({
            ...prev,
            entidade: recordData.title || prev.entidade || "",
            marca: prev.marca || recordData.title || "", 
            sigla: prev.sigla || generatedSigla || "",
            website: website || prev.website || "",
            objeto_social: buildObjetoSocialFromRecord(recordData, prev.objeto_social)
          }));

          if (mainAddress || codigoPostal || locality || county || region) {
             setPendingAutoMorada({
               morada: mainAddress,
               codigo_postal: codigoPostal,
               localidade: locality,
               concelho: county,
               distrito: region,
               regiao: region,
               notas: "Sede"
             });

             setNovaMorada({
                 morada: mainAddress,
                 codigo_postal: codigoPostal,
                 localidade: locality,
                 concelho: county,
                 distrito: region,
                 regiao: region,
                 notas: "Sede"
             });
             setShowAddMorada(true);
           } else {
             setPendingAutoMorada(null);
          }

          if (caeList.length > 0) {
             const [principal, ...restantes] = caeList;
             const caesParaGuardar = caeList.map((codigo, index) => ({
                codigo,
                descricao: sicaeDescricaoByCodigo.get(codigo)
                  || (index === 0
                    ? (recordData.activity ? recordData.activity.split('.')[0] : "Atividade Principal")
                    : "Atividade secundária importada do SICAE/NIF.pt"),
                principal: index === 0
             }));

             if (editId) {
               const lookupCaes = caesParaGuardar.map((item) => ({
                 codigo: item.codigo,
                 descricao: item.descricao,
               }));
               const { updated } = await updateExistingCaeDescriptions(editId, lookupCaes);
               const { inserted, skipped } = await insertAutoCaesForCliente(editId, caesParaGuardar);
               setPendingAutoCaes([]);
               if (inserted > 0) {
                 showToast(`${inserted} CAE importados e guardados automaticamente.`, "success");
               }
               if (updated > 0) {
                 showToast(`${updated} descrição(ões) de CAE existentes foram atualizadas.`, "success");
               }
               if (skipped > 0) {
                 showToast(`${skipped} CAE já existiam e foram ignorados.`, "info");
               }
             } else {
               setPendingAutoCaes(caesParaGuardar);

               setNovoCae({
                   codigo: principal,
                   descricao: sicaeDescricaoByCodigo.get(principal)
                     || (restantes.length > 0
                       ? `Atividade principal. Outros CAE: ${restantes.join(", ")}`
                       : (recordData.activity ? recordData.activity.split('.')[0] : "Atividade Principal")),
                   principal: true
               });
               setShowAddCae(true);
             }
           } else {
             setPendingAutoCaes([]);
          }

          if (email || phone) {
             setNovoContacto({
                 nome_contacto: "Contacto Geral",
                 cargo: "",
                 email,
                 telefone: phone
             });
             setShowAddContacto(true);
          }

          if (record) {
            showToast(`Dados pré-preenchidos com sucesso${caeList.length > 1 ? ` (${caeList.length} CAE detetados)` : ""}!`, "success");
          } else if (caeList.length > 0) {
            showToast(`Foram detetados ${caeList.length} CAE no SICAE. Completa os restantes dados manualmente.`, "info");
          }
        } else {
          showToast("NIF não encontrado na base do NIF.pt/SICAE.", "warning");
        }
      } catch (err) {
        showToast(err?.message || "Falha na consulta automática. Preenche manualmente.", "warning");
      }
    }
  }

// --- PREENCHIMENTO AUTOMÁTICO DE MORADA POR CÓDIGO POSTAL ---
  async function fetchMoradaByCodigoPostal(cp) {
      if (!cp || cp.length < 8) return; 
      
      showToast("A procurar localização pelo Código Postal...", "info");
      
      try {
          // TENTATIVA 1: API Nacional (GeoAPI) - Super precisa
          const resGeo = await fetch(`https://json.geoapi.pt/cp/${cp}`);
          
          if (resGeo.ok) {
              const dataGeo = await resGeo.json();
              if (dataGeo && dataGeo.concelho && dataGeo.distrito) {
                  setNovaMorada(prev => ({
                      ...prev,
                      morada: prev.morada || dataGeo.rua || "", 
                      localidade: dataGeo.localidade || prev.localidade,
                      concelho: dataGeo.concelho || prev.concelho,
                      distrito: dataGeo.distrito || prev.distrito,
                      regiao: dataGeo.regiao || dataGeo.distrito || prev.regiao
                  }));
                  showToast("Morada preenchida com precisão!", "success");
                  return; // Sucesso, não precisa de ir ao Plano B
              }
          }
      } catch (err) {
          console.warn("GeoAPI falhou ou não respondeu, a tentar OpenStreetMap...", err);
      }

      // TENTATIVA 2: Plano B (OpenStreetMap) - Caso a GeoAPI falhe ou atinja limite
      try {
          const resOSM = await fetch(`https://nominatim.openstreetmap.org/search?postalcode=${cp}&country=Portugal&format=json&addressdetails=1`);
          const dataOSM = await resOSM.json();
          
          if (dataOSM && dataOSM.length > 0) {
              const address = dataOSM[0].address;
              setNovaMorada(prev => ({
                  ...prev,
                  morada: address.road || prev.morada, 
                  localidade: address.village || address.suburb || address.hamlet || address.town || prev.localidade,
                  concelho: address.city || address.town || address.municipality || prev.concelho,
                  distrito: address.county || address.state_district || address.state || prev.distrito,
                  regiao: address.region || address.state || address.county || prev.regiao
              }));
              showToast("Morada preenchida (via mapa global)! ", "success");
          } else {
              showToast("Código postal não encontrado.", "warning");
          }
      } catch (error) {
          console.error("Erro no fallback OSM:", error);
          showToast("Erro ao comunicar com o serviço de mapas.", "error");
      }
  }

  // --- PREENCHIMENTO AUTOMÁTICO DE DISTRITO E REGIÃO PELO CONCELHO ---
  async function fetchDadosByConcelho(concelhoNome) {
      if (!concelhoNome || concelhoNome.trim().length < 3) return;

      // Se o distrito e a região já estiverem preenchidos, não vale a pena gastar pedidos à API
      if (novaMorada.distrito && novaMorada.regiao) return;

      showToast("A procurar detalhes do concelho...", "info");
      
      try {
          // TENTATIVA 1: GeoAPI (Procura direta pelo município)
          const resGeo = await fetch(`https://json.geoapi.pt/municipio/${encodeURIComponent(concelhoNome)}`);
          if (resGeo.ok) {
              const dataGeo = await resGeo.json();
              if (dataGeo && dataGeo.distrito) {
                  setNovaMorada(prev => ({
                      ...prev,
                      distrito: prev.distrito || dataGeo.distrito,
                      regiao: prev.regiao || dataGeo.regiao || dataGeo.distrito
                  }));
                  showToast("Distrito e Região preenchidos! 📍", "success");
                  return; // Sucesso, sai da função
              }
          }
      } catch (err) {
          console.warn("GeoAPI falhou na busca por concelho, a tentar OpenStreetMap...", err);
      }

      // TENTATIVA 2: OpenStreetMap (Plano B)
      try {
          const resOSM = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(concelhoNome)},+Portugal&format=json&addressdetails=1`);
          const dataOSM = await resOSM.json();
          
          if (dataOSM && dataOSM.length > 0) {
              const address = dataOSM[0].address;
              setNovaMorada(prev => ({
                  ...prev,
                  distrito: prev.distrito || address.state_district || address.county || address.state || "",
                  regiao: prev.regiao || address.region || address.state || ""
              }));
              showToast("Distrito e Região preenchidos!", "success");
          }
      } catch (error) {
          console.error("Erro no fallback do concelho:", error);
      }
  }

  // --- LÓGICA DE FILTRAGEM DOS CARTÕES ---
  let processedClientes = [...clientes];

  if (statusTab === "ativos") {
    // Mostra ativos que NÃO são organismos
    processedClientes = processedClientes.filter((c) => c.ativo === true && !c.eh_organismo);
  } else if (statusTab === "organismos") {
    // Mostra apenas organismos ativos
    processedClientes = processedClientes.filter((c) => c.eh_organismo === true && c.ativo === true);
  } else {
    // Arquivados
    processedClientes = processedClientes.filter((c) => c.ativo === false);
  }

  if (busca) {
      const textoBusca = busca.toLowerCase();
      processedClientes = processedClientes.filter(c => {
        // Busca nos campos diretos do cliente
        const matchCliente = 
          c.marca?.toLowerCase().includes(textoBusca) ||
          c.sigla?.toLowerCase().includes(textoBusca) ||
          c.nif?.includes(textoBusca) ||
          c.entidade?.toLowerCase().includes(textoBusca);
        
        // Busca também nos nomes de contactos
        const matchContactos = c.contactos_cliente?.some(contacto =>
          contacto.nome_contacto?.toLowerCase().includes(textoBusca)
        );
        
        return matchCliente || matchContactos;
      });
  }

  processedClientes.sort((a, b) => (a.marca || "").localeCompare(b.marca || ""));

  // --- ABRIR MODAIS ---
  function handleNovo() {
    setIsClosingPanel(false);
    setEditId(null); setIsViewOnly(false);
    setForm(initialForm);
    setContactos([]); setMoradas([]); setAcessos([]); setCaes([]); setProjetosCliente([]);
    setEntidadeConfig(initialEntidadeConfig); // Reset configurações
    setPendingAutoCaes([]);
    setPendingAutoMorada(null);
    setPodeVerAcessos(true);
    fecharTodosSubForms();
    setActiveTab("geral");
    setShowModal(true);
  }

  function handleEdit(cliente) {
    setEditId(cliente.id); setIsViewOnly(false);
    loadClienteData(cliente);
  }

  function handleView(cliente) {
    setEditId(cliente.id); setIsViewOnly(true);
    loadClienteData(cliente);
  }

  function loadClienteData(cliente) {
    setIsClosingPanel(false);
    const safeData = { ...initialForm };
    Object.keys(initialForm).forEach(key => {
        safeData[key] = cliente[key] !== null && cliente[key] !== undefined ? cliente[key] : initialForm[key];
    });
    setForm(safeData);
    setPendingAutoCaes([]);
    setPendingAutoMorada(null);

    fecharTodosSubForms();
    setActiveTab("geral");
    setShowModal(true);
    fetchSubDados(cliente.id);
    verificarPermissaoAcessos(cliente.id); 
  }

  useEffect(() => {
    const clienteIdFromState = location.state?.openClienteId;
    if (!clienteIdFromState || clientes.length === 0) return;

    const clienteToOpen = clientes.find(
      (cliente) => String(cliente.id) === String(clienteIdFromState)
    );

    if (clienteToOpen) {
      handleView(clienteToOpen);
    }

    navigate(location.pathname, { replace: true, state: {} });
  }, [location.state, clientes, navigate]);

  function closeClientePanel() {
    if (isClosingPanel) return;
    setIsClosingPanel(true);
    setTimeout(() => {
      setShowModal(false);
      setIsClosingPanel(false);
      setEntidadeConfig(initialEntidadeConfig); // Reset configurações
    }, 360);
  }

  async function persistPendingAutoCaes(clienteId) {
    if (!clienteId || pendingAutoCaes.length === 0) {
      return { inserted: 0, skipped: 0 };
    }

    const { data: existentes, error: erroExistentes } = await supabase
      .from("caes_cliente")
      .select("codigo")
      .eq("cliente_id", clienteId);

    if (erroExistentes) throw erroExistentes;

    const codigosExistentes = new Set(
      (existentes || [])
        .map((item) => String(item.codigo || "").trim())
        .filter(Boolean)
    );

    const caesParaInserir = pendingAutoCaes
      .filter((item) => item?.codigo)
      .filter((item) => !codigosExistentes.has(String(item.codigo).trim()))
      .map((item) => ({
        cliente_id: clienteId,
        codigo: String(item.codigo).trim(),
        descricao: item.descricao || null,
        principal: Boolean(item.principal)
      }));

    if (caesParaInserir.length === 0) {
      return { inserted: 0, skipped: pendingAutoCaes.length };
    }

    const { data: inseridos, error: erroInsercao } = await supabase
      .from("caes_cliente")
      .upsert(caesParaInserir, { onConflict: "cliente_id,codigo", ignoreDuplicates: true })
      .select();

    if (erroInsercao) throw erroInsercao;

    if (inseridos?.length) {
      setCaes((prev) => [...prev, ...inseridos]);
    }

    return {
      inserted: inseridos?.length || 0,
      skipped: pendingAutoCaes.length - (inseridos?.length || 0)
    };
  }

  async function insertAutoCaesForCliente(clienteId, caesCandidatos) {
    if (!clienteId || !Array.isArray(caesCandidatos) || caesCandidatos.length === 0) {
      return { inserted: 0, skipped: 0 };
    }

    const { data: existentes, error: erroExistentes } = await supabase
      .from("caes_cliente")
      .select("codigo, principal")
      .eq("cliente_id", clienteId);

    if (erroExistentes) throw erroExistentes;

    const codigosExistentes = new Set(
      (existentes || [])
        .map((item) => String(item.codigo || "").trim())
        .filter(Boolean)
    );

    const principalJaExiste = (existentes || []).some((item) => Boolean(item.principal));
    const base = caesCandidatos
      .filter((item) => item?.codigo)
      .map((item) => ({
        codigo: String(item.codigo).trim(),
        descricao: item.descricao || null,
        principal: Boolean(item.principal),
      }))
      .filter((item) => item.codigo && !codigosExistentes.has(item.codigo));

    const caesParaInserir = principalJaExiste
      ? base.map((item) => ({ ...item, principal: false }))
      : base;

    if (caesParaInserir.length === 0) {
      return { inserted: 0, skipped: caesCandidatos.length };
    }

    const { data: inseridos, error: erroInsercao } = await supabase
      .from("caes_cliente")
      .upsert(
        caesParaInserir.map((item) => ({ ...item, cliente_id: clienteId })),
        { onConflict: "cliente_id,codigo", ignoreDuplicates: true }
      )
      .select();

    if (erroInsercao) throw erroInsercao;

    if (inseridos?.length) {
      setCaes((prev) => [...prev, ...inseridos]);
    }

    return {
      inserted: inseridos?.length || 0,
      skipped: caesCandidatos.length - (inseridos?.length || 0),
    };
  }

  async function updateExistingCaeDescriptions(clienteId, lookupCaes) {
    if (!clienteId || !Array.isArray(lookupCaes) || lookupCaes.length === 0) {
      return { updated: 0 };
    }

    const descricaoByCodigo = new Map(
      lookupCaes
        .filter((item) => item?.codigo && item?.descricao)
        .map((item) => [String(item.codigo).trim(), String(item.descricao).trim()])
        .filter(([codigo, descricao]) => /^\d{5}$/.test(codigo) && descricao)
    );

    if (descricaoByCodigo.size === 0) {
      return { updated: 0 };
    }

    const candidatos = caes
      .filter((item) => item?.id && item?.codigo)
      .map((item) => {
        const codigo = String(item.codigo).trim();
        const novaDescricao = descricaoByCodigo.get(codigo);
        if (!novaDescricao) return null;

        const descricaoAtual = String(item.descricao || "").trim();
        if (descricaoAtual === novaDescricao) return null;

        return {
          id: item.id,
          codigo,
          novaDescricao,
        };
      })
      .filter(Boolean);

    if (candidatos.length === 0) {
      return { updated: 0 };
    }

    const resultados = await Promise.all(
      candidatos.map(async (item) => {
        const { data, error } = await supabase
          .from("caes_cliente")
          .update({ descricao: item.novaDescricao })
          .eq("id", item.id)
          .eq("cliente_id", clienteId)
          .select("id, descricao")
          .single();

        if (error) throw error;
        return data;
      })
    );

    if (resultados.length > 0) {
      const descricaoById = new Map(resultados.map((item) => [String(item.id), item.descricao || null]));
      setCaes((prev) =>
        prev.map((item) => {
          const novaDescricao = descricaoById.get(String(item.id));
          if (novaDescricao === undefined) return item;
          return { ...item, descricao: novaDescricao };
        })
      );
    }

    return { updated: resultados.length };
  }

  async function persistPendingAutoMorada(clienteId) {
    if (!clienteId || !pendingAutoMorada) {
      return { inserted: 0, skipped: 0 };
    }

    const normalizar = (value) => String(value || "").trim().toLowerCase();
    const novaKey = [
      normalizar(pendingAutoMorada.morada),
      normalizar(pendingAutoMorada.codigo_postal),
      normalizar(pendingAutoMorada.localidade),
      normalizar(pendingAutoMorada.concelho)
    ].join("|");

    if (!novaKey.replace(/\|/g, "")) {
      return { inserted: 0, skipped: 1 };
    }

    const { data: existentes, error: erroExistentes } = await supabase
      .from("moradas_cliente")
      .select("morada, codigo_postal, localidade, concelho")
      .eq("cliente_id", clienteId);

    if (erroExistentes) throw erroExistentes;

    const existeDuplicado = (existentes || []).some((item) => {
      const keyExistente = [
        normalizar(item.morada),
        normalizar(item.codigo_postal),
        normalizar(item.localidade),
        normalizar(item.concelho)
      ].join("|");
      return keyExistente === novaKey;
    });

    if (existeDuplicado) {
      return { inserted: 0, skipped: 1 };
    }

    const payload = {
      cliente_id: clienteId,
      morada: pendingAutoMorada.morada || null,
      codigo_postal: pendingAutoMorada.codigo_postal || null,
      localidade: pendingAutoMorada.localidade || null,
      concelho: pendingAutoMorada.concelho || null,
      notas: pendingAutoMorada.notas || null
    };

    const { data: inserida, error: erroInsercao } = await supabase
      .from("moradas_cliente")
      .insert([payload])
      .select();

    if (erroInsercao) throw erroInsercao;

    if (inserida?.length) {
      setMoradas((prev) => [...prev, ...inserida]);
      fetchClientes();
      return { inserted: 1, skipped: 0 };
    }

    return { inserted: 0, skipped: 1 };
  }

  function fecharTodosSubForms() {
      setShowAddContacto(false); setShowAddMorada(false); setShowAddCae(false); setShowAddAcesso(false);
      setNovoContacto(initContacto); setNovaMorada(initMorada); setNovoCae(initCae); setNovoAcesso(initAcesso);
  }

  async function verificarPermissaoAcessos(clienteId) {
    // Todos os users registados têm acesso aos acessos/credenciais
    setPodeVerAcessos(true);
  }

  async function fetchSubDados(clienteId) {
    const projectFields = "id, titulo, estado, data_inicio, data_fim, investimento, incentivo, codigo_projeto, cliente_id, parceiros_ids, is_parceria, tipo_projeto_id, tipos_projeto ( nome ), created_at";

    const [cData, mData, aData, tData, caeData, pData, configData] = await Promise.all([
        supabase.from("contactos_cliente").select("*").eq("cliente_id", clienteId),
        supabase.from("moradas_cliente").select("*").eq("cliente_id", clienteId),
        supabase
          .from("acessos_cliente")
          .select("*, tipos_acessos(id, nome, url)")
          .eq("cliente_id", clienteId),
        supabase
          .from("tipos_acessos")
          .select("id, nome, url")
          .order("nome", { ascending: true }),
        supabase.from("caes_cliente").select("*").eq("cliente_id", clienteId),
        supabase.from("projetos").select(projectFields).order("created_at", { ascending: false }),
        supabase.from("entidade_configuracoes").select("*").eq("cliente_id", clienteId).maybeSingle()
    ]);

    // Carregar configurações
    if (configData.data) {
      setEntidadeConfig({ ...initialEntidadeConfig, ...configData.data });
    } else {
      setEntidadeConfig(initialEntidadeConfig);
    }

    const clienteIdStr = String(clienteId);
    const projetosAssociados = (pData.data || [])
      .filter(proj => {
        const isMainClient = String(proj.cliente_id || "") === clienteIdStr;
        
        // Tratamento robusto para parceiros (Igual ao fetchClientes)
        let parceiros = [];
        if (Array.isArray(proj.parceiros_ids)) {
          parceiros = proj.parceiros_ids.map(String);
        } else if (typeof proj.parceiros_ids === "string") {
          try {
            parceiros = JSON.parse(proj.parceiros_ids).map(String);
          } catch {
            parceiros = proj.parceiros_ids.replace(/[{}]/g, "").split(",").map(id => id.trim());
          }
        }
        
        const isPartner = parceiros.includes(clienteIdStr);
        return isMainClient || isPartner;
      })
      .map(proj => {
        const isMainClient = String(proj.cliente_id || "") === clienteIdStr;
        
        let parceiros = [];
        if (Array.isArray(proj.parceiros_ids)) {
          parceiros = proj.parceiros_ids.map(String);
        } else if (typeof proj.parceiros_ids === "string") {
          try {
            parceiros = JSON.parse(proj.parceiros_ids).map(String);
          } catch {
            parceiros = proj.parceiros_ids.replace(/[{}]/g, "").split(",").map(id => id.trim());
          }
        }
        const isPartner = parceiros.includes(clienteIdStr);

        let relacao_cliente = "cliente_unico";
        if (isMainClient && isPartner) relacao_cliente = "cliente_unico_e_parceiro";
        else if (isPartner) relacao_cliente = "parceiro";

        return { ...proj, relacao_cliente };
      })
      .sort((a, b) => {
        const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
        return bTime - aTime;
      });

    setContactos(cData.data || []); 
    setMoradas(mData.data || []); 
    setAcessos(aData.data || []); 
    setTiposAcessosCatalogo(tData.data || []);
    setCaes(caeData.data || []);
    setProjetosCliente(projetosAssociados); // Injeta com segurança os 4 projetos de volta
  }

  function handleToggleAtivo(id, estadoAtual) {
    const novoEstado = !estadoAtual;
    const acaoTexto = novoEstado ? "Reativar" : "Desativar";

    setConfirmDialog({
        show: true,
        message: `Tem a certeza que deseja ${acaoTexto.toLowerCase()} esta Entidade?`,
        confirmText: `Sim, ${acaoTexto}`,
        isDanger: !novoEstado,
        onConfirm: async () => {
            setConfirmDialog({ show: false });
            try {
              const { error } = await supabase.from("clientes").update({ ativo: novoEstado }).eq("id", id);
              if (error) throw error;

              setClientes(clientes.map(c => c.id === id ? { ...c, ativo: novoEstado } : c));
              if (editId === id) setForm({ ...form, ativo: novoEstado });

              showToast(`Entidade ${acaoTexto.toLowerCase()}a com sucesso!`, "success");
            } catch (error) {
              showToast(`Erro ao ${acaoTexto.toLowerCase()} Entidade: ` + error.message, "error");
            }
        }
    });
  }

  async function handleSubmitGeral(e) {
    e.preventDefault();
    if (isViewOnly) return;

    const dbPayload = {
      nif: form.nif,
      marca: form.marca,
      sigla: form.sigla?.trim() || null,
      entidade: form.entidade,
      avatar_url: form.avatar_url || null,
      objeto_social: form.objeto_social,
      website: form.website,
      plano: form.plano,
      certidao_permanente: form.certidao_permanente,
      validade_certidao: form.validade_certidao || null,
      rcbe: form.rcbe,
      validade_rcbe: form.validade_rcbe || null,
      ativo: form.ativo,
      eh_empresa_consultora: Boolean(form.eh_empresa_consultora),
      eh_organismo: Boolean(form.eh_organismo),
      tem_cursos: Boolean(form.tem_cursos),
      termos_gerais: form.termos_gerais || null
    };

    try {
      let clienteId = editId;

      if (editId) {
        const { error } = await supabase.from("clientes").update(dbPayload).eq("id", editId);
        if (error) throw error;
        setClientes(clientes.map(c => (c.id === editId ? { ...c, ...dbPayload } : c)));
      } else {
        const { data, error } = await supabase.from("clientes").insert([dbPayload]).select();
        if (error) throw error;
        setClientes([{ ...data[0], ativo: true }, ...clientes]); 
        setEditId(data[0].id);
        clienteId = data[0].id;
      }

      let msg = editId
        ? "Entidade atualizada!"
        : "Entidade criada! Verifica as abas que foram pré-preenchidas.";

      // Salvar configurações de entidade (se for consultora)
      if (form.eh_empresa_consultora && clienteId && Object.keys(entidadeConfig).length > 0) {
        try {
          const configPayload = {
            cliente_id: clienteId,
            ...entidadeConfig
          };
          
          // Verificar se já existe config
          const { data: existingConfig } = await supabase
            .from("entidade_configuracoes")
            .select("id")
            .eq("cliente_id", clienteId)
            .maybeSingle();
          
          if (existingConfig) {
            // Update
            const { error } = await supabase
              .from("entidade_configuracoes")
              .update(configPayload)
              .eq("cliente_id", clienteId);
            if (error) throw error;
          } else {
            // Insert
            const { error } = await supabase
              .from("entidade_configuracoes")
              .insert([configPayload]);
            if (error) throw error;
          }
        } catch (configError) {
          msg += ` Aviso: Não foi possível gravar as configurações: ${configError.message}`;
        }
      }

      if (pendingAutoCaes.length > 0 && clienteId) {
        try {
          const { inserted, skipped } = await persistPendingAutoCaes(clienteId);
          if (inserted > 0) msg += ` ${inserted} CAE adicionados automaticamente.`;
          else if (skipped > 0) msg += " Os CAE importados já existiam e não foram duplicados.";
          setPendingAutoCaes([]);
        } catch (caeError) {
          msg += ` Não foi possível gravar os CAE automáticos: ${caeError.message}`;
        }
      }

      if (pendingAutoMorada && clienteId) {
        try {
          const { inserted, skipped } = await persistPendingAutoMorada(clienteId);
          if (inserted > 0) msg += " Morada importada automaticamente.";
          else if (skipped > 0) msg += " Morada importada já existia e não foi duplicada.";
          setPendingAutoMorada(null);
        } catch (morError) {
          msg += ` Não foi possível gravar a morada automática: ${morError.message}`;
        }
      }

      showToast(msg, "success");
    } catch (error) { showToast("Erro: " + error.message, "error"); }
  }

  async function saveSubItem(tabela, dados, stateSetter, listaAtual, resetState, resetValue, closeFormSetter) {
    if (isViewOnly) return;
    if (!editId) return showToast("Guarda primeiro os Dados da Entidade (Aba Geral) no fundo do ecrã.", "warning");

    if (tabela === "caes_cliente") {
      const codigoNormalizado = String(dados?.codigo || "").trim();
      if (!codigoNormalizado) {
        showToast("Indica um código CAE válido.", "warning");
        return;
      }

      const duplicate = (listaAtual || []).some((item) => {
        const sameCodigo = String(item?.codigo || "").trim() === codigoNormalizado;
        const isDifferentRow = String(item?.id || "") !== String(dados?.id || "");
        return sameCodigo && isDifferentRow;
      });

      if (duplicate) {
        showToast(`O CAE ${codigoNormalizado} já existe nesta ficha.`, "warning");
        return;
      }
    }

    const payload = { ...dados, cliente_id: editId };
    if (tabela === 'moradas_cliente') { delete payload.distrito; delete payload.regiao; }
    if (tabela === 'acessos_cliente') { delete payload.tipos_acessos; }

    if (payload.id) { 
        const { id, ...updateData } = payload;
        const { data, error } = await supabase.from(tabela).update(updateData).eq("id", id).select();
        if (!error) {
            stateSetter(listaAtual.map(i => i.id === id ? data[0] : i));
            showToast("Atualizado com sucesso!");
            if (tabela === 'moradas_cliente' || tabela === 'contactos_cliente') fetchClientes(); 
        } else showToast("Erro: " + error.message, "error");
    } else { 
        const { data, error } = await supabase.from(tabela).insert([payload]).select();
        if (!error) {
            stateSetter([...listaAtual, data[0]]);
            showToast("Adicionado com sucesso!");
            if (tabela === 'moradas_cliente' || tabela === 'contactos_cliente') fetchClientes(); 
        } else showToast("Erro: " + error.message, "error");
    }
    resetState(resetValue);
    closeFormSetter(false);
  }

  function deleteItem(tabela, id, stateSetter, listaAtual) {
    if (isViewOnly) return;
    setConfirmDialog({
        show: true,
        message: "Tem a certeza? Este registo será apagado permanentemente.",
        confirmText: "Sim, Apagar",
        isDanger: true,
        onConfirm: async () => {
            setConfirmDialog({ show: false });
            const { error } = await supabase.from(tabela).delete().eq("id", id);
            if (!error) {
                stateSetter(listaAtual.filter(i => i.id !== id));
                showToast("Apagado com sucesso!");
                if (tabela === 'moradas_cliente' || tabela === 'contactos_cliente') fetchClientes(); 
            } else {
                showToast("Erro ao apagar.", "error");
            }
        }
    });
  }

  function abrirEdicaoSubItem(item, setItemState, setShowForm) {
      setItemState(item);
      setShowForm(true);
  }

  const getAcessoByTipoId = (tipoId) => {
    return acessos.find((acesso) => String(acesso.tipo_acesso_id) === String(tipoId)) || null;
  };

  async function handleCopyCredential(value, label) {
    const text = String(value || "").trim();
    if (!text) {
      showToast(`Sem ${label} para copiar.`, "warning");
      return;
    }

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const tempInput = document.createElement("textarea");
        tempInput.value = text;
        tempInput.setAttribute("readonly", "");
        tempInput.style.position = "absolute";
        tempInput.style.left = "-9999px";
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand("copy");
        document.body.removeChild(tempInput);
      }

      showToast(`${label} copiado para a área de transferência.`, "success");
    } catch (err) {
      showToast(`Não foi possível copiar ${label.toLowerCase()}.`, "error");
    }
  }

  const clientColors = ['#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#f43f5e', '#14b8a6', '#0ea5e9'];
  const getColorForClient = (nif) => {
      if (!nif) return '#94a3b8'; 
      const hash = String(nif).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      return clientColors[hash % clientColors.length];
  };

  const labelStyle = { display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600', color: '#475569' };
  const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box', marginBottom: '10px', color: '#1e293b' };
  const modalTabs = [
    { id: 'geral', label: 'Geral', icon: Icons.ClipboardList },
    { id: 'funcoes', label: 'Funções', icon: Icons.Activity },
    { id: 'moradas', label: 'Moradas', icon: Icons.MapPin },
    { id: 'contactos', label: 'Pessoas', icon: Icons.Users },
    { id: 'projetos', label: 'Projetos', icon: Icons.Rocket },
    { id: 'atividade', label: 'Atividade', icon: Icons.Activity },
    { id: 'documentos', label: 'Documentos', icon: Icons.FileText },
    { id: 'plano', label: 'Plano', icon: Icons.Diamond },
    { id: 'acessos', label: 'Acessos', icon: Icons.Lock, requiresAcessos: true },
    ...(form.eh_empresa_consultora ? [{ id: 'configuracoes', label: 'Configurações', icon: Icons.FileText }] : [])
  ];

  if (loading) return <div className="page-container en-loading"><span className="en-spinner" /> A carregar entidades...</div>;

  const entCounts = {
    ativos: clientes.filter((c) => c.ativo === true && !c.eh_organismo).length,
    organismos: clientes.filter((c) => c.eh_organismo === true && c.ativo === true).length,
    arquivados: clientes.filter((c) => c.ativo === false).length,
  };
  const entProjetosAtivos = clientes.reduce((total, c) => total + (c.ativo === false ? 0 : (c.projetos || []).filter((p) => p.estado === 'em_curso' || p.estado === 'ativo').length), 0);
  const ENT_SCOPES = [
    { id: 'ativos', label: 'Entidades', icon: Icons.Building },
    { id: 'organismos', label: 'Organismos', icon: Icons.Landmark },
    { id: 'arquivados', label: 'Arquivados', icon: Icons.Archive },
  ];
  const entInitials = (nome) => {
    const parts = String(nome || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    return ((parts[0][0] || '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
  };
  const entMonogram = (c) => {
    const sigla = String(c?.sigla || '').trim();
    if (sigla && sigla.length <= 4 && !/\s/.test(sigla)) return sigla.toUpperCase();
    return entInitials(c?.marca);
  };
  const entEuro = (val) => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Number(val) || 0);
  const entDocStatus = (value) => {
    if (!value) return { label: 'Sem validade', tone: 'none' };
    const end = new Date(`${String(value).slice(0, 10)}T23:59:59`);
    if (Number.isNaN(end.getTime())) return { label: 'Sem validade', tone: 'none' };
    const days = Math.ceil((end.getTime() - Date.now()) / 86400000);
    if (days < 0) return { label: `Expirada há ${Math.abs(days)} dia${Math.abs(days) === 1 ? '' : 's'}`, tone: 'bad' };
    if (days <= 30) return { label: `Expira em ${days} dia${days === 1 ? '' : 's'}`, tone: 'warn' };
    return { label: `Válida até ${end.toLocaleDateString('pt-PT')}`, tone: 'ok' };
  };
  const cfgArea = (label, key, rows, placeholder) => (
    <div className="en-field" key={`${key}-${label}`}>
      <label>{label}</label>
      <textarea
        className="en-textarea"
        rows={rows}
        value={entidadeConfig[key] || ""}
        onChange={e => setEntidadeConfig({ ...entidadeConfig, [key]: e.target.value })}
        placeholder={placeholder}
        disabled={isViewOnly}
      />
    </div>
  );
  async function handleExportEntidades() {
    if (isExporting) return;
    const lista = [...processedClientes];
    if (lista.length === 0) {
      showToast('Não há entidades para exportar.', 'warning');
      return;
    }
    setIsExporting(true);
    try {
      const ids = lista.map((c) => c.id);
      let contactosRows = [];
      const PAGE = 1000;
      // Busca os contactos completos só no momento da exportação (em blocos, por causa do limite do Supabase)
      for (let i = 0; i < ids.length; i += 200) {
        const chunkIds = ids.slice(i, i + 200);
        let from = 0;
        let more = true;
        while (more) {
          const { data, error } = await supabase
            .from('contactos_cliente')
            .select('*')
            .in('cliente_id', chunkIds)
            .range(from, from + PAGE - 1);
          if (error) throw error;
          contactosRows = contactosRows.concat(data || []);
          more = (data || []).length === PAGE;
          from += PAGE;
        }
      }

      const contactosPorCliente = contactosRows.reduce((acc, ct) => {
        const key = String(ct.cliente_id);
        (acc[key] = acc[key] || []).push(ct);
        return acc;
      }, {});
      const clienteById = new Map(lista.map((c) => [String(c.id), c]));

      const folhaEntidades = lista.map((c) => {
        const morada = c.moradas_cliente && c.moradas_cliente.length > 0 ? c.moradas_cliente[0] : null;
        return {
          'Marca': c.marca || '',
          'Sigla': c.sigla?.trim() || '',
          'NIF': c.nif || '',
          'Entidade Legal': c.entidade || '',
          'Website': c.website || '',
          'Localidade': morada?.localidade || '',
          'Concelho': morada?.concelho || '',
          'Estado': c.ativo === false ? 'Arquivado' : (c.eh_organismo ? 'Organismo' : 'Ativo'),
          'Nº Contactos': (contactosPorCliente[String(c.id)] || []).length,
          'Nº Projetos': (c.projetos || []).length,
        };
      });

      const folhaContactos = contactosRows
        .map((ct) => {
          const c = clienteById.get(String(ct.cliente_id)) || {};
          return {
            'Entidade': c.marca || '',
            'NIF': c.nif || '',
            'Nome': ct.nome_contacto || '',
            'Cargo': ct.cargo || '',
            'Email': ct.email || '',
            'Telefone': ct.telefone || '',
            'Faz propostas': ct.faz_propostas ? 'Sim' : 'Não',
          };
        })
        .sort((a, b) => a['Entidade'].localeCompare(b['Entidade'], 'pt-PT') || a['Nome'].localeCompare(b['Nome'], 'pt-PT'));

      const wb = XLSX.utils.book_new();
      const wsEnt = XLSX.utils.json_to_sheet(folhaEntidades);
      wsEnt['!cols'] = [{ wch: 34 }, { wch: 10 }, { wch: 12 }, { wch: 34 }, { wch: 24 }, { wch: 18 }, { wch: 18 }, { wch: 11 }, { wch: 12 }, { wch: 11 }];
      wsEnt['!autofilter'] = { ref: `A1:J${folhaEntidades.length + 1}` };
      XLSX.utils.book_append_sheet(wb, wsEnt, 'Entidades');

      const wsCon = XLSX.utils.json_to_sheet(folhaContactos.length ? folhaContactos : [{ 'Entidade': '', 'NIF': '', 'Nome': '', 'Cargo': '', 'Email': '', 'Telefone': '', 'Faz propostas': '' }]);
      wsCon['!cols'] = [{ wch: 34 }, { wch: 12 }, { wch: 26 }, { wch: 22 }, { wch: 30 }, { wch: 18 }, { wch: 13 }];
      wsCon['!autofilter'] = { ref: `A1:G${Math.max(folhaContactos.length, 1) + 1}` };
      XLSX.utils.book_append_sheet(wb, wsCon, 'Contactos');

      const separador = statusTab === 'organismos' ? 'Organismos' : statusTab === 'arquivados' ? 'Arquivados' : 'Entidades';
      const hoje = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `${separador}_${hoje}.xlsx`);
      showToast(`${lista.length} entidades e ${contactosRows.length} contactos exportados.`, 'success');
    } catch (err) {
      console.error('Erro ao exportar entidades:', err);
      showToast('Não foi possível exportar as entidades.', 'error');
    } finally {
      setIsExporting(false);
    }
  }

  const ENT_PROJ_STATES = [
    { key: 'em_curso', label: 'em curso', color: '#16a34a', match: (e) => e === 'em_curso' || e === 'ativo' },
    { key: 'em_analise', label: 'em análise', color: '#8b5cf6', match: (e) => e === 'em_analise' || e === 'analise' },
    { key: 'pendente', label: 'pend.', color: '#f59e0b', match: (e) => e === 'pendente' },
    { key: 'concluido', label: 'concl.', color: '#2563eb', match: (e) => e === 'concluido' },
    { key: 'cancelado', label: 'canc.', color: '#94a3b8', match: (e) => e === 'cancelado' },
    { key: 'encerrado', label: 'encerr.', color: '#475569', match: (e) => e === 'encerrado' },
  ];
  const renderEntProjetos = (c, compact = false) => {
    const projList = c.projetos || [];
    if (projList.length === 0) return compact ? <span className="en-nil">—</span> : null;
    const parts = ENT_PROJ_STATES.map((s) => ({ ...s, n: projList.filter((p) => s.match(p.estado)).length })).filter((s) => s.n > 0);
    return (
      <div className={`en-proj ${compact ? 'is-compact' : ''}`} title={parts.map((s) => `${s.n} ${s.label}`).join(' · ')}>
        <div className="en-proj-head">
          <Icons.Rocket size={13} />
          <strong>{projList.length}</strong> {projList.length === 1 ? 'Proj.' : 'Projs.'}
          {!compact && parts.map((s) => <span key={s.key} className="en-proj-tag" style={{ '--s': s.color }}>{s.n} {s.label}</span>)}
        </div>
        <div className="en-proj-bar">
          {parts.map((s) => <span key={s.key} style={{ flexGrow: s.n, background: s.color }} />)}
        </div>
      </div>
    );
  };
  const renderEntAvatar = (c, color, size = 'md') => (
    <span className={`en-avatar is-${size}`} style={{ '--c': color }}>
      {c.avatar_url ? <img src={c.avatar_url} alt="" /> : entMonogram(c)}
    </span>
  );
  const entEmpty = (
    <div className="en-empty">
      <span className="en-empty-ico"><Icons.Inbox size={34} color="currentColor" /></span>
      <h3>Vazio por aqui.</h3>
      <p>Nenhuma Entidade encontrada com os filtros atuais.</p>
      {busca ? <button type="button" className="en-btn is-soft" onClick={() => setBusca('')}>Limpar pesquisa</button> : null}
    </div>
  );

  return (
    <div className="page-container en-page">
      <header className="en-hero">
        <div className="en-hero-bg"><span className="en-orb en-orb-a" /><span className="en-orb en-orb-b" /></div>
        <div className="en-hero-row">
          <div className="en-hero-main">
            <span className="en-hero-icon"><Icons.Building size={24} /></span>
            <div>
              <h1>Entidades</h1>
              <p>{statusTab === "ativos" ? "Carteira de Entidades Ativas" : statusTab === "organismos" ? "Carteira de Organismos" : "Arquivo de Entidades"}</p>
            </div>
          </div>
          <div className="en-hero-actions">
            {activeLog && (
              <div className="en-live" onClick={() => navigate(activeLogRoute || '/dashboard/tarefas')} title="Ir para o item com cronómetro em curso">
                <span className="en-live-dot" />
                <span className="en-live-title">{activeLogTitle || 'Tempo a decorrer...'}</span>
                <button type="button" className="en-live-stop" onClick={(e) => { e.stopPropagation(); openStopNoteModal(e); }}><Icons.Stop /> Parar</button>
              </div>
            )}
            <button type="button" className="en-cta" onClick={handleNovo}>
              <Icons.Plus /> Nova Entidade
            </button>
          </div>
        </div>

        <div className="en-hero-tools">
          <div className="en-scope" role="tablist">
            {ENT_SCOPES.map((scope) => {
              const ScopeIcon = scope.icon;
              return (
                <button key={scope.id} type="button" role="tab" aria-selected={statusTab === scope.id} className={statusTab === scope.id ? 'is-on' : ''} onClick={() => setStatusTab(scope.id)}>
                  <ScopeIcon size={15} /> {scope.label} <em>{entCounts[scope.id]}</em>
                </button>
              );
            })}
          </div>
          <div className="en-hero-stats">
            <span className="en-stat"><strong>{entCounts.ativos + entCounts.organismos}</strong> ativas</span>
            <span className="en-stat"><strong>{entProjetosAtivos}</strong> projetos em curso</span>
          </div>
        </div>
      </header>

      <div className="en-toolbar">
        <label className="en-search">
          <Icons.Search size={16} />
          <input type="text" placeholder="Procurar por Entidade, Sigla, NIF ou Nome de Pessoa..." value={busca} onChange={(e) => setBusca(e.target.value)} />
          {busca ? <button type="button" className="en-search-clear" onClick={() => setBusca('')} aria-label="Limpar"><Icons.Close size={13} /></button> : null}
        </label>
        <span className="en-count">{processedClientes.length} {processedClientes.length === 1 ? 'resultado' : 'resultados'}</span>
        <button type="button" className="en-export" onClick={handleExportEntidades} disabled={isExporting || processedClientes.length === 0} title="Exportar as entidades visíveis e os respetivos contactos para Excel">
          {isExporting ? <span className="en-spinner is-sm" /> : <Icons.Download size={15} />} {isExporting ? 'A exportar...' : 'Exportar Excel'}
        </button>
        <div className="en-seg">
          <button type="button" onClick={() => setViewMode("cards")} className={viewMode === "cards" ? "is-on" : ""}>
            <Icons.Grid size={15} /> Cards
          </button>
          <button type="button" onClick={() => setViewMode("list")} className={viewMode === "list" ? "is-on" : ""}>
            <Icons.ListIcon size={15} /> Lista
          </button>
        </div>
      </div>

      {viewMode === "cards" ? (
        processedClientes.length > 0 ? (
          <div className="en-grid" key={`${statusTab}-cards`}>
            {processedClientes.map((c, index) => {
              const isInactive = c.ativo === false;
              const color = getColorForClient(c.nif);
              const moradaRef = c.moradas_cliente && c.moradas_cliente.length > 0 ? c.moradas_cliente[0] : null;
              const contactoRef = c.contactos_cliente && c.contactos_cliente.length > 0 ? c.contactos_cliente[0] : null;

              return (
                <article
                  key={c.id}
                  className={`en-card ${isInactive ? 'is-off' : ''}`}
                  style={{ '--c': isInactive ? '#94a3b8' : color, animationDelay: `${Math.min(index, 14) * 30}ms` }}
                  onDoubleClick={() => handleView(c)}
                >
                  <div className="en-card-top">
                    {renderEntAvatar(c, isInactive ? '#94a3b8' : color)}
                    <div className="en-card-title">
                      <h2 title={c.marca}>{c.marca || "Sem nome"}</h2>
                      <div className="en-card-meta">
                        <span className="en-nif">{c.nif || 'S/ NIF'}</span>
                        {c.sigla?.trim() && <span className="en-sigla">{c.sigla}</span>}
                        {isInactive && <span className="en-badge is-off">ARQUIVADO</span>}
                        {!isInactive && c.eh_organismo && <span className="en-badge is-org">ORGANISMO</span>}
                      </div>
                    </div>
                  </div>

                  {renderEntProjetos(c)}

                  <div className="en-card-info">
                    {moradaRef ? (
                      <div><Icons.MapPin /> <span>{moradaRef.concelho ? `${moradaRef.localidade} (${moradaRef.concelho})` : moradaRef.localidade}</span></div>
                    ) : (
                      <div className="is-empty"><Icons.MapPin /> <span>Sem morada registada</span></div>
                    )}
                    {contactoRef ? (
                      <div>
                        <Icons.User /> <span>{contactoRef.nome_contacto}</span>
                        {contactoRef.telefone && <a className="en-mini-link" href={`tel:${contactoRef.telefone}`} onClick={(e) => e.stopPropagation()} title={contactoRef.telefone}><Icons.Phone size={12} /></a>}
                        {contactoRef.email && <a className="en-mini-link" href={`mailto:${contactoRef.email}`} onClick={(e) => e.stopPropagation()} title={contactoRef.email}><Icons.Mail size={12} /></a>}
                      </div>
                    ) : (
                      <div className="is-empty"><Icons.User /> <span>Sem contacto registado</span></div>
                    )}
                  </div>

                  <div className="en-card-foot">
                    <button type="button" className="en-card-main" onClick={() => handleView(c)}>
                      <Icons.Eye /> Ver Perfil
                    </button>
                    {!isInactive ? (
                      <>
                        <button type="button" className="en-icon-btn is-edit" onClick={() => handleEdit(c)} title="Edição Rápida"><Icons.Edit size={15} /></button>
                        <button type="button" className="en-icon-btn is-archive" onClick={() => handleToggleAtivo(c.id, c.ativo)} title="Arquivar Entidade"><Icons.Archive size={15} /></button>
                      </>
                    ) : (
                      <button type="button" className="en-icon-btn is-restore" onClick={() => handleToggleAtivo(c.id, c.ativo)} title="Reativar Entidade"><Icons.Restore size={15} /></button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : entEmpty
      ) : (
        processedClientes.length > 0 ? (
          <div className="en-table-card" key={`${statusTab}-list`}>
            <div className="en-table-wrap custom-scrollbar">
              <table className="en-table">
                <thead>
                  <tr>
                    <th>Entidade</th>
                    <th>Sigla</th>
                    <th>NIF</th>
                    <th>Localidade</th>
                    <th>Contacto</th>
                    <th>Projetos</th>
                    <th>Estado</th>
                    <th style={{ textAlign: 'right' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {processedClientes.map((c) => {
                    const isInactive = c.ativo === false;
                    const color = getColorForClient(c.nif);
                    const moradaRef = c.moradas_cliente && c.moradas_cliente.length > 0 ? c.moradas_cliente[0] : null;
                    const contactoRef = c.contactos_cliente && c.contactos_cliente.length > 0 ? c.contactos_cliente[0] : null;
                    const localidade = moradaRef
                      ? (moradaRef.concelho ? `${moradaRef.localidade} (${moradaRef.concelho})` : moradaRef.localidade)
                      : null;

                    return (
                      <tr key={c.id} className={isInactive ? 'is-off' : ''} style={{ '--c': isInactive ? '#94a3b8' : color }} onDoubleClick={() => handleView(c)}>
                        <td>
                          <div className="en-row-name">
                            {renderEntAvatar(c, isInactive ? '#94a3b8' : color, 'sm')}
                            <strong>{c.marca || "Sem nome"}</strong>
                          </div>
                        </td>
                        <td>{c.sigla?.trim() ? <span className="en-sigla">{c.sigla}</span> : <span className="en-nil">—</span>}</td>
                        <td><span className="en-nif">{c.nif || "S/ NIF"}</span></td>
                        <td>{localidade || <span className="en-nil">Sem morada</span>}</td>
                        <td>
                          {contactoRef
                            ? <span className="en-row-contact"><strong>{contactoRef.nome_contacto || "Sem nome"}</strong>{contactoRef.telefone ? <small>{contactoRef.telefone}</small> : null}</span>
                            : <span className="en-nil">Sem contacto</span>}
                        </td>
                        <td>{renderEntProjetos(c, true)}</td>
                        <td>
                          {isInactive ? <span className="en-badge is-off">ARQUIVADO</span> : <span className="en-badge is-on">ATIVO</span>}
                        </td>
                        <td>
                          <div className="en-row-actions">
                            <button type="button" onClick={() => handleView(c)} className="en-icon-btn is-view" title="Ver Perfil"><Icons.Eye size={15} /></button>
                            {!isInactive ? (
                              <>
                                <button type="button" onClick={() => handleEdit(c)} className="en-icon-btn is-edit" title="Editar"><Icons.Edit size={15} /></button>
                                <button type="button" onClick={() => handleToggleAtivo(c.id, c.ativo)} className="en-icon-btn is-archive" title="Arquivar"><Icons.Archive size={15} /></button>
                              </>
                            ) : (
                              <button type="button" onClick={() => handleToggleAtivo(c.id, c.ativo)} className="en-icon-btn is-restore" title="Reativar"><Icons.Restore size={15} /></button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : entEmpty
      )}

      {notification && (
        <div
          style={{
            position: 'fixed',
            left: '50%',
            bottom: '22px',
            transform: 'translateX(-50%)',
            maxWidth: 'min(90vw, 460px)',
            minHeight: '40px',
            padding: '9px 14px',
            borderRadius: '12px',
            color: '#fff',
            background:
              notification.type === 'success'
                ? 'linear-gradient(135deg, #166534, #15803d)'
                : notification.type === 'error'
                  ? 'linear-gradient(135deg, #b91c1c, #991b1b)'
                  : notification.type === 'warning'
                    ? 'linear-gradient(135deg, #b45309, #92400e)'
                    : 'linear-gradient(135deg, var(--color-btnPrimaryDark), var(--color-btnPrimaryHover))',
            border: '1px solid rgba(255,255,255,0.25)',
            boxShadow: '0 12px 28px rgba(15, 23, 42, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            zIndex: 2147483000,
            fontSize: '0.86rem',
            fontWeight: 700,
            lineHeight: 1.35,
            textAlign: 'center',
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          <span style={{fontSize:'0.9rem'}}>
            {notification.type === 'success' ? '✅' : notification.type === 'error' ? '⛔' : notification.type === 'warning' ? '⚠️' : 'ℹ️'}
          </span>
          <span>{notification.message}</span>
        </div>
      )}

      <StopTimerNoteModal
        open={stopNoteModal.show}
        analysisTargetLog={activeLog}
        title="Parar cronometro"
        message="Se quiseres, adiciona uma nota breve sobre o que foi feito (opcional)."
        placeholder="Ex: Concluída análise e próximos passos definidos"
        showCompleteOption={false}
        showStatusOption={Boolean(activeLog)}
        onCancel={closeStopNoteModal}
        onConfirm={confirmStopWithNote}
      />

      <TimerSwitchModal
        open={timerSwitchModal.show}
        title="Trocar cronómetro em curso"
        message={timerSwitchModal.message}
        cancelLabel="Manter atual"
        confirmLabel="Parar e iniciar"
        onCancel={cancelTimerSwitch}
        onConfirm={confirmTimerSwitch}
      />

      {projectTimerModal.show && (
        <ModalPortal>
          <div
            onClick={closeProjectTimerModal}
            style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(15, 23, 42, 0.72)', backdropFilter:'blur(5px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100001, padding:'20px'}}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{width:'min(980px, 96vw)', maxHeight:'86vh', overflow:'hidden', borderRadius:'20px', background:'white', border:'1px solid var(--color-borderColorLight)', boxShadow:'0 30px 60px -20px rgba(15, 23, 42, 0.45)', display:'flex', flexDirection:'column'}}
            >
              <div style={{padding:'22px 24px', borderBottom:'1px solid #e2e8f0', background:'linear-gradient(135deg, var(--color-bgSecondary), #f8fafc)', display:'flex', justifyContent:'space-between', alignItems:'center', gap:'20px'}}>
                <div>
                  <p style={{margin:'0 0 4px 0', fontSize:'0.75rem', fontWeight:'800', letterSpacing:'0.07em', color:'var(--color-btnPrimary)', textTransform:'uppercase'}}>Iniciar Cronómetro</p>
                  <h3 style={{margin:0, color:'#0f172a', fontSize:'1.35rem', fontWeight:'900'}}>{projectTimerModal.project?.titulo || 'Projeto selecionado'}</h3>
                  <p style={{margin:'6px 0 0 0', color:'#475569', fontSize:'0.9rem'}}>Escolhe primeiro a atividade e, se quiseres, uma tarefa específica.</p>
                </div>
                <button onClick={closeProjectTimerModal} style={{background:'#fff', border:'1px solid #cbd5e1', width:'36px', height:'36px', borderRadius:'10px', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#475569'}} className="hover-shadow">
                  <Icons.Close size={18} />
                </button>
              </div>

              <div style={{padding:'20px', overflowY:'auto', display:'grid', gap:'14px'}}>
                {projectTimerModal.loading ? (
                  <div style={{padding:'32px', textAlign:'center', color:'#64748b', fontWeight:'600'}}>A carregar atividades e tarefas...</div>
                ) : projectTimerModal.atividades.length === 0 ? (
                  <div style={{padding:'36px', textAlign:'center', border:'1px dashed #cbd5e1', borderRadius:'14px', background:'#f8fafc'}}>
                    <h4 style={{margin:'0 0 6px 0', color:'#1e293b'}}>Sem atividades neste projeto</h4>
                    <p style={{margin:0, color:'#64748b'}}>Cria uma atividade no projeto para iniciar o cronómetro a partir desta vista.</p>
                  </div>
                ) : (
                  <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px'}}>
                    <div style={{border:'1px solid #e2e8f0', borderRadius:'14px', padding:'12px', background:'#f8fafc'}}>
                      <p style={{margin:'0 0 10px 0', fontSize:'0.8rem', fontWeight:'800', color:'#64748b', textTransform:'uppercase'}}>Atividades</p>
                      <div style={{display:'grid', gap:'8px'}}>
                        {projectTimerModal.atividades.map((atividade) => {
                          const isSelected = String(atividade.id) === String(projectTimerModal.selectedAtividadeId);
                          const isDone = atividade.estado === 'concluido';
                          return (
                            <button
                              key={atividade.id}
                              type="button"
                              disabled={isDone}
                              onClick={() => setProjectTimerModal((prev) => ({ ...prev, selectedAtividadeId: atividade.id, selectedTaskId: "" }))}
                              style={{textAlign:'left', border:isSelected ? '1px solid var(--color-btnPrimary)' : '1px solid #e2e8f0', background:isDone ? '#f8fafc' : (isSelected ? 'var(--color-bgSecondary)' : '#fff'), color:isDone ? '#94a3b8' : '#1e293b', borderRadius:'10px', padding:'10px 12px', cursor:isDone ? 'not-allowed' : 'pointer', opacity:isDone ? 0.75 : 1}}
                              className="hover-shadow"
                            >
                              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', gap:'8px'}}>
                                <span style={{fontWeight:'700', fontSize:'0.9rem', textDecoration:isDone ? 'line-through' : 'none'}}>{atividade.titulo || 'Sem título'}</span>
                                <span style={{fontSize:'0.7rem', borderRadius:'999px', padding:'3px 8px', background:isDone ? '#e2e8f0' : 'var(--color-borderColorLight)', color:isDone ? '#64748b' : 'var(--color-btnPrimaryDark)', fontWeight:'800'}}>{isDone ? 'CONCLUÍDA' : 'ATIVA'}</span>
                              </div>
                              <p style={{margin:'6px 0 0 0', fontSize:'0.75rem', color:'#64748b'}}>{(atividade.tarefas || []).length} tarefa(s)</p>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div style={{border:'1px solid #e2e8f0', borderRadius:'14px', padding:'12px', background:'#f8fafc'}}>
                      <p style={{margin:'0 0 10px 0', fontSize:'0.8rem', fontWeight:'800', color:'#64748b', textTransform:'uppercase'}}>Tarefas</p>
                      <div style={{display:'grid', gap:'8px'}}>
                        <button
                          type="button"
                          onClick={() => setProjectTimerModal((prev) => ({ ...prev, selectedTaskId: "" }))}
                          disabled={(projectTimerModal.atividades.find((atividade) => String(atividade.id) === String(projectTimerModal.selectedAtividadeId))?.estado === 'concluido')}
                          style={{textAlign:'left', border:projectTimerModal.selectedTaskId ? '1px solid #e2e8f0' : '1px solid #16a34a', background:(projectTimerModal.atividades.find((atividade) => String(atividade.id) === String(projectTimerModal.selectedAtividadeId))?.estado === 'concluido') ? '#f1f5f9' : (projectTimerModal.selectedTaskId ? '#fff' : '#f0fdf4'), color:(projectTimerModal.atividades.find((atividade) => String(atividade.id) === String(projectTimerModal.selectedAtividadeId))?.estado === 'concluido') ? '#94a3b8' : '#166534', borderRadius:'10px', padding:'10px 12px', cursor:(projectTimerModal.atividades.find((atividade) => String(atividade.id) === String(projectTimerModal.selectedAtividadeId))?.estado === 'concluido') ? 'not-allowed' : 'pointer', fontWeight:'700'}}
                          className="hover-shadow"
                        >
                          Trabalhar ao nível da atividade
                        </button>

                        {(projectTimerModal.atividades.find((atividade) => String(atividade.id) === String(projectTimerModal.selectedAtividadeId))?.tarefas || []).length > 0 ? (
                          (projectTimerModal.atividades.find((atividade) => String(atividade.id) === String(projectTimerModal.selectedAtividadeId))?.tarefas || []).map((tarefa) => {
                            const isSelected = String(tarefa.id) === String(projectTimerModal.selectedTaskId);
                            const isDone = tarefa.estado === 'concluido';
                            return (
                              <button
                                key={tarefa.id}
                                type="button"
                                disabled={isDone}
                                onClick={() => setProjectTimerModal((prev) => ({ ...prev, selectedTaskId: tarefa.id }))}
                                style={{textAlign:'left', border:isSelected ? '1px solid var(--color-btnPrimary)' : '1px solid #e2e8f0', background:isDone ? '#f8fafc' : (isSelected ? 'var(--color-bgSecondary)' : '#fff'), color:isDone ? '#94a3b8' : '#1e293b', borderRadius:'10px', padding:'10px 12px', cursor:isDone ? 'not-allowed' : 'pointer', opacity:isDone ? 0.78 : 1}}
                                className="hover-shadow"
                              >
                                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', gap:'8px'}}>
                                  <span style={{fontWeight:'700', fontSize:'0.9rem', textDecoration:isDone ? 'line-through' : 'none'}}>{tarefa.titulo || 'Sem título'}</span>
                                  <span style={{fontSize:'0.68rem', borderRadius:'999px', padding:'3px 7px', background:isDone ? '#fee2e2' : '#dcfce7', color:isDone ? '#991b1b' : '#166534', fontWeight:'800'}}>{isDone ? 'CONCLUÍDA' : 'ABERTA'}</span>
                                </div>
                              </button>
                            );
                          })
                        ) : (
                          <p style={{margin:0, color:'#94a3b8', fontSize:'0.85rem'}}>Esta atividade não tem tarefas registadas.</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div style={{padding:'16px 20px', borderTop:'1px solid #e2e8f0', display:'flex', justifyContent:'flex-end', gap:'10px', background:'#f8fafc'}}>
                <button type="button" onClick={closeProjectTimerModal} style={{padding:'10px 16px', borderRadius:'10px', border:'1px solid #cbd5e1', background:'white', color:'#475569', fontWeight:'700', cursor:'pointer'}} className="hover-shadow">Cancelar</button>
                <button
                  type="button"
                  onClick={handleStartTimerFromProjectSelection}
                  disabled={projectTimerModal.loading || projectTimerModal.atividades.length === 0 || projectTimerModal.project?.estado === 'concluido'}
                  style={{padding:'10px 18px', borderRadius:'10px', border:'none', background:projectTimerModal.loading || projectTimerModal.atividades.length === 0 || projectTimerModal.project?.estado === 'concluido' ? '#94a3b8' : 'linear-gradient(135deg, #16a34a, #15803d)', color:'white', fontWeight:'800', cursor:projectTimerModal.loading || projectTimerModal.atividades.length === 0 || projectTimerModal.project?.estado === 'concluido' ? 'not-allowed' : 'pointer', display:'inline-flex', alignItems:'center', gap:'6px'}}
                  className="hover-shadow"
                >
                  <Icons.Play /> Iniciar
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* --- MEGA MODAL 360º DO CLIENTE --- */}
      {showModal && (
        <ModalPortal>
          <div className="en-overlay" onClick={closeClientePanel}>
            <div className={`en-panel ${isClosingPanel ? 'is-closing' : ''}`} onClick={e => e.stopPropagation()}>

              {/* CABEÇALHO DO MODAL */}
              <div className="en-panel-head" style={{ '--c': editId ? getColorForClient(form.nif) : 'var(--color-btnPrimary)' }}>
                <div className="en-panel-head-bg" />
                <div className="en-panel-id">
                  <span className="en-avatar is-lg" style={{ '--c': editId ? getColorForClient(form.nif) : '#0ea5e9' }}>
                    {form.avatar_url ? <img src={form.avatar_url} alt="Logo Entidade" /> : (form.marca ? entMonogram(form) : <Icons.Building size={22} />)}
                  </span>
                  <div className="en-panel-title">
                    <span className="en-panel-kicker">{isViewOnly ? 'Perfil' : (editId ? 'Editar' : 'Nova Entidade')}</span>
                    <h3>{editId ? (form.marca || 'Sem nome') : "Nova Entidade"}</h3>
                    {editId ? (
                      <div className="en-panel-chips">
                        {form.nif && <span className="en-nif is-light">{form.nif}</span>}
                        {form.sigla?.trim() && <span className="en-sigla is-light">{form.sigla}</span>}
                        {form.eh_organismo && <span className="en-badge is-light">ORGANISMO</span>}
                        {form.eh_empresa_consultora && <span className="en-badge is-light">CONSULTORA</span>}
                        {form.ativo === false && <span className="en-badge is-off">INATIVO</span>}
                      </div>
                    ) : null}
                  </div>
                </div>
                <div className="en-panel-actions">
                  {editId && !isViewOnly && (
                    <button
                      type="button"
                      onClick={() => handleToggleAtivo(editId, form.ativo)}
                      className={`en-panel-btn ${form.ativo === false ? 'is-restore' : 'is-archive'}`}
                    >
                      {form.ativo === false ? <><Icons.Restore size={15} /> Reativar</> : <><Icons.Archive size={15} /> Desativar</>}
                    </button>
                  )}
                  <button type="button" onClick={closeClientePanel} className="en-panel-close" aria-label="Fechar"><Icons.Close /></button>
                </div>
              </div>

              <div className="en-panel-main">
                {editId && (
                  <aside className="en-nav custom-scrollbar">
                    {modalTabs
                      .filter((tab) => (!tab.requiresAcessos || podeVerAcessos) && (!tab.onlyConsultora || form.eh_empresa_consultora))
                      .map((tab) => {
                        const isActive = activeTab === tab.id;
                        const TabIcon = tab.icon;
                        return (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => {setActiveTab(tab.id); fecharTodosSubForms();}}
                            className={isActive ? 'is-on' : ''}
                          >
                            <span className="en-nav-ico"><TabIcon size={15} color="currentColor" /></span>
                            {tab.label}
                          </button>
                        );
                      })}
                  </aside>
                )}

                <div className="en-panel-body custom-scrollbar">

                {/* --- ABA GERAL --- */}
                {activeTab === 'geral' && (
                  <form className="bz-tab-panel en-form" onSubmit={handleSubmitGeral}>
                    <fieldset disabled={isViewOnly} className={isViewOnly ? 'is-reading' : ''}>
                      <section className="en-fcard">
                        <div className="en-fcard-title"><span className="en-fcard-ico"><Icons.ClipboardList size={15} /></span> Dados Base</div>
                        <div className="en-identity">
                          {isViewOnly ? (
                            <span className="en-logo-pick is-static">
                              {form.avatar_url ? <img src={form.avatar_url} alt="Foto Entidade" /> : <Icons.Building size={26} color="#94a3b8" />}
                            </span>
                          ) : (
                            <label title="Clique para alterar foto" className={`en-logo-pick ${uploading ? 'is-busy' : ''}`}>
                              {form.avatar_url ? <img src={form.avatar_url} alt="Foto Entidade" /> : <Icons.Building size={26} color="#94a3b8" />}
                              <span className="en-logo-edit"><Icons.Edit size={13} /></span>
                              <input type="file" accept="image/*" hidden onChange={handleAvatarUpload} disabled={uploading} />
                            </label>
                          )}

                          <div className="en-field" style={{ flex: 1 }}>
                            <label>Marca / Nome Comercial *</label>
                            <input
                              type="text"
                              className="en-input is-big"
                              value={form.marca}
                              onChange={e => setForm({...form, marca: e.target.value})}
                              required
                              disabled={isViewOnly}
                            />
                          </div>
                        </div>

                        <div className="en-grid is-2">
                          <div className="en-field">
                            <label>NIF * <span className="en-hint-inline">(Pesquisa Auto)</span></label>
                            <div className="en-input-icon is-accent">
                              <Icons.Search />
                              <input type="text" className="en-input" maxLength="9" value={form.nif} onChange={handleNifChange} required placeholder="Ex: 500000000" />
                            </div>
                          </div>
                          <div className="en-field">
                            <label>Sigla</label>
                            <input type="text" className="en-input" value={form.sigla || ""} onChange={e => setForm({...form, sigla: e.target.value})} maxLength="20" placeholder="Ex: UAlg" />
                          </div>
                          <div className="en-field">
                            <label>Entidade Legal</label>
                            <input type="text" className="en-input" value={form.entidade} onChange={e => setForm({...form, entidade: e.target.value})} />
                          </div>
                          <div className="en-field">
                            <label>Website</label>
                            <div className="en-input-row">
                              <input type="text" className="en-input" value={form.website} onChange={e => setForm({...form, website: e.target.value})} placeholder="www.entidade.pt" />
                              {form.website && (
                                <a href={form.website.startsWith('http') ? form.website : `https://${form.website}`} target="_blank" rel="noopener noreferrer" title="Abrir Website" className="en-link-btn">
                                  <Icons.ExternalLink />
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      </section>

                      {!isViewOnly && <div className="en-savebar"><button type="submit" className="en-btn is-primary is-lg"><Icons.Save /> Guardar Dados Base</button></div>}
                    </fieldset>
                  </form>
                )}

                {/* --- ABA FUNÇÕES --- */}
                {activeTab === 'funcoes' && (
                  <form className="bz-tab-panel en-form" onSubmit={handleSubmitGeral}>
                    <fieldset disabled={isViewOnly}>
                      <div className="en-roles">
                        {[
                          { key: 'eh_empresa_consultora', label: 'Entidade Consultora', text: 'Ativa a área de configurações extra da entidade se for uma empresa consultora.', icon: Icons.Diamond, color: '#8b5cf6' },
                          { key: 'eh_organismo', label: 'É Entidade Financiadora?', text: 'Usa esta opção quando a é uma entidade financiadora.', icon: Icons.Landmark, color: '#0ea5e9' },
                          { key: 'tem_cursos', label: 'Disponibiliza Cursos?', text: 'Marca se a entidade promove formação ou cursos próprios.', icon: Icons.Users, color: '#10b981' },
                        ].map((role) => {
                          const RoleIcon = role.icon;
                          const on = Boolean(form[role.key]);
                          return (
                            <div key={role.key} className={`en-role ${on ? 'is-on' : ''}`} style={{ '--r': role.color }}>
                              <span className="en-role-ico"><RoleIcon size={18} color="currentColor" /></span>
                              <label>{role.label}</label>
                              <p>{role.text}</p>
                              <ToggleSwitch
                                checked={on}
                                onChange={(value) => setForm({ ...form, [role.key]: value })}
                                disabled={isViewOnly}
                              />
                            </div>
                          );
                        })}
                      </div>

                      {!isViewOnly && <div className="en-savebar"><button type="submit" className="en-btn is-primary is-lg"><Icons.Save /> Guardar Funções</button></div>}
                    </fieldset>
                  </form>
                )}

                {/* --- ABA DE PROJETOS DOZ CLIENTE --- */}
                {activeTab === 'projetos' && (
                    <div className="bz-tab-panel en-tab">
                        <div className="en-sec-head">
                            <div>
                                <h4>Histórico de Projetos</h4>
                                <p>Todos os trabalhos associados a {form.marca}.</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => navigate('/dashboard/projetos', { state: { prefillClienteId: editId, openNewProjectModal: true } })}
                                className="en-btn is-primary"
                            >
                                <Icons.Plus /> Novo Projeto
                            </button>
                        </div>

                        {projetosCliente.length > 0 && (
                          <div className="en-mini-kpis">
                            <div><span>Projetos</span><strong>{projetosCliente.length}</strong></div>
                            <div><span>Em curso</span><strong>{projetosCliente.filter((p) => p.estado === 'em_curso' || p.estado === 'ativo').length}</strong></div>
                            <div><span>Investimento</span><strong>{entEuro(projetosCliente.reduce((t, p) => t + (Number(p.investimento) || 0), 0))}</strong></div>
                            <div className="is-green"><span>Incentivo</span><strong>{entEuro(projetosCliente.reduce((t, p) => t + (Number(p.incentivo) || 0), 0))}</strong></div>
                          </div>
                        )}

                        {projetosCliente.length > 0 ? (
                            <div className="en-pcards">
                                {projetosCliente.map(p => {
                                  const isDone = p.estado === 'concluido';
                                  const tipoProjetoNome = p.tipos_projeto?.nome || 'Sem tipo';
                                  const estadoMeta = ENT_PROJ_STATES.find((s) => s.match(p.estado)) || { color: '#64748b' };

                                  // Configuração visual das tags com base no campo is_parceria real
                                  let relacaoInfo = { label: 'Entidade Única', tone: 'neutral' };

                                  if (p.is_parceria === true) {
                                      // Se a entidade atual for o cliente_id principal do projeto, ele lidera a parceria
                                      if (p.relacao_cliente === 'cliente_unico' || p.relacao_cliente === 'cliente_unico_e_parceiro') {
                                          relacaoInfo = { label: 'Parceria (Líder)', tone: 'gold' };
                                      } else {
                                          // Se ele for um dos IDs no array parceiros_ids
                                          relacaoInfo = { label: 'Parceiro', tone: 'purple' };
                                      }
                                  } else if (p.relacao_cliente === 'parceiro') {
                                      relacaoInfo = { label: 'Parceiro', tone: 'purple' };
                                  }

                                  return (
                                      <div key={p.id} onClick={() => navigate(`/dashboard/projetos/${p.id}`)} className={`en-pcard ${p.estado === 'encerrado' ? 'is-done' : ''}`} style={{ '--s': estadoMeta.color }}>
                                          <div className="en-pcard-tags">
                                              <span className="en-pcard-state"><i />{String(p.estado || '').replace('_', ' ')}</span>
                                              <span className={`en-rel is-${relacaoInfo.tone}`}>{relacaoInfo.label}</span>
                                              <span className="en-rel is-blue">Tipo: {tipoProjetoNome}</span>
                                              {p.codigo_projeto && <span className="en-pcard-code">{p.codigo_projeto}</span>}
                                          </div>

                                          <h4>{p.titulo}</h4>

                                          <div className="en-pcard-facts">
                                              <div>
                                                <span>Duração</span>
                                                <strong>
                                                  <Icons.Calendar size={13} />
                                                  {p.data_inicio ? new Date(p.data_inicio).toLocaleDateString('pt-PT', {month: '2-digit', year: 'numeric'}) : '—'}
                                                  <em>al</em>
                                                  {p.data_fim ? new Date(p.data_fim).toLocaleDateString('pt-PT', {month: '2-digit', year: 'numeric'}) : '—'}
                                                </strong>
                                              </div>
                                              <div>
                                                <span>Investimento</span>
                                                <strong>{p.investimento === null || p.investimento === undefined ? '-' : entEuro(p.investimento)}</strong>
                                              </div>
                                              <div>
                                                <span>Incentivo</span>
                                                <strong className="is-green">{p.incentivo === null || p.incentivo === undefined ? '-' : entEuro(p.incentivo)}</strong>
                                              </div>
                                          </div>

                                          <div className="en-pcard-foot">
                                              <span>Criado em {p.created_at ? new Date(p.created_at).toLocaleDateString('pt-PT') : '—'}</span>
                                              <button
                                                type="button"
                                                onClick={(e) => openProjectTimerModal(p, e)}
                                                disabled={isDone}
                                                className="en-play"
                                                title={isDone ? "Projeto concluído: cronómetro indisponível" : "Iniciar cronómetro neste projeto"}
                                              >
                                                <Icons.Play size={10} /> Iniciar
                                              </button>
                                              <span className="en-pcard-open">Abrir <Icons.ArrowRight /></span>
                                          </div>
                                      </div>
                                  )
                              })}
                            </div>
                        ) : (
                            <div className="en-empty is-inline">
                                <span className="en-empty-ico"><Icons.Rocket size={30} color="currentColor" /></span>
                                <h3>Esta entidade ainda não tem projetos.</h3>
                                <p>Cria um novo projeto e ele aparecerá aqui automaticamente.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* --- ABA ATIVIDADE E CAES --- */}
                {activeTab === 'atividade' && (
                  <div className="bz-tab-panel en-tab">
                    <section className="en-fcard">
                        <div className="en-fcard-title"><span className="en-fcard-ico"><Icons.FileText size={15} /></span> Objeto Social</div>
                        <textarea disabled={isViewOnly} rows="5" value={form.objeto_social} onChange={e => setForm({...form, objeto_social: e.target.value})} className="en-textarea" />
                        {!isViewOnly && <div className="en-row-end"><button type="button" className="en-btn is-primary" onClick={handleSubmitGeral}><Icons.Save /> Atualizar Objeto Social</button></div>}
                    </section>

                    <div className="en-sec-head">
                      <div>
                        <h4>Lista de CAEs <em className="en-count-pill">{caes.length}</em></h4>
                      </div>
                      {!isViewOnly && (
                        <div className="en-sec-actions">
                          <button
                            type="button"
                            className="en-btn is-soft"
                            onClick={handleFetchCaesByNif}
                            disabled={isFetchingCaeByNif}
                            title="Consulta automática de CAE com base no NIF"
                          >
                            {isFetchingCaeByNif ? <span className="en-spinner is-sm" /> : <Icons.Search />} {isFetchingCaeByNif ? "A procurar..." : "Procurar CAE pelo NIF"}
                          </button>
                          {!showAddCae && <button type="button" className="en-btn is-primary" onClick={() => {setNovoCae(initCae); setShowAddCae(true)}}><Icons.Plus /> Adicionar CAE</button>}
                        </div>
                      )}
                    </div>

                    {showAddCae && (
                      <section className="en-fcard is-editing">
                        <div className="en-fcard-title"><span className="en-fcard-ico"><Icons.Edit size={14} /></span> {novoCae.id ? 'Editar CAE' : 'Novo CAE'}</div>
                        <div className="en-cae-form">
                          <input type="text" className="en-input" placeholder="Código (Ex: 62010)" value={novoCae.codigo} onChange={e => setNovoCae({...novoCae, codigo: e.target.value})} />
                          <input type="text" className="en-input" placeholder="Descrição" value={novoCae.descricao} onChange={e => setNovoCae({...novoCae, descricao: e.target.value})} />
                          <label className={`en-check ${novoCae.principal ? 'is-on' : ''}`}>
                            <input type="checkbox" checked={novoCae.principal} onChange={e => setNovoCae({...novoCae, principal: e.target.checked})} />
                            <span className="en-check-box"><Icons.Check size={12} /></span> Principal
                          </label>
                        </div>
                        <div className="en-form-actions">
                          <button type="button" className="en-btn is-ghost" onClick={() => {setShowAddCae(false); setNovoCae(initCae);}}>Cancelar</button>
                          <button type="button" className="en-btn is-primary" onClick={() => saveSubItem('caes_cliente', novoCae, setCaes, caes, setNovoCae, initCae, setShowAddCae)}>{novoCae.id ? 'Atualizar' : 'Guardar CAE'}</button>
                        </div>
                      </section>
                    )}

                    {caes.length > 0 ? (
                      <ul className="en-items">
                        {[...caes].sort((a, b) => Number(Boolean(b.principal)) - Number(Boolean(a.principal))).map(c => (
                          <li key={c.id} className={`en-item ${c.principal ? 'is-main' : ''}`}>
                            <span className="en-cae-code">{c.codigo}</span>
                            <div className="en-item-body">
                              {c.principal && <span className="en-tag is-green">PRINCIPAL</span>}
                              <p>{c.descricao || 'Sem descrição'}</p>
                            </div>
                            {!isViewOnly && (
                              <div className="en-item-actions">
                                 <button type="button" onClick={() => abrirEdicaoSubItem(c, setNovoCae, setShowAddCae)} className="en-icon-btn is-edit" title="Editar"><Icons.Edit size={15} /></button>
                                 <button type="button" onClick={() => deleteItem('caes_cliente', c.id, setCaes, caes)} className="en-icon-btn is-archive" title="Eliminar"><Icons.Trash size={15} /></button>
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : !showAddCae && (
                      <div className="en-empty is-inline is-small"><span className="en-empty-ico"><Icons.Activity size={26} color="currentColor" /></span><p>Ainda não há CAEs registados.</p></div>
                    )}
                  </div>
                )}

                {/* --- ABA DOCUMENTOS --- */}
                {activeTab === 'documentos' && (
                  <form className="bz-tab-panel en-tab en-form" onSubmit={handleSubmitGeral}>
                    <fieldset>
                      {[
                        { title: 'Certidão Permanente', label: 'Código Certidão Permanente', key: 'certidao_permanente', dateKey: 'validade_certidao', placeholder: 'Ex: 1234-5678-9012', copyLabel: 'Certidão Permanente', copyTitle: 'Copiar código da certidão', url: 'https://www2.gov.pt/espaco-empresa/empresa-online/consultar-a-certidao-permanente', urlTitle: 'Abrir Portal da Certidão Permanente', color: '#0ea5e9' },
                        { title: 'RCBE', label: 'Código RCBE', key: 'rcbe', dateKey: 'validade_rcbe', placeholder: 'Código de acesso RCBE', copyLabel: 'Código RCBE', copyTitle: 'Copiar código RCBE', url: 'https://rcbe.justica.gov.pt', urlTitle: 'Abrir Portal RCBE', color: '#8b5cf6' },
                      ].map((doc) => {
                        const status = entDocStatus(form[doc.dateKey]);
                        return (
                          <section key={doc.key} className="en-doc" style={{ '--d': doc.color }}>
                            <div className="en-doc-head">
                              <span className="en-doc-ico"><Icons.FileText size={20} /></span>
                              <strong>{doc.title}</strong>
                              <span className={`en-doc-status is-${status.tone}`}><i />{status.label}</span>
                            </div>
                            <div className="en-doc-grid">
                              <div className="en-field">
                                <label>{doc.label}</label>
                                <div className="en-input-row">
                                  <input type="text" className="en-input is-mono" disabled={isViewOnly} value={form[doc.key]} onChange={e => setForm({...form, [doc.key]: e.target.value})} placeholder={doc.placeholder} />
                                  <button type="button" onClick={() => handleCopyCredential(form[doc.key], doc.copyLabel)} title={doc.copyTitle} className="en-link-btn">
                                    <Icons.Copy />
                                  </button>
                                  <a href={doc.url} target="_blank" rel="noopener noreferrer" title={doc.urlTitle} className="en-link-btn">
                                    <Icons.ExternalLink />
                                  </a>
                                </div>
                              </div>
                              <div className="en-field">
                                <label>Data de Validade</label>
                                <input type="date" className="en-input" disabled={isViewOnly} value={form[doc.dateKey] || ""} onChange={e => setForm({...form, [doc.dateKey]: e.target.value})} />
                              </div>
                            </div>
                          </section>
                        );
                      })}

                      {!isViewOnly && <div className="en-savebar"><button type="submit" className="en-btn is-primary is-lg"><Icons.Save /> Guardar Documentos</button></div>}
                    </fieldset>
                  </form>
                )}

                {/* --- ABA PLANO --- */}
                {activeTab === 'plano' && (
                  <div className="bz-tab-panel en-tab">
                     <div className="en-sec-head is-center">
                       <div>
                         <h4>Plano de Subscrição</h4>
                       </div>
                     </div>
                     <div className="en-plans">
                       {[
                         { value: 'Standard', color: '#64748b', icon: Icons.ClipboardList },
                         { value: 'Premium', color: '#0ea5e9', icon: Icons.Rocket },
                         { value: 'Enterprise', color: '#8b5cf6', icon: Icons.Diamond },
                       ].map((plan) => {
                         const PlanIcon = plan.icon;
                         const on = form.plano === plan.value;
                         return (
                           <button
                             key={plan.value}
                             type="button"
                             disabled={isViewOnly}
                             className={`en-plan ${on ? 'is-on' : ''}`}
                             style={{ '--p': plan.color }}
                             onClick={() => setForm({...form, plano: plan.value})}
                           >
                             <span className="en-plan-ico"><PlanIcon size={22} color="currentColor" /></span>
                             <strong>{plan.value}</strong>
                             <span className="en-plan-check">{on ? <Icons.Check size={14} /> : null}</span>
                           </button>
                         );
                       })}
                     </div>
                     {!isViewOnly && <div className="en-savebar is-center"><button type="button" className="en-btn is-primary is-lg" onClick={handleSubmitGeral}><Icons.Check size={16} /> Confirmar Plano</button></div>}
                  </div>
                )}

                {/* --- ABA PESSOAS --- */}
                {activeTab === 'contactos' && (
                  <div className="bz-tab-panel en-tab">
                    <div className="en-sec-head">
                      <div>
                        <h4>Equipa da Entidade <em className="en-count-pill">{contactos.length}</em></h4>
                      </div>
                      {!isViewOnly && !showAddContacto && <button type="button" className="en-btn is-primary" onClick={() => { setNovoContacto(initContacto); setIsOutroCargo(false); setShowAddContacto(true); }}><Icons.Plus /> Adicionar Pessoa</button>}
                    </div>

                    {showAddContacto && (
                      <section className="en-fcard is-editing">
                        <div className="en-fcard-title"><span className="en-fcard-ico"><Icons.User size={15} /></span> {novoContacto.id ? 'Editar Pessoa' : 'Nova Pessoa'}</div>
                        <div className="en-grid is-2">
                          <div className="en-field">
                              <label>Nome Completo *</label>
                              <input type="text" className="en-input" placeholder="João Silva" value={novoContacto.nome_contacto} onChange={e => setNovoContacto({...novoContacto, nome_contacto: e.target.value})} required />
                          </div>
                          <div className="en-field">
                              <label>Cargo</label>
                              <select
                                className="en-input"
                                value={getCargoSelectValue(novoContacto.cargo)}
                                onChange={(e) => {
                                  const selected = e.target.value;
                                  if (selected === OUTRO_CARGO_VALUE) {
                                    setIsOutroCargo(true);
                                    if (isKnownCargo(novoContacto.cargo)) {
                                      setNovoContacto({ ...novoContacto, cargo: "" });
                                    }
                                  } else {
                                    setIsOutroCargo(false);
                                    setNovoContacto({ ...novoContacto, cargo: selected });
                                  }
                                }}
                              >
                                <option value="">Selecionar cargo</option>
                                {CARGO_OPTIONS.map((cargo) => (
                                  <option key={cargo} value={cargo}>{cargo}</option>
                                ))}
                                <option value={OUTRO_CARGO_VALUE}>Outro</option>
                              </select>
                              {isOutroCargo && (
                                <input
                                  type="text"
                                  className="en-input"
                                  placeholder="Escreve o cargo"
                                  value={novoContacto.cargo || ""}
                                  onChange={e => setNovoContacto({ ...novoContacto, cargo: e.target.value })}
                                />
                              )}
                          </div>
                          <div className="en-field">
                              <label>Email</label>
                              <div className="en-input-icon"><Icons.Mail /><input type="email" className="en-input" placeholder="joao@entidade.pt" value={novoContacto.email} onChange={e => setNovoContacto({...novoContacto, email: e.target.value})} /></div>
                          </div>
                          <div className="en-field">
                              <label>Telefone / Telemóvel</label>
                              <div className="en-input-icon"><Icons.Phone /><input type="text" className="en-input" placeholder="+351 900 000 000" value={novoContacto.telefone} onChange={e => setNovoContacto({...novoContacto, telefone: e.target.value})} /></div>
                          </div>
                        </div>
                        <label className={`en-check is-block ${novoContacto.faz_propostas ? 'is-on' : ''}`} htmlFor="faz_propostas">
                          <input type="checkbox" id="faz_propostas" checked={Boolean(novoContacto.faz_propostas)} onChange={e => setNovoContacto({...novoContacto, faz_propostas: e.target.checked})} disabled={isViewOnly} />
                          <span className="en-check-box"><Icons.Check size={12} /></span>
                          <span>
                            Pode fazer propostas comerciais
                            <small>(Aparecerá em Propostas Comerciais)</small>
                          </span>
                        </label>
                        <div className="en-form-actions">
                          <button type="button" className="en-btn is-ghost" onClick={() => { setShowAddContacto(false); setNovoContacto(initContacto); setIsOutroCargo(false); }}>Cancelar</button>
                          <button type="button" className="en-btn is-primary" onClick={() => { saveSubItem('contactos_cliente', novoContacto, setContactos, contactos, setNovoContacto, initContacto, setShowAddContacto); setIsOutroCargo(false); }}>{novoContacto.id ? 'Atualizar' : 'Guardar Pessoa'}</button>
                        </div>
                      </section>
                    )}

                    {contactos.length > 0 ? (
                      <ul className="en-people">
                        {contactos.map((c, index) => (
                          <li key={c.id} className="en-person" style={{ '--c': clientColors[(index + 1) % clientColors.length] }}>
                            <span className="en-avatar is-md">{entInitials(c.nome_contacto)}</span>
                            <div className="en-person-body">
                              <strong>{c.nome_contacto}</strong>
                              {c.cargo && <span className="en-person-role">{c.cargo}</span>}
                              {c.faz_propostas && <span className="en-tag is-blue">Faz propostas</span>}
                              <div className="en-person-links">
                                {c.email && <a href={`mailto:${c.email}`}><Icons.Mail /> {c.email}</a>}
                                {c.telefone && <a href={`tel:${c.telefone}`}><Icons.Phone /> {c.telefone}</a>}
                              </div>
                            </div>
                            {!isViewOnly && (
                              <div className="en-item-actions">
                                 <button type="button" onClick={() => { setNovoContacto(c); setIsOutroCargo(Boolean(c.cargo) && !isKnownCargo(c.cargo)); setShowAddContacto(true); }} className="en-icon-btn is-edit" title="Editar"><Icons.Edit size={15} /></button>
                                 <button type="button" onClick={() => deleteItem('contactos_cliente', c.id, setContactos, contactos)} className="en-icon-btn is-archive" title="Eliminar"><Icons.Trash size={15} /></button>
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : !showAddContacto && (
                      <div className="en-empty is-inline is-small"><span className="en-empty-ico"><Icons.Users size={26} color="currentColor" /></span><p>Ainda não há pessoas registadas.</p></div>
                    )}
                  </div>
                )}

                {/* --- ABA MORADAS --- */}
                {activeTab === 'moradas' && (
                  <div className="bz-tab-panel en-tab">
                    <div className="en-sec-head">
                      <div>
                        <h4>Moradas Registadas <em className="en-count-pill">{moradas.length}</em></h4>
                      </div>
                      {!isViewOnly && !showAddMorada && <button type="button" className="en-btn is-primary" onClick={() => {setNovaMorada(initMorada); setShowAddMorada(true)}}><Icons.Plus /> Adicionar Morada</button>}
                    </div>

                    {showAddMorada && (
                      <section className="en-fcard is-editing">
                        <div className="en-fcard-title"><span className="en-fcard-ico"><Icons.MapPin size={15} /></span> {novaMorada.id ? 'Editar Morada' : 'Nova Morada'}</div>

                        <div className="en-field">
                          <label>Rua / Lote / Porta</label>
                          <input type="text" className="en-input" placeholder="Ex: Rua Direita, nº 10" value={novaMorada.morada} onChange={e => setNovaMorada({...novaMorada, morada: e.target.value})} />
                        </div>

                        <div className="en-grid" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 2fr)' }}>
                            <div className="en-field">
                                <label>Cód. Postal <span className="en-hint-inline">(Preenchimento Auto)</span></label>
                                <input
                                    type="text"
                                    className="en-input is-accent"
                                    placeholder="Ex: 8000-000"
                                    maxLength="8"
                                    value={novaMorada.codigo_postal || ""}
                                    onChange={e => {
                                        let val = e.target.value;
                                        // Auto-formatação: mete o tracinho sozinho
                                        if (val.length === 4 && !val.includes('-') && (novaMorada.codigo_postal || "").length < 4) {
                                            val += '-';
                                        }
                                        setNovaMorada({...novaMorada, codigo_postal: val});

                                        // Dispara a pesquisa mal chega aos 8 caracteres
                                        if (val.length === 8 && val.includes('-')) {
                                            fetchMoradaByCodigoPostal(val);
                                        }
                                    }}
                                />
                            </div>
                            <div className="en-field">
                                <label>Localidade</label>
                                <input type="text" className="en-input" placeholder="Ex: Faro" value={novaMorada.localidade} onChange={e => setNovaMorada({...novaMorada, localidade: e.target.value})} />
                            </div>
                        </div>

                        <div className="en-grid is-3">
                            <div className="en-field">
                                <label>Concelho <span className="en-hint-inline">(Preenche o resto)</span></label>
                                <input
                                    type="text"
                                    className="en-input is-accent"
                                    value={novaMorada.concelho || ""}
                                    onChange={e => setNovaMorada({...novaMorada, concelho: e.target.value})}
                                    onBlur={e => fetchDadosByConcelho(e.target.value)}
                                    placeholder="Ex: Albufeira"
                                />
                            </div>
                            <div className="en-field">
                                <label>Distrito</label>
                                <input type="text" className="en-input" value={novaMorada.distrito} onChange={e => setNovaMorada({...novaMorada, distrito: e.target.value})} />
                            </div>
                            <div className="en-field">
                                <label>Região</label>
                                <input type="text" className="en-input" value={novaMorada.regiao} onChange={e => setNovaMorada({...novaMorada, regiao: e.target.value})} />
                            </div>
                        </div>

                        <div className="en-field">
                          <label>Tipo / Notas Opcionais</label>
                          <input type="text" className="en-input" placeholder="Ex: Sede, Armazém, Local de Faturação..." value={novaMorada.notas} onChange={e => setNovaMorada({...novaMorada, notas: e.target.value})} />
                        </div>

                        <div className="en-form-actions">
                            <button type="button" className="en-btn is-ghost" onClick={() => {setShowAddMorada(false); setNovaMorada(initMorada);}}>Cancelar</button>
                            <button type="button" className="en-btn is-primary" onClick={() => saveSubItem('moradas_cliente', novaMorada, setMoradas, moradas, setNovaMorada, initMorada, setShowAddMorada)}>{novaMorada.id ? 'Atualizar' : 'Guardar Morada'}</button>
                        </div>
                      </section>
                    )}

                    {moradas.length > 0 ? (
                      <ul className="en-addr-list">
                        {moradas.map(m => {
                          const mapQuery = encodeURIComponent([m.morada, m.codigo_postal, m.localidade].filter(Boolean).join(', '));
                          return (
                            <li key={m.id} className="en-addr">
                              <span className="en-addr-pin"><Icons.MapPin size={18} /></span>
                              <div className="en-item-body">
                                {m.notas && <span className="en-tag is-brand">{m.notas}</span>}
                                <strong>{m.morada}</strong>
                                <span className="en-addr-line">{m.codigo_postal} {m.localidade}</span>
                                <span className="en-addr-sub">{[m.concelho, m.distrito, m.regiao].filter(Boolean).join(' • ')}</span>
                                {mapQuery && <a className="en-addr-map" href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`} target="_blank" rel="noopener noreferrer"><Icons.ExternalLink size={12} /> Ver no mapa</a>}
                              </div>
                              {!isViewOnly && (
                                <div className="en-item-actions">
                                   <button type="button" onClick={() => abrirEdicaoSubItem(m, setNovaMorada, setShowAddMorada)} className="en-icon-btn is-edit" title="Editar"><Icons.Edit size={15} /></button>
                                   <button type="button" onClick={() => deleteItem('moradas_cliente', m.id, setMoradas, moradas)} className="en-icon-btn is-archive" title="Eliminar"><Icons.Trash size={15} /></button>
                                </div>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    ) : !showAddMorada && (
                      <div className="en-empty is-inline is-small"><span className="en-empty-ico"><Icons.MapPin size={26} color="currentColor" /></span><p>Ainda não há moradas registadas.</p></div>
                    )}
                  </div>
                )}

                {/* --- ABA CONFIGURAÇÕES DE ENTIDADE (só para consultoras) --- */}
                {activeTab === 'configuracoes' && form.eh_empresa_consultora && (
                  <div className="bz-tab-panel en-tab en-cfg">
                    <div className="en-sec-head">
                      <div>
                        <h4>Configurações de Proposta</h4>
                        <p>{form.tem_cursos ? 'Textos usados nas propostas de formação.' : 'Textos usados nas propostas de financiamento.'}</p>
                      </div>
                    </div>

                    <section className="en-fcard">
                      <div className="en-fcard-title"><span className="en-fcard-ico"><Icons.User size={15} /></span> Assinatura e Contacto da Proposta</div>
                      <div className="en-grid is-4">
                        {[
                          ['Nome do Signatário', 'signatario_nome', 'text', 'Nome a apresentar na proposta'],
                          ['Cargo do Signatário', 'signatario_cargo', 'text', 'Cargo/função'],
                          ['Telefone do Signatário', 'signatario_telefone', 'text', '+351 900 000 000'],
                          ['Email do Signatário', 'signatario_email', 'email', 'email@entidade.pt'],
                        ].map(([label, key, type, placeholder]) => (
                          <div key={key} className="en-field">
                            <label>{label}</label>
                            <input type={type} className="en-input" value={entidadeConfig[key] || ""} onChange={e => setEntidadeConfig({...entidadeConfig, [key]: e.target.value})} placeholder={placeholder} disabled={isViewOnly} />
                          </div>
                        ))}
                      </div>
                    </section>

                    <section className="en-fcard">
                      <div className="en-fcard-title"><span className="en-fcard-ico"><Icons.FileText size={15} /></span> Textos de Introdução</div>
                      {cfgArea('Texto de Compromisso', 'texto_compromisso', 3, 'O nosso compromisso...')}
                      {cfgArea('Texto para Aprovação', 'texto_para_aprovacao', 2, 'Texto a apresentar para aprovação...')}
                      {cfgArea('Esperamos que Corresponda', 'texto_esperamos_que_corresponda', 2, 'Mensagem de fechamento...')}
                    </section>

                    {/* NEOMARCA - Campos de Financiamento */}
                    {!form.tem_cursos && (
                      <>
                        <section className="en-fcard">
                          <div className="en-fcard-title"><span className="en-fcard-ico"><Icons.Building size={15} /></span> Apresentação da Empresa</div>
                          {cfgArea('Texto de Apresentação Empresa', 'texto_apresentacao_empresa', 4, 'Texto de apresentação da empresa...')}
                          {cfgArea('Texto de Compromisso', 'texto_compromisso', 3, 'Nosso compromisso...')}
                        </section>

                        <section className="en-fcard">
                          <div className="en-fcard-title"><span className="en-fcard-ico"><Icons.ClipboardList size={15} /></span> Documentação</div>
                          <div className="en-grid is-2">
                            {cfgArea('Documentos da Empresa', 'texto_documentos_empresa', 3, 'Descreva os documentos fornecidos pela empresa...')}
                            {cfgArea('Documentos de Incentivo', 'texto_documentos_incentivo', 3, 'Informações sobre incentivos...')}
                          </div>
                        </section>

                        <section className="en-fcard">
                          <div className="en-fcard-title"><span className="en-fcard-ico"><Icons.Rocket size={15} /></span> Processo e Financiamento</div>
                          <div className="en-grid is-2">
                            {cfgArea('Demonstração de Financiamento', 'texto_demonstracao_financiamento', 3, 'Como o financiamento funciona...')}
                            {cfgArea('Como Ajudamos', 'texto_como_ajudamos', 3, 'Descreva como a empresa ajuda os clientes...')}
                            {cfgArea('Processo de Trabalho', 'texto_processo_trabalho', 3, 'Descreva o processo de trabalho...')}
                            {cfgArea('Plano de Pagamento', 'texto_plano_pagamento', 3, 'Condições de pagamento...')}
                            {cfgArea('Exclusões/Condições Especiais', 'texto_exclusoes', 3, 'Exclusões ou condições especiais...')}
                            {cfgArea('Nota dos Honorários', 'texto_nota_honorarios', 3, 'Os valores apresentados estão isentos de IVA. Proposta para um máx. 15 pax')}
                          </div>
                        </section>

                        <section className="en-fcard">
                          <div className="en-fcard-title"><span className="en-fcard-ico"><Icons.Check size={15} /></span> Aprovação</div>
                          {cfgArea('Texto para Aprovação', 'texto_para_aprovacao', 2, 'Texto a apresentar para aprovação...')}
                          {cfgArea('Esperamos que Corresponda', 'texto_esperamos_que_corresponda', 2, 'Mensagem de fechamento...')}
                        </section>
                      </>
                    )}

                    {/* 2SIGLAS - Campos de Formação */}
                    {form.tem_cursos && (
                      <>
                        <section className="en-fcard">
                          <div className="en-fcard-title"><span className="en-fcard-ico"><Icons.Building size={15} /></span> Apresentação (Formação)</div>
                          {cfgArea('Apresentação da Empresa - Formação', 'texto_apresentacao_empresa_formacao', 4, 'Apresentação da empresa para propostas de formação...')}
                          {cfgArea('Áreas de Formação', 'texto_areas_formacao', 3, 'Principais áreas de formação oferecidas...')}
                        </section>

                        <section className="en-fcard">
                          <div className="en-fcard-title"><span className="en-fcard-ico"><Icons.FileText size={15} /></span> Proposta</div>
                          <div className="en-grid is-2">
                            {cfgArea('Proposta de Formação', 'texto_proposta_formacao', 3, 'Descrição geral da proposta de formação...')}
                            {cfgArea('Descrição do Serviço', 'texto_descricao_servico', 3, 'Descrição detalhada do serviço de formação...')}
                          </div>
                        </section>

                        <section className="en-fcard">
                          <div className="en-fcard-title"><span className="en-fcard-ico"><Icons.Users size={15} /></span> Obrigações</div>
                          <div className="en-grid is-2">
                            {cfgArea('Obrigações da Consultora', 'texto_obrigacoes_consultora', 3, 'Compromissos e obrigações da consultora...')}
                            {cfgArea('Obrigações do Cliente', 'texto_obrigacoes_cliente', 3, 'Compromissos e obrigações do cliente...')}
                          </div>
                        </section>

                        <section className="en-fcard">
                          <div className="en-fcard-title"><span className="en-fcard-ico"><Icons.Calendar size={15} /></span> Realização e Coordenação</div>
                          <div className="en-grid is-2">
                            {cfgArea('Condições de Realização', 'texto_condicoes_realizacao', 3, 'Horários, locais, e outras condições de realização...')}
                            {cfgArea('Coordenação de Formação', 'texto_coordenacao_formacao', 3, 'Informações sobre quem coordena a formação...')}
                          </div>
                        </section>

                        <section className="en-fcard">
                          <div className="en-fcard-title"><span className="en-fcard-ico"><Icons.Diamond size={15} /></span> Condições Comerciais</div>
                          <div className="en-grid is-2">
                            {cfgArea('Plano de Pagamento Padrão', 'texto_plano_pagamento', 3, 'Condições de pagamento a usar por defeito nas propostas de formação...')}
                            {cfgArea('Exclusões / Notas', 'texto_exclusoes', 3, 'Exclusões, notas ou condições especiais...')}
                          </div>
                        </section>
                      </>
                    )}

                    {/* Campos Comuns */}
                    <section className="en-fcard">
                      <div className="en-fcard-title"><span className="en-fcard-ico"><Icons.Diamond size={15} /></span> Certificações</div>
                      <div className="en-field">
                        <label>Imagem de Certificações</label>
                        <input
                          type="text"
                          className="en-input"
                          value={entidadeConfig.imagem_certificacoes || ""}
                          onChange={e => setEntidadeConfig({...entidadeConfig, imagem_certificacoes: e.target.value})}
                          placeholder="URL ou caminho da imagem de certificações"
                          disabled={isViewOnly}
                        />
                      </div>
                    </section>

                    <section className="en-fcard">
                      <div className="en-fcard-title"><span className="en-fcard-ico"><Icons.ClipboardList size={15} /></span> Termos Gerais</div>
                      <div className="en-field">
                        <label>Texto Corrido dos Termos Gerais</label>
                        <textarea
                          className="en-textarea is-doc"
                          value={form.termos_gerais || ""}
                          onChange={e => setForm(f => ({ ...f, termos_gerais: e.target.value }))}
                          rows={16}
                          placeholder="Insira aqui os Termos Gerais ou Condições Gerais da Entidade Consultora..."
                          disabled={isViewOnly}
                        />
                        <div className="en-field-note">Este texto será usado automaticamente nas propostas e pode ser personalizado por Entidade.</div>
                      </div>
                      {cfgArea('Nota dos Honorários (visível)', 'texto_nota_honorarios', 3, 'Os valores apresentados estão isentos de IVA. Proposta para um máx. 15 pax')}
                    </section>

                    {!isViewOnly && (
                      <div className="en-savebar">
                        <button type="button" className="en-btn is-primary is-lg" onClick={handleSubmitGeral}>
                          <Icons.Save /> Guardar Alterações
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* --- ABA ACESSOS --- */}
                {activeTab === 'acessos' && podeVerAcessos && (
                  <div className="bz-tab-panel en-tab">
                    <div className="en-warn">
                      <span className="en-warn-ico"><Icons.Lock size={18} /></span>
                      <span>Acesso Restrito para Administração. Não partilhe estas credenciais fora da plataforma.</span>
                    </div>

                    <div className="en-sec-head">
                      <div>
                        <h4>Credenciais Ativas <em className="en-count-pill">{acessos.length}</em></h4>
                        <p>Acessos com credenciais registadas</p>
                      </div>
                      {!isViewOnly && (
                        <button
                          type="button"
                          className="en-btn is-primary"
                          onClick={() => {
                            setNovoAcesso(initAcesso);
                            setShowAddAcesso(true);
                          }}
                        >
                          <Icons.Plus /> Nova Credencial
                        </button>
                      )}
                    </div>

                    {acessos.length > 0 ? (
                      <ul className="en-creds">
                        {[...acessos]
                          .sort((a, b) => {
                            const tipoA = a.tipos_acessos || tiposAcessosCatalogo.find((t) => String(t.id) === String(a.tipo_acesso_id)) || {};
                            const tipoB = b.tipos_acessos || tiposAcessosCatalogo.find((t) => String(t.id) === String(b.tipo_acesso_id)) || {};
                            return (tipoA.nome || "").localeCompare(tipoB.nome || "", "pt-PT", { sensitivity: "base" });
                          })
                          .map((acesso, index) => {
                          const tipo = acesso.tipos_acessos || tiposAcessosCatalogo.find((t) => String(t.id) === String(acesso.tipo_acesso_id)) || {};
                          const shown = Boolean(revealedPass[acesso.id]);
                          const tipoNome = tipo.nome || "Tipo sem nome";

                          return (
                            <li key={acesso.id} className="en-cred" style={{ '--c': clientColors[index % clientColors.length] }}>
                              <div className="en-cred-head">
                                <span className="en-cred-ico">{tipoNome.trim().length <= 3 && !tipoNome.trim().includes(" ") ? tipoNome.trim().toUpperCase() : entInitials(tipoNome).slice(0, 2)}</span>
                                <strong title={tipoNome}>{tipoNome}</strong>
                                {!isViewOnly && (
                                  <div className="en-item-actions is-row">
                                    <button type="button" onClick={() => abrirEdicaoSubItem(acesso, setNovoAcesso, setShowAddAcesso)} className="en-icon-btn is-edit" title="Editar"><Icons.Edit size={15} /></button>
                                    <button type="button" onClick={() => deleteItem('acessos_cliente', acesso.id, setAcessos, acessos)} className="en-icon-btn is-archive" title="Eliminar"><Icons.Trash size={15} /></button>
                                  </div>
                                )}
                              </div>

                              <div className="en-cred-rows">
                                <div className="en-cred-row">
                                  <span className="en-cred-label"><Icons.User size={13} /> User</span>
                                  <code>{acesso.utilizador || '—'}</code>
                                  <button type="button" className="en-copy" onClick={() => handleCopyCredential(acesso.utilizador, 'Utilizador')} title="Copiar utilizador">
                                    <Icons.Copy size={13} />
                                  </button>
                                </div>
                                <div className="en-cred-row is-pass">
                                  <span className="en-cred-label"><Icons.Lock size={13} /> Pass</span>
                                  <code>{shown ? (acesso.codigo || '—') : (acesso.codigo ? '•'.repeat(Math.min(12, String(acesso.codigo).length)) : '—')}</code>
                                  <button type="button" className="en-copy" onClick={() => setRevealedPass((prev) => ({ ...prev, [acesso.id]: !prev[acesso.id] }))} title={shown ? 'Esconder password' : 'Mostrar password'}>
                                    {shown ? <Icons.EyeOff size={13} /> : <Icons.Eye size={13} />}
                                  </button>
                                  <button type="button" className="en-copy is-danger" onClick={() => handleCopyCredential(acesso.codigo, 'Password')} title="Copiar password">
                                    <Icons.Copy size={13} />
                                  </button>
                                </div>
                              </div>

                              {tipo.url && (
                                <a href={tipo.url.startsWith('http') ? tipo.url : `https://${tipo.url}`} target="_blank" rel="noreferrer" className="en-cred-link"><Icons.ExternalLink size={14} /> Abrir Portal de Login</a>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <div className="en-empty is-inline is-small"><span className="en-empty-ico"><Icons.Lock size={26} color="currentColor" /></span><p>Ainda não há credenciais registadas.</p></div>
                    )}
                  </div>
                )}

                </div>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {cropModal.show && (
        <ModalPortal>
          <div
            style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.92)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',zIndex:1000000,padding:'16px',boxSizing:'border-box'}}
            onMouseMove={handleCropMouseMove}
            onMouseUp={handleCropMouseUp}
            onMouseLeave={handleCropMouseUp}
          >
            <div style={{color:'white',marginBottom:'12px',textAlign:'center'}}>
              <div style={{fontSize:'1.1rem',fontWeight:'bold'}}>Recortar Foto do Entidade</div>
              <div style={{fontSize:'0.78rem',color:'rgba(255,255,255,0.55)',marginTop:'3px'}}>Arrasta para mover · Scroll para aproximar/afastar</div>
            </div>

            <div
              ref={(el) => {
                cropContainerRef.current = el;
                if (el) {
                  const s = Math.min(el.offsetWidth, el.offsetHeight);
                  if (s !== cropContainerSize.w) setCropContainerSize({ w: s, h: s });
                }
              }}
              onMouseDown={handleCropMouseDown}
              style={{
                position: 'relative',
                width: 'min(80vw, 80vh, 440px)',
                height: 'min(80vw, 80vh, 440px)',
                background: '#111',
                borderRadius: '12px',
                overflow: 'hidden',
                cursor: cropDragStart ? 'grabbing' : 'grab',
                userSelect: 'none'
              }}
            >
              {cropModal.src && (
                <img
                  ref={cropImgRef}
                  src={cropModal.src}
                  alt="crop"
                  draggable={false}
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: `translate(calc(-50% + ${cropOffset.x}px), calc(-50% + ${cropOffset.y}px)) scale(${cropScale})`,
                    transformOrigin: 'center center',
                    width: cropImgNatural.w > 0 ? cropImgNatural.w : 'auto',
                    height: 'auto',
                    maxWidth: 'none',
                    pointerEvents: 'none',
                    userSelect: 'none'
                  }}
                  onLoad={(e) => {
                    const img = e.target;
                    const nw = img.naturalWidth;
                    const nh = img.naturalHeight;
                    setCropImgNatural({ w: nw, h: nh });
                    const size = cropContainerRef.current
                      ? Math.min(cropContainerRef.current.offsetWidth, cropContainerRef.current.offsetHeight)
                      : 400;
                    setCropContainerSize({ w: size, h: size });
                    const cropRadius = Math.round(size * 0.4);
                    const minScale = Math.max((cropRadius * 2) / nw, (cropRadius * 2) / nh);
                    setCropScale(minScale);
                    setCropOffset({ x: 0, y: 0 });
                  }}
                />
              )}

              <svg
                style={{position:'absolute',top:0,left:0,width:'100%',height:'100%',pointerEvents:'none'}}
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <mask id="cropMaskClientes">
                    <rect width="100%" height="100%" fill="white" />
                    <circle
                      cx="50%" cy="50%"
                      r={`${Math.round(Math.min(cropContainerSize.w, cropContainerSize.h) * 0.4)}px`}
                      fill="black"
                    />
                  </mask>
                </defs>
                <rect width="100%" height="100%" fill="rgba(0,0,0,0.58)" mask="url(#cropMaskClientes)" />
                <circle
                  cx="50%" cy="50%"
                  r={Math.round(Math.min(cropContainerSize.w, cropContainerSize.h) * 0.4)}
                  fill="none" stroke="white" strokeWidth="2"
                />
              </svg>
            </div>

            <div style={{display:'flex',alignItems:'center',gap:'10px',marginTop:'14px',width:'min(80vw,440px)'}}>
              <span style={{color:'rgba(255,255,255,0.5)',fontSize:'0.8rem'}}>−</span>
              <input
                type="range" min={1} max={100} step={1}
                value={Math.round(
                  (() => {
                    const minS = Math.max(
                      (Math.round(Math.min(cropContainerSize.w,cropContainerSize.h)*0.8)) / Math.max(cropImgNatural.w,1),
                      (Math.round(Math.min(cropContainerSize.w,cropContainerSize.h)*0.8)) / Math.max(cropImgNatural.h,1)
                    );
                    const maxS = minS * 8;
                    return ((cropScale - minS) / (maxS - minS)) * 99 + 1;
                  })()
                )}
                onChange={(ev) => {
                  const pct = (Number(ev.target.value) - 1) / 99;
                  const minS = Math.max(
                    (Math.round(Math.min(cropContainerSize.w,cropContainerSize.h)*0.8)) / Math.max(cropImgNatural.w,1),
                    (Math.round(Math.min(cropContainerSize.w,cropContainerSize.h)*0.8)) / Math.max(cropImgNatural.h,1)
                  );
                  const newScale = minS + pct * (minS * 7);
                  setCropScale(newScale);
                  setCropOffset((prev) => clampCropOffset(prev.x, prev.y, newScale));
                }}
                style={{flex:1,accentColor:'white'}}
              />
              <span style={{color:'rgba(255,255,255,0.5)',fontSize:'0.8rem'}}>+</span>
            </div>

            <div style={{display:'flex',gap:'10px',marginTop:'16px'}}>
              <button type="button" onClick={() => setCropModal({ show: false, src: null })} style={{padding:'10px 22px',borderRadius:'8px',border:'1px solid rgba(255,255,255,0.2)',background:'transparent',color:'white',cursor:'pointer',fontWeight:'bold'}}>Cancelar</button>
              <button type="button" onClick={confirmCrop} disabled={uploading} style={{padding:'10px 28px',borderRadius:'8px',border:'none',background:'var(--color-btnPrimary)',color:'white',cursor:'pointer',fontWeight:'bold',fontSize:'0.95rem'}}>{uploading ? 'A guardar...' : 'Confirmar Recorte'}</button>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* --- MODAL DE CONFIRMAÇÃO GLOBAL --- */}
      {confirmDialog.show && (
          <ModalPortal>
              <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999}}>
                  <div style={{background: 'white', padding: '30px', borderRadius: '16px', width: '90%', maxWidth: '400px', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', animation: 'fadeIn 0.2s ease-out'}}>
                      <div style={{display: 'flex', justifyContent: 'center', marginBottom: '15px'}}><Icons.Alert size={48} color={confirmDialog.isDanger ? "#ef4444" : "var(--color-btnPrimary)"} /></div>
                      <h3 style={{margin: '0 0 10px 0', color: '#1e293b', fontSize: '1.25rem'}}>Confirmação</h3>
                      <p style={{color: '#64748b', fontSize: '0.95rem', marginBottom: '25px', lineHeight: '1.5', whiteSpace: 'pre-line'}}>{confirmDialog.message}</p>
                      <div style={{display: 'flex', gap: '10px'}}>
                          <button onClick={() => setConfirmDialog({show: false})} style={{flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', background: 'white', color: '#475569', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s'}} className="hover-shadow">Cancelar</button>
                          <button onClick={confirmDialog.onConfirm} style={{flex: 1, padding: '12px', borderRadius: '10px', border: 'none', background: confirmDialog.isDanger ? '#ef4444' : 'var(--color-btnPrimary)', color: 'white', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s'}} className="hover-shadow">{confirmDialog.confirmText}</button>
                      </div>
                  </div>
              </div>
          </ModalPortal>
      )}

      {/* --- MODAL DE ACESSO (ADICIONAR / EDITAR) --- */}
      {showModal && showAddAcesso && activeTab === 'acessos' && podeVerAcessos && !isViewOnly && (
        <ModalPortal>
          <div
            style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999998}}
            onClick={() => {
              setShowAddAcesso(false);
              setNovoAcesso(initAcesso);
            }}
          >
            <div
              style={{background:'white', width:'92%', maxWidth:'680px', borderRadius:'16px', border:'1px solid #e2e8f0', boxShadow:'0 25px 50px -12px rgba(0,0,0,0.25)', overflow:'hidden', animation: 'fadeIn 0.2s ease-out'}}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{background: 'var(--color-bgSecondary)', padding: '20px 24px', display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom: '1px solid var(--color-borderColor)'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                  <div style={{background: 'var(--color-borderColorLight)', padding: '8px', borderRadius: '8px', display: 'flex', color: 'var(--color-btnPrimary)'}}><Icons.Lock size={20} /></div>
                  <h5 style={{margin:0, fontSize:'1.2rem', fontWeight: '800', color: 'var(--color-btnPrimaryDark)'}}>{novoAcesso.id ? 'Editar Credencial' : 'Nova Credencial'}</h5>
                </div>
                <button
                  onClick={() => {
                    setShowAddAcesso(false);
                    setNovoAcesso(initAcesso);
                  }}
                  style={{background:'#f1f5f9', border:'1px solid #e2e8f0', width:'36px', height:'36px', borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#1e293b', transition: '0.2s'}}
                  className="hover-shadow"
                  title="Fechar"
                >
                  <Icons.Close size={20} />
                </button>
              </div>

              <div style={{padding:'24px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px'}}>
                <div>
                  <label style={labelStyle}>Tipo de Acesso *</label>
                  <select
                    value={novoAcesso.tipo_acesso_id || ""}
                    onChange={e => setNovoAcesso({...novoAcesso, tipo_acesso_id: e.target.value})}
                    required
                    style={inputStyle}
                    className="input-focus"
                  >
                    <option value="">Selecionar tipo...</option>
                    {tiposAcessosCatalogo.map((tipo) => (
                      <option key={tipo.id} value={tipo.id}>{tipo.nome}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>Utilizador / NIF *</label>
                  <input
                    type="text"
                    value={novoAcesso.utilizador}
                    onChange={e => setNovoAcesso({...novoAcesso, utilizador: e.target.value})}
                    required
                    style={inputStyle}
                    className="input-focus"
                  />
                </div>

                <div style={{gridColumn:'1 / -1'}}>
                  <label style={labelStyle}>Password *</label>
                  <input
                    type="text"
                    value={novoAcesso.codigo}
                    onChange={e => setNovoAcesso({...novoAcesso, codigo: e.target.value})}
                    required
                    style={{...inputStyle, fontFamily:'monospace'}}
                    className="input-focus"
                  />
                </div>
              </div>

              <div style={{display:'flex', gap:'12px', marginTop:'24px', justifyContent:'flex-end', padding: '0 24px 24px 24px', borderTop: '1px solid #e2e8f0', paddingTop: '24px'}}>
                <button
                  onClick={() => {
                    setShowAddAcesso(false);
                    setNovoAcesso(initAcesso);
                  }}
                  style={{background:'#f8fafc', border:'1px solid #cbd5e1', borderRadius: '8px', color:'#64748b', cursor:'pointer', padding: '12px 24px', fontWeight: '600', fontSize: '0.95rem', transition: '0.2s'}}
                  className="hover-shadow"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => saveSubItem('acessos_cliente', novoAcesso, setAcessos, acessos, setNovoAcesso, initAcesso, setShowAddAcesso)}
                  style={{background: 'var(--color-btnPrimary)', color: 'white', border: 'none', borderRadius: '8px', cursor:'pointer', padding: '12px 24px', fontWeight: '600', fontSize: '0.95rem', transition: '0.2s', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)'}}
                  className="hover-shadow"
                >
                  {novoAcesso.id ? <><Icons.Save size={16} /> Atualizar</> : <><Icons.Plus size={16} /> Guardar Acesso</>}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      <style>{`
          /* Grelha de Clientes */
          .client-grid {
              display: grid;
              grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
              gap: 20px;
          }

          @keyframes sidePanelPullIn {
            0% {
              transform: translateX(100%);
              opacity: 0.72;
            }
            72% {
              transform: translateX(-10px);
              opacity: 1;
            }
            100% {
              transform: translateX(0);
              opacity: 1;
            }
          }

          @keyframes sidePanelPullOut {
            0% {
              transform: translateX(0);
              opacity: 1;
            }
            100% {
              transform: translateX(100%);
              opacity: 0.78;
            }
          }
          
          /* Efeito Interativo no Cartão */
          .client-card:hover {
              transform: translateY(-4px);
              border-color: #cbd5e1 !important;
              box-shadow: 0 12px 20px -5px rgba(0,0,0,0.1) !important;
          }

              .marketing-view-toggle-btn {
              border: none;
                background: transparent;
              color: #475569;
                font-size: 0.8rem;
              font-weight: 700;
                padding: 6px 12px;
                border-radius: 6px;
              cursor: pointer;
              transition: 0.2s;
            }

              .marketing-view-toggle-btn.active {
                background: #ffffff;
                color: var(--color-btnPrimary);
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            }

              .marketing-view-toggle-btn:not(.active):hover {
                color: #1e293b;
            }

            .clients-list-table .row-inactive {
              opacity: 0.65;
              background: #f8fafc;
            }

            .clients-list-row {
              cursor: pointer;
            }

              .client-color-dot {
                width: 10px;
                height: 10px;
                border-radius: 999px;
                border: 1px solid rgba(255, 255, 255, 0.8);
                box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.08);
                flex-shrink: 0;
              }

              .archive-badge,
              .active-badge {
              display: inline-flex;
              align-items: center;
                border-radius: 4px;
                padding: 2px 6px;
                font-size: 0.65rem;
                font-weight: bold;
              text-transform: uppercase;
                letter-spacing: 0.04em;
            }

              .active-badge {
              background: #dcfce7;
              color: #166534;
            }

              .archive-badge {
              background: #fee2e2;
                color: #ef4444;
            }

            .list-actions-cell {
              display: flex;
              gap: 8px;
              justify-content: flex-end;
            }

            .list-action-btn {
                border: 1px solid transparent;
                background: #ffffff;
                color: #475569;
              border-radius: 8px;
                width: 32px;
                height: 32px;
                padding: 0;
              cursor: pointer;
                display: inline-flex;
                align-items: center;
                justify-content: center;
              transition: 0.2s;
            }

            .list-action-btn.view {
              border-color: var(--color-borderColor);
              background: var(--color-bgSecondary);
              color: var(--color-btnPrimaryDark);
            }

            .list-action-btn.edit {
              border-color: #fed7aa;
              background: #fff7ed;
              color: #c2410c;
            }

            .list-action-btn.restore {
              border-color: #bbf7d0;
              background: #dcfce7;
              color: #166534;
            }

              .list-action-btn.archive {
                border-color: #fecaca;
                background: #fee2e2;
                color: #ef4444;
              }

            .list-action-btn:hover {
              transform: translateY(-1px);
              box-shadow: 0 3px 8px rgba(15, 23, 42, 0.14);
            }

            @media (max-width: 900px) {
              .list-actions-cell {
                justify-content: flex-start;
              }
            }

          .hover-shadow:hover { box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); transform: translateY(-1px); }
          .hover-blue-text:hover { background: var(--color-bgSecondary) !important; color: var(--color-btnPrimaryDark) !important; }
          .hover-orange-text:hover { background: #fff7ed !important; color: #d97706 !important; }
          .hover-green-text:hover { background: #dcfce7 !important; color: #16a34a !important; }
          .hover-red-text:hover { background: #fef2f2 !important; color: #ef4444 !important; }

          /* Focus em Inputs */
          .input-focus:focus { border-color: var(--color-btnPrimary) !important; box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1); }

          /* Action Buttons para Sub-itens */
          .action-btn { background: transparent; border: none; cursor: pointer; opacity: 0.5; transition: 0.2s; display: flex; align-items: center; justify-content: center; padding: 6px; border-radius: 6px; }
          .action-btn:hover { opacity: 1; transform: scale(1.1); }

          /* Botão External Link inline */
          .btn-icon-link { display: flex; align-items: center; justify-content: center; text-decoration: none; background: var(--color-bgSecondary); color: var(--color-btnPrimary); padding: 0 15px; height: 42px; border-radius: 8px; border: 1px solid var(--color-borderColor); transition: 0.2s; }
          .btn-icon-link:hover { background: var(--color-borderColorLight); transform: translateY(-1px); box-shadow: 0 2px 4px rgba(37,99,235,0.1); }

          /* Custom Scrollbar limpa */
          .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 10px; }

          /* Botão Add SubItem */
          .btn-small-add { background: white; border: 1px solid #cbd5e1; color: #475569; padding: 6px 12px; border-radius: 8px; font-weight: bold; font-size: 0.8rem; cursor: pointer; transition: 0.2s; }
          .btn-small-add:hover { background: #f8fafc; color: #1e293b; border-color: #94a3b8; }

          /* Animação Modal */
          @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

          .pulse-dot-white { width: 8px; height: 8px; background-color: white; border-radius: 50%; display: inline-block; animation: pulse 1.5s infinite; }
      `}</style>
    </div>
  );
}
