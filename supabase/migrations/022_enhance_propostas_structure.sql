-- 0) Garantir que a função de timestamp existe antes de tudo
create or replace function public.set_updated_at_generic()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

-- 1) Add eh_empresa_consultora to clientes
alter table if exists public.clientes
add column if not exists eh_empresa_consultora boolean not null default false;

-- 2) Add tem_programa to tipos_projeto
alter table if exists public.tipos_projeto
add column if not exists tem_programa boolean not null default false;

-- 3) Create avisos table
create table if not exists public.avisos (
    id uuid primary key default gen_random_uuid(),
    codigo text not null unique,
    nome text not null,
    descricao text,
    ativo boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_avisos_ativo on public.avisos (ativo);

-- 4) Add aviso_id to programas_financiamento
alter table if exists public.programas_financiamento
add column if not exists aviso_id uuid references public.avisos(id) on delete set null;

-- 5) Restructure propostas_comerciais
-- Remover constraints antigas
alter table if exists public.propostas_comerciais
drop constraint if exists propostas_comerciais_tarefa_id_fkey,
drop constraint if exists uq_propostas_comerciais_tarefa;

-- Adicionar novas colunas
-- Nota: tipo_projeto_id é BIGINT para coincidir com a tabela tipos_projeto
alter table if exists public.propostas_comerciais
add column if not exists empresa_consultora_id uuid references public.clientes(id) on delete restrict,
add column if not exists cliente_id uuid references public.clientes(id) on delete restrict,
add column if not exists contato_cliente_id text,
add column if not exists tipo_projeto_id bigint references public.tipos_projeto(id) on delete set null,
add column if not exists sigla_empresa text,
add column if not exists numero_proposta_str text unique,
add column if not exists plano_pagamentos jsonb default '[]'::jsonb;

-- Tornar tarefa_id opcional para compatibilidade
alter table if exists public.propostas_comerciais
alter column tarefa_id drop not null;

-- 6) Índices de Performance
create index if not exists idx_propostas_consultora on public.propostas_comerciais (empresa_consultora_id);
create index if not exists idx_propostas_cliente on public.propostas_comerciais (cliente_id);
create index if not exists idx_propostas_tipo_projeto on public.propostas_comerciais (tipo_projeto_id);
create index if not exists idx_propostas_numero_str on public.propostas_comerciais (numero_proposta_str);

-- 7) Triggers para updated_at
drop trigger if exists trg_avisos_updated_at on public.avisos;
create trigger trg_avisos_updated_at
before update on public.avisos
for each row execute function public.set_updated_at_generic();

-- 8) Configuração de RLS (Segurança)

-- Tabela: AVISOS
alter table if exists public.avisos enable row level security;

drop policy if exists avisos_select_all on public.avisos;
create policy avisos_select_all on public.avisos for select using (true);

drop policy if exists avisos_insert_authenticated on public.avisos;
create policy avisos_insert_authenticated on public.avisos for insert with check (auth.role() = 'authenticated');

drop policy if exists avisos_update_authenticated on public.avisos;
create policy avisos_update_authenticated on public.avisos for update using (auth.role() = 'authenticated');

drop policy if exists avisos_delete_authenticated on public.avisos;
create policy avisos_delete_authenticated on public.avisos for delete using (auth.role() = 'authenticated');

-- Tabela: PROGRAMAS_FINANCIAMENTO
alter table if exists public.programas_financiamento enable row level security;

drop policy if exists programas_financiamento_select_all on public.programas_financiamento;
create policy programas_financiamento_select_all on public.programas_financiamento for select using (true);

drop policy if exists programas_financiamento_insert_authenticated on public.programas_financiamento;
create policy programas_financiamento_insert_authenticated on public.programas_financiamento for insert with check (auth.role() = 'authenticated');

drop policy if exists programas_financiamento_update_authenticated on public.programas_financiamento;
create policy programas_financiamento_update_authenticated on public.programas_financiamento for update using (auth.role() = 'authenticated');

drop policy if exists programas_financiamento_delete_authenticated on public.programas_financiamento;
create policy programas_financiamento_delete_authenticated on public.programas_financiamento for delete using (auth.role() = 'authenticated');