-- =====================================================================
-- MARKETING: estratégia por ciclos (modelo do "Guia de Estratégia de Marca")
--  * marketing_ciclos   → um plano por marca e por período (ex.: trimestre)
--    dados (jsonb) guarda as 9 secções: objetivos, mercado, pesquisa,
--    curadoria, posicionamento, storytelling, funil, analytics, analise
--  * marketing_conteudos.frente → liga cada conteúdo a uma frente/objetivo do ciclo
-- =====================================================================

create table if not exists public.marketing_ciclos (
    id uuid primary key default gen_random_uuid(),
    marca_id uuid not null references public.marketing_marcas(id) on delete cascade,
    nome text not null default '',
    inicio date,
    fim date,
    dados jsonb not null default '{}'::jsonb,
    created_by uuid references public.profiles(id) on delete set null default auth.uid(),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint marketing_ciclos_datas_chk check (inicio is null or fim is null or fim >= inicio)
);

create index if not exists idx_marketing_ciclos_marca
    on public.marketing_ciclos (marca_id, inicio desc);

drop trigger if exists trg_marketing_ciclos_updated_at on public.marketing_ciclos;
create trigger trg_marketing_ciclos_updated_at
before update on public.marketing_ciclos
for each row execute function public.set_updated_at_generic();

alter table public.marketing_ciclos enable row level security;

drop policy if exists marketing_ciclos_all_authenticated on public.marketing_ciclos;
create policy marketing_ciclos_all_authenticated
on public.marketing_ciclos for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

alter table public.marketing_conteudos
    add column if not exists frente text;
