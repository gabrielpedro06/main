-- =====================================================================
-- Seguimento do estado do projeto (estilo "estado da encomenda")
--  * public.projetos_estado_historico: uma linha por cada mudança de
--    estado de um projeto (quem, quando, de que estado para que estado).
--  * Preenchida automaticamente por trigger em public.projetos.
--  * Visível a quem consegue ver o projeto (respeita o RLS de projetos).
--  * Recupera o histórico já existente (data de criação + audit_log).
-- Idempotente.
-- =====================================================================

create table if not exists public.projetos_estado_historico (
    id bigint generated always as identity primary key,
    projeto_id uuid not null references public.projetos(id) on delete cascade,
    estado_anterior text,
    estado_novo text not null,
    user_id uuid references public.profiles(id) on delete set null,
    nota text,
    created_at timestamptz not null default now()
);

create index if not exists idx_proj_estado_hist_projeto
    on public.projetos_estado_historico (projeto_id, created_at);

alter table public.projetos_estado_historico enable row level security;

drop policy if exists proj_estado_hist_select on public.projetos_estado_historico;
create policy proj_estado_hist_select
on public.projetos_estado_historico for select
using (exists (select 1 from public.projetos p where p.id = projeto_id));
-- Sem políticas de escrita: só o trigger (security definer) escreve.

-- ---------------------------------------------------------------------
-- Trigger: regista a criação e cada mudança de estado
-- ---------------------------------------------------------------------
create or replace function public.projetos_registar_estado()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    if tg_op = 'INSERT' then
        insert into public.projetos_estado_historico (projeto_id, estado_anterior, estado_novo, user_id, created_at)
        values (new.id, null, coalesce(new.estado::text, 'pendente'), auth.uid(), coalesce(new.created_at, now()));
    elsif new.estado::text is distinct from old.estado::text then
        insert into public.projetos_estado_historico (projeto_id, estado_anterior, estado_novo, user_id)
        values (new.id, old.estado::text, coalesce(new.estado::text, 'pendente'), auth.uid());
    end if;
    return new;
exception when others then
    raise warning 'projetos_registar_estado: %', sqlerrm;
    return new;
end;
$$;

drop trigger if exists trg_projetos_estado_hist on public.projetos;
create trigger trg_projetos_estado_hist
after insert or update of estado on public.projetos
for each row execute function public.projetos_registar_estado();

-- ---------------------------------------------------------------------
-- Recuperar histórico (só para projetos que ainda não têm nenhum)
-- ---------------------------------------------------------------------
do $$
declare
    p record;
    a record;
    v_ultimo text;
begin
    for p in
        select pr.id, pr.estado::text as estado, pr.created_at, pr.responsavel_id
          from public.projetos pr
         where not exists (select 1 from public.projetos_estado_historico h where h.projeto_id = pr.id)
    loop
        -- 1) Criação: estado inicial = primeiro "antes" registado no audit_log, senão o estado atual
        select coalesce(
                   (select l.dados_antes ->> 'estado'
                      from public.audit_log l
                     where l.tabela = 'projetos' and l.operacao = 'UPDATE'
                       and l.registo_id = p.id::text and 'estado' = any (l.campos_alterados)
                     order by l.created_at asc limit 1),
                   p.estado, 'pendente')
          into v_ultimo;

        insert into public.projetos_estado_historico (projeto_id, estado_anterior, estado_novo, user_id, created_at)
        values (p.id, null, v_ultimo, p.responsavel_id, coalesce(p.created_at, now()));

        -- 2) Mudanças já registadas no audit_log
        for a in
            select l.created_at, l.user_id, l.dados_antes ->> 'estado' as antes, l.dados_depois ->> 'estado' as depois
              from public.audit_log l
             where l.tabela = 'projetos' and l.operacao = 'UPDATE'
               and l.registo_id = p.id::text and 'estado' = any (l.campos_alterados)
             order by l.created_at asc
        loop
            insert into public.projetos_estado_historico (projeto_id, estado_anterior, estado_novo, user_id, created_at)
            values (p.id, a.antes, coalesce(a.depois, 'pendente'),
                    case when exists (select 1 from public.profiles pf where pf.id = a.user_id) then a.user_id end,
                    a.created_at);
            v_ultimo := coalesce(a.depois, v_ultimo);
        end loop;

        -- 3) Se o estado atual não bate com o último conhecido, regista-o (data desconhecida)
        if coalesce(p.estado, 'pendente') is distinct from v_ultimo then
            insert into public.projetos_estado_historico (projeto_id, estado_anterior, estado_novo, nota, created_at)
            values (p.id, v_ultimo, coalesce(p.estado, 'pendente'), 'data_aproximada', coalesce(p.created_at, now()) + interval '1 second');
        end if;
    end loop;
end;
$$;

select count(*) as projetos_com_historico from (select distinct projeto_id from public.projetos_estado_historico) x;
