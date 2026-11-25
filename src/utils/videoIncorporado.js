// =====================================================================
// Vídeos incorporados na Comunicação Interna (Forum.jsx).
// Em vez de carregar ficheiros de vídeo (pesados), partilha-se um link do
// YouTube / Vimeo / Loom / Google Drive e o vídeo aparece na mensagem.
// Também se aceita o "código de incorporação" (<iframe …>) colado do YouTube:
// SÓ se aproveita o endereço, e só de sites desta lista — o HTML colado nunca
// é usado (seria um risco de segurança).
// Ver components/VideoIncorporado.jsx.
// =====================================================================

const URL_RE = /https?:\/\/[^\s<>"']+/g;
const IFRAME_RE = /<iframe\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>(?:\s*<\/iframe>)?/gi;

/** Troca códigos <iframe …> colados pelo endereço do vídeo (para mostrar o texto limpo). */
export function limparIframes(texto) {
  if (!texto || !/<iframe/i.test(texto)) return texto;
  return texto.replace(IFRAME_RE, (_, src) => src);
}

/**
 * Reconhece um endereço de vídeo. Devolve { fornecedor, id, embed, miniatura?, link } ou null.
 * Só sites conhecidos; tudo o resto é tratado como link normal.
 */
export function reconhecerVideo(endereco) {
  let u;
  try { u = new URL(endereco); } catch { return null; }
  const host = u.hostname.replace(/^www\.|^m\./, "");
  const partes = u.pathname.split("/").filter(Boolean);

  // YouTube: watch?v=, youtu.be/ID, /shorts/ID, /embed/ID, /live/ID
  if (["youtube.com", "youtube-nocookie.com", "youtu.be", "music.youtube.com"].includes(host)) {
    let id = null;
    if (host === "youtu.be") id = partes[0];
    else if (partes[0] === "watch") id = u.searchParams.get("v");
    else if (["shorts", "embed", "live", "v"].includes(partes[0])) id = partes[1];
    else if (u.searchParams.get("v")) id = u.searchParams.get("v");
    if (!id || !/^[\w-]{6,20}$/.test(id)) return null;
    const t = u.searchParams.get("t") || u.searchParams.get("start");
    const inicio = t ? parseInt(String(t).replace(/s$/, ""), 10) : 0;
    return {
      fornecedor: "YouTube",
      id,
      vertical: partes[0] === "shorts",
      embed: `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0${inicio > 0 ? `&start=${inicio}` : ""}`,
      miniatura: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      link: `https://www.youtube.com/watch?v=${id}`,
    };
  }

  // Vimeo: vimeo.com/ID ou player.vimeo.com/video/ID
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const id = host === "player.vimeo.com" ? partes[1] : partes.find((p) => /^\d+$/.test(p));
    if (!id || !/^\d+$/.test(id)) return null;
    return { fornecedor: "Vimeo", id, embed: `https://player.vimeo.com/video/${id}?autoplay=1`, link: `https://vimeo.com/${id}` };
  }

  // Loom: loom.com/share/ID ou /embed/ID
  if (host === "loom.com" && ["share", "embed"].includes(partes[0]) && /^[\w-]+$/.test(partes[1] || "")) {
    return { fornecedor: "Loom", id: partes[1], embed: `https://www.loom.com/embed/${partes[1]}?autoplay=1`, link: `https://www.loom.com/share/${partes[1]}` };
  }

  // Google Drive: drive.google.com/file/d/ID/…
  if (host === "drive.google.com" && partes[0] === "file" && partes[1] === "d" && /^[\w-]+$/.test(partes[2] || "")) {
    return { fornecedor: "Google Drive", id: partes[2], embed: `https://drive.google.com/file/d/${partes[2]}/preview`, link: `https://drive.google.com/file/d/${partes[2]}/view` };
  }

  return null;
}

/** Todos os vídeos de um texto (links e códigos de incorporação), sem repetidos, no máximo 4. */
export function videosDoTexto(texto) {
  if (!texto) return [];
  const limpo = limparIframes(String(texto));
  const vistos = new Set();
  const out = [];
  for (const m of limpo.match(URL_RE) || []) {
    const v = reconhecerVideo(m.replace(/[),.;!?]+$/, ""));
    if (!v) continue;
    const chave = `${v.fornecedor}:${v.id}`;
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    out.push(v);
    if (out.length >= 4) break;
  }
  return out;
}
