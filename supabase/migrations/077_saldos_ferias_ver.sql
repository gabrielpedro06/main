-- =====================================================================
-- 077 · SALDOS DE FÉRIAS — PASSO 1: VER (não altera nada)
-- Mostra os saldos que a 077b vai corrigir:
--   A) dias transitados inventados: há dias transitados mas não existe saldo
--      do ano anterior (ex.: pessoas novas com 44 dias "do ano passado");
--   B) ano de admissão com dias atribuídos diferentes do "limite anual" dos RH
--      (ex.: definiu 4 dias mas o saldo ficou com 22).
-- Confira a lista e só depois corra a 077b.
-- =====================================================================
select
    p.nome,
    v.ano,
    p.data_admissao,
    v.dias_atribuidos  as atribuidos_atual,
    case
        when p.data_admissao is not null and extract(year from p.data_admissao::date) = v.ano
            then coalesce(p.dias_ferias_total, p.dias_ferias, 22)
        else v.dias_atribuidos
    end                as atribuidos_novo,
    v.dias_transitados as transitados_atual,
    case
        when (p.data_admissao is not null and extract(year from p.data_admissao::date) >= v.ano)
          or not exists (select 1 from public.vacation_balances a where a.user_id = v.user_id and a.ano = v.ano - 1)
            then 0
        else v.dias_transitados
    end                as transitados_novo,
    v.dias_gozados,
    v.dias_disponiveis as disponiveis_atual
from public.vacation_balances v
join public.profiles p on p.id = v.user_id
where
    -- A) transitados sem saldo real no ano anterior (ou no ano de admissão)
    (v.dias_transitados > 0 and (
        (p.data_admissao is not null and extract(year from p.data_admissao::date) >= v.ano)
        or not exists (select 1 from public.vacation_balances a where a.user_id = v.user_id and a.ano = v.ano - 1)
    ))
    -- B) ano de admissão com atribuídos diferentes do limite anual
    or (p.data_admissao is not null
        and extract(year from p.data_admissao::date) = v.ano
        and v.dias_atribuidos <> coalesce(p.dias_ferias_total, p.dias_ferias, 22))
order by p.nome, v.ano;
