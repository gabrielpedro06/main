-- Atualiza o workflow de estados das propostas comerciais
-- Estados novos:
-- em_preparacao, revisao, enviada, analise, ganha, perdida

-- Primeiro remover a constraint antiga para permitir a transição
alter table public.propostas_comerciais
  drop constraint if exists propostas_comerciais_estado_chk;

-- Converter estados legados para o novo workflow
update public.propostas_comerciais
set estado = case
  when estado = 'em_analise' then 'analise'
  when estado = 'aprovada' then 'ganha'
  when estado = 'arquivada' then 'perdida'
  else estado
end
where estado in ('em_analise', 'aprovada', 'arquivada');

-- Ajustar default
alter table public.propostas_comerciais
  alter column estado set default 'em_preparacao';

alter table public.propostas_comerciais
  add constraint propostas_comerciais_estado_chk
  check (estado in ('em_preparacao', 'revisao', 'enviada', 'analise', 'ganha', 'perdida'));
