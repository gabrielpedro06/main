import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { createPortal } from "react-dom";
import { supabase } from "../services/supabase";
import { useAuth } from "../context/AuthContext";
import TimerSwitchModal from "../components/TimerSwitchModal";
import StopTimerNoteModal from "../components/StopTimerNoteModal";
import { hasAttendanceStartedToday, startAttendanceNow } from "../utils/attendanceGuard";
import { concludeActivityWithChildren } from "../utils/activityStatusCascade";
import { buildDependencyMaps, getActivityBlockReason } from "../utils/dependencyGuards";
import { applyStopStatusUpdateForLogTarget } from "../utils/taskTimerLifecycle";
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
    UploadCloud: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 16 12 12 8 16"></polyline><line x1="12" y1="12" x2="12" y2="21"></line><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"></path><polyline points="16 16 12 12 8 16"></polyline></svg>,
    ExternalLink: ({ size = 14, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>,
  GripVertical: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="12" r="1"></circle><circle cx="9" cy="5" r="1"></circle><circle cx="9" cy="19" r="1"></circle><circle cx="15" cy="12" r="1"></circle><circle cx="15" cy="5" r="1"></circle><circle cx="15" cy="19" r="1"></circle></svg>,
  Plus: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>,
    Lock: ({ size = 14, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>,
    Unlock: ({ size = 14, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg>,
  Rocket: ({ size = 20, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"></path><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"></path><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"></path><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"></path></svg>,
  Search: ({ size = 14, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>,
  Globe: ({ size = 14, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>,
  ListTree: ({ size = 14, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>,
  Handshake: ({ size = 14, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m11 17 2 2a1 1 0 1 0 3-3"></path><path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06 7.06l-4.28 4.28a1 1 0 0 1-1.42 0l-3-3a1 1 0 0 1-1.42 0l-3 3a1 1 0 0 1 1.42 0l3 3a1 1 0 0 1 0 1.42l-3 3a1 1 0 0 1-1.42 0l-2.5-2.5a1 1 0 1 1 3-3l3.88-3.88a3 3 0 0 1 4.24 0z"></path></svg>
};

const ModalPortal = ({ children }) => createPortal(children, document.body);

const getClientDisplayName = (client) => {
  if (!client) return "";
  const nome = client.marca?.trim() || "";
  const sigla = client.sigla?.trim() || "";
  if (nome && sigla) return `${nome} (${sigla})`;
  if (nome) return nome;
  if (sigla) return sigla;
  return "";
};

const sanitizeFileName = (rawName = "documento") => {
    const normalized = String(rawName)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

    const cleaned = normalized
        .replace(/[^a-zA-Z0-9._-]+/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_+|_+$/g, "");

    return cleaned || "documento";
};

const getFileExtension = (fileName = "") => {
    const parts = String(fileName).split(".");
    return parts.length > 1 ? (parts.pop() || "").toLowerCase() : "";
};

const getFileBaseName = (fileName = "") => {
    const normalized = String(fileName || "").trim();
    if (!normalized) return "documento";
    const parts = normalized.split(".");
    if (parts.length <= 1) return normalized;
    parts.pop();
    return parts.join(".") || "documento";
};

const ANALYSIS_DESTINATION_OPTIONS = [
    { value: "proprio", label: "Proprio" },
    { value: "colega", label: "Colega" },
    { value: "cliente", label: "Cliente" },
    { value: "contabilista", label: "Contabilista" },
    { value: "organismo", label: "Organismo" }
];

export default function ProjetoDetalhe() {
  const { id } = useParams(); 
  const navigate = useNavigate();
    const location = useLocation();
  const { user } = useAuth();
  
  const [projeto, setProjeto] = useState(null);
  const [atividades, setAtividades] = useState([]);
  const [logs, setLogs] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("atividades");
  const [notification, setNotification] = useState(null);
    const [transitionPromptOpen, setTransitionPromptOpen] = useState(false);
  const [projectActionLoading, setProjectActionLoading] = useState(false);
  const [confirmModal, setConfirmModal] = useState({
      show: false,
      action: null,
      title: "",
      message: "",
      confirmLabel: "Confirmar",
      confirmTone: "warning",
      requiresText: false,
      expectedText: "",
      inputValue: "",
      payload: null
  });
  
  const [activeLog, setActiveLog] = useState(null);
  const [timerSwitchModal, setTimerSwitchModal] = useState({ show: false, message: "", pendingTarget: null, pendingType: null });
  const [attendanceWarningModal, setAttendanceWarningModal] = useState({ show: false, message: "" });
  const [stopNoteModal, setStopNoteModal] = useState({ show: false });
  const attendancePendingActionRef = useRef(null);

  // Estados UI - Visão Geral
  const [isEditingGeral, setIsEditingGeral] = useState(false);
  const [formGeral, setFormGeral] = useState({});
  const [clientes, setClientes] = useState([]);
  const [staff, setStaff] = useState([]);
  const [entidadePessoas, setEntidadePessoas] = useState([]);
  const [tiposProjeto, setTiposProjeto] = useState([]);

  // Estados de Expansão
  const [expandedTasks, setExpandedTasks] = useState({});
  const [collapsedAtivs, setCollapsedAtivs] = useState({}); 
  const [activeSubtarefaComposer, setActiveSubtarefaComposer] = useState(null);

  const [novaAtividadeNome, setNovaAtividadeNome] = useState("");
  const [novaAtividadeResponsavel, setNovaAtividadeResponsavel] = useState("");
  const [novaTarefaNome, setNovaTarefaNome] = useState({ ativId: null, nome: "", responsavel_id: "" });
  const [novaSubtarefaNome, setNovaSubtarefaNome] = useState({ tarId: null, nome: "" });
        const [unlockedTasks, setUnlockedTasks] = useState({});
        const [unlockedActivities, setUnlockedActivities] = useState({});

  // MODAIS
  const [atividadeModal, setAtividadeModal] = useState({ show: false, data: null });
  const [tarefaModal, setTarefaModal] = useState({ show: false, data: null, atividadeNome: '' });
  const [subtarefaModal, setSubtarefaModal] = useState({ show: false, data: null, tarefaNome: '' }); 
    const [tarefaFileToUpload, setTarefaFileToUpload] = useState(null);
    const [isTarefaDeliverableDragOver, setIsTarefaDeliverableDragOver] = useState(false);
  const [parceiroSelecionado, setParceiroSelecionado] = useState("");
  const [timeLogModal, setTimeLogModal] = useState({ show: false, mode: "create", logId: null });
  const [timeLogSaving, setTimeLogSaving] = useState(false);
  const [timeLogForm, setTimeLogForm] = useState({ user_id: "", target_type: "tarefa", target_id: "", duration_minutes: "" });
    const pendingFocusRef = useRef(null);
    const [highlightedTarget, setHighlightedTarget] = useState(null);

  const normalizeIdsList = (raw) => {
      if (Array.isArray(raw)) return raw.filter(Boolean);
      if (typeof raw === "string") {
          const trimmed = raw.trim();
          if (!trimmed) return [];
          if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
              return trimmed
                  .slice(1, -1)
                  .split(",")
                  .map((item) => item.replace(/^"|"$/g, "").trim())
                  .filter(Boolean);
          }
          try {
              const parsed = JSON.parse(trimmed);
              return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
          } catch {
              return [];
          }
      }
      return [];
  };

  const normalizeBoolean = (raw) => {
      if (typeof raw === "boolean") return raw;
      if (typeof raw === "string") {
          const parsed = raw.trim().toLowerCase();
          return parsed === "true" || parsed === "1" || parsed === "sim";
      }
      return Boolean(raw);
  };

  const getProjetoClientIds = (projLike) => {
      if (!projLike) return [];
      const ids = [];
      if (projLike.cliente_id) ids.push(projLike.cliente_id);
      ids.push(...normalizeIdsList(projLike.parceiros_ids));
      return [...new Set(ids.map((v) => String(v)).filter(Boolean))];
  };

  // --- REFS PARA DRAG & DROP NATIVO ---
  const dragAtivItem = useRef();
  const dragAtivOverItem = useRef();
  
  const dragTarItem = useRef();
  const dragTarOverItem = useRef();

  useEffect(() => {
      const focusTaskId = location.state?.focusTaskId;
      const focusTaskType = location.state?.focusTaskType || 'tarefa';
      if (!focusTaskId) return;

      // Garantir que os cards existem no DOM antes de tentar o scroll.
      setActiveTab('atividades');

      pendingFocusRef.current = {
          id: String(focusTaskId),
          type: focusTaskType === 'atividade' ? 'atividade' : 'tarefa'
      };

      navigate(location.pathname, { replace: true, state: null });
  }, [location.state, location.pathname, navigate]);

    // 💡 Monitoriza o progresso e conclui o projeto automaticamente
    useEffect(() => {
        if (!projeto || projeto.estado === 'concluido' || atividades.length === 0) return;

        const todasConcluidas = atividades.every(ativ => ativ.estado === 'concluido');
    
        if (todasConcluidas) {
            const concluirProjetoAuto = async () => {
                const { error } = await supabase
                    .from("projetos")
                    .update({ estado: "concluido" })
                    .eq("id", id);
        
                if (!error) {
                    setProjeto(prev => ({ ...prev, estado: "concluido" }));
                    setNotification({ 
                        message: "Projeto finalizado! Queres iniciar a próxima etapa (ex: Gestão)?", 
                        type: 'success'
                    });
                    setTransitionPromptOpen(true);
                }
            };
            concluirProjetoAuto();
        }
    }, [atividades]);

  useEffect(() => {
      const pending = pendingFocusRef.current;
      if (!pending || atividades.length === 0) return;
      if (activeTab !== 'atividades') return;

      const elementId = pending.type === 'atividade' ? `atividade-card-${pending.id}` : `tarefa-card-${pending.id}`;
      const element = document.getElementById(elementId);
      if (!element) return;

      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedTarget(pending);
      pendingFocusRef.current = null;

      const timeoutId = window.setTimeout(() => {
          setHighlightedTarget(null);
      }, 2600);

      return () => window.clearTimeout(timeoutId);
    }, [atividades, activeTab]);

  const isHighlightedTask = (targetType, targetId) => {
      if (!highlightedTarget) return false;
      return highlightedTarget.type === targetType && String(highlightedTarget.id) === String(targetId);
  };

  useEffect(() => {
    fetchProjetoDetails();
    checkActiveLog();
  }, [id, user]);

    useEffect(() => {
            setUnlockedTasks({});
            setUnlockedActivities({});
    }, [id]);

  useEffect(() => {
      setParceiroSelecionado("");
  }, [formGeral?.cliente_id, formGeral?.is_parceria]);

  const showToast = (message, type = 'success') => {
      setNotification({ message, type });
      setTimeout(() => setNotification(null), 3000);
  };

  function openConfirmModal(config) {
      setConfirmModal({
          show: true,
          action: config.action || null,
          title: config.title || "Confirmar ação",
          message: config.message || "",
          confirmLabel: config.confirmLabel || "Confirmar",
          confirmTone: config.confirmTone || "warning",
          requiresText: Boolean(config.requiresText),
          expectedText: config.expectedText || "",
          inputValue: "",
          payload: config.payload || null
      });
  }

  function closeConfirmModal() {
      if (projectActionLoading) return;
      setConfirmModal({
          show: false,
          action: null,
          title: "",
          message: "",
          confirmLabel: "Confirmar",
          confirmTone: "warning",
          requiresText: false,
          expectedText: "",
          inputValue: "",
          payload: null
      });
  }

    // 💡 Transmitir projeto para nova etapa (ex: Gestão)
    const handleTransmitirProjeto = () => {
        const dadosParaClonar = {
            titulo: `${projeto.titulo}`,
            cliente_id: projeto.cliente_id,
            is_parceria: normalizeBoolean(projeto.is_parceria),
            parceiros_ids: normalizeIdsList(projeto.parceiros_ids),
            responsavel_id: projeto.responsavel_id,
            colaboradores: normalizeIdsList(projeto.colaboradores),
            programa: projeto.programa,
            aviso: projeto.aviso,
            codigo_projeto: projeto.codigo_projeto,
            investimento: projeto.investimento,
            incentivo: projeto.incentivo,
            descricao: projeto.descricao,
            // Deixamos o tipo_projeto_id vazio para a pessoa escolher o novo modelo (ex: Gestão)
        };

        // Navega e passa o estado para o componente pai
        navigate('/dashboard/projetos', { 
            state: { 
                prefillData: dadosParaClonar, 
                openModal: true 
            } 
        });
    };

  async function checkActiveLog() {
      if(!user?.id) return;
      const { data } = await supabase.from("task_logs").select("*").eq("user_id", user.id).is("end_time", null).maybeSingle();
      setActiveLog(data || null);
  }

  async function fetchProjetoDetails() {
    setLoading(true);
    
    const { data: projData } = await supabase.from("projetos").select("*, clientes(marca, sigla), tipos_projeto(nome), profiles(nome)").eq("id", id).single();
    if (projData) { setProjeto(projData); setFormGeral(projData); }

    const [{ data: cliData }, { data: staffData }, { data: tiposData }] = await Promise.all([
        supabase.from("clientes").select("id, marca, sigla").order("marca"),
        supabase.from("profiles").select("id, nome, email").order("nome"),
        supabase.from("tipos_projeto").select("id, nome").order("nome")
    ]);
    setClientes(cliData || []);
    setStaff(staffData || []);
    setTiposProjeto(tiposData || []);

    const entidadeIds = getProjetoClientIds(projData);
    if (entidadeIds.length > 0) {
        const { data: contactosData } = await supabase
            .from("contactos_cliente")
            .select("id, cliente_id, nome_contacto, cargo, email, clientes(marca, sigla)")
            .in("cliente_id", entidadeIds)
            .order("nome_contacto", { ascending: true });
        setEntidadePessoas(contactosData || []);
    } else {
        setEntidadePessoas([]);
    }

    const { data: ativData, error: ativError } = await supabase
        .from("atividades")
        .select(`
            id, titulo, estado, responsavel_id, data_inicio, data_fim, investimento, incentivo, financiamento, data_prevista_aprovacao, descricao, observacoes, created_at, ordem, depende_de_atividade_id, ignorar_dependencia,
            analise_destino, analise_data_prevista,
            colaboradores_extra, info_adicional,
            tarefas(id, titulo, estado, responsavel_id, colaboradores_extra, data_inicio, data_fim, prioridade, descricao, created_at, ordem, info_adicional, investimento, incentivo, financiamento, data_prevista_aprovacao, tem_entregavel, nome_entregavel, data_entregavel, arquivo_url, depende_de_tarefa_id, ignorar_dependencia, analise_destino, analise_data_prevista,
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

    const { data: logsData } = await supabase
        .from("task_logs")
        .select("*, profiles(nome)")
        .eq("projeto_id", id)
        .order("start_time", { ascending: false });
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

  const getTaskTimePerUser = (taskId) => {
      const taskLogs = logs.filter(l => l.task_id === taskId && (l.duration_minutes || 0) > 0);
      const byUser = {};
      taskLogs.forEach(l => {
          const key = l.user_id;
          if (!byUser[key]) byUser[key] = { nome: l.profiles?.nome || 'Utilizador', total: 0 };
          byUser[key].total += (l.duration_minutes || 0);
      });
      return Object.values(byUser).sort((a, b) => b.total - a.total);
  };

  const formatTime = (totalMinutes) => {
      if (totalMinutes === 0) return "0m";
      const h = Math.floor(totalMinutes / 60);
      const m = totalMinutes % 60;
      return h > 0 ? `${h}h${m}m` : `${m}m`;
  };

  const activityOptions = atividades.map((ativ) => ({ id: String(ativ.id), label: ativ.titulo }));
  const taskOptions = atividades.flatMap((ativ) =>
      (ativ.tarefas || []).map((tar) => ({
          id: String(tar.id),
          atividade_id: String(ativ.id),
          label: `${ativ.titulo} > ${tar.titulo}`
      }))
  );
  const subtaskOptions = atividades.flatMap((ativ) =>
      (ativ.tarefas || []).flatMap((tar) =>
          (tar.subtarefas || []).map((sub) => ({
              id: String(sub.id),
              task_id: String(tar.id),
              atividade_id: String(ativ.id),
              label: `${ativ.titulo} > ${tar.titulo} > ${sub.titulo}`
          }))
      )
  );

  const getTargetOptionByLog = (log) => {
      if (log?.subtarefa_id) {
          const option = subtaskOptions.find((s) => String(s.id) === String(log.subtarefa_id));
          if (option) return { target_type: "subtarefa", target_id: option.id };
      }
      if (log?.task_id) {
          const option = taskOptions.find((t) => String(t.id) === String(log.task_id));
          if (option) return { target_type: "tarefa", target_id: option.id };
      }
      if (log?.atividade_id) {
          const option = activityOptions.find((a) => String(a.id) === String(log.atividade_id));
          if (option) return { target_type: "atividade", target_id: option.id };
      }
      return { target_type: "tarefa", target_id: "" };
  };

  const getLogTargetLabel = (log) => {
      const option = getTargetOptionByLog(log);
      if (!option.target_id) return "Sem associação";
      if (option.target_type === "subtarefa") return subtaskOptions.find((s) => s.id === option.target_id)?.label || "Subtarefa";
      if (option.target_type === "tarefa") return taskOptions.find((t) => t.id === option.target_id)?.label || "Tarefa";
      return activityOptions.find((a) => a.id === option.target_id)?.label || "Atividade";
  };

  const getTargetOptions = (targetType) => {
      if (targetType === "atividade") return activityOptions;
      if (targetType === "subtarefa") return subtaskOptions;
      return taskOptions;
  };

  const isMissingSubtaskColumnError = (err) => {
      const message = String(err?.message || "").toLowerCase();
      return message.includes("subtarefa_id") && (message.includes("schema cache") || message.includes("column"));
  };

  const buildTimeLogPayload = (formState, existingLog = null) => {
      const userId = formState.user_id || "";
      const duration = Math.max(1, parseInt(formState.duration_minutes, 10) || 0);
      if (!userId || !formState.target_id || duration <= 0) return null;

      let atividadeId = null;
      let taskId = null;
      let subtarefaId = null;

      if (formState.target_type === "atividade") {
          atividadeId = formState.target_id;
      } else if (formState.target_type === "subtarefa") {
          const selectedSub = subtaskOptions.find((s) => s.id === formState.target_id);
          if (!selectedSub) return null;
          subtarefaId = selectedSub.id;
          taskId = selectedSub.task_id;
          atividadeId = selectedSub.atividade_id;
      } else {
          const selectedTask = taskOptions.find((t) => t.id === formState.target_id);
          if (!selectedTask) return null;
          taskId = selectedTask.id;
          atividadeId = selectedTask.atividade_id;
      }

      const referenceStart = existingLog?.start_time ? new Date(existingLog.start_time) : new Date(Date.now() - duration * 60 * 1000);
      const startTime = isNaN(referenceStart.getTime()) ? new Date(Date.now() - duration * 60 * 1000) : referenceStart;
      const endTime = new Date(startTime.getTime() + duration * 60 * 1000);

      return {
          user_id: userId,
          projeto_id: id,
          atividade_id: atividadeId,
          task_id: taskId,
          subtarefa_id: subtarefaId,
          duration_minutes: duration,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString()
      };
  };

  const openCreateTimeLogModal = () => {
      const firstTaskId = taskOptions[0]?.id || "";
      setTimeLogForm({
          user_id: user?.id || "",
          target_type: "tarefa",
          target_id: firstTaskId,
          duration_minutes: "30"
      });
      setTimeLogModal({ show: true, mode: "create", logId: null });
  };

  const openEditTimeLogModal = (log) => {
      const targetInfo = getTargetOptionByLog(log);
      setTimeLogForm({
          user_id: log.user_id || "",
          target_type: targetInfo.target_type,
          target_id: targetInfo.target_id,
          duration_minutes: String(log.duration_minutes || "")
      });
      setTimeLogModal({ show: true, mode: "edit", logId: log.id });
  };

  const closeTimeLogModal = () => {
      setTimeLogModal({ show: false, mode: "create", logId: null });
  };

  const saveTimeLog = async (e) => {
      e.preventDefault();
      if (timeLogSaving) return;

      const existingLog = logs.find((l) => String(l.id) === String(timeLogModal.logId));
      const payload = buildTimeLogPayload(timeLogForm, existingLog);
      if (!payload) {
          showToast("Preenche colaborador, item e minutos válidos.", "warning");
          return;
      }

      setTimeLogSaving(true);
      try {
          if (timeLogModal.mode === "edit" && existingLog) {
              let { error } = await supabase.from("task_logs").update(payload).eq("id", existingLog.id);
              if (error && isMissingSubtaskColumnError(error)) {
                  const retryPayload = { ...payload };
                  delete retryPayload.subtarefa_id;
                  const retry = await supabase.from("task_logs").update(retryPayload).eq("id", existingLog.id);
                  error = retry.error;
              }
              if (error) throw error;
              showToast("Registo de tempo atualizado.", "success");
          } else {
              let { error } = await supabase.from("task_logs").insert([payload]);
              if (error && isMissingSubtaskColumnError(error)) {
                  const retryPayload = { ...payload };
                  delete retryPayload.subtarefa_id;
                  const retry = await supabase.from("task_logs").insert([retryPayload]);
                  error = retry.error;
              }
              if (error) throw error;
              showToast("Registo manual criado.", "success");
          }
          closeTimeLogModal();
          fetchProjetoDetails();
      } catch (err) {
          showToast(`Erro ao guardar registo: ${err.message}`, "error");
      } finally {
          setTimeLogSaving(false);
      }
  };

  const deleteTimeLog = async (logId) => {
      const confirmDelete = window.confirm("Apagar este registo de tempo?");
      if (!confirmDelete) return;

      try {
          const { error } = await supabase.from("task_logs").delete().eq("id", logId);
          if (error) throw error;
          setLogs((prev) => prev.filter((l) => String(l.id) !== String(logId)));
          showToast("Registo apagado.", "success");
      } catch (err) {
          showToast(`Erro ao apagar registo: ${err.message}`, "error");
      }
  };

  const getPersonLabelById = (personId) => {
      if (!personId) return null;
      const membroInterno = staff.find(s => String(s.id) === String(personId));
      if (membroInterno) return membroInterno.nome || membroInterno.email || null;

      const contacto = entidadePessoas.find(c => String(c.id) === String(personId));
      if (!contacto) return null;
      const base = contacto.nome_contacto || contacto.email || null;
      return contacto.cargo ? `${base} (${contacto.cargo})` : base;
  };

  const getStaffNames = (responsavelId, extraIds = []) => {

      const names = [];
    const responsavelNome = getPersonLabelById(responsavelId);
      if (responsavelNome) names.push(responsavelNome);

      const extras = Array.isArray(extraIds) ? extraIds : [];
      extras.forEach(extraId => {
          if (extraId === responsavelId) return;
          const extraNome = getPersonLabelById(extraId);
          if (extraNome && !names.includes(extraNome)) names.push(extraNome);
      });

      return names.length > 0 ? names.join(", ") : "-";
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

  const getTaskContext = (taskId) => {
      for (const ativ of atividades) {
          const tarefa = (ativ.tarefas || []).find(t => t.id === taskId);
          if (tarefa) {
              return {
                  tipo: 'tarefa',
                  titulo: tarefa.titulo || 'tarefa',
                  projeto: projeto?.titulo || 'Sem projeto'
              };
          }
      }
      return null;
  };

  const getActivityContext = (atividadeId) => {
      const ativ = atividades.find(a => a.id === atividadeId);
      if (!ativ) return null;
      return {
          tipo: 'atividade',
          titulo: ativ.titulo || 'atividade',
          projeto: projeto?.titulo || 'Sem projeto'
      };
  };

  const getLogContext = (logEntry) => {
      if (!logEntry) return { tipo: 'item', titulo: 'item', projeto: projeto?.titulo || 'Sem projeto' };
      if (logEntry.task_id) return getTaskContext(logEntry.task_id) || { tipo: 'tarefa', titulo: 'tarefa', projeto: projeto?.titulo || 'Sem projeto' };
      if (logEntry.atividade_id) return getActivityContext(logEntry.atividade_id) || { tipo: 'atividade', titulo: 'atividade', projeto: projeto?.titulo || 'Sem projeto' };
      return { tipo: 'item', titulo: 'item', projeto: projeto?.titulo || 'Sem projeto' };
  };

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

  async function startTimerDirect(targetId, type) {
      const payload = { user_id: user.id, projeto_id: id, start_time: new Date().toISOString() };
      if (type === 'task') payload.task_id = targetId;
      else payload.atividade_id = targetId;

      const { data, error } = await supabase.from("task_logs").insert([payload]).select().single();
      if (!error) {
          // Se for tarefa, atualiza o estado para 'em_curso'
          if (type === 'task') {
              await supabase.from('tarefas').update({ estado: 'em_curso' }).eq('id', targetId);
          }
          setActiveLog(data);
          showToast("Cronómetro iniciado!");
      }
  }

  async function runActionWithAttendanceWarning(actionFn) {
      const hasStarted = await hasAttendanceStartedToday(supabase, user?.id);
      if (hasStarted) {
          await actionFn();
          return;
      }

      attendancePendingActionRef.current = actionFn;
      setAttendanceWarningModal({
          show: true,
          message: "Ainda não iniciaste a picagem de ponto de hoje. Queres iniciar agora?"
      });
  }

  async function handleAttendanceWarningChoice(shouldStartAttendance) {
      const pendingAction = attendancePendingActionRef.current;
      attendancePendingActionRef.current = null;
      setAttendanceWarningModal({ show: false, message: "" });

      if (shouldStartAttendance) {
          const started = await startAttendanceNow(supabase, user?.id);
          if (started) showToast("Picagem iniciada com sucesso.", "success");
          else showToast("Não foi possível iniciar a picagem agora. O cronómetro será iniciado na mesma.", "warning");
      }

      if (pendingAction) await pendingAction();
  }

  async function confirmTimerSwitch() {
      const { pendingTarget, pendingType } = timerSwitchModal;
      setTimerSwitchModal({ show: false, message: "", pendingTarget: null, pendingType: null });
      if (!pendingTarget || !pendingType) return;

      const mins = await stopLogById(activeLog);
      if (mins === null) return;
      showToast(`Cronómetro anterior terminado (${mins} min).`, "success");
      await runActionWithAttendanceWarning(() => startTimerDirect(pendingTarget, pendingType));
  }

  function cancelTimerSwitch() {
      setTimerSwitchModal({ show: false, message: "", pendingTarget: null, pendingType: null });
      showToast("Mantivemos o cronómetro atual em execução.", "info");
  }

  function getStopCompleteLabel(logEntry) {
      if (logEntry?.task_id) return "Marcar tarefa como concluida";
      if (logEntry?.atividade_id) return "Marcar atividade como concluida";
      if (logEntry?.projeto_id) return "Marcar projeto como concluido";
      return "Marcar item como concluido";
  }

  async function completeLogItem(logEntry) {
      if (!logEntry) return;

      if (logEntry.task_id) {
          await supabase
              .from("tarefas")
              .update({ estado: "concluido", data_conclusao: new Date().toISOString() })
              .eq("id", logEntry.task_id);
          return;
      }

      if (logEntry.atividade_id) {
          await concludeActivityWithChildren(supabase, logEntry.atividade_id);
          return;
      }

      if (logEntry.projeto_id) {
          await supabase.from("projetos").update({ estado: "concluido" }).eq("id", logEntry.projeto_id);
      }
  }

  function openStopNoteModal() {
      if (!activeLog) return;
      setStopNoteModal({ show: true });
  }

  function closeStopNoteModal() {
      setStopNoteModal({ show: false });
  }

  async function finalizeStopWithNote(note, shouldComplete, statusMeta = {}) {
      if (!activeLog) return;

      const logToStop = activeLog;
      const diffMins = await stopLogById(logToStop, note);
      if (diffMins === null) return;

      await applyStopStatusUpdateForLogTarget(supabase, logToStop, statusMeta);
      if (shouldComplete) await completeLogItem(logToStop);

      setActiveLog(null);
      showToast(shouldComplete ? `Tempo guardado: ${diffMins} min. Item concluido.` : `Tempo guardado: ${diffMins} min.`);
      fetchProjetoDetails();
  }

  async function confirmStopWithNote(note, shouldComplete, statusMeta) {
      setStopNoteModal({ show: false });
      if (!activeLog) return;

      if (shouldComplete) {
          await runActionWithAttendanceWarning(() => finalizeStopWithNote(note, shouldComplete, statusMeta));
          return;
      }

      await finalizeStopWithNote(note, shouldComplete, statusMeta);
  }

  async function handleToggleTimer(targetId, type) {
      if (activeLog) {
          const isSameTarget = (type === 'task' && activeLog.task_id === targetId) || (type === 'activity' && activeLog.atividade_id === targetId);
          
          if (isSameTarget) {
              openStopNoteModal();
              return;
          } else {
              const atual = getLogContext(activeLog);
              const novo = type === 'task' ? getTaskContext(targetId) : getActivityContext(targetId);
              const novoInfo = novo || { tipo: type === 'task' ? 'tarefa' : 'atividade', titulo: 'item', projeto: projeto?.titulo || 'Sem projeto' };

              setTimerSwitchModal({
                  show: true,
                  message: `Deseja terminar a ${atual.tipo} "${atual.titulo}" do projeto "${atual.projeto}" para iniciar a ${novoInfo.tipo} "${novoInfo.titulo}" do projeto "${novoInfo.projeto}"?`,
                  pendingTarget: targetId,
                  pendingType: type
              });
              return;
          }
      }

      await runActionWithAttendanceWarning(() => startTimerDirect(targetId, type));
  }

  async function toggleAtividadeStatus(ativId, estadoAtual) {
      const novoEstado = estadoAtual === 'concluido' ? 'pendente' : 'concluido';
      setAtividades(prev => prev.map(a => {
          if (a.id !== ativId) return a;
          if (novoEstado !== "concluido") return { ...a, estado: novoEstado };

          return {
              ...a,
              estado: "concluido",
              tarefas: (a.tarefas || []).map((t) => ({
                  ...t,
                  estado: "concluido",
                  subtarefas: (t.subtarefas || []).map((s) => ({ ...s, estado: "concluido" }))
              }))
          };
      }));

      if (novoEstado === "concluido") {
          const { error } = await concludeActivityWithChildren(supabase, ativId);
          if (error) {
              showToast("Erro ao concluir atividade e respetivas tarefas.", "error");
              fetchProjetoDetails();
          }
          return;
      }

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
      const payload = {
          ...atividadeModal.data,
          colaboradores_extra: (Array.isArray(atividadeModal.data.colaboradores_extra) ? atividadeModal.data.colaboradores_extra : [])
              .filter(id => id !== atividadeModal.data.responsavel_id)
      };
      delete payload.tarefas; 

      // 💡 Limpeza de dados para não dar erro no Supabase
      if (payload.investimento === "") payload.investimento = 0;
      if (payload.incentivo === "") payload.incentivo = 0;
      if (payload.financiamento === "") payload.financiamento = 0;
      if (payload.data_prevista_aprovacao === "") payload.data_prevista_aprovacao = null;
    payload.analise_destino = payload.estado === 'em_analise' ? (payload.analise_destino || 'proprio') : null;
    payload.analise_data_prevista = payload.estado === 'em_analise' ? (payload.analise_data_prevista || null) : null;

      const { error } = await supabase.from("atividades").update(payload).eq("id", payload.id);
      if (!error) {
          setAtividadeModal({ show: false, data: null });
          fetchProjetoDetails();
          showToast("Atividade atualizada com sucesso!");
      } else showToast(error.message, "error");
  }

  async function handleSaveTarefa(e) {
      e.preventDefault();
      let finalArquivoUrl = tarefaModal.data.arquivo_url || "";

      if (tarefaFileToUpload) {
          const preferredName = tarefaModal.data.nome_entregavel?.trim() || getFileBaseName(tarefaFileToUpload.name);
          const safeBaseName = sanitizeFileName(preferredName);
          const extension = getFileExtension(tarefaFileToUpload.name);
          const fileName = extension && !safeBaseName.toLowerCase().endsWith(`.${extension}`)
              ? `${safeBaseName}.${extension}`
              : safeBaseName;
          const filePath = `${user.id}/${Date.now()}/${fileName}`;

          const { error: uploadError } = await supabase.storage.from("documentos").upload(filePath, tarefaFileToUpload);
          if (uploadError) {
              showToast("Erro ao fazer upload do documento.", "error");
              return;
          }

          const { data: publicUrlData } = supabase.storage.from("documentos").getPublicUrl(filePath);
          finalArquivoUrl = publicUrlData?.publicUrl || "";
      }

      const payload = {
          ...tarefaModal.data,
          arquivo_url: finalArquivoUrl,
          tem_entregavel: Boolean(tarefaModal.data.tem_entregavel),
          nome_entregavel: tarefaModal.data.nome_entregavel || "",
          data_entregavel: tarefaModal.data.data_entregavel || null,
          colaboradores_extra: (Array.isArray(tarefaModal.data.colaboradores_extra) ? tarefaModal.data.colaboradores_extra : [])
              .filter(id => id !== tarefaModal.data.responsavel_id)
      };
      delete payload.subtarefas; 

      // 💡 Limpeza de dados para não dar erro no Supabase
      if (payload.investimento === "") payload.investimento = 0;
      if (payload.incentivo === "") payload.incentivo = 0;
      if (payload.financiamento === "") payload.financiamento = 0;
      if (payload.data_prevista_aprovacao === "") payload.data_prevista_aprovacao = null;
    payload.analise_destino = payload.estado === 'em_analise' ? (payload.analise_destino || 'proprio') : null;
    payload.analise_data_prevista = payload.estado === 'em_analise' ? (payload.analise_data_prevista || null) : null;

      const { error } = await supabase.from("tarefas").update(payload).eq("id", payload.id);
      if (!error) {
          setTarefaModal({ show: false, data: null, atividadeNome: '' });
          setTarefaFileToUpload(null);
          fetchProjetoDetails();
          showToast("Tarefa atualizada com sucesso!");
      } else showToast(error.message, "error");
  }

  const applyTarefaDeliverableFile = (file) => {
      if (!file) return;
      setTarefaFileToUpload(file);
      const detectedName = getFileBaseName(file.name);
      setTarefaModal((prev) => {
          if (!prev?.data) return prev;
          return {
              ...prev,
              data: {
                  ...prev.data,
                  nome_entregavel: detectedName
              }
          };
      });
  };

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

  // --- TOGGLES DE COLABORADORES E PARCEIROS NO EDIT ---
  const handleToggleParceiro = (cId) => {
      setFormGeral(prev => {
          if (String(cId) === String(prev.cliente_id)) return prev;
          return {
              ...prev,
              parceiros_ids: (prev.parceiros_ids || []).includes(cId)
                  ? prev.parceiros_ids.filter(id => id !== cId)
                  : [...(prev.parceiros_ids || []), cId]
          };
      });
  };

  const handleToggleColaborador = (sId) => {
      setFormGeral(prev => ({
          ...prev, 
          colaboradores: (prev.colaboradores || []).includes(sId) 
              ? prev.colaboradores.filter(id => id !== sId) 
              : [...(prev.colaboradores || []), sId]
      }));
  };

  const handleToggleTarefaColaborador = (sId) => {
      setTarefaModal(prev => {
          const selectedId = String(sId);
          const arr = Array.isArray(prev?.data?.colaboradores_extra) ? prev.data.colaboradores_extra.map(id => String(id)) : [];
          const novosColaboradores = arr.includes(selectedId)
              ? arr.filter(id => id !== selectedId)
              : [...arr, selectedId];

          return {
              ...prev,
              data: {
                  ...prev.data,
                  colaboradores_extra: novosColaboradores
              }
          };
      });
  };

  const handleToggleAtividadeColaborador = (sId) => {
      setAtividadeModal(prev => {
          const selectedId = String(sId);
          const arr = Array.isArray(prev?.data?.colaboradores_extra) ? prev.data.colaboradores_extra.map(id => String(id)) : [];
          const novosColaboradores = arr.includes(selectedId)
              ? arr.filter(id => id !== selectedId)
              : [...arr, selectedId];

          return {
              ...prev,
              data: {
                  ...prev.data,
                  colaboradores_extra: novosColaboradores
              }
          };
      });
  };

  async function handleUpdateProjeto(e) {
      e.preventDefault();
      try {
          if (!formGeral.cliente_id) {
              showToast("Seleciona um cliente principal para o projeto.", "warning");
              return;
          }

          const parceirosSanitizados = (formGeral.parceiros_ids || []).filter(
              (pid) => String(pid) !== String(formGeral.cliente_id)
          );

          const payload = {
              titulo: formGeral.titulo, cliente_id: formGeral.cliente_id, responsavel_id: formGeral.responsavel_id,
              is_parceria: formGeral.is_parceria, parceiros_ids: formGeral.is_parceria ? parceirosSanitizados : [],
              colaboradores: formGeral.colaboradores,
              cliente_texto: "",
              estado: formGeral.estado, data_inicio: formGeral.data_inicio, data_fim: formGeral.data_fim,
              programa: formGeral.programa, aviso: formGeral.aviso, codigo_projeto: formGeral.codigo_projeto,
              descricao: formGeral.descricao, observacoes: formGeral.observacoes,
              investimento: formGeral.investimento, incentivo: formGeral.incentivo,
              tipo_projeto_id: formGeral.tipo_projeto_id || null
          };
          const { error } = await supabase.from("projetos").update(payload).eq("id", id);
          if (error) throw error;
          showToast("Projeto atualizado com sucesso!");
          setIsEditingGeral(false);
          fetchProjetoDetails();
      } catch (err) { showToast("Erro: " + err.message, "error"); }
  }

  const internalAssigneeOptions = (staff || [])
      .filter((s) => Boolean(s?.id))
      .map((s) => ({ id: s.id, label: s.nome || s.email || "Colaborador interno", source: "internal" }));

  const entityAssigneeOptions = (entidadePessoas || [])
      .filter((p) => Boolean(p?.id))
      .map((p) => {
          const empresa = getClientDisplayName(p.clientes) ? ` - ${getClientDisplayName(p.clientes)}` : "";
          const cargo = p.cargo ? ` (${p.cargo})` : "";
          const nome = p.nome_contacto || p.email || "Contacto";
          return { id: p.id, label: `${nome}${cargo}${empresa}`, source: "entity" };
      });

  const assigneeOptions = [...internalAssigneeOptions, ...entityAssigneeOptions];

  const allTasksInProject = atividades.flatMap((a) => a.tarefas || []);
  const { activityById, taskById } = buildDependencyMaps(atividades, allTasksInProject);

  const isActivityBlocked = (activity) => {
      const reason = getActivityBlockReason(activity, activityById);
      if (!reason) return false;
      return !unlockedActivities[String(activity.id)];
  };

  const getTaskDependencyReason = (task, parentActivity) => {
      const parentReason = getActivityBlockReason(parentActivity, activityById);
      if (parentReason && !unlockedActivities[String(parentActivity?.id)]) {
          return parentReason;
      }

      const dependencyId = task?.depende_de_tarefa_id;
      if (!dependencyId) return null;

      const dependency = taskById.get(String(dependencyId));
      if (!dependency) return null;
      if (String(dependency.estado || "").toLowerCase() === "concluido") return null;

      return `Depende da tarefa "${dependency.titulo || "sem titulo"}"`;
  };

  const isTaskBlocked = (task, parentActivity) => {
      const reason = getTaskDependencyReason(task, parentActivity);
      if (!reason) return false;
      return !unlockedTasks[String(task.id)];
  };

  const unlockTaskForNow = async (taskId) => {
      const normalized = String(taskId);
      setUnlockedTasks((prev) => ({ ...prev, [normalized]: true }));

      await supabase
          .from("tarefas")
          .update({ ignorar_dependencia: true })
          .eq("id", taskId);

      setAtividades((prev) =>
          prev.map((atividade) => ({
              ...atividade,
              tarefas: (atividade.tarefas || []).map((tarefa) =>
                  String(tarefa.id) === normalized
                      ? { ...tarefa, ignorar_dependencia: true }
                      : tarefa
              )
          }))
      );
  };

  const unlockActivityForNow = async (activityId) => {
      const normalized = String(activityId);
      setUnlockedActivities((prev) => ({ ...prev, [normalized]: true }));

      await supabase
          .from("atividades")
          .update({ ignorar_dependencia: true })
          .eq("id", activityId);

      setAtividades((prev) =>
          prev.map((atividade) =>
              String(atividade.id) === normalized
                  ? { ...atividade, ignorar_dependencia: true }
                  : atividade
          )
      );
  };

  const renderAssigneeOptionGroups = () => (
      <>
          {internalAssigneeOptions.length > 0 && (
              <optgroup label="Equipa Interna">
                  {internalAssigneeOptions.map((opt) => <option key={`int-${opt.id}`} value={opt.id}>{opt.label}</option>)}
              </optgroup>
          )}
          {entityAssigneeOptions.length > 0 && (
              <optgroup label="Pessoas das Entidades do Projeto">
                  {entityAssigneeOptions.map((opt) => <option key={`ent-${opt.id}`} value={opt.id}>{opt.label}</option>)}
              </optgroup>
          )}
      </>
  );

  async function handleAddAtividade(e) {
      e.preventDefault();
      if(!novaAtividadeNome.trim()) return;
      await supabase.from("atividades").insert([{ projeto_id: id, titulo: novaAtividadeNome, responsavel_id: novaAtividadeResponsavel || null, colaboradores_extra: [], estado: 'pendente', ordem: atividades.length }]);
      setNovaAtividadeNome("");
      setNovaAtividadeResponsavel("");
      fetchProjetoDetails();
  }
  async function handleAddTarefa(e, ativId) {
      e.preventDefault();
      if(!novaTarefaNome.nome.trim()) return;
      const tOrdem = atividades.find(a=>a.id===ativId)?.tarefas?.length || 0;
      await supabase.from("tarefas").insert([{ atividade_id: ativId, titulo: novaTarefaNome.nome, responsavel_id: novaTarefaNome.responsavel_id || projeto.responsavel_id || null, colaboradores_extra: [], estado: 'pendente', ordem: tOrdem }]);
      setNovaTarefaNome({ ativId: null, nome: "", responsavel_id: "" });
      fetchProjetoDetails();
  }
  async function handleAddSubtarefa(e, tarId) {
      e.preventDefault();
      if(!novaSubtarefaNome.nome.trim()) return;
      await supabase.from("subtarefas").insert([{ tarefa_id: tarId, titulo: novaSubtarefaNome.nome, estado: 'pendente' }]);
      setNovaSubtarefaNome({ tarId: tarId, nome: "" });
      setActiveSubtarefaComposer(tarId);
      fetchProjetoDetails();
  }

  async function handleReuseActivityBlock(atividadeId) {
      try {
          const sourceAtividade = (atividades || []).find((a) => String(a.id) === String(atividadeId));
          if (!sourceAtividade) {
              showToast("Bloco de atividade não encontrado.", "error");
              return;
          }

          const { data: novaAtividade, error: atividadeError } = await supabase
              .from("atividades")
              .insert([{
                  projeto_id: id,
                  titulo: sourceAtividade.titulo,
                  responsavel_id: sourceAtividade.responsavel_id || null,
                  colaboradores_extra: Array.isArray(sourceAtividade.colaboradores_extra) ? sourceAtividade.colaboradores_extra : [],
                  estado: "pendente",
                  data_inicio: null,
                  data_fim: null,
                  investimento: sourceAtividade.investimento || 0,
                  incentivo: sourceAtividade.incentivo || 0,
                  descricao: sourceAtividade.descricao || null,
                  observacoes: sourceAtividade.observacoes || null,
                  ordem: (atividades || []).length
              }])
              .select("id")
              .single();

          if (atividadeError) throw atividadeError;

          const tarefasOrigem = Array.isArray(sourceAtividade.tarefas) ? sourceAtividade.tarefas : [];

          for (let idx = 0; idx < tarefasOrigem.length; idx += 1) {
              const tarefaOrigem = tarefasOrigem[idx];
              const { data: novaTarefa, error: tarefaError } = await supabase
                  .from("tarefas")
                  .insert([{
                      atividade_id: novaAtividade.id,
                      titulo: tarefaOrigem.titulo,
                      estado: "pendente",
                      responsavel_id: tarefaOrigem.responsavel_id || null,
                      colaboradores_extra: Array.isArray(tarefaOrigem.colaboradores_extra) ? tarefaOrigem.colaboradores_extra : [],
                      data_inicio: null,
                      data_fim: null,
                      prioridade: tarefaOrigem.prioridade || "Normal",
                      descricao: tarefaOrigem.descricao || null,
                      ordem: Number.isFinite(tarefaOrigem.ordem) ? tarefaOrigem.ordem : idx
                  }])
                  .select("id")
                  .single();

              if (tarefaError) throw tarefaError;

              const subtarefasOrigem = Array.isArray(tarefaOrigem.subtarefas) ? tarefaOrigem.subtarefas : [];
              if (subtarefasOrigem.length > 0) {
                  const subtarefasPayload = subtarefasOrigem.map((sub, subIdx) => ({
                      tarefa_id: novaTarefa.id,
                      titulo: sub.titulo,
                      estado: "pendente",
                      data_fim: null,
                      ordem: Number.isFinite(sub.ordem) ? sub.ordem : subIdx
                  }));

                  const { error: subtarefaError } = await supabase.from("subtarefas").insert(subtarefasPayload);
                  if (subtarefaError) throw subtarefaError;
              }
          }

          showToast("Bloco de atividade reaproveitado com sucesso!");
          fetchProjetoDetails();
      } catch (err) {
          showToast("Erro ao reaproveitar bloco: " + err.message, "error");
      }
  }

  async function deleteItemDirect(tabela, itemId) {
      await supabase.from(tabela).delete().eq("id", itemId);
      fetchProjetoDetails();
  }

  function handleDeleteItem(tabela, itemId) {
      openConfirmModal({
          action: "delete-item",
          title: "Apagar item",
          message: "Este item será removido permanentemente. Esta ação não pode ser desfeita.",
          confirmLabel: "Apagar",
          confirmTone: "danger",
          payload: { tabela, itemId }
      });
  }

  async function archiveProjectDirect() {
      if (!projeto?.id) return;

      setProjectActionLoading(true);
      try {
          const { error } = await supabase
              .from("projetos")
              .update({ estado: "cancelado" })
              .eq("id", projeto.id);

          if (error) throw error;

          closeConfirmModal();
          showToast("Projeto arquivado com sucesso.");
          navigate("/dashboard/projetos");
      } catch (error) {
          showToast("Erro ao arquivar projeto: " + error.message, "error");
      } finally {
          setProjectActionLoading(false);
      }
  }

  function handleArchiveProject() {
      if (!projeto?.id) return;
      openConfirmModal({
          action: "archive-project",
          title: "Arquivar projeto",
          message: "O projeto deixará de aparecer nas listas normais, mas continuará guardado no sistema e no histórico.",
          confirmLabel: "Arquivar",
          confirmTone: "warning"
      });
  }

  async function hardDeleteProjectDirect() {
      if (!projeto?.id) return;

      setProjectActionLoading(true);
      try {
          const atividadeIds = (atividades || []).map((atividade) => atividade.id).filter(Boolean);
          const tarefasProjeto = (atividades || []).flatMap((atividade) => atividade.tarefas || []);
          const tarefaIds = tarefasProjeto.map((tarefa) => tarefa.id).filter(Boolean);
          const subtarefaIds = tarefasProjeto.flatMap((tarefa) => tarefa.subtarefas || []).map((subtarefa) => subtarefa.id).filter(Boolean);

          const deleteOperations = [
              supabase.from("task_logs").delete().eq("projeto_id", projeto.id)
          ];

          if (atividadeIds.length > 0) deleteOperations.push(supabase.from("task_logs").delete().in("atividade_id", atividadeIds));
          if (tarefaIds.length > 0) deleteOperations.push(supabase.from("task_logs").delete().in("task_id", tarefaIds));

          const deleteLogResults = await Promise.all(deleteOperations);
          const deleteLogError = deleteLogResults.find((result) => result.error)?.error;
          if (deleteLogError) throw deleteLogError;

          if (subtarefaIds.length > 0) {
              const { error } = await supabase.from("subtarefas").delete().in("id", subtarefaIds);
              if (error) throw error;
          }

          if (tarefaIds.length > 0) {
              const { error } = await supabase.from("tarefas").delete().in("id", tarefaIds);
              if (error) throw error;
          }

          if (atividadeIds.length > 0) {
              const { error } = await supabase.from("atividades").delete().in("id", atividadeIds);
              if (error) throw error;
          }

          const { error: deleteProjectError } = await supabase.from("projetos").delete().eq("id", projeto.id);
          if (deleteProjectError) throw deleteProjectError;

          closeConfirmModal();
          showToast("Projeto apagado permanentemente.");
          navigate("/dashboard/projetos");
      } catch (error) {
          showToast("Erro ao apagar projeto: " + error.message, "error");
      } finally {
          setProjectActionLoading(false);
      }
  }

  function handleHardDeleteProject() {
      if (!projeto?.id) return;
      openConfirmModal({
          action: "hard-delete-project",
          title: "Apagar projeto permanentemente",
          message: "Isto vai apagar o projeto, atividades, tarefas, subtarefas e registos de tempo associados. Esta ação é irreversível.",
          confirmLabel: "Apagar permanentemente",
          confirmTone: "danger",
          requiresText: true,
          expectedText: "APAGAR"
      });
  }

  async function handleConfirmModalAction() {
      if (confirmModal.requiresText && confirmModal.inputValue !== confirmModal.expectedText) {
          showToast("Texto de confirmação inválido.", "info");
          return;
      }

      if (confirmModal.action === "archive-project") {
          await archiveProjectDirect();
          return;
      }

      if (confirmModal.action === "hard-delete-project") {
          await hardDeleteProjectDirect();
          return;
      }

      if (confirmModal.action === "delete-item") {
          const payload = confirmModal.payload || {};
          await deleteItemDirect(payload.tabela, payload.itemId);
          closeConfirmModal();
      }
  }

  const toggleExpand = (taskId) => {
      setExpandedTasks(prev => {
          const nextExpanded = !prev[taskId];
          if (!nextExpanded && activeSubtarefaComposer === taskId) {
              setActiveSubtarefaComposer(null);
              setNovaSubtarefaNome({ tarId: null, nome: "" });
          }
          return { ...prev, [taskId]: nextExpanded };
      });
  };

  const toggleSubtarefaComposer = (taskId) => {
      const isOpening = activeSubtarefaComposer !== taskId;
      setExpandedTasks(prev => ({ ...prev, [taskId]: true }));
      setActiveSubtarefaComposer(isOpening ? taskId : null);
      setNovaSubtarefaNome(isOpening ? { tarId: taskId, nome: "" } : { tarId: null, nome: "" });
  };
  const toggleCollapseAtiv = (ativId) => {
      setCollapsedAtivs(prev => ({ ...prev, [ativId]: !prev[ativId] }));
  };

  const getProjectStatusTheme = (estado) => {
    if(estado === 'concluido') return { bg: 'var(--color-borderColorLight)', text: 'var(--color-btnPrimary)', border: 'var(--color-borderColor)', dot: 'var(--color-btnPrimary)' };
      if(estado === 'em_curso') return { bg: '#fefce8', text: '#ca8a04', border: '#fde047', dot: '#eab308' };
      if(estado === 'cancelado') return { bg: '#f1f5f9', text: '#64748b', border: '#e2e8f0', dot: '#64748b' };
      return { bg: 'var(--color-bgSecondary)', text: 'var(--color-btnPrimary)', border: 'var(--color-borderColor)', dot: 'var(--color-btnPrimary)' }; 
  };

  // --- FUNÇÃO PARA RENDERIZAÇÃO CONDICIONAL DOS MODAIS ---
  const deveMostrarCampoItem = (itemInfoAdicional, nomeCampo) => {
      // 1. Se estiver vazio ou for null, esconde os campos extra.
      if (!itemInfoAdicional) return false; 
      
      try {
          // 2. Tentar ler o JSON (lidar com string ou objeto)
          const info = typeof itemInfoAdicional === 'string' ? JSON.parse(itemInfoAdicional) : itemInfoAdicional;
          
          // 3. Se tiver a array de 'campos', a ÚNICA regra que importa é se o nomeCampo está lá dentro.
          if (info && Array.isArray(info.campos)) {
              return info.campos.includes(nomeCampo);
          }
      } catch (e) {
          console.error(`Erro ao validar o campo ${nomeCampo}:`, e);
      }
      
      // 4. Se a leitura falhar por algum motivo, a regra de segurança é ESCONDER.
      return false; 
  };

  if (loading) return <div className="page-container" style={{display:'flex', justifyContent:'center', alignItems:'center', height:'80vh'}}><div className="pulse-dot-white" style={{background:'var(--color-btnPrimary)'}}></div></div>;
  if (!projeto) return <div className="page-container"><p>Projeto não encontrado.</p><button onClick={() => navigate(-1)}>Voltar</button></div>;

  const statusTheme = getProjectStatusTheme(projeto.estado);
  const labelStyle = { display: 'block', marginBottom: '6px', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' };
  const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box', marginBottom: '15px', transition: 'all 0.2s', color: '#1e293b' };
  const sectionTitleStyle = { fontSize: '0.8rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '15px', marginTop: '5px' };

  const renderStatePills = (currentState, onChange) => {
      const states = [
          { val: 'pendente', label: 'PENDENTE', color: 'var(--color-btnPrimary)' },
          { val: 'em_curso', label: 'EM CURSO', color: '#f59e0b' },
          { val: 'em_analise', label: 'EM ANÁLISE', color: '#ec4899' },
          { val: 'concluido', label: 'CONCLUÍDO', color: 'var(--color-btnPrimary)' },
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

  // LÓGICA DO NOME DO CLIENTE / PARCERIA NO CABEÇALHO
  let clientDisplay = projeto.cliente_texto || getClientDisplayName(projeto.clientes) || 'Não Definido';
  if (projeto.is_parceria && projeto.parceiros_ids?.length > 0) {
      const parceirosNomes = projeto.parceiros_ids.map(id => getClientDisplayName(clientes.find(c => c.id === id))).filter(Boolean).join(', ');
      clientDisplay = `🤝 Parceria: ${parceirosNomes}`;
  }

  const canNavigateToClient = !projeto.is_parceria && Boolean(projeto?.cliente_id);
  const handleClientHeaderClick = () => {
      if (!canNavigateToClient) return;
      navigate('/dashboard/clientes', { state: { openClienteId: projeto.cliente_id } });
  };

  return (
        <div className="page-container" style={{maxWidth: '1200px', margin: '0 auto', paddingBottom: '50px'}}>

            {notification && (
                <div className={`toast-container ${notification.type}`} style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
                    <div>{notification.type === 'success' ? '✅' : '⚠️'} {notification.message}</div>
                </div>
            )}
      
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
                      <button onClick={() => gerarRelatorioProjeto(projeto, atividades, logs, staff, clientes)} className="btn-small hover-shadow" style={{display:'flex', alignItems:'center', gap:'6px', background:'white', color:'var(--color-btnPrimaryHover)', border:'1px solid var(--color-borderColor)'}}>
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
                                                    <div>
                                                        {String(clientDisplay)
                                                            .split(/, ?/)
                                                            .map((item, idx) => (
                                                                <button
                                                                    key={idx}
                                                                    type="button"
                                                                    onClick={handleClientHeaderClick}
                                                                    style={{
                                                                        fontSize: '0.95rem',
                                                                        color: canNavigateToClient ? 'var(--color-btnPrimaryDark)' : '#1e293b',
                                                                        fontWeight: '700',
                                                                        border: 'none',
                                                                        background: 'transparent',
                                                                        padding: 0,
                                                                        cursor: canNavigateToClient ? 'pointer' : 'default',
                                                                        textDecoration: canNavigateToClient ? 'underline' : 'none',
                                                                        textUnderlineOffset: '3px',
                                                                        display: 'block',
                                                                        textAlign: 'left',
                                                                        marginBottom: 2
                                                                    }}
                                                                    title={canNavigateToClient ? 'Abrir cliente' : ''}
                                                                >
                                                                    {item}
                                                                </button>
                                                            ))}
                                                    </div>
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
        <button style={{background: 'none', border: 'none', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: activeTab === 'atividades' ? '800' : '600', color: activeTab === 'atividades' ? 'var(--color-btnPrimary)' : '#64748b', cursor: 'pointer', padding: '10px 20px', position: 'relative', transition: '0.2s'}} onClick={() => setActiveTab('atividades')} className="tab-hover">
            <Icons.ClipboardList /> Board de Atividades
            {activeTab === 'atividades' && <div style={{position:'absolute', bottom:'-12px', left:0, right:0, height:'3px', background:'var(--color-btnPrimary)', borderRadius:'3px 3px 0 0'}} />}
        </button>
        <button style={{background: 'none', border: 'none', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: activeTab === 'relatorio' ? '800' : '600', color: activeTab === 'relatorio' ? 'var(--color-btnPrimary)' : '#64748b', cursor: 'pointer', padding: '10px 20px', position: 'relative', transition: '0.2s'}} onClick={() => setActiveTab('relatorio')} className="tab-hover">
            <Icons.Clock /> Relatório de Tempos
            {activeTab === 'relatorio' && <div style={{position:'absolute', bottom:'-12px', left:0, right:0, height:'3px', background:'var(--color-btnPrimary)', borderRadius:'3px 3px 0 0'}} />}
        </button>
        <button style={{background: 'none', border: 'none', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: activeTab === 'geral' ? '800' : '600', color: activeTab === 'geral' ? 'var(--color-btnPrimary)' : '#64748b', cursor: 'pointer', padding: '10px 20px', position: 'relative', transition: '0.2s'}} onClick={() => setActiveTab('geral')} className="tab-hover">
            <Icons.Settings /> Configurações e Dados
            {activeTab === 'geral' && <div style={{position:'absolute', bottom:'-12px', left:0, right:0, height:'3px', background:'var(--color-btnPrimary)', borderRadius:'3px 3px 0 0'}} />}
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
                    const atividadeDependencyReason = getActivityBlockReason(ativ, activityById);
                    const blockedActivity = isActivityBlocked(ativ);
                    
                    const hasNoTasks = !ativ.tarefas || ativ.tarefas.length === 0;
                    const isAtivTimerActive = activeLog?.atividade_id === ativ.id;
                    const ativTime = getActivityTime(ativ);
                    const atividadeResponsavelNome = getPersonLabelById(ativ.responsavel_id);
                    const atividadeParticipantes = [...new Set(
                        (Array.isArray(ativ.colaboradores_extra) ? ativ.colaboradores_extra : [])
                            .filter((cid) => String(cid) !== String(ativ.responsavel_id || ""))
                            .map((cid) => getPersonLabelById(cid))
                            .filter(Boolean)
                    )];
                    
                    const isCollapsed = collapsedAtivs[ativ.id];

                    return (
                    <div 
                        id={`atividade-card-${ativ.id}`}
                        key={ativ.id} 
                        draggable={!isCollapsed} 
                        onDragStart={(e) => handleDragStartAtiv(e, aIndex)}
                        onDragEnter={(e) => handleDragEnterAtiv(e, aIndex)}
                        onDragEnd={handleDropAtiv}
                        onDragOver={(e) => e.preventDefault()}
                        style={{background: 'white', borderRadius: '12px', border: isHighlightedTask('atividade', ativ.id) ? '2px solid var(--color-btnPrimary)' : '1px solid #e2e8f0', marginBottom: '20px', boxShadow: isHighlightedTask('atividade', ativ.id) ? '0 0 0 3px var(--color-bgSecondary), 0 16px 30px rgba(59,130,246,0.18)' : '0 2px 4px rgba(0, 0, 0, 0.02)', overflow: 'hidden', opacity: isAtivDone ? 0.6 : 1, transition: 'opacity 0.3s', animation: isHighlightedTask('atividade', ativ.id) ? 'taskFocusPulse 1.2s ease-in-out 0s 2' : 'none'}}
                    >
                        
                        {/* CABEÇALHO DA ATIVIDADE */}
                        <div style={{padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: isAtivDone ? '#f8fafc' : 'white', position: 'relative'}}>
                            <div style={{position: 'absolute', bottom: 0, left: 0, height: '3px', background: '#f1f5f9', width: '100%'}}>
                                <div style={{height: '100%', background: 'var(--color-btnPrimary)', width: `${progresso}%`, transition: 'width 0.4s ease-in-out'}}></div>
                            </div>
                            
                            <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
                                <div style={{cursor: 'grab', color: '#cbd5e1', display:'flex'}} title="Arraste para reordenar" className="hover-blue-text"><Icons.GripVertical /></div>
                                <div onClick={() => !blockedActivity && toggleAtividadeStatus(ativ.id, ativ.estado)} style={{width: '26px', height: '26px', borderRadius: '8px', cursor: blockedActivity ? 'not-allowed' : 'pointer', background: isAtivDone ? 'var(--color-btnPrimary)' : '#f8fafc', border: isAtivDone ? 'none' : '2px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', transition: 'all 0.2s'}}>
                                    {isAtivDone && <Icons.Check size={16} />}
                                </div>
                                <div>
                                    <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                                        <h3 style={{margin: 0, color: isAtivDone ? '#94a3b8' : '#0f172a', textDecoration: isAtivDone ? 'line-through' : 'none', fontSize: '1.1rem', fontWeight: '700'}}>
                                            {ativ.titulo}
                                        </h3>
                                        {renderDeadline(ativ.data_fim, isAtivDone, true)}
                                        
                                        <button onClick={() => setAtividadeModal({show: true, data: { ...ativ, colaboradores_extra: Array.isArray(ativ.colaboradores_extra) ? ativ.colaboradores_extra : [] }})} style={{background:'none', border:'none', color:'var(--color-btnPrimary)', cursor:'pointer'}} title="Editar Atividade" className="hover-shadow">
                                            <Icons.Edit size={16} />
                                        </button>
                                    </div>

                                    <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginTop: '5px', flexWrap: 'wrap'}}>
                                        <span style={{fontSize: '0.7rem', background: 'var(--color-bgSecondary)', color: 'var(--color-btnPrimaryDark)', padding: '2px 8px', borderRadius: '999px', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '5px'}}>
                                            <Icons.User size={11} />
                                            Resp: {atividadeResponsavelNome || 'Sem responsável'}
                                        </span>
                                        {atividadeDependencyReason && (
                                            <span style={{fontSize: '0.7rem', background: '#fff7ed', color: '#c2410c', padding: '2px 8px', borderRadius: '999px', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '5px'}} title={atividadeDependencyReason}>
                                                <Icons.Lock size={11} /> Bloqueada por dependência
                                            </span>
                                        )}
                                        {atividadeParticipantes.length > 0 && (
                                            <span style={{fontSize: '0.7rem', background: '#f8fafc', color: '#475569', padding: '2px 8px', borderRadius: '999px', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '5px'}} title={atividadeParticipantes.join(', ')}>
                                                <Icons.Users size={11} />
                                                Participantes: {atividadeParticipantes.join(', ')}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div style={{display: 'flex', gap: '15px', alignItems: 'center'}}>
                                {!isAtivDone && <span style={{fontSize: '0.75rem', color: '#64748b', background: '#f1f5f9', padding: '4px 10px', borderRadius: '12px', fontWeight: '600'}}>{progresso}% Concluído</span>}
                                
                                <span style={{fontSize: '0.8rem', color: 'var(--color-btnPrimary)', fontWeight: 'bold', background: 'var(--color-bgSecondary)', padding: '4px 10px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '4px'}}>
                                    <Icons.Clock size={12} /> {formatTime(ativTime)}
                                </span>
                                
                                {hasNoTasks && !isAtivDone && (
                                    <button onClick={() => !blockedActivity && handleToggleTimer(ativ.id, 'activity')} style={{ background: isAtivTimerActive ? '#fee2e2' : '#f1f5f9', color: isAtivTimerActive ? '#ef4444' : '#64748b', border: 'none', padding: '6px 12px', borderRadius: '20px', cursor: blockedActivity ? 'not-allowed' : 'pointer', fontSize: '0.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', animation: isAtivTimerActive ? 'pulse 1.5s infinite' : 'none', opacity: blockedActivity ? 0.6 : 1}} className="hover-shadow">
                                        {isAtivTimerActive ? <><Icons.Stop size={12} /> Parar</> : <><Icons.Play size={12} /> Play</>}
                                    </button>
                                )}

                                {blockedActivity && (
                                    <button
                                        onClick={() => unlockActivityForNow(ativ.id)}
                                        style={{background: '#fff7ed', border: '1px solid #fdba74', color: '#c2410c', width: '32px', height: '32px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'}}
                                        title={atividadeDependencyReason ? `${atividadeDependencyReason}. Clique para desbloquear manualmente.` : 'Desbloquear atividade manualmente'}
                                    >
                                        <Icons.Unlock size={14} />
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

                                <button
                                    onClick={() => handleReuseActivityBlock(ativ.id)}
                                    style={{background: 'var(--color-bgSecondary)', border: '1px solid var(--color-borderColor)', color: 'var(--color-btnPrimaryDark)', cursor: 'pointer', padding: '5px 10px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px'}}
                                    className="hover-shadow"
                                    title="Reaproveitar este bloco de atividade"
                                >
                                    <Icons.Layers size={12} /> Repetir Bloco
                                </button>

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
                                    const dependencyReason = getTaskDependencyReason(tar, ativ);
                                    const blockedByDependency = isTaskBlocked(tar, ativ);
                                    
                                    const isTimerActive = activeLog?.task_id === tar.id;
                                    const taskTime = getTaskTime(tar.id);
                                    const respName = getPersonLabelById(tar.responsavel_id);
                                    const extraColabsIds = (Array.isArray(tar.colaboradores_extra) ? tar.colaboradores_extra : []).filter(cid => cid !== tar.responsavel_id);
                                    const extraColabsCount = extraColabsIds.length;
                                    const extraColabsNames = extraColabsIds.map(cid => getPersonLabelById(cid)).filter(Boolean).join(', ');
                                    const isComposerOpen = activeSubtarefaComposer === tar.id;

                                    return (
                                    <div 
                                        id={`tarefa-card-${tar.id}`}
                                        key={tar.id} 
                                        draggable
                                        onDragStart={(e) => handleDragStartTar(e, aIndex, tIndex)}
                                        onDragEnter={(e) => handleDragEnterTar(e, aIndex, tIndex)}
                                        onDragEnd={(e) => handleDropTar(e, aIndex)}
                                        onDragOver={(e) => e.preventDefault()}
                                        style={{background: 'white', border: isHighlightedTask('tarefa', tar.id) ? '2px solid var(--color-btnPrimary)' : (isTimerActive ? '1px solid var(--color-btnPrimary)' : '1px solid #e2e8f0'), borderRadius: '8px', marginBottom: '8px', overflow: 'hidden', boxShadow: isHighlightedTask('tarefa', tar.id) ? '0 0 0 3px var(--color-bgSecondary), 0 12px 24px rgba(59,130,246,0.16)' : (isTimerActive ? '0 0 0 2px rgba(59, 130, 246, 0.2)' : 'none'), transition: 'all 0.2s', animation: isHighlightedTask('tarefa', tar.id) ? 'taskFocusPulse 1.2s ease-in-out 0s 2' : 'none'}}
                                    >
                                        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 15px', opacity: tar.estado === 'concluido' ? 0.6 : (blockedByDependency ? 0.75 : 1)}}>
                                            <div style={{display: 'flex', alignItems: 'center', gap: '12px', flex: 1}}>
                                                <div style={{cursor: 'grab', color: '#cbd5e1', display:'flex'}} title="Arraste para reordenar"><Icons.GripVertical /></div>
                                                <div onClick={() => !blockedByDependency && toggleTarefaStatus(tar.id, tar.estado)} style={{ width: '20px', height: '20px', borderRadius: '50%', cursor: blockedByDependency ? 'not-allowed' : 'pointer', border: tar.estado === 'concluido' ? 'none' : '2px solid #cbd5e1', background: tar.estado === 'concluido' ? 'var(--color-btnPrimary)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0 }}>
                                                    {tar.estado === 'concluido' && <Icons.Check size={12} />}
                                                </div>
                                                
                                                <span onClick={() => {
                                                    setTarefaFileToUpload(null);
                                                    setTarefaModal({
                                                        show: true,
                                                        data: {
                                                            ...tar,
                                                            colaboradores_extra: Array.isArray(tar.colaboradores_extra) ? tar.colaboradores_extra : [],
                                                            tem_entregavel: Boolean(tar.tem_entregavel),
                                                            nome_entregavel: tar.nome_entregavel || "",
                                                            data_entregavel: tar.data_entregavel || "",
                                                            arquivo_url: tar.arquivo_url || ""
                                                        },
                                                        atividadeNome: ativ.titulo
                                                    });
                                                }} style={{textDecoration: tar.estado === 'concluido' ? 'line-through' : 'none', color: '#334155', fontWeight: '600', cursor: 'pointer', fontSize: '0.95rem'}} className="hover-underline" title="Clique para editar detalhes">
                                                    {tar.titulo}
                                                </span>
                                                
                                                <div style={{display: 'flex', gap: '6px', marginLeft: '10px'}}>
                                                    {tar.prioridade === 'Alta' || tar.prioridade === 'Urgente' ? <span style={{fontSize: '0.65rem', background: '#fee2e2', color: '#ef4444', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold'}}>{tar.prioridade}</span> : null}
                                                    {respName && <span style={{fontSize: '0.65rem', background: 'var(--color-bgSecondary)', color: 'var(--color-btnPrimary)', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold'}}>{respName.split(' ')[0]}</span>}
                                                    {extraColabsCount > 0 && <span style={{fontSize: '0.65rem', background: '#f3e8ff', color: '#7e22ce', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px'}} title={extraColabsNames}><Icons.Users size={10} /> +{extraColabsCount}</span>}
                                                    {renderDeadline(tar.data_fim, isTarDone)}
                                                    {dependencyReason && (
                                                        <span style={{fontSize: '0.65rem', background: '#fff7ed', color: '#c2410c', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '4px'}} title={dependencyReason}>
                                                            <Icons.Lock size={10} /> Dependência
                                                        </span>
                                                    )}
                                                    {hasSubs && <span style={{fontSize: '0.65rem', background: subsDone === tar.subtarefas.length ? 'var(--color-borderColorLight)' : '#f1f5f9', color: subsDone === tar.subtarefas.length ? 'var(--color-btnPrimary)' : '#64748b', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px'}}><Icons.ClipboardList size={10} /> {subsDone}/{tar.subtarefas.length}</span>}
                                                </div>
                                            </div>

                                            <div style={{display: 'flex', gap: '15px', alignItems: 'center'}}>
                                                <span style={{fontSize: '0.75rem', color: '#64748b', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px'}}><Icons.Clock size={12} /> {formatTime(taskTime)}</span>

                                                <button onClick={() => !blockedByDependency && handleToggleTimer(tar.id, 'task')} style={{ background: isTimerActive ? '#fee2e2' : '#f1f5f9', color: isTimerActive ? '#ef4444' : '#64748b', border: 'none', padding: '4px 10px', borderRadius: '20px', cursor: blockedByDependency ? 'not-allowed' : 'pointer', fontSize: '0.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', animation: isTimerActive ? 'pulse 1.5s infinite' : 'none', opacity: blockedByDependency ? 0.6 : 1 }} className="hover-shadow">
                                                    {isTimerActive ? <><Icons.Stop /> Parar</> : <><Icons.Play /> Play</>}
                                                </button>
                                                {blockedByDependency && (
                                                    <button
                                                        onClick={() => unlockTaskForNow(tar.id)}
                                                        style={{background: '#fff7ed', border: '1px solid #fdba74', color: '#c2410c', width: '30px', height: '30px', borderRadius: '999px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'}}
                                                        title={dependencyReason ? `${dependencyReason}. Clique para desbloquear manualmente.` : 'Desbloquear tarefa manualmente'}
                                                    >
                                                        <Icons.Unlock size={13} />
                                                    </button>
                                                )}
                                                {!isTarDone && (
                                                    <button onClick={() => toggleSubtarefaComposer(tar.id)} style={{background:'none', border:'none', color: isComposerOpen ? 'var(--color-btnPrimary)' : '#94a3b8', cursor:'pointer', display: 'flex'}} className="hover-blue-text" title={isComposerOpen ? 'Fechar novo passo' : 'Adicionar novo passo'}>
                                                        {isComposerOpen ? <Icons.Close size={14} /> : <Icons.Plus size={14} />}
                                                    </button>
                                                )}
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
                                                                <input type="checkbox" checked={sub.estado === 'concluido'} onChange={() => toggleSubtarefaStatus(sub.id, sub.estado)} style={{width: '14px', height: '14px', cursor: 'pointer', accentColor: 'var(--color-btnPrimary)'}} />
                                                                
                                                                <span onClick={() => setSubtarefaModal({show: true, data: sub, tarefaNome: tar.titulo})} style={{fontSize: '0.85rem', color: '#475569', textDecoration: sub.estado === 'concluido' ? 'line-through' : 'none', cursor: 'pointer'}} className="hover-underline" title="Editar Sub-tarefa">
                                                                    {sub.titulo}
                                                                </span>

                                                                {renderDeadline(sub.data_fim, isSubCompleted)}
                                                            </div>

                                                            <button onClick={() => handleDeleteItem("subtarefas", sub.id)} style={{background:'none', border:'none', color:'#ef4444', cursor:'pointer', opacity:0.4, marginLeft: 'auto'}} className="hover-red"><Icons.Close size={14} /></button>
                                                        </div>
                                                    )
                                                })}
                                                {!isTarDone && (
                                                    isComposerOpen ? (
                                                        <form onSubmit={(e) => handleAddSubtarefa(e, tar.id)} style={{marginTop: '8px'}}>
                                                            <input autoFocus type="text" placeholder="+ Novo passo (Enter)" value={novaSubtarefaNome.tarId === tar.id ? novaSubtarefaNome.nome : ""} onChange={e => setNovaSubtarefaNome({ tarId: tar.id, nome: e.target.value })} style={{width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px dashed #cbd5e1', background: '#f8fafc', outline: 'none', fontSize: '0.8rem', color: '#64748b'}} className="input-focus" />
                                                        </form>
                                                    ) : (
                                                        <button type="button" onClick={() => toggleSubtarefaComposer(tar.id)} style={{marginTop: '8px', background: 'transparent', border: '1px dashed #cbd5e1', color: '#64748b', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '6px'}} className="hover-shadow">
                                                            <Icons.Plus size={12} /> Novo passo
                                                        </button>
                                                    )
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    );
                                })}

                                <form onSubmit={(e) => handleAddTarefa(e, ativ.id)} style={{marginTop: '10px', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 230px', gap: '8px'}}>
                                    <input type="text" placeholder="+ Adicionar Tarefa Principal (Enter)..." value={novaTarefaNome.ativId === ativ.id ? novaTarefaNome.nome : ""} onChange={e => setNovaTarefaNome({ ativId: ativ.id, nome: e.target.value, responsavel_id: novaTarefaNome.ativId === ativ.id ? novaTarefaNome.responsavel_id : "" })} style={{width: '100%', padding: '12px 15px', borderRadius: '8px', border: '1px dashed #cbd5e1', background: 'white', outline: 'none', fontSize: '0.9rem', color: '#64748b'}} className="input-focus" />
                                    <select
                                        value={novaTarefaNome.ativId === ativ.id ? (novaTarefaNome.responsavel_id || "") : ""}
                                        onChange={e => setNovaTarefaNome({ ativId: ativ.id, nome: novaTarefaNome.ativId === ativ.id ? novaTarefaNome.nome : "", responsavel_id: e.target.value })}
                                        style={{...inputStyle, marginBottom: 0, cursor: 'pointer'}}
                                        className="input-focus"
                                        title="Responsável da nova tarefa"
                                    >
                                        <option value="">Responsável (opcional)</option>
                                        {renderAssigneeOptionGroups()}
                                    </select>
                                </form>
                            </div>
                        )}
                    </div>
                )})}

                <form onSubmit={handleAddAtividade} style={{marginTop: '25px', background: 'transparent', padding: '0'}}>
                    <div style={{display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 250px auto', gap: '10px'}}>
                        <input type="text" placeholder="+ Nome de uma nova Atividade (Agrupador)..." value={novaAtividadeNome} onChange={e => setNovaAtividadeNome(e.target.value)} style={{flex: 1, padding: '14px 15px', borderRadius: '8px', border: '1px dashed #cbd5e1', background: 'white', outline: 'none', fontSize: '0.95rem', color: '#1e293b'}} className="input-focus" />
                        <select
                            value={novaAtividadeResponsavel}
                            onChange={e => setNovaAtividadeResponsavel(e.target.value)}
                            style={{...inputStyle, marginBottom: 0, cursor: 'pointer'}}
                            className="input-focus"
                            title="Responsável da nova atividade"
                        >
                            <option value="">Responsável (opcional)</option>
                            {renderAssigneeOptionGroups()}
                        </select>
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
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '20px'}}>
                    <h2 style={{margin: 0, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '10px'}}><Icons.Clock size={24} color="var(--color-btnPrimary)" /> Relatório de Execução</h2>
                    <button onClick={openCreateTimeLogModal} className="btn-primary hover-shadow" style={{display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px'}}>
                        <Icons.Plus size={14} /> Adicionar Tempo
                    </button>
                </div>
                
                <div style={{background: 'var(--color-bgSecondary)', padding: '20px', borderRadius: '12px', border: '1px solid var(--color-borderColor)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '30px'}}>
                    <div>
                        <h4 style={{margin: 0, color: 'var(--color-btnPrimaryHover)'}}>Tempo Total Gasto no Projeto</h4>
                        <p style={{margin: '5px 0 0 0', color: 'var(--color-btnPrimary)', fontSize: '0.85rem'}}>Soma de todas as sessões do cronómetro.</p>
                    </div>
                    <div style={{fontSize: '2.5rem', fontWeight: '900', color: 'var(--color-btnPrimaryDark)'}}>
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
                                    <td style={{padding: '12px', color: '#64748b', fontSize: '0.85rem'}}>{getStaffNames(ativ.responsavel_id, ativ.colaboradores_extra)}</td>
                                    <td style={{padding: '12px', textAlign: 'right', fontWeight: 'bold', color: 'var(--color-btnPrimary)'}}>{formatTime(getActivityTime(ativ))}</td>
                                </tr>
                                {ativ.tarefas?.map(tar => {
                                    const time = getTaskTime(tar.id);
                                    if (time === 0) return null;
                                    const userBreakdown = getTaskTimePerUser(tar.id);
                                    return (
                                        <React.Fragment key={tar.id}>
                                            <tr style={{borderBottom: userBreakdown.length > 0 ? 'none' : '1px solid #f1f5f9'}}>
                                                <td style={{padding: '10px 12px 10px 40px', color: '#475569', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px'}}><Icons.CornerDownRight size={14} /> {tar.titulo}</td>
                                                <td style={{padding: '10px 12px', color: '#64748b', fontSize: '0.85rem'}}>{getStaffNames(tar.responsavel_id, tar.colaboradores_extra)}</td>
                                                <td style={{padding: '10px 12px', textAlign: 'right', color: '#475569', fontSize: '0.9rem', fontWeight: userBreakdown.length > 1 ? '600' : 'normal'}}>{formatTime(time)}</td>
                                            </tr>
                                            {userBreakdown.map((u, i) => (
                                                <tr key={`${tar.id}-u-${i}`} style={{background: '#fafbfc', borderBottom: i === userBreakdown.length - 1 ? '1px solid #f1f5f9' : '1px solid #f8fafc'}}>
                                                    <td style={{padding: '5px 12px 5px 64px', color: '#94a3b8', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px'}}><Icons.User size={11} color="#cbd5e1" /> {u.nome}</td>
                                                    <td style={{padding: '5px 12px'}}></td>
                                                    <td style={{padding: '5px 12px', textAlign: 'right', color: '#64748b', fontSize: '0.78rem'}}>{formatTime(u.total)}</td>
                                                </tr>
                                            ))}
                                        </React.Fragment>
                                    )
                                })}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>

                <div style={{marginTop: '28px', borderTop: '1px solid #e2e8f0', paddingTop: '22px'}}>
                    <h3 style={{margin: '0 0 12px 0', fontSize: '1rem', color: '#334155'}}>Registos Individuais</h3>
                    <p style={{margin: '0 0 14px 0', color: '#64748b', fontSize: '0.85rem'}}>Se te esqueceres do cronómetro, podes editar quem fez e quantos minutos foram gastos.</p>

                    <table className="data-table" style={{width: '100%', borderCollapse: 'collapse'}}>
                        <thead>
                            <tr style={{background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left', fontSize: '0.78rem', color: '#64748b', textTransform: 'uppercase'}}>
                                <th style={{padding: '10px'}}>Data</th>
                                <th style={{padding: '10px'}}>Item</th>
                                <th style={{padding: '10px'}}>Colaborador</th>
                                <th style={{padding: '10px', textAlign: 'right'}}>Tempo</th>
                                <th style={{padding: '10px', textAlign: 'right'}}>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.filter((l) => (l.duration_minutes || 0) > 0).map((log) => (
                                <tr key={log.id} style={{borderBottom: '1px solid #f1f5f9'}}>
                                    <td style={{padding: '10px', color: '#64748b', fontSize: '0.82rem'}}>{log.start_time ? new Date(log.start_time).toLocaleString('pt-PT') : '-'}</td>
                                    <td style={{padding: '10px', color: '#334155', fontSize: '0.86rem'}}>{getLogTargetLabel(log)}</td>
                                    <td style={{padding: '10px', color: '#334155', fontSize: '0.86rem'}}>{log.profiles?.nome || 'Utilizador'}</td>
                                    <td style={{padding: '10px', color: '#1e293b', fontWeight: '700', textAlign: 'right'}}>{formatTime(log.duration_minutes || 0)}</td>
                                    <td style={{padding: '10px', textAlign: 'right'}}>
                                        <div style={{display: 'inline-flex', gap: '8px'}}>
                                            <button onClick={() => openEditTimeLogModal(log)} className="action-btn hover-orange-text" title="Editar registo"><Icons.Edit size={14} /></button>
                                            <button onClick={() => deleteTimeLog(log.id)} className="action-btn hover-red-text" title="Apagar registo"><Icons.Trash size={14} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {logs.filter((l) => (l.duration_minutes || 0) > 0).length === 0 && (
                                <tr>
                                    <td colSpan={5} style={{padding: '18px', textAlign: 'center', color: '#94a3b8'}}>Sem registos individuais com duração.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {timeLogModal.show && (
            <ModalPortal>
                <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, backgroundColor:'rgba(15, 23, 42, 0.7)', backdropFilter:'blur(3px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:99999}} onClick={closeTimeLogModal}>
                    <div style={{background:'#fff', width:'92%', maxWidth:'560px', borderRadius:'14px', boxShadow:'0 20px 35px rgba(0,0,0,0.2)', overflow:'hidden'}} onClick={(e) => e.stopPropagation()}>
                        <div style={{padding:'16px 20px', borderBottom:'1px solid #e2e8f0', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                            <h3 style={{margin:0, color:'#1e293b', fontSize:'1.05rem'}}>{timeLogModal.mode === 'edit' ? 'Editar Registo de Tempo' : 'Adicionar Registo de Tempo'}</h3>
                            <button onClick={closeTimeLogModal} style={{background:'transparent', border:'none', cursor:'pointer', color:'#64748b'}}><Icons.Close size={18} /></button>
                        </div>

                        <form onSubmit={saveTimeLog} style={{padding:'18px 20px', display:'grid', gap:'12px', background:'#f8fafc'}}>
                            <div>
                                <label style={{display:'block', marginBottom:'6px', fontSize:'0.8rem', fontWeight:'700', color:'#475569'}}>Colaborador</label>
                                <select value={timeLogForm.user_id} onChange={(e) => setTimeLogForm((prev) => ({ ...prev, user_id: e.target.value }))} style={{width:'100%', padding:'10px 12px', borderRadius:'8px', border:'1px solid #cbd5e1'}} required>
                                    <option value="">Selecionar...</option>
                                    {staff.map((s) => <option key={s.id} value={s.id}>{s.nome || s.email}</option>)}
                                </select>
                            </div>

                            <div style={{display:'grid', gridTemplateColumns:'160px 1fr', gap:'10px'}}>
                                <div>
                                    <label style={{display:'block', marginBottom:'6px', fontSize:'0.8rem', fontWeight:'700', color:'#475569'}}>Tipo</label>
                                    <select
                                        value={timeLogForm.target_type}
                                        onChange={(e) => {
                                            const nextType = e.target.value;
                                            const firstOption = getTargetOptions(nextType)[0]?.id || "";
                                            setTimeLogForm((prev) => ({ ...prev, target_type: nextType, target_id: firstOption }));
                                        }}
                                        style={{width:'100%', padding:'10px 12px', borderRadius:'8px', border:'1px solid #cbd5e1'}}
                                    >
                                        <option value="atividade">Atividade</option>
                                        <option value="tarefa">Tarefa</option>
                                        <option value="subtarefa">Passo</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{display:'block', marginBottom:'6px', fontSize:'0.8rem', fontWeight:'700', color:'#475569'}}>Item</label>
                                    <select value={timeLogForm.target_id} onChange={(e) => setTimeLogForm((prev) => ({ ...prev, target_id: e.target.value }))} style={{width:'100%', padding:'10px 12px', borderRadius:'8px', border:'1px solid #cbd5e1'}} required>
                                        <option value="">Selecionar...</option>
                                        {getTargetOptions(timeLogForm.target_type).map((opt) => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label style={{display:'block', marginBottom:'6px', fontSize:'0.8rem', fontWeight:'700', color:'#475569'}}>Tempo (minutos)</label>
                                <input type="number" min="1" value={timeLogForm.duration_minutes} onChange={(e) => setTimeLogForm((prev) => ({ ...prev, duration_minutes: e.target.value }))} placeholder="Ex: 45" style={{width:'100%', padding:'10px 12px', borderRadius:'8px', border:'1px solid #cbd5e1'}} required />
                                <div style={{marginTop:'6px', fontSize:'0.78rem', color:'#64748b'}}>Visualização: {formatTime(Math.max(0, parseInt(timeLogForm.duration_minutes || "0", 10) || 0))}</div>
                            </div>

                            <div style={{display:'flex', justifyContent:'flex-end', gap:'8px', marginTop:'6px'}}>
                                <button type="button" onClick={closeTimeLogModal} style={{padding:'9px 14px', borderRadius:'8px', border:'1px solid #cbd5e1', background:'white', cursor:'pointer'}}>Cancelar</button>
                                <button type="submit" disabled={timeLogSaving} className="btn-primary hover-shadow" style={{padding:'9px 14px', display:'flex', alignItems:'center', gap:'6px'}}>
                                    <Icons.Save size={14} /> {timeLogSaving ? 'A guardar...' : 'Guardar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </ModalPortal>
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
                    
                    {/* ENQUADRAMENTO (Com Parcerias e Colaboradores em formato Pill) */}
                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '20px'}}>
                        <div>
                            <label style={labelStyle}>Tipo de Entidade</label>
                            <select value={formGeral.is_parceria ? 'parceria' : 'unico'} onChange={e => {
                                const isParc = e.target.value === 'parceria';
                                setFormGeral({...formGeral, is_parceria: isParc, parceiros_ids: isParc ? (formGeral.parceiros_ids || []) : []});
                            }} style={{...inputStyle, cursor: 'pointer'}} className="input-focus">
                                <option value="unico">👤 Cliente Único</option>
                                <option value="parceria">🤝 Parceria (Vários)</option>
                            </select>
                        </div>
                        <div>
                            <label style={labelStyle}>Responsável Global</label>
                            <select value={formGeral.responsavel_id || ''} onChange={e => {
                                const newResp = e.target.value;
                                setFormGeral(prev => ({
                                    ...prev, 
                                    responsavel_id: newResp,
                                    colaboradores: (prev.colaboradores || []).filter(id => id !== newResp) 
                                }));
                            }} style={{...inputStyle, cursor: 'pointer'}} className="input-focus">
                                <option value="">- Ninguém -</option>
                                {staff.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={labelStyle}>Tipo de Projeto</label>
                            <select value={formGeral.tipo_projeto_id || ''} onChange={e => setFormGeral({...formGeral, tipo_projeto_id: e.target.value || null})} style={{...inputStyle, cursor: 'pointer'}} className="input-focus">
                                <option value="">— Sem tipo —</option>
                                {tiposProjeto.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                            </select>
                        </div>
                    </div>

                    <div style={{display: 'grid', gridTemplateColumns: formGeral.is_parceria ? '1fr 1fr' : '1fr', gap: '15px', marginBottom: formGeral.is_parceria ? '10px' : '20px'}}>
                        <div>
                            <label style={labelStyle}>Cliente Principal *</label>
                            <select value={formGeral.cliente_id || ''} onChange={e => {
                                const selectedId = e.target.value;
                                setFormGeral(prev => ({
                                    ...prev,
                                    cliente_id: selectedId,
                                    cliente_texto: "",
                                    parceiros_ids: (prev.parceiros_ids || []).filter(pid => String(pid) !== String(selectedId))
                                }));
                            }} style={{...inputStyle, cursor: 'pointer'}} className="input-focus" required>
                                <option value="">- Selecione -</option>
                                {clientes.map(c => <option key={c.id} value={c.id}>{getClientDisplayName(c) || c.marca}</option>)}
                            </select>
                        </div>

                        {formGeral.is_parceria && (
                            <div>
                                <label style={labelStyle}>Entidades Parceiras</label>
                                <select
                                        value={parceiroSelecionado}
                                    onChange={e => {
                                            const selected = e.target.value;
                                            setParceiroSelecionado(selected);
                                            if (!selected) return;
                                        setFormGeral(prev => ({
                                            ...prev,
                                                parceiros_ids: String(selected) === String(prev.cliente_id)
                                                    ? (prev.parceiros_ids || [])
                                                    : (prev.parceiros_ids || []).includes(selected)
                                                        ? (prev.parceiros_ids || [])
                                                        : [...(prev.parceiros_ids || []), selected]
                                        }));
                                            setParceiroSelecionado("");
                                    }}
                                        style={{...inputStyle, cursor: 'pointer'}}
                                    className="input-focus"
                                >
                                        <option value="">-- Adicionar entidade parceira --</option>
                                    {clientes
                                        .filter(c => String(c.id) !== String(formGeral.cliente_id || ''))
                                            .filter(c => !(formGeral.parceiros_ids || []).includes(c.id))
                                        .map(c => <option key={c.id} value={c.id}>{getClientDisplayName(c) || c.marca}</option>)}
                                </select>
                            </div>
                        )}
                    </div>

                    {formGeral.is_parceria && (
                        <div style={{marginBottom: '20px'}}>
                            <label style={labelStyle}>Entidades Selecionadas</label>
                            <div className="pill-container" style={{width: '100%', boxSizing: 'border-box'}}>
                                {(formGeral.parceiros_ids || []).length === 0 && <span style={{color: '#94a3b8', fontSize: '0.85rem', fontStyle: 'italic'}}>Sem parceiros selecionados.</span>}
                                {(formGeral.parceiros_ids || []).map(pid => {
                                    const parceiro = clientes.find(c => String(c.id) === String(pid));
                                    if (!parceiro) return null;
                                    return (
                                        <div
                                            key={pid}
                                            onClick={() => isEditingGeral && handleToggleParceiro(pid)}
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

                    <div style={{marginBottom: '30px'}}>
                        <label style={labelStyle}>Outros Colaboradores Envolvidos</label>
                        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px'}}>
                            <div>
                                <div style={{fontSize: '0.74rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px'}}>Equipa Interna</div>
                                <div className="pill-container" style={{minHeight: '60px'}}>
                                    {internalAssigneeOptions
                                        .filter(s => String(s.id) !== String(formGeral.responsavel_id || ''))
                                        .map(s => {
                                            const isSelected = (formGeral.colaboradores || []).map(id => String(id)).includes(String(s.id));
                                            return (
                                                <div 
                                                    key={`colab-int-${s.id}`}
                                                    onClick={() => isEditingGeral && handleToggleColaborador(s.id)}
                                                    className={`pill-checkbox ${isSelected ? 'selected' : ''}`}
                                                >
                                                    {s.label}
                                                </div>
                                            )
                                        })}
                                    {internalAssigneeOptions.filter(s => String(s.id) !== String(formGeral.responsavel_id || '')).length === 0 && (
                                        <span style={{color: '#94a3b8', fontSize: '0.85rem', fontStyle: 'italic'}}>Sem pessoas internas disponíveis.</span>
                                    )}
                                </div>
                            </div>

                            <div>
                                <div style={{fontSize: '0.74rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px'}}>Pessoas das Entidades</div>
                                <div className="pill-container" style={{minHeight: '60px'}}>
                                    {entityAssigneeOptions
                                        .filter(s => String(s.id) !== String(formGeral.responsavel_id || ''))
                                        .map(s => {
                                            const isSelected = (formGeral.colaboradores || []).map(id => String(id)).includes(String(s.id));
                                            return (
                                                <div 
                                                    key={`colab-ent-${s.id}`}
                                                    onClick={() => isEditingGeral && handleToggleColaborador(s.id)}
                                                    className={`pill-checkbox ${isSelected ? 'selected' : ''}`}
                                                >
                                                    {s.label}
                                                </div>
                                            )
                                        })}
                                    {entityAssigneeOptions.filter(s => String(s.id) !== String(formGeral.responsavel_id || '')).length === 0 && (
                                        <span style={{color: '#94a3b8', fontSize: '0.85rem', fontStyle: 'italic'}}>Sem contactos das entidades deste projeto.</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style={{display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '40px'}}>
                        <div>
                            <label style={labelStyle}>Nome do Projeto</label>
                            <input type="text" value={formGeral.titulo || ''} onChange={e => setFormGeral({...formGeral, titulo: e.target.value})} style={{...inputStyle, fontWeight: 'bold', color: '#0f172a'}} className="input-focus" />
                            
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
                                        <option value="pendente">Pendente</option><option value="em_analise">Em Análise</option><option value="em_curso">Em Curso</option><option value="concluido">Concluído</option><option value="cancelado">Cancelado</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div>
                            <div style={{background: 'var(--color-bgSecondary)', padding: '20px', borderRadius: '12px', border: '1px solid var(--color-borderColor)', marginBottom: '20px'}}>
                                <h4 style={{margin: '0 0 15px 0', color: 'var(--color-btnPrimaryHover)', display: 'flex', alignItems: 'center', gap: '8px', fontSize:'1rem'}}><Icons.Dollar /> Financeiro</h4>
                                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px'}}>
                                    <div><label style={{...labelStyle, color: 'var(--color-btnPrimaryDark)'}}>Investimento (€)</label><input type="number" step="0.01" value={formGeral.investimento || 0} onChange={e => setFormGeral({...formGeral, investimento: e.target.value})} style={{...inputStyle, borderColor: 'var(--color-borderColor)', marginBottom:0}} className="input-focus" /></div>
                                    <div><label style={{...labelStyle, color: 'var(--color-btnPrimaryDark)'}}>Incentivo (€)</label><input type="number" step="0.01" value={formGeral.incentivo || 0} onChange={e => setFormGeral({...formGeral, incentivo: e.target.value})} style={{...inputStyle, borderColor: 'var(--color-borderColor)', color: 'var(--color-btnPrimary)', marginBottom:0}} className="input-focus" /></div>
                                </div>
                            </div>
                            <label style={labelStyle}>Descrição Pública</label>
                            <textarea rows="3" value={formGeral.descricao || ''} onChange={e => setFormGeral({...formGeral, descricao: e.target.value})} style={{...inputStyle, resize: 'vertical', fontSize:'0.85rem'}} className="input-focus" />
                            <label style={{...labelStyle, color: '#b45309', marginTop: '5px'}}>Observações Internas</label>
                            <textarea rows="3" value={formGeral.observacoes || ''} onChange={e => setFormGeral({...formGeral, observacoes: e.target.value})} style={{...inputStyle, resize: 'vertical', background: '#fffbeb', borderColor: '#fcd34d', fontSize:'0.85rem'}} className="input-focus-alert" />
                        </div>
                    </div>

                    <div style={{marginTop: '28px', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '14px', padding: '18px 20px'}}>
                        <div style={{display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', color: '#9a3412', fontWeight: '800'}}>
                            <Icons.AlertTriangle size={16} /> Zona de Arquivo / Apagamento
                        </div>
                        <p style={{margin: '0 0 16px 0', color: '#9a3412', fontSize: '0.85rem', lineHeight: 1.5}}>
                            Arquivar remove o projeto das listas normais sem perder histórico. Apagar elimina permanentemente o projeto e os registos associados.
                        </p>
                        <div style={{display: 'flex', gap: '12px', flexWrap: 'wrap'}}>
                            <button
                                type="button"
                                onClick={handleArchiveProject}
                                disabled={projectActionLoading}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    border: '1px solid #fdba74',
                                    background: '#fff',
                                    color: '#c2410c',
                                    borderRadius: '10px',
                                    padding: '10px 14px',
                                    cursor: projectActionLoading ? 'not-allowed' : 'pointer',
                                    fontWeight: '700',
                                    opacity: projectActionLoading ? 0.6 : 1
                                }}
                                className="hover-shadow"
                            >
                                <Icons.Folder size={15} /> Arquivar Projeto
                            </button>
                            <button
                                type="button"
                                onClick={handleHardDeleteProject}
                                disabled={projectActionLoading}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    border: '1px solid #ef4444',
                                    background: '#ef4444',
                                    color: '#fff',
                                    borderRadius: '10px',
                                    padding: '10px 14px',
                                    cursor: projectActionLoading ? 'not-allowed' : 'pointer',
                                    fontWeight: '700',
                                    opacity: projectActionLoading ? 0.6 : 1
                                }}
                                className="hover-shadow"
                            >
                                <Icons.Trash size={15} color="#ffffff" /> Apagar Permanentemente
                            </button>
                        </div>
                    </div>
                </fieldset>
            </div>
        )}

      </div>

      {confirmModal.show && (
          <ModalPortal>
              <div
                  style={{
                      position: 'fixed',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: 'rgba(15, 23, 42, 0.62)',
                      backdropFilter: 'blur(6px)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 99999,
                      padding: '20px'
                  }}
                  onClick={(e) => {
                      if (e.target === e.currentTarget) closeConfirmModal();
                  }}
              >
                  <div
                      style={{
                          width: '100%',
                          maxWidth: '520px',
                          background: '#ffffff',
                          borderRadius: '22px',
                          border: `1px solid ${confirmModal.confirmTone === 'danger' ? '#fecaca' : '#fed7aa'}`,
                          boxShadow: '0 30px 60px -20px rgba(15, 23, 42, 0.35)',
                          overflow: 'hidden'
                      }}
                      onClick={(e) => e.stopPropagation()}
                  >
                      <div
                          style={{
                              padding: '24px 26px 18px',
                              background: confirmModal.confirmTone === 'danger'
                                  ? 'linear-gradient(180deg, #fff1f2 0%, #ffffff 100%)'
                                  : 'linear-gradient(180deg, #fff7ed 0%, #ffffff 100%)'
                          }}
                      >
                          <div style={{display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px'}}>
                              <div style={{display: 'flex', alignItems: 'flex-start', gap: '14px'}}>
                                  <div
                                      style={{
                                          width: '46px',
                                          height: '46px',
                                          borderRadius: '14px',
                                          background: confirmModal.confirmTone === 'danger' ? '#fee2e2' : '#ffedd5',
                                          color: confirmModal.confirmTone === 'danger' ? '#dc2626' : '#c2410c',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          flexShrink: 0
                                      }}
                                  >
                                      {confirmModal.confirmTone === 'danger' ? <Icons.Trash size={18} color="currentColor" /> : <Icons.Folder size={18} color="currentColor" />}
                                  </div>
                                  <div>
                                      <h3 style={{margin: '2px 0 8px 0', color: '#0f172a', fontSize: '1.15rem', fontWeight: '800'}}>{confirmModal.title}</h3>
                                      <p style={{margin: 0, color: '#64748b', fontSize: '0.92rem', lineHeight: 1.55}}>{confirmModal.message}</p>
                                  </div>
                              </div>
                              <button
                                  type="button"
                                  onClick={closeConfirmModal}
                                  disabled={projectActionLoading}
                                  style={{background: 'transparent', border: 'none', color: '#94a3b8', cursor: projectActionLoading ? 'not-allowed' : 'pointer', padding: 0, display: 'flex'}}
                              >
                                  <Icons.Close size={20} />
                              </button>
                          </div>
                      </div>

                      <div style={{padding: '0 26px 24px'}}>
                          {confirmModal.requiresText && (
                              <div style={{marginBottom: '18px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '14px 16px'}}>
                                  <div style={{fontSize: '0.74rem', color: '#64748b', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px'}}>
                                      Confirmação obrigatória
                                  </div>
                                  <p style={{margin: '0 0 10px 0', color: '#475569', fontSize: '0.88rem'}}>
                                      Escreve <strong>{confirmModal.expectedText}</strong> para desbloquear esta ação.
                                  </p>
                                  <input
                                      type="text"
                                      value={confirmModal.inputValue}
                                      onChange={(e) => setConfirmModal((prev) => ({ ...prev, inputValue: e.target.value }))}
                                      placeholder={confirmModal.expectedText}
                                      style={{
                                          width: '100%',
                                          padding: '11px 12px',
                                          borderRadius: '10px',
                                          border: '1px solid #cbd5e1',
                                          background: '#ffffff',
                                          fontSize: '0.92rem',
                                          color: '#0f172a',
                                          outline: 'none',
                                          boxSizing: 'border-box'
                                      }}
                                  />
                              </div>
                          )}

                          <div style={{display: 'flex', justifyContent: 'flex-end', gap: '10px', flexWrap: 'wrap'}}>
                              <button
                                  type="button"
                                  onClick={closeConfirmModal}
                                  disabled={projectActionLoading}
                                  style={{
                                      border: '1px solid #cbd5e1',
                                      background: '#ffffff',
                                      color: '#475569',
                                      borderRadius: '12px',
                                      padding: '11px 16px',
                                      fontWeight: '700',
                                      cursor: projectActionLoading ? 'not-allowed' : 'pointer',
                                      opacity: projectActionLoading ? 0.6 : 1
                                  }}
                              >
                                  Cancelar
                              </button>
                              <button
                                  type="button"
                                  onClick={handleConfirmModalAction}
                                  disabled={projectActionLoading || (confirmModal.requiresText && confirmModal.inputValue !== confirmModal.expectedText)}
                                  style={{
                                      border: 'none',
                                      background: confirmModal.confirmTone === 'danger' ? '#dc2626' : '#ea580c',
                                      color: '#ffffff',
                                      borderRadius: '12px',
                                      padding: '11px 16px',
                                      fontWeight: '800',
                                      cursor: projectActionLoading || (confirmModal.requiresText && confirmModal.inputValue !== confirmModal.expectedText) ? 'not-allowed' : 'pointer',
                                      opacity: projectActionLoading || (confirmModal.requiresText && confirmModal.inputValue !== confirmModal.expectedText) ? 0.6 : 1,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '8px'
                                  }}
                              >
                                  {confirmModal.confirmTone === 'danger' ? <Icons.Trash size={15} color="#ffffff" /> : <Icons.Folder size={15} color="#ffffff" />}
                                  {projectActionLoading ? 'A processar...' : confirmModal.confirmLabel}
                              </button>
                          </div>
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

            <TimerSwitchModal
                open={attendanceWarningModal.show}
                title="Picagem de ponto em falta"
                message={attendanceWarningModal.message}
                cancelLabel="Não iniciar agora"
                confirmLabel="Sim, iniciar ponto"
                onCancel={() => handleAttendanceWarningChoice(false)}
                onConfirm={() => handleAttendanceWarningChoice(true)}
            />

      <StopTimerNoteModal
          open={stopNoteModal.show}
          analysisTargetLog={activeLog}
          title="Parar cronometro"
          message="Regista uma nota breve deste bloco de trabalho (opcional)."
          placeholder="Ex: Checklist finalizada e pendente validação"
          showCompleteOption={Boolean(activeLog)}
          showStatusOption={Boolean(activeLog)}
          completeLabel={getStopCompleteLabel(activeLog)}
          onCancel={closeStopNoteModal}
          onConfirm={confirmStopWithNote}
      />

      {/* =========================================
          MODAIS DE EDIÇÃO AVANÇADOS
      ========================================= */}

      {/* MODAL 1: EDITAR ATIVIDADE */}
      {atividadeModal.show && atividadeModal.data && (
          <ModalPortal>
              <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999}}>
                  <div className="custom-scrollbar" style={{background: 'white', padding: '24px', borderRadius: '16px', width: 'min(600px, 92vw)', maxHeight: '88vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'}}>
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
                          <h3 style={{margin: 0, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px'}}><Icons.ClipboardList size={20} color="var(--color-btnPrimary)" /> Editar Atividade</h3>
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
                                  <select value={atividadeModal.data.responsavel_id || ''} onChange={e => {
                                      const newResp = e.target.value;
                                      const extras = Array.isArray(atividadeModal.data.colaboradores_extra) ? atividadeModal.data.colaboradores_extra : [];
                                      setAtividadeModal({show: true, data: {...atividadeModal.data, responsavel_id: newResp, colaboradores_extra: extras.filter(id => id !== newResp)}})
                                  }} style={{...inputStyle, marginBottom: 0}} className="input-focus">
                                      <option value="">- Ninguém -</option>
                                      {renderAssigneeOptionGroups()}
                                  </select>
                              </div>
                          </div>

                          <div style={{marginBottom: '15px'}}>
                              <label style={{fontSize: '0.75rem', color: '#64748b', marginBottom: '6px', display:'block', fontWeight:'bold'}}>Outros Colaboradores Envolvidos</label>
                              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px'}}>
                                  <div>
                                      <div style={{fontSize: '0.7rem', color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px'}}>Equipa Interna</div>
                                      <div className="pill-container custom-scrollbar" style={{padding: '8px', maxHeight: '88px', overflowY: 'auto'}}>
                                          {internalAssigneeOptions.filter(s => String(s.id) !== String(atividadeModal.data.responsavel_id || '')).map(s => {
                                              const isSelected = Array.isArray(atividadeModal.data.colaboradores_extra) && atividadeModal.data.colaboradores_extra.map(id => String(id)).includes(String(s.id));
                                              return (
                                                  <div
                                                      key={`ativ-int-${s.id}`}
                                                      onClick={() => handleToggleAtividadeColaborador(s.id)}
                                                      className={`pill-checkbox ${isSelected ? 'selected' : ''}`}
                                                      style={{fontSize: '0.72rem', padding: '5px 10px'}}
                                                  >
                                                      {s.label}
                                                  </div>
                                              )
                                          })}
                                      </div>
                                  </div>

                                  <div>
                                      <div style={{fontSize: '0.7rem', color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px'}}>Pessoas das Entidades</div>
                                      <div className="pill-container custom-scrollbar" style={{padding: '8px', maxHeight: '88px', overflowY: 'auto'}}>
                                          {entityAssigneeOptions.filter(s => String(s.id) !== String(atividadeModal.data.responsavel_id || '')).map(s => {
                                              const isSelected = Array.isArray(atividadeModal.data.colaboradores_extra) && atividadeModal.data.colaboradores_extra.map(id => String(id)).includes(String(s.id));
                                              return (
                                                  <div
                                                      key={`ativ-ent-${s.id}`}
                                                      onClick={() => handleToggleAtividadeColaborador(s.id)}
                                                      className={`pill-checkbox ${isSelected ? 'selected' : ''}`}
                                                      style={{fontSize: '0.72rem', padding: '5px 10px'}}
                                                  >
                                                      {s.label}
                                                  </div>
                                              )
                                          })}
                                      </div>
                                  </div>
                              </div>
                          </div>

                          {/* --- PLANEAMENTO (Sempre visível) & FINANCEIRO CONDICIONAL --- */}
                          <div style={sectionTitleStyle}><Icons.Calendar /> Planeamento & Financeiro</div>
                          <div style={{display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '15px'}}>
                              
                              {/* 👇 SEM CONDIÇÃO - SEMPRE VISÍVEL */}
                              <div style={{flex: '1 1 200px'}}>
                                  <label style={{fontSize: '0.75rem', color: '#64748b', marginBottom: '4px', display:'block', fontWeight: 'bold'}}>Data Início</label>
                                  <input type="date" value={atividadeModal.data.data_inicio || ''} onChange={e => setAtividadeModal({show: true, data: {...atividadeModal.data, data_inicio: e.target.value}})} style={{...inputStyle, padding:'10px', fontSize:'0.85rem', marginBottom: 0}} className="input-focus" />
                              </div>
                              
                              {/* 👇 SEM CONDIÇÃO - SEMPRE VISÍVEL */}
                              <div style={{flex: '1 1 200px'}}>
                                  <label style={{fontSize: '0.75rem', color: '#64748b', marginBottom: '4px', display:'block', fontWeight: 'bold'}}>Data Fim</label>
                                  <input type="date" value={atividadeModal.data.data_fim || ''} onChange={e => setAtividadeModal({show: true, data: {...atividadeModal.data, data_fim: e.target.value}})} style={{...inputStyle, padding:'10px', fontSize:'0.85rem', marginBottom: 0}} className="input-focus" />
                              </div>
                              
                              {/* 👇 COM CONDIÇÃO - SÓ APARECE SE EXIGIDO NAS CONFIGURAÇÕES */}
                              {deveMostrarCampoItem(atividadeModal.data.info_adicional, 'investimento') && (
                                  <div style={{flex: '1 1 200px'}}><label style={{fontSize: '0.75rem', color: '#64748b', marginBottom: '4px', display:'block', fontWeight: 'bold'}}>Invest. (€)</label><input type="number" step="0.01" value={atividadeModal.data.investimento || 0} onChange={e => setAtividadeModal({show: true, data: {...atividadeModal.data, investimento: e.target.value}})} style={{...inputStyle, padding:'10px', fontSize:'0.85rem', marginBottom: 0}} className="input-focus" /></div>
                              )}
                              
                              {deveMostrarCampoItem(atividadeModal.data.info_adicional, 'incentivo') && (
                                  <div style={{flex: '1 1 200px'}}><label style={{fontSize: '0.75rem', color: '#64748b', marginBottom: '4px', display:'block', fontWeight: 'bold'}}>Incentivo (€)</label><input type="number" step="0.01" value={atividadeModal.data.incentivo || 0} onChange={e => setAtividadeModal({show: true, data: {...atividadeModal.data, incentivo: e.target.value}})} style={{...inputStyle, padding:'10px', fontSize:'0.85rem', marginBottom: 0}} className="input-focus" /></div>
                              )}

                              {deveMostrarCampoItem(atividadeModal.data.info_adicional, 'financiamento') && (
                                  <div style={{flex: '1 1 200px'}}><label style={{fontSize: '0.75rem', color: '#64748b', marginBottom: '4px', display:'block', fontWeight: 'bold'}}>Financiamento (€)</label><input type="number" step="0.01" value={atividadeModal.data.financiamento || 0} onChange={e => setAtividadeModal({show: true, data: {...atividadeModal.data, financiamento: e.target.value}})} style={{...inputStyle, padding:'10px', fontSize:'0.85rem', marginBottom: 0}} className="input-focus" /></div>
                              )}

                              {deveMostrarCampoItem(atividadeModal.data.info_adicional, 'data_prevista_aprovacao') && (
                                  <div style={{flex: '1 1 200px'}}><label style={{fontSize: '0.75rem', color: '#64748b', marginBottom: '4px', display:'block', fontWeight: 'bold'}}>Data Prev. Aprovação</label><input type="date" value={atividadeModal.data.data_prevista_aprovacao || ''} onChange={e => setAtividadeModal({show: true, data: {...atividadeModal.data, data_prevista_aprovacao: e.target.value}})} style={{...inputStyle, padding:'10px', fontSize:'0.85rem', marginBottom: 0}} className="input-focus" /></div>
                              )}
                          </div>

                          <div style={sectionTitleStyle}><Icons.Activity /> Estado</div>
                          {renderStatePills(atividadeModal.data.estado, (val) => setAtividadeModal({show: true, data: {...atividadeModal.data, estado: val}}))}

                          {(atividadeModal.data.estado === 'em_analise' || atividadeModal.data.analise_data_prevista || atividadeModal.data.analise_destino) && (
                              <div style={{marginTop: '12px', marginBottom: '10px', background: 'var(--color-bgSecondary)', border: '1px solid var(--color-borderColor)', borderRadius: '10px', padding: '12px'}}>
                                  <div style={{fontSize: '0.74rem', color: 'var(--color-btnPrimaryDark)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px'}}>Acompanhamento da Analise</div>
                                  <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px'}}>
                                      <div>
                                          <label style={{fontSize: '0.75rem', color: '#64748b', marginBottom: '4px', display:'block', fontWeight: 'bold'}}>Encaminhada para</label>
                                          <select
                                              value={atividadeModal.data.analise_destino || 'proprio'}
                                              onChange={e => setAtividadeModal({show: true, data: {...atividadeModal.data, analise_destino: e.target.value}})}
                                              style={{...inputStyle, marginBottom: 0}}
                                              className="input-focus"
                                          >
                                              {ANALYSIS_DESTINATION_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                                          </select>
                                      </div>
                                      <div>
                                          <label style={{fontSize: '0.75rem', color: '#64748b', marginBottom: '4px', display:'block', fontWeight: 'bold'}}>Data expectavel de resposta</label>
                                          <input
                                              type="date"
                                              value={atividadeModal.data.analise_data_prevista || ''}
                                              onChange={e => setAtividadeModal({show: true, data: {...atividadeModal.data, analise_data_prevista: e.target.value}})}
                                              style={{...inputStyle, marginBottom: 0}}
                                              className="input-focus"
                                          />
                                      </div>
                                  </div>
                              </div>
                          )}

                          {/* --- NOTAS (SEM CONDIÇÃO - SEMPRE VISÍVEIS) --- */}
                          <div style={sectionTitleStyle}><Icons.FileText /> Notas</div>
                          <div style={{display: 'flex', flexWrap: 'wrap', gap: '15px'}}>
                              <div style={{flex: '1 1 250px'}}>
                                  <textarea rows="3" placeholder="Descrição..." value={atividadeModal.data.descricao || ''} onChange={e => setAtividadeModal({show: true, data: {...atividadeModal.data, descricao: e.target.value}})} style={{...inputStyle, resize:'none', width: '100%'}} className="input-focus" />
                              </div>
                              <div style={{flex: '1 1 250px'}}>
                                  <textarea rows="3" placeholder="Observações..." value={atividadeModal.data.observacoes || ''} onChange={e => setAtividadeModal({show: true, data: {...atividadeModal.data, observacoes: e.target.value}})} style={{...inputStyle, resize:'none', background:'#fffbeb', borderColor:'#fcd34d', width: '100%'}} className="input-focus-alert" />
                              </div>
                          </div>

                          <div style={{display: 'flex', gap: '10px', marginTop: '20px', paddingTop: '15px', borderTop: '1px solid #f1f5f9'}}>
                              <button type="button" onClick={() => setAtividadeModal({show:false, data:null})} style={{flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', background: 'white', color: '#64748b', fontWeight: 'bold', cursor:'pointer'}} className="hover-shadow">Cancelar</button>
                              <button type="submit" style={{flex: 2, padding: '12px', borderRadius: '10px', border: 'none', background: 'var(--color-btnPrimary)', color: 'white', fontWeight: 'bold', cursor:'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'}} className="hover-shadow"><Icons.Save /> Guardar Alterações</button>
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
                  <div className="custom-scrollbar" style={{background: 'white', padding: '32px', borderRadius: '18px', width: 'min(700px, 98vw)', maxHeight: '88vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', animation: 'fadeIn 0.2s ease-out'}}>
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
                          <h3 style={{margin: 0, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px'}}><Icons.Eye size={20} color="var(--color-btnPrimary)" /> Detalhes da Tarefa</h3>
                          <button onClick={() => { setTarefaModal({show:false, data:null, atividadeNome:''}); setTarefaFileToUpload(null); }} style={{background:'none', border:'none', cursor:'pointer'}} className="hover-red-text"><Icons.Close size={20} /></button>
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
                                  <select value={tarefaModal.data.responsavel_id || ''} onChange={e => {
                                      const newResp = e.target.value;
                                      const extras = Array.isArray(tarefaModal.data.colaboradores_extra) ? tarefaModal.data.colaboradores_extra : [];
                                      setTarefaModal({...tarefaModal, data: {...tarefaModal.data, responsavel_id: newResp, colaboradores_extra: extras.filter(id => id !== newResp)}})
                                  }} style={{...inputStyle, marginBottom: 0}} className="input-focus">
                                      <option value="">- Ninguém -</option>
                                      {renderAssigneeOptionGroups()}
                                  </select>
                              </div>
                          </div>

                          <div style={{marginBottom: '15px'}}>
                              <label style={{fontSize: '0.75rem', color: '#64748b', marginBottom: '6px', display:'block', fontWeight:'bold'}}>Outros Colaboradores Envolvidos</label>
                              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px'}}>
                                  <div>
                                      <div style={{fontSize: '0.7rem', color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px'}}>Equipa Interna</div>
                                      <div className="pill-container custom-scrollbar" style={{padding: '8px', maxHeight: '88px', overflowY: 'auto'}}>
                                          {internalAssigneeOptions.filter(s => String(s.id) !== String(tarefaModal.data.responsavel_id || '')).map(s => {
                                              const isSelected = Array.isArray(tarefaModal.data.colaboradores_extra) && tarefaModal.data.colaboradores_extra.map(id => String(id)).includes(String(s.id));
                                              return (
                                                  <div
                                                      key={`tar-int-${s.id}`}
                                                      onClick={() => handleToggleTarefaColaborador(s.id)}
                                                      className={`pill-checkbox ${isSelected ? 'selected' : ''}`}
                                                      style={{fontSize: '0.72rem', padding: '5px 10px'}}
                                                  >
                                                      {s.label}
                                                  </div>
                                              )
                                          })}
                                      </div>
                                  </div>

                                  <div>
                                      <div style={{fontSize: '0.7rem', color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px'}}>Pessoas das Entidades</div>
                                      <div className="pill-container custom-scrollbar" style={{padding: '8px', maxHeight: '88px', overflowY: 'auto'}}>
                                          {entityAssigneeOptions.filter(s => String(s.id) !== String(tarefaModal.data.responsavel_id || '')).map(s => {
                                              const isSelected = Array.isArray(tarefaModal.data.colaboradores_extra) && tarefaModal.data.colaboradores_extra.map(id => String(id)).includes(String(s.id));
                                              return (
                                                  <div
                                                      key={`tar-ent-${s.id}`}
                                                      onClick={() => handleToggleTarefaColaborador(s.id)}
                                                      className={`pill-checkbox ${isSelected ? 'selected' : ''}`}
                                                      style={{fontSize: '0.72rem', padding: '5px 10px'}}
                                                  >
                                                      {s.label}
                                                  </div>
                                              )
                                          })}
                                      </div>
                                  </div>
                              </div>
                          </div>

                          {/* --- PLANEAMENTO (Sempre visível) & FINANCEIRO CONDICIONAL --- */}
                          <div style={sectionTitleStyle}><Icons.Calendar /> Planeamento & Estado</div>
                          <div style={{display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '15px'}}>
                              
                              {/* 👇 SEM CONDIÇÃO - SEMPRE VISÍVEL */}
                              <div style={{flex: '1 1 150px'}}>
                                  <label style={{fontSize: '0.75rem', color: '#64748b', marginBottom: '4px', display:'block', fontWeight:'bold'}}>Data Início</label>
                                  <input type="date" value={tarefaModal.data.data_inicio || ''} onChange={e => setTarefaModal({...tarefaModal, data: {...tarefaModal.data, data_inicio: e.target.value}})} style={{...inputStyle, padding:'10px', fontSize:'0.85rem', marginBottom: 0, width: '100%'}} className="input-focus" />
                              </div>
                              
                              {/* 👇 SEM CONDIÇÃO - SEMPRE VISÍVEL */}
                              <div style={{flex: '1 1 150px'}}>
                                  <label style={{fontSize: '0.75rem', color: '#64748b', marginBottom: '4px', display:'block', fontWeight:'bold'}}>Prazo Limite</label>
                                  <input type="date" value={tarefaModal.data.data_fim || ''} onChange={e => setTarefaModal({...tarefaModal, data: {...tarefaModal.data, data_fim: e.target.value}})} style={{...inputStyle, padding:'10px', fontSize:'0.85rem', marginBottom: 0, width: '100%'}} className="input-focus" />
                              </div>

                              {/* 👇 SEM CONDIÇÃO - SEMPRE VISÍVEL */}
                              <div style={{flex: '1 1 150px'}}>
                                  <label style={{fontSize: '0.75rem', color: '#64748b', marginBottom: '4px', display:'block', fontWeight:'bold'}}>Prioridade</label>
                                  <select value={tarefaModal.data.prioridade || 'normal'} onChange={e => setTarefaModal({...tarefaModal, data: {...tarefaModal.data, prioridade: e.target.value}})} style={{...inputStyle, padding:'10px', fontSize:'0.85rem', marginBottom: 0, width: '100%'}} className="input-focus">
                                      <option value="baixa">🔵 Baixa</option>
                                      <option value="normal">🟢 Normal</option>
                                      <option value="alta">🟠 Alta</option>
                                      <option value="urgente">🔴 Urgente</option>
                                  </select>
                              </div>

                              {/* 👇 COM CONDIÇÃO - SÓ APARECEM SE EXIGIDOS */}
                              {deveMostrarCampoItem(tarefaModal.data.info_adicional, 'investimento') && (
                                  <div style={{flex: '1 1 150px'}}><label style={{fontSize: '0.75rem', color: '#64748b', marginBottom: '4px', display:'block', fontWeight:'bold'}}>Investimento (€)</label><input type="number" step="0.01" value={tarefaModal.data.investimento || 0} onChange={e => setTarefaModal({...tarefaModal, data: {...tarefaModal.data, investimento: e.target.value}})} style={{...inputStyle, padding:'10px', fontSize:'0.85rem', marginBottom: 0, width: '100%'}} className="input-focus" /></div>
                              )}

                              {deveMostrarCampoItem(tarefaModal.data.info_adicional, 'incentivo') && (
                                  <div style={{flex: '1 1 150px'}}><label style={{fontSize: '0.75rem', color: '#64748b', marginBottom: '4px', display:'block', fontWeight:'bold'}}>Incentivo (€)</label><input type="number" step="0.01" value={tarefaModal.data.incentivo || 0} onChange={e => setTarefaModal({...tarefaModal, data: {...tarefaModal.data, incentivo: e.target.value}})} style={{...inputStyle, padding:'10px', fontSize:'0.85rem', marginBottom: 0, width: '100%'}} className="input-focus" /></div>
                              )}

                              {deveMostrarCampoItem(tarefaModal.data.info_adicional, 'financiamento') && (
                                  <div style={{flex: '1 1 150px'}}><label style={{fontSize: '0.75rem', color: '#64748b', marginBottom: '4px', display:'block', fontWeight:'bold'}}>Financiamento (€)</label><input type="number" step="0.01" value={tarefaModal.data.financiamento || 0} onChange={e => setTarefaModal({...tarefaModal, data: {...tarefaModal.data, financiamento: e.target.value}})} style={{...inputStyle, padding:'10px', fontSize:'0.85rem', marginBottom: 0, width: '100%'}} className="input-focus" /></div>
                              )}

                              {deveMostrarCampoItem(tarefaModal.data.info_adicional, 'data_prevista_aprovacao') && (
                                  <div style={{flex: '1 1 150px'}}><label style={{fontSize: '0.75rem', color: '#64748b', marginBottom: '4px', display:'block', fontWeight:'bold'}}>Data Prev. Aprov.</label><input type="date" value={tarefaModal.data.data_prevista_aprovacao || ''} onChange={e => setTarefaModal({...tarefaModal, data: {...tarefaModal.data, data_prevista_aprovacao: e.target.value}})} style={{...inputStyle, padding:'10px', fontSize:'0.85rem', marginBottom: 0, width: '100%'}} className="input-focus" /></div>
                              )}
                          </div>

                          <label style={{...labelStyle, marginTop:'15px'}}>Estado Atual</label>
                          {renderStatePills(tarefaModal.data.estado, (val) => setTarefaModal({...tarefaModal, data: {...tarefaModal.data, estado: val}}))}

                          {(tarefaModal.data.estado === 'em_analise' || tarefaModal.data.analise_data_prevista || tarefaModal.data.analise_destino) && (
                              <div style={{marginTop: '12px', marginBottom: '12px', background: 'var(--color-bgSecondary)', border: '1px solid var(--color-borderColor)', borderRadius: '10px', padding: '12px'}}>
                                  <div style={{fontSize: '0.74rem', color: 'var(--color-btnPrimaryDark)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px'}}>Acompanhamento da Analise</div>
                                  <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px'}}>
                                      <div>
                                          <label style={{fontSize: '0.75rem', color: '#64748b', marginBottom: '4px', display:'block', fontWeight:'bold'}}>Encaminhada para</label>
                                          <select
                                              value={tarefaModal.data.analise_destino || 'proprio'}
                                              onChange={e => setTarefaModal({...tarefaModal, data: {...tarefaModal.data, analise_destino: e.target.value}})}
                                              style={{...inputStyle, marginBottom: 0, width: '100%'}}
                                              className="input-focus"
                                          >
                                              {ANALYSIS_DESTINATION_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                                          </select>
                                      </div>
                                      <div>
                                          <label style={{fontSize: '0.75rem', color: '#64748b', marginBottom: '4px', display:'block', fontWeight:'bold'}}>Data expectavel de resposta</label>
                                          <input
                                              type="date"
                                              value={tarefaModal.data.analise_data_prevista || ''}
                                              onChange={e => setTarefaModal({...tarefaModal, data: {...tarefaModal.data, analise_data_prevista: e.target.value}})}
                                              style={{...inputStyle, marginBottom: 0, width: '100%'}}
                                              className="input-focus"
                                          />
                                      </div>
                                  </div>
                              </div>
                          )}

                          <div style={sectionTitleStyle}><Icons.FileText /> Entregaveis</div>
                          <div style={{background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px', marginBottom: '12px'}}>
                              <label style={{display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700', color: '#1e293b', cursor: 'pointer', fontSize: '0.82rem', marginBottom: '8px'}}>
                                  <input
                                      type="checkbox"
                                      checked={Boolean(tarefaModal.data.tem_entregavel)}
                                      onChange={(e) => setTarefaModal({
                                          ...tarefaModal,
                                          data: { ...tarefaModal.data, tem_entregavel: e.target.checked }
                                      })}
                                      style={{accentColor: 'var(--color-btnPrimary)', width: '15px', height: '15px'}}
                                  />
                                  Requer documento entregavel?
                              </label>

                              {Boolean(tarefaModal.data.tem_entregavel) && (
                                  <>
                                      <div style={{display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px', marginBottom: '10px'}}>
                                          <div>
                                              <label style={{fontSize: '0.72rem', color: '#64748b', marginBottom: '4px', display:'block', fontWeight:'bold'}}>Nome / Tipo de Documento</label>
                                              <input
                                                  type="text"
                                                  placeholder="Ex: Relatorio Final PDF"
                                                  value={tarefaModal.data.nome_entregavel || ''}
                                                  onChange={(e) => setTarefaModal({
                                                      ...tarefaModal,
                                                      data: { ...tarefaModal.data, nome_entregavel: e.target.value }
                                                  })}
                                                  style={{...inputStyle, padding:'10px', fontSize:'0.85rem', marginBottom: 0, width: '100%'}}
                                                  className="input-focus"
                                              />
                                          </div>
                                          <div>
                                              <label style={{fontSize: '0.72rem', color: '#64748b', marginBottom: '4px', display:'block', fontWeight:'bold'}}>Data p/ Entrega</label>
                                              <input
                                                  type="date"
                                                  value={tarefaModal.data.data_entregavel || ''}
                                                  onChange={(e) => setTarefaModal({
                                                      ...tarefaModal,
                                                      data: { ...tarefaModal.data, data_entregavel: e.target.value }
                                                  })}
                                                  style={{...inputStyle, padding:'10px', fontSize:'0.85rem', marginBottom: 0, width: '100%'}}
                                                  className="input-focus"
                                              />
                                          </div>
                                      </div>

                                      <div
                                          style={{
                                              background: isTarefaDeliverableDragOver ? 'var(--color-bgSecondary)' : '#f8fafc',
                                              border: isTarefaDeliverableDragOver ? '1px dashed var(--color-btnPrimary)' : '1px dashed #cbd5e1',
                                              borderRadius: '8px',
                                              padding: '12px',
                                              transition: 'all 0.15s ease'
                                          }}
                                          onDragOver={(e) => {
                                              e.preventDefault();
                                              setIsTarefaDeliverableDragOver(true);
                                          }}
                                          onDragEnter={(e) => {
                                              e.preventDefault();
                                              setIsTarefaDeliverableDragOver(true);
                                          }}
                                          onDragLeave={() => setIsTarefaDeliverableDragOver(false)}
                                          onDrop={(e) => {
                                              e.preventDefault();
                                              setIsTarefaDeliverableDragOver(false);
                                              const droppedFile = e.dataTransfer?.files?.[0];
                                              applyTarefaDeliverableFile(droppedFile);
                                          }}
                                      >
                                          {tarefaModal.data.arquivo_url ? (
                                              <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap'}}>
                                                  <a
                                                      href={tarefaModal.data.arquivo_url}
                                                      target="_blank"
                                                      rel="noopener noreferrer"
                                                      style={{display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--color-btnPrimary)', fontWeight: '700', textDecoration: 'none', fontSize: '0.82rem'}}
                                                  >
                                                      <Icons.ExternalLink size={14} /> Ver documento atual
                                                  </a>
                                                  <button
                                                      type="button"
                                                      onClick={() => setTarefaModal({
                                                          ...tarefaModal,
                                                          data: { ...tarefaModal.data, arquivo_url: "" }
                                                      })}
                                                      style={{background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '700'}}
                                                      className="hover-red-text"
                                                  >
                                                      Remover ficheiro
                                                  </button>
                                              </div>
                                          ) : (
                                              <label style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer'}}>
                                                  <Icons.UploadCloud size={22} color={tarefaFileToUpload ? 'var(--color-btnPrimary)' : '#94a3b8'} />
                                                  <span style={{fontSize: '0.8rem', color: tarefaFileToUpload ? 'var(--color-btnPrimary)' : '#64748b', fontWeight: '700'}}>
                                                      {tarefaFileToUpload ? tarefaFileToUpload.name : 'Clique para anexar um documento'}
                                                  </span>
                                                  <input
                                                      type="file"
                                                      onChange={(e) => applyTarefaDeliverableFile(e.target.files?.[0] || null)}
                                                      style={{display: 'none'}}
                                                  />
                                              </label>
                                          )}
                                      </div>
                                  </>
                              )}
                          </div>

                          {/* --- DETALHES (Sempre visível) --- */}
                          <div style={sectionTitleStyle}><Icons.FileText /> Detalhes</div>
                          <textarea rows="4" placeholder="Descreva o que é necessário fazer..." value={tarefaModal.data.descricao || ''} onChange={e => setTarefaModal({...tarefaModal, data: {...tarefaModal.data, descricao: e.target.value}})} style={{...inputStyle, resize:'none'}} className="input-focus" />

                          <div style={{display: 'flex', gap: '10px', marginTop: '20px', paddingTop: '15px', borderTop: '1px solid #f1f5f9'}}>
                              <button type="button" onClick={() => { setTarefaModal({show:false, data:null, atividadeNome:''}); setTarefaFileToUpload(null); }} style={{flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', background: 'white', color: '#64748b', fontWeight: 'bold', cursor:'pointer'}} className="hover-shadow">Cancelar</button>
                              <button type="submit" style={{flex: 2, padding: '12px', borderRadius: '10px', border: 'none', background: 'var(--color-btnPrimary)', color: 'white', fontWeight: 'bold', cursor:'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'}} className="hover-shadow"><Icons.Save /> Guardar Tarefa</button>
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
                          <h3 style={{margin: 0, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px'}}><Icons.Check size={20} color="var(--color-btnPrimary)" /> Detalhes do Passo</h3>
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
                              <button type="submit" style={{flex: 2, padding: '12px', borderRadius: '10px', border: 'none', background: 'var(--color-btnPrimary)', color: 'white', fontWeight: 'bold', cursor:'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'}} className="hover-shadow"><Icons.Save /> Guardar</button>
                          </div>
                      </form>
                  </div>
              </div>
          </ModalPortal>
      )}

      {transitionPromptOpen && (
          <ModalPortal>
              <div
                  style={{
                      position: 'fixed',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: 'rgba(15, 23, 42, 0.55)',
                      backdropFilter: 'blur(4px)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 10000,
                      padding: '16px'
                  }}
                  onClick={(e) => {
                      if (e.target === e.currentTarget) setTransitionPromptOpen(false);
                  }}
              >
                  <div
                      style={{
                          width: 'min(520px, 100%)',
                          background: '#ffffff',
                          borderRadius: '16px',
                          border: '1px solid var(--color-borderColor)',
                          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
                          overflow: 'hidden'
                      }}
                  >
                      <div
                          style={{
                              padding: '16px 18px',
                              background: 'linear-gradient(135deg, var(--color-bgSecondary) 0%, var(--color-borderColorLight) 100%)',
                              borderBottom: '1px solid var(--color-borderColor)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '12px'
                          }}
                      >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span style={{ fontSize: '1.2rem' }}>✅</span>
                              <h3 style={{ margin: 0, color: 'var(--color-btnPrimaryHover)', fontSize: '1.05rem', fontWeight: '800' }}>Projeto concluído</h3>
                          </div>
                          <button
                              onClick={() => setTransitionPromptOpen(false)}
                              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-btnPrimaryDark)' }}
                              aria-label="Fechar"
                          >
                              <Icons.Close size={18} color="currentColor" />
                          </button>
                      </div>

                      <div style={{ padding: '20px 18px' }}>
                          <p style={{ margin: 0, color: '#334155', lineHeight: 1.55 }}>
                              Queres criar um novo projeto já pré-preenchido com esta informação para iniciar a próxima etapa (ex: Gestão)?
                          </p>

                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '18px', flexWrap: 'wrap' }}>
                              <button
                                  type="button"
                                  onClick={() => setTransitionPromptOpen(false)}
                                  className="btn-small"
                                  style={{ padding: '10px 14px', borderRadius: '10px', fontWeight: '700' }}
                              >
                                  Agora não
                              </button>
                              <button
                                  type="button"
                                  onClick={() => {
                                      setTransitionPromptOpen(false);
                                      handleTransmitirProjeto();
                                  }}
                                  className="btn-primary"
                                  style={{ padding: '10px 14px', borderRadius: '10px', fontWeight: '800' }}
                              >
                                  <Icons.Rocket size={16} color="#ffffff" />
                                  Iniciar próxima etapa
                              </button>
                          </div>
                      </div>
                  </div>
              </div>
          </ModalPortal>
      )}
      
      <style>{`
          .hover-blue-text:hover { color: var(--color-btnPrimary) !important; }
          .hover-blue-text:hover span { background: var(--color-bgTertiary) !important; color: var(--color-btnPrimary) !important; }
          .tab-hover:hover { color: #0f172a !important; }
          .hover-red:hover { opacity: 1 !important; color: #dc2626 !important; }
          .hover-red-text:hover { color: #ef4444 !important; }
          .hover-underline:hover { text-decoration: underline !important; }
          
          /* Animação suave para os botões e painéis */
          .hover-shadow:hover { transform: translateY(-1px); box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
          
          .input-focus:focus { border-color: var(--color-btnPrimary) !important; box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1); }
          .input-focus-alert:focus { border-color: #f59e0b !important; box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.1); }

          /* PILL CONTAINER & CHECKBOX (Para Parceiros e Colaboradores) */
          .pill-container { display: flex; flex-wrap: wrap; gap: 8px; padding: 15px; background: #ffffff; border-radius: 8px; border: 1px solid #cbd5e1; }
          .pill-checkbox { padding: 8px 18px; border-radius: 20px; font-size: 0.85rem; font-weight: 600; cursor: pointer; transition: all 0.2s ease; border: 1px solid #e2e8f0; background: #f8fafc; color: #64748b; user-select: none; }
          .pill-checkbox:hover { border-color: #cbd5e1; background: #f1f5f9; }
          .pill-checkbox.selected { background: var(--color-bgSecondary); border-color: var(--color-btnPrimary); color: var(--color-btnPrimary); box-shadow: 0 2px 4px rgba(59, 130, 246, 0.1); }

          /* Scrollbar Limpa */
          .custom-scrollbar::-webkit-scrollbar { height: 6px; width: 6px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 10px; }

          @keyframes taskFocusPulse { 0% { transform: scale(1); } 50% { transform: scale(1.01); } 100% { transform: scale(1); } }

          @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
          
          @keyframes pulse { 0% {box-shadow:0 0 0 0 rgba(239,68,68,0.7)} 70% {box-shadow:0 0 0 6px rgba(239,68,68,0)} 100% {box-shadow:0 0 0 0 rgba(239,68,68,0)}} 
          .pulse-dot-white { width: 8px; height: 8px; background-color: white; border-radius: 50%; display: inline-block; animation: pulse 1.5s infinite; }
      `}</style>
    </div>
  );
}
