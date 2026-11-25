// =====================================================================
// Ficha de uma lead (painel lateral do CRM). Tudo grava ao sair do campo
// (onPatch → CrmLeads atualiza o ecrã antes da BD e repõe se falhar).
// Histórico: marketing_leads_interacoes (registar chamada/email/reunião/
// proposta/nota; mudanças de etapa entram sozinhas pelo trigger da 083).
// Estilos .crm-ficha* em styles/crm.css.
// =====================================================================
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import { supabase } from "../../services/supabase";
import { toast } from "../../utils/toast";
import SelectModerno from "../SelectModerno";
import {
  ETAPAS, ETAPA, TIPOS_INTERACAO, ORIGENS, ESTADOS_PROPOSTA, euros, dataCurta, haQuanto, iniciais, hojeISO,
  estadoAcao, estaEsquecida, diasParado, probabilidade, ponderado,
} from "./crm";
import { Ic } from "./crmIcones";
import PessoasLead from "./PessoasLead";

const somarDias = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const proximaSegunda = () => {
  const d = new Date();
  const falta = ((8 - d.getDay()) % 7) || 7;
  return somarDias(falta);
};

const ICONE_TIPO = { chamada: Ic.Phone, email: Ic.Mail, reuniao: Ic.Users, proposta: Ic.Doc, nota: Ic.Note, estado: Ic.Flow };

/** Campo de texto que só grava ao sair (ou Enter, se não for área de texto) */
function CampoGrava({ valor, aoGravar, multilinha, ...resto }) {
  const [v, setV] = useState(valor ?? "");
  // o valor mudou por fora (ex.: Desfazer): acompanha
  const [base, setBase] = useState(valor ?? "");
  if ((valor ?? "") !== base) { setBase(valor ?? ""); setV(valor ?? ""); }
  const gravar = () => { if ((valor ?? "") !== v) aoGravar(v); };
  const props = {
    ...resto,
    value: v,
    onChange: (e) => setV(e.target.value),
    onBlur: gravar,
    onKeyDown: (e) => { if (!multilinha && e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); } },
  };
  return multilinha ? <textarea {...props} /> : <input {...props} />;
}

/**
 * @param {object} props
 * @param {object} props.lead
 * @param {object[]} props.perfis   [{ id, nome, avatar_url }]
 * @param {string} props.userId
 * @param {(patch: object) => Promise<boolean>} props.onPatch
 * @param {(estado: string) => void} props.onMudarEtapa  (perdido pede motivo; ver CrmLeads)
 * @param {() => void} props.onEditar          abre o formulário completo (GestaoLeads)
 * @param {() => void} props.onTornarCliente
 * @param {() => void} props.onArquivar
 * @param {boolean} [props.podePropostas]  admin/administrador: pode criar propostas
 * @param {() => Promise<void>} [props.onCriarProposta]
 * @param {() => void} props.onClose
 */
export default function FichaLead({ lead, perfis, userId, onPatch, onMudarEtapa, onEditar, onTornarCliente, onArquivar, podePropostas, onCriarProposta, onClose }) {
  const navigate = useNavigate();
  const [propostas, setPropostas] = useState(null);
  const [aCriarProposta, setACriarProposta] = useState(false);
  const [reuniao, setReuniao] = useState(null); // { data, hora, assunto } enquanto se marca
  const [aMarcar, setAMarcar] = useState(false);
  const [interacoes, setInteracoes] = useState(null);
  const [tipo, setTipo] = useState("chamada");
  const [texto, setTexto] = useState("");
  const [aGravar, setAGravar] = useState(false);
  const [aFechar, setAFechar] = useState(false);
  const caixaTexto = useRef(null);
  const perfil = (id) => perfis.find((p) => p.id === id);

  // histórico (recarrega também quando outra parte do CRM regista algo: evento "crm-historico")
  const [versao, setVersao] = useState(0);
  useEffect(() => {
    const k = (e) => { if (String(e.detail?.leadId) === String(lead.id)) setVersao((v) => v + 1); };
    window.addEventListener("crm-historico", k);
    return () => window.removeEventListener("crm-historico", k);
  }, [lead.id]);
  useEffect(() => {
    let vivo = true;
    supabase
      .from("marketing_leads_interacoes")
      .select("id, tipo, texto, feito_em, autor_id")
      .eq("lead_id", lead.id)
      .order("feito_em", { ascending: false })
      .limit(200)
      .then(({ data, error }) => {
        if (!vivo) return;
        if (error) { console.error("Erro ao carregar o histórico:", error); setInteracoes([]); return; }
        setInteracoes(data || []);
      });
    return () => { vivo = false; };
  }, [lead.id, lead.estado, versao]); // a etapa muda → o trigger escreve no histórico

  // propostas da entidade ligada (as que o utilizador pode ver: RLS de propostas_comerciais)
  useEffect(() => {
    if (!lead.cliente_id) return;
    let vivo = true;
    supabase
      .from("propostas_comerciais")
      .select("id, numero_proposta_str, estado, created_at")
      .eq("cliente_id", lead.cliente_id)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data, error }) => {
        if (!vivo) return;
        if (error) { console.error("Erro ao carregar propostas:", error); setPropostas([]); return; }
        setPropostas(data || []);
      });
    return () => { vivo = false; };
  }, [lead.cliente_id]);

  async function criarProposta() {
    setACriarProposta(true);
    try { await onCriarProposta?.(); } finally { setACriarProposta(false); }
  }

  /**
   * Marca uma reunião: calendário (tabela agenda) de quem marca e do responsável,
   * próxima ação = a reunião, registo no histórico e etapa → Reunião (se estava antes).
   */
  async function marcarReuniao(e) {
    e?.preventDefault();
    const { data, hora, assunto } = reuniao;
    if (!data || !hora) { toast("Indica o dia e a hora.", { tipo: "aviso" }); return; }
    const titulo = (assunto || "").trim() || `Reunião · ${lead.nome}`;
    setAMarcar(true);
    // calendário: o meu primeiro (a regra da tabela pode só deixar escrever no próprio)
    const { error: eu } = await supabase.from("agenda").insert([{ user_id: userId, data, hora, titulo }]);
    if (eu) { setAMarcar(false); toast("Não foi possível pôr no calendário: " + eu.message, { tipo: "erro" }); return; }
    const resp = lead.responsavel_id;
    let respAvisado = "";
    if (resp && resp !== userId) {
      const { error: e2 } = await supabase.from("agenda").insert([{ user_id: resp, data, hora, titulo }]);
      const nomeResp = (perfil(resp)?.nome || "o responsável").split(" ")[0];
      // sem permissão para escrever no calendário de outra pessoa: avisa-a no sino
      await supabase.from("notificacoes_projetos").insert([{
        user_id: resp, project_id: null, created_by: userId, tipo: "crm_reuniao",
        titulo: `Reunião: ${lead.nome}`,
        mensagem: `${dataCurta(data)} às ${hora}${e2 ? " (põe no teu calendário)" : " · já está no teu calendário"}`,
        link: `/dashboard/leads?lead=${lead.id}`, is_read: false,
      }]);
      respAvisado = e2 ? ` ${nomeResp} foi avisado no sino.` : ` Também no calendário de ${nomeResp}.`;
    }
    // histórico (conta como contacto) + próxima ação + etapa
    const texto = `Reunião marcada para ${dataCurta(data)} às ${hora}${assunto?.trim() ? ` — ${assunto.trim()}` : ""}`;
    const { data: reg } = await supabase
      .from("marketing_leads_interacoes")
      .insert([{ lead_id: lead.id, tipo: "reuniao", texto, autor_id: userId }])
      .select("id, tipo, texto, feito_em, autor_id")
      .single();
    if (reg) setInteracoes((l) => [reg, ...(l || [])]);
    await onPatch({ proxima_acao: `${titulo} às ${hora}`, proxima_acao_em: data, ...(reg ? { ultimo_contacto_em: reg.feito_em } : {}) });
    if (["novo", "contactado"].includes(lead.estado)) onMudarEtapa("reuniao");
    setAMarcar(false);
    setReuniao(null);
    toast(`Reunião no calendário.${respAvisado}`);
  }

  const fechar = () => { setAFechar(true); setTimeout(onClose, 220); };
  useEffect(() => {
    const k = (e) => { if (e.key === "Escape" && !document.querySelector(".jn-fundo")) fechar(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  });

  async function registar(e) {
    e?.preventDefault();
    const t = texto.trim();
    if (!t) { caixaTexto.current?.focus(); return; }
    setAGravar(true);
    const { data, error } = await supabase
      .from("marketing_leads_interacoes")
      .insert([{ lead_id: lead.id, tipo, texto: t, autor_id: userId }])
      .select("id, tipo, texto, feito_em, autor_id")
      .single();
    setAGravar(false);
    if (error) { toast("Não foi possível registar: " + error.message, { tipo: "erro" }); return; }
    setInteracoes((l) => [data, ...(l || [])]);
    setTexto("");
    // o trigger atualiza ultimo_contacto_em; aqui só se reflete no ecrã
    if (tipo !== "nota") onPatch({ ultimo_contacto_em: data.feito_em }, { soEcra: true });
    toast(tipo === "nota" ? "Nota guardada." : "Contacto registado.");
  }

  async function apagarInteracao(i) {
    setInteracoes((l) => l.filter((x) => x.id !== i.id));
    const { error } = await supabase.from("marketing_leads_interacoes").delete().eq("id", i.id);
    if (error) {
      setInteracoes((l) => [...l, i].sort((a, b) => String(b.feito_em).localeCompare(String(a.feito_em))));
      toast("Não foi possível apagar.", { tipo: "erro" });
    }
  }

  const etapa = ETAPA[lead.estado] || ETAPAS[0];
  const acao = estadoAcao(lead);
  const esquecida = estaEsquecida(lead);
  const resp = perfil(lead.responsavel_id);
  const fechada = lead.ativo === false;

  return createPortal(
    <div className={`crm-ficha-fundo${aFechar ? " is-saindo" : ""}`} onMouseDown={(e) => { if (e.target === e.currentTarget) fechar(); }}>
      <aside className="crm-ficha" role="dialog" aria-modal="true" aria-label={`Lead ${lead.nome}`} style={{ "--etapa": etapa.cor }}>
        {/* cabeçalho */}
        <header className="crm-ficha-topo">
          <div className="crm-ficha-linha">
            <span className="crm-etapa-pill"><i />{etapa.label}</span>
            {esquecida && <span className="crm-aviso is-esquecida"><Ic.Clock /> Parada há {diasParado(lead)} dias</span>}
            {fechada && <span className="crm-aviso">Arquivada</span>}
            <button type="button" className="crm-ficha-fechar" onClick={fechar} aria-label="Fechar"><Ic.X /></button>
          </div>
          <h2>{lead.nome}</h2>
          <div className="crm-ficha-sub">
            {lead.setor && <span><Ic.Building /> {lead.setor}</span>}
            {lead.localidade && <span><Ic.Pin /> {lead.localidade}</span>}
            {lead.nif && <span className="crm-mono">NIF {lead.nif}</span>}
          </div>

          {/* etapas */}
          <div className="crm-ficha-etapas" role="radiogroup" aria-label="Etapa">
            {ETAPAS.map((e, i) => {
              const idx = ETAPAS.findIndex((x) => x.valor === lead.estado);
              const feito = lead.estado !== "perdido" && i < idx && e.valor !== "perdido";
              return (
                <button
                  key={e.valor}
                  type="button"
                  role="radio"
                  aria-checked={lead.estado === e.valor}
                  disabled={fechada}
                  className={`${lead.estado === e.valor ? "is-on" : ""} ${feito ? "is-feito" : ""} is-${e.valor}`}
                  style={{ "--c": e.cor }}
                  onClick={() => lead.estado !== e.valor && onMudarEtapa(e.valor)}
                >
                  {e.label}
                </button>
              );
            })}
          </div>
          {lead.estado === "perdido" && lead.motivo_perda && <p className="crm-ficha-motivo"><b>Motivo:</b> {lead.motivo_perda}</p>}
        </header>

        <div className="crm-ficha-corpo">
          {/* negócio */}
          <section className="crm-bloco">
            <h3>Negócio</h3>
            <div className="crm-grelha-2">
              <label className="crm-campo">
                <span>Valor (€)</span>
                <CampoGrava
                  type="number" min="0" step="50" inputMode="decimal" placeholder="0"
                  valor={lead.valor ?? ""}
                  aoGravar={(v) => onPatch({ valor: v === "" ? null : Math.max(0, Number(v)) })}
                  disabled={fechada}
                />
              </label>
              <label className="crm-campo">
                <span>Probabilidade</span>
                <SelectModerno
                  value={lead.probabilidade == null ? "" : String(lead.probabilidade)}
                  onChange={(e) => onPatch({ probabilidade: e.target.value === "" ? null : Number(e.target.value) })}
                  disabled={fechada}
                >
                  <option value="">Da etapa ({ETAPA[lead.estado]?.prob ?? 0}%)</option>
                  {[10, 25, 50, 70, 90].map((p) => <option key={p} value={p}>{p}%</option>)}
                </SelectModerno>
              </label>
              <label className="crm-campo">
                <span>Responsável</span>
                <SelectModerno
                  value={lead.responsavel_id || ""}
                  onChange={(e) => onPatch({ responsavel_id: e.target.value || null })}
                  disabled={fechada}
                >
                  <option value="">— Ninguém —</option>
                  {perfis.map((p) => <option key={p.id} value={p.id}>{p.id === userId ? `${p.nome} (eu)` : p.nome}</option>)}
                </SelectModerno>
              </label>
              <label className="crm-campo">
                <span>Origem</span>
                <SelectModerno
                  value={lead.origem || ""}
                  onChange={(e) => onPatch({ origem: e.target.value || null })}
                  disabled={fechada}
                >
                  <option value="">— Por indicar —</option>
                  {[...new Set([...ORIGENS, ...(lead.origem ? [lead.origem] : [])])].map((o) => <option key={o} value={o}>{o}</option>)}
                </SelectModerno>
              </label>
            </div>
            {Number(lead.valor) > 0 && (
              <p className="crm-dica">Ponderado: <b>{euros(ponderado(lead))}</b> ({probabilidade(lead)}% de {euros(lead.valor)})</p>
            )}
          </section>

          {/* próxima ação */}
          <section className={`crm-bloco crm-proxima ${acao ? `is-${acao}` : ""}`}>
            <h3><Ic.Target /> Próxima ação</h3>
            <div className="crm-proxima-linha">
              <CampoGrava
                className="crm-input"
                placeholder="Ex.: ligar a confirmar a reunião"
                valor={lead.proxima_acao || ""}
                aoGravar={(v) => onPatch({ proxima_acao: v.trim() || null })}
                disabled={fechada}
                aria-label="Próxima ação"
              />
              <input
                type="date"
                className="crm-input crm-data"
                value={lead.proxima_acao_em || ""}
                onChange={(e) => onPatch({ proxima_acao_em: e.target.value || null })}
                disabled={fechada}
                aria-label="Data da próxima ação"
              />
            </div>
            {!fechada && (
              <div className="crm-atalhos">
                {[["Hoje", hojeISO()], ["Amanhã", somarDias(1)], ["Daqui a 3 dias", somarDias(3)], ["Segunda", proximaSegunda()], ["Daqui a 2 sem.", somarDias(14)]].map(([l, d]) => (
                  <button key={l} type="button" className={lead.proxima_acao_em === d ? "is-on" : ""} onClick={() => onPatch({ proxima_acao_em: d })}>{l}</button>
                ))}
                {lead.proxima_acao_em && <button type="button" className="is-limpar" onClick={() => onPatch({ proxima_acao_em: null, proxima_acao: null })}>Feita / limpar</button>}
              </div>
            )}
            {!fechada && (reuniao ? (
              <form className="crm-reuniao" onSubmit={marcarReuniao}>
                <div className="crm-reuniao-linha">
                  <input type="date" className="crm-input" value={reuniao.data} onChange={(e) => setReuniao((r) => ({ ...r, data: e.target.value }))} aria-label="Dia da reunião" required />
                  <input type="time" className="crm-input" value={reuniao.hora} onChange={(e) => setReuniao((r) => ({ ...r, hora: e.target.value }))} aria-label="Hora da reunião" step="900" required />
                </div>
                <input className="crm-input" value={reuniao.assunto} onChange={(e) => setReuniao((r) => ({ ...r, assunto: e.target.value }))} placeholder={`Reunião · ${lead.nome}`} aria-label="Assunto da reunião" />
                <div className="crm-reuniao-pe">
                  <span className="crm-dica">Vai para o teu calendário{lead.responsavel_id && lead.responsavel_id !== userId ? ` e o de ${(perfil(lead.responsavel_id)?.nome || "o responsável").split(" ")[0]}` : ""}.</span>
                  <button type="button" className="bz-btn" onClick={() => setReuniao(null)}>Cancelar</button>
                  <button type="submit" className="bz-btn is-primary" disabled={aMarcar}>{aMarcar ? "A marcar…" : "Marcar"}</button>
                </div>
              </form>
            ) : (
              <button type="button" className="crm-link" onClick={() => setReuniao({ data: somarDias(1), hora: "10:00", assunto: "" })}><Ic.Users /> Marcar reunião</button>
            ))}
            {acao === "atrasada" && <p className="crm-dica is-mau">Em atraso desde {dataCurta(lead.proxima_acao_em)}.</p>}
            {lead.responsavel_id && lead.proxima_acao_em && (
              <p className="crm-dica">{resp?.id === userId ? "Vais" : `${(resp?.nome || "O responsável").split(" ")[0]} vai`} receber um lembrete no sino nesse dia.</p>
            )}
          </section>

          {/* pessoas (contacto principal + outras) */}
          <PessoasLead lead={lead} fechada={fechada} onPatch={onPatch} onEditar={onEditar} />

          {/* propostas */}
          <section className="crm-bloco">
            <h3><Ic.Doc /> Propostas</h3>
            {!lead.cliente_id ? (
              <p className="crm-dica">Ainda sem propostas. {podePropostas ? "Ao criar a primeira, a empresa passa a existir em Entidades." : "Só a administração cria propostas."}</p>
            ) : propostas == null ? (
              <p className="crm-dica">A carregar…</p>
            ) : propostas.length === 0 ? (
              <p className="crm-dica">Ainda não há propostas para esta empresa.</p>
            ) : (
              <ul className="crm-propostas">
                {propostas.map((pr) => {
                  const e = ESTADOS_PROPOSTA[pr.estado] || { label: pr.estado || "—", cor: "#64748b" };
                  return (
                    <li key={pr.id}>
                      <button type="button" onClick={() => navigate(`/dashboard/propostas/${pr.id}`)}>
                        <b>{pr.numero_proposta_str || "Proposta"}</b>
                        <span className="crm-etapa-tag" style={{ "--c": e.cor }}>{e.label}</span>
                        <span className="crm-sub">{dataCurta(pr.created_at)}</span>
                        <Ic.Arrow />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            {podePropostas && !fechada && (
              <button type="button" className="crm-link" onClick={criarProposta} disabled={aCriarProposta}>
                <Ic.Plus /> {aCriarProposta ? "A preparar…" : "Criar proposta"}
              </button>
            )}
          </section>

          {/* notas */}
          <section className="crm-bloco">
            <h3>Notas</h3>
            <CampoGrava
              multilinha
              className="crm-input crm-notas"
              rows={3}
              placeholder="O que é importante saber sobre esta empresa…"
              valor={lead.notas || ""}
              aoGravar={(v) => onPatch({ notas: v.trim() || null })}
              aria-label="Notas"
            />
          </section>

          {/* histórico */}
          <section className="crm-bloco">
            <h3>Histórico</h3>
            {!fechada && (
              <form className="crm-registo" onSubmit={registar}>
                <div className="crm-tipos" role="radiogroup" aria-label="Tipo de registo">
                  {TIPOS_INTERACAO.map((t) => {
                    const I = ICONE_TIPO[t.valor];
                    return (
                      <button key={t.valor} type="button" role="radio" aria-checked={tipo === t.valor} className={tipo === t.valor ? "is-on" : ""} onClick={() => setTipo(t.valor)}>
                        <I /> {t.label}
                      </button>
                    );
                  })}
                </div>
                <textarea
                  ref={caixaTexto}
                  className="crm-input"
                  rows={2}
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) registar(e); }}
                  placeholder={tipo === "nota" ? "Escreve uma nota…" : "Como correu? (Ctrl+Enter para registar)"}
                  aria-label="Descrição"
                />
                <div className="crm-registo-pe">
                  <span className="crm-dica">{tipo === "nota" ? "As notas não contam como contacto." : "Conta como contacto: a lead deixa de estar parada."}</span>
                  <button type="submit" className="bz-btn is-primary" disabled={aGravar || !texto.trim()}>{aGravar ? "A registar…" : "Registar"}</button>
                </div>
              </form>
            )}

            {interacoes == null ? (
              <div className="crm-tl-vazio">A carregar…</div>
            ) : interacoes.length === 0 ? (
              <div className="crm-tl-vazio">Ainda não há nada registado com esta lead.</div>
            ) : (
              <ol className="crm-tl">
                {interacoes.map((i) => {
                  const I = ICONE_TIPO[i.tipo] || Ic.Note;
                  const autor = perfil(i.autor_id);
                  const [de, para] = i.tipo === "estado" ? String(i.texto || "").split("→") : [];
                  return (
                    <li key={i.id} className={`is-${i.tipo}`}>
                      <span className="crm-tl-ico"><I /></span>
                      <div className="crm-tl-corpo">
                        <div className="crm-tl-cab">
                          <b>{i.tipo === "estado" ? "Mudou de etapa" : TIPOS_INTERACAO.find((t) => t.valor === i.tipo)?.label}</b>
                          <span title={new Date(i.feito_em).toLocaleString("pt-PT")}>{haQuanto(i.feito_em)} · {dataCurta(i.feito_em)}</span>
                          {autor && <span className="crm-tl-autor">{autor.nome.split(" ")[0]}</span>}
                          {i.tipo !== "estado" && i.autor_id === userId && (
                            <button type="button" className="crm-tl-apagar" onClick={() => apagarInteracao(i)} aria-label="Apagar registo" title="Apagar"><Ic.Trash /></button>
                          )}
                        </div>
                        {i.tipo === "estado" ? (
                          <p className="crm-tl-etapas">
                            <span style={{ "--c": ETAPA[de]?.cor }}>{ETAPA[de]?.label || de || "—"}</span> <Ic.Arrow /> <span style={{ "--c": ETAPA[para]?.cor }}>{ETAPA[para]?.label || para}</span>
                          </p>
                        ) : (
                          <p>{i.texto}</p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        </div>

        <footer className="crm-ficha-pe">
          <span className="crm-dica">
            {resp ? <><span className="crm-av is-mini">{iniciais(resp.nome)}</span> {resp.nome.split(" ")[0]}</> : "Sem responsável"}
            {lead.ultimo_contacto_em && <> · último contacto {haQuanto(lead.ultimo_contacto_em)}</>}
          </span>
          <div className="crm-ficha-pe-acoes">
            {lead.estado === "convertido" && !fechada && (
              <button type="button" className="bz-btn is-ok" onClick={onTornarCliente}><Ic.Handshake /> Tornar cliente</button>
            )}
            <button type="button" className="bz-btn" onClick={onArquivar}>{fechada ? "Restaurar" : "Arquivar"}</button>
          </div>
        </footer>
      </aside>
    </div>,
    document.body
  );
}
