// =====================================================================
// Ajuda — manual de utilizador dentro da app (/#/dashboard/ajuda).
// O conteúdo vive em src/content/ajuda/*.js (um ficheiro por área) e é
// agregado em src/content/ajuda/index.js. Cada secção/tarefa/FAQ pode ter
// `papeis: [...]`; quem não tem esse papel não a vê (é só arrumação — a
// proteção real das páginas está nas rotas e na base de dados).
// Vistas (o mesmo <PageHero> nas duas, só muda o conteúdo):
//   sem ?s  → página inicial: pesquisa, mais procurados e cartões por grupo;
//   ?s=<id> → área numa página única (Como fazer / No ecrã / Perguntas)
//             com índice fixo à direita que acompanha o scroll.
// Deep links: ?s=ausencias  ·  ?s=ausencias&t=t2 (abre e mostra o item; t=passo, p=ecrã, f=pergunta)
// O menu da conta abre a área da página atual (seccaoDaRota em content/ajuda).
// =====================================================================
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { BookOpen, Search, X, ChevronRight, ArrowUpRight, Lightbulb, ArrowRight, CornerDownLeft } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import PageHero from "../components/PageHero";
import { SECCOES_AJUDA, GRUPOS_AJUDA, IconeAjuda } from "../content/ajuda";
import "../styles/ajuda.css";

/** Atalhos da página inicial: [id da área, título exato da tarefa]. Os que não existirem/não forem visíveis são ignorados. */
const POPULARES = [
  ["ausencias", "Como pedir férias"],
  ["inicio", "Como picar o ponto de entrada"],
  ["inicio", "Como ligar o cronómetro numa tarefa"],
  ["pedido-km", "Como pedir os km de uma deslocação"],
  ["projetos", "Como criar um projeto"],
  ["perfil-conta", "Como recuperar a password"],
];

/** Papel do utilizador em minúsculas (profiles.role, com fallback para tipo). */
const papelDe = (perfil) => String(perfil?.role || perfil?.tipo || "").toLowerCase().trim();

/** true se o item não tiver restrição de papéis ou se o papel constar da lista. */
const podeVer = (papeis, papel) => !Array.isArray(papeis) || papeis.length === 0 || papeis.includes(papel);

/** Um carácter sem acento e em minúsculas (mantém o comprimento, para o destaque bater certo). */
const normChar = (c) => {
  const n = c.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  return n.length === 1 ? n : c.toLowerCase();
};
/** Texto sem acentos e em minúsculas, para a pesquisa ignorar "férias" vs "ferias". */
const normalizar = (t) => Array.from(String(t || "")).map(normChar).join("");
const semMarkup = (t) => String(t || "").replace(/\*\*/g, "");

/** Texto com **negrito** (único markup permitido no conteúdo). */
function Texto({ children }) {
  const partes = String(children || "").split(/\*\*(.+?)\*\*/g);
  return partes.map((p, i) => (i % 2 === 1 ? <strong key={i}>{p}</strong> : p));
}

/** Envolve em <mark> as ocorrências dos termos (ignorando acentos e maiúsculas). */
function Destacar({ texto, termos }) {
  const chars = Array.from(String(texto || ""));
  const norm = chars.map(normChar).join("");
  const marca = new Array(chars.length).fill(false);
  for (const t of termos) {
    let i = t ? norm.indexOf(t) : -1;
    while (i !== -1) {
      for (let k = i; k < i + t.length; k++) marca[k] = true;
      i = norm.indexOf(t, i + t.length);
    }
  }
  const out = [];
  let buf = "", on = false;
  chars.forEach((c, i) => {
    if (marca[i] !== on) { if (buf) out.push(on ? <mark key={out.length}>{buf}</mark> : buf); buf = ""; on = marca[i]; }
    buf += c;
  });
  if (buf) out.push(on ? <mark key={out.length}>{buf}</mark> : buf);
  return out;
}

/** Excerto (~140 caracteres) à volta da primeira ocorrência de um dos termos num conjunto de textos. */
function excerto(textos, termos) {
  for (const bruto of textos) {
    const t = semMarkup(bruto);
    const n = normalizar(t);
    const pos = Math.min(...termos.map((x) => n.indexOf(x)).filter((i) => i >= 0));
    if (Number.isFinite(pos)) {
      const ini = Math.max(0, pos - 50);
      const fim = Math.min(t.length, ini + 140);
      return (ini > 0 ? "…" : "") + t.slice(ini, fim).trim() + (fim < t.length ? "…" : "");
    }
  }
  return "";
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

const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

export default function Ajuda() {
  const { userProfile } = useAuth();
  const papel = papelDe(userProfile);
  const [params, setParams] = useSearchParams();
  const [pesquisa, setPesquisa] = useState("");
  const [ativo, setAtivo] = useState(0); // resultado selecionado com as setas
  const inputRef = useRef(null);

  const seccoes = useMemo(
    () => SECCOES_AJUDA.filter((s) => podeVer(s.papeis, papel)).map((s) => filtrarSeccao(s, papel)),
    [papel]
  );
  const porId = useMemo(() => Object.fromEntries(seccoes.map((s) => [s.id, s])), [seccoes]);

  const atual = porId[params.get("s")] || null;
  const alvo = params.get("t"); // item a abrir/mostrar ao entrar

  // Tecla "/" foca a pesquisa (fora de campos de texto).
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey) return;
      const tag = (e.target?.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select" || e.target?.isContentEditable) return;
      e.preventDefault();
      inputRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /** Abre uma área (e opcionalmente um item: "t3", "p1", "f0"). Sem id volta à página inicial. */
  const abrir = (id, item) => {
    setPesquisa("");
    setParams(id ? (item ? { s: id, t: item } : { s: id }) : {});
    if (!item) document.querySelector(".aj-page")?.scrollIntoView({ block: "start" });
  };

  const termos = useMemo(() => normalizar(pesquisa).trim().split(/\s+/).filter((t) => t.length >= 2), [pesquisa]);

  // Resultados da pesquisa, agrupados por área, com excerto do texto onde bateu.
  const resultados = useMemo(() => {
    if (!termos.length) return null;
    const bate = (...txt) => {
      const alvoTxt = normalizar(semMarkup(txt.flat().join(" ")));
      return termos.every((t) => alvoTxt.includes(t));
    };
    const grupos = [];
    const lista = [];
    for (const s of seccoes) {
      const itens = [];
      s.tarefas.forEach((t, i) => {
        const textos = [t.titulo, ...(t.passos || []), t.nota || ""];
        if (bate(textos)) itens.push({ tipo: "Como fazer", titulo: t.titulo, item: `t${i}`, excerto: excerto(textos.slice(1), termos) });
      });
      s.paginas.forEach((p, i) => bate(p.titulo, p.texto) && itens.push({ tipo: "No ecrã", titulo: p.titulo, item: `p${i}`, excerto: excerto([p.texto], termos) }));
      s.faq.forEach((f, i) => bate(f.pergunta, f.resposta) && itens.push({ tipo: "Pergunta", titulo: f.pergunta, item: `f${i}`, excerto: excerto([f.resposta], termos) }));
      if (!itens.length && bate(s.titulo, s.resumo || "")) itens.push({ tipo: "Área", titulo: s.titulo, item: null, excerto: excerto([s.resumo || ""], termos) });
      if (itens.length) {
        const visiveis = itens.slice(0, 8).map((r, k) => ({ ...r, s, idx: lista.length + k }));
        lista.push(...visiveis);
        grupos.push({ s, itens: visiveis });
      }
    }
    return { grupos, lista };
  }, [termos, seccoes]);

  const onPesquisaKey = (e) => {
    const lista = resultados?.lista || [];
    if (e.key === "Escape") { setPesquisa(""); return; }
    if (!lista.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setAtivo((a) => Math.min(a + 1, lista.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setAtivo((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter") {
      e.preventDefault();
      const r = lista[Math.min(ativo, lista.length - 1)];
      if (r) { abrir(r.s.id, r.item); inputRef.current?.blur(); }
    }
  };

  const totalGuias = seccoes.reduce((n, s) => n + s.tarefas.length, 0);

  const populares = POPULARES
    .map(([id, titulo]) => {
      const i = porId[id]?.tarefas.findIndex((t) => t.titulo === titulo) ?? -1;
      return i >= 0 ? { id, item: `t${i}`, titulo: titulo.replace(/^Como /, "") } : null;
    })
    .filter(Boolean);

  const grupos = useMemo(() => {
    const usados = new Set();
    const out = GRUPOS_AJUDA.map((g) => {
      const itens = g.ids.map((id) => porId[id]).filter(Boolean);
      itens.forEach((s) => usados.add(s.id));
      return { titulo: g.titulo, itens };
    }).filter((g) => g.itens.length);
    const resto = seccoes.filter((s) => !usados.has(s.id));
    if (resto.length) out.push({ titulo: "Outros", itens: resto });
    return out;
  }, [porId, seccoes]);

  return (
    <div className="aj-page">
      <PageHero
        className={atual ? "aj-hero is-area" : "aj-hero"}
        icon={atual ? <IconeAjuda nome={atual.icone} size={24} /> : <BookOpen size={24} />}
        kicker={atual ? (
          <>
            <button type="button" className="page-hero-crumb" onClick={() => abrir(null)}>Ajuda</button>
            <ChevronRight size={12} aria-hidden="true" />
            <span>{atual.titulo}</span>
          </>
        ) : "Ajuda"}
        title={atual ? atual.titulo : "Manual do Bizin"}
        subtitle={atual ? <Texto>{atual.resumo}</Texto> : "Como funciona cada página e o passo-a-passo das tarefas do dia a dia. Só vês as áreas a que tens acesso."}
        side={atual ? (
          atual.rota && <Link className="page-hero-btn" to={atual.rota}>Abrir página <ArrowUpRight size={15} aria-hidden="true" /></Link>
        ) : (
          <>
            <span className="page-hero-chip"><strong>{seccoes.length}</strong> áreas</span>
            <span className="page-hero-chip"><strong>{totalGuias}</strong> guias passo-a-passo</span>
          </>
        )}
      >
        <label className="aj-search">
          <Search size={18} aria-hidden="true" />
          <input
            ref={inputRef}
            type="search"
            value={pesquisa}
            onChange={(e) => { setPesquisa(e.target.value); setAtivo(0); }}
            onKeyDown={onPesquisaKey}
            placeholder={atual ? "Pesquisar no manual…" : "Pesquisa: pedir férias, picar ponto, 2FA…"}
            aria-label="Pesquisar no manual"
            role="combobox"
            aria-expanded={Boolean(resultados?.lista.length)}
            aria-controls="aj-resultados"
            aria-activedescendant={resultados?.lista.length ? `aj-res-${Math.min(ativo, resultados.lista.length - 1)}` : undefined}
          />
          {pesquisa ? (
            <button type="button" className="aj-search-clear" onClick={() => setPesquisa("")} aria-label="Limpar pesquisa"><X size={16} /></button>
          ) : (
            <kbd className="aj-kbd" aria-hidden="true">/</kbd>
          )}
        </label>
        {!atual && !resultados && populares.length > 0 && (
          <div className="aj-populares">
            <span>Mais procurados</span>
            {populares.map((p) => (
              <button key={p.id + p.item} type="button" onClick={() => abrir(p.id, p.item)}>{p.titulo}</button>
            ))}
          </div>
        )}
      </PageHero>

      {resultados ? (
        <Resultados resultados={resultados} termos={termos} abrir={abrir} ativo={Math.min(ativo, Math.max(0, resultados.lista.length - 1))} setAtivo={setAtivo} />
      ) : atual ? (
        <Area key={atual.id + (alvo || "")} s={atual} alvo={alvo} />
      ) : (
        <div className="aj-grupos">
          {grupos.map((g) => (
            <section key={g.titulo} className="aj-grupo">
              <h2>{g.titulo}</h2>
              <div className="aj-grid">
                {g.itens.map((s) => (
                  <button key={s.id} type="button" className="aj-area" onClick={() => abrir(s.id)}>
                    <span className="aj-area-ico" aria-hidden="true"><IconeAjuda nome={s.icone} size={20} /></span>
                    <span className="aj-area-tit">{s.titulo}</span>
                    {s.resumo && <span className="aj-area-res">{semMarkup(s.resumo)}</span>}
                    <span className="aj-area-meta">
                      {plural(s.tarefas.length, "guia", "guias")} · {plural(s.faq.length, "pergunta", "perguntas")}
                      <ArrowRight size={15} aria-hidden="true" className="aj-area-seta" />
                    </span>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

/** Resultados da pesquisa, agrupados por área, com termos destacados e excerto. */
function Resultados({ resultados, termos, abrir, ativo, setAtivo }) {
  const { grupos, lista } = resultados;
  useEffect(() => {
    document.getElementById(`aj-res-${ativo}`)?.scrollIntoView({ block: "nearest" });
  }, [ativo]);
  return (
    <section className="aj-resultados" id="aj-resultados" role="listbox" aria-label="Resultados da pesquisa">
      <p className="aj-res-total" aria-live="polite">
        {lista.length ? plural(lista.length, "resultado", "resultados") : "Sem resultados"}
        {lista.length > 0 && <span className="aj-res-dica"><CornerDownLeft size={13} aria-hidden="true" /> Enter abre · ↑↓ para escolher</span>}
      </p>
      {!lista.length && (
        <div className="aj-vazio">
          <Search size={28} aria-hidden="true" />
          <p>Não encontrámos nada. Experimenta outras palavras ou procura por área.</p>
        </div>
      )}
      {grupos.map(({ s, itens }) => (
        <div key={s.id} className="aj-res-grupo">
          <h2><IconeAjuda nome={s.icone} size={15} aria-hidden="true" /> {s.titulo}</h2>
          <ul>
            {itens.map((r) => (
              <li key={r.item || "area"}>
                <button
                  type="button"
                  id={`aj-res-${r.idx}`}
                  role="option"
                  aria-selected={r.idx === ativo}
                  className={r.idx === ativo ? "is-ativo" : ""}
                  onMouseEnter={() => setAtivo(r.idx)}
                  onClick={() => abrir(s.id, r.item)}
                >
                  <span className="aj-res-tipo">{r.tipo}</span>
                  <span className="aj-res-txt">
                    <span className="aj-res-tit"><Destacar texto={r.titulo} termos={termos} /></span>
                    {r.excerto && <span className="aj-res-exc"><Destacar texto={r.excerto} termos={termos} /></span>}
                  </span>
                  <ChevronRight size={16} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

/** Item expansível (tarefa ou pergunta). Conteúdo fica no DOM (hidden) para o Ctrl+F do browser o encontrar. */
function ItemAjuda({ sid, k, alvo, aberto, onToggle, titulo, meta, children }) {
  return (
    <div id={`aj-${sid}-${k}`} data-spy={k.startsWith("t") ? k : undefined} className={`aj-item ${aberto ? "is-open" : ""} ${alvo === k ? "is-alvo" : ""}`}>
      <h3 className="aj-item-h">
        <button type="button" className="aj-item-head" aria-expanded={aberto} aria-controls={`aj-${sid}-${k}-c`} onClick={() => onToggle(k)}>
          <span>{titulo}</span>
          {meta && <span className="aj-item-meta">{meta}</span>}
          <ChevronRight size={16} className="aj-chev" aria-hidden="true" />
        </button>
      </h3>
      <div id={`aj-${sid}-${k}-c`} className="aj-item-body" hidden={aberto ? undefined : "until-found"}>{children}</div>
    </div>
  );
}

/** Uma área numa página única: Como fazer, No ecrã, Perguntas + índice fixo com scroll-spy. */
function Area({ s, alvo }) {
  const [abertos, setAbertos] = useState(() => new Set(alvo ? [alvo] : []));
  const [visivel, setVisivel] = useState(null); // id do elemento do índice em destaque
  const conteudoRef = useRef(null);

  // Deep link: mostrar o item pedido.
  useEffect(() => {
    if (!alvo) return;
    const el = document.getElementById(`aj-${s.id}-${alvo}`);
    if (el) requestAnimationFrame(() => el.scrollIntoView({ behavior: "smooth", block: "center" }));
  }, [alvo, s.id]);

  // Scroll-spy: o elemento do índice acompanha o que está visível.
  useEffect(() => {
    const raiz = conteudoRef.current;
    if (!raiz || typeof IntersectionObserver === "undefined") return;
    const alvos = raiz.querySelectorAll("[data-spy]");
    const obs = new IntersectionObserver((entradas) => {
      const vis = entradas.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (vis[0]) setVisivel(vis[0].target.getAttribute("data-spy"));
    }, { rootMargin: "-15% 0px -70% 0px" });
    alvos.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [s.id]);

  // Ctrl+F do browser encontra texto dentro de itens fechados (hidden="until-found"):
  // quando o browser os revela, marcamos o item como aberto para o estado bater certo.
  useEffect(() => {
    const raiz = conteudoRef.current;
    if (!raiz) return;
    const onMatch = (e) => {
      const k = e.target.closest?.(".aj-item")?.id?.split("-").pop();
      if (k) setAbertos((prev) => new Set(prev).add(k));
    };
    raiz.addEventListener("beforematch", onMatch);
    return () => raiz.removeEventListener("beforematch", onMatch);
  }, [s.id]);

  const alternar = (k) => setAbertos((prev) => {
    const n = new Set(prev);
    if (n.has(k)) n.delete(k); else n.add(k);
    return n;
  });

  const irPara = (id, abrirItem) => {
    if (abrirItem) setAbertos((prev) => new Set(prev).add(abrirItem));
    requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const blocos = [
    s.tarefas.length && { id: "tarefas", titulo: "Como fazer", n: s.tarefas.length },
    s.paginas.length && { id: "ecra", titulo: "No ecrã", n: s.paginas.length },
    s.faq.length && { id: "faq", titulo: "Perguntas frequentes", n: s.faq.length },
  ].filter(Boolean);

  return (
    <div className="aj-area-layout">
      <div className="aj-conteudo" ref={conteudoRef}>
        {s.tarefas.length > 0 && (
          <section id={`aj-${s.id}-tarefas`} data-spy="tarefas" className="aj-bloco">
            <h2>Como fazer <span className="aj-bloco-n">{s.tarefas.length}</span></h2>
            <div className="aj-lista">
              {s.tarefas.map((t, i) => (
                <ItemAjuda key={i} sid={s.id} k={`t${i}`} alvo={alvo} aberto={abertos.has(`t${i}`)} onToggle={alternar} titulo={t.titulo} meta={plural((t.passos || []).length, "passo", "passos")}>
                  <ol className="aj-passos">
                    {(t.passos || []).map((p, j) => <li key={j}><Texto>{p}</Texto></li>)}
                  </ol>
                  {t.nota && <p className="aj-nota"><Lightbulb size={15} aria-hidden="true" /><span><Texto>{t.nota}</Texto></span></p>}
                </ItemAjuda>
              ))}
            </div>
          </section>
        )}

        {s.paginas.length > 0 && (
          <section id={`aj-${s.id}-ecra`} data-spy="ecra" className="aj-bloco">
            <h2>No ecrã <span className="aj-bloco-n">{s.paginas.length}</span></h2>
            <div className="aj-ecra">
              {s.paginas.map((p, i) => (
                <div key={i} id={`aj-${s.id}-p${i}`} className={`aj-ecra-item ${alvo === `p${i}` ? "is-alvo" : ""}`}>
                  <h3>{p.titulo}</h3>
                  <p><Texto>{p.texto}</Texto></p>
                </div>
              ))}
            </div>
          </section>
        )}

        {s.faq.length > 0 && (
          <section id={`aj-${s.id}-faq`} data-spy="faq" className="aj-bloco">
            <h2>Perguntas frequentes <span className="aj-bloco-n">{s.faq.length}</span></h2>
            <div className="aj-lista">
              {s.faq.map((f, i) => (
                <ItemAjuda key={i} sid={s.id} k={`f${i}`} alvo={alvo} aberto={abertos.has(`f${i}`)} onToggle={alternar} titulo={f.pergunta}>
                  <p className="aj-resposta"><Texto>{f.resposta}</Texto></p>
                </ItemAjuda>
              ))}
            </div>
          </section>
        )}
      </div>

      <nav className="aj-indice" aria-label="Nesta área">
        <p className="aj-indice-tit">Nesta área</p>
        <ul>
          {blocos.map((b) => {
            const noBloco = visivel === b.id || (b.id === "tarefas" && /^t\d/.test(visivel || ""));
            return (
              <li key={b.id}>
                <button type="button" className={`aj-indice-bloco ${noBloco ? "is-on" : ""}`} onClick={() => irPara(`aj-${s.id}-${b.id}`)}>
                  {b.titulo} <span>{b.n}</span>
                </button>
                {b.id === "tarefas" && (
                  <ul className="aj-indice-sub">
                    {s.tarefas.map((t, i) => (
                      <li key={i}>
                        <button type="button" className={visivel === `t${i}` ? "is-on" : ""} onClick={() => irPara(`aj-${s.id}-t${i}`, `t${i}`)}>
                          {t.titulo.replace(/^Como /, "").replace(/^./, (c) => c.toUpperCase())}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
