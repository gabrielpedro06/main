-- =====================================================================
-- MARKETING: novo fluxo de conteúdos + circuito de aprovação
--  Fluxo: Briefing → Curadoria → Criação → Revisão → Aprovação →
--         Alterações necessárias → Agendamento/Programação →
--         Publicado/Agendado → (Arquivado)
--  * estados antigos: producao → programacao · agendado → publicado ·
--    monitorado → publicado (os resultados ficam na própria peça)
--  * aprovação: aprovadores escolhidos por peça, histórico de decisões
--  * notificações (notificacoes_projetos) ligadas à peça (conteudo_id)
-- Idempotente.
-- =====================================================================

alter table public.marketing_conteudos drop constraint if exists marketing_conteudos_estado_chk;

update public.marketing_conteudos set estado = 'programacao' where estado = 'producao';
update public.marketing_conteudos set estado = 'publicado' where estado in ('agendado', 'monitorado');
update public.marketing_conteudos set estado_antes_arquivo = 'programacao' where estado_antes_arquivo = 'producao';
update public.marketing_conteudos set estado_antes_arquivo = 'publicado' where estado_antes_arquivo in ('agendado', 'monitorado');

alter table public.marketing_conteudos
    add constraint marketing_conteudos_estado_chk check (estado in (
        'ideia', 'briefing', 'curadoria', 'criacao', 'revisao', 'aprovacao',
        'alteracoes', 'programacao', 'publicado', 'arquivado'
    ));

-- Aprovação
alter table public.marketing_conteudos
    add column if not exists aprovadores uuid[] not null default '{}',
    add column if not exists enviado_aprovacao_por uuid references public.profiles(id) on delete set null,
    add column if not exists enviado_aprovacao_em timestamptz,
    -- [{ tipo: 'enviado'|'aprovado'|'alteracoes', por: uuid, em: timestamptz, texto: text }]
    add column if not exists historico_aprovacao jsonb not null default '[]'::jsonb;

-- Notificações ligadas a uma peça de marketing
alter table public.notificacoes_projetos
    add column if not exists conteudo_id uuid references public.marketing_conteudos(id) on delete cascade;

create index if not exists idx_notificacoes_projetos_conteudo_id
    on public.notificacoes_projetos (conteudo_id);
