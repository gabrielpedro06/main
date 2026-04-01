alter table public.atividades
    add column if not exists ignorar_dependencia boolean not null default false;

alter table public.tarefas
    add column if not exists ignorar_dependencia boolean not null default false;

create index if not exists idx_atividades_ignorar_dependencia on public.atividades(ignorar_dependencia);
create index if not exists idx_tarefas_ignorar_dependencia on public.tarefas(ignorar_dependencia);
