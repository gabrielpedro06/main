alter table if exists public.pedidos_reembolso
    add column if not exists notas text;
