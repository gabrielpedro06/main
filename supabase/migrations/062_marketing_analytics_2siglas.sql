-- =====================================================================
-- MARKETING: Analytics por canal (equivalente à base "Analytics" do Notion)
--  * novo tipo de recurso "metrica": uma linha por métrica, canal e período
--      titulo = métrica · estado = período (mensal/semanal/trimestral/anual)
--      data = data do apuramento · dados: canal, tipo_metrica, valor, meta,
--      variacao (% vs período anterior; negativo = queda), url, analise
--  * 2Siglas: as 6 métricas de 9 set 2026 e o link do Data Studio
-- Idempotente.
-- =====================================================================

alter table public.marketing_recursos drop constraint if exists marketing_recursos_tipo_chk;
alter table public.marketing_recursos
    add constraint marketing_recursos_tipo_chk
    check (tipo in ('oferta', 'turma', 'campanha', 'lead', 'metrica', 'ativo', 'facto', 'regra', 'canal'));

-- Métricas de 9 set 2026 (export "2Siglas Analytics · Redes Sociais")
insert into public.marketing_recursos (marca_id, tipo, titulo, estado, data, dados, ordem)
select m.id, 'metrica', v.titulo, 'mensal', date '2026-09-09', v.dados::jsonb, v.ordem
from public.marketing_marcas m
cross join (values
    ('Alcance',                   '{"canal":"Instagram","tipo_metrica":"Tráfego","valor":540,"variacao":94.9,"url":"","analise":"Ficheiro no Notion: Alcance.png"}', 1),
    ('Visualizações',             '{"canal":"Instagram","tipo_metrica":"Impressões","valor":1600,"variacao":110.8,"analise":"1.625 visualizações no Instagram, 0 no Facebook. Ficheiro no Notion: Visualizaes_(3).png"}', 2),
    ('Interações com o conteúdo', '{"canal":"Instagram","tipo_metrica":"Engajamento","valor":87,"variacao":171.9,"analise":"Ficheiro no Notion: Interao_(2).png"}', 3),
    ('Visitas ao perfil',         '{"canal":"Instagram","tipo_metrica":"Tráfego","valor":25,"variacao":-19.4,"analise":"Ficheiro no Notion: Visitas.png"}', 4),
    ('Interações com o conteúdo', '{"canal":"Facebook","tipo_metrica":"Engajamento","valor":58,"variacao":38.1,"analise":"Ficheiro no Notion: Interao.png"}', 5),
    ('Novos seguidores',          '{"canal":"Facebook","tipo_metrica":"Seguidores","valor":5,"variacao":25,"analise":"Ficheiro no Notion: Novos_seguidores.png"}', 6)
) as v(titulo, dados, ordem)
where lower(m.nome) = '2siglas'
  and not exists (
      select 1 from public.marketing_recursos r
      where r.marca_id = m.id and r.tipo = 'metrica' and r.titulo = v.titulo
        and r.data = date '2026-09-09' and r.dados->>'canal' = v.dados::jsonb->>'canal'
  );

-- Relatório Data Studio como ativo
insert into public.marketing_recursos (marca_id, tipo, titulo, estado, dados, ordem)
select m.id, 'ativo', 'Relatório Data Studio (Looker Studio)', 'aprovado',
       '{"categoria":"Documento","url":"https://datastudio.google.com/embed/reporting/68ad1442-3ed8-473a-8712-f1f8973a4788/page/kIV1C","notas":"Painel de métricas das redes. Registar os valores mensais em Recursos → Métricas."}'::jsonb,
       9
from public.marketing_marcas m
where lower(m.nome) = '2siglas'
  and not exists (
      select 1 from public.marketing_recursos r
      where r.marca_id = m.id and r.tipo = 'ativo' and r.dados->>'url' like '%datastudio.google.com%'
  );
