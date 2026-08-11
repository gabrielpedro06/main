create table if not exists public.areas_formacao (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  descricao text,
  ativo boolean not null default true,
  criado_por uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.homologacoes_formacao (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nome text not null,
  descricao text,
  ativo boolean not null default true,
  criado_por uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint homologacoes_formacao_codigo_chk check (codigo in ('N/A', 'CCDR', 'IPDJ', 'DGADR'))
);

-- FIX: Added 'criado_por' to the insert and 'gen_random_uuid()' to the select
insert into public.homologacoes_formacao (codigo, nome, descricao, criado_por)
select v.codigo, v.nome, v.descricao, gen_random_uuid()
from (
  values
    ('N/A', 'N/A', 'Sem homologação'),
    ('CCDR', 'CCDR', 'Comissão de Coordenação e Desenvolvimento Regional'),
    ('IPDJ', 'IPDJ', 'Instituto Português do Desporto e Juventude'),
    ('DGADR', 'DGADR', 'Direção-Geral de Agricultura e Desenvolvimento Rural')
) as v(codigo, nome, descricao)
where not exists (
  select 1
  from public.homologacoes_formacao h
  where h.codigo = v.codigo
);

create table if not exists public.acoes_formacao (
  id uuid primary key default gen_random_uuid(),
  ano integer not null check (ano >= 2000),
  sequencia integer not null check (sequencia > 0),
  codigo text generated always as ('C' || right(ano::text, 2) || lpad(sequencia::text, 2, '0')) stored,
  nome_curso text not null,
  nome_formador text not null,
  area_formacao_id uuid not null references public.areas_formacao(id) on delete restrict,
  carga_horaria integer not null default 0,
  local text not null,
  data_inicio date,
  data_fim date,
  regime text not null default 'Presencial',
  homologacao_id uuid not null references public.homologacoes_formacao(id) on delete restrict,
  status_curso text not null default 'Em Andamento',
  total_inscritos integer not null default 0,
  n_empresas integer not null default 0,
  n_particulares integer not null default 0,
  n_desistencias integer not null default 0,
  n_certificados integer not null default 0,
  volume_formacao integer generated always as (coalesce(n_certificados, 0) * coalesce(carga_horaria, 0)) stored,
  certificados_emitidos integer not null default 0,
  certificados_enviados integer not null default 0,
  certificados_aguardar integer not null default 0,
  doc_formador boolean not null default false,
  pag_formador boolean not null default false,
  data_pagamento timestamptz,
  status_dtp text not null default 'Pendente de Revisão',
  ccdr_paga boolean not null default false,
  ccdr_data_envio timestamptz,
  ccdr_n_homologacao text,
  ccdr_data_comunicacao date,
  ccdr_pag_exame text not null default 'N/A',
  ccdr_cert_data_envio date,
  ccdr_cert_faturacao text not null default 'N/A',
  ccdr_data_rececao date,
  ccdr_envio_cert_data date,
  ccdr_modalidade text,
  dgadr_data_caracterizacao date,
  dgadr_paga boolean not null default false,
  dgadr_data_envio timestamptz,
  dgadr_n_homologacao text,
  dgadr_data_comunicacao date,
  dgadr_pag_exame text not null default 'N/A',
  dgadr_cert_data_envio date,
  dgadr_cert_faturacao text not null default 'N/A',
  dgadr_data_rececao date,
  dgadr_envio_cert_data date,
  dgadr_modalidade text,
  dgadr_pedido_cartoes date,
  criado_por uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (ano, sequencia),
  unique (codigo),
  constraint acoes_formacao_regime_chk check (regime in ('Online', 'Hibrido', 'Presencial')),
  constraint acoes_formacao_status_chk check (status_curso in ('Adiado', 'Em Andamento', 'Concluído', 'Cancelado')),
  constraint acoes_formacao_status_dtp_chk check (status_dtp in ('Concluído', 'Pendente de Revisão')),
  constraint acoes_formacao_ccdr_pag_exame_chk check (ccdr_pag_exame in ('Sim', 'N/A')),
  constraint acoes_formacao_ccdr_cert_faturacao_chk check (ccdr_cert_faturacao in ('Sim', 'N/A')),
  constraint acoes_formacao_dgadr_pag_exame_chk check (dgadr_pag_exame in ('Sim', 'N/A')),
  constraint acoes_formacao_dgadr_cert_faturacao_chk check (dgadr_cert_faturacao in ('Sim', 'N/A'))
);

create index if not exists idx_acoes_formacao_ano on public.acoes_formacao (ano, sequencia);
create index if not exists idx_acoes_formacao_area on public.acoes_formacao (area_formacao_id);
create index if not exists idx_acoes_formacao_homologacao on public.acoes_formacao (homologacao_id);

create table if not exists public.acoes_formacao_checklist (
  id uuid primary key default gen_random_uuid(),
  acao_formacao_id uuid not null references public.acoes_formacao(id) on delete cascade,
  template_tarefa_id uuid not null references public.template_tarefas(id) on delete cascade,
  template_subtarefa_id uuid references public.template_subtarefas(id) on delete cascade,
  estado text not null default 'na',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (acao_formacao_id, template_tarefa_id, template_subtarefa_id),
  constraint acoes_formacao_checklist_estado_chk check (estado in ('concluido', 'falta_assinar', 'incompleto', 'em_falta', 'na'))
);

create index if not exists idx_acoes_formacao_checklist_acao on public.acoes_formacao_checklist (acao_formacao_id);
create index if not exists idx_acoes_formacao_checklist_tarefa on public.acoes_formacao_checklist (template_tarefa_id);

alter table public.areas_formacao enable row level security;
alter table public.homologacoes_formacao enable row level security;
alter table public.acoes_formacao enable row level security;
alter table public.acoes_formacao_checklist enable row level security;

create policy "Areas formacao leitura"
  on public.areas_formacao for select
  using (auth.uid() is not null);

create policy "Areas formacao escrita"
  on public.areas_formacao for all
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

create policy "Homologacoes formacao leitura"
  on public.homologacoes_formacao for select
  using (auth.uid() is not null);

create policy "Homologacoes formacao escrita"
  on public.homologacoes_formacao for all
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

create policy "Acoes formacao leitura"
  on public.acoes_formacao for select
  using (auth.uid() is not null);

create policy "Acoes formacao escrita"
  on public.acoes_formacao for all
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

create policy "Checklist formacao leitura"
  on public.acoes_formacao_checklist for select
  using (auth.uid() is not null);

create policy "Checklist formacao escrita"
  on public.acoes_formacao_checklist for all
  using (auth.uid() is not null)
  with check (auth.uid() is not null);