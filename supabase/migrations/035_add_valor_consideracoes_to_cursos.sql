-- Adiciona colunas 'valor' e 'consideracoes' à tabela 'cursos'
alter table if exists public.cursos
  add column if not exists valor numeric(12,2) not null default 0,
  add column if not exists consideracoes text;

-- Atualiza updated_at para agora (opcional)
update public.cursos set updated_at = now() where updated_at is null;

-- Índice por valor caso seja necessário para procura/ordenacao
create index if not exists idx_cursos_valor on public.cursos (valor);
