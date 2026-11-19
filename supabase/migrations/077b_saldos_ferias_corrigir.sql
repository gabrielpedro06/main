-- =====================================================================
-- 077b · SALDOS DE FÉRIAS — PASSO 2: CORRIGIR
-- Corra só depois de ver a lista da 077 e concordar com ela.
-- Corrige SÓ os saldos com dias transitados inventados (sem saldo real do ano
-- anterior, ou no ano de admissão) e, nessas linhas, acerta os dias atribuídos
-- pelo "limite anual" dos RH. Saldos sem transitados não são tocados (ex.: quem
-- tem atribuídos diferentes do perfil fica para decidir à parte).
-- Devolve as linhas corrigidas no fim. Os dias gozados não mudam.
-- IMPORTANTE: correr antes de 1 de dezembro (nesse dia o Supabase prepara 2027
-- e passa os dias disponíveis de 2026 para dias transitados).
-- =====================================================================
with alvo as (
    select
        v.id,
        case
            when p.data_admissao is not null and extract(year from p.data_admissao::date) = v.ano
                then coalesce(p.dias_ferias_total, p.dias_ferias, 22)
            else v.dias_atribuidos
        end as atribuidos_novo,
        case
            when (p.data_admissao is not null and extract(year from p.data_admissao::date) >= v.ano)
              or not exists (select 1 from public.vacation_balances a where a.user_id = v.user_id and a.ano = v.ano - 1)
                then 0
            else v.dias_transitados
        end as transitados_novo
    from public.vacation_balances v
    join public.profiles p on p.id = v.user_id
    where
        v.dias_transitados > 0 and (
            (p.data_admissao is not null and extract(year from p.data_admissao::date) >= v.ano)
            or not exists (select 1 from public.vacation_balances a where a.user_id = v.user_id and a.ano = v.ano - 1)
        )
)
update public.vacation_balances v
   set dias_atribuidos = alvo.atribuidos_novo,
       dias_transitados = alvo.transitados_novo,
       atualizado_em = now()
  from alvo
 where v.id = alvo.id
returning v.user_id, v.ano, v.dias_atribuidos, v.dias_transitados, v.dias_gozados, v.dias_disponiveis;
