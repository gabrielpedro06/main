create table if not exists public.pedidos_reembolso (
    id uuid primary key default gen_random_uuid(),
    projeto_id uuid not null references public.projetos(id) on delete cascade,
    pedido text not null,
    data_pedido date,
    valor_investimento numeric(14,2) not null default 0,
    valor_incentivo numeric(14,2) not null default 0,
    valor_pago numeric(14,2) not null default 0,
    data_pagamento date,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint pedidos_reembolso_valores_chk check (
        valor_investimento >= 0 and valor_incentivo >= 0 and valor_pago >= 0
    )
);

create index if not exists idx_pedidos_reembolso_projeto
    on public.pedidos_reembolso (projeto_id, data_pedido);

drop trigger if exists trg_pedidos_reembolso_updated_at on public.pedidos_reembolso;
create trigger trg_pedidos_reembolso_updated_at
before update on public.pedidos_reembolso
for each row execute function public.set_updated_at_generic();

alter table public.pedidos_reembolso enable row level security;

drop policy if exists pedidos_reembolso_select_authenticated on public.pedidos_reembolso;
create policy pedidos_reembolso_select_authenticated
on public.pedidos_reembolso for select
using (auth.role() = 'authenticated');

drop policy if exists pedidos_reembolso_insert_authenticated on public.pedidos_reembolso;
create policy pedidos_reembolso_insert_authenticated
on public.pedidos_reembolso for insert
with check (auth.role() = 'authenticated');

drop policy if exists pedidos_reembolso_update_authenticated on public.pedidos_reembolso;
create policy pedidos_reembolso_update_authenticated
on public.pedidos_reembolso for update
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

drop policy if exists pedidos_reembolso_delete_authenticated on public.pedidos_reembolso;
create policy pedidos_reembolso_delete_authenticated
on public.pedidos_reembolso for delete
using (auth.role() = 'authenticated');
