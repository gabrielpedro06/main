alter table public.template_atividades
    add column if not exists depende_de_template_atividade_id uuid references public.template_atividades(id) on delete set null;

alter table public.template_tarefas
    add column if not exists depende_de_template_tarefa_id uuid references public.template_tarefas(id) on delete set null;

alter table public.atividades
    add column if not exists depende_de_atividade_id uuid references public.atividades(id) on delete set null;

alter table public.tarefas
    add column if not exists depende_de_tarefa_id uuid references public.tarefas(id) on delete set null;

create index if not exists idx_template_atividades_depende on public.template_atividades(depende_de_template_atividade_id);
create index if not exists idx_template_tarefas_depende on public.template_tarefas(depende_de_template_tarefa_id);
create index if not exists idx_atividades_depende on public.atividades(depende_de_atividade_id);
create index if not exists idx_tarefas_depende on public.tarefas(depende_de_tarefa_id);
