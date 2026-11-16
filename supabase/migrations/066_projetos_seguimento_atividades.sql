-- =====================================================================
-- Seguimento do projeto: passa a registar também as atividades e tarefas
--  * Acrescenta a projetos_estado_historico: tipo (projeto|atividade|tarefa),
--    item_id, item_titulo e atividade_titulo.
--  * Triggers em atividades e tarefas registam cada mudança de estado
--    (concluída, reaberta, em curso, em análise…).
--  * Recupera o histórico: audit_log + datas de conclusão das tarefas.
-- Correr DEPOIS da 065. Idempotente.
-- =====================================================================

alter table public.projetos_estado_historico
    add column if not exists tipo text not null default 'projeto',
    add column if not exists item_id uuid,
    add column if not exists item_titulo text,
    add column if not exists atividade_titulo text;

create index if not exists idx_proj_estado_hist_item
    on public.projetos_estado_historico (tipo, item_id);

-- ---------------------------------------------------------------------
-- Trigger em atividades
-- ---------------------------------------------------------------------
create or replace function public.atividades_registar_estado()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    if new.projeto_id is null or new.estado::text is not distinct from old.estado::text then
        return new;
    end if;
    insert into public.projetos_estado_historico
        (projeto_id, tipo, item_id, item_titulo, estado_anterior, estado_novo, user_id)
    values
        (new.projeto_id, 'atividade', new.id, new.titulo, old.estado::text, coalesce(new.estado::text, 'pendente'), auth.uid());
    return new;
exception when others then
    raise warning 'atividades_registar_estado: %', sqlerrm;
    return new;
end;
$$;

drop trigger if exists trg_atividades_estado_hist on public.atividades;
create trigger trg_atividades_estado_hist
after update of estado on public.atividades
for each row execute function public.atividades_registar_estado();

-- ---------------------------------------------------------------------
-- Trigger em tarefas
-- ---------------------------------------------------------------------
create or replace function public.tarefas_registar_estado()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    v_proj uuid;
    v_ativ text;
begin
    if new.estado::text is not distinct from old.estado::text then
        return new;
    end if;
    select a.projeto_id, a.titulo into v_proj, v_ativ
      from public.atividades a where a.id = new.atividade_id;
    if v_proj is null then
        return new;
    end if;
    insert into public.projetos_estado_historico
        (projeto_id, tipo, item_id, item_titulo, atividade_titulo, estado_anterior, estado_novo, user_id)
    values
        (v_proj, 'tarefa', new.id, new.titulo, v_ativ, old.estado::text, coalesce(new.estado::text, 'pendente'), auth.uid());
    return new;
exception when others then
    raise warning 'tarefas_registar_estado: %', sqlerrm;
    return new;
end;
$$;

drop trigger if exists trg_tarefas_estado_hist on public.tarefas;
create trigger trg_tarefas_estado_hist
after update of estado on public.tarefas
for each row execute function public.tarefas_registar_estado();

-- ---------------------------------------------------------------------
-- Recuperar histórico (só itens que ainda não têm nenhum evento)
-- ---------------------------------------------------------------------

-- Atividades: mudanças registadas no audit_log
insert into public.projetos_estado_historico
    (projeto_id, tipo, item_id, item_titulo, estado_anterior, estado_novo, user_id, created_at)
select a.projeto_id, 'atividade', a.id, a.titulo,
       l.dados_antes ->> 'estado', coalesce(l.dados_depois ->> 'estado', 'pendente'),
       case when exists (select 1 from public.profiles pf where pf.id = l.user_id) then l.user_id end,
       l.created_at
  from public.audit_log l
  join public.atividades a on a.id::text = l.registo_id
 where l.tabela = 'atividades' and l.operacao = 'UPDATE'
   and 'estado' = any (l.campos_alterados)
   and a.projeto_id is not null
   and not exists (select 1 from public.projetos_estado_historico h where h.tipo = 'atividade' and h.item_id = a.id);

-- Tarefas: mudanças registadas no audit_log
insert into public.projetos_estado_historico
    (projeto_id, tipo, item_id, item_titulo, atividade_titulo, estado_anterior, estado_novo, user_id, created_at)
select a.projeto_id, 'tarefa', t.id, t.titulo, a.titulo,
       l.dados_antes ->> 'estado', coalesce(l.dados_depois ->> 'estado', 'pendente'),
       case when exists (select 1 from public.profiles pf where pf.id = l.user_id) then l.user_id end,
       l.created_at
  from public.audit_log l
  join public.tarefas t on t.id::text = l.registo_id
  join public.atividades a on a.id = t.atividade_id
 where l.tabela = 'tarefas' and l.operacao = 'UPDATE'
   and 'estado' = any (l.campos_alterados)
   and a.projeto_id is not null
   and not exists (select 1 from public.projetos_estado_historico h where h.tipo = 'tarefa' and h.item_id = t.id);

-- Tarefas concluídas antes dos registos: usa a data de conclusão
insert into public.projetos_estado_historico
    (projeto_id, tipo, item_id, item_titulo, atividade_titulo, estado_anterior, estado_novo, user_id, created_at)
select a.projeto_id, 'tarefa', t.id, t.titulo, a.titulo, null, 'concluido', null, t.data_conclusao
  from public.tarefas t
  join public.atividades a on a.id = t.atividade_id
 where t.estado::text = 'concluido'
   and t.data_conclusao is not null
   and a.projeto_id is not null
   and not exists (select 1 from public.projetos_estado_historico h where h.tipo = 'tarefa' and h.item_id = t.id);

-- Atividades concluídas antes dos registos: data aproximada = última tarefa concluída
insert into public.projetos_estado_historico
    (projeto_id, tipo, item_id, item_titulo, estado_anterior, estado_novo, nota, created_at)
select a.projeto_id, 'atividade', a.id, a.titulo, null, 'concluido', 'data_aproximada', x.ultima
  from public.atividades a
  join lateral (
        select max(t.data_conclusao) as ultima
          from public.tarefas t
         where t.atividade_id = a.id and t.data_conclusao is not null
       ) x on x.ultima is not null
 where a.estado::text = 'concluido'
   and a.projeto_id is not null
   and not exists (select 1 from public.projetos_estado_historico h where h.tipo = 'atividade' and h.item_id = a.id);

select tipo, count(*) from public.projetos_estado_historico group by tipo order by tipo;
