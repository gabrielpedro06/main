// =====================================================================
// Pessoas de uma lead (bloco "Pessoas" da FichaLead).
// Principal = campos da própria lead (titular, email, contacto), que as
// campanhas e a exportação usam. Outras = marketing_leads_pessoas (086).
// "Tornar principal" troca: a pessoa passa para os campos da lead e o
// principal anterior passa para a lista.
// Estilos .crm-pes* em styles/crm.css.
// =====================================================================
import { useEffect, useState } from "react";
import { supabase } from "../../services/supabase";
import { toast } from "../../utils/toast";
import { confirmar } from "../../utils/dialogo";
import { iniciais, iniciarChamada } from "./crm";
import { Ic } from "./crmIcones";

const PAPEIS_PESSOA = [
  { valor: "decisor", label: "Decisor" },
  { valor: "financeiro", label: "Financeiro" },
  { valor: "tecnico", label: "Técnico / utilizador" },
  { valor: "outro", label: "Outro" },
];
const PAPEL = Object.fromEntries(PAPEIS_PESSOA.map((p) => [p.valor, p.label]));
const VAZIA = { nome: "", cargo: "", papel: "", email: "", telefone: "" };

function Contactos({ email, telefone, lead, pessoa }) {
  return (
    <div className="crm-pes-contactos">
      {email ? <a href={`mailto:${email}`}><Ic.Mail /> {email}</a> : null}
      {telefone ? (
        <a
          href={`tel:${String(telefone).replace(/\s/g, "")}`}
          onClick={() => iniciarChamada({ leadId: lead.id, leadNome: lead.nome, pessoa, telefone })}
          title="Ligar (ao voltar à app, regista como correu)"
        ><Ic.Phone /> {telefone}</a>
      ) : null}
      {!email && !telefone && <em>Sem email nem telefone</em>}
    </div>
  );
}

/**
 * @param {object} props
 * @param {object} props.lead
 * @param {boolean} props.fechada  lead arquivada: só leitura
 * @param {(patch: object) => Promise<boolean>} props.onPatch
 * @param {() => void} props.onEditar  formulário completo da empresa
 */
export default function PessoasLead({ lead, fechada, onPatch, onEditar }) {
  const [pessoas, setPessoas] = useState(null);
  const [form, setForm] = useState(null); // { id?, nome, cargo, papel, email, telefone }
  const [aGravar, setAGravar] = useState(false);
  const [semTabela, setSemTabela] = useState(false);

  useEffect(() => {
    let vivo = true;
    supabase
      .from("marketing_leads_pessoas")
      .select("id, nome, cargo, papel, email, telefone")
      .eq("lead_id", lead.id)
      .order("created_at")
      .then(({ data, error }) => {
        if (!vivo) return;
        if (error) { setSemTabela(/does not exist|schema cache/i.test(error.message || "")); setPessoas([]); return; }
        setPessoas(data || []);
      });
    return () => { vivo = false; };
  }, [lead.id]);

  async function gravar(e) {
    e?.preventDefault();
    const dados = {
      nome: form.nome.trim(),
      cargo: form.cargo.trim() || null,
      papel: form.papel || null,
      email: form.email.trim() || null,
      telefone: form.telefone.trim() || null,
    };
    if (!dados.nome) { toast("Indica o nome da pessoa.", { tipo: "aviso" }); return; }
    setAGravar(true);
    const q = form.id
      ? supabase.from("marketing_leads_pessoas").update(dados).eq("id", form.id)
      : supabase.from("marketing_leads_pessoas").insert([{ ...dados, lead_id: lead.id }]);
    const { data, error } = await q.select("id, nome, cargo, papel, email, telefone").single();
    setAGravar(false);
    if (error) {
      toast(/does not exist|schema cache/i.test(error.message || "") ? "Falta correr a migração 086 (CRM) no Supabase." : "Não foi possível gravar: " + error.message, { tipo: "erro" });
      return;
    }
    setPessoas((l) => (form.id ? l.map((p) => (p.id === data.id ? data : p)) : [...(l || []), data]));
    setForm(null);
    toast(form.id ? "Pessoa atualizada." : "Pessoa adicionada.");
  }

  async function apagar(p) {
    if (!(await confirmar(`Remover ${p.nome}?`, { mensagem: "Sai da lista de pessoas desta empresa.", botao: "Remover", perigoso: true }))) return;
    setPessoas((l) => l.filter((x) => x.id !== p.id));
    const { error } = await supabase.from("marketing_leads_pessoas").delete().eq("id", p.id);
    if (error) { setPessoas((l) => [...l, p]); toast("Não foi possível remover.", { tipo: "erro" }); }
  }

  /** A pessoa passa para os campos da lead; o principal anterior entra na lista */
  async function tornarPrincipal(p) {
    const tinhaPrincipal = lead.titular || lead.email || lead.contacto;
    let anterior = null;
    if (tinhaPrincipal) {
      const { data, error } = await supabase
        .from("marketing_leads_pessoas")
        .insert([{ lead_id: lead.id, nome: lead.titular || "Contacto anterior", email: lead.email || null, telefone: lead.contacto || null }])
        .select("id, nome, cargo, papel, email, telefone")
        .single();
      if (error) { toast("Não foi possível trocar: " + error.message, { tipo: "erro" }); return; }
      anterior = data;
    }
    const ok = await onPatch({ titular: p.nome, email: p.email || null, contacto: p.telefone || null });
    if (!ok) {
      if (anterior) await supabase.from("marketing_leads_pessoas").delete().eq("id", anterior.id);
      return;
    }
    await supabase.from("marketing_leads_pessoas").delete().eq("id", p.id);
    setPessoas((l) => [...l.filter((x) => x.id !== p.id), ...(anterior ? [anterior] : [])]);
    toast(`${p.nome.split(" ")[0]} é agora o contacto principal.`);
  }

  const campo = (k) => ({ value: form?.[k] ?? "", onChange: (e) => setForm((f) => ({ ...f, [k]: e.target.value })) });

  return (
    <section className="crm-bloco">
      <h3><Ic.Users /> Pessoas</h3>

      <div className="crm-pes is-principal">
        <span className="crm-av">{lead.titular ? iniciais(lead.titular) : <Ic.User />}</span>
        <div className="crm-pes-corpo">
          <div className="crm-pes-nome">
            <b>{lead.titular || <em>Sem pessoa de contacto</em>}</b>
            <span className="crm-pes-tag">Principal</span>
          </div>
          <Contactos email={lead.email} telefone={lead.contacto} lead={lead} pessoa={lead.titular} />
        </div>
        {!fechada && <button type="button" className="crm-pes-ico" onClick={onEditar} title="Editar dados da empresa e do contacto principal" aria-label="Editar contacto principal"><Ic.Edit /></button>}
      </div>

      {(pessoas || []).map((p) => (
        form?.id === p.id ? null : (
          <div key={p.id} className="crm-pes">
            <span className="crm-av is-suave">{iniciais(p.nome)}</span>
            <div className="crm-pes-corpo">
              <div className="crm-pes-nome">
                <b>{p.nome}</b>
                {p.cargo && <span className="crm-sub">{p.cargo}</span>}
                {p.papel && <span className={`crm-pes-tag is-${p.papel}`}>{PAPEL[p.papel]}</span>}
              </div>
              <Contactos email={p.email} telefone={p.telefone} lead={lead} pessoa={p.nome} />
            </div>
            {!fechada && (
              <div className="crm-pes-acoes">
                <button type="button" className="crm-pes-ico" onClick={() => tornarPrincipal(p)} title="Tornar contacto principal" aria-label="Tornar contacto principal"><Ic.Star /></button>
                <button type="button" className="crm-pes-ico" onClick={() => setForm({ ...VAZIA, ...p, cargo: p.cargo || "", papel: p.papel || "", email: p.email || "", telefone: p.telefone || "" })} title="Editar" aria-label="Editar"><Ic.Edit /></button>
                <button type="button" className="crm-pes-ico is-perigo" onClick={() => apagar(p)} title="Remover" aria-label="Remover"><Ic.Trash /></button>
              </div>
            )}
          </div>
        )
      ))}

      {semTabela && <p className="crm-dica">Para juntar mais pessoas, falta correr a migração 086 no Supabase.</p>}

      {form ? (
        <form className="crm-pes-form" onSubmit={gravar}>
          <div className="crm-grelha-2">
            <input className="crm-input" placeholder="Nome *" aria-label="Nome" autoFocus {...campo("nome")} required />
            <input className="crm-input" placeholder="Cargo (ex.: Diretor financeiro)" aria-label="Cargo" {...campo("cargo")} />
            <input className="crm-input" type="email" placeholder="Email" aria-label="Email" {...campo("email")} />
            <input className="crm-input" type="tel" placeholder="Telefone" aria-label="Telefone" {...campo("telefone")} />
          </div>
          <div className="crm-atalhos" role="radiogroup" aria-label="Papel na decisão">
            {PAPEIS_PESSOA.map((pp) => (
              <button key={pp.valor} type="button" role="radio" aria-checked={form.papel === pp.valor} className={form.papel === pp.valor ? "is-on" : ""} onClick={() => setForm((f) => ({ ...f, papel: f.papel === pp.valor ? "" : pp.valor }))}>{pp.label}</button>
            ))}
          </div>
          <div className="crm-reuniao-pe">
            <span className="crm-dica">Papel na decisão (opcional).</span>
            <button type="button" className="bz-btn" onClick={() => setForm(null)}>Cancelar</button>
            <button type="submit" className="bz-btn is-primary" disabled={aGravar}>{aGravar ? "A gravar…" : form.id ? "Guardar" : "Adicionar"}</button>
          </div>
        </form>
      ) : !fechada && !semTabela && (
        <button type="button" className="crm-link" onClick={() => setForm({ ...VAZIA })}><Ic.Plus /> Adicionar pessoa</button>
      )}

      {lead.cae && <p className="crm-dica"><Ic.Tag /> CAE {lead.cae}</p>}
    </section>
  );
}
