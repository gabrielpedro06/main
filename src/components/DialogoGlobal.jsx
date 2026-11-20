import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { registarDialogo } from "../utils/dialogo";
import "../styles/dialogo.css";

// Caixa de confirmação/aviso do Bizin (substitui window.confirm e window.alert).
// Montada uma vez na App; usa-se com confirmar(...) e avisar(...) de utils/dialogo.
/**
 * Sem props. Só existe um pedido de cada vez (um segundo confirmar() substitui o primeiro).
 * Enter/clique no botão principal → true; Esc, Cancelar ou clique fora → false.
 * Camada: --z-dialogo (dialogo.css).
 */
export default function DialogoGlobal() {
  const [pedido, setPedido] = useState(null); // { tipo, titulo, mensagem, botao, perigoso, resolver }
  const botaoRef = useRef(null);

  useEffect(() => registarDialogo(setPedido), []);

  useEffect(() => {
    if (!pedido) return undefined;
    botaoRef.current?.focus();
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      pedido.resolver(false);
      setPedido(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pedido]);

  function fechar(valor) {
    pedido?.resolver(valor);
    setPedido(null);
  }

  if (!pedido) return null;
  const aviso = pedido.tipo === "aviso";

  return createPortal(
    <div className="dlg-overlay" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) fechar(false); }}>
      <div className="dlg-box" role={aviso ? "alertdialog" : "dialog"} aria-modal="true" aria-labelledby="dlg-titulo" aria-describedby="dlg-msg">
        <span className={`dlg-icon ${pedido.perigoso ? "is-danger" : aviso ? "is-info" : ""}`} aria-hidden="true">
          {pedido.perigoso ? "!" : aviso ? "i" : "?"}
        </span>
        <h2 id="dlg-titulo">{pedido.titulo}</h2>
        {pedido.mensagem && <p id="dlg-msg">{pedido.mensagem}</p>}
        <div className="dlg-actions">
          {!aviso && (
            <button type="button" className="dlg-btn is-ghost" onClick={() => fechar(false)}>Cancelar</button>
          )}
          <button
            ref={botaoRef}
            type="button"
            className={`dlg-btn ${pedido.perigoso ? "is-danger" : "is-primary"}`}
            onClick={() => fechar(true)}
          >
            {pedido.botao || (aviso ? "Entendido" : "Confirmar")}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
