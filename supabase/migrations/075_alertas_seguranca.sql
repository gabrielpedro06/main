-- =====================================================================
-- 075 · ALERTAS DE SEGURANÇA
--  * tentativas_login     : palavras-passe / códigos 2FA errados (vindos do servidor)
--  * alertas_seguranca    : situações suspeitas (com email aos admins + sino do Dashboard)
--  * logs_supabase_api    : resumo dos pedidos à API do Supabase (recolhido a cada 10 min)
--  * logs_supabase_auth   : erros e eventos de autenticação do Supabase (idem)
--  * seguranca_estado     : estado da recolha (última janela lida, último erro)
--  * Regras automáticas sobre o registo de atividade (audit_log):
--      - apagar em massa (≥ 20 operações ou ≥ 200 registos em 10 min, pela mesma pessoa)
--      - muitas palavras-passe do cofre vistas (≥ 10 numa hora)
--      - tentativa de entrar com conta desativada
--      - exportações grandes (≥ 500 linhas)
--  * No máximo 1 alerta por situação por hora e 30 alertas por hora no total.
-- Só os administradores leem estas tabelas. A escrita é feita pelo servidor
-- (chave de serviço) ou pelas regras da própria base de dados.
-- Idempotente. Não apaga nada.
-- =====================================================================

-- 0) Estas tabelas não entram no registo de atividade (seriam milhares de linhas
--    de "ruído" e algumas escrevem-se a cada 10 minutos)
create or replace function public.audit_excluida(p_tabela text)
returns boolean
language sql
immutable
as $$
    select p_tabela = any (array[
        'audit_log', 'chat_messages', 'chat_room_reads', 'notificacoes_projetos',
        'tentativas_login', 'alertas_seguranca', 'logs_supabase_api', 'logs_supabase_auth', 'seguranca_estado'
    ])
$$;

-- Cada linha do registo passa a guardar a transação em que aconteceu
-- (para distinguir "apagar 1 projeto com 50 tarefas" de "50 eliminações seguidas")
alter table public.audit_log add column if not exists transacao bigint;
alter table public.audit_log alter column transacao set default txid_current();

-- ---------------------------------------------------------------------
-- 1) Tabelas
-- ---------------------------------------------------------------------
create table if not exists public.tentativas_login (
    id bigint generated always as identity primary key,
    created_at timestamptz not null default now(),
    email text,
    ip text,
    pais text,
    motivo text not null,            -- password | mfa | conta_bloqueada
    agente text
);
create index if not exists idx_tentativas_login_email on public.tentativas_login (email, created_at desc);
create index if not exists idx_tentativas_login_ip on public.tentativas_login (ip, created_at desc);

create table if not exists public.alertas_seguranca (
    id bigint generated always as identity primary key,
    created_at timestamptz not null default now(),
    tipo text not null,
    gravidade text not null default 'media' check (gravidade in ('alta', 'media', 'baixa')),
    titulo text not null,
    mensagem text not null,
    user_id uuid,
    user_email text,
    ip text,
    pais text,
    detalhes jsonb not null default '{}'::jsonb,
    chave text,
    email_enviado boolean not null default false,
    email_tentativas integer not null default 0,
    visto_por uuid references public.profiles(id) on delete set null,
    visto_em timestamptz
);
create index if not exists idx_alertas_seguranca_created on public.alertas_seguranca (created_at desc);
create index if not exists idx_alertas_seguranca_chave on public.alertas_seguranca (chave, created_at desc);
create index if not exists idx_alertas_seguranca_email on public.alertas_seguranca (email_enviado, created_at desc);

create table if not exists public.logs_supabase_api (
    id bigint generated always as identity primary key,
    janela_inicio timestamptz not null,
    janela_fim timestamptz not null,
    ip text,
    metodo text,
    caminho text,
    estado integer,
    total integer not null default 0,
    created_at timestamptz not null default now()
);
create index if not exists idx_logs_supabase_api_janela on public.logs_supabase_api (janela_fim desc);
create index if not exists idx_logs_supabase_api_ip on public.logs_supabase_api (ip, janela_fim desc);

create table if not exists public.logs_supabase_auth (
    id text primary key,             -- id do log no Supabase (evita duplicados)
    momento timestamptz not null,
    ip text,
    metodo text,
    caminho text,
    estado integer,
    nivel text,
    mensagem text,
    acao text,
    email text,
    created_at timestamptz not null default now()
);
create index if not exists idx_logs_supabase_auth_momento on public.logs_supabase_auth (momento desc);
create index if not exists idx_logs_supabase_auth_ip on public.logs_supabase_auth (ip, momento desc);

create table if not exists public.seguranca_estado (
    chave text primary key,
    valor jsonb not null default '{}'::jsonb,
    atualizado_em timestamptz not null default now()
);

-- Garante que não ficam ligadas ao registo de atividade (se o event trigger as apanhou)
drop trigger if exists trg_audit on public.tentativas_login;
drop trigger if exists trg_audit on public.alertas_seguranca;
drop trigger if exists trg_audit on public.logs_supabase_api;
drop trigger if exists trg_audit on public.logs_supabase_auth;
drop trigger if exists trg_audit on public.seguranca_estado;

-- ---------------------------------------------------------------------
-- 2) Acesso: só administradores leem; só podem marcar alertas como vistos
-- ---------------------------------------------------------------------
alter table public.tentativas_login enable row level security;
alter table public.alertas_seguranca enable row level security;
alter table public.logs_supabase_api enable row level security;
alter table public.logs_supabase_auth enable row level security;
alter table public.seguranca_estado enable row level security;

do $$
declare t text;
begin
    foreach t in array array['tentativas_login', 'alertas_seguranca', 'logs_supabase_api', 'logs_supabase_auth', 'seguranca_estado']
    loop
        execute format('drop policy if exists seg_ler_admin on public.%I', t);
        execute format('create policy seg_ler_admin on public.%I for select to authenticated using (public.bizin_e_admin())', t);
        -- Mesmo nível de proteção do resto da app: só com o código 2FA confirmado
        execute format('drop policy if exists mfa_obrigatorio on public.%I', t);
        execute format(
            'create policy mfa_obrigatorio on public.%I as restrictive for all to authenticated
               using ((auth.jwt() ->> ''aal'') = ''aal2'')
               with check ((auth.jwt() ->> ''aal'') = ''aal2'')', t);
    end loop;
end;
$$;

drop policy if exists seg_marcar_visto on public.alertas_seguranca;
create policy seg_marcar_visto on public.alertas_seguranca
    for update to authenticated
    using (public.bizin_e_admin())
    with check (public.bizin_e_admin());

-- Os admins só podem mexer em "visto" (o resto do alerta fica intacto)
revoke update on public.alertas_seguranca from authenticated;
grant update (visto_por, visto_em) on public.alertas_seguranca to authenticated;
revoke insert, delete on public.alertas_seguranca from authenticated, anon;
revoke insert, update, delete on public.tentativas_login, public.logs_supabase_api, public.logs_supabase_auth, public.seguranca_estado from authenticated, anon;

-- ---------------------------------------------------------------------
-- 3) Criar um alerta (+ notificação no sino de todos os admins ativos)
--    Devolve o id do alerta, ou null se foi ignorado por repetição.
-- ---------------------------------------------------------------------
create or replace function public.seguranca_criar_alerta(
    p_tipo text,
    p_gravidade text,
    p_titulo text,
    p_mensagem text,
    p_user_id uuid default null,
    p_user_email text default null,
    p_ip text default null,
    p_pais text default null,
    p_detalhes jsonb default '{}'::jsonb,
    p_chave text default null
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
    v_id bigint;
    v_chave text := coalesce(nullif(p_chave, ''), p_tipo);
begin
    -- A mesma situação só gera 1 alerta por hora
    if exists (select 1 from public.alertas_seguranca where chave = v_chave and created_at > now() - interval '1 hour') then
        return null;
    end if;
    -- Travão contra inundação: no máximo 30 alertas por hora no total
    if (select count(*) from public.alertas_seguranca where created_at > now() - interval '1 hour') >= 30 then
        return null;
    end if;

    insert into public.alertas_seguranca (tipo, gravidade, titulo, mensagem, user_id, user_email, ip, pais, detalhes, chave)
    values (
        left(p_tipo, 60),
        case when p_gravidade in ('alta', 'media', 'baixa') then p_gravidade else 'media' end,
        left(p_titulo, 200), left(p_mensagem, 1000), p_user_id, left(p_user_email, 254),
        left(p_ip, 64), left(p_pais, 8), coalesce(p_detalhes, '{}'::jsonb), left(v_chave, 300)
    )
    returning id into v_id;

    insert into public.notificacoes_projetos (user_id, tipo, titulo, mensagem, link)
    select p.id, 'seguranca', left('Segurança: ' || p_titulo, 200), left(p_mensagem, 500), '/dashboard/registos?alertas=1'
      from public.profiles p
     where coalesce(p.ativo, true)
       and lower(coalesce(p.role::text, p.tipo::text, '')) in ('admin', 'administrador');

    return v_id;
end;
$$;

revoke all on function public.seguranca_criar_alerta(text, text, text, text, uuid, text, text, text, jsonb, text) from public, anon, authenticated;
grant execute on function public.seguranca_criar_alerta(text, text, text, text, uuid, text, text, text, jsonb, text) to service_role;

-- ---------------------------------------------------------------------
-- 4) Regras automáticas sobre o registo de atividade
-- ---------------------------------------------------------------------
create or replace function public.seguranca_vigiar_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    v_ops integer;
    v_linhas integer;
    v_quem text := coalesce(new.user_email, 'Alguém');
    v_n integer;
begin
    if new.operacao = 'DELETE' and new.user_id is not null then
        -- Já avisado na última hora: não volta a contar (apagar 1000 linhas = 1000 disparos)
        if exists (select 1 from public.alertas_seguranca
                    where chave = 'apagar_em_massa:' || new.user_id and created_at > now() - interval '1 hour') then
            return null;
        end if;
        select count(distinct coalesce(transacao, id)), count(*)
          into v_ops, v_linhas
          from public.audit_log
         where user_id = new.user_id
           and operacao = 'DELETE'
           and created_at > now() - interval '10 minutes';
        if v_ops >= 20 or v_linhas >= 200 then
            perform public.seguranca_criar_alerta(
                'apagar_em_massa', 'alta', 'Muitos registos apagados',
                format('%s apagou %s registos (%s operações) nos últimos 10 minutos. Último: %s.', v_quem, v_linhas, v_ops, coalesce(new.tabela, '?')),
                new.user_id, new.user_email, null, null,
                jsonb_build_object('linhas', v_linhas, 'operacoes', v_ops, 'ultima_tabela', new.tabela),
                'apagar_em_massa:' || new.user_id
            );
        end if;

    elsif new.operacao = 'EVENTO' then
        if new.acao = 'credencial_revelada' then
            select count(*) into v_n
              from public.audit_log
             where user_id is not distinct from new.user_id
               and acao = 'credencial_revelada'
               and created_at > now() - interval '1 hour';
            if v_n >= 10 then
                perform public.seguranca_criar_alerta(
                    'cofre_em_massa', 'alta', 'Muitas palavras-passe vistas',
                    format('%s viu ou copiou %s palavras-passe do cofre na última hora.', v_quem, v_n),
                    new.user_id, new.user_email, null, null, jsonb_build_object('total', v_n),
                    'cofre_em_massa:' || coalesce(new.user_id::text, '?')
                );
            end if;

        elsif new.acao = 'acesso_negado' then
            perform public.seguranca_criar_alerta(
                'conta_desativada', 'media', 'Tentativa de entrar com conta desativada',
                format('%s tentou entrar no Bizin, mas a conta está desativada.', v_quem),
                new.user_id, new.user_email, null, null, coalesce(new.detalhes, '{}'::jsonb),
                'conta_desativada:' || coalesce(new.user_id::text, v_quem)
            );

        elsif new.acao in ('exportacao', 'exportar_registos') then
            v_linhas := case when (new.detalhes ->> 'linhas') ~ '^\d{1,9}$' then (new.detalhes ->> 'linhas')::integer else 0 end;
            if v_linhas >= 500 then
                perform public.seguranca_criar_alerta(
                    'exportacao_grande', 'media', 'Exportação grande de dados',
                    format('%s exportou %s linhas (%s).', v_quem, v_linhas, coalesce(new.detalhes ->> 'area', 'registo de atividade')),
                    new.user_id, new.user_email, null, null, coalesce(new.detalhes, '{}'::jsonb),
                    'exportacao_grande:' || coalesce(new.user_id::text, '?') || ':' || coalesce(new.detalhes ->> 'area', new.acao)
                );
            end if;
        end if;
    end if;
    return null;
exception when others then
    -- A vigilância nunca pode impedir a operação original
    raise warning 'seguranca_vigiar_audit: %', sqlerrm;
    return null;
end;
$$;

drop trigger if exists trg_seguranca_vigiar on public.audit_log;
create trigger trg_seguranca_vigiar
    after insert on public.audit_log
    for each row execute function public.seguranca_vigiar_audit();

-- ---------------------------------------------------------------------
-- 5) Limpeza (por omissão guarda 180 dias de logs e tentativas; os alertas ficam)
--    select public.seguranca_limpar(180);
-- ---------------------------------------------------------------------
create or replace function public.seguranca_limpar(p_dias integer default 180)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
    n integer := 0;
    k integer;
    v_limite timestamptz := now() - make_interval(days => greatest(p_dias, 30));
begin
    delete from public.logs_supabase_api where janela_fim < v_limite;  get diagnostics k = row_count; n := n + k;
    delete from public.logs_supabase_auth where momento < v_limite;    get diagnostics k = row_count; n := n + k;
    delete from public.tentativas_login where created_at < v_limite;   get diagnostics k = row_count; n := n + k;
    return n;
end;
$$;

revoke all on function public.seguranca_limpar(integer) from public, anon, authenticated;

-- Verificação: deve devolver 5 linhas, todas com rls = true
select c.relname as tabela, c.relrowsecurity as rls
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public'
   and c.relname in ('tentativas_login', 'alertas_seguranca', 'logs_supabase_api', 'logs_supabase_auth', 'seguranca_estado')
 order by 1;
