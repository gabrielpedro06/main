-- Adiciona campo booleano para elegibilidade de Subsídio de Alimentação
alter table if exists public.profiles
  add column if not exists recebe_sa boolean default true;
