create extension if not exists pgcrypto;

create or replace function public.set_updated_at_generic()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create table if not exists public.transfergest_registos (
    id uuid primary key default gen_random_uuid(),
    denominacao text not null,
    nome text,
    contacto_telefone text,
    contacto_email text,
    numero_registo text,
    data_registo date,
    numero_contribuinte text,
    sede_endereco text,
    sede_codigo_postal text,
    sede_localidade text,
    sede_concelho text,
    sede_distrito text,
    ert_drt text,
    nut_ii text,
    nut_iii text,
    observacoes text,
    ano integer,
    classificacao_transfergest text,
    interesse_email_marketing boolean not null default false,
    target text,
    estado text not null default 'novo',
    estado_historico jsonb not null default '{}'::jsonb,
    ultimo_contacto_em date,
    ativo boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint transfergest_estado_chk
      check (estado in ('novo', 'contactado', 'reuniao', 'proposta', 'ganho', 'perdido'))
);

create index if not exists idx_transfergest_estado
    on public.transfergest_registos (estado, created_at desc);

create index if not exists idx_transfergest_localidade
    on public.transfergest_registos (sede_localidade);

create index if not exists idx_transfergest_ano
    on public.transfergest_registos (ano);

create unique index if not exists uq_transfergest_numero_contribuinte
    on public.transfergest_registos (numero_contribuinte)
    where numero_contribuinte is not null and btrim(numero_contribuinte) <> '';

drop trigger if exists trg_transfergest_registos_updated_at on public.transfergest_registos;
create trigger trg_transfergest_registos_updated_at
before update on public.transfergest_registos
for each row execute function public.set_updated_at_generic();

alter table if exists public.transfergest_registos enable row level security;

drop policy if exists transfergest_registos_select_all on public.transfergest_registos;
create policy transfergest_registos_select_all
on public.transfergest_registos
for select
using (auth.role() = 'authenticated');

drop policy if exists transfergest_registos_insert_authenticated on public.transfergest_registos;
create policy transfergest_registos_insert_authenticated
on public.transfergest_registos
for insert
with check (auth.role() = 'authenticated');

drop policy if exists transfergest_registos_update_authenticated on public.transfergest_registos;
create policy transfergest_registos_update_authenticated
on public.transfergest_registos
for update
using (auth.role() = 'authenticated');

drop policy if exists transfergest_registos_delete_authenticated on public.transfergest_registos;
create policy transfergest_registos_delete_authenticated
on public.transfergest_registos
for delete
using (auth.role() = 'authenticated');
