import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import { avisar } from "./dialogo";

// =====================================================================
// Ficheiros em baldes PRIVADOS do Supabase Storage.
// A base de dados continua a guardar o link "público" (só serve para saber o
// balde e o caminho); para abrir, a app pede um link temporário (assinado).
//   - instalarAberturaSegura(): qualquer <a href> para um balde privado passa a
//     abrir com link temporário (não é preciso mudar cada página)
//   - useUrlAssinado(url): para <img src> de ficheiros privados (ex.: chat)
// =====================================================================

/** Baldes do Storage que são privados (um balde novo privado tem de entrar aqui). */
export const BALDES_PRIVADOS = ["rh_anexos", "documentos", "chat_ficheiros", "documents"]; // documents: privado desde a 089
const DURACAO = 600; // 10 minutos
const RE = /\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/?#]+)\/([^?#]+)/;

/** { bucket, path } se o link for de um balde privado; senão null */
export function ficheiroPrivado(url) {
  const m = RE.exec(String(url || ""));
  if (!m || !BALDES_PRIVADOS.includes(m[1])) return null;
  try {
    return { bucket: m[1], path: decodeURIComponent(m[2]) };
  } catch {
    return { bucket: m[1], path: m[2] };
  }
}

const cache = new Map(); // url → { assinado, expira }

/** Link temporário para um ficheiro privado (ou o próprio link, se não for privado). */
export async function urlAssinado(url) {
  const alvo = ficheiroPrivado(url);
  if (!alvo) return url;
  const c = cache.get(url);
  if (c && c.expira > Date.now() + 30000) return c.assinado;
  const { data, error } = await supabase.storage.from(alvo.bucket).createSignedUrl(alvo.path, DURACAO);
  if (error || !data?.signedUrl) throw error || new Error("Sem acesso a este ficheiro.");
  cache.set(url, { assinado: data.signedUrl, expira: Date.now() + DURACAO * 1000 });
  return data.signedUrl;
}

/** Abre um ficheiro (privado ou não) num separador novo. */
export async function abrirFicheiro(url) {
  // Abre já o separador (evita o bloqueador de pop-ups) e depois aponta-o para o link temporário
  const janela = window.open("", "_blank");
  try {
    const destino = await urlAssinado(url);
    if (janela) {
      janela.opener = null;
      janela.location.href = destino;
    } else {
      window.location.href = destino;
    }
  } catch (err) {
    if (janela) janela.close();
    avisar("Não foi possível abrir o ficheiro.", { mensagem: err?.message || "Sem acesso a este ficheiro." });
  }
}

let instalado = false;
/** Interceta cliques em links para baldes privados em toda a app. */
export function instalarAberturaSegura() {
  if (instalado || typeof document === "undefined") return;
  instalado = true;
  document.addEventListener("click", (e) => {
    if (e.defaultPrevented || e.button !== 0) return;
    const a = e.target?.closest?.("a[href]");
    if (!a || !ficheiroPrivado(a.href)) return;
    e.preventDefault();
    abrirFicheiro(a.href);
  }, true);
}

/** Para <img src>: devolve o link temporário (ou null enquanto carrega). */
export function useUrlAssinado(url) {
  const privado = Boolean(ficheiroPrivado(url));
  const [res, setRes] = useState({ url: null, assinado: null });
  useEffect(() => {
    if (!privado) return undefined;
    let vivo = true;
    urlAssinado(url).then((u) => { if (vivo) setRes({ url, assinado: u }); }).catch(() => {});
    return () => { vivo = false; };
  }, [url, privado]);
  if (!privado) return url;
  return res.url === url ? res.assinado : null;
}
