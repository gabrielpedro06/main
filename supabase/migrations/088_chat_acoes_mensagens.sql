-- =====================================================================
-- 088 · Chat: responder, reencaminhar, afixar e arquivar/apagar conversas
-- chat_messages:
--   resposta_a     mensagem a que esta responde (citação na bolha)
--   reencaminhada  veio de outra conversa ("↪ Reencaminhada")
--   afixada_em/afixada_por  mensagem afixada na conversa (para todos, como no
--                  Discord). Só muda pela função chat_afixar_mensagem().
-- chat_conversas_minhas: por pessoa e conversa — arquivada (sai da lista
--   principal) e limpa_ate ("Apagar conversa" para mim: esconde tudo até
--   esse momento; a conversa volta a aparecer quando chegar mensagem nova).
-- Precisa da 087. Quem usa: src/pages/Forum.jsx, src/components/chat/*. Idempotente.
-- =====================================================================

-- 1. Campos novos nas mensagens ----------------------------------------
alter table public.chat_messages
  add column if not exists resposta_a uuid references public.chat_messages(id) on delete set null,
  add column if not exists reencaminhada boolean not null default false,
  add column if not exists afixada_em timestamptz,
  add column if not exists afixada_por uuid references public.profiles(id) on delete set null;

create index if not exists idx_chat_messages_afixadas on public.chat_messages (room_id, afixada_em) where afixada_em is not null;

-- 2. Afixar / desafixar (qualquer participante da conversa) -------------
create or replace function public.chat_afixar_mensagem(p_id uuid, p_afixar boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sala uuid;
begin
  if coalesce(auth.jwt() ->> 'aal', '') <> 'aal2' then
    raise exception 'É preciso o 2FA confirmado.' using errcode = '42501';
  end if;
  select room_id into v_sala from public.chat_messages where id = p_id and apagada_em is null;
  if v_sala is null then
    raise exception 'Mensagem não encontrada.' using errcode = 'P0002';
  end if;
  if not exists (select 1 from public.chat_participants where room_id = v_sala and user_id = auth.uid()) then
    raise exception 'Só quem está na conversa pode afixar.' using errcode = '42501';
  end if;
  update public.chat_messages
     set afixada_em = case when p_afixar then now() else null end,
         afixada_por = case when p_afixar then auth.uid() else null end
   where id = p_id;
end;
$$;

revoke all on function public.chat_afixar_mensagem(uuid, boolean) from public, anon;
grant execute on function public.chat_afixar_mensagem(uuid, boolean) to authenticated;

-- 3. Apagar para todos também desafixa (redefine a da 087) ---------------
create or replace function public.chat_apagar_mensagem(p_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ficheiro text;
begin
  if coalesce(auth.jwt() ->> 'aal', '') <> 'aal2' then
    raise exception 'É preciso o 2FA confirmado.' using errcode = '42501';
  end if;
  select file_url into v_ficheiro
    from public.chat_messages
   where id = p_id and sender_id = auth.uid() and apagada_em is null
   for update;
  if not found then
    raise exception 'Só podes apagar as tuas mensagens.' using errcode = '42501';
  end if;
  update public.chat_messages
     set content = null, file_url = null, file_name = null, apagada_em = now(),
         afixada_em = null, afixada_por = null
   where id = p_id;
  return v_ficheiro;
end;
$$;

revoke all on function public.chat_apagar_mensagem(uuid) from public, anon;
grant execute on function public.chat_apagar_mensagem(uuid) to authenticated;

-- 4. Estado de cada conversa para cada pessoa ---------------------------
create table if not exists public.chat_conversas_minhas (
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  room_id uuid not null references public.chat_rooms(id) on delete cascade,
  arquivada boolean not null default false,
  limpa_ate timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, room_id)
);

alter table public.chat_conversas_minhas enable row level security;

drop policy if exists chat_conversas_minhas_proprias on public.chat_conversas_minhas;
create policy chat_conversas_minhas_proprias on public.chat_conversas_minhas
  for all to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.chat_participants cp where cp.room_id = chat_conversas_minhas.room_id and cp.user_id = auth.uid())
  );

grant select, insert, update, delete on public.chat_conversas_minhas to authenticated;

drop policy if exists mfa_obrigatorio on public.chat_conversas_minhas;
create policy mfa_obrigatorio on public.chat_conversas_minhas as restrictive for all to authenticated
  using ((auth.jwt() ->> 'aal') = 'aal2')
  with check ((auth.jwt() ->> 'aal') = 'aal2');
