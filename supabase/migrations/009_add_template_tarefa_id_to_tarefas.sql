-- 009_add_template_tarefa_id_to_tarefas.sql
-- Adiciona coluna para referenciar o template de origem de cada tarefa

ALTER TABLE tarefas
ADD COLUMN template_tarefa_id uuid REFERENCES template_tarefas(id);

-- Opcional: preenche template_tarefa_id para tarefas já existentes, se possível (ajustar conforme necessário)
-- UPDATE tarefas SET template_tarefa_id = ... WHERE ...;
