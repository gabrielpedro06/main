-- =====================================================================
-- 090 · Férias: o SQL passa a contar os dias como a app (27/11/2026)
--  Problema (docs/riscos-e-pendentes.md, ponto 9), confirmado com `select distinct tipo from ferias`:
--   - há pedidos "Férias" (com acento) e "ferias"; o SQL usava lower(tipo) like '%fer%',
--     que NÃO apanha "Férias" → esses dias ficavam de fora sempre que o SQL recalculava
--     (trigger da 042, provisionar_saldos_ferias, cron de 1 de dezembro);
--   - o SQL não descontava feriados nem tolerâncias de ponto (a app desconta);
--   - transito_expira_em: o SQL gravava 31/03/<ano>, a app 31/03/<ano+1>.
--  Agora (espelho de src/utils/feriasSaldo.js):
--   - tipo de férias = contém "ferias" sem acentos (isVacationType);
--   - dias úteis sem fins de semana, feriados (getFeriados: nacionais + Carnaval + Faro 7/9)
--     e tolerâncias (globais ou da pessoa, não canceladas/rejeitadas, pelo dia de início);
--   - parciais: horas/8, só no ano do pedido;
--   - transito_expira_em = 31/03 do próprio ano da linha (prazo dos dias transitados que ela tem).
--  O trigger passa também a reagir a tolerâncias, a pedidos apagados e a pedidos que atravessam o ano.
--  No fim recalcula todos os saldos. Idempotente.
-- =====================================================================

-- 1. É um pedido de férias? (com ou sem acento, como isVacationType) ------------------
create or replace function public.bizin_tipo_e_ferias(p_tipo text)
returns boolean
language sql
immutable
set search_path = public
as $$
  select translate(lower(coalesce(p_tipo, '')), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc') like '%ferias%';
$$;

-- 2. É uma tolerância de ponto? (a mesma lista que TOLERANCIA_TIPOS) ----------------------
create or replace function public.bizin_tipo_e_tolerancia(p_tipo text)
returns boolean
language sql
immutable
set search_path = public
as $$
  select coalesce(p_tipo in ('Tolerância de Ponto', 'Tolerancia de Ponto', 'tolerancia', 'tolerância'), false);
$$;

-- 3. Feriados de um ano (como getFeriados; Páscoa por Meeus/Butcher) ----------------------
create or replace function public.bizin_feriados(p_ano integer)
returns setof date
language plpgsql
immutable
set search_path = public
as $$
declare
  a int; b int; c int; d int; e int; f int; g int; h int; i int; k int; l int; m int;
  pascoa date;
begin
  a := p_ano % 19;  b := p_ano / 100;  c := p_ano % 100;
  d := b / 4;       e := b % 4;        f := (b + 8) / 25;
  g := (b - f + 1) / 3;
  h := (19 * a + b - d - g + 15) % 30;
  i := c / 4;       k := c % 4;
  l := (32 + 2 * e + 2 * i - h - k) % 7;
  m := (a + 11 * h + 22 * l) / 451;
  pascoa := make_date(p_ano, (h + l - 7 * m + 114) / 31, ((h + l - 7 * m + 114) % 31) + 1);

  return query select unnest(array[
    make_date(p_ano, 1, 1),     -- Ano Novo
    pascoa - 47,                -- Carnaval
    pascoa - 2,                 -- Sexta-feira Santa
    pascoa,                     -- Páscoa
    make_date(p_ano, 4, 25),    -- Dia da Liberdade
    make_date(p_ano, 5, 1),     -- Dia do Trabalhador
    pascoa + 60,                -- Corpo de Deus
    make_date(p_ano, 6, 10),    -- Dia de Portugal
    make_date(p_ano, 8, 15),    -- Assunção
    make_date(p_ano, 9, 7),     -- Feriado de Faro
    make_date(p_ano, 10, 5),    -- Implantação da República
    make_date(p_ano, 11, 1),    -- Todos os Santos
    make_date(p_ano, 12, 1),    -- Restauração da Independência
    make_date(p_ano, 12, 8),    -- Imaculada Conceição
    make_date(p_ano, 12, 25)    -- Natal
  ]);
end;
$$;

-- 4. Dias de férias gozados (aprovados) de uma pessoa num ano ----------------------------
create or replace function public.calcular_dias_ferias_gozados(p_user_id uuid, p_ano integer)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  with folgas as (
    select dia from public.bizin_feriados(p_ano) as dia
    union
    select t.data_inicio::date
    from public.ferias t
    where public.bizin_tipo_e_tolerancia(t.tipo)
      and t.estado not in ('cancelado', 'rejeitado')
      and (t.user_id is null or t.user_id = p_user_id)
      and t.data_inicio is not null
  )
  select coalesce(sum(
    case
      when f.is_parcial then
        case
          when extract(year from f.data_inicio::date) = p_ano and f.hora_inicio is not null and f.hora_fim is not null
            then greatest(0, (extract(epoch from (f.hora_fim::time - f.hora_inicio::time)) / 3600) / 8)
          else 0
        end
      else (
        select count(*)
        from generate_series(
          greatest(f.data_inicio::date, make_date(p_ano, 1, 1)),
          least(coalesce(f.data_fim, f.data_inicio)::date, make_date(p_ano, 12, 31)),
          interval '1 day'
        ) as g(dia)
        where extract(isodow from g.dia) between 1 and 5
          and g.dia::date not in (select dia from folgas)
      )
    end
  ), 0)
  from public.ferias f
  where f.user_id = p_user_id
    and public.bizin_tipo_e_ferias(f.tipo)
    and f.estado = 'aprovado'
    and f.data_inicio <= make_date(p_ano, 12, 31)
    and coalesce(f.data_fim, f.data_inicio) >= make_date(p_ano, 1, 1);
$$;
revoke all on function public.calcular_dias_ferias_gozados(uuid, integer) from public, anon, authenticated;
grant execute on function public.calcular_dias_ferias_gozados(uuid, integer) to service_role;

-- 5. Recalcular os saldos afetados por um pedido (férias → a pessoa; tolerância → todos ou a pessoa) --
create or replace function public.bizin_recalcular_saldos_ferias(p_user_id uuid, p_tipo text, p_inicio date, p_fim date)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ano int;
  e_ferias boolean := public.bizin_tipo_e_ferias(p_tipo);
  e_tolerancia boolean := public.bizin_tipo_e_tolerancia(p_tipo);
begin
  if p_inicio is null or not (e_ferias or e_tolerancia) then return; end if;
  if e_ferias and p_user_id is null then return; end if;

  for v_ano in extract(year from p_inicio)::int .. extract(year from coalesce(p_fim, p_inicio))::int loop
    update public.vacation_balances saldo
    set dias_gozados = public.calcular_dias_ferias_gozados(saldo.user_id, saldo.ano),
        atualizado_em = now()
    where saldo.ano = v_ano
      and (p_user_id is null or saldo.user_id = p_user_id);
  end loop;
end;
$$;
revoke all on function public.bizin_recalcular_saldos_ferias(uuid, text, date, date) from public, anon, authenticated;

create or replace function public.sincronizar_saldo_ferias_por_pedido()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    perform public.bizin_recalcular_saldos_ferias(old.user_id, old.tipo, old.data_inicio::date, old.data_fim::date);
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    perform public.bizin_recalcular_saldos_ferias(new.user_id, new.tipo, new.data_inicio::date, new.data_fim::date);
  end if;
  return null;
end;
$$;

drop trigger if exists sincronizar_saldo_ferias_apos_alteracao on public.ferias;
create trigger sincronizar_saldo_ferias_apos_alteracao
after insert or delete or update of tipo, user_id, estado, data_inicio, data_fim, is_parcial, hora_inicio, hora_fim
on public.ferias
for each row
execute function public.sincronizar_saldo_ferias_por_pedido();

-- 6. Aprovação por email (antiga, 045): o mesmo critério de tipo ------------------------------
do $$
begin
  if to_regprocedure('public.aprovar_pedido_ferias_por_email(bigint)') is not null then
    execute $f$
      create or replace function public.aprovar_pedido_ferias_por_email(p_pedido_id bigint)
      returns void
      language plpgsql
      security definer
      set search_path = public
      as $body$
      declare
        pedido public.ferias%rowtype;
      begin
        select * into pedido from public.ferias where id = p_pedido_id and estado = 'pendente' for update;
        if not found then
          raise exception 'Pedido de férias não encontrado ou já processado';
        end if;
        if not public.bizin_tipo_e_ferias(pedido.tipo) then
          raise exception 'O pedido indicado não é um pedido de férias';
        end if;
        update public.ferias set estado = 'aprovado' where id = pedido.id; -- o trigger recalcula o saldo
      end;
      $body$;
    $f$;
  end if;
end $$;

-- 7. Acertar os saldos que já existem ------------------------------------------------------
update public.vacation_balances
set dias_gozados = public.calcular_dias_ferias_gozados(user_id, ano),
    transito_expira_em = make_date(ano, 3, 31),
    atualizado_em = now();
