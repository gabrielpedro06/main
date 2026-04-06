// @ts-nocheck
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.49/deno-dom-wasm.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

const NIF_REGEX = /^\d{9}$/;
const CAE_REGEX = /\b\d{5}\b/g;

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

function normalizeNif(value: unknown): string {
  return String(value ?? "").replace(/\D/g, "").slice(0, 9);
}

function extractCaesFromText(text: string): string[] {
  const matches = text.match(CAE_REGEX) || [];
  return [...new Set(matches)];
}

function extractCaesFromHtml(html: string): string[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  if (!doc) {
    return extractCaesFromText(html);
  }

  const candidateTexts: string[] = [];

  const tableNodes = doc.querySelectorAll("table");
  for (const table of tableNodes) {
    const content = table.textContent?.replace(/\s+/g, " ").trim() || "";
    if (!content) continue;

    if (/\bcae\b/i.test(content) || /classifica/i.test(content)) {
      candidateTexts.push(content);
    }
  }

  if (candidateTexts.length === 0) {
    const bodyText = doc.body?.textContent?.replace(/\s+/g, " ").trim() || "";
    if (bodyText) candidateTexts.push(bodyText);
  }

  const caes = candidateTexts.flatMap((text) => extractCaesFromText(text));
  return [...new Set(caes)];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, {
      error: "Method not allowed",
      allowed: ["POST"],
    });
  }

  try {
    const payload = await req.json().catch(() => ({}));
    const nif = normalizeNif((payload as { nif?: string }).nif);

    if (!NIF_REGEX.test(nif)) {
      return jsonResponse(400, {
        error: "NIF inválido. Envia um NIF com 9 dígitos.",
      });
    }

    const targetUrl = `http://www.sicae.pt/Detalhe.aspx?NIPC=${nif}`;

    const sicaeResponse = await fetch(targetUrl, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    if (!sicaeResponse.ok) {
      return jsonResponse(502, {
        error: "Falha ao consultar o SICAE.",
        status: sicaeResponse.status,
      });
    }

    const html = await sicaeResponse.text();
    const caes = extractCaesFromHtml(html)
      .filter((codigo) => /^\d{5}$/.test(codigo))
      .map((codigo) => ({
        codigo,
        descricao: null,
        fonte: "sicae",
      }));

    return jsonResponse(200, {
      nif,
      total: caes.length,
      caes,
      sourceUrl: targetUrl,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    return jsonResponse(500, {
      error: "Erro inesperado ao processar consulta SICAE.",
      details: error instanceof Error ? error.message : String(error),
    });
  }
});
