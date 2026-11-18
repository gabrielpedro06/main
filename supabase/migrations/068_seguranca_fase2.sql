-- =====================================================================
-- 068 — Segurança (Fase 2, parte A)
-- Correções que não dependem das políticas criadas à mão no painel:
--   1. Funções SECURITY DEFINER: tirar o acesso a visitantes anónimos
--   2. Funções novas deixam de ficar abertas a "anon" por defeito
--   3. app_settings e rh_settings: ativar RLS
--   4. profiles: só admin muda papel/estado; só RH (admin/gestor) muda dados de RH
--   5. ferias: colaboradores não podem aprovar/rejeitar os próprios pedidos
--   6. chat: ninguém entra em conversas privadas de outras pessoas
--   7. audit_log: esconder também o campo "codigo" (palavras-passe de clientes)
--
-- Tudo é idempotente (pode correr mais do que uma vez).
-- O SERVIDOR (chave service_role) e o SQL Editor não são afetados pelas regras 4 e 5.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Ajudantes: papel de quem está a fazer o pedido
-- ---------------------------------------------------------------------
create or replace function public.bizin_papel()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select lower(coalesce(p.role::text, p.tipo::text, ''))
  from public.profiles p
  where p.id = auth.uid();
$$;

create or replace function public.bizin_e_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.bizin_papel() in ('admin', 'administrador'), false);
$$;

-- "Staff" = quem tem acesso aos Recursos Humanos (admin + gestor)
create or replace function public.bizin_e_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.bizin_papel() in ('admin', 'administrador', 'gestor'), false);
$$;

revoke all on function public.bizin_papel() from public, anon;
revoke all on function public.bizin_e_admin() from public, anon;
revoke all on function public.bizin_e_staff() from public, anon;
grant execute on function public.bizin_papel() to authenticated;
grant execute on function public.bizin_e_admin() to authenticated;
grant execute on function public.bizin_e_staff() to authenticated;

-- ---------------------------------------------------------------------
-- 1. Funções SECURITY DEFINER expostas
--    (o Supabase dá EXECUTE a "anon" e "authenticated" por defeito;
--     "revoke from public" NÃO retira essas permissões)
-- ---------------------------------------------------------------------
do $$
declare
  f record;
  -- Só o servidor (service_role) pode chamar
  so_servidor text[] := array[
    'aprovar_pedido_ferias_por_email',
    'calcular_dias_ferias_gozados',
    'sincronizar_saldo_ferias_por_pedido'
  ];
  -- Funções de trigger: são executadas pela base de dados, ninguém as chama diretamente
  triggers text[] := array[
    'atividades_registar_estado', 'projetos_registar_estado', 'tarefas_registar_estado',
    'audit_registar', 'audit_ao_criar_tabela', 'handle_new_user', 'medalhas_touch_updated_at'
  ];
  -- Usadas pela app com sessão (ou dentro de políticas RLS): tirar só aos anónimos
  so_sessao text[] := array[
    'chat_user_in_room', 'pode_gerir_medalhas', 'provisionar_saldos_ferias', 'registar_evento'
  ];
begin
  for f in
    select p.oid::regprocedure as assinatura, p.proname
    from pg_proc p
    where p.pronamespace = 'public'::regnamespace
      and p.proname = any (so_servidor || triggers || so_sessao)
  loop
    execute format('revoke all on function %s from public, anon', f.assinatura);
    if f.proname = any (so_servidor || triggers) then
      execute format('revoke all on function %s from authenticated', f.assinatura);
    else
      execute format('grant execute on function %s to authenticated', f.assinatura);
    end if;
    execute format('grant execute on function %s to service_role', f.assinatura);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 2. Funções e tabelas novas deixam de ficar abertas a visitantes anónimos
-- ---------------------------------------------------------------------
alter default privileges in schema public revoke execute on functions from anon, public;

-- ---------------------------------------------------------------------
-- 3. app_settings (ex.: valor por km) e rh_settings (dia de pagamento do SA)
--    Antes: SEM RLS → qualquer pessoa com a chave pública podia alterar/apagar.
-- ---------------------------------------------------------------------
do $$
begin
  if to_regclass('public.app_settings') is not null then
    alter table public.app_settings enable row level security;
    drop policy if exists app_settings_select on public.app_settings;
    create policy app_settings_select on public.app_settings
      for select to authenticated using (true);
    drop policy if exists app_settings_write on public.app_settings;
    create policy app_settings_write on public.app_settings
      for all to authenticated using (public.bizin_e_staff()) with check (public.bizin_e_staff());
    revoke all on public.app_settings from anon;
  else
    raise notice 'app_settings não existe: passo ignorado';
  end if;

  if to_regclass('public.rh_settings') is not null then
    alter table public.rh_settings enable row level security;
    drop policy if exists rh_settings_select on public.rh_settings;
    create policy rh_settings_select on public.rh_settings
      for select to authenticated using (user_id = auth.uid() or public.bizin_e_staff());
    drop policy if exists rh_settings_write on public.rh_settings;
    create policy rh_settings_write on public.rh_settings
      for all to authenticated using (public.bizin_e_staff()) with check (public.bizin_e_staff());
    revoke all on public.rh_settings from anon;
  else
    raise notice 'rh_settings não existe: passo ignorado';
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 4. profiles: campos protegidos (mesmo que alguém use as ferramentas do browser)
--    - role, tipo, ativo ............ só administradores (ou o servidor)
--    - salário, férias, contrato… ... só RH (admin/gestor)
--    Cada pessoa continua a editar os seus contactos e dados pessoais no Perfil.
-- ---------------------------------------------------------------------
create or replace function public.profiles_proteger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  papel text;
  k text;
  so_admin text[] := array['role', 'tipo', 'ativo'];
  so_rh text[] := array['valor_sa', 'recebe_sa', 'dias_ferias', 'dias_ferias_total', 'tipo_contrato',
                        'data_admissao', 'empresa_interna', 'funcao',
                        'estado_temporario_tipo', 'estado_temporario_inicio', 'estado_temporario_fim', 'estado_temporario_motivo'];
  novo jsonb := to_jsonb(new);
  antigo jsonb;
begin
  -- Servidor (service_role) e SQL Editor não têm utilizador: passam
  if auth.uid() is null then
    return new;
  end if;
  papel := public.bizin_papel();
  if papel in ('admin', 'administrador') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if coalesce(lower(novo ->> 'role'), 'colaborador') <> 'colaborador'
       or coalesce(lower(novo ->> 'tipo'), 'colaborador') <> 'colaborador' then
      raise exception 'Sem permissão para criar perfis com este papel.' using errcode = '42501';
    end if;
    return new;
  end if;

  antigo := to_jsonb(old);
  foreach k in array so_admin loop
    if (novo -> k) is distinct from (antigo -> k) then
      raise exception 'Só um administrador pode alterar o papel ou o estado da conta.' using errcode = '42501';
    end if;
  end loop;

  if papel = 'gestor' then
    return new; -- RH
  end if;

  foreach k in array so_rh loop
    if (novo -> k) is distinct from (antigo -> k) then
      raise exception 'Só os Recursos Humanos podem alterar este campo (%).', k using errcode = '42501';
    end if;
  end loop;
  return new;
end;
$$;

revoke all on function public.profiles_proteger() from public, anon, authenticated;

drop trigger if exists profiles_proteger on public.profiles;
create trigger profiles_proteger
  before insert or update on public.profiles
  for each row execute function public.profiles_proteger();

-- ---------------------------------------------------------------------
-- 5. ferias: um colaborador só cria pedidos "pendentes" e só cancela/pede cancelamento.
--    Aprovar e rejeitar fica para os RH (admin/gestor) ou para o servidor.
-- ---------------------------------------------------------------------
create or replace function public.ferias_proteger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or public.bizin_e_staff() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.user_id is distinct from auth.uid() then
      raise exception 'Só pode criar pedidos em seu nome.' using errcode = '42501';
    end if;
    if coalesce(new.estado, 'pendente') <> 'pendente' then
      raise exception 'Os pedidos novos ficam pendentes até serem aprovados pelos RH.' using errcode = '42501';
    end if;
    return new;
  end if;

  -- UPDATE
  if new.user_id is distinct from old.user_id then
    raise exception 'Não pode mudar o dono do pedido.' using errcode = '42501';
  end if;
  if new.estado not in ('pendente', 'cancelado', 'pedido_cancelamento') then
    raise exception 'Só os RH podem aprovar ou rejeitar pedidos.' using errcode = '42501';
  end if;
  if new.estado = 'cancelado' and old.estado <> 'pendente' then
    raise exception 'Este pedido já foi tratado: peça o cancelamento aos RH.' using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function public.ferias_proteger() from public, anon, authenticated;

drop trigger if exists ferias_proteger on public.ferias;
create trigger ferias_proteger
  before insert or update on public.ferias
  for each row execute function public.ferias_proteger();

-- ---------------------------------------------------------------------
-- 6. Chat: quem pode adicionar alguém a uma conversa
--    - quem já está na conversa
--    - quem criou a conversa (para juntar os participantes iniciais)
--    - a própria pessoa, só em GRUPOS (os grupos da empresa abrem-se pelo nome)
--    Antes: qualquer pessoa entrava em qualquer conversa, incluindo as privadas.
-- ---------------------------------------------------------------------
do $$
begin
  if to_regclass('public.chat_rooms') is null or to_regclass('public.chat_participants') is null then
    raise notice 'chat não existe: passo ignorado';
    return;
  end if;
  alter table public.chat_rooms add column if not exists criado_por uuid default auth.uid();
end $$;

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
    or (p_user = auth.uid() and exists (select 1 from public.chat_rooms r where r.id = p_room and r.is_group))
  );
$$;

revoke all on function public.chat_pode_adicionar(uuid, uuid) from public, anon;
grant execute on function public.chat_pode_adicionar(uuid, uuid) to authenticated;

do $$
begin
  if to_regclass('public.chat_participants') is null then
    return;
  end if;
  drop policy if exists "chat_participants_insert_authenticated" on public.chat_participants;
  drop policy if exists chat_participants_insert on public.chat_participants;
  create policy chat_participants_insert on public.chat_participants
    for insert to authenticated
    with check (public.chat_pode_adicionar(room_id, user_id));
end $$;

-- ---------------------------------------------------------------------
-- 7. Histórico de auditoria: esconder também "codigo" (palavras-passe dos acessos de clientes)
-- ---------------------------------------------------------------------
create or replace function public.audit_mascarar(j jsonb)
returns jsonb
language sql
immutable
as $$
    select case
        when j is null or jsonb_typeof(j) <> 'object' then j
        else coalesce((
            select jsonb_object_agg(
                k,
                case
                    when k ~* '(passw|senha|password|token|secret|segredo|api_?key|chave_api|credencia|private_key|^codigo$)' then to_jsonb('•••'::text)
                    when jsonb_typeof(v) = 'object' then public.audit_mascarar(v)
                    when jsonb_typeof(v) = 'string' and length(v #>> '{}') > 4000 then to_jsonb(left(v #>> '{}', 4000) || '… [cortado]')
                    else v
                end
            )
            from jsonb_each(j) as e(k, v)
        ), '{}'::jsonb)
    end
$$;

-- Limpa as palavras-passe que já ficaram guardadas em claro no histórico
do $$
begin
  if to_regclass('public.audit_log') is null then
    return;
  end if;
  update public.audit_log
  set dados_antes = public.audit_mascarar(dados_antes),
      dados_depois = public.audit_mascarar(dados_depois)
  where tabela in ('acessos', 'acessos_cliente')
    and (dados_antes ? 'codigo' or dados_depois ? 'codigo' or dados_antes ? 'password' or dados_depois ? 'password');
end $$;
