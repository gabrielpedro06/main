alter table public.tarefas
  add column if not exists analise_destino_user_id uuid,
  add column if not exists analise_alerta_pendente boolean not null default false;

alter table public.atividades
  add column if not exists analise_destino_user_id uuid,
  add column if not exists analise_alerta_pendente boolean not null default false;

create index if not exists idx_tarefas_analise_alerta_pendente_user
  on public.tarefas (analise_destino_user_id, analise_data_prevista)
  where analise_alerta_pendente = true and estado = 'em_analise';

create index if not exists idx_atividades_analise_alerta_pendente_user
  on public.atividades (analise_destino_user_id, analise_data_prevista)
  where analise_alerta_pendente = true and estado = 'em_analise';
