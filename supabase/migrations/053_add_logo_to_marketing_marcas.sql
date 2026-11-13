-- Logo das marcas (Marketing). O ficheiro fica no bucket público "avatars", pasta marcas/
alter table public.marketing_marcas
    add column if not exists logo_url text;
