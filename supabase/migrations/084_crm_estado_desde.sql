-- =====================================================================
-- 084 · Corrige "na etapa desde" das leads antigas
-- A primeira versão da 083 criou marketing_leads.estado_desde com
-- "default now()": as leads que já existiam ficaram todas com a data do dia
-- da migração (e nenhuma aparecia como "esquecida").
-- Aqui: leads que nunca mudaram de etapa desde a 083 (sem linha 'estado' no
-- histórico) voltam a ter estado_desde = created_at.
-- Seguro correr mais do que uma vez.
-- =====================================================================
update public.marketing_leads l
   set estado_desde = l.created_at
 where l.created_at is not null
   and l.estado_desde is distinct from l.created_at
   and not exists (
     select 1 from public.marketing_leads_interacoes i
      where i.lead_id = l.id and i.tipo = 'estado'
   );
