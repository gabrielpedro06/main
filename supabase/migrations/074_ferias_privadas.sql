-- =====================================================================
-- 074 — Ausências: cada colaborador só lê as suas
--
-- A regra da 070 deixava qualquer colaborador LER (pela base de dados, não pelos
-- ecrãs) as ausências aprovadas de todos: tipo (ex.: doença), motivo e anexo.
-- Nenhum ecrã de colaborador precisa disso: o calendário da equipa é dos RH.
-- Agora: as suas + tolerâncias (sem colaborador) + RH (admin/administrador/gestor).
-- Não apaga dados. Pode correr mais do que uma vez.
-- =====================================================================
drop policy if exists ferias_ler on public.ferias;
create policy ferias_ler on public.ferias for select to authenticated
  using (user_id = auth.uid() or user_id is null or public.bizin_e_staff());
