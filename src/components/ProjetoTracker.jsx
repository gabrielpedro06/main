import React, { useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import "../styles/projeto-tracker.css";

// Percurso normal de um projeto (como o seguimento de uma encomenda)
const PASSOS = [
    { id: "pendente", label: "Pendente", desc: "Projeto criado" },
    { id: "em_curso", label: "Em curso", desc: "Trabalho a decorrer" },
    { id: "em_analise", label: "Em análise", desc: "Submetido / à espera de decisão" },
    { id: "concluido", label: "Concluído", desc: "Trabalho terminado" },
    { id: "encerrado", label: "Encerrado", desc: "Processo fechado" },
];
const LABEL = { pendente: "Pendente", em_curso: "Em curso", em_analise: "Em análise", concluido: "Concluído", encerrado: "Encerrado", cancelado: "Cancelado" };
const FILTROS = [
    { id: "tudo", label: "Tudo" },
    { id: "projeto", label: "Projeto" },
    { id: "atividade", label: "Atividades" },
    { id: "tarefa", label: "Tarefas" },
];

const fmtData = (iso) => (iso ? new Date(iso).toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" }) : "");
const fmtDia = (iso) => (iso ? new Date(iso).toLocaleDateString("pt-PT", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "");
const fmtHora = (iso) => (iso ? new Date(iso).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" }) : "");
const lbl = (e) => LABEL[e] || e || "—";

// Texto de cada acontecimento
function descrever(e) {
    const tipo = e.tipo || "projeto";
    const titulo = e.item_titulo || "(sem título)";
    if (tipo === "projeto") {
        if (!e.estado_anterior) return { titulo: "Projeto criado", sub: `Estado inicial: ${lbl(e.estado_novo)}` };
        return { titulo: `Projeto passou a ${lbl(e.estado_novo)}`, sub: `Antes: ${lbl(e.estado_anterior)}` };
    }
    const nome = tipo === "atividade" ? "Atividade" : "Tarefa";
    const sub = tipo === "tarefa" && e.atividade_titulo ? `em ${e.atividade_titulo}` : "";
    if (e.estado_novo === "concluido") return { titulo: `${nome} concluída: ${titulo}`, sub };
    if (e.estado_anterior === "concluido") return { titulo: `${nome} reaberta: ${titulo}`, sub: [sub, `agora ${lbl(e.estado_novo)}`].filter(Boolean).join(" · ") };
    return { titulo: `${nome} ${lbl(e.estado_novo).toLowerCase()}: ${titulo}`, sub };
}

export default function ProjetoTracker({ projeto, atividades = [], historicoAberto = false }) {
    const [hist, setHist] = useState([]);
    const [aberto, setAberto] = useState(historicoAberto);
    const [erro, setErro] = useState(false);
    const [filtro, setFiltro] = useState("tudo");

    // Recarrega sempre que muda o estado do projeto, de uma atividade ou de uma tarefa
    const chaveEstados = atividades
        .map((a) => `${a.id}:${a.estado}:${(a.tarefas || []).map((t) => t.estado).join(",")}`)
        .join("|");

    useEffect(() => {
        if (!projeto?.id) return;
        let vivo = true;
        supabase
            .from("projetos_estado_historico")
            .select("*, profiles(nome)")
            .eq("projeto_id", projeto.id)
            .order("created_at", { ascending: true })
            .then(({ data, error }) => {
                if (!vivo) return;
                if (error) { setErro(true); return; }
                setErro(false);
                setHist(data || []);
            });
        return () => { vivo = false; };
    }, [projeto?.id, projeto?.estado, chaveEstados]);

    const estadoAtual = projeto?.estado || "pendente";
    const cancelado = estadoAtual === "cancelado";
    const histProjeto = hist.filter((h) => (h.tipo || "projeto") === "projeto");

    // Data em que cada passo do projeto foi atingido pela última vez
    const quando = {};
    histProjeto.forEach((h) => { quando[h.estado_novo] = h; });
    if (!quando.pendente && projeto?.created_at) quando.pendente = { created_at: projeto.created_at };

    // Até onde chegou no percurso normal (se cancelado: último passo antes de cancelar)
    const antesCancelar = [...histProjeto].reverse().find((h) => h.estado_novo === "cancelado")?.estado_anterior;
    const idxAtual = Math.max(0, PASSOS.findIndex((p) => p.id === (cancelado ? antesCancelar : estadoAtual)));
    const passos = cancelado
        ? [...PASSOS.slice(0, idxAtual + 1), { id: "cancelado", label: "Cancelado", desc: "Projeto cancelado" }]
        : PASSOS;

    // Resumo das atividades
    const totalAtiv = atividades.length;
    const ativFeitas = atividades.filter((a) => a.estado === "concluido").length;
    const todasTarefas = atividades.flatMap((a) => a.tarefas || []);
    const tarefasFeitas = todasTarefas.filter((t) => t.estado === "concluido").length;
    const conclusaoAtiv = {};
    hist.forEach((h) => {
        if (h.tipo === "atividade" && h.estado_novo === "concluido") conclusaoAtiv[h.item_id] = h;
    });

    // Linha do tempo, mais recente primeiro, agrupada por dia
    const eventos = [...hist].reverse().filter((e) => filtro === "tudo" || (e.tipo || "projeto") === filtro);
    const porDia = [];
    eventos.forEach((e) => {
        const dia = e.created_at ? e.created_at.slice(0, 10) : "";
        const ultimo = porDia[porDia.length - 1];
        if (ultimo && ultimo.dia === dia) ultimo.itens.push(e);
        else porDia.push({ dia, iso: e.created_at, itens: [e] });
    });

    return (
        <section className={`pt-wrap ${cancelado ? "is-cancelled" : ""}`} aria-label="Seguimento do projeto">
            <div className="pt-head">
                <div>
                    <h3>Seguimento do projeto</h3>
                    <p>
                        Estado atual: <strong>{lbl(estadoAtual)}</strong>
                        {quando[estadoAtual]?.created_at && <> · desde {fmtData(quando[estadoAtual].created_at)}</>}
                    </p>
                </div>
                <div className="pt-kpis">
                    <span><strong>{ativFeitas}/{totalAtiv}</strong> atividades</span>
                    <span><strong>{tarefasFeitas}/{todasTarefas.length}</strong> tarefas</span>
                </div>
            </div>

            <ol className="pt-steps">
                {passos.map((p, i) => {
                    const isCancel = p.id === "cancelado";
                    const atual = isCancel || (!cancelado && i === idxAtual);
                    const feito = !isCancel && (i < idxAtual || (cancelado && i === idxAtual));
                    const h = quando[p.id];
                    const cls = isCancel ? "is-cancel" : atual ? "is-current" : feito ? "is-done" : "is-todo";
                    return (
                        <li key={p.id} className={`pt-step ${cls}`}>
                            <span className="pt-dot" aria-hidden="true">{isCancel ? "✕" : feito ? "✓" : i + 1}</span>
                            <div className="pt-step-txt">
                                <strong>{p.label}</strong>
                                <small>
                                    {(feito || atual) && h?.created_at
                                        ? `${h.nota === "data_aproximada" ? "≈ " : ""}${fmtData(h.created_at)}`
                                        : !feito && !atual && p.id === "concluido" && projeto?.data_fim
                                            ? `Previsto: ${fmtData(projeto.data_fim)}`
                                            : p.desc}
                                </small>
                            </div>
                        </li>
                    );
                })}
            </ol>

            <div className="pt-actions">
                <button type="button" className="pt-toggle" onClick={() => setAberto((v) => !v)} aria-expanded={aberto}>
                    {aberto ? "Esconder detalhe" : "Ver detalhe"}
                </button>
            </div>

            {aberto && (
                <div className="pt-body">
                    <div className="pt-col">
                        <div className="pt-col-head">
                            <h4>O que aconteceu</h4>
                            <div className="pt-filtros" role="tablist">
                                {FILTROS.map((f) => (
                                    <button key={f.id} type="button" className={filtro === f.id ? "is-on" : ""} onClick={() => setFiltro(f.id)}>
                                        {f.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        {erro && <p className="pt-empty">O histórico ainda não está ativo (falta correr as migrações 065 e 066).</p>}
                        {!erro && eventos.length === 0 && <p className="pt-empty">Ainda não há nada registado aqui.</p>}
                        {porDia.map((g) => (
                            <div key={g.dia || "sem-data"} className="pt-dia">
                                <h5>{fmtDia(g.iso)}</h5>
                                <ul className="pt-timeline">
                                    {g.itens.map((e) => {
                                        const d = descrever(e);
                                        const tipo = e.tipo || "projeto";
                                        return (
                                            <li key={e.id} className={`pt-ev is-${tipo} is-${e.estado_novo}`}>
                                                <span className="pt-ev-dot" aria-hidden="true">{e.estado_novo === "concluido" ? "✓" : ""}</span>
                                                <div>
                                                    <strong>{d.titulo}</strong>
                                                    <small>
                                                        {e.nota === "data_aproximada" ? "data aproximada" : fmtHora(e.created_at)}
                                                        {e.profiles?.nome ? ` · ${e.profiles.nome}` : ""}
                                                        {d.sub ? ` · ${d.sub}` : ""}
                                                    </small>
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        ))}
                    </div>

                    <div className="pt-col">
                        <h4>Atividades</h4>
                        {totalAtiv === 0 && <p className="pt-empty">Este projeto ainda não tem atividades.</p>}
                        <ul className="pt-ativs">
                            {atividades.map((a) => {
                                const ts = a.tarefas || [];
                                const feitas = ts.filter((t) => t.estado === "concluido").length;
                                const feita = a.estado === "concluido";
                                const pct = ts.length ? Math.round((feitas / ts.length) * 100) : feita ? 100 : 0;
                                const c = conclusaoAtiv[a.id];
                                return (
                                    <li key={a.id} className={feita ? "is-done" : a.estado === "em_curso" ? "is-doing" : ""}>
                                        <div className="pt-ativ-top">
                                            <span className="pt-ativ-ico" aria-hidden="true">{feita ? "✓" : ""}</span>
                                            <strong>{a.titulo}</strong>
                                        </div>
                                        <div className="pt-bar" aria-hidden="true"><i style={{ width: `${pct}%` }} /></div>
                                        <small>
                                            {feita
                                                ? `Concluída${c?.created_at ? ` a ${fmtData(c.created_at)}${c.nota === "data_aproximada" ? " (aprox.)" : ""}` : ""}`
                                                : `${lbl(a.estado)}${ts.length ? ` · ${feitas}/${ts.length} tarefas` : ""}${a.data_fim ? ` · prazo ${fmtData(a.data_fim)}` : ""}`}
                                        </small>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                </div>
            )}
        </section>
    );
}
