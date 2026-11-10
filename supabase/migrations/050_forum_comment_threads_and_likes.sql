-- Comunicação Interna: respostas em fio (parent_id) e gostos em comentários.
-- O tipo do id de forum_comments é detetado automaticamente (uuid ou bigint).

do $$
declare
  id_type text;
begin
  select format_type(a.atttypid, a.atttypmod)
    into id_type
    from pg_attribute a
   where a.attrelid = 'public.forum_comments'::regclass
     and a.attname = 'id';

  -- 1. Respostas: cada resposta aponta para o comentário principal
  if not exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'forum_comments' and column_name = 'parent_id'
  ) then
    execute format(
      'alter table public.forum_comments add column parent_id %s references public.forum_comments(id) on delete cascade',
      id_type
    );
  end if;

  -- 2. Gostos em comentários (um por utilizador)
  execute format(
    'create table if not exists public.forum_comment_likes (
       comment_id %s not null references public.forum_comments(id) on delete cascade,
       user_id uuid not null references auth.users(id) on delete cascade,
       created_at timestamptz not null default now(),
       primary key (comment_id, user_id)
     )',
    id_type
  );
end $$;

create index if not exists forum_comments_parent_id_idx on public.forum_comments (parent_id);
create index if not exists forum_comment_likes_comment_idx on public.forum_comment_likes (comment_id);

alter table public.forum_comment_likes enable row level security;

drop policy if exists "forum_comment_likes_select" on public.forum_comment_likes;
create policy "forum_comment_likes_select"
  on public.forum_comment_likes for select
  to authenticated
  using (true);

drop policy if exists "forum_comment_likes_insert_own" on public.forum_comment_likes;
create policy "forum_comment_likes_insert_own"
  on public.forum_comment_likes for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "forum_comment_likes_delete_own" on public.forum_comment_likes;
create policy "forum_comment_likes_delete_own"
  on public.forum_comment_likes for delete
  to authenticated
  using (user_id = auth.uid());

grant select, insert, delete on public.forum_comment_likes to authenticated;
