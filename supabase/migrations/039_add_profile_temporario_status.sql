alter table public.profiles
    add column if not exists estado_temporario_tipo text,
    add column if not exists estado_temporario_inicio date,
    add column if not exists estado_temporario_fim date,
    add column if not exists estado_temporario_motivo text;