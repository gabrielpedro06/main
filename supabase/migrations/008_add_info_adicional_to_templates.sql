-- 008_add_info_adicional_to_templates.sql
-- Adiciona campos para marcar e definir informações adicionais em etapas/tarefas dos modelos


-- Adiciona campo info_adicional nos modelos
ALTER TABLE template_atividades
ADD COLUMN info_adicional jsonb DEFAULT NULL;

ALTER TABLE template_tarefas
ADD COLUMN info_adicional jsonb DEFAULT NULL;

-- Adiciona campos para guardar os dados reais nas tarefas
ALTER TABLE tarefas
ADD COLUMN investimento numeric,
ADD COLUMN financiamento numeric,
ADD COLUMN incentivo numeric,
ADD COLUMN data_prevista_aprovacao date;

-- info_adicional pode ser null ou um objeto JSON, ex:
-- { "exige": true, "campos": ["investimento", "financiamento", "incentivo", "data_prevista_aprovacao"] }
