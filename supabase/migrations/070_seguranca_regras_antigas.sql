-- =====================================================================
-- 070 — Segurança (Fase 2, parte C): limpar regras antigas demasiado abertas
--
-- No Supabase as regras (políticas) SOMAM-SE: basta UMA dizer "sim" para dar
-- acesso. Várias tabelas tinham regras antigas do tipo "permitir tudo a todos",
-- que anulavam as regras mais apertadas. Esta migração remove-as e põe as certas.
-- Não apaga dados. Pode correr mais do que uma vez.
--
-- "staff" = admin, administrador e gestor (quem usa os Recursos Humanos).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Ficheiros: regras antigas que anulavam a migração 069
-- ---------------------------------------------------------------------
-- Dava TUDO (ler, carregar, apagar) no balde "documentos" a qualquer pessoa, mesmo sem sessão
drop policy if exists "Permitir tudo no bucket documentos" on storage.objects;
-- Qualquer colaborador podia substituir ou carregar anexos de RH em nome de outros
drop policy if exists "Permitir_Atualizar_RH" on storage.objects;
drop policy if exists "Permitir_Uploads_RH" on storage.objects;

-- ---------------------------------------------------------------------
-- 2. profiles: cada pessoa edita o seu perfil; os RH editam todos
--    (antes: qualquer pessoa editava o perfil de qualquer outra)
-- ---------------------------------------------------------------------
drop policy if exists "Permitir atualizar profiles" on public.profiles;
drop policy if exists "Permitir RH editar perfis" on public.profiles;
drop policy if exists "Editar próprio perfil" on public.profiles;
drop policy if exists profiles_update_proprio on public.profiles;
drop policy if exists profiles_update_rh on public.profiles;
create policy profiles_update_proprio on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_update_rh on public.profiles for update to authenticated
  using (public.bizin_e_staff()) with check (public.bizin_e_staff());
-- Três regras de leitura iguais → fica uma
drop policy if exists "Public profiles are viewable by everyone" on public.profiles;
drop policy if exists "Qualquer utilizador autenticado pode ver perfis" on public.profiles;
-- (mantém-se "Ver toda a equipa": todos os colaboradores veem a equipa)

-- ---------------------------------------------------------------------
-- 3. ferias (pedidos de ausência)
--    Antes: qualquer pessoa lia, editava e apagava os pedidos de todos.
--    Agora: cada um vê os seus + as ausências APROVADAS da equipa (calendário);
--           só edita os seus; os RH veem e gerem tudo.
--    (a migração 068 já impede um colaborador de aprovar os próprios pedidos)
-- ---------------------------------------------------------------------
drop policy if exists "Permitir tudo ferias" on public.ferias;
drop policy if exists "Permitir atualizar ausencias" on public.ferias;
drop policy if exists "Permitir criar ausencias" on public.ferias;
drop policy if exists "Gerir proprias ferias" on public.ferias;
drop policy if exists "Inserir proprios pedidos" on public.ferias;
drop policy if exists "Atualizar proprios pedidos" on public.ferias;
drop policy if exists "Ver ferias aprovadas" on public.ferias;
drop policy if exists "Ver proprios pedidos" on public.ferias;
drop policy if exists ferias_ler on public.ferias;
drop policy if exists ferias_criar on public.ferias;
drop policy if exists ferias_alterar on public.ferias;
drop policy if exists ferias_apagar on public.ferias;
create policy ferias_ler on public.ferias for select to authenticated
  using (user_id = auth.uid() or user_id is null or estado = 'aprovado' or public.bizin_e_staff());
create policy ferias_criar on public.ferias for insert to authenticated
  with check (user_id = auth.uid() or public.bizin_e_staff());
create policy ferias_alterar on public.ferias for update to authenticated
  using (user_id = auth.uid() or public.bizin_e_staff())
  with check (user_id = auth.uid() or public.bizin_e_staff());
create policy ferias_apagar on public.ferias for delete to authenticated
  using (public.bizin_e_staff());

-- ---------------------------------------------------------------------
-- 4. assiduidade (ponto) e task_logs (horas)
--    Antes: qualquer pessoa alterava o ponto e as horas dos outros.
--    Agora: todos continuam a VER (equipa online, painel de admin);
--           cada um altera os seus; os RH alteram tudo.
-- ---------------------------------------------------------------------
drop policy if exists "Acesso Total Assiduidade" on public.assiduidade;
drop policy if exists "Permitir Insert Assiduidade" on public.assiduidade;
drop policy if exists "Permitir Select Assiduidade" on public.assiduidade;
drop policy if exists "Permitir Update Assiduidade" on public.assiduidade;
drop policy if exists assiduidade_ler on public.assiduidade;
drop policy if exists assiduidade_escrever on public.assiduidade;
create policy assiduidade_ler on public.assiduidade for select to authenticated using (true);
create policy assiduidade_escrever on public.assiduidade for all to authenticated
  using (user_id = auth.uid() or public.bizin_e_staff())
  with check (user_id = auth.uid() or public.bizin_e_staff());

drop policy if exists "Permitir escrita a todos os autenticados" on public.task_logs;
drop policy if exists "Permitir leitura a todos os autenticados" on public.task_logs;
drop policy if exists task_logs_ler on public.task_logs;
drop policy if exists task_logs_escrever on public.task_logs;
create policy task_logs_ler on public.task_logs for select to authenticated using (true);
create policy task_logs_escrever on public.task_logs for all to authenticated
  using (user_id = auth.uid() or public.bizin_e_staff())
  with check (user_id = auth.uid() or public.bizin_e_staff());

-- ---------------------------------------------------------------------
-- 5. app_settings: as regras antigas deixavam qualquer pessoa mudar o valor por km
-- ---------------------------------------------------------------------
drop policy if exists "Permitir escrita a todos os autenticados" on public.app_settings;
drop policy if exists "Permitir leitura a todos os autenticados" on public.app_settings;

-- ---------------------------------------------------------------------
-- 6. Chat: a regra antiga deixava entrar em qualquer conversa
--    (a regra nova "chat_participants_insert" da 068 fica a valer)
--    e as reações eram visíveis sem sessão
-- ---------------------------------------------------------------------
drop policy if exists chat_participants_insert_policy on public.chat_participants;

drop policy if exists "Todos podem ver reações" on public.chat_reactions;
drop policy if exists chat_reactions_ler on public.chat_reactions;
create policy chat_reactions_ler on public.chat_reactions for select to authenticated using (true);

drop policy if exists "Ver reações" on public.forum_reactions;
drop policy if exists forum_reactions_ler on public.forum_reactions;
create policy forum_reactions_ler on public.forum_reactions for select to authenticated using (true);

-- ---------------------------------------------------------------------
-- 7. Leitura sem sessão (visitantes anónimos) → só com sessão
-- ---------------------------------------------------------------------
drop policy if exists avisos_select_all on public.avisos;
drop policy if exists avisos_ler on public.avisos;
create policy avisos_ler on public.avisos for select to authenticated using (true);

drop policy if exists programas_financiamento_select_all on public.programas_financiamento;
drop policy if exists programas_financiamento_ler on public.programas_financiamento;
create policy programas_financiamento_ler on public.programas_financiamento for select to authenticated using (true);

-- ---------------------------------------------------------------------
-- 8. Equipamentos (Ativos TI): a regra antiga deixava qualquer pessoa inserir,
--    anulando "Apenas admins podem inserir/editar ativos"
-- ---------------------------------------------------------------------
drop policy if exists "Permitir inserção para utilizadores autenticados" on public.equipamentos;
drop policy if exists "Permitir leitura para utilizadores autenticados" on public.equipamentos; -- repetida

-- ---------------------------------------------------------------------
-- 9. Configurações de entidade: "por criador ou admin" deixava QUALQUER pessoa
--    (a verificação de admin só confirmava que a pessoa tinha perfil)
-- ---------------------------------------------------------------------
drop policy if exists "Entidade config atualização por criador ou admin" on public.entidade_configuracoes;
drop policy if exists "Entidade config deleção por criador" on public.entidade_configuracoes;
drop policy if exists entidade_config_alterar on public.entidade_configuracoes;
drop policy if exists entidade_config_apagar on public.entidade_configuracoes;
create policy entidade_config_alterar on public.entidade_configuracoes for update to authenticated
  using (criado_por = auth.uid() or public.bizin_e_staff())
  with check (criado_por = auth.uid() or public.bizin_e_staff());
create policy entidade_config_apagar on public.entidade_configuracoes for delete to authenticated
  using (criado_por = auth.uid() or public.bizin_e_staff());

-- ---------------------------------------------------------------------
-- 10. TransferGest (dados de terceiros): só admin e gestor (como a página)
-- ---------------------------------------------------------------------
drop policy if exists transfergest_registos_delete_authenticated on public.transfergest_registos;
drop policy if exists transfergest_registos_insert_authenticated on public.transfergest_registos;
drop policy if exists transfergest_registos_select_all on public.transfergest_registos;
drop policy if exists transfergest_registos_update_authenticated on public.transfergest_registos;
drop policy if exists transfergest_staff on public.transfergest_registos;
create policy transfergest_staff on public.transfergest_registos for all to authenticated
  using (public.bizin_e_staff()) with check (public.bizin_e_staff());

-- ---------------------------------------------------------------------
-- 11. Pedidos de reembolso: todos leem e editam; só os RH apagam
-- ---------------------------------------------------------------------
drop policy if exists pedidos_reembolso_delete_authenticated on public.pedidos_reembolso;
drop policy if exists pedidos_reembolso_apagar on public.pedidos_reembolso;
create policy pedidos_reembolso_apagar on public.pedidos_reembolso for delete to authenticated
  using (public.bizin_e_staff());

-- ---------------------------------------------------------------------
-- 12. Funções que não estão no repositório: tirar o acesso a visitantes anónimos
--     (continuam disponíveis para quem tem sessão e para o servidor)
-- ---------------------------------------------------------------------
do $$
declare
  f record;
begin
  for f in
    select p.oid::regprocedure as assinatura
    from pg_proc p
    where p.pronamespace = 'public'::regnamespace
      and p.proname in ('bizin_projetos_por_cliente_nif', 'get_tabelas_externas', 'get_colunas_externas')
  loop
    execute format('revoke all on function %s from public, anon', f.assinatura);
    execute format('grant execute on function %s to authenticated, service_role', f.assinatura);
  end loop;
end $$;
