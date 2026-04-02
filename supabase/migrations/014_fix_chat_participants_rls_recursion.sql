-- Fix chat_participants RLS infinite recursion in already-deployed environments.

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

drop policy if exists "chat_participants_select_room_member" on public.chat_participants;
drop policy if exists "chat_participants_select_room_members" on public.chat_participants;
drop policy if exists "chat_participants_select_self" on public.chat_participants;

create policy "chat_participants_select_self"
on public.chat_participants
for select
using (user_id = auth.uid());

create policy "chat_participants_select_room_members"
on public.chat_participants
for select
using (public.chat_user_in_room(room_id));