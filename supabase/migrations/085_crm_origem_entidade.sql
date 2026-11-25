-- =====================================================================
-- 085 · CRM das Leads: origem e ligação à entidade
-- marketing_leads.origem      de onde veio a lead (Site, Referência, Evento,
--                              Campanha email, Importação CSV, Prospeção…).
--                              Texto livre; a app sugere uma lista.
-- marketing_leads.cliente_id  entidade (tabela clientes) desta empresa. É
--                              preenchida ao criar uma proposta a partir da
--                              lead ou ao "Tornar cliente"; a ficha mostra as
--                              propostas dessa entidade.
-- Leads importadas antes desta migração ficam com origem vazia.
-- Idempotente. Quem usa: src/components/crm/*, pages/GestaoLeads.jsx.
-- =====================================================================
alter table public.marketing_leads
  add column if not exists origem text;

-- o tipo de cliente_id segue o tipo de clientes.id
do $$
declare
  tipo_id text;
begin
  if not exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'marketing_leads' and column_name = 'cliente_id'
  ) then
    select format_type(a.atttypid, a.atttypmod) into tipo_id
      from pg_attribute a
     where a.attrelid = 'public.clientes'::regclass and a.attname = 'id';
    execute format(
      'alter table public.marketing_leads add column cliente_id %s references public.clientes(id) on delete set null',
      tipo_id
    );
  end if;
end $$;

create index if not exists idx_marketing_leads_origem on public.marketing_leads (origem);
create index if not exists idx_marketing_leads_cliente on public.marketing_leads (cliente_id) where cliente_id is not null;
