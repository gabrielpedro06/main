-- =====================================================================
-- REGISTO DE ATIVIDADE (audit log) de toda a aplicação
--  * public.audit_log: uma linha por cada INSERT / UPDATE / DELETE em
--    qualquer tabela do schema public (via trigger), mais eventos da
--    aplicação (login, logout…) registados com public.registar_evento().
--  * UPDATE guarda só os campos que mudaram (antes → depois).
--  * Campos sensíveis (passwords, tokens, segredos, chaves) ficam mascarados.
--  * Só administradores podem ler. Ninguém pode alterar ou apagar registos
--    a partir da aplicação.
--  * public.audit_ativar() liga o registo a todas as tabelas (correr de
--    novo depois de criar tabelas novas, se o event trigger não existir).
-- Idempotente.
-- =====================================================================

create table if not exists public.audit_log (
    id bigint generated always as identity primary key,
    created_at timestamptz not null default now(),
    user_id uuid,
    user_email text,
    tabela text,
    operacao text not null,          -- INSERT | UPDATE | DELETE | EVENTO
    acao text,                       -- só em EVENTO: login, logout, exportar…
    registo_id text,
    campos_alterados text[],
    dados_antes jsonb,
    dados_depois jsonb,
    detalhes jsonb
);

create index if not exists idx_audit_log_created_at on public.audit_log (created_at desc);
create index if not exists idx_audit_log_tabela_registo on public.audit_log (tabela, registo_id, created_at desc);
create index if not exists idx_audit_log_user on public.audit_log (user_id, created_at desc);
alter table public.audit_log add column if not exists acao text;

alter table public.audit_log enable row level security;

drop policy if exists audit_log_select_admin on public.audit_log;
create policy audit_log_select_admin
on public.audit_log for select
using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and lower(coalesce(p.role::text, p.tipo::text, '')) in ('admin', 'administrador')
));
-- Sem políticas de insert/update/delete: a aplicação não consegue escrever nem apagar diretamente.

-- ---------------------------------------------------------------------
-- Mascarar valores sensíveis (recursivo em objetos jsonb)
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
                    when k ~* '(passw|senha|password|token|secret|segredo|api_?key|chave_api|credencia|private_key)' then to_jsonb('•••'::text)
                    when jsonb_typeof(v) = 'object' then public.audit_mascarar(v)
                    when jsonb_typeof(v) = 'string' and length(v #>> '{}') > 4000 then to_jsonb(left(v #>> '{}', 4000) || '… [cortado]')
                    else v
                end
            )
            from jsonb_each(j) as e(k, v)
        ), '{}'::jsonb)
    end
$$;

-- ---------------------------------------------------------------------
-- Trigger genérico
-- ---------------------------------------------------------------------
create or replace function public.audit_registar()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    v_antes jsonb;
    v_depois jsonb;
    v_campos text[];
    v_email text;
    v_id text;
begin
    begin
        v_email := nullif(auth.jwt() ->> 'email', '');
    exception when others then
        v_email := null;
    end;

    if tg_op = 'INSERT' then
        v_depois := to_jsonb(new);
        v_id := v_depois ->> 'id';
        insert into public.audit_log (user_id, user_email, tabela, operacao, registo_id, dados_depois)
        values (auth.uid(), v_email, tg_table_name, 'INSERT', v_id, public.audit_mascarar(v_depois));
        return new;

    elsif tg_op = 'UPDATE' then
        v_antes := to_jsonb(old);
        v_depois := to_jsonb(new);
        select array_agg(k order by k)
          into v_campos
          from jsonb_object_keys(v_depois) as k
         where k not in ('updated_at', 'atualizado_em')
           and (v_antes -> k) is distinct from (v_depois -> k);
        if v_campos is null then
            return new; -- nada de relevante mudou
        end if;
        v_id := coalesce(v_depois ->> 'id', v_antes ->> 'id');
        insert into public.audit_log (user_id, user_email, tabela, operacao, registo_id, campos_alterados, dados_antes, dados_depois)
        values (
            auth.uid(), v_email, tg_table_name, 'UPDATE', v_id, v_campos,
            public.audit_mascarar((select jsonb_object_agg(k, v_antes -> k) from unnest(v_campos) k)),
            public.audit_mascarar((select jsonb_object_agg(k, v_depois -> k) from unnest(v_campos) k))
        );
        return new;

    else -- DELETE
        v_antes := to_jsonb(old);
        v_id := v_antes ->> 'id';
        insert into public.audit_log (user_id, user_email, tabela, operacao, registo_id, dados_antes)
        values (auth.uid(), v_email, tg_table_name, 'DELETE', v_id, public.audit_mascarar(v_antes));
        return old;
    end if;
exception when others then
    -- O registo nunca pode impedir a operação original
    raise warning 'audit_registar (%): %', tg_table_name, sqlerrm;
    if tg_op = 'DELETE' then return old; end if;
    return new;
end;
$$;

-- ---------------------------------------------------------------------
-- Tabelas que NÃO são registadas
--   audit_log            → o próprio registo
--   chat_messages        → conteúdo de conversas privadas
--   chat_room_reads      → "lido até", muda a cada mensagem vista
--   notificacoes_projetos→ avisos automáticos (lidos/não lidos)
-- ---------------------------------------------------------------------
create or replace function public.audit_excluida(p_tabela text)
returns boolean
language sql
immutable
as $$
    select p_tabela = any (array['audit_log', 'chat_messages', 'chat_room_reads', 'notificacoes_projetos'])
$$;

-- Liga o trigger a todas as tabelas do schema public (devolve quantas ficaram ligadas)
create or replace function public.audit_ativar()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
    t record;
    n integer := 0;
begin
    for t in
        select c.relname as tabela
          from pg_class c
          join pg_namespace ns on ns.oid = c.relnamespace
         where ns.nspname = 'public'
           and c.relkind in ('r', 'p')
           and not c.relispartition
    loop
        if public.audit_excluida(t.tabela) then
            execute format('drop trigger if exists trg_audit on public.%I', t.tabela);
            continue;
        end if;
        execute format('drop trigger if exists trg_audit on public.%I', t.tabela);
        execute format(
            'create trigger trg_audit after insert or update or delete on public.%I for each row execute function public.audit_registar()',
            t.tabela
        );
        n := n + 1;
    end loop;
    return n;
end;
$$;

revoke all on function public.audit_ativar() from public, anon, authenticated;

select public.audit_ativar();

-- Tabelas criadas no futuro: liga o registo automaticamente (se o Supabase permitir event triggers)
create or replace function public.audit_ao_criar_tabela()
returns event_trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    obj record;
    v_tabela text;
begin
    for obj in select * from pg_event_trigger_ddl_commands() where command_tag = 'CREATE TABLE' and schema_name = 'public'
    loop
        v_tabela := split_part(obj.object_identity, '.', 2);
        v_tabela := trim(both '"' from v_tabela);
        if not public.audit_excluida(v_tabela) then
            execute format('drop trigger if exists trg_audit on public.%I', v_tabela);
            execute format(
                'create trigger trg_audit after insert or update or delete on public.%I for each row execute function public.audit_registar()',
                v_tabela
            );
        end if;
    end loop;
end;
$$;

do $$
begin
    drop event trigger if exists trg_audit_nova_tabela;
    create event trigger trg_audit_nova_tabela on ddl_command_end
        when tag in ('CREATE TABLE')
        execute function public.audit_ao_criar_tabela();
exception when insufficient_privilege then
    raise notice 'Sem permissão para event triggers: depois de criar tabelas novas, corra select public.audit_ativar();';
end;
$$;

-- ---------------------------------------------------------------------
-- Eventos da aplicação (login, logout, exportações…)
-- ---------------------------------------------------------------------
create or replace function public.registar_evento(p_acao text, p_detalhes jsonb default '{}'::jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_email text;
begin
    if auth.uid() is null then
        return;
    end if;
    begin
        v_email := nullif(auth.jwt() ->> 'email', '');
    exception when others then
        v_email := null;
    end;
    insert into public.audit_log (user_id, user_email, operacao, acao, detalhes)
    values (auth.uid(), v_email, 'EVENTO', left(coalesce(nullif(trim(p_acao), ''), 'evento'), 80), public.audit_mascarar(coalesce(p_detalhes, '{}'::jsonb)));
end;
$$;

revoke all on function public.registar_evento(text, jsonb) from public, anon;
grant execute on function public.registar_evento(text, jsonb) to authenticated;

-- ---------------------------------------------------------------------
-- Limpeza de registos antigos (por omissão, mais de 2 anos)
--   select public.audit_limpar(730);
--   Para automatizar (com pg_cron ativo):
--   select cron.schedule('audit-limpeza', '0 3 1 * *', $c$select public.audit_limpar(730)$c$);
-- ---------------------------------------------------------------------
create or replace function public.audit_limpar(p_dias integer default 730)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
    n integer;
begin
    delete from public.audit_log where created_at < now() - make_interval(days => greatest(p_dias, 30));
    get diagnostics n = row_count;
    return n;
end;
$$;

revoke all on function public.audit_limpar(integer) from public, anon, authenticated;
