-- Internal chat (P2P + Group)
-- Created for forum integrated chat modal.

create extension if not exists pgcrypto;

create table if not exists public.chat_rooms (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  nome text,
  is_group boolean not null default false
);

create table if not exists public.chat_participants (
  room_id uuid not null references public.chat_rooms(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.chat_rooms(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content text,
  file_url text,
  file_name text,
  requires_sig boolean not null default false,
  is_signed boolean not null default false,
  created_at timestamptz not null default now(),
  constraint chat_message_content_or_file_chk check (
    (content is not null and length(trim(content)) > 0)
    or (file_url is not null)
  )
);

create index if not exists idx_chat_participants_user_id
  on public.chat_participants (user_id);

create index if not exists idx_chat_messages_room_created
  on public.chat_messages (room_id, created_at);

create index if not exists idx_chat_messages_sender
  on public.chat_messages (sender_id);

-- Optional: bucket for attachments used in Forum.jsx
insert into storage.buckets (id, name, public)
values ('documents', 'documents', true)
on conflict (id) do nothing;

alter table public.chat_rooms enable row level security;
alter table public.chat_participants enable row level security;
alter table public.chat_messages enable row level security;

-- chat_rooms policies
create policy if not exists "chat_rooms_select_participant"
on public.chat_rooms
for select
using (
  exists (
    select 1
    from public.chat_participants cp
    where cp.room_id = chat_rooms.id
      and cp.user_id = auth.uid()
  )
);

create policy if not exists "chat_rooms_insert_authenticated"
on public.chat_rooms
for insert
with check (auth.uid() is not null);

-- chat_participants policies
-- Allow users to see their own participant records
create policy if not exists "chat_participants_select_self"
on public.chat_participants
for select
using (user_id = auth.uid());

-- Helper to avoid RLS recursion when checking room membership in policies
create or replace function public.chat_user_in_room(target_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1
    from public.chat_participants cp
    where cp.room_id = target_room_id
      and cp.user_id = auth.uid()
  );
$$;

revoke all on function public.chat_user_in_room(uuid) from public;
grant execute on function public.chat_user_in_room(uuid) to authenticated;

-- Allow users to see all participants in rooms they are members of
create policy if not exists "chat_participants_select_room_members"
on public.chat_participants
for select
using (public.chat_user_in_room(room_id));

create policy if not exists "chat_participants_insert_authenticated"
on public.chat_participants
for insert
with check (auth.uid() is not null);

-- chat_messages policies
create policy if not exists "chat_messages_select_room_member"
on public.chat_messages
for select
using (
  exists (
    select 1
    from public.chat_participants cp
    where cp.room_id = chat_messages.room_id
      and cp.user_id = auth.uid()
  )
);

create policy if not exists "chat_messages_insert_room_member"
on public.chat_messages
for insert
with check (
  sender_id = auth.uid()
  and exists (
    select 1
    from public.chat_participants cp
    where cp.room_id = chat_messages.room_id
      and cp.user_id = auth.uid()
  )
);
