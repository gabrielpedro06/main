alter table if exists public.profiles
  add column if not exists dias_ferias_total integer;

update public.profiles
set dias_ferias_total = dias_ferias
where dias_ferias_total is null;

alter table if exists public.profiles
  alter column dias_ferias_total set default 22;
