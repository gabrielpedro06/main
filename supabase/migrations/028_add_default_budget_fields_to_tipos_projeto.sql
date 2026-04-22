-- Add default budget fields to project type templates
alter table if exists public.tipos_projeto
add column if not exists default_num_horas numeric(10,2) not null default 0,
add column if not exists default_base_eur_hora numeric(10,2) not null default 0;
