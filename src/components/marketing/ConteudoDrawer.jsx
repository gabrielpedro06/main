import { useEffect, useLayoutEffect, useRef, useState } from "react";
import FancySelect from "../FancySelect";
import { MarcaLogo } from "./MarcasModal";
import GuiaPeek from "./GuiaPeek";
import { I } from "./mkIcons";
import { AutoText, Field, Chips, TagInput, Avatar, PersonaFace, PessoasPicker } from "./mkFields";
import Anexos from "./Anexos";
import {
  ETAPAS, ETAPA_INICIAL, estadoInfo, CANAIS, FORMATOS, OBJETIVOS, ESTRATEGIAS, EDITORIAS,
  PRIORIDADES, METRICAS, AVALIACOES,
} from "../../constants/marketing";
import { toLocalInput, fromLocalInput, fmtData, tipoLink, urlSegura, termosEvitados } from "./mkUtils";
import { METRICAS_PECA, placeholdersDe, estadoDe } from "./recursosModelo";
import { enviarParaAprovacao, aprovar as aprovarConteudo, pedirAlteracoes as pedirAlteracoesConteudo } from "./mkAprovacao";

const SECCOES = [
  { id: "plano", label: "Planeamento", icon: I.Target },
  { id: "criativo", label: "Criativo", icon: I.Sparkle },
  { id: "copy", label: "Copy", icon: I.Pen },
  { id: "design", label: "Design", icon: I.Image },
  { id: "notas", label: "Notas", icon: I.Book },
  { id: "aprovacao", label: "Aprovação", icon: I.CheckCircle },
  { id: "resultados", label: "Resultados", icon: I.Chart },
];

/** Campos de texto/número gravados no blur (os restantes gravam logo) */
const CAMPOS_EDITAVEIS = ["titulo", "campanha", "variacoes", "cta_2", "notas", "headline", "briefing", "conceito", "design_ideia", "copies", "cta", "links", "alteracoes", "resultado", "verba", "verba_usada", "resultado_notas", "metricas", "url_publicacao", "utm_campaign"];

/* ---------- painel ---------- */

export default function ConteudoDrawer({ item, marca, perfis, userId, userNome, secaoInicial, onAplicado, sugestoesPilar = [], personas = [], frentes = [], campanhas = [], ofertas = [], turmas = [], regras = [], avisar, onPatch, onClose, onArquivar, onRestaurar, onEliminar }) {
  const [draft, setD] = useState(item);
  // Estado, aprovação e datas podem mudar fora do painel (arrastar no quadro/calendário): vêm sempre do item
  const d = {
    ...draft,
    estado: item.estado,
    aprovado_em: item.aprovado_em,
    aprovado_por: item.aprovado_por,
    aprovadores: item.aprovadores,
    historico_aprovacao: item.historico_aprovacao,
    enviado_aprovacao_por: item.enviado_aprovacao_por,
    enviado_aprovacao_em: item.enviado_aprovacao_em,
    data_publicacao: item.data_publicacao,
    data_publicacao_2: item.data_publicacao_2,
  };
  const [confirmDel, setConfirmDel] = useState(false);
  const [aprovSel, setAprovSel] = useState(() => (Array.isArray(item.aprovadores) ? item.aprovadores : []));
  const [textoAlt, setTextoAlt] = useState("");
  const [aGravarAprov, setAGravarAprov] = useState(false);
  const [guiaAberto, setGuiaAberto] = useState(false);
  const [copiado, setCopiado] = useState(null);
  const bodyRef = useRef(null);
  const secRefs = useRef({});
  const [secAtiva, setSecAtiva] = useState("plano");
  const itemRef = useRef(item);
  useLayoutEffect(() => { itemRef.current = item; }, [item]);
  const dRef = useRef(draft);
  useLayoutEffect(() => { dRef.current = draft; }, [draft]);
  const onPatchRef = useRef(onPatch);
  useLayoutEffect(() => { onPatchRef.current = onPatch; }, [onPatch]);

  // Ao fechar (Esc, clique fora, X) grava o que ainda estiver por gravar — o blur não dispara ao desmontar
  useEffect(() => () => {
    const atual = dRef.current;
    const antes = itemRef.current;
    const patch = {};
    for (const k of CAMPOS_EDITAVEIS) {
      if (JSON.stringify(atual[k] ?? null) !== JSON.stringify(antes[k] ?? null)) patch[k] = atual[k] === "" ? null : atual[k];
    }
    if (Object.keys(patch).length) onPatchRef.current(antes.id, patch);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Escape" || document.querySelector(".fs-menu")) return;
      if (document.querySelector(".mk-peek")) { setGuiaAberto(false); return; }
      onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Secção ativa no índice conforme o scroll
  useEffect(() => {
    const body = bodyRef.current;
    if (!body) return undefined;
    const onScroll = () => {
      const top = body.getBoundingClientRect().top + 90;
      let atual = SECCOES[0].id;
      for (const s of SECCOES) {
        const el = secRefs.current[s.id];
        if (el && el.getBoundingClientRect().top <= top) atual = s.id;
      }
      if (body.scrollTop + body.clientHeight >= body.scrollHeight - 4) atual = SECCOES[SECCOES.length - 1].id;
      setSecAtiva(atual);
    };
    body.addEventListener("scroll", onScroll, { passive: true });
    return () => body.removeEventListener("scroll", onScroll);
  }, []);

  /** Altera e grava logo (selects, chips, datas) */
  const set = (campo, valor) => {
    setD((p) => ({ ...p, [campo]: valor }));
    onPatch(item.id, { [campo]: valor });
  };
  /** Altera só localmente (texto); grava no blur */
  const edit = (campo, valor) => setD((p) => ({ ...p, [campo]: valor }));
  const commit = (campo) => () => {
    const atual = dRef.current[campo];
    const antes = itemRef.current[campo];
    if (JSON.stringify(atual ?? null) !== JSON.stringify(antes ?? null)) onPatch(item.id, { [campo]: atual === "" ? null : atual });
  };
  const patchVarios = (patch) => {
    setD((p) => ({ ...p, ...patch }));
    onPatch(item.id, patch);
  };

  const irPara = (id) => {
    const el = secRefs.current[id];
    const body = bodyRef.current;
    if (el && body) body.scrollTo({ top: el.offsetTop - 64, behavior: "smooth" });
  };
  // Abrir já numa secção (p. ex. ao arrastar para "Aprovação")
  useEffect(() => {
    if (!secaoInicial) return undefined;
    const t = setTimeout(() => {
      const el = secRefs.current[secaoInicial];
      const body = bodyRef.current;
      if (el && body) body.scrollTo({ top: el.offsetTop - 64, behavior: "smooth" });
    }, 180);
    return () => clearTimeout(t);
  }, [secaoInicial]);

  const estado = estadoInfo(d.estado);
  const ehIdeia = d.estado === "ideia";
  const arquivado = d.estado === "arquivado";
  const idxEtapa = ETAPAS.findIndex((e) => e.id === d.estado);
  const pessoa = (id) => perfis.find((p) => p.id === id) || null;
  const aprovador = pessoa(d.aprovado_por);
  const autor = pessoa(d.created_by);

  const copies = Array.isArray(d.copies) ? d.copies : [];
  const guia = marca?.guia || {};
  const evitados = termosEvitados(guia, [d.titulo, d.headline, d.cta, d.cta_2, ...copies.map((c) => c.texto)]);
  const pilares = [...new Set([...(guia.personalidade?.arquetipos || []).map((a) => a.nome).filter(Boolean), ...sugestoesPilar])];
  const personasDoItem = personas.filter((p) => (d.persona_ids || []).includes(p.id));
  const links = Array.isArray(d.links) ? d.links : [];
  const placeholders = placeholdersDe(d);
  const ofertasDoItem = ofertas.filter((o) => (d.oferta_ids || []).includes(o.id));
  const metricas = d.metricas && typeof d.metricas === "object" ? d.metricas : {};
  const editMetrica = (k, v) => edit("metricas", { ...metricas, [k]: v });
  const commitMetricas = () => {
    const atual = dRef.current.metricas || {};
    const antes = itemRef.current.metricas || {};
    if (JSON.stringify(atual) === JSON.stringify(antes)) return;
    patchVarios({ metricas: atual });
  };
  const setCopies = (arr, gravar = false) => { if (gravar) set("copies", arr); else edit("copies", arr); };
  const setLinks = (arr, gravar = false) => { if (gravar) set("links", arr); else edit("links", arr); };

  const copiar = async (texto, i) => {
    try { await navigator.clipboard.writeText(texto || ""); setCopiado(i); setTimeout(() => setCopiado(null), 1400); } catch { /* ignora */ }
  };

  /* ---------- aprovação ---------- */
  const eu = { id: userId, nome: userNome };
  const aplicar = (patch) => {
    setD((p) => ({ ...p, ...patch }));
    onAplicado?.(item.id, patch);
  };
  const correr = async (fn, msgOk) => {
    if (aGravarAprov) return;
    setAGravarAprov(true);
    try {
      const patch = await fn();
      aplicar(patch);
      if (msgOk) avisar?.(msgOk);
    } catch (e) {
      avisar?.(e?.message || "Não foi possível gravar.", "error");
    } finally {
      setAGravarAprov(false);
    }
  };
  const enviarAprovacao = () => {
    if (!aprovSel.length) { avisar?.("Escolha pelo menos uma pessoa para aprovar.", "error"); return; }
    const nomes = aprovSel.map((id) => pessoa(id)?.nome?.split(" ")[0]).filter(Boolean).join(", ");
    correr(() => enviarParaAprovacao({ ...item, ...dRef.current, historico_aprovacao: item.historico_aprovacao }, aprovSel, eu), `Enviado para aprovação${nomes ? ` de ${nomes}` : ""}.`);
  };
  const aprovar = () => correr(() => aprovarConteudo(item, eu), "Aprovado. A equipa de marketing foi avisada.");
  const pedirAlteracoes = () => {
    const t = String(textoAlt || "").trim();
    if (!t) { secRefs.current.aprovacao?.querySelector("textarea")?.focus(); return; }
    correr(async () => { const p = await pedirAlteracoesConteudo(item, t, eu); setTextoAlt(""); return p; }, "Pedido de alterações enviado à equipa de marketing.");
  };

  /** Registar resultado */
  const setResultado = (campo, valor) => patchVarios({ [campo]: valor });

  const responsaveis = Array.isArray(d.responsavel_ids) && d.responsavel_ids.length ? d.responsavel_ids : d.responsavel_id ? [d.responsavel_id] : [];

  return (
    <div className="mk-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <aside className="mk-drawer" style={{ "--brand": marca?.cor || "#2563eb", "--st": estado.cor }} role="dialog" aria-label={d.titulo || "Conteúdo"}>
        {/* Cabeçalho */}
        <header className="mk-dhead">
          <div className="mk-dhead-bg" />
          <div className="mk-dhead-top">
            <span className="mk-dbrand"><MarcaLogo marca={marca} size={18} />{marca?.nome}</span>
            <span className="mk-dstate">{estado.label}</span>
            <span className="mk-spacer" />
            <button type="button" className={`mk-dguia-btn ${guiaAberto ? "is-on" : ""}`} onClick={() => setGuiaAberto((v) => !v)} title="Guia da marca: voz, palavras, cores e personas">
              <I.Book size={15} /> Guia da marca
              {evitados.length > 0 && <em title="Palavras a evitar no texto">{evitados.length}</em>}
            </button>
            <button type="button" className="mk-dclose" onClick={onClose} aria-label="Fechar"><I.X size={18} /></button>
          </div>
          <AutoText
            className="mk-dtitle"
            value={d.titulo}
            rows={1}
            placeholder="Tema / assunto"
            autoFocus={!item.titulo}
            onChange={(v) => edit("titulo", v.replace(/\n/g, " "))}
            onBlur={commit("titulo")}
          />

          {ehIdeia ? (
            <div className="mk-dbanner">
              <I.Bulb size={16} />
              <span>Isto ainda está no <b>Banco de Ideias</b>.</span>
              <button type="button" className="mk-dbanner-btn" onClick={() => set("estado", ETAPA_INICIAL)}>Passar para o fluxo <I.ArrowRight size={14} /></button>
            </div>
          ) : arquivado ? (
            <div className="mk-dbanner">
              <I.Archive size={16} />
              <span>Este conteúdo está arquivado.</span>
              <button type="button" className="mk-dbanner-btn" onClick={() => onRestaurar(item)}>Restaurar <I.Undo size={14} /></button>
            </div>
          ) : (
            <div className="mk-stepper" role="list">
              {ETAPAS.map((e, i) => (
                <button
                  key={e.id}
                  type="button"
                  role="listitem"
                  className={`mk-step ${i < idxEtapa ? "is-done" : ""} ${i === idxEtapa ? "is-on" : ""}`}
                  style={{ "--c": e.cor }}
                  title={e.dica}
                  onClick={() => {
                    if (e.id === "aprovacao" && d.estado !== "aprovacao") { irPara("aprovacao"); avisar?.("Escolha quem aprova e carregue em «Enviar para aprovação»."); return; }
                    set("estado", e.id);
                  }}
                >
                  <i>{i < idxEtapa ? <I.Check size={10} sw={3.5} /> : i + 1}</i>
                  <span>{e.label}</span>
                </button>
              ))}
            </div>
          )}
        </header>

        {/* Índice */}
        <nav className="mk-dnav">
          {SECCOES.map((s) => (
            <button key={s.id} type="button" className={secAtiva === s.id ? "is-on" : ""} onClick={() => irPara(s.id)}>
              <s.icon size={14} /> {s.label}
            </button>
          ))}
        </nav>

        <div className="mk-dbody" ref={bodyRef}>
          {/* PLANEAMENTO */}
          <section className="mk-sec" ref={(el) => { secRefs.current.plano = el; }}>
            <h3><I.Target size={16} /> Planeamento</h3>
            <div className="mk-grid">
              <Field label="Responsáveis" wide>
                <PessoasPicker value={responsaveis} perfis={perfis} onChange={(ids) => patchVarios({ responsavel_ids: ids, responsavel_id: ids[0] || null })} />
              </Field>
              <Field label="Campanha / série" hint="agrupa peças">
                <input
                  className="mk-input"
                  list={`mk-camp-${item.id}`}
                  value={d.campanha || ""}
                  placeholder="Ex.: Campanha de inverno · Fase 1"
                  onChange={(e) => edit("campanha", e.target.value)}
                  onBlur={commit("campanha")}
                />
                <datalist id={`mk-camp-${item.id}`}>{campanhas.map((c) => <option key={c} value={c} />)}</datalist>
              </Field>
              <Field label="Prioridade">
                <Chips options={PRIORIDADES} value={d.prioridade} onChange={(v) => set("prioridade", v)} colorOf={(o) => o.cor} />
              </Field>
              <Field label="Data de entrega" hint="copy + design prontos">
                <input type="date" className="mk-input" value={d.data_entrega || ""} onChange={(e) => set("data_entrega", e.target.value || null)} />
              </Field>
              <Field label="Publicação">
                <input type="datetime-local" className="mk-input" value={toLocalInput(d.data_publicacao)} onChange={(e) => set("data_publicacao", fromLocalInput(e.target.value))} />
              </Field>
              <Field label="2.ª publicação" hint="opcional (repost, lembrete…)">
                <input type="datetime-local" className="mk-input" value={toLocalInput(d.data_publicacao_2)} onChange={(e) => set("data_publicacao_2", fromLocalInput(e.target.value))} />
              </Field>
              <Field label="Canais" wide>
                <Chips multi options={CANAIS} value={d.canais} onChange={(v) => set("canais", v)} colorOf={(o) => o.cor} />
              </Field>
              <Field label="Formatos" wide>
                <Chips multi options={FORMATOS} value={d.formato} onChange={(v) => set("formato", v)} />
              </Field>
              <Field label="Objetivo da comunicação" wide>
                <Chips multi options={OBJETIVOS} value={d.objetivo} onChange={(v) => set("objetivo", v)} />
              </Field>
              <Field label="Etapa do funil" wide>
                <Chips multi options={ESTRATEGIAS} value={d.estrategia} onChange={(v) => set("estrategia", v)} />
              </Field>
              <Field label="Frente / objetivo" hint="da Estratégia">
                {frentes.length ? (
                  <FancySelect value={d.frente || ""} onChange={(v) => set("frente", v || null)} options={[{ value: "", label: "—" }, ...frentes.map((f) => ({ value: f, label: f }))]} placeholder="Escolher frente" />
                ) : (
                  <p className="mk-hint" style={{ margin: 0 }}>Defina objetivos no separador <b>Estratégia</b>.</p>
                )}
              </Field>
              <Field label="Pilares / arquétipos">
                <TagInput value={Array.isArray(d.pilar) ? d.pilar : d.pilar ? [d.pilar] : []} onChange={(v) => set("pilar", v)} sugestoes={pilares} placeholder="Ex.: Sábio-Mentor" />
              </Field>
              <Field label="Editorias" wide>
                <Chips multi options={EDITORIAS} value={d.editoria} onChange={(v) => set("editoria", v)} />
              </Field>
              <Field label="Cursos / serviços" wide hint="do catálogo (Recursos)">
                {ofertas.length ? (
                  <>
                    <div className="mk-chips">
                      {ofertas.map((o) => {
                        const on = (d.oferta_ids || []).includes(o.id);
                        return (
                          <button key={o.id} type="button" className={`mk-chip ${on ? "is-on" : ""}`} onClick={() => set("oferta_ids", on ? d.oferta_ids.filter((x) => x !== o.id) : [...(d.oferta_ids || []), o.id])}>
                            {o.dados?.codigo || o.titulo}
                          </button>
                        );
                      })}
                    </div>
                    {ofertasDoItem.map((o) => {
                      const proximas = turmas.filter((t) => t.dados?.oferta === o.titulo && ["aberta", "planeada", "esgotada"].includes(t.estado));
                      return (
                        <div key={o.id} className="mk-oferta-ficha">
                          <b>{o.titulo}</b>
                          <span>{[o.dados?.duracao && `⏱ ${o.dados.duracao}`, o.dados?.preco && `💶 ${o.dados.preco}`, o.dados?.modalidade, o.dados?.certificado].filter(Boolean).join(" · ") || "Sem dados no catálogo"}</span>
                          {proximas.map((t) => (
                            <span key={t.id}>📅 {t.data ? fmtData(t.data, { hora: false }) : "data por definir"}{t.data_fim && t.data_fim !== t.data ? ` → ${fmtData(t.data_fim, { hora: false })}` : ""}{t.dados?.local ? ` · 📍 ${t.dados.local}` : ""} · {estadoDe("turma", t.estado)?.label}</span>
                          ))}
                          {o.dados?.url && <a href={urlSegura(o.dados.url)} target="_blank" rel="noreferrer noopener">{o.dados.url}</a>}
                          {/a confirmar|a definir/i.test(`${o.dados?.duracao} ${o.dados?.preco}`) && <em><I.Alert size={12} /> Dados por confirmar no catálogo</em>}
                        </div>
                      );
                    })}
                  </>
                ) : (
                  <p className="mk-hint" style={{ margin: 0 }}>Crie o catálogo de cursos/serviços em <b>Recursos → Catálogo</b> para ter datas, preço e duração à mão.</p>
                )}
              </Field>
              <Field label="Buyer personas" wide hint="para quem é este conteúdo">
                {personas.length ? (
                  <div className="mk-ppick">
                    {personas.map((p) => {
                      const on = (d.persona_ids || []).includes(p.id);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          className={`mk-ppick-item ${on ? "is-on" : ""}`}
                          title={p.frase ? `“${p.frase}”` : p.ocupacao || ""}
                          onClick={() => set("persona_ids", on ? d.persona_ids.filter((x) => x !== p.id) : [...(d.persona_ids || []), p.id])}
                        >
                          <PersonaFace persona={p} size={26} />
                          <span><b>{p.nome_persona || "Sem nome"}</b><small>{p.papel}</small></span>
                          {on && <i><I.Check size={11} sw={3.5} /></i>}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="mk-hint" style={{ margin: 0 }}>A {marca?.nome} ainda não tem personas — crie-as ou importe-as no separador <b>Personas</b>.</p>
                )}
              </Field>
            </div>
          </section>

          {/* CRIATIVO */}
          <section className="mk-sec" ref={(el) => { secRefs.current.criativo = el; }}>
            <h3><I.Sparkle size={16} /> Criativo</h3>
            <div className="mk-stack">
              <Field label="Headline / hook">
                <AutoText value={d.headline} rows={1} placeholder="A frase que faz parar o scroll" onChange={(v) => edit("headline", v)} onBlur={commit("headline")} />
              </Field>
              <Field label="Briefing">
                <AutoText value={d.briefing} rows={3} placeholder="Contexto, o que tem de constar, fontes, preços a confirmar…" onChange={(v) => edit("briefing", v)} onBlur={commit("briefing")} />
              </Field>
              <Field label="Conceito criativo">
                <AutoText value={d.conceito} rows={2} placeholder="A ideia por trás da peça" onChange={(v) => edit("conceito", v)} onBlur={commit("conceito")} />
              </Field>
              <Field label="Variações da ideia" hint="outras versões, stories, e-mail…">
                <AutoText value={d.variacoes} rows={2} placeholder="Ex.: story com pergunta, e-mail curto para clientes do setor…" onChange={(v) => edit("variacoes", v)} onBlur={commit("variacoes")} />
              </Field>
              <Field label="Ideia de design">
                <AutoText value={d.design_ideia} rows={2} placeholder="Imagem, cores, tipografia, nº de slides…" onChange={(v) => edit("design_ideia", v)} onBlur={commit("design_ideia")} />
              </Field>
            </div>
          </section>

          {/* COPY */}
          <section className="mk-sec" ref={(el) => { secRefs.current.copy = el; }}>
            <h3><I.Pen size={16} /> Copy</h3>
            {evitados.length > 0 && (
              <p className="mk-avoid"><I.Alert size={14} /> O texto usa palavras que a {marca?.nome} evita: {evitados.map((t) => <b key={t}>{t}</b>)}</p>
            )}
            {placeholders.length > 0 && (
              <p className="mk-avoid"><I.Alert size={14} /> Campos por preencher antes de publicar: {placeholders.map((t) => <b key={t}>{t}</b>)}</p>
            )}
            <div className="mk-stack">
              {copies.map((c, i) => (
                <div className="mk-copy" key={i}>
                  <div className="mk-copy-head">
                    <input
                      className="mk-copy-title"
                      value={c.titulo || ""}
                      placeholder={`Versão ${i + 1} (ex.: Instagram, LinkedIn, Reel…)`}
                      onChange={(e) => setCopies(copies.map((x, j) => (j === i ? { ...x, titulo: e.target.value } : x)))}
                      onBlur={commit("copies")}
                    />
                    <span className="mk-copy-count">{(c.texto || "").length} car.</span>
                    <button type="button" className="mk-icon-btn" title="Copiar texto" onClick={() => copiar(c.texto, i)}>
                      {copiado === i ? <I.Check size={15} /> : <I.Copy size={15} />}
                    </button>
                    <button type="button" className="mk-icon-btn is-danger" title="Remover versão" onClick={() => setCopies(copies.filter((_, j) => j !== i), true)}>
                      <I.Trash size={15} />
                    </button>
                  </div>
                  <AutoText
                    value={c.texto}
                    rows={4}
                    className="mk-copy-text"
                    placeholder="Texto da publicação…"
                    onChange={(v) => setCopies(copies.map((x, j) => (j === i ? { ...x, texto: v } : x)))}
                    onBlur={commit("copies")}
                  />
                </div>
              ))}
              <button type="button" className="mk-add" onClick={() => setCopies([...copies, { titulo: copies.length ? "" : "Principal", texto: "" }], true)}>
                <I.Plus size={15} /> {copies.length ? "Adicionar outra versão" : "Escrever copy"}
              </button>
              <Field label="Call to action">
                <AutoText value={d.cta} rows={1} placeholder="Ex.: Inscreva-se já no nosso site 👉 link na bio" onChange={(v) => edit("cta", v)} onBlur={commit("cta")} />
              </Field>
              <Field label="CTA 2" hint="secundário (ex.: Guarde este post)">
                <AutoText value={d.cta_2} rows={1} placeholder="Ex.: Partilhe com a sua equipa" onChange={(v) => edit("cta_2", v)} onBlur={commit("cta_2")} />
              </Field>
              <Field label="Hashtags">
                <TagInput value={d.hashtags} prefix="#" onChange={(v) => set("hashtags", v)} placeholder="#marca #algarve…" />
              </Field>
            </div>
          </section>

          {/* DESIGN */}
          <section className="mk-sec" ref={(el) => { secRefs.current.design = el; }}>
            <h3><I.Image size={16} /> Design e ficheiros</h3>
            <div className="mk-stack">
              {links.map((l, i) => {
                const t = tipoLink(l.url);
                const href = urlSegura(l.url);
                return (
                  <div className="mk-link" key={i} style={{ "--c": t.cor }}>
                    <span className="mk-link-badge">{t.label}</span>
                    <input
                      className="mk-link-label"
                      value={l.label || ""}
                      placeholder="Nome (ex.: Design 1)"
                      onChange={(e) => setLinks(links.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
                      onBlur={commit("links")}
                    />
                    <input
                      className="mk-link-url"
                      value={l.url || ""}
                      placeholder="https://canva.link/…"
                      onChange={(e) => setLinks(links.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))}
                      onBlur={commit("links")}
                    />
                    {href && <a className="mk-icon-btn" href={href} target="_blank" rel="noreferrer" title="Abrir"><I.External size={15} /></a>}
                    <button type="button" className="mk-icon-btn is-danger" title="Remover" onClick={() => setLinks(links.filter((_, j) => j !== i), true)}><I.Trash size={15} /></button>
                  </div>
                );
              })}
              <button type="button" className="mk-add" onClick={() => setLinks([...links, { label: `Design ${links.length + 1}`, url: "" }], true)}>
                <I.Link size={15} /> Adicionar link (Canva, Brevo, Drive…)
              </button>
              <Field label="Ficheiros" hint="briefing, designs, PDFs…">
                <Anexos value={d.anexos} onChange={(v) => set("anexos", v)} pasta={`marketing/${item.marca_id}/conteudos/${item.id}`} avisar={avisar} />
              </Field>
            </div>
          </section>

          {/* NOTAS */}
          <section className="mk-sec" ref={(el) => { secRefs.current.notas = el; }}>
            <h3><I.Book size={16} /> Notas</h3>
            <AutoText
              className="mk-notes"
              value={d.notas}
              rows={6}
              placeholder="Espaço livre: especificação slide a slide, guião, decisões, referências…"
              onChange={(v) => edit("notas", v)}
              onBlur={commit("notas")}
            />
          </section>

          {/* APROVAÇÃO */}
          <section className="mk-sec" ref={(el) => { secRefs.current.aprovacao = el; }}>
            <h3><I.CheckCircle size={16} /> Aprovação</h3>
            {ehIdeia || arquivado ? (
              <p className="mk-hint">Passe a ideia para o fluxo para a poder enviar para aprovação.</p>
            ) : (
              <div className="mk-stack">
                {d.estado === "aprovacao" && (
                  <div className="mk-aprov-box is-wait">
                    <I.Clock size={18} />
                    <div>
                      <b>À espera de aprovação</b>
                      <span>
                        {(d.aprovadores || []).map((id) => pessoa(id)?.nome?.split(" ")[0]).filter(Boolean).join(", ") || "Sem aprovadores escolhidos"}
                        {d.enviado_aprovacao_em ? ` · enviado${pessoa(d.enviado_aprovacao_por)?.nome ? ` por ${pessoa(d.enviado_aprovacao_por).nome.split(" ")[0]}` : ""} ${fmtData(d.enviado_aprovacao_em)}` : ""}
                      </span>
                    </div>
                  </div>
                )}
                {d.estado === "alteracoes" && (
                  <div className="mk-aprov-box is-changes">
                    <I.Undo size={18} />
                    <div>
                      <b>Alterações necessárias</b>
                      <span className="mk-aprov-txt">{d.alteracoes || "—"}</span>
                    </div>
                  </div>
                )}
                {d.aprovado_em && d.estado !== "aprovacao" && d.estado !== "alteracoes" && (
                  <div className="mk-approved">
                    <I.CheckCircle size={20} />
                    <div>
                      <b>Aprovado</b>
                      <span>{aprovador?.nome ? `por ${aprovador.nome} · ` : ""}{fmtData(d.aprovado_em)}</span>
                    </div>
                  </div>
                )}

                {d.estado === "aprovacao" ? (
                  <>
                    <Field label="Alterações necessárias" hint="só se for pedir alterações">
                      <AutoText value={textoAlt} rows={2} placeholder="Ex.: trocar a foto do slide 2, confirmar o preço…" onChange={setTextoAlt} />
                    </Field>
                    <div className="mk-approve-row">
                      <button type="button" className="mk-btn is-warn-soft" onClick={pedirAlteracoes} disabled={aGravarAprov}><I.Undo size={15} /> Pedir alterações</button>
                      <button type="button" className="mk-btn is-ok" onClick={aprovar} disabled={aGravarAprov}><I.Check size={15} /> Aprovar</button>
                    </div>
                    <Field label="Aprovadores" hint="pode mudar e reenviar o pedido">
                      <PessoasPicker value={aprovSel} perfis={perfis} onChange={setAprovSel} />
                    </Field>
                    <div><button type="button" className="mk-btn is-ghost is-sm" onClick={enviarAprovacao} disabled={aGravarAprov || !aprovSel.length}><I.ArrowRight size={14} /> Reenviar pedido</button></div>
                  </>
                ) : (
                  <>
                    <Field label="Quem aprova" hint="recebem o pedido nas notificações do Dashboard; basta um aprovar">
                      <PessoasPicker value={aprovSel} perfis={perfis} onChange={setAprovSel} />
                    </Field>
                    <div className="mk-approve-row">
                      <button type="button" className="mk-btn is-primary" onClick={enviarAprovacao} disabled={aGravarAprov || !aprovSel.length}>
                        <I.ArrowRight size={15} /> {d.estado === "alteracoes" ? "Reenviar para aprovação" : "Enviar para aprovação"}
                      </button>
                    </div>
                  </>
                )}

                {Array.isArray(d.historico_aprovacao) && d.historico_aprovacao.length > 0 && (
                  <div className="mk-aprov-hist">
                    <h5>Histórico</h5>
                    <ul>
                      {[...d.historico_aprovacao].reverse().map((h, i) => (
                        <li key={i} className={`is-${h.tipo}`}>
                          <i />
                          <div>
                            <b>
                              {pessoa(h.por)?.nome?.split(" ")[0] || "Alguém"}{" "}
                              {h.tipo === "enviado"
                                ? `enviou para ${(h.para || []).map((id) => pessoa(id)?.nome?.split(" ")[0]).filter(Boolean).join(", ") || "aprovação"}`
                                : h.tipo === "aprovado" ? "aprovou" : "pediu alterações"}
                            </b>
                            <span>{fmtData(h.em)}</span>
                            {h.texto && <p>{h.texto}</p>}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* RESULTADOS */}
          <section className="mk-sec" ref={(el) => { secRefs.current.resultados = el; }}>
            <h3><I.Chart size={16} /> Resultados</h3>
            <div className="mk-grid">
              <Field label="Métrica principal" wide>
                <Chips options={METRICAS} value={d.metrica_principal} onChange={(v) => set("metrica_principal", v)} />
              </Field>
              <Field label="Resultado" hint={d.metrica_principal || ""}>
                <input type="number" className="mk-input" value={d.resultado ?? ""} placeholder="0" onChange={(e) => edit("resultado", e.target.value === "" ? null : Number(e.target.value))} onBlur={() => { if (d.resultado !== item.resultado) setResultado("resultado", d.resultado); }} />
              </Field>
              <Field label="Avaliação">
                <Chips options={AVALIACOES} value={d.avaliacao} onChange={(v) => setResultado("avaliacao", v)} colorOf={(o) => o.cor} />
              </Field>
              <Field label="Métricas da publicação" wide hint="valores do Meta Business Suite / LinkedIn / Brevo">
                <div className="mk-metricas">
                  {METRICAS_PECA.map((m) => (
                    <label key={m.k}>
                      <span>{m.label}</span>
                      <input type="number" min="0" className="mk-input" value={metricas[m.k] ?? ""} placeholder="—" onChange={(e) => editMetrica(m.k, e.target.value === "" ? null : Number(e.target.value))} onBlur={commitMetricas} />
                    </label>
                  ))}
                </div>
              </Field>
              <Field label="Link da publicação">
                <input className="mk-input" value={d.url_publicacao || ""} placeholder="https://instagram.com/p/…" onChange={(e) => edit("url_publicacao", e.target.value)} onBlur={commit("url_publicacao")} />
              </Field>
              <Field label="utm_campaign" hint="frente_tema_data">
                <input className="mk-input" value={d.utm_campaign || ""} placeholder="ex.: ciber_lancamento_2611" onChange={(e) => edit("utm_campaign", e.target.value.toLowerCase().replace(/\s+/g, "_"))} onBlur={commit("utm_campaign")} />
              </Field>
              <Field label="Verba da campanha (€)">
                <input type="number" step="0.01" className="mk-input" value={d.verba ?? ""} placeholder="0,00" onChange={(e) => edit("verba", e.target.value === "" ? null : Number(e.target.value))} onBlur={commit("verba")} />
              </Field>
              <Field label="Valor gasto (€)">
                <input type="number" step="0.01" className="mk-input" value={d.verba_usada ?? ""} placeholder="0,00" onChange={(e) => edit("verba_usada", e.target.value === "" ? null : Number(e.target.value))} onBlur={commit("verba_usada")} />
              </Field>
              <Field label="Notas / análise" wide>
                <AutoText value={d.resultado_notas} rows={2} placeholder="O que correu bem, o que repetir, o que evitar…" onChange={(v) => edit("resultado_notas", v)} onBlur={commit("resultado_notas")} />
              </Field>
            </div>
          </section>
        </div>

        {guiaAberto && <GuiaPeek marca={marca} canais={d.canais || []} personas={personasDoItem} regras={regras} onClose={() => setGuiaAberto(false)} />}

        <footer className="mk-dfoot">
          <span className="mk-dmeta">
            {autor && <><Avatar pessoa={autor} size={20} /> Criado por {autor.nome?.split(" ")[0]} · </>}
            {fmtData(item.created_at, { hora: false })}
          </span>
          <span className="mk-spacer" />
          {arquivado ? (
            <button type="button" className="mk-btn is-ghost is-sm" onClick={() => onRestaurar(item)}><I.Undo size={14} /> Restaurar</button>
          ) : (
            <button type="button" className="mk-btn is-ghost is-sm" onClick={() => onArquivar(item)}><I.Archive size={14} /> Arquivar</button>
          )}
          {confirmDel ? (
            <button type="button" className="mk-btn is-danger is-sm" onClick={() => onEliminar(item)} onBlur={() => setConfirmDel(false)} autoFocus>Confirmar eliminação</button>
          ) : (
            <button type="button" className="mk-btn is-danger-soft is-sm" onClick={() => setConfirmDel(true)}><I.Trash size={14} /> Eliminar</button>
          )}
        </footer>
      </aside>
    </div>
  );
}

