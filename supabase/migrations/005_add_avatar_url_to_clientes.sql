alter table if exists public.clientes
  add column if not exists avatar_url text;
