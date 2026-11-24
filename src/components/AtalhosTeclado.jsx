// =====================================================================
// Atalhos de teclado globais + janela "?" que os mostra todos.
//   ?          → abre/fecha esta janela (também pelo Command Menu: "Atalhos de teclado")
//   G e depois uma letra (até 1,2 s) → salta para uma página (G P = Projetos…)
// Os atalhos de letra só funcionam fora de campos de texto e sem janelas abertas.
// No telemóvel não há teclado físico: nada disto aparece.
// Estilos: styles/command-menu.css (secção "Atalhos", .at-*). Montado em pages/Dashboard.jsx.
// =====================================================================
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ATALHO_COMANDO } from "../utils/comando";
import { navegarComTransicao } from "../utils/transicaoPagina";
import { prefetchRota } from "../rotas";

const eMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
const CTRL = eMac ? "⌘" : "Ctrl";
const GESTAO = ["admin", "administrador", "gestor"];

/** G + letra → página (os papéis espelham as rotas de App.jsx). */
const IR_PARA = [
  { tecla: "i", rota: "/dashboard", titulo: "Início" },
  { tecla: "a", rota: "/dashboard/minhas-tarefas", titulo: "Agenda" },
  { tecla: "t", rota: "/dashboard/tarefas", titulo: "Tarefas globais" },
  { tecla: "p", rota: "/dashboard/projetos", titulo: "Projetos" },
  { tecla: "e", rota: "/dashboard/clientes", titulo: "Entidades" },
  { tecla: "c", rota: "/dashboard/forum", titulo: "Comunicação" },
  { tecla: "f", rota: "/dashboard/ferias", titulo: "Ausências (férias)" },
  { tecla: "k", rota: "/dashboard/pedido-km", titulo: "Pedido de Km" },
  { tecla: "m", rota: "/dashboard/perfil", titulo: "O meu perfil" },
  { tecla: "h", rota: "/dashboard/ajuda", titulo: "Ajuda" },
  { tecla: "r", rota: "/dashboard/rh", titulo: "Recursos Humanos", papeis: GESTAO },
];

const GERAIS = [
  { teclas: [CTRL, "K"], texto: "Pesquisar e saltar para qualquer sítio" },
  { teclas: ["?"], texto: "Mostrar esta lista de atalhos" },
  { teclas: [CTRL, "Z"], texto: "Desfazer a última ação (enquanto o aviso Desfazer está visível)" },
  { teclas: ["Esc"], texto: "Fechar a janela aberta" },
];

const NESTA_PAGINA = [
  { teclas: ["/"], texto: "Ajuda: ir para a pesquisa" },
  { teclas: ["Enter"], texto: "Comunicação: enviar mensagem" },
  { teclas: ["Shift", "Enter"], texto: "Comunicação: nova linha na mensagem" },
  { teclas: ["↑", "↓", "Enter"], texto: "Pesquisa (Ctrl K): escolher e abrir" },
];

const normalizar = (t) => String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** O utilizador está a escrever (campo de texto, editor…)? */
const aEscrever = (alvo) => {
  const tag = (alvo?.tagName || "").toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select" || !!alvo?.isContentEditable;
};

/** Há uma janela/modal aberta (não queremos mudar de página por baixo dela)? */
const janelaAberta = () => !!document.querySelector('[role="dialog"], [aria-modal="true"], .cm-fundo, [data-janela]');

const Teclas = ({ teclas }) => (
  <span className="at-teclas">
    {teclas.map((t, i) => <kbd key={i}>{t}</kbd>)}
  </span>
);

export default function AtalhosTeclado() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [aberto, setAberto] = useState(false);
  const [dica, setDica] = useState(false); // "G…" à espera da 2.ª tecla
  const espera = useRef(null);
  const focoAntes = useRef(null);
  const caixaRef = useRef(null);

  const papel = normalizar(userProfile?.role || userProfile?.tipo);
  const destinos = IR_PARA.filter((d) => !d.papeis || d.papeis.includes(papel));

  const abrir = useCallback(() => {
    focoAntes.current = document.activeElement;
    setAberto(true);
  }, []);
  const fechar = useCallback(() => {
    setAberto(false);
    setTimeout(() => focoAntes.current?.focus?.(), 0);
  }, []);

  const cancelarEspera = () => {
    clearTimeout(espera.current);
    espera.current = null;
    setDica(false);
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return;
      if (aEscrever(e.target)) return;

      if (aberto) {
        if (e.key === "Escape" || e.key === "?") { e.preventDefault(); fechar(); }
        return;
      }

      if (e.key === "?") {
        if (janelaAberta()) return;
        e.preventDefault();
        cancelarEspera();
        abrir();
        return;
      }

      const k = e.key?.toLowerCase();
      if (espera.current) {
        const d = destinos.find((x) => x.tecla === k);
        cancelarEspera();
        if (d) {
          e.preventDefault();
          navegarComTransicao(navigate, d.rota);
        }
        return;
      }
      if (k === "g" && !e.shiftKey && !janelaAberta()) {
        setDica(true);
        espera.current = setTimeout(cancelarEspera, 1200);
      }
    };
    const onEvento = () => abrir();
    window.addEventListener("keydown", onKey);
    window.addEventListener("bz:atalhos", onEvento);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("bz:atalhos", onEvento);
    };
  }, [aberto, abrir, fechar, destinos, navigate]);

  useEffect(() => () => clearTimeout(espera.current), []);

  // Foco na janela ao abrir (Esc e Tab funcionam logo)
  useEffect(() => {
    if (aberto) caixaRef.current?.focus();
  }, [aberto]);

  return (
    <>
      {dica && !aberto && (
        <div className="at-dica" role="status" aria-live="polite">
          <kbd>G</kbd> + {destinos.slice(0, 5).map((d) => (
            <span key={d.tecla} onMouseEnter={() => prefetchRota(d.rota)}><kbd>{d.tecla.toUpperCase()}</kbd> {d.titulo}</span>
          ))} <span className="at-dica-mais">· ? para ver todos</span>
        </div>
      )}
      {aberto && createPortal(
        <div className="cm-fundo at-fundo" onMouseDown={(e) => { if (e.target === e.currentTarget) fechar(); }}>
          <div
            className="cm-caixa at-caixa"
            role="dialog"
            aria-modal="true"
            aria-labelledby="at-titulo"
            tabIndex={-1}
            ref={caixaRef}
            onKeyDown={(e) => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); fechar(); } }}
          >
            <div className="at-topo">
              <h2 id="at-titulo">Atalhos de teclado</h2>
              <button type="button" className="cm-fechar hit-slop" onClick={fechar} aria-label="Fechar"><kbd>Esc</kbd></button>
            </div>
            <div className="at-corpo">
              <section>
                <h3>Gerais</h3>
                <ul>{GERAIS.map((a) => <li key={a.texto}><span>{a.texto}</span><Teclas teclas={a.teclas} /></li>)}</ul>
              </section>
              <section>
                <h3>Ir para… <small>(carrega G e depois a letra)</small></h3>
                <ul>
                  {destinos.map((d) => (
                    <li key={d.tecla}>
                      <button type="button" className="at-link" onClick={() => { fechar(); navegarComTransicao(navigate, d.rota); }} onMouseEnter={() => prefetchRota(d.rota)}>
                        {d.titulo}
                      </button>
                      <Teclas teclas={["G", d.tecla.toUpperCase()]} />
                    </li>
                  ))}
                </ul>
              </section>
              <section>
                <h3>Em páginas específicas</h3>
                <ul>{NESTA_PAGINA.map((a) => <li key={a.texto}><span>{a.texto}</span><Teclas teclas={a.teclas} /></li>)}</ul>
              </section>
            </div>
            <div className="cm-rodape" aria-hidden="true">
              <span>Os atalhos de letras não funcionam enquanto escreves num campo.</span>
              <span className="cm-rodape-dir"><kbd>{ATALHO_COMANDO}</kbd> pesquisa</span>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
