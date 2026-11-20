/* global process */
// =====================================================================
// Videochamadas (Jitsi as a Service / JaaS da 8x8) — POST /api/reunioes
// Entrada: { conversa: <id de chat_rooms> }
// 1. Confirma a sessão (e exige 2FA: token aal2) e que a pessoa participa
//    na conversa (chat_participants).
// 2. Devolve { dominio, sala, jwt, appId }: a sala é "<appId>/bizin-chat-<id>"
//    e o JWT (RS256, 2 h) só vale para essa sala. Sem JWT não se entra.
// Variáveis (Vercel / .env): JAAS_APP_ID, JAAS_KEY_ID, JAAS_PRIVATE_KEY
// (a chave privada nunca sai do servidor). Ver docs/modulos/comunicacao-e-dashboard.md.
// =====================================================================
import { createSign } from "node:crypto";
import { Buffer } from "node:buffer";
import { autenticar, ErroHttp, responderErro } from "./seguranca.js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DURACAO_S = 2 * 60 * 60;

const b64url = (v) => Buffer.from(typeof v === "string" ? v : JSON.stringify(v)).toString("base64url");

/** Aceita a chave com quebras de linha reais ou com "\n" literais (formato habitual no Vercel). */
function chavePrivada() {
  const k = String(process.env.JAAS_PRIVATE_KEY || "").trim().replace(/^"|"$/g, "").replace(/\\n/g, "\n");
  return k.includes("PRIVATE KEY") ? k : "";
}

/** Nível de autenticação do token Supabase ("aal1" só password, "aal2" com 2FA). Só lê; a assinatura já foi validada por autenticar(). */
function nivelAal(req) {
  try {
    const token = String(req.headers?.authorization || "").replace(/^Bearer\s+/i, "");
    const payload = JSON.parse(Buffer.from(token.split(".")[1] || "", "base64url").toString("utf8"));
    return payload?.aal || "";
  } catch {
    return "";
  }
}

/** JWT do JaaS assinado com a chave privada (RS256). */
function jwtJaas({ appId, keyId, sala, user }) {
  const agora = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", kid: keyId, typ: "JWT" };
  const payload = {
    aud: "jitsi",
    iss: "chat",
    sub: appId,
    room: sala,
    iat: agora,
    nbf: agora - 10,
    exp: agora + DURACAO_S,
    context: {
      user: { id: user.id, name: user.nome, email: user.email, avatar: user.avatar || "", moderator: "true" },
      features: { livestreaming: "false", recording: "false", transcription: "false", "outbound-call": "false" },
    },
  };
  const corpo = `${b64url(header)}.${b64url(payload)}`;
  const assinatura = createSign("RSA-SHA256").update(corpo).sign(chavePrivada()).toString("base64url");
  return `${corpo}.${assinatura}`;
}

export default async function reunioes(req, res) {
  try {
    if (req.method !== "POST") throw new ErroHttp(405, "Método não permitido.");

    const appId = String(process.env.JAAS_APP_ID || "").trim();
    const keyId = String(process.env.JAAS_KEY_ID || "").trim();
    if (!appId || !keyId || !chavePrivada()) throw new ErroHttp(503, "As videochamadas ainda não estão configuradas (faltam as chaves JaaS).");

    const ctx = await autenticar(req);
    if (nivelAal(req) !== "aal2") throw new ErroHttp(403, "Confirma a verificação em dois passos antes de entrar numa chamada.");
    if (!ctx.admin) throw new ErroHttp(503, "Servidor sem chave de serviço do Supabase.");

    const conversa = String(req.body?.conversa || "");
    if (!UUID_RE.test(conversa)) throw new ErroHttp(400, "Conversa inválida.");

    const { data: participa, error } = await ctx.admin
      .from("chat_participants")
      .select("room_id")
      .eq("room_id", conversa)
      .eq("user_id", ctx.user.id)
      .maybeSingle();
    if (error) throw error;
    if (!participa) throw new ErroHttp(403, "Não participas nesta conversa.");

    const { data: perfil } = await ctx.admin.from("profiles").select("nome, avatar_url").eq("id", ctx.user.id).maybeSingle();
    const sala = `bizin-chat-${conversa}`;
    const jwt = jwtJaas({
      appId,
      keyId,
      sala,
      user: {
        id: ctx.user.id,
        nome: perfil?.nome || ctx.perfil?.nome || ctx.user.email,
        email: ctx.user.email,
        // Só URLs http(s) públicas; fotos privadas/assinadas expiram e não servem aqui.
        avatar: /^https:\/\//.test(perfil?.avatar_url || "") ? perfil.avatar_url : "",
      },
    });

    res.status(200).json({ ok: true, dominio: "8x8.vc", appId, sala: `${appId}/${sala}`, jwt });
  } catch (err) {
    responderErro(res, err, "reunioes");
  }
}
