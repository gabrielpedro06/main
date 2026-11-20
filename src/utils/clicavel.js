// Torna um elemento que não é <button> (cartão, linha de tabela, chip) utilizável
// com o teclado: recebe foco com Tab e responde a Enter e Espaço, como um botão.
//   <div {...clicavel(() => abrir(id))} className="card">…</div>
//   <tr {...clicavel(() => abrir(id), { papel: null })}>…</tr>   (mantém a semântica da tabela)

/**
 * Props de acessibilidade para tornar um elemento qualquer "clicável" por teclado.
 * @param {(e: Event) => void} acao  chamada no clique, Enter ou Espaço
 * @param {{ papel?: string|null }} [opcoes] papel ARIA (null = não define `role`)
 * @returns {{ role?: string, tabIndex: number, onClick: Function, onKeyDown: Function }}
 */
export function clicavel(acao, { papel = "button" } = {}) {
  return {
    ...(papel ? { role: papel } : {}),
    tabIndex: 0,
    onClick: acao,
    onKeyDown: (e) => {
      // Só quando o foco está no próprio elemento (não num campo ou botão lá dentro)
      if (e.target !== e.currentTarget) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        acao?.(e);
      }
    },
  };
}
