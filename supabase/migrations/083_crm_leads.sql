-- =====================================================================
-- 083 · CRM das Leads
-- marketing_leads ganha: valor do negócio, probabilidade, responsável,
-- próxima ação (texto + data), último contacto, desde quando está na etapa,
-- motivo de perda, notas e o controlo do lembrete.
-- Tabela nova marketing_leads_interacoes: histórico por lead (chamadas,
-- emails, reuniões, notas, propostas e mudanças de etapa automáticas).
-- Quem usa: src/components/crm/* (separador Leads de GestaoLeads.jsx).
-- Regras (RLS) da tabela nova: staff + marketing (como a rota /dashboard/leads).
-- Idempotente.
-- =====================================================================

-- 1. Campos novos nas leads -------------------------------------------
alter table public.marketing_leads
  add column if not exists valor numeric(12, 2),
  add column if not exists probabilidade smallint,
  add column if not exists responsavel_id uuid references public.profiles(id) on delete set null,
  add column if not exists proxima_acao text,
  add column if not exists proxima_acao_em date,
  add column if not exists ultimo_contacto_em timestamptz,
  add column if not exists estado_desde timestamptz,
  add column if not exists motivo_perda text,
  add column if not exists notas text,
  add column if not exists lembrete_enviado_para date;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'marketing_leads_probabilidade_check') then
    alter table public.marketing_leads
      add constraint marketing_leads_probabilidade_check check (probabilidade is null or probabilidade between 0 and 100);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'marketing_leads_valor_check') then
    alter table public.marketing_leads
      add constraint marketing_leads_valor_check check (valor is null or valor >= 0);
  end if;
end $$;

-- leads antigas: "na etapa desde" = data de criação (a coluna é criada sem
-- valor por omissão; se o tivesse, as antigas ficavam todas com a data de hoje)
update public.marketing_leads set estado_desde = coalesce(created_at, now()) where estado_desde is null;
alter table public.marketing_leads alter column estado_desde set default now();

create index if not exists idx_marketing_leads_responsavel on public.marketing_leads (responsavel_id) where ativo is not false;
create index if not exists idx_marketing_leads_proxima on public.marketing_leads (proxima_acao_em) where ativo is not false;

-- 2. Histórico (o tipo do lead_id segue o tipo de marketing_leads.id) --
do $$
declare
  tipo_id text;
begin
  select format_type(a.atttypid, a.atttypmod) into tipo_id
  from pg_attribute a
  where a.attrelid = 'public.marketing_leads'::regclass and a.attname = 'id';

  execute format($f$
    create table if not exists public.marketing_leads_interacoes (
      id uuid primary key default gen_random_uuid(),
      lead_id %s not null references public.marketing_leads(id) on delete cascade,
      tipo text not null default 'nota' check (tipo in ('nota', 'chamada', 'email', 'reuniao', 'proposta', 'estado')),
      texto text,
      feito_em timestamptz not null default now(),
      autor_id uuid default auth.uid() references public.profiles(id) on delete set null,
      created_at timestamptz not null default now()
    )$f$, tipo_id);
end $$;

create index if not exists idx_leads_interacoes_lead on public.marketing_leads_interacoes (lead_id, feito_em desc);

alter table public.marketing_leads_interacoes enable row level security;

drop policy if exists leads_interacoes_ler on public.marketing_leads_interacoes;
create policy leads_interacoes_ler on public.marketing_leads_interacoes
  for select to authenticated
  using (public.bizin_e_staff() or public.bizin_papel() in ('marketing', 'marketing plus'));

drop policy if exists leads_interacoes_criar on public.marketing_leads_interacoes;
create policy leads_interacoes_criar on public.marketing_leads_interacoes
  for insert to authenticated
  with check (
    (public.bizin_e_staff() or public.bizin_papel() in ('marketing', 'marketing plus'))
    and autor_id = auth.uid()
  );

-- editar/apagar: o autor, ou staff; as mudanças de etapa (automáticas) não se apagam
drop policy if exists leads_interacoes_editar on public.marketing_leads_interacoes;
create policy leads_interacoes_editar on public.marketing_leads_interacoes
  for update to authenticated
  using (tipo <> 'estado' and (autor_id = auth.uid() or public.bizin_e_staff()))
  with check (tipo <> 'estado' and (autor_id = auth.uid() or public.bizin_e_staff()));

drop policy if exists leads_interacoes_apagar on public.marketing_leads_interacoes;
create policy leads_interacoes_apagar on public.marketing_leads_interacoes
  for delete to authenticated
  using (tipo <> 'estado' and (autor_id = auth.uid() or public.bizin_e_staff()));

grant select, insert, update, delete on public.marketing_leads_interacoes to authenticated;

-- 3. Mudança de etapa: guarda "desde quando" e escreve no histórico ------
create or replace function public.marketing_leads_mudou_estado()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.estado is distinct from old.estado then
    new.estado_desde := now();
    insert into public.marketing_leads_interacoes (lead_id, tipo, texto, autor_id)
    values (new.id, 'estado', coalesce(old.estado, '') || '→' || coalesce(new.estado, ''), auth.uid());
  end if;
  return new;
end;
$$;

drop trigger if exists trg_marketing_leads_estado on public.marketing_leads;
create trigger trg_marketing_leads_estado
  before update of estado on public.marketing_leads
  for each row execute function public.marketing_leads_mudou_estado();

-- 4. Nova interação (que não seja mudança de etapa) = último contacto ----
create or replace function public.marketing_leads_contacto()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.tipo <> 'estado' and new.tipo <> 'nota' then
    update public.marketing_leads
       set ultimo_contacto_em = greatest(coalesce(ultimo_contacto_em, new.feito_em), new.feito_em)
     where id = new.lead_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_leads_interacoes_contacto on public.marketing_leads_interacoes;
create trigger trg_leads_interacoes_contacto
  after insert on public.marketing_leads_interacoes
  for each row execute function public.marketing_leads_contacto();

revoke all on function public.marketing_leads_mudou_estado() from public, anon, authenticated;
revoke all on function public.marketing_leads_contacto() from public, anon, authenticated;
