-- Shared application settings used by RH and accounting exports.

create table if not exists public.app_settings (
    setting_key text primary key,
    setting_value text not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

insert into public.app_settings (setting_key, setting_value)
values ('rh_km_reembolso_eur', '0.4')
on conflict (setting_key) do nothing;
