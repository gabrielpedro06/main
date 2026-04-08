alter table public.tarefas
  add column if not exists analise_destino_contacto_id uuid;

alter table public.atividades
  add column if not exists analise_destino_contacto_id uuid;

create index if not exists idx_tarefas_analise_destino_contacto_id
  on public.tarefas (analise_destino_contacto_id)
  where estado = 'em_analise';

create index if not exists idx_atividades_analise_destino_contacto_id
  on public.atividades (analise_destino_contacto_id)
  where estado = 'em_analise';
