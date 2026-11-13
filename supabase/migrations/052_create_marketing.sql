-- =====================================================================
-- MARKETING: fluxo de conteúdos por marca (substitui o fluxo do Notion)
--  * marketing_marcas    → 2Siglas, Geoflicks, TransferGest, ...
--  * marketing_conteudos → ideias + conteúdos do fluxo (uma linha só;
--    passar uma ideia para o fluxo é mudar o estado, não copiar)
-- =====================================================================

create table if not exists public.marketing_marcas (
    id uuid primary key default gen_random_uuid(),
    nome text not null,
    cor text not null default '#2563eb',
    ordem integer not null default 0,
    ativo boolean not null default true,
    created_at timestamptz not null default now()
);

create unique index if not exists marketing_marcas_nome_key
    on public.marketing_marcas (lower(nome));

insert into public.marketing_marcas (nome, cor, ordem) values
    ('2Siglas', '#0d124b', 1),
    ('Geoflicks', '#16a34a', 2),
    ('TransferGest', '#0ea5e9', 3)
on conflict do nothing;

create table if not exists public.marketing_conteudos (
    id uuid primary key default gen_random_uuid(),
    marca_id uuid not null references public.marketing_marcas(id) on delete cascade,
    estado text not null default 'ideia',
    estado_antes_arquivo text,
    ordem double precision not null default extract(epoch from now()),

    -- Planeamento
    titulo text not null default '',
    responsavel_id uuid references public.profiles(id) on delete set null,
    prioridade text,
    data_entrega date,
    data_publicacao timestamptz,
    data_publicacao_2 timestamptz,
    canais text[] not null default '{}',
    formato text,
    objetivo text,
    estrategia text,
    editoria text,
    pilar text,
    publico text[] not null default '{}',

    -- Criativo
    headline text,
    briefing text,
    conceito text,
    design_ideia text,

    -- Copy / design
    copies jsonb not null default '[]'::jsonb,   -- [{ "titulo": "Instagram", "texto": "..." }]
    cta text,
    hashtags text[] not null default '{}',
    links jsonb not null default '[]'::jsonb,    -- [{ "label": "Canva", "url": "https://..." }]

    -- Aprovação
    alteracoes text,
    aprovado_por uuid references public.profiles(id) on delete set null,
    aprovado_em timestamptz,

    -- Resultados
    metrica_principal text,
    resultado numeric,
    avaliacao text,
    resultado_notas text,
    verba numeric(12,2),
    verba_usada numeric(12,2),

    created_by uuid references public.profiles(id) on delete set null default auth.uid(),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint marketing_conteudos_estado_chk check (estado in (
        'ideia', 'curadoria', 'briefing', 'producao', 'aprovacao',
        'agendado', 'publicado', 'monitorado', 'arquivado'
    )),
    constraint marketing_conteudos_prioridade_chk check (prioridade is null or prioridade in ('alta', 'media', 'baixa')),
    constraint marketing_conteudos_avaliacao_chk check (avaliacao is null or avaliacao in ('excelente', 'bom', 'razoavel', 'fraco'))
);

create index if not exists idx_marketing_conteudos_marca_estado
    on public.marketing_conteudos (marca_id, estado, ordem);
create index if not exists idx_marketing_conteudos_publicacao
    on public.marketing_conteudos (marca_id, data_publicacao);

drop trigger if exists trg_marketing_conteudos_updated_at on public.marketing_conteudos;
create trigger trg_marketing_conteudos_updated_at
before update on public.marketing_conteudos
for each row execute function public.set_updated_at_generic();

-- RLS: qualquer utilizador autenticado (o acesso à aba é controlado pela app)
alter table public.marketing_marcas enable row level security;
alter table public.marketing_conteudos enable row level security;

drop policy if exists marketing_marcas_all_authenticated on public.marketing_marcas;
create policy marketing_marcas_all_authenticated
on public.marketing_marcas for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

drop policy if exists marketing_conteudos_all_authenticated on public.marketing_conteudos;
create policy marketing_conteudos_all_authenticated
on public.marketing_conteudos for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');
