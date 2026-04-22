-- Adiciona o campo termos_gerais à tabela clientes para guardar texto corrido de condições gerais/termos gerais
alter table if exists public.clientes
add column if not exists termos_gerais text;