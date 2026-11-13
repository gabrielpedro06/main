-- =====================================================================
-- MARKETING: paridade com o "Fluxo de Conteúdos" do Notion
--  * formato / objetivo / estrategia / editoria / pilar passam a listas (text[])
--    (os valores atuais são preservados como lista de 1 elemento)
--  * vários responsáveis (responsavel_ids), mantendo responsavel_id = o 1.º
--  * campanha / série, CTA 2, variações da ideia, notas livres e anexos (ficheiros)
--  * novo estado "criacao" (Programação → Criação)
-- =====================================================================

alter table public.marketing_conteudos
    alter column formato drop default,
    alter column formato type text[] using (case when coalesce(trim(formato), '') = '' then '{}'::text[] else array[formato] end),
    alter column formato set default '{}',
    alter column objetivo type text[] using (case when coalesce(trim(objetivo), '') = '' then '{}'::text[] else array[objetivo] end),
    alter column objetivo set default '{}',
    alter column estrategia type text[] using (case when coalesce(trim(estrategia), '') = '' then '{}'::text[] else array[estrategia] end),
    alter column estrategia set default '{}',
    alter column editoria type text[] using (case when coalesce(trim(editoria), '') = '' then '{}'::text[] else array[editoria] end),
    alter column editoria set default '{}',
    alter column pilar type text[] using (case when coalesce(trim(pilar), '') = '' then '{}'::text[] else array[pilar] end),
    alter column pilar set default '{}';

update public.marketing_conteudos set formato = '{}' where formato is null;
update public.marketing_conteudos set objetivo = '{}' where objetivo is null;
update public.marketing_conteudos set estrategia = '{}' where estrategia is null;
update public.marketing_conteudos set editoria = '{}' where editoria is null;
update public.marketing_conteudos set pilar = '{}' where pilar is null;

alter table public.marketing_conteudos
    alter column formato set not null,
    alter column objetivo set not null,
    alter column estrategia set not null,
    alter column editoria set not null,
    alter column pilar set not null;

alter table public.marketing_conteudos
    add column if not exists responsavel_ids uuid[] not null default '{}',
    add column if not exists campanha text,
    add column if not exists cta_2 text,
    add column if not exists variacoes text,
    add column if not exists notas text,
    add column if not exists anexos jsonb not null default '[]'::jsonb;  -- [{ nome, url, caminho, tipo, tamanho, categoria: briefing|design|outro }]

update public.marketing_conteudos
set responsavel_ids = array[responsavel_id]
where responsavel_id is not null and cardinality(responsavel_ids) = 0;

create index if not exists idx_marketing_conteudos_campanha
    on public.marketing_conteudos (marca_id, campanha);

alter table public.marketing_conteudos drop constraint if exists marketing_conteudos_estado_chk;
alter table public.marketing_conteudos
    add constraint marketing_conteudos_estado_chk check (estado in (
        'ideia', 'curadoria', 'briefing', 'producao', 'criacao', 'aprovacao',
        'agendado', 'publicado', 'monitorado', 'arquivado'
    ));
