alter table if exists public.programas_financiamento
add column if not exists entidade_financiadora_id uuid references public.clientes(id) on delete set null;