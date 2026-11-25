// =====================================================================
// <select> moderno com a MESMA forma de usar que o <select> do browser:
//
//   <SelectModerno value={x} onChange={(e) => setX(e.target.value)} className="pd-input">
//     <option value="">— Nenhum —</option>
//     <optgroup label="Equipa">{pessoas.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}</optgroup>
//   </SelectModerno>
//
// Por dentro usa o FancySelect (menu bonito, pesquisa com 7+ opções, teclado).
// Serve para trocar <select> antigos sem reescrever as opções: lê os <option>
// e <optgroup> (também dentro de fragmentos/arrays), e chama onChange com um
// "evento" { target: { value } } como o nativo (valor sempre em texto).
// `required` continua a funcionar (campo escondido para a validação do form).
// =====================================================================
import { Children, Fragment, isValidElement } from "react";
import FancySelect from "./FancySelect";

/** Texto de um nó React (para o label da opção). */
function texto(no) {
  return Children.toArray(no)
    .map((c) => (typeof c === "string" || typeof c === "number" ? String(c) : isValidElement(c) ? texto(c.props.children) : ""))
    .join("");
}

/** Lê <option>/<optgroup> → opções do FancySelect. */
function recolher(children, grupo, out, valorAtual) {
  Children.forEach(children, (c) => {
    if (!isValidElement(c)) return;
    if (c.type === Fragment) { recolher(c.props.children, grupo, out, valorAtual); return; }
    if (c.type === "optgroup") { recolher(c.props.children, c.props.label, out, valorAtual); return; }
    if (c.type !== "option") return;
    const label = texto(c.props.children).trim();
    const value = c.props.value !== undefined ? String(c.props.value) : label;
    // opções desativadas só aparecem se forem a escolhida (o FancySelect não as tem)
    if (c.props.disabled && value !== String(valorAtual ?? "")) return;
    out.push({ value, label: label || "—", group: grupo });
  });
}

/**
 * @param {object} props mesmas props de um <select> (value, onChange, disabled, required, className, title, aria-label, style)
 * @param {number} [props.menuWidth] largura mínima do menu
 */
export default function SelectModerno({ value, onChange, children, disabled, required, className = "", title, style, menuWidth, placeholder, name, id, ...resto }) {
  const opcoes = [];
  recolher(children, undefined, opcoes, value);
  const atual = value == null ? "" : String(value);
  const vazia = opcoes.find((o) => o.value === "");
  // Do style antigo (feito para o <select>) só interessa a posição/largura; o aspeto é do FancySelect
  const layout = {};
  if (style) {
    for (const k of ["margin", "marginTop", "marginBottom", "marginLeft", "marginRight", "width", "minWidth", "maxWidth", "flex", "flexBasis", "flexGrow", "flexShrink", "gridColumn"]) {
      if (style[k] !== undefined) layout[k] = style[k];
    }
  }

  return (
    // o invólucro não ocupa espaço (display: contents): o botão fica no layout exatamente onde estava o <select>
    <span className="sm-wrap" title={title}>
      <FancySelect
        value={atual}
        onChange={(v) => onChange?.({ target: { value: String(v ?? ""), name, id }, currentTarget: { value: String(v ?? "") } })}
        options={opcoes}
        disabled={disabled}
        className={`sm-trigger ${className.replace("input-focus", "")}`}
        placeholder={placeholder || vazia?.label || "Selecionar…"}
        ariaLabel={resto["aria-label"] || title}
        menuWidth={menuWidth}
        style={Object.keys(layout).length ? layout : undefined}
        id={id}
      />
      {required && (
        <input
          className="sm-validacao"
          tabIndex={-1}
          aria-hidden="true"
          required
          value={atual}
          onChange={() => {}}
          name={name}
        />
      )}
    </span>
  );
}
