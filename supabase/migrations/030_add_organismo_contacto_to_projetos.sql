alter table public.projetos
  add column if not exists organismo_contacto_id uuid;

create index if not exists idx_projetos_organismo_contacto_id
  on public.projetos (organismo_contacto_id);
