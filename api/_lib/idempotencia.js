// =====================================================================
// Idempotência: o mesmo pedido, repetido, só é feito uma vez.
// O browser manda o cabeçalho `Idempotency-Key` (em src/utils/idempotencia.js é
// uma impressão digital do conteúdo). Guardamos a chave em
// public.pedidos_idempotentes (migração 081):
//   - 1.ª vez: marca 'em_curso', faz o trabalho, guarda a resposta ('feito');
//   - repetição com resposta guardada (dentro de JANELA_MS): devolve-a com
//     `repetido: true`, SEM voltar a fazer o trabalho (ex.: sem reenviar emails);
//   - repetição enquanto a 1.ª ainda decorre: erro 409;
//   - se o trabalho falhar, a chave é apagada (pode tentar-se de novo).
// Sem cabeçalho, sem chave de serviço ou sem a tabela (migração por correr),
// faz o trabalho normalmente (não bloqueia nada).
// =====================================================================
import { ErroHttp } from "./seguranca.js";

const TABELA = "pedidos_idempotentes";
/** Durante quanto tempo um pedido igual conta como repetição. */
const JANELA_MS = 15 * 60 * 1000;
/** Um 'em_curso' mais antigo do que isto é dado como morto (ex.: função cortada por tempo). */
const EM_CURSO_MORTO_MS = 3 * 60 * 1000;

const tabelaEmFalta = (e) => e?.code === "42P01" || e?.code === "PGRST205" || /does not exist|schema cache/i.test(e?.message || "");

/**
 * Corre `trabalho` uma única vez por chave.
 * @param {object} req pedido (lê o cabeçalho Idempotency-Key)
 * @param {{ admin: object|null, user: { id: string } }} ctx de autenticar()
 * @param {string} tipo ex.: "campanha_marketing"
 * @param {() => Promise<object>} trabalho devolve o JSON da resposta
 * @returns {Promise<object>}
 */
export async function umaVez(req, ctx, tipo, trabalho) {
  const bruta = String(req.headers?.["idempotency-key"] || "").trim();
  const admin = ctx?.admin;
  if (!bruta || !admin || !ctx?.user?.id) return trabalho();

  const chave = `${ctx.user.id}:${tipo}:${bruta.slice(0, 128)}`;
  const agora = Date.now();

  // Limpeza: chaves antigas (de toda a gente) e esta, se já passou a janela
  await admin.from(TABELA).delete().lt("criado_em", new Date(agora - 24 * 3600 * 1000).toISOString());
  await admin.from(TABELA).delete().eq("chave", chave).lt("criado_em", new Date(agora - JANELA_MS).toISOString());

  const ins = await admin.from(TABELA).insert({ chave, user_id: ctx.user.id, tipo, estado: "em_curso" });
  if (ins.error) {
    if (tabelaEmFalta(ins.error)) {
      console.warn("[idempotencia] tabela pedidos_idempotentes em falta (correr a migração 081)");
      return trabalho();
    }
    if (ins.error.code !== "23505") return trabalho(); // outro erro: não bloqueia

    // Já existe: repetição
    const { data } = await admin.from(TABELA).select("estado, resposta, criado_em").eq("chave", chave).maybeSingle();
    if (data?.estado === "feito" && data.resposta) {
      return { ...data.resposta, repetido: true, repetidoDesde: data.criado_em };
    }
    const idade = data ? agora - new Date(data.criado_em).getTime() : Infinity;
    if (idade < EM_CURSO_MORTO_MS) {
      throw new ErroHttp(409, "Este envio já está a ser feito. Aguarda uns segundos antes de tentar de novo.");
    }
    // 'em_curso' morto: assume-o e continua
    await admin.from(TABELA).update({ criado_em: new Date().toISOString() }).eq("chave", chave);
  }

  try {
    const out = await trabalho();
    await admin.from(TABELA).update({ estado: "feito", resposta: out }).eq("chave", chave);
    return out;
  } catch (e) {
    await admin.from(TABELA).delete().eq("chave", chave);
    throw e;
  }
}
