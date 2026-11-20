/* global process */
// =====================================================================
// Consulta de NIF no nif.pt pelo servidor: a chave (NIFPT_KEY) nunca vai para o browser.
// Só utilizadores com sessão; só aceita NIF com 9 dígitos.
// =====================================================================
import { autenticar, responderErro, ErroHttp } from "./seguranca.js";

/**
 * GET /api/nif?q=<NIF> — chamado por consultarNif() em src/utils/apiAutenticada.js.
 * Devolve o JSON do nif.pt tal como vem (cache privada de 1 h no browser).
 * Aceita VITE_NIFPT_KEY como alternativa por compatibilidade; preferir NIFPT_KEY.
 */
export default async function nifLookup(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ ok: false, error: "Método não permitido." });
    return;
  }
  try {
    await autenticar(req);
    const nif = String(req.query?.q || "").replace(/\D/g, "");
    if (!/^\d{9}$/.test(nif)) throw new ErroHttp(400, "NIF inválido.");
    const key = String(process.env.NIFPT_KEY || process.env.VITE_NIFPT_KEY || "").trim();
    if (!key) throw new ErroHttp(503, "Consulta de NIF não configurada (NIFPT_KEY).");

    const url = `https://www.nif.pt/?json=1&q=${nif}&key=${encodeURIComponent(key)}`;
    const resp = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "application/json, text/plain, */*",
      },
      signal: AbortSignal.timeout(10000),
    });
    const tipo = resp.headers.get("content-type") || "";
    if (!resp.ok || !tipo.includes("application/json")) throw new ErroHttp(502, "O serviço NIF.pt não respondeu corretamente.");
    const data = await resp.json();
    res.setHeader("Cache-Control", "private, max-age=3600");
    res.status(200).json(data);
  } catch (err) {
    responderErro(res, err, "nif");
  }
}
