// =====================================================================
// Medalhas (separador dos RH). Tabelas da migração 067:
//   medalhas                (nome, data, descricao, imagem_path, imagem_url)
//   medalhas_colaboradores  (medalha_id, user_id) — quem recebeu
// Imagem no balde PÚBLICO "medalhas" (PNG/WebP/JPEG, máx. 2 MB).
// Escrita só para admin/administrador/gestor (pode_gerir_medalhas()); leitura
// para todos. As medalhas aparecem no ProfilePeek e como badge nos avatares
// "online" do DashboardHome (useMedalhas / useMedalhasEquipa).
// =====================================================================
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../../services/supabase";
import { MEDALHAS_BUCKET, MEDALHA_MAX_BYTES, MEDALHA_TIPOS, fmtDataMedalha, faltaMigracao } from "./medalhasConfig";
import "../../styles/medalhas.css";

const Ic = {
  Medal: ({ size = 18 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7.2 2h9.6l-3 6.5h-3.6z" /><circle cx="12" cy="15" r="6" /><path d="M12 12.4l.9 1.8 2 .3-1.4 1.4.3 2-1.8-1-1.8 1 .3-2-1.4-1.4 2-.3z" /></svg>,
  Plus: ({ size = 16 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>,
  Edit: ({ size = 16 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>,
  Trash: ({ size = 16 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>,
  X: ({ size = 20 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>,
  Check: ({ size = 16 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>,
  Upload: ({ size = 22 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>,
  Search: ({ size = 15 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>,
  Users: ({ size = 13 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.9" /><path d="M16 3.1a4 4 0 0 1 0 7.8" /></svg>,
};

const iniciais = (nome) => {
  const p = String(nome || "").trim().split(/\s+/).filter(Boolean);
  if (!p.length) return "?";
  return (p[0][0] + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase();
};

const VAZIO = { id: null, nome: "", data: "", descricao: "", imagem_url: "", imagem_path: "", users: new Set() };

/**
 * Aba "Medalhas" dos Recursos Humanos: criar medalhas de eventos internos
 * (nome, data, imagem PNG) e atribuí-las a colaboradores.
 */
export default function MedalhasRH({ colaboradores = [], notify }) {
  const [medalhas, setMedalhas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [semTabela, setSemTabela] = useState(false);
  const [busca, setBusca] = useState("");
  const [form, setForm] = useState(null); // medalha em edição (ou nova)
  const [ficheiro, setFicheiro] = useState(null);
  const [preview, setPreview] = useState("");
  const [buscaColab, setBuscaColab] = useState("");
  const [aGuardar, setAGuardar] = useState(false);
  const [aApagar, setAApagar] = useState(null);
  const inputRef = useRef(null);

  // notify muda a cada render da página dos RH: guarda-se numa ref para não recarregar em ciclo
  const notifyRef = useRef(notify);
  useEffect(() => { notifyRef.current = notify; }, [notify]);
  const avisar = useCallback((msg, tipo = "success") => {
    notifyRef.current?.(msg, tipo);
  }, []);

  const porId = useMemo(() => new Map(colaboradores.map((c) => [c.id, c])), [colaboradores]);

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("medalhas")
      .select("id, nome, data, descricao, imagem_url, imagem_path, medalhas_colaboradores(user_id)")
      .order("data", { ascending: false });
    if (error) {
      if (faltaMigracao(error)) setSemTabela(true);
      else avisar(`Erro ao carregar medalhas: ${error.message}`, "error");
      setMedalhas([]);
    } else {
      setSemTabela(false);
      setMedalhas((data || []).map((m) => ({ ...m, users: (m.medalhas_colaboradores || []).map((r) => r.user_id) })));
    }
    setLoading(false);
  }, [avisar]);

  useEffect(() => { carregar(); }, [carregar]);

  // Pré-visualização local da imagem escolhida
  useEffect(() => {
    if (!ficheiro) { setPreview(""); return undefined; }
    const url = URL.createObjectURL(ficheiro);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [ficheiro]);

  // Esc fecha o modal aberto
  useEffect(() => {
    if (!form && !aApagar) return undefined;
    const onKey = (e) => {
      if (e.key !== "Escape" || aGuardar) return;
      if (aApagar) setAApagar(null); else setForm(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [form, aApagar, aGuardar]);

  const abrirNova = () => { setFicheiro(null); setBuscaColab(""); setForm({ ...VAZIO, users: new Set() }); };
  const abrirEditar = (m) => {
    setFicheiro(null);
    setBuscaColab("");
    setForm({ id: m.id, nome: m.nome, data: m.data, descricao: m.descricao || "", imagem_url: m.imagem_url, imagem_path: m.imagem_path, users: new Set(m.users) });
  };

  function escolherFicheiro(file) {
    if (!file) return;
    if (!MEDALHA_TIPOS.includes(file.type)) { avisar("A imagem tem de ser PNG (também aceita WebP ou JPEG).", "error"); return; }
    if (file.size > MEDALHA_MAX_BYTES) { avisar("A imagem tem mais de 2 MB. Reduza-a e tente de novo.", "error"); return; }
    setFicheiro(file);
  }

  const toggleUser = (id) => setForm((f) => {
    const users = new Set(f.users);
    if (users.has(id)) users.delete(id); else users.add(id);
    return { ...f, users };
  });

  const colabFiltrados = colaboradores.filter((c) => !buscaColab || String(c.nome || "").toLowerCase().includes(buscaColab.toLowerCase()));
  const todosFiltradosMarcados = colabFiltrados.length > 0 && colabFiltrados.every((c) => form?.users.has(c.id));
  const marcarFiltrados = () => setForm((f) => {
    const users = new Set(f.users);
    colabFiltrados.forEach((c) => { if (todosFiltradosMarcados) users.delete(c.id); else users.add(c.id); });
    return { ...f, users };
  });

  /**
   * Cria/edita uma medalha: 1) carrega a imagem nova (nome UUID), 2) grava a
   * medalha, 3) acerta medalhas_colaboradores (insere novos, apaga desmarcados),
   * 4) apaga do Storage a imagem antiga substituída. Se falhar, remove a imagem nova.
   * Não é transacional: um erro no passo 3 deixa a medalha gravada.
   */
  async function guardar(e) {
    e.preventDefault();
    if (!form.nome.trim() || !form.data) { avisar("Preencha o nome e a data.", "error"); return; }
    if (!form.id && !ficheiro) { avisar("Carregue a imagem da medalha (PNG).", "error"); return; }
    setAGuardar(true);
    let novoPath = null;
    try {
      // 1. Imagem nova (se houver)
      let imagem = { imagem_path: form.imagem_path, imagem_url: form.imagem_url };
      if (ficheiro) {
        const ext = ficheiro.type === "image/webp" ? "webp" : ficheiro.type === "image/jpeg" ? "jpg" : "png";
        novoPath = `${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from(MEDALHAS_BUCKET).upload(novoPath, ficheiro, { contentType: ficheiro.type, cacheControl: "31536000", upsert: false });
        if (upErr) throw upErr;
        imagem = { imagem_path: novoPath, imagem_url: supabase.storage.from(MEDALHAS_BUCKET).getPublicUrl(novoPath).data.publicUrl };
      }

      // 2. Medalha
      const dados = { nome: form.nome.trim(), data: form.data, descricao: form.descricao.trim() || null, ...imagem };
      let medalhaId = form.id;
      if (medalhaId) {
        const { error } = await supabase.from("medalhas").update(dados).eq("id", medalhaId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("medalhas").insert(dados).select("id").single();
        if (error) throw error;
        medalhaId = data.id;
      }

      // 3. Quem recebeu: acrescenta os novos, retira os desmarcados
      const antes = new Set(medalhas.find((m) => m.id === medalhaId)?.users || []);
      const adicionar = [...form.users].filter((u) => !antes.has(u));
      const retirar = [...antes].filter((u) => !form.users.has(u));
      if (adicionar.length) {
        const { error } = await supabase.from("medalhas_colaboradores").insert(adicionar.map((user_id) => ({ medalha_id: medalhaId, user_id })));
        if (error) throw error;
      }
      if (retirar.length) {
        const { error } = await supabase.from("medalhas_colaboradores").delete().eq("medalha_id", medalhaId).in("user_id", retirar);
        if (error) throw error;
      }

      // 4. Imagem antiga substituída: apaga-a do Storage
      if (ficheiro && form.imagem_path) await supabase.storage.from(MEDALHAS_BUCKET).remove([form.imagem_path]);
      novoPath = null;

      setForm(null);
      setFicheiro(null);
      avisar(form.id ? "Medalha atualizada." : `Medalha criada e atribuída a ${form.users.size} colaborador(es).`);
      carregar();
    } catch (err) {
      if (novoPath) await supabase.storage.from(MEDALHAS_BUCKET).remove([novoPath]).catch(() => {});
      avisar(faltaMigracao(err) ? "As medalhas ainda não estão ativas: falta correr a migração 067 no Supabase." : `Erro ao guardar a medalha: ${err.message || err}`, "error");
    } finally {
      setAGuardar(false);
    }
  }

  /** Apaga a medalha (as atribuições caem por ON DELETE CASCADE) e depois a imagem no Storage. */
  async function apagar() {
    const m = aApagar;
    setAGuardar(true);
    try {
      const { error } = await supabase.from("medalhas").delete().eq("id", m.id);
      if (error) throw error;
      if (m.imagem_path) await supabase.storage.from(MEDALHAS_BUCKET).remove([m.imagem_path]);
      setAApagar(null);
      avisar("Medalha eliminada.");
      carregar();
    } catch (err) {
      avisar(`Erro ao eliminar: ${err.message || err}`, "error");
    } finally {
      setAGuardar(false);
    }
  }

  const visiveis = medalhas.filter((m) => !busca || `${m.nome} ${m.descricao || ""}`.toLowerCase().includes(busca.toLowerCase()));
  const imagemForm = preview || form?.imagem_url || "";

  return (
    <div className="rh-stack bz-tab-panel">
      <section className="rh-card">
        <div className="rh-card-head">
          <div className="rh-card-title">
            <span className="rh-card-ico"><Ic.Medal size={18} /></span>
            <div>
              <h3>Medalhas <em className="rh-count">{medalhas.length}</em></h3>
              <p>Medalhas dos eventos internos. Aparecem no perfil de cada colaborador.</p>
            </div>
          </div>
          <div className="mdl-head-tools">
            {medalhas.length > 3 && (
              <label className="mdl-search">
                <Ic.Search />
                <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Procurar medalha" />
              </label>
            )}
            <button type="button" className="rh-btn is-primary" onClick={abrirNova} disabled={semTabela}>
              <Ic.Plus /> Nova medalha
            </button>
          </div>
        </div>

        {semTabela ? (
          <div className="rh-empty">
            <span className="rh-empty-ico"><Ic.Medal size={30} /></span>
            <p>As medalhas ainda não estão ativas. Falta correr a migração <b>067_medalhas.sql</b> no Supabase.</p>
          </div>
        ) : loading ? (
          <div className="mdl-grid">{[0, 1, 2].map((i) => <div key={i} className="mdl-card is-skeleton" />)}</div>
        ) : visiveis.length ? (
          <div className="mdl-grid">
            {visiveis.map((m) => (
              <article key={m.id} className="mdl-card">
                <div className="mdl-card-img">
                  <img src={m.imagem_url} alt="" loading="lazy" />
                </div>
                <div className="mdl-card-body">
                  <strong title={m.nome}>{m.nome}</strong>
                  <small>{fmtDataMedalha(m.data)}</small>
                  {m.descricao && <p>{m.descricao}</p>}
                  <div className="mdl-people">
                    <span className="mdl-avatars">
                      {m.users.slice(0, 5).map((uid) => {
                        const c = porId.get(uid);
                        return (
                          <span key={uid} className="mdl-av" title={c?.nome || "Colaborador"}>
                            {c?.avatar_url ? <img src={c.avatar_url} alt="" /> : iniciais(c?.nome)}
                          </span>
                        );
                      })}
                      {m.users.length > 5 && <span className="mdl-av is-more">+{m.users.length - 5}</span>}
                    </span>
                    <span className="mdl-people-n"><Ic.Users /> {m.users.length}</span>
                  </div>
                </div>
                <div className="mdl-card-actions">
                  <button type="button" className="rh-icon-btn" onClick={() => abrirEditar(m)} title="Editar e atribuir" aria-label="Editar"><Ic.Edit /></button>
                  <button type="button" className="rh-icon-btn is-bad" onClick={() => setAApagar(m)} title="Eliminar" aria-label="Eliminar"><Ic.Trash /></button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rh-empty">
            <span className="rh-empty-ico"><Ic.Medal size={30} /></span>
            <p>{busca ? "Nenhuma medalha com esse nome." : "Ainda não há medalhas. Crie a primeira e atribua-a a quem participou no evento."}</p>
          </div>
        )}
      </section>

      {form && createPortal(
        <div className="rh-overlay" onClick={() => { if (!aGuardar) setForm(null); }}>
          <div className="rh-modal is-md" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="mdl-modal-title">
            <div className="rh-modal-head">
              <span className="rh-modal-ico"><Ic.Medal size={20} /></span>
              <div className="rh-modal-title">
                <span>Medalha</span>
                <h3 id="mdl-modal-title">{form.id ? "Editar medalha" : "Nova medalha"}</h3>
              </div>
              <button type="button" onClick={() => setForm(null)} className="rh-modal-close" aria-label="Fechar" disabled={aGuardar}><Ic.X /></button>
            </div>
            <form onSubmit={guardar} className="rh-modal-form">
              <div className="rh-modal-body">
                <div className="mdl-form-top">
                  <button
                    type="button"
                    className={`mdl-drop ${imagemForm ? "has-img" : ""}`}
                    onClick={() => inputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => { e.preventDefault(); escolherFicheiro(e.dataTransfer.files?.[0]); }}
                  >
                    {imagemForm ? <img src={imagemForm} alt="Pré-visualização da medalha" /> : (
                      <>
                        <Ic.Upload />
                        <strong>Imagem da medalha</strong>
                        <small>PNG, até 2 MB</small>
                      </>
                    )}
                    {imagemForm && <span className="mdl-drop-change">Trocar imagem</span>}
                  </button>
                  <input ref={inputRef} type="file" accept="image/png,image/webp,image/jpeg" hidden onChange={(e) => { escolherFicheiro(e.target.files?.[0]); e.target.value = ""; }} />
                  <div className="mdl-form-fields">
                    <div className="rh-field">
                      <label htmlFor="mdl-nome">Nome</label>
                      <input id="mdl-nome" type="text" required maxLength={120} className="rh-input" placeholder="Ex: Team Building 2026" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
                    </div>
                    <div className="rh-field">
                      <label htmlFor="mdl-data">Data</label>
                      <input id="mdl-data" type="date" required className="rh-input" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />
                    </div>
                  </div>
                </div>
                <div className="rh-field">
                  <label htmlFor="mdl-desc">Descrição <span className="mdl-opt">(opcional)</span></label>
                  <textarea id="mdl-desc" rows={2} maxLength={500} className="rh-input" placeholder="Ex: Participou no torneio de padel" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
                </div>

                <div className="rh-field">
                  <label>Atribuir a <span className="mdl-opt">{form.users.size} selecionado(s)</span></label>
                  <div className="mdl-picker">
                    <div className="mdl-picker-top">
                      <label className="mdl-search">
                        <Ic.Search />
                        <input value={buscaColab} onChange={(e) => setBuscaColab(e.target.value)} placeholder="Procurar colaborador" />
                      </label>
                      <button type="button" className="rh-btn is-ghost" onClick={marcarFiltrados} disabled={!colabFiltrados.length}>
                        {todosFiltradosMarcados ? "Desmarcar" : "Marcar"} {buscaColab ? "estes" : "todos"}
                      </button>
                    </div>
                    <div className="mdl-picker-list">
                      {colabFiltrados.map((c) => {
                        const on = form.users.has(c.id);
                        return (
                          <button key={c.id} type="button" className={`mdl-person ${on ? "is-on" : ""}`} onClick={() => toggleUser(c.id)} aria-pressed={on}>
                            <span className="mdl-av">{c.avatar_url ? <img src={c.avatar_url} alt="" /> : iniciais(c.nome)}</span>
                            <span className="mdl-person-name">{c.nome}</span>
                            <span className="mdl-tick">{on && <Ic.Check size={13} />}</span>
                          </button>
                        );
                      })}
                      {!colabFiltrados.length && <p className="mdl-none">Nenhum colaborador encontrado.</p>}
                    </div>
                  </div>
                </div>
              </div>
              <div className="rh-modal-foot">
                <button type="button" className="rh-btn is-ghost" onClick={() => setForm(null)} disabled={aGuardar}>Cancelar</button>
                <button type="submit" className="rh-btn is-primary is-lg" disabled={aGuardar}>
                  <Ic.Check /> {aGuardar ? "A guardar…" : form.id ? "Guardar alterações" : "Criar medalha"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body,
      )}

      {aApagar && createPortal(
        <div className="rh-overlay is-top" onClick={() => { if (!aGuardar) setAApagar(null); }}>
          <div className="rh-modal is-sm" onClick={(e) => e.stopPropagation()} role="alertdialog" aria-modal="true" aria-labelledby="mdl-del-title">
            <div className="rh-modal-head">
              <span className="rh-modal-ico"><Ic.Trash size={20} /></span>
              <div className="rh-modal-title">
                <span>Medalha</span>
                <h3 id="mdl-del-title">Eliminar “{aApagar.nome}”?</h3>
              </div>
              <button type="button" onClick={() => setAApagar(null)} className="rh-modal-close" aria-label="Fechar" disabled={aGuardar}><Ic.X /></button>
            </div>
            <div className="rh-modal-body">
              <p className="mdl-del-text">A medalha desaparece do perfil de {aApagar.users.length} colaborador(es). Não dá para desfazer.</p>
            </div>
            <div className="rh-modal-foot">
              <button type="button" className="rh-btn is-ghost" onClick={() => setAApagar(null)} disabled={aGuardar}>Cancelar</button>
              <button type="button" className="rh-btn is-bad is-lg" onClick={apagar} disabled={aGuardar}><Ic.Trash /> {aGuardar ? "A eliminar…" : "Eliminar"}</button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
