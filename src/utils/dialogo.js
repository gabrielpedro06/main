// Confirmações e avisos no estilo do Bizin (em vez de window.confirm / window.alert).
//   if (!(await confirmar("Apagar este registo?", { perigoso: true, botao: "Apagar" }))) return;
//   await avisar("Não foi possível abrir o ficheiro.");
// Precisa de <DialogoGlobal /> montado na App; sem ele, usa o diálogo do browser.

let mostrar = null;

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

export const confirmar = (titulo, opcoes) => abrir("confirmar", titulo, opcoes);
export const avisar = (titulo, opcoes) => abrir("aviso", titulo, opcoes);
