/* global process */
// =====================================================================
// Envio de emails (Brevo) — todas as rotas exigem sessão no Bizin.
//
//   marketing      campanhas de marketing      papéis: admin, gestor, marketing
//   transfergest   campanhas TransferGest      papéis: admin, gestor
//   cc-alerta      aviso aos RH de CC alterado (dados lidos do perfil de quem pede)
//   projeto-criado aviso ao responsável         (só para emails de colegas do Bizin)
//   pedido-ausencia aviso aos admins de um pedido (só o dono do pedido ou RH)
//
// Os destinatários das notificações internas são calculados no servidor
// ou validados contra a lista de colaboradores — nunca são confiados ao browser.
// =====================================================================
import { sendTransactionalCampaign } from "../../server/brevoCampaignSender.js";
import {
  PAPEIS, ErroHttp, autenticar, exigirPapel, escapeHtml, emailsInternos,
  urlDaApp, origemApp, limitar, auditar, emailValido,
} from "./seguranca.js";
import { construirEmailPedido } from "./emailPedidoAusencia.js";

const MAX_DESTINATARIOS_CAMPANHA = 2000;

function opcoesSeguras(body) {
  // Parâmetros técnicos vindos do browser: limitados para não prender a função
  return {
    batchSize: limitar(body.batchSize, 1, 100, undefined),
    batchDelayMs: limitar(body.batchDelayMs, 0, 3000, undefined),
    maxRetries: limitar(body.maxRetries, 0, 3, undefined),
    requestTimeoutMs: limitar(body.requestTimeoutMs, 1000, 30000, undefined),
  };
}

/**
 * Campanha em massa (marketing / transfergest). Corpo: `{ emails[], templateId? , params?,
 * recipientParamsByEmail?, subject?, htmlContent?, batchSize?, ... }` (ver server/brevoCampaignSender.js).
 * Máx. 2000 destinatários. Regista "campanha_<perfil>" em audit_log. Devolve `{ ok, summary }`.
 */
async function campanha(req, ctx, perfilEnvio, papeis) {
  exigirPapel(ctx, papeis);
  const body = req.body || {};
  if (!Array.isArray(body.emails)) throw new ErroHttp(400, "A lista de destinatários tem de ser uma lista.");
  if (body.emails.length > MAX_DESTINATARIOS_CAMPANHA) {
    throw new ErroHttp(400, `No máximo ${MAX_DESTINATARIOS_CAMPANHA} destinatários por envio.`);
  }
  const summary = await sendTransactionalCampaign({
    senderProfile: perfilEnvio,
    emails: body.emails,
    templateId: body.templateId,
    params: body.params,
    recipientParamsByEmail: body.recipientParamsByEmail,
    subject: typeof body.subject === "string" ? body.subject.slice(0, 250) : body.subject,
    htmlContent: body.htmlContent,
    options: opcoesSeguras(body),
  });
  await auditar(ctx.admin, ctx, `campanha_${perfilEnvio}`, { destinatarios: body.emails.length, assunto: String(body.subject || "").slice(0, 120) });
  return { ok: true, summary };
}

// Aviso aos RH: os dados do CC vêm do perfil de quem pede (não do browser)
async function ccAlerta(req, ctx) {
  const destino = String(process.env.RH_EMAIL || "rh@neomarca.eu").trim();
  if (!emailValido(destino)) throw new ErroHttp(503, "Email dos RH não configurado (RH_EMAIL).");
  let dados = { nome: ctx.perfil?.nome, ncc: null, validade_cc: null };
  if (ctx.admin) {
    const { data } = await ctx.admin.from("profiles").select("nome, nome_completo, ncc, validade_cc").eq("id", ctx.user.id).maybeSingle();
    if (data) dados = data;
    // Desde a migração 072 o CC vive em profiles_privado
    const { data: priv, error: ePriv } = await ctx.admin.from("profiles_privado").select("ncc, validade_cc").eq("id", ctx.user.id).maybeSingle();
    if (!ePriv && priv) dados = { ...dados, ncc: priv.ncc ?? dados.ncc, validade_cc: priv.validade_cc ?? dados.validade_cc };
  }
  const nome = escapeHtml(dados.nome || dados.nome_completo || ctx.user.email);
  const ncc = escapeHtml(dados.ncc || "N/A");
  const validade = escapeHtml(dados.validade_cc || "N/A");
  const htmlContent = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1e293b;max-width:600px;margin:0 auto;border:1px solid #e2e8f0;border-radius:12px;padding:24px;">
      <h2 style="margin:0 0 16px 0;color:#0f172a;border-bottom:1px solid #e2e8f0;padding-bottom:12px;">Atualização de Documento</h2>
      <p style="margin:0 0 12px 0">Olá Equipa de Recursos Humanos,</p>
      <p style="margin:0 0 20px 0">O colaborador <strong>${nome}</strong> atualizou os dados do seu Cartão de Cidadão na plataforma.</p>
      <div style="background:#f8fafc;padding:16px;border-radius:8px;border:1px solid #cbd5e1;margin-bottom:24px;">
        <p style="margin:0 0 8px 0"><strong>Nº do Cartão de Cidadão:</strong> ${ncc}</p>
        <p style="margin:0"><strong>Data de Validade:</strong> ${validade}</p>
      </div>
      <p style="margin:0;color:#64748b;font-size:12px;border-top:1px solid #e2e8f0;padding-top:12px;">Este é um email automático gerado pelo sistema.</p>
    </div>`;
  const summary = await sendTransactionalCampaign({
    senderProfile: "marketing",
    emails: [destino],
    subject: `Aviso: Atualização de Cartão de Cidadão - ${String(dados.nome || "Colaborador").slice(0, 80)}`,
    htmlContent,
  });
  return { ok: true, summary };
}

// Aviso ao responsável de um projeto novo: só para colegas do Bizin e só links da própria app
async function projetoCriado(req, ctx) {
  const { email, projectTitle, projectUrl, responsibleName, clientName } = req.body || {};
  const [destino] = await emailsInternos(ctx.admin, [email]);
  if (!destino) throw new ErroHttp(400, "O destinatário tem de ser um colaborador do Bizin.");
  const link = urlDaApp(req, projectUrl);
  if (!link || !projectTitle) throw new ErroHttp(400, "Faltam o título ou o link do projeto.");

  const titulo = escapeHtml(String(projectTitle).slice(0, 200));
  const responsavel = escapeHtml(String(responsibleName || "Responsável").slice(0, 120));
  const cliente = escapeHtml(String(clientName || "").slice(0, 160));
  const linkHtml = escapeHtml(link);
  const htmlContent = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1e293b">
      <h2 style="margin:0 0 12px 0;color:#0f172a">Foi criado um novo projeto</h2>
      <p style="margin:0 0 8px 0">Olá, ${responsavel}.</p>
      <p style="margin:0 0 8px 0">Foi criado o projeto <strong>${titulo}</strong>${cliente ? ` para ${cliente}` : ""}.</p>
      <p style="margin:0 0 20px 0">Podes abrir diretamente aqui:</p>
      <p style="margin:0 0 24px 0"><a href="${linkHtml}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:bold">Abrir projeto</a></p>
      <p style="margin:0;color:#64748b;font-size:12px">Se o botão não funcionar, copia este link: ${linkHtml}</p>
    </div>`;
  const summary = await sendTransactionalCampaign({
    senderProfile: "marketing",
    emails: [destino],
    subject: `Novo projeto atribuído: ${String(projectTitle).slice(0, 150)}`,
    htmlContent,
  });
  return { ok: true, summary };
}

// Pedido de ausência: o pedido é lido na BD e os destinatários são os admins ativos
async function pedidoAusencia(req, ctx) {
  if (!ctx.admin) throw new ErroHttp(503, "Falta configurar SUPABASE_SERVICE_ROLE_KEY no servidor.");
  const { requestId, isEditing } = req.body || {};
  if (!requestId) throw new ErroHttp(400, "Falta o pedido.");

  const { data: pedido, error } = await ctx.admin
    .from("ferias")
    .select("id, user_id, tipo, estado, motivo, data_inicio, data_fim, is_parcial, hora_inicio, hora_fim, km_origem, km_destino, km_total, veiculo, km_ida_volta")
    .eq("id", requestId)
    .maybeSingle();
  if (error || !pedido) throw new ErroHttp(404, "Pedido não encontrado.");
  const ehDono = String(pedido.user_id) === String(ctx.user.id);
  if (!ehDono && !PAPEIS.gestao.includes(ctx.papel)) throw new ErroHttp(403, "Só pode notificar pedidos seus.");

  const { data: admins } = await ctx.admin.from("profiles").select("email, role, tipo, ativo");
  const destinos = [...new Set((admins || [])
    .filter((p) => p.ativo !== false && p.email && [p.role, p.tipo].some((r) => PAPEIS.admin.includes(String(r || "").toLowerCase())))
    .map((p) => p.email.trim().toLowerCase()))];
  if (!destinos.length) return { ok: true, sent: 0, failed: 0 };

  const { data: dono } = await ctx.admin.from("profiles").select("nome, email").eq("id", pedido.user_id).maybeSingle();
  const base = origemApp(req);
  // A app usa HashRouter: /#/dashboard/pedidos/<id>
  const requestUrl = base ? `${base}/#/dashboard/pedidos/${encodeURIComponent(pedido.id)}` : "";

  const isKm = /km|desloca/i.test(String(pedido.tipo || ""));
  const resultados = await Promise.allSettled(destinos.map((adminEmail) => {
    const { subject, htmlContent } = construirEmailPedido({
      pedido, isKm, isEditing: Boolean(isEditing), requesterName: dono?.nome || dono?.email || "Um colaborador",
      requestUrl,
    });
    return sendTransactionalCampaign({ senderProfile: "marketing", emails: [adminEmail], subject, htmlContent });
  }));
  const falhas = resultados.filter((r) => r.status === "rejected");
  if (falhas.length) console.warn(`[pedido-ausencia] ${falhas.length} email(s) falharam.`, falhas.map((f) => f.reason?.message));
  return { ok: true, sent: destinos.length - falhas.length, failed: falhas.length };
}

const TIPOS = {
  marketing: (req, ctx) => campanha(req, ctx, "marketing", PAPEIS.marketing),
  transfergest: (req, ctx) => campanha(req, ctx, "transfergest", PAPEIS.gestao),
  "cc-alerta": ccAlerta,
  "projeto-criado": projetoCriado,
  "pedido-ausencia": pedidoAusencia,
};

export function tipoValido(tipo) {
  return Object.prototype.hasOwnProperty.call(TIPOS, tipo);
}

/**
 * Ponto de entrada de POST /api/notificacoes/:tipo (Vercel: api/notificacoes/[tipo].js;
 * local: server/index.js). Autentica, chama TIPOS[tipo] e responde JSON `{ ok, ... }`.
 * @param {string} tipo marketing | transfergest | cc-alerta | projeto-criado | pedido-ausencia
 */
export default async function notificar(tipo, req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Método não permitido." });
    return;
  }
  if (!tipoValido(tipo)) {
    res.status(404).json({ ok: false, error: "Tipo de notificação desconhecido." });
    return;
  }
  try {
    const ctx = await autenticar(req);
    const out = await TIPOS[tipo](req, ctx);
    res.status(200).json(out);
  } catch (err) {
    if (err instanceof ErroHttp) {
      res.status(err.status).json({ ok: false, error: err.message });
      return;
    }
    // Erros do Brevo: mensagem curta, sem detalhes internos
    console.error(`[notificacoes/${tipo}]`, err?.message, err?.details || "");
    const status = typeof err?.status === "number" ? Math.min(Math.max(err.status, 400), 502) : 500;
    res.status(status).json({ ok: false, error: status === 500 ? "Não foi possível enviar o email." : String(err.message || "Falha no envio.").slice(0, 200) });
  }
}
