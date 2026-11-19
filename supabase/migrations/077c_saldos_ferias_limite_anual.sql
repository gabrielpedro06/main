-- =====================================================================
-- 077c · SALDOS DE FÉRIAS — o ano de admissão segue o "Limite Anual" dos RH
-- Regra: no ano em que a pessoa entrou, os dias atribuídos = Limite Anual do
-- perfil (dias_ferias_total). Se o limite foi alterado depois de o saldo ser
-- criado, o saldo ficou com o valor antigo (ex.: Inês 14 em vez de 12).
-- Corrige só essas linhas e devolve-as. Os dias gozados não mudam.
-- (O código novo já mantém isto certo daqui para a frente.)
-- =====================================================================
update public.vacation_balances v
   set dias_atribuidos = p.dias_ferias_total,
       atualizado_em = now()
  from public.profiles p
 where p.id = v.user_id
   and p.data_admissao is not null
   and extract(year from p.data_admissao::date) = v.ano
   and p.dias_ferias_total is not null
   and v.dias_atribuidos <> p.dias_ferias_total
returning (select nome from public.profiles x where x.id = v.user_id) as nome,
          v.ano, v.dias_atribuidos, v.dias_gozados, v.dias_disponiveis;
