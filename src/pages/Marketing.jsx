import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../services/supabase";
import { useAuth } from "../context/AuthContext";
import SlidingTabs from "../components/SlidingTabs";
import FancySelect from "../components/FancySelect";
import ConteudoDrawer from "../components/marketing/ConteudoDrawer";
import { Avatar, AvatarStack, PersonaFace } from "../components/marketing/mkFields";
import CalendarioEditorial from "../components/marketing/CalendarioEditorial";
import Personas from "../components/marketing/Personas";
import ImportarFluxo from "../components/marketing/ImportarFluxo";
import AssistenteIdeias from "../components/marketing/AssistenteIdeias";
import MarcaGuia from "../components/marketing/MarcaGuia";
import Estrategia from "../components/marketing/Estrategia";
import { frentesDoCiclo } from "../components/marketing/estrategiaModelo";
import MarcasModal, { MarcaLogo } from "../components/marketing/MarcasModal";
import { I } from "../components/marketing/mkIcons";
import { ETAPAS, ETAPAS_ANTES_AGENDAR, estadoInfo, canalInfo, CANAIS, prioridadeInfo, avaliacaoInfo } from "../constants/marketing";
import { fmtData, diasAte, norm } from "../components/marketing/mkUtils";
import "../styles/marketing.css";

const LS_MARCA = "bizin-mk-marca";
const lerLS = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const gravarLS = (k, v) => { try { localStorage.setItem(k, v); } catch { /* ignora */ } };
const lista = (v) => (Array.isArray(v) ? v : v ? [v] : []);
const idsResp = (c) => (Array.isArray(c.responsavel_ids) && c.responsavel_ids.length ? c.responsavel_ids : c.responsavel_id ? [c.responsavel_id] : []);
/** Ordem "no fim" de uma coluna (segundos desde 1970) */
const ordemAgora = () => Date.now() / 1000;

/* =========================================================================
   Cartão do quadro
   ========================================================================= */
function Cartao({ it, pessoas = [], personasDoItem = [], onAbrir, onDragStart, onDragEnd, arrastando, dropAntes, onDragOverCard }) {
  const prio = prioridadeInfo(it.prioridade);
  const antesDeAgendar = ETAPAS_ANTES_AGENDAR.includes(it.estado);
  let data = null;
  if (antesDeAgendar && it.data_entrega) {
    const n = diasAte(it.data_entrega);
    data = { txt: `Entrega ${fmtData(it.data_entrega)}`, tom: n < 0 ? "late" : n <= 2 ? "soon" : "" };
  } else if (it.data_publicacao) {
    data = { txt: fmtData(it.data_publicacao), tom: "" };
  }
  return (
    <article
      className={`mk-card ${arrastando ? "is-dragging" : ""} ${dropAntes ? "is-drop-before" : ""}`}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOverCard}
      onClick={onAbrir}
      onKeyDown={(e) => { if (e.key === "Enter") onAbrir(); }}
      tabIndex={0}
    >
      {(lista(it.formato).length > 0 || prio || it.campanha) && (
        <div className="mk-card-top">
          {lista(it.formato)[0] && <span className="mk-fmt">{lista(it.formato)[0]}{lista(it.formato).length > 1 && <em> +{lista(it.formato).length - 1}</em>}</span>}
          <span className="mk-spacer" />
          {prio && <span className="mk-prio" style={{ "--c": prio.cor }} title={`Prioridade ${prio.label}`}><I.Flag size={12} sw={2.5} /> {prio.label}</span>}
        </div>
      )}
      {it.campanha && <span className="mk-camp" title={`Campanha: ${it.campanha}`}><I.Flag size={11} /> {it.campanha}</span>}
      <h4>{it.titulo || <span className="mk-untitled">Sem título</span>}</h4>
      {it.headline && <p className="mk-card-hook">{it.headline}</p>}
      {["producao", "criacao"].includes(it.estado) && it.alteracoes && <span className="mk-card-alert"><I.Undo size={12} /> Alterações pedidas</span>}
      <div className="mk-card-foot">
        <span className="mk-canais">
          {(it.canais || []).slice(0, 4).map((c) => { const ci = canalInfo(c); return <b key={c} style={{ background: ci.cor }} title={c}>{ci.sigla}</b>; })}
          {(it.canais || []).length > 4 && <em>+{it.canais.length - 4}</em>}
        </span>
        <span className="mk-spacer" />
        {personasDoItem.length > 0 && (
          <span className="mk-pstack" title={personasDoItem.map((p) => `${p.nome_persona} (${p.papel})`).join(", ")}>
            {personasDoItem.slice(0, 3).map((p) => <PersonaFace key={p.id} persona={p} size={20} />)}
          </span>
        )}
        {data && <span className={`mk-date ${data.tom ? `is-${data.tom}` : ""}`}><I.Clock size={12} /> {data.txt}</span>}
        <AvatarStack pessoas={pessoas} size={24} />
      </div>
    </article>
  );
}

/* =========================================================================
   Página
   ========================================================================= */
export default function Marketing() {
  const { user } = useAuth() || {};
  const [marcas, setMarcas] = useState([]);
  const [perfis, setPerfis] = useState([]);
  const [resumo, setResumo] = useState([]); // [{ marca_id, estado }] para as contagens das outras marcas
  const [marcaId, setMarcaId] = useState(() => lerLS(LS_MARCA));
  const [conteudos, setConteudos] = useState([]);
  const [carregadoPara, setCarregadoPara] = useState(null);
  const [personas, setPersonas] = useState([]);
  const [ciclos, setCiclos] = useState([]);
  const [baseOk, setBaseOk] = useState(false);
  const [tab, setTab] = useState("fluxo");
  const [busca, setBusca] = useState("");
  const [fResp, setFResp] = useState("");
  const [fCanal, setFCanal] = useState("");
  const [fCamp, setFCamp] = useState("");
  const [importarFluxo, setImportarFluxo] = useState(false);
  const [iaAberto, setIaAberto] = useState(false);
  const [abertoId, setAbertoId] = useState(null);
  const [gerirMarcas, setGerirMarcas] = useState(false);
  const [toast, setToast] = useState(null);
  const [novaIdeia, setNovaIdeia] = useState("");
  const [drag, setDrag] = useState(null); // { id }
  const [dropCol, setDropCol] = useState(null);
  const [dropAntes, setDropAntes] = useState(null);
  const [recarregar, setRecarregar] = useState(0);
  const toastTimer = useRef(null);

  const avisar = useCallback((msg, tipo = "ok") => {
    clearTimeout(toastTimer.current);
    setToast({ msg, tipo, key: Date.now() });
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  }, []);

  /* ---------- carregar ---------- */
  useEffect(() => {
    let vivo = true;
    Promise.all([
      supabase.from("marketing_marcas").select("*").order("ordem").order("nome"),
      supabase.from("profiles").select("id, nome, avatar_url").eq("ativo", true).order("nome"),
      supabase.from("marketing_conteudos").select("marca_id, estado"),
    ]).then(([m, p, r]) => {
      if (!vivo) return;
      if (m.error) avisar("Não foi possível carregar as marcas. A migração 052 já foi aplicada?", "error");
      setMarcas(m.data || []);
      setPerfis(p.data || []);
      setResumo(r.data || []);
      setBaseOk(true);
    });
    return () => { vivo = false; };
  }, [avisar]);

  const marcasVisiveis = useMemo(() => marcas.filter((m) => m.ativo), [marcas]);
  const marca = marcasVisiveis.find((m) => m.id === marcaId) || marcasVisiveis[0] || null;
  const marcaAtual = marca?.id || null;

  useEffect(() => {
    if (!marcaAtual) return undefined;
    let vivo = true;
    Promise.all([
      supabase.from("marketing_conteudos").select("*").eq("marca_id", marcaAtual).order("ordem", { ascending: true }),
      supabase.from("marketing_personas").select("*").eq("marca_id", marcaAtual).order("ordem", { ascending: true }),
      supabase.from("marketing_ciclos").select("*").eq("marca_id", marcaAtual).order("inicio", { ascending: false }),
    ]).then(([c, p, cc]) => {
      if (!vivo) return;
      if (c.error) avisar("Não foi possível carregar os conteúdos.", "error");
      setConteudos(c.data || []);
      setPersonas(p.error ? [] : p.data || []);
      setCiclos(cc.error ? [] : cc.data || []);
      setCarregadoPara(marcaAtual);
    });
    return () => { vivo = false; };
  }, [marcaAtual, recarregar, avisar]);

  const escolherMarca = (id) => {
    setMarcaId(id);
    gravarLS(LS_MARCA, id);
    setAbertoId(null);
  };

  /* ---------- gravar ---------- */
  const patch = useCallback(async (id, campos) => {
    setConteudos((prev) => prev.map((c) => (c.id === id ? { ...c, ...campos } : c)));
    const { error } = await supabase.from("marketing_conteudos").update(campos).eq("id", id);
    if (error) {
      avisar(`Não foi possível guardar: ${error.message}`, "error");
      setRecarregar((n) => n + 1);
    }
  }, [avisar]);

  const criar = useCallback(async (base = {}) => {
    if (!marcaAtual) return;
    const { data, error } = await supabase
      .from("marketing_conteudos")
      .insert({ marca_id: marcaAtual, estado: "curadoria", titulo: "", ordem: ordemAgora(), ...base })
      .select()
      .single();
    if (error) { avisar(`Não foi possível criar: ${error.message}`, "error"); return; }
    setConteudos((prev) => [...prev, data]);
    setResumo((prev) => [...prev, { marca_id: data.marca_id, estado: data.estado }]);
    if (base.estado !== "ideia" || !base.titulo) setAbertoId(data.id);
    return data;
  }, [marcaAtual, avisar]);

  const arquivar = useCallback((it) => {
    patch(it.id, { estado: "arquivado", estado_antes_arquivo: it.estado });
    setAbertoId(null);
    avisar("Arquivado.");
  }, [patch, avisar]);

  const restaurar = useCallback((it) => {
    patch(it.id, { estado: it.estado_antes_arquivo || "ideia", estado_antes_arquivo: null });
    avisar("Restaurado.");
  }, [patch, avisar]);

  const eliminar = useCallback(async (it) => {
    setConteudos((prev) => prev.filter((c) => c.id !== it.id));
    setAbertoId(null);
    const { error } = await supabase.from("marketing_conteudos").delete().eq("id", it.id);
    if (error) { avisar(`Não foi possível eliminar: ${error.message}`, "error"); setRecarregar((n) => n + 1); }
    else avisar("Eliminado.");
  }, [avisar]);

  /* ---------- marcas ---------- */
  /** Cria (id = null) ou altera uma marca. Lança erro com mensagem amigável. */
  const salvarMarca = async (id, campos) => {
    const q = id
      ? supabase.from("marketing_marcas").update(campos).eq("id", id).select().single()
      : supabase.from("marketing_marcas").insert({ ordem: marcas.length + 1, ...campos }).select().single();
    const { data, error } = await q;
    if (error) throw new Error(error.code === "23505" ? "Já existe uma marca com esse nome." : error.message);
    setMarcas((prev) => (id ? prev.map((m) => (m.id === id ? data : m)) : [...prev, data]));
    avisar(id ? "Marca guardada." : `Marca ${data.nome} criada.`);
    return data;
  };
  /* ---------- importar do Notion ---------- */
  const importarConteudos = async (linhas, { tipo = "conteúdo" } = {}) => {
    const base = ordemAgora();
    const rows = linhas.map((l, i) => ({ ...l, marca_id: marcaAtual, ordem: base + i }));
    const criados = [];
    for (let i = 0; i < rows.length; i += 50) {
      const { data, error } = await supabase.from("marketing_conteudos").insert(rows.slice(i, i + 50)).select();
      if (error) { avisar(`Erro ao importar: ${error.message}`, "error"); break; }
      criados.push(...(data || []));
    }
    if (criados.length) {
      setConteudos((prev) => [...prev, ...criados]);
      setResumo((prev) => [...prev, ...criados.map((c) => ({ marca_id: c.marca_id, estado: c.estado }))]);
      const n = criados.length;
      avisar(tipo === "ideia" ? `${n} ideia${n === 1 ? "" : "s"} guardada${n === 1 ? "" : "s"} no Banco de Ideias.` : `${n} conteúdo${n === 1 ? "" : "s"} importado${n === 1 ? "" : "s"}.`);
    }
    return criados.length;
  };

  /* ---------- estratégia (ciclos) ---------- */
  const criarCiclo = async (campos) => {
    const { data, error } = await supabase.from("marketing_ciclos").insert({ marca_id: marcaAtual, ...campos }).select().single();
    if (error) { avisar(`Não foi possível criar o ciclo: ${error.message}`, "error"); return null; }
    setCiclos((prev) => [data, ...prev].sort((a, b) => String(b.inicio || "").localeCompare(String(a.inicio || ""))));
    return data;
  };
  const patchCiclo = async (id, campos) => {
    const { data, error } = await supabase.from("marketing_ciclos").update(campos).eq("id", id).select().single();
    if (error) { avisar(`Não foi possível guardar: ${error.message}`, "error"); return false; }
    setCiclos((prev) => prev.map((c) => (c.id === id ? data : c)));
    return true;
  };
  const eliminarCiclo = async (id) => {
    const { error } = await supabase.from("marketing_ciclos").delete().eq("id", id);
    if (error) { avisar(`Não foi possível eliminar: ${error.message}`, "error"); return; }
    setCiclos((prev) => prev.filter((c) => c.id !== id));
    avisar("Ciclo eliminado.");
  };

  const salvarGuia = async (guia) => {
    try {
      await salvarMarca(marcaAtual, { guia });
      return true;
    } catch (e) {
      avisar(`Não foi possível guardar o guia: ${e.message}`, "error");
      return false;
    }
  };
  const eliminarMarca = async (id) => {
    const { error } = await supabase.from("marketing_marcas").delete().eq("id", id);
    if (error) { avisar(`Não foi possível eliminar: ${error.message}`, "error"); return; }
    setMarcas((prev) => prev.filter((m) => m.id !== id));
  };

  /* ---------- personas ---------- */
  const criarPersona = async (campos) => {
    const { data, error } = await supabase.from("marketing_personas").insert({ marca_id: marcaAtual, ordem: personas.length + 1, ...campos }).select().single();
    if (error) { avisar(`Não foi possível criar a persona: ${error.message}`, "error"); return null; }
    setPersonas((prev) => [...prev, data]);
    return data;
  };
  const patchPersona = useCallback(async (id, campos) => {
    setPersonas((prev) => prev.map((p) => (p.id === id ? { ...p, ...campos } : p)));
    const { error } = await supabase.from("marketing_personas").update(campos).eq("id", id);
    if (error) avisar(`Não foi possível guardar a persona: ${error.message}`, "error");
  }, [avisar]);
  const eliminarPersona = async (id) => {
    const { error } = await supabase.from("marketing_personas").delete().eq("id", id);
    if (error) { avisar(`Não foi possível eliminar: ${error.message}`, "error"); return; }
    setPersonas((prev) => prev.filter((p) => p.id !== id));
    // Tira a persona dos conteúdos que a usavam
    const afetados = conteudos.filter((c) => (c.persona_ids || []).includes(id));
    for (const c of afetados) patch(c.id, { persona_ids: c.persona_ids.filter((x) => x !== id) });
    avisar("Persona eliminada.");
  };
  const importarPersonas = async (lista) => {
    if (!lista.length) return true;
    const linhas = lista.map((p, i) => ({ ...p, marca_id: marcaAtual, ordem: personas.length + i + 1 }));
    const { data, error } = await supabase.from("marketing_personas").insert(linhas).select();
    if (error) { avisar(`Não foi possível importar: ${error.message}`, "error"); return false; }
    setPersonas((prev) => [...prev, ...(data || [])]);
    const n = data?.length || 0;
    avisar(`${n} persona${n === 1 ? "" : "s"} importada${n === 1 ? "" : "s"}.`);
    return true;
  };

  /* ---------- derivados ---------- */
  const pessoa = useCallback((id) => perfis.find((p) => p.id === id) || null, [perfis]);

  const contagemMarcas = useMemo(() => {
    const out = {};
    for (const r of resumo) if (r.marca_id !== marcaAtual && r.estado !== "ideia" && r.estado !== "arquivado") out[r.marca_id] = (out[r.marca_id] || 0) + 1;
    out[marcaAtual] = conteudos.filter((c) => c.estado !== "ideia" && c.estado !== "arquivado").length;
    return out;
  }, [resumo, conteudos, marcaAtual]);

  const contagemTotal = useMemo(() => {
    const out = {};
    for (const r of resumo) if (r.marca_id !== marcaAtual) out[r.marca_id] = (out[r.marca_id] || 0) + 1;
    out[marcaAtual] = conteudos.length;
    return out;
  }, [resumo, conteudos, marcaAtual]);

  const filtrados = useMemo(() => {
    const q = norm(busca.trim());
    return conteudos.filter((c) => {
      if (fResp === "__eu__" ? !idsResp(c).includes(user?.id) : fResp && !idsResp(c).includes(fResp)) return false;
      if (fCanal && !(c.canais || []).includes(fCanal)) return false;
      if (fCamp && (c.campanha || "") !== fCamp) return false;
      if (q && !norm(`${c.titulo} ${c.headline || ""} ${(c.hashtags || []).join(" ")} ${lista(c.formato).join(" ")} ${c.campanha || ""}`).includes(q)) return false;
      return true;
    });
  }, [conteudos, busca, fResp, fCanal, fCamp, user?.id]);

  const colunas = useMemo(() => {
    const out = Object.fromEntries(ETAPAS.map((e) => [e.id, []]));
    for (const c of filtrados) if (out[c.estado]) out[c.estado].push(c);
    for (const k of Object.keys(out)) out[k].sort((a, b) => a.ordem - b.ordem);
    return out;
  }, [filtrados]);

  const ideias = useMemo(() => filtrados.filter((c) => c.estado === "ideia").sort((a, b) => new Date(b.created_at) - new Date(a.created_at)), [filtrados]);
  const arquivo = useMemo(() => filtrados.filter((c) => c.estado === "arquivado").sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)), [filtrados]);
  const noCalendario = useMemo(() => filtrados.filter((c) => c.estado !== "arquivado"), [filtrados]);

  const stats = useMemo(() => {
    const agora = new Date();
    const emCurso = conteudos.filter((c) => ETAPAS_ANTES_AGENDAR.includes(c.estado)).length;
    const paraAprovar = conteudos.filter((c) => c.estado === "aprovacao").length;
    const semana = conteudos.filter((c) => c.estado !== "arquivado" && c.data_publicacao && (() => { const n = diasAte(c.data_publicacao); return n >= 0 && n <= 7; })()).length;
    const publicados = conteudos.filter((c) => ["publicado", "monitorado"].includes(c.estado) && c.data_publicacao && new Date(c.data_publicacao).getMonth() === agora.getMonth() && new Date(c.data_publicacao).getFullYear() === agora.getFullYear()).length;
    const atrasados = conteudos.filter((c) => ETAPAS_ANTES_AGENDAR.includes(c.estado) && c.data_entrega && diasAte(c.data_entrega) < 0).length;
    return { emCurso, paraAprovar, semana, publicados, atrasados };
  }, [conteudos]);

  const frentes = useMemo(() => [...new Set(ciclos.flatMap((c) => frentesDoCiclo(c)))], [ciclos]);
  const marcos = useMemo(() => ciclos.flatMap((c) => (c.dados?.analise?.marcos || []).filter((m) => m.data).map((m) => ({ ...m, ciclo: c.nome }))), [ciclos]);
  const personaPorId = useMemo(() => Object.fromEntries(personas.map((p) => [p.id, p])), [personas]);
  const sugestoesPilar = useMemo(() => [...new Set(conteudos.flatMap((c) => lista(c.pilar)))], [conteudos]);
  const campanhas = useMemo(() => [...new Set(conteudos.map((c) => (c.campanha || "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt")), [conteudos]);

  const aberto = conteudos.find((c) => c.id === abertoId) || null;

  /* ---------- arrastar no quadro ---------- */
  const largarNaColuna = (colId) => {
    if (!drag) return;
    const lista = (colunas[colId] || []).filter((c) => c.id !== drag.id);
    let ordem;
    const idx = dropAntes ? lista.findIndex((c) => c.id === dropAntes) : -1;
    if (idx >= 0) {
      const depois = lista[idx].ordem;
      const antes = idx > 0 ? lista[idx - 1].ordem : depois - 1;
      ordem = (antes + depois) / 2;
    } else {
      ordem = lista.length ? lista[lista.length - 1].ordem + 1 : ordemAgora();
    }
    const it = conteudos.find((c) => c.id === drag.id);
    if (it && (it.estado !== colId || it.ordem !== ordem)) patch(it.id, { estado: colId, ordem });
    setDrag(null);
    setDropCol(null);
    setDropAntes(null);
  };

  const adicionarIdeia = async (e) => {
    e.preventDefault();
    const t = novaIdeia.trim();
    if (!t) return;
    setNovaIdeia("");
    await criar({ estado: "ideia", titulo: t });
    avisar("Ideia guardada.");
  };

  const carregando = !baseOk || (marcaAtual && carregadoPara !== marcaAtual);

  /* ---------- render ---------- */
  return (
    <div className="mk-page" style={{ "--brand": marca?.cor || "#2563eb" }}>
      {toast && (
        <div className={`mk-toast ${toast.tipo === "error" ? "is-error" : ""}`} key={toast.key}>
          {toast.tipo === "error" ? <I.Alert size={16} /> : <I.Check size={16} />} {toast.msg}
        </div>
      )}

      <header className="mk-hero">
        <div className="mk-hero-bg"><span className="mk-orb mk-orb-a" /><span className="mk-orb mk-orb-b" /><span className="mk-dots" /></div>
        <div className="mk-hero-row">
          <div className="mk-hero-main">
            <span className="mk-hero-icon"><I.Megaphone size={26} /></span>
            <div>
              <h1>Marketing</h1>
              <p>Do banco de ideias à publicação — tudo por marca, num só sítio.</p>
            </div>
          </div>
          <div className="mk-hero-actions">
            <button type="button" className="mk-hero-btn mk-ia-hero-btn" onClick={() => { setTab("ideias"); setIaAberto(true); }} disabled={!marcaAtual}><I.Sparkle size={16} /> Ideias com IA</button>
            <button type="button" className="mk-hero-btn" onClick={() => setTab("ideias")}><I.Bulb size={16} /> Nova ideia</button>
            <button type="button" className="mk-cta" onClick={() => criar({ estado: "curadoria" })} disabled={!marcaAtual}><I.Plus size={16} sw={2.6} /> Novo conteúdo</button>
          </div>
        </div>

        <div className="mk-hero-tools">
          <div className="mk-brands" role="tablist" aria-label="Marca">
            {marcasVisiveis.map((m) => (
              <button key={m.id} type="button" role="tab" aria-selected={m.id === marcaAtual} className={m.id === marcaAtual ? "is-on" : ""} style={{ "--c": m.cor }} onClick={() => escolherMarca(m.id)}>
                <MarcaLogo marca={m} size={20} />{m.nome}<em>{contagemMarcas[m.id] || 0}</em>
              </button>
            ))}
            <button type="button" className="mk-brands-gear" onClick={() => setGerirMarcas(true)} title="Gerir marcas"><I.Settings size={16} /></button>
          </div>
          <div className="mk-hero-stats">
            <span className="mk-stat"><strong>{stats.emCurso}</strong> em curso</span>
            <span className={`mk-stat ${stats.paraAprovar ? "is-alert" : ""}`}><strong>{stats.paraAprovar}</strong> para aprovar</span>
            <span className="mk-stat"><strong>{stats.semana}</strong> nos próximos 7 dias</span>
            <span className="mk-stat"><strong>{stats.publicados}</strong> publicados este mês</span>
            {stats.atrasados > 0 && <span className="mk-stat is-late"><strong>{stats.atrasados}</strong> com entrega atrasada</span>}
          </div>
        </div>
      </header>

      <div className="mk-toolbar">
        <SlidingTabs
          value={tab}
          onChange={setTab}
          ariaLabel="Vistas"
          tabs={[
            { id: "fluxo", label: "Fluxo", icon: <I.Board size={16} />, count: ETAPAS.reduce((n, e) => n + (colunas[e.id]?.length || 0), 0) },
            { id: "calendario", label: "Calendário", icon: <I.Calendar size={16} /> },
            { id: "ideias", label: "Ideias", icon: <I.Bulb size={16} />, count: ideias.length },
            { id: "personas", label: "Personas", icon: <I.User size={16} />, count: personas.length },
            { id: "estrategia", label: "Estratégia", icon: <I.Target size={16} />, count: ciclos.length || undefined },
            { id: "marca", label: "Marca", icon: <I.Book size={16} /> },
            { id: "arquivo", label: "Arquivo", icon: <I.Archive size={16} />, count: arquivo.length },
          ]}
        />
        <span className="mk-spacer" />
        {["fluxo", "calendario", "ideias", "arquivo"].includes(tab) && (<>
        <label className="mk-search">
          <I.Search size={16} />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Procurar tema, hook, #hashtag…" />
          {busca && <button type="button" onClick={() => setBusca("")} aria-label="Limpar"><I.X size={14} /></button>}
        </label>
        <FancySelect
          className="mk-filter"
          value={fResp}
          onChange={setFResp}
          icon={<I.User size={15} />}
          menuWidth={260}
          options={[
            { value: "", label: "Toda a equipa" },
            { value: "__eu__", label: "Os meus" },
            ...perfis.map((p) => ({ value: p.id, label: p.nome || "Sem nome", icon: <Avatar pessoa={p} size={20} /> })),
          ]}
        />
        <FancySelect
          className="mk-filter"
          value={fCanal}
          onChange={setFCanal}
          menuWidth={220}
          options={[{ value: "", label: "Todos os canais" }, ...CANAIS.map((c) => ({ value: c.id, label: c.id, icon: <b className="mk-canal-dot" style={{ background: c.cor }}>{c.sigla}</b> }))]}
        />
        {campanhas.length > 0 && (
          <FancySelect
            className="mk-filter"
            value={fCamp}
            onChange={setFCamp}
            icon={<I.Flag size={14} />}
            menuWidth={320}
            options={[{ value: "", label: "Todas as campanhas" }, ...campanhas.map((c) => ({ value: c, label: c, hint: `${conteudos.filter((x) => x.campanha === c).length} peças` }))]}
          />
        )}
        <button type="button" className="mk-btn is-ghost mk-import-btn" onClick={() => setImportarFluxo(true)} title="Importar o CSV do Fluxo de Conteúdos / Banco de Ideias do Notion"><I.Archive size={15} /> Importar</button>
        </>)}
      </div>

      {carregando ? (
        <div className="mk-loading"><span className="mk-spinner" /> A carregar…</div>
      ) : !marca ? (
        <div className="mk-empty">
          <I.Megaphone size={34} />
          <h3>Ainda não há marcas</h3>
          <p>Crie a primeira marca para começar a planear conteúdos.</p>
          <button type="button" className="mk-btn is-primary" onClick={() => setGerirMarcas(true)}><I.Plus size={15} /> Criar marca</button>
        </div>
      ) : tab === "fluxo" ? (
        <div className="mk-board" key={marcaAtual}>
          {ETAPAS.map((etapa, ci) => {
            const lista = colunas[etapa.id] || [];
            return (
              <section
                key={etapa.id}
                className={`mk-col ${dropCol === etapa.id ? "is-over" : ""}`}
                style={{ "--c": etapa.cor, animationDelay: `${ci * 40}ms` }}
                onDragOver={(e) => { if (drag) { e.preventDefault(); setDropCol(etapa.id); } }}
                onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) { setDropCol(null); setDropAntes(null); } }}
                onDrop={(e) => { e.preventDefault(); largarNaColuna(etapa.id); }}
              >
                <header className="mk-col-head" title={etapa.dica}>
                  <i />
                  <h3>{etapa.label}</h3>
                  <em>{lista.length}</em>
                  <span className="mk-spacer" />
                  <button type="button" className="mk-icon-btn is-sm" title={`Novo em ${etapa.label}`} onClick={() => criar({ estado: etapa.id })}><I.Plus size={15} /></button>
                </header>
                <div className="mk-col-body">
                  {lista.map((it) => (
                    <Cartao
                      key={it.id}
                      it={it}
                      pessoas={idsResp(it).map(pessoa).filter(Boolean)}
                      personasDoItem={(it.persona_ids || []).map((id) => personaPorId[id]).filter(Boolean)}
                      arrastando={drag?.id === it.id}
                      dropAntes={dropAntes === it.id && drag?.id !== it.id}
                      onAbrir={() => setAbertoId(it.id)}
                      onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", it.id); setDrag({ id: it.id }); }}
                      onDragEnd={() => { setDrag(null); setDropCol(null); setDropAntes(null); }}
                      onDragOverCard={(e) => {
                        if (!drag) return;
                        const r = e.currentTarget.getBoundingClientRect();
                        const metadeDeCima = e.clientY < r.top + r.height / 2;
                        if (metadeDeCima) setDropAntes(it.id);
                        else {
                          const idx = lista.findIndex((c) => c.id === it.id);
                          setDropAntes(lista[idx + 1]?.id || null);
                        }
                      }}
                    />
                  ))}
                  {lista.length === 0 && (
                    <button type="button" className="mk-col-empty" onClick={() => criar({ estado: etapa.id })}>
                      {drag ? "Largar aqui" : etapa.dica}
                    </button>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      ) : tab === "estrategia" ? (
        <Estrategia
          key={marcaAtual}
          marca={marca}
          ciclos={ciclos}
          personas={personas}
          conteudos={conteudos}
          onCriar={criarCiclo}
          onPatch={patchCiclo}
          onEliminar={eliminarCiclo}
          avisar={avisar}
        />
      ) : tab === "marca" ? (
        <MarcaGuia marca={marca} onSalvarGuia={salvarGuia} avisar={avisar} />
      ) : tab === "personas" ? (
        <Personas
          marca={marca}
          personas={personas}
          conteudos={conteudos}
          onCriar={criarPersona}
          onPatch={patchPersona}
          onEliminar={eliminarPersona}
          onImportar={importarPersonas}
          avisar={avisar}
        />
      ) : tab === "calendario" ? (
        <CalendarioEditorial itens={noCalendario} marcos={marcos} onAbrir={setAbertoId} onPatch={patch} onCriar={(base) => criar({ estado: "curadoria", ...base })} />
      ) : tab === "ideias" ? (
        <div className="mk-ideas">
          <form className="mk-idea-new" onSubmit={adicionarIdeia}>
            <span className="mk-idea-new-ico"><I.Bulb size={20} /></span>
            <input value={novaIdeia} onChange={(e) => setNovaIdeia(e.target.value)} placeholder={`Tive uma ideia para a ${marca.nome}…`} autoFocus />
            <button type="submit" className="mk-btn is-primary" disabled={!novaIdeia.trim()}>Guardar ideia</button>
            <button type="button" className="mk-btn mk-ia-btn" onClick={() => setIaAberto(true)}><I.Sparkle size={15} /> Assistente de ideias</button>
          </form>
          {ideias.length === 0 ? (
            <div className="mk-empty is-soft">
              <I.Bulb size={30} />
              <h3>O banco de ideias está vazio</h3>
              <p>Escreva acima qualquer ideia — depois desenvolve-a e passa-a para o fluxo quando fizer sentido.</p>
            </div>
          ) : (
            <div className="mk-idea-grid">
              {ideias.map((it, i) => {
                const autor = pessoa(it.created_by);
                return (
                  <article key={it.id} className="mk-idea" style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }} onClick={() => setAbertoId(it.id)}>
                    {(avaliacaoInfo(it.avaliacao) || prioridadeInfo(it.prioridade)) && (
                      <div className="mk-idea-badges">
                        {prioridadeInfo(it.prioridade) && <span className="mk-prio" style={{ "--c": prioridadeInfo(it.prioridade).cor }}><I.Flag size={12} sw={2.5} /> {prioridadeInfo(it.prioridade).label}</span>}
                        {avaliacaoInfo(it.avaliacao) && <span className="mk-aval" style={{ "--c": avaliacaoInfo(it.avaliacao).cor }}><i />{avaliacaoInfo(it.avaliacao).label}</span>}
                      </div>
                    )}
                    <h4>{it.titulo || <span className="mk-untitled">Sem título</span>}</h4>
                    {it.headline && <p className="mk-card-hook">{it.headline}</p>}
                    {(lista(it.formato).length > 0 || it.canais?.length > 0) && (
                      <div className="mk-idea-tags">
                        {lista(it.formato).map((f) => <span key={f} className="mk-fmt">{f}</span>)}
                        <span className="mk-canais">{(it.canais || []).map((c) => { const ci = canalInfo(c); return <b key={c} style={{ background: ci.cor }} title={c}>{ci.sigla}</b>; })}</span>
                      </div>
                    )}
                    <div className="mk-idea-foot">
                      <Avatar pessoa={autor} size={22} />
                      <span>{autor?.nome?.split(" ")[0] || "—"} · {fmtData(it.created_at, { hora: false })}</span>
                      <span className="mk-spacer" />
                      <button type="button" className="mk-icon-btn is-sm" title="Arquivar" onClick={(e) => { e.stopPropagation(); arquivar(it); }}><I.Archive size={14} /></button>
                      <button type="button" className="mk-btn is-soft is-sm" onClick={(e) => { e.stopPropagation(); patch(it.id, { estado: "curadoria", ordem: ordemAgora() }); avisar("Passou para o fluxo (Curadoria)."); }}>
                        Para o fluxo <I.ArrowRight size={13} />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="mk-archive">
          {arquivo.length === 0 ? (
            <div className="mk-empty is-soft"><I.Archive size={30} /><h3>Nada arquivado</h3><p>Ideias descartadas e conteúdos antigos aparecem aqui.</p></div>
          ) : arquivo.map((it) => {
            const antes = estadoInfo(it.estado_antes_arquivo || "ideia");
            return (
              <div key={it.id} className="mk-arch-row" onClick={() => setAbertoId(it.id)}>
                <span className="mk-arch-dot" style={{ background: antes.cor }} />
                <div className="mk-arch-main">
                  <b>{it.titulo || "Sem título"}</b>
                  <span>Estava em {antes.label}{it.data_publicacao ? ` · ${fmtData(it.data_publicacao, { hora: false })}` : ""}</span>
                </div>
                <button type="button" className="mk-btn is-ghost is-sm" onClick={(e) => { e.stopPropagation(); restaurar(it); }}><I.Undo size={14} /> Restaurar</button>
              </div>
            );
          })}
        </div>
      )}

      {aberto && (
        <ConteudoDrawer
          key={aberto.id}
          item={aberto}
          marca={marca}
          perfis={perfis}
          userId={user?.id}
          sugestoesPilar={sugestoesPilar}
          personas={personas}
          frentes={frentes}
          campanhas={campanhas}
          avisar={avisar}
          onPatch={patch}
          onClose={() => setAbertoId(null)}
          onArquivar={arquivar}
          onRestaurar={restaurar}
          onEliminar={eliminar}
        />
      )}

      {iaAberto && marca && (
        <AssistenteIdeias
          key={marca.id}
          marca={marca}
          personas={personas}
          onGuardar={(linhas) => importarConteudos(linhas, { tipo: "ideia" })}
          onClose={() => setIaAberto(false)}
        />
      )}

      {importarFluxo && marca && (
        <ImportarFluxo
          marca={marca}
          conteudos={conteudos}
          personas={personas}
          perfis={perfis}
          onClose={() => setImportarFluxo(false)}
          onImportar={importarConteudos}
        />
      )}

      {gerirMarcas && (
        <MarcasModal
          marcas={marcas}
          contagem={contagemTotal}
          onClose={() => setGerirMarcas(false)}
          onSalvar={salvarMarca}
          onEliminar={eliminarMarca}
        />
      )}
    </div>
  );
}
