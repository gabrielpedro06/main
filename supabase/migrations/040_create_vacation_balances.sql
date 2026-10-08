create table if not exists public.vacation_balances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  ano integer not null check (ano >= 2000),
  dias_atribuidos numeric(6,2) not null default 22,
  dias_transitados numeric(6,2) not null default 0,
  dias_gozados numeric(6,2) not null default 0,
  dias_disponiveis numeric(6,2) generated always as (
    greatest(0, dias_atribuidos + dias_transitados - dias_gozados)
  ) stored,
  transito_expira_em date not null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (user_id, ano)
);

create index if not exists vacation_balances_ano_idx
  on public.vacation_balances (ano);

create or replace function public.calcular_dias_ferias_gozados(
  p_user_id uuid,
  p_ano integer
)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(
    case
      when f.is_parcial then
        greatest(
          0,
          (extract(epoch from (f.hora_fim::time - f.hora_inicio::time)) / 3600) / 8
        )
      else (
        select count(*)
        from generate_series(
          greatest(f.data_inicio::date, make_date(p_ano, 1, 1)),
          least(coalesce(f.data_fim, f.data_inicio)::date, make_date(p_ano, 12, 31)),
          interval '1 day'
        ) as dias(data)
        where extract(isodow from dias.data) between 1 and 5
      )
    end
  ), 0)
  from public.ferias f
  where f.user_id = p_user_id
    and lower(coalesce(f.tipo, '')) like '%fer%'
    and f.estado = 'aprovado'
    and f.data_inicio <= make_date(p_ano, 12, 31)
    and coalesce(f.data_fim, f.data_inicio) >= make_date(p_ano, 1, 1);
$$;

alter table public.vacation_balances enable row level security;

create policy "Utilizadores consultam o seu saldo de férias"
  on public.vacation_balances for select
  to authenticated
  using (user_id = auth.uid());

create policy "RH consulta saldos de férias"
  on public.vacation_balances for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        -- Convertemos para text para evitar conflito entre o tipo customizado (user_role) e text
        and lower(coalesce(profiles.role::text, profiles.tipo::text, '')) in ('admin', 'administrador', 'rh', 'recursos humanos')
    )
  );

create or replace function public.provisionar_saldos_ferias(p_ano integer)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.vacation_balances as saldo (
    user_id,
    ano,
    dias_atribuidos,
    dias_transitados,
    transito_expira_em
  )
  select
    profiles.id,
    p_ano,
    case
      when data_admissao is not null
        and extract(year from data_admissao::date) = p_ano
        then coalesce(dias_ferias_total, dias_ferias, 22)
      else 22
    end,
    coalesce(anterior.dias_disponiveis, 0),
    make_date(p_ano, 3, 31)
  from public.profiles
  left join public.vacation_balances anterior
    on anterior.user_id = profiles.id
   and anterior.ano = p_ano - 1
  where coalesce(ativo, true)
  on conflict (user_id, ano) do update
    set dias_transitados = case
          when saldo.ano = extract(year from current_date)::integer + 1
            then excluded.dias_transitados
          else saldo.dias_transitados
        end,
        dias_gozados = public.calcular_dias_ferias_gozados(saldo.user_id, p_ano),
        atualizado_em = now();
$$;

revoke all on function public.provisionar_saldos_ferias(integer) from public;
grant execute on function public.provisionar_saldos_ferias(integer) to authenticated;

-- Executa todos os anos no dia 1 de dezembro e prepara o ano seguinte.
do $$
begin
  create extension if not exists pg_cron with schema extensions;
  if not exists (select 1 from cron.job where jobname = 'provisionar-saldos-ferias-ano-seguinte') then
    perform cron.schedule(
      'provisionar-saldos-ferias-ano-seguinte',
      '0 0 1 12 *',
      $cron$select public.provisionar_saldos_ferias(extract(year from current_date)::integer + 1);$cron$
    );
  end if;
exception
  when undefined_object then
    null;
  when insufficient_privilege then
    null;
end;
$$;

-- Backfill do ano de transição: conserva a atribuição existente no perfil e
-- contabiliza os pedidos de férias aprovados que já existem na tabela ferias.
insert into public.vacation_balances (
  user_id,
  ano,
  dias_atribuidos,
  dias_gozados,
  transito_expira_em
)
select
  p.id,
  2026,
  coalesce(p.dias_ferias_total, p.dias_ferias, 22),
  public.calcular_dias_ferias_gozados(p.id, 2026),
  make_date(2027, 3, 31)
from public.profiles p
where coalesce(p.ativo, true)
on conflict (user_id, ano) do update
  set dias_gozados = excluded.dias_gozados,
      atualizado_em = now();