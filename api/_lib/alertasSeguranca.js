/* global process */
// =====================================================================
// Alertas de segurança (migração 075)
//   POST /api/seguranca/tentativa  login/2FA falhado (sem sessão; nunca recebe a palavra-passe)
//   POST /api/seguranca/login      login com sucesso: guarda IP/país e avisa se for fora de Portugal
//   POST /api/seguranca/recolher   chamado a cada 10 min pelo pg_cron do Supabase (segredo no cabeçalho):
//                                  copia os logs do Supabase para a BD, deteta abusos e envia os emails
//
// Variáveis no servidor (Vercel):
//   SUPABASE_SERVICE_ROLE_KEY   já existente
//   SEGURANCA_CRON_SEGREDO      o mesmo segredo guardado no Vault do Supabase (ver 075b)
//   SUPABASE_ACCESS_TOKEN       token da API de gestão do Supabase (só leitura de logs)
//   SUPABASE_PROJECT_REF        opcional (por omissão sai do URL do projeto)
// =====================================================================
import { Buffer } from "node:buffer";
import { timingSafeEqual } from "node:crypto";
import { sendTransactionalCampaign } from "../../server/brevoCampaignSender.js";
import { ErroHttp, autenticar, clienteServico, emailValido, escapeHtml, origemApp, PAPEIS } from "./seguranca.js";

// ---- Limites (valores comuns; ajustar aqui) --------------------------
const LIM = {
  falhasLogin: 5,          // tentativas falhadas na mesma conta ou IP…
  janelaLoginMin: 15,      // …em 15 minutos
  tentativasPorIp: 40,     // acima disto em 15 min deixamos de gravar (anti-inundação)
  negadosApi: 20,          // respostas 401/403 da API para o mesmo IP, por cada 10 min
  leiturasSensiveis: 1500, // pedidos de leitura a tabelas sensíveis do mesmo IP, por cada 10 min
  downloads: 300,          // ficheiros descarregados do mesmo IP, por cada 10 min
  paisPermitido: "PT",
};
const TABELAS_SENSIVEIS = new Set([
  // (profiles fica de fora: a app lê-a em quase todos os ecrãs; os dados sensíveis estão em profiles_privado)
  "clientes", "contactos_cliente", "moradas_cliente", "acessos", "acessos_cliente", "profiles_privado",
  "ferias", "rh_anexos", "marketing_leads", "marketing_prospects", "transfergest_registos", "equipamentos", "software",
]);

// ---- Utilitários -----------------------------------------------------
function ipDe(req) {
  const xff = String(req.headers?.["x-forwarded-for"] || "").split(",")[0].trim();
  return (xff || String(req.headers?.["x-real-ip"] || "") || req.socket?.remoteAddress || "").slice(0, 64) || null;
}
function paisDe(req) {
  const p = String(req.headers?.["x-vercel-ip-country"] || "").trim().toUpperCase();
  return /^[A-Z]{2}$/.test(p) ? p : null;
}
const agenteDe = (req) => String(req.headers?.["user-agent"] || "").slice(0, 300) || null;
const minutosAtras = (m) => new Date(Date.now() - m * 60000).toISOString();

function exigirServico() {
  const admin = clienteServico();
  if (!admin) throw new ErroHttp(503, "Falta configurar SUPABASE_SERVICE_ROLE_KEY no servidor.");
  return admin;
}

/**
 * Cria um alerta via RPC seguranca_criar_alerta (tabela alertas_seguranca, migração 075).
 * A RPC deduplica por `chave` (1 por hora); devolve o id ou null se foi repetido.
 */
async function criarAlerta(admin, a) {
  const { data, error } = await admin.rpc("seguranca_criar_alerta", {
    p_tipo: a.tipo,
    p_gravidade: a.gravidade || "media",
    p_titulo: a.titulo,
    p_mensagem: a.mensagem,
    p_user_id: a.userId || null,
    p_user_email: a.email || null,
    p_ip: a.ip || null,
    p_pais: a.pais || null,
    p_detalhes: a.detalhes || {},
    p_chave: a.chave || a.tipo,
  });
  if (error) console.warn("[seguranca] alerta não criado:", error.message);
  return data || null; // null = repetido (já avisado na última hora)
}

// ---- Emails aos administradores -------------------------------------
const GRAV = { alta: { cor: "#b91c1c", nome: "Alta" }, media: { cor: "#b45309", nome: "Média" }, baixa: { cor: "#475569", nome: "Baixa" } };

async function emailsAdmins(admin) {
  const { data } = await admin.from("profiles").select("email, role, tipo, ativo");
  return [...new Set((data || [])
    .filter((p) => p.ativo !== false && emailValido(p.email) && [p.role, p.tipo].some((r) => PAPEIS.admin.includes(String(r || "").toLowerCase())))
    .map((p) => p.email.trim().toLowerCase()))];
}

/** Envia (num só email) os alertas ainda não enviados. Seguro contra envios duplicados. */
export async function enviarAlertasPendentes(admin, req) {
  const desde = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { data: pend } = await admin
    .from("alertas_seguranca")
    .select("id")
    .eq("email_enviado", false)
    .lt("email_tentativas", 3)
    .gte("created_at", desde)
    .order("created_at", { ascending: true })
    .limit(30);
  if (!pend?.length) return 0;

  // "Reserva" os alertas antes de enviar: outro pedido em paralelo já não os apanha
  const { data: alertas } = await admin
    .from("alertas_seguranca")
    .update({ email_enviado: true })
    .in("id", pend.map((p) => p.id))
    .eq("email_enviado", false)
    .select("id, created_at, tipo, gravidade, titulo, mensagem, user_email, ip, pais, email_tentativas");
  if (!alertas?.length) return 0;

  const destinos = await emailsAdmins(admin);
  if (!destinos.length) return 0;

  const base = origemApp(req);
  const link = base ? `${base}/#/dashboard/registos?alertas=1` : "";
  const fmt = (iso) => new Date(iso).toLocaleString("pt-PT", { timeZone: "Europe/Lisbon", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  const linhas = alertas.map((a) => {
    const g = GRAV[a.gravidade] || GRAV.media;
    const extra = [a.ip && `IP ${a.ip}`, a.pais && `país ${a.pais}`].filter(Boolean).join(" · ");
    return `
      <tr><td style="padding:12px 0;border-bottom:1px solid #e2e8f0">
        <span style="display:inline-block;padding:2px 8px;border-radius:999px;background:${g.cor};color:#fff;font-size:11px;font-weight:bold">${g.nome}</span>
        <span style="color:#64748b;font-size:12px;margin-left:6px">${escapeHtml(fmt(a.created_at))}</span>
        <div style="margin-top:6px;font-weight:bold;color:#0f172a">${escapeHtml(a.titulo)}</div>
        <div style="margin-top:2px;color:#334155">${escapeHtml(a.mensagem)}</div>
        ${extra ? `<div style="margin-top:4px;color:#64748b;font-size:12px">${escapeHtml(extra)}</div>` : ""}
      </td></tr>`;
  }).join("");
  const htmlContent = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#1e293b;max-width:600px;margin:0 auto;border:1px solid #e2e8f0;border-radius:12px;padding:24px">
      <h2 style="margin:0 0 6px 0;color:#0f172a">Alerta de segurança no Bizin</h2>
      <p style="margin:0 0 16px 0;color:#475569">Foi detetada atividade fora do normal. Confirme se foi alguém da equipa.</p>
      <table role="presentation" width="100%" style="border-collapse:collapse">${linhas}</table>
      ${link ? `<p style="margin:20px 0 0 0"><a href="${escapeHtml(link)}" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:bold">Ver no Bizin</a></p>` : ""}
      <p style="margin:20px 0 0 0;color:#64748b;font-size:12px">Email automático enviado aos administradores. No máximo um aviso por situação por hora.</p>
    </div>`;
  const assunto = alertas.length === 1 ? `Bizin · Segurança: ${alertas[0].titulo}` : `Bizin · ${alertas.length} alertas de segurança`;

  try {
    await sendTransactionalCampaign({ senderProfile: "marketing", emails: destinos, subject: assunto.slice(0, 200), htmlContent });
    return alertas.length;
  } catch (err) {
    console.error("[seguranca] falha ao enviar email de alerta:", err?.message);
    // Devolve à fila (tenta de novo na próxima recolha, até 3 vezes)
    await Promise.all(alertas.map((a) => admin
      .from("alertas_seguranca")
      .update({ email_enviado: false, email_tentativas: (a.email_tentativas || 0) + 1 })
      .eq("id", a.id)));
    return 0;
  }
}

// ---- 1) Tentativa falhada (sem sessão) -------------------------------
/**
 * Corpo `{ email?, motivo: "password"|"mfa"|"conta_bloqueada" }` (de src/utils/alertasSeguranca.js).
 * Grava em tentativas_login e cria alertas se ≥5 falhas por email ou IP em 15 min.
 * Responde sempre `{ ok: true }` para não dar pistas a quem ataca.
 */
async function tentativa(req, res) {
  const admin = exigirServico();
  const body = req.body || {};
  const motivo = ["password", "mfa", "conta_bloqueada"].includes(body.motivo) ? body.motivo : "password";
  const email = emailValido(body.email) ? String(body.email).trim().toLowerCase() : null;
  const ip = ipDe(req);
  const pais = paisDe(req);

  // Anti-inundação: acima do limite por IP deixa de gravar (responde igual, para não dar pistas)
  if (ip) {
    const { count } = await admin.from("tentativas_login").select("id", { count: "exact", head: true })
      .eq("ip", ip).gte("created_at", minutosAtras(LIM.janelaLoginMin));
    if ((count || 0) >= LIM.tentativasPorIp) return res.status(200).json({ ok: true });
  }
  await admin.from("tentativas_login").insert({ email, ip, pais, motivo, agente: agenteDe(req) });

  const desde = minutosAtras(LIM.janelaLoginMin);
  const contar = (col, val) => admin.from("tentativas_login").select("id", { count: "exact", head: true }).eq(col, val).gte("created_at", desde);
  const [porEmail, porIp] = await Promise.all([
    email ? contar("email", email) : { count: 0 },
    ip ? contar("ip", ip) : { count: 0 },
  ]);
  const nomeMotivo = motivo === "mfa" ? "códigos 2FA errados" : motivo === "conta_bloqueada" ? "tentativas com conta bloqueada" : "palavras-passe erradas";
  let novo = null;
  if ((porEmail.count || 0) >= LIM.falhasLogin) {
    novo = await criarAlerta(admin, {
      tipo: "login_falhado", gravidade: "alta", titulo: "Várias tentativas falhadas na mesma conta",
      mensagem: `${porEmail.count} ${nomeMotivo} para ${email} nos últimos ${LIM.janelaLoginMin} minutos.`,
      email, ip, pais, detalhes: { total: porEmail.count, motivo }, chave: `login_falhado:email:${email}`,
    }) || novo;
  }
  if ((porIp.count || 0) >= LIM.falhasLogin) {
    novo = await criarAlerta(admin, {
      tipo: "login_falhado", gravidade: "alta", titulo: "Várias tentativas falhadas do mesmo IP",
      mensagem: `${porIp.count} tentativas falhadas a partir do IP ${ip}${pais ? ` (${pais})` : ""} nos últimos ${LIM.janelaLoginMin} minutos.`,
      email, ip, pais, detalhes: { total: porIp.count, motivo }, chave: `login_falhado:ip:${ip}`,
    }) || novo;
  }
  if (motivo === "conta_bloqueada" && email) {
    novo = await criarAlerta(admin, {
      tipo: "conta_desativada", gravidade: "media", titulo: "Tentativa de entrar com conta desativada",
      mensagem: `Alguém tentou entrar com a conta bloqueada ${email}${pais ? ` (a partir de ${pais})` : ""}.`,
      email, ip, pais, chave: `conta_desativada:${email}`,
    }) || novo;
  }
  if (novo) await enviarAlertasPendentes(admin, req);
  return res.status(200).json({ ok: true });
}

// ---- 2) Login com sucesso -------------------------------------------
/** Regista "login" em audit_log (IP, país pelo cabeçalho x-vercel-ip-country) e alerta se país ≠ PT. */
async function login(req, res) {
  const ctx = await autenticar(req);
  const admin = ctx.admin || exigirServico();
  const ip = ipDe(req);
  const pais = paisDe(req);
  await admin.from("audit_log").insert({
    user_id: ctx.user.id, user_email: ctx.user.email, operacao: "EVENTO", acao: "login",
    detalhes: { via: "password + 2FA", ip, pais, agente: agenteDe(req) },
  });
  if (pais && pais !== LIM.paisPermitido) {
    const novo = await criarAlerta(admin, {
      tipo: "login_estrangeiro", gravidade: "media", titulo: "Entrada a partir de fora de Portugal",
      mensagem: `${ctx.perfil?.nome || ctx.user.email} entrou no Bizin a partir de ${pais} (IP ${ip || "?"}).`,
      userId: ctx.user.id, email: ctx.user.email, ip, pais, chave: `login_pais:${ctx.user.id}:${pais}`,
    });
    if (novo) await enviarAlertasPendentes(admin, req);
  }
  return res.status(200).json({ ok: true });
}

// ---- 3) Recolha dos logs do Supabase (pg_cron) ------------------------
function segredoValido(req) {
  const esperado = String(process.env.SEGURANCA_CRON_SEGREDO || "");
  const recebido = String(req.headers?.["x-cron-segredo"] || "");
  if (esperado.length < 32 || recebido.length !== esperado.length) return false;
  return timingSafeEqual(Buffer.from(recebido), Buffer.from(esperado));
}

function refDoProjeto() {
  if (process.env.SUPABASE_PROJECT_REF) return process.env.SUPABASE_PROJECT_REF;
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const m = /^https:\/\/([a-z0-9]{10,40})\.supabase\.co/i.exec(url);
  return m ? m[1] : "";
}

async function consultarLogs(sql, inicio, fim) {
  const ref = refDoProjeto();
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!ref || !token) throw new Error("Falta SUPABASE_ACCESS_TOKEN (ou o ref do projeto) no servidor.");
  const url = new URL(`https://api.supabase.com/v1/projects/${ref}/analytics/endpoints/logs`);
  url.searchParams.set("sql", sql);
  url.searchParams.set("iso_timestamp_start", inicio.toISOString());
  url.searchParams.set("iso_timestamp_end", fim.toISOString());
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) {
    const msg = typeof j.error === "string" ? j.error : j.error?.message || j.message || `HTTP ${r.status}`;
    throw new Error(`Logs do Supabase: ${String(msg).slice(0, 300)}`);
  }
  return Array.isArray(j.result) ? j.result : [];
}

// Timestamps dos logs podem vir em microssegundos
const paraData = (t) => {
  if (typeof t === "number") return new Date(t > 1e14 ? t / 1000 : t);
  const n = Number(t);
  if (Number.isFinite(n) && String(t).trim() !== "") return new Date(n > 1e14 ? n / 1000 : n);
  return new Date(t);
};

// /storage/v1/object/sign/bucket/pasta/ficheiro.pdf → /storage/v1/object/sign/bucket
function normalizarCaminho(c) {
  const p = String(c || "").split("?")[0];
  const s = p.split("/").filter(Boolean);
  if (s[0] === "storage") return "/" + s.slice(0, Math.min(s.length, s[2] === "object" && ["sign", "public", "authenticated"].includes(s[3]) ? 5 : 4)).join("/");
  if (s[0] === "rest" && s[2] === "rpc") return "/" + s.slice(0, 4).join("/");
  return "/" + s.slice(0, 3).join("/");
}

const SQL_API = `
select log_attributes['request.headers.cf_connecting_ip'] as ip,
       log_attributes['request.method'] as metodo,
       log_attributes['request.path'] as caminho,
       toInt32OrZero(log_attributes['response.status_code']) as estado,
       count() as total
from logs
where source = 'edge_logs'
group by ip, metodo, caminho, estado
order by total desc
limit 5000`;

const SQL_AUTH = `
select id, timestamp,
       log_attributes['remote_addr'] as ip,
       log_attributes['method'] as metodo,
       log_attributes['path'] as caminho,
       toInt32OrZero(log_attributes['status']) as estado,
       log_attributes['level'] as nivel,
       log_attributes['msg'] as mensagem,
       log_attributes['auth_event.action'] as acao,
       log_attributes['auth_event.actor_username'] as email
from logs
where source = 'auth_logs'
  and (toInt32OrZero(log_attributes['status']) >= 400
       or log_attributes['auth_event.action'] in ('login', 'logout', 'user_signedup', 'user_invited', 'user_recovery_requested', 'user_modified', 'user_deleted', 'factor_unenrolled', 'user_updated_password'))
order by timestamp desc
limit 3000`;

async function guardarEstado(admin, valor) {
  await admin.from("seguranca_estado").upsert({ chave: "recolha_logs", valor, atualizado_em: new Date().toISOString() });
}

/**
 * Lê os edge_logs e auth_logs do Supabase (Management API) desde o último `ate` guardado em
 * seguranca_estado (máx. 23 h atrás), grava-os em logs_supabase_api / logs_supabase_auth e
 * aplica as regras de LIM para criar alertas. Devolve um resumo com a janela processada.
 */
async function recolherLogs(admin) {
  const { data: est } = await admin.from("seguranca_estado").select("valor").eq("chave", "recolha_logs").maybeSingle();
  const agora = new Date();
  agora.setSeconds(0, 0);
  const fim = new Date(agora.getTime() - 60000); // os logs chegam com ~1 min de atraso
  const minimo = new Date(fim.getTime() - 23 * 3600 * 1000); // a API aceita no máximo 24 h
  let inicio = est?.valor?.ate ? new Date(est.valor.ate) : new Date(fim.getTime() - 15 * 60000);
  if (!(inicio < fim)) return { api: 0, auth: 0, alertas: 0, janela: null };
  if (inicio < minimo) inicio = minimo;

  const [api, auth] = await Promise.all([consultarLogs(SQL_API, inicio, fim), consultarLogs(SQL_AUTH, inicio, fim)]);

  // API: agrupa por IP + método + recurso + estado
  const grupos = new Map();
  for (const r of api) {
    const caminho = normalizarCaminho(r.caminho);
    const k = [r.ip || "", r.metodo || "", caminho, Number(r.estado) || 0].join("|");
    const g = grupos.get(k) || { ip: r.ip || null, metodo: r.metodo || null, caminho, estado: Number(r.estado) || 0, total: 0 };
    g.total += Number(r.total) || 0;
    grupos.set(k, g);
  }
  const linhasApi = [...grupos.values()].map((g) => ({ ...g, janela_inicio: inicio.toISOString(), janela_fim: fim.toISOString() }));
  for (let i = 0; i < linhasApi.length; i += 500) {
    const { error } = await admin.from("logs_supabase_api").insert(linhasApi.slice(i, i + 500));
    if (error) throw new Error(`Guardar logs da API: ${error.message}`);
  }

  const linhasAuth = auth.filter((r) => r.id).map((r) => ({
    id: String(r.id), momento: paraData(r.timestamp).toISOString(), ip: r.ip || null, metodo: r.metodo || null,
    caminho: r.caminho || null, estado: Number(r.estado) || null, nivel: r.nivel || null,
    mensagem: String(r.mensagem || "").slice(0, 500) || null, acao: r.acao || null, email: r.email || null,
  }));
  for (let i = 0; i < linhasAuth.length; i += 500) {
    const { error } = await admin.from("logs_supabase_auth").upsert(linhasAuth.slice(i, i + 500), { onConflict: "id", ignoreDuplicates: true });
    if (error) throw new Error(`Guardar logs de autenticação: ${error.message}`);
  }

  // ---- Deteção (limites por cada 10 minutos de janela) ----
  const escala = Math.max(1, (fim - inicio) / 600000);
  const porIp = new Map();
  const somar = (ip, campo, n) => {
    if (!ip) return;
    const o = porIp.get(ip) || { negados: 0, leituras: 0, downloads: 0, tabelas: {} };
    o[campo] += n;
    porIp.set(ip, o);
    return o;
  };
  for (const g of linhasApi) {
    if (g.estado === 401 || g.estado === 403) somar(g.ip, "negados", g.total);
    const s = g.caminho.split("/").filter(Boolean);
    if (g.metodo === "GET" && s[0] === "rest" && TABELAS_SENSIVEIS.has(s[2]) && g.estado < 400) {
      const o = somar(g.ip, "leituras", g.total);
      if (o) o.tabelas[s[2]] = (o.tabelas[s[2]] || 0) + g.total;
    }
    if (g.metodo === "GET" && s[0] === "storage" && s[2] === "object" && g.estado < 400) somar(g.ip, "downloads", g.total);
  }
  const falhasAuth = new Map();
  for (const r of linhasAuth) {
    if (r.ip && r.estado >= 400 && /token|verify|factors|otp/.test(r.caminho || "")) falhasAuth.set(r.ip, (falhasAuth.get(r.ip) || 0) + 1);
  }

  let alertas = 0;
  const conta = (id) => { if (id) alertas += 1; };
  for (const [ip, n] of falhasAuth) {
    if (n >= LIM.falhasLogin) conta(await criarAlerta(admin, {
      tipo: "login_falhado", gravidade: "alta", titulo: "Várias tentativas falhadas do mesmo IP",
      mensagem: `${n} pedidos de autenticação recusados a partir do IP ${ip} (diretamente ao Supabase).`,
      ip, detalhes: { total: n, origem: "logs_supabase" }, chave: `login_falhado:ip:${ip}`,
    }));
  }
  for (const [ip, o] of porIp) {
    if (o.negados >= LIM.negadosApi * escala) conta(await criarAlerta(admin, {
      tipo: "api_negado", gravidade: "media", titulo: "Muitos pedidos recusados pela base de dados",
      mensagem: `${o.negados} pedidos à API do Supabase foram recusados (401/403) para o IP ${ip}. Pode ser alguém a tentar aceder sem permissão.`,
      ip, detalhes: { total: o.negados }, chave: `api_negado:${ip}`,
    }));
    if (o.leituras >= LIM.leiturasSensiveis * escala) {
      const top = Object.entries(o.tabelas).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([t, n]) => `${t} (${n})`).join(", ");
      conta(await criarAlerta(admin, {
        tipo: "leitura_volumosa", gravidade: "alta", titulo: "Leitura invulgar de dados sensíveis",
        mensagem: `${o.leituras} leituras de dados sensíveis a partir do IP ${ip} em pouco tempo: ${top}. Pode ser uma extração de dados fora dos botões da app.`,
        ip, detalhes: { total: o.leituras, tabelas: o.tabelas }, chave: `leitura_volumosa:${ip}`,
      }));
    }
    if (o.downloads >= LIM.downloads * escala) conta(await criarAlerta(admin, {
      tipo: "downloads_volume", gravidade: "media", titulo: "Muitos ficheiros descarregados",
      mensagem: `${o.downloads} ficheiros descarregados a partir do IP ${ip} em pouco tempo.`,
      ip, detalhes: { total: o.downloads }, chave: `downloads_volume:${ip}`,
    }));
  }

  return { api: linhasApi.length, auth: linhasAuth.length, alertas, janela: { de: inicio.toISOString(), ate: fim.toISOString() } };
}

async function recolher(req, res) {
  if (!segredoValido(req)) throw new ErroHttp(401, "Não autorizado.");
  const admin = exigirServico();
  let resumo = null;
  let erro = null;
  try {
    resumo = await recolherLogs(admin);
  } catch (e) {
    erro = String(e?.message || e).slice(0, 500);
    console.error("[seguranca/recolher]", erro);
  }
  const { data: est } = await admin.from("seguranca_estado").select("valor").eq("chave", "recolha_logs").maybeSingle();
  await guardarEstado(admin, {
    ...(est?.valor || {}),
    ...(resumo?.janela ? { ate: resumo.janela.ate } : {}),
    ultima_execucao: new Date().toISOString(),
    ultimo_resumo: resumo,
    ultimo_erro: erro,
    ...(erro ? {} : { ultimo_sucesso: new Date().toISOString() }),
  });
  // Os alertas criados pelas regras da BD (apagar em massa, cofre, exportações) também saem por aqui
  const enviados = await enviarAlertasPendentes(admin, req);
  return res.status(200).json({ ok: !erro, resumo, enviados, erro });
}

// ---- Router ----------------------------------------------------------
const OPS = { tentativa, login, recolher };

/**
 * Ponto de entrada de POST /api/seguranca/:op (Vercel: api/seguranca/[op].js; local: server/index.js).
 * @param {"tentativa"|"login"|"recolher"} op
 */
export default async function seguranca(op, req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Método não permitido." });
  const fn = OPS[op];
  if (!fn) return res.status(404).json({ ok: false, error: "Rota desconhecida." });
  try {
    return await fn(req, res);
  } catch (err) {
    if (err instanceof ErroHttp) return res.status(err.status).json({ ok: false, error: err.message });
    console.error(`[seguranca/${op}]`, err);
    return res.status(500).json({ ok: false, error: "Ocorreu um erro no servidor." });
  }
}
