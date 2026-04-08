-- Make proposal ID/number independent from task ID.
-- numero_proposta becomes auto-increment and tarefa_id becomes optional.

create sequence if not exists public.propostas_comerciais_numero_seq_seq as bigint;

alter table if exists public.propostas_comerciais
  alter column numero_proposta set default nextval('public.propostas_comerciais_numero_seq_seq');

update public.propostas_comerciais
set numero_proposta = nextval('public.propostas_comerciais_numero_seq_seq')
where numero_proposta is null;

do $$
declare
  v_max bigint;
begin
  select max(numero_proposta)
    into v_max
  from public.propostas_comerciais;

  if v_max is null then
    -- Empty table: first nextval should return 1.
    perform setval('public.propostas_comerciais_numero_seq_seq', 1, false);
  else
    -- Existing rows: continue from current max.
    perform setval('public.propostas_comerciais_numero_seq_seq', v_max, true);
  end if;
end
$$;

alter table if exists public.propostas_comerciais
  alter column numero_proposta set not null;

alter table if exists public.propostas_comerciais
  alter column tarefa_id drop not null;

drop index if exists uq_propostas_comerciais_tarefa;

drop trigger if exists trg_set_numero_proposta_from_tarefa on public.propostas_comerciais;
drop function if exists public.set_numero_proposta_from_tarefa();
