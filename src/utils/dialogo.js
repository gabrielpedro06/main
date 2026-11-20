// Confirmações e avisos no estilo do Bizin (em vez de window.confirm / window.alert).
//   if (!(await confirmar("Apagar este registo?", { perigoso: true, botao: "Apagar" }))) return;
//   await avisar("Não foi possível abrir o ficheiro.");
// Precisa de <DialogoGlobal /> montado na App; sem ele, usa o diálogo do browser.

let mostrar = null;

/**
 * Liga o componente <DialogoGlobal /> a este módulo (só o DialogoGlobal deve chamar).
 * @param {(pedido: object) => void} fn setter de estado do componente
 * @returns {() => void} função para desligar (cleanup do useEffect)
 */
export function registarDialogo(fn) {
  mostrar = fn;
  return () => { if (mostrar === fn) mostrar = null; };
}

function abrir(tipo, titulo, { mensagem = "", botao = "", perigoso = false } = {}) {
  if (!mostrar) {
    if (tipo === "aviso") { window.alert(titulo); return Promise.resolve(true); }
    return Promise.resolve(window.confirm(titulo));
  }
  return new Promise((resolver) => mostrar({ tipo, titulo, mensagem, botao, perigoso, resolver }));
}

/**
 * Pergunta de confirmação (Cancelar / Confirmar). Esc ou clique fora = false.
 * @param {string} titulo
 * @param {{ mensagem?: string, botao?: string, perigoso?: boolean }} [opcoes]
 *   perigoso = botão vermelho (apagar, desativar…)
 * @returns {Promise<boolean>}
 */
export const confirmar = (titulo, opcoes) => abrir("confirmar", titulo, opcoes);

/**
 * Aviso só com um botão ("Entendido" por omissão). Resolve quando é fechado.
 * @param {string} titulo
 * @param {{ mensagem?: string, botao?: string }} [opcoes]
 * @returns {Promise<boolean>}
 */
export const avisar = (titulo, opcoes) => abrir("aviso", titulo, opcoes);
