-- =====================================================================
-- 069 — Segurança (Fase 2, parte B): ficheiros (Supabase Storage)
--
-- Antes: TODOS os baldes eram públicos — qualquer pessoa com o link abria
-- atestados de RH, documentos de projetos e ficheiros do chat, sem sessão.
--
--   rh_anexos     → PRIVADO. Só o próprio colaborador e os RH (admin/gestor).
--   documentos    → PRIVADO. Qualquer colaborador com sessão (documentos de projetos).
--   chat_ficheiros→ NOVO, PRIVADO. Só quem participa na conversa.
--   avatars       → continua público, só imagens (sem SVG), até 5 MB.
--   forum_media   → continua público, só imagens, até 10 MB.
--
-- A app passa a abrir estes ficheiros com links temporários (10 min).
-- NENHUM ficheiro é apagado nem movido. Pode correr mais do que uma vez.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Baldes: privacidade, tamanho máximo e tipos aceites
-- ---------------------------------------------------------------------
update storage.buckets set public = false,
  file_size_limit = 15728640,  -- 15 MB
  allowed_mime_types = array[
    'application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'image/heic',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
where id = 'rh_anexos';

update storage.buckets set public = false, file_size_limit = 52428800  -- 50 MB
where id = 'documentos';

insert into storage.buckets (id, name, public, file_size_limit)
values ('chat_ficheiros', 'chat_ficheiros', false, 26214400)  -- 25 MB
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;

update storage.buckets set public = true,
  file_size_limit = 5242880,  -- 5 MB
  allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
where id = 'avatars';

update storage.buckets set public = true,
  file_size_limit = 10485760,  -- 10 MB
  allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
where id = 'forum_media';

-- ---------------------------------------------------------------------
-- 2. Ajudante: a pessoa participa na conversa da pasta "<room_id>/…"?
-- ---------------------------------------------------------------------
create or replace function public.chat_ficheiro_permitido(p_nome text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  sala uuid;
begin
  if auth.uid() is null then
    return false;
  end if;
  begin
    sala := split_part(p_nome, '/', 1)::uuid;
  exception when others then
    return false;
  end;
  return exists (select 1 from public.chat_participants cp where cp.room_id = sala and cp.user_id = auth.uid());
end;
$$;

revoke all on function public.chat_ficheiro_permitido(text) from public, anon;
grant execute on function public.chat_ficheiro_permitido(text) to authenticated;

-- ---------------------------------------------------------------------
-- 3. Regras de acesso aos ficheiros (storage.objects)
-- ---------------------------------------------------------------------

-- rh_anexos: nomes "<id do colaborador>_…" → o próprio e os RH
drop policy if exists rh_anexos_ler on storage.objects;
create policy rh_anexos_ler on storage.objects for select to authenticated
  using (bucket_id = 'rh_anexos' and (
    public.bizin_e_staff() or split_part(name, '_', 1) = auth.uid()::text or owner = auth.uid()
  ));

drop policy if exists rh_anexos_carregar on storage.objects;
create policy rh_anexos_carregar on storage.objects for insert to authenticated
  with check (bucket_id = 'rh_anexos' and (
    public.bizin_e_staff() or split_part(name, '_', 1) = auth.uid()::text
  ));

drop policy if exists rh_anexos_alterar on storage.objects;
create policy rh_anexos_alterar on storage.objects for update to authenticated
  using (bucket_id = 'rh_anexos' and (public.bizin_e_staff() or owner = auth.uid()));

drop policy if exists rh_anexos_apagar on storage.objects;
create policy rh_anexos_apagar on storage.objects for delete to authenticated
  using (bucket_id = 'rh_anexos' and (public.bizin_e_staff() or owner = auth.uid()));

-- documentos: documentos de projetos/tarefas → qualquer colaborador com sessão
drop policy if exists documentos_ler on storage.objects;
create policy documentos_ler on storage.objects for select to authenticated
  using (bucket_id = 'documentos');

drop policy if exists documentos_carregar on storage.objects;
create policy documentos_carregar on storage.objects for insert to authenticated
  with check (bucket_id = 'documentos');

drop policy if exists documentos_apagar on storage.objects;
create policy documentos_apagar on storage.objects for delete to authenticated
  using (bucket_id = 'documentos' and (public.bizin_e_staff() or owner = auth.uid()));

-- chat_ficheiros: pasta = id da conversa → só participantes
drop policy if exists chat_ficheiros_ler on storage.objects;
create policy chat_ficheiros_ler on storage.objects for select to authenticated
  using (bucket_id = 'chat_ficheiros' and public.chat_ficheiro_permitido(name));

drop policy if exists chat_ficheiros_carregar on storage.objects;
create policy chat_ficheiros_carregar on storage.objects for insert to authenticated
  with check (bucket_id = 'chat_ficheiros' and public.chat_ficheiro_permitido(name));

drop policy if exists chat_ficheiros_apagar on storage.objects;
create policy chat_ficheiros_apagar on storage.objects for delete to authenticated
  using (bucket_id = 'chat_ficheiros' and owner = auth.uid());

-- ---------------------------------------------------------------------
-- 4. Confirmação: regras antigas que ainda se aplicam a estes baldes.
--    Se aparecer alguma política genérica (ex.: "qualquer autenticado lê tudo"),
--    ela continua a dar acesso — manda o resultado para revermos.
-- ---------------------------------------------------------------------
select policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'storage' and tablename = 'objects'
order by policyname;
