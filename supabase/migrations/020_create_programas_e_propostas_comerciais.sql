create extension if not exists pgcrypto;

-- 1) Add sequential task number (keeps tarefas.id as uuid PK)
create sequence if not exists public.tarefas_numero_seq_seq as bigint;

alter table if exists public.tarefas
  add column if not exists numero_seq bigint;

alter table if exists public.tarefas
  alter column numero_seq set default nextval('public.tarefas_numero_seq_seq');

update public.tarefas
set numero_seq = nextval('public.tarefas_numero_seq_seq')
where numero_seq is null;

select setval(
  'public.tarefas_numero_seq_seq',
  coalesce((select max(numero_seq) from public.tarefas), 0),
  true
);

create unique index if not exists uq_tarefas_numero_seq
  on public.tarefas (numero_seq);

do $$
begin
  if not exists (
    select 1
    from public.tarefas
    where numero_seq is null
  ) then
    alter table public.tarefas
      alter column numero_seq set not null;
  end if;
end
$$;

-- 2) Reusable programs table
create table if not exists public.programas_financiamento (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nome text not null,
  aviso text,
  pct numeric(5,2) not null default 0,
  tipo_incentivo text,
  investimento_minimo numeric(14,2),
  regiao text,
  prazo_fase_1 date,
  prazo_fase_2 date,
  descricao text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint programas_financiamento_pct_chk check (pct >= 0 and pct <= 100)
);

create index if not exists idx_programas_financiamento_ativo
  on public.programas_financiamento (ativo);

insert into public.programas_financiamento (
  codigo,
  nome,
  aviso,
  pct,
  tipo_incentivo,
  investimento_minimo,
  regiao,
  prazo_fase_1,
  prazo_fase_2,
  descricao,
  ativo
)
values
  (
    'sice_qual_2030',
    'SICE - Qualificacao das PME',
    'ALGARVE-2025-36',
    50,
    'fundo perdido (nao reembolsavel)',
    100000,
    'Algarve',
    '2026-03-31',
    '2026-06-30',
    'Apoio a operacoes individuais de PME para qualificacao e digitalizacao.',
    true
  ),
  (
    'prr_digitalizacao',
    'PRR - Digitalizacao das Empresas',
    'PRR-C05-i02',
    75,
    'fundo perdido (nao reembolsavel)',
    25000,
    'Portugal Continental',
    '2026-06-30',
    null,
    'Apoio a projetos de transformacao digital de PME.',
    true
  ),
  (
    'compete_inovacao',
    'Compete 2030 - Inovacao Empresarial',
    'COMPETE-2025-10',
    40,
    'reembolsavel',
    150000,
    'Norte / Centro / Alentejo',
    '2026-09-30',
    null,
    'Apoio a projetos de inovacao produtiva.',
    true
  )
on conflict (codigo) do update
set
  nome = excluded.nome,
  aviso = excluded.aviso,
  pct = excluded.pct,
  tipo_incentivo = excluded.tipo_incentivo,
  investimento_minimo = excluded.investimento_minimo,
  regiao = excluded.regiao,
  prazo_fase_1 = excluded.prazo_fase_1,
  prazo_fase_2 = excluded.prazo_fase_2,
  descricao = excluded.descricao,
  ativo = excluded.ativo;

-- 3) Proposals table
create table if not exists public.propostas_comerciais (
  id uuid primary key default gen_random_uuid(),

  tarefa_id uuid not null references public.tarefas(id) on delete restrict,
  numero_proposta bigint not null,

  programa_id uuid references public.programas_financiamento(id) on delete set null,

  estado text not null default 'em_analise',
  aprovado_em timestamptz,
  arquivado_em timestamptz,
  motivo_arquivo text,

  html_gerado text,
  payload jsonb not null default '{}'::jsonb,

  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint propostas_comerciais_estado_chk
    check (estado in ('em_analise', 'aprovada', 'arquivada'))
);

create unique index if not exists uq_propostas_comerciais_tarefa
  on public.propostas_comerciais (tarefa_id);

create unique index if not exists uq_propostas_comerciais_numero
  on public.propostas_comerciais (numero_proposta);

create index if not exists idx_propostas_comerciais_estado
  on public.propostas_comerciais (estado, created_at desc);

create index if not exists idx_propostas_comerciais_programa
  on public.propostas_comerciais (programa_id);

create index if not exists idx_propostas_comerciais_created_by
  on public.propostas_comerciais (created_by, created_at desc);

create or replace function public.set_numero_proposta_from_tarefa()
returns trigger
language plpgsql
as $$
declare
  v_numero bigint;
begin
  select t.numero_seq
    into v_numero
  from public.tarefas t
  where t.id = new.tarefa_id;

  if v_numero is null then
    raise exception 'A tarefa % nao tem numero_seq definido.', new.tarefa_id;
  end if;

  new.numero_proposta = v_numero;
  return new;
end;
$$;

drop trigger if exists trg_set_numero_proposta_from_tarefa
  on public.propostas_comerciais;

create trigger trg_set_numero_proposta_from_tarefa
before insert or update of tarefa_id
on public.propostas_comerciais
for each row
execute function public.set_numero_proposta_from_tarefa();

create or replace function public.set_updated_at_generic()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_programas_financiamento_updated_at
  on public.programas_financiamento;

create trigger trg_programas_financiamento_updated_at
before update on public.programas_financiamento
for each row
execute function public.set_updated_at_generic();

drop trigger if exists trg_propostas_comerciais_updated_at
  on public.propostas_comerciais;

create trigger trg_propostas_comerciais_updated_at
before update on public.propostas_comerciais
for each row
execute function public.set_updated_at_generic();

-- 4) Base RLS: each user sees/manages own proposals
alter table public.propostas_comerciais enable row level security;

drop policy if exists propostas_select_own on public.propostas_comerciais;
create policy propostas_select_own
on public.propostas_comerciais
for select
using (created_by = auth.uid());

drop policy if exists propostas_insert_own on public.propostas_comerciais;
create policy propostas_insert_own
on public.propostas_comerciais
for insert
with check (created_by = auth.uid());

drop policy if exists propostas_update_own on public.propostas_comerciais;
create policy propostas_update_own
on public.propostas_comerciais
for update
using (created_by = auth.uid())
with check (created_by = auth.uid());

drop policy if exists propostas_delete_own on public.propostas_comerciais;
create policy propostas_delete_own
on public.propostas_comerciais
for delete
using (created_by = auth.uid());
