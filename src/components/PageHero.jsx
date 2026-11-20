// Cabeçalho escuro de página (mesmo visual de adm-hero / rg-hero), em componente
// partilhado. Estilos em src/styles/page-hero.css (cores vêm do tema).
// Mantém-se montado entre vistas da mesma página, por isso a animação de entrada
// só corre na primeira vez (ao mudar o conteúdo não "salta").
import "../styles/page-hero.css";

/**
 * @param {object} p
 * @param {React.ReactNode} [p.icon]     ícone (24px) no quadrado à esquerda
 * @param {React.ReactNode} [p.kicker]   texto pequeno por cima do título (pode ser um breadcrumb)
 * @param {React.ReactNode} p.title      título (é o único <h1> da página)
 * @param {React.ReactNode} [p.subtitle] subtítulo
 * @param {React.ReactNode} [p.side]     chips/botões à direita
 * @param {React.ReactNode} [p.children] conteúdo por baixo (pesquisa, filtros…)
 */
export default function PageHero({ icon, kicker, title, subtitle, side, children, className = "" }) {
  return (
    <header className={`page-hero ${className}`.trim()}>
      <span className="page-hero-orb is-a" aria-hidden="true" />
      <span className="page-hero-orb is-b" aria-hidden="true" />
      <div className="page-hero-row">
        <div className="page-hero-main">
          {icon && <span className="page-hero-icon" aria-hidden="true">{icon}</span>}
          <div className="page-hero-txt">
            {kicker && <span className="page-hero-kicker">{kicker}</span>}
            <h1>{title}</h1>
            {subtitle && <p>{subtitle}</p>}
          </div>
        </div>
        {side && <div className="page-hero-side">{side}</div>}
      </div>
      {children}
    </header>
  );
}
