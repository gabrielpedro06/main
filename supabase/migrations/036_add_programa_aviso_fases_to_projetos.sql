alter table if exists public.projetos
add column if not exists programa_id uuid references public.programas_financiamento(id) on delete set null,
add column if not exists aviso_id uuid references public.avisos(id) on delete set null,
add column if not exists prazos_fases jsonb not null default '[]'::jsonb;

create index if not exists idx_projetos_programa_id
  on public.projetos (programa_id);

create index if not exists idx_projetos_aviso_id
  on public.projetos (aviso_id);