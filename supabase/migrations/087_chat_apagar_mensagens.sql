-- =====================================================================
-- 087 · Chat: apagar mensagens
-- "Apagar para todos" (só o autor): o conteúdo e o anexo saem da base de
--   dados e fica a marca "Mensagem apagada" (apagada_em). Feito pela função
--   chat_apagar_mensagem(), para ninguém ganhar permissão de EDITAR mensagens.
-- "Apagar para mim" (qualquer mensagem): a mensagem fica escondida só para
--   quem a apagou (tabela chat_mensagens_ocultas).
-- Também: regra de 2FA (mfa_obrigatorio, como na 071) nas tabelas novas
--   desde a 071 que ainda não a tinham (CRM: histórico e pessoas).
-- Quem usa: src/pages/Forum.jsx. Idempotente.
-- =====================================================================

-- 1. Marca de mensagem apagada ----------------------------------------
alter table public.chat_messages add column if not exists apagada_em timestamptz;

alter table public.chat_messages drop constraint if exists chat_message_content_or_file_chk;
alter table public.chat_messages add constraint chat_message_content_or_file_chk check (
  apagada_em is not null
  or (content is not null and length(trim(content)) > 0)
  or (file_url is not null)
);

-- 2. Apagar para todos (só o autor) ------------------------------------
-- Devolve o file_url antigo (a app apaga o ficheiro do balde chat_ficheiros:
-- o próprio autor já tem permissão para apagar o que carregou).
create or replace function public.chat_apagar_mensagem(p_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ficheiro text;
begin
  -- a função passa por cima das regras da tabela: confirmar aqui o 2FA e o autor
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
     set content = null, file_url = null, file_name = null, apagada_em = now()
   where id = p_id;

  return v_ficheiro;
end;
$$;

revoke all on function public.chat_apagar_mensagem(uuid) from public, anon;
grant execute on function public.chat_apagar_mensagem(uuid) to authenticated;

-- 3. Apagar para mim ---------------------------------------------------
create table if not exists public.chat_mensagens_ocultas (
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  message_id uuid not null references public.chat_messages(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, message_id)
);

alter table public.chat_mensagens_ocultas enable row level security;

drop policy if exists chat_ocultas_proprias on public.chat_mensagens_ocultas;
create policy chat_ocultas_proprias on public.chat_mensagens_ocultas
  for all to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.chat_messages m
      join public.chat_participants cp on cp.room_id = m.room_id and cp.user_id = auth.uid()
      where m.id = message_id
    )
  );

grant select, insert, delete on public.chat_mensagens_ocultas to authenticated;

-- 4. 2FA obrigatório (como na 071) nas tabelas novas ---------------------
do $$
declare
  t text;
begin
  foreach t in array array['chat_mensagens_ocultas', 'marketing_leads_interacoes', 'marketing_leads_pessoas'] loop
    if to_regclass('public.' || t) is not null then
      execute format('drop policy if exists mfa_obrigatorio on public.%I', t);
      execute format(
        'create policy mfa_obrigatorio on public.%I as restrictive for all to authenticated
           using ((auth.jwt() ->> ''aal'') = ''aal2'')
           with check ((auth.jwt() ->> ''aal'') = ''aal2'')',
        t
      );
    end if;
  end loop;
end $$;
