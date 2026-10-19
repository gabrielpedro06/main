alter table public.projetos
  drop constraint if exists projetos_data_range_check;

alter table public.projetos
  add constraint projetos_data_range_check
  check (
    data_inicio is null
    or data_fim is null
    or data_inicio <= data_fim
  ) not valid;
