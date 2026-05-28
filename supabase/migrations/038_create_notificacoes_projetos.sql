-- Notificacoes proprias para eventos de projeto
create table if not exists public.notificacoes_projetos (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    project_id uuid references public.projetos(id) on delete cascade,
    created_by uuid references public.profiles(id) on delete set null,
    tipo text not null default 'project_created',
    titulo text not null,
    mensagem text not null,
    link text not null,
    is_read boolean not null default false,
    read_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_notificacoes_projetos_user_unread
    on public.notificacoes_projetos (user_id, is_read, created_at desc);

create index if not exists idx_notificacoes_projetos_project_id
    on public.notificacoes_projetos (project_id);

drop trigger if exists trg_notificacoes_projetos_updated_at on public.notificacoes_projetos;
create trigger trg_notificacoes_projetos_updated_at
before update on public.notificacoes_projetos
for each row execute function public.set_updated_at_generic();

alter table if exists public.notificacoes_projetos enable row level security;

drop policy if exists notificacoes_projetos_select_own on public.notificacoes_projetos;
create policy notificacoes_projetos_select_own
on public.notificacoes_projetos
for select
using (auth.uid() = user_id);

drop policy if exists notificacoes_projetos_insert_authenticated on public.notificacoes_projetos;
create policy notificacoes_projetos_insert_authenticated
on public.notificacoes_projetos
for insert
with check (auth.role() = 'authenticated');

drop policy if exists notificacoes_projetos_update_own on public.notificacoes_projetos;
create policy notificacoes_projetos_update_own
on public.notificacoes_projetos
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists notificacoes_projetos_delete_own on public.notificacoes_projetos;
create policy notificacoes_projetos_delete_own
on public.notificacoes_projetos
for delete
using (auth.uid() = user_id);