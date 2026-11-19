-- =====================================================================
-- 076 · Saldos de férias: o gestor também pode acertar o saldo
-- As regras de 041 só deixavam admin/administrador/RH gravar em vacation_balances.
-- Um gestor que registava uma ausência no painel de RH via a ausência guardada,
-- mas recebia "new row violates row-level security policy for table vacation_balances".
-- Agora: admin, administrador, gestor (bizin_e_staff) e RH.
-- Idempotente. Não apaga dados.
-- =====================================================================

drop policy if exists "RH insere saldos de férias" on public.vacation_balances;
drop policy if exists "RH atualiza saldos de férias" on public.vacation_balances;

create policy "RH insere saldos de férias"
  on public.vacation_balances for insert
  to authenticated
  with check (public.bizin_e_staff() or public.bizin_papel() in ('rh', 'recursos humanos'));

create policy "RH atualiza saldos de férias"
  on public.vacation_balances for update
  to authenticated
  using (public.bizin_e_staff() or public.bizin_papel() in ('rh', 'recursos humanos'))
  with check (public.bizin_e_staff() or public.bizin_papel() in ('rh', 'recursos humanos'));

-- Verificação: deve mostrar as 2 regras acima (+ as de leitura e a mfa_obrigatorio)
select policyname, cmd from pg_policies
 where schemaname = 'public' and tablename = 'vacation_balances'
 order by policyname;
