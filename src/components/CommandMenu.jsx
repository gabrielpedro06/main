// =====================================================================
// Command Menu (Ctrl+K / ⌘K): uma caixa para saltar para qualquer sítio da app.
// Procura páginas (só as que o papel do utilizador pode abrir), ações rápidas,
// projetos, entidades, colegas e áreas da Ajuda. Pesquisa sem acentos.
// Abre com Ctrl+K, com o botão "Pesquisar" da barra lateral / barra de topo
// (evento "bz:comando") e fecha com Esc. ↑/↓ escolhem, Enter abre.
// Os dados (projetos, entidades, pessoas) ficam em cache na memória: ao reabrir
// aparecem logo e são atualizados por trás (stale-while-revalidate).
// Estilos: styles/command-menu.css (.cm-*). Montado em pages/Dashboard.jsx.
// =====================================================================
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { supabase } from "../services/supabase";
import { useAuth } from "../context/AuthContext";
import { SECCOES_AJUDA } from "../content/ajuda";
import { prefetchRota } from "../rotas";
import { ATALHO_COMANDO } from "../utils/comando";
import ProfilePeek from "./ProfilePeek";
import "../styles/command-menu.css";

const ADMIN = ["admin", "administrador"];
const GESTAO = ["admin", "administrador", "gestor"];

/** Páginas (os papéis espelham as rotas de App.jsx). */
const PAGINAS = [
  { rota: "/dashboard", titulo: "Início", extra: "dashboard painel" },
  { rota: "/dashboard/minhas-tarefas", titulo: "Agenda", extra: "minhas tarefas calendário" },
  { rota: "/dashboard/tarefas", titulo: "Tarefas globais", extra: "tarefas equipa" },
  { rota: "/dashboard/projetos", titulo: "Projetos", extra: "portfolio" },
  { rota: "/dashboard/clientes", titulo: "Entidades", extra: "clientes empresas parceiros organismos" },
  { rota: "/dashboard/atividades", titulo: "Atividades" },
  { rota: "/dashboard/forum", titulo: "Comunicação", extra: "fórum chat mensagens videochamada" },
  { rota: "/dashboard/ferias", titulo: "Ausências", extra: "férias faltas pedido" },
  { rota: "/dashboard/pedido-km", titulo: "Pedido de Km", extra: "kms quilómetros deslocações" },
  { rota: "/dashboard/perfil", titulo: "O meu perfil", extra: "conta password 2fa" },
  { rota: "/dashboard/avisos", titulo: "Programas e Avisos", extra: "financiamento" },
  { rota: "/dashboard/modelos", titulo: "Modelos de projetos", extra: "templates" },
  { rota: "/dashboard/cursos", titulo: "Cursos", extra: "formação" },
  { rota: "/dashboard/acoes-formacao", titulo: "Ações de Formação" },
  { rota: "/dashboard/organizador-pdf", titulo: "Organizador de PDFs" },
  { rota: "/dashboard/ajuda", titulo: "Ajuda", extra: "manual" },
  { rota: "/dashboard/rh", titulo: "Recursos Humanos", extra: "rh processamento assiduidade kms", papeis: GESTAO },
  { rota: "/dashboard/leads", titulo: "Leads", extra: "campanhas", papeis: [...GESTAO, "marketing"] },
  { rota: "/dashboard/marketing", titulo: "Marketing", papeis: [...GESTAO, "marketing", "marketing plus"] },
  { rota: "/dashboard/transfergest", titulo: "TransferGest", papeis: GESTAO },
  { rota: "/dashboard/ativos-ti", titulo: "Ativos TI", extra: "equipamentos inventário software", papeis: [...GESTAO, "marketing plus"] },
  { rota: "/dashboard/propostas", titulo: "Propostas comerciais", papeis: ADMIN },
  { rota: "/dashboard/admin", titulo: "Administração", extra: "admin utilizadores contas", papeis: ADMIN },
  { rota: "/dashboard/registos", titulo: "Registos", extra: "audit log atividade", papeis: ADMIN },
];

/** Ações rápidas (atalhos para o que mais se faz). */
const ACOES = [
  { id: "a-ferias", titulo: "Pedir férias ou ausência", extra: "marcar falta", rota: "/dashboard/ferias", ico: "Calendario" },
  { id: "a-km", titulo: "Pedir quilómetros", extra: "kms deslocação reembolso", rota: "/dashboard/pedido-km", ico: "Carro" },
  { id: "a-chat", titulo: "Enviar mensagem", extra: "chat conversa", rota: "/dashboard/forum", ico: "Mensagem" },
  { id: "a-proposta", titulo: "Nova proposta comercial", rota: "/dashboard/propostas/novo", papeis: ADMIN, ico: "Documento" },
  { id: "a-atalhos", titulo: "Atalhos de teclado", extra: "teclas teclado shortcuts ?", evento: "bz:atalhos", ico: "Teclado" },
  { id: "a-sair", titulo: "Terminar sessão", extra: "logout sair", sair: true, ico: "Sair" },
];

const LIMITE = { pagina: 6, acao: 4, projeto: 6, entidade: 6, pessoa: 6, ajuda: 4 };
const GRUPOS = [
  ["recente", "Recentes"],
  ["acao", "Ações"],
  ["pagina", "Páginas"],
  ["projeto", "Projetos"],
  ["entidade", "Entidades"],
  ["pessoa", "Pessoas"],
  ["ajuda", "Ajuda"],
];

const CHAVE_RECENTES = "bz-comando-recentes";

const normalizar = (t) =>
  String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Pontuação: 0 = não serve; maior = melhor (começa por > palavra começa por > contém). */
function pontuar(texto, termos) {
  if (!termos.length) return 1;
  const alvo = normalizar(texto);
  let total = 0;
  for (const t of termos) {
    const i = alvo.indexOf(t);
    if (i < 0) return 0;
    total += i === 0 ? 3 : /\s|[-/(·]/.test(alvo[i - 1]) ? 2 : 1;
  }
  return total;
}

// Cache dos dados em memória (dura enquanto a página não é recarregada)
let cacheDados = null;

async function carregarDados() {
  const [proj, ent, pes] = await Promise.all([
    supabase.from("projetos").select("id, titulo, codigo, estado, clientes!cliente_id ( marca, sigla )").order("created_at", { ascending: false }).limit(800),
    supabase.from("clientes").select("id, marca, sigla, nif").order("marca").limit(2000),
    supabase.from("profiles").select("*").order("nome"),
  ]);
  return {
    projetos: proj.data || [],
    entidades: ent.data || [],
    pessoas: (pes.data || []).filter((p) => p.ativo !== false),
  };
}

const Ico = {
  Pesquisa: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>,
  Pagina: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M3 9h18" /></svg>,
  Acao: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" /></svg>,
  Projeto: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg>,
  Entidade: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16" /><path d="M16 9h2a2 2 0 0 1 2 2v10" /><path d="M8 7h4M8 11h4M8 15h4M3 21h18" /></svg>,
  Ajuda: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14" /><path d="M12 17h.01" /></svg>,
  Recente: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>,
  Calendario: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="17" rx="3" /><path d="M3 9h18M8 2v4M16 2v4" /></svg>,
  Carro: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 17h14M5 17a2 2 0 1 0 4 0M15 17a2 2 0 1 0 4 0M3 17v-5l2-5h14l2 5v5" /><path d="M3 12h18" /></svg>,
  Mensagem: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" /></svg>,
  Documento: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5M12 12v6M9 15h6" /></svg>,
  Teclado: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="3" /><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10" /></svg>,
  Sair: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5M21 12H9" /></svg>,
  Enter: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 10 4 15l5 5" /><path d="M20 4v7a4 4 0 0 1-4 4H4" /></svg>,
};

const ICONE_GRUPO = { pagina: Ico.Pagina, acao: Ico.Acao, projeto: Ico.Projeto, entidade: Ico.Entidade, ajuda: Ico.Ajuda, recente: Ico.Recente };

const iniciais = (nome) => {
  const p = String(nome || "").trim().split(/\s+/).filter(Boolean);
  return p.length ? (p[0][0] + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase() : "?";
};

export default function CommandMenu() {
  const navigate = useNavigate();
  const { user, userProfile, signOut } = useAuth();
  const [aberto, setAberto] = useState(false);
  const [q, setQ] = useState("");
  const [ativo, setAtivo] = useState(0);
  const [dados, setDados] = useState(cacheDados);
  const [aCarregar, setACarregar] = useState(false);
  const [perfil, setPerfil] = useState(null);
  const [recentes, setRecentes] = useState(() => {
    try { return JSON.parse(localStorage.getItem(CHAVE_RECENTES) || "[]"); } catch { return []; }
  });
  const inputRef = useRef(null);
  const listaRef = useRef(null);
  const focoAntes = useRef(null);

  const papel = normalizar(userProfile?.role || userProfile?.tipo);
  const pode = useCallback((papeis) => !papeis || papeis.includes(papel), [papel]);

  const abrir = useCallback(() => {
    focoAntes.current = document.activeElement;
    setQ("");
    setAtivo(0);
    setACarregar(true);
    setAberto(true);
  }, []);
  const fechar = useCallback(() => {
    setAberto(false);
    // devolve o foco a quem o tinha (acessibilidade)
    setTimeout(() => focoAntes.current?.focus?.(), 0);
  }, []);

  // Ctrl+K / ⌘K abre e fecha; evento "bz:comando" abre
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key?.toLowerCase() === "k") {
        e.preventDefault();
        if (aberto) fechar(); else abrir();
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("bz:comando", abrir);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("bz:comando", abrir);
    };
  }, [aberto, abrir, fechar]);

  // Ao abrir: mostra a cache (se houver) e atualiza por trás
  useEffect(() => {
    if (!aberto || !user) return;
    let vivo = true;
    carregarDados()
      .then((d) => { cacheDados = d; if (vivo) setDados(d); })
      .catch(() => {})
      .finally(() => { if (vivo) setACarregar(false); });
    requestAnimationFrame(() => inputRef.current?.focus());
    return () => { vivo = false; };
  }, [aberto, user]);

  // Bloqueia o scroll da página por trás
  useEffect(() => {
    if (!aberto) return;
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = antes; };
  }, [aberto]);

  const termos = useMemo(() => normalizar(q).split(/\s+/).filter(Boolean), [q]);

  const resultados = useMemo(() => {
    if (!aberto) return [];
    const itens = [];
    const juntar = (grupo, lista) => {
      lista
        .map((it) => ({ ...it, grupo, score: pontuar(`${it.titulo} ${it.sub || ""} ${it.extra || ""}`, termos) }))
        .filter((it) => it.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, termos.length ? LIMITE[grupo] : grupo === "acao" ? 4 : grupo === "pagina" ? 5 : 0)
        .forEach((it) => itens.push(it));
    };

    if (!termos.length && recentes.length) {
      recentes.slice(0, 5).forEach((r) => itens.push({ ...r, grupo: "recente", tipoOriginal: r.grupo }));
    }
    juntar("acao", ACOES.filter((a) => pode(a.papeis)).map((a) => ({ ...a, chave: a.id })));
    juntar("pagina", PAGINAS.filter((p) => pode(p.papeis)).map((p) => ({ ...p, chave: p.rota })));

    if (termos.length && dados) {
      juntar("projeto", dados.projetos.map((p) => ({
        chave: `p${p.id}`,
        titulo: p.titulo || p.codigo || `Projeto ${p.id}`,
        sub: [p.codigo, p.clientes?.sigla || p.clientes?.marca].filter(Boolean).join(" · "),
        extra: p.estado,
        rota: `/dashboard/projetos/${p.id}`,
      })));
      juntar("entidade", dados.entidades.map((c) => ({
        chave: `c${c.id}`,
        titulo: c.marca || "—",
        sub: [c.sigla, c.nif && `NIF ${c.nif}`].filter(Boolean).join(" · "),
        rota: "/dashboard/clientes",
        estado: { openClienteId: c.id },
      })));
      juntar("pessoa", dados.pessoas.map((p) => ({
        chave: `u${p.id}`,
        titulo: p.nome || p.email || "—",
        sub: [p.funcao, p.empresa_interna].filter(Boolean).join(" · "),
        extra: p.email,
        avatar: p.avatar_url,
        perfilId: p.id,
      })));
    }
    if (termos.length) {
      juntar("ajuda", SECCOES_AJUDA.map((s) => ({
        chave: `h${s.id}`,
        titulo: s.titulo,
        sub: "Ajuda",
        extra: s.resumo || s.descricao || "",
        rota: `/dashboard/ajuda?s=${s.id}`,
      })));
    }
    return itens;
  }, [aberto, termos, dados, recentes, pode]);

  // Mantém o item ativo visível
  useEffect(() => {
    listaRef.current?.querySelector(`[data-i="${ativo}"]`)?.scrollIntoView({ block: "nearest" });
  }, [ativo]);

  const guardarRecente = (it) => {
    if (it.sair) return;
    const limpo = { ico: it.ico, evento: it.evento, chave: it.chave, titulo: it.titulo, sub: it.sub, rota: it.rota, estado: it.estado, perfilId: it.perfilId, avatar: it.avatar, grupo: it.tipoOriginal || it.grupo };
    const novos = [limpo, ...recentes.filter((r) => r.chave !== it.chave)].slice(0, 8);
    setRecentes(novos);
    try { localStorage.setItem(CHAVE_RECENTES, JSON.stringify(novos)); } catch { /* sem armazenamento */ }
  };

  const escolher = (it) => {
    if (!it) return;
    guardarRecente(it);
    fechar();
    if (it.sair) { signOut(); return; }
    if (it.evento) { setTimeout(() => window.dispatchEvent(new Event(it.evento)), 0); return; }
    if (it.perfilId) {
      const p = dados?.pessoas.find((x) => x.id === it.perfilId);
      if (p) setPerfil({ user_id: p.id, profiles: p });
      return;
    }
    if (it.rota) navigate(it.rota, it.estado ? { state: it.estado } : undefined);
  };

  const onKeyDown = (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setAtivo((i) => Math.min(i + 1, resultados.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setAtivo((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Home") { e.preventDefault(); setAtivo(0); }
    else if (e.key === "End") { e.preventDefault(); setAtivo(resultados.length - 1); }
    else if (e.key === "Enter") { e.preventDefault(); escolher(resultados[ativo]); }
    else if (e.key === "Escape") { e.preventDefault(); fechar(); }
  };

  // Pré-carrega a página do item ativo (abre mais depressa ao carregar Enter)
  useEffect(() => {
    const it = resultados[ativo];
    if (it?.rota) prefetchRota(it.rota);
  }, [ativo, resultados]);

  const fecharPerfil = useCallback(() => setPerfil(null), []);

  let indice = -1;
  const idAtivo = resultados[ativo] ? `cm-op-${ativo}` : undefined;

  return (
    <>
      {aberto && createPortal(
        <div className="cm-fundo" onMouseDown={(e) => { if (e.target === e.currentTarget) fechar(); }}>
          <div className="cm-caixa" role="dialog" aria-modal="true" aria-label="Pesquisar na app">
            <div className="cm-topo">
              <span className="cm-lupa"><Ico.Pesquisa /></span>
              <input
                ref={inputRef}
                className="cm-input"
                value={q}
                onChange={(e) => { setQ(e.target.value); setAtivo(0); }}
                onKeyDown={onKeyDown}
                placeholder="Procura páginas, projetos, entidades, pessoas…"
                role="combobox"
                aria-expanded="true"
                aria-controls="cm-lista"
                aria-activedescendant={idAtivo}
                aria-autocomplete="list"
                autoComplete="off"
                spellCheck={false}
                enterKeyHint="go"
              />
              {aCarregar && <span className="cm-spinner" aria-label="A atualizar" />}
              <button type="button" className="cm-fechar" onClick={fechar} aria-label="Fechar">
                <kbd>Esc</kbd>
              </button>
            </div>

            <div className="cm-lista" id="cm-lista" role="listbox" ref={listaRef} aria-label="Resultados">
              {resultados.length === 0 && (
                <div className="cm-vazio">
                  {termos.length && !dados ? "A procurar…" : <>Nada encontrado para “<strong>{q}</strong>”.</>}
                </div>
              )}
              {GRUPOS.map(([g, nome]) => {
                const doGrupo = resultados.filter((r) => r.grupo === g);
                if (!doGrupo.length) return null;
                return (
                  <div key={g} className="cm-grupo" role="group" aria-label={nome}>
                    <div className="cm-grupo-titulo">{nome}</div>
                    {doGrupo.map((it) => {
                      indice += 1;
                      const i = indice;
                      const tipo = it.tipoOriginal || it.grupo;
                      const Icone = (it.ico && Ico[it.ico]) || ICONE_GRUPO[g === "recente" ? "recente" : tipo];
                      return (
                        <div
                          key={`${g}-${it.chave}`}
                          id={`cm-op-${i}`}
                          data-i={i}
                          role="option"
                          aria-selected={i === ativo}
                          className={`cm-item ${i === ativo ? "is-ativo" : ""} ${it.sair ? "is-perigo" : ""}`}
                          data-tipo={tipo}
                          onMouseMove={() => { if (i !== ativo) setAtivo(i); }}
                          onClick={() => escolher(it)}
                        >
                          <span className={`cm-ico ${tipo === "pessoa" ? "is-avatar" : ""}`}>
                            {tipo === "pessoa"
                              ? (it.avatar ? <img src={it.avatar} alt="" loading="lazy" /> : iniciais(it.titulo))
                              : Icone ? <Icone /> : null}
                          </span>
                          <span className="cm-texto">
                            <span className="cm-titulo">{it.titulo}</span>
                            {it.sub && <span className="cm-sub">{it.sub}</span>}
                          </span>
                          <span className="cm-enter" aria-hidden="true"><Ico.Enter /></span>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            <div className="cm-rodape" aria-hidden="true">
              <span><kbd>↑</kbd><kbd>↓</kbd> escolher</span>
              <span><kbd>Enter</kbd> abrir</span>
              <span><kbd>Esc</kbd> fechar</span>
              <span><kbd>?</kbd> atalhos</span>
              <span className="cm-rodape-dir"><kbd>{ATALHO_COMANDO}</kbd> em qualquer página</span>
            </div>
          </div>
        </div>,
        document.body
      )}
      {perfil && <ProfilePeek entry={perfil} onClose={fecharPerfil} />}
    </>
  );
}
