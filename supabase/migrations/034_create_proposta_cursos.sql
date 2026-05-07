-- Cria tabela proposta_cursos para relação M2M entre propostas e cursos
-- Uma proposta pode ter 1 ou múltiplos cursos associados
create table if not exists public.proposta_cursos (
  id uuid primary key default gen_random_uuid(),
  
  -- Referências
  proposta_id uuid not null references public.propostas_comerciais(id) on delete cascade,
  curso_id uuid not null references public.cursos(id) on delete cascade,
  
  -- Dados específicos da proposta/curso
  -- Permite sobrescrever campos do curso a nível de proposta se necessário
  duracao_horas integer,                           -- null = usa do curso
  modulos_customizados jsonb,                      -- null = usa do curso
  
  -- Ordem de apresentação na proposta
  ordem integer not null default 0,
  
  -- Timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  -- Constraint: não permitir duplicatas
  unique(proposta_id, curso_id)
);

create index if not exists idx_proposta_cursos_proposta_id 
  on public.proposta_cursos (proposta_id);
  
create index if not exists idx_proposta_cursos_curso_id 
  on public.proposta_cursos (curso_id);

-- RLS para proposta_cursos
alter table public.proposta_cursos enable row level security;

create policy "Proposta cursos leitura por autenticados"
  on public.proposta_cursos for select
  using (auth.uid() is not null);

create policy "Proposta cursos criação"
  on public.proposta_cursos for insert
  with check (auth.uid() is not null);

create policy "Proposta cursos atualização"
  on public.proposta_cursos for update
  using (auth.uid() is not null);

create policy "Proposta cursos deleção"
  on public.proposta_cursos for delete
  using (auth.uid() is not null);
