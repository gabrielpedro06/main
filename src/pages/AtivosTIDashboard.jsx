import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../services/supabase";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import FancySelect from "../components/FancySelect";
import "../styles/ativos-ti.css";

/* ------------------------------------------------------------------ */
/* Ícones SVG                                                         */
/* ------------------------------------------------------------------ */
function IconBase({ size = 16, color = "currentColor", children, strokeWidth = 2 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">{children}</svg>;
}

const Icons = {
  Search: (p) => <IconBase {...p}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></IconBase>,
  Plus: (p) => <IconBase {...p}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></IconBase>,
  Laptop: (p) => <IconBase {...p}><path d="M4 5h16a1 1 0 0 1 1 1v10H3V6a1 1 0 0 1 1-1z" /><path d="M1 19h22" /></IconBase>,
  Desktop: (p) => <IconBase {...p}><rect x="3" y="4" width="13" height="10" rx="1.5" /><path d="M7 18h5M9.5 14v4" /><rect x="18" y="4" width="3.5" height="14" rx="1" /></IconBase>,
  Monitor: (p) => <IconBase {...p}><rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></IconBase>,
  Phone: (p) => <IconBase {...p}><rect x="6" y="2" width="12" height="20" rx="2.5" /><line x1="11" y1="18" x2="13" y2="18" /></IconBase>,
  Router: (p) => <IconBase {...p}><path d="M5 12.55a11 11 0 0 1 14.08 0" /><path d="M1.42 9a16 16 0 0 1 21.16 0" /><path d="M8.53 16.11a6 6 0 0 1 6.95 0" /><line x1="12" y1="20" x2="12.01" y2="20" /></IconBase>,
  Switch: (p) => <IconBase {...p}><rect x="2" y="7" width="20" height="10" rx="2" /><path d="M6 12h.01M10 12h.01M14 12h.01M18 12h.01" /></IconBase>,
  Cable: (p) => <IconBase {...p}><path d="M9 3v5a3 3 0 0 0 3 3v0a3 3 0 0 0 3-3V3" /><path d="M12 11v6" /><circle cx="12" cy="20" r="2" /></IconBase>,
  Keyboard: (p) => <IconBase {...p}><rect x="2" y="6" width="20" height="12" rx="2" /><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10" /></IconBase>,
  Mouse: (p) => <IconBase {...p}><rect x="6" y="3" width="12" height="18" rx="6" /><line x1="12" y1="7" x2="12" y2="11" /></IconBase>,
  Camera: (p) => <IconBase {...p}><circle cx="12" cy="10" r="6" /><circle cx="12" cy="10" r="2" /><path d="M8 20h8M12 16v4" /></IconBase>,
  Headphones: (p) => <IconBase {...p}><path d="M3 18v-6a9 9 0 0 1 18 0v6" /><path d="M21 19a2 2 0 0 1-2 2h-1v-6h3zM3 19a2 2 0 0 0 2 2h1v-6H3z" /></IconBase>,
  Printer: (p) => <IconBase {...p}><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></IconBase>,
  Plug: (p) => <IconBase {...p}><path d="M9 2v6M15 2v6M6 8h12v4a6 6 0 0 1-12 0z" /><path d="M12 18v4" /></IconBase>,
  Stand: (p) => <IconBase {...p}><rect x="4" y="3" width="16" height="10" rx="1.5" /><path d="M12 13v5M7 21h10" /></IconBase>,
  Box: (p) => <IconBase {...p}><path d="M21 8v13H3V8" /><path d="M1 3h22v5H1z" /><line x1="10" y1="12" x2="14" y2="12" /></IconBase>,
  Lock: (p) => <IconBase {...p}><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></IconBase>,
  Shield: (p) => <IconBase {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></IconBase>,
  ShieldCheck: (p) => <IconBase {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><polyline points="9 12 11 14 15 10" /></IconBase>,
  Windows: (p) => <IconBase {...p}><rect x="3" y="3" width="8" height="8" /><rect x="13" y="3" width="8" height="8" /><rect x="3" y="13" width="8" height="8" /><rect x="13" y="13" width="8" height="8" /></IconBase>,
  Activity: (p) => <IconBase {...p}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></IconBase>,
  Eye: (p) => <IconBase {...p}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></IconBase>,
  EyeOff: (p) => <IconBase {...p}><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></IconBase>,
  Copy: (p) => <IconBase {...p}><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></IconBase>,
  Close: (p) => <IconBase {...p}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></IconBase>,
  Save: (p) => <IconBase {...p}><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></IconBase>,
  Edit: (p) => <IconBase {...p}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z" /></IconBase>,
  Power: (p) => <IconBase {...p}><path d="M18.36 6.64a9 9 0 1 1-12.73 0" /><line x1="12" y1="2" x2="12" y2="12" /></IconBase>,
  AlertTriangle: (p) => <IconBase {...p}><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></IconBase>,
  Check: (p) => <IconBase {...p}><polyline points="20 6 9 17 4 12" /></IconBase>,
  Inbox: (p) => <IconBase {...p}><polyline points="22 12 16 12 14 15 10 15 8 12 2 12" /><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" /></IconBase>,
  Download: (p) => <IconBase {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></IconBase>,
  Table: (p) => <IconBase {...p}><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="21" x2="9" y2="9" /></IconBase>,
  Grid: (p) => <IconBase {...p}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></IconBase>,
  List: (p) => <IconBase {...p}><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></IconBase>,
  Users: (p) => <IconBase {...p}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></IconBase>,
  UserPlus: (p) => <IconBase {...p}><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" /></IconBase>,
  Undo: (p) => <IconBase {...p}><polyline points="9 14 4 9 9 4" /><path d="M20 20v-7a4 4 0 0 0-4-4H4" /></IconBase>,
  Filter: (p) => <IconBase {...p}><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></IconBase>,
  Calendar: (p) => <IconBase {...p}><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></IconBase>,
  ChevronRight: (p) => <IconBase {...p}><polyline points="9 18 15 12 9 6" /></IconBase>,
  External: (p) => <IconBase {...p}><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></IconBase>,
  Sort: (p) => <IconBase {...p}><path d="M3 6h13M3 12h9M3 18h5" /><polyline points="17 15 20 18 23 15" /><line x1="20" y1="6" x2="20" y2="18" /></IconBase>,
  Receipt: (p) => <IconBase {...p}><path d="M4 2v20l3-2 3 2 3-2 3 2 3-2 1 1V2l-1 1-3-2-3 2-3-2-3 2-3-2z" /><path d="M8 8h8M8 12h8M8 16h5" /></IconBase>,
  Building: (p) => <IconBase {...p}><rect x="4" y="2" width="16" height="20" rx="2" /><path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01" /></IconBase>,
  Truck: (p) => <IconBase {...p}><rect x="1" y="3" width="15" height="13" /><polygon points="16 8 20 8 23 11 23 16 16 16 16 8" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></IconBase>,
  Key: (p) => <IconBase {...p}><circle cx="7.5" cy="15.5" r="5.5" /><path d="M21 2l-9.6 9.6M15.5 7.5l3 3L22 7l-3-3" /></IconBase>,
};

/* ------------------------------------------------------------------ */
/* Avatares de colaborador                                            */
/* ------------------------------------------------------------------ */
const AVATAR_CORES = ["#d97706", "#2563eb", "#059669", "#7c3aed", "#db2777", "#0d9488", "#ea580c", "#4f46e5"];

function getIniciais(nome) {
  const partes = String(nome || "").trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

function corAvatar(nome) {
  let hash = 0;
  const s = String(nome || "");
  for (let i = 0; i < s.length; i++) hash = s.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_CORES[Math.abs(hash) % AVATAR_CORES.length];
}

const ModalPortal = ({ children }) => createPortal(children, document.body);

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */
async function gerarProximoInventario() {
  const { data, error } = await supabase.from("equipamentos").select("num_inventario").order("num_inventario", { ascending: false }).limit(1);
  if (error || !data || data.length === 0 || !data[0].num_inventario) return "0001";
  const proximo = parseInt(data[0].num_inventario, 10) + 1;
  return proximo.toString().padStart(4, "0");
}

const ESTADOS_EQUIP = [
  { value: "em_stock", label: "Em stock" },
  { value: "em_uso", label: "Em uso" },
  { value: "em_reparacao", label: "Em reparação" },
  { value: "reservado", label: "Reservado" },
  { value: "abatido", label: "Abatido" },
];
const ESTADOS_ACESSO = [
  { value: "ativo", label: "Ativo" },
  { value: "expirado", label: "Expirado / Bloqueado" },
  { value: "inativo", label: "Inativo" },
];

const ESTADOS_SOFTWARE = [
  { value: "ativo", label: "Ativo" },
  { value: "licenca_expirada", label: "Licença expirada" },
  { value: "arquivado", label: "Arquivado" },
];

const ENTIDADES_EMPRESA = ["Geoflicks", "Neomarca", "2 Siglas", "Factor Triplo"];

const SOFTWARE_TIPOS = [
  { id: "sistema_operativo", label: "Sistema operativo", nomes: ["Windows", "macOS", "Linux"] },
  { id: "suite_produtividade", label: "Suite de produtividade", nomes: ["Microsoft 365", "Office", "Google Workspace"] },
  { id: "seguranca", label: "Segurança", nomes: ["Antivírus", "EDR", "Firewall"] },
  { id: "outro", label: "Outro", nomes: ["Outro"] },
];

const CATEGORIAS_EQUIP = [
  { id: "computadores", label: "Computadores", icon: "Laptop", color: "#0ea5e9", tipos: ["Computador", "Portátil", "Monitor", "Telemóvel"] },
  { id: "rede", label: "Rede", icon: "Router", color: "#8b5cf6", tipos: ["Router", "Switch", "Access Point", "Cabo Ethernet", "Adaptadores"] },
  { id: "perifericos", label: "Periféricos e cabos", icon: "Keyboard", color: "#f59e0b", tipos: ["Teclado", "Rato", "Webcam", "Fones","Impressora", "Cabo HDMI", "Cabo de alimentação", "Carregador", "Base PC", "Base Monitor", "Cabos USB" ] },
  { id: "outro", label: "Outro", icon: "Box", color: "#64748b", tipos: ["Outro"] },
];

const TIPO_ICON = {
  "Computador": "Desktop", "Portátil": "Laptop", "Monitor": "Monitor", "Telemóvel": "Phone",
  "Router": "Router", "Switch": "Switch", "Access Point": "Router", "Cabo Ethernet": "Cable", "Adaptadores": "Plug",
  "Teclado": "Keyboard", "Rato": "Mouse", "Webcam": "Camera", "Fones": "Headphones", "Impressora": "Printer",
  "Cabo HDMI": "Cable", "Cabo de alimentação": "Plug", "Carregador": "Plug", "Base PC": "Stand", "Base Monitor": "Stand", "Cabos USB": "Cable",
  "Outro": "Box",
};

function getCategoriaEquip(tipo) {
  return CATEGORIAS_EQUIP.find((c) => c.tipos.includes(tipo)) || CATEGORIAS_EQUIP[CATEGORIAS_EQUIP.length - 1];
}

function getIconeTipo(tipo) {
  return Icons[TIPO_ICON[tipo]] || Icons[getCategoriaEquip(tipo).icon] || Icons.Box;
}

const ESTADO_MAP_EQUIP = {
  em_uso: { txt: "Em uso", cls: "is-green", color: "#16a34a" },
  em_stock: { txt: "Em stock", cls: "is-blue", color: "#0284c7" },
  em_reparacao: { txt: "Em reparação", cls: "is-amber", color: "#d97706" },
  reservado: { txt: "Reservado", cls: "is-purple", color: "#7c3aed" },
  abatido: { txt: "Abatido", cls: "is-red", color: "#dc2626" },
};
const ESTADO_MAP_ACESSO = {
  ativo: { txt: "Ativo", cls: "is-green" },
  expirado: { txt: "Expirado", cls: "is-red" },
  inativo: { txt: "Inativo", cls: "is-grey" },
};
const ESTADO_MAP_SOFTWARE = {
  ativo: { txt: "Ativo", cls: "is-green" },
  licenca_expirada: { txt: "Licença expirada", cls: "is-amber" },
  arquivado: { txt: "Arquivado", cls: "is-grey" },
};

function getCategoriaSoftware(tipo) {
  return SOFTWARE_TIPOS.find((c) => c.nomes.includes(tipo)) || SOFTWARE_TIPOS[SOFTWARE_TIPOS.length - 1];
}

function getIconeSoftware(tipo) {
  const categoria = getCategoriaSoftware(tipo);
  if (categoria.id === "sistema_operativo") return Icons.Windows;
  if (categoria.id === "suite_produtividade") return Icons.Grid;
  if (categoria.id === "seguranca") return Icons.Shield;
  return Icons.Box;
}

const SOFTWARE_COR = { sistema_operativo: "#0ea5e9", suite_produtividade: "#f97316", seguranca: "#16a34a", outro: "#64748b" };

const norm = (v) => String(v || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const fmtData = (v) => (v ? new Date(v).toLocaleDateString("pt-PT") : "—");

function diasAte(dateValue) {
  if (!dateValue) return null;
  const d = new Date(`${String(dateValue).slice(0, 10)}T23:59:59`);
  if (Number.isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - Date.now()) / 86400000);
}

function garantiaInfo(equip) {
  const fim = equip.prazo_garantia || equip.data_garantia;
  const dias = diasAte(fim);
  if (dias === null) return { tone: "none", label: "Sem garantia", dias: null, fim: null, pct: null };
  let pct = null;
  if (equip.data_aquisicao) {
    const ini = new Date(equip.data_aquisicao).getTime();
    const end = new Date(fim).getTime();
    if (end > ini) pct = Math.max(0, Math.min(100, ((Date.now() - ini) / (end - ini)) * 100));
  }
  if (dias < 0) return { tone: "expired", label: "Garantia expirada", dias, fim, pct: 100 };
  if (dias <= 90) return { tone: "soon", label: `Garantia: ${dias} dia${dias === 1 ? "" : "s"}`, dias, fim, pct };
  const meses = Math.round(dias / 30);
  return { tone: "ok", label: meses >= 12 ? `Garantia: ${(dias / 365).toFixed(1).replace(".", ",")} anos` : `Garantia: ${meses} meses`, dias, fim, pct };
}

/* ------------------------------------------------------------------ */
/* Subcomponentes                                                     */
/* ------------------------------------------------------------------ */
function StatusPill({ estado, map }) {
  const info = map[estado] || { txt: "—", cls: "is-grey" };
  return (
    <span className={`ti-pill ${info.cls}`}>
      <i />
      {info.txt}
    </span>
  );
}

function Avatar({ nome, url, size = 24 }) {
  const [erro, setErro] = useState(false);

  if (url && !erro) {
    return (
      <img
        src={url}
        alt={nome || "Colaborador"}
        className="ti-avatar is-img"
        style={{ width: size, height: size }}
        onError={() => setErro(true)}
      />
    );
  }
  if (!nome) {
    return <span className="ti-avatar is-empty" style={{ width: size, height: size }}><Icons.Box size={Math.round(size * 0.5)} /></span>;
  }
  return (
    <span className="ti-avatar" style={{ background: corAvatar(nome), width: size, height: size, fontSize: Math.max(9, Math.round(size * 0.36)) }}>
      {getIniciais(nome)}
    </span>
  );
}

function TipoTile({ tipo, size = 38 }) {
  const cat = getCategoriaEquip(tipo);
  const renderIcon = getIconeTipo(tipo);
  return (
    <span className="ti-tile" style={{ "--c": cat.color, width: size, height: size }}>
      {renderIcon({ size: Math.round(size * 0.48) })}
    </span>
  );
}

function GarantiaChip({ equip, compact = false }) {
  const g = garantiaInfo(equip);
  if (g.tone === "none") return compact ? <span className="ti-nil">—</span> : null;
  return (
    <span className={`ti-gchip is-${g.tone}`} title={`Garantia até ${fmtData(g.fim)}`}>
      <Icons.ShieldCheck size={12} />
      {compact ? (g.tone === "expired" ? "Expirada" : g.tone === "soon" ? `${g.dias}d` : fmtData(g.fim)) : g.label}
    </span>
  );
}

function StackBar({ data, onPick }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  return (
    <div className="ti-stack">
      <div className="ti-stack-bar">
        {data.map((d) => (
          <button
            key={d.key}
            type="button"
            className="ti-stack-seg"
            style={{ flexGrow: d.value, background: d.color }}
            title={`${d.label}: ${d.value}`}
            onClick={() => onPick && onPick(d.key)}
          />
        ))}
      </div>
      <div className="ti-stack-legend">
        {data.map((d) => (
          <button key={d.key} type="button" onClick={() => onPick && onPick(d.key)}>
            <i style={{ background: d.color }} />
            <span>{d.label}</span>
            <b>{d.value}</b>
            <em>{Math.round((d.value / total) * 100)}%</em>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Página principal                                                   */
/* ------------------------------------------------------------------ */
export default function AtivosTIDashboard() {
  const [tab, setTab] = useState("painel");
  const [query, setQuery] = useState("");
  const [filtroEstadoEquip, setFiltroEstadoEquip] = useState("todos");
  const [filtroEstadoAcesso, setFiltroEstadoAcesso] = useState("todos");
  const [filtroEstadoSoftware, setFiltroEstadoSoftware] = useState("todos");

  // Explorador de equipamentos
  const [equipView, setEquipView] = useState(() => {
    try { return localStorage.getItem("ti_equip_view") || "lista"; } catch { return "lista"; }
  });
  const [pessoaSel, setPessoaSel] = useState("");
  const [kitCat, setKitCat] = useState("");
  const [kitExpand, setKitExpand] = useState({});
  const [fCat, setFCat] = useState("");
  const [fTipo, setFTipo] = useState("");
  const [fEntidade, setFEntidade] = useState("");
  const [fColab, setFColab] = useState("");
  const [fGarantia, setFGarantia] = useState("");
  const [sortBy, setSortBy] = useState("inv_desc");
  const [detailId, setDetailId] = useState(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const searchRef = useRef(null);
  const pendingDetailRef = useRef(null);

  const [equipamentos, setEquipamentos] = useState([]);
  const [software, setSoftware] = useState([]);
  const [acessos, setAcessos] = useState([]);
  const [utilizadores, setUtilizadores] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [notification, setNotification] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [revealed, setRevealed] = useState({});
  const [showFormPass, setShowFormPass] = useState(false);

  const notify = (message, type = "success") => {
    setNotification({ message, type, key: Date.now() });
    setTimeout(() => setNotification((n) => (n && n.message === message ? null : n)), 3000);
  };

  const handleCopyPassword = async (password) => {
    try {
      await navigator.clipboard.writeText(password);
      notify("Palavra-passe copiada.");
    } catch {
      notify("Não foi possível copiar a palavra-passe.", "error");
    }
  };

  const handleCopyText = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text || "");
      notify(`${label} copiado.`);
    } catch {
      notify(`Não foi possível copiar ${label.toLowerCase()}.`, "error");
    }
  };

  const [showModal, setShowModal] = useState(false);
  const [isClosingPanel, setIsClosingPanel] = useState(false);
  const [modalType, setModalType] = useState("equipamento");
  const [editingId, setEditingId] = useState(null);

  const initEquip = {
    num_inventario: "",
    tipo: "Computador",
    modelo: "",
    colaborador: "",
    estado: "em_stock",
    nome_pc: "",
    entidade: "",
    fornecedor: "",
    fatura: "",
    data_aquisicao: "",
    prazo_garantia: "",
  };
  const initSoftware = {
    codigo: "",
    nome: "",
    tipo: "Windows",
    versao: "",
    entidade: "",
    fornecedor: "",
    fatura: "",
    data_aquisicao: "",
    data_expiracao: "",
    estado: "ativo",
    licenca_chave: "",
  };
  const initAcesso = { nome_plataforma: "", url: "", username: "", password: "", estado: "ativo" };

  const [formEquip, setFormEquip] = useState(initEquip);
  const [formSoftware, setFormSoftware] = useState(initSoftware);
  const [formAcesso, setFormAcesso] = useState(initAcesso);

  const carregarDados = useCallback(async () => {
    try {
      const [equipResult, softwareResult, acessosResult, perfisResult] = await Promise.all([
        supabase.from("equipamentos").select("*").order("created_at", { ascending: false }),
        supabase.from("software").select("*").order("created_at", { ascending: false }),
        supabase.from("acessos").select("*").order("nome_plataforma", { ascending: true }),
        supabase.from("profiles").select("id, nome, avatar_url").eq("ativo", true),
      ]);
      if (equipResult.data) setEquipamentos(equipResult.data);
      if (softwareResult.data) setSoftware(softwareResult.data);
      if (acessosResult.data) setAcessos(acessosResult.data);
      if (perfisResult.data) setUtilizadores(perfisResult.data);
      if (equipResult.error) throw equipResult.error;
      if (softwareResult.error) throw softwareResult.error;
      if (acessosResult.error) throw acessosResult.error;
      if (perfisResult.error) throw perfisResult.error;
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      notify("Não foi possível carregar os dados.", "error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { carregarDados(); }, [carregarDados]);

  useEffect(() => {
    try { localStorage.setItem("ti_equip_view", equipView); } catch { /* sem armazenamento */ }
  }, [equipView]);

  async function handleNovo() {
    const tipo = tab === "acessos" ? "acesso" : tab === "software" ? "software" : "equipamento";
    if (tab === "equip_inativos") setTab("equip_ativos");
    setModalType(tipo);
    setEditingId(null);
    setShowFormPass(false);
    setFormEquip({ ...initEquip });
    setFormSoftware({ ...initSoftware });
    setFormAcesso({ ...initAcesso });

    if (tipo === "equipamento") {
      const proximo = await gerarProximoInventario();
      setFormEquip((prev) => ({ ...prev, num_inventario: proximo }));
    } else if (tipo === "software") {
      setFormSoftware((prev) => ({ ...prev, codigo: `SW-${String(Date.now()).slice(-6)}` }));
    }
    setIsClosingPanel(false);
    setShowModal(true);
  }

  async function switchModalType(tipo) {
    setModalType(tipo);
    if (tipo === "equipamento" && !formEquip.num_inventario) {
      const proximo = await gerarProximoInventario();
      setFormEquip((prev) => ({ ...prev, num_inventario: proximo }));
    }
    if (tipo === "software" && !formSoftware.codigo) {
      setFormSoftware((prev) => ({ ...prev, codigo: `SW-${String(Date.now()).slice(-6)}` }));
    }
  }

  function handleEditar(tipo, registo) {
    setModalType(tipo);
    setEditingId(registo.id);
    setShowFormPass(false);
    if (tipo === "equipamento") {
      setFormEquip({
        num_inventario: registo.num_inventario || "",
        tipo: registo.tipo || "Computador",
        modelo: registo.modelo || "",
        colaborador: registo.colaborador || "",
        estado: registo.estado || "em_stock",
        nome_pc: registo.nome_pc || "",
        entidade: registo.entidade || "",
        fornecedor: registo.fornecedor || "",
        fatura: registo.fatura || "",
        data_aquisicao: registo.data_aquisicao || "",
        prazo_garantia: registo.prazo_garantia || registo.data_garantia || "",
      });
    } else if (tipo === "software") {
      setFormSoftware({
        codigo: registo.codigo || "",
        nome: registo.nome || "",
        tipo: registo.tipo || "Windows",
        versao: registo.versao || "",
        entidade: registo.entidade || "",
        fornecedor: registo.fornecedor || "",
        fatura: registo.fatura || "",
        data_aquisicao: registo.data_aquisicao || "",
        data_expiracao: registo.data_expiracao || "",
        estado: registo.estado || "ativo",
        licenca_chave: registo.licenca_chave || "",
      });
    } else {
      setFormAcesso({
        nome_plataforma: registo.nome_plataforma || "",
        url: registo.url || "",
        username: registo.username || "",
        password: registo.password || "",
        estado: registo.estado || "ativo",
      });
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
      setEditingId(null);
    }, 300);
  }

  function handleToggleEstado(tipo, registo) {
    const isEquip = tipo === "equipamento";
    const isSoftware = tipo === "software";
    const inativoAgora = isEquip
      ? registo.estado === "abatido"
      : isSoftware
        ? (registo.estado === "arquivado" || registo.estado === "licenca_expirada")
        : (registo.estado === "expirado" || registo.estado === "inativo");
    const novoEstado = isEquip
      ? (inativoAgora ? "em_stock" : "abatido")
      : isSoftware
        ? (inativoAgora ? "ativo" : "arquivado")
        : (inativoAgora ? "ativo" : "inativo");
    const acao = inativoAgora ? "reativar" : "inativar";
    const nome = isEquip ? (registo.modelo || registo.num_inventario) : isSoftware ? registo.nome : registo.nome_plataforma;

    setConfirmModal({ tipo, registo, isEquip, isSoftware, novoEstado, acao, nome, perigoso: !inativoAgora });
  }

  async function confirmarToggleEstado() {
    if (!confirmModal) return;
    const { isEquip, isSoftware, registo, novoEstado, acao, nome } = confirmModal;
    setIsConfirming(true);
    try {
      const { error } = await supabase.from(isEquip ? "equipamentos" : isSoftware ? "software" : "acessos")
        .update({ estado: novoEstado }).eq("id", registo.id);
      if (error) throw error;
      notify(acao === "inativar" ? `"${nome}" foi inativado.` : `"${nome}" foi reativado.`);
      await carregarDados();
      setConfirmModal(null);
    } catch (err) {
      notify(err.message, "error");
    } finally {
      setIsConfirming(false);
    }
  }

  // Atribuição rápida a partir do detalhe
  async function atribuirEquipamento(equip, colabId) {
    try {
      const payload = colabId
        ? { colaborador: colabId, estado: "em_uso" }
        : { colaborador: null, estado: "em_stock" };
      const { error } = await supabase.from("equipamentos").update(payload).eq("id", equip.id);
      if (error) throw error;
      const nomeColab = colabId ? (colaboradoresMap[colabId]?.nome || "colaborador") : null;
      notify(colabId ? `${equip.modelo || equip.num_inventario} atribuído a ${nomeColab}.` : `${equip.modelo || equip.num_inventario} devolvido ao stock.`);
      setAssignOpen(false);
      await carregarDados();
    } catch (err) {
      notify("Erro ao atualizar: " + err.message, "error");
    }
  }

  async function handleSubmitAtivo(e) {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (modalType === "equipamento") {
        const payload = {
          ...formEquip,
          colaborador: formEquip.colaborador || null,
          entidade: formEquip.entidade || null,
          fornecedor: formEquip.fornecedor || null,
          fatura: formEquip.fatura || null,
          data_aquisicao: formEquip.data_aquisicao || null,
          prazo_garantia: formEquip.prazo_garantia || null,
          data_garantia: formEquip.prazo_garantia || null,
        };
        const { error } = editingId
          ? await supabase.from("equipamentos").update(payload).eq("id", editingId)
          : await supabase.from("equipamentos").insert([payload]);
        if (error) throw error;
      } else if (modalType === "software") {
        const payload = {
          ...formSoftware,
          entidade: formSoftware.entidade || null,
          fornecedor: formSoftware.fornecedor || null,
          fatura: formSoftware.fatura || null,
          data_aquisicao: formSoftware.data_aquisicao || null,
          data_expiracao: formSoftware.data_expiracao || null,
          licenca_chave: formSoftware.licenca_chave || null,
        };
        const { error } = editingId
          ? await supabase.from("software").update(payload).eq("id", editingId)
          : await supabase.from("software").insert([payload]);
        if (error) throw error;
      } else {
        const { error } = editingId
          ? await supabase.from("acessos").update(formAcesso).eq("id", editingId)
          : await supabase.from("acessos").insert([formAcesso]);
        if (error) throw error;
      }
      notify(editingId ? "Registo atualizado." : "Registo criado.");
      await carregarDados();
      closePanel();
    } catch (err) {
      console.error(err);
      notify("Erro ao gravar dados: " + err.message, "error");
    } finally {
      setIsSaving(false);
    }
  }

  const colaboradoresMap = useMemo(
    () => Object.fromEntries(utilizadores.map((u) => [u.id, { nome: u.nome, avatar_url: u.avatar_url }])),
    [utilizadores]
  );

  const utilizadoresOrdenados = useMemo(
    () => [...utilizadores].sort((a, b) => String(a.nome || "").localeCompare(String(b.nome || ""), "pt-PT")),
    [utilizadores]
  );

  /* ---------------- Software / Acessos ---------------- */
  const softwareFiltrado = useMemo(() => software
    .filter((item) => {
      if (filtroEstadoSoftware === "todos") return true;
      return (item.estado || "ativo") === filtroEstadoSoftware;
    })
    .filter((item) => norm(`${item.codigo || ""} ${item.nome || ""} ${item.versao || ""} ${item.entidade || ""} ${item.fornecedor || ""} ${item.tipo || ""}`).includes(norm(query))),
  [software, filtroEstadoSoftware, query]);

  const acessosFiltrados = useMemo(() => acessos
    .filter((a) => {
      if (filtroEstadoAcesso === "todos") return true;
      if (filtroEstadoAcesso === "revisao") return a.estado === "expirado" || a.estado === "inativo";
      return (a.estado || "ativo") === filtroEstadoAcesso;
    })
    .filter((a) => norm(`${a.nome_plataforma || ""} ${a.url || ""} ${a.username || ""}`).includes(norm(query))),
  [acessos, filtroEstadoAcesso, query]);

  const softwarePorCategoria = useMemo(() => {
    const grupos = {};
    softwareFiltrado.forEach((item) => {
      const cat = getCategoriaSoftware(item.tipo);
      if (!grupos[cat.id]) grupos[cat.id] = { id: cat.id, label: cat.label, itens: [] };
      grupos[cat.id].itens.push(item);
    });
    return SOFTWARE_TIPOS.map((c) => grupos[c.id]).filter(Boolean);
  }, [softwareFiltrado]);

  const acessosPorEstado = useMemo(() => {
    const grupos = {};
    acessosFiltrados.forEach((a) => {
      const key = a.estado === "expirado" || a.estado === "inativo" ? "revisao" : "ativo";
      if (!grupos[key]) grupos[key] = { key, label: key === "ativo" ? "Ativos" : "A rever (expirado / inativo)", itens: [] };
      grupos[key].itens.push(a);
    });
    return ["ativo", "revisao"].map((k) => grupos[k]).filter(Boolean);
  }, [acessosFiltrados]);

  /* ---------------- Equipamentos: explorador ---------------- */
  const isEquipTab = tab === "equip_ativos" || tab === "equip_inativos";
  const equipBase = useMemo(() => equipamentos.filter((e) => (tab === "equip_inativos" ? e.estado === "abatido" : e.estado !== "abatido")), [equipamentos, tab]);

  const equipPesquisa = useMemo(() => {
    const q = norm(query.trim());
    if (!q) return equipBase;
    return equipBase.filter((e) => norm(`${e.num_inventario || ""} ${e.modelo || ""} ${e.nome_pc || ""} ${e.tipo || ""} ${colaboradoresMap[e.colaborador]?.nome || ""} ${e.entidade || ""} ${e.fornecedor || ""} ${e.fatura || ""}`).includes(q));
  }, [equipBase, query, colaboradoresMap]);

  const passaFiltros = useCallback((e, ignorar = "") => {
    if (ignorar !== "cat" && fCat && getCategoriaEquip(e.tipo).id !== fCat) return false;
    if (ignorar !== "tipo" && fTipo && e.tipo !== fTipo) return false;
    if (ignorar !== "estado" && filtroEstadoEquip !== "todos" && e.estado !== filtroEstadoEquip) return false;
    if (ignorar !== "entidade" && fEntidade && (fEntidade === "__none__" ? !!e.entidade : e.entidade !== fEntidade)) return false;
    if (ignorar !== "colab" && fColab) {
      if (fColab === "__none__") { if (e.colaborador) return false; }
      else if (e.colaborador !== fColab) return false;
    }
    if (ignorar !== "garantia" && fGarantia) {
      const g = garantiaInfo(e).tone;
      if (fGarantia === "soon" && g !== "soon") return false;
      if (fGarantia === "expired" && g !== "expired") return false;
      if (fGarantia === "ok" && g !== "ok") return false;
      if (fGarantia === "none" && g !== "none") return false;
    }
    return true;
  }, [fCat, fTipo, filtroEstadoEquip, fEntidade, fColab, fGarantia]);

  const equipFiltrados = useMemo(() => {
    const list = equipPesquisa.filter((e) => passaFiltros(e));
    const byInv = (a, b) => String(a.num_inventario || "").localeCompare(String(b.num_inventario || ""), "pt-PT", { numeric: true });
    const sorters = {
      inv_desc: (a, b) => byInv(b, a),
      inv_asc: byInv,
      modelo: (a, b) => String(a.modelo || "").localeCompare(String(b.modelo || ""), "pt-PT"),
      colab: (a, b) => String(colaboradoresMap[a.colaborador]?.nome || "~").localeCompare(String(colaboradoresMap[b.colaborador]?.nome || "~"), "pt-PT"),
      garantia: (a, b) => (garantiaInfo(a).dias ?? 99999) - (garantiaInfo(b).dias ?? 99999),
      recentes: (a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")),
    };
    return [...list].sort(sorters[sortBy] || sorters.inv_desc);
  }, [equipPesquisa, passaFiltros, sortBy, colaboradoresMap]);

  // Contagens das facetas (cada faceta ignora o seu próprio filtro)
  const facet = useMemo(() => {
    const count = (ignorar, keyFn) => {
      const m = {};
      equipPesquisa.forEach((e) => {
        if (!passaFiltros(e, ignorar)) return;
        const k = keyFn(e);
        m[k] = (m[k] || 0) + 1;
      });
      return m;
    };
    return {
      cat: count("cat", (e) => getCategoriaEquip(e.tipo).id),
      tipo: count("tipo", (e) => e.tipo),
      estado: count("estado", (e) => e.estado),
      entidade: count("entidade", (e) => e.entidade || "__none__"),
      colab: count("colab", (e) => e.colaborador || "__none__"),
      garantia: count("garantia", (e) => garantiaInfo(e).tone),
    };
  }, [equipPesquisa, passaFiltros]);

  const filtrosAtivos = [
    fCat && { key: "cat", label: CATEGORIAS_EQUIP.find((c) => c.id === fCat)?.label, clear: () => { setFCat(""); setFTipo(""); } },
    fTipo && { key: "tipo", label: fTipo, clear: () => setFTipo("") },
    filtroEstadoEquip !== "todos" && { key: "estado", label: ESTADO_MAP_EQUIP[filtroEstadoEquip]?.txt, clear: () => setFiltroEstadoEquip("todos") },
    fEntidade && { key: "entidade", label: fEntidade === "__none__" ? "Sem entidade" : fEntidade, clear: () => setFEntidade("") },
    fColab && { key: "colab", label: fColab === "__none__" ? "Sem colaborador" : (colaboradoresMap[fColab]?.nome || "Colaborador"), clear: () => setFColab("") },
    fGarantia && { key: "garantia", label: { soon: "Garantia a expirar", expired: "Garantia expirada", ok: "Com garantia", none: "Sem garantia" }[fGarantia], clear: () => setFGarantia("") },
  ].filter(Boolean);

  const limparFiltros = () => {
    setFCat(""); setFTipo(""); setFiltroEstadoEquip("todos"); setFEntidade(""); setFColab(""); setFGarantia(""); setQuery("");
  };

  const abrirExplorador = ({ cat = "", estado = "todos", colab = "", garantia = "", tipo = "", entidade = "" } = {}) => {
    setTab("equip_ativos");
    setFCat(cat); setFTipo(tipo); setFiltroEstadoEquip(estado); setFColab(colab); setFGarantia(garantia); setFEntidade(entidade);
    setTimeout(() => setQuery(""), 0);
  };

  const equipPorPessoa = useMemo(() => {
    const grupos = {};
    equipFiltrados.forEach((e) => {
      const key = e.colaborador && colaboradoresMap[e.colaborador] ? e.colaborador : "__none__";
      if (!grupos[key]) {
        grupos[key] = key === "__none__"
          ? { key, nome: null, avatar_url: null, itens: [] }
          : { key, nome: colaboradoresMap[key].nome, avatar_url: colaboradoresMap[key].avatar_url, itens: [] };
      }
      grupos[key].itens.push(e);
    });
    return Object.values(grupos).sort((a, b) => {
      if (a.key === "__none__") return 1;
      if (b.key === "__none__") return -1;
      return String(a.nome).localeCompare(String(b.nome), "pt-PT");
    });
  }, [equipFiltrados, colaboradoresMap]);

  const pessoaAtiva = useMemo(() => {
    if (!equipPorPessoa.length) return null;
    return equipPorPessoa.find((g) => g.key === (fColab || pessoaSel))
      || equipPorPessoa.find((g) => g.key === "__none__")
      || equipPorPessoa[0];
  }, [equipPorPessoa, pessoaSel, fColab]);

  const kitGrupos = useMemo(() => {
    if (!pessoaAtiva) return [];
    // Stock: agrupado por tipo (muitos itens). Pessoa: agrupado por categoria (kit curto).
    const porTipo = pessoaAtiva.key === "__none__";
    const grupos = {};
    pessoaAtiva.itens.forEach((e) => {
      const cat = getCategoriaEquip(e.tipo);
      if (kitCat && cat.id !== kitCat) return;
      const k = porTipo ? (e.tipo || "Outro") : cat.id;
      if (!grupos[k]) grupos[k] = { key: k, label: porTipo ? k : cat.label, porTipo, cat, itens: [] };
      grupos[k].itens.push(e);
    });
    const ordemCat = CATEGORIAS_EQUIP.map((c) => c.id);
    return Object.values(grupos).sort((a, b) =>
      (ordemCat.indexOf(a.cat.id) - ordemCat.indexOf(b.cat.id))
      || (b.itens.length - a.itens.length)
      || a.label.localeCompare(b.label, "pt-PT"));
  }, [pessoaAtiva, kitCat]);

  const contarCategorias = (itens) => CATEGORIAS_EQUIP
    .map((c) => ({ c, n: itens.filter((e) => getCategoriaEquip(e.tipo).id === c.id).length }))
    .filter((x) => x.n > 0);

  const stockDisponivel = useMemo(
    () => equipamentos
      .filter((e) => e.estado === "em_stock")
      .sort((a, b) => String(b.num_inventario || "").localeCompare(String(a.num_inventario || ""), "pt-PT", { numeric: true })),
    [equipamentos]
  );

  const escolherPessoa = (key) => {
    setPessoaSel(key);
    setKitCat("");
    setKitExpand({});
    if (fColab && fColab !== key) setFColab("");
  };

  const detailEquip = useMemo(() => equipamentos.find((e) => e.id === detailId) || null, [equipamentos, detailId]);

  useEffect(() => {
    const onKey = (ev) => {
      const tag = (ev.target?.tagName || "").toLowerCase();
      const typing = tag === "input" || tag === "textarea" || tag === "select" || ev.target?.isContentEditable;
      if (ev.key === "/" && !typing && (isEquipTab || tab === "software" || tab === "acessos")) {
        ev.preventDefault();
        searchRef.current?.focus();
      }
      if (ev.key === "Escape" && detailId && !showModal && !confirmModal) {
        setDetailId(null);
        setAssignOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isEquipTab, tab, detailId, showModal, confirmModal]);

  /* ---------------- Totais / painel ---------------- */
  const totalAtivos = equipamentos.filter((e) => e.estado !== "abatido").length;
  const totalEmUso = equipamentos.filter((e) => e.estado === "em_uso").length;
  const totalEmStock = equipamentos.filter((e) => e.estado === "em_stock").length;
  const totalSoftwareAtivos = software.filter((item) => (item.estado || "ativo") === "ativo").length;
  const totalSoftwareExpirados = software.filter((item) => item.estado === "licenca_expirada").length;
  const totalAcessosProblema = acessos.filter((a) => a.estado === "expirado" || a.estado === "inativo").length;
  const garantiasAExpirar = useMemo(() => equipamentos
    .filter((e) => e.estado !== "abatido")
    .map((e) => ({ e, g: garantiaInfo(e) }))
    .filter(({ g }) => g.tone === "soon" || g.tone === "expired")
    .sort((a, b) => a.g.dias - b.g.dias), [equipamentos]);
  const licencasAExpirar = useMemo(() => software
    .filter((s) => (s.estado || "ativo") === "ativo" && s.data_expiracao)
    .map((s) => ({ s, dias: diasAte(s.data_expiracao) }))
    .filter(({ dias }) => dias !== null && dias <= 60)
    .sort((a, b) => a.dias - b.dias), [software]);

  const estadoEquipData = useMemo(
    () => ESTADOS_EQUIP
      .map((s) => ({ key: s.value, label: s.label, value: equipamentos.filter((e) => e.estado === s.value).length, color: ESTADO_MAP_EQUIP[s.value].color }))
      .filter((d) => d.value > 0),
    [equipamentos]
  );

  const categoriasResumo = useMemo(() => CATEGORIAS_EQUIP.map((c) => {
    const itens = equipamentos.filter((e) => e.estado !== "abatido" && getCategoriaEquip(e.tipo).id === c.id);
    const tipos = {};
    itens.forEach((e) => { tipos[e.tipo] = (tipos[e.tipo] || 0) + 1; });
    return {
      ...c,
      total: itens.length,
      emUso: itens.filter((e) => e.estado === "em_uso").length,
      emStock: itens.filter((e) => e.estado === "em_stock").length,
      topTipos: Object.entries(tipos).sort((a, b) => b[1] - a[1]).slice(0, 3),
    };
  }), [equipamentos]);

  const atribuidosPorPessoa = useMemo(() => {
    const grupos = {};
    equipamentos
      .filter((e) => e.estado === "em_uso" && e.colaborador)
      .forEach((e) => {
        const info = colaboradoresMap[e.colaborador];
        if (!info) return;
        if (!grupos[e.colaborador]) grupos[e.colaborador] = { id: e.colaborador, nome: info.nome, avatar_url: info.avatar_url, itens: [] };
        grupos[e.colaborador].itens.push(e);
      });
    return Object.values(grupos).sort((a, b) => b.itens.length - a.itens.length);
  }, [equipamentos, colaboradoresMap]);

  const handleExportPDF = () => {
    try {
      // Filtrar os equipamentos que estão em stock
      const equipamentosEmStock = equipamentos.filter((e) => e.estado === "em_stock");

      // Verificar se há de facto alguma coisa para exportar (atribuídos OU em stock)
      if (atribuidosPorPessoa.length === 0 && equipamentosEmStock.length === 0) {
        notify("Não existem equipamentos no sistema para exportar.", "error");
        return;
      }

      const doc = new jsPDF();
      const dataHora = new Date().toLocaleString("pt-PT");
      let adicionouPagina = false;

      // 1. GERAR PÁGINAS POR COLABORADOR
      atribuidosPorPessoa.forEach((pessoa, index) => {
        if (index > 0) doc.addPage();
        adicionouPagina = true;

        doc.setFontSize(16);
        doc.setTextColor(15, 23, 42);
        doc.text(`Ativos TI Atribuídos: ${pessoa.nome}`, 14, 22);

        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139);
        doc.text(`Gerado a: ${dataHora} | Total de equipamentos: ${pessoa.itens.length}`, 14, 28);

        const tableData = pessoa.itens.map((item) => [
          item.num_inventario || "-",
          item.tipo || "-",
          item.modelo || "-",
          item.nome_pc || "-",
          ESTADO_MAP_EQUIP[item.estado]?.txt || item.estado
        ]);

        autoTable(doc, {
          startY: 35,
          head: [["Nº Inv.", "Tipo", "Modelo", "Descrição", "Estado"]],
          body: tableData,
          headStyles: { fillColor: [59, 130, 246] },
          styles: { fontSize: 10, cellPadding: 4 },
          alternateRowStyles: { fillColor: [248, 250, 252] }
        });
      });

      // 2. GERAR PÁGINA DE STOCK (se existirem equipamentos em stock)
      if (equipamentosEmStock.length > 0) {
        if (adicionouPagina) {
          doc.addPage();
        }

        doc.setFontSize(16);
        doc.setTextColor(15, 23, 42);
        doc.text("Ativos TI: Em Stock (Disponíveis)", 14, 22);

        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139);
        doc.text(`Gerado a: ${dataHora} | Total em stock: ${equipamentosEmStock.length}`, 14, 28);

        const tableDataStock = equipamentosEmStock.map((item) => [
          item.num_inventario || "-",
          item.tipo || "-",
          item.modelo || "-",
          item.nome_pc || "-",
          ESTADO_MAP_EQUIP[item.estado]?.txt || item.estado
        ]);

        autoTable(doc, {
          startY: 35,
          head: [["Nº Inv.", "Tipo", "Modelo", "Descrição", "Estado"]],
          body: tableDataStock,
          headStyles: { fillColor: [100, 116, 139] },
          styles: { fontSize: 10, cellPadding: 4 },
          alternateRowStyles: { fillColor: [248, 250, 252] }
        });
      }

      doc.save("inventario_ativos_ti.pdf");
      notify("PDF gerado e transferido com sucesso!");

    } catch (error) {
      console.error("Erro ao gerar o PDF:", error);
      notify("Erro ao gerar PDF. Verifica a consola.", "error");
    }
  };

  const handleExportExcel = () => {
    try {
      // 1. Preparar dados dos Equipamentos Atribuídos
      const equipamentosEmUso = equipamentos.filter((e) => e.estado === "em_uso" && e.colaborador);
      const dadosAtribuidos = equipamentosEmUso.map(item => ({
        "Nº Inventário": item.num_inventario || "-",
        "Tipo": item.tipo || "-",
        "Modelo": item.modelo || "-",
        "Descrição": item.nome_pc || "-",
        "Colaborador": colaboradoresMap[item.colaborador]?.nome || "Desconhecido",
        "Estado": ESTADO_MAP_EQUIP[item.estado]?.txt || item.estado
      }));

      // 2. Preparar dados dos Equipamentos Em Stock
      const equipamentosEmStock = equipamentos.filter((e) => e.estado === "em_stock");
      const dadosStock = equipamentosEmStock.map(item => ({
        "Nº Inventário": item.num_inventario || "-",
        "Tipo": item.tipo || "-",
        "Modelo": item.modelo || "-",
        "Descrição": item.nome_pc || "-",
        "Estado": ESTADO_MAP_EQUIP[item.estado]?.txt || item.estado
      }));

      if (dadosAtribuidos.length === 0 && dadosStock.length === 0) {
        notify("Não existem equipamentos para exportar.", "error");
        return;
      }

      const wb = XLSX.utils.book_new();
      if (dadosAtribuidos.length > 0) {
        const wsAtribuidos = XLSX.utils.json_to_sheet(dadosAtribuidos);
        XLSX.utils.book_append_sheet(wb, wsAtribuidos, "Atribuídos");
      }
      if (dadosStock.length > 0) {
        const wsStock = XLSX.utils.json_to_sheet(dadosStock);
        XLSX.utils.book_append_sheet(wb, wsStock, "Em Stock");
      }
      XLSX.writeFile(wb, "inventario_ativos_ti.xlsx");
      notify("Excel gerado e transferido com sucesso!");

    } catch (error) {
      console.error("Erro ao gerar o Excel:", error);
      notify("Erro ao gerar Excel. Verifica a consola.", "error");
    }
  };

  const recentes = useMemo(() => [...equipamentos].slice(0, 6), [equipamentos]);

  useEffect(() => {
    setQuery("");
    setAssignOpen(false);
    setDetailId(pendingDetailRef.current);
    pendingDetailRef.current = null;
  }, [tab]);

  const abrirDetalhe = (equip) => {
    const alvo = equip.estado === "abatido" ? "equip_inativos" : "equip_ativos";
    if (tab === alvo) { setDetailId(equip.id); return; }
    pendingDetailRef.current = equip.id;
    setTab(alvo);
  };

  /* ---------------- Render helpers ---------------- */
  const renderColab = (e, size = 26) => {
    const info = colaboradoresMap[e.colaborador];
    if (!info) {
      return (
        <span className="ti-colab is-none">
          <span className="ti-avatar is-empty" style={{ width: size, height: size }}><Icons.Box size={Math.round(size * 0.5)} /></span>
          <span>{e.estado === "em_stock" ? "Em stock" : "Sem colaborador"}</span>
        </span>
      );
    }
    return (
      <span className="ti-colab">
        <Avatar nome={info.nome} url={info.avatar_url} size={size} />
        <span>{info.nome}</span>
      </span>
    );
  };

  const facetRow = (key, label, count, active, onClick, extra = null) => (
    <button key={key} type="button" className={`ti-facet-row ${active ? "is-on" : ""} ${!count && !active ? "is-zero" : ""}`} onClick={onClick}>
      {extra}
      <span className="ti-facet-label">{label}</span>
      <em>{count || 0}</em>
    </button>
  );

  const TABS = [
    { id: "painel", label: "Painel", icon: Icons.Activity },
    { id: "equip_ativos", label: "Equipamentos", icon: Icons.Laptop, n: totalAtivos },
    { id: "equip_inativos", label: "Abatidos", icon: Icons.Power, n: equipamentos.length - totalAtivos },
    { id: "software", label: "Software", icon: Icons.Box, n: software.length },
    { id: "acessos", label: "Acessos", icon: Icons.Lock, n: acessos.length, alert: totalAcessosProblema > 0 },
  ];

  const modalAccent = modalType === "equipamento" ? getCategoriaEquip(formEquip.tipo).color : modalType === "software" ? SOFTWARE_COR[getCategoriaSoftware(formSoftware.tipo).id] : "#7c3aed";

  return (
    <div className="page-container ti-page">
      {notification && (
        <div className={`ti-toast ${notification.type === "error" ? "is-error" : ""}`} key={notification.key}>
          {notification.type === "success" ? <Icons.Check size={15} /> : <Icons.AlertTriangle size={15} />}
          {notification.message}
        </div>
      )}

      {/* HERO */}
      <header className="ti-hero">
        <div className="ti-hero-bg"><span className="ti-orb ti-orb-a" /><span className="ti-orb ti-orb-b" /><span className="ti-grid-pattern" /></div>
        <div className="ti-hero-row">
          <div className="ti-hero-main">
            <span className="ti-hero-icon"><Icons.Laptop size={26} /></span>
            <div>
              <h1>Ativos TI</h1>
              <p>Equipamentos, software e acessos da organização num só sítio.</p>
            </div>
          </div>
          <div className="ti-hero-actions">
            <button type="button" onClick={handleExportExcel} className="ti-hero-btn" title="Exportar para Excel">
              <Icons.Table size={16} /> Excel
            </button>
            <button type="button" onClick={handleExportPDF} className="ti-hero-btn" title="Exportar ativos por pessoa">
              <Icons.Download size={16} /> PDF
            </button>
            <button type="button" onClick={handleNovo} className="ti-cta">
              <Icons.Plus size={16} /> Novo Registo
            </button>
          </div>
        </div>
        <div className="ti-hero-tools">
          <div className="ti-scope" role="tablist">
            {TABS.map((t) => {
              const TabIcon = t.icon;
              return (
                <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={tab === t.id ? "is-on" : ""} onClick={() => setTab(t.id)}>
                  <TabIcon size={15} /> {t.label}
                  {t.n !== undefined && <em className={t.alert ? "is-alert" : ""}>{t.n}</em>}
                </button>
              );
            })}
          </div>
          <div className="ti-hero-stats">
            <span className="ti-stat"><strong>{totalEmUso}</strong> em uso</span>
            <span className="ti-stat"><strong>{totalEmStock}</strong> em stock</span>
            {garantiasAExpirar.length > 0 && (
              <button type="button" className="ti-stat is-alert" onClick={() => abrirExplorador({ garantia: "soon" })}>
                <strong>{garantiasAExpirar.length}</strong> garantias a rever
              </button>
            )}
          </div>
        </div>
      </header>

      {/* CONTEÚDO */}
      {isLoading ? (
        <div className="ti-loading"><span className="ti-spinner" /> A carregar dados…</div>
      ) : (
        <>
          {tab === "painel" && (
            <div className="ti-painel">
              {/* Categorias */}
              <div className="ti-cats">
                {categoriasResumo.map((c, i) => {
                  const CatIcon = Icons[c.icon] || Icons.Box;
                  return (
                    <button key={c.id} type="button" className="ti-cat" style={{ "--c": c.color, "--i": i }} onClick={() => abrirExplorador({ cat: c.id })}>
                      <span className="ti-cat-ico"><CatIcon size={22} /></span>
                      <span className="ti-cat-main">
                        <span className="ti-cat-label">{c.label}</span>
                        <strong>{c.total}</strong>
                      </span>
                      <span className="ti-cat-split">
                        <span className="ti-cat-bar"><i style={{ width: `${c.total ? (c.emUso / c.total) * 100 : 0}%` }} /></span>
                        <small><b>{c.emUso}</b> em uso · <b>{c.emStock}</b> em stock</small>
                      </span>
                      {c.topTipos.length > 0 && (
                        <span className="ti-cat-tipos">
                          {c.topTipos.map(([tipo, n]) => <span key={tipo}>{tipo} <b>{n}</b></span>)}
                        </span>
                      )}
                      <span className="ti-cat-go"><Icons.ChevronRight size={16} /></span>
                    </button>
                  );
                })}
              </div>

              <div className="ti-row">
                <section className="ti-card is-grow">
                  <div className="ti-card-head">
                    <div><h2>Estado do parque</h2><p>Clica num estado para ver os equipamentos.</p></div>
                    <span className="ti-big-num">{equipamentos.length}<small>equipamentos</small></span>
                  </div>
                  {estadoEquipData.length === 0 ? (
                    <p className="ti-card-empty">Ainda não há equipamentos registados.</p>
                  ) : (
                    <StackBar data={estadoEquipData} onPick={(k) => (k === "abatido" ? setTab("equip_inativos") : abrirExplorador({ estado: k }))} />
                  )}
                  {totalAtivos > 0 && (
                    <div className="ti-ent">
                      <h3>Por entidade</h3>
                      {[...ENTIDADES_EMPRESA, "__none__"].map((en) => {
                        const n = equipamentos.filter((e) => e.estado !== "abatido" && (en === "__none__" ? !e.entidade : e.entidade === en)).length;
                        if (!n && en === "__none__") return null;
                        return (
                          <button key={en} type="button" className="ti-ent-row" onClick={() => abrirExplorador({ entidade: en })}>
                            <span className="ti-ent-name"><Icons.Building size={13} /> {en === "__none__" ? "Sem entidade" : en}</span>
                            <span className="ti-ent-bar"><i style={{ width: `${(n / totalAtivos) * 100}%`, background: corAvatar(en) }} /></span>
                            <b>{n}</b>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </section>

                <section className="ti-card">
                  <div className="ti-card-head">
                    <div><h2>Garantias</h2><p>A expirar nos próximos 90 dias ou já expiradas.</p></div>
                    {garantiasAExpirar.length > 0 && <button type="button" className="ti-link" onClick={() => abrirExplorador({ garantia: "soon" })}>Ver todas</button>}
                  </div>
                  {garantiasAExpirar.length === 0 ? (
                    <div className="ti-ok-box"><Icons.ShieldCheck size={18} /> Nenhuma garantia a expirar em breve.</div>
                  ) : (
                    <ul className="ti-mini-list">
                      {garantiasAExpirar.slice(0, 5).map(({ e, g }) => (
                        <li key={e.id}>
                          <button type="button" onClick={() => abrirDetalhe(e)}>
                            <TipoTile tipo={e.tipo} size={30} />
                            <span className="ti-mini-main"><strong>{e.modelo}</strong><small>{e.num_inventario} · {fmtData(g.fim)}</small></span>
                            <span className={`ti-gchip is-${g.tone}`}>{g.tone === "expired" ? "Expirada" : `${g.dias} dias`}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>

              <div className="ti-row">
                <section className="ti-card is-grow">
                  <div className="ti-card-head">
                    <div><h2>Equipamento por colaborador</h2><p>Apenas equipamento em uso · clica para ver o kit de cada pessoa.</p></div>
                  </div>
                  {atribuidosPorPessoa.length === 0 ? (
                    <p className="ti-card-empty">Ainda não há equipamento atribuído a colaboradores.</p>
                  ) : (
                    <div className="ti-people">
                      {atribuidosPorPessoa.map((pessoa, i) => {
                        const max = atribuidosPorPessoa[0].itens.length || 1;
                        return (
                          <button key={pessoa.id} type="button" className="ti-person" style={{ "--i": Math.min(i, 14) }} onClick={() => { abrirExplorador(); escolherPessoa(pessoa.id); setEquipView("pessoas"); }}>
                            <Avatar nome={pessoa.nome} url={pessoa.avatar_url} size={32} />
                            <span className="ti-person-main">
                              <strong>{pessoa.nome}</strong>
                              <span className="ti-person-icons">
                                {pessoa.itens.slice(0, 6).map((e) => {
                                  const TI = getIconeTipo(e.tipo);
                                  return <span key={e.id} title={`${e.tipo} · ${e.modelo}`} style={{ "--c": getCategoriaEquip(e.tipo).color }}><TI size={12} /></span>;
                                })}
                                {pessoa.itens.length > 6 && <span className="is-more">+{pessoa.itens.length - 6}</span>}
                              </span>
                            </span>
                            <span className="ti-person-bar"><i style={{ width: `${(pessoa.itens.length / max) * 100}%` }} /></span>
                            <b>{pessoa.itens.length}</b>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </section>

                <div className="ti-col">
                  <section className="ti-card">
                    <div className="ti-card-head">
                      <div><h2>Software & licenças</h2></div>
                      <button type="button" className="ti-link" onClick={() => setTab("software")}>Ver todos</button>
                    </div>
                    <div className="ti-mini-kpis">
                      <button type="button" onClick={() => { setTab("software"); setFiltroEstadoSoftware("ativo"); }}><span>Ativos</span><strong>{totalSoftwareAtivos}</strong></button>
                      <button type="button" className={totalSoftwareExpirados > 0 ? "is-amber" : ""} onClick={() => { setTab("software"); setFiltroEstadoSoftware("licenca_expirada"); }}><span>Licença expirada</span><strong>{totalSoftwareExpirados}</strong></button>
                    </div>
                    {licencasAExpirar.length > 0 && (
                      <ul className="ti-mini-list is-tight">
                        {licencasAExpirar.slice(0, 3).map(({ s, dias }) => (
                          <li key={s.id}>
                            <button type="button" onClick={() => handleEditar("software", s)}>
                              <span className="ti-tile" style={{ "--c": SOFTWARE_COR[getCategoriaSoftware(s.tipo).id], width: 28, height: 28 }}>{(() => { const SI = getIconeSoftware(s.tipo); return <SI size={14} />; })()}</span>
                              <span className="ti-mini-main"><strong>{s.nome}</strong><small>Vence {fmtData(s.data_expiracao)}</small></span>
                              <span className={`ti-gchip ${dias < 0 ? "is-expired" : "is-soon"}`}>{dias < 0 ? "Expirada" : `${dias} dias`}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>

                  <section className="ti-card">
                    <div className="ti-card-head">
                      <div><h2>Acessos</h2></div>
                      <button type="button" className="ti-link" onClick={() => { setTab("acessos"); setFiltroEstadoAcesso("todos"); }}>Ver todos</button>
                    </div>
                    <div className="ti-mini-kpis">
                      <button type="button" onClick={() => { setTab("acessos"); setFiltroEstadoAcesso("todos"); }}><span>Registados</span><strong>{acessos.length}</strong></button>
                      <button type="button" className={totalAcessosProblema > 0 ? "is-amber" : ""} onClick={() => { setTab("acessos"); setFiltroEstadoAcesso("revisao"); }}><span>A rever</span><strong>{totalAcessosProblema}</strong></button>
                    </div>
                  </section>
                </div>
              </div>

              <section className="ti-card">
                <div className="ti-card-head">
                  <div><h2>Equipamentos recentes</h2></div>
                  <button type="button" className="ti-link" onClick={() => { abrirExplorador(); setSortBy("recentes"); }}>Ver todos</button>
                </div>
                {recentes.length === 0 ? (
                  <p className="ti-card-empty">Ainda não há equipamentos registados.</p>
                ) : (
                  <div className="ti-recent">
                    {recentes.map((e) => (
                      <button key={e.id} type="button" className="ti-recent-item" onClick={() => abrirDetalhe(e)}>
                        <TipoTile tipo={e.tipo} size={36} />
                        <span className="ti-mini-main">
                          <strong>{e.modelo}</strong>
                          <small>{e.num_inventario} · {colaboradoresMap[e.colaborador]?.nome || "em stock"}</small>
                        </span>
                        <StatusPill estado={e.estado} map={ESTADO_MAP_EQUIP} />
                      </button>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}

          {isEquipTab && (
            <div className="ti-explorer">
              {/* FILTROS LATERAIS */}
              <aside className="ti-facets">
                <div className="ti-facets-head">
                  <span><Icons.Filter size={14} /> Filtros</span>
                  {filtrosAtivos.length > 0 && <button type="button" className="ti-link" onClick={limparFiltros}>Limpar</button>}
                </div>

                <div className="ti-facet">
                  <h4>Categoria</h4>
                  {CATEGORIAS_EQUIP.map((c) => {
                    const CatIcon = Icons[c.icon] || Icons.Box;
                    return facetRow(
                      c.id, c.label, facet.cat[c.id], fCat === c.id,
                      () => { setFCat(fCat === c.id ? "" : c.id); setFTipo(""); },
                      <span className="ti-facet-ico" style={{ "--c": c.color }}><CatIcon size={13} /></span>
                    );
                  })}
                  {fCat && (
                    <div className="ti-facet-tipos">
                      {CATEGORIAS_EQUIP.find((c) => c.id === fCat)?.tipos.filter((t) => facet.tipo[t] || fTipo === t).map((t) => (
                        <button key={t} type="button" className={fTipo === t ? "is-on" : ""} onClick={() => setFTipo(fTipo === t ? "" : t)}>
                          {t} <em>{facet.tipo[t] || 0}</em>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {tab === "equip_ativos" && (
                  <div className="ti-facet">
                    <h4>Estado</h4>
                    {ESTADOS_EQUIP.filter((s) => s.value !== "abatido").map((s) => facetRow(
                      s.value, s.label, facet.estado[s.value], filtroEstadoEquip === s.value,
                      () => setFiltroEstadoEquip(filtroEstadoEquip === s.value ? "todos" : s.value),
                      <i className="ti-facet-dot" style={{ background: ESTADO_MAP_EQUIP[s.value].color }} />
                    ))}
                  </div>
                )}

                <div className="ti-facet">
                  <h4>Garantia</h4>
                  {[
                    { k: "soon", label: "A expirar (90 dias)", c: "#d97706" },
                    { k: "expired", label: "Expirada", c: "#dc2626" },
                    { k: "ok", label: "Válida", c: "#16a34a" },
                    { k: "none", label: "Sem data", c: "#cbd5e1" },
                  ].map((g) => facetRow(g.k, g.label, facet.garantia[g.k], fGarantia === g.k, () => setFGarantia(fGarantia === g.k ? "" : g.k), <i className="ti-facet-dot" style={{ background: g.c }} />))}
                </div>

                <div className="ti-facet">
                  <h4>Entidade</h4>
                  {ENTIDADES_EMPRESA.map((en) => facetRow(en, en, facet.entidade[en], fEntidade === en, () => setFEntidade(fEntidade === en ? "" : en), <Icons.Building size={13} />))}
                  {facet.entidade.__none__ ? facetRow("__none__", "Sem entidade", facet.entidade.__none__, fEntidade === "__none__", () => setFEntidade(fEntidade === "__none__" ? "" : "__none__"), <Icons.Building size={13} />) : null}
                </div>
              </aside>

              {/* RESULTADOS */}
              <div className="ti-results">
                <div className="ti-toolbar">
                  <label className="ti-search">
                    <Icons.Search size={16} />
                    <input
                      ref={searchRef}
                      type="text"
                      placeholder="Procurar por inventário, modelo, descrição, colaborador, fornecedor, fatura…"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                    {query ? (
                      <button type="button" className="ti-search-clear" onClick={() => setQuery("")} title="Limpar pesquisa"><Icons.Close size={12} /></button>
                    ) : (
                      <kbd>/</kbd>
                    )}
                  </label>
                  <div className="ti-sort">
                    <Icons.Sort size={15} />
                    <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} aria-label="Ordenar">
                      <option value="inv_desc">Inventário (recente primeiro)</option>
                      <option value="inv_asc">Inventário (antigo primeiro)</option>
                      <option value="modelo">Modelo A–Z</option>
                      <option value="colab">Colaborador A–Z</option>
                      <option value="garantia">Garantia a terminar</option>
                      <option value="recentes">Adicionados recentemente</option>
                    </select>
                  </div>
                  <div className="ti-seg">
                    <button type="button" className={equipView === "lista" ? "is-on" : ""} onClick={() => setEquipView("lista")} title="Lista"><Icons.List size={15} /><span>Lista</span></button>
                    <button type="button" className={equipView === "cartoes" ? "is-on" : ""} onClick={() => setEquipView("cartoes")} title="Cartões"><Icons.Grid size={15} /><span>Cartões</span></button>
                    <button type="button" className={equipView === "pessoas" ? "is-on" : ""} onClick={() => setEquipView("pessoas")} title="Por colaborador"><Icons.Users size={15} /><span>Pessoas</span></button>
                  </div>
                </div>

                <div className="ti-resultbar">
                  <span className="ti-count"><b>{equipFiltrados.length}</b> de {equipBase.length} {tab === "equip_inativos" ? "abatidos" : "equipamentos"}</span>
                  {filtrosAtivos.map((f) => (
                    <button key={f.key} type="button" className="ti-chip" onClick={f.clear}>
                      {f.label} <Icons.Close size={11} />
                    </button>
                  ))}
                  {filtrosAtivos.length > 1 && <button type="button" className="ti-link" onClick={limparFiltros}>Limpar tudo</button>}
                </div>

                {equipFiltrados.length === 0 ? (
                  <div className="ti-empty">
                    <span className="ti-empty-ico"><Icons.Inbox size={30} /></span>
                    <h3>{query || filtrosAtivos.length ? "Nenhum equipamento corresponde à pesquisa." : tab === "equip_inativos" ? "Não há equipamentos abatidos." : "Ainda não há equipamentos registados."}</h3>
                    {(query || filtrosAtivos.length > 0) ? (
                      <button type="button" className="ti-btn is-soft" onClick={limparFiltros}>Limpar pesquisa e filtros</button>
                    ) : tab === "equip_ativos" ? (
                      <>
                        <p>Comece por adicionar o primeiro computador, monitor ou outro equipamento.</p>
                        <button type="button" className="ti-btn is-primary" onClick={handleNovo}><Icons.Plus /> Adicionar equipamento</button>
                      </>
                    ) : null}
                  </div>
                ) : equipView === "lista" ? (
                  <div className="ti-list">
                    <div className="ti-list-head">
                      <span>Equipamento</span>
                      <span>Colaborador</span>
                      <span>Entidade</span>
                      <span>Garantia</span>
                      <span>Estado</span>
                      <span />
                    </div>
                    {equipFiltrados.map((e, i) => (
                      <div
                        key={e.id}
                        role="button"
                        tabIndex={0}
                        className={`ti-list-row ${detailId === e.id ? "is-selected" : ""}`}
                        style={{ "--i": Math.min(i, 20) }}
                        onClick={() => { setDetailId(e.id); setAssignOpen(false); }}
                        onKeyDown={(ev) => { if (ev.key === "Enter") { setDetailId(e.id); setAssignOpen(false); } }}
                      >
                        <span className="ti-list-main">
                          <TipoTile tipo={e.tipo} size={36} />
                          <span className="ti-list-text">
                            <strong>{e.modelo}</strong>
                            <small><span className="ti-tag">{e.num_inventario}</span>{e.tipo}{e.nome_pc ? ` · ${e.nome_pc}` : ""}</small>
                          </span>
                        </span>
                        <span className="ti-list-cell">{renderColab(e)}</span>
                        <span className="ti-list-cell is-muted">{e.entidade || <span className="ti-nil">—</span>}</span>
                        <span className="ti-list-cell"><GarantiaChip equip={e} compact /></span>
                        <span className="ti-list-cell"><StatusPill estado={e.estado} map={ESTADO_MAP_EQUIP} /></span>
                        <span className="ti-list-actions">
                          <button type="button" className="ti-icon-btn" title="Editar" onClick={(ev) => { ev.stopPropagation(); handleEditar("equipamento", e); }}><Icons.Edit size={15} /></button>
                          <Icons.ChevronRight size={16} />
                        </span>
                      </div>
                    ))}
                  </div>
                ) : equipView === "cartoes" ? (
                  <div className="ti-cards">
                    {equipFiltrados.map((e, i) => {
                      const cat = getCategoriaEquip(e.tipo);
                      return (
                        <button key={e.id} type="button" className={`ti-ecard ${e.estado === "abatido" ? "is-off" : ""}`} style={{ "--c": cat.color, "--i": Math.min(i, 20) }} onClick={() => { setDetailId(e.id); setAssignOpen(false); }}>
                          <span className="ti-ecard-top">
                            <TipoTile tipo={e.tipo} size={44} />
                            <StatusPill estado={e.estado} map={ESTADO_MAP_EQUIP} />
                          </span>
                          <span className="ti-ecard-tag"><span className="ti-tag">{e.num_inventario}</span>{e.tipo}</span>
                          <strong className="ti-ecard-model">{e.modelo}</strong>
                          {e.nome_pc && <span className="ti-ecard-desc">{e.nome_pc}</span>}
                          <span className="ti-ecard-meta">
                            {e.entidade && <span><Icons.Building size={11} /> {e.entidade}</span>}
                            <GarantiaChip equip={e} />
                          </span>
                          <span className="ti-ecard-foot">{renderColab(e, 24)}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="ti-people-view">
                    {/* Lista de pessoas */}
                    <nav className="ti-roster" aria-label="Colaboradores">
                      {[...equipPorPessoa.filter((g) => g.key === "__none__"), ...equipPorPessoa.filter((g) => g.key !== "__none__")].map((grupo, gi) => {
                        const isStock = grupo.key === "__none__";
                        const on = pessoaAtiva?.key === grupo.key;
                        const cats = contarCategorias(grupo.itens);
                        return (
                          <button
                            key={grupo.key}
                            type="button"
                            className={`ti-roster-row ${on ? "is-on" : ""} ${isStock ? "is-stock" : ""}`}
                            style={{ "--i": Math.min(gi, 16) }}
                            onClick={() => escolherPessoa(grupo.key)}
                          >
                            {isStock
                              ? <span className="ti-avatar is-empty ti-roster-stock-ico" style={{ width: 36, height: 36 }}><Icons.Box size={16} /></span>
                              : <Avatar nome={grupo.nome} url={grupo.avatar_url} size={36} />}
                            <span className="ti-roster-main">
                              <strong>{isStock ? "Sem colaborador" : grupo.nome}</strong>
                              <span className="ti-roster-bar">
                                {cats.map(({ c, n }) => <i key={c.id} style={{ flexGrow: n, background: c.color }} title={`${c.label}: ${n}`} />)}
                              </span>
                            </span>
                            <em className="ti-roster-count">{grupo.itens.length}</em>
                          </button>
                        );
                      })}
                    </nav>

                    {/* Kit da pessoa selecionada */}
                    {pessoaAtiva && (() => {
                      const isStock = pessoaAtiva.key === "__none__";
                      const cats = contarCategorias(pessoaAtiva.itens);
                      const esperado = isStock ? "em_stock" : "em_uso";
                      return (
                        <section key={pessoaAtiva.key} className={`ti-kitpane ${isStock ? "is-stock" : ""}`}>
                          <header className="ti-kitpane-head">
                            {isStock
                              ? <span className="ti-avatar is-empty" style={{ width: 58, height: 58 }}><Icons.Box size={24} /></span>
                              : <Avatar nome={pessoaAtiva.nome} url={pessoaAtiva.avatar_url} size={58} />}
                            <div className="ti-kitpane-title">
                              <h3>{isStock ? "Sem colaborador" : pessoaAtiva.nome}</h3>
                              <p>
                                <b>{pessoaAtiva.itens.length}</b> equipamento{pessoaAtiva.itens.length === 1 ? "" : "s"}
                                {isStock ? " por atribuir, agrupados por tipo" : " atribuídos"}
                              </p>
                            </div>
                            {!isStock && stockDisponivel.length > 0 && tab === "equip_ativos" && (
                              <div className="ti-kitpane-assign">
                                <FancySelect
                                  value=""
                                  onChange={(v) => {
                                    const item = stockDisponivel.find((x) => x.id === v);
                                    if (item) atribuirEquipamento(item, pessoaAtiva.key);
                                  }}
                                  options={stockDisponivel.map((x) => ({
                                    value: x.id,
                                    label: x.modelo || x.num_inventario,
                                    hint: `${x.num_inventario || "—"} · ${x.tipo || "—"}`,
                                    group: getCategoriaEquip(x.tipo).label,
                                    icon: <TipoTile tipo={x.tipo} size={24} />,
                                  }))}
                                  placeholder="Atribuir do stock…"
                                  menuWidth={360}
                                  searchPlaceholder="Procurar no stock..."
                                  ariaLabel="Atribuir equipamento do stock"
                                />
                              </div>
                            )}
                          </header>

                          {cats.length > 1 && (
                            <div className="ti-kitpane-cats">
                              <button type="button" className={!kitCat ? "is-on" : ""} onClick={() => setKitCat("")}>
                                Tudo <em>{pessoaAtiva.itens.length}</em>
                              </button>
                              {cats.map(({ c, n }) => {
                                const CI = Icons[c.icon] || Icons.Box;
                                return (
                                  <button key={c.id} type="button" className={kitCat === c.id ? "is-on" : ""} style={{ "--c": c.color }} onClick={() => setKitCat(kitCat === c.id ? "" : c.id)}>
                                    <CI size={13} /> {c.label} <em>{n}</em>
                                  </button>
                                );
                              })}
                            </div>
                          )}

                          <div className="ti-kitpane-body">
                            {kitGrupos.map((g, gi) => {
                              const LIMITE = g.porTipo ? 6 : Infinity;
                              const aberto = !!kitExpand[g.key];
                              const visiveis = aberto ? g.itens : g.itens.slice(0, LIMITE);
                              const CatIco = Icons[g.cat.icon] || Icons.Box;
                              return (
                                <div key={g.key} className="ti-kgroup" style={{ "--c": g.cat.color, "--i": Math.min(gi, 12) }}>
                                  <div className="ti-kgroup-head">
                                    {g.porTipo
                                      ? <TipoTile tipo={g.key} size={30} />
                                      : <span className="ti-kgroup-ico"><CatIco size={15} /></span>}
                                    <strong>{g.label}</strong>
                                    <em>{g.itens.length}</em>
                                    <span className="ti-kgroup-line" />
                                  </div>
                                  <div className="ti-kgroup-grid">
                                    {visiveis.map((e) => (
                                      <button
                                        key={e.id}
                                        type="button"
                                        className={`ti-kt ${detailId === e.id ? "is-selected" : ""}`}
                                        onClick={() => { setDetailId(e.id); setAssignOpen(false); }}
                                      >
                                        <span className="ti-kt-top">
                                          <span className="ti-kt-id">
                                            {!g.porTipo && <TipoTile tipo={e.tipo} size={24} />}
                                            <span className="ti-tag">{e.num_inventario}</span>
                                          </span>
                                          {e.estado !== esperado
                                            ? <StatusPill estado={e.estado} map={ESTADO_MAP_EQUIP} />
                                            : garantiaInfo(e).tone !== "none" && <GarantiaChip equip={e} compact />}
                                        </span>
                                        <strong title={e.modelo}>{e.modelo}</strong>
                                        <small>{[g.porTipo ? null : e.tipo, e.nome_pc, e.entidade].filter(Boolean).join(" · ") || " "}</small>
                                      </button>
                                    ))}
                                    {g.itens.length > LIMITE && (
                                      <button type="button" className="ti-kt is-more" onClick={() => setKitExpand((p) => ({ ...p, [g.key]: !aberto }))}>
                                        {aberto ? "Mostrar menos" : <>+{g.itens.length - LIMITE} <small>ver todos</small></>}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </section>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === "software" && (
            <div className="ti-stack-view">
              <div className="ti-toolbar">
                <label className="ti-search">
                  <Icons.Search size={16} />
                  <input ref={searchRef} type="text" placeholder="Procurar por software, entidade ou fornecedor…" value={query} onChange={(e) => setQuery(e.target.value)} />
                  {query ? <button type="button" className="ti-search-clear" onClick={() => setQuery("")} title="Limpar pesquisa"><Icons.Close size={12} /></button> : <kbd>/</kbd>}
                </label>
                <div className="ti-seg">
                  {[{ value: "todos", label: "Todos" }, ...ESTADOS_SOFTWARE].map((s) => (
                    <button key={s.value} type="button" className={filtroEstadoSoftware === s.value ? "is-on" : ""} onClick={() => setFiltroEstadoSoftware(s.value)}>
                      {s.label}
                      <em>{s.value === "todos" ? software.length : software.filter((x) => (x.estado || "ativo") === s.value).length}</em>
                    </button>
                  ))}
                </div>
              </div>
              {softwareFiltrado.length > 0 ? (
                softwarePorCategoria.map((grupo) => (
                  <section key={grupo.id} className="ti-group">
                    <div className="ti-group-head"><h3>{grupo.label}</h3><em>{grupo.itens.length}</em></div>
                    <div className="ti-sw-grid">
                      {grupo.itens.map((item, i) => {
                        const ativo = (item.estado || "ativo") === "ativo";
                        const SI = getIconeSoftware(item.tipo);
                        const dias = diasAte(item.data_expiracao);
                        const cor = SOFTWARE_COR[grupo.id];
                        return (
                          <article key={item.id} className={`ti-sw ${!ativo ? "is-off" : ""}`} style={{ "--c": cor, "--i": Math.min(i, 16) }}>
                            <div className="ti-sw-top">
                              <span className="ti-tile" style={{ "--c": cor, width: 44, height: 44 }}><SI size={21} /></span>
                              <div className="ti-sw-title">
                                <strong>{item.nome}</strong>
                                <small>{item.tipo}{item.versao ? ` · Versão ${item.versao}` : ""}</small>
                              </div>
                              <StatusPill estado={item.estado || "ativo"} map={ESTADO_MAP_SOFTWARE} />
                            </div>
                            <div className="ti-sw-meta">
                              <span className="ti-tag">{item.codigo || item.nome}</span>
                              {item.entidade && <span><Icons.Building size={11} /> {item.entidade}</span>}
                              {item.fornecedor && <span><Icons.Truck size={11} /> {item.fornecedor}</span>}
                              {item.fatura && <span><Icons.Receipt size={11} /> Fatura {item.fatura}</span>}
                            </div>
                            {item.data_expiracao ? (
                              <div className={`ti-sw-exp ${dias < 0 ? "is-expired" : dias <= 60 ? "is-soon" : ""}`}>
                                <Icons.Calendar size={13} />
                                <span>Vence {fmtData(item.data_expiracao)}</span>
                                <b>{dias < 0 ? "Expirada" : `${dias} dias`}</b>
                              </div>
                            ) : (
                              <div className="ti-sw-exp is-none"><Icons.Calendar size={13} /><span>Sem data de expiração</span></div>
                            )}
                            {item.licenca_chave && (
                              <div className="ti-sw-key">
                                <Icons.Key size={13} />
                                <code>{revealed[`sw-${item.id}`] ? item.licenca_chave : "•••••-•••••-•••••"}</code>
                                <button type="button" className="ti-icon-btn is-sm" onClick={() => setRevealed((p) => ({ ...p, [`sw-${item.id}`]: !p[`sw-${item.id}`] }))} title={revealed[`sw-${item.id}`] ? "Ocultar" : "Mostrar"}>{revealed[`sw-${item.id}`] ? <Icons.EyeOff size={13} /> : <Icons.Eye size={13} />}</button>
                                <button type="button" className="ti-icon-btn is-sm" onClick={() => handleCopyText(item.licenca_chave, "Chave de licença")} title="Copiar chave"><Icons.Copy size={13} /></button>
                              </div>
                            )}
                            <div className="ti-sw-foot">
                              <span>{item.data_aquisicao ? `Aquisição ${fmtData(item.data_aquisicao)}` : item.fornecedor || "Sem fornecedor"}</span>
                              <button type="button" className="ti-icon-btn" title="Editar" onClick={() => handleEditar("software", item)}><Icons.Edit size={15} /></button>
                              <button type="button" className={`ti-icon-btn ${ativo ? "is-danger" : "is-ok"}`} title={ativo ? "Arquivar software" : "Reativar software"} onClick={() => handleToggleEstado("software", item)}><Icons.Power size={15} /></button>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </section>
                ))
              ) : (
                <div className="ti-empty">
                  <span className="ti-empty-ico"><Icons.Box size={30} /></span>
                  <h3>{query ? "Nenhum software corresponde à pesquisa." : "Ainda não há software registado."}</h3>
                  {!query && (
                    <>
                      <p>Registe Windows, Microsoft 365 e outras licenças ou aplicações importantes.</p>
                      <button type="button" className="ti-btn is-primary" onClick={handleNovo}><Icons.Plus /> Adicionar software</button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {tab === "acessos" && (
            <div className="ti-stack-view">
              <div className="ti-toolbar">
                <label className="ti-search">
                  <Icons.Search size={16} />
                  <input ref={searchRef} type="text" placeholder="Procurar por plataforma, URL ou utilizador…" value={query} onChange={(e) => setQuery(e.target.value)} />
                  {query ? <button type="button" className="ti-search-clear" onClick={() => setQuery("")} title="Limpar pesquisa"><Icons.Close size={12} /></button> : <kbd>/</kbd>}
                </label>
                <div className="ti-seg">
                  {[{ value: "todos", label: "Todos", n: acessos.length }, { value: "ativo", label: "Ativos", n: acessos.filter((a) => (a.estado || "ativo") === "ativo").length }, { value: "revisao", label: "A rever", n: totalAcessosProblema }].map((s) => (
                    <button key={s.value} type="button" className={filtroEstadoAcesso === s.value ? "is-on" : ""} onClick={() => setFiltroEstadoAcesso(s.value)}>
                      {s.label} <em>{s.n}</em>
                    </button>
                  ))}
                </div>
              </div>
              {acessosFiltrados.length > 0 ? (
                acessosPorEstado.map((grupo) => (
                  <section key={grupo.key} className="ti-group">
                    <div className="ti-group-head"><h3>{grupo.label}</h3><em>{grupo.itens.length}</em></div>
                    <div className="ti-ac-grid">
                      {grupo.itens.map((a, i) => {
                        const inativo = a.estado === "expirado" || a.estado === "inativo";
                        const visible = !!revealed[`ac-${a.id}`];
                        const cor = corAvatar(a.nome_plataforma || "?");
                        return (
                          <article key={a.id} className={`ti-ac ${inativo ? "is-off" : ""}`} style={{ "--c": cor, "--i": Math.min(i, 16) }}>
                            <div className="ti-ac-top">
                              <span className="ti-ac-logo">{getIniciais(a.nome_plataforma || "?")}</span>
                              <div className="ti-ac-title">
                                <strong>{a.nome_plataforma}</strong>
                                {a.url && <a href={a.url} target="_blank" rel="noopener noreferrer">{a.url.replace(/^https?:\/\//, "")} <Icons.External size={11} /></a>}
                              </div>
                              <StatusPill estado={a.estado || "ativo"} map={ESTADO_MAP_ACESSO} />
                            </div>
                            <div className="ti-ac-rows">
                              <div className="ti-ac-row">
                                <span>Utilizador</span>
                                <code>{a.username}</code>
                                <button type="button" className="ti-icon-btn is-sm" title="Copiar utilizador" onClick={() => handleCopyText(a.username, "Utilizador")}><Icons.Copy size={13} /></button>
                              </div>
                              <div className="ti-ac-row is-pass">
                                <span>Palavra-passe</span>
                                <code>{visible ? a.password : "••••••••••••"}</code>
                                <button type="button" className="ti-icon-btn is-sm" onClick={() => setRevealed((p) => ({ ...p, [`ac-${a.id}`]: !p[`ac-${a.id}`] }))} title={visible ? "Ocultar" : "Mostrar"}>{visible ? <Icons.EyeOff size={13} /> : <Icons.Eye size={13} />}</button>
                                <button type="button" className="ti-icon-btn is-sm" title="Copiar palavra-passe" onClick={() => handleCopyPassword(a.password)}><Icons.Copy size={13} /></button>
                              </div>
                            </div>
                            <div className="ti-ac-foot">
                              {a.url && <a className="ti-btn is-soft is-sm" href={a.url} target="_blank" rel="noopener noreferrer"><Icons.External size={13} /> Abrir</a>}
                              <span className="ti-spacer" />
                              <button type="button" className="ti-icon-btn" title="Editar" onClick={() => handleEditar("acesso", a)}><Icons.Edit size={15} /></button>
                              <button type="button" className={`ti-icon-btn ${inativo ? "is-ok" : "is-danger"}`} title={inativo ? "Reativar acesso" : "Marcar como inativo"} onClick={() => handleToggleEstado("acesso", a)}><Icons.Power size={15} /></button>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </section>
                ))
              ) : (
                <div className="ti-empty">
                  <span className="ti-empty-ico"><Icons.Lock size={30} /></span>
                  <h3>{query ? "Nenhum acesso corresponde à pesquisa." : "Ainda não há acessos registados."}</h3>
                  {!query && <p>Guarde aqui os acessos a plataformas e sistemas web da organização.</p>}
                  {!query && <button type="button" className="ti-btn is-primary" onClick={handleNovo}><Icons.Plus /> Adicionar acesso</button>}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* DETALHE DO EQUIPAMENTO */}
      {detailEquip && isEquipTab && (
        <ModalPortal>
          <div className="ti-detail-overlay" onClick={() => { setDetailId(null); setAssignOpen(false); }}>
            <aside className="ti-detail" style={{ "--c": getCategoriaEquip(detailEquip.tipo).color }} onClick={(e) => e.stopPropagation()}>
              {(() => {
                const e = detailEquip;
                const cat = getCategoriaEquip(e.tipo);
                const TI = getIconeTipo(e.tipo);
                const g = garantiaInfo(e);
                const info = colaboradoresMap[e.colaborador];
                const outros = e.colaborador ? equipamentos.filter((x) => x.colaborador === e.colaborador && x.id !== e.id && x.estado !== "abatido") : [];
                const ativo = e.estado !== "abatido";
                return (
                  <>
                    <div className="ti-detail-head">
                      <span className="ti-detail-bg"><TI size={160} strokeWidth={1} /></span>
                      <button type="button" className="ti-detail-close" onClick={() => { setDetailId(null); setAssignOpen(false); }} aria-label="Fechar"><Icons.Close size={18} /></button>
                      <span className="ti-detail-ico"><TI size={30} /></span>
                      <span className="ti-detail-kicker"><span className="ti-tag is-light">{e.num_inventario}</span>{cat.label} · {e.tipo}</span>
                      <h3>{e.modelo}</h3>
                      {e.nome_pc && <p>{e.nome_pc}</p>}
                      <div className="ti-detail-pills">
                        <StatusPill estado={e.estado} map={ESTADO_MAP_EQUIP} />
                        <GarantiaChip equip={e} />
                      </div>
                    </div>

                    <div className="ti-detail-body">
                      <section className="ti-dcard">
                        <h4>Atribuído a</h4>
                        <div className="ti-assign">
                          {info ? (
                            <>
                              <Avatar nome={info.nome} url={info.avatar_url} size={44} />
                              <div><strong>{info.nome}</strong><small>{ESTADO_MAP_EQUIP[e.estado]?.txt}</small></div>
                            </>
                          ) : (
                            <>
                              <span className="ti-avatar is-empty" style={{ width: 44, height: 44 }}><Icons.Box size={20} /></span>
                              <div><strong>{e.estado === "em_stock" ? "Em stock" : "Sem colaborador"}</strong><small>Disponível para atribuir</small></div>
                            </>
                          )}
                        </div>
                        {ativo && (
                          assignOpen ? (
                            <div className="ti-assign-picker">
                              <FancySelect
                                value=""
                                onChange={(v) => { if (v) atribuirEquipamento(e, v); }}
                                options={utilizadoresOrdenados.filter((u) => u.id !== e.colaborador).map((u) => ({
                                  value: u.id,
                                  label: u.nome,
                                  hint: `${equipamentos.filter((x) => x.colaborador === u.id && x.estado === "em_uso").length} em uso`,
                                  icon: <Avatar nome={u.nome} url={u.avatar_url} size={22} />,
                                }))}
                                placeholder="Escolher colaborador…"
                                menuWidth={320}
                                searchPlaceholder="Procurar colaborador..."
                                ariaLabel="Atribuir a colaborador"
                              />
                              <button type="button" className="ti-icon-btn" onClick={() => setAssignOpen(false)} aria-label="Cancelar"><Icons.Close size={14} /></button>
                            </div>
                          ) : (
                            <div className="ti-assign-actions">
                              <button type="button" className="ti-btn is-primary is-sm" onClick={() => setAssignOpen(true)}>
                                <Icons.UserPlus size={14} /> {info ? "Reatribuir" : "Atribuir"}
                              </button>
                              {info && (
                                <button type="button" className="ti-btn is-ghost is-sm" onClick={() => atribuirEquipamento(e, null)}>
                                  <Icons.Undo size={14} /> Devolver ao stock
                                </button>
                              )}
                            </div>
                          )
                        )}
                      </section>

                      <section className="ti-dcard">
                        <h4>Detalhes</h4>
                        <div className="ti-dgrid">
                          <div><span>Nº Inventário</span><b className="is-mono">{e.num_inventario}</b></div>
                          <div><span>Tipo</span><b>{e.tipo}</b></div>
                          <div><span>Entidade</span><b>{e.entidade || "—"}</b></div>
                          <div><span>Fornecedor</span><b>{e.fornecedor || "—"}</b></div>
                          <div><span>Fatura</span><b>{e.fatura || "—"}</b></div>
                          <div><span>Data de aquisição</span><b>{fmtData(e.data_aquisicao)}</b></div>
                        </div>
                      </section>

                      <section className="ti-dcard">
                        <h4>Garantia</h4>
                        {g.tone === "none" ? (
                          <p className="ti-muted">Sem prazo de garantia registado.</p>
                        ) : (
                          <div className={`ti-warranty is-${g.tone}`}>
                            <div className="ti-warranty-top">
                              <Icons.ShieldCheck size={18} />
                              <div>
                                <strong>{g.tone === "expired" ? `Expirou há ${Math.abs(g.dias)} dias` : `${g.dias} dias restantes`}</strong>
                                <small>{e.data_aquisicao ? `${fmtData(e.data_aquisicao)} → ` : "Até "}{fmtData(g.fim)}</small>
                              </div>
                            </div>
                            {g.pct !== null && <span className="ti-warranty-bar"><i style={{ width: `${g.pct}%` }} /></span>}
                          </div>
                        )}
                      </section>

                      {outros.length > 0 && (
                        <section className="ti-dcard">
                          <h4>Outros equipamentos de {info?.nome?.split(" ")[0]} <em>{outros.length}</em></h4>
                          <div className="ti-kit-items is-compact">
                            {outros.map((x) => (
                              <button key={x.id} type="button" className="ti-kit-item" onClick={() => { setDetailId(x.id); setAssignOpen(false); }}>
                                <TipoTile tipo={x.tipo} size={28} />
                                <span className="ti-mini-main"><strong>{x.modelo}</strong><small>{x.num_inventario} · {x.tipo}</small></span>
                                <Icons.ChevronRight size={14} />
                              </button>
                            ))}
                          </div>
                        </section>
                      )}
                    </div>

                    <div className="ti-detail-foot">
                      <button type="button" className={`ti-btn ${ativo ? "is-danger-soft" : "is-ok-soft"}`} onClick={() => handleToggleEstado("equipamento", e)}>
                        <Icons.Power size={15} /> {ativo ? "Abater" : "Reativar"}
                      </button>
                      <span className="ti-spacer" />
                      <button type="button" className="ti-btn is-primary" onClick={() => handleEditar("equipamento", e)}>
                        <Icons.Edit size={15} /> Editar
                      </button>
                    </div>
                  </>
                );
              })()}
            </aside>
          </div>
        </ModalPortal>
      )}

      {/* MODAL CRIAR / EDITAR */}
      {showModal && (
        <ModalPortal>
          <div onClick={closePanel} className="ti-overlay">
            <div
              className={`ti-drawer ${isClosingPanel ? "is-closing" : ""}`}
              style={{ "--c": modalAccent }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="ti-drawer-head">
                <span className="ti-drawer-ico">
                  {modalType === "equipamento" ? (() => { const TI = getIconeTipo(formEquip.tipo); return <TI size={22} />; })() : modalType === "software" ? <Icons.Box size={22} /> : <Icons.Lock size={22} />}
                </span>
                <div className="ti-drawer-title">
                  <span>{editingId ? "Editar registo" : "Adicionar registo"}</span>
                  <h3>
                    {modalType === "equipamento" ? (formEquip.modelo || "Equipamento") : modalType === "software" ? (formSoftware.nome || "Software") : (formAcesso.nome_plataforma || "Acesso")}
                  </h3>
                </div>
                <button type="button" onClick={closePanel} className="ti-drawer-close" aria-label="Fechar"><Icons.Close size={18} /></button>
              </div>

              <form onSubmit={handleSubmitAtivo} className="ti-drawer-form">
                <div className="ti-drawer-body custom-scrollbar">
                  {!editingId && (
                    <div className="ti-typepick">
                      {[
                        { id: "equipamento", label: "Equipamento", icon: Icons.Laptop },
                        { id: "software", label: "Software", icon: Icons.Box },
                        { id: "acesso", label: "Acesso", icon: Icons.Lock },
                      ].map((t) => {
                        const TIc = t.icon;
                        return (
                          <button key={t.id} type="button" className={modalType === t.id ? "is-on" : ""} onClick={() => switchModalType(t.id)}>
                            <TIc size={20} /> {t.label}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {modalType === "equipamento" && (
                    <>
                      <section className="ti-fsec">
                        <h4>Tipo</h4>
                        {CATEGORIAS_EQUIP.map((cat) => (
                          <div key={cat.id} className="ti-tipo-group">
                            <span className="ti-tipo-cat" style={{ "--c": cat.color }}>{cat.label}</span>
                            <div className="ti-tipo-grid">
                              {cat.tipos.map((t) => {
                                const TI = getIconeTipo(t);
                                return (
                                  <button key={t} type="button" className={formEquip.tipo === t ? "is-on" : ""} style={{ "--c": cat.color }} onClick={() => setFormEquip({ ...formEquip, tipo: t })}>
                                    <TI size={18} />
                                    <span>{t}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </section>

                      <section className="ti-fsec">
                        <h4>Identificação</h4>
                        <div className="ti-fgrid" style={{ gridTemplateColumns: "140px minmax(0, 1fr)" }}>
                          <div className="ti-field">
                            <label>Nº Inventário</label>
                            <input type="text" required value={formEquip.num_inventario} onChange={(e) => setFormEquip({ ...formEquip, num_inventario: e.target.value })} className="ti-input is-mono" />
                          </div>
                          <div className="ti-field">
                            <label>Modelo</label>
                            <input type="text" required value={formEquip.modelo} onChange={(e) => setFormEquip({ ...formEquip, modelo: e.target.value })} className="ti-input" placeholder="Ex: Lenovo ThinkPad T14" />
                          </div>
                        </div>
                        <div className="ti-field">
                          <label>Descrição<span className="ti-optional">(opcional)</span></label>
                          <input type="text" value={formEquip.nome_pc} onChange={(e) => setFormEquip({ ...formEquip, nome_pc: e.target.value })} className="ti-input" placeholder="Ex: PC-RECECAO, 16GB RAM…" />
                        </div>
                      </section>

                      <section className="ti-fsec">
                        <h4>Atribuição</h4>
                        <div className="ti-field">
                          <label>Colaborador</label>
                          <FancySelect
                            className="ti-form-select"
                            value={formEquip.colaborador}
                            onChange={(v) => setFormEquip({
                              ...formEquip,
                              colaborador: v || "",
                              estado: v && formEquip.estado === "em_stock" ? "em_uso" : (!v && formEquip.estado === "em_uso" ? "em_stock" : formEquip.estado),
                            })}
                            options={[
                              { value: "", label: "— Nenhum —", icon: <span className="ti-avatar is-empty" style={{ width: 22, height: 22 }}><Icons.Box size={11} /></span> },
                              ...utilizadoresOrdenados.map((u) => ({ value: u.id, label: u.nome, icon: <Avatar nome={u.nome} url={u.avatar_url} size={22} /> })),
                            ]}
                            menuWidth={320}
                            searchPlaceholder="Procurar colaborador..."
                            ariaLabel="Colaborador"
                          />
                        </div>
                        <div className="ti-field">
                          <label>Estado</label>
                          <div className="ti-pills-pick">
                            {ESTADOS_EQUIP.map((s) => (
                              <button key={s.value} type="button" className={formEquip.estado === s.value ? "is-on" : ""} style={{ "--s": ESTADO_MAP_EQUIP[s.value].color }} onClick={() => setFormEquip({ ...formEquip, estado: s.value })}>
                                <i /> {s.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="ti-field">
                          <label>Entidade</label>
                          <div className="ti-pills-pick is-plain">
                            <button type="button" className={!formEquip.entidade ? "is-on" : ""} onClick={() => setFormEquip({ ...formEquip, entidade: "" })}>— Selecionar —</button>
                            {ENTIDADES_EMPRESA.map((entidade) => (
                              <button key={entidade} type="button" className={formEquip.entidade === entidade ? "is-on" : ""} onClick={() => setFormEquip({ ...formEquip, entidade })}>{entidade}</button>
                            ))}
                          </div>
                        </div>
                      </section>

                      <section className="ti-fsec">
                        <h4>Compra & garantia</h4>
                        <div className="ti-fgrid is-2">
                          <div className="ti-field">
                            <label>Fornecedor</label>
                            <input type="text" value={formEquip.fornecedor} onChange={(e) => setFormEquip({ ...formEquip, fornecedor: e.target.value })} className="ti-input" />
                          </div>
                          <div className="ti-field">
                            <label>Fatura</label>
                            <input type="text" value={formEquip.fatura} onChange={(e) => setFormEquip({ ...formEquip, fatura: e.target.value })} className="ti-input" />
                          </div>
                          <div className="ti-field">
                            <label>Data de aquisição</label>
                            <input type="date" value={formEquip.data_aquisicao} onChange={(e) => setFormEquip({ ...formEquip, data_aquisicao: e.target.value })} className="ti-input" />
                          </div>
                          <div className="ti-field">
                            <label>Prazo de garantia</label>
                            <input type="date" value={formEquip.prazo_garantia} onChange={(e) => setFormEquip({ ...formEquip, prazo_garantia: e.target.value })} className="ti-input" />
                          </div>
                        </div>
                        {formEquip.data_aquisicao && (
                          <div className="ti-quick">
                            <span>Garantia rápida:</span>
                            {[1, 2, 3].map((anos) => (
                              <button key={anos} type="button" onClick={() => {
                                const d = new Date(formEquip.data_aquisicao);
                                d.setFullYear(d.getFullYear() + anos);
                                setFormEquip({ ...formEquip, prazo_garantia: d.toISOString().slice(0, 10) });
                              }}>+{anos} ano{anos > 1 ? "s" : ""}</button>
                            ))}
                          </div>
                        )}
                      </section>
                    </>
                  )}

                  {modalType === "software" && (
                    <>
                      <section className="ti-fsec">
                        <h4>Tipo</h4>
                        {SOFTWARE_TIPOS.map((cat) => (
                          <div key={cat.id} className="ti-tipo-group">
                            <span className="ti-tipo-cat" style={{ "--c": SOFTWARE_COR[cat.id] }}>{cat.label}</span>
                            <div className="ti-tipo-grid">
                              {cat.nomes.map((nome) => {
                                const SI = getIconeSoftware(nome);
                                return (
                                  <button key={nome} type="button" className={formSoftware.tipo === nome ? "is-on" : ""} style={{ "--c": SOFTWARE_COR[cat.id] }} onClick={() => setFormSoftware({ ...formSoftware, tipo: nome })}>
                                    <SI size={18} /><span>{nome}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </section>
                      <section className="ti-fsec">
                        <h4>Identificação</h4>
                        <div className="ti-fgrid" style={{ gridTemplateColumns: "150px minmax(0, 1fr)" }}>
                          <div className="ti-field">
                            <label>Código</label>
                            <input type="text" required value={formSoftware.codigo} onChange={(e) => setFormSoftware({ ...formSoftware, codigo: e.target.value })} className="ti-input is-mono" />
                          </div>
                          <div className="ti-field">
                            <label>Nome</label>
                            <input type="text" required value={formSoftware.nome} onChange={(e) => setFormSoftware({ ...formSoftware, nome: e.target.value })} placeholder="Ex: Windows 11 Pro" className="ti-input" />
                          </div>
                        </div>
                        <div className="ti-fgrid is-2">
                          <div className="ti-field">
                            <label>Versão<span className="ti-optional">(opcional)</span></label>
                            <input type="text" value={formSoftware.versao} onChange={(e) => setFormSoftware({ ...formSoftware, versao: e.target.value })} className="ti-input" />
                          </div>
                          <div className="ti-field">
                            <label>Chave de licença<span className="ti-optional">(opcional)</span></label>
                            <input type="text" value={formSoftware.licenca_chave} onChange={(e) => setFormSoftware({ ...formSoftware, licenca_chave: e.target.value })} className="ti-input is-mono" />
                          </div>
                        </div>
                        <div className="ti-field">
                          <label>Entidade</label>
                          <div className="ti-pills-pick is-plain">
                            <button type="button" className={!formSoftware.entidade ? "is-on" : ""} onClick={() => setFormSoftware({ ...formSoftware, entidade: "" })}>— Selecionar —</button>
                            {ENTIDADES_EMPRESA.map((entidade) => (
                              <button key={entidade} type="button" className={formSoftware.entidade === entidade ? "is-on" : ""} onClick={() => setFormSoftware({ ...formSoftware, entidade })}>{entidade}</button>
                            ))}
                          </div>
                        </div>
                        <div className="ti-field">
                          <label>Estado</label>
                          <div className="ti-pills-pick">
                            {ESTADOS_SOFTWARE.map((s) => (
                              <button key={s.value} type="button" className={formSoftware.estado === s.value ? "is-on" : ""} style={{ "--s": s.value === "ativo" ? "#16a34a" : s.value === "licenca_expirada" ? "#d97706" : "#64748b" }} onClick={() => setFormSoftware({ ...formSoftware, estado: s.value })}>
                                <i /> {s.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </section>
                      <section className="ti-fsec">
                        <h4>Compra & licença</h4>
                        <div className="ti-fgrid is-2">
                          <div className="ti-field">
                            <label>Fornecedor</label>
                            <input type="text" value={formSoftware.fornecedor} onChange={(e) => setFormSoftware({ ...formSoftware, fornecedor: e.target.value })} className="ti-input" />
                          </div>
                          <div className="ti-field">
                            <label>Fatura</label>
                            <input type="text" value={formSoftware.fatura} onChange={(e) => setFormSoftware({ ...formSoftware, fatura: e.target.value })} className="ti-input" />
                          </div>
                          <div className="ti-field">
                            <label>Data de aquisição</label>
                            <input type="date" value={formSoftware.data_aquisicao} onChange={(e) => setFormSoftware({ ...formSoftware, data_aquisicao: e.target.value })} className="ti-input" />
                          </div>
                          <div className="ti-field">
                            <label>Data de expiração</label>
                            <input type="date" value={formSoftware.data_expiracao} onChange={(e) => setFormSoftware({ ...formSoftware, data_expiracao: e.target.value })} className="ti-input" />
                          </div>
                        </div>
                      </section>
                    </>
                  )}

                  {modalType === "acesso" && (
                    <section className="ti-fsec">
                      <h4>Acesso</h4>
                      <div className="ti-field">
                        <label>Nome da plataforma / sistema</label>
                        <input type="text" required value={formAcesso.nome_plataforma} onChange={(e) => setFormAcesso({ ...formAcesso, nome_plataforma: e.target.value })} placeholder="Ex: WordPress Empresa" className="ti-input" />
                      </div>
                      <div className="ti-field">
                        <label>URL de acesso</label>
                        <input type="url" required value={formAcesso.url} onChange={(e) => setFormAcesso({ ...formAcesso, url: e.target.value })} placeholder="Ex: https://site.pt/admin" className="ti-input" />
                      </div>
                      <div className="ti-fgrid is-2">
                        <div className="ti-field">
                          <label>Utilizador / Email</label>
                          <input type="text" required value={formAcesso.username} onChange={(e) => setFormAcesso({ ...formAcesso, username: e.target.value })} placeholder="admin@…" className="ti-input" />
                        </div>
                        <div className="ti-field">
                          <label>Palavra-passe</label>
                          <div className="ti-input-wrap">
                            <input type={showFormPass ? "text" : "password"} required value={formAcesso.password} onChange={(e) => setFormAcesso({ ...formAcesso, password: e.target.value })} placeholder="Introduza a palavra-passe" className="ti-input is-mono" />
                            <button type="button" className="ti-icon-btn is-sm" onClick={() => setShowFormPass((v) => !v)} title={showFormPass ? "Ocultar" : "Mostrar"}>{showFormPass ? <Icons.EyeOff size={14} /> : <Icons.Eye size={14} />}</button>
                          </div>
                        </div>
                      </div>
                      <div className="ti-field">
                        <label>Estado</label>
                        <div className="ti-pills-pick">
                          {ESTADOS_ACESSO.map((s) => (
                            <button key={s.value} type="button" className={formAcesso.estado === s.value ? "is-on" : ""} style={{ "--s": s.value === "ativo" ? "#16a34a" : s.value === "expirado" ? "#dc2626" : "#64748b" }} onClick={() => setFormAcesso({ ...formAcesso, estado: s.value })}>
                              <i /> {s.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </section>
                  )}
                </div>

                <div className="ti-drawer-foot">
                  <button type="button" onClick={closePanel} className="ti-btn is-ghost">Cancelar</button>
                  <button type="submit" className="ti-btn is-primary is-lg" disabled={isSaving}>
                    <Icons.Save size={16} /> {isSaving ? "A gravar…" : "Guardar"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* MODAL CONFIRMAÇÃO */}
      {confirmModal && (
        <ModalPortal>
          <div className="ti-confirm-overlay" onClick={() => !isConfirming && setConfirmModal(null)}>
            <div className="ti-confirm" onClick={(e) => e.stopPropagation()}>
              <span className={`ti-confirm-ico ${confirmModal.perigoso ? "is-danger" : "is-ok"}`}>
                {confirmModal.perigoso ? <Icons.Power size={26} /> : <Icons.Check size={26} />}
              </span>
              <h3>{confirmModal.acao === "inativar" ? "Inativar registo?" : "Reativar registo?"}</h3>
              <p>
                {confirmModal.acao === "inativar"
                  ? <>Tem a certeza que pretende inativar <strong>{confirmModal.nome}</strong>? Pode reverter esta ação mais tarde.</>
                  : <>Tem a certeza que pretende reativar <strong>{confirmModal.nome}</strong>?</>}
              </p>
              <div className="ti-confirm-actions">
                <button type="button" className="ti-btn is-ghost" onClick={() => setConfirmModal(null)} disabled={isConfirming}>Cancelar</button>
                <button type="button" className={`ti-btn ${confirmModal.perigoso ? "is-danger" : "is-primary"}`} onClick={confirmarToggleEstado} disabled={isConfirming}>
                  {isConfirming ? "A processar…" : confirmModal.acao === "inativar" ? "Inativar" : "Reativar"}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
