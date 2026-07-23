import { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../services/supabase";

/* ------------------------------------------------------------------ */
/* Ícones SVG                                                         */
/* ------------------------------------------------------------------ */
const Icons = {
  Search: (p) => <IconBase {...p}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></IconBase>,
  Plus: (p) => <IconBase {...p}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></IconBase>,
  Folder: (p) => <IconBase {...p}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></IconBase>,
  Laptop: (p) => <IconBase {...p}><rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="2" y1="20" x2="22" y2="20" /></IconBase>,
  Lock: (p) => <IconBase {...p}><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></IconBase>,
  Activity: (p) => <IconBase {...p}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></IconBase>,
  Eye: (p) => <IconBase {...p}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></IconBase>,
  EyeOff: (p) => <IconBase {...p}><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></IconBase>,
  Copy: (p) => <IconBase {...p}><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></IconBase>,
  Close: (p) => <IconBase {...p}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></IconBase>,
  Save: (p) => <IconBase {...p}><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></IconBase>,
  Edit: (p) => <IconBase {...p}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z" /></IconBase>,
  Power: (p) => <IconBase {...p}><path d="M18.36 6.64a9 9 0 1 1-12.73 0" /><line x1="12" y1="2" x2="12" y2="12" /></IconBase>,
  ChevronDown: (p) => <IconBase {...p}><polyline points="6 9 12 15 18 9" /></IconBase>,
  AlertTriangle: (p) => <IconBase {...p}><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></IconBase>,
  Check: (p) => <IconBase {...p}><polyline points="20 6 9 17 4 12" /></IconBase>,
  Inbox: (p) => <IconBase {...p}><polyline points="22 12 16 12 14 15 10 15 8 12 2 12" /><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" /></IconBase>,
  Monitor: (p) => <IconBase {...p}><rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></IconBase>,
  Box: (p) => <IconBase {...p}><path d="M21 8v13H3V8" /><path d="M1 3h22v5H1z" /><line x1="10" y1="12" x2="14" y2="12" /></IconBase>,
  Router: (p) => <IconBase {...p}><path d="M5 12.55a11 11 0 0 1 14.08 0" /><path d="M1.42 9a16 16 0 0 1 21.16 0" /><path d="M8.53 16.11a6 6 0 0 1 6.95 0" /><line x1="12" y1="20" x2="12.01" y2="20" /></IconBase>,
  Cable: (p) => <IconBase {...p}><path d="M9 3v5a3 3 0 0 0 3 3v0a3 3 0 0 0 3-3V3" /><path d="M12 11v6" /><circle cx="12" cy="20" r="2" /></IconBase>,
  ChartBar: (p) => <IconBase {...p}><line x1="12" y1="20" x2="12" y2="10" /><line x1="18" y1="20" x2="18" y2="4" /><line x1="6" y1="20" x2="6" y2="16" /></IconBase>,
};

/* ------------------------------------------------------------------ */
/* Avatares de colaborador                                            */
/* ------------------------------------------------------------------ */
const AVATAR_CORES = ["#d97706", "#2563eb", "#059669", "#7c3aed", "#db2777", "#0d9488", "#ea580c", "#4f46e5"];

function getIniciais(nome) {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

function corAvatar(nome) {
  let hash = 0;
  for (let i = 0; i < nome.length; i++) hash = nome.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_CORES[Math.abs(hash) % AVATAR_CORES.length];
}

function IconBase({ size = 16, color = "currentColor", children }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{children}</svg>;
}

const ModalPortal = ({ children }) => createPortal(<div className="page-container">{children}</div>, document.body);

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
  { id: "computadores", label: "Computadores", icon: "Laptop", tipos: ["Computador", "Portátil", "Monitor", "Tablet"] },
  { id: "rede", label: "Rede", icon: "Router", tipos: ["Router", "Switch", "Access Point", "Cabo Ethernet"] },
  { id: "perifericos", label: "Periféricos e cabos", icon: "Cable", tipos: ["Teclado", "Rato", "Webcam", "Fones","Impressora", "Cabo HDMI", "Cabo de alimentação", "Carregador"] },
  { id: "outro", label: "Outro", icon: "Box", tipos: ["Outro"] },
];

function getCategoriaEquip(tipo) {
  return CATEGORIAS_EQUIP.find((c) => c.tipos.includes(tipo)) || CATEGORIAS_EQUIP[CATEGORIAS_EQUIP.length - 1];
}

function getIconeTipo(tipo) {
  const cat = getCategoriaEquip(tipo);
  if (cat.id === "computadores") return tipo === "Monitor" ? Icons.Monitor : Icons.Laptop;
  return Icons[cat.icon];
}

const ESTADO_MAP_EQUIP = {
  em_uso: { txt: "Em uso", cls: "badge-green" },
  em_stock: { txt: "Em stock", cls: "badge-grey" },
  em_reparacao: { txt: "Em reparação", cls: "badge-amber" },
  reservado: { txt: "Reservado", cls: "badge-purple" },
  abatido: { txt: "Abatido", cls: "badge-red" },
};
const ESTADO_MAP_ACESSO = {
  ativo: { txt: "Ativo", cls: "badge-green" },
  expirado: { txt: "Expirado", cls: "badge-red" },
  inativo: { txt: "Inativo", cls: "badge-grey" },
};
const ESTADO_MAP_SOFTWARE = {
  ativo: { txt: "Ativo", cls: "badge-green" },
  licenca_expirada: { txt: "Licença expirada", cls: "badge-amber" },
  arquivado: { txt: "Arquivado", cls: "badge-grey" },
};

function getCategoriaSoftware(tipo) {
  return SOFTWARE_TIPOS.find((c) => c.nomes.includes(tipo)) || SOFTWARE_TIPOS[SOFTWARE_TIPOS.length - 1];
}

function getIconeSoftware(tipo) {
  const categoria = getCategoriaSoftware(tipo);
  if (categoria.id === "sistema_operativo") return Icons.Monitor;
  if (categoria.id === "suite_produtividade") return Icons.Box;
  if (categoria.id === "seguranca") return Icons.Lock;
  return Icons.Box;
}

/* ------------------------------------------------------------------ */
/* Subcomponentes                                                     */
/* ------------------------------------------------------------------ */
function StatCard({ label, valor, icon, accent, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="stat-card"
      style={{ "--stat-accent": accent }}
    >
      <div className="stat-card-top">
        <span className="stat-card-label">{label}</span>
        <span className="stat-card-icon">{icon}</span>
      </div>
      <div className="stat-card-valor">{valor}</div>
    </button>
  );
}

function StatusDot({ estado, map }) {
  const info = map[estado] || { txt: "—", cls: "badge-grey" };
  return (
    <span className={`status-pill ${info.cls}`}>
      <span className="status-dot" />
      {info.txt}
    </span>
  );
}

function RowActions({ onEdit, onToggle, isAtivo, labelAtivar, labelInativar }) {
  return (
    <div className="row-actions">
      <button className="action-btn" title="Editar" onClick={onEdit}><Icons.Edit size={14} /></button>
      <button
        className={`action-btn ${isAtivo ? "action-btn-danger" : "action-btn-success"}`}
        title={isAtivo ? labelInativar : labelAtivar}
        onClick={onToggle}
      >
        <Icons.Power size={14} />
      </button>
    </div>
  );
}

function Avatar({ nome, url, size = 24 }) {
  const [erro, setErro] = useState(false);

  if (url && !erro) {
    return (
      <img
        src={url}
        alt={nome || "Colaborador"}
        className="avatar avatar-img"
        style={{ width: size, height: size }}
        onError={() => setErro(true)}
      />
    );
  }
  if (!nome) {
    return <span className="avatar avatar-empty" style={{ width: size, height: size }}><Icons.Box size={size * 0.5} /></span>;
  }
  return (
    <span className="avatar" style={{ background: corAvatar(nome), width: size, height: size }}>
      {getIniciais(nome)}
    </span>
  );
}

function DonutChart({ data, size = 132, thickness = 16 }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  let cumulative = 0;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="donut-svg">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#f1f5f9" strokeWidth={thickness} />
      <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
        {total > 0 && data.map((d) => {
          const frac = d.value / total;
          const dash = frac * circumference;
          const offset = -cumulative * circumference;
          cumulative += frac;
          return (
            <circle
              key={d.label}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              style={{ stroke: d.color }}
              strokeWidth={thickness}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={offset}
              strokeLinecap={data.length > 1 ? "butt" : "round"}
            />
          );
        })}
      </g>
      <text x="50%" y="48%" textAnchor="middle" className="donut-total">{total}</text>
      <text x="50%" y="64%" textAnchor="middle" className="donut-total-label">total</text>
    </svg>
  );
}

function AtribuidosOverview({ data }) {
  const [expandido, setExpandido] = useState(false);
  const visiveis = expandido ? data : data.slice(0, 9);
  const max = Math.max(...data.map((d) => d.itens.length), 1);

  return (
    <div className="atribuidos-chart-wrap">
      <div className="atribuidos-chart">
        {visiveis.map((pessoa) => (
          <div key={pessoa.nome} className="atribuidos-col" tabIndex={0}>
            <div className="atribuidos-tooltip">
              <strong>{pessoa.nome} · {pessoa.itens.length} {pessoa.itens.length === 1 ? "equipamento" : "equipamentos"}</strong>
              <ul>
                {pessoa.itens.map((e) => (
                  <li key={e.id}>
                    <span className="asset-tag asset-tag-sm">{e.num_inventario}</span>
                    <span>{e.modelo}</span>
                    <span className="atribuidos-tipo">{e.tipo}</span>
                  </li>
                ))}
              </ul>
            </div>

            <span className="atribuidos-valor">{pessoa.itens.length}</span>
            <div className="atribuidos-bar-track">
              <div className="atribuidos-bar" style={{ height: `${(pessoa.itens.length / max) * 100}%` }} />
            </div>
            <Avatar nome={pessoa.nome} url={pessoa.avatar_url} size={26} />
            <span className="atribuidos-nome" title={pessoa.nome}>{pessoa.nome.split(" ")[0]}</span>
          </div>
        ))}
      </div>
      {data.length > 10 && (
        <button type="button" className="link-btn atribuidos-vermais" onClick={() => setExpandido((v) => !v)}>
          {expandido ? "Ver menos" : `Ver mais (${data.length - 10})`}
        </button>
      )}
    </div>
  );
}

function EquipCard({ equipamento, colaboradorNome, colaboradorAvatarUrl, onEdit, onToggle }) {
  const ativo = equipamento.estado !== "abatido";
  const TipoIcon = getIconeTipo(equipamento.tipo);

  return (
    <div className={`equip-card ${!ativo ? "equip-card-inativo" : ""}`}>
      <div className="equip-card-head">
        <div className="equip-card-icon"><TipoIcon size={17} /></div>
        <StatusDot estado={equipamento.estado} map={ESTADO_MAP_EQUIP} />
      </div>

      <div className="equip-card-tag-row">
        <span className="asset-tag">{equipamento.num_inventario}</span>
        <span className="equip-card-tipo">{equipamento.tipo}</span>
      </div>

      <h3 className="equip-card-modelo">{equipamento.modelo}</h3>
      {equipamento.nome_pc && <p className="equip-card-pc">{equipamento.nome_pc}</p>}

      <div className="equip-card-meta">
        {equipamento.entidade && <span title="Entidade">{equipamento.entidade}</span>}
        {equipamento.fornecedor && <span title="Fornecedor">{equipamento.fornecedor}</span>}
        {equipamento.fatura && <span title="Fatura">Fatura {equipamento.fatura}</span>}
        {equipamento.data_aquisicao && <span title="Data de aquisição">Aquisição {new Date(equipamento.data_aquisicao).toLocaleDateString("pt-PT")}</span>}
        {(equipamento.prazo_garantia || equipamento.data_garantia) && (
          <span title="Prazo de garantia">
            Garantia {new Date(equipamento.prazo_garantia || equipamento.data_garantia).toLocaleDateString("pt-PT")}
          </span>
        )}
      </div>

      <div className="equip-card-footer">
        <div className="equip-card-colaborador">
          <Avatar nome={colaboradorNome} url={colaboradorAvatarUrl} />
          <span>{colaboradorNome || "Em stock"}</span>
        </div>
        <RowActions
          onEdit={onEdit}
          onToggle={onToggle}
          isAtivo={ativo}
          labelAtivar="Reativar equipamento"
          labelInativar="Abater equipamento"
        />
      </div>
    </div>
  );
}

function SoftwareCard({ software, onEdit, onToggle }) {
  const ativo = (software.estado || "ativo") === "ativo";
  const TipoIcon = getIconeSoftware(software.tipo);

  return (
    <div className={`equip-card ${!ativo ? "equip-card-inativo" : ""}`}>
      <div className="equip-card-head">
        <div className="equip-card-icon"><TipoIcon size={17} /></div>
        <StatusDot estado={software.estado || "ativo"} map={ESTADO_MAP_SOFTWARE} />
      </div>

      <div className="equip-card-tag-row">
        <span className="asset-tag">{software.codigo || software.nome}</span>
        <span className="equip-card-tipo">{software.tipo}</span>
      </div>

      <h3 className="equip-card-modelo">{software.nome}</h3>
      {software.versao && <p className="equip-card-pc">Versão {software.versao}</p>}

      <div className="equip-card-meta">
        {software.entidade && <span title="Entidade">{software.entidade}</span>}
        {software.fornecedor && <span title="Fornecedor">{software.fornecedor}</span>}
        {software.fatura && <span title="Fatura">Fatura {software.fatura}</span>}
        {software.data_aquisicao && <span title="Data de aquisição">Aquisição {new Date(software.data_aquisicao).toLocaleDateString("pt-PT")}</span>}
        {software.data_expiracao && <span title="Licença / validade">Vence {new Date(software.data_expiracao).toLocaleDateString("pt-PT")}</span>}
      </div>

      <div className="equip-card-footer">
        <div className="equip-card-colaborador">
          <span>{software.fornecedor || "Sem fornecedor"}</span>
        </div>
        <RowActions
          onEdit={onEdit}
          onToggle={onToggle}
          isAtivo={ativo}
          labelAtivar="Reativar software"
          labelInativar="Arquivar software"
        />
      </div>
    </div>
  );
}

function AcessoCard({ acesso, onEdit, onToggle, onCopy }) {
  const [visible, setVisible] = useState(false);
  const inativo = acesso.estado === "expirado" || acesso.estado === "inativo";

  return (
    <div className={`acesso-card ${inativo ? "acesso-card-inativo" : ""}`}>
      <div className="acesso-card-head">
        <div className="acesso-card-heading">
          <h3 className="acesso-card-title">{acesso.nome_plataforma}</h3>
          {acesso.url && (
            <a href={acesso.url} target="_blank" rel="noopener noreferrer" className="acesso-card-link">
              {acesso.url.replace(/^https?:\/\//, "")}
            </a>
          )}
        </div>
        <StatusDot estado={acesso.estado || "ativo"} map={ESTADO_MAP_ACESSO} />
      </div>

      <div className="acesso-card-body">
        <div className="acesso-card-field">
          <span className="acesso-card-field-label">Utilizador</span>
          <span className="acesso-card-field-value">{acesso.username}</span>
        </div>
        <div className="acesso-card-field">
          <span className="acesso-card-field-label">Palavra-passe</span>
          <span className="acesso-card-field-value acesso-card-pass">{visible ? acesso.password : "••••••••••••"}</span>
          <div className="acesso-card-field-actions">
            <button onClick={() => setVisible((v) => !v)} className="action-btn" title={visible ? "Ocultar" : "Mostrar"}>
              {visible ? <Icons.EyeOff size={14} /> : <Icons.Eye size={14} />}
            </button>
            <button className="action-btn" title="Copiar palavra-passe" onClick={() => onCopy(acesso.password)}>
              <Icons.Copy size={14} />
            </button>
          </div>
        </div>
      </div>

      <div className="acesso-card-footer">
        <RowActions
          onEdit={onEdit}
          onToggle={onToggle}
          isAtivo={!inativo}
          labelAtivar="Reativar acesso"
          labelInativar="Marcar como inativo"
        />
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

  const [equipamentos, setEquipamentos] = useState([]);
  const [software, setSoftware] = useState([]);
  const [acessos, setAcessos] = useState([]);
  const [utilizadores, setUtilizadores] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [notification, setNotification] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [isConfirming, setIsConfirming] = useState(false);

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
    setIsLoading(true);
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

  async function handleNovo() {
    const tipo = tab === "acessos" ? "acesso" : tab === "software" ? "software" : "equipamento";
    if (tab === "equip_inativos") setTab("equip_ativos");
    setModalType(tipo);
    setEditingId(null);
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

  function handleEditar(tipo, registo) {
    setModalType(tipo);
    setEditingId(registo.id);
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
    }, 360);
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

  const softwareFiltrado = useMemo(() => software
    .filter((item) => {
      if (filtroEstadoSoftware === "todos") return true;
      return (item.estado || "ativo") === filtroEstadoSoftware;
    })
    .filter((item) => (
      `${item.codigo || ""}${item.nome || ""}${item.versao || ""}${item.entidade || ""}${item.fornecedor || ""}`
        .toLowerCase()
        .includes(query.toLowerCase())
    )), [software, filtroEstadoSoftware, query]);

  const equipFiltrados = useMemo(() => equipamentos
    .filter((e) => {
      if (tab === "equip_ativos") return e.estado !== "abatido";
      if (tab === "equip_inativos") return e.estado === "abatido";
      return true;
    })
    .filter((e) => filtroEstadoEquip === "todos" || e.estado === filtroEstadoEquip)
    .filter((e) => (e.num_inventario + e.modelo + (colaboradoresMap[e.colaborador]?.nome || "")).toLowerCase().includes(query.toLowerCase())),
  [equipamentos, filtroEstadoEquip, query, tab, colaboradoresMap]);

  const acessosFiltrados = useMemo(() => acessos
    .filter((a) => {
      if (filtroEstadoAcesso === "todos") return true;
      if (filtroEstadoAcesso === "revisao") return a.estado === "expirado" || a.estado === "inativo";
      return (a.estado || "ativo") === filtroEstadoAcesso;
    })
    .filter((a) => (a.nome_plataforma + a.url + a.username).toLowerCase().includes(query.toLowerCase())),
  [acessos, filtroEstadoAcesso, query]);

  const equipPorCategoria = useMemo(() => {
    const grupos = {};
    equipFiltrados.forEach((e) => {
      const cat = getCategoriaEquip(e.tipo);
      if (!grupos[cat.id]) grupos[cat.id] = { label: cat.label, itens: [] };
      grupos[cat.id].itens.push(e);
    });
    return CATEGORIAS_EQUIP.map((c) => grupos[c.id]).filter(Boolean);
  }, [equipFiltrados]);

  const softwarePorCategoria = useMemo(() => {
    const grupos = {};
    softwareFiltrado.forEach((item) => {
      const cat = getCategoriaSoftware(item.tipo);
      if (!grupos[cat.id]) grupos[cat.id] = { label: cat.label, itens: [] };
      grupos[cat.id].itens.push(item);
    });
    return SOFTWARE_TIPOS.map((c) => grupos[c.id]).filter(Boolean);
  }, [softwareFiltrado]);

  const acessosPorEstado = useMemo(() => {
    const grupos = {};
    acessosFiltrados.forEach((a) => {
      const key = a.estado === "expirado" || a.estado === "inativo" ? "revisao" : "ativo";
      if (!grupos[key]) grupos[key] = { label: key === "ativo" ? "Ativos" : "A rever (expirado / inativo)", itens: [] };
      grupos[key].itens.push(a);
    });
    return ["ativo", "revisao"].map((k) => grupos[k]).filter(Boolean);
  }, [acessosFiltrados]);

  const totalAtivos = equipamentos.filter((e) => e.estado !== "abatido").length;
  const totalSoftwareAtivos = software.filter((item) => (item.estado || "ativo") === "ativo").length;
  const totalSoftwareExpirados = software.filter((item) => item.estado === "licenca_expirada").length;
  const totalAcessosProblema = acessos.filter((a) => a.estado === "expirado" || a.estado === "inativo").length;

  const COR = {
    brand: "var(--color-btnPrimary, #3b82f6)",
    brandDark: "var(--color-btnPrimaryDark, var(--color-btnPrimary, #1d4ed8))",
    neutral: "#b8e2a0",
    amber: "#d97706",
    purple: "#7c3aed",
    red: "#dc2626",
    black: "#000000",
  };
  const pastel = (cor, pct = 45) => `color-mix(in srgb, ${cor} ${pct}%, white)`;

  const kpisDinamic = [
    { label: "Equipamentos ativos", valor: totalAtivos, icon: <Icons.Laptop size={18} />, accent: COR.brand, onClick: () => setTab("equip_ativos") },
    { label: "Equipamentos abatidos", valor: equipamentos.length - totalAtivos, icon: <Icons.Power size={18} />, accent: COR.brandDark, onClick: () => setTab("equip_inativos") },
    { label: "Software ativos", valor: totalSoftwareAtivos, icon: <Icons.Box size={18} />, accent: COR.brand, onClick: () => setTab("software") },
    { label: "Software com licença expirada", valor: totalSoftwareExpirados, icon: <Icons.AlertTriangle size={18} />, accent: totalSoftwareExpirados > 0 ? COR.amber : COR.brandDark, onClick: () => setTab("software") },
    { label: "Acessos registados", valor: acessos.length, icon: <Icons.Lock size={18} />, accent: COR.brand, onClick: () => { setTab("acessos"); setFiltroEstadoAcesso("todos"); } },
    { label: "Acessos a rever", valor: totalAcessosProblema, icon: <Icons.AlertTriangle size={18} />, accent: totalAcessosProblema > 0 ? COR.amber : COR.brandDark, onClick: () => { setTab("acessos"); setFiltroEstadoAcesso("revisao"); } },
  ];

  const CORES_ESTADO_EQUIP = { em_uso: COR.brand, em_stock: COR.neutral, em_reparacao: COR.amber, reservado: COR.purple, abatido: COR.black };
  const estadoEquipData = useMemo(
    () => ESTADOS_EQUIP
      .map((s) => ({ label: s.label, value: equipamentos.filter((e) => e.estado === s.value).length, color: pastel(CORES_ESTADO_EQUIP[s.value]) }))
      .filter((d) => d.value > 0),
    [equipamentos]
  );

  const CORES_ESTADO_ACESSO = { ativo: COR.brand, expirado: COR.red, inativo: COR.neutral };
  const estadoAcessoData = useMemo(
    () => ESTADOS_ACESSO
      .map((s) => ({ label: s.label, value: acessos.filter((a) => (a.estado || "ativo") === s.value).length, color: pastel(CORES_ESTADO_ACESSO[s.value]) }))
      .filter((d) => d.value > 0),
    [acessos]
  );

  const estadoSoftwareData = useMemo(
    () => ESTADOS_SOFTWARE
      .map((s) => ({ label: s.label, value: software.filter((item) => (item.estado || "ativo") === s.value).length, color: pastel(s.value === "ativo" ? COR.brand : s.value === "licenca_expirada" ? COR.amber : COR.neutral) }))
      .filter((d) => d.value > 0),
    [software]
  );

  const atribuidosPorPessoa = useMemo(() => {
    const grupos = {};
    equipamentos
      .filter((e) => e.estado === "em_uso" && e.colaborador)
      .forEach((e) => {
        const info = colaboradoresMap[e.colaborador];
        if (!info) return;
        if (!grupos[e.colaborador]) grupos[e.colaborador] = { nome: info.nome, avatar_url: info.avatar_url, itens: [] };
        grupos[e.colaborador].itens.push(e);
      });
    return Object.values(grupos).sort((a, b) => b.itens.length - a.itens.length);
  }, [equipamentos, colaboradoresMap]);

  const recentes = useMemo(() => [...equipamentos].slice(0, 5), [equipamentos]);

  useEffect(() => { setQuery(""); }, [tab]);

  return (
    <div className="page-container">
      {notification && (
        <div className={`ativosti-toast ${notification.type}`} key={notification.key}>
          <span className="toast-icon">{notification.type === "success" ? <Icons.Check size={14} /> : <Icons.AlertTriangle size={14} />}</span>
          {notification.message}
        </div>
      )}

      {/* CABEÇALHO */}
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-header-icon"><Icons.Folder size={24} /></div>
          <div>
            <h1 className="page-title">Ativos TI</h1>
            <p className="page-subtitle">Gestão simples de equipamentos e acessos web.</p>
          </div>
        </div>
        <button onClick={handleNovo} className="btn-primary btn-with-icon">
          <Icons.Plus /> Novo Registo
        </button>
      </div>

      {/* NAVEGAÇÃO */}
      <div className="nav-row">
        <div className="tabs-segmented">
          <button onClick={() => setTab("painel")} className={`tab-btn ${tab === "painel" ? "tab-btn-active" : ""}`}>
            <Icons.Activity size={15} /> Painel
          </button>
          <button onClick={() => setTab("equip_ativos")} className={`tab-btn ${tab === "equip_ativos" ? "tab-btn-active" : ""}`}>
            <Icons.Laptop size={15} /> Equipamentos
          </button>
          <button onClick={() => setTab("equip_inativos")} className={`tab-btn ${tab === "equip_inativos" ? "tab-btn-active" : ""}`}>
            <Icons.Power size={15} /> Abatidos
          </button>
          <button onClick={() => setTab("software")} className={`tab-btn ${tab === "software" ? "tab-btn-active" : ""}`}>
            <Icons.Box size={15} /> Software
          </button>
          <button onClick={() => setTab("acessos")} className={`tab-btn ${tab === "acessos" ? "tab-btn-active" : ""}`}>
            <Icons.Lock size={15} /> Acessos
          </button>
        </div>

        {(tab.startsWith("equip") || tab === "software" || tab === "acessos") && (
          <div className="toolbar-inline">
            <div className="search-box">
              <span className="search-icon"><Icons.Search size={15} /></span>
              <input
                type="text"
                placeholder={tab.startsWith("equip") ? "Procurar por inventário, modelo ou colaborador…" : tab === "software" ? "Procurar por software, entidade ou fornecedor…" : "Procurar por plataforma, URL ou utilizador…"}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="search-input"
              />
              {query && (
                <button className="search-clear" onClick={() => setQuery("")} title="Limpar pesquisa">
                  <Icons.Close size={12} />
                </button>
              )}
            </div>

            {tab === "equip_ativos" && (
              <select className="filter-select" value={filtroEstadoEquip} onChange={(e) => setFiltroEstadoEquip(e.target.value)}>
                <option value="todos">Todos os estados</option>
                {ESTADOS_EQUIP.filter((s) => s.value !== "abatido").map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            )}
            {tab === "equip_inativos" && (
              <span className="filter-static">Filtrado por: Abatido</span>
            )}
            {tab === "software" && (
              <select className="filter-select" value={filtroEstadoSoftware} onChange={(e) => setFiltroEstadoSoftware(e.target.value)}>
                <option value="todos">Todos os estados</option>
                {ESTADOS_SOFTWARE.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            )}
            {tab === "acessos" && (
              <select className="filter-select" value={filtroEstadoAcesso} onChange={(e) => setFiltroEstadoAcesso(e.target.value)}>
                <option value="todos">Todos os estados</option>
                {ESTADOS_ACESSO.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                <option value="revisao">A rever (expirado / inativo)</option>
              </select>
            )}
          </div>
        )}
      </div>

      {/* CONTEÚDO */}
      {isLoading ? (
        <div className="loading-wrap">
          <div className="pulse-dot" />
          <span>A carregar dados…</span>
        </div>
      ) : (
        <>
          {tab === "painel" && (
            <div className="painel-layout">
              <div className="kpi-grid">
                {kpisDinamic.map((k) => <StatCard key={k.label} {...k} />)}
              </div>

              <div className="charts-row">
                <div className="panel-card chart-card">
                  <div className="panel-card-head">
                    <h2>Software por estado</h2>
                  </div>
                  {estadoSoftwareData.length === 0 ? (
                    <p className="panel-card-empty">Ainda não há software registado.</p>
                  ) : (
                    <div className="donut-layout">
                      <DonutChart data={estadoSoftwareData} />
                      <ul className="chart-legend">
                        {estadoSoftwareData.map((d) => (
                          <li key={d.label}>
                            <span className="legend-dot" style={{ background: d.color }} />
                            <span className="legend-label">{d.label}</span>
                            <span className="legend-value">{d.value}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="panel-card">
                  <div className="panel-card-head">
                    <h2>Software recentes</h2>
                    <button className="link-btn" onClick={() => setTab("software")}>Ver todos</button>
                  </div>
                  {software.length === 0 ? (
                    <p className="panel-card-empty">Ainda não há software registado.</p>
                  ) : (
                    <ul className="recentes-list">
                      {software.slice(0, 5).map((item) => (
                        <li key={item.id} className="recentes-item">
                          <div className="recentes-item-main">
                            <span className="asset-tag asset-tag-sm">{item.codigo || item.nome}</span>
                            <span className="cell-strong">{item.nome}</span>
                            <span className="cell-muted">· {item.entidade || "sem entidade"}</span>
                          </div>
                          <StatusDot estado={item.estado || "ativo"} map={ESTADO_MAP_SOFTWARE} />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div className="charts-row">
                <div className="panel-card chart-card">
                  <div className="panel-card-head">
                    <h2>Equipamentos por estado</h2>
                  </div>
                  {estadoEquipData.length === 0 ? (
                    <p className="panel-card-empty">Ainda não há equipamentos registados.</p>
                  ) : (
                    <div className="donut-layout">
                      <DonutChart data={estadoEquipData} />
                      <ul className="chart-legend">
                        {estadoEquipData.map((d) => (
                          <li key={d.label}>
                            <span className="legend-dot" style={{ background: d.color }} />
                            <span className="legend-label">{d.label}</span>
                            <span className="legend-value">{d.value}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="panel-card chart-card">
                  <div className="panel-card-head">
                    <h2>Acessos por estado</h2>
                  </div>
                  {estadoAcessoData.length === 0 ? (
                    <p className="panel-card-empty">Ainda não há acessos registados.</p>
                  ) : (
                    <div className="donut-layout">
                      <DonutChart data={estadoAcessoData} />
                      <ul className="chart-legend">
                        {estadoAcessoData.map((d) => (
                          <li key={d.label}>
                            <span className="legend-dot" style={{ background: d.color }} />
                            <span className="legend-label">{d.label}</span>
                            <span className="legend-value">{d.value}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              <div className="charts-row">
                <div className="panel-card">
                  <div className="panel-card-head">
                    <h2>Equipamento atribuído por colaborador</h2>
                    <span className="panel-card-hint">Apenas equipamento em uso</span>
                  </div>
                  {atribuidosPorPessoa.length === 0 ? (
                    <p className="panel-card-empty">Ainda não há equipamento atribuído a colaboradores.</p>
                  ) : (
                    <AtribuidosOverview data={atribuidosPorPessoa} />
                  )}
                </div>

                <div className="panel-card">
                  <div className="panel-card-head">
                    <h2>Equipamentos recentes</h2>
                    <button className="link-btn" onClick={() => setTab("equip_ativos")}>Ver todos</button>
                  </div>
                  {recentes.length === 0 ? (
                    <p className="panel-card-empty">Ainda não há equipamentos registados.</p>
                  ) : (
                    <ul className="recentes-list">
                      {recentes.map((e) => (
                        <li key={e.id} className="recentes-item">
                          <div className="recentes-item-main">
                            <span className="asset-tag asset-tag-sm">{e.num_inventario}</span>
                            <span className="cell-strong">{e.modelo}</span>
                            <span className="cell-muted">· {colaboradoresMap[e.colaborador]?.nome || "em stock"}</span>
                          </div>
                          <StatusDot estado={e.estado} map={ESTADO_MAP_EQUIP} />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}

          {(tab === "equip_ativos" || tab === "equip_inativos") && (
            equipFiltrados.length > 0 ? (
              <div className="equip-sections">
                {equipPorCategoria.map((grupo) => (
                  <div key={grupo.label} className="equip-section">
                    <div className="equip-section-head">
                      <h3>{grupo.label}</h3>
                      <span className="equip-section-count">{grupo.itens.length}</span>
                    </div>
                    <div className="equip-grid">
                      {grupo.itens.map((e) => (
                        <EquipCard
                          key={e.id}
                          equipamento={e}
                          colaboradorNome={colaboradoresMap[e.colaborador]?.nome}
                          colaboradorAvatarUrl={colaboradoresMap[e.colaborador]?.avatar_url}
                          onEdit={() => handleEditar("equipamento", e)}
                          onToggle={() => handleToggleEstado("equipamento", e)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <Icons.Inbox size={40} color="#cbd5e1" />
                <h3>{query ? "Nenhum equipamento corresponde à pesquisa." : tab === "equip_inativos" ? "Não há equipamentos abatidos." : "Ainda não há equipamentos registados."}</h3>
                {!query && tab === "equip_ativos" && (
                  <>
                    <p>Comece por adicionar o primeiro computador, monitor ou outro equipamento.</p>
                    <button className="btn-primary btn-with-icon" onClick={handleNovo}>
                      <Icons.Plus /> Adicionar equipamento
                    </button>
                  </>
                )}
              </div>
            )
          )}

          {tab === "software" && (
            softwareFiltrado.length > 0 ? (
              <div className="equip-sections">
                {softwarePorCategoria.map((grupo) => (
                  <div key={grupo.label} className="equip-section">
                    <div className="equip-section-head">
                      <h3>{grupo.label}</h3>
                      <span className="equip-section-count">{grupo.itens.length}</span>
                    </div>
                    <div className="equip-grid">
                      {grupo.itens.map((item) => (
                        <SoftwareCard
                          key={item.id}
                          software={item}
                          onEdit={() => handleEditar("software", item)}
                          onToggle={() => handleToggleEstado("software", item)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <Icons.Box size={40} color="#cbd5e1" />
                <h3>{query ? "Nenhum software corresponde à pesquisa." : "Ainda não há software registado."}</h3>
                {!query && (
                  <>
                    <p>Registe Windows, Microsoft 365 e outras licenças ou aplicações importantes.</p>
                    <button className="btn-primary btn-with-icon" onClick={handleNovo}>
                      <Icons.Plus /> Adicionar software
                    </button>
                  </>
                )}
              </div>
            )
          )}

          {tab === "acessos" && (
            acessosFiltrados.length > 0 ? (
              <div className="equip-sections">
                {acessosPorEstado.map((grupo) => (
                  <div key={grupo.label} className="equip-section">
                    <div className="equip-section-head">
                      <h3>{grupo.label}</h3>
                      <span className="equip-section-count">{grupo.itens.length}</span>
                    </div>
                    <div className="acessos-grid">
                      {grupo.itens.map((a) => (
                        <AcessoCard
                          key={a.id}
                          acesso={a}
                          onEdit={() => handleEditar("acesso", a)}
                          onToggle={() => handleToggleEstado("acesso", a)}
                          onCopy={handleCopyPassword}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <Icons.Lock size={40} color="#cbd5e1" />
                <h3>{query ? "Nenhum acesso corresponde à pesquisa." : "Ainda não há acessos registados."}</h3>
                {!query && <p>Guarde aqui os acessos a plataformas e sistemas web da organização.</p>}
                {!query && (
                  <button className="btn-primary btn-with-icon" onClick={handleNovo}>
                    <Icons.Plus /> Adicionar acesso
                  </button>
                )}
              </div>
            )
          )}
        </>
      )}

      {/* MODAL CRIAR / EDITAR */}
      {showModal && (
        <ModalPortal>
          <div onClick={closePanel} className="modal-overlay">
            <div
              className="modal-panel"
              style={{ animation: isClosingPanel ? "sidePanelPullOut 0.3s forwards" : "sidePanelPullIn 0.4s" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h3>{editingId ? "Editar registo" : "Adicionar registo"}</h3>
                <button onClick={closePanel} className="modal-close-btn"><Icons.Close /></button>
              </div>

              <div className="modal-body custom-scrollbar">
                {!editingId && (
                  <div className="type-toggle">
                    <button type="button" onClick={() => setModalType("equipamento")} className={`type-toggle-btn ${modalType === "equipamento" ? "type-toggle-btn-active" : ""}`}>
                      <Icons.Laptop size={15} /> Equipamento
                    </button>
                    <button type="button" onClick={() => setModalType("software")} className={`type-toggle-btn ${modalType === "software" ? "type-toggle-btn-active" : ""}`}>
                      <Icons.Box size={15} /> Software
                    </button>
                    <button type="button" onClick={() => setModalType("acesso")} className={`type-toggle-btn ${modalType === "acesso" ? "type-toggle-btn-active" : ""}`}>
                      <Icons.Lock size={15} /> Acesso
                    </button>
                  </div>
                )}

                <form onSubmit={handleSubmitAtivo}>
                  {modalType === "equipamento" && (
                    <div className="form-stack">
                      <div className="form-grid-2">
                        <div>
                          <label className="label">Nº Inventário</label>
                          <input type="text" required value={formEquip.num_inventario} onChange={(e) => setFormEquip({ ...formEquip, num_inventario: e.target.value })} className="input" />
                        </div>
                        <div>
                          <label className="label">Tipo</label>
                          <select value={formEquip.tipo} onChange={(e) => setFormEquip({ ...formEquip, tipo: e.target.value })} className="input">
                            {CATEGORIAS_EQUIP.map((cat) => (
                              <optgroup key={cat.id} label={cat.label}>
                                {cat.tipos.map((t) => <option key={t} value={t}>{t}</option>)}
                              </optgroup>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="label">Modelo</label>
                        <input type="text" required value={formEquip.modelo} onChange={(e) => setFormEquip({ ...formEquip, modelo: e.target.value })} className="input" />
                      </div>
                      <div>
                        <label className="label">Nome<span className="label-optional">(opcional)</span></label>
                        <input type="text" value={formEquip.nome_pc} onChange={(e) => setFormEquip({ ...formEquip, nome_pc: e.target.value })} className="input" />
                      </div>
                      <div>
                        <label className="label">Colaborador</label>
                        <select value={formEquip.colaborador} onChange={(e) => setFormEquip({ ...formEquip, colaborador: e.target.value })} className="input">
                          <option value="">— Nenhum —</option>
                          {utilizadores.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="label">Estado</label>
                        <select value={formEquip.estado} onChange={(e) => setFormEquip({ ...formEquip, estado: e.target.value })} className="input">
                          {ESTADOS_EQUIP.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="label">Entidade</label>
                        <select value={formEquip.entidade} onChange={(e) => setFormEquip({ ...formEquip, entidade: e.target.value })} className="input">
                          <option value="">— Selecionar —</option>
                          {ENTIDADES_EMPRESA.map((entidade) => <option key={entidade} value={entidade}>{entidade}</option>)}
                        </select>
                      </div>
                      <div className="form-grid-2">
                        <div>
                          <label className="label">Fornecedor</label>
                          <input type="text" value={formEquip.fornecedor} onChange={(e) => setFormEquip({ ...formEquip, fornecedor: e.target.value })} className="input" />
                        </div>
                        <div>
                          <label className="label">Fatura</label>
                          <input type="text" value={formEquip.fatura} onChange={(e) => setFormEquip({ ...formEquip, fatura: e.target.value })} className="input" />
                        </div>
                      </div>
                      <div className="form-grid-2">
                        <div>
                          <label className="label">Data de aquisição</label>
                          <input type="date" value={formEquip.data_aquisicao} onChange={(e) => setFormEquip({ ...formEquip, data_aquisicao: e.target.value })} className="input" />
                        </div>
                        <div>
                          <label className="label">Prazo de garantia</label>
                          <input type="date" value={formEquip.prazo_garantia} onChange={(e) => setFormEquip({ ...formEquip, prazo_garantia: e.target.value })} className="input" />
                        </div>
                      </div>
                    </div>
                  )}

                  {modalType === "software" && (
                    <div className="form-stack">
                      <div className="form-grid-2">
                        <div>
                          <label className="label">Código</label>
                          <input type="text" required value={formSoftware.codigo} onChange={(e) => setFormSoftware({ ...formSoftware, codigo: e.target.value })} className="input" />
                        </div>
                        <div>
                          <label className="label">Tipo</label>
                          <select value={formSoftware.tipo} onChange={(e) => setFormSoftware({ ...formSoftware, tipo: e.target.value })} className="input">
                            {SOFTWARE_TIPOS.flatMap((cat) => cat.nomes.map((nome) => <option key={nome} value={nome}>{nome}</option>))}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="label">Nome</label>
                        <input type="text" required value={formSoftware.nome} onChange={(e) => setFormSoftware({ ...formSoftware, nome: e.target.value })} placeholder="Ex: Windows 11 Pro" className="input" />
                      </div>
                      <div>
                        <label className="label">Versão<span className="label-optional">(opcional)</span></label>
                        <input type="text" value={formSoftware.versao} onChange={(e) => setFormSoftware({ ...formSoftware, versao: e.target.value })} className="input" />
                      </div>
                      <div>
                        <label className="label">Entidade</label>
                        <select value={formSoftware.entidade} onChange={(e) => setFormSoftware({ ...formSoftware, entidade: e.target.value })} className="input">
                          <option value="">— Selecionar —</option>
                          {ENTIDADES_EMPRESA.map((entidade) => <option key={entidade} value={entidade}>{entidade}</option>)}
                        </select>
                      </div>
                      <div className="form-grid-2">
                        <div>
                          <label className="label">Fornecedor</label>
                          <input type="text" value={formSoftware.fornecedor} onChange={(e) => setFormSoftware({ ...formSoftware, fornecedor: e.target.value })} className="input" />
                        </div>
                        <div>
                          <label className="label">Fatura</label>
                          <input type="text" value={formSoftware.fatura} onChange={(e) => setFormSoftware({ ...formSoftware, fatura: e.target.value })} className="input" />
                        </div>
                      </div>
                      <div className="form-grid-2">
                        <div>
                          <label className="label">Data de aquisição</label>
                          <input type="date" value={formSoftware.data_aquisicao} onChange={(e) => setFormSoftware({ ...formSoftware, data_aquisicao: e.target.value })} className="input" />
                        </div>
                        <div>
                          <label className="label">Data de expiração</label>
                          <input type="date" value={formSoftware.data_expiracao} onChange={(e) => setFormSoftware({ ...formSoftware, data_expiracao: e.target.value })} className="input" />
                        </div>
                      </div>
                      <div className="form-grid-2">
                        <div>
                          <label className="label">Chave de licença<span className="label-optional">(opcional)</span></label>
                          <input type="text" value={formSoftware.licenca_chave} onChange={(e) => setFormSoftware({ ...formSoftware, licenca_chave: e.target.value })} className="input" />
                        </div>
                        <div>
                          <label className="label">Estado</label>
                          <select value={formSoftware.estado} onChange={(e) => setFormSoftware({ ...formSoftware, estado: e.target.value })} className="input">
                            {ESTADOS_SOFTWARE.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {modalType === "acesso" && (
                    <div className="form-stack">
                      <div>
                        <label className="label">Nome da plataforma / sistema</label>
                        <input type="text" required value={formAcesso.nome_plataforma} onChange={(e) => setFormAcesso({ ...formAcesso, nome_plataforma: e.target.value })} placeholder="Ex: WordPress Empresa" className="input" />
                      </div>
                      <div>
                        <label className="label">URL de acesso</label>
                        <input type="url" required value={formAcesso.url} onChange={(e) => setFormAcesso({ ...formAcesso, url: e.target.value })} placeholder="Ex: https://site.pt/admin" className="input" />
                      </div>
                      <div className="form-grid-2">
                        <div>
                          <label className="label">Utilizador / Email</label>
                          <input type="text" required value={formAcesso.username} onChange={(e) => setFormAcesso({ ...formAcesso, username: e.target.value })} placeholder="admin@…" className="input" />
                        </div>
                        <div>
                          <label className="label">Palavra-passe</label>
                          <input type="text" required value={formAcesso.password} onChange={(e) => setFormAcesso({ ...formAcesso, password: e.target.value })} placeholder="Introduza a palavra-passe" className="input" />
                        </div>
                      </div>
                      <div>
                        <label className="label">Estado</label>
                        <select value={formAcesso.estado} onChange={(e) => setFormAcesso({ ...formAcesso, estado: e.target.value })} className="input">
                          {ESTADOS_ACESSO.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                      </div>
                    </div>
                  )}

                  <div className="modal-footer">
                    <button type="button" onClick={closePanel} className="btn-secondary">Cancelar</button>
                    <button type="submit" className="btn-primary btn-with-icon" disabled={isSaving}>
                      <Icons.Save /> {isSaving ? "A gravar…" : "Guardar"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* MODAL CONFIRMAÇÃO */}
      {confirmModal && (
        <ModalPortal>
          <div className="confirm-overlay" onClick={() => !isConfirming && setConfirmModal(null)}>
            <div className="confirm-card" onClick={(e) => e.stopPropagation()}>
              <div className={`confirm-icon ${confirmModal.perigoso ? "confirm-icon-danger" : "confirm-icon-brand"}`}>
                <Icons.AlertTriangle size={20} />
              </div>
              <h3 className="confirm-title">
                {confirmModal.acao === "inativar" ? "Inativar registo?" : "Reativar registo?"}
              </h3>
              <p className="confirm-desc">
                {confirmModal.acao === "inativar"
                  ? <>Tem a certeza que pretende inativar <strong>{confirmModal.nome}</strong>? Pode reverter esta ação mais tarde.</>
                  : <>Tem a certeza que pretende reativar <strong>{confirmModal.nome}</strong>?</>}
              </p>
              <div className="confirm-footer">
                <button className="btn-secondary" onClick={() => setConfirmModal(null)} disabled={isConfirming}>Cancelar</button>
                <button
                  className={confirmModal.perigoso ? "btn-danger" : "btn-primary"}
                  onClick={confirmarToggleEstado}
                  disabled={isConfirming}
                >
                  {isConfirming ? "A processar…" : confirmModal.acao === "inativar" ? "Inativar" : "Reativar"}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      <style>{`
        .page-container { max-width: 1500px; margin: 0 auto; }

        /* ---------- HEADER (inalterado) ---------- */
        .page-container .page-header { background: white; padding: 20px 25px; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 20px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); display: flex; justify-content: space-between; align-items: center; gap: 15px; flex-wrap: wrap; }
        .page-container .page-header-left { display: flex; align-items: center; gap: 15px; }
        .page-container .page-header-icon { background: var(--color-bgSecondary); color: var(--color-btnPrimary); padding: 12px; border-radius: 12px; display: flex; }
        .page-container .page-title { margin: 0; color: #0f172a; font-size: 1.8rem; font-weight: 900; letter-spacing: -0.02em; }
        .page-container .page-subtitle { color: #64748b; margin: 0; font-weight: 500; font-size: 0.9rem; }

        .page-container .btn-primary { background: linear-gradient(135deg, var(--color-btnPrimary, #3b82f6), var(--color-btnPrimaryDark, #1d4ed8)); color: white; border: none; border-radius: 10px; cursor: pointer; transition: 0.2s; padding: 12px 20px; font-weight: bold; font-size: 0.9rem; }
        .page-container .btn-primary:hover { box-shadow: 0 4px 10px rgba(0,0,0,0.08); transform: translateY(-2px); }
        .page-container .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
        .page-container .btn-with-icon { display: flex; align-items: center; gap: 8px; }
        .page-container .btn-secondary { padding: 12px 24px; background: white; border: 1px solid #cbd5e1; border-radius: 10px; cursor: pointer; font-weight: 600; color: #475569; font-size: 0.9rem; }
        .page-container .btn-secondary:hover { background: #f8fafc; }
        .page-container .btn-secondary:disabled { opacity: 0.6; cursor: not-allowed; }
        .page-container .btn-danger { padding: 12px 24px; background: #ef4444; border: none; border-radius: 10px; cursor: pointer; font-weight: 700; color: white; font-size: 0.9rem; }
        .page-container .btn-danger:hover { background: #dc2626; }
        .page-container .btn-danger:disabled { opacity: 0.6; cursor: not-allowed; }
        .page-container .link-btn { background: none; border: none; color: var(--color-btnPrimary); font-weight: 700; font-size: 0.85rem; cursor: pointer; padding: 4px; }
        .page-container .link-btn:hover { text-decoration: underline; }

        /* ---------- NAVEGAÇÃO ---------- */
        .page-container .nav-row { display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap; margin-bottom: 22px; }
        .page-container .tabs-segmented { display: inline-flex; gap: 2px; background: #eef1f5; padding: 4px; border-radius: 12px; }
        .page-container .tab-btn { padding: 9px 16px; background: transparent; color: #64748b; border: none; border-radius: 9px; font-weight: 700; font-size: 0.85rem; cursor: pointer; transition: 0.15s; display: flex; align-items: center; gap: 7px; }
        .page-container .tab-btn:hover { color: #334155; }
        .page-container .tab-btn-active { background: white; color: var(--color-btnPrimaryDark, var(--color-btnPrimary)); box-shadow: 0 1px 3px rgba(0,0,0,0.08); }

        .page-container .toolbar-inline { display: flex; gap: 10px; align-items: center; flex: 1; min-width: 260px; justify-content: flex-end; }
        .page-container .search-box { position: relative; flex: 1 1 auto; min-width: 200px; }
        .page-container .search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #94a3b8; display: flex; }
        .page-container .search-input { width: 100%; padding: 9px 32px 9px 36px; border-radius: 10px; border: 1px solid #dfe4ea; outline: none; box-sizing: border-box; font-size: 0.85rem; background: white; transition: 0.15s; }
        .page-container .search-input:focus { border-color: var(--color-btnPrimary); box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-btnPrimary) 15%, transparent); }
        .page-container .search-clear { position: absolute; right: 8px; top: 50%; transform: translateY(-50%); background: #eef1f5; border: none; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #64748b; }
        .page-container .search-clear:hover { background: #e2e8f0; }
        .page-container .filter-select { appearance: none; -webkit-appearance: none; -moz-appearance: none; flex: 0 0 auto; width: 190px; border: 1px solid #dfe4ea; background-color: white; background-image: url("data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 10px center; background-size: 14px; border-radius: 10px; padding: 9px 32px 9px 14px; outline: none; font-size: 0.85rem; color: #334155; font-weight: 600; cursor: pointer; line-height: normal; text-overflow: ellipsis; white-space: nowrap; overflow: hidden; }
        .page-container .filter-select:focus { border-color: var(--color-btnPrimary); }
        .page-container .filter-static { font-size: 0.83rem; color: #94a3b8; font-weight: 600; padding: 9px 4px; white-space: nowrap; }

        /* ---------- ASSET TAG (elemento assinatura) ---------- */
        .page-container .asset-tag { position: relative; display: inline-flex; align-items: center; font-family: 'SF Mono', Menlo, monospace; font-weight: 800; font-size: 0.72rem; letter-spacing: 0.03em; color: var(--color-btnPrimaryDark, var(--color-btnPrimary)); background: var(--color-bgSecondary); padding: 5px 10px 5px 21px; border-radius: 5px; }
        .page-container .asset-tag::before { content: ''; position: absolute; left: 8px; top: 50%; transform: translateY(-50%); width: 5px; height: 5px; border-radius: 50%; background: #fff; box-shadow: 0 0 0 1.4px currentColor; }
        .page-container .asset-tag-sm { font-size: 0.68rem; padding: 3px 8px 3px 17px; }
        .page-container .asset-tag-sm::before { left: 6px; width: 4px; height: 4px; }

        /* ---------- CARDS DE EQUIPAMENTO ---------- */
        .page-container .equip-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 16px; }
        .page-container .equip-card { background: white; border: 1px solid #e9edf2; border-radius: 14px; padding: 18px; display: flex; flex-direction: column; gap: 12px; transition: 0.15s; }
        .page-container .equip-card:hover { box-shadow: 0 4px 14px rgba(0,0,0,0.06); transform: translateY(-1px); }
        .page-container .equip-card-inativo { opacity: 0.6; }
        .page-container .equip-card-head { display: flex; justify-content: space-between; align-items: center; }
        .page-container .equip-card-icon { width: 34px; height: 34px; border-radius: 9px; background: var(--color-bgSecondary); color: var(--color-btnPrimary); display: flex; align-items: center; justify-content: center; }
        .page-container .equip-card-tag-row { display: flex; align-items: center; gap: 8px; }
        .page-container .equip-card-tipo { font-size: 0.75rem; color: #94a3b8; font-weight: 600; }
        .page-container .equip-card-modelo { margin: 0; font-size: 1rem; font-weight: 800; color: #0f172a; line-height: 1.25; }
        .page-container .equip-card-pc { margin: -6px 0 0 0; font-size: 0.8rem; color: #94a3b8; }
        .page-container .equip-card-meta { display: flex; flex-wrap: wrap; gap: 6px 8px; margin-top: -2px; }
        .page-container .equip-card-meta span { background: #f8fafc; border: 1px solid #eef2f7; color: #64748b; border-radius: 999px; padding: 3px 8px; font-size: 0.7rem; font-weight: 600; }
        .page-container .equip-card-footer { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #f1f5f9; padding-top: 12px; margin-top: 2px; }
        .page-container .equip-card-colaborador { display: flex; align-items: center; gap: 8px; font-size: 0.8rem; color: #475569; font-weight: 600; min-width: 0; }
        .page-container .equip-card-colaborador span:last-child { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

        .page-container .avatar { width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.62rem; font-weight: 800; color: white; flex-shrink: 0; }
        .page-container .avatar-empty { background: #eef1f5 !important; color: #94a3b8; }
        .page-container .avatar-img { object-fit: cover; flex-shrink: 0; }

        /* ---------- PAINEL ---------- */
        .page-container .painel-layout { display: flex; flex-direction: column; gap: 22px; }
        .page-container .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; }
        .page-container .stat-card { background: white; border-radius: 14px; padding: 16px 18px; border: 1px solid #e9edf2; border-left: 4px solid var(--stat-accent, #cbd5e1); cursor: pointer; display: flex; flex-direction: column; gap: 10px; transition: all 0.15s; text-align: left; }
        .page-container .stat-card:hover { box-shadow: 0 4px 14px rgba(0,0,0,0.07); transform: translateY(-1px); }
        .page-container .stat-card-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; }
        .page-container .stat-card-label { font-size: 0.82rem; color: #475569; font-weight: 700; }
        .page-container .stat-card-icon { width: 34px; height: 34px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; background: color-mix(in srgb, var(--stat-accent, #94a3b8) 16%, white); color: var(--stat-accent, #64748b); }
        .page-container .stat-card-valor { font-size: 1.6rem; font-weight: 900; color: #0f172a; line-height: 1.1; }

        .page-container .panel-card { background: white; border-radius: 14px; border: 1px solid #e9edf2; padding: 20px 22px; }
        .page-container .panel-card-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
        .page-container .panel-card-head h2 { margin: 0; font-size: 1rem; color: #1e293b; font-weight: 800; }
        .page-container .panel-card-hint { font-size: 0.75rem; color: #94a3b8; font-weight: 600; }
        .page-container .panel-card-empty { color: #94a3b8; font-size: 0.88rem; margin: 0; }
        .page-container .recentes-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
        .page-container .recentes-item { display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
        .page-container .recentes-item:last-child { border-bottom: none; }
        .page-container .recentes-item-main { display: flex; align-items: center; gap: 6px; font-size: 0.85rem; flex-wrap: wrap; row-gap: 2px; }

        /* ---------- GRÁFICOS ---------- */
        .page-container .charts-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; }
        .page-container .chart-card { display: flex; flex-direction: column; }
        .page-container .donut-layout { display: flex; align-items: center; gap: 22px; flex-wrap: wrap; }
        .page-container .donut-svg { flex-shrink: 0; }
        .page-container .donut-total { font-size: 1.5rem; font-weight: 900; fill: #0f172a; }
        .page-container .donut-total-label { font-size: 0.62rem; fill: #94a3b8; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }
        .page-container .chart-legend { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 9px; flex: 1; min-width: 140px; }
        .page-container .chart-legend li { display: flex; align-items: center; gap: 8px; font-size: 0.82rem; color: #475569; font-weight: 600; }
        .page-container .legend-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .page-container .legend-label { flex: 1; }
        .page-container .legend-value { font-weight: 800; color: #0f172a; }

        .page-container .atribuidos-chart-wrap { display: flex; flex-direction: column; }
        .page-container .atribuidos-chart { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 22px 20px; padding: 30px 4px 0; }
        .page-container .atribuidos-col { position: relative; display: flex; flex-direction: column; align-items: center; gap: 6px; width: 52px; cursor: default; }
        .page-container .atribuidos-valor { font-size: 0.78rem; font-weight: 800; color: #0f172a; }
        .page-container .atribuidos-bar-track { height: 130px; width: 26px; display: flex; align-items: flex-end; background: #f1f5f9; border-radius: 7px; overflow: hidden; }
        .page-container .atribuidos-bar { width: 100%; min-height: 4px; border-radius: 7px 7px 0 0; background: linear-gradient(180deg, var(--color-btnPrimary, #3b82f6), var(--color-btnPrimaryDark, #1d4ed8)); transition: height 0.3s ease; }
        .page-container .atribuidos-col:hover .atribuidos-bar-track, .page-container .atribuidos-col:focus-visible .atribuidos-bar-track { background: #e9edf2; }
        .page-container .atribuidos-nome { font-size: 0.72rem; font-weight: 700; color: #475569; max-width: 60px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .page-container .atribuidos-tooltip { display: none; position: absolute; z-index: 30; bottom: calc(100% + 10px); left: 50%; transform: translateX(-50%); min-width: 220px; max-width: 300px; background: #0f172a; color: white; border-radius: 12px; padding: 12px 14px; box-shadow: 0 14px 30px rgba(0,0,0,0.28); }
        .page-container .atribuidos-tooltip::after { content: ''; position: absolute; top: 100%; left: 50%; transform: translateX(-50%); border: 6px solid transparent; border-top-color: #0f172a; }
        .page-container .atribuidos-col:hover .atribuidos-tooltip, .page-container .atribuidos-col:focus-visible .atribuidos-tooltip { display: block; }
        .page-container .atribuidos-tooltip strong { display: block; font-size: 0.78rem; font-weight: 700; margin-bottom: 8px; color: #e2e8f0; white-space: normal; }
        .page-container .atribuidos-tooltip ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 7px; max-height: 200px; overflow-y: auto; }
        .page-container .atribuidos-tooltip li { display: flex; align-items: center; gap: 8px; font-size: 0.8rem; color: #e2e8f0; }
        .page-container .atribuidos-tooltip .asset-tag { background: rgba(255,255,255,0.14); color: #fff; }
        .page-container .atribuidos-tooltip .asset-tag::before { background: #0f172a; }
        .page-container .atribuidos-tipo { color: #94a3b8; font-size: 0.76rem; margin-left: auto; }
        .page-container .atribuidos-vermais { margin-top: 10px; align-self: center; }

        /* ---------- SECÇÕES (divisórias por categoria / estado) ---------- */
        .page-container .equip-sections { display: flex; flex-direction: column; gap: 26px; }
        .page-container .equip-section-head { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
        .page-container .equip-section-head h3 { margin: 0; font-size: 0.78rem; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; white-space: nowrap; }
        .page-container .equip-section-head::after { content: ''; flex: 1; height: 1px; background: #e9edf2; }
        .page-container .equip-section-count { background: #f1f5f9; color: #64748b; font-size: 0.7rem; font-weight: 800; padding: 2px 8px; border-radius: 10px; }

        /* ---------- BADGES / STATUS ---------- */
        .page-container .status-pill { display: inline-flex; align-items: center; gap: 6px; font-size: 0.72rem; padding: 5px 11px; border-radius: 20px; font-weight: 700; }
        .page-container .status-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
        .page-container .badge-green { background: #ecfdf3; color: #15803d; }
        .page-container .badge-grey { background: #f1f5f9; color: #475569; }
        .page-container .badge-amber { background: #fffbeb; color: #b45309; }
        .page-container .badge-purple { background: #f3e8ff; color: #7e22ce; }
        .page-container .badge-red { background: #fef2f2; color: #dc2626; }

        .page-container .row-actions { display: flex; gap: 4px; }
        .page-container .action-btn { background: transparent; border: none; cursor: pointer; opacity: 0.6; transition: 0.15s; display: flex; align-items: center; justify-content: center; padding: 6px; border-radius: 7px; color: #334155; }
        .page-container .action-btn:hover { opacity: 1; background: #f1f5f9; }
        .page-container .action-btn-danger:hover { background: #fef2f2; color: #ef4444; }
        .page-container .action-btn-success:hover { background: #ecfdf3; color: #16a34a; }

        .page-container .cell-muted { color: #94a3b8; }
        .page-container .cell-strong { font-weight: 700; color: #1e293b; }

        /* ---------- ACESSOS ---------- */
        .page-container .acessos-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }
        .page-container .acesso-card { background: white; border: 1px solid #e9edf2; border-radius: 14px; padding: 18px; display: flex; flex-direction: column; gap: 14px; transition: 0.15s; }
        .page-container .acesso-card:hover { box-shadow: 0 4px 14px rgba(0,0,0,0.06); }
        .page-container .acesso-card-inativo { opacity: 0.65; }
        .page-container .acesso-card-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; }
        .page-container .acesso-card-heading { min-width: 0; }
        .page-container .acesso-card-title { margin: 0 0 3px 0; color: #0f172a; font-size: 1rem; font-weight: 800; }
        .page-container .acesso-card-link { color: var(--color-btnPrimary); font-size: 0.78rem; text-decoration: none; word-break: break-all; }
        .page-container .acesso-card-link:hover { text-decoration: underline; }
        .page-container .acesso-card-body { background: #fafbfc; border-radius: 10px; padding: 12px 14px; border: 1px solid #f1f5f9; display: flex; flex-direction: column; gap: 10px; }
        .page-container .acesso-card-field { display: flex; align-items: center; gap: 8px; font-size: 0.83rem; }
        .page-container .acesso-card-field-label { color: #94a3b8; font-weight: 600; width: 92px; flex-shrink: 0; }
        .page-container .acesso-card-field-value { color: #334155; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .page-container .acesso-card-pass { font-family: 'SF Mono', Menlo, monospace; flex: 1; }
        .page-container .acesso-card-field-actions { display: flex; gap: 2px; margin-left: auto; }
        .page-container .acesso-card-footer { display: flex; justify-content: flex-end; border-top: 1px solid #f1f5f9; padding-top: 10px; }

        .page-container .empty-state { grid-column: 1 / -1; text-align: center; padding: 56px 30px; background: white; border-radius: 16px; border: 1px dashed #d8dee6; display: flex; flex-direction: column; align-items: center; gap: 6px; }
        .page-container .empty-state h3 { color: #1e293b; margin: 10px 0 2px 0; font-size: 1rem; }
        .page-container .empty-state p { color: #94a3b8; margin: 0 0 12px 0; font-size: 0.87rem; max-width: 320px; }

        /* ---------- LOADING ---------- */
        .page-container .loading-wrap { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 40vh; gap: 12px; color: #94a3b8; font-size: 0.85rem; font-weight: 600; }
        .page-container .pulse-dot { width: 12px; height: 12px; border-radius: 50%; background: var(--color-btnPrimary, #3b82f6); animation: pulse 1.5s infinite; }

        /* ---------- TOAST ---------- */
        .page-container .ativosti-toast { position: fixed; top: 20px; right: 20px; z-index: 100000; width: max-content; max-width: min(90vw, 380px); height: auto; box-sizing: border-box; background: #0f172a; color: white; padding: 12px 18px; border-radius: 10px; font-size: 0.85rem; font-weight: 600; display: flex; align-items: center; gap: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); animation: toastIn 0.25s ease-out; }
        .page-container .ativosti-toast.error { background: #dc2626; }
        .page-container .toast-icon { display: flex; }

        /* ---------- MODAL (drawer) ---------- */
        .page-container .modal-overlay { position: fixed; inset: 0; background: rgba(15,23,42,0.5); backdrop-filter: blur(2px); display: flex; align-items: stretch; justify-content: flex-end; z-index: 99999; }
        .page-container .modal-panel { background: #fff; width: min(98vw, 560px); height: 100vh; border-radius: 18px 0 0 18px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.35); display: flex; flex-direction: column; }
        .page-container .modal-header { padding: 20px 28px; border-bottom: 1px solid #eef1f5; display: flex; justify-content: space-between; align-items: center; }
        .page-container .modal-header h3 { margin: 0; color: #0f172a; font-size: 1.2rem; font-weight: 800; }
        .page-container .modal-close-btn { background: #f1f5f9; border: none; width: 34px; height: 34px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #475569; }
        .page-container .modal-close-btn:hover { background: #e2e8f0; }
        .page-container .modal-body { padding: 26px 28px 30px; overflow-y: auto; flex: 1; }
        .page-container .modal-footer { margin-top: 28px; padding-top: 18px; border-top: 1px solid #eef1f5; display: flex; justify-content: flex-end; gap: 12px; }

        .page-container .type-toggle { display: flex; background: #f1f5f9; padding: 4px; border-radius: 11px; margin-bottom: 26px; }
        .page-container .type-toggle-btn { flex: 1; padding: 10px; border: none; background: transparent; color: #64748b; border-radius: 8px; font-weight: 700; font-size: 0.85rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 7px; }
        .page-container .type-toggle-btn-active { background: white; color: var(--color-btnPrimaryDark, var(--color-btnPrimary)); box-shadow: 0 1px 3px rgba(0,0,0,0.08); }

        .page-container .form-stack { display: flex; flex-direction: column; gap: 18px; }
        .page-container .form-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
        .page-container .label { display: block; margin-bottom: 6px; font-size: 0.82rem; font-weight: 700; color: #334155; }
        .page-container .label-optional { font-weight: 500; color: #94a3b8; }
        .page-container .input { width: 100%; padding: 10px 12px; border-radius: 9px; border: 1px solid #dfe4ea; background: #fff; font-size: 0.9rem; outline: none; box-sizing: border-box; color: #1e293b; transition: 0.15s; }
        .page-container .input:focus { border-color: var(--color-btnPrimary) !important; box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-btnPrimary) 15%, transparent); }

        .page-container .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
        .page-container .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .page-container .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 10px; }

        /* ---------- MODAL CONFIRMAÇÃO ---------- */
        .page-container .confirm-overlay { position: fixed; inset: 0; background: rgba(15,23,42,0.55); backdrop-filter: blur(2px); display: flex; align-items: center; justify-content: center; z-index: 100001; padding: 20px; }
        .page-container .confirm-card { background: white; border-radius: 16px; padding: 26px; width: min(92vw, 380px); box-shadow: 0 25px 50px -12px rgba(0,0,0,0.35); animation: confirmIn 0.2s ease-out; }
        .page-container .confirm-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-bottom: 14px; }
        .page-container .confirm-icon-danger { background: #fef2f2; color: #dc2626; }
        .page-container .confirm-icon-brand { background: var(--color-bgSecondary); color: var(--color-btnPrimary); }
        .page-container .confirm-title { margin: 0 0 8px 0; font-size: 1.05rem; font-weight: 800; color: #0f172a; }
        .page-container .confirm-desc { margin: 0 0 22px 0; font-size: 0.87rem; color: #64748b; line-height: 1.5; }
        .page-container .confirm-footer { display: flex; justify-content: flex-end; gap: 10px; }

        @keyframes pulse { 0% { transform: scale(0.95); box-shadow: 0 0 0 0 color-mix(in srgb, var(--color-btnPrimary) 60%, transparent); } 70% { transform: scale(1); box-shadow: 0 0 0 10px transparent; } 100% { transform: scale(0.95); box-shadow: 0 0 0 0 transparent; } }
        @keyframes toastIn { from { transform: translateY(-10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes confirmIn { from { transform: scale(0.96); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes sidePanelPullIn { 0% { transform: translateX(100%); opacity: 0.72; } 72% { transform: translateX(-10px); opacity: 1; } 100% { transform: translateX(0); opacity: 1; } }
        @keyframes sidePanelPullOut { 0% { transform: translateX(0); opacity: 1; } 100% { transform: translateX(100%); opacity: 0.78; } }

        @media (max-width: 640px) {
          .page-container .nav-row { flex-direction: column; align-items: stretch; }
          .page-container .toolbar-inline { justify-content: stretch; flex-wrap: wrap; }
          .page-container .search-box { min-width: 0; }
          .page-container .filter-select { width: 100%; }
          .page-container .form-grid-2 { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
