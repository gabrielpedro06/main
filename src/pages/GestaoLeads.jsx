// =====================================================================
// Gestão de Leads (rota /dashboard/leads; admin, administrador, gestor, marketing).
//
// Dois separadores: "prospects" (marketing_prospects, contactos frios) e
// "leads" (marketing_leads): o CRM (components/crm/CrmLeads.jsx), com funil
//   novo -> contactado -> reuniao -> proposta -> convertido ("Ganho") | perdido,
//   valor, responsável, próxima ação com lembrete, histórico e ficha lateral.
// Prospects: primeiro escolhe-se o setor (cartões), depois vê-se em cartões
// ou em tabela.
// Fluxo: prospect "Promover a lead" (copia e desativa o prospect) e lead
// "Tornar cliente" (cria linha em clientes e arquiva a lead como convertido).
// Também: filtros por localidade/CAE, importação CSV (separador ";",
// ignora NIF já existentes), exportação CSV, copiar emails e envio de campanhas
// Brevo pelo servidor de marketing (services/marketingSender).
// Aspeto: cabeçalho comum (PageHero), janelas comuns (Janela), estilos .ld-* em
// styles/crm.css.
// Documentação: docs/modulos/clientes-e-comercial.md
// =====================================================================
import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "../services/supabase";
import { checkMarketingApiHealth, sendMarketingCampaign } from "../services/marketingSender";
import { clicavel } from "../utils/clicavel";
import { toast } from "../utils/toast";
import { confirmar } from "../utils/dialogo";
import { registarEvento } from "../utils/registarEvento";
import PageHero from "../components/PageHero";
import SlidingTabs from "../components/SlidingTabs";
import Janela from "../components/Janela";
import SelectModerno from "../components/SelectModerno";
import CrmLeads from "../components/crm/CrmLeads";
import { estaAberta, ORIGENS } from "../components/crm/crm";
import "../styles/crm.css";

// --- ÍCONES ---
const S = ({ children, s = 16 }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>;
const Icons = {
  Search: () => <S><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></S>,
  MapPin: () => <S s={14}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></S>,
  Building: () => <S><rect x="4" y="2" width="16" height="20" rx="2" /><path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01" /></S>,
  Phone: () => <S s={14}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" /></S>,
  Mail: () => <S><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-10 6L2 7" /></S>,
  User: () => <S s={14}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></S>,
  Edit: () => <S><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z" /></S>,
  Rocket: () => <S><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" /><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" /><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" /></S>,
  Archive: () => <S><path d="M21 8v13H3V8M1 3h22v5H1zM10 12h4" /></S>,
  Restore: () => <S><path d="M1 4v6h6" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" /></S>,
  Download: () => <S><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m7 10 5 5 5-5M12 15V3" /></S>,
  Upload: () => <S><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m17 8-5-5-5 5M12 3v12" /></S>,
  Copy: () => <S><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></S>,
  Alert: () => <S><circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" /></S>,
  Doc: () => <S s={26}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M16 13H8M16 17H8" /></S>,
  Arrow: () => <S s={14}><path d="M5 12h14M12 5l7 7-7 7" /></S>,
  Back: () => <S s={15}><path d="M19 12H5M12 19l-7-7 7-7" /></S>,
  Plus: () => <S><path d="M12 5v14M5 12h14" /></S>,
  Funnel: () => <S s={24}><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" /></S>,
  Grid: () => <S><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></S>,
  List: () => <S><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></S>,
  Send: () => <S><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></S>,
};

// Cores por setor (estáveis pelo nome)
const setorColors = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#f43f5e', '#14b8a6', '#0ea5e9', '#6366f1'];
const getColorForSetor = (nome) => {
  if (!nome) return '#94a3b8';
  const hash = String(nome).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return setorColors[hash % setorColors.length];
};

const baseSetores = ["Indústria", "Saúde", "Tecnologia", "Audiovisual", "Turismo", "Comércio", "Serviços"];
const initialForm = { nome: "", nif: "", localidade: "", contacto: "", email: "", titular: "", cae: "", setor: "", estado: "novo", ativo: true };
const TIPO_TOAST = { success: "sucesso", error: "erro", warning: "aviso" };

/**
 * Insere em marketing_leads; se a coluna "origem" ainda não existir (migração
 * 085 por correr), tenta de novo sem ela, para não partir importações.
 */
async function inserirLeads(linhas, opcoes) {
  let q = supabase.from("marketing_leads").insert(linhas);
  if (opcoes?.select) q = q.select().single();
  let res = await q;
  if (res.error && /origem/i.test(res.error.message || "")) {
    const sem = linhas.map((l) => { const c = { ...l }; delete c.origem; return c; });
    q = supabase.from("marketing_leads").insert(sem);
    if (opcoes?.select) q = q.select().single();
    res = await q;
  }
  return res;
}

export default function GestaoLeads() {
  const [, setParams] = useSearchParams();
  const [dataList, setDataList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("leads");

  // Prospects: setor escolhido (null = cartões de setores) e vista (cartões | tabela)
  const [selectedSetor, setSelectedSetor] = useState(null);
  const [viewMode, setViewMode] = useState("grid");

  const [filterLocalidade, setFilterLocalidade] = useState("");
  const [filterCae, setFilterCae] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [mostrarInativos, setMostrarInativos] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  const [showImportModal, setShowImportModal] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [modalForm, setModalForm] = useState({ show: false, isEdit: false, data: {} });
  const [aGravar, setAGravar] = useState(false);
  const [sendingCampaign, setSendingCampaign] = useState(false);
  const [lastCampaignSummary, setLastCampaignSummary] = useState(null);
  const [campaignForm, setCampaignForm] = useState({
    mode: "template",
    templateId: "",
    subject: "",
    htmlContent: "",
    batchSize: 75,
    batchDelayMs: 1200,
    maxRetries: 3,
  });

  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importSetor, setImportSetor] = useState("");

  // Setor "Outro" no formulário
  const [isOutroSetor, setIsOutroSetor] = useState(false);

  const isLeads = activeTab === "leads";
  const tableName = isLeads ? "marketing_leads" : "marketing_prospects";

  // Setores base + os que já existem na BD
  const dynamicSetores = [...new Set([...baseSetores, ...dataList.map(d => d.setor).filter(Boolean)])].sort();

  // Cada pedido tem um número: se entretanto se mudou de separador, a resposta
  // antiga é ignorada (senão podia escrever prospects por cima das leads).
  const pedidoAtual = useRef(0);

  useEffect(() => {
    setDataList([]); // nunca mostrar a lista do separador anterior
    fetchData();
    setCurrentPage(1);
    setSelectedSetor(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recarrega só ao mudar de separador
  }, [activeTab]);

  const showToast = (message, type = 'success') => toast(message, { tipo: TIPO_TOAST[type] || "info" });

  async function fetchData() {
    const pedido = ++pedidoAtual.current;
    const tabela = tableName;
    setLoading(true);
    const batchSize = 1000;
    let allData = [];
    let from = 0;

    while (true) {
      const { data, error } = await supabase
        .from(tabela)
        .select("*")
        .order("created_at", { ascending: false })
        .range(from, from + batchSize - 1);

      if (pedido !== pedidoAtual.current) return; // separador mudou entretanto
      if (error) break;
      if (!data || data.length === 0) break;
      allData = [...allData, ...data];
      if (data.length < batchSize) break;
      from += batchSize;
    }

    if (pedido !== pedidoAtual.current) return;
    setDataList(allData);
    setLoading(false);
  }

  async function toggleAtivo(id, estadoAtual) {
    const novoEstado = !(estadoAtual !== false);
    const ok = await confirmar(novoEstado ? "Reativar este registo?" : "Arquivar este registo?", {
      mensagem: novoEstado ? "Volta a aparecer nas listas." : "Deixa de aparecer nas listas; podes vê-lo em \"Arquivo\".",
      botao: novoEstado ? "Reativar" : "Arquivar",
      perigoso: !novoEstado,
    });
    if (!ok) return;
    const { error } = await supabase.from(tableName).update({ ativo: novoEstado }).eq("id", id);
    if (error) { showToast("Não foi possível: " + error.message, "error"); return; }
    setDataList(prev => prev.map(item => item.id === id ? { ...item, ativo: novoEstado } : item));
    showToast(`Registo ${novoEstado ? 'reativado' : 'arquivado'}.`);
  }

  /** Prospect -> Lead: cria em marketing_leads (estado "novo") e desativa o prospect. */
  async function promoteToLead(prospect) {
    const ok = await confirmar(`Promover "${prospect.nome}" a lead?`, {
      mensagem: "Passa para o CRM (etapa Novo) e sai da lista de prospects.",
      botao: "Promover a lead",
    });
    if (!ok) return;
    const { error } = await inserirLeads([{
      nome: prospect.nome, nif: prospect.nif, localidade: prospect.localidade,
      email: prospect.email, contacto: prospect.contacto, titular: prospect.titular,
      setor: prospect.setor, cae: prospect.cae, estado: "novo", ativo: true, origem: "Prospeção"
    }]);
    if (error) { showToast("Erro: " + error.message, "error"); return; }
    await supabase.from("marketing_prospects").update({ ativo: false }).eq("id", prospect.id);
    setDataList(prev => prev.map(l => l.id === prospect.id ? { ...l, ativo: false } : l));
    showToast("Promovido a lead.");
  }

  /** Lead -> Cliente: cria em clientes (marca, entidade, NIF) e arquiva a lead como "convertido". */
  async function promoteToClient(lead) {
    const ok = await confirmar(`Tornar "${lead.nome}" cliente?`, {
      mensagem: lead.cliente_id ? "A empresa já está em Entidades; a lead é arquivada como ganha." : "Cria a entidade na carteira de Clientes e arquiva a lead.",
      botao: "Tornar cliente",
    });
    if (!ok) return;
    if (!lead.cliente_id) {
      const { error } = await supabase.from("clientes").insert([{ marca: lead.nome, entidade: lead.nome, nif: lead.nif, ativo: true }]);
      if (error) { showToast("Não foi possível criar o cliente: NIF repetido ou inválido.", "error"); return; }
    }
    await supabase.from("marketing_leads").update({ ativo: false, estado: 'convertido' }).eq("id", lead.id);
    setDataList(prev => prev.map(l => l.id === lead.id ? { ...l, ativo: false, estado: 'convertido' } : l));
    showToast("Cliente criado e lead arquivada.");
  }

  function openForm(isEdit = false, data = null) {
    setIsOutroSetor(false);
    setModalForm({ show: true, isEdit, data: data ? { ...data } : { ...initialForm } });
  }
  const fecharForm = () => setModalForm({ show: false, isEdit: false, data: {} });
  const setCampo = (campo, valor) => setModalForm(m => ({ ...m, data: { ...m.data, [campo]: valor } }));

  async function handleSaveForm(e) {
    e.preventDefault();
    const payload = { ...modalForm.data };
    setAGravar(true);
    try {
      if (modalForm.isEdit) {
        const { error } = await supabase.from(tableName).update(payload).eq("id", payload.id);
        if (error) throw error;
        setDataList(prev => prev.map(item => item.id === payload.id ? { ...item, ...payload } : item));
        showToast("Dados atualizados.");
      } else {
        const { data, error } = isLeads
          ? await inserirLeads([payload], { select: true })
          : await supabase.from(tableName).insert([payload]).select().single();
        if (error) throw error;
        setDataList(prev => [data, ...prev]);
        showToast(isLeads ? "Lead criada." : "Prospect criado.");
        // lead nova: abre logo a ficha do CRM para definir valor e próximo passo
        if (isLeads && data?.id) setParams(p => { const n = new URLSearchParams(p); n.set("lead", data.id); return n; });
      }
      fecharForm();
    } catch (err) {
      showToast("Erro: " + err.message, "error");
    } finally {
      setAGravar(false);
    }
  }

  const isDuplicateNif = modalForm.data.nif && dataList.some(d => d.nif === modalForm.data.nif && d.id !== modalForm.data.id);
  const isMissingCrucialData = modalForm.isEdit && (!modalForm.data.email && !modalForm.data.contacto);

  function exportToCSV() {
    if (filteredList.length === 0) return showToast("Nenhum dado para exportar.", "warning");
    const headers = ["Nome", "NIF", "Localidade", "Setor", "CAE", "Titular", "Email", "Contacto", "Estado"];
    const csvRows = [headers.join(",")];
    filteredList.forEach(item => {
      const row = [item.nome, item.nif, item.localidade, item.setor, item.cae, item.titular, item.email, item.contacto, item.estado]
        .map(v => `"${String(v || '').replace(/"/g, '""')}"`);
      csvRows.push(row.join(","));
    });
    const blob = new Blob([csvRows.join("\n")], { type: 'text/csv;charset=utf-8;' });
    registarEvento("exportacao", { area: "Leads", linhas: filteredList.length });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Exportacao_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function copyAllEmails() {
    const emails = filteredList.map(item => item.email).filter(e => e && e.includes('@'));
    if (emails.length === 0) return showToast("Nenhum email válido encontrado.", "warning");
    navigator.clipboard.writeText(emails.join("; "));
    showToast(`${emails.length} emails copiados.`);
  }

  function getFilteredEmailsForCampaign() {
    const normalized = filteredList.map(item => String(item.email || "").trim().toLowerCase()).filter(Boolean);
    return [...new Set(normalized)];
  }

  function getFirstFailureReason(summary) {
    return summary?.failedRecipients?.[0]?.reason || "Motivo desconhecido.";
  }

  /**
   * Envia campanha de email para os emails da lista filtrada, por template Brevo
   * ou HTML livre, em lotes (batchSize, batchDelayMs, maxRetries).
   */
  async function handleSendCampaign() {
    const emails = getFilteredEmailsForCampaign();
    const isTemplateMode = campaignForm.mode === "template";

    if (emails.length === 0) { showToast("Sem emails válidos na lista filtrada.", "warning"); return; }

    let templateId = null;
    let recipientParamsByEmail = null;

    if (isTemplateMode) {
      const parsedTemplateId = Number(campaignForm.templateId);
      if (!parsedTemplateId || parsedTemplateId <= 0) { showToast("Indica um Template ID válido.", "warning"); return; }
      templateId = parsedTemplateId;
      const map = {};
      filteredList.forEach((item) => {
        const email = String(item.email || "").trim().toLowerCase();
        if (!email || map[email]) return;
        const bestName = String(item.titular || item.nome || "Cliente").trim();
        if (bestName) map[email] = { nome: bestName, firstName: bestName, FIRSTNAME: bestName };
      });
      if (Object.keys(map).length > 0) recipientParamsByEmail = map;
      if (!recipientParamsByEmail) { showToast("Não foi possível gerar o nome automático dos contactos.", "warning"); return; }
    } else {
      if (!campaignForm.subject.trim()) { showToast("Indica o assunto da campanha.", "warning"); return; }
      if (!campaignForm.htmlContent.trim()) { showToast("Indica o conteúdo HTML da campanha.", "warning"); return; }
    }

    setSendingCampaign(true);
    setLastCampaignSummary(null);

    try {
      await checkMarketingApiHealth();
      const summary = await sendMarketingCampaign({
        emails,
        templateId,
        params: undefined,
        recipientParamsByEmail,
        subject: isTemplateMode ? undefined : campaignForm.subject.trim(),
        htmlContent: isTemplateMode ? undefined : campaignForm.htmlContent,
        batchSize: Number(campaignForm.batchSize),
        batchDelayMs: Number(campaignForm.batchDelayMs),
        maxRetries: Number(campaignForm.maxRetries),
      });

      setLastCampaignSummary(summary);
      const failedCount = summary?.failedRecipients?.length || 0;
      if (summary?.repetido) {
        showToast("Esta campanha já tinha sido enviada há poucos minutos (mesmos destinatários e conteúdo). Não foi enviada outra vez.", "warning");
      } else if (failedCount > 0) {
        const reason = getFirstFailureReason(summary);
        if (reason.toLowerCase().includes("unrecognised ip address")) {
          showToast("Falha Brevo: IP não autorizado. Adiciona este IP em Brevo > Security > Authorised IPs.", "error");
        } else if (reason.toLowerCase().includes("params is blank")) {
          showToast("Falha Brevo: este template exige variáveis. O sistema envia nome automático; reinicia o backend e tenta novamente.", "error");
        } else {
          showToast(`Campanha com falhas (${failedCount}): ${reason}`, "warning");
        }
      } else {
        showToast(`Campanha enviada para ${summary?.sentRecipients || 0} contactos.`);
      }
    } catch (error) {
      if (String(error.message || "").includes("API de marketing indisponivel")) {
        showToast("Servidor de marketing desligado. Inicia 'npm run dev:full' e tenta novamente.", "error");
      } else {
        showToast(`Erro no envio: ${error.message}`, "error");
      }
    } finally {
      setSendingCampaign(false);
    }
  }

  /**
   * Importa CSV (; como separador, 1.ª linha = cabeçalho) para a tabela do
   * separador ativo. NIF já existentes nessa tabela são ignorados.
   */
  async function handleFileUpload(e) {
    e.preventDefault();
    if (!file) return showToast("Escolhe um ficheiro CSV primeiro.", "warning");
    setImporting(true);

    const reader = new FileReader();
    reader.onload = async ({ target }) => {
      try {
        const lines = target.result.split("\n");
        const rawData = [];
        const regexSplit = /;(?=(?:(?:[^"]*"){2})*[^"]*$)/;

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          const cols = line.split(regexSplit);
          const clean = (val) => val ? val.trim().replace(/^"|"$/g, '') : null;
          if (cols.length >= 2) {
            rawData.push({
              nome: clean(cols[0]) || "Sem Nome",
              nif: clean(cols[1]),
              localidade: clean(cols[2]),
              contacto: clean(cols[3]),
              email: clean(cols[4]),
              titular: clean(cols[5]),
              cae: clean(cols[6]),
              setor: importSetor || null,
              estado: "novo",
              ativo: true,
              ...(isLeads ? { origem: "Importação CSV" } : {})
            });
          }
        }

        if (rawData.length === 0) { showToast("O ficheiro CSV parece estar vazio.", "warning"); return; }

        const nifsToCheck = rawData.map(item => item.nif).filter(nif => nif && nif.trim() !== "");
        const existingNifs = new Set();
        for (let i = 0; i < nifsToCheck.length; i += 100) {
          const chunk = nifsToCheck.slice(i, i + 100);
          const { data: existingRecords, error: checkError } = await supabase.from(tableName).select('nif').in('nif', chunk);
          if (checkError) throw checkError;
          (existingRecords || []).forEach(r => existingNifs.add(r.nif));
        }

        const newRecords = rawData.filter(item => !item.nif || item.nif.trim() === "" || !existingNifs.has(item.nif));
        const duplicateCount = rawData.length - newRecords.length;

        if (newRecords.length === 0) { showToast("Todos os registos do CSV já existem.", "warning"); return; }
        for (let i = 0; i < newRecords.length; i += 200) {
          const lote = newRecords.slice(i, i + 200);
          const { error } = isLeads ? await inserirLeads(lote) : await supabase.from(tableName).insert(lote);
          if (error) throw error;
        }
        showToast(`${newRecords.length} importados.${duplicateCount > 0 ? ` (${duplicateCount} repetidos ignorados)` : ''}`);
        setShowImportModal(false);
        fetchData();
      } catch (err) {
        showToast("Erro a processar o ficheiro: " + err.message, "error");
      } finally {
        setImporting(false);
        setFile(null);
      }
    };
    reader.readAsText(file);
  }

  // ---------- filtros ----------
  const passaFiltros = (item) => {
    if (!mostrarInativos && item.ativo === false) return false;
    const t = searchTerm.toLowerCase();
    const matchLocalidade = filterLocalidade ? item.localidade?.toLowerCase().includes(filterLocalidade.toLowerCase()) : true;
    const matchCae = filterCae ? item.cae?.toLowerCase().includes(filterCae.toLowerCase()) : true;
    const matchSearch = searchTerm ? [item.nome, item.titular, item.email].some(v => v?.toLowerCase().includes(t)) || item.nif?.includes(searchTerm) : true;
    return matchLocalidade && matchCae && matchSearch;
  };

  const countsPerSetor = {};
  dataList.forEach(item => {
    if (!passaFiltros(item)) return;
    const s = item.setor || 'sem-setor';
    countsPerSetor[s] = (countsPerSetor[s] || 0) + 1;
  });

  const filteredList = dataList.filter((item) => {
    if (!passaFiltros(item)) return false;
    if (!isLeads && selectedSetor) {
      if (selectedSetor === 'sem-setor' && item.setor) return false;
      if (selectedSetor !== 'sem-setor' && item.setor !== selectedSetor) return false;
    }
    return true;
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const currentItems = filteredList.slice(indexOfLastItem - itemsPerPage, indexOfLastItem);
  const totalPages = Math.ceil(filteredList.length / itemsPerPage);
  const haFiltros = !!(searchTerm || filterLocalidade || filterCae || mostrarInativos);

  const abertas = isLeads ? dataList.filter(estaAberta).length : 0;
  const ativos = dataList.filter(d => d.ativo !== false).length;

  const setoresVisiveis = dynamicSetores.filter(s => (countsPerSetor[s] || 0) > 0 || haFiltros);

  // ---------- peças ----------
  const acoesProspect = (item) => {
    const isInactive = item.ativo === false;
    return (
      <div className="ld-acoes">
        <button type="button" className="ld-ico" onClick={() => openForm(true, item)} title="Ver / editar dados" aria-label="Ver / editar dados">
          <Icons.Edit />
          {!item.email && !item.contacto && <i className="ld-ponto" aria-hidden="true" />}
        </button>
        {!isInactive && (
          <button type="button" className="ld-ico is-acento" onClick={() => promoteToLead(item)} title="Promover a lead" aria-label="Promover a lead"><Icons.Rocket /></button>
        )}
        <button type="button" className={`ld-ico ${isInactive ? "is-ok" : "is-perigo"}`} onClick={() => toggleAtivo(item.id, item.ativo)} title={isInactive ? "Restaurar" : "Arquivar"} aria-label={isInactive ? "Restaurar" : "Arquivar"}>
          {isInactive ? <Icons.Restore /> : <Icons.Archive />}
        </button>
      </div>
    );
  };

  return (
    <div className="page-container ld">
      <PageHero
        icon={<Icons.Funnel />}
        kicker="Marketing · Comercial"
        title="Leads"
        subtitle={isLeads ? "O funil comercial: de contacto a cliente." : "Base de empresas para prospeção, por setor."}
        stats={loading ? [] : isLeads
          ? [{ valor: abertas, label: "em aberto" }]
          : [{ valor: ativos, label: "prospects" }]}
        side={<>
          <button type="button" className="page-hero-btn is-vidro" onClick={() => setShowSendModal(true)}><Icons.Send /> Campanha</button>
          <button type="button" className="page-hero-btn is-vidro" onClick={() => setShowImportModal(true)}><Icons.Download /> Importar</button>
          <button type="button" className="page-hero-btn" onClick={() => openForm(false)}><Icons.Plus /> {isLeads ? "Nova lead" : "Novo prospect"}</button>
        </>}
        tools={<>
          <SlidingTabs
            ariaLabel="Separadores"
            value={activeTab}
            onChange={(t) => { setActiveTab(t); setCurrentPage(1); }}
            tabs={[
              { id: "leads", label: "Leads", icon: <Icons.Rocket /> },
              { id: "prospects", label: "Prospects", icon: <Icons.Building /> },
            ]}
          />
          <label className="page-hero-busca">
            <Icons.Search />
            <input
              aria-label="Pesquisar"
              placeholder={isLeads ? "Empresa, pessoa, email ou NIF…" : "Empresa ou NIF…"}
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            />
          </label>
          <input className="ld-hero-campo" aria-label="Localidade" placeholder="Localidade" value={filterLocalidade} onChange={(e) => { setFilterLocalidade(e.target.value); setCurrentPage(1); }} />
          <input className="ld-hero-campo is-curto" aria-label="CAE" placeholder="CAE" value={filterCae} onChange={(e) => { setFilterCae(e.target.value); setCurrentPage(1); }} />
          <button type="button" className={`ld-hero-toggle${mostrarInativos ? " is-on" : ""}`} aria-pressed={mostrarInativos} onClick={() => { setMostrarInativos(v => !v); setCurrentPage(1); }}>
            <Icons.Archive /> Arquivo
          </button>
          <span className="ld-hero-mais">
            <button type="button" className="ld-hero-toggle" onClick={copyAllEmails} title="Copiar os emails da lista filtrada"><Icons.Copy /> Emails</button>
            <button type="button" className="ld-hero-toggle" onClick={exportToCSV} title="Exportar a lista filtrada"><Icons.Upload /> CSV</button>
          </span>
        </>}
      />

      <div key={activeTab} className="bz-tab-panel ld-corpo">
        {isLeads && loading ? (
          <div className="ld-setores">{[0, 1, 2, 3].map(i => <div key={i} className="ld-setor is-a-carregar" />)}</div>
        ) : isLeads ? (
          <CrmLeads
            leads={filteredList}
            setLeads={setDataList}
            setores={dynamicSetores}
            onEditar={(lead) => openForm(true, lead)}
            onTornarCliente={promoteToClient}
            onArquivar={(lead) => toggleAtivo(lead.id, lead.ativo)}
          />
        ) : !selectedSetor ? (
          /* PROSPECTS · escolher o setor */
          <section className="ld-setores-bloco">
            <h2 className="ld-titulo"><Icons.Building /> Setores</h2>
            {loading ? (
              <div className="ld-setores">{[0, 1, 2, 3].map(i => <div key={i} className="ld-setor is-a-carregar" />)}</div>
            ) : (
              <div className="ld-setores">
                {setoresVisiveis.map(setor => {
                  const count = countsPerSetor[setor] || 0;
                  return (
                    <div key={setor} {...clicavel(() => setSelectedSetor(setor))} className="ld-setor" style={{ "--c": getColorForSetor(setor) }}>
                      <span className="ld-setor-ico"><Icons.Building /></span>
                      <h3>{setor}</h3>
                      <strong>{count}</strong>
                      <span className="ld-setor-ver">Ver empresas <Icons.Arrow /></span>
                    </div>
                  );
                })}
                {countsPerSetor['sem-setor'] > 0 && (
                  <div {...clicavel(() => setSelectedSetor('sem-setor'))} className="ld-setor" style={{ "--c": "#94a3b8" }}>
                    <span className="ld-setor-ico"><Icons.Building /></span>
                    <h3>Sem setor</h3>
                    <strong>{countsPerSetor['sem-setor']}</strong>
                    <span className="ld-setor-ver">Ver não categorizados <Icons.Arrow /></span>
                  </div>
                )}
              </div>
            )}
            {!loading && Object.keys(countsPerSetor).length === 0 && (
              <div className="bz-vazio-grande">
                <span className="bz-vazio-ico"><Icons.Building /></span>
                <h3>{haFiltros ? "Nenhuma empresa com estes filtros" : "Ainda não há prospects"}</h3>
                <p>{haFiltros ? "Experimenta limpar a pesquisa ou os filtros." : "Importa um CSV ou cria o primeiro prospect."}</p>
                {!haFiltros && <button type="button" className="bz-btn is-primary" onClick={() => setShowImportModal(true)}><Icons.Download /> Importar CSV</button>}
              </div>
            )}
          </section>
        ) : (
          /* PROSPECTS · empresas de um setor */
          <section className="ld-setor-vista">
            <div className="ld-setor-barra">
              <button type="button" className="bz-btn" onClick={() => setSelectedSetor(null)}><Icons.Back /> Setores</button>
              <h2 style={{ "--c": getColorForSetor(selectedSetor === 'sem-setor' ? null : selectedSetor) }}>
                <i />{selectedSetor === 'sem-setor' ? 'Sem setor' : selectedSetor}
                <span>{filteredList.length}</span>
              </h2>
              <div className="crm-vistas" role="group" aria-label="Vista">
                <button type="button" className={viewMode === "grid" ? "is-on" : ""} aria-pressed={viewMode === "grid"} onClick={() => setViewMode("grid")}><Icons.Grid /> <span>Cartões</span></button>
                <button type="button" className={viewMode === "table" ? "is-on" : ""} aria-pressed={viewMode === "table"} onClick={() => setViewMode("table")}><Icons.List /> <span>Tabela</span></button>
              </div>
            </div>

            {viewMode === "grid" && (
              <div className="ld-cartoes">
                {currentItems.map((item) => {
                  const isInactive = item.ativo === false;
                  const semContactos = !item.email && !item.contacto;
                  return (
                    <article key={item.id} className={`ld-cartao${isInactive ? " is-arquivado" : ""}`}>
                      <div className="ld-cartao-topo">
                        <h3>{item.nome}</h3>
                        {isInactive && <span className="crm-chip">Arquivado</span>}
                      </div>
                      <div className="ld-cartao-info">
                        {item.localidade && <span><Icons.MapPin /> {item.localidade}</span>}
                        {item.titular && <span><Icons.User /> {item.titular}</span>}
                        {item.contacto && <span><Icons.Phone /> {item.contacto}</span>}
                        {item.email && <a href={`mailto:${item.email}`}><Icons.Mail /> {item.email}</a>}
                      </div>
                      <div className="ld-cartao-meta">
                        {item.nif && <span className="crm-mono">{item.nif}</span>}
                        {item.cae && <span className="crm-chip">CAE {item.cae}</span>}
                        {semContactos && <span className="crm-chip is-aviso">Sem contactos</span>}
                      </div>
                      {acoesProspect(item)}
                    </article>
                  );
                })}
              </div>
            )}

            {viewMode === "table" && (
              <div className="bz-tabela-wrap">
                <table className="bz-tabela">
                  <thead>
                    <tr>
                      <th>Empresa</th>
                      <th>Contactos</th>
                      <th>CAE</th>
                      <th style={{ textAlign: 'right' }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentItems.map((item) => (
                      <tr key={item.id} className={item.ativo === false ? "ld-linha-arquivada" : ""}>
                        <td>
                          <b className="ld-forte">{item.nome}</b>
                          <span className="crm-sub">{[item.nif, item.localidade].filter(Boolean).join(" · ") || "—"}</span>
                        </td>
                        <td>
                          <div className="ld-contactos">
                            {item.titular && <span><Icons.User /> {item.titular}</span>}
                            {item.contacto && <span><Icons.Phone /> {item.contacto}</span>}
                            {item.email && <a href={`mailto:${item.email}`}><Icons.Mail /> {item.email}</a>}
                            {!item.email && !item.contacto && <span className="crm-chip is-aviso">Sem contactos</span>}
                          </div>
                        </td>
                        <td>{item.cae || <span className="crm-sub">—</span>}</td>
                        <td>{acoesProspect(item)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {filteredList.length === 0 && (
              <div className="bz-vazio-grande">
                <span className="bz-vazio-ico"><Icons.Search /></span>
                <h3>Nenhum registo</h3>
                <p>Não há empresas neste setor com estes filtros.</p>
              </div>
            )}

            {totalPages > 1 && (
              <div className="ld-paginas">
                <label>
                  Mostrar
                  <SelectModerno value={String(itemsPerPage)} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} className="ld-paginas-sel">
                    <option value="10">10</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                  </SelectModerno>
                </label>
                <div className="ld-paginas-nav">
                  <button type="button" className="bz-btn" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>Anterior</button>
                  <span>Página <b>{currentPage}</b> de {totalPages}</span>
                  <button type="button" className="bz-btn" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>Seguinte</button>
                </div>
              </div>
            )}
          </section>
        )}
      </div>

      {/* --- FORMULÁRIO (criar / completar dados) --- */}
      <Janela
        aberta={modalForm.show}
        aoFechar={fecharForm}
        bloquear={aGravar}
        largura={680}
        camada="calc(var(--z-modal) + 40)"
        icone={modalForm.isEdit ? <Icons.Edit /> : <Icons.Plus />}
        titulo={modalForm.isEdit ? (modalForm.data.nome || "Editar") : (isLeads ? "Nova lead" : "Novo prospect")}
        subtitulo={modalForm.isEdit ? "Dados da empresa e contactos" : (isLeads ? "Entra no CRM na etapa Novo." : "Fica na lista de prospeção do setor.")}
        rodape={<>
          <button type="button" onClick={fecharForm}>Cancelar</button>
          <button type="submit" form="ld-form" className="is-primary" disabled={aGravar || (isDuplicateNif && !modalForm.isEdit)}>
            {aGravar ? "A gravar…" : modalForm.isEdit ? "Guardar" : "Criar"}
          </button>
        </>}
      >
        <form id="ld-form" onSubmit={handleSaveForm}>
          {isMissingCrucialData && (
            <div className="ld-aviso"><Icons.Alert /> Este registo não tem email nem telefone.</div>
          )}
          <div className="bz-secao is-primeira"><Icons.Building /> Empresa</div>
          <div className="ld-grelha-nif">
            <div>
              <label className="bz-rotulo" htmlFor="ld-nome">Nome da empresa *</label>
              <input id="ld-nome" className="bz-campo is-forte" type="text" value={modalForm.data.nome || ''} onChange={e => setCampo("nome", e.target.value)} required />
            </div>
            <div>
              <label className="bz-rotulo" htmlFor="ld-nif">NIF</label>
              <input id="ld-nif" className="bz-campo" type="text" inputMode="numeric" maxLength="9" placeholder="500000000" value={modalForm.data.nif || ''} onChange={e => setCampo("nif", e.target.value)} aria-invalid={!!isDuplicateNif} />
              {isDuplicateNif && <div className="bz-erro">⚠ Este NIF já existe</div>}
            </div>
          </div>
          <div className="bz-grelha-3 ld-grelha-3">
            <div>
              <label className="bz-rotulo" htmlFor="ld-local">Localidade</label>
              <input id="ld-local" className="bz-campo" type="text" value={modalForm.data.localidade || ''} onChange={e => setCampo("localidade", e.target.value)} />
            </div>
            <div>
              <label className="bz-rotulo">Setor</label>
              <SelectModerno
                className="ld-sel-largo"
                value={isOutroSetor ? "__outro__" : (modalForm.data.setor || "")}
                onChange={e => {
                  const v = e.target.value;
                  if (v === "__outro__") { setIsOutroSetor(true); setCampo("setor", ""); }
                  else { setIsOutroSetor(false); setCampo("setor", v); }
                }}
              >
                <option value="">— Sem setor —</option>
                {dynamicSetores.map(s => <option key={s} value={s}>{s}</option>)}
                <option value="__outro__">Outro (criar novo)…</option>
              </SelectModerno>
              {isOutroSetor && (
                <input className="bz-campo" style={{ marginTop: 8 }} type="text" autoFocus placeholder="Nome do novo setor" aria-label="Nome do novo setor" value={modalForm.data.setor || ""} onChange={e => setCampo("setor", e.target.value)} />
              )}
            </div>
            <div>
              <label className="bz-rotulo" htmlFor="ld-cae">CAE</label>
              <input id="ld-cae" className="bz-campo" type="text" value={modalForm.data.cae || ''} onChange={e => setCampo("cae", e.target.value)} />
            </div>
          </div>

          {isLeads && !modalForm.isEdit && (
            <>
              <label className="bz-rotulo" style={{ marginTop: 12 }}>Origem</label>
              <SelectModerno className="ld-sel-largo" value={modalForm.data.origem || ""} onChange={e => setCampo("origem", e.target.value || null)}>
                <option value="">— Por indicar —</option>
                {ORIGENS.filter(o => o !== "Importação CSV").map(o => <option key={o} value={o}>{o}</option>)}
              </SelectModerno>
            </>
          )}

          <div className="bz-secao"><Icons.User /> Contacto</div>
          <label className="bz-rotulo" htmlFor="ld-titular">Pessoa de contacto</label>
          <input id="ld-titular" className="bz-campo" type="text" placeholder="Nome da pessoa…" value={modalForm.data.titular || ''} onChange={e => setCampo("titular", e.target.value)} />
          <div className="bz-grelha-2" style={{ marginTop: 12 }}>
            <div>
              <label className="bz-rotulo" htmlFor="ld-email">Email</label>
              <input id="ld-email" className="bz-campo" type="email" value={modalForm.data.email || ''} onChange={e => setCampo("email", e.target.value)} />
            </div>
            <div>
              <label className="bz-rotulo" htmlFor="ld-tel">Telefone</label>
              <input id="ld-tel" className="bz-campo" type="tel" value={modalForm.data.contacto || ''} onChange={e => setCampo("contacto", e.target.value)} />
            </div>
          </div>
        </form>
      </Janela>

      {/* --- IMPORTAÇÃO CSV --- */}
      <Janela
        aberta={showImportModal}
        aoFechar={() => { setShowImportModal(false); setFile(null); }}
        bloquear={importing}
        largura={520}
        icone={<Icons.Download />}
        titulo="Importar CSV"
        subtitulo={<>Destino: <b>{isLeads ? "Leads" : "Prospects"}</b></>}
        rodape={<>
          <button type="button" onClick={() => { setShowImportModal(false); setFile(null); }}>Cancelar</button>
          <button type="button" className="is-primary" onClick={handleFileUpload} disabled={importing || !file}>{importing ? "A importar…" : "Importar"}</button>
        </>}
      >
        <div className="bz-dica ld-dica-caixa">
          <b>Colunas, por esta ordem</b> (separadas por <code>;</code>, 1.ª linha é o cabeçalho):<br />
          Nome · NIF · Localidade · Contacto · Email · Titular · CAE<br />
          NIF que já existam são ignorados.
        </div>
        <label className="bz-rotulo">Setor para todas as linhas (opcional)</label>
        <SelectModerno className="ld-sel-largo" value={importSetor} onChange={(e) => setImportSetor(e.target.value)}>
          <option value="">— Deixar em branco —</option>
          {dynamicSetores.map((s) => <option key={s} value={s}>{s}</option>)}
        </SelectModerno>
        <label className={`ld-ficheiro${file ? " is-escolhido" : ""}`}>
          <Icons.Doc />
          <span>{file ? file.name : "Clica para escolher o ficheiro CSV"}</span>
          {file && <small>{Math.max(1, Math.round(file.size / 1024))} KB · clica para trocar</small>}
          <input type="file" accept=".csv" onChange={(e) => setFile(e.target.files[0] || null)} />
        </label>
      </Janela>

      {/* --- CAMPANHA DE EMAIL --- */}
      <Janela
        aberta={showSendModal}
        aoFechar={() => setShowSendModal(false)}
        bloquear={sendingCampaign}
        largura={720}
        icone={<Icons.Send />}
        titulo="Campanha por email"
        subtitulo={<>Para <b>{getFilteredEmailsForCampaign().length}</b> emails únicos da lista filtrada</>}
        rodape={<>
          <button type="button" onClick={() => setShowSendModal(false)}>Fechar</button>
          <button type="button" className="is-primary" onClick={handleSendCampaign} disabled={sendingCampaign}>{sendingCampaign ? "A enviar…" : "Enviar agora"}</button>
        </>}
      >
        <div className="crm-vistas ld-modos" role="radiogroup" aria-label="Tipo de campanha">
          <button type="button" role="radio" aria-checked={campaignForm.mode === "template"} className={campaignForm.mode === "template" ? "is-on" : ""} onClick={() => setCampaignForm(p => ({ ...p, mode: "template" }))}>Template Brevo</button>
          <button type="button" role="radio" aria-checked={campaignForm.mode === "html"} className={campaignForm.mode === "html" ? "is-on" : ""} onClick={() => setCampaignForm(p => ({ ...p, mode: "html" }))}>HTML</button>
        </div>

        {campaignForm.mode === "template" ? (
          <>
            <label className="bz-rotulo" htmlFor="ld-tpl">Template ID (Brevo)</label>
            <input id="ld-tpl" className="bz-campo" type="number" min="1" value={campaignForm.templateId} onChange={(e) => setCampaignForm(p => ({ ...p, templateId: e.target.value }))} placeholder="Ex.: 12" />
            <div className="bz-dica">O conteúdo é gerido no Brevo. Cada email recebe o nome do titular (ou da empresa) automaticamente.</div>
          </>
        ) : (
          <>
            <label className="bz-rotulo" htmlFor="ld-assunto">Assunto</label>
            <input id="ld-assunto" className="bz-campo" type="text" value={campaignForm.subject} onChange={(e) => setCampaignForm(p => ({ ...p, subject: e.target.value }))} />
            <label className="bz-rotulo" htmlFor="ld-html" style={{ marginTop: 12 }}>Conteúdo HTML</label>
            <textarea id="ld-html" className="bz-campo ld-html" rows={8} value={campaignForm.htmlContent} onChange={(e) => setCampaignForm(p => ({ ...p, htmlContent: e.target.value }))} placeholder="Cola aqui o HTML da campanha…" />
          </>
        )}

        <details className="ld-avancado">
          <summary>Envio avançado</summary>
          <div className="bz-grelha-3 ld-grelha-3">
            <div>
              <label className="bz-rotulo" htmlFor="ld-lote">Emails por lote</label>
              <input id="ld-lote" className="bz-campo" type="number" min="1" max="100" value={campaignForm.batchSize} onChange={(e) => setCampaignForm(p => ({ ...p, batchSize: e.target.value }))} />
            </div>
            <div>
              <label className="bz-rotulo" htmlFor="ld-pausa">Pausa entre lotes (ms)</label>
              <input id="ld-pausa" className="bz-campo" type="number" min="0" value={campaignForm.batchDelayMs} onChange={(e) => setCampaignForm(p => ({ ...p, batchDelayMs: e.target.value }))} />
            </div>
            <div>
              <label className="bz-rotulo" htmlFor="ld-rep">Repetições se falhar</label>
              <input id="ld-rep" className="bz-campo" type="number" min="0" max="10" value={campaignForm.maxRetries} onChange={(e) => setCampaignForm(p => ({ ...p, maxRetries: e.target.value }))} />
            </div>
          </div>
        </details>

        {lastCampaignSummary && (
          <div className="ld-resumo">
            <div><b>{lastCampaignSummary.sentRecipients}</b><span>enviados</span></div>
            <div><b>{lastCampaignSummary.invalidEmails?.length || 0}</b><span>inválidos</span></div>
            <div><b>{lastCampaignSummary.duplicates?.length || 0}</b><span>repetidos</span></div>
            <div className={(lastCampaignSummary.failedRecipients?.length || 0) > 0 ? "is-mau" : ""}><b>{lastCampaignSummary.failedRecipients?.length || 0}</b><span>falhados</span></div>
            {(lastCampaignSummary.failedRecipients?.length || 0) > 0 && (
              <p><b>Motivo principal:</b> {getFirstFailureReason(lastCampaignSummary)}</p>
            )}
          </div>
        )}
      </Janela>
    </div>
  );
}
