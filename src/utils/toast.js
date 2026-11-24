// =====================================================================
// Avisos flutuantes globais (toasts), com "Desfazer".
// Precisa de <ToastGlobal /> montado na App (components/ToastGlobal.jsx).
//
//   toast("Guardado.");                           // aviso simples
//   toast("Erro ao gravar.", { tipo: "erro" });
//
//   // Apagar com Desfazer: a interface tira o item logo; a base de dados só
//   // é alterada passados uns segundos, se ninguém carregar em Desfazer.
//   setLista((l) => l.filter((x) => x.id !== id));
//   toastDesfazer("Tarefa apagada.", {
//     executar: () => supabase.from("tarefas").delete().eq("id", id),
//     desfazer: () => setLista(antes),
//   });
//
//   // Desfazer de uma ação já feita (ex.: concluir): `executar` fica vazio e
//   // `desfazer` repõe o estado anterior na base de dados.
//
// Ctrl+Z (⌘Z) desfaz o último aviso com Desfazer que ainda esteja visível.
// =====================================================================

let mostrar = null;
let seq = 0;
/** Ações à espera do fim do prazo: id → { executar, desfazer, timer } */
const pendentes = new Map();

/**
 * Liga o <ToastGlobal /> a este módulo (só o ToastGlobal deve chamar).
 * @param {{ adicionar: Function, remover: Function }} api
 */
export function registarToasts(api) {
  mostrar = api;
  return () => { if (mostrar === api) mostrar = null; };
}

/**
 * Aviso simples.
 * @param {string} mensagem
 * @param {{ tipo?: "sucesso"|"erro"|"aviso"|"info"|"desfeito", duracao?: number }} [opcoes]
 * @returns {number} id do aviso
 */
let ultimo = { texto: "", em: 0 };

export function toast(mensagem, { tipo = "sucesso", duracao } = {}) {
  const id = ++seq;
  // O mesmo aviso duas vezes seguidas (ex.: efeito repetido do React) só aparece uma
  const texto = `${tipo}|${typeof mensagem === "string" ? mensagem : ""}`;
  if (typeof mensagem === "string" && texto === ultimo.texto && Date.now() - ultimo.em < 400) return id;
  ultimo = { texto, em: Date.now() };
  const ms = duracao ?? (tipo === "erro" || tipo === "aviso" ? 5500 : 3200);
  if (!mostrar) { if (tipo === "erro") console.warn(mensagem); return id; }
  mostrar.adicionar({ id, mensagem, tipo, duracao: ms });
  return id;
}

async function correr(fn) {
  if (!fn) return null;
  try {
    const r = await fn();
    return r && r.error ? r.error : null;
  } catch (e) {
    return e || new Error("falhou");
  }
}

/** Corre já a ação pendente de um aviso (fim do prazo ou aviso dispensado). */
async function confirmarPendente(id) {
  const p = pendentes.get(id);
  if (!p) return;
  pendentes.delete(id);
  clearTimeout(p.timer);
  mostrar?.remover(id);
  const erro = await correr(p.executar);
  if (erro) {
    console.error("Ação com Desfazer falhou:", erro);
    p.desfazer?.();
    toast("Não foi possível concluir. Foi reposto.", { tipo: "erro" });
    p.resolver("erro");
  } else {
    p.resolver("executado");
  }
}

/** Carregou em Desfazer: cancela a ação e repõe a interface. */
export async function desfazerToast(id) {
  const p = pendentes.get(id);
  if (!p) return;
  pendentes.delete(id);
  clearTimeout(p.timer);
  mostrar?.remover(id);
  const erro = await correr(p.desfazer);
  if (erro) toast("Não foi possível desfazer.", { tipo: "erro" });
  else toast("Desfeito.", { tipo: "desfeito", duracao: 1800 });
  p.resolver("desfeito");
}

/** O aviso foi fechado (arrastado / botão fechar): a ação avança já. */
export const dispensarToast = (id) => {
  if (pendentes.has(id)) confirmarPendente(id);
  else mostrar?.remover(id);
};

/** Pausa/retoma a contagem de um aviso com Desfazer (rato por cima, dedo a tocar). */
export function pausarToast(id, pausar) {
  const p = pendentes.get(id);
  if (!p) return;
  if (pausar) {
    clearTimeout(p.timer);
    p.restante = Math.max(1200, p.fimEm - Date.now());
  } else {
    p.fimEm = Date.now() + p.restante;
    p.timer = setTimeout(() => confirmarPendente(id), p.restante);
  }
}

/**
 * Aviso com botão Desfazer.
 * @param {string} mensagem
 * @param {object} opcoes
 * @param {() => any} [opcoes.executar] o que fazer no fim do prazo (ex.: apagar na base de dados).
 *   Pode devolver { error } (resposta do Supabase). Se falhar, `desfazer` é chamado.
 * @param {() => any} opcoes.desfazer repõe o estado anterior (interface e, se preciso, base de dados)
 * @param {number} [opcoes.duracao=6000]
 * @returns {Promise<"executado"|"desfeito"|"erro">}
 */
export function toastDesfazer(mensagem, { executar, desfazer, duracao = 6000 } = {}) {
  const id = ++seq;
  return new Promise((resolver) => {
    if (!mostrar) {
      // Sem o componente montado: faz já, sem Desfazer
      correr(executar).then((e) => resolver(e ? "erro" : "executado"));
      return;
    }
    const p = { executar, desfazer, resolver, fimEm: Date.now() + duracao, restante: duracao };
    p.timer = setTimeout(() => confirmarPendente(id), duracao);
    pendentes.set(id, p);
    mostrar.adicionar({ id, mensagem, tipo: "desfazer", duracao });
  });
}

/** Último aviso com Desfazer ainda à espera (para o Ctrl+Z). */
export const ultimoPendente = () => [...pendentes.keys()].pop();

// Se a página for fechada/recarregada com ações à espera, executa-as já
// (melhor esforço: o browser pode cortar o pedido; nesse caso o item volta a aparecer).
if (typeof window !== "undefined") {
  window.addEventListener("pagehide", () => {
    [...pendentes.keys()].forEach((id) => confirmarPendente(id));
  });
}
