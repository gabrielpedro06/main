/* global process */
/**
 * Mover os ficheiros ANTIGOS do chat para o balde privado "chat_ficheiros".
 *
 * Antes, os ficheiros do chat iam para o balde PÚBLICO "documents/chat-files/…"
 * (qualquer pessoa com o link abria). Os novos já vão para "chat_ficheiros/<conversa>/…".
 *
 * Três modos, por ordem (nada é apagado sem o 3.º passo):
 *   node scripts/migrar-ficheiros-chat.mjs                     → SIMULA: só mostra o que faria
 *   node scripts/migrar-ficheiros-chat.mjs --executar          → COPIA para o balde privado e
 *                                                                atualiza o link na mensagem
 *   node scripts/migrar-ficheiros-chat.mjs --apagar-originais  → apaga os originais públicos,
 *                                                                só os que já têm cópia confirmada
 *
 * Usa SUPABASE_SERVICE_ROLE_KEY e VITE_SUPABASE_URL (ou SUPABASE_URL) do .env.
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const URL_SB = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const CHAVE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_SB || !CHAVE) {
  console.error("Faltam VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY no .env.");
  process.exit(1);
}

const EXECUTAR = process.argv.includes("--executar");
const APAGAR = process.argv.includes("--apagar-originais");
const ORIGEM = "documents";
const DESTINO = "chat_ficheiros";
const PASTA = "chat-files/";
const RE = new RegExp(`/storage/v1/object/public/${ORIGEM}/(${PASTA}[^?#]+)`);

const sb = createClient(URL_SB, CHAVE, { auth: { persistSession: false } });

async function todasAsMensagensComFicheiro() {
  const linhas = [];
  for (let de = 0; ; de += 1000) {
    const { data, error } = await sb
      .from("chat_messages")
      .select("id, room_id, file_url, file_name")
      .not("file_url", "is", null)
      .order("id")
      .range(de, de + 999);
    if (error) throw error;
    linhas.push(...data);
    if (data.length < 1000) return linhas;
  }
}

async function todosOsOriginais() {
  const nomes = [];
  for (let de = 0; ; de += 1000) {
    const { data, error } = await sb.storage.from(ORIGEM).list(PASTA.slice(0, -1), { limit: 1000, offset: de });
    if (error) throw error;
    nomes.push(...data.filter((f) => f.id).map((f) => `${PASTA}${f.name}`));
    if (data.length < 1000) return nomes;
  }
}

const caminhoOrigem = (url) => {
  const m = RE.exec(String(url || ""));
  if (!m) return null;
  try { return decodeURIComponent(m[1]); } catch { return m[1]; }
};

async function existeNoDestino(caminho) {
  const pasta = caminho.split("/").slice(0, -1).join("/");
  const nome = caminho.split("/").pop();
  const { data } = await sb.storage.from(DESTINO).list(pasta, { search: nome, limit: 100 });
  return (data || []).some((f) => f.name === nome);
}

async function copiar() {
  const mensagens = await todasAsMensagensComFicheiro();
  const antigas = mensagens.filter((m) => caminhoOrigem(m.file_url));
  console.log(`${mensagens.length} mensagens com ficheiro; ${antigas.length} ainda no balde público.`);
  if (!EXECUTAR) console.log("(simulação: nada vai ser alterado; use --executar para copiar)\n");

  let ok = 0;
  let falhas = 0;
  for (const m of antigas) {
    const origem = caminhoOrigem(m.file_url);
    const destino = `${m.room_id}/${origem.slice(PASTA.length)}`;
    if (!m.room_id) {
      console.warn(`  ! mensagem ${m.id} sem conversa — ignorada`);
      falhas += 1;
      continue;
    }
    if (!EXECUTAR) {
      console.log(`  ${origem}  →  ${DESTINO}/${destino}`);
      continue;
    }
    try {
      if (!(await existeNoDestino(destino))) {
        const { data: blob, error: eDown } = await sb.storage.from(ORIGEM).download(origem);
        if (eDown) throw eDown;
        const { error: eUp } = await sb.storage.from(DESTINO).upload(destino, blob, {
          contentType: blob.type || "application/octet-stream",
          upsert: false,
        });
        if (eUp) throw eUp;
      }
      const novoUrl = sb.storage.from(DESTINO).getPublicUrl(destino).data.publicUrl;
      const { error: eUpd } = await sb.from("chat_messages").update({ file_url: novoUrl }).eq("id", m.id);
      if (eUpd) throw eUpd;
      ok += 1;
      console.log(`  ✓ ${m.file_name || origem}`);
    } catch (err) {
      falhas += 1;
      console.error(`  ✗ ${m.file_name || origem}: ${err?.message || err}`);
    }
  }
  if (EXECUTAR) console.log(`\nCopiados: ${ok}. Falhas: ${falhas}. Os originais continuam no balde público.`);
  console.log("Quando tiver confirmado no chat que os ficheiros abrem, corra com --apagar-originais.");
}

async function apagarOriginais() {
  const mensagens = await todasAsMensagensComFicheiro();
  const aindaUsados = new Set(mensagens.map((m) => caminhoOrigem(m.file_url)).filter(Boolean));
  // Ficheiros que já estão no balde privado e ligados a uma mensagem: "<conversa>/<nome>"
  const migrados = new Map();
  for (const m of mensagens) {
    const r = new RegExp(`/storage/v1/object/(?:public|sign|authenticated)/${DESTINO}/([^?#]+)`).exec(String(m.file_url || ""));
    if (r) migrados.set(`${PASTA}${decodeURIComponent(r[1]).split("/").pop()}`, decodeURIComponent(r[1]));
  }
  const originais = await todosOsOriginais();
  const apagar = [];
  for (const c of originais) {
    if (aindaUsados.has(c) || !migrados.has(c)) continue;
    if (await existeNoDestino(migrados.get(c))) apagar.push(c); // só com cópia confirmada
  }
  const soltos = originais.filter((c) => !aindaUsados.has(c) && !migrados.has(c)).length;
  console.log(`${originais.length} ficheiros em ${ORIGEM}/${PASTA}; ${aindaUsados.size} ainda usados por mensagens (ficam).`);
  if (soltos) console.log(`${soltos} sem mensagem associada (ficam; não são apagados).`);
  console.log(`Vão ser apagados ${apagar.length} originais com cópia confirmada no balde privado.`);
  for (let i = 0; i < apagar.length; i += 100) {
    const { error } = await sb.storage.from(ORIGEM).remove(apagar.slice(i, i + 100));
    if (error) throw error;
  }
  console.log("Feito.");
}

(APAGAR ? apagarOriginais() : copiar()).catch((err) => {
  console.error("Erro:", err?.message || err);
  process.exit(1);
});
