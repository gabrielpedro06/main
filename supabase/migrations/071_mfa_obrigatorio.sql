-- =====================================================================
-- 071 — MFA obrigatório na base de dados
--
-- Até aqui o 2FA só era pedido pelo ecrã da app: com a palavra-passe certa,
-- a sessão (nível "aal1") já conseguia ler os dados chamando o Supabase diretamente.
-- Esta regra RESTRITIVA (soma-se a todas as outras com um "E") exige que a sessão
-- tenha o código 2FA confirmado (nível "aal2") em TODAS as tabelas e ficheiros.
--
-- Não afeta: o servidor (chave service_role), o SQL Editor, nem os ficheiros públicos
-- (fotos, fórum, medalhas). Quem ainda não configurou o 2FA é levado pela app a configurá-lo.
--
-- CORRER SÓ DEPOIS de a 068, 069 e 070 estarem testadas.
-- Para DESFAZER (se algo deixar de funcionar), correr o bloco no fim deste ficheiro.
-- =====================================================================

do $$
declare
  t record;
begin
  for t in
    select c.relname
    from pg_class c
    where c.relnamespace = 'public'::regnamespace
      and c.relkind = 'r'
      and c.relrowsecurity
  loop
    execute format('drop policy if exists mfa_obrigatorio on public.%I', t.relname);
    execute format(
      'create policy mfa_obrigatorio on public.%I as restrictive for all to authenticated
         using ((auth.jwt() ->> ''aal'') = ''aal2'')
         with check ((auth.jwt() ->> ''aal'') = ''aal2'')',
      t.relname
    );
  end loop;
end $$;

-- Ficheiros privados (anexos de RH, documentos, chat) também exigem 2FA
drop policy if exists mfa_obrigatorio on storage.objects;
create policy mfa_obrigatorio on storage.objects as restrictive for all to authenticated
  using ((auth.jwt() ->> 'aal') = 'aal2')
  with check ((auth.jwt() ->> 'aal') = 'aal2');

-- Confirmação: tabelas que ficaram protegidas
select tablename from pg_policies where policyname = 'mfa_obrigatorio' order by tablename;

-- =====================================================================
-- DESFAZER (copiar só este bloco para o SQL Editor, se for preciso):
--
-- do $$
-- declare t record;
-- begin
--   for t in select tablename from pg_policies where schemaname = 'public' and policyname = 'mfa_obrigatorio' loop
--     execute format('drop policy if exists mfa_obrigatorio on public.%I', t.tablename);
--   end loop;
-- end $$;
-- drop policy if exists mfa_obrigatorio on storage.objects;
-- =====================================================================
