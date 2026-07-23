-- ---------------------------------------------------------------------
-- Ativos TI: novos campos em equipamentos + tabela de software
-- ---------------------------------------------------------------------

create or replace function public.set_updated_at_software()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

alter table if exists public.equipamentos
  add column if not exists entidade text,
  add column if not exists fornecedor text,
  add column if not exists fatura text,
  add column if not exists data_aquisicao date,
  add column if not exists data_garantia date,
  add column if not exists prazo_garantia date;

create index if not exists idx_equipamentos_entidade on public.equipamentos (entidade);
create index if not exists idx_equipamentos_fornecedor on public.equipamentos (fornecedor);
create index if not exists idx_equipamentos_data_aquisicao on public.equipamentos (data_aquisicao);

create table if not exists public.software (
  id bigserial primary key,
  codigo text not null unique,
  nome text not null,
  tipo text not null default 'Windows',
  versao text,
  entidade text,
  fornecedor text,
  fatura text,
  data_aquisicao date,
  data_expiracao date,
  licenca_chave text,
  estado text not null default 'ativo'
    check (estado in ('ativo', 'licenca_expirada', 'arquivado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_software_estado on public.software (estado);
create index if not exists idx_software_entidade on public.software (entidade);
create index if not exists idx_software_nome on public.software (nome);

alter table if exists public.software enable row level security;

drop policy if exists software_select_authenticated on public.software;
create policy software_select_authenticated
  on public.software
  for select
  using (auth.role() = 'authenticated');

drop policy if exists software_insert_authenticated on public.software;
create policy software_insert_authenticated
  on public.software
  for insert
  with check (auth.role() = 'authenticated');

drop policy if exists software_update_authenticated on public.software;
create policy software_update_authenticated
  on public.software
  for update
  using (auth.role() = 'authenticated');

drop policy if exists software_delete_authenticated on public.software;
create policy software_delete_authenticated
  on public.software
  for delete
  using (auth.role() = 'authenticated');

drop trigger if exists trg_software_updated_at on public.software;
create trigger trg_software_updated_at
before update on public.software
for each row execute function public.set_updated_at_software();
