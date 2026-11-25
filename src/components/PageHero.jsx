// =====================================================================
// CABEÇALHO DE PÁGINA comum (o mesmo em todas as páginas).
// Faixa na cor do tema (as cores da sidebar), com ícone, sobretítulo,
// título, subtítulo, chips de números, ações à direita e, por baixo,
// uma linha de ferramentas (pesquisa, filtros, separadores).
// Estilos: styles/page-hero.css. Os cabeçalhos antigos das páginas
// (tk-hero, rh-hero, mk-hero…) recebem o mesmo aspeto via styles/cabecalhos.css.
// Mantém-se montado entre vistas da mesma página: a animação de entrada só
// corre na primeira vez (ao mudar o conteúdo não "salta").
//
//   <PageHero
//     icon={<Icons.BookOpen size={24} />}
//     kicker="Formação"
//     title="Cursos"
//     subtitle="Conteúdos e módulos formativos"
//     stats={[{ valor: 12, label: "ativos" }, { valor: 3, label: "rascunhos" }]}
//     side={<button className="page-hero-btn" onClick={novo}>Novo curso</button>}
//     tools={<input …/>}
//   />
// =====================================================================
import "../styles/page-hero.css";

/**
 * @param {object} p
 * @param {React.ReactNode} [p.icon]     ícone (24px) no quadrado à esquerda
 * @param {React.ReactNode} [p.kicker]   texto pequeno por cima do título (pode ser um breadcrumb)
 * @param {React.ReactNode} p.title      título (é o único <h1> da página)
 * @param {React.ReactNode} [p.subtitle] subtítulo
 * @param {{ valor: React.ReactNode, label: React.ReactNode, titulo?: string }[]} [p.stats] chips de números
 * @param {React.ReactNode} [p.side]     botões à direita (usar className="page-hero-btn" / "page-hero-btn is-vidro")
 * @param {React.ReactNode} [p.tools]    linha de ferramentas por baixo, separada por uma linha fina
 * @param {React.ReactNode} [p.children] conteúdo livre por baixo
 */
export default function PageHero({ icon, kicker, title, subtitle, stats, side, tools, children, className = "" }) {
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
        {(side || stats?.length > 0) && (
          <div className="page-hero-side">
            {stats?.map((s, i) => (
              <span key={i} className="page-hero-chip" title={s.titulo}><strong>{s.valor}</strong> {s.label}</span>
            ))}
            {side}
          </div>
        )}
      </div>
      {tools && <div className="page-hero-tools">{tools}</div>}
      {children}
    </header>
  );
}
