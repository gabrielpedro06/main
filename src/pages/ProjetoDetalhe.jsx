import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { createPortal } from "react-dom";
import { supabase } from "../services/supabase";
import jsPDF from "jspdf";
import { useAuth } from "../context/AuthContext";
import TimerSwitchModal from "../components/TimerSwitchModal";
import StopTimerNoteModal from "../components/StopTimerNoteModal";
import { hasAttendanceStartedToday, startAttendanceNow } from "../utils/attendanceGuard";
import { concludeActivityWithChildren } from "../utils/activityStatusCascade";
import { buildDependencyMaps, getActivityBlockReason } from "../utils/dependencyGuards";
import { applyStopStatusUpdateForLogTarget } from "../utils/taskTimerLifecycle";
import "./../styles/dashboard.css";
import "../styles/projeto-detalhe.css";

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
  Info: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>,
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

const createBlankProjetoFase = (index = 0) => ({
    nome: `Fase ${index + 1}`,
    prazo: "",
});

const normalizeProjetoFases = (value) => {
    if (!Array.isArray(value) || value.length === 0) return [];

    return value
        .map((fase, index) => {
            if (typeof fase === "string") return createBlankProjetoFase(index);

            return {
                nome: String(fase?.nome || fase?.fase || `Fase ${index + 1}`).trim(),
                prazo: String(fase?.prazo || fase?.data || "").trim(),
            };
        })
        .filter((fase) => fase.nome || fase.prazo);
};

const getLastProjetoFaseDate = (fases) => {
    const normalized = normalizeProjetoFases(fases);
    const dates = normalized.map((fase) => fase.prazo).filter(Boolean);
    return dates.length > 0 ? dates[dates.length - 1] : "";
};

const ANALYSIS_DESTINATION_OPTIONS = [
    { value: "proprio", label: "Proprio" },
    { value: "colega", label: "Colega" },
    { value: "cliente", label: "Cliente" },
    { value: "contabilista", label: "Contabilista" },
    { value: "organismo", label: "Organismo" }
];

const GANTT_WINDOW_OPTIONS = [
    { value: "1m", label: "Neste mes", months: 1 },
    { value: "2m", label: "2 meses", months: 2 },
    { value: "6m", label: "6 meses", months: 6 },
    { value: "total", label: "Total", months: null }
];

const parseIsoDateSafe = (raw) => {
    if (!raw) return null;
    const str = String(raw).trim();
    if (!str) return null;
    const base = str.includes("T") ? str.slice(0, 10) : str;
    const dt = new Date(`${base}T00:00:00`);
    return Number.isNaN(dt.getTime()) ? null : dt;
};

const startOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1);
const endOfMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0);
const addMonths = (date, amount) => new Date(date.getFullYear(), date.getMonth() + amount, date.getDate());

const dayDiff = (start, end) => {
    const msPerDay = 24 * 60 * 60 * 1000;
    return Math.round((end.getTime() - start.getTime()) / msPerDay);
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const getProgressByState = (estado) => {
    if (estado === "concluido" || estado === "encerrado") return 100;
    if (estado === "em_curso") return 65;
    if (estado === "em_analise") return 45;
    if (estado === "pendente") return 20;
    return 0;
};

const buildGanttItems = (atividades = []) => {
    const rows = [];
    atividades.forEach((atividade) => {
        const tarefas = Array.isArray(atividade.tarefas) ? atividade.tarefas : [];
        const atividadeStart = parseIsoDateSafe(atividade.data_inicio) || parseIsoDateSafe(atividade.created_at) || parseIsoDateSafe(atividade.data_fim);
        const atividadeEnd = parseIsoDateSafe(atividade.data_fim) || atividadeStart;

        // Precompute task infos including progress (from subtarefas when present)
        const tarefaInfos = (tarefas || []).map((tarefa) => {
            const tarefaStart = parseIsoDateSafe(tarefa.data_inicio) || parseIsoDateSafe(tarefa.created_at) || parseIsoDateSafe(tarefa.data_fim) || atividadeStart;
            const tarefaEnd = parseIsoDateSafe(tarefa.data_fim) || tarefaStart || atividadeEnd;

            const subtarefas = Array.isArray(tarefa.subtarefas) ? tarefa.subtarefas : [];
            let tarefaProgress = 0;
            if (subtarefas.length > 0) {
                const done = subtarefas.filter(s => s.estado === 'concluido').length;
                tarefaProgress = Math.round((done / subtarefas.length) * 100);
            } else {
                if (tarefa.estado === 'concluido') tarefaProgress = 100;
                else if (tarefa.estado === 'pendente') tarefaProgress = 0;
                else tarefaProgress = getProgressByState(tarefa.estado);
            }

            return {
                tarefa,
                start: tarefaStart,
                end: tarefaEnd,
                progress: tarefaProgress
            };
        }).filter(ti => ti.start && ti.end);

        // Activity progress: percent of tasks completed (task considered complete when progress >= 100)
        let atividadeProgress = getProgressByState(atividade.estado);
        if (tarefaInfos.length > 0) {
            const completedTasks = tarefaInfos.filter(ti => (ti.progress || 0) >= 100).length;
            atividadeProgress = Math.round((completedTasks / tarefaInfos.length) * 100);
        }

        if (atividadeStart && atividadeEnd && tarefaInfos.length > 0) {
            rows.push({
                id: `atividade-${atividade.id}`,
                label: atividade.titulo || "Atividade",
                subtitle: "Atividade",
                estado: atividade.estado,
                progress: atividadeProgress,
                start: atividadeStart,
                end: atividadeEnd,
                type: "atividade",
                activityId: String(atividade.id),
                rowType: "group"
            });

            // Push task rows in the same order as tarefas
            tarefaInfos.forEach((ti) => {
                rows.push({
                    id: `tarefa-${ti.tarefa.id}`,
                    label: ti.tarefa.titulo || "Tarefa",
                    estado: ti.tarefa.estado,
                    progress: ti.progress,
                    start: ti.start,
                    end: ti.end,
                    type: "tarefa",
                    activityId: String(atividade.id),
                    activityLabel: atividade.titulo || "Atividade",
                    rowType: "task"
                });
            });
        }
    });

    return rows;
};

export default function ProjetoDetalhe() {
  const { id } = useParams(); 
  const navigate = useNavigate();
    const location = useLocation();
  const { user } = useAuth();
  
  const [projeto, setProjeto] = useState(null);
  const [atividades, setAtividades] = useState([]);
  const [logs, setLogs] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [programas, setProgramas] = useState([]);
  const [avisos, setAvisos] = useState([]);
  const [activeTab, setActiveTab] = useState("atividades");
  const [pedidosReembolso, setPedidosReembolso] = useState([]);
  const [pedidoReembolsoForm, setPedidoReembolsoForm] = useState(null);
  const [pedidoReembolsoSaving, setPedidoReembolsoSaving] = useState(false);
    const [ganttWindow, setGanttWindow] = useState("total");
  const [notification, setNotification] = useState(null);
  const [infoTooltip, setInfoTooltip] = useState(null); // { x, y, criadorNome, criadoEm }

  const [isExportingGantt, setIsExportingGantt] = useState(false);
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
    // Formatação de números com separador de milhares por espaço e decimal com ponto.
    const formatNumber = (value) => {
        if (value === null || value === undefined || value === "") return "";
        const num = Number(value);
        if (!Number.isFinite(num)) return value;

        return new Intl.NumberFormat('fr-FR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(num).replace(',', '.');
    };

    const parseNumberInput = (raw) => {
        if (raw === null || raw === undefined) return "";
        
        let normalized = String(raw).replace(/\s/g, "");
        
        normalized = normalized.replace(',', '.');

        if (normalized.endsWith('.')) return normalized;

        const num = Number(normalized);
        return Number.isFinite(num) ? num : normalized;
    };

  const [clientes, setClientes] = useState([]);
  const [staff, setStaff] = useState([]);
  const [entidadePessoas, setEntidadePessoas] = useState([]);
  const [tiposProjeto, setTiposProjeto] = useState([]);

  // Estados de Expansão
  const [expandedTasks, setExpandedTasks] = useState({});
  const [collapsedAtivs, setCollapsedAtivs] = useState({}); 
  const [pdCelebrating, setPdCelebrating] = useState(() => new Set());
  const [ganttCollapsed, setGanttCollapsed] = useState({});
  const [relFilterUser, setRelFilterUser] = useState('all');
  const [relDaysVisible, setRelDaysVisible] = useState(4);
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
        const focusAttemptRef = useRef(0);
    const [highlightedTarget, setHighlightedTarget] = useState(null);
        const [focusRetryTick, setFocusRetryTick] = useState(0);
    const [projetoEntidades, setProjetoEntidades] = useState([]);
    const [execEntidadeId, setExecEntidadeId] = useState(null);
    const [orcamentoEdit, setOrcamentoEdit] = useState(null); // { investimento, incentivo }

        const newPedidoReembolso = () => ({
            pedido: "",
            data_pedido: "",
            valor_investimento: "",
            valor_incentivo: "",
            valor_pago: "",
            data_pagamento: "",
            notas: ""
        });

        const getPedidoPmp = (pedido) => {
            if (!pedido?.data_pedido || !pedido?.data_pagamento) return null;
            const start = new Date(`${pedido.data_pedido}T00:00:00`);
            const end = new Date(`${pedido.data_pagamento}T00:00:00`);
            if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
            return Math.round((end - start) / (1000 * 60 * 60 * 24));
        };

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
    if (projLike.organismo_id) ids.push(projLike.organismo_id);
    return [...new Set(ids.map((v) => String(v)).filter(Boolean))];
};

// --- HELPERS DE PROGRAMAS E AVISOS ---
  const getProgramaById = (programaId) => programas.find((p) => String(p.id) === String(programaId)) || null;
  const getAvisoById = (avisoId) => avisos.find((a) => String(a.id) === String(avisoId)) || null;

  const getAvisosForPrograma = (programa) => {
      if (!programa) return [];
      if (Array.isArray(programa.avisos_ids)) {
          return avisos.filter(a => programa.avisos_ids.includes(a.id));
      }
      return []; // Fallback 
  };

  const handleProgramaChange = (programaId) => {
      if (!programaId) {
          setFormGeral(prev => ({
              ...prev,
              programa_id: "",
              programa: "",
              aviso_id: "",
              aviso: "",
              prazos_fases: []
          }));
          return;
      }

      const programa = getProgramaById(programaId);
      setFormGeral(prev => ({
          ...prev,
          programa_id: programaId,
          programa: programa ? `${programa.codigo ? `${programa.codigo} - ` : ""}${programa.nome || ""}`.trim() : "",
          aviso_id: "", // Limpa o aviso selecionado quando se muda de programa
          aviso: ""
      }));
  };

  useEffect(() => {
      const entidadeIds = getProjetoClientIds(formGeral);
      if (entidadeIds.length === 0) {
          setEntidadePessoas([]);
          return;
      }

      let cancelled = false;
      (async () => {
          const { data } = await supabase
              .from("contactos_cliente")
              .select("id, cliente_id, nome_contacto, cargo, email, clientes(marca, sigla)")
              .in("cliente_id", entidadeIds)
              .order("nome_contacto", { ascending: true });
          if (!cancelled) setEntidadePessoas(data || []);
      })();

      return () => { cancelled = true; };
  }, [formGeral.cliente_id, formGeral.parceiros_ids, formGeral.organismo_id]);

  // --- REFS PARA DRAG & DROP NATIVO ---
  const dragAtivItem = useRef();
  const dragAtivOverItem = useRef();
  
  const dragTarItem = useRef();
  const dragTarOverItem = useRef();

  useEffect(() => {
      const urlParams = new URLSearchParams(location.search || "");
      const focusTaskId = location.state?.focusTaskId || urlParams.get("focusTaskId");
      const focusTaskType = location.state?.focusTaskType || urlParams.get("focusTaskType") || 'tarefa';
      if (!focusTaskId) return;

      // Garantir que os cards existem no DOM antes de tentar o scroll.
      setActiveTab('atividades');

      pendingFocusRef.current = {
          id: String(focusTaskId),
          type: focusTaskType === 'atividade' ? 'atividade' : 'tarefa'
      };
      focusAttemptRef.current = 0;
      setFocusRetryTick((prev) => prev + 1);

      urlParams.delete("focusTaskId");
      urlParams.delete("focusTaskType");
      const cleanedSearch = urlParams.toString();
      navigate(
          cleanedSearch ? `${location.pathname}?${cleanedSearch}` : location.pathname,
          { replace: true, state: null }
      );
  }, [location.state, location.pathname, location.search, navigate]);

  useEffect(() => {
      const pending = pendingFocusRef.current;
      if (!pending || atividades.length === 0) return;
      if (activeTab !== 'atividades') return;

      const elementId = pending.type === 'atividade' ? `atividade-card-${pending.id}` : `tarefa-card-${pending.id}`;
      const element = document.getElementById(elementId);
      if (!element) {
          if (pending.type === 'tarefa') {
              const parentActivity = atividades.find((ativ) =>
                  (ativ.tarefas || []).some((tar) => String(tar.id) === String(pending.id))
              );

              if (parentActivity && collapsedAtivs[parentActivity.id]) {
                  setCollapsedAtivs((prev) => ({ ...prev, [parentActivity.id]: false }));
              }

              // Se a tarefa estiver numa atividade concluída (lista escondida), focamos a atividade pai.
              if (parentActivity?.estado === 'concluido') {
                  const parentElement = document.getElementById(`atividade-card-${parentActivity.id}`);
                  if (parentElement) {
                      parentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      setHighlightedTarget({ id: String(parentActivity.id), type: 'atividade' });
                      pendingFocusRef.current = null;
                      focusAttemptRef.current = 0;

                      const timeoutId = window.setTimeout(() => {
                          setHighlightedTarget(null);
                      }, 2600);

                      return () => window.clearTimeout(timeoutId);
                  }
              }
          }

          if (focusAttemptRef.current < 8) {
              focusAttemptRef.current += 1;
              const retryId = window.setTimeout(() => {
                  setFocusRetryTick((prev) => prev + 1);
              }, 120);
              return () => window.clearTimeout(retryId);
          }

          pendingFocusRef.current = null;
          focusAttemptRef.current = 0;
          return;
      }

      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedTarget(pending);
      pendingFocusRef.current = null;
      focusAttemptRef.current = 0;

      const timeoutId = window.setTimeout(() => {
          setHighlightedTarget(null);
      }, 2600);

      return () => window.clearTimeout(timeoutId);
    }, [atividades, activeTab, collapsedAtivs, focusRetryTick]);

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


  async function checkActiveLog() {
      if(!user?.id) return;
      const { data } = await supabase.from("task_logs").select("*").eq("user_id", user.id).is("end_time", null).maybeSingle();
      setActiveLog(data || null);
  }

  async function fetchProjetoDetails() {
    setLoading(true);

    const { data: projData } = await supabase.from("projetos").select("*, clientes!cliente_id(marca, sigla), tipos_projeto(nome), profiles(nome)").eq("id", id).single();
    if (projData) { 
        setProjeto(projData); 
        setFormGeral({ ...projData, has_organismo: !!projData.organismo_id, prazos_fases: normalizeProjetoFases(projData.prazos_fases) }); 
    }

    const [
        { data: cliData }, 
        { data: staffData }, 
        { data: tiposData },
        { data: progData },
        { data: avisoData }
    ] = await Promise.all([
        supabase.from("clientes").select("id, marca, sigla, eh_organismo").order("marca"),
        supabase.from("profiles").select("id, nome, email, ativo").order("nome"),
        supabase.from("tipos_projeto").select("id, nome, eh_formacao").order("nome"),
        supabase.from("programas_financiamento").select("id, codigo, nome, aviso, avisos_ids, ativo").order("codigo", { ascending: true }),
        supabase.from("avisos").select("*").order("codigo", { ascending: true })
    ]);

    setClientes(cliData || []);
    setStaff(staffData || []);
    setTiposProjeto(tiposData || []);
    setProgramas(progData || []);
    setAvisos(avisoData || []);

    const entidadeIds = getProjetoClientIds(projData);
    if (entidadeIds.length > 0) {
        const { data: contactosData } = await supabase
            .from("contactos_cliente")
            .select("id, cliente_id, nome_contacto, cargo, email, clientes(marca, sigla)") // Aqui não precisa porque é só uma chave forasteira
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

    const { data: pedidosData, error: pedidosError } = await supabase
        .from("pedidos_reembolso")
        .select("id, projeto_id, entidade_id, pedido, data_pedido, valor_investimento, valor_incentivo, valor_pago, data_pagamento, notas, user_id, created_at")
        .eq("projeto_id", id)
        .order("data_pedido", { ascending: true })
        .order("created_at", { ascending: true });
    if (pedidosError) {
        console.error("Erro ao carregar pedidos de reembolso:", pedidosError);
        showToast("Erro ao carregar pedidos de reembolso.", "error");
    } else {
        setPedidosReembolso(pedidosData || []);
    }
    
    const { data: peData, error: peError } = await supabase
        .from("projeto_entidades")
        .select("projeto_id, entidade_id, papel, investimento, incentivo")
        .eq("projeto_id", id);
    if (peError) console.error("Erro ao carregar projeto_entidades:", peError);
    setProjetoEntidades(peData || []);

    setLoading(false);
  }

  const savePedidoReembolso = async (event) => {
      event.preventDefault();
      if (!pedidoReembolsoForm || pedidoReembolsoSaving) return;
      if (!pedidoReembolsoForm.pedido.trim()) {
          showToast("Indica o número ou referência do pedido.", "warning");
          return;
      }

      const payload = {
          projeto_id: id,
          pedido: pedidoReembolsoForm.pedido.trim(),
          data_pedido: pedidoReembolsoForm.data_pedido || null,
          valor_investimento: Number(pedidoReembolsoForm.valor_investimento) || 0,
          valor_incentivo: Number(pedidoReembolsoForm.valor_incentivo) || 0,
          valor_pago: Number(pedidoReembolsoForm.valor_pago) || 0,
          data_pagamento: pedidoReembolsoForm.data_pagamento || null,
          notas: pedidoReembolsoForm.notas?.trim() || null,
          entidade_id: pedidoReembolsoForm.entidade_id || projeto.cliente_id
      };

      setPedidoReembolsoSaving(true);
      try {
          const query = pedidoReembolsoForm.id
              ? supabase.from("pedidos_reembolso").update(payload).eq("id", pedidoReembolsoForm.id).select().single()
              : supabase.from("pedidos_reembolso").insert(payload).select().single();
          const { data, error } = await query;
          if (error) throw error;
          setPedidosReembolso((previous) => pedidoReembolsoForm.id
              ? previous.map((item) => item.id === data.id ? data : item)
              : [...previous, data].sort((a, b) => String(a.data_pedido || "").localeCompare(String(b.data_pedido || ""))));
          setPedidoReembolsoForm(null);
          showToast(pedidoReembolsoForm.id ? "Pedido atualizado." : "Pedido registado.", "success");
      } catch (error) {
          console.error("Erro ao guardar pedido de reembolso:", error);
          showToast(`Erro ao guardar pedido: ${error.message}`, "error");
      } finally {
          setPedidoReembolsoSaving(false);
      }
  };

  const saveOrcamentoEntidade = async (entidadeId, entidadesIds) => {
    const investimento = Number(orcamentoEdit?.investimento) || 0;
    const incentivo = Number(orcamentoEdit?.incentivo) || 0;
    const papel = String(entidadeId) === String(projeto.cliente_id) ? "lider" : "parceiro";

    const { error } = await supabase.from("projeto_entidades").upsert(
        { projeto_id: id, entidade_id: entidadeId, papel, investimento, incentivo },
        { onConflict: "projeto_id,entidade_id" }
    );
    if (error) { showToast(`Erro ao guardar valores: ${error.message}`, "error"); return; }

    const next = [
        ...projetoEntidades.filter((r) => String(r.entidade_id) !== String(entidadeId)),
        { projeto_id: id, entidade_id: entidadeId, papel, investimento, incentivo }
    ];
    setProjetoEntidades(next);

    // mantém o total do projeto = soma das entidades (igual ao Projetos.jsx)
    const soma = (f) => entidadesIds.reduce(
        (t, eid) => t + (Number(next.find((r) => String(r.entidade_id) === String(eid))?.[f]) || 0), 0);
    const totais = { investimento: soma("investimento"), incentivo: soma("incentivo") };
    await supabase.from("projetos").update(totais).eq("id", id);
    setProjeto((prev) => ({ ...prev, ...totais }));

    setOrcamentoEdit(null);
    showToast("Valores da entidade atualizados.", "success");
};  

  const deletePedidoReembolso = async (pedidoId) => {
      if (!window.confirm("Apagar este pedido de reembolso?")) return;
      const { error } = await supabase.from("pedidos_reembolso").delete().eq("id", pedidoId);
      if (error) {
          console.error("Erro ao apagar pedido de reembolso:", error);
          showToast(`Erro ao apagar pedido: ${error.message}`, "error");
          return;
      }
      setPedidosReembolso((previous) => previous.filter((item) => item.id !== pedidoId));
      showToast("Pedido apagado.", "success");
  };

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

  const buildTimeLogPayload = (formState) => {
      const userId = formState.user_id || "";
      const duration = Math.max(1, parseInt(formState.duration_minutes, 10) || 0);
      if (!userId || !formState.target_id || duration <= 0 || !formState.date || !formState.start_time) return null;

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

      // Construct start time from date and time inputs
      const [year, month, day] = formState.date.split('-').map(Number);
      const [hour, minute] = formState.start_time.split(':').map(Number);
      const startTime = new Date(year, month - 1, day, hour, minute);

      if (isNaN(startTime.getTime())) return null;

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
      const now = new Date();
      setTimeLogForm({
          user_id: user?.id || "",
          target_type: "tarefa",
          target_id: firstTaskId,
          duration_minutes: "30",
          date: now.toISOString().split('T')[0],
          start_time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
      });
      setTimeLogModal({ show: true, mode: "create", logId: null });
  };

  const openEditTimeLogModal = (log) => {
      const targetInfo = getTargetOptionByLog(log);
      const logDate = log.start_time ? new Date(log.start_time) : new Date();
      setTimeLogForm({
          user_id: log.user_id || "",
          target_type: targetInfo.target_type,
          target_id: targetInfo.target_id,
          duration_minutes: String(log.duration_minutes || ""),
          date: logDate.toISOString().split('T')[0],
          start_time: `${String(logDate.getHours()).padStart(2, '0')}:${String(logDate.getMinutes()).padStart(2, '0')}`
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
      const payload = buildTimeLogPayload(timeLogForm);
      
      if (!payload) {
          showToast("Preenche colaborador, item e minutos válidos.", "warning");
          return;
      }

      setTimeLogSaving(true);
      try {
          if (timeLogModal.mode === "edit" && existingLog) {
              let { error } = await supabase.from("task_logs").update(payload).eq("id", timeLogModal.logId);
              
              if (error && isMissingSubtaskColumnError(error)) {
                  const retryPayload = { ...payload };
                  delete retryPayload.subtarefa_id; // Subtarefa_id pode não existir na tabela antiga
                  
                  const retry = await supabase.from("task_logs").update(retryPayload).eq("id", timeLogModal.logId);
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
      openConfirmModal({
          action: "delete-time-log",
          title: "Apagar Registo de Tempo",
          message: "Tens a certeza que pretendes apagar este registo de tempo? Esta ação não pode ser desfeita.",
          confirmLabel: "Apagar",
          confirmTone: "danger",
          payload: { logId }
      });
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

      const diffDays = Math.round((deadline.getTime() - today.getTime()) / (1000 * 3600 * 24));
      const dateFormatted = deadline.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' }).replace('.', '');
      const iconSize = isLarge ? 13 : 11;
      const title = `Prazo: ${deadline.toLocaleDateString('pt-PT')}`;

      if (isCompleted) return <span className={`pd-due is-done ${isLarge ? 'is-lg' : ''}`} title={title}><Icons.Check size={iconSize} /> {dateFormatted}</span>;
      if (diffDays < 0) return <span className={`pd-due is-late ${isLarge ? 'is-lg' : ''}`} title={title}><Icons.AlertTriangle size={iconSize} /> {dateFormatted} · {Math.abs(diffDays)}d atraso</span>;
      if (diffDays === 0) return <span className={`pd-due is-today ${isLarge ? 'is-lg' : ''}`} title={title}><Icons.Flame size={iconSize} /> Hoje</span>;
      if (diffDays <= 3) return <span className={`pd-due is-soon ${isLarge ? 'is-lg' : ''}`} title={title}><Icons.Clock size={iconSize} /> {dateFormatted} · {diffDays}d</span>;
      return <span className={`pd-due ${isLarge ? 'is-lg' : ''}`} title={title}><Icons.Calendar size={iconSize} /> {dateFormatted}</span>;
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
              numero_projeto: formGeral.numero_projeto || "",
              descricao: formGeral.descricao, observacoes: formGeral.observacoes,
              programa_id: formGeral.programa_id || null,
              aviso_id: formGeral.aviso_id || null,
              prazos_fases: normalizeProjetoFases(formGeral.prazos_fases),
              tipo_projeto_id: formGeral.tipo_projeto_id || null,
              organismo_id: formGeral.has_organismo && formGeral.organismo_id ? formGeral.organismo_id : null,
              organismo_contacto_id: formGeral.has_organismo && formGeral.organismo_id && formGeral.organismo_contacto_id ? formGeral.organismo_contacto_id : null
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
      .map((s) => ({ id: s.id, label: s.nome || s.email || "Colaborador interno", source: "internal", ativo: s.ativo !== false }));

  const entityAssigneeOptions = (entidadePessoas || [])
      .filter((p) => Boolean(p?.id))
      .map((p) => {
          const empresa = getClientDisplayName(p.clientes) ? ` - ${getClientDisplayName(p.clientes)}` : "";
          const cargo = p.cargo ? ` (${p.cargo})` : "";
          const nome = p.nome_contacto || p.email || "Contacto";
          return { id: p.id, label: `${nome}${cargo}${empresa}`, source: "entity" };
      });

  const organismoPessoas = formGeral.has_organismo && formGeral.organismo_id
      ? (entidadePessoas || []).filter(p => String(p.cliente_id) === String(formGeral.organismo_id))
      : [];

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

  const renderResponsavelOptions = () => (
    <>
        {internalAssigneeOptions.length > 0 && (
            <optgroup label="Equipa Interna">
                {internalAssigneeOptions.map((opt) => (
                    <option key={`int-${opt.id}`} value={opt.id}>{opt.label}</option>
                ))}
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
              .update({ estado: "encerrado" })
              .eq("id", projeto.id);

          if (error) throw error;

          closeConfirmModal();
          showToast("Projeto encerrado e arquivado com sucesso.");
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
          return;
      }

      if (confirmModal.action === "delete-time-log") {
          const payload = confirmModal.payload || {};
          try {
              const { error } = await supabase.from("task_logs").delete().eq("id", payload.logId);
              if (error) throw error;
              setLogs((prev) => prev.filter((l) => String(l.id) !== String(payload.logId)));
              showToast("Registo apagado.", "success");
          } catch (err) {
              showToast(`Erro ao apagar registo: ${err.message}`, "error");
          }
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
    if(estado === 'concluido') return { bg: '#e0f2fe', text: '#0284c7', border: '#bae6fd', dot: '#0ea5e9' };
    if(estado === 'encerrado') return { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1', dot: '#64748b' };
    if(estado === 'em_curso') return { bg: '#fefce8', text: '#ca8a04', border: '#fde047', dot: '#eab308' };
    if(estado === 'cancelado') return { bg: '#fef2f2', text: '#dc2626', border: '#fecaca', dot: '#ef4444' };
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
    const entidadesFin = [...new Set(
    [projeto.cliente_id, ...(projeto.is_parceria ? normalizeIdsList(projeto.parceiros_ids) : [])]
        .filter(Boolean).map(String)
)];
    const statusTheme = getProjectStatusTheme(projeto.estado);
    const projetoFases = normalizeProjetoFases(formGeral.prazos_fases);
  const labelStyle = { display: 'block', marginBottom: '6px', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' };
  const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box', marginBottom: '15px', transition: 'all 0.2s', color: '#1e293b' };
  const sectionTitleStyle = { fontSize: '0.8rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '15px', marginTop: '5px' };

  const renderStatePills = (currentState, onChange, includeEncerrado = false) => {
      const states = [
          { val: 'pendente', label: 'PENDENTE', color: '#f59e0b' },
          { val: 'em_curso', label: 'EM CURSO', color: '#10b981' },
          { val: 'em_analise', label: 'EM ANÁLISE', color: '#6366f1' },
          { val: 'concluido', label: 'CONCLUÍDO', color: '#0ea5e9' },
          ...(includeEncerrado ? [{ val: 'encerrado', label: 'ENCERRADO', color: '#64748b' }] : []),
          { val: 'cancelado', label: 'CANCELADO', color: '#ef4444' }
      ];
      return (
          <div style={{display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap'}}>
              {states.map(s => (
                  <div key={s.val} onClick={() => onChange(s.val)} style={{
                      flex: '1 1 calc(33% - 8px)', minWidth: '95px', textAlign: 'center', padding: '10px 4px', borderRadius: '8px', cursor: 'pointer',
                      fontSize: '0.70rem', fontWeight: 'bold', border: `1px solid ${currentState === s.val ? s.color : '#cbd5e1'}`,
                      background: currentState === s.val ? s.color : '#f8fafc', color: currentState === s.val ? '#fff' : '#64748b', transition: 'all 0.2s'
                  }}>
                      {s.label}
                  </div>
              ))}
          </div>
      );
  };

  // LÓGICA DO NOME DO CLIENTE / PARCERIA NO CABEÇALHO
  const clientEntities = [];
  
  // 1. Cliente Principal
  if (projeto?.cliente_id) {
      const mainClient = clientes.find(c => String(c.id) === String(projeto.cliente_id)) || projeto.clientes;
      clientEntities.push({
          id: projeto.cliente_id,
          sigla: mainClient?.sigla?.trim() || mainClient?.marca?.trim() || 'Cliente',
          nome: mainClient?.marca?.trim() || 'Cliente Principal',
          isParceiro: false
      });
  } else if (projeto?.cliente_texto) {
      clientEntities.push({ id: null, sigla: projeto.cliente_texto, nome: projeto.cliente_texto, isParceiro: false });
  } else {
      clientEntities.push({ id: null, sigla: 'Não Definido', nome: 'Não Definido', isParceiro: false });
  }

  // 2. Parceiros
  if (projeto?.is_parceria && projeto?.parceiros_ids?.length > 0) {
      projeto.parceiros_ids.forEach(pid => {
          const parceiro = clientes.find(c => String(c.id) === String(pid));
          if (parceiro) {
              clientEntities.push({
                  id: parceiro.id,
                  sigla: parceiro.sigla?.trim() || parceiro.marca?.trim() || 'Parceiro',
                  nome: parceiro.marca?.trim() || 'Entidade Parceira',
                  isParceiro: true
              });
          }
      });
  }

  // 👇 NOVA LÓGICA: Procurar o nome do Organismo para mostrar no cabeçalho
  let organismoDisplay = null;
  if (projeto.organismo_id) {
      const org = clientes.find(c => String(c.id) === String(projeto.organismo_id));
      if (org) {
          organismoDisplay = getClientDisplayName(org) || org.marca;
      }
  }

  let organismoPessoaDisplay = null;
  if (projeto.organismo_contacto_id) {
      const contactoOrg = entidadePessoas.find(c => String(c.id) === String(projeto.organismo_contacto_id));
      if (contactoOrg) {
          const nome = contactoOrg.nome_contacto || contactoOrg.email || "Contacto";
          organismoPessoaDisplay = contactoOrg.cargo ? `${nome} (${contactoOrg.cargo})` : nome;
      }
  }

  const canNavigateToClient = !projeto.is_parceria && Boolean(projeto?.cliente_id);
  const handleClientHeaderClick = () => {
      if (!canNavigateToClient) return;
      navigate('/dashboard/clientes', { state: { openClienteId: projeto.cliente_id } });
  };

  const ganttItems = buildGanttItems(atividades);
    // Generate a consistent color per activity based on its title (keeps tasks visually inside the same theme)
    const hashToHue = (text = "") => {
        let h = 0;
        for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) % 360;
        return h;
    };

    const activityColors = (atividades || []).reduce((acc, a) => {
        const key = String(a.id);
        const hue = hashToHue(a.titulo || key || String(Math.random()));
        const base = `hsl(${hue}, 70%, 45%)`;
        const lightSolid = `hsl(${hue}, 60%, 92%)`; // softer, less saturated pastel
        const light = `linear-gradient(90deg, ${lightSolid} 0%, rgba(255,255,255,0.96) 100%)`;
        const border = `hsla(${hue}, 60%, 45%, 0.14)`;
        const glow = `hsla(${hue}, 60%, 45%, 0.10)`;

        acc[key] = { base, light, lightSolid, border, glow };
        return acc;
    }, {});
  const ganttNow = new Date();
  const selectedWindow = GANTT_WINDOW_OPTIONS.find((option) => option.value === ganttWindow) || GANTT_WINDOW_OPTIONS[0];

  const ganttWindowStart = (() => {
      if (selectedWindow.value !== "total") {
          return startOfMonth(ganttNow);
      }
      if (ganttItems.length === 0) return startOfMonth(ganttNow);
      return new Date(Math.min(...ganttItems.map((item) => item.start.getTime())));
  })();

  const ganttWindowEnd = (() => {
      if (selectedWindow.value !== "total") {
          return endOfMonth(addMonths(ganttWindowStart, (selectedWindow.months || 1) - 1));
      }
      if (ganttItems.length === 0) return endOfMonth(ganttNow);
      return new Date(Math.max(...ganttItems.map((item) => item.end.getTime())));
  })();

  const ganttDurationDays = Math.max(1, dayDiff(ganttWindowStart, ganttWindowEnd) + 1);
  const visibleGanttItems = ganttItems.filter((item) => item.end >= ganttWindowStart && item.start <= ganttWindowEnd);
  const concludedItems = visibleGanttItems.filter((item) => item.estado === "concluido").length;
  const visibleCompletion = visibleGanttItems.length > 0
      ? Math.round((concludedItems / visibleGanttItems.length) * 100)
      : 0;

  const todayPercent = (() => {
      if (ganttNow < ganttWindowStart || ganttNow > ganttWindowEnd) return null;
      return (clamp(dayDiff(ganttWindowStart, ganttNow), 0, ganttDurationDays) / ganttDurationDays) * 100;
  })();

  // ---------- Exportar Gantt: PDF vetorial desenhado de raiz (não é uma captura de ecrã) ----------
  const hslToRgb = (h, s, l) => {
      s /= 100; l /= 100;
      const k = (n) => (n + h / 30) % 12;
      const a = s * Math.min(l, 1 - l);
      const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
      return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
  };
  const mixWhite = (rgb, t) => rgb.map((c) => Math.round(c + (255 - c) * t));

  const exportGanttPdf = async () => {
      if (isExportingGantt) return;
      setIsExportingGantt(true);
      try {
          const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
          const PW = pdf.internal.pageSize.getWidth();
          const PH = pdf.internal.pageSize.getHeight();
          const M = 12;
          const LABEL_W = 82;
          const CX = M + LABEL_W;
          const CW = PW - M - CX;
          const HEAD_H = 10;
          const today = new Date(); today.setHours(0, 0, 0, 0);
          const ink = [15, 23, 42], muted = [100, 116, 139], faint = [148, 163, 184], line = [226, 232, 240];
          const fmt = (d) => d.toLocaleDateString("pt-PT");
          const xOf = (date) => CX + (clamp(dayDiff(ganttWindowStart, date), 0, ganttDurationDays) / ganttDurationDays) * CW;
          const todayX = todayPercent !== null ? CX + (todayPercent / 100) * CW : null;
          const clean = (txt) => String(txt || "").replace(/[—–]/g, "-").replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
          const fit = (txt, maxW) => {
              let t = clean(txt);
              if (pdf.getTextWidth(t) <= maxW) return t;
              while (t.length > 1 && pdf.getTextWidth(`${t}...`) > maxW) t = t.slice(0, -1);
              return `${t.trim()}...`;
          };

          // Bandas de meses
          const bands = [];
          const cur = startOfMonth(ganttWindowStart);
          while (cur <= ganttWindowEnd) {
              const bStart = cur < ganttWindowStart ? ganttWindowStart : new Date(cur);
              const mEnd = endOfMonth(cur);
              const bEnd = mEnd > ganttWindowEnd ? ganttWindowEnd : mEnd;
              bands.push({ x0: xOf(bStart), x1: CX + ((clamp(dayDiff(ganttWindowStart, bEnd) + 1, 0, ganttDurationDays)) / ganttDurationDays) * CW, date: new Date(cur) });
              cur.setMonth(cur.getMonth() + 1);
          }

          const drawChartHeader = (y) => {
              pdf.setFillColor(248, 250, 252);
              pdf.rect(M, y, PW - 2 * M, HEAD_H, "F");
              pdf.setFont("helvetica", "bold"); pdf.setFontSize(7); pdf.setTextColor(...muted);
              pdf.text("ATIVIDADE / TAREFA", M + 2, y + 6.3);
              bands.forEach((b, i) => {
                  if (i % 2 === 1) { pdf.setFillColor(241, 245, 249); pdf.rect(b.x0, y, b.x1 - b.x0, HEAD_H, "F"); }
                  const w = b.x1 - b.x0;
                  const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
                  const mes = MESES[b.date.getMonth()];
                  const label = w > 16 ? `${mes} ${b.date.getFullYear()}` : w > 7 ? mes : w > 3 ? mes[0].toUpperCase() : "";
                  if (label) {
                      pdf.setFont("helvetica", "bold"); pdf.setFontSize(w > 7 ? 7 : 6); pdf.setTextColor(...muted);
                      pdf.text(label, b.x0 + w / 2, y + 4.4, { align: "center" });
                  }
              });
              if (todayX !== null) {
                  pdf.setFillColor(239, 68, 68);
                  pdf.roundedRect(todayX - 5, y + 5.6, 10, 3.8, 1.5, 1.5, "F");
                  pdf.setFont("helvetica", "bold"); pdf.setFontSize(5.5); pdf.setTextColor(255, 255, 255);
                  pdf.text("HOJE", todayX, y + 8.35, { align: "center" });
              }
              return y + HEAD_H;
          };

          const drawGridColumn = (y0, y1) => {
              pdf.setDrawColor(...line); pdf.setLineWidth(0.15);
              bands.forEach((b, i) => {
                  if (i % 2 === 1) { pdf.setFillColor(250, 251, 252); pdf.rect(b.x0, y0, b.x1 - b.x0, y1 - y0, "F"); }
                  pdf.line(b.x0, y0, b.x0, y1);
              });
              pdf.line(CX + CW, y0, CX + CW, y1);
          };

          const drawToday = (y0, y1) => {
              if (todayX === null) return;
              pdf.setDrawColor(239, 68, 68); pdf.setLineWidth(0.35);
              pdf.setLineDashPattern([1.2, 1], 0);
              pdf.line(todayX, y0, todayX, y1);
              pdf.setLineDashPattern([], 0);
          };

          // ---------- Página 1: cabeçalho do projeto ----------
          pdf.setFillColor(...ink);
          pdf.roundedRect(M, M, PW - 2 * M, 26, 3, 3, "F");
          pdf.setTextColor(255, 255, 255);
          pdf.setFont("helvetica", "bold"); pdf.setFontSize(7); pdf.setTextColor(203, 213, 225);
          pdf.text("CRONOGRAMA DO PROJETO (GANTT)", M + 6, M + 7);
          pdf.setFontSize(15); pdf.setTextColor(255, 255, 255);
          pdf.text(fit(projeto?.titulo || "Projeto", PW - 2 * M - 80), M + 6, M + 15);
          pdf.setFont("helvetica", "normal"); pdf.setFontSize(8.5); pdf.setTextColor(203, 213, 225);
          const sub = [clientEntities.map((e) => e.sigla).join(" · "), projeto?.codigo_projeto, projeto?.numero_projeto ? `Nº ${projeto.numero_projeto}` : null, projeto?.tipos_projeto?.nome].filter(Boolean).join("   |   ");
          pdf.text(fit(sub, PW - 2 * M - 80), M + 6, M + 21.5);
          pdf.setFont("helvetica", "bold"); pdf.setFontSize(8); pdf.setTextColor(255, 255, 255);
          pdf.text(`${fmt(ganttWindowStart)}  a  ${fmt(ganttWindowEnd)}`, PW - M - 6, M + 10, { align: "right" });
          pdf.setFont("helvetica", "normal"); pdf.setFontSize(7); pdf.setTextColor(203, 213, 225);
          pdf.text(`Janela: ${selectedWindow.label}`, PW - M - 6, M + 15, { align: "right" });
          pdf.text(`Gerado em ${fmt(new Date())}`, PW - M - 6, M + 20, { align: "right" });

          // Resumo
          const overdueN = visibleGanttItems.filter((i) => i.end < today && (i.progress || 0) < 100).length;
          const stats = [
              ["ITENS", String(visibleGanttItems.length), ink],
              ["CONCLUÍDOS", String(concludedItems), [22, 163, 74]],
              ["EM ATRASO", String(overdueN), overdueN ? [220, 38, 38] : ink],
              ["PONTO DE SITUAÇÃO", `${visibleCompletion}%`, ink],
          ];
          const sy = M + 30, sw = (PW - 2 * M - 9) / 4;
          stats.forEach(([lab, val, col], i) => {
              const sx = M + i * (sw + 3);
              pdf.setFillColor(248, 250, 252); pdf.setDrawColor(...line); pdf.setLineWidth(0.2);
              pdf.roundedRect(sx, sy, sw, 13, 2, 2, "FD");
              pdf.setFont("helvetica", "bold"); pdf.setFontSize(6.5); pdf.setTextColor(...faint);
              pdf.text(lab, sx + 4, sy + 5);
              pdf.setFontSize(12); pdf.setTextColor(...col);
              pdf.text(val, sx + 4, sy + 10.8);
              if (i === 3) {
                  const bx = sx + 26, bw = sw - 30;
                  pdf.setFillColor(...line); pdf.roundedRect(bx, sy + 8, bw, 2.4, 1.2, 1.2, "F");
                  if (visibleCompletion > 0) { pdf.setFillColor(22, 163, 74); pdf.roundedRect(bx, sy + 8, Math.max(2.4, bw * visibleCompletion / 100), 2.4, 1.2, 1.2, "F"); }
              }
          });

          // ---------- Tabela / gráfico ----------
          let y = drawChartHeader(sy + 17);
          let pageTop = y;
          const bottomLimit = PH - 14;
          const rows = visibleGanttItems;

          if (rows.length === 0) {
              pdf.setFont("helvetica", "normal"); pdf.setFontSize(9); pdf.setTextColor(...faint);
              pdf.text("Sem atividades/tarefas com datas dentro desta janela.", PW / 2, y + 12, { align: "center" });
          }

          // desenha primeiro a grelha por página, depois as linhas
          const pagesRows = [];
          let current = [];
          let yy = y;
          rows.forEach((row) => {
              const h = row.rowType === "group" ? 9 : 7;
              if (yy + h > bottomLimit) { pagesRows.push({ top: pageTop, rows: current }); current = []; yy = M + HEAD_H; pageTop = yy; }
              current.push({ row, y: yy, h });
              yy += h;
          });
          if (current.length) pagesRows.push({ top: pageTop, rows: current });

          pagesRows.forEach((pg, pi) => {
              if (pi > 0) { pdf.addPage(); drawChartHeader(M); }
              const last = pg.rows[pg.rows.length - 1];
              const y1 = last ? last.y + last.h : pg.top;
              drawGridColumn(pg.top, y1);

              pg.rows.forEach(({ row, y: ry, h }) => {
                  const isGroup = row.rowType === "group";
                  const atividade = atividades.find((a) => String(a.id) === row.activityId);
                  const base = hslToRgb(hashToHue(atividade?.titulo || row.activityId), 70, 45);
                  const light = mixWhite(base, 0.82);
                  const late = row.end < today && (row.progress || 0) < 100;

                  if (isGroup) { pdf.setFillColor(...mixWhite(base, 0.94)); pdf.rect(M, ry, LABEL_W, h, "F"); }
                  pdf.setDrawColor(241, 245, 249); pdf.setLineWidth(0.15);
                  pdf.line(M, ry + h, PW - M, ry + h);
                  pdf.setFillColor(...base); pdf.rect(M, ry, 0.9, h, "F");

                  // etiqueta
                  if (isGroup) {
                      pdf.setFont("helvetica", "bold"); pdf.setFontSize(8); pdf.setTextColor(...ink);
                      pdf.text(fit(row.label, LABEL_W - 6), M + 3, ry + 5.8);
                  } else {
                      pdf.setFillColor(...base); pdf.circle(M + 5.2, ry + h / 2, 0.8, "F");
                      pdf.setFont("helvetica", "normal"); pdf.setFontSize(7.2);
                      pdf.setTextColor(...(row.estado === "concluido" ? faint : [51, 65, 85]));
                      pdf.text(fit(row.label, LABEL_W - 10), M + 7.5, ry + 4.6);
                  }

                  // barra
                  const x0 = xOf(row.start);
                  const x1 = Math.max(x0 + 1.2, CX + ((clamp(dayDiff(ganttWindowStart, row.end) + 1, 0, ganttDurationDays)) / ganttDurationDays) * CW);
                  const bh = isGroup ? 4.6 : 3.4;
                  const by = ry + (h - bh) / 2;
                  const r = bh / 2;
                  pdf.setFillColor(...(isGroup ? mixWhite(base, 0.65) : light));
                  pdf.roundedRect(x0, by, x1 - x0, bh, r, r, "F");
                  const prog = clamp(row.progress || 0, 0, 100);
                  if (prog > 0) {
                      pdf.setFillColor(...(isGroup ? base : mixWhite(base, 0.25)));
                      pdf.roundedRect(x0, by, Math.max(bh, (x1 - x0) * prog / 100), bh, r, r, "F");
                  }
                  if (late) { pdf.setDrawColor(220, 38, 38); pdf.setLineWidth(0.35); pdf.roundedRect(x0, by, x1 - x0, bh, r, r, "S"); }

                  pdf.setFont("helvetica", "bold"); pdf.setFontSize(6);
                  const pct = `${prog}%${late ? "  atraso" : ""}`;
                  const pw = pdf.getTextWidth(pct);
                  if (x1 + 1.5 + pw < CX + CW) { pdf.setTextColor(...(late ? [220, 38, 38] : muted)); pdf.text(pct, x1 + 1.5, by + bh - 0.6); }
                  else if (x0 - 1.5 - pw > CX) { pdf.setTextColor(...(late ? [220, 38, 38] : muted)); pdf.text(pct, x0 - 1.5, by + bh - 0.6, { align: "right" }); }
              });

              drawToday(pg.top - HEAD_H + 6, y1);
          });

          // Legenda + rodapé em todas as páginas
          const totalPages = pdf.getNumberOfPages();
          for (let p = 1; p <= totalPages; p += 1) {
              pdf.setPage(p);
              const fy = PH - 7;
              pdf.setFont("helvetica", "normal"); pdf.setFontSize(6.5); pdf.setTextColor(...faint);
              let lx = M;
              pdf.setFillColor(100, 116, 139); pdf.roundedRect(lx, fy - 2.2, 7, 2.6, 1.3, 1.3, "F"); lx += 8.5;
              pdf.text("Progresso", lx, fy); lx += 15;
              pdf.setFillColor(226, 232, 240); pdf.roundedRect(lx, fy - 2.2, 7, 2.6, 1.3, 1.3, "F"); lx += 8.5;
              pdf.text("Por fazer", lx, fy); lx += 15;
              pdf.setDrawColor(220, 38, 38); pdf.setLineWidth(0.35); pdf.roundedRect(lx, fy - 2.2, 7, 2.6, 1.3, 1.3, "S"); lx += 8.5;
              pdf.text("Em atraso", lx, fy); lx += 16;
              pdf.setDrawColor(239, 68, 68); pdf.setLineDashPattern([1.2, 1], 0); pdf.line(lx + 1, fy - 2.6, lx + 1, fy + 0.4); pdf.setLineDashPattern([], 0); lx += 3;
              pdf.text("Hoje", lx, fy);
              pdf.text(fit(`${projeto?.titulo || "Projeto"}  ·  Página ${p} de ${totalPages}`, 120), PW - M, fy, { align: "right" });
          }

          const safeName = String(projeto?.titulo || "Projeto").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
          pdf.save(`Gantt_${safeName || "Projeto"}.pdf`);
          showToast("Gantt exportado com sucesso!", "success");
      } catch (error) {
          console.error("Erro ao exportar o Gantt:", error);
          showToast("Erro ao exportar o Gantt.", "error");
      } finally {
          setIsExportingGantt(false);
      }
  };

  // Visto com animação de "concluído" (atividades, tarefas e passos)
  async function celebrateThen(key, completing, action) {
      if (pdCelebrating.has(key)) return;
      const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      if (completing && !reduce) {
          setPdCelebrating((prev) => new Set(prev).add(key));
          await new Promise((r) => setTimeout(r, 650));
      }
      try {
          await action();
      } finally {
          if (completing) setPdCelebrating((prev) => { const next = new Set(prev); next.delete(key); return next; });
      }
  }

  const renderPdCheck = ({ key, done, shape = 'round', disabled = false, label, onToggle }) => {
      const burst = pdCelebrating.has(key);
      return (
          <button
              type="button"
              className={`pd-check is-${shape} ${done || burst ? 'is-on' : ''} ${burst ? 'is-burst' : ''}`}
              onClick={(e) => { e.stopPropagation(); if (!disabled) celebrateThen(key, !done, onToggle); }}
              disabled={disabled}
              title={disabled ? 'Bloqueada por dependência' : label}
              aria-label={label}
              aria-pressed={done}
          >
              <Icons.Check size={shape === 'mini' ? 9 : shape === 'square' ? 14 : 12} />
              {burst && (
                  <span className="pd-burst" aria-hidden="true">
                      {Array.from({ length: 8 }, (_, i) => <i key={i} style={{ '--a': `${i * 45}deg` }} />)}
                  </span>
              )}
          </button>
      );
  };

  return (
        <div className="page-container pd-page">

            {notification && (
                <div className={`toast-container ${notification.type}`} style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
                    <div>{notification.type === 'success' ? '✅' : '⚠️'} {notification.message}</div>
                </div>
            )}
      
      {/* =========================================
          CABEÇALHO DO PROJETO
      ========================================= */}
      {(() => {
          const ESTADO_LABEL = { pendente: 'Pendente', em_curso: 'Em curso', em_analise: 'Em análise', concluido: 'Concluído', encerrado: 'Encerrado', cancelado: 'Cancelado' };
          const allTasks = atividades.flatMap((a) => a.tarefas || []);
          const doneTasks = allTasks.filter((t) => t.estado === 'concluido').length;
          const doneAtivs = atividades.filter((a) => a.estado === 'concluido').length;
          const progress = allTasks.length
              ? Math.round((doneTasks / allTasks.length) * 100)
              : (atividades.length ? Math.round((doneAtivs / atividades.length) * 100) : 0);
          const R = 44;
          const C = 2 * Math.PI * R;
          const isClosed = ['concluido', 'encerrado', 'cancelado'].includes(projeto.estado);

          let deadlineSub = 'Sem prazo definido';
          let deadlineTone = '';
          if (projeto?.data_fim) {
              const d = new Date(projeto.data_fim); d.setHours(0, 0, 0, 0);
              const t = new Date(); t.setHours(0, 0, 0, 0);
              const diff = Math.round((d - t) / 86400000);
              if (isClosed) deadlineSub = 'Projeto fechado';
              else if (diff < 0) { deadlineSub = `${Math.abs(diff)} dia${Math.abs(diff) === 1 ? '' : 's'} em atraso`; deadlineTone = 'is-late'; }
              else if (diff === 0) { deadlineSub = 'Termina hoje'; deadlineTone = 'is-soon'; }
              else { deadlineSub = `Faltam ${diff} dia${diff === 1 ? '' : 's'}`; if (diff <= 14) deadlineTone = 'is-soon'; }
          }

          return (
              <header className="pd-hero" style={{ '--sd': statusTheme.dot }}>
                  <div className="pd-hero-bg" aria-hidden="true"><span className="pd-orb pd-orb-a" /><span className="pd-orb pd-orb-b" /></div>

                  <div className="pd-hero-top">
                      <button type="button" onClick={() => navigate('/dashboard/projetos')} className="pd-back">
                          <Icons.ArrowLeft /> Portfólio
                      </button>
                      <button type="button" onClick={() => gerarRelatorioProjeto(projeto, atividades, logs, staff, clientes)} className="pd-glass-btn">
                          <Icons.Download size={15} /> Gerar PDF
                      </button>
                  </div>

                  <div className="pd-hero-body">
                      <div className="pd-hero-text">
                          <div className="pd-hero-tags">
                              <span className="pd-status"><i />{ESTADO_LABEL[projeto?.estado] || (projeto?.estado || '').replace('_', ' ')}</span>
                              {projeto?.codigo_projeto && <span className="pd-tag is-code">{projeto.codigo_projeto}</span>}
                              {projeto?.numero_projeto && <span className="pd-tag is-code">Nº {projeto.numero_projeto}</span>}
                              <span className="pd-tag"><Icons.Tag size={12} /> {projeto?.tipos_projeto?.nome || 'Customizado'}</span>
                          </div>
                          <h1>{projeto?.titulo}</h1>
                          <div className="pd-clients">
                              {clientEntities.map((ent, idx) => (
                                  <button
                                      key={idx}
                                      type="button"
                                      onClick={() => ent.id ? navigate('/dashboard/clientes', { state: { openClienteId: ent.id } }) : null}
                                      className={`pd-client ${ent.id ? 'is-link' : ''} ${ent.isParceiro ? 'is-partner' : ''}`}
                                      title={ent.id ? `Abrir ${ent.nome}` : ent.nome}
                                  >
                                      {ent.isParceiro ? <Icons.Handshake size={13} /> : <Icons.Building size={13} />}
                                      {ent.sigla}
                                  </button>
                              ))}
                              {organismoDisplay && <span className="pd-client is-org"><Icons.Building size={12} /> Organismo: {organismoDisplay}</span>}
                              {organismoPessoaDisplay && <span className="pd-client is-person"><Icons.User size={12} /> {organismoPessoaDisplay}</span>}
                          </div>
                      </div>

                      <div className="pd-ring" title={`${doneTasks} de ${allTasks.length} tarefas concluídas`}>
                          <svg viewBox="0 0 110 110" aria-hidden="true">
                              <circle cx="55" cy="55" r={R} className="pd-ring-track" />
                              <circle cx="55" cy="55" r={R} className="pd-ring-arc" strokeDasharray={C} strokeDashoffset={C * (1 - progress / 100)} transform="rotate(-90 55 55)" />
                          </svg>
                          <div className="pd-ring-center">
                              <strong>{progress}<small>%</small></strong>
                              <span>{allTasks.length ? `${doneTasks}/${allTasks.length} tarefas` : `${doneAtivs}/${atividades.length} blocos`}</span>
                          </div>
                      </div>
                  </div>

                  <div className="pd-hero-meta">
                      <div className="pd-meta">
                          <span className="pd-meta-icon"><Icons.User size={16} /></span>
                          <div><small>Responsável</small><strong>{projeto?.profiles?.nome || 'Não atribuído'}</strong></div>
                      </div>
                      <div className={`pd-meta ${deadlineTone}`}>
                          <span className="pd-meta-icon"><Icons.Target size={16} /></span>
                          <div><small>Deadline final</small><strong>{projeto?.data_fim ? new Date(projeto.data_fim).toLocaleDateString('pt-PT') : 'Sem prazo'}</strong><em>{deadlineSub}</em></div>
                      </div>
                      <div className="pd-meta">
                          <span className="pd-meta-icon"><Icons.Clock size={16} /></span>
                          <div><small>Tempo registado</small><strong>{formatTime(getProjectTotalTime())}</strong></div>
                      </div>
                      <div className="pd-meta">
                          <span className="pd-meta-icon"><Icons.Layers size={16} /></span>
                          <div><small>Blocos de atividades</small><strong>{atividades.length}</strong><em>{doneAtivs} concluído{doneAtivs === 1 ? '' : 's'}</em></div>
                      </div>
                  </div>
              </header>
          );
      })()}

      {/* NAVEGAÇÃO INTERNA */}
      <nav className="pd-tabs" role="tablist" aria-label="Secções do projeto">
          {[
              ['atividades', 'Atividades', <Icons.ClipboardList size={16} />, atividades.length],
              ['gantt', 'Gantt', <Icons.Calendar size={16} />],
              ['relatorio', 'Relatório de tempos', <Icons.Clock size={16} />],
              ['execucao', 'Execução financeira', <Icons.Dollar size={16} />],
              ['geral', 'Configurações e dados', <Icons.Settings size={16} />],
          ].map(([key, label, icon, count]) => (
              <button key={key} type="button" role="tab" aria-selected={activeTab === key} className={activeTab === key ? 'is-on' : ''} onClick={() => setActiveTab(key)}>
                  {icon} <span>{label}</span>
                  {count != null && <em>{count}</em>}
              </button>
          ))}
      </nav>

      <div style={{minHeight: '50vh'}}>

        {activeTab === 'execucao' && (() => {
            const liderId = String(projeto.cliente_id || "");
            const entidadeAtivaId = entidadesFin.includes(String(execEntidadeId)) ? String(execEntidadeId) : entidadesFin[0];
            const getEntNome = (eid) => getClientDisplayName(clientes.find((c) => String(c.id) === String(eid))) || "Entidade";
            const orc = projetoEntidades.find((r) => String(r.entidade_id) === entidadeAtivaId);
            const isSingle = entidadesFin.length === 1;
            const orcInv = Number(orc?.investimento) || 0;
            const orcInc = Number(orc?.incentivo) || 0;
            const investimentoEnt = isSingle && orcInv === 0 ? Number(projeto.investimento) || 0 : orcInv;
            const incentivoEnt = isSingle && orcInc === 0 ? Number(projeto.incentivo) || 0 : orcInc;
            const pedidosEnt = pedidosReembolso.filter((p) => String(p.entidade_id || liderId) === entidadeAtivaId);
            const totalInvestimento = pedidosEnt.reduce((s, i) => s + (Number(i.valor_investimento) || 0), 0);
            const totalIncentivo = pedidosEnt.reduce((s, i) => s + (Number(i.valor_incentivo) || 0), 0);
            const totalPago = pedidosEnt.reduce((s, i) => s + (Number(i.valor_pago) || 0), 0);
            const pmpValues = pedidosEnt.map(getPedidoPmp).filter((v) => v !== null);
            const mediaPmp = pmpValues.length ? pmpValues.reduce((s, v) => s + v, 0) / pmpValues.length : null;
            const investimentoProjeto = investimentoEnt;   // usado no resto do código (TXE)
            const taxaExecucao = investimentoEnt > 0 ? (totalInvestimento / investimentoEnt) * 100 : null;
            const taxaFinanciamento = investimentoEnt > 0 ? (incentivoEnt / investimentoEnt) * 100 : null;
            const pctRecebido = incentivoEnt > 0 ? (totalPago / incentivoEnt) * 100 : null;
            const pct = (a, b) => (b > 0 ? Math.min(100, Math.max(0, (a / b) * 100)) : 0);
            const R = 54;
            const C = 2 * Math.PI * R;
            const ring = Math.min(100, Math.max(0, taxaExecucao || 0));
            const today = new Date(); today.setHours(0, 0, 0, 0);
            const initials = (txt) => String(txt || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
            const fmtDate = (iso) => (iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('pt-PT') : '—');

            const pedidoStatus = (pedido) => {
                const inc = Number(pedido.valor_incentivo) || 0;
                const pago = Number(pedido.valor_pago) || 0;
                if (pago > 0 && pago >= inc - 0.005) return { key: 'paid', label: 'Pago' };
                if (pago > 0) return { key: 'partial', label: 'Pago parcialmente' };
                if (pedido.data_pedido) {
                    const dias = Math.max(0, Math.round((today - new Date(`${pedido.data_pedido}T00:00:00`)) / 86400000));
                    return { key: 'waiting', label: dias === 0 ? 'Submetido hoje' : `A aguardar há ${dias} dia${dias === 1 ? '' : 's'}` };
                }
                return { key: 'waiting', label: 'A aguardar pagamento' };
            };

            const pedidoInput = (field, label, type = "number", extra = {}) => (
                <div className="pd-field">
                    <label>{label}</label>
                    <div className={type === "number" ? "pd-input-eur" : undefined}>
                        <input
                            className="pd-input"
                            type={type}
                            value={pedidoReembolsoForm[field] ?? ""}
                            onChange={(event) => setPedidoReembolsoForm((previous) => ({ ...previous, [field]: event.target.value }))}
                            step={type === "number" ? "0.01" : undefined}
                            min={type === "number" ? "0" : undefined}
                            {...extra}
                        />
                        {type === "number" && <span>€</span>}
                    </div>
                </div>
            );

            return (
                <div className="bz-tab-panel pd-fin">
                    {/* ENTIDADES */}
                    {entidadesFin.length > 1 && (
                        <div className="pd-fin-ents" role="tablist" aria-label="Entidade">
                            {entidadesFin.map((eid) => {
                                const ativa = eid === entidadeAtivaId;
                                return (
                                    <button key={eid} type="button" role="tab" aria-selected={ativa} className={ativa ? 'is-on' : ''}
                                        onClick={() => { setExecEntidadeId(eid); setPedidoReembolsoForm(null); setOrcamentoEdit(null); }}>
                                        <span className="pd-fin-ent-av">{initials(getEntNome(eid))}</span>
                                        {getEntNome(eid)}
                                        {eid === liderId && <em>líder</em>}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* RESUMO */}
                    <section className="pd-fin-overview">
                        <div className="pd-fin-ring" title="Taxa de execução: investimento pedido face ao investimento elegível">
                            <svg viewBox="0 0 130 130" aria-hidden="true">
                                <circle cx="65" cy="65" r={R} className="pd-fin-ring-track" />
                                <circle cx="65" cy="65" r={R} className="pd-fin-ring-arc" strokeDasharray={C} strokeDashoffset={C * (1 - ring / 100)} transform="rotate(-90 65 65)" />
                            </svg>
                            <div className="pd-fin-ring-center">
                                <strong>{taxaExecucao === null ? '—' : `${formatNumber(taxaExecucao)}%`}</strong>
                                <span>Taxa de execução</span>
                            </div>
                        </div>

                        <div className="pd-fin-budget">
                            <div className="pd-fin-budget-head">
                                <h3>Resumo Financeiro <em>— {getEntNome(entidadeAtivaId)}</em></h3>
                                {!orcamentoEdit && (
                                    <button type="button" className="pd-icon-btn" title="Editar valores" aria-label="Editar valores"
                                        onClick={() => setOrcamentoEdit({ investimento: investimentoEnt, incentivo: incentivoEnt })}>
                                        <Icons.Edit size={15} />
                                    </button>
                                )}
                            </div>

                            {orcamentoEdit ? (
                                <div className="pd-fin-budget-edit">
                                    <div className="pd-field">
                                        <label>Investimento Elegível (€)</label>
                                        <div className="pd-input-eur">
                                            <input className="pd-input" type="number" step="0.01" min="0" value={orcamentoEdit.investimento} onChange={(e) => setOrcamentoEdit((p) => ({ ...p, investimento: e.target.value }))} />
                                            <span>€</span>
                                        </div>
                                    </div>
                                    <div className="pd-field">
                                        <label>Incentivo Atribuído (€)</label>
                                        <div className="pd-input-eur">
                                            <input className="pd-input" type="number" step="0.01" min="0" value={orcamentoEdit.incentivo} onChange={(e) => setOrcamentoEdit((p) => ({ ...p, incentivo: e.target.value }))} />
                                            <span>€</span>
                                        </div>
                                    </div>
                                    <div className="pd-fin-budget-actions">
                                        <button type="button" className="pd-btn" onClick={() => setOrcamentoEdit(null)}>Cancelar</button>
                                        <button type="button" className="pd-btn is-primary" onClick={() => saveOrcamentoEntidade(entidadeAtivaId, entidadesFin)}><Icons.Save size={14} /> Guardar</button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="pd-fin-budget-values">
                                        <div><small>Investimento Elegível</small><strong>{formatNumber(investimentoEnt)} €</strong></div>
                                        <div><small>Incentivo Atribuído</small><strong>{formatNumber(incentivoEnt)} €</strong></div>
                                        <div><small>Taxa de Financiamento</small><strong className="is-accent">{taxaFinanciamento === null ? '—' : `${taxaFinanciamento.toFixed(2)}%`}</strong></div>
                                    </div>
                                    <div className="pd-fin-bars">
                                        <div className="pd-fin-bar">
                                            <div className="pd-fin-bar-label"><span>Investimento pedido</span><b>{formatNumber(totalInvestimento)} € <em>de {formatNumber(investimentoEnt)} €</em></b></div>
                                            <div className="pd-fin-bar-track"><i className="is-inv" style={{ width: `${pct(totalInvestimento, investimentoEnt)}%` }} /></div>
                                        </div>
                                        <div className="pd-fin-bar">
                                            <div className="pd-fin-bar-label"><span>Incentivo pedido / Valor pago</span><b>{formatNumber(totalPago)} € <em>pagos de {formatNumber(totalIncentivo)} € pedidos · {formatNumber(incentivoEnt)} € atribuídos</em></b></div>
                                            <div className="pd-fin-bar-track">
                                                <i className="is-req" style={{ width: `${pct(totalIncentivo, incentivoEnt)}%` }} />
                                                <i className="is-paid" style={{ width: `${pct(totalPago, incentivoEnt)}%` }} />
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="pd-fin-kpis">
                            <div className="pd-fin-kpi is-paid"><small>Valor pago</small><strong>{formatNumber(totalPago)} €</strong><em>{pctRecebido === null ? '—' : `${formatNumber(pctRecebido)}% do incentivo atribuído`}</em></div>
                            <div className="pd-fin-kpi"><small>Incentivo pedido</small><strong>{formatNumber(totalIncentivo)} €</strong><em>{pedidosEnt.length} pedido{pedidosEnt.length === 1 ? '' : 's'}</em></div>
                            <div className="pd-fin-kpi"><small>PMP (média)</small><strong>{mediaPmp === null ? '—' : `${Math.round(mediaPmp)} dias`}</strong><em>{pmpValues.length ? `com base em ${pmpValues.length} pagamento${pmpValues.length === 1 ? '' : 's'}` : 'sem pagamentos ainda'}</em></div>
                        </div>
                    </section>

                    {/* PEDIDOS */}
                    <section className="pd-fin-list">
                        <header className="pd-fin-list-head">
                            <div>
                                <h3>Execução Financeira</h3>
                                <p>Pedidos de reembolso e leitura rápida da execução do projeto.</p>
                            </div>
                            {!pedidoReembolsoForm && (
                                <button type="button" onClick={() => setPedidoReembolsoForm({ ...newPedidoReembolso(), entidade_id: entidadeAtivaId })} className="pd-btn is-primary">
                                    <Icons.Plus size={15} /> Novo pedido
                                </button>
                            )}
                        </header>

                        {pedidoReembolsoForm && (
                            <form onSubmit={savePedidoReembolso} className="pd-fin-form">
                                <div className="pd-fin-form-head">
                                    <h4>{pedidoReembolsoForm.id ? 'Editar pedido' : 'Registar pedido'}</h4>
                                    <button type="button" className="pd-icon-btn" onClick={() => setPedidoReembolsoForm(null)} aria-label="Fechar"><Icons.Close size={16} /></button>
                                </div>
                                <div className="pd-fin-form-grid">
                                    <div className="pd-fin-form-group">
                                        <span className="pd-fin-form-tag">Pedido</span>
                                        {pedidoInput("pedido", "Pedido", "text", { placeholder: 'Ex: 1º pedido de pagamento' })}
                                        {pedidoInput("data_pedido", "Data Pedido", "date")}
                                        {pedidoInput("valor_investimento", "Valor Investimento")}
                                        {pedidoInput("valor_incentivo", "Valor Incentivo")}
                                    </div>
                                    <div className="pd-fin-form-group is-payment">
                                        <span className="pd-fin-form-tag">Pagamento</span>
                                        {pedidoInput("valor_pago", "Valor Pago")}
                                        {pedidoInput("data_pagamento", "Data Pagamento", "date")}
                                        <div className="pd-field">
                                            <label>Notas</label>
                                            <textarea
                                                className="pd-input is-area"
                                                rows="2"
                                                value={pedidoReembolsoForm.notas ?? ""}
                                                onChange={(event) => setPedidoReembolsoForm((previous) => ({ ...previous, notas: event.target.value }))}
                                                placeholder="Observações sobre este pedido"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="pd-fin-form-actions">
                                    <button type="button" className="pd-btn" onClick={() => setPedidoReembolsoForm(null)}>Cancelar</button>
                                    <button type="submit" disabled={pedidoReembolsoSaving} className="pd-btn is-primary"><Icons.Save size={14} /> {pedidoReembolsoSaving ? 'A guardar...' : 'Guardar'}</button>
                                </div>
                            </form>
                        )}

                        {pedidosEnt.length === 0 ? (
                            !pedidoReembolsoForm && (
                                <div className="pd-empty is-compact">
                                    <span className="pd-empty-icon"><Icons.Dollar size={26} /></span>
                                    <h3>Ainda não existem pedidos de reembolso registados.</h3>
                                    <p>Regista o primeiro pedido para acompanhar a execução e os pagamentos.</p>
                                </div>
                            )
                        ) : (
                            <div className="pd-ftable-wrap">
                                <table className="pd-ftable">
                                    <thead>
                                        <tr>
                                            <th>Pedido</th>
                                            <th>Estado</th>
                                            <th className="is-num">Valor Investimento</th>
                                            <th className="is-num">TXE</th>
                                            <th className="is-num">Valor Incentivo</th>
                                            <th className="is-num">Valor Pago</th>
                                            <th className="is-num">PMP</th>
                                            <th></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pedidosEnt.map((pedido) => {
                                            const investimento = Number(pedido.valor_investimento) || 0;
                                            const txe = investimentoProjeto > 0 ? (investimento / investimentoProjeto) * 100 : null;
                                            const pmp = getPedidoPmp(pedido);
                                            const criadoEm = pedido.created_at ? new Date(pedido.created_at).toLocaleDateString('pt-PT') : '—';
                                            const criadorNome = staff.find(s => String(s.id) === String(pedido.user_id))?.nome || 'Utilizador';
                                            const st = pedidoStatus(pedido);

                                            return (
                                                <tr key={pedido.id}>
                                                    <td>
                                                        <div className="pd-ftable-name">
                                                            <strong>{pedido.pedido || 'Pedido'}</strong>
                                                            <span>
                                                                Data Pedido: {fmtDate(pedido.data_pedido)}
                                                                {pedido.data_pagamento && <> · Data Pagamento: {fmtDate(pedido.data_pagamento)}</>}
                                                                <span
                                                                    className="pd-ftable-info"
                                                                    onMouseEnter={(e) => {
                                                                        const rect = e.currentTarget.getBoundingClientRect();
                                                                        setInfoTooltip({ x: rect.left + rect.width / 2, y: rect.bottom + 8, criadorNome, criadoEm });
                                                                    }}
                                                                    onMouseLeave={() => setInfoTooltip(null)}
                                                                >
                                                                    <Icons.Info size={13} color="currentColor" />
                                                                </span>
                                                            </span>
                                                            {pedido.notas && (
                                                                <details className="pd-ftable-notes">
                                                                    <summary>Ver notas</summary>
                                                                    <p>{pedido.notas}</p>
                                                                </details>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td><span className={`pd-fstatus is-${st.key}`}><i />{st.label}</span></td>
                                                    <td className="is-num">{formatNumber(investimento)} €</td>
                                                    <td className="is-num is-txe">{txe === null ? '—' : `${formatNumber(txe)}%`}</td>
                                                    <td className="is-num">{formatNumber(pedido.valor_incentivo)} €</td>
                                                    <td className="is-num is-paid">{formatNumber(pedido.valor_pago)} €</td>
                                                    <td className="is-num">{pmp === null ? '—' : `${pmp} dias`}</td>
                                                    <td className="is-actions">
                                                        <button type="button" className="pd-icon-btn is-sm" onClick={() => setPedidoReembolsoForm({ ...pedido, entidade_id: pedido.entidade_id || entidadeAtivaId })} title="Editar pedido" aria-label="Editar pedido"><Icons.Edit size={14} /></button>
                                                        <button type="button" className="pd-icon-btn is-sm is-danger" onClick={() => deletePedidoReembolso(pedido.id)} title="Apagar pedido" aria-label="Apagar pedido"><Icons.Trash size={14} /></button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                    <tfoot>
                                        <tr>
                                            <td>Total / média</td>
                                            <td></td>
                                            <td className="is-num">{formatNumber(totalInvestimento)} €</td>
                                            <td className="is-num is-txe">{taxaExecucao === null ? '—' : `${formatNumber(taxaExecucao)}%`}</td>
                                            <td className="is-num">{formatNumber(totalIncentivo)} €</td>
                                            <td className="is-num is-paid">{formatNumber(totalPago)} €</td>
                                            <td className="is-num">{mediaPmp === null ? '—' : `${Math.round(mediaPmp)} dias`}</td>
                                            <td></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        )}
                    </section>
                </div>
            );
        })()}
        
        {/* =========================================
            ABA 1: BOARD DE ATIVIDADES (C/ DRAG & DROP)
        ========================================= */}
        {activeTab === 'atividades' && (
            <div className="bz-tab-panel pd-board">
                {atividades.length === 0 && (
                    <div className="pd-empty">
                        <span className="pd-empty-icon"><Icons.Layers size={28} /></span>
                        <h3>Ainda não há atividades</h3>
                        <p>Cria o primeiro bloco de atividades em baixo para começar a organizar o projeto.</p>
                    </div>
                )}

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
                    const tasksDone = (ativ.tarefas || []).filter(t => t.estado === 'concluido').length;
                    const isCollapsed = collapsedAtivs[ativ.id];
                    const ativCelebrating = pdCelebrating.has(`a-${ativ.id}`);

                    return (
                    <section
                        id={`atividade-card-${ativ.id}`}
                        key={ativ.id}
                        draggable={!isCollapsed}
                        onDragStart={(e) => handleDragStartAtiv(e, aIndex)}
                        onDragEnter={(e) => handleDragEnterAtiv(e, aIndex)}
                        onDragEnd={handleDropAtiv}
                        onDragOver={(e) => e.preventDefault()}
                        className={`pd-ativ ${isAtivDone ? 'is-done' : ''} ${blockedActivity ? 'is-blocked' : ''} ${isAtivTimerActive ? 'is-running' : ''} ${isHighlightedTask('atividade', ativ.id) ? 'is-focus' : ''} ${ativCelebrating ? 'is-celebrating' : ''}`}
                        style={{ '--i': Math.min(aIndex, 10) }}
                    >
                        {/* CABEÇALHO DA ATIVIDADE */}
                        <header className="pd-ativ-head">
                            <span className="pd-grip" title="Arraste para reordenar"><Icons.GripVertical /></span>
                            {renderPdCheck({
                                key: `a-${ativ.id}`,
                                done: isAtivDone,
                                shape: 'square',
                                disabled: blockedActivity,
                                label: isAtivDone ? 'Reabrir atividade' : 'Concluir atividade',
                                onToggle: () => toggleAtividadeStatus(ativ.id, ativ.estado),
                            })}

                            <div className="pd-ativ-main">
                                <div className="pd-ativ-title">
                                    <h3><span className="pd-strike">{ativ.titulo}</span></h3>
                                    {renderDeadline(ativ.data_fim, isAtivDone, true)}
                                    <button type="button" onClick={() => setAtividadeModal({show: true, data: { ...ativ, colaboradores_extra: Array.isArray(ativ.colaboradores_extra) ? ativ.colaboradores_extra : [] }})} className="pd-icon-btn" title="Editar atividade" aria-label="Editar atividade">
                                        <Icons.Edit size={15} />
                                    </button>
                                </div>
                                <div className="pd-chips">
                                    <span className="pd-chip is-person" title="Responsável">
                                        <span className="pd-avatar">{atividadeResponsavelNome ? atividadeResponsavelNome.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase() : '–'}</span>
                                        {atividadeResponsavelNome || 'Sem responsável / equipa externa'}
                                    </span>
                                    {atividadeParticipantes.length > 0 && (
                                        <span className="pd-chip" title={atividadeParticipantes.join(', ')}>
                                            <Icons.Users size={11} /> {atividadeParticipantes.length === 1 ? atividadeParticipantes[0] : `${atividadeParticipantes.length} participantes`}
                                        </span>
                                    )}
                                    {atividadeDependencyReason && (
                                        <span className="pd-chip is-lock" title={atividadeDependencyReason}>
                                            <Icons.Lock size={11} /> Bloqueada por dependência
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="pd-ativ-side">
                                {!hasNoTasks && (
                                    <span className="pd-mini-progress" title={`${tasksDone} de ${ativ.tarefas.length} tarefas concluídas`}>
                                        <span className="pd-mini-bar"><i style={{ width: `${progresso}%` }} /></span>
                                        <b>{tasksDone}/{ativ.tarefas.length}</b>
                                    </span>
                                )}
                                <span className="pd-chip is-time"><Icons.Clock size={12} /> {formatTime(ativTime)}</span>

                                {hasNoTasks && !isAtivDone && (
                                    <button
                                        type="button"
                                        onClick={() => !blockedActivity && handleToggleTimer(ativ.id, 'activity')}
                                        className={`pd-timer ${isAtivTimerActive ? 'is-on' : ''}`}
                                        disabled={blockedActivity}
                                        title={isAtivTimerActive ? 'Parar cronómetro' : 'Iniciar cronómetro'}
                                        aria-label={isAtivTimerActive ? 'Parar cronómetro' : 'Iniciar cronómetro'}
                                    >
                                        {isAtivTimerActive ? <Icons.Stop size={11} /> : <Icons.Play size={12} />}
                                    </button>
                                )}

                                {blockedActivity && (
                                    <button
                                        type="button"
                                        onClick={() => unlockActivityForNow(ativ.id)}
                                        className="pd-icon-btn is-unlock"
                                        title={atividadeDependencyReason ? `${atividadeDependencyReason}. Clique para desbloquear manualmente.` : 'Desbloquear atividade manualmente'}
                                    >
                                        <Icons.Unlock size={14} />
                                    </button>
                                )}

                                <button type="button" onClick={() => handleReuseActivityBlock(ativ.id)} className="pd-icon-btn" title="Repetir este bloco de atividade" aria-label="Repetir bloco">
                                    <Icons.Layers size={15} />
                                </button>
                                <button type="button" onClick={() => handleDeleteItem("atividades", ativ.id)} className="pd-icon-btn is-danger" title="Apagar atividade" aria-label="Apagar atividade">
                                    <Icons.Trash size={15} />
                                </button>
                                {!hasNoTasks && (
                                    <button type="button" onClick={() => toggleCollapseAtiv(ativ.id)} className={`pd-collapse ${isCollapsed ? 'is-collapsed' : ''}`} title={isCollapsed ? 'Mostrar tarefas' : 'Recolher tarefas'} aria-expanded={!isCollapsed}>
                                        <Icons.ChevronDown size={16} />
                                    </button>
                                )}
                            </div>
                            <span className="pd-ativ-bar" aria-hidden="true"><i style={{ width: `${isAtivDone ? 100 : progresso}%` }} /></span>
                        </header>

                        {/* LISTA DE TAREFAS */}
                        {!isCollapsed && (
                            <div className="pd-tasks">
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
                                    const tarCelebrating = pdCelebrating.has(`t-${tar.id}`);
                                    const openTarefa = () => {
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
                                    };

                                    return (
                                    <div
                                        id={`tarefa-card-${tar.id}`}
                                        key={tar.id}
                                        draggable
                                        onDragStart={(e) => handleDragStartTar(e, aIndex, tIndex)}
                                        onDragEnter={(e) => handleDragEnterTar(e, aIndex, tIndex)}
                                        onDragEnd={(e) => handleDropTar(e, aIndex)}
                                        onDragOver={(e) => e.preventDefault()}
                                        className={`pd-task ${isTarDone ? 'is-done' : ''} ${blockedByDependency ? 'is-blocked' : ''} ${isTimerActive ? 'is-running' : ''} ${isHighlightedTask('tarefa', tar.id) ? 'is-focus' : ''} ${tarCelebrating ? 'is-celebrating' : ''} ${isExpanded ? 'is-open' : ''}`}
                                    >
                                        <div className="pd-task-row">
                                            <span className="pd-grip is-sm" title="Arraste para reordenar"><Icons.GripVertical /></span>
                                            {renderPdCheck({
                                                key: `t-${tar.id}`,
                                                done: isTarDone,
                                                disabled: blockedByDependency,
                                                label: isTarDone ? 'Reabrir tarefa' : 'Concluir tarefa',
                                                onToggle: () => toggleTarefaStatus(tar.id, tar.estado),
                                            })}

                                            <div className="pd-task-main">
                                                <button type="button" onClick={openTarefa} className="pd-task-title" title="Clique para editar detalhes">
                                                    <span className="pd-strike">{tar.titulo}</span>
                                                </button>
                                                <div className="pd-chips">
                                                    {(tar.prioridade === 'Alta' || tar.prioridade === 'Urgente') && <span className={`pd-chip is-prio ${tar.prioridade === 'Urgente' ? 'is-urgent' : ''}`}><Icons.Flame size={10} /> {tar.prioridade}</span>}
                                                    {respName && <span className="pd-chip is-person" title={`Responsável: ${respName}`}><span className="pd-avatar is-xs">{respName.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()}</span>{respName.split(' ')[0]}</span>}
                                                    {extraColabsCount > 0 && <span className="pd-chip is-extra" title={extraColabsNames}><Icons.Users size={10} /> +{extraColabsCount}</span>}
                                                    {renderDeadline(tar.data_fim, isTarDone)}
                                                    {dependencyReason && (
                                                        <span className="pd-chip is-lock" title={dependencyReason}>
                                                            <Icons.Lock size={10} /> Dependência
                                                        </span>
                                                    )}
                                                    {hasSubs && (
                                                        <button type="button" onClick={() => toggleExpand(tar.id)} className={`pd-chip pd-chip-btn ${subsDone === tar.subtarefas.length ? 'is-complete' : ''} ${isExpanded ? 'is-open' : ''}`} title={isExpanded ? 'Esconder passos' : 'Mostrar passos'}>
                                                            <Icons.ListTree size={10} /> {subsDone}/{tar.subtarefas.length} <Icons.ChevronDown size={10} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="pd-task-side">
                                                <span className="pd-task-time"><Icons.Clock size={12} /> {formatTime(taskTime)}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => !blockedByDependency && handleToggleTimer(tar.id, 'task')}
                                                    className={`pd-timer is-sm ${isTimerActive ? 'is-on' : ''}`}
                                                    disabled={blockedByDependency}
                                                    title={isTimerActive ? 'Parar cronómetro' : 'Iniciar cronómetro'}
                                                    aria-label={isTimerActive ? 'Parar cronómetro' : 'Iniciar cronómetro'}
                                                >
                                                    {isTimerActive ? <Icons.Stop size={10} /> : <Icons.Play size={11} />}
                                                </button>
                                                {blockedByDependency && (
                                                    <button
                                                        type="button"
                                                        onClick={() => unlockTaskForNow(tar.id)}
                                                        className="pd-icon-btn is-unlock is-sm"
                                                        title={dependencyReason ? `${dependencyReason}. Clique para desbloquear manualmente.` : 'Desbloquear tarefa manualmente'}
                                                    >
                                                        <Icons.Unlock size={13} />
                                                    </button>
                                                )}
                                                {!isTarDone && (
                                                    <button type="button" onClick={() => toggleSubtarefaComposer(tar.id)} className={`pd-icon-btn is-sm ${isComposerOpen ? 'is-on' : ''}`} title={isComposerOpen ? 'Fechar novo passo' : 'Adicionar novo passo'}>
                                                        {isComposerOpen ? <Icons.Close size={14} /> : <Icons.Plus size={14} />}
                                                    </button>
                                                )}
                                                <button type="button" onClick={() => handleDeleteItem("tarefas", tar.id)} className="pd-icon-btn is-danger is-sm" title="Apagar tarefa" aria-label="Apagar tarefa"><Icons.Trash size={14} /></button>
                                            </div>
                                        </div>

                                        {/* PASSOS (SUBTAREFAS) */}
                                        {isExpanded && (
                                            <div className="pd-subs">
                                                {tar.subtarefas?.map(sub => {
                                                    const isSubCompleted = sub.estado === 'concluido';
                                                    return (
                                                        <div key={sub.id} className={`pd-sub ${isSubCompleted ? 'is-done' : ''} ${pdCelebrating.has(`s-${sub.id}`) ? 'is-celebrating' : ''}`}>
                                                            {renderPdCheck({
                                                                key: `s-${sub.id}`,
                                                                done: isSubCompleted,
                                                                shape: 'mini',
                                                                label: isSubCompleted ? 'Reabrir passo' : 'Concluir passo',
                                                                onToggle: () => toggleSubtarefaStatus(sub.id, sub.estado),
                                                            })}
                                                            <button type="button" onClick={() => setSubtarefaModal({show: true, data: sub, tarefaNome: tar.titulo})} className="pd-sub-title" title="Editar passo">
                                                                <span className="pd-strike">{sub.titulo}</span>
                                                            </button>
                                                            {renderDeadline(sub.data_fim, isSubCompleted)}
                                                            <button type="button" onClick={() => handleDeleteItem("subtarefas", sub.id)} className="pd-icon-btn is-danger is-xs" title="Apagar passo" aria-label="Apagar passo"><Icons.Close size={12} /></button>
                                                        </div>
                                                    );
                                                })}
                                                {!isTarDone && (
                                                    isComposerOpen ? (
                                                        <form onSubmit={(e) => handleAddSubtarefa(e, tar.id)} className="pd-add is-step">
                                                            <Icons.Plus size={12} />
                                                            <input autoFocus type="text" placeholder="Novo passo (Enter)" value={novaSubtarefaNome.tarId === tar.id ? novaSubtarefaNome.nome : ""} onChange={e => setNovaSubtarefaNome({ tarId: tar.id, nome: e.target.value })} />
                                                        </form>
                                                    ) : (
                                                        <button type="button" onClick={() => toggleSubtarefaComposer(tar.id)} className="pd-add-btn">
                                                            <Icons.Plus size={12} /> Novo passo
                                                        </button>
                                                    )
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    );
                                })}

                                <form onSubmit={(e) => handleAddTarefa(e, ativ.id)} className="pd-add-row">
                                    <label className="pd-add">
                                        <Icons.Plus size={14} />
                                        <input type="text" placeholder="Adicionar tarefa (Enter)..." value={novaTarefaNome.ativId === ativ.id ? novaTarefaNome.nome : ""} onChange={e => setNovaTarefaNome({ ativId: ativ.id, nome: e.target.value, responsavel_id: novaTarefaNome.ativId === ativ.id ? novaTarefaNome.responsavel_id : "" })} />
                                    </label>
                                    <select
                                        value={novaTarefaNome.ativId === ativ.id ? (novaTarefaNome.responsavel_id || "") : ""}
                                        onChange={e => setNovaTarefaNome({ ativId: ativ.id, nome: novaTarefaNome.ativId === ativ.id ? novaTarefaNome.nome : "", responsavel_id: e.target.value })}
                                        className="pd-select"
                                        title="Responsável da nova tarefa"
                                    >
                                        <option value="">Responsável (opcional)</option>
                                        {renderResponsavelOptions()}
                                    </select>
                                </form>
                            </div>
                        )}
                    </section>
                    );
                })}

                {/* NOVO BLOCO DE ATIVIDADES */}
                <form onSubmit={handleAddAtividade} className="pd-new-ativ">
                    <span className="pd-new-ativ-icon"><Icons.Layers size={18} /></span>
                    <input type="text" placeholder="Nome de um novo bloco de atividades..." value={novaAtividadeNome} onChange={e => setNovaAtividadeNome(e.target.value)} />
                    <select
                        value={novaAtividadeResponsavel}
                        onChange={e => setNovaAtividadeResponsavel(e.target.value)}
                        className="pd-select"
                        title="Responsável da nova atividade"
                    >
                        <option value="">Responsável (opcional)</option>
                        {renderResponsavelOptions()}
                    </select>
                    <button type="submit" className="pd-btn is-primary" disabled={!novaAtividadeNome.trim()}>
                        <Icons.Plus size={15} /> Criar bloco
                    </button>
                </form>
            </div>
        )}

        {/* =========================================
            ABA 2: RELATÓRIO DE TEMPOS
        ========================================= */}
        {activeTab === 'relatorio' && (() => {
            const totalMin = getProjectTotalTime();
            const validLogs = logs.filter((l) => (l.duration_minutes || 0) > 0);
            const sortedLogs = [...validLogs].sort((a, b) => String(b.start_time || '').localeCompare(String(a.start_time || '')));
            const initials = (txt) => String(txt || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
            const porColaborador = Object.values(validLogs.reduce((acc, l) => {
                const key = String(l.user_id || 'x');
                if (!acc[key]) acc[key] = { nome: l.profiles?.nome || staff.find((s) => String(s.id) === key)?.nome || 'Utilizador', total: 0 };
                acc[key].total += Number(l.duration_minutes) || 0;
                return acc;
            }, {})).sort((a, b) => b.total - a.total);
            const maxColab = Math.max(1, ...porColaborador.map((c) => c.total));
            const share = (m) => (totalMin > 0 ? Math.round((m / totalMin) * 100) : 0);

            return (
            <div className="bz-tab-panel pd-rel">
                <header className="pd-rel-head">
                    <h2><Icons.Clock size={20} /> Relatório de Execução</h2>
                    <button type="button" onClick={openCreateTimeLogModal} className="pd-btn is-primary">
                        <Icons.Plus size={14} /> Adicionar Tempo
                    </button>
                </header>

                <div className="pd-rel-top">
                    <section className="pd-rel-total">
                        <span className="pd-rel-total-icon"><Icons.Clock size={22} /></span>
                        <div>
                            <h4>Tempo Total Gasto no Projeto</h4>
                            <p>Soma de todas as sessões do cronómetro.</p>
                        </div>
                        <strong>{formatTime(totalMin)}</strong>
                    </section>

                    <section className="pd-rel-people">
                        <h4>Por colaborador</h4>
                        {porColaborador.length === 0 ? (
                            <p className="pd-rel-muted">Ainda não há tempo registado.</p>
                        ) : (
                            <ul>
                                {porColaborador.map((c) => (
                                    <li key={c.nome}>
                                        <span className="pd-rel-av">{initials(c.nome)}</span>
                                        <span className="pd-rel-name">{c.nome}</span>
                                        <span className="pd-rel-bar"><i style={{ width: `${(c.total / maxColab) * 100}%` }} /></span>
                                        <b>{formatTime(c.total)}</b>
                                        <em>{share(c.total)}%</em>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                </div>

                {/* TEMPO POR ATIVIDADE / TAREFA */}
                <section className="pd-rel-table">
                    <div className="pd-rel-row is-head">
                        <span>Atividade / Tarefa</span>
                        <span>Responsável</span>
                        <span className="is-num">Tempo Gasto</span>
                    </div>
                    {atividades.length === 0 && <div className="pd-rel-empty">Sem atividades neste projeto.</div>}
                    {atividades.map((ativ) => {
                        const ativTime = getActivityTime(ativ);
                        const tarefasComTempo = (ativ.tarefas || []).filter((tar) => getTaskTime(tar.id) > 0);
                        return (
                            <div key={ativ.id} className="pd-rel-group">
                                <div className="pd-rel-row is-ativ">
                                    <span className="pd-rel-cell-name">
                                        <span className="pd-rel-folder"><Icons.Folder size={14} /></span>
                                        <strong>{ativ.titulo}</strong>
                                    </span>
                                    <span className="pd-rel-cell-resp">{getStaffNames(ativ.responsavel_id, ativ.colaboradores_extra)}</span>
                                    <span className="is-num pd-rel-cell-time">
                                        <span className="pd-rel-share" title={`${share(ativTime)}% do tempo total`}><i style={{ width: `${share(ativTime)}%` }} /></span>
                                        <b>{formatTime(ativTime)}</b>
                                    </span>
                                </div>
                                {tarefasComTempo.map((tar) => {
                                    const time = getTaskTime(tar.id);
                                    const userBreakdown = getTaskTimePerUser(tar.id);
                                    return (
                                        <div key={tar.id} className="pd-rel-row is-task">
                                            <span className="pd-rel-cell-name">
                                                <Icons.CornerDownRight size={13} />
                                                <span className="pd-rel-task-text">
                                                    <span>{tar.titulo}</span>
                                                    {userBreakdown.length > 1 && (
                                                        <span className="pd-rel-users">
                                                            {userBreakdown.map((u, i) => (
                                                                <span key={i} className="pd-rel-user"><i>{initials(u.nome)}</i>{u.nome.split(' ')[0]} · {formatTime(u.total)}</span>
                                                            ))}
                                                        </span>
                                                    )}
                                                </span>
                                            </span>
                                            <span className="pd-rel-cell-resp">{getStaffNames(tar.responsavel_id, tar.colaboradores_extra)}</span>
                                            <span className="is-num pd-rel-cell-time"><b>{formatTime(time)}</b></span>
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}
                </section>

                {/* REGISTOS INDIVIDUAIS — linha do tempo por dia */}
                {(() => {
                    const people = Object.entries(validLogs.reduce((acc, l) => {
                        const key = String(l.user_id || 'x');
                        if (!acc[key]) acc[key] = { nome: l.profiles?.nome || 'Utilizador', total: 0 };
                        acc[key].total += Number(l.duration_minutes) || 0;
                        return acc;
                    }, {})).sort((a, b) => b[1].total - a[1].total);
                    const filtered = relFilterUser === 'all' ? sortedLogs : sortedLogs.filter((l) => String(l.user_id || 'x') === relFilterUser);

                    const dayKey = (iso) => (iso ? new Date(iso).toLocaleDateString('sv-SE') : 'sem-data');
                    const groups = [];
                    filtered.forEach((log) => {
                        const k = dayKey(log.start_time);
                        let g = groups[groups.length - 1];
                        if (!g || g.key !== k) { g = { key: k, date: log.start_time ? new Date(log.start_time) : null, logs: [], total: 0 }; groups.push(g); }
                        g.logs.push(log);
                        g.total += Number(log.duration_minutes) || 0;
                    });
                    const visibleGroups = groups.slice(0, relDaysVisible);
                    const hiddenDays = groups.length - visibleGroups.length;

                    const todayK = new Date().toLocaleDateString('sv-SE');
                    const yest = new Date(); yest.setDate(yest.getDate() - 1);
                    const yestK = yest.toLocaleDateString('sv-SE');
                    const dayLabel = (g) => {
                        if (!g.date) return 'Sem data';
                        if (g.key === todayK) return 'Hoje';
                        if (g.key === yestK) return 'Ontem';
                        const sameYear = g.date.getFullYear() === new Date().getFullYear();
                        return g.date.toLocaleDateString('pt-PT', { weekday: 'short', day: 'numeric', month: 'short', year: sameYear ? undefined : 'numeric' }).replace(/\./g, '');
                    };
                    const splitItem = (log) => {
                        const parts = String(getLogTargetLabel(log) || '').split(' > ');
                        return { title: parts[parts.length - 1] || 'Registo', context: parts.slice(0, -1).join(' › ') };
                    };

                    return (
                        <section className="pd-tl">
                            <header className="pd-tl-head">
                                <div>
                                    <h3>Registos Individuais <span className="pd-tl-count">{validLogs.length}</span></h3>
                                    <p>Esqueceste-te do cronómetro? Edita ou adiciona tempo aqui.</p>
                                </div>
                                {people.length > 1 && (
                                    <div className="pd-tl-filter" role="tablist" aria-label="Filtrar por colaborador">
                                        <button type="button" role="tab" aria-selected={relFilterUser === 'all'} className={relFilterUser === 'all' ? 'is-on' : ''} onClick={() => setRelFilterUser('all')}>Todos</button>
                                        {people.map(([id, p]) => (
                                            <button key={id} type="button" role="tab" aria-selected={relFilterUser === id} className={relFilterUser === id ? 'is-on' : ''} onClick={() => setRelFilterUser(id)} title={`${p.nome} · ${formatTime(p.total)}`}>
                                                <span className="pd-rel-av is-xs">{initials(p.nome)}</span>
                                                {p.nome.split(' ')[0]}
                                                <em>{formatTime(p.total)}</em>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </header>

                            {filtered.length === 0 ? (
                                <div className="pd-rel-empty">Sem registos individuais com duração.</div>
                            ) : (
                                <div className="pd-tl-days">
                                    {visibleGroups.map((g) => (
                                        <div key={g.key} className="pd-tl-day">
                                            <div className="pd-tl-day-head">
                                                <span className="pd-tl-day-dot" />
                                                <strong>{dayLabel(g)}</strong>
                                                <span className="pd-tl-day-line" />
                                                <span className="pd-tl-day-total"><Icons.Clock size={11} /> {formatTime(g.total)}</span>
                                            </div>
                                            <ul className="pd-tl-list">
                                                {g.logs.map((log) => {
                                                    const nome = log.profiles?.nome || 'Utilizador';
                                                    const dt = log.start_time ? new Date(log.start_time) : null;
                                                    const { title, context } = splitItem(log);
                                                    return (
                                                        <li key={log.id} className="pd-tl-item">
                                                            <span className="pd-tl-time">{dt ? dt.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
                                                            <div className="pd-tl-main">
                                                                <strong title={title}>{title}</strong>
                                                                {context && <span title={context}>{context}</span>}
                                                            </div>
                                                            <span className="pd-tl-who" title={nome}><span className="pd-rel-av is-sm">{initials(nome)}</span><span>{nome}</span></span>
                                                            <span className="pd-tl-dur">{formatTime(log.duration_minutes || 0)}</span>
                                                            <span className="pd-tl-actions">
                                                                <button type="button" onClick={() => openEditTimeLogModal(log)} className="pd-icon-btn is-xs" title="Editar registo" aria-label="Editar registo"><Icons.Edit size={13} /></button>
                                                                <button type="button" onClick={() => deleteTimeLog(log.id)} className="pd-icon-btn is-xs is-danger" title="Apagar registo" aria-label="Apagar registo"><Icons.Trash size={13} /></button>
                                                            </span>
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        </div>
                                    ))}
                                    {(hiddenDays > 0 || relDaysVisible > 4) && (
                                        <div className="pd-tl-more">
                                            {hiddenDays > 0 && (
                                                <button type="button" className="pd-btn" onClick={() => setRelDaysVisible((n) => n + 6)}>
                                                    <Icons.ChevronDown size={14} /> Ver mais dias <em>({hiddenDays})</em>
                                                </button>
                                            )}
                                            {relDaysVisible > 4 && (
                                                <button type="button" className="pd-btn is-ghost" onClick={() => setRelDaysVisible(4)}>Mostrar menos</button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </section>
                    );
                })()}
            </div>
            );
        })()}

        {timeLogModal.show && (
            <ModalPortal>
                <div className="pd-overlay" onClick={closeTimeLogModal}>
                    <div className="pd-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={timeLogModal.mode === 'edit' ? 'Editar Registo de Tempo' : 'Adicionar Registo de Tempo'}>
                        <header className="pd-modal-head">
                            <span className="pd-modal-icon"><Icons.Clock size={19} /></span>
                            <h3>{timeLogModal.mode === 'edit' ? 'Editar Registo de Tempo' : 'Adicionar Registo de Tempo'}</h3>
                            <button type="button" onClick={closeTimeLogModal} className="pd-icon-btn" aria-label="Fechar"><Icons.Close size={18} /></button>
                        </header>

                        <form onSubmit={saveTimeLog} className="pd-modal-body">
                            <div className="pd-field">
                                <label>Colaborador</label>
                                <select className="pd-input" value={timeLogForm.user_id} onChange={(e) => setTimeLogForm((prev) => ({ ...prev, user_id: e.target.value }))} required>
                                    <option value="">Selecionar...</option>
                                    {staff
                                        .filter(s => s.ativo !== false || String(s.id) === String(timeLogForm.user_id))
                                        .map((s) => <option key={s.id} value={s.id}>{s.nome || s.email}{s.ativo === false ? ' (Inativo)' : ''}</option>)}
                                </select>
                            </div>

                            <div className="pd-row-2">
                                <div className="pd-field">
                                    <label>Data do Registo</label>
                                    <input className="pd-input" type="date" value={timeLogForm.date} onChange={(e) => setTimeLogForm((prev) => ({ ...prev, date: e.target.value }))} required />
                                </div>
                                <div className="pd-field">
                                    <label>Hora de Início</label>
                                    <input className="pd-input" type="time" value={timeLogForm.start_time} onChange={(e) => setTimeLogForm((prev) => ({ ...prev, start_time: e.target.value }))} required />
                                </div>
                            </div>

                            <div className="pd-field">
                                <label>Tipo</label>
                                <div className="pd-seg">
                                    {[['atividade', 'Atividade'], ['tarefa', 'Tarefa'], ['subtarefa', 'Passo']].map(([val, lab]) => (
                                        <button key={val} type="button" className={timeLogForm.target_type === val ? 'is-on' : ''} onClick={() => {
                                            const firstOption = getTargetOptions(val)[0]?.id || "";
                                            setTimeLogForm((prev) => ({ ...prev, target_type: val, target_id: firstOption }));
                                        }}>{lab}</button>
                                    ))}
                                </div>
                            </div>

                            <div className="pd-field">
                                <label>Item</label>
                                <select className="pd-input" value={timeLogForm.target_id} onChange={(e) => setTimeLogForm((prev) => ({ ...prev, target_id: e.target.value }))} required>
                                    <option value="">Selecionar...</option>
                                    {timeLogForm.target_type === 'atividade'
                                        ? activityOptions.map((opt) => <option key={opt.id} value={opt.id}>{opt.label}</option>)
                                        : atividades.map((ativ) => {
                                            // Agrupado por atividade: a opção mostra só a tarefa (ou "Tarefa > Passo"),
                                            // para o nome não ficar cortado pelo título comprido da atividade
                                            const items = timeLogForm.target_type === 'subtarefa'
                                                ? (ativ.tarefas || []).flatMap((tar) => (tar.subtarefas || []).map((sub) => ({ id: String(sub.id), label: `${tar.titulo} > ${sub.titulo}` })))
                                                : (ativ.tarefas || []).map((tar) => ({ id: String(tar.id), label: tar.titulo }));
                                            if (items.length === 0) return null;
                                            return (
                                                <optgroup key={ativ.id} label={ativ.titulo}>
                                                    {items.map((opt) => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
                                                </optgroup>
                                            );
                                        })}
                                </select>
                                {timeLogForm.target_type !== 'atividade' && timeLogForm.target_id && (() => {
                                    const opt = getTargetOptions(timeLogForm.target_type).find((o) => String(o.id) === String(timeLogForm.target_id));
                                    return opt ? <small className="pd-hint">{opt.label}</small> : null;
                                })()}
                            </div>

                            <div className="pd-field">
                                <label>Tempo (minutos)</label>
                                <div className="pd-input-eur">
                                    <input className="pd-input" type="number" min="1" value={timeLogForm.duration_minutes} onChange={(e) => setTimeLogForm((prev) => ({ ...prev, duration_minutes: e.target.value }))} placeholder="Ex: 45" required />
                                    <span>min</span>
                                </div>
                                <small className="pd-hint">Visualização: <b>{formatTime(Math.max(0, parseInt(timeLogForm.duration_minutes || "0", 10) || 0))}</b></small>
                            </div>

                            <div className="pd-modal-actions">
                                <button type="button" onClick={closeTimeLogModal} className="pd-btn">Cancelar</button>
                                <button type="submit" disabled={timeLogSaving} className="pd-btn is-primary">
                                    <Icons.Save size={14} /> {timeLogSaving ? 'A guardar...' : 'Guardar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </ModalPortal>
        )}

        {/* =========================================
            ABA 3: GANTT
        ========================================= */}
        {activeTab === 'gantt' && (() => {
            const todayD = new Date(); todayD.setHours(0, 0, 0, 0);
            const overdueCount = visibleGanttItems.filter((i) => i.end < todayD && (i.progress || 0) < 100).length;
            const ESTADO_LABEL = { pendente: 'Pendente', em_curso: 'Em curso', em_analise: 'Em análise', concluido: 'Concluído', encerrado: 'Encerrado', cancelado: 'Cancelado' };

            // Faixas de meses
            const bands = [];
            const cur = startOfMonth(ganttWindowStart);
            let bi = 0;
            while (cur <= ganttWindowEnd) {
                const bStart = cur < ganttWindowStart ? ganttWindowStart : new Date(cur);
                const mEnd = endOfMonth(cur);
                const bEnd = mEnd > ganttWindowEnd ? ganttWindowEnd : mEnd;
                const left = (clamp(dayDiff(ganttWindowStart, bStart), 0, ganttDurationDays) / ganttDurationDays) * 100;
                const width = ((dayDiff(bStart, bEnd) + 1) / ganttDurationDays) * 100;
                const showYear = bi === 0 || cur.getMonth() === 0;
                bands.push({
                    key: `${cur.getFullYear()}-${cur.getMonth()}`,
                    left, width, odd: bi % 2 === 1,
                    label: width > 9 ? cur.toLocaleDateString('pt-PT', { month: 'long' }) : width > 3.2 ? cur.toLocaleDateString('pt-PT', { month: 'short' }).replace('.', '') : cur.toLocaleDateString('pt-PT', { month: 'narrow' }),
                    year: showYear && width > 3.2 ? cur.getFullYear() : null,
                });
                cur.setMonth(cur.getMonth() + 1);
                bi += 1;
            }

            const tasksPerActivity = visibleGanttItems.reduce((acc, it) => { if (it.rowType === 'task') acc[it.activityId] = (acc[it.activityId] || 0) + 1; return acc; }, {});
            const rows = visibleGanttItems.filter((it) => it.rowType === 'group' || !ganttCollapsed[it.activityId]);
            const allCollapsed = visibleGanttItems.some((it) => it.rowType === 'group') && visibleGanttItems.filter((it) => it.rowType === 'group').every((it) => ganttCollapsed[it.activityId]);
            const toggleAll = () => {
                const next = {};
                if (!allCollapsed) visibleGanttItems.forEach((it) => { if (it.rowType === 'group') next[it.activityId] = true; });
                setGanttCollapsed(next);
            };

            return (
            <div className="bz-tab-panel pd-gantt">
                <header className="pd-gantt-head">
                    <div>
                        <h2><Icons.Calendar size={18} /> Cronograma</h2>
                        <p>{ganttWindowStart.toLocaleDateString('pt-PT')} a {ganttWindowEnd.toLocaleDateString('pt-PT')}</p>
                    </div>
                    <div className="pd-gantt-tools">
                        <div className="pd-seg" role="tablist" aria-label="Janela temporal">
                            {GANTT_WINDOW_OPTIONS.map((option) => (
                                <button key={option.value} type="button" role="tab" aria-selected={option.value === ganttWindow} className={option.value === ganttWindow ? 'is-on' : ''} onClick={() => setGanttWindow(option.value)}>
                                    {option.value === '1m' ? 'Este mês' : option.label}
                                </button>
                            ))}
                        </div>
                        <button type="button" className="pd-btn" onClick={toggleAll} disabled={!visibleGanttItems.length}>
                            <Icons.ChevronDown size={14} /> {allCollapsed ? 'Expandir tudo' : 'Recolher tudo'}
                        </button>
                        <button type="button" className="pd-btn is-primary" onClick={exportGanttPdf} disabled={isExportingGantt}>
                            <Icons.Download size={15} /> {isExportingGantt ? 'A exportar...' : 'Exportar PDF'}
                        </button>
                    </div>
                </header>

                <div className="pd-gantt-stats">
                    <div className="pd-gstat"><small>Itens no período</small><strong>{visibleGanttItems.length}</strong></div>
                    <div className="pd-gstat is-ok"><small>Concluídos</small><strong>{concludedItems}</strong></div>
                    <div className={`pd-gstat ${overdueCount ? 'is-late' : ''}`}><small>Em atraso</small><strong>{overdueCount}</strong></div>
                    <div className="pd-gstat is-progress">
                        <small>Ponto de situação</small>
                        <strong>{visibleCompletion}%</strong>
                        <span className="pd-gstat-bar"><i style={{ width: `${visibleCompletion}%` }} /></span>
                    </div>
                </div>

                <div className="pd-gchart">
                    <div className="pd-g-head">
                        <div className="pd-g-head-label">Atividade / tarefa</div>
                        <div className="pd-g-head-time">
                            {bands.map((b) => (
                                <div key={b.key} className={`pd-g-month ${b.odd ? 'is-odd' : ''}`} style={{ left: `${b.left}%`, width: `${b.width}%` }}>
                                    <span>{b.label}{b.year && <em>{b.year}</em>}</span>
                                </div>
                            ))}
                            {todayPercent !== null && <span className="pd-g-today-pill" style={{ left: `${todayPercent}%` }}>Hoje</span>}
                        </div>
                    </div>

                    <div className="pd-g-body">
                        <div className="pd-g-grid" aria-hidden="true">
                            {bands.map((b) => <span key={b.key} className={b.odd ? 'is-odd' : ''} style={{ left: `${b.left}%`, width: `${b.width}%` }} />)}
                            {todayPercent !== null && <i className="pd-g-today" style={{ left: `${todayPercent}%` }} />}
                        </div>

                        {rows.length === 0 && (
                            <div className="pd-g-empty">Sem atividades/tarefas com datas dentro desta janela.</div>
                        )}

                        {rows.map((item) => {
                            const rawStart = dayDiff(ganttWindowStart, item.start);
                            const rawEnd = dayDiff(ganttWindowStart, item.end) + 1;
                            const clampedStart = clamp(rawStart, 0, ganttDurationDays);
                            const clampedEnd = clamp(rawEnd, 0, ganttDurationDays);
                            const leftPct = (clampedStart / ganttDurationDays) * 100;
                            const widthPct = Math.max(((clampedEnd - clampedStart) / ganttDurationDays) * 100, 0.8);
                            const isGroup = item.rowType === 'group';
                            const colors = activityColors[item.activityId] || null;
                            const base = colors ? colors.base : 'var(--color-btnPrimary)';
                            const light = colors ? colors.lightSolid : 'color-mix(in srgb, var(--color-btnPrimary) 15%, #fff)';
                            const prog = clamp(item.progress || 0, 0, 100);
                            const isDone = prog >= 100;
                            const isLate = item.end < todayD && !isDone;
                            const labelInside = leftPct + widthPct > 86;
                            const collapsed = isGroup && ganttCollapsed[item.activityId];
                            const dates = `${item.start.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' }).replace('.', '')} → ${item.end.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' }).replace('.', '')}`;

                            return (
                                <div key={item.id} className={`pd-g-row ${isGroup ? 'is-group' : ''} ${isLate ? 'is-late' : ''} ${isDone ? 'is-done' : ''}`} style={{ '--bc': base, '--bl': light }}>
                                    <div className="pd-g-label">
                                        {isGroup ? (
                                            <button type="button" className={`pd-g-toggle ${collapsed ? 'is-collapsed' : ''}`} onClick={() => setGanttCollapsed((prev) => ({ ...prev, [item.activityId]: !prev[item.activityId] }))} aria-expanded={!collapsed} title={collapsed ? 'Mostrar tarefas' : 'Esconder tarefas'}>
                                                <Icons.ChevronDown size={14} />
                                            </button>
                                        ) : (
                                            <span className="pd-g-dot" />
                                        )}
                                        <div className="pd-g-text">
                                            <strong title={item.label}>{item.label}</strong>
                                            <em>
                                                {isGroup
                                                    ? `${tasksPerActivity[item.activityId] || 0} tarefa${(tasksPerActivity[item.activityId] || 0) === 1 ? '' : 's'} · ${ESTADO_LABEL[item.estado] || 'Sem estado'}`
                                                    : dates}
                                            </em>
                                        </div>
                                        {isDone && <span className="pd-g-badge is-done"><Icons.Check size={10} /></span>}
                                        {isLate && <span className="pd-g-badge is-late">atraso</span>}
                                    </div>
                                    <div className="pd-g-track">
                                        <div
                                            className={`pd-g-bar ${labelInside ? 'is-label-inside' : ''}`}
                                            style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                                            title={`${item.label}\n${item.start.toLocaleDateString('pt-PT')} – ${item.end.toLocaleDateString('pt-PT')}\nProgresso: ${prog}%`}
                                        >
                                            <i style={{ width: `${prog}%` }} />
                                            <span>{prog}%</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="pd-g-legend">
                    <span><i className="is-progress" /> Progresso</span>
                    <span><i className="is-todo" /> Por fazer</span>
                    <span><i className="is-late" /> Em atraso</span>
                    <span><i className="is-today" /> Hoje</span>
                    <span className="pd-g-legend-note">Cada atividade tem a sua cor; as tarefas usam a cor da atividade.</span>
                </div>
            </div>
            );
        })()}


        {/* =========================================
            ABA 4: VISÃO GERAL (Formulário)
        ========================================= */}
        {activeTab === 'geral' && (() => {
            const ESTADOS = [
                { val: 'pendente', label: 'Pendente', color: '#f59e0b' },
                { val: 'em_curso', label: 'Em curso', color: '#10b981' },
                { val: 'em_analise', label: 'Em análise', color: '#6366f1' },
                { val: 'concluido', label: 'Concluído', color: '#0ea5e9' },
                { val: 'encerrado', label: 'Encerrado', color: '#64748b' },
                { val: 'cancelado', label: 'Cancelado', color: '#ef4444' },
            ];
            const editing = isEditingGeral;
            const tipoSelecionado = tiposProjeto.find(t => String(t.id) === String(formGeral.tipo_projeto_id));
            const isProjetoFormacao = tipoSelecionado?.eh_formacao === true;
            const selectedPrograma = getProgramaById(formGeral.programa_id);
            const avisosDoPrograma = selectedPrograma ? getAvisosForPrograma(selectedPrograma) : [];
            const cancelEdit = () => { setIsEditingGeral(false); setFormGeral({ ...projeto, has_organismo: !!projeto.organismo_id, prazos_fases: normalizeProjetoFases(projeto.prazos_fases) }); };

            // Duração do projeto
            let duracao = null;
            if (formGeral.data_inicio && formGeral.data_fim) {
                const dias = Math.round((new Date(formGeral.data_fim) - new Date(formGeral.data_inicio)) / 86400000);
                if (dias >= 0) {
                    const meses = Math.round(dias / 30.4);
                    duracao = meses >= 2 ? `${meses} meses` : `${dias} dias`;
                }
            }
            const today = new Date(); today.setHours(0, 0, 0, 0);

            const colabIds = (formGeral.colaboradores || []).map(String);
            const internosVisiveis = internalAssigneeOptions.filter(s => String(s.id) !== String(formGeral.responsavel_id || '')).filter(s => editing || colabIds.includes(String(s.id)));
            const externosVisiveis = entityAssigneeOptions.filter(s => String(s.id) !== String(formGeral.responsavel_id || '')).filter(s => editing || colabIds.includes(String(s.id)));
            const initials = (txt) => String(txt || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

            return (
            <div className="bz-tab-panel pd-ficha">
                <header className="pd-ficha-head">
                    <div>
                        <h2>Ficha do projeto</h2>
                        <p>{editing ? 'Estás a editar. As alterações só ficam guardadas quando carregares em "Gravar".' : 'Toda a informação base do projeto, organizada por temas.'}</p>
                    </div>
                    {!editing ? (
                        <button type="button" onClick={() => setIsEditingGeral(true)} className="pd-btn is-primary"><Icons.Edit size={15} /> Editar ficha</button>
                    ) : (
                        <span className="pd-editing-badge"><i /> Modo de edição</span>
                    )}
                </header>

                <fieldset disabled={!editing} className={`pd-form ${editing ? 'is-editing' : 'is-reading'}`}>
                    <div className="pd-ficha-grid">
                        {/* ---------------- COLUNA ESQUERDA ---------------- */}
                        <div className="pd-ficha-col">
                            <section className="pd-card">
                                <h3><span className="pd-card-icon"><Icons.Info size={15} /></span> Identificação</h3>
                                <div className="pd-field">
                                    <label>Nome do projeto</label>
                                    <input className="pd-input is-title" type="text" value={formGeral.titulo || ''} onChange={e => setFormGeral({...formGeral, titulo: e.target.value})} />
                                </div>
                                <div className="pd-row-2">
                                    <div className="pd-field">
                                        <label>Tipo de projeto</label>
                                        <select className="pd-input" value={formGeral.tipo_projeto_id || ''} onChange={e => setFormGeral({...formGeral, tipo_projeto_id: e.target.value || null})}>
                                            <option value="">— Sem tipo —</option>
                                            {tiposProjeto.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                                        </select>
                                    </div>
                                    {!isProjetoFormacao && (
                                        <div className="pd-row-2 is-tight">
                                            <div className="pd-field">
                                                <label>Código</label>
                                                <input className="pd-input is-mono" type="text" value={formGeral.codigo_projeto || ''} placeholder={editing ? 'Ex: NORTE2030-…' : '—'} onChange={e => setFormGeral({...formGeral, codigo_projeto: e.target.value})} />
                                            </div>
                                            <div className="pd-field">
                                                <label>Nº interno</label>
                                                <input className="pd-input is-mono" type="text" value={formGeral.numero_projeto || ''} placeholder={editing ? 'Ex: 312' : '—'} onChange={e => setFormGeral({...formGeral, numero_projeto: e.target.value})} />
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="pd-field">
                                    <label>Estado do projeto</label>
                                    <div className="pd-states">
                                        {ESTADOS.filter((s) => editing || s.val === (formGeral.estado || 'pendente')).map((s) => (
                                            <button key={s.val} type="button" style={{ '--c': s.color }} className={(formGeral.estado || 'pendente') === s.val ? 'is-on' : ''} onClick={() => setFormGeral({...formGeral, estado: s.val})}>
                                                <i /> {s.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </section>

                            <section className="pd-card">
                                <h3><span className="pd-card-icon"><Icons.Building size={15} /></span> Entidades</h3>
                                <div className="pd-field">
                                    <label>Tipo de entidade</label>
                                    <div className="pd-seg">
                                        {[['unico', 'Individual', <Icons.User size={13} />], ['parceria', 'Parceria (várias)', <Icons.Handshake size={13} />]]
                                            .filter(([val]) => editing || (val === 'parceria') === Boolean(formGeral.is_parceria))
                                            .map(([val, label, icon]) => (
                                                <button key={val} type="button" className={(formGeral.is_parceria ? 'parceria' : 'unico') === val ? 'is-on' : ''} onClick={() => {
                                                    const isParc = val === 'parceria';
                                                    setFormGeral({...formGeral, is_parceria: isParc, parceiros_ids: isParc ? (formGeral.parceiros_ids || []) : []});
                                                }}>{icon} {label}</button>
                                            ))}
                                    </div>
                                </div>
                                <div className="pd-field">
                                    <label>Cliente principal <em>*</em></label>
                                    <select className="pd-input" value={formGeral.cliente_id || ''} required onChange={e => {
                                        const selectedId = e.target.value;
                                        setFormGeral(prev => ({
                                            ...prev,
                                            cliente_id: selectedId,
                                            cliente_texto: "",
                                            parceiros_ids: (prev.parceiros_ids || []).filter(pid => String(pid) !== String(selectedId))
                                        }));
                                    }}>
                                        <option value="">- Selecione -</option>
                                        {clientes.map(c => <option key={c.id} value={c.id}>{getClientDisplayName(c) || c.marca}</option>)}
                                    </select>
                                </div>

                                {formGeral.is_parceria && (
                                    <div className="pd-field">
                                        <label>Entidades parceiras</label>
                                        <div className="pd-pills">
                                            {(formGeral.parceiros_ids || []).length === 0 && <span className="pd-pills-empty">Sem parceiros selecionados.</span>}
                                            {(formGeral.parceiros_ids || []).map(pid => {
                                                const parceiro = clientes.find(c => String(c.id) === String(pid));
                                                if (!parceiro) return null;
                                                return (
                                                    <button type="button" key={pid} onClick={() => editing && handleToggleParceiro(pid)} className="pd-pill is-on" title={editing ? 'Remover parceiro' : undefined}>
                                                        <Icons.Handshake size={12} /> {getClientDisplayName(parceiro) || parceiro.marca}
                                                        {editing && <Icons.Close size={12} />}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        {editing && (
                                            <select
                                                className="pd-input"
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
                                            >
                                                <option value="">+ Adicionar entidade parceira…</option>
                                                {clientes
                                                    .filter(c => String(c.id) !== String(formGeral.cliente_id || ''))
                                                    .filter(c => !(formGeral.parceiros_ids || []).includes(c.id))
                                                    .map(c => <option key={c.id} value={c.id}>{getClientDisplayName(c) || c.marca}</option>)}
                                            </select>
                                        )}
                                    </div>
                                )}

                                {!isProjetoFormacao && (
                                    <div className="pd-subcard">
                                        <div className="pd-field">
                                            <label>Envolve entidade financiadora?</label>
                                            <div className="pd-seg">
                                                {[['nao', 'Não'], ['sim', 'Sim']]
                                                    .filter(([val]) => editing || (val === 'sim') === Boolean(formGeral.has_organismo))
                                                    .map(([val, label]) => (
                                                        <button key={val} type="button" className={(formGeral.has_organismo ? 'sim' : 'nao') === val ? 'is-on' : ''} onClick={() => {
                                                            const hasOrg = val === 'sim';
                                                            setFormGeral({...formGeral, has_organismo: hasOrg, organismo_id: hasOrg ? formGeral.organismo_id : null, organismo_contacto_id: hasOrg ? formGeral.organismo_contacto_id : null});
                                                        }}>{label}</button>
                                                    ))}
                                            </div>
                                        </div>
                                        {formGeral.has_organismo && (
                                            <div className="pd-row-2">
                                                <div className="pd-field">
                                                    <label>Organismo líder <em>*</em></label>
                                                    <select className="pd-input" value={formGeral.organismo_id || ""} required={formGeral.has_organismo} onChange={e => setFormGeral({...formGeral, organismo_id: e.target.value, organismo_contacto_id: null})}>
                                                        <option value="">-- Selecione o organismo --</option>
                                                        {clientes.filter(c => c.eh_organismo).map(c => (
                                                            <option key={c.id} value={c.id}>{getClientDisplayName(c) || c.marca}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                {formGeral.organismo_id && (
                                                    <div className="pd-field">
                                                        <label>Pessoa do organismo</label>
                                                        <select className="pd-input" value={formGeral.organismo_contacto_id || ""} onChange={e => setFormGeral({...formGeral, organismo_contacto_id: e.target.value})}>
                                                            <option value="">-- Sem pessoa definida --</option>
                                                            {organismoPessoas.map(p => {
                                                                const nome = p.nome_contacto || p.email || "Contacto";
                                                                const cargo = p.cargo ? ` (${p.cargo})` : "";
                                                                return <option key={p.id} value={p.id}>{`${nome}${cargo}`}</option>;
                                                            })}
                                                        </select>
                                                        {editing && organismoPessoas.length === 0 && <small className="pd-hint">Este organismo ainda não tem contactos registados.</small>}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </section>

                            <section className="pd-card">
                                <h3><span className="pd-card-icon"><Icons.Users size={15} /></span> Equipa</h3>
                                <div className="pd-field">
                                    <label>Responsável global</label>
                                    <select className="pd-input" value={formGeral.responsavel_id || ''} onChange={e => {
                                        const newResp = e.target.value || null;
                                        setFormGeral(prev => ({
                                            ...prev,
                                            responsavel_id: newResp,
                                            colaboradores: (prev.colaboradores || []).filter(cid => cid !== newResp)
                                        }));
                                    }}>
                                        <option value="">Sem responsável interno (ou externo)</option>
                                        {renderResponsavelOptions()}
                                    </select>
                                </div>
                                <div className="pd-row-2">
                                    <div className="pd-field">
                                        <label>Equipa interna</label>
                                        <div className="pd-pills">
                                            {internosVisiveis.map(s => {
                                                const isSelected = colabIds.includes(String(s.id));
                                                return (
                                                    <button type="button" key={`colab-int-${s.id}`} onClick={() => editing && handleToggleColaborador(s.id)} className={`pd-pill ${isSelected ? 'is-on' : ''}`} aria-pressed={isSelected}>
                                                        <span className="pd-pill-av">{isSelected && editing ? <Icons.Check size={10} /> : initials(s.label)}</span>
                                                        {s.label}
                                                    </button>
                                                );
                                            })}
                                            {internosVisiveis.length === 0 && <span className="pd-pills-empty">{editing ? 'Sem pessoas internas disponíveis.' : 'Ninguém além do responsável.'}</span>}
                                        </div>
                                    </div>
                                    <div className="pd-field">
                                        <label>Pessoas das entidades</label>
                                        <div className="pd-pills">
                                            {externosVisiveis.map(s => {
                                                const isSelected = colabIds.includes(String(s.id));
                                                return (
                                                    <button type="button" key={`colab-ent-${s.id}`} onClick={() => editing && handleToggleColaborador(s.id)} className={`pd-pill is-ext ${isSelected ? 'is-on' : ''}`} aria-pressed={isSelected}>
                                                        <span className="pd-pill-av">{isSelected && editing ? <Icons.Check size={10} /> : initials(s.label)}</span>
                                                        {s.label}
                                                    </button>
                                                );
                                            })}
                                            {externosVisiveis.length === 0 && <span className="pd-pills-empty">{editing ? 'Sem contactos das entidades deste projeto.' : 'Nenhuma pessoa externa.'}</span>}
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </div>

                        {/* ---------------- COLUNA DIREITA ---------------- */}
                        <div className="pd-ficha-col">
                            <section className="pd-card">
                                <h3><span className="pd-card-icon"><Icons.Calendar size={15} /></span> Prazos {duracao && <span className="pd-card-badge">{duracao}</span>}</h3>
                                <div className="pd-row-2">
                                    <div className="pd-field">
                                        <label>Data de início</label>
                                        <input className="pd-input" type="date" value={formGeral.data_inicio || ''} onChange={e => setFormGeral({...formGeral, data_inicio: e.target.value})} />
                                    </div>
                                    <div className="pd-field">
                                        <label>Data de fim (prazo)</label>
                                        <input className="pd-input" type="date" value={formGeral.data_fim || ''} onChange={e => setFormGeral({...formGeral, data_fim: e.target.value})} />
                                    </div>
                                </div>
                            </section>

                            {!isProjetoFormacao && (
                                <section className="pd-card">
                                    <h3><span className="pd-card-icon"><Icons.Target size={15} /></span> Programa e aviso</h3>
                                    <div className="pd-field">
                                        <label>Programa</label>
                                        <select className="pd-input" value={formGeral.programa_id || ''} onChange={(e) => handleProgramaChange(e.target.value)}>
                                            <option value="">-- Sem programa associado --</option>
                                            {programas.filter((programa) => programa.ativo !== false || String(programa.id) === String(formGeral.programa_id)).map((programa) => (
                                                <option key={programa.id} value={programa.id}>
                                                    {`${programa.codigo ? `${programa.codigo} - ` : ''}${programa.nome || 'Programa'}`}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="pd-field">
                                        <label>Aviso</label>
                                        <select
                                            className="pd-input"
                                            value={formGeral.aviso_id || ''}
                                            disabled={!editing || avisosDoPrograma.length === 0}
                                            onChange={(e) => {
                                                const avId = e.target.value;
                                                const av = getAvisoById(avId);
                                                setFormGeral({
                                                    ...formGeral,
                                                    aviso_id: avId,
                                                    aviso: av?.codigo || "",
                                                    prazos_fases: av?.fases ? normalizeProjetoFases(av.fases) : formGeral.prazos_fases
                                                });
                                            }}
                                        >
                                            <option value="">{avisosDoPrograma.length > 0 ? "-- Escolhe o aviso --" : "Sem avisos associados"}</option>
                                            {avisosDoPrograma.map(av => (
                                                <option key={av.id} value={av.id}>{av.codigo}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="pd-field">
                                        <label>Fases do programa / aviso</label>
                                        {projetoFases.length > 0 ? (
                                            <ol className="pd-fases">
                                                {projetoFases.map((fase, index) => {
                                                    const dt = fase.prazo ? new Date(`${fase.prazo}T00:00:00`) : null;
                                                    const isPast = dt && dt < today;
                                                    return (
                                                        <li key={`${fase.nome || 'fase'}-${index}`} className={isPast ? 'is-past' : ''}>
                                                            <span className="pd-fase-dot">{isPast ? <Icons.Check size={10} /> : index + 1}</span>
                                                            <span className="pd-fase-name">{fase.nome || `Fase ${index + 1}`}</span>
                                                            <span className="pd-fase-date">{dt ? dt.toLocaleDateString('pt-PT') : 'Sem data'}</span>
                                                        </li>
                                                    );
                                                })}
                                            </ol>
                                        ) : (
                                            <span className="pd-pills-empty">Sem fases registadas.</span>
                                        )}
                                    </div>
                                </section>
                            )}

                            <section className="pd-card">
                                <h3><span className="pd-card-icon"><Icons.FileText size={15} /></span> Notas</h3>
                                <div className="pd-field">
                                    <label>Descrição pública</label>
                                    <textarea className="pd-input is-area" rows="3" value={formGeral.descricao || ''} placeholder={editing ? 'Resumo do projeto…' : 'Sem descrição.'} onChange={e => setFormGeral({...formGeral, descricao: e.target.value})} />
                                </div>
                                <div className="pd-field is-internal">
                                    <label><Icons.Eye size={12} /> Observações internas</label>
                                    <textarea className="pd-input is-area is-note" rows="3" value={formGeral.observacoes || ''} placeholder={editing ? 'Notas só para a equipa…' : 'Sem observações.'} onChange={e => setFormGeral({...formGeral, observacoes: e.target.value})} />
                                </div>
                            </section>
                        </div>
                    </div>

                    <section className="pd-danger">
                        <div className="pd-danger-text">
                            <strong><Icons.AlertTriangle size={16} /> Arquivar ou apagar</strong>
                            <p>Arquivar remove o projeto das listas normais sem perder histórico. Apagar elimina permanentemente o projeto e os registos associados.</p>
                            {!editing && <em>Por segurança, só disponível em modo de edição.</em>}
                        </div>
                        <div className="pd-danger-actions">
                            <button type="button" onClick={handleArchiveProject} disabled={projectActionLoading} className="pd-btn is-warn">
                                <Icons.Folder size={15} /> Arquivar
                            </button>
                            <button type="button" onClick={handleHardDeleteProject} disabled={projectActionLoading} className="pd-btn is-danger">
                                <Icons.Trash size={15} color="currentColor" /> Apagar permanentemente
                            </button>
                        </div>
                    </section>
                </fieldset>

                {editing && (
                    <div className="pd-savebar" role="region" aria-label="Guardar alterações">
                        <span><i /> Alterações por gravar</span>
                        <button type="button" onClick={cancelEdit} className="pd-btn">Cancelar</button>
                        <button type="button" onClick={handleUpdateProjeto} className="pd-btn is-primary"><Icons.Save size={15} /> Gravar</button>
                    </div>
                )}
            </div>
            );
        })()}

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
                                    const newResp = e.target.value || null; 
                                    const extras = Array.isArray(atividadeModal.data.colaboradores_extra) ? atividadeModal.data.colaboradores_extra : [];
                                    setAtividadeModal({show: true, data: {...atividadeModal.data, responsavel_id: newResp, colaboradores_extra: extras.filter(id => id !== newResp)}})
                                }} style={{...inputStyle, marginBottom: 0}} className="input-focus">
                                    <option value=""> Sem responsável interno (ou Externo) </option>
                                    {renderResponsavelOptions()}
                                </select>
                              </div>
                          </div>

                          <div style={{marginBottom: '15px'}}>
                              <label style={{fontSize: '0.75rem', color: '#64748b', marginBottom: '6px', display:'block', fontWeight:'bold'}}>Outros Colaboradores Envolvidos</label>
                              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px'}}>
                                  <div>
                                      <div style={{fontSize: '0.7rem', color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px'}}>Equipa Interna</div>
                                      <div className="pill-container custom-scrollbar" style={{padding: '8px', maxHeight: '88px', overflowY: 'auto'}}>
                                          {internalAssigneeOptions
                                              .filter(s => String(s.id) !== String(atividadeModal.data.responsavel_id || ''))
                                              .filter(s => s.ativo || (Array.isArray(atividadeModal.data.colaboradores_extra) && atividadeModal.data.colaboradores_extra.map(id => String(id)).includes(String(s.id))))
                                              .map(s => {
                                              const isSelected = Array.isArray(atividadeModal.data.colaboradores_extra) && atividadeModal.data.colaboradores_extra.map(id => String(id)).includes(String(s.id));
                                              return (
                                                  <div
                                                      key={`ativ-int-${s.id}`}
                                                      onClick={() => handleToggleAtividadeColaborador(s.id)}
                                                      className={`pill-checkbox ${isSelected ? 'selected' : ''}`}
                                                      style={{fontSize: '0.72rem', padding: '5px 10px'}}
                                                  >
                                                      {s.label}{!s.ativo ? ' (Inativo)' : ''}
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
                                  <div style={{flex: '1 1 200px'}}><label style={{fontSize: '0.75rem', color: '#64748b', marginBottom: '4px', display:'block', fontWeight: 'bold'}}>Invest. (€)</label><input type="text" value={formatNumber(atividadeModal.data.investimento)} onChange={e => setAtividadeModal({show: true, data: {...atividadeModal.data, investimento: parseNumberInput(e.target.value)}})} style={{...inputStyle, padding:'10px', fontSize:'0.85rem', marginBottom: 0}} className="input-focus" /></div>
                              )}
                              
                              {deveMostrarCampoItem(atividadeModal.data.info_adicional, 'incentivo') && (
                                  <div style={{flex: '1 1 200px'}}><label style={{fontSize: '0.75rem', color: '#64748b', marginBottom: '4px', display:'block', fontWeight: 'bold'}}>Incentivo (€)</label><input type="text" value={formatNumber(atividadeModal.data.incentivo)} onChange={e => setAtividadeModal({show: true, data: {...atividadeModal.data, incentivo: parseNumberInput(e.target.value)}})} style={{...inputStyle, padding:'10px', fontSize:'0.85rem', marginBottom: 0}} className="input-focus" /></div>
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
                                      <option value=""> Sem responsável interno (ou Externo) </option>
                                      {renderAssigneeOptionGroups(tarefaModal.data?.responsavel_id)}
                                  </select>
                              </div>
                          </div>

                          <div style={{marginBottom: '15px'}}>
                              <label style={{fontSize: '0.75rem', color: '#64748b', marginBottom: '6px', display:'block', fontWeight:'bold'}}>Outros Colaboradores Envolvidos</label>
                              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px'}}>
                                  <div>
                                      <div style={{fontSize: '0.7rem', color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px'}}>Equipa Interna</div>
                                      <div className="pill-container custom-scrollbar" style={{padding: '8px', maxHeight: '88px', overflowY: 'auto'}}>
                                          {internalAssigneeOptions
                                              .filter(s => String(s.id) !== String(tarefaModal.data.responsavel_id || ''))
                                              .filter(s => s.ativo || (Array.isArray(tarefaModal.data.colaboradores_extra) && tarefaModal.data.colaboradores_extra.map(id => String(id)).includes(String(s.id))))
                                              .map(s => {
                                              const isSelected = Array.isArray(tarefaModal.data.colaboradores_extra) && tarefaModal.data.colaboradores_extra.map(id => String(id)).includes(String(s.id));
                                              return (
                                                  <div
                                                      key={`tar-int-${s.id}`}
                                                      onClick={() => handleToggleTarefaColaborador(s.id)}
                                                      className={`pill-checkbox ${isSelected ? 'selected' : ''}`}
                                                      style={{fontSize: '0.72rem', padding: '5px 10px'}}
                                                  >
                                                      {s.label}{!s.ativo ? ' (Inativo)' : ''}
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
                                  <div style={{flex: '1 1 150px'}}><label style={{fontSize: '0.75rem', color: '#64748b', marginBottom: '4px', display:'block', fontWeight:'bold'}}>Investimento (€)</label><input type="text" value={formatNumber(tarefaModal.data.investimento)} onChange={e => setTarefaModal({...tarefaModal, data: {...tarefaModal.data, investimento: parseNumberInput(e.target.value)}})} style={{...inputStyle, padding:'10px', fontSize:'0.85rem', marginBottom: 0, width: '100%'}} className="input-focus" /></div>
                              )}

                              {deveMostrarCampoItem(tarefaModal.data.info_adicional, 'incentivo') && (
                                  <div style={{flex: '1 1 150px'}}><label style={{fontSize: '0.75rem', color: '#64748b', marginBottom: '4px', display:'block', fontWeight:'bold'}}>Incentivo (€)</label><input type="text" value={formatNumber(tarefaModal.data.incentivo)} onChange={e => setTarefaModal({...tarefaModal, data: {...tarefaModal.data, incentivo: parseNumberInput(e.target.value)}})} style={{...inputStyle, padding:'10px', fontSize:'0.85rem', marginBottom: 0, width: '100%'}} className="input-focus" /></div>
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
                  <div style={{background: 'white', padding: '30px', borderRadius: '16px', width: 'min(500px, 92vw)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'}}>
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
      {infoTooltip && (
    <ModalPortal>
        <div style={{
            position: 'fixed',
            top: infoTooltip.y,
            left: clamp(infoTooltip.x, 120, window.innerWidth - 120),
            transform: 'translateX(-50%)',
            width: '210px',
            background: '#1e293b',
            color: '#fff',
            borderRadius: '8px',
            padding: '10px 12px',
            fontSize: '0.75rem',
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)',
            pointerEvents: 'none',
            zIndex: 999999
        }}>
            <div>Criado por: {infoTooltip.criadorNome}</div>
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

          .gantt-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
          .gantt-scrollbar::-webkit-scrollbar { display: none; height: 0; width: 0; }

          @keyframes taskFocusPulse { 0% { transform: scale(1); } 50% { transform: scale(1.01); } 100% { transform: scale(1); } }

          @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
          
          @keyframes pulse { 0% {box-shadow:0 0 0 0 rgba(239,68,68,0.7)} 70% {box-shadow:0 0 0 6px rgba(239,68,68,0)} 100% {box-shadow:0 0 0 0 rgba(239,68,68,0)}} 
          .pulse-dot-white { width: 8px; height: 8px; background-color: white; border-radius: 50%; display: inline-block; animation: pulse 1.5s infinite; }

                    .gantt-bar { transition: transform 0.18s ease, filter 0.18s ease; }
                    .gantt-bar:hover { transform: scaleY(1.05); filter: brightness(1.05); }
      `}</style>
    </div>
  );
}
