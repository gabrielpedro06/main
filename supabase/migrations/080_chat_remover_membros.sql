-- =====================================================================
-- 080 · Grupos do chat: ver membros, remover e sair
-- Antes não havia nenhuma regra de DELETE em chat_participants (ninguém
-- conseguia tirar ninguém) e qualquer pessoa podia voltar a meter-se num
-- grupo sozinha (bastava saber o id), o que tornava a remoção inútil.
--
-- Regras novas (só em GRUPOS; conversas a dois ficam como estão):
--   * remover qualquer membro: quem criou o grupo (chat_rooms.criado_por)
--     ou admin/administrador/gestor (bizin_e_staff);
--   * sair do grupo: qualquer pessoa, a si própria;
--   * adicionar: membros do grupo ou quem o criou (deixa de ser possível
--     alguém adicionar-se a si próprio a um grupo onde não está).
-- Idempotente.
-- =====================================================================

-- Quem pode gerir (remover membros de) um grupo
create or replace function public.chat_pode_gerir(p_room uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.chat_rooms r
     where r.id = p_room
       and r.is_group
       and (r.criado_por = auth.uid() or public.bizin_e_staff())
  );
$$;

revoke all on function public.chat_pode_gerir(uuid) from public, anon;
grant execute on function public.chat_pode_gerir(uuid) to authenticated;

-- Adicionar: sem a antiga exceção "adicionar-se a si próprio a qualquer grupo"
create or replace function public.chat_pode_adicionar(p_room uuid, p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and (
    exists (select 1 from public.chat_participants cp where cp.room_id = p_room and cp.user_id = auth.uid())
    or exists (select 1 from public.chat_rooms r where r.id = p_room and r.criado_por = auth.uid())
  );
$$;

-- Remover / sair (só em grupos)
drop policy if exists chat_participants_remover on public.chat_participants;
create policy chat_participants_remover on public.chat_participants
  for delete to authenticated
  using (
    exists (select 1 from public.chat_rooms r where r.id = room_id and r.is_group)
    and (user_id = auth.uid() or public.chat_pode_gerir(room_id))
  );

-- Confirmação
select policyname, cmd from pg_policies where tablename = 'chat_participants' order by policyname;
