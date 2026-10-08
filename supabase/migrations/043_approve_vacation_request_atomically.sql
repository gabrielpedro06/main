create or replace function public.aprovar_pedido_ferias_por_email(p_pedido_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  pedido public.ferias%rowtype;
  ano_pedido integer;
begin
  select *
  into pedido
  from public.ferias
  where id = p_pedido_id
    and estado = 'pendente'
  for update;

  if not found then
    raise exception 'Pedido de férias não encontrado ou já processado';
  end if;

  if lower(coalesce(pedido.tipo, '')) not like '%fer%' then
    raise exception 'O pedido indicado não é um pedido de férias';
  end if;

  ano_pedido := extract(year from pedido.data_inicio)::integer;

  update public.ferias
  set estado = 'aprovado'
  where id = pedido.id;

  update public.vacation_balances saldo
  set dias_gozados = public.calcular_dias_ferias_gozados(saldo.user_id, saldo.ano),
      atualizado_em = now()
  where saldo.user_id = pedido.user_id
    and saldo.ano = ano_pedido;

  if not found then
    raise exception 'Saldo de férias não encontrado para o ano do pedido';
  end if;
end;
$$;

revoke all on function public.aprovar_pedido_ferias_por_email(uuid) from public;
grant execute on function public.aprovar_pedido_ferias_por_email(uuid) to service_role;
