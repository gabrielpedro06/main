-- Adiciona campo tem_cursos à tabela clientes
alter table if exists public.clientes
add column if not exists tem_cursos boolean not null default false;

-- Cria tabela de cursos (global, reutilizável por múltiplas entidades)
create table if not exists public.cursos (
  id uuid primary key default gen_random_uuid(),
  
  -- Identificação e Metadados
  nome text not null,
  descricao text,
  duracao_horas integer not null default 0,
  
  -- Textos do Curso
  texto_enquadramento text,
  objetivos_pedagogicos text,
  metodologia text,
  honorarios_texto text,
  plano_pagamento text,
  
  -- Módulos (armazenados como JSONB para flexibilidade)
  -- Estrutura: [{ nome: string, conteudo?: string, ordem: number }, ...]
  modulos jsonb not null default '[]'::jsonb,
  
  -- Configuração
  ativo boolean not null default true,
  criado_por uuid not null default auth.uid(),
  
  -- Timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_cursos_ativo on public.cursos (ativo);
create index if not exists idx_cursos_criado_por on public.cursos (criado_por);

-- RLS para cursos
alter table public.cursos enable row level security;

create policy "Cursos leitura pública"
  on public.cursos for select
  using (true);

create policy "Cursos criação apenas autenticados"
  on public.cursos for insert
  with check (auth.uid() is not null);

create policy "Cursos atualização por criador"
  on public.cursos for update
  using (criado_por = auth.uid());

create policy "Cursos deleção por criador"
  on public.cursos for delete
  using (criado_por = auth.uid());
