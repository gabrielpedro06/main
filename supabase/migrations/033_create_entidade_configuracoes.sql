-- Cria tabela entidade_configuracoes para armazenar textos internos reutilizáveis
-- Desacopla textos configuráveis da tabela clientes
create table if not exists public.entidade_configuracoes (
  id uuid primary key default gen_random_uuid(),
  
  -- Referência à entidade (cliente/consultora)
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  
  -- NEOMARCA - Propostas de Financiamento (ordem conforme descrito)
  -- Seção 2: Âmbito da Proposta
  texto_compromisso text,                          -- "O nosso compromisso..."
  texto_esperamos_que_corresponda text,            -- "Esperamos que corresponda..."
  texto_para_aprovacao text,                       -- "Para aprovação..."
  
  -- Pessoa de contacto assinante (sobrescreve dados da entidade se preenchido)
  signatario_nome text,
  signatario_cargo text,
  signatario_telefone text,
  signatario_email text,
  
  -- Seção 3: Apresentação
  texto_apresentacao_empresa text,                 -- "Pequena info da empresa"
  
  -- Seção 5: Documentos Necessários
  texto_documentos_empresa text,                   -- "Relativos à Empresa"
  texto_documentos_incentivo text,                 -- "Relativos ao Incentivo"
  texto_demonstracao_financiamento text,          -- "Demonstração da Capacidade"
  
  -- Seção 6-7: Processos
  texto_como_ajudamos text,                        -- "Como podemos ajudar?"
  texto_processo_trabalho text,                    -- "Como é o nosso processo de Trabalho?"
  
  -- Seção 10-13: Termos, Confidencialidade, Exclusões
  texto_plano_pagamento text,                      -- "Plano de Pagamento"
  -- (Termos gerais, Confidencialidade, etc. já estão em clientes.termos_gerais)
  texto_exclusoes text,                            -- "Exclusões da Proposta"
  
  -- 2SIGLAS - Propostas de Formação (quando tem_cursos = true)
  -- Seção 2: Âmbito (reutiliza compromisso, esperamos, para_aprovacao acima)
  
  -- Seção 3: Apresentação + Áreas de Formação
  texto_apresentacao_empresa_formacao text,        -- "Pequena info da empresa"
  texto_areas_formacao text,                       -- "Áreas de Formação"
  
  -- Seção 4: Proposta de Formação
  texto_proposta_formacao text,
  
  -- Seção 5-8: Obrigações e Condições
  texto_descricao_servico text,
  texto_obrigacoes_consultora text,
  texto_obrigacoes_cliente text,
  texto_condicoes_realizacao text,
  
  -- Seção 9: Coordenação (editável por proposta, template aqui)
  texto_coordenacao_formacao text,
  
  -- Seção 18-20: Termos e Termos Gerais (reutiliza dados acima + clientes.termos_gerais)
  
  -- Seção 21: Certificações e Homologações
  imagem_certificacoes text,                       -- URL ou base64 da imagem
  
  -- Status
  ativo boolean not null default true,
  criado_por uuid not null default auth.uid(),
  
  -- Timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  unique(cliente_id)
);

create index if not exists idx_entidade_config_cliente_id 
  on public.entidade_configuracoes (cliente_id);

-- RLS para configurações de entidade
alter table public.entidade_configuracoes enable row level security;

create policy "Entidade config leitura por autenticados"
  on public.entidade_configuracoes for select
  using (auth.uid() is not null);

create policy "Entidade config criação"
  on public.entidade_configuracoes for insert
  with check (auth.uid() is not null);

create policy "Entidade config atualização por criador ou admin"
  on public.entidade_configuracoes for update
  using (criado_por = auth.uid() or exists (
    select 1 from public.profiles
    where id = auth.uid() and is_admin = true
  ));

create policy "Entidade config deleção por criador ou admin"
  on public.entidade_configuracoes for delete
  using (criado_por = auth.uid() or exists (
    select 1 from public.profiles
    where id = auth.uid() and is_admin = true
  ));
