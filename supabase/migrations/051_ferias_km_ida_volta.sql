-- Pedidos de Km's: indica se a deslocação foi de ida e volta
alter table public.ferias
  add column if not exists km_ida_volta boolean not null default false;

comment on column public.ferias.km_ida_volta is 'Pedido de Km''s: true quando o total inclui a ida e a volta.';

-- Força o PostgREST a reconhecer a nova coluna
notify pgrst, 'reload schema';
