// =====================================================================
// Ajuda — manual de utilizador dentro da app (/#/dashboard/ajuda).
// O conteúdo vive em src/content/ajuda/*.js (um ficheiro por área) e é
// agregado em src/content/ajuda/index.js. Cada secção/tarefa/FAQ pode ter
// `papeis: [...]`; quem não tem esse papel não a vê (é só arrumação — a
// proteção real das páginas está nas rotas e na base de dados).
// Deep link: ?s=<id da secção>  (ex.: /#/dashboard/ajuda?s=ausencias)
// =====================================================================
import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { BookOpen, Search, X, ChevronRight, ListChecks, LayoutPanelTop, CircleHelp, ArrowUpRight, Lightbulb } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { SECCOES_AJUDA, IconeAjuda } from "../content/ajuda";
import "../styles/ajuda.css";

/** Papel do utilizador em minúsculas (profiles.role, com fallback para tipo). */
const papelDe = (perfil) => String(perfil?.role || perfil?.tipo || "").toLowerCase().trim();

/** true se o item não tiver restrição de papéis ou se o papel constar da lista. */
const podeVer = (papeis, papel) => !Array.isArray(papeis) || papeis.length === 0 || papeis.includes(papel);

/** Remove acentos e passa a minúsculas, para a pesquisa ignorar "férias" vs "ferias". */
const normalizar = (t) => String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Renderiza texto com **negrito** (único markup permitido no conteúdo). */
function Texto({ children }) {
  const partes = String(children || "").split(/\*\*(.+?)\*\*/g);
  return partes.map((p, i) => (i % 2 === 1 ? <strong key={i}>{p}</strong> : p));
}

/** Filtra uma secção para o papel atual (tarefas/páginas/FAQ restritas desaparecem). */
function filtrarSeccao(s, papel) {
  return {
    ...s,
    paginas: (s.paginas || []).filter((x) => podeVer(x.papeis, papel)),
    tarefas: (s.tarefas || []).filter((x) => podeVer(x.papeis, papel)),
    faq: (s.faq || []).filter((x) => podeVer(x.papeis, papel)),
  };
}

export default function Ajuda() {
  const { userProfile } = useAuth();
  const papel = papelDe(userProfile);
  const [params, setParams] = useSearchParams();
  const [pesquisa, setPesquisa] = useState("");

  const seccoes = useMemo(
    () => SECCOES_AJUDA.filter((s) => podeVer(s.papeis, papel)).map((s) => filtrarSeccao(s, papel)),
    [papel]
  );

  const idAtual = params.get("s");
  const atual = seccoes.find((s) => s.id === idAtual) || seccoes[0];

  const abrir = (id, ancora) => {
    setPesquisa("");
    setParams({ s: id }, { replace: false });
    requestAnimationFrame(() => {
      const alvo = ancora ? document.getElementById(ancora) : null;
      if (alvo) {
        if (alvo.tagName === "DETAILS") alvo.open = true;
        alvo.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        document.querySelector(".aj-conteudo")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  };

  // Resultados da pesquisa: tarefas, ecrã e FAQ de todas as secções visíveis.
  const resultados = useMemo(() => {
    const q = normalizar(pesquisa).trim();
    if (q.length < 2) return null;
    const termos = q.split(/\s+/);
    const bate = (...txt) => {
      const alvo = normalizar(txt.flat().join(" "));
      return termos.every((t) => alvo.includes(t));
    };
    const out = [];
    for (const s of seccoes) {
      s.tarefas.forEach((t, i) => bate(t.titulo, t.passos || [], t.nota || "") && out.push({ s, tipo: "Como fazer", titulo: t.titulo, ancora: `aj-${s.id}-t${i}` }));
      s.paginas.forEach((p, i) => bate(p.titulo, p.texto) && out.push({ s, tipo: "No ecrã", titulo: p.titulo, ancora: `aj-${s.id}-p${i}` }));
      s.faq.forEach((f, i) => bate(f.pergunta, f.resposta) && out.push({ s, tipo: "Pergunta", titulo: f.pergunta, ancora: `aj-${s.id}-f${i}` }));
    }
    return out.slice(0, 60);
  }, [pesquisa, seccoes]);

  const totalTarefas = seccoes.reduce((n, s) => n + s.tarefas.length, 0);

  return (
    <div className="aj-page">
      <header className="aj-hero">
        <span className="aj-hero-orb is-a" aria-hidden="true" />
        <span className="aj-hero-orb is-b" aria-hidden="true" />
        <div className="aj-hero-row">
          <div className="aj-hero-main">
            <span className="aj-hero-icon" aria-hidden="true"><BookOpen size={24} /></span>
            <div>
              <span className="aj-hero-kicker">Ajuda</span>
              <h1>Manual do Bizin</h1>
              <p>Como funciona cada página e o passo-a-passo das tarefas do dia a dia. Só vês as áreas a que tens acesso.</p>
            </div>
          </div>
          <div className="aj-hero-side">
            <span className="aj-chip"><strong>{seccoes.length}</strong> áreas</span>
            <span className="aj-chip"><strong>{totalTarefas}</strong> guias passo-a-passo</span>
          </div>
        </div>
        <label className="aj-search">
          <Search size={18} aria-hidden="true" />
          <input
            type="search"
            value={pesquisa}
            onChange={(e) => setPesquisa(e.target.value)}
            placeholder="Pesquisar… ex.: pedir férias, picar ponto, 2FA"
            aria-label="Pesquisar no manual"
          />
          {pesquisa && (
            <button type="button" className="aj-search-clear" onClick={() => setPesquisa("")} aria-label="Limpar pesquisa">
              <X size={16} />
            </button>
          )}
        </label>
      </header>

      {resultados ? (
        <section className="aj-resultados" aria-live="polite">
          <h2>{resultados.length ? `${resultados.length} resultado${resultados.length === 1 ? "" : "s"}` : "Sem resultados"}</h2>
          {!resultados.length && <p className="aj-vazio">Experimenta outras palavras, ou escolhe uma área no menu.</p>}
          <ul>
            {resultados.map((r) => {
              return (
                <li key={r.ancora}>
                  <button type="button" onClick={() => abrir(r.s.id, r.ancora)}>
                    <span className="aj-res-ico" aria-hidden="true"><IconeAjuda nome={r.s.icone} size={16} /></span>
                    <span className="aj-res-txt">
                      <span className="aj-res-meta">{r.s.titulo} · {r.tipo}</span>
                      <span className="aj-res-tit">{r.titulo}</span>
                    </span>
                    <ChevronRight size={16} aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ) : (
        <div className="aj-layout">
          <nav className="aj-nav" aria-label="Áreas do manual">
            {seccoes.map((s) => {
              const on = s.id === atual?.id;
              return (
                <button key={s.id} type="button" className={on ? "is-on" : ""} aria-current={on ? "page" : undefined} onClick={() => abrir(s.id)}>
                  <IconeAjuda nome={s.icone} size={17} aria-hidden="true" />
                  <span>{s.titulo}</span>
                </button>
              );
            })}
          </nav>

          {atual && <Seccao s={atual} />}
        </div>
      )}
    </div>
  );
}

/** Conteúdo de uma área: resumo, passo-a-passo, guia do ecrã e perguntas frequentes. */
function Seccao({ s }) {
  return (
    <article className="aj-conteudo" key={s.id}>
      <div className="aj-sec-head">
        <span className="aj-sec-ico" aria-hidden="true"><IconeAjuda nome={s.icone} size={22} /></span>
        <div className="aj-sec-txt">
          <h2>{s.titulo}</h2>
          {s.resumo && <p><Texto>{s.resumo}</Texto></p>}
        </div>
        {s.rota && (
          <Link className="aj-abrir" to={s.rota}>
            Abrir página <ArrowUpRight size={15} aria-hidden="true" />
          </Link>
        )}
      </div>

      {s.tarefas.length > 0 && (
        <section className="aj-bloco">
          <h3><ListChecks size={18} aria-hidden="true" /> Como fazer</h3>
          <div className="aj-tarefas">
            {s.tarefas.map((t, i) => (
              <details key={i} id={`aj-${s.id}-t${i}`} className="aj-tarefa">
                <summary><span>{t.titulo}</span><ChevronRight size={16} className="aj-chev" aria-hidden="true" /></summary>
                <ol>
                  {(t.passos || []).map((p, j) => <li key={j}><Texto>{p}</Texto></li>)}
                </ol>
                {t.nota && (
                  <p className="aj-nota"><Lightbulb size={15} aria-hidden="true" /><span><Texto>{t.nota}</Texto></span></p>
                )}
              </details>
            ))}
          </div>
        </section>
      )}

      {s.paginas.length > 0 && (
        <section className="aj-bloco">
          <h3><LayoutPanelTop size={18} aria-hidden="true" /> No ecrã</h3>
          <div className="aj-cards">
            {s.paginas.map((p, i) => (
              <div key={i} id={`aj-${s.id}-p${i}`} className="aj-card">
                <h4>{p.titulo}</h4>
                <p><Texto>{p.texto}</Texto></p>
              </div>
            ))}
          </div>
        </section>
      )}

      {s.faq.length > 0 && (
        <section className="aj-bloco">
          <h3><CircleHelp size={18} aria-hidden="true" /> Perguntas frequentes</h3>
          <div className="aj-faq">
            {s.faq.map((f, i) => (
              <details key={i} id={`aj-${s.id}-f${i}`}>
                <summary><span>{f.pergunta}</span><ChevronRight size={16} className="aj-chev" aria-hidden="true" /></summary>
                <p><Texto>{f.resposta}</Texto></p>
              </details>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
