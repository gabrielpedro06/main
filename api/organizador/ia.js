/* global process */
// =====================================================================
// Organizador de PDFs — "Pedir à IA"
// Recebe o TEXTO já lido de um bloco de páginas (sem imagens; dados pessoais
// tapados no browser) e devolve a separação em documentos + metadados.
//
// Variáveis de ambiente (as mesmas do assistente de Marketing):
//   ANTHROPIC_API_KEY, ANTHROPIC_WORKSPACE_ID (opcional),
//   VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
// =====================================================================
import Anthropic from "@anthropic-ai/sdk";
import { autenticar, consumirQuota, ErroHttp } from "../_lib/seguranca.js";
import { PDF_CATEGORIES } from "../../src/utils/pdfOrganizerEngine.js";

export const config = {
  runtime: "nodejs",
  maxDuration: 120,
};

const MODELO = "claude-haiku-5-5";
const MAX_PAGINAS = 40;
const MAX_TEXTO_PAGINA = 3500;

const SISTEMA = `Recebes o texto lido (por OCR ou da camada de texto) de páginas digitalizadas de uma empresa portuguesa: faturas, talões, faturas-recibo, extratos bancários, comprovativos de pagamento (detalhe de movimento do banco, talão Multibanco, guias da AT e da Segurança Social), declarações, contratos, etc.

O teu trabalho:
1. Separar as páginas em documentos. Cada documento é um conjunto de páginas SEGUIDAS. Juntam-se no mesmo documento:
   - páginas de continuação (extrato com várias páginas, fatura com várias páginas);
   - as peças do mesmo pagamento: detalhe do movimento no banco + talão Multibanco + guia/documento de pagamento com o mesmo valor ou a mesma referência;
   - declarações do mesmo mês da mesma entidade (ex.: declarações de remunerações por taxa contributiva).
   Faturas/talões de fornecedores diferentes ou com números diferentes são documentos diferentes.
   Páginas marcadas com "QR fiscal" têm os dados confirmados pelo QR: usa-os.
2. Para cada documento, preencher:
   - entidade: quem emitiu (fornecedor, banco, "Autoridade Tributária", "Segurança Social"). Nome curto e legível, sem "Lda"/"S.A." se não for preciso.
   - data: a data do documento (ou do movimento/pagamento) em AAAA-MM-DD; "" se não houver.
   - numero: número do documento/fatura/declaração; "" se não houver.
   - total: valor total em euros com ponto decimal (ex.: "1188.00"); "" se não houver.
   - categoria: uma de: ${PDF_CATEGORIES.join(", ")}.
   - descricao: 1 a 4 palavras para o nome do ficheiro, sem acentos, separadas por "_" (ex.: "Fatura", "Extrato_Julho_2026", "Pagamento_IRS_Junho_2026", "Retencoes_Fonte_Junho_2026", "Declaracao_Remuneracoes_Junho_2026").
   - confianca: "alta" se tens a certeza da separação e dos dados, "media" caso contrário.

Regras:
- Usa todas as páginas recebidas, cada uma uma única vez, pela ordem recebida.
- O texto tem erros de OCR; corrige-os nos valores que devolves quando for óbvio.
- Textos entre parênteses retos ([NIF], [NISS], [NOME], [IBAN]...) foram tapados de propósito: nunca tentes adivinhá-los.
- Escreve em português de Portugal.`;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["documentos"],
  properties: {
    documentos: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["paginas", "entidade", "data", "numero", "total", "categoria", "descricao", "confianca"],
        properties: {
          paginas: { type: "array", items: { type: "integer" } },
          entidade: { type: "string" },
          data: { type: "string" },
          numero: { type: "string" },
          total: { type: "string" },
          categoria: { type: "string", enum: PDF_CATEGORIES },
          descricao: { type: "string" },
          confianca: { type: "string", enum: ["alta", "media"] },
        },
      },
    },
  },
};

// A resposta tem de cobrir as páginas 1..n, por ordem, em blocos seguidos
function validar(docs, n) {
  if (!Array.isArray(docs) || !docs.length) return false;
  let esperado = 1;
  for (const d of docs) {
    if (!Array.isArray(d.paginas) || !d.paginas.length) return false;
    for (const p of d.paginas) {
      if (p !== esperado) return false;
      esperado += 1;
    }
  }
  return esperado === n + 1;
}

const limpar = (s, max = 80) => String(s || "").replace(/[\r\n\t]+/g, " ").trim().slice(0, max);

/**
 * POST /api/organizador/ia — chamado por src/pages/OrganizadorPdf.jsx.
 * Qualquer pessoa com sessão ativa; limite de 40 pedidos/dia (audit_log, acao "ia_organizador").
 * Corpo: `{ paginas: [{ texto, qr?: { nifEmitente, data, numero, total, tipo } }] }` (1 a 40 páginas;
 * o texto já vem com dados pessoais tapados por src/utils/iaRedacao.js).
 * Saída: `{ ok, documentos: [{ paginas, entidade, data, numero, total, categoria, descricao, confianca }], uso }`.
 * Tenta 2 vezes se a separação devolvida não cobrir as páginas 1..n por ordem.
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Método não permitido." });
    return;
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    res.status(503).json({ ok: false, error: "A chave da API do Claude (ANTHROPIC_API_KEY) ainda não está configurada no servidor." });
    return;
  }

  // Autenticação (sessão + conta ativa) e limite diário por pessoa
  try {
    const ctx = await autenticar(req);
    await consumirQuota(ctx, "ia_organizador", 40);
  } catch (err) {
    if (err instanceof ErroHttp) {
      res.status(err.status).json({ ok: false, error: err.message });
      return;
    }
    throw err;
  }

  const paginas = Array.isArray(req.body?.paginas) ? req.body.paginas : [];
  if (!paginas.length || paginas.length > MAX_PAGINAS) {
    res.status(400).json({ ok: false, error: `Envie entre 1 e ${MAX_PAGINAS} páginas de cada vez.` });
    return;
  }

  const blocos = paginas.map((p, i) => {
    const qr = p?.qr && typeof p.qr === "object"
      ? `QR fiscal: emitente NIF ${limpar(p.qr.nifEmitente, 12)}, data ${limpar(p.qr.data, 12)}, nº ${limpar(p.qr.numero, 40)}, total ${limpar(p.qr.total, 14)}, tipo ${limpar(p.qr.tipo, 4)}\n`
      : "";
    const texto = String(p?.texto || "").slice(0, MAX_TEXTO_PAGINA);
    return `<pagina numero="${i + 1}">\n${qr}${texto || "(sem texto lido)"}\n</pagina>`;
  });

  const workspace = String(process.env.ANTHROPIC_WORKSPACE_ID || "").trim();
  const client = new Anthropic(workspace ? { defaultHeaders: { "anthropic-workspace-id": workspace } } : {});

  try {
    let documentos = null;
    let uso = { input: 0, output: 0 };
    for (let tentativa = 0; tentativa < 2 && !documentos; tentativa += 1) {
      const msg = await client.messages.create({
        model: MODELO,
        max_tokens: 16000,
        output_config: { effort: "medium", format: { type: "json_schema", schema: SCHEMA } },
        system: SISTEMA,
        messages: [{
          role: "user",
          content: `Há ${paginas.length} página(s). Separa-as em documentos e preenche os dados.\n\n${blocos.join("\n\n")}`,
        }],
      });
      uso = { input: uso.input + msg.usage.input_tokens, output: uso.output + msg.usage.output_tokens };
      if (msg.stop_reason === "refusal") {
        res.status(422).json({ ok: false, error: "A IA recusou analisar estas páginas." });
        return;
      }
      if (msg.stop_reason === "max_tokens") continue;
      const texto = msg.content.filter((b) => b.type === "text").map((b) => b.text).join("");
      try {
        const out = JSON.parse(texto);
        if (validar(out?.documentos, paginas.length)) documentos = out.documentos;
      } catch {
        // tenta de novo
      }
    }
    if (!documentos) {
      res.status(502).json({ ok: false, error: "A IA devolveu uma separação inválida. Tente de novo." });
      return;
    }
    const limpos = documentos.map((d) => ({
      paginas: d.paginas,
      entidade: limpar(d.entidade),
      data: /^\d{4}-\d{2}-\d{2}$/.test(d.data) ? d.data : "",
      numero: limpar(d.numero, 60),
      total: Number.isFinite(Number(String(d.total).replace(",", "."))) && String(d.total).trim() !== "" ? Number(String(d.total).replace(",", ".")) : null,
      categoria: PDF_CATEGORIES.includes(d.categoria) ? d.categoria : "Outros",
      descricao: limpar(d.descricao, 60).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w-]+/g, "_").replace(/^_+|_+$/g, ""),
      confianca: d.confianca === "alta" ? "alta" : "media",
    }));
    // Haiku 5.5: $0,10/M entrada, $0,50/M saída
    const custo = (uso.input * 0.1 + uso.output * 0.5) / 1e6;
    res.status(200).json({ ok: true, documentos: limpos, uso: { ...uso, custo_usd: Math.round(custo * 100000) / 100000 } });
  } catch (err) {
    console.error("[organizador/ia]", err);
    let texto = "Não foi possível falar com a IA. Tente de novo.";
    let status = 502;
    if (err instanceof Anthropic.AuthenticationError) texto = "A chave da API do Claude é inválida. Verifique ANTHROPIC_API_KEY.";
    else if (err instanceof Anthropic.PermissionDeniedError) texto = "A chave da API do Claude não tem permissão para este modelo.";
    else if (err instanceof Anthropic.RateLimitError) { texto = "Limite de pedidos atingido. Espere um minuto e tente de novo."; status = 429; }
    else if (err instanceof Anthropic.BadRequestError && /credit balance/i.test(err.message)) texto = "A conta da API do Claude não tem créditos. Carregue créditos na Claude Console (Faturamento) e tente de novo.";
    else if (err instanceof Anthropic.BadRequestError && /workspace/i.test(err.message)) texto = "A chave da API não está ligada a um workspace. Defina ANTHROPIC_WORKSPACE_ID no servidor.";
    else if (err instanceof Anthropic.BadRequestError) texto = "O pedido foi recusado pela API da IA.";
    else if (err instanceof Anthropic.APIError && err.status >= 500) texto = "O serviço do Claude está temporariamente indisponível. Tente daqui a pouco.";
    res.status(status).json({ ok: false, error: texto });
  }
}
