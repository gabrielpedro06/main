// =====================================================================
// Stale-while-revalidate para as páginas: guarda em memória os últimos dados
// carregados de uma página. Ao voltar a ela, mostra-os logo (sem spinner) e
// atualiza por trás com os dados frescos do Supabase.
//
//   const [projetos, setProjetos] = useState(() => lerCache("projetos")?.projetos || []);
//   const [loading, setLoading] = useState(() => !lerCache("projetos"));
//   ... no fim do fetch: guardarCache("projetos", { projetos, ... });
//
// Fica só em memória (desaparece com F5) e é apagada ao terminar sessão,
// para nunca mostrar dados de uma conta a outra.
// =====================================================================
import { supabase } from "../services/supabase";

const cache = new Map();

/** Dados guardados de uma página (ou undefined). */
export const lerCache = (chave) => cache.get(chave)?.dados;

/** Guarda os dados de uma página. */
export const guardarCache = (chave, dados) => cache.set(chave, { dados, em: Date.now() });

/** Apaga uma página (ou tudo, sem argumento). */
export const limparCache = (chave) => (chave ? cache.delete(chave) : cache.clear());

// Ao terminar sessão (ou mudar de conta), esquece tudo
let ultimoUser = null;
supabase.auth.onAuthStateChange((evento, sessao) => {
  const id = sessao?.user?.id || null;
  if (evento === "SIGNED_OUT" || (ultimoUser && id && id !== ultimoUser)) cache.clear();
  if (id) ultimoUser = id;
});
