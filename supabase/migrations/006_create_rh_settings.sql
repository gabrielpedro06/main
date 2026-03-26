-- RH Settings: registo do dia de pagamento do SA por user, ano e mês
create table if not exists public.rh_settings (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references public.profiles(id) on delete cascade,
    ano integer not null,
    mes integer not null,
    sa_payment_day integer not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique(user_id, ano, mes)
);