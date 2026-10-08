-- Mantém o saldo anual sincronizado independentemente do canal de aprovação.
create or replace function public.sincronizar_saldo_ferias_por_pedido()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ano_antigo integer;
  ano_novo integer;
begin
  if not (
    lower(coalesce(new.tipo, '')) like '%fer%'
    or (tg_op = 'UPDATE' and lower(coalesce(old.tipo, '')) like '%fer%')
  ) then
    return new;
  end if;

  ano_novo := extract(year from coalesce(new.data_inicio, new.data_fim))::integer;

  if tg_op <> 'INSERT' then
    ano_antigo := extract(year from coalesce(old.data_inicio, old.data_fim))::integer;
  end if;

  if tg_op <> 'INSERT' and old.user_id is not null and ano_antigo >= 2000 then
    update public.vacation_balances
    set dias_gozados = public.calcular_dias_ferias_gozados(old.user_id, ano_antigo),
        atualizado_em = now()
    where user_id = old.user_id and ano = ano_antigo;
  end if;

  if new.user_id is not null and ano_novo >= 2000 then
    update public.vacation_balances
    set dias_gozados = public.calcular_dias_ferias_gozados(new.user_id, ano_novo),
        atualizado_em = now()
    where user_id = new.user_id and ano = ano_novo;
  end if;

  return new;
end;
$$;

drop trigger if exists sincronizar_saldo_ferias_apos_alteracao on public.ferias;

create trigger sincronizar_saldo_ferias_apos_alteracao
after insert or update of estado, data_inicio, data_fim, is_parcial, hora_inicio, hora_fim
on public.ferias
for each row
execute function public.sincronizar_saldo_ferias_por_pedido();