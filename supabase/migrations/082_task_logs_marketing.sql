-- =====================================================================
-- 082 · Cronómetro nas peças de Marketing
-- Os tempos do Marketing usam a mesma tabela dos cronómetros das tarefas
-- (task_logs): a linha passa a poder apontar para uma peça do fluxo
-- (marketing_conteudos). Regras iguais às tarefas: um cronómetro ativo por
-- pessoa (end_time null), RLS de task_logs (070) mantém-se.
-- Ver src/utils/cronometroMarketing.js.
-- Idempotente.
-- =====================================================================
alter table public.task_logs
  add column if not exists conteudo_id uuid references public.marketing_conteudos(id) on delete set null;

create index if not exists idx_task_logs_conteudo
  on public.task_logs (conteudo_id)
  where conteudo_id is not null;
