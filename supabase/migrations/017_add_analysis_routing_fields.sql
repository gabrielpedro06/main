alter table public.tarefas
  add column if not exists analise_destino text,
  add column if not exists analise_data_prevista date,
  add column if not exists analise_data_envio timestamptz,
  add column if not exists analise_data_retorno timestamptz;

alter table public.atividades
  add column if not exists analise_destino text,
  add column if not exists analise_data_prevista date,
  add column if not exists analise_data_envio timestamptz,
  add column if not exists analise_data_retorno timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'tarefas_analise_destino_check'
  ) then
    alter table public.tarefas
      add constraint tarefas_analise_destino_check
      check (analise_destino is null or analise_destino in ('proprio', 'colega', 'cliente', 'contabilista', 'organismo'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'atividades_analise_destino_check'
  ) then
    alter table public.atividades
      add constraint atividades_analise_destino_check
      check (analise_destino is null or analise_destino in ('proprio', 'colega', 'cliente', 'contabilista', 'organismo'));
  end if;
end
$$;

create index if not exists idx_tarefas_em_analise_data_prevista
  on public.tarefas (analise_data_prevista)
  where estado = 'em_analise';

create index if not exists idx_atividades_em_analise_data_prevista
  on public.atividades (analise_data_prevista)
  where estado = 'em_analise';
