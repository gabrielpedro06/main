import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../services/supabase";
import { checkTransfergestApiHealth, sendTransfergestCampaign } from "../services/transfergestSender";
import "./../styles/dashboard.css";

const ModalPortal = ({ children }) => createPortal(children, document.body);

const STATUS_OPTIONS = [
  { value: "novo", label: "NOVO" },
  { value: "contactado", label: "CONTACTADO" },
  { value: "reuniao", label: "REUNIÃO" },
];

const CSV_FIELDS = [
  { key: "denominacao", label: "Denominacao" },
  { key: "nome", label: "Nome" },
  { key: "contacto_telefone", label: "Contacto (Telef/Telem.)" },
  { key: "contacto_email", label: "Contacto (Email)" },
  { key: "numero_registo", label: "N de registo" },
  { key: "data_registo", label: "Data do registo" },
  { key: "numero_contribuinte", label: "N de contribuinte" },
  { key: "sede_endereco", label: "Sede (Endereco)" },
  { key: "sede_codigo_postal", label: "Sede (Codigo postal)" },
  { key: "sede_localidade", label: "Sede (Localidade)" },
  { key: "sede_concelho", label: "Sede (Concelho)" },
  { key: "sede_distrito", label: "Sede (Distrito)" },
  { key: "ert_drt", label: "ERT DRT" },
  { key: "nut_ii", label: "NUT II" },
  { key: "nut_iii", label: "NUT III" },
  { key: "observacoes", label: "Observacoes" },
  { key: "ano", label: "Ano" },
  { key: "classificacao_transfergest", label: "Classificacao Transfergest" },
  { key: "interesse_email_marketing", label: "Interesse para a campanha email marketing?" },
  { key: "target", label: "Target" },
];

const HEADER_ALIASES = {
  denominacao: ["denominacao"],
  nome: ["nome"],
  contacto_telefone: ["contacto teleftelem", "contacto telefone", "contacto"],
  contacto_email: ["contacto email", "email", "contactoemail"],
  numero_registo: ["n de registo", "numero de registo", "n registo"],
  data_registo: ["data do registo", "data registo"],
  numero_contribuinte: ["n de contribuinte", "numero de contribuinte", "n contribuinte", "nif"],
  sede_endereco: ["sede endereco", "sede morada"],
  sede_codigo_postal: ["sede codigo postal"],
  sede_localidade: ["sede localidade", "localidade"],
  sede_concelho: ["sede concelho", "concelho"],
  sede_distrito: ["sede distrito", "distrito"],
  ert_drt: ["ert drt", "ertdrt"],
  nut_ii: ["nut ii", "nut2"],
  nut_iii: ["nut iii", "nut3"],
  observacoes: ["observacoes", "observacoes/nota", "obs"],
  ano: ["ano"],
  classificacao_transfergest: ["classificacao transfergest", "classificacao"],
  interesse_email_marketing: ["interesse para a campanha email marketing", "interesse email marketing", "interesse"],
  target: ["target"],
};

const INITIAL_FORM = {
  denominacao: "",
  nome: "",
  contacto_telefone: "",
  contacto_email: "",
  numero_registo: "",
  data_registo: "",
  numero_contribuinte: "",
  sede_endereco: "",
  sede_codigo_postal: "",
  sede_localidade: "",
  sede_concelho: "",
  sede_distrito: "",
  ert_drt: "",
  nut_ii: "",
  nut_iii: "",
  observacoes: "",
  ano: "",
  classificacao_transfergest: "",
  interesse_email_marketing: false,
  target: "",
  estado: "novo",
  estado_historico: {},
  ativo: true,
};

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: "8px",
  border: "1px solid var(--color-borderColor)",
  background: "var(--color-cardBg, #fff)",
  color: "var(--color-textPrimary)",
};

const labelStyle = {
  display: "block",
  fontSize: "0.75rem",
  fontWeight: 700,
  color: "var(--color-textSecondary)",
  marginBottom: "6px",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

function normalizeHeader(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[()]/g, "")
    .replace(/\s+/g, " ")
    .replace(/[\/.?,]/g, "")
    .replace(/[º°]/g, "");
}

function parseCsvLine(line, delimiter) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  result.push(current.trim());
  return result.map((value) => value.replace(/^"|"$/g, "").trim());
}

function parseBoolean(value) {
  const raw = String(value || "").trim().toLowerCase();
  return ["1", "sim", "s", "yes", "y", "true", "x"].includes(raw);
}

function toIsoDate(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  const parts = raw.split(/[/.-]/).map((item) => item.trim());
  if (parts.length === 3) {
    const [a, b, c] = parts;
    if (a.length === 2 && b.length === 2 && c.length === 4) return `${c}-${b}-${a}`;
  }

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function buildStatusHistory(previous, nextStatus, dateIso) {
  const base = previous && typeof previous === "object" && !Array.isArray(previous) ? previous : {};
  return {
    ...base,
    [nextStatus]: dateIso,
  };
}

const formatDisplayValue = (value, fallback = "-") => {
  const text = String(value ?? "").trim();
  return text || fallback;
};

function getFirstName(value) {
  const text = String(value || "").trim();
  if (!text) return "Cliente";

  const parts = text.split(/\s+/).filter(Boolean);
  return parts[0] || "Cliente";
}

const STATUS_STYLE = {
  novo: { bg: "#f5f3ff", color: "#6d28d9", border: "#ddd6fe" },
  contactado: { bg: "#fffbeb", color: "#b45309", border: "#fde68a" },
  reuniao: { bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" },
};

function parseFilterQuery(query) {
  const tokens = String(query || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const filters = {
    textTerms: [],
    localidade: "",
    ano: "",
    target: "",
    interesse: "",
  };

  tokens.forEach((token) => {
    const [rawKey, ...rawValueParts] = token.split(/[:=]/);
    const value = rawValueParts.join(":").trim();
    const key = normalizeHeader(rawKey);

    if (value && ["localidade", "cidade", "municipio"].includes(key)) {
      filters.localidade = value;
      return;
    }

    if (value && ["ano", "year"].includes(key)) {
      filters.ano = value;
      return;
    }

    if (value && ["target", "alvo"].includes(key)) {
      filters.target = value;
      return;
    }

    if (value && ["interesse", "email", "marketing"].includes(key)) {
      filters.interesse = value;
      return;
    }

    filters.textTerms.push(token);
  });

  return filters;
}

export default function TransferGest() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const [activeStatusTab, setActiveStatusTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  const [selectedIds, setSelectedIds] = useState([]);

  const [notification, setNotification] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ show: false, message: "", onConfirm: null, confirmText: "Confirmar", isDanger: false });

  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);

  const [showFormModal, setShowFormModal] = useState(false);
  const [isEditForm, setIsEditForm] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailItem, setDetailItem] = useState(null);

  const [showBulkStatusModal, setShowBulkStatusModal] = useState(false);
  const [bulkStatus, setBulkStatus] = useState("contactado");
  const [bulkStatusDate, setBulkStatusDate] = useState(new Date().toISOString().slice(0, 10));
  const [bulkUpdating, setBulkUpdating] = useState(false);

  const [showSendModal, setShowSendModal] = useState(false);
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
    markAsContactadoAfterSend: true,
  });

  const showToast = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3200);
  };

  const loadRows = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("transfergest_registos")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      showToast(`Erro ao carregar TransferGest: ${error.message}`, "error");
      setLoading(false);
      return;
    }

    setRows(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadRows();
  }, []);

  const filteredRows = useMemo(() => {
    const queryFilters = parseFilterQuery(searchTerm);
    const normalizedInteresse = queryFilters.interesse.toLowerCase();

    return rows.filter((item) => {
      if (!showArchived && item.ativo === false) return false;

      if (activeStatusTab !== "all" && item.estado !== activeStatusTab) return false;

      if (queryFilters.localidade) {
        const value = String(item.sede_localidade || "").toLowerCase();
        if (!value.includes(queryFilters.localidade.toLowerCase())) return false;
      }

      if (queryFilters.ano) {
        if (String(item.ano || "") !== String(queryFilters.ano)) return false;
      }

      if (queryFilters.target) {
        const value = String(item.target || "").toLowerCase();
        if (!value.includes(queryFilters.target.toLowerCase())) return false;
      }

      if (normalizedInteresse) {
        const interestValue = Boolean(item.interesse_email_marketing) ? "sim" : "nao";
        if (!interestValue.includes(normalizedInteresse)) return false;
      }

      if (queryFilters.textTerms.length) {
        const text = [
          item.denominacao,
          item.nome,
          item.numero_contribuinte,
          item.contacto_email,
          item.numero_registo,
          item.sede_localidade,
          item.sede_concelho,
          item.sede_distrito,
          item.target,
          item.classificacao_transfergest,
        ]
          .map((value) => String(value || "").toLowerCase())
          .join(" ");

        if (!queryFilters.textTerms.every((term) => text.includes(term.toLowerCase()))) return false;
      }

      return true;
    });
  }, [rows, showArchived, activeStatusTab, searchTerm]);

  useEffect(() => {
    const visibleSet = new Set(filteredRows.map((item) => item.id));
    setSelectedIds((prev) => prev.filter((id) => visibleSet.has(id)));
  }, [filteredRows]);

  const selectedVisibleCount = filteredRows.filter((item) => selectedIds.includes(item.id)).length;
  const allVisibleSelected = filteredRows.length > 0 && selectedVisibleCount === filteredRows.length;

  const statusCounts = useMemo(() => {
    const counts = { all: 0 };
    STATUS_OPTIONS.forEach((status) => {
      counts[status.value] = 0;
    });

    rows.forEach((item) => {
      if (!showArchived && item.ativo === false) return;
      counts.all += 1;
      if (counts[item.estado] !== undefined) counts[item.estado] += 1;
    });

    return counts;
  }, [rows, showArchived]);

  const toggleSelectAllVisible = () => {
    if (allVisibleSelected) {
      setSelectedIds([]);
      return;
    }
    setSelectedIds(filteredRows.map((item) => item.id));
  };

  const toggleSelectOne = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const openCreateModal = () => {
    setIsEditForm(false);
    setFormData({ ...INITIAL_FORM });
    setShowFormModal(true);
  };

  const openEditModal = (row) => {
    setIsEditForm(true);
    setFormData({
      ...INITIAL_FORM,
      ...row,
      ano: row.ano == null ? "" : String(row.ano),
      data_registo: row.data_registo || "",
      interesse_email_marketing: Boolean(row.interesse_email_marketing),
    });
    setShowFormModal(true);
  };

  const openDetailModal = (row) => {
    setDetailItem(row);
    setShowDetailModal(true);
  };

  const saveForm = async (event) => {
    event.preventDefault();

    const payload = {
      ...formData,
      ano: formData.ano ? Number(formData.ano) : null,
      data_registo: formData.data_registo || null,
      contacto_email: String(formData.contacto_email || "").trim().toLowerCase() || null,
      estado: formData.estado || "novo",
      estado_historico: formData.estado_historico && typeof formData.estado_historico === "object" ? formData.estado_historico : {},
      interesse_email_marketing: Boolean(formData.interesse_email_marketing),
    };

    if (!isEditForm) {
      const statusDate = payload.data_registo || new Date().toISOString().slice(0, 10);
      payload.estado_historico = buildStatusHistory(payload.estado_historico, payload.estado, statusDate);
    }

    let result;
    if (isEditForm) {
      result = await supabase.from("transfergest_registos").update(payload).eq("id", formData.id).select().single();
    } else {
      result = await supabase.from("transfergest_registos").insert([payload]).select().single();
    }

    if (result.error) {
      showToast(`Erro ao guardar: ${result.error.message}`, "error");
      return;
    }

    if (isEditForm) {
      setRows((prev) => prev.map((item) => (item.id === result.data.id ? result.data : item)));
      showToast("Registo atualizado com sucesso.");
    } else {
      setRows((prev) => [result.data, ...prev]);
      showToast("Registo criado com sucesso.");
    }

    setShowFormModal(false);
  };

  const archiveToggle = async (row) => {
    const newAtivo = !(row.ativo !== false);

    setConfirmDialog({
      show: true,
      message: newAtivo ? "Pretende restaurar este registo?" : "Pretende arquivar este registo?",
      confirmText: newAtivo ? "Restaurar" : "Arquivar",
      isDanger: !newAtivo,
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, show: false }));
        const { error } = await supabase.from("transfergest_registos").update({ ativo: newAtivo }).eq("id", row.id);

        if (error) {
          showToast(`Erro ao atualizar arquivo: ${error.message}`, "error");
          return;
        }

        setRows((prev) => prev.map((item) => (item.id === row.id ? { ...item, ativo: newAtivo } : item)));
        showToast(newAtivo ? "Registo restaurado." : "Registo arquivado.");
      },
    });
  };

  const updateStatusForIds = async ({ ids, status, dateIso }) => {
    if (!ids.length) return;

    const targetRows = rows.filter((item) => ids.includes(item.id));

    for (const item of targetRows) {
      const history = buildStatusHistory(item.estado_historico, status, dateIso);
      const payload = {
        estado: status,
        estado_historico: history,
      };

      if (status === "contactado") payload.ultimo_contacto_em = dateIso;

      const { error } = await supabase
        .from("transfergest_registos")
        .update(payload)
        .eq("id", item.id);

      if (error) {
        throw error;
      }
    }

    setRows((prev) =>
      prev.map((item) => {
        if (!ids.includes(item.id)) return item;
        const history = buildStatusHistory(item.estado_historico, status, dateIso);
        return {
          ...item,
          estado: status,
          estado_historico: history,
          ultimo_contacto_em: status === "contactado" ? dateIso : item.ultimo_contacto_em,
        };
      }),
    );
  };

  const handleBulkStatusUpdate = async () => {
    if (!selectedIds.length) {
      showToast("Seleciona pelo menos um registo.", "warning");
      return;
    }

    setBulkUpdating(true);
    try {
      await updateStatusForIds({ ids: selectedIds, status: bulkStatus, dateIso: bulkStatusDate || new Date().toISOString().slice(0, 10) });
      showToast(`Estado atualizado em ${selectedIds.length} registos.`);
      setShowBulkStatusModal(false);
    } catch (error) {
      showToast(`Erro na atualizacao massiva: ${error.message}`, "error");
    } finally {
      setBulkUpdating(false);
    }
  };

  const getSelectedRecipients = () => {
    const selectedRows = rows.filter((item) => selectedIds.includes(item.id));

    return selectedRows
      .map((item) => ({
        id: item.id,
        email: String(item.contacto_email || "").trim().toLowerCase(),
        name: String(item.nome || item.denominacao || "Cliente").trim(),
        firstName: getFirstName(item.nome || item.denominacao || "Cliente"),
      }))
      .filter((item) => item.email.includes("@"));
  };

  const getFirstFailureReason = (summary) => {
    const firstFailure = summary?.failedRecipients?.[0];
    return firstFailure?.reason || "Motivo desconhecido.";
  };

  const handleSendCampaign = async () => {
    const recipients = getSelectedRecipients();
    if (!recipients.length) {
      showToast("Seleciona registos com email valido para enviar campanha.", "warning");
      return;
    }

    const isTemplateMode = campaignForm.mode === "template";
    let templateId = null;

    if (isTemplateMode) {
      const parsed = Number(campaignForm.templateId);
      if (!parsed || parsed <= 0) {
        showToast("Define um Template ID valido.", "warning");
        return;
      }
      templateId = parsed;
    } else {
      if (!campaignForm.subject.trim() || !campaignForm.htmlContent.trim()) {
        showToast("Define assunto e HTML para o envio manual.", "warning");
        return;
      }
    }

    const recipientParamsByEmail = {};
    recipients.forEach((recipient) => {
      recipientParamsByEmail[recipient.email] = {
        nome: recipient.name,
        fullname: recipient.name,
        FULLNAME: recipient.name,
        firstName: recipient.firstName,
        FIRSTNAME: recipient.firstName,
      };
    });

    setSendingCampaign(true);
    setLastCampaignSummary(null);

    try {
      await checkTransfergestApiHealth();

      const summary = await sendTransfergestCampaign({
        emails: recipients.map((recipient) => recipient.email),
        templateId,
        recipientParamsByEmail,
        subject: isTemplateMode ? undefined : campaignForm.subject.trim(),
        htmlContent: isTemplateMode ? undefined : campaignForm.htmlContent,
        batchSize: Number(campaignForm.batchSize),
        batchDelayMs: Number(campaignForm.batchDelayMs),
        maxRetries: Number(campaignForm.maxRetries),
      });

      setLastCampaignSummary(summary);

      if (campaignForm.markAsContactadoAfterSend) {
        const today = new Date().toISOString().slice(0, 10);
        await updateStatusForIds({
          ids: recipients.map((recipient) => recipient.id),
          status: "contactado",
          dateIso: today,
        });
      }

      const failedCount = summary?.failedRecipients?.length || 0;
      if (failedCount > 0) {
        showToast(`Campanha enviada com falhas (${failedCount}): ${getFirstFailureReason(summary)}`, "warning");
      } else {
        showToast(`Campanha enviada com sucesso para ${summary?.sentRecipients || 0} destinatarios.`);
      }
    } catch (error) {
      showToast(`Erro no envio: ${error.message}`, "error");
    } finally {
      setSendingCampaign(false);
    }
  };

  const exportCsv = () => {
    if (!filteredRows.length) {
      showToast("Nao existem dados para exportar.", "warning");
      return;
    }

    const headers = [...CSV_FIELDS.map((field) => field.label), "Estado", "Interesse (SIM/NAO)"];
    const lines = [headers.join(";")];

    filteredRows.forEach((item) => {
      const cells = CSV_FIELDS.map((field) => {
        let value = item[field.key];
        if (field.key === "interesse_email_marketing") {
          value = item.interesse_email_marketing ? "SIM" : "NAO";
        }
        return `"${String(value ?? "").replaceAll('"', '""')}"`;
      });

      cells.push(`"${String(item.estado || "").toUpperCase()}"`);
      cells.push(`"${item.interesse_email_marketing ? "SIM" : "NAO"}"`);
      lines.push(cells.join(";"));
    });

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `transfergest_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const resolveHeaderIndex = (normalizedHeaders, aliases) => {
    for (const alias of aliases) {
      const idx = normalizedHeaders.indexOf(normalizeHeader(alias));
      if (idx >= 0) return idx;
    }
    return -1;
  };

  const handleImport = async (event) => {
    event.preventDefault();
    if (!importFile) {
      showToast("Seleciona um ficheiro CSV.", "warning");
      return;
    }

    setImporting(true);

    const reader = new FileReader();
    reader.onload = async ({ target }) => {
      try {
        const text = String(target?.result || "");
        const lines = text.split(/\r?\n/).filter((line) => line.trim());
        if (lines.length < 2) {
          showToast("CSV sem dados validos.", "warning");
          setImporting(false);
          return;
        }

        const delimiter = (lines[0].match(/;/g) || []).length >= (lines[0].match(/,/g) || []).length ? ";" : ",";
        const headers = parseCsvLine(lines[0], delimiter);
        const normalizedHeaders = headers.map((header) => normalizeHeader(header));

        const fieldToIndex = {};
        const missing = [];

        CSV_FIELDS.forEach((field) => {
          const aliases = HEADER_ALIASES[field.key] || [field.label];
          const index = resolveHeaderIndex(normalizedHeaders, aliases);
          if (index < 0) {
            missing.push(field.label);
          } else {
            fieldToIndex[field.key] = index;
          }
        });

        if (missing.length) {
          showToast(`CSV invalido. Colunas em falta: ${missing.join(", ")}`, "error");
          setImporting(false);
          return;
        }

        const parsed = [];

        for (let i = 1; i < lines.length; i += 1) {
          const cols = parseCsvLine(lines[i], delimiter);
          if (cols.every((col) => !String(col || "").trim())) continue;

          const row = { ...INITIAL_FORM };

          CSV_FIELDS.forEach((field) => {
            const value = cols[fieldToIndex[field.key]] || "";
            if (field.key === "interesse_email_marketing") {
              row[field.key] = parseBoolean(value);
            } else if (field.key === "ano") {
              row[field.key] = value ? Number(value) : null;
            } else if (field.key === "data_registo") {
              row[field.key] = toIsoDate(value);
            } else if (field.key === "contacto_email") {
              row[field.key] = String(value || "").trim().toLowerCase();
            } else {
              row[field.key] = String(value || "").trim() || null;
            }
          });

          row.estado = "novo";
          row.ativo = true;
          row.estado_historico = buildStatusHistory({}, "novo", new Date().toISOString().slice(0, 10));

          parsed.push(row);
        }

        if (!parsed.length) {
          showToast("CSV sem linhas validas para importar.", "warning");
          setImporting(false);
          return;
        }

        const nifList = parsed
          .map((item) => String(item.numero_contribuinte || "").trim())
          .filter(Boolean);

        let existingNifSet = new Set();
        if (nifList.length) {
          const { data: existingRows, error: fetchDupError } = await supabase
            .from("transfergest_registos")
            .select("numero_contribuinte")
            .in("numero_contribuinte", [...new Set(nifList)]);

          if (fetchDupError) throw fetchDupError;
          existingNifSet = new Set((existingRows || []).map((item) => item.numero_contribuinte));
        }

        const deduped = parsed.filter((item) => {
          if (!item.numero_contribuinte) return true;
          return !existingNifSet.has(item.numero_contribuinte);
        });

        if (!deduped.length) {
          showToast("Todos os registos do CSV ja existem (numero de contribuinte repetido).", "warning");
          setImporting(false);
          return;
        }

        const { error: insertError } = await supabase.from("transfergest_registos").insert(deduped);
        if (insertError) throw insertError;

        showToast(`${deduped.length} registos importados com sucesso.`);
        setShowImportModal(false);
        setImportFile(null);
        await loadRows();
      } catch (error) {
        showToast(`Erro ao importar CSV: ${error.message}`, "error");
      } finally {
        setImporting(false);
      }
    };

    reader.readAsText(importFile);
  };

  return (
    <div className="page-container transfergest-page" style={{ maxWidth: "100%", paddingBottom: "36px" }}>
      <div className="page-header" style={{ background: "white", padding: "20px 25px", borderRadius: "12px", border: "1px solid #e2e8f0", marginBottom: "14px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "15px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
          <div style={{ background: "var(--color-bgSecondary)", color: "var(--color-btnPrimary)", padding: "12px", borderRadius: "12px", display: "flex" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="16" rx="2"></rect>
              <line x1="7" y1="8" x2="17" y2="8"></line>
              <line x1="7" y1="12" x2="17" y2="12"></line>
              <line x1="7" y1="16" x2="13" y2="16"></line>
            </svg>
          </div>
          <div>
            <h1 style={{ margin: 0, color: "#0f172a", fontSize: "1.8rem", fontWeight: "900", letterSpacing: "-0.02em" }}>TransferGest</h1>
            <p style={{ color: "#64748b", margin: 0, fontWeight: "500", fontSize: "0.9rem" }}>Carteira de Clientes Ativos</p>
          </div>
        </div>

        <div className="tg-header-actions" style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", justifyContent: "flex-end" }}>
          <button className="btn-outline" onClick={() => setShowImportModal(true)}>Importar CSV</button>
          <button className="btn-outline" onClick={exportCsv}>Exportar CSV</button>
          <button className="btn-outline" onClick={() => setShowSendModal(true)} disabled={!selectedIds.length}>Campanha Email</button>
          <button className="btn-cta" onClick={openCreateModal}>+ Novo Registo</button>
        </div>
      </div>

      <div className="tg-status-tabs">
        <button
          onClick={() => setActiveStatusTab("all")}
          className={`tg-status-tab ${activeStatusTab === "all" ? "active" : ""}`}
        >
          TODOS ({statusCounts.all})
        </button>
        {STATUS_OPTIONS.map((status) => (
          <button
            key={status.value}
            onClick={() => setActiveStatusTab(status.value)}
            className={`tg-status-tab ${activeStatusTab === status.value ? "active" : ""}`}
          >
            {status.label} ({statusCounts[status.value] || 0})
          </button>
        ))}
      </div>

      <div className="card" style={{ padding: "16px", border: "1px solid var(--color-borderColor)", background: "var(--color-cardBg, #fff)", borderRadius: "0 12px 12px 12px" }}>
        <div className="tg-search-row">
          <div className="tg-search-box">
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pesquisar: nome, nif, registo, email | localidade:porto ano:2026 target:industria interesse:sim"
              style={inputStyle}
            />
          </div>
          <label className="tg-archive-toggle" style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--color-textSecondary)", fontSize: "0.85rem", padding: "0 8px" }}>
            <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
            <span>Mostrar arquivo</span>
          </label>
        </div>

        <div className="tg-toolbar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--color-textSecondary)", fontSize: "0.85rem", fontWeight: 600, whiteSpace: "nowrap" }}>
              <input type="checkbox" checked={allVisibleSelected} onChange={toggleSelectAllVisible} />
              <span style={{ whiteSpace: "nowrap" }}>Selecionar todos</span>
            </label>
          </div>
          <div className="tg-toolbar-stats" style={{ color: "var(--color-textSecondary)", fontSize: "0.85rem", whiteSpace: "nowrap", marginLeft: "auto" }}>
            {filteredRows.length} encontrados / {selectedIds.length} selecionados
          </div>
        </div>

        <div className="tg-cards-grid">
          {!loading && filteredRows.map((item) => {
            const selected = selectedIds.includes(item.id);
            const statusLabel = STATUS_OPTIONS.find((status) => status.value === item.estado)?.label || String(item.estado || "").toUpperCase();
            const statusStyle = STATUS_STYLE[item.estado] || { bg: "var(--color-bgSecondary)", color: "var(--color-textPrimary)", border: "var(--color-borderColor)" };
            const statusChipStyle = {
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px 10px",
              borderRadius: "999px",
              background: statusStyle.bg,
              border: `1px solid ${statusStyle.border}`,
              color: statusStyle.color,
              fontSize: "0.75rem",
              fontWeight: 800,
            };

            return (
              <div key={item.id} className="tg-record-card" style={{ opacity: item.ativo === false ? 0.62 : 1 }}>
                <div style={{ display: "grid", gridTemplateColumns: "20px minmax(0, 1fr) auto", alignItems: "flex-start", gap: "10px" }}>
                  <div style={{ display: "flex", justifyContent: "center", paddingTop: "2px" }}>
                    <input type="checkbox" checked={selected} onChange={() => toggleSelectOne(item.id)} className="tg-card-checkbox" />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                        <h3 style={{ margin: 0, color: "#1e293b", fontSize: "1rem", fontWeight: 800, lineHeight: 1.2 }}>{formatDisplayValue(item.denominacao)}</h3>
                        {item.ativo === false && <span className="tg-archived-pill">ARQUIVADO</span>}
                      </div>
                      <div style={{ color: "var(--color-textSecondary)", fontSize: "0.84rem", marginTop: "2px" }}>{formatDisplayValue(item.nome)}</div>
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "8px" }}>
                        <span className="tg-soft-pill tg-soft-pill-muted" style={{ fontFamily: "monospace" }}>NIF: {formatDisplayValue(item.numero_contribuinte)}</span>
                        <span className="tg-soft-pill tg-soft-pill-info">Ano: {formatDisplayValue(item.ano)}</span>
                        <span className="tg-soft-pill tg-soft-pill-primary">NUT II: {formatDisplayValue(item.nut_ii)}</span>
                        <span className="tg-soft-pill tg-soft-pill-muted">NUT III: {formatDisplayValue(item.nut_iii)}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px", minWidth: 0 }}>
                    <span style={statusChipStyle}>{statusLabel}</span>
                    <span className={`tg-interest-pill ${item.interesse_email_marketing ? "yes" : "no"}`}>{item.interesse_email_marketing ? "SIM" : "NAO"}</span>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.15fr) minmax(220px, 0.85fr)", gap: "12px", marginTop: "14px" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: "0.72rem", color: "#94a3b8", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.04em" }}>Contacto</div>
                    <div style={{ fontSize: "0.84rem", color: "#334155", marginTop: "4px" }}>{formatDisplayValue(item.contacto_telefone)}</div>
                    <div style={{ fontSize: "0.84rem", color: "var(--color-btnPrimary)", marginTop: "2px" }}>{formatDisplayValue(item.contacto_email)}</div>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: "0.72rem", color: "#94a3b8", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.04em" }}>Registo</div>
                    <div style={{ fontSize: "0.84rem", color: "#334155", marginTop: "4px" }}>{formatDisplayValue(item.numero_registo)}</div>
                    <div style={{ fontSize: "0.84rem", color: "#64748b", marginTop: "2px" }}>{formatDisplayValue(item.data_registo)}</div>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: "0.72rem", color: "#94a3b8", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.04em" }}>Localidade</div>
                    <div style={{ fontSize: "0.84rem", color: "#334155", marginTop: "4px" }}>{formatDisplayValue(item.sede_localidade)}</div>
                    <div style={{ fontSize: "0.84rem", color: "#64748b", marginTop: "2px" }}>{formatDisplayValue(item.sede_concelho)} / {formatDisplayValue(item.sede_distrito)}</div>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: "0.72rem", color: "#94a3b8", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.04em" }}>Target / Classificação</div>
                    <div style={{ fontSize: "0.84rem", color: "#334155", marginTop: "4px" }}>{formatDisplayValue(item.target)}</div>
                    <div style={{ fontSize: "0.84rem", color: "#64748b", marginTop: "2px" }}>{formatDisplayValue(item.classificacao_transfergest)}</div>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", marginTop: "14px", flexWrap: "wrap" }}>
                  <div style={{ color: "var(--color-textSecondary)", fontSize: "0.75rem" }}>
                    {item.estado_historico && item.estado_historico[item.estado] ? `Desde ${item.estado_historico[item.estado]}` : "Sem data de estado"}
                  </div>

                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <button className="tg-card-btn tg-card-btn-primary" onClick={() => openDetailModal(item)}>Mais info</button>
                    <button className="tg-card-btn" onClick={() => openEditModal(item)}>Editar</button>
                    <button className={`tg-card-btn ${item.ativo === false ? "restore" : "archive"}`} onClick={() => archiveToggle(item)}>{item.ativo === false ? "Restaurar" : "Arquivar"}</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {!loading && filteredRows.length === 0 && (
          <div style={{ padding: "30px", textAlign: "center", color: "var(--color-textSecondary)" }}>Nenhum registo encontrado para os filtros atuais.</div>
        )}
      </div>

      {showFormModal && (
        <ModalPortal>
          <div style={{ position: "fixed", inset: 0, background: "rgba(2, 6, 23, 0.65)", backdropFilter: "blur(4px)", zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
            <div style={{ width: "100%", maxWidth: "960px", maxHeight: "90vh", overflowY: "auto", background: "var(--color-cardBg, #fff)", borderRadius: "14px", border: "1px solid var(--color-borderColor)", padding: "18px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <h3 style={{ margin: 0 }}>{isEditForm ? "Editar registo TransferGest" : "Novo registo TransferGest"}</h3>
                <button className="tg-modal-btn" onClick={() => setShowFormModal(false)}>Fechar</button>
              </div>

              <form onSubmit={saveForm}>
                <div style={{ display: "grid", gap: "12px", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
                  <div style={{ gridColumn: "span 2" }}>
                    <label style={labelStyle}>Denominacao *</label>
                    <input required value={formData.denominacao || ""} onChange={(e) => setFormData((prev) => ({ ...prev, denominacao: e.target.value }))} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Nome</label>
                    <input value={formData.nome || ""} onChange={(e) => setFormData((prev) => ({ ...prev, nome: e.target.value }))} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Contacto (Telef/Telem.)</label>
                    <input value={formData.contacto_telefone || ""} onChange={(e) => setFormData((prev) => ({ ...prev, contacto_telefone: e.target.value }))} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Contacto (Email)</label>
                    <input type="email" value={formData.contacto_email || ""} onChange={(e) => setFormData((prev) => ({ ...prev, contacto_email: e.target.value }))} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>N de registo</label>
                    <input value={formData.numero_registo || ""} onChange={(e) => setFormData((prev) => ({ ...prev, numero_registo: e.target.value }))} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Data do registo</label>
                    <input type="date" value={formData.data_registo || ""} onChange={(e) => setFormData((prev) => ({ ...prev, data_registo: e.target.value }))} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>N de contribuinte</label>
                    <input value={formData.numero_contribuinte || ""} onChange={(e) => setFormData((prev) => ({ ...prev, numero_contribuinte: e.target.value }))} style={inputStyle} />
                  </div>

                  <div style={{ gridColumn: "span 2" }}>
                    <label style={labelStyle}>Sede (Endereco)</label>
                    <input value={formData.sede_endereco || ""} onChange={(e) => setFormData((prev) => ({ ...prev, sede_endereco: e.target.value }))} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Sede (Codigo postal)</label>
                    <input value={formData.sede_codigo_postal || ""} onChange={(e) => setFormData((prev) => ({ ...prev, sede_codigo_postal: e.target.value }))} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Sede (Localidade)</label>
                    <input value={formData.sede_localidade || ""} onChange={(e) => setFormData((prev) => ({ ...prev, sede_localidade: e.target.value }))} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Sede (Concelho)</label>
                    <input value={formData.sede_concelho || ""} onChange={(e) => setFormData((prev) => ({ ...prev, sede_concelho: e.target.value }))} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Sede (Distrito)</label>
                    <input value={formData.sede_distrito || ""} onChange={(e) => setFormData((prev) => ({ ...prev, sede_distrito: e.target.value }))} style={inputStyle} />
                  </div>

                  <div>
                    <label style={labelStyle}>ERT DRT</label>
                    <input value={formData.ert_drt || ""} onChange={(e) => setFormData((prev) => ({ ...prev, ert_drt: e.target.value }))} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>NUT II</label>
                    <input value={formData.nut_ii || ""} onChange={(e) => setFormData((prev) => ({ ...prev, nut_ii: e.target.value }))} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>NUT III</label>
                    <input value={formData.nut_iii || ""} onChange={(e) => setFormData((prev) => ({ ...prev, nut_iii: e.target.value }))} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Ano</label>
                    <input value={formData.ano || ""} onChange={(e) => setFormData((prev) => ({ ...prev, ano: e.target.value }))} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Classificacao Transfergest</label>
                    <input value={formData.classificacao_transfergest || ""} onChange={(e) => setFormData((prev) => ({ ...prev, classificacao_transfergest: e.target.value }))} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Target</label>
                    <input value={formData.target || ""} onChange={(e) => setFormData((prev) => ({ ...prev, target: e.target.value }))} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Estado</label>
                    <select value={formData.estado || "novo"} onChange={(e) => setFormData((prev) => ({ ...prev, estado: e.target.value }))} style={inputStyle}>
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status.value} value={status.value}>{status.label}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ gridColumn: "span 2" }}>
                    <label style={labelStyle}>Observacoes</label>
                    <textarea value={formData.observacoes || ""} onChange={(e) => setFormData((prev) => ({ ...prev, observacoes: e.target.value }))} style={{ ...inputStyle, minHeight: "88px", resize: "vertical" }} />
                  </div>

                  <label style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--color-textSecondary)", fontSize: "0.9rem" }}>
                    <input
                      type="checkbox"
                      checked={Boolean(formData.interesse_email_marketing)}
                      onChange={(e) => setFormData((prev) => ({ ...prev, interesse_email_marketing: e.target.checked }))}
                    />
                    Interesse para a campanha email marketing
                  </label>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "16px" }}>
                  <button type="button" className="tg-modal-btn" onClick={() => setShowFormModal(false)}>Cancelar</button>
                  <button type="submit" className="tg-modal-btn tg-modal-btn-primary">Guardar</button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {showDetailModal && detailItem && (
        <ModalPortal>
          <div style={{ position: "fixed", inset: 0, background: "rgba(2, 6, 23, 0.65)", backdropFilter: "blur(4px)", zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
            <div style={{ width: "100%", maxWidth: "980px", maxHeight: "90vh", overflowY: "auto", background: "var(--color-cardBg, #fff)", borderRadius: "14px", border: "1px solid var(--color-borderColor)", padding: "18px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", marginBottom: "16px", flexWrap: "wrap" }}>
                <div>
                  <h3 style={{ margin: 0, color: "#0f172a", fontSize: "1.25rem", fontWeight: 900 }}>{formatDisplayValue(detailItem.denominacao)}</h3>
                  <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: "0.9rem" }}>{formatDisplayValue(detailItem.nome)}</p>
                </div>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <button className="tg-modal-btn" onClick={() => { setShowDetailModal(false); openEditModal(detailItem); }}>Editar</button>
                  <button className="tg-modal-btn" onClick={() => setShowDetailModal(false)}>Fechar</button>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px" }}>
                <div style={{ padding: "12px", borderRadius: "12px", border: "1px solid var(--color-borderColor)", background: "#f8fafc" }}>
                  <div style={{ fontSize: "0.72rem", color: "#94a3b8", fontWeight: 800, textTransform: "uppercase" }}>Identificação</div>
                  <div style={{ marginTop: "8px", color: "#334155", fontSize: "0.9rem" }}>NIF: {formatDisplayValue(detailItem.numero_contribuinte)}</div>
                  <div style={{ color: "#334155", fontSize: "0.9rem" }}>N registo: {formatDisplayValue(detailItem.numero_registo)}</div>
                  <div style={{ color: "#334155", fontSize: "0.9rem" }}>Data: {formatDisplayValue(detailItem.data_registo)}</div>
                  <div style={{ color: "#334155", fontSize: "0.9rem" }}>Ano: {formatDisplayValue(detailItem.ano)}</div>
                </div>

                <div style={{ padding: "12px", borderRadius: "12px", border: "1px solid var(--color-borderColor)", background: "#f8fafc" }}>
                  <div style={{ fontSize: "0.72rem", color: "#94a3b8", fontWeight: 800, textTransform: "uppercase" }}>Contacto</div>
                  <div style={{ marginTop: "8px", color: "#334155", fontSize: "0.9rem" }}>Telefone: {formatDisplayValue(detailItem.contacto_telefone)}</div>
                  <div style={{ color: "#334155", fontSize: "0.9rem" }}>Email: {formatDisplayValue(detailItem.contacto_email)}</div>
                  <div style={{ color: "#334155", fontSize: "0.9rem" }}>Interesse: {detailItem.interesse_email_marketing ? "SIM" : "NAO"}</div>
                  <div style={{ color: "#334155", fontSize: "0.9rem" }}>Estado: {formatDisplayValue(detailItem.estado).toUpperCase()}</div>
                </div>

                <div style={{ padding: "12px", borderRadius: "12px", border: "1px solid var(--color-borderColor)", background: "#f8fafc" }}>
                  <div style={{ fontSize: "0.72rem", color: "#94a3b8", fontWeight: 800, textTransform: "uppercase" }}>Geografia</div>
                  <div style={{ marginTop: "8px", color: "#334155", fontSize: "0.9rem" }}>Sede: {formatDisplayValue(detailItem.sede_endereco)}</div>
                  <div style={{ color: "#334155", fontSize: "0.9rem" }}>CP: {formatDisplayValue(detailItem.sede_codigo_postal)}</div>
                  <div style={{ color: "#334155", fontSize: "0.9rem" }}>Localidade: {formatDisplayValue(detailItem.sede_localidade)}</div>
                  <div style={{ color: "#334155", fontSize: "0.9rem" }}>Concelho / Distrito: {formatDisplayValue(detailItem.sede_concelho)} / {formatDisplayValue(detailItem.sede_distrito)}</div>
                </div>

                <div style={{ padding: "12px", borderRadius: "12px", border: "1px solid var(--color-borderColor)", background: "#f8fafc" }}>
                  <div style={{ fontSize: "0.72rem", color: "#94a3b8", fontWeight: 800, textTransform: "uppercase" }}>Enquadramento</div>
                  <div style={{ marginTop: "8px", color: "#334155", fontSize: "0.9rem" }}>ERT DRT: {formatDisplayValue(detailItem.ert_drt)}</div>
                  <div style={{ color: "#334155", fontSize: "0.9rem" }}>NUT II: {formatDisplayValue(detailItem.nut_ii)}</div>
                  <div style={{ color: "#334155", fontSize: "0.9rem" }}>NUT III: {formatDisplayValue(detailItem.nut_iii)}</div>
                  <div style={{ color: "#334155", fontSize: "0.9rem" }}>Target: {formatDisplayValue(detailItem.target)}</div>
                </div>

                <div style={{ padding: "12px", borderRadius: "12px", border: "1px solid var(--color-borderColor)", background: "#f8fafc" }}>
                  <div style={{ fontSize: "0.72rem", color: "#94a3b8", fontWeight: 800, textTransform: "uppercase" }}>Classificação</div>
                  <div style={{ marginTop: "8px", color: "#334155", fontSize: "0.9rem" }}>{formatDisplayValue(detailItem.classificacao_transfergest)}</div>
                  <div style={{ marginTop: "10px", fontSize: "0.72rem", color: "#94a3b8", fontWeight: 800, textTransform: "uppercase" }}>Estado</div>
                  <div style={{ marginTop: "6px", color: "#334155", fontSize: "0.9rem" }}>{formatDisplayValue(detailItem.estado).toUpperCase()}</div>
                  <div style={{ color: "#64748b", fontSize: "0.82rem", marginTop: "4px" }}>{detailItem.estado_historico && detailItem.estado_historico[detailItem.estado] ? `Desde ${detailItem.estado_historico[detailItem.estado]}` : "Sem data de estado"}</div>
                </div>

                <div style={{ gridColumn: "1 / -1", padding: "12px", borderRadius: "12px", border: "1px solid var(--color-borderColor)", background: "#f8fafc" }}>
                  <div style={{ fontSize: "0.72rem", color: "#94a3b8", fontWeight: 800, textTransform: "uppercase" }}>Observacoes</div>
                  <div style={{ marginTop: "8px", color: "#334155", fontSize: "0.9rem", whiteSpace: "pre-wrap" }}>{formatDisplayValue(detailItem.observacoes)}</div>
                </div>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {showImportModal && (
        <ModalPortal>
          <div style={{ position: "fixed", inset: 0, background: "rgba(2, 6, 23, 0.65)", backdropFilter: "blur(4px)", zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
            <div style={{ width: "100%", maxWidth: "760px", background: "var(--color-cardBg, #fff)", borderRadius: "14px", border: "1px solid var(--color-borderColor)", padding: "18px" }}>
              <h3 style={{ marginTop: 0 }}>Importar CSV TransferGest</h3>
              <p style={{ color: "var(--color-textSecondary)", marginTop: "6px" }}>O CSV deve conter todos os campos abaixo no cabecalho.</p>
              <div style={{ background: "var(--color-bgSecondary)", border: "1px solid var(--color-borderColor)", borderRadius: "10px", padding: "10px", maxHeight: "200px", overflowY: "auto", marginBottom: "14px" }}>
                {CSV_FIELDS.map((field) => (
                  <div key={field.key} style={{ fontSize: "0.86rem", color: "var(--color-textSecondary)", padding: "2px 0" }}>{field.label}</div>
                ))}
              </div>

              <label style={{ display: "block", marginBottom: "10px", ...labelStyle }}>Ficheiro CSV</label>
              <input type="file" accept=".csv" onChange={(e) => setImportFile(e.target.files?.[0] || null)} />

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "14px" }}>
                <button className="tg-modal-btn" onClick={() => setShowImportModal(false)} disabled={importing}>Cancelar</button>
                <button className="tg-modal-btn tg-modal-btn-primary" onClick={handleImport} disabled={importing}>{importing ? "A importar..." : "Importar"}</button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {showBulkStatusModal && (
        <ModalPortal>
          <div style={{ position: "fixed", inset: 0, background: "rgba(2, 6, 23, 0.65)", backdropFilter: "blur(4px)", zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
            <div style={{ width: "100%", maxWidth: "520px", background: "var(--color-cardBg, #fff)", borderRadius: "14px", border: "1px solid var(--color-borderColor)", padding: "18px" }}>
              <h3 style={{ marginTop: 0 }}>Alterar estado em massa</h3>
              <p style={{ color: "var(--color-textSecondary)" }}>Registos selecionados: {selectedIds.length}</p>

              <label style={labelStyle}>Novo estado</label>
              <select value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)} style={{ ...inputStyle, marginBottom: "10px" }}>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </select>

              <label style={labelStyle}>Data do estado</label>
              <input type="date" value={bulkStatusDate} onChange={(e) => setBulkStatusDate(e.target.value)} style={inputStyle} />

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "14px" }}>
                <button className="tg-modal-btn" onClick={() => setShowBulkStatusModal(false)} disabled={bulkUpdating}>Cancelar</button>
                <button className="tg-modal-btn tg-modal-btn-primary" onClick={handleBulkStatusUpdate} disabled={bulkUpdating}>{bulkUpdating ? "A atualizar..." : "Aplicar"}</button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {showSendModal && (
        <ModalPortal>
          <div style={{ position: "fixed", inset: 0, background: "rgba(2, 6, 23, 0.65)", backdropFilter: "blur(4px)", zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
            <div style={{ width: "100%", maxWidth: "760px", background: "var(--color-cardBg, #fff)", borderRadius: "14px", border: "1px solid var(--color-borderColor)", padding: "18px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <h3 style={{ margin: 0 }}>Enviar campanha TransferGest</h3>
                <button className="tg-modal-btn" onClick={() => setShowSendModal(false)}>Fechar</button>
              </div>

              <div style={{ background: "var(--color-bgSecondary)", border: "1px solid var(--color-borderColor)", borderRadius: "8px", padding: "10px", marginBottom: "10px", color: "var(--color-textSecondary)" }}>
                Destinatarios validos selecionados: <b>{getSelectedRecipients().length}</b>
              </div>

              <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
                <button
                  className={`tg-modal-btn ${campaignForm.mode === "template" ? "active" : ""}`}
                  onClick={() => setCampaignForm((prev) => ({ ...prev, mode: "template" }))}
                >
                  Template Brevo
                </button>
                <button
                  className={`tg-modal-btn ${campaignForm.mode === "html" ? "active" : ""}`}
                  onClick={() => setCampaignForm((prev) => ({ ...prev, mode: "html" }))}
                >
                  HTML manual
                </button>
              </div>

              {campaignForm.mode === "template" ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "8px", marginBottom: "10px" }}>
                  <input type="number" min="1" placeholder="Template ID" value={campaignForm.templateId} onChange={(e) => setCampaignForm((prev) => ({ ...prev, templateId: e.target.value }))} style={inputStyle} />
                  <input type="number" min="1" max="100" value={campaignForm.batchSize} onChange={(e) => setCampaignForm((prev) => ({ ...prev, batchSize: e.target.value }))} style={inputStyle} />
                  <input type="number" min="0" value={campaignForm.batchDelayMs} onChange={(e) => setCampaignForm((prev) => ({ ...prev, batchDelayMs: e.target.value }))} style={inputStyle} />
                  <input type="number" min="0" max="10" value={campaignForm.maxRetries} onChange={(e) => setCampaignForm((prev) => ({ ...prev, maxRetries: e.target.value }))} style={inputStyle} />
                </div>
              ) : (
                <>
                  <input type="text" placeholder="Assunto" value={campaignForm.subject} onChange={(e) => setCampaignForm((prev) => ({ ...prev, subject: e.target.value }))} style={{ ...inputStyle, marginBottom: "8px" }} />
                  <textarea placeholder="HTML da campanha" value={campaignForm.htmlContent} onChange={(e) => setCampaignForm((prev) => ({ ...prev, htmlContent: e.target.value }))} style={{ ...inputStyle, minHeight: "180px", resize: "vertical", marginBottom: "8px" }} />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "8px" }}>
                    <input type="number" min="1" max="100" value={campaignForm.batchSize} onChange={(e) => setCampaignForm((prev) => ({ ...prev, batchSize: e.target.value }))} style={inputStyle} />
                    <input type="number" min="0" value={campaignForm.batchDelayMs} onChange={(e) => setCampaignForm((prev) => ({ ...prev, batchDelayMs: e.target.value }))} style={inputStyle} />
                    <input type="number" min="0" max="10" value={campaignForm.maxRetries} onChange={(e) => setCampaignForm((prev) => ({ ...prev, maxRetries: e.target.value }))} style={inputStyle} />
                  </div>
                </>
              )}

              <label style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--color-textSecondary)", fontSize: "0.9rem", marginBottom: "10px" }}>
                <input
                  type="checkbox"
                  checked={Boolean(campaignForm.markAsContactadoAfterSend)}
                  onChange={(e) => setCampaignForm((prev) => ({ ...prev, markAsContactadoAfterSend: e.target.checked }))}
                />
                Marcar selecionados como CONTACTADO apos envio
              </label>

              {lastCampaignSummary && (
                <div style={{ border: "1px solid var(--color-borderColor)", borderRadius: "8px", padding: "10px", marginBottom: "10px", color: "var(--color-textSecondary)" }}>
                  <b>Resumo:</b> enviados {lastCampaignSummary.sentRecipients}/{lastCampaignSummary.acceptedRecipients} | invalidos {lastCampaignSummary.invalidEmails?.length || 0} | repetidos {lastCampaignSummary.duplicates?.length || 0} | falhados {lastCampaignSummary.failedRecipients?.length || 0}
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                <button className="tg-modal-btn" onClick={() => setShowSendModal(false)} disabled={sendingCampaign}>Cancelar</button>
                <button className="tg-modal-btn tg-modal-btn-primary" onClick={handleSendCampaign} disabled={sendingCampaign}>{sendingCampaign ? "A enviar..." : "Enviar"}</button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {confirmDialog.show && (
        <ModalPortal>
          <div style={{ position: "fixed", inset: 0, background: "rgba(2, 6, 23, 0.65)", backdropFilter: "blur(4px)", zIndex: 999999, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
            <div style={{ width: "100%", maxWidth: "420px", background: "var(--color-cardBg, #fff)", borderRadius: "14px", border: "1px solid var(--color-borderColor)", padding: "18px" }}>
              <h3 style={{ marginTop: 0 }}>Confirmacao</h3>
              <p style={{ color: "var(--color-textSecondary)" }}>{confirmDialog.message}</p>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                <button className="tg-modal-btn" onClick={() => setConfirmDialog((prev) => ({ ...prev, show: false }))}>Cancelar</button>
                <button className={`tg-modal-btn ${confirmDialog.isDanger ? "tg-modal-btn-danger" : "tg-modal-btn-primary"}`} onClick={confirmDialog.onConfirm}>{confirmDialog.confirmText}</button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {notification && <div className={`toast-container ${notification.type}`}>{notification.message}</div>}

      <style>{`
        .transfergest-page .tg-status-tabs {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          padding-left: 8px;
          margin-bottom: 0;
        }

        .transfergest-page .tg-status-tab {
          border: none;
          border-radius: 12px 12px 0 0;
          padding: 11px 16px;
          font-size: 0.8rem;
          font-weight: 800;
          cursor: pointer;
          letter-spacing: 0.02em;
          color: var(--color-textSecondary);
          background: color-mix(in srgb, var(--color-borderColor) 55%, transparent);
          transition: all 0.2s ease;
        }

        .transfergest-page .tg-status-tab:hover {
          color: var(--color-textPrimary);
          transform: translateY(-1px);
        }

        .transfergest-page .tg-status-tab.active {
          color: var(--color-btnPrimary);
          background: var(--color-cardBg, #fff);
          box-shadow: 0 -1px 0 var(--color-borderColor), 1px 0 0 var(--color-borderColor), -1px 0 0 var(--color-borderColor);
        }

        .transfergest-page .page-header .btn-outline,
        .transfergest-page .page-header .btn-cta {
          height: 38px;
          padding: 0 14px;
          border-radius: 8px;
          font-size: 0.85rem;
          font-weight: 700;
          white-space: nowrap;
        }

        .transfergest-page .tg-header-actions .btn-outline {
          background: white;
          border: 1px solid #cbd5e1;
          color: #475569;
          box-shadow: none;
        }

        .transfergest-page .tg-header-actions .btn-outline:hover {
          background: #f8fafc;
          border-color: #94a3b8;
          color: #1e293b;
        }

        .transfergest-page .tg-header-actions .btn-cta {
          box-shadow: none;
        }

        .transfergest-page .tg-search-row {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 12px;
          align-items: start;
          margin-bottom: 12px;
        }

        .transfergest-page .tg-cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(420px, 1fr));
          gap: 14px;
        }

        .transfergest-page .tg-record-card {
          background: linear-gradient(180deg, #ffffff 0%, #fcfdff 100%);
          border: 1px solid #dbe3ee;
          border-radius: 14px;
          padding: 14px;
          box-shadow: 0 2px 4px rgba(15, 23, 42, 0.04);
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
        }

        .transfergest-page .tg-record-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 20px rgba(15, 23, 42, 0.08);
          border-color: #cbd5e1;
        }

        .transfergest-page .tg-archived-pill {
          font-size: 0.65rem;
          background: #fee2e2;
          color: #ef4444;
          padding: 3px 8px;
          border-radius: 999px;
          font-weight: 800;
          border: 1px solid #fecaca;
        }

        .transfergest-page .tg-soft-pill {
          font-size: 0.74rem;
          padding: 3px 9px;
          border-radius: 8px;
          font-weight: 700;
          border: 1px solid transparent;
        }

        .transfergest-page .tg-soft-pill-muted {
          background: #f1f5f9;
          color: #475569;
          border-color: #e2e8f0;
        }

        .transfergest-page .tg-soft-pill-info {
          background: #ecfeff;
          color: #0f766e;
          border-color: #bae6fd;
        }

        .transfergest-page .tg-soft-pill-primary {
          background: #eef2ff;
          color: #4338ca;
          border-color: #c7d2fe;
        }

        .transfergest-page .tg-interest-pill {
          font-size: 0.72rem;
          font-weight: 800;
          padding: 3px 9px;
          border-radius: 999px;
          border: 1px solid transparent;
        }

        .transfergest-page .tg-interest-pill.yes {
          color: #15803d;
          background: #dcfce7;
          border-color: #bbf7d0;
        }

        .transfergest-page .tg-interest-pill.no {
          color: #64748b;
          background: #f8fafc;
          border-color: #e2e8f0;
        }

        .transfergest-page .tg-card-checkbox {
          width: 14px;
          height: 14px;
          accent-color: var(--color-btnPrimary);
          cursor: pointer;
        }

        .transfergest-page .tg-search-box {
          min-width: 0;
        }

        .transfergest-page .tg-search-help {
          opacity: 0.82;
        }

        .transfergest-page .tg-archive-toggle {
          align-self: center;
          white-space: nowrap;
          padding-top: 2px;
        }

        .transfergest-page .tg-archive-toggle input {
          width: 15px;
          height: 15px;
          accent-color: var(--color-btnPrimary);
        }

        .transfergest-page .tg-toolbar {
          border-top: 1px solid color-mix(in srgb, var(--color-borderColor) 55%, transparent);
          padding-top: 10px;
        }

        .transfergest-page .tg-toolbar-stats {
          font-weight: 600;
        }

        .transfergest-page .tg-toolbar-actions {
          gap: 8px;
        }

        .transfergest-page .btn-outline,
        .transfergest-page .btn-primary,
        .transfergest-page .btn-cta {
          height: 40px;
          min-height: 40px;
          padding: 0 14px;
          border-radius: 10px;
          font-size: 0.86rem;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          line-height: 1;
          transition: all 0.2s ease;
        }

        .transfergest-page .btn-outline:hover,
        .transfergest-page .btn-primary:hover,
        .transfergest-page .btn-cta:hover {
          transform: translateY(-1px);
        }

        .transfergest-page .tg-card-btn {
          background: white;
          border: 1px solid #cbd5e1;
          color: #334155;
          border-radius: 999px;
          padding: 8px 13px;
          font-size: 0.8rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.18s ease;
          box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
        }

        .transfergest-page .tg-card-btn:hover {
          background: #f8fafc;
          border-color: #94a3b8;
          color: #1e293b;
          transform: translateY(-1px);
        }

        .transfergest-page .tg-card-btn-primary {
          background: var(--color-bgSecondary);
          border-color: var(--color-borderColor);
          color: var(--color-btnPrimary);
        }

        .transfergest-page .tg-card-btn.archive {
          color: #9f1239;
          border-color: #fbcfe8;
          background: #fff1f2;
        }

        .transfergest-page .tg-card-btn.archive:hover {
          color: #881337;
          border-color: #f9a8d4;
          background: #ffe4e6;
        }

        .transfergest-page .tg-card-btn.restore {
          color: #166534;
          border-color: #bbf7d0;
          background: #f0fdf4;
        }

        .transfergest-page .tg-card-btn.restore:hover {
          color: #14532d;
          border-color: #86efac;
          background: #dcfce7;
        }

        .transfergest-page .tg-card-btn-primary:hover {
          background: color-mix(in srgb, var(--color-bgSecondary) 72%, white);
          border-color: var(--color-btnPrimary);
        }

        .tg-modal-btn {
          height: 38px;
          min-height: 38px;
          padding: 0 14px;
          border-radius: 10px;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          color: #334155;
          font-size: 0.84rem;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.18s ease;
        }

        .tg-modal-btn:hover {
          background: #f8fafc;
          border-color: #94a3b8;
          color: #1e293b;
          transform: translateY(-1px);
        }

        .tg-modal-btn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
          transform: none;
        }

        .tg-modal-btn.active {
          background: var(--color-bgSecondary);
          border-color: var(--color-btnPrimary);
          color: var(--color-btnPrimary);
        }

        .tg-modal-btn-primary {
          background: var(--color-btnPrimary);
          border-color: var(--color-btnPrimary);
          color: #ffffff;
        }

        .tg-modal-btn-primary:hover {
          background: color-mix(in srgb, var(--color-btnPrimary) 85%, black);
          border-color: color-mix(in srgb, var(--color-btnPrimary) 85%, black);
          color: #ffffff;
        }

        .tg-modal-btn-danger {
          background: #dc2626;
          border-color: #dc2626;
          color: #ffffff;
        }

        .tg-modal-btn-danger:hover {
          background: #b91c1c;
          border-color: #b91c1c;
          color: #ffffff;
        }

        @media (max-width: 900px) {
          .transfergest-page .page-header > div:last-child {
            width: 100%;
            justify-content: flex-start;
            flex-wrap: wrap;
          }

          .transfergest-page .page-header .btn-outline,
          .transfergest-page .page-header .btn-cta {
            flex: 1;
            min-width: 150px;
          }

          .transfergest-page .tg-search-row {
            grid-template-columns: 1fr;
            gap: 8px;
          }

          .transfergest-page .tg-archive-toggle {
            align-self: flex-start;
            padding-left: 0;
          }

          .transfergest-page .tg-toolbar {
            align-items: flex-start !important;
          }

          .transfergest-page .tg-toolbar-actions {
            width: 100%;
          }

          .transfergest-page .tg-toolbar-actions .btn-outline {
            flex: 1;
          }

          .transfergest-page .tg-cards-grid {
            grid-template-columns: 1fr;
          }

          .transfergest-page .tg-record-card > div:first-child {
            grid-template-columns: 18px minmax(0, 1fr);
          }

          .transfergest-page .tg-record-card > div:first-child > div:last-child {
            grid-column: 1 / -1;
            justify-content: flex-start;
          }
        }
      `}</style>
    </div>
  );
}
