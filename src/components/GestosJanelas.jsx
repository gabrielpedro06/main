// =====================================================================
// Gestos das janelas no telemóvel, para TODAS as janelas da app de uma vez:
//
// 1. "Voltar" fecha a janela (predictive back): quando uma janela abre, é
//    acrescentado um passo ao histórico do browser. O botão/gesto "voltar" do
//    Android/iPhone fecha a janela em vez de sair da página.
// 2. Arrastar para baixo fecha (swipe-to-dismiss): a caixa da janela segue o
//    dedo; largada longe o suficiente, fecha.
//
// Como funciona sem mexer em cada janela: um MutationObserver vê quando aparece
// um elemento com uma das classes de fundo de janela (JANELAS). Para fechar,
// simula o que o utilizador faria: tecla Esc e, se não chegar, um clique no
// fundo escuro. Janelas que não fecham assim (p. ex. formulários que pedem
// confirmação) simplesmente ficam abertas.
// Para uma janela nova entrar nisto: usar uma classe que termine em "-overlay"
// listada em utils/janelas.js, ou pôr o atributo data-janela no fundo.
// Para uma janela ficar de fora: atributo data-sem-gestos no fundo.
// Montado em pages/Dashboard.jsx. Só atua em ecrãs ≤ 900px ou de toque.
// =====================================================================
import { useEffect } from "react";
import { arrastarParaFechar } from "../utils/gestos";
import { SELETOR_JANELAS as SELETOR } from "../utils/janelas";

const MEDIA = "(max-width: 900px), (pointer: coarse)";

/** Janelas sem caixa própria dentro do fundo (o fundo é irmão do painel): só "voltar". */
const SO_VOLTAR = new Set(["bz-account-backdrop", "np-backdrop", "fs-backdrop", "cal-overlay"]);

/** Fecha uma janela como o utilizador faria: Esc e, se não chegar, clique no fundo. */
function fecharJanela(el) {
  el.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", code: "Escape", bubbles: true, cancelable: true }));
  setTimeout(() => {
    if (!el.isConnected) return;
    const op = { bubbles: true, cancelable: true, view: window };
    el.dispatchEvent(new MouseEvent("mousedown", op));
    el.dispatchEvent(new MouseEvent("mouseup", op));
    el.dispatchEvent(new MouseEvent("click", op));
  }, 40);
}

export default function GestosJanelas() {
  useEffect(() => {
    const mq = window.matchMedia(MEDIA);
    const registos = new Map(); // el → { id, desligar }
    const pilha = []; // [{ id, el }] pela ordem em que abriram
    let seq = 0;
    let ignorarPop = 0;

    const empurrar = (el) => {
      const id = ++seq;
      // mantém o estado do React Router (key/idx) e marca o passo como "desta janela"
      window.history.pushState({ ...(window.history.state || {}), bzJanela: id }, "");
      pilha.push({ id, el });
      return id;
    };

    const registar = (el) => {
      if (registos.has(el) || el.classList.contains("bz-janela-fantasma") || el.closest("[data-sem-gestos]") || !mq.matches) return;
      const st = getComputedStyle(el);
      if (st.display === "none" || st.visibility === "hidden") return;

      const id = empurrar(el);
      let desligar = null;
      const caixa = el.firstElementChild;
      const soVoltar = [...el.classList].some((c) => SO_VOLTAR.has(c));
      if (caixa && !soVoltar && !el.classList.contains("cm-fundo")) {
        desligar = arrastarParaFechar(caixa, { eixo: "y", sentido: 1, fundo: el, aoFechar: () => { el.dataset.fechadoPorGesto = ""; fecharJanela(el); } });
      }
      registos.set(el, { id, desligar });
    };

    const esquecer = (el) => {
      const r = registos.get(el);
      if (!r) return;
      registos.delete(el);
      r.desligar?.();
      const i = pilha.findIndex((p) => p.el === el);
      if (i < 0) return;
      const { id } = pilha[i];
      pilha.splice(i, 1);
      // Fechou pela interface: tira o passo extra do histórico (só se ainda for o atual,
      // para não desfazer uma navegação que tenha acontecido entretanto)
      if (window.history.state?.bzJanela === id) {
        ignorarPop += 1;
        window.history.back();
      }
    };

    const onPop = () => {
      if (ignorarPop > 0) { ignorarPop -= 1; return; }
      const topo = pilha.pop();
      if (!topo) return;
      const r = registos.get(topo.el);
      fecharJanela(topo.el);
      // Se a janela não fechou (ex.: pede confirmação), repõe o passo no histórico
      setTimeout(() => {
        if (topo.el.isConnected && r) r.id = empurrar(topo.el);
      }, 160);
    };

    const obs = new MutationObserver((muts) => {
      let removeu = false;
      for (const m of muts) {
        if (m.removedNodes.length) removeu = true;
        m.addedNodes.forEach((n) => {
          if (n.nodeType !== 1) return;
          if (n.matches(SELETOR)) registar(n);
          if (n.firstElementChild) n.querySelectorAll(SELETOR).forEach(registar);
        });
      }
      if (removeu) registos.forEach((_, el) => { if (!el.isConnected) esquecer(el); });
    });

    obs.observe(document.body, { childList: true, subtree: true });
    document.querySelectorAll(SELETOR).forEach(registar);
    window.addEventListener("popstate", onPop);
    return () => {
      obs.disconnect();
      window.removeEventListener("popstate", onPop);
      registos.forEach((r) => r.desligar?.());
    };
  }, []);

  return null;
}
