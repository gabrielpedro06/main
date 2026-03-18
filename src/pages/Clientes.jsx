import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom"; 
import { supabase } from "../services/supabase";
import { useAuth } from "../context/AuthContext";
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
  Mail: ({ size = 14, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
};

const ModalPortal = ({ children }) => {
  return createPortal(children, document.body);
};

export default function Clientes() {
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();

  const [podeVerAcessos, setPodeVerAcessos] = useState(false);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [mostrarInativos, setMostrarInativos] = useState(false); 
  const [notification, setNotification] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null); 
  const [isViewOnly, setIsViewOnly] = useState(false);
  const [activeTab, setActiveTab] = useState("geral");

  const [showAddContacto, setShowAddContacto] = useState(false);
  const [showAddMorada, setShowAddMorada] = useState(false);
  const [showAddCae, setShowAddCae] = useState(false);
  const [showAddAcesso, setShowAddAcesso] = useState(false);

  // FORMULÁRIO GERAL 
  const initialForm = {
    marca: "", sigla: "", nif: "", entidade: "", website: "",
    objeto_social: "", plano: "Standard",
    certidao_permanente: "", validade_certidao: "",
    rcbe: "", validade_rcbe: "", ativo: true
  };
  const [form, setForm] = useState(initialForm);

  const [contactos, setContactos] = useState([]);
  const [moradas, setMoradas] = useState([]);
  const [acessos, setAcessos] = useState([]);
  const [caes, setCaes] = useState([]);
  const [pendingAutoCaes, setPendingAutoCaes] = useState([]);
  const [pendingAutoMorada, setPendingAutoMorada] = useState(null);
  
  // Histórico de Projetos do Cliente
  const [projetosCliente, setProjetosCliente] = useState([]);

  // Modais Confirmação Global
  const [confirmDialog, setConfirmDialog] = useState({ show: false, message: '', confirmText: '', onConfirm: null, isDanger: false });

  // SUB-FORMS INICIAIS
  const initContacto = { nome_contacto: "", email: "", telefone: "", cargo: "" };
  const initMorada = { morada: "", localidade: "", codigo_postal: "", concelho: "", distrito: "", regiao: "", notas: "" };
  const initAcesso = { organismo: "", utilizador: "", codigo: "", url: "" };
  const initCae = { codigo: "", descricao: "", principal: false };

  const [novoContacto, setNovoContacto] = useState(initContacto);
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

  const showToast = (message, type = 'success') => {
      setNotification({ message, type });
      setTimeout(() => setNotification(null), 3500);
  };

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
    
    const { data: cliData, error: errCli } = await supabase
        .from("clientes")
        .select("*, contactos_cliente(nome_contacto, email, telefone)")
        .order("created_at", { ascending: false });

    const { data: morData } = await supabase
        .from("moradas_cliente")
        .select("cliente_id, localidade, concelho");

    if (!errCli && cliData) {
        const clientesComMorada = cliData.map(c => {
            const moradas = morData?.filter(m => m.cliente_id === c.id) || [];
            return { ...c, moradas_cliente: moradas, ativo: c.ativo !== false }; 
        });
        setClientes(clientesComMorada);
    }
    
    setLoading(false);
  }

  // --- INTEGRAÇÃO NIF.PT ---
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
            `Já existe uma empresa com este NIF: ${clienteExistente.marca || "Sem nome"}.`,
            "warning"
          );
          return;
        }

        showToast("A consultar dados no NIF.pt...", "info");

        const params = new URLSearchParams({ json: "1", q: nifDigitado });
        const nifApiKey = (import.meta.env.VITE_NIFPT_KEY || "9beb59d324c1477245e04e0b5988bdd2").trim();
        if (nifApiKey) params.set("key", nifApiKey);

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
          return;
        }

        if (data?.credits?.left?.day === 0) {
          showToast("NIF.pt indisponível: limite diário de consultas atingido.", "warning");
          return;
        }
        
        let record = null;
        if (data.records && data.records[nifDigitado]) record = data.records[nifDigitado];
        else if (data[nifDigitado]) record = data[nifDigitado];

        if (record) {
          const caeList = [...new Set(normalizeCaeList(record.cae))];
          const posto = record.place || {};
          const postal4 = posto.pc4 || record.pc4;
          const postal3 = posto.pc3 || record.pc3;
          const codigoPostal = postal4 && postal3 ? `${postal4}-${postal3}` : "";
          const generatedSigla = buildSiglaFromTitle(record.title);
          const website = record.contacts?.website || "";
          const phone = record.contacts?.phone || "";
          const email = record.contacts?.email || "";
          const mainAddress = posto.address || record.address || "";
          const locality = posto.city || record.city || record.geo?.parish || "";
          const county = record.geo?.county || "";
          const region = record.geo?.region || "";

          setForm(prev => ({
            ...prev,
            entidade: record.title || prev.entidade || "",
            marca: prev.marca || record.title || "", 
            sigla: prev.sigla || generatedSigla || "",
            website: website || prev.website || "",
            objeto_social: buildObjetoSocialFromRecord(record, prev.objeto_social)
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
                descricao: index === 0
                 ? (record.activity ? record.activity.split('.')[0] : "Atividade Principal")
                 : "Atividade secundária importada do NIF.pt",
                principal: index === 0
             }));

             setPendingAutoCaes(caesParaGuardar);

             setNovoCae({
                 codigo: principal,
                 descricao: restantes.length > 0
                   ? `Atividade principal. Outros CAE: ${restantes.join(", ")}`
                   : (record.activity ? record.activity.split('.')[0] : "Atividade Principal"),
                 principal: true
             });
             setShowAddCae(true);
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

          showToast(`Dados pré-preenchidos com sucesso${caeList.length > 1 ? ` (${caeList.length} CAE detetados)` : ""}!`, "success");
        } else {
          showToast("NIF não encontrado na base do NIF.pt.", "warning");
        }
      } catch (err) {
        showToast(err?.message || "Falha na consulta automática. Preenche manualmente.", "warning");
      }
    }
  }

  // --- LÓGICA DE FILTRAGEM DOS CARTÕES ---
  let processedClientes = [...clientes];

  if (!mostrarInativos) {
      processedClientes = processedClientes.filter(c => c.ativo === true);
  }

  if (busca) {
      const textoBusca = busca.toLowerCase();
      processedClientes = processedClientes.filter(c =>
        c.marca?.toLowerCase().includes(textoBusca) ||
        c.sigla?.toLowerCase().includes(textoBusca) ||
        c.nif?.includes(textoBusca)
      );
  }

  processedClientes.sort((a, b) => (a.marca || "").localeCompare(b.marca || ""));

  // --- ABRIR MODAIS ---
  function handleNovo() {
    setEditId(null); setIsViewOnly(false);
    setForm(initialForm);
    setContactos([]); setMoradas([]); setAcessos([]); setCaes([]); setProjetosCliente([]);
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
      .insert(caesParaInserir)
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
    if (['admin', 'gestor'].includes(userProfile?.role)) { setPodeVerAcessos(true); return; }
    try {
      const { data: equipaData, error: equipaError } = await supabase
        .from('equipa_projeto')
        .select('projeto_id')
        .eq('user_id', user.id);

      if (equipaError || !equipaData || equipaData.length === 0) {
        setPodeVerAcessos(false);
        return;
      }

      const projetoIds = equipaData.map(item => item.projeto_id).filter(Boolean);
      if (projetoIds.length === 0) {
        setPodeVerAcessos(false);
        return;
      }

      const { data: projetosData, error: projetosError } = await supabase
        .from('projetos')
        .select('id, cliente_id, parceiros_ids')
        .in('id', projetoIds);

      if (projetosError || !projetosData) {
        setPodeVerAcessos(false);
        return;
      }

      const hasAccess = projetosData.some(proj => {
        const isMainClient = String(proj.cliente_id || '') === String(clienteId);
        const parceiros = normalizeParceirosIds(proj.parceiros_ids);
        const isPartner = parceiros.some(parceiroId => String(parceiroId) === String(clienteId));
        return isMainClient || isPartner;
      });

      setPodeVerAcessos(hasAccess);
    } catch (err) { setPodeVerAcessos(false); }
  }

  async function fetchSubDados(clienteId) {
    const projectFields = "id, titulo, estado, data_fim, codigo_projeto, cliente_id, parceiros_ids, created_at";

    const [cData, mData, aData, caeData, pData] = await Promise.all([
        supabase.from("contactos_cliente").select("*").eq("cliente_id", clienteId),
        supabase.from("moradas_cliente").select("*").eq("cliente_id", clienteId),
        supabase.from("acessos_cliente").select("*").eq("cliente_id", clienteId),
        supabase.from("caes_cliente").select("*").eq("cliente_id", clienteId),
        supabase.from("projetos").select(projectFields).order("created_at", { ascending: false })
    ]);

    const clienteIdStr = String(clienteId);
    const projetosAssociados = (pData.data || [])
      .filter(proj => {
        const isMainClient = String(proj.cliente_id || "") === clienteIdStr;
        const parceiros = normalizeParceirosIds(proj.parceiros_ids);
        const isPartner = parceiros.includes(clienteIdStr);
        return isMainClient || isPartner;
      })
      .map(proj => {
        const isMainClient = String(proj.cliente_id || "") === clienteIdStr;
        const parceiros = normalizeParceirosIds(proj.parceiros_ids);
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
    setCaes(caeData.data || []);
    setProjetosCliente(projetosAssociados);
  }

  function handleToggleAtivo(id, estadoAtual) {
    const novoEstado = !estadoAtual;
    const acaoTexto = novoEstado ? "Reativar" : "Desativar";

    setConfirmDialog({
        show: true,
        message: `Tem a certeza que deseja ${acaoTexto.toLowerCase()} esta empresa?`,
        confirmText: `Sim, ${acaoTexto}`,
        isDanger: !novoEstado,
        onConfirm: async () => {
            setConfirmDialog({ show: false });
            try {
              const { error } = await supabase.from("clientes").update({ ativo: novoEstado }).eq("id", id);
              if (error) throw error;

              setClientes(clientes.map(c => c.id === id ? { ...c, ativo: novoEstado } : c));
              if (editId === id) setForm({ ...form, ativo: novoEstado });

              showToast(`Empresa ${acaoTexto.toLowerCase()}a com sucesso!`, "success");
            } catch (error) {
              showToast(`Erro ao ${acaoTexto.toLowerCase()} empresa: ` + error.message, "error");
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
      objeto_social: form.objeto_social,
      website: form.website,
      plano: form.plano,
      certidao_permanente: form.certidao_permanente,
      validade_certidao: form.validade_certidao || null,
      rcbe: form.rcbe,
      validade_rcbe: form.validade_rcbe || null,
      ativo: form.ativo 
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
        ? "Empresa atualizada!"
        : "Empresa criada! Verifica as abas que foram pré-preenchidas.";

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
    if (!editId) return showToast("Guarda primeiro os Dados da Empresa (Aba Geral) no fundo do ecrã.", "warning");

    const payload = { ...dados, cliente_id: editId };
    if (tabela === 'moradas_cliente') { delete payload.distrito; delete payload.regiao; }

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

  const clientColors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#f43f5e', '#14b8a6', '#0ea5e9'];
  const getColorForClient = (nif) => {
      if (!nif) return '#94a3b8'; 
      const hash = String(nif).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      return clientColors[hash % clientColors.length];
  };

  const sectionTitleStyle = { fontSize: '0.8rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '15px', marginTop: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '5px' };
  const labelStyle = { display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600', color: '#475569' };
  const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box', marginBottom: '10px', color: '#1e293b' };

  if (loading) return <div className="page-container" style={{display:'flex', justifyContent:'center', alignItems:'center', height:'80vh'}}><div className="pulse-dot-white" style={{background:'#2563eb'}}></div></div>;

  return (
    <div className="page-container" style={{maxWidth: '1500px', margin: '0 auto'}}>
      <div className="page-header" style={{background: 'white', padding: '20px 25px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'}}>
        <div style={{display:'flex', alignItems:'center', gap:'15px'}}>
            <div style={{background: '#eff6ff', color: '#2563eb', padding: '12px', borderRadius: '12px', display: 'flex'}}><Icons.Building size={24} /></div>
            <div>
                <h1 style={{margin: 0, color: '#0f172a', fontSize: '1.8rem', fontWeight: '900', letterSpacing: '-0.02em'}}>Clientes</h1>
                <p style={{color: '#64748b', margin: 0, fontWeight: '500', fontSize: '0.9rem'}}>Carteira de Clientes Ativos</p>
            </div>
        </div>
        <button className="btn-cta" onClick={handleNovo}>
            <Icons.Plus /> Nova Empresa
        </button>
      </div>

      <div style={{background: '#f8fafc', padding: '12px 20px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '25px', display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap'}}>
        <div style={{flex: 1, minWidth: '250px', position: 'relative'}}>
            <span style={{position: 'absolute', left: '12px', top: '10px', color: '#94a3b8'}}><Icons.Search /></span>
          <input type="text" placeholder="Procurar por Empresa, Sigla ou NIF..." value={busca} onChange={(e) => setBusca(e.target.value)} style={{width: '100%', padding: '8px 12px 8px 38px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.85rem', boxSizing: 'border-box'}} />
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#475569', fontSize: '0.9rem', fontWeight: 'bold' }}>
            <input type="checkbox" checked={mostrarInativos} onChange={e => setMostrarInativos(e.target.checked)} style={{width:'16px', height:'16px', accentColor: '#10b981'}} /> Mostrar Inativos
        </label>
      </div>

      <div className="client-grid">
          {processedClientes.length > 0 ? processedClientes.map(c => {
              const isInactive = c.ativo === false;
              const color = getColorForClient(c.nif);
              const moradaRef = c.moradas_cliente && c.moradas_cliente.length > 0 ? c.moradas_cliente[0] : null;
              const contactoRef = c.contactos_cliente && c.contactos_cliente.length > 0 ? c.contactos_cliente[0] : null;

              return (
                  <div 
                      key={c.id} 
                      className="client-card hover-shadow"
                      style={{
                          background: isInactive ? '#f8fafc' : 'white', borderRadius: '16px', border: '1px solid #e2e8f0', 
                          display: 'flex', flexDirection: 'column', 
                          opacity: isInactive ? 0.6 : 1, position: 'relative', overflow: 'hidden',
                          borderTop: `5px solid ${isInactive ? '#94a3b8' : color}`, transition: 'all 0.2s'
                      }}
                  >
                      <div style={{padding: '20px', flex: 1}}>
                          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px'}}>
                              <span style={{background: '#f1f5f9', color: '#64748b', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold', fontFamily: 'monospace'}}>{c.nif || 'S/ NIF'}</span>
                              {isInactive && <span style={{fontSize: '0.65rem', background: '#fee2e2', color: '#ef4444', padding: '2px 8px', borderRadius: '12px', fontWeight: '800'}}>INATIVO</span>}
                          </div>

                            <div style={{display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '10px'}}>
                              <h2 style={{margin: 0, fontSize: '1.25rem', color: '#1e293b', fontWeight: '800', lineHeight: '1.2'}}>{c.marca || "Sem nome"}</h2>
                              {c.sigla?.trim() && <span style={{background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '3px 8px', borderRadius: '999px', fontSize: '0.68rem', fontWeight: '800', letterSpacing: '0.04em'}}>{c.sigla}</span>}
                            </div>
                          
                          <div style={{display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '15px'}}>
                              {moradaRef ? (
                                  <div style={{fontSize: '0.85rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px'}}>
                                      <Icons.MapPin /> {moradaRef.concelho ? `${moradaRef.localidade} (${moradaRef.concelho})` : moradaRef.localidade}
                                  </div>
                              ) : (
                                  <div style={{fontSize: '0.85rem', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '6px'}}><Icons.MapPin /> Sem morada registada</div>
                              )}

                              {contactoRef ? (
                                  <div style={{fontSize: '0.85rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px'}}>
                                      <Icons.User /> {contactoRef.nome_contacto} {contactoRef.telefone && `- ${contactoRef.telefone}`}
                                  </div>
                              ) : (
                                  <div style={{fontSize: '0.85rem', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '6px'}}><Icons.User /> Sem contacto registado</div>
                              )}
                          </div>
                      </div>

                      <div style={{display: 'flex', borderTop: '1px solid #f1f5f9', background: isInactive ? 'transparent' : '#fafaf9'}}>
                          <button 
                              onClick={() => handleView(c)} 
                              style={{flex: 1, padding: '12px', border: 'none', borderRight: '1px solid #f1f5f9', background: 'transparent', color: '#2563eb', fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer', transition: '0.2s', display:'flex', alignItems:'center', justifyContent:'center', gap:'6px'}}
                              className="hover-blue-text"
                          >
                              <Icons.Eye /> Ver Perfil
                          </button>
                          
                          {!isInactive ? (
                              <button 
                                  onClick={() => handleEdit(c)} 
                                  style={{padding: '12px 20px', border: 'none', background: 'transparent', color: '#f59e0b', cursor: 'pointer', transition: '0.2s'}}
                                  className="hover-orange-text"
                                  title="Edição Rápida"
                              >
                                  <Icons.Edit />
                              </button>
                          ) : (
                              <button 
                                  onClick={() => handleToggleAtivo(c.id, c.ativo)} 
                                  style={{padding: '12px 20px', border: 'none', background: 'transparent', color: '#16a34a', cursor: 'pointer', transition: '0.2s'}}
                                  className="hover-green-text"
                                  title="Reativar Empresa"
                              >
                                  <Icons.Restore />
                              </button>
                          )}
                      </div>
                  </div>
              );
          }) : (
              <div style={{gridColumn: '1 / -1', textAlign: 'center', padding: '60px', background: 'white', borderRadius: '16px', border: '1px dashed #cbd5e1'}}>
                  <div style={{display: 'flex', justifyContent: 'center', marginBottom: '15px', color: '#cbd5e1'}}><Icons.Inbox size={60} /></div>
                  <h3 style={{color: '#1e293b', margin: '0 0 5px 0', fontSize: '1.2rem'}}>Vazio por aqui.</h3>
                  <p style={{color: '#64748b', margin: 0}}>Nenhum cliente encontrado com os filtros atuais.</p>
              </div>
          )}
      </div>

      {notification && <div className={`toast-container ${notification.type}`}>{notification.type === 'success' ? '✅' : '⚠️'} {notification.message}</div>}

      {/* --- MEGA MODAL 360º DO CLIENTE --- */}
      {showModal && (
        <ModalPortal>
          <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, backgroundColor:'rgba(15, 23, 42, 0.7)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:99999}}>
            <div style={{background:'#fff', width:'96%', maxWidth:'1200px', borderRadius:'16px', boxShadow:'0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow:'hidden', display:'flex', flexDirection:'column', maxHeight:'96vh', animation: 'fadeIn 0.2s ease-out'}} onClick={e => e.stopPropagation()}>
              
              {/* CABEÇALHO DO MODAL */}
              <div style={{padding:'20px 30px', borderBottom:'1px solid #e2e8f0', display:'flex', justifyContent:'space-between', alignItems:'center', background:'#f8fafc'}}>
                <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
                    <span style={{background:'#eff6ff', color: '#2563eb', padding:'10px', borderRadius:'10px', display: 'flex'}}><Icons.Building size={24} /></span>
                    <h3 style={{margin:0, color:'#1e293b', fontSize:'1.4rem', fontWeight:'800'}}>
                        {isViewOnly ? `Perfil: ${form.marca}` : (editId ? `Editar: ${form.marca}` : "Nova Empresa")}
                    </h3>
                    {form.ativo === false && <span style={{background: '#e2e8f0', color: '#475569', fontSize: '0.75rem', padding: '4px 10px', borderRadius: '6px', fontWeight: 'bold'}}>INATIVO</span>}
                </div>
                <div style={{display:'flex', gap:'15px', alignItems:'center'}}>
                    {editId && !isViewOnly && (
                        <button 
                            onClick={() => handleToggleAtivo(editId, form.ativo)} 
                            style={{ background: form.ativo === false ? '#dcfce7' : '#fee2e2', color: form.ativo === false ? '#16a34a' : '#ef4444', border:'none', padding:'8px 16px', borderRadius:'8px', cursor:'pointer', fontWeight:'bold', transition:'0.2s', display:'flex', alignItems:'center', gap:'6px' }}
                            className="hover-shadow"
                        >
                            {form.ativo === false ? <><Icons.Restore/> Reativar</> : <><Icons.Archive/> Desativar</>}
                        </button>
                    )}
                    <button onClick={() => setShowModal(false)} style={{background:'#e2e8f0', border:'none', width:'36px', height:'36px', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#475569', transition:'0.2s'}} className="hover-shadow"><Icons.Close/></button>
                </div>
              </div>

              {/* TABS DE NAVEGAÇÃO DO MODAL */}
              {editId && (
                <div className="tabs" style={{padding: '15px 30px 0 30px', background: '#fff', borderBottom: '1px solid #e2e8f0', display:'flex', flexWrap:'wrap', gap:'5px'}}>
                  <button className={activeTab === 'geral' ? 'active' : ''} onClick={() => {setActiveTab('geral'); fecharTodosSubForms();}} style={{display:'flex', alignItems:'center', gap:'6px'}}><Icons.ClipboardList /> Geral</button>
                  <button className={activeTab === 'moradas' ? 'active' : ''} onClick={() => {setActiveTab('moradas'); fecharTodosSubForms();}} style={{display:'flex', alignItems:'center', gap:'6px'}}><Icons.MapPin /> Moradas</button>
                  <button className={activeTab === 'contactos' ? 'active' : ''} onClick={() => {setActiveTab('contactos'); fecharTodosSubForms();}} style={{display:'flex', alignItems:'center', gap:'6px'}}><Icons.Users /> Pessoas</button>
                  <button className={activeTab === 'projetos' ? 'active' : ''} onClick={() => {setActiveTab('projetos'); fecharTodosSubForms();}} style={{display:'flex', alignItems:'center', gap:'6px', color: activeTab === 'projetos' ? '#2563eb' : '#3b82f6', fontWeight: '800'}}><Icons.Rocket /> Projetos</button>
                  <button className={activeTab === 'atividade' ? 'active' : ''} onClick={() => {setActiveTab('atividade'); fecharTodosSubForms();}} style={{display:'flex', alignItems:'center', gap:'6px'}}><Icons.Activity /> Atividade</button>
                  <button className={activeTab === 'documentos' ? 'active' : ''} onClick={() => {setActiveTab('documentos'); fecharTodosSubForms();}} style={{display:'flex', alignItems:'center', gap:'6px'}}><Icons.FileText /> Documentos</button>
                  <button className={activeTab === 'plano' ? 'active' : ''} onClick={() => {setActiveTab('plano'); fecharTodosSubForms();}} style={{display:'flex', alignItems:'center', gap:'6px'}}><Icons.Diamond /> Plano</button>
                  {podeVerAcessos && <button className={activeTab === 'acessos' ? 'active' : ''} onClick={() => {setActiveTab('acessos'); fecharTodosSubForms();}} style={{display:'flex', alignItems:'center', gap:'6px'}}><Icons.Lock /> Acessos</button>}
                </div>
              )}

              <div style={{padding:'30px', overflowY:'auto', background:'#f8fafc', flex:1}} className="custom-scrollbar">
                
                {/* --- ABA GERAL --- */}
                {activeTab === 'geral' && (
                  <form onSubmit={handleSubmitGeral}>
                     <fieldset disabled={isViewOnly} style={{border: 'none', padding: 0, margin: 0}}>
                      <div style={{display:'grid', gridTemplateColumns:'1fr 2fr 1fr', gap:'20px'}}>
                        <div>
                            <label style={labelStyle}>NIF * <span style={{fontSize:'0.7rem', color:'#2563eb', textTransform: 'none'}}>(Pesquisa Auto)</span></label>
                            <div style={{position: 'relative'}}>
                                <input type="text" maxLength="9" value={form.nif} onChange={handleNifChange} required style={{...inputStyle, borderColor: '#2563eb', background: '#eff6ff', paddingLeft: '35px'}} placeholder="Ex: 500000000" className="input-focus" />
                                <span style={{position: 'absolute', left: '12px', top: '10px', color: '#2563eb'}}><Icons.Search /></span>
                            </div>
                        </div>
                        <div>
                            <label style={labelStyle}>Marca / Nome Comercial *</label>
                            <input type="text" value={form.marca} onChange={e => setForm({...form, marca: e.target.value})} required style={inputStyle} className="input-focus" />
                        </div>
                        <div>
                            <label style={labelStyle}>Sigla</label>
                            <input type="text" value={form.sigla || ""} onChange={e => setForm({...form, sigla: e.target.value})} maxLength="20" placeholder="Ex: UAlg" style={inputStyle} className="input-focus" />
                        </div>
                      </div>

                      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px', marginTop:'10px'}}>
                        <div><label style={labelStyle}>Entidade Legal</label><input type="text" value={form.entidade} onChange={e => setForm({...form, entidade: e.target.value})} style={inputStyle} className="input-focus" /></div>
                        <div>
                            <label style={labelStyle}>Website</label>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <input type="text" value={form.website} onChange={e => setForm({...form, website: e.target.value})} placeholder="www.empresa.pt" style={{ ...inputStyle, marginBottom: 0, flex: 1 }} className="input-focus" />
                                {form.website && (
                                    <a href={form.website.startsWith('http') ? form.website : `https://${form.website}`} target="_blank" rel="noopener noreferrer" title="Abrir Website" className="btn-icon-link">
                                        <Icons.ExternalLink />
                                    </a>
                                )}
                            </div>
                        </div>
                      </div>

                      {!isViewOnly && <button type="submit" className="btn-primary hover-shadow" style={{width:'100%', marginTop:'20px', padding:'15px', fontSize:'1.05rem', fontWeight: 'bold'}}>Guardar Dados Base</button>}
                    </fieldset>
                  </form>
                )}

                {/* --- ABA DE PROJETOS DO CLIENTE --- */}
                {activeTab === 'projetos' && (
                    <div>
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px', background:'white', padding:'20px', borderRadius:'12px', border:'1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)'}}>
                            <div>
                                <h4 style={{margin:0, fontSize: '1.2rem', color: '#1e293b'}}>Histórico de Projetos</h4>
                                <p style={{margin:'5px 0 0 0', color:'#64748b', fontSize:'0.9rem'}}>Todos os trabalhos associados a {form.marca}.</p>
                            </div>
                            
                          <button 
                              onClick={() => navigate('/dashboard/projetos', { state: { prefillClienteId: editId, openNewProjectModal: true } })} 
                              className="btn-primary hover-shadow" 
                              style={{fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px'}}
                          >
                              <Icons.Plus /> Novo Projeto
                          </button>
                        </div>

                        {projetosCliente.length > 0 ? (
                            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '15px'}}>
                                {projetosCliente.map(p => {
                                    const isDone = p.estado === 'concluido';
                                    const relacaoInfo = p.relacao_cliente === 'parceiro'
                                        ? { label: 'Parceiro', bg: '#f3e8ff', color: '#7e22ce' }
                                        : p.relacao_cliente === 'cliente_unico_e_parceiro'
                                            ? { label: 'Cliente + Parceiro', bg: '#ede9fe', color: '#5b21b6' }
                                            : { label: 'Cliente Único', bg: '#dbeafe', color: '#1d4ed8' };

                                    return (
                                        <div key={p.id} onClick={() => navigate(`/dashboard/projetos/${p.id}`)} style={{background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection:'column', justifyContent: 'space-between', opacity: isDone ? 0.6 : 1, cursor:'pointer', transition:'0.2s'}} className="hover-shadow hover-blue-border">
                                            <div style={{display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px'}}>
                                                <span style={{fontSize: '0.7rem', background: isDone ? '#f1f5f9' : '#eff6ff', color: isDone ? '#64748b' : '#2563eb', padding: '4px 10px', borderRadius: '12px', fontWeight: 'bold', textTransform: 'uppercase'}}>{p.estado.replace('_', ' ')}</span>
                                              <span style={{fontSize: '0.68rem', background: relacaoInfo.bg, color: relacaoInfo.color, padding: '4px 10px', borderRadius: '12px', fontWeight: 'bold'}}>{relacaoInfo.label}</span>
                                                {p.codigo_projeto && <span style={{fontSize: '0.75rem', color: '#94a3b8', fontWeight: 'bold'}}>{p.codigo_projeto}</span>}
                                            </div>
                                            <h4 style={{margin: '0 0 15px 0', fontSize: '1.1rem', color: '#1e293b', textDecoration: isDone ? 'line-through' : 'none', lineHeight:'1.3'}}>{p.titulo}</h4>
                                            
                                            <div style={{display: 'flex', alignItems: 'center', justifyContent:'space-between', borderTop:'1px solid #f1f5f9', paddingTop:'10px'}}>
                                                {p.data_fim ? <span style={{fontSize: '0.85rem', color: '#64748b', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px'}}><Icons.Calendar /> {new Date(p.data_fim).toLocaleDateString('pt-PT')}</span> : <span style={{fontSize: '0.85rem', color: '#cbd5e1'}}>Sem Prazo</span>}
                                                <span style={{fontSize: '0.85rem', color: '#2563eb', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px'}}>Abrir <Icons.ArrowRight /></span>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        ) : (
                            <div style={{textAlign: 'center', padding: '60px', background: 'white', borderRadius: '12px', border: '1px dashed #cbd5e1'}}>
                                <div style={{display: 'flex', justifyContent: 'center', marginBottom: '15px', color: '#cbd5e1'}}><Icons.Inbox size={48} /></div>
                                <h4 style={{color: '#1e293b', margin: '0 0 5px 0', fontSize:'1.2rem'}}>Este cliente ainda não tem projetos.</h4>
                                <p style={{color:'#64748b'}}>Cria um novo projeto e ele aparecerá aqui automaticamente.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* --- ABA ATIVIDADE E CAES --- */}
                {activeTab === 'atividade' && (
                  <div style={{display:'flex', flexDirection:'column', gap:'30px'}}>
                    <div style={{background:'white', padding:'20px', borderRadius:'12px', border:'1px solid #e2e8f0'}}>
                        <label style={labelStyle}>Objeto Social</label>
                        <textarea disabled={isViewOnly} rows="5" value={form.objeto_social} onChange={e => setForm({...form, objeto_social: e.target.value})} style={{...inputStyle, resize:'vertical', marginBottom:'15px'}} className="input-focus" />
                        {!isViewOnly && <button className="btn-primary hover-shadow" onClick={handleSubmitGeral}>Atualizar Objeto Social</button>}
                    </div>
                    
                    <div>
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'15px'}}>
                          <h4 style={{margin:0, fontSize:'1.1rem', color:'#1e293b'}}>Lista de CAEs</h4>
                          {!isViewOnly && !showAddCae && <button className="btn-small-add hover-shadow" onClick={() => {setNovoCae(initCae); setShowAddCae(true)}} style={{display: 'flex', alignItems: 'center', gap: '6px'}}><Icons.Plus /> Adicionar CAE</button>}
                        </div>

                        {showAddCae && (
                          <div style={{background:'white', padding:'25px', borderRadius:'12px', border:'1px solid #cbd5e1', marginBottom:'20px', boxShadow:'0 4px 6px -1px rgba(0,0,0,0.05)'}}>
                            <h5 style={{marginTop:0, fontSize: '1.1rem'}}>{novoCae.id ? 'Editar CAE' : 'Novo CAE'}</h5>
                            <div style={{display:'grid', gridTemplateColumns:'150px 1fr auto', gap:'15px', alignItems:'center'}}>
                              <input type="text" placeholder="Código (Ex: 62010)" value={novoCae.codigo} onChange={e => setNovoCae({...novoCae, codigo: e.target.value})} style={inputStyle} className="input-focus" />
                              <input type="text" placeholder="Descrição" value={novoCae.descricao} onChange={e => setNovoCae({...novoCae, descricao: e.target.value})} style={inputStyle} className="input-focus" />
                              <label style={{display:'flex', alignItems:'center', gap:'5px', cursor:'pointer', fontWeight: 'bold', color: '#475569'}}><input type="checkbox" checked={novoCae.principal} onChange={e => setNovoCae({...novoCae, principal: e.target.checked})} style={{accentColor: '#2563eb', width: '16px', height: '16px'}} /> Principal</label>
                            </div>
                            <div style={{display:'flex', gap:'10px', marginTop:'15px'}}>
                                <button onClick={() => saveSubItem('caes_cliente', novoCae, setCaes, caes, setNovoCae, initCae, setShowAddCae)} className="btn-primary hover-shadow" style={{padding:'10px 20px'}}>{novoCae.id ? 'Atualizar' : 'Guardar CAE'}</button>
                                <button onClick={() => {setShowAddCae(false); setNovoCae(initCae);}} style={{background:'white', border:'1px solid #cbd5e1', borderRadius: '8px', color:'#64748b', cursor:'pointer', padding: '10px 20px', fontWeight: 'bold'}} className="hover-shadow">Cancelar</button>
                            </div>
                          </div>
                        )}

                        <ul style={{listStyle:'none', padding:0, display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(350px, 1fr))', gap:'15px'}}>
                          {caes.map(c => (
                            <li key={c.id} style={{background:'white', padding:'20px', borderRadius:'12px', display:'flex', justifyContent:'space-between', alignItems:'center', border:'1px solid #e2e8f0', transition: '0.2s'}} className="hover-shadow">
                              <div>
                                <span style={{fontWeight:'bold', fontSize:'1.1rem', color:'#1e293b'}}>{c.codigo}</span>
                                {c.principal && <span style={{background:'#dcfce7', color:'#166534', padding:'2px 8px', borderRadius:'10px', fontSize:'0.7rem', marginLeft:'10px', fontWeight:'bold'}}>PRINCIPAL</span>}
                                <div style={{color:'#64748b', fontSize:'0.9rem', marginTop:'6px'}}>{c.descricao || 'Sem descrição'}</div>
                              </div>
                              {!isViewOnly && (
                                <div style={{display:'flex', flexDirection:'column', gap:'5px'}}>
                                   <button onClick={() => abrirEdicaoSubItem(c, setNovoCae, setShowAddCae)} className="action-btn hover-blue-text"><Icons.Edit /></button>
                                   <button onClick={() => deleteItem('caes_cliente', c.id, setCaes, caes)} className="action-btn hover-red-text"><Icons.Trash /></button>
                                </div>
                              )}
                            </li>
                          ))}
                        </ul>
                    </div>
                  </div>
                )}

                {/* --- ABA DOCUMENTOS --- */}
                {activeTab === 'documentos' && (
                  <form onSubmit={handleSubmitGeral}>
                     <fieldset disabled={isViewOnly} style={{border:'none', padding:0, margin: 0}}>
                      
                      <div style={{background:'white', padding:'30px', borderRadius:'12px', border:'1px solid #e2e8f0', marginBottom:'20px'}}>
                          <div style={{display:'grid', gridTemplateColumns:'2fr 1fr', gap:'20px'}}>
                            <div>
                                <label style={labelStyle}>Código Certidão Permanente</label>
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                    <input type="text" value={form.certidao_permanente} onChange={e => setForm({...form, certidao_permanente: e.target.value})} style={{ ...inputStyle, marginBottom: 0, flex: 1 }} placeholder="Ex: 1234-5678-9012" className="input-focus" />
                                    <a href="https://www2.gov.pt/espaco-empresa/empresa-online/consultar-a-certidao-permanente" target="_blank" rel="noopener noreferrer" title="Abrir Portal da Certidão Permanente" className="btn-icon-link">
                                        <Icons.ExternalLink />
                                    </a>
                                </div>
                            </div>
                            <div>
                                <label style={labelStyle}>Data de Validade</label>
                                <input type="date" value={form.validade_certidao || ""} onChange={e => setForm({...form, validade_certidao: e.target.value})} style={inputStyle} className="input-focus" />
                            </div>
                          </div>
                      </div>

                      <div style={{background:'white', padding:'30px', borderRadius:'12px', border:'1px solid #e2e8f0'}}>
                          <div style={{display:'grid', gridTemplateColumns:'2fr 1fr', gap:'20px'}}>
                            <div>
                                <label style={labelStyle}>Código RCBE</label>
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                    <input type="text" value={form.rcbe} onChange={e => setForm({...form, rcbe: e.target.value})} style={{ ...inputStyle, marginBottom: 0, flex: 1 }} placeholder="Código de acesso RCBE" className="input-focus" />
                                    <a href="https://rcbe.justica.gov.pt" target="_blank" rel="noopener noreferrer" title="Abrir Portal RCBE" className="btn-icon-link">
                                        <Icons.ExternalLink />
                                    </a>
                                </div>
                            </div>
                            <div>
                                <label style={labelStyle}>Data de Validade</label>
                                <input type="date" value={form.validade_rcbe || ""} onChange={e => setForm({...form, validade_rcbe: e.target.value})} style={inputStyle} className="input-focus" />
                            </div>
                          </div>
                      </div>

                      {!isViewOnly && <button type="submit" className="btn-primary hover-shadow" style={{width:'100%', marginTop:'20px', padding:'15px', fontSize:'1.05rem', fontWeight: 'bold'}}>Guardar Documentos</button>}
                    </fieldset>
                  </form>
                )}

                {/* --- ABA PLANO --- */}
                {activeTab === 'plano' && (
                  <div style={{background:'white', padding:'40px', borderRadius:'16px', border:'1px solid #e2e8f0', textAlign:'center', maxWidth:'500px', margin:'0 auto', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'}}>
                     <div style={{display: 'flex', justifyContent: 'center', marginBottom: '15px', color: '#3b82f6'}}><Icons.Diamond size={48} /></div>
                     <h3 style={{marginTop:0, color:'#1e293b', fontSize:'1.5rem'}}>Plano de Subscrição</h3>
                     <select disabled={isViewOnly} value={form.plano} onChange={e => setForm({...form, plano: e.target.value})} style={{...inputStyle, fontSize:'1.1rem', padding:'15px', margin:'20px auto', display:'block', fontWeight: 'bold', color: '#2563eb', background: '#eff6ff', borderColor: '#bfdbfe', cursor: 'pointer'}}>
                        <option value="Standard">Standard</option>
                        <option value="Premium">Premium</option>
                        <option value="Enterprise">Enterprise</option>
                     </select>
                     {!isViewOnly && <button className="btn-primary hover-shadow" onClick={handleSubmitGeral} style={{width:'100%', padding:'15px', fontSize:'1.05rem', fontWeight: 'bold'}}>Confirmar Plano</button>}
                  </div>
                )}

                {/* --- ABA PESSOAS --- */}
                {activeTab === 'contactos' && (
                  <div>
                    <div style={{display:'flex', justifyContent:'space-between', marginBottom:'15px', alignItems:'center'}}>
                      <h4 style={{margin:0, fontSize:'1.1rem', color:'#1e293b'}}>Equipa do Cliente</h4>
                      {!isViewOnly && !showAddContacto && <button className="btn-small-add hover-shadow" onClick={() => {setNovoContacto(initContacto); setShowAddContacto(true)}} style={{display: 'flex', alignItems: 'center', gap: '6px'}}><Icons.Plus /> Adicionar Pessoa</button>}
                    </div>
                    
                    {showAddContacto && (
                      <div style={{background:'white', padding:'25px', borderRadius:'12px', border:'1px solid #cbd5e1', marginBottom:'20px', boxShadow:'0 4px 6px -1px rgba(0,0,0,0.05)'}}>
                        <h5 style={{marginTop:0, fontSize:'1.1rem'}}>{novoContacto.id ? 'Editar Pessoa' : 'Nova Pessoa'}</h5>
                        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px'}}>
                          <div>
                              <label style={labelStyle}>Nome Completo *</label>
                              <input type="text" placeholder="João Silva" value={novoContacto.nome_contacto} onChange={e => setNovoContacto({...novoContacto, nome_contacto: e.target.value})} style={inputStyle} className="input-focus" required />
                          </div>
                          <div>
                              <label style={labelStyle}>Cargo</label>
                              <input type="text" placeholder="Gerente, Diretor..." value={novoContacto.cargo} onChange={e => setNovoContacto({...novoContacto, cargo: e.target.value})} style={inputStyle} className="input-focus" />
                          </div>
                          <div>
                              <label style={labelStyle}>Email</label>
                              <input type="email" placeholder="joao@empresa.pt" value={novoContacto.email} onChange={e => setNovoContacto({...novoContacto, email: e.target.value})} style={inputStyle} className="input-focus" />
                          </div>
                          <div>
                              <label style={labelStyle}>Telefone / Telemóvel</label>
                              <input type="text" placeholder="+351 900 000 000" value={novoContacto.telefone} onChange={e => setNovoContacto({...novoContacto, telefone: e.target.value})} style={inputStyle} className="input-focus" />
                          </div>
                        </div>
                        <div style={{display:'flex', gap:'10px', marginTop:'15px'}}>
                            <button onClick={() => saveSubItem('contactos_cliente', novoContacto, setContactos, contactos, setNovoContacto, initContacto, setShowAddContacto)} className="btn-primary hover-shadow" style={{padding:'10px 20px', fontWeight: 'bold'}}>{novoContacto.id ? 'Atualizar' : 'Guardar Pessoa'}</button>
                            <button onClick={() => {setShowAddContacto(false); setNovoContacto(initContacto);}} style={{background:'white', border:'1px solid #cbd5e1', borderRadius: '8px', color:'#64748b', cursor:'pointer', padding: '10px 20px', fontWeight: 'bold'}} className="hover-shadow">Cancelar</button>
                        </div>
                      </div>
                    )}

                    <ul style={{listStyle:'none', padding:0, display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(350px, 1fr))', gap:'15px'}}>
                      {contactos.map(c => (
                        <li key={c.id} style={{background:'white', padding:'20px', borderRadius:'12px', display:'flex', justifyContent:'space-between', alignItems:'flex-start', border:'1px solid #e2e8f0', transition: '0.2s'}} className="hover-shadow">
                          <div>
                            <span style={{fontWeight:'bold', color:'#1e293b', fontSize:'1.1rem'}}>{c.nome_contacto}</span> {c.cargo && <span style={{color:'#64748b', fontSize:'0.9rem', marginLeft:'5px'}}>({c.cargo})</span>}
                            <div style={{fontSize:'0.9rem', color:'#475569', marginTop:'8px', display:'flex', flexDirection:'column', gap:'6px'}}>
                                {c.email && <span style={{display: 'flex', alignItems: 'center', gap: '6px', color: '#2563eb'}}><Icons.Mail /> <a href={`mailto:${c.email}`} style={{color: 'inherit', textDecoration: 'none'}}>{c.email}</a></span>}
                                {c.telefone && <span style={{display: 'flex', alignItems: 'center', gap: '6px'}}><Icons.Phone /> {c.telefone}</span>}
                            </div>
                          </div>
                          {!isViewOnly && (
                            <div style={{display:'flex', flexDirection:'column', gap:'6px'}}>
                               <button onClick={() => abrirEdicaoSubItem(c, setNovoContacto, setShowAddContacto)} className="action-btn hover-blue-text"><Icons.Edit /></button>
                               <button onClick={() => deleteItem('contactos_cliente', c.id, setContactos, contactos)} className="action-btn hover-red-text"><Icons.Trash /></button>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* --- ABA MORADAS --- */}
                {activeTab === 'moradas' && (
                  <div>
                    <div style={{display:'flex', justifyContent:'space-between', marginBottom:'15px', alignItems:'center'}}>
                      <h4 style={{margin:0, fontSize:'1.1rem', color:'#1e293b'}}>Moradas Registadas</h4>
                      {!isViewOnly && !showAddMorada && <button className="btn-small-add hover-shadow" onClick={() => {setNovaMorada(initMorada); setShowAddMorada(true)}} style={{display: 'flex', alignItems: 'center', gap: '6px'}}><Icons.Plus /> Adicionar Morada</button>}
                    </div>

                    {showAddMorada && (
                      <div style={{background:'white', padding:'25px', borderRadius:'12px', border:'1px solid #cbd5e1', marginBottom:'20px', boxShadow:'0 4px 6px -1px rgba(0,0,0,0.05)'}}>
                        <h5 style={{marginTop:0, fontSize:'1.1rem'}}>{novaMorada.id ? 'Editar Morada' : 'Nova Morada'}</h5>
                        
                        <label style={labelStyle}>Rua / Lote / Porta</label>
                        <input type="text" placeholder="Ex: Rua Direita, nº 10" value={novaMorada.morada} onChange={e => setNovaMorada({...novaMorada, morada: e.target.value})} style={inputStyle} className="input-focus" />
                        
                        <div style={{display:'grid', gridTemplateColumns:'1fr 2fr', gap:'20px'}}>
                            <div>
                                <label style={labelStyle}>Cód. Postal</label>
                                <input type="text" placeholder="Ex: 8000-000" value={novaMorada.codigo_postal} onChange={e => setNovaMorada({...novaMorada, codigo_postal: e.target.value})} style={inputStyle} className="input-focus" />
                            </div>
                            <div>
                                <label style={labelStyle}>Localidade</label>
                                <input type="text" placeholder="Ex: Faro" value={novaMorada.localidade} onChange={e => setNovaMorada({...novaMorada, localidade: e.target.value})} style={inputStyle} className="input-focus" />
                            </div>
                        </div>
                        
                        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'20px'}}>
                            <div>
                                <label style={labelStyle}>Concelho</label>
                                <input type="text" value={novaMorada.concelho} onChange={e => setNovaMorada({...novaMorada, concelho: e.target.value})} style={inputStyle} className="input-focus" />
                            </div>
                            <div>
                                <label style={labelStyle}>Distrito</label>
                                <input type="text" value={novaMorada.distrito} onChange={e => setNovaMorada({...novaMorada, distrito: e.target.value})} style={inputStyle} className="input-focus" />
                            </div>
                            <div>
                                <label style={labelStyle}>Região</label>
                                <input type="text" value={novaMorada.regiao} onChange={e => setNovaMorada({...novaMorada, regiao: e.target.value})} style={inputStyle} className="input-focus" />
                            </div>
                        </div>

                        <label style={labelStyle}>Tipo / Notas Opcionais</label>
                        <input type="text" placeholder="Ex: Sede, Armazém, Local de Faturação..." value={novaMorada.notas} onChange={e => setNovaMorada({...novaMorada, notas: e.target.value})} style={{...inputStyle, marginBottom:0}} className="input-focus" />
                        
                        <div style={{display:'flex', gap:'10px', marginTop:'20px'}}>
                            <button onClick={() => saveSubItem('moradas_cliente', novaMorada, setMoradas, moradas, setNovaMorada, initMorada, setShowAddMorada)} className="btn-primary hover-shadow" style={{padding:'10px 20px', fontWeight: 'bold'}}>{novaMorada.id ? 'Atualizar' : 'Guardar Morada'}</button>
                            <button onClick={() => {setShowAddMorada(false); setNovaMorada(initMorada);}} style={{background:'white', border:'1px solid #cbd5e1', borderRadius: '8px', color:'#64748b', cursor:'pointer', padding: '10px 20px', fontWeight: 'bold'}} className="hover-shadow">Cancelar</button>
                        </div>
                      </div>
                    )}

                    <ul style={{listStyle:'none', padding:0, display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(350px, 1fr))', gap:'15px'}}>
                      {moradas.map(m => (
                        <li key={m.id} style={{background:'white', padding:'20px', borderRadius:'12px', display:'flex', justifyContent:'space-between', alignItems:'flex-start', border:'1px solid #e2e8f0', transition: '0.2s'}} className="hover-shadow">
                          <div>
                            {m.notas && <span style={{display:'inline-block', marginBottom:'8px', textTransform:'uppercase', fontSize: '0.75rem', background:'#e0f2fe', color:'#0369a1', padding:'4px 8px', borderRadius:'6px', fontWeight:'bold'}}>{m.notas}</span>}
                            <div style={{fontWeight:'bold', color:'#334155', fontSize:'1.05rem', marginBottom:'4px'}}>{m.morada}</div>
                            <div style={{color:'#64748b', fontSize:'0.9rem'}}>{m.codigo_postal} {m.localidade}</div>
                            <div style={{color:'#94a3b8', fontSize:'0.85rem', marginTop:'4px'}}>{[m.concelho, m.distrito, m.regiao].filter(Boolean).join(' • ')}</div>
                          </div>
                          {!isViewOnly && (
                            <div style={{display:'flex', flexDirection:'column', gap:'6px'}}>
                               <button onClick={() => abrirEdicaoSubItem(m, setNovaMorada, setShowAddMorada)} className="action-btn hover-blue-text"><Icons.Edit /></button>
                               <button onClick={() => deleteItem('moradas_cliente', m.id, setMoradas, moradas)} className="action-btn hover-red-text"><Icons.Trash /></button>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* --- ABA ACESSOS --- */}
                {activeTab === 'acessos' && podeVerAcessos && (
                  <div>
                    <div style={{background: '#fffbeb', padding: '20px', borderRadius: '12px', borderLeft: '5px solid #f59e0b', marginBottom: '25px', color:'#b45309', fontWeight:'600', fontSize:'0.95rem', display: 'flex', alignItems: 'center', gap: '10px'}}>
                      <Icons.Alert size={20} color="#b45309" /> Acesso Restrito de Administração. Não partilhe estas credenciais fora da plataforma.
                    </div>
                    
                    <div style={{display:'flex', justifyContent:'space-between', marginBottom:'15px', alignItems:'center'}}>
                      <h4 style={{margin:0, fontSize:'1.1rem', color: '#1e293b'}}>Credenciais</h4>
                      {!isViewOnly && !showAddAcesso && <button className="btn-small-add hover-shadow" onClick={() => {setNovoAcesso(initAcesso); setShowAddAcesso(true)}} style={{display: 'flex', alignItems: 'center', gap: '6px'}}><Icons.Plus /> Adicionar Acesso</button>}
                    </div>

                    {showAddAcesso && (
                      <div style={{background:'white', padding:'25px', borderRadius:'12px', border:'1px solid #cbd5e1', marginBottom:'20px', boxShadow:'0 4px 6px -1px rgba(0,0,0,0.05)'}}>
                        <h5 style={{marginTop:0, fontSize:'1.1rem'}}>{novoAcesso.id ? 'Editar Acesso' : 'Novo Acesso'}</h5>
                        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px'}}>
                          <div>
                              <label style={labelStyle}>Plataforma / Organismo *</label>
                              <input type="text" placeholder="Ex: Portal das Finanças" value={novoAcesso.organismo} onChange={e => setNovoAcesso({...novoAcesso, organismo: e.target.value})} required style={inputStyle} className="input-focus" />
                          </div>
                          <div>
                              <label style={labelStyle}>Link de Login (Opcional)</label>
                              <input type="text" placeholder="https://..." value={novoAcesso.url} onChange={e => setNovoAcesso({...novoAcesso, url: e.target.value})} style={inputStyle} className="input-focus" />
                          </div>
                          <div>
                              <label style={labelStyle}>Utilizador / NIF *</label>
                              <input type="text" value={novoAcesso.utilizador} onChange={e => setNovoAcesso({...novoAcesso, utilizador: e.target.value})} required style={inputStyle} className="input-focus" />
                          </div>
                          <div>
                              <label style={labelStyle}>Password *</label>
                              <input type="text" value={novoAcesso.codigo} onChange={e => setNovoAcesso({...novoAcesso, codigo: e.target.value})} required style={{...inputStyle, fontFamily:'monospace'}} className="input-focus" />
                          </div>
                        </div>
                        <div style={{display:'flex', gap:'10px', marginTop:'15px'}}>
                            <button onClick={() => saveSubItem('acessos_cliente', novoAcesso, setAcessos, acessos, setNovoAcesso, initAcesso, setShowAddAcesso)} className="btn-primary hover-shadow" style={{padding:'10px 20px', fontWeight: 'bold'}}>{novoAcesso.id ? 'Atualizar' : 'Guardar Acesso'}</button>
                            <button onClick={() => {setShowAddAcesso(false); setNovoAcesso(initAcesso);}} style={{background:'white', border:'1px solid #cbd5e1', borderRadius: '8px', color:'#64748b', cursor:'pointer', padding: '10px 20px', fontWeight: 'bold'}} className="hover-shadow">Cancelar</button>
                        </div>
                      </div>
                    )}

                    <ul style={{listStyle:'none', padding:0, display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(400px, 1fr))', gap:'15px'}}>
                      {acessos.map(a => (
                        <li key={a.id} style={{background:'white', padding:'20px', borderRadius:'12px', display:'flex', justifyContent:'space-between', alignItems:'center', borderLeft:'5px solid #3b82f6', boxShadow:'0 2px 4px rgba(0,0,0,0.05)', transition: '0.2s'}} className="hover-shadow">
                          <div style={{flex: 1, paddingRight:'15px'}}>
                            <span style={{fontWeight:'800', color:'#1e293b', fontSize:'1.15rem', display:'block', marginBottom:'10px'}}>{a.organismo}</span>
                            <div style={{fontFamily:'monospace', background:'#f8fafc', border:'1px solid #e2e8f0', padding:'12px', borderRadius:'8px', color:'#334155', fontSize:'0.95rem'}}>
                              User: <b style={{color:'#2563eb'}}>{a.utilizador}</b> <br/>
                              Pass: <b style={{color:'#ef4444'}}>{a.codigo}</b>
                            </div>
                            {a.url && <a href={a.url.startsWith('http') ? a.url : `https://${a.url}`} target="_blank" rel="noreferrer" style={{display:'inline-flex', alignItems: 'center', gap: '6px', marginTop:'12px', fontSize:'0.85rem', color:'#2563eb', textDecoration:'none', fontWeight:'bold', background:'#eff6ff', padding:'6px 12px', borderRadius:'6px', border: '1px solid #bfdbfe', transition: '0.2s'}} className="hover-shadow"><Icons.ExternalLink size={14} /> Abrir Portal de Login</a>}
                          </div>
                          {!isViewOnly && (
                            <div style={{display:'flex', flexDirection:'column', gap:'6px'}}>
                               <button onClick={() => abrirEdicaoSubItem(a, setNovoAcesso, setShowAddAcesso)} className="action-btn hover-blue-text"><Icons.Edit /></button>
                               <button onClick={() => deleteItem('acessos_cliente', a.id, setAcessos, acessos)} className="action-btn hover-red-text"><Icons.Trash /></button>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* --- MODAL DE CONFIRMAÇÃO GLOBAL --- */}
      {confirmDialog.show && (
          <ModalPortal>
              <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999}}>
                  <div style={{background: 'white', padding: '30px', borderRadius: '16px', width: '90%', maxWidth: '400px', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', animation: 'fadeIn 0.2s ease-out'}}>
                      <div style={{display: 'flex', justifyContent: 'center', marginBottom: '15px'}}><Icons.Alert size={48} color={confirmDialog.isDanger ? "#ef4444" : "#3b82f6"} /></div>
                      <h3 style={{margin: '0 0 10px 0', color: '#1e293b', fontSize: '1.25rem'}}>Confirmação</h3>
                      <p style={{color: '#64748b', fontSize: '0.95rem', marginBottom: '25px', lineHeight: '1.5', whiteSpace: 'pre-line'}}>{confirmDialog.message}</p>
                      <div style={{display: 'flex', gap: '10px'}}>
                          <button onClick={() => setConfirmDialog({show: false})} style={{flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', background: 'white', color: '#475569', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s'}} className="hover-shadow">Cancelar</button>
                          <button onClick={confirmDialog.onConfirm} style={{flex: 1, padding: '12px', borderRadius: '10px', border: 'none', background: confirmDialog.isDanger ? '#ef4444' : '#2563eb', color: 'white', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s'}} className="hover-shadow">{confirmDialog.confirmText}</button>
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
          
          /* Efeito Interativo no Cartão */
          .client-card:hover {
              transform: translateY(-4px);
              border-color: #cbd5e1 !important;
              box-shadow: 0 12px 20px -5px rgba(0,0,0,0.1) !important;
          }

          .hover-shadow:hover { box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); transform: translateY(-1px); }
          .hover-blue-text:hover { background: #eff6ff !important; color: #1d4ed8 !important; }
          .hover-orange-text:hover { background: #fff7ed !important; color: #d97706 !important; }
          .hover-green-text:hover { background: #dcfce7 !important; color: #16a34a !important; }
          .hover-red-text:hover { background: #fef2f2 !important; color: #ef4444 !important; }

          /* Focus em Inputs */
          .input-focus:focus { border-color: #3b82f6 !important; box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1); }

          /* Action Buttons para Sub-itens */
          .action-btn { background: transparent; border: none; cursor: pointer; opacity: 0.5; transition: 0.2s; display: flex; align-items: center; justify-content: center; padding: 6px; border-radius: 6px; }
          .action-btn:hover { opacity: 1; transform: scale(1.1); }

          /* Botão External Link inline */
          .btn-icon-link { display: flex; align-items: center; justify-content: center; text-decoration: none; background: #eff6ff; color: #2563eb; padding: 0 15px; height: 42px; border-radius: 8px; border: 1px solid #bfdbfe; transition: 0.2s; }
          .btn-icon-link:hover { background: #dbeafe; transform: translateY(-1px); box-shadow: 0 2px 4px rgba(37,99,235,0.1); }

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