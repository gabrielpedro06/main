// Esqueletos de carregamento reutilizáveis (estilos em styles/skeleton.css).
// <PaginaSkeleton /> aparece enquanto o ficheiro de uma página é descarregado;
// <ListaSkeleton /> e <CartoesSkeleton /> servem para listas e grelhas a carregar dados.
import "../styles/skeleton.css";

/** Lista de linhas com avatar (ex.: tabela de colaboradores, entidades). */
export function ListaSkeleton({ linhas = 6, avatar = true }) {
  return (
    <div className="sk-tabela" aria-hidden="true">
      {Array.from({ length: linhas }, (_, i) => (
        <div key={i} className="sk-fila">
          {avatar && <span className="sk sk-avatar" />}
          <div className="sk-linhas">
            <span className={`sk sk-linha ${i % 2 ? "is-40" : "is-60"}`} />
            <span className="sk sk-linha is-40" style={{ height: 9, opacity: 0.7 }} />
          </div>
          <span className="sk sk-linha" style={{ width: 72 }} />
        </div>
      ))}
    </div>
  );
}

/** Grelha de cartões (ex.: projetos, cursos). */
export function CartoesSkeleton({ cartoes = 6 }) {
  return (
    <div className="sk-cartoes" aria-hidden="true">
      {Array.from({ length: cartoes }, (_, i) => (
        <div key={i} className="sk-cartao">
          <span className="sk sk-titulo" />
          <span className="sk sk-linha is-80" />
          <span className="sk sk-linha is-60" />
          <span className="sk sk-linha is-40" style={{ marginTop: 6 }} />
        </div>
      ))}
    </div>
  );
}

/** Página genérica: cabeçalho, barra de filtros e conteúdo. */
export default function PaginaSkeleton() {
  return (
    <div className="sk-pagina" role="status" aria-label="A carregar a página">
      <span className="sk sk-hero" />
      <div className="sk-barra" aria-hidden="true">
        <span className="sk" />
        <span className="sk" />
        <span className="sk" />
      </div>
      <CartoesSkeleton cartoes={3} />
      <ListaSkeleton linhas={4} />
    </div>
  );
}
