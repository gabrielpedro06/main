-- Persist read receipts per user and room for reliable message ticks.

create table if not exists public.chat_room_reads (
  room_id uuid not null references public.chat_rooms(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

create index if not exists idx_chat_room_reads_user_room
  on public.chat_room_reads (user_id, room_id);

create index if not exists idx_chat_room_reads_room_last_read
  on public.chat_room_reads (room_id, last_read_at desc);

create or replace function public.set_updated_at_chat_room_reads()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_chat_room_reads_updated_at on public.chat_room_reads;
create trigger trg_chat_room_reads_updated_at
before update on public.chat_room_reads
for each row
execute function public.set_updated_at_chat_room_reads();

alter table public.chat_room_reads enable row level security;

create policy if not exists "chat_room_reads_select_room_member"
on public.chat_room_reads
for select
using (public.chat_user_in_room(room_id));

create policy if not exists "chat_room_reads_insert_self_room_member"
on public.chat_room_reads
for insert
with check (
  user_id = auth.uid()
  and public.chat_user_in_room(room_id)
);

create policy if not exists "chat_room_reads_update_self_room_member"
on public.chat_room_reads
for update
using (
  user_id = auth.uid()
  and public.chat_user_in_room(room_id)
)
with check (
  user_id = auth.uid()
  and public.chat_user_in_room(room_id)
);
