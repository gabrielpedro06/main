-- =====================================================================
-- 086 · CRM das Leads: várias pessoas por empresa
-- O contacto principal continua nos campos da lead (titular, email,
-- contacto), que as campanhas e a exportação usam. As outras pessoas ficam
-- em marketing_leads_pessoas (nome, cargo, papel, email, telefone, notas).
-- "Tornar principal" (na app) troca a pessoa com os campos da lead.
-- RLS: staff + marketing, como marketing_leads_interacoes (083).
-- Idempotente. Quem usa: src/components/crm/PessoasLead.jsx.
-- =====================================================================
do $$
declare
  tipo_id text;
begin
  select format_type(a.atttypid, a.atttypmod) into tipo_id
    from pg_attribute a
   where a.attrelid = 'public.marketing_leads'::regclass and a.attname = 'id';

  execute format($f$
    create table if not exists public.marketing_leads_pessoas (
      id uuid primary key default gen_random_uuid(),
      lead_id %s not null references public.marketing_leads(id) on delete cascade,
      nome text not null,
      cargo text,
      papel text check (papel is null or papel in ('decisor', 'financeiro', 'tecnico', 'outro')),
      email text,
      telefone text,
      notas text,
      criado_por uuid default auth.uid() references public.profiles(id) on delete set null,
      created_at timestamptz not null default now()
    )$f$, tipo_id);
end $$;

create index if not exists idx_leads_pessoas_lead on public.marketing_leads_pessoas (lead_id);

alter table public.marketing_leads_pessoas enable row level security;

drop policy if exists leads_pessoas_tudo on public.marketing_leads_pessoas;
create policy leads_pessoas_tudo on public.marketing_leads_pessoas
  for all to authenticated
  using (public.bizin_e_staff() or public.bizin_papel() in ('marketing', 'marketing plus'))
  with check (public.bizin_e_staff() or public.bizin_papel() in ('marketing', 'marketing plus'));

grant select, insert, update, delete on public.marketing_leads_pessoas to authenticated;
