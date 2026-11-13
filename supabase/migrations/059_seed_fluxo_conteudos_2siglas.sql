-- =============================================================================
-- 059 · Fluxo de Conteúdos da 2Siglas (export do Notion, 64 registos)
-- Gerado a partir do CSV do Notion com o mesmo mapeamento do botão Importar.
-- Estados: monitorado 31, publicado 7, curadoria 1, ideia 6, arquivado 2, agendado 3, producao 1, briefing 8, aprovacao 5
--  · Status do Notion → etapa do fluxo (Programação → producao, Monitorado → monitorado, …)
--  · Tema/Assunto 1 → campanha · Data de Entrega, Data Publicação e Data II · links do Canva/Drive
--  · Anexos do Notion ficam listados como "por carregar" (o ficheiro tem de ser carregado no Bizin)
-- Personas ligadas pelo papel (marketing_personas da 2Siglas, migração 054).
-- Responsáveis ligados pelo primeiro nome em profiles (Valéria, Mafalda, Catarina, Pedro), se existirem.
-- Idempotente: não volta a inserir um registo com o mesmo título + headline na 2Siglas.
-- Requer 052–057. Se a marca 2Siglas não existir, não insere nada.
-- =============================================================================

begin;

-- 1. Eclipse Solar 12.08.2026
insert into public.marketing_conteudos
    (marca_id, ordem, persona_ids, responsavel_ids, responsavel_id, titulo, estado, headline, conceito, cta, canais, formato, estrategia, editoria, hashtags, copies, links, data_publicacao)
select m.id, extract(epoch from now()) + 0,
       '{}'::uuid[],
       r.ids, r.ids[1],
       'Eclipse Solar 12.08.2026',
       'monitorado',
       'Segurança em primeiro lugar',
       'Importância da Proteção na Observação do Eclipse Solar',
       '📢 Partilhe esta informação!A prevenção e a sensibilização são fundamentais paraa segurança de todos.',
       array['Facebook', 'Instagram']::text[],
       array['Feed único']::text[],
       array['Reconhecimento (awareness)']::text[],
       array['Informação', 'Notícias']::text[],
       array['#2Siglas', '#SegurançaNoTrabalho', '#EclipseSolar', '#Faro', '#SaúdeeSegurança']::text[],
       '[{"titulo":"Copy 1","texto":"Hoje, dia 12 de agosto de 2026, Portugal terá aoportunidade de observar um fenómeno raro: umeclipse solar, que irá ocorrer entre as 18h30 e as 20h30.Em Faro, o acontecimento está previsto para as 19h38,altura em que se espera uma ocultação máxima decerca de 92,7% do disco solar.⚠️ Atenção! Para observar o eclipse em segurança,devem ser utilizados óculos próprios para eclipsessolares certificados de acordo com a norma ISO 12312-2.As empresas portuguesas também têm um papelfundamental na formação e informação dos seuscolaboradores para ressaltar a importância dessaproteção, sobretudo junto das equipas que necessitamde trabalhar ao ar livre durante este período.👀 Para a observação segura:• Coloque os óculos próprios para o eclipse antes deolhar para o Sol.• Desvie o olhar antes de retirar os óculos.📢 Partilhe esta informação!A prevenção e a sensibilização são fundamentais paraa segurança de todos.#2Siglas #EclipseSolar #SaúdeeSegurança #Faro#SegurançaNoTrabalho"}]'::jsonb,
       '[{"label":"Design 2","url":"https://canva.link/hesmkoxrfpxtle4"}]'::jsonb,
       '2026-08-12T13:15:00.000Z'
from public.marketing_marcas m
cross join lateral (select coalesce(array_agg(pr.id), '{}'::uuid[]) as ids from public.profiles pr
            where split_part(translate(lower(coalesce(pr.nome, '')), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc'), ' ', 1) = any(array['valeria']::text[])) r
where lower(m.nome) = '2siglas'
  and not exists (select 1 from public.marketing_conteudos x
                  where x.marca_id = m.id and x.titulo = 'Eclipse Solar 12.08.2026' and x.headline = 'Segurança em primeiro lugar');

-- 2. Sabia que… Temos a formação para cada momento da sua empresa
insert into public.marketing_conteudos
    (marca_id, ordem, persona_ids, responsavel_ids, responsavel_id, titulo, estado, headline, conceito, cta, canais, formato, estrategia, hashtags, copies, links, data_publicacao)
select m.id, extract(epoch from now()) + 1,
       '{}'::uuid[],
       r.ids, r.ids[1],
       'Sabia que… Temos a formação para cada momento da sua empresa',
       'monitorado',
       'Temos a formação para cada momento da sua empresa',
       'Editoria - Sabia que…',
       'Fale connosco:
289 821 753 | 912 852 135

🌐 Saiba mais sobre as formações no nosso site: http://www.2siglas.pt/',
       array['Facebook', 'Instagram']::text[],
       array['Reel / vídeo curto']::text[],
       array['Educação']::text[],
       array['#2Siglas', '#FormaçãoCertificada', '#Faro']::text[],
       '[{"titulo":"Copy 1","texto":"Investir em formação certificada permite à sua empresa crescer e inovar, através de novas ferramentas, que respondem às necessidades de competências e contribuem para melhorar o desempenho das suas equipas.\r\n\r\nOferecemos soluções de formação em diferentes áreas, em regime presencial ou online. Podemos também desenvolver formação à medida para as empresas.\r\n\r\nTemos formações em diferentes áreas:\r\n• Produção Agrícola\r\n • Desporto\r\n • Segurança e Higiene do Trabalho\r\n • Floricultura e Jardinagem\r\n • Desenvolvimento Pessoal\r\n • Comércio\r\n • Saúde\r\n • Marketing e Publicidade\r\n • Enquadramento na Organização/Empresa\r\n • Informática na Ótica do Utilizador\r\n\r\nPretende desenvolver um plano de formação contínua para os seus colaboradores? Ou tem uma necessidade específica no seu sector de atividade? \r\nFale connosco:\r\n289 821 753 | 912 852 135\r\n\r\n🌐 Saiba mais sobre as formações no nosso site: http://www.2siglas.pt/"}]'::jsonb,
       '[{"label":"Design 2","url":"https://canva.link/aso2sxxrn1v1d4m"}]'::jsonb,
       '2026-08-12T11:31:00.000Z'
from public.marketing_marcas m
cross join lateral (select coalesce(array_agg(pr.id), '{}'::uuid[]) as ids from public.profiles pr
            where split_part(translate(lower(coalesce(pr.nome, '')), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc'), ' ', 1) = any(array['valeria']::text[])) r
where lower(m.nome) = '2siglas'
  and not exists (select 1 from public.marketing_conteudos x
                  where x.marca_id = m.id and x.titulo = 'Sabia que… Temos a formação para cada momento da sua empresa' and x.headline = 'Temos a formação para cada momento da sua empresa');

-- 3. Curso Campanha Ibérica Alterações Climáticas
insert into public.marketing_conteudos
    (marca_id, ordem, persona_ids, responsavel_ids, responsavel_id, titulo, estado, prioridade, headline, conceito, cta, canais, formato, objetivo, estrategia, copies, links, anexos, data_publicacao, data_publicacao_2, data_entrega)
select m.id, extract(epoch from now()) + 2,
       coalesce((select array_agg(p.id order by p.ordem) from public.marketing_personas p
                  where p.marca_id = m.id and translate(lower(p.papel), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc') = any(array['gestor/influenciador', 'empregador/empresario', 'encarregado agricola']::text[])), '{}'::uuid[]),
       r.ids, r.ids[1],
       'Curso Campanha Ibérica Alterações Climáticas',
       'monitorado',
       'alta',
       'Novidade / Lançamento da formação “Campanha Ibérica Alterações Climáticas”',
       'Novidade desembalada agora - fora da caixa',
       'Contacte-nos para saber mais informações sobre esta formação e efetuar a sua inscrição:
📞 289 821 753 | 912 852 135',
       array['Blog', 'E-mail', 'Facebook', 'Instagram']::text[],
       array['Carrossel', 'Newsletter', 'Notícia', 'Reel / vídeo curto', 'Story']::text[],
       array['Lançamento']::text[],
       array['Consideração', 'Conversão']::text[],
       '[{"titulo":"Copy 1","texto":"Reels:\r\nPartimos para a ação e desenvolvemos esse novo curso em resposta à \"Campanha Ibérica Alterações Climáticas\", que prepara os profissionais para os desafios emergentes do calor e do frio extremos.\r\n\r\nUma formação online de autoaprendizagem, com 4 horas de duração, flexível e prática, que pode aceder pelo telemóvel, tablet ou computador, quando, como e onde quiser.\r\n\r\nO curso inicia em setembro e as inscrições já estão abertas.\r\n\r\nFale connosco:\r\n📞 289 821 753 | 912 852 135\r\n\r\n#2Siglas #NovaFormação #FormaçãoCertificada #CampanhaIbéricaAlteraçõesClimáticas #FormaçãoOnline"},{"titulo":"Copy 2","texto":"Carrossel:  Estão abertas as inscrições para o novo curso online “Campanha Ibérica Alterações Climáticas”. Essa formação 2Siglas foi desenvolvida para aceder de qualquer lugar, até do telemóvel. A proposta do curso é responder às necessidades emergentes das alterações climáticas que a campanha tem alertado. \r\n\r\nContacte-nos e saiba mais:\r\n📞 289 821 753 | 912 852 135\r\n\r\n#2Siglas #NovaFormação #FormaçãoCertificada #CampanhaIbéricaAlteraçõesClimáticas #FormaçãoOnline"},{"titulo":"Copy 4","texto":"Blog:\r\n\r\nLançamento da formação “Campanha Ibérica Alterações Climáticas”\r\n\r\nPartimos para ação em resposta à “Campanha Ibérica Alterações Climáticas” e desenvolvemos um novo curso online, que prepara os profissionais para os desafios emergentes do calor e frio extremos durante o trabalho.\r\n\r\nA formação é uma iniciativa prática para apoiar as empresas na orientação das suas equipas, com o objetivo de capacitar cada profissional a assegurar o seu próprio bem-estar no ambiente de trabalho.\r\n\r\nPrincipalmente, quem trabalha muito tempo ao ar livre sente os efeitos das mudanças climáticas. E, por isso, deve estar consciente da importância das medidas preventivas, saber o uso adequado dos EPIs, entre outras técnicas que permitam o reconhecimento rápido de sintomas relacionados à exposição a essas alterações climáticas.\r\n\r\nO curso é flexível, em regime de autoaprendizagem e pode ser acedido em diferentes dispositivos (telemóvel, tablet ou computador), como e onde o formando quiser.\r\n\r\nO lançamento está previsto para o início de setembro deste ano. As inscrições já estão abertas.\r\n\r\nContacte-nos para saber mais informações sobre esta formação e efetuar a sua inscrição:\r\n\r\n📞 289 821 753 | 912 852 135\r\n\r\n#FormaçãoCertificada #CampanhaIbéricaAlteraçõesClimáticas #FormaçãoOnline #LançamentodeCurso"}]'::jsonb,
       '[{"label":"Design 2","url":"https://canva.link/mh0qn2isph61ykt"}]'::jsonb,
       '[{"nome":"campaign_1_(5).pdf","url":"","categoria":"design"}]'::jsonb,
       '2026-08-20T14:00:00.000Z',
       '2026-08-26T16:00:00.000Z',
       '2026-08-18'
from public.marketing_marcas m
cross join lateral (select coalesce(array_agg(pr.id), '{}'::uuid[]) as ids from public.profiles pr
            where split_part(translate(lower(coalesce(pr.nome, '')), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc'), ' ', 1) = any(array['valeria']::text[])) r
where lower(m.nome) = '2siglas'
  and not exists (select 1 from public.marketing_conteudos x
                  where x.marca_id = m.id and x.titulo = 'Curso Campanha Ibérica Alterações Climáticas' and x.headline = 'Novidade / Lançamento da formação “Campanha Ibérica Alterações Climáticas”');

-- 4. Curso Arboricultura: escalada de árvores - nível 1 (1)
insert into public.marketing_conteudos
    (marca_id, ordem, persona_ids, responsavel_ids, responsavel_id, titulo, estado, prioridade, headline, conceito, cta, canais, formato, objetivo, estrategia, editoria, hashtags, copies, links, data_publicacao, data_publicacao_2)
select m.id, extract(epoch from now()) + 3,
       '{}'::uuid[],
       r.ids, r.ids[1],
       'Curso Arboricultura: escalada de árvores - nível 1 (1)',
       'monitorado',
       'media',
       'Curso Arboricultura: escalada de árvores - nível 1',
       'Agenda',
       'Vagas limitadas.
📩 Inscreva-se já através do nosso site ou contacte-nos:
📞 289 821 753 | 912 852 135',
       array['Facebook', 'Instagram']::text[],
       array['Feed único']::text[],
       array['Divulgação Agenda']::text[],
       array['Consideração', 'Conversão']::text[],
       array['Agenda']::text[],
       array['#2Siglas', '#Algarve', '#Arboricultura', '#EscaladaEmÁrvores', '#FormaçãoCertificada']::text[],
       '[{"titulo":"Copy 1","texto":"Os primeiros passos na arboricultura começam aqui connosco.\r\n\r\nEstão abertas as inscrições para a formação de Escalada em Árvores – Nível 1, em regime presencial.\r\n📍 Benafim e Vale Fuzeiros\r\n📅  6, 7, 8 e 9 de outubro\r\n⏱️ 28 horas\r\n\r\nEsta formação destina-se a quem pretende iniciar-se na área da arboricultura, pois permite adquirir conhecimentos técnicos e práticas seguras para o trabalho em altura, desenvolvendo competências fundamentais na movimentação e gestão de árvores, tanto em contexto urbano como rural.\r\n\r\nVagas limitadas.\r\n📩 Inscreva-se já através do nosso site ou contacte-nos:\r\n📞 289 821 753 | 912 852 135\r\n\r\n#Arboricultura #EscaladaEmÁrvores #FormaçãoCertificada  #Algarve #2Siglas"},{"titulo":"Copy 3","texto":"Segurança, técnica e prática: a base da arboricultura começa aqui connosco.\r\n\r\nAproveite que iniciamos o período de inscrições para a formação \"Escalada em Árvores – Nível 1\", em regime presencial.\r\n📍 Benafim e Vale Fuzeiros\r\n📅 6, 7, 8 e 9 de outubro\r\n⏱️ 28 horas\r\n\r\nDirigida a quem quer dar os primeiros passos na arboricultura, esta formação combina teoria e prática para garantir técnicas seguras de trabalho em altura, promovendo o desenvolvimento de competências essenciais na movimentação e gestão de árvores, seja em espaços urbanos ou rurais.\r\n\r\nVagas limitadas.\r\n📩 Inscreva-se já através do nosso site ou contacte-nos:\r\n📞 289 821 753 | 912 852 135\r\n\r\n#Arboricultura #EscaladaEmÁrvores #FormaçãoCertificada #Algarve #2Siglas"}]'::jsonb,
       '[{"label":"Design 2","url":"https://canva.link/c8wzvcbkh65gk71"}]'::jsonb,
       '2026-08-13T08:30:00.000Z',
       '2026-08-24T18:30:00.000Z'
from public.marketing_marcas m
cross join lateral (select coalesce(array_agg(pr.id), '{}'::uuid[]) as ids from public.profiles pr
            where split_part(translate(lower(coalesce(pr.nome, '')), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc'), ' ', 1) = any(array['valeria']::text[])) r
where lower(m.nome) = '2siglas'
  and not exists (select 1 from public.marketing_conteudos x
                  where x.marca_id = m.id and x.titulo = 'Curso Arboricultura: escalada de árvores - nível 1 (1)' and x.headline = 'Curso Arboricultura: escalada de árvores - nível 1');

-- 5. Competências que fazem a diferença
insert into public.marketing_conteudos
    (marca_id, ordem, persona_ids, responsavel_ids, responsavel_id, titulo, estado, prioridade, headline, conceito, cta, canais, formato, objetivo, estrategia, editoria, hashtags, copies, links, data_publicacao, data_entrega)
select m.id, extract(epoch from now()) + 4,
       coalesce((select array_agg(p.id order by p.ordem) from public.marketing_personas p
                  where p.marca_id = m.id and translate(lower(p.papel), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc') = any(array['profissional autonomo']::text[])), '{}'::uuid[]),
       r.ids, r.ids[1],
       'Competências que fazem a diferença',
       'monitorado',
       'media',
       'Modelo 1',
       'Importância da atualização para qual temos formação',
       '👉 Saiba mais no nosso site: https://www.canva.com/link?target=http%3A%2F%2Fwww.2siglas.pt&design=DAHSoohMA9U&accessRole=owner&linkSource=comment',
       array['Facebook', 'Instagram']::text[],
       array['Carrossel']::text[],
       array['Divulgação Promocional']::text[],
       array['Consideração']::text[],
       array['Soluções']::text[],
       array['#2Siglas', '#FormaçãoOnline', '#GestãodeTempo', '#ImagemProfissional', '#InteligênciaEmocional']::text[],
       '[{"titulo":"Copy 1","texto":"Quem deseja destacar-se no mercado de trabalho precisa de gerir constantemente as emoções, o tempo e a imagem que projeta.\r\n\r\n\r\nNa 2Siglas, preparámos 3 formações online para desenvolver as competências que realmente fazem a diferença:\r\n\r\n\r\n🧠 Inteligência Emocional — curso de autoaprendizagem para decidir com clareza e liderar com impacto.\r\n\r\n\r\n⏱️ Gestão de Tempo e do Stress — curso de autoaprendizagem para identificar prioridades e organizar o seu trabalho com equilíbrio.\r\n\r\n\r\n👔 Gestão da Imagem Pessoal e Organizacional — curso de autoaprendizagem com tutoria ativa (feedback do formador), que o capacita para transmitir credibilidade em cada interação.\r\n\r\n\r\nFormação certificada, 100% online, ao seu ritmo.\r\n\r\n\r\n👉 Saiba mais no nosso site: https://www.canva.com/link?target=http%3A%2F%2Fwww.2siglas.pt&design=DAHSoohMA9U&accessRole=owner&linkSource=comment\r\n\r\n\r\n#2Siglas #FormaçãoOnline #InteligênciaEmocional #GestãoDeTempo #ImagemProfissional"}]'::jsonb,
       '[{"label":"Design 2","url":"https://canva.link/jequ1hojze5z94o"}]'::jsonb,
       '2026-08-19T18:30:00.000Z',
       '2026-08-17'
from public.marketing_marcas m
cross join lateral (select coalesce(array_agg(pr.id), '{}'::uuid[]) as ids from public.profiles pr
            where split_part(translate(lower(coalesce(pr.nome, '')), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc'), ' ', 1) = any(array['valeria']::text[])) r
where lower(m.nome) = '2siglas'
  and not exists (select 1 from public.marketing_conteudos x
                  where x.marca_id = m.id and x.titulo = 'Competências que fazem a diferença' and x.headline = 'Modelo 1');

-- 6. Formação Online - Pacote 40 horas
insert into public.marketing_conteudos
    (marca_id, ordem, persona_ids, responsavel_ids, responsavel_id, titulo, estado, prioridade, briefing, canais, formato, objetivo, estrategia, copies, links, data_publicacao, data_entrega)
select m.id, extract(epoch from now()) + 5,
       coalesce((select array_agg(p.id order by p.ordem) from public.marketing_personas p
                  where p.marca_id = m.id and translate(lower(p.papel), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc') = any(array['empregador/empresario', 'gestor/influenciador']::text[])), '{}'::uuid[]),
       '{}'::uuid[], null::uuid,
       'Formação Online - Pacote 40 horas',
       'monitorado',
       'media',
       'Destacar a possibilidade da empresa de escolher cursos para completar as 40 horas de formação obrigatória, dentre as opções (confirmar) de formação online de autoaprendizagem disponíveis no site da 2Siglas. Valor por formando 210 euros (confirmar).',
       array['Facebook', 'Instagram']::text[],
       array['Carrossel', 'Reel / vídeo curto']::text[],
       array['Divulgação Promocional']::text[],
       array['Consideração']::text[],
       '[{"titulo":"Copy 1","texto":"Cumprir as 40 horas de formação contínua pode ser simples, flexível e adaptado às necessidades da sua empresa.Na 2Siglas.pt, pode escolher e combinar, entre as várias opções de formação de autoaprendizagem, em regime online, para construir um percurso formativo e completar as 40 horas anuais de formação obrigatória.📚 Escolha os cursos.🔗 Combine diferentes formações.💻 Aprenda online, ao seu ritmo.✅ Complete as 40 horas de formação contínua.Valor por formando: 210 € Consulte as opções disponíveis no nosso site: www.2Siglas.ptEncontre a combinação de cursos certa para a sua equipa.#2Siglas #FormaçãoProfissional #FormaçãoContínua #formaçãoobrigatória #FormaçãoOnline #Faro"}]'::jsonb,
       '[{"label":"Design 1","url":"https://canva.link/sulr4y6b667l9fa"},{"label":"Design 2","url":"https://canva.link/70shh0oceo9e9n8"}]'::jsonb,
       '2026-09-04T14:20:00.000Z',
       '2026-08-28'
from public.marketing_marcas m
where lower(m.nome) = '2siglas'
  and not exists (select 1 from public.marketing_conteudos x
                  where x.marca_id = m.id and x.titulo = 'Formação Online - Pacote 40 horas' and x.headline is null);

-- 7. Temos a formação para cada momento da sua empresa
insert into public.marketing_conteudos
    (marca_id, ordem, persona_ids, responsavel_ids, responsavel_id, titulo, estado, canais, formato, estrategia, editoria, data_publicacao)
select m.id, extract(epoch from now()) + 6,
       '{}'::uuid[],
       r.ids, r.ids[1],
       'Temos a formação para cada momento da sua empresa',
       'monitorado',
       array['Facebook', 'Instagram']::text[],
       array['Reel / vídeo curto', 'Story']::text[],
       array['Reconhecimento (awareness)']::text[],
       array['Educação']::text[],
       '2026-08-12T11:31:00.000Z'
from public.marketing_marcas m
cross join lateral (select coalesce(array_agg(pr.id), '{}'::uuid[]) as ids from public.profiles pr
            where split_part(translate(lower(coalesce(pr.nome, '')), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc'), ' ', 1) = any(array['valeria']::text[])) r
where lower(m.nome) = '2siglas'
  and not exists (select 1 from public.marketing_conteudos x
                  where x.marca_id = m.id and x.titulo = 'Temos a formação para cada momento da sua empresa' and x.headline is null);

-- 8. Curso Estilos e tipologias no boxe competitivo
insert into public.marketing_conteudos
    (marca_id, ordem, persona_ids, responsavel_ids, responsavel_id, titulo, estado, headline, conceito, cta, canais, formato, objetivo, estrategia, editoria, hashtags, copies, links, data_publicacao)
select m.id, extract(epoch from now()) + 7,
       '{}'::uuid[],
       r.ids, r.ids[1],
       'Curso Estilos e tipologias no boxe competitivo',
       'monitorado',
       'Curso Estilos e tipologias no boxe competitivo',
       'Agenda',
       'Garanta a sua vaga e invista na sua valorização profissional enquanto treinador.
📩 Inscreva-se já através do nosso site ou contacte-nos:
📞 289 821 753 | 912 852 135',
       array['Facebook', 'Instagram']::text[],
       array['Feed único']::text[],
       array['Divulgação Agenda']::text[],
       array['Consideração', 'Conversão']::text[],
       array['Agenda']::text[],
       array['#2Siglas', '#BoxeCompetitivo', '#FormaçãoCertificada', '#Lisboa', '#Treinadores']::text[],
       '[{"titulo":"Copy 1","texto":"Domine diferentes técnicas para treinar campeões.\r\n\r\nAproveite que estamos com inscrições abertas para a formação \"Estilos e Tipologias no Boxe Competitivo\", em regime presencial.\r\n📍 Lisboa\r\n🗓️ 19 e 20 de setembro\r\n⏱️ 15 horas\r\n✔️ Certificação com atribuição de 3 UCs (Unidades de Crédito)\r\n\r\nDestinada a treinadores de boxe, esta formação permite aprofundar o conhecimento sobre os diferentes estilos e tipologias no boxe competitivo, contribuindo para uma orientação técnica e estratégica mais eficaz dos atletas.\r\n\r\nGaranta a sua vaga e invista na sua valorização profissional enquanto treinador.\r\n\r\n📩 Inscreva-se já através do nosso site ou contacte-nos:\r\n📞 289 821 753 | 912 852 135\r\n\r\n#FormaçãoCertificada #Treinadores #BoxeCompetitivo #Lisboa #2Siglas"}]'::jsonb,
       '[{"label":"Design 2","url":"https://canva.link/c8wzvcbkh65gk71"}]'::jsonb,
       '2026-08-12T19:30:00.000Z'
from public.marketing_marcas m
cross join lateral (select coalesce(array_agg(pr.id), '{}'::uuid[]) as ids from public.profiles pr
            where split_part(translate(lower(coalesce(pr.nome, '')), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc'), ' ', 1) = any(array['valeria']::text[])) r
where lower(m.nome) = '2siglas'
  and not exists (select 1 from public.marketing_conteudos x
                  where x.marca_id = m.id and x.titulo = 'Curso Estilos e tipologias no boxe competitivo' and x.headline = 'Curso Estilos e tipologias no boxe competitivo');

-- 9. Cuidar da equipa é prioridade
insert into public.marketing_conteudos
    (marca_id, ordem, persona_ids, responsavel_ids, responsavel_id, titulo, estado, headline, conceito, cta, canais, formato, estrategia, editoria, copies, links, data_publicacao)
select m.id, extract(epoch from now()) + 8,
       '{}'::uuid[],
       r.ids, r.ids[1],
       'Cuidar da equipa é prioridade',
       'monitorado',
       'Cuidar da equipe é prioridade',
       'Notícia Campanha Ibérica Alterações Climáticas',
       'Invista na formação da sua equipa.Contacte-nos: 289 821 753 | 912 852 135',
       array['Facebook', 'Instagram']::text[],
       array['Feed único']::text[],
       array['Consideração']::text[],
       array['Informação']::text[],
       '[{"titulo":"Copy 1","texto":"Na 2Siglas, oferecemos a formação dedicada à proteção de quem trabalha exposto aos efeitos climáticos.Entre as orientações dirigidas aos empregadores e gestores da \"Campanha Ibérica Alterações Climáticas\" , está a importância de formar e informar os trabalhadores para que possam reconhecer sintomas e saber como agir. A Saúde e Segurança no Trabalho (SST) deve ser uma prioridade na gestão das equipas, sobretudo perante riscos emergentes.Saiba mais sobre a \"Campanha Ibérica Alterações Climáticas\" em: http://portal.act.gov.pt/?fbclid=IwcGRvZgRleHRuA2FlbQIxMABzcnRjBmFwcF9pZA81MTQ3NzE1NjkyMjgwNjEAAR4u2UPTVi4ab5RWjdnCBYHh8jtd-85INpEXBsg9yR0UZfiKXM_iddKOgrinxw_aem_USZdJZErjB_3QYgVzMmy8Q  Informar é prevenir. Formar é proteger. Por isso, invista na formação da sua equipa.Contacte-nos: 289 821 753 | 912 852 135"}]'::jsonb,
       '[{"label":"Design 2","url":"https://canva.link/hesmkoxrfpxtle4"}]'::jsonb,
       '2026-08-11T16:33:00.000Z'
from public.marketing_marcas m
cross join lateral (select coalesce(array_agg(pr.id), '{}'::uuid[]) as ids from public.profiles pr
            where split_part(translate(lower(coalesce(pr.nome, '')), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc'), ' ', 1) = any(array['valeria']::text[])) r
where lower(m.nome) = '2siglas'
  and not exists (select 1 from public.marketing_conteudos x
                  where x.marca_id = m.id and x.titulo = 'Cuidar da equipa é prioridade' and x.headline = 'Cuidar da equipe é prioridade');

-- 10. Curso Conduzir e operar um trator em segurança
insert into public.marketing_conteudos
    (marca_id, ordem, persona_ids, responsavel_ids, responsavel_id, titulo, estado, headline, conceito, cta, canais, formato, objetivo, estrategia, editoria, hashtags, copies, links, data_publicacao)
select m.id, extract(epoch from now()) + 9,
       '{}'::uuid[],
       r.ids, r.ids[1],
       'Curso Conduzir e operar um trator em segurança',
       'monitorado',
       'Curso Conduzir e operar um trator em segurança',
       'Agenda',
       '📩 Inscreva-se já através do nosso site ou contacte-nos:
📞 289 821 753 | 912 852 135',
       array['Facebook', 'Instagram']::text[],
       array['Feed único']::text[],
       array['Divulgação Agenda']::text[],
       array['Consideração', 'Conversão']::text[],
       array['Agenda']::text[],
       array['#2Siglas', '#Algarve', '#CondutorDeTrator', '#FormaçãoCertificada', '#SegurançaNoTrabalho']::text[],
       '[{"titulo":"Copy 1","texto":"Ganhe mais autonomia e mais segurança para trabalhar com tratores.\r\n\r\nAproveite que estamos com inscrições abertas para a formação \"Conduzir e Operar um Trator em Segurança (COTS)\", em regime presencial.\r\n📍 Almancil\r\n🗓️ Setembro\r\n⏱️ 35 horas | das 9h às 17h\r\n\r\nDestinada a todos os que conduzem ou pretendem conduzir veículos agrícolas, esta formação prepara os formandos para uma condução mais consciente, eficiente e segura, em conformidade com a legislação em vigor, através de uma aprendizagem prática e orientada para a segurança.\r\n\r\nGaranta a sua vaga e assegure que cumpre todos os requisitos legais para conduzir veículos agrícolas com confiança e segurança.\r\n\r\n📩 Inscreva-se já através do nosso site ou contacte-nos:\r\n📞 289 821 753 | 912 852 135\r\n\r\n#CondutorDeTrator #SegurançaNoTrabalho #FormaçãoCertificada #2Siglas #Algarve"}]'::jsonb,
       '[{"label":"Design 2","url":"https://canva.link/c8wzvcbkh65gk71"}]'::jsonb,
       '2026-08-13T14:00:00.000Z'
from public.marketing_marcas m
cross join lateral (select coalesce(array_agg(pr.id), '{}'::uuid[]) as ids from public.profiles pr
            where split_part(translate(lower(coalesce(pr.nome, '')), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc'), ' ', 1) = any(array['valeria']::text[])) r
where lower(m.nome) = '2siglas'
  and not exists (select 1 from public.marketing_conteudos x
                  where x.marca_id = m.id and x.titulo = 'Curso Conduzir e operar um trator em segurança' and x.headline = 'Curso Conduzir e operar um trator em segurança');

-- 11. Curso Arboricultura: escalada de árvores - nível 1
insert into public.marketing_conteudos
    (marca_id, ordem, persona_ids, responsavel_ids, responsavel_id, titulo, estado, headline, conceito, cta, canais, formato, objetivo, estrategia, editoria, hashtags, copies, links, data_publicacao, data_publicacao_2)
select m.id, extract(epoch from now()) + 10,
       '{}'::uuid[],
       r.ids, r.ids[1],
       'Curso Arboricultura: escalada de árvores - nível 1',
       'monitorado',
       'Curso Arboricultura: escalada de árvores - nível 1',
       'Agenda',
       'Vagas limitadas.
📩 Inscreva-se já através do nosso site ou contacte-nos:
📞 289 821 753 | 912 852 135',
       array['Facebook', 'Instagram']::text[],
       array['Feed único']::text[],
       array['Divulgação Agenda']::text[],
       array['Consideração', 'Conversão']::text[],
       array['Agenda']::text[],
       array['#2Siglas', '#Algarve', '#Arboricultura', '#EscaladaEmÁrvores', '#FormaçãoCertificada']::text[],
       '[{"titulo":"Copy 1","texto":"Os primeiros passos na arboricultura começam aqui connosco.\r\n\r\nEstão abertas as inscrições para a formação de Escalada em Árvores – Nível 1, em regime presencial.\r\n📍 Benafim e Vale Fuzeiros\r\n📅  6, 7, 8 e 9 de outubro\r\n⏱️ 28 horas\r\n\r\nEsta formação destina-se a quem pretende iniciar-se na área da arboricultura, pois permite adquirir conhecimentos técnicos e práticas seguras para o trabalho em altura, desenvolvendo competências fundamentais na movimentação e gestão de árvores, tanto em contexto urbano como rural.\r\n\r\nVagas limitadas.\r\n📩 Inscreva-se já através do nosso site ou contacte-nos:\r\n📞 289 821 753 | 912 852 135\r\n\r\n#Arboricultura #EscaladaEmÁrvores #FormaçãoCertificada  #Algarve #2Siglas"},{"titulo":"Copy 3","texto":"Segurança, técnica e prática: a base da arboricultura começa aqui connosco.\r\n\r\nAproveite que iniciamos o período de inscrições para a formação \"Escalada em Árvores – Nível 1\", em regime presencial.\r\n📍 Benafim e Vale Fuzeiros\r\n📅 6, 7, 8 e 9 de outubro\r\n⏱️ 28 horas\r\n\r\nDirigida a quem quer dar os primeiros passos na arboricultura, esta formação combina teoria e prática para garantir técnicas seguras de trabalho em altura, promovendo o desenvolvimento de competências essenciais na movimentação e gestão de árvores, seja em espaços urbanos ou rurais.\r\n\r\nVagas limitadas.\r\n📩 Inscreva-se já através do nosso site ou contacte-nos:\r\n📞 289 821 753 | 912 852 135\r\n\r\n#Arboricultura #EscaladaEmÁrvores #FormaçãoCertificada #Algarve #2Siglas"}]'::jsonb,
       '[{"label":"Design 2","url":"https://canva.link/c8wzvcbkh65gk71"}]'::jsonb,
       '2026-08-13T08:30:00.000Z',
       '2026-08-24T18:30:00.000Z'
from public.marketing_marcas m
cross join lateral (select coalesce(array_agg(pr.id), '{}'::uuid[]) as ids from public.profiles pr
            where split_part(translate(lower(coalesce(pr.nome, '')), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc'), ' ', 1) = any(array['valeria']::text[])) r
where lower(m.nome) = '2siglas'
  and not exists (select 1 from public.marketing_conteudos x
                  where x.marca_id = m.id and x.titulo = 'Curso Arboricultura: escalada de árvores - nível 1' and x.headline = 'Curso Arboricultura: escalada de árvores - nível 1');

-- 12. Curso Aplicador de produtos Fitofarmacêuticos
insert into public.marketing_conteudos
    (marca_id, ordem, persona_ids, responsavel_ids, responsavel_id, titulo, estado, headline, conceito, cta, canais, formato, objetivo, estrategia, editoria, hashtags, copies, links, data_publicacao)
select m.id, extract(epoch from now()) + 11,
       '{}'::uuid[],
       r.ids, r.ids[1],
       'Curso Aplicador de produtos Fitofarmacêuticos',
       'monitorado',
       'Curso Aplicador de produtos Fitofarmacêuticos',
       'Agenda',
       '📩 Inscreva-se já através do nosso site ou contacte-nos:
📞 289 821 753 | 912 852 135',
       array['Facebook', 'Instagram']::text[],
       array['Feed único']::text[],
       array['Divulgação Agenda']::text[],
       array['Consideração', 'Conversão']::text[],
       array['Agenda']::text[],
       array['#2Siglas', '#Algarve', '#AplicadordeProdutosFitofarmacêuticos', '#FormaçãoCertificada']::text[],
       '[{"titulo":"Copy 1","texto":"É crescente a necessidade de profissionais com a formação de Aplicador de Produtos Fitofarmacêuticos (APF).\r\n\r\nAproveite que estamos com inscrições abertas para esse curso em regime presencial.\r\n📍 Almancil\r\n🗓️ Setembro\r\n⏱️ 35 horas | horário pós-laboral\r\n\r\nEsta formação capacita para a manipulação e aplicação segura de produtos fitofarmacêuticos, de acordo com os princípios da proteção integrada. A certificação é indispensável para essa profissão.\r\n\r\nVagas limitadas.\r\n📩 Inscreva-se já através do nosso site ou contacte-nos:\r\n📞 289 821 753 | 912 852 135\r\n\r\n#FormaçãoCertificada #AplicadorFitofarmacêutico #Algarve #2siglas"}]'::jsonb,
       '[{"label":"Design 2","url":"https://canva.link/c8wzvcbkh65gk71"}]'::jsonb,
       '2026-08-06T16:45:00.000Z'
from public.marketing_marcas m
cross join lateral (select coalesce(array_agg(pr.id), '{}'::uuid[]) as ids from public.profiles pr
            where split_part(translate(lower(coalesce(pr.nome, '')), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc'), ' ', 1) = any(array['valeria']::text[])) r
where lower(m.nome) = '2siglas'
  and not exists (select 1 from public.marketing_conteudos x
                  where x.marca_id = m.id and x.titulo = 'Curso Aplicador de produtos Fitofarmacêuticos' and x.headline = 'Curso Aplicador de produtos Fitofarmacêuticos');

-- 13. Dia Mundial do Professor - 5 de outubro: celebramos quem dedica a vida a formar outras pessoas
insert into public.marketing_conteudos
    (marca_id, ordem, persona_ids, responsavel_ids, responsavel_id, titulo, estado, design_ideia, cta, canais, formato, estrategia, hashtags, copies, links)
select m.id, extract(epoch from now()) + 12,
       coalesce((select array_agg(p.id order by p.ordem) from public.marketing_personas p
                  where p.marca_id = m.id and translate(lower(p.papel), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc') = any(array['treinador']::text[])), '{}'::uuid[]),
       '{}'::uuid[], null::uuid,
       'Dia Mundial do Professor - 5 de outubro: celebramos quem dedica a vida a formar outras pessoas',
       'monitorado',
       'Retrato de um formador em ação de formação (idealmente real, da equipa 2Siglas), com overlay de texto elegante "5 de outubro · Dia Mundial do Professor". Paleta institucional, tom celebrativo mas sóbrio.',
       'Deixe aqui uma palavra de agradecimento a um formador que marcou a sua vida 👇',
       array['Facebook', 'Instagram', 'LinkedIn']::text[],
       array['Feed único']::text[],
       array['Indicação (advocacy)', 'Engajamento']::text[],
       array['#2Siglas', '#Formadores']::text[],
       '[{"titulo":"Copy 1","texto":"O Dia Mundial do Professor, assinalado desde 1994 pela UNESCO, reconhece o papel de quem ensina, forma e acompanha o crescimento de outras pessoas.\r\n\r\nNa 2Siglas, este dia tem um significado especial:\r\n\r\nSão os nossos formadores que tornam possível cada certificado, cada nova competência e cada mudança de vida dos nossos formandos.\r\n\r\nA todos os que formam, o nosso reconhecimento.\r\n\r\nDeixe aqui uma palavra de agradecimento a um formador que marcou a sua vida 👇\r\n\r\n#DiaMundialdoProfessor #Formadores #Educadores #Instrutores #Professores #2Siglas"}]'::jsonb,
       '[{"label":"Design 1","url":"https://canva.link/sulr4y6b667l9fa"}]'::jsonb
from public.marketing_marcas m
where lower(m.nome) = '2siglas'
  and not exists (select 1 from public.marketing_conteudos x
                  where x.marca_id = m.id and x.titulo = 'Dia Mundial do Professor - 5 de outubro: celebramos quem dedica a vida a formar outras pessoas' and x.headline is null);

-- 14. Aumento da Validade do Cartão do Aplicador de Produtos Fitofarmacêuticos
insert into public.marketing_conteudos
    (marca_id, ordem, persona_ids, responsavel_ids, responsavel_id, titulo, estado, prioridade, briefing, headline, cta, canais, formato, hashtags, copies, links, anexos, data_publicacao, data_entrega)
select m.id, extract(epoch from now()) + 13,
       coalesce((select array_agg(p.id order by p.ordem) from public.marketing_personas p
                  where p.marca_id = m.id and translate(lower(p.papel), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc') = any(array['empregador/empresario', 'gestor/influenciador', 'encarregado agricola', 'profissional autonomo']::text[])), '{}'::uuid[]),
       r.ids, r.ids[1],
       'Aumento da Validade do Cartão do Aplicador de Produtos Fitofarmacêuticos',
       'monitorado',
       'alta',
       'Novas regras para a validade do Cartão de Aplicador de Produtos Fitofarmacêuticos- validade passa de 10 para 15 anos

Entrou em vigor o Decreto-Lei n.º 127/2026, de 26 de junho, que trouxe uma alteração importante: a validade da habilitação como aplicador de produtos fitofarmacêuticos passou de 10 para 15 anos.
 
O que precisa de saber:
• Os cartões que estavam válidos em 27 de junho de 2026 passam a beneficiar do novo prazo de 15 anos;
• Não é necessário pedir um novo cartão. Para verificar a nova validade, deve acrescentar 5 anos à data que consta atualmente no cartão;
• Os cartões emitidos a partir de 27 de junho de 2026 já terão 15 anos de validade;
• Se o seu cartão já estava caducado em 27 de junho de 2026, terá de realizar a formação base.
 
Importante: a alteração para 15 anos não elimina a necessidade de formação de atualização.
Para renovar a habilitação, continua a ser necessária a realização da formação de atualização, durante o último ano antes do fim da validade.',
       '15 anos É a nova validade do cartão do Aplicador de Produtos Fitofarmacêuticos',
       'Precisa de nova formação? Inscreva-se já: 289 821 753 | 912 852 135 www.2siglas.pt',
       array['Facebook', 'Instagram']::text[],
       array['Carrossel']::text[],
       array['#2Siglas', '#Algarve', '#AplicadordeProdutosFitofarmacêuticos', '#FormaçãoCertificada', '#FormaçãoObrigatória']::text[],
       '[{"titulo":"Copy 1","texto":"No dia 26 de junho, entrou em vigor o Decreto-Lei n.º 127/2026, que aumentou de 10 para 15 anos a validade da habilitação do Aplicador de Produtos Fitofarmacêuticos.\r\n\r\n\r\nAssim, o profissional com o cartão válido a 27 de junho de 2026 não precisa de um novo cartão. Para saber a nova validade, basta acrescentar 5 anos à data que consta atualmente no cartão.\r\n\r\n\r\nAtenção! Para renovar a habilitação a formação de atualização continua necessária, durante o último ano antes do fim da validade.\r\n\r\n\r\nA partir de 27 de junho de 2026, os cartões já são emitidos com 15 anos de validade.\r\n\r\n\r\nJá os cartões caducados a 27 de junho de 2026 têm de ser renovados normalmente, sendo necessário realizar a formação base.\r\n\r\n\r\nNa 2Siglas, temos a formação de que precisa. Inscreva-se já:\r\n📞289 821 753 | 912 852 135\r\n\r\n\r\n#2Siglas #FormaçãoObrigatória #FormaçãoCertificada #AplicadordeProdutosFitofarmacêuticos #Algarve"}]'::jsonb,
       '[{"label":"Design 1","url":"https://canva.link/hesmkoxrfpxtle4"},{"label":"Design 2","url":"https://canva.link/xbnypqoh6gpavs5"}]'::jsonb,
       '[{"nome":"DGAV_Nota_de_Esclarecimento_DL_127_2026.pdf","url":"","categoria":"briefing"}]'::jsonb,
       '2026-08-25T13:30:00.000Z',
       '2026-08-25'
from public.marketing_marcas m
cross join lateral (select coalesce(array_agg(pr.id), '{}'::uuid[]) as ids from public.profiles pr
            where split_part(translate(lower(coalesce(pr.nome, '')), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc'), ' ', 1) = any(array['valeria']::text[])) r
where lower(m.nome) = '2siglas'
  and not exists (select 1 from public.marketing_conteudos x
                  where x.marca_id = m.id and x.titulo = 'Aumento da Validade do Cartão do Aplicador de Produtos Fitofarmacêuticos' and x.headline = '15 anos É a nova validade do cartão do Aplicador de Produtos Fitofarmacêuticos');

-- 15. 7 de setembro: parabéns à cidade que nos vê crescer
insert into public.marketing_conteudos
    (marca_id, ordem, persona_ids, responsavel_ids, responsavel_id, titulo, estado, cta, canais, formato, estrategia, hashtags, copies, links, data_publicacao)
select m.id, extract(epoch from now()) + 14,
       coalesce((select array_agg(p.id order by p.ordem) from public.marketing_personas p
                  where p.marca_id = m.id and translate(lower(p.papel), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc') = any(array['empregador/empresario']::text[])), '{}'::uuid[]),
       '{}'::uuid[], null::uuid,
       '7 de setembro: parabéns à cidade que nos vê crescer',
       'monitorado',
       'Feliz Dia do Município a toda a cidade de Faro! 🏛️',
       array['Facebook', 'Instagram']::text[],
       array['Feed único']::text[],
       array['Reconhecimento (awareness)']::text[],
       array['#2Siglas', '#Algarve', '#FormaçãoCertificada', '#Faro', '#FormaçãoProfissional']::text[],
       '[{"titulo":"Copy 1","texto":"Hoje celebramos Faro, uma cidade que faz parte da nossa história e do nosso percurso. 💙\r\n\r\n\r\nÉ aqui que crescemos, aprendemos e nos desenvolvemos, criando novas oportunidades.\r\n\r\n\r\nTodos os dias, através das nossas formações, contribuímos para o desenvolvimento de equipas, para a valorização de competências e para a construção de um futuro com mais oportunidades.\r\n\r\n\r\nCrescer com a nossa cidade é também contribuir para o seu futuro.\r\n\r\n\r\nParabéns, Faro.🎉 #2Siglas #Faro #Algarve #FormaçãoCertificada #FormaçãoProfissional"}]'::jsonb,
       '[{"label":"Design 1","url":"https://canva.link/sulr4y6b667l9fa"},{"label":"Design 2","url":"https://canva.link/5ppm1coe3p1d117"}]'::jsonb,
       '2026-09-07T09:30:00.000Z'
from public.marketing_marcas m
where lower(m.nome) = '2siglas'
  and not exists (select 1 from public.marketing_conteudos x
                  where x.marca_id = m.id and x.titulo = '7 de setembro: parabéns à cidade que nos vê crescer' and x.headline is null);

-- 16. 25 de setembro: Portugal foi pioneiro a dar um dia à sustentabilidade
insert into public.marketing_conteudos
    (marca_id, ordem, persona_ids, responsavel_ids, responsavel_id, titulo, estado, design_ideia, variacoes, cta, canais, formato, estrategia, hashtags, copies, links, data_publicacao)
select m.id, extract(epoch from now()) + 15,
       coalesce((select array_agg(p.id order by p.ordem) from public.marketing_personas p
                  where p.marca_id = m.id and translate(lower(p.papel), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc') = any(array['encarregado agricola']::text[])), '{}'::uuid[]),
       '{}'::uuid[], null::uuid,
       '25 de setembro: Portugal foi pioneiro a dar um dia à sustentabilidade',
       'monitorado',
       'Imagem com ícones dos ODS ou elementos naturais estilizados, paleta verde/institucional.',
       'Portugal foi o primeiro país do mundo a instituir oficialmente um Dia Nacional da Sustentabilidade, a 25 de setembro — data que coincide com a adoção dos Objetivos de Desenvolvimento Sustentável da ONU em 2015.

Na 2Siglas, a sustentabilidade já faz parte de várias das nossas formações, da gestão de resíduos agrícolas às boas práticas ambientais em contexto profissional. Dia da Sustentabilidade em Portugal: formar hoje para transformar o futuro
25 de setembro | Sustentabilidade, educação e qualificação profissional',
       'Descubra os nossos cursos ligados à sustentabilidade e gestão de resíduos 👉',
       array['Facebook', 'Instagram', 'LinkedIn']::text[],
       array['Feed único']::text[],
       array['Reconhecimento (awareness)', 'Educação']::text[],
       array['#2Siglas', '#Algarve']::text[],
       '[{"titulo":"Copy 1","texto":"A sustentabilidade deixou de ser apenas uma preocupação ambiental. Hoje, é um tema transversal à sociedade, às empresas e ao mercado de trabalho. A forma como produzimos, consumimos, trabalhamos e utilizamos os recursos tem impacto direto no futuro das próximas gerações.\r\nÉ neste contexto que o Dia da Sustentabilidade, assinalado em Portugal a 25 de setembro, ganha especial relevância: uma oportunidade para refletir sobre a importância de adotar comportamentos mais responsáveis e, sobretudo, de promover o conhecimento e as competências necessárias para uma verdadeira transformação.                                                            \r\nSustentabilidade também se aprende\r\nQuando falamos de sustentabilidade, é comum pensarmos primeiro em reciclagem, redução do consumo de água ou utilização eficiente de energia. Embora estas ações sejam importantes, a sustentabilidade vai muito além disso.\r\nEnvolve também a forma como as organizações planeiam as suas atividades, gerem recursos, desenvolvem os seus profissionais e tomam decisões.\r\nPor isso, a formação profissional tem um papel fundamental na construção de uma sociedade mais sustentável.\r\nA aquisição e atualização de competências permite aos profissionais acompanhar novas exigências do mercado de trabalho, compreender os desafios ambientais e sociais e contribuir para a implementação de práticas mais eficientes e responsáveis nas organizações.\r\nO papel das empresas na transição para um futuro sustentável\r\nAs empresas enfrentam atualmente desafios relacionados com eficiência energética, gestão de resíduos, utilização responsável de recursos, digitalização, responsabilidade social e adaptação a novas exigências legais e de mercado.\r\nNeste cenário, investir na formação das equipas pode contribuir para:\r\n• melhorar processos e utilizar os recursos de forma mais eficiente;\r\n• desenvolver uma cultura organizacional orientada para a responsabilidade;\r\n• acompanhar a evolução tecnológica e profissional;\r\n• identificar oportunidades de inovação;\r\n• promover ambientes de trabalho mais conscientes e responsáveis;\r\n• preparar os profissionais para as novas competências exigidas pelo mercado.\r\nA sustentabilidade, portanto, não deve ser encarada apenas como uma obrigação, mas também como uma oportunidade de aprendizagem, inovação e desenvolvimento profissional.\r\nFormação profissional: uma ferramenta para a mudança\r\nUma organização sustentável precisa de pessoas preparadas para enfrentar novos desafios.\r\nDa mesma forma, profissionais qualificados estão mais preparados para compreender mudanças, adaptar procedimentos e aplicar conhecimentos no seu contexto de trabalho.\r\nÉ por isso que a formação profissional certificada pode assumir um papel importante nesta transformação. Ao proporcionar conhecimentos e competências reconhecidos, contribui para uma aprendizagem estruturada e para o desenvolvimento contínuo dos profissionais.\r\nInvestir em formação é também investir na capacidade de uma organização para se adaptar ao futuro.\r\nPequenas ações, grandes mudanças\r\nA sustentabilidade não depende apenas de grandes decisões. Também é construída através das escolhas que fazemos diariamente.\r\nNa formação, no trabalho e na vida pessoal, podemos começar por ações simples:\r\n♻️ Reduzir desperdícios e promover a reutilização.\r\n💡 Utilizar os recursos de forma mais eficiente.\r\n📚 Procurar informação e desenvolver novas competências.\r\n💻 Utilizar ferramentas digitais de forma responsável.\r\n🤝 Promover ambientes de trabalho mais inclusivos e conscientes.\r\n🌱 Incentivar práticas sustentáveis dentro das organizações.\r\nMais do que celebrar uma data, o Dia da Sustentabilidade pode ser um convite à aprendizagem e à ação.\r\nPreparar pessoas para um futuro mais sustentável\r\nO futuro do trabalho está em transformação e a sustentabilidade faz cada vez mais parte dessa mudança.\r\nPara empresas e profissionais, acompanhar esta evolução significa investir em conhecimento, atualização e desenvolvimento de competências."},{"titulo":"Copy 2","texto":"🌱 25 de setembro | Dia Nacional da Sustentabilidade\r\n\r\n\r\n\r\nSer sustentável implica mais do que reduzir desperdícios ou poupar recursos: é necessário desenvolver conhecimentos, mudar comportamentos e preparar as organizações para enfrentarem novos desafios.\r\n\r\n\r\n\r\n📚 Nesse sentido, a formação profissional da 2Siglas assume um papel importante.\r\n\r\n\r\n\r\nAo investir em formação, é possível desenvolver competências, acompanhar a evolução do mercado de trabalho e contribuir para práticas profissionais mais eficientes e responsáveis.\r\n\r\n\r\n\r\nNeste dia, vamos refletir juntos:\r\n\r\n\r\n\r\n👉 O que podemos fazer no nosso trabalho para utilizar melhor os recursos?\r\n\r\n\r\n\r\n👉 Que competências precisamos de desenvolver para enfrentar os desafios futuros?\r\n\r\n\r\n\r\n👉 Como podemos transformar o conhecimento em ação?\r\n\r\n\r\n\r\nDeixe o seu comentário para semearmos boas ideias e atitudes sustentáveis através da nossa comunidade.\r\n\r\n\r\n\r\n#DiaDaSustentabilidade #FormaçãoProfissional #FormaçãoCertificada #Portugal\r\n\r\n#2Siglas"}]'::jsonb,
       '[{"label":"Design 1","url":"https://canva.link/q8ce7lb6uztvjt9"},{"label":"Design 2","url":"https://canva.link/sulr4y6b667l9fa"}]'::jsonb,
       '2026-09-25T09:30:00.000Z'
from public.marketing_marcas m
where lower(m.nome) = '2siglas'
  and not exists (select 1 from public.marketing_conteudos x
                  where x.marca_id = m.id and x.titulo = '25 de setembro: Portugal foi pioneiro a dar um dia à sustentabilidade' and x.headline is null);

-- 17. 10 de outubro: cuidar da mente também é cuidar do trabalho
insert into public.marketing_conteudos
    (marca_id, ordem, persona_ids, responsavel_ids, responsavel_id, titulo, estado, conceito, design_ideia, cta, canais, formato, estrategia, editoria, hashtags, copies, data_publicacao)
select m.id, extract(epoch from now()) + 16,
       coalesce((select array_agg(p.id order by p.ordem) from public.marketing_personas p
                  where p.marca_id = m.id and translate(lower(p.papel), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc') = any(array['empregador/empresario']::text[])), '{}'::uuid[]),
       '{}'::uuid[], null::uuid,
       '10 de outubro: cuidar da mente também é cuidar do trabalho',
       'monitorado',
       'https://dge.mec.pt/noticias/10-de-outubro-dia-mundial-da-saude-mental',
       'Imagem calma e acolhedora, tons suaves, sem estigmatizar o tema, sóbrio e empático.',
       'Precisa de apoio? A SNS24 (808 24 24 24) está disponível 24h. Cuide de si.',
       array['Facebook', 'Instagram', 'LinkedIn']::text[],
       array['Feed único']::text[],
       array['Reconhecimento (awareness)']::text[],
       array['Comemorações', 'Informação']::text[],
       array['#2Siglas', '#Algarve', '#SaúdeeSegurança']::text[],
       '[{"titulo":"Copy 1","texto":"A saúde mental no trabalho já é hoje um dos temas mais discutidos em gestão de pessoas — e com razão: um ambiente equilibrado reflete-se diretamente na produtividade e no bem-estar das equipas.\r\n\r\nNeste dia, deixamos um lembrete simples: pedir ajuda é sinal de força, não de fraqueza."}]'::jsonb,
       '2026-10-10T09:00:00.000Z'
from public.marketing_marcas m
where lower(m.nome) = '2siglas'
  and not exists (select 1 from public.marketing_conteudos x
                  where x.marca_id = m.id and x.titulo = '10 de outubro: cuidar da mente também é cuidar do trabalho' and x.headline is null);

-- 18. Minutos de ergonomia que fazem a diferença na vida
insert into public.marketing_conteudos
    (marca_id, ordem, persona_ids, responsavel_ids, responsavel_id, titulo, estado, prioridade, headline, canais, formato, estrategia, editoria, hashtags, copies, links, data_publicacao, data_entrega)
select m.id, extract(epoch from now()) + 17,
       coalesce((select array_agg(p.id order by p.ordem) from public.marketing_personas p
                  where p.marca_id = m.id and translate(lower(p.papel), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc') = any(array['empregador/empresario']::text[])), '{}'::uuid[]),
       r.ids, r.ids[1],
       'Minutos de ergonomia que fazem a diferença na vida',
       'monitorado',
       'media',
       'Ergonomia no local de trabalho: pequenos hábitos
e grandes benefícios para o seu bem-estar',
       array['Facebook', 'Instagram', 'LinkedIn']::text[],
       array['Carrossel']::text[],
       array['Educação']::text[],
       array['Educação', 'Sabia que']::text[],
       array['#2Siglas', '#Algarve', '#SegurançaNoTrabalho', '#SST', '#SaúdenoTrabalho']::text[],
       '[{"titulo":"Copy 1","texto":"Má postura, equipamentos mal ajustados ou pausas insuficientes estão entre as causas mais comuns de desconforto e lesões relacionadas ao trabalho, situações que podem ser evitadas com pequenos hábitos.\r\n\r\n\r\nAlguns ajustes na forma como trabalhamos, seja sentados, de pé ou em movimento, podem fazer uma grande diferença no nosso bem-estar a longo prazo.\r\n\r\n\r\n💡 Dicas para melhorar a sua ergonomia:\r\n🪑 Reserve cinco minutos para organizar seu local de trabalho, verifique a altura da cadeira e do monitor e ajuste a posição do teclado e do rato.\r\n🚶 Aproveite as pausas ao longo do dia de trabalho para se movimentar, mudar de posição e relaxar o corpo.\r\n\r\n\r\nA ergonomia é também abordada na nossa formação em Segurança e Saúde no Trabalho.\r\n\r\n\r\n🎓 Quer melhorar a sua ergonomia e da sua equipa?\r\nO curso \"Ergonomia no local de trabalho\" está disponível online e tem duração de 4 horas.\r\n\r\n\r\n👉 Saiba mais e inscreva-se através do nosso site, link na bio.\r\n\r\n\r\n#2Siglas #Ergonomia  #SST #SaúdeNoTrabalho #SegurançaNoTrabalho #Algarve"}]'::jsonb,
       '[{"label":"Design 1","url":"https://canva.link/hesmkoxrfpxtle4"},{"label":"Design 2","url":"https://canva.link/kemw58mzzo6yyqz"}]'::jsonb,
       '2026-08-27T09:30:00.000Z',
       '2026-08-24'
from public.marketing_marcas m
cross join lateral (select coalesce(array_agg(pr.id), '{}'::uuid[]) as ids from public.profiles pr
            where split_part(translate(lower(coalesce(pr.nome, '')), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc'), ' ', 1) = any(array['valeria']::text[])) r
where lower(m.nome) = '2siglas'
  and not exists (select 1 from public.marketing_conteudos x
                  where x.marca_id = m.id and x.titulo = 'Minutos de ergonomia que fazem a diferença na vida' and x.headline = 'Ergonomia no local de trabalho: pequenos hábitos
e grandes benefícios para o seu bem-estar');

-- 19. Pequenos gestos que tornam qualquer empresa mais sustentável
insert into public.marketing_conteudos
    (marca_id, ordem, persona_ids, responsavel_ids, responsavel_id, titulo, estado, conceito, cta, canais, formato, estrategia, hashtags, copies, links, data_publicacao)
select m.id, extract(epoch from now()) + 18,
       coalesce((select array_agg(p.id order by p.ordem) from public.marketing_personas p
                  where p.marca_id = m.id and translate(lower(p.papel), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc') = any(array['empregador/empresario']::text[])), '{}'::uuid[]),
       '{}'::uuid[], null::uuid,
       'Pequenos gestos que tornam qualquer empresa mais sustentável',
       'monitorado',
       'dicas menos comuns de sustentabilidade ecológica nas empresas',
       'Quer implementar práticas mais sustentáveis na sua empresa? Fale connosco 👉',
       array['Facebook', 'Instagram', 'LinkedIn']::text[],
       array['Carrossel']::text[],
       array['Educação', 'Valorização']::text[],
       array['#2Siglas', '#Algarve']::text[],
       '[{"titulo":"Copy 1","texto":"A sustentabilidade constrói-se também nos pequenos gestos do dia a dia. 🌱\r\n\r\nNa empresa, hábitos simples como monitorizar os consumos, utilizar os recursos de forma responsável e envolver toda a equipa podem marcar a diferença.\r\n\r\nA sustentabilidade é mais do que uma preocupação ambiental, é uma responsabilidade partilhada. O conhecimento é uma das ferramentas que nos permite transformá-la em ação.\r\n\r\nPor isso, este tema está presente em muitas das nossas formações.\r\n\r\nNa sua equipa, que hábitos sustentáveis já fazem parte da rotina? Partilhe connosco nos comentários.\r\n\r\n#Sustentabilidade #FormaçãoProfissional #Responsabilidade #DesenvolvimentoSustentável #BoasPráticas"}]'::jsonb,
       '[{"label":"Design 1","url":"https://canva.link/sulr4y6b667l9fa"},{"label":"Design 2","url":"https://canva.link/5ppm1coe3p1d117"}]'::jsonb,
       '2026-09-05T10:30:00.000Z'
from public.marketing_marcas m
where lower(m.nome) = '2siglas'
  and not exists (select 1 from public.marketing_conteudos x
                  where x.marca_id = m.id and x.titulo = 'Pequenos gestos que tornam qualquer empresa mais sustentável' and x.headline is null);

-- 20. Como a Inteligência Artificial entra na sala de formação para apoiar o formador
insert into public.marketing_conteudos
    (marca_id, ordem, persona_ids, responsavel_ids, responsavel_id, titulo, estado, prioridade, headline, cta, canais, formato, estrategia, editoria, hashtags, copies, links, data_publicacao)
select m.id, extract(epoch from now()) + 19,
       coalesce((select array_agg(p.id order by p.ordem) from public.marketing_personas p
                  where p.marca_id = m.id and translate(lower(p.papel), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc') = any(array['formador']::text[])), '{}'::uuid[]),
       '{}'::uuid[], null::uuid,
       'Como a Inteligência Artificial entra na sala de formação para apoiar o formador',
       'monitorado',
       'baixa',
       'Facebook Teste:  Título A:

Formação Certificada 2Siglas

Título B:

2Siglas é entidade formadora certificada pela DGERT',
       'Queres saber mais sobre como usamos tecnologia na formação? Fala connosco 👉',
       array['Facebook', 'Instagram']::text[],
       array['Carrossel']::text[],
       array['Reconhecimento (awareness)', 'Educação']::text[],
       array['Educação']::text[],
       array['#2Siglas', '#Algarve', '#FormaçãoCertificada']::text[],
       '[{"titulo":"Copy 2","texto":"Na 2Siglas, ajudamos a perceber o que cada equipa precisa para cumprir e manter a formação certificada válida e atualizada.\r\n\r\n\r\n\r\n✅ A realidade depende do tipo de formação, da certificação e dos requisitos legais aplicáveis a categoria profissional.\r\n\r\n\r\n\r\n✅ As nossas formações online podem ser acedidas de diferentes dispositivos.\r\n\r\n\r\n\r\n✅ Os cursos podem ser contratos por formando.\r\n\r\n\r\n\r\nA tua empresa está em dia?\r\n\r\nFala connosco:\r\n\r\n📞 289 821 753 | 912 852 135\r\n\r\n\r\n\r\n#FormaçãoCertificada #2Siglas #FormaçãoProfissional #Faro #Certificações"}]'::jsonb,
       '[{"label":"Design 1","url":"https://canva.link/boezifp3lf9hk0f"}]'::jsonb,
       '2026-09-16T15:00:00.000Z'
from public.marketing_marcas m
where lower(m.nome) = '2siglas'
  and not exists (select 1 from public.marketing_conteudos x
                  where x.marca_id = m.id and x.titulo = 'Como a Inteligência Artificial entra na sala de formação para apoiar o formador' and x.headline = 'Facebook Teste:  Título A:

Formação Certificada 2Siglas

Título B:

2Siglas é entidade formadora certificada pela DGERT');

-- 21. Curso Estilos e tipologias no boxe competitivo (Reforço da divulgação - 19 e 20 de setembro - Lisboa)
insert into public.marketing_conteudos
    (marca_id, ordem, persona_ids, responsavel_ids, responsavel_id, titulo, estado, prioridade, headline, conceito, cta, canais, formato, objetivo, estrategia, editoria, hashtags, copies, links, data_publicacao, data_entrega)
select m.id, extract(epoch from now()) + 20,
       '{}'::uuid[],
       r.ids, r.ids[1],
       'Curso Estilos e tipologias no boxe competitivo (Reforço da divulgação - 19 e 20 de setembro - Lisboa)',
       'monitorado',
       'alta',
       'Curso Estilos e tipologias no boxe competitivo',
       'Agenda',
       'Invista na sua formação e eleve a qualidade do seu treino.
📩 Garanta já a sua vaga através do nosso site ou contacte-nos:
📞 289 821 753 | 912 852 135',
       array['Facebook', 'Instagram']::text[],
       array['Feed único']::text[],
       array['Divulgação Agenda']::text[],
       array['Consideração', 'Conversão']::text[],
       array['Agenda']::text[],
       array['#2Siglas', '#BoxeCompetitivo', '#FormaçãoCertificada', '#Lisboa', '#Treinadores']::text[],
       '[{"titulo":"Copy 1","texto":"Descubra como diferentes estilos e tipologias podem fazer a diferença na preparação de atletas de boxe competitivo. 🥊\r\n\r\nEstão abertas as inscrições para a formação “Estilos e Tipologias no Boxe Competitivo”, em regime presencial.\r\n📍 Lisboa\r\n🗓️ 19 e 20 de setembro\r\n⏱️ 15 horas I Horário Laboral\r\n✔️ Certificação com atribuição de 3 UCs (Unidades de Crédito)\r\n\r\nEsta formação é uma oportunidade para treinadores desenvolverem uma abordagem técnica e estratégica mais ajustada às necessidades de cada atleta.\r\n\r\nInvista na sua formação e eleve a qualidade do seu treino.\r\n\r\n📩 Garanta já a sua vaga através do nosso site ou contacte-nos:\r\n📞 289 821 753 | 912 852 135\r\n\r\n#FormaçãoCertificada #Treinadores #BoxeCompetitivo #Lisboa #2Siglas"}]'::jsonb,
       '[{"label":"Design 1","url":"https://canva.link/c8wzvcbkh65gk71"}]'::jsonb,
       '2026-08-28T18:30:00.000Z',
       '2026-08-25'
from public.marketing_marcas m
cross join lateral (select coalesce(array_agg(pr.id), '{}'::uuid[]) as ids from public.profiles pr
            where split_part(translate(lower(coalesce(pr.nome, '')), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc'), ' ', 1) = any(array['valeria']::text[])) r
where lower(m.nome) = '2siglas'
  and not exists (select 1 from public.marketing_conteudos x
                  where x.marca_id = m.id and x.titulo = 'Curso Estilos e tipologias no boxe competitivo (Reforço da divulgação - 19 e 20 de setembro - Lisboa)' and x.headline = 'Curso Estilos e tipologias no boxe competitivo');

-- 22. COTs Prazo
insert into public.marketing_conteudos
    (marca_id, ordem, persona_ids, responsavel_ids, responsavel_id, titulo, estado, prioridade, briefing, canais, formato, objetivo, estrategia, links, anexos, data_publicacao)
select m.id, extract(epoch from now()) + 21,
       coalesce((select array_agg(p.id order by p.ordem) from public.marketing_personas p
                  where p.marca_id = m.id and translate(lower(p.papel), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc') = any(array['condutor', 'empregador/empresario', 'gestor/influenciador']::text[])), '{}'::uuid[]),
       r.ids, r.ids[1],
       'COTs Prazo',
       'monitorado',
       'alta',
       'Divulgar o curso em Amancil e falar sobre o prazo prorrogado Cara entidades 
 
Serve o presente email, para informar que foi publicado o https://files.diariodarepublica.pt/2s/2021/02/030000000/0004000041.pdf, que prorroga, até 1 de agosto de 2027, o prazo para comprovação da formação COTS (Conduzir e Operar com o Trator em Segurança).
 
Esta prorrogação aplica-se exclusivamente aos titulares de carta de condução da categoria B que conduzam veículos agrícolas do tipo II sem tomada de força (TDF), sem cardans e sem sistema hidráulico.
 
Este despacho sucede ao https://files.diariodarepublica.pt/2s/2025/07/141000000/0009400094.pdf, que havia prorrogado a obrigatoriedade da formação até 1 de agosto de 2026.
 
Na prática, esta medida concede mais um ano aos operadores de tratores e equipamentos agrícolas mais simples para obterem a formação exigida. Em contrapartida, os condutores de veículos agrícolas equipados com TDF, cardans ou sistema hidráulico deixam de beneficiar desta prorrogação específica.
Importa salientar que o diploma não elimina a obrigatoriedade da formação COTS, limitando-se a estabelecer uma exceção temporária para os veículos agrícolas do tipo II que não disponham de tomada de força (TDF), cardans ou sistema hidráulico.',
       array['Facebook', 'Instagram']::text[],
       array['Carrossel']::text[],
       array['Divulgação Agenda']::text[],
       array['Consideração']::text[],
       '[{"label":"Design 1","url":"https://canva.link/55xcuted8qzighu"},{"label":"Design 2","url":"https://canva.link/nu0bpchkp74j60f"}]'::jsonb,
       '[{"nome":"Despacho_31.07.2026_COTS.pdf","url":"","categoria":"briefing"}]'::jsonb,
       '2026-09-10T16:40:00.000Z'
from public.marketing_marcas m
cross join lateral (select coalesce(array_agg(pr.id), '{}'::uuid[]) as ids from public.profiles pr
            where split_part(translate(lower(coalesce(pr.nome, '')), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc'), ' ', 1) = any(array['valeria']::text[])) r
where lower(m.nome) = '2siglas'
  and not exists (select 1 from public.marketing_conteudos x
                  where x.marca_id = m.id and x.titulo = 'COTs Prazo' and x.headline is null);

-- 23. Formação à medida
insert into public.marketing_conteudos
    (marca_id, ordem, persona_ids, responsavel_ids, responsavel_id, titulo, estado, links)
select m.id, extract(epoch from now()) + 22,
       '{}'::uuid[],
       r.ids, r.ids[1],
       'Formação à medida',
       'monitorado',
       '[{"label":"Design 1","url":"https://canva.link/woktap434gocjmf"}]'::jsonb
from public.marketing_marcas m
cross join lateral (select coalesce(array_agg(pr.id), '{}'::uuid[]) as ids from public.profiles pr
            where split_part(translate(lower(coalesce(pr.nome, '')), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc'), ' ', 1) = any(array['valeria']::text[])) r
where lower(m.nome) = '2siglas'
  and not exists (select 1 from public.marketing_conteudos x
                  where x.marca_id = m.id and x.titulo = 'Formação à medida' and x.headline is null);

-- 24. Mitos e Verdades
insert into public.marketing_conteudos
    (marca_id, ordem, persona_ids, responsavel_ids, responsavel_id, titulo, estado, prioridade, canais, formato, objetivo, estrategia, editoria, links, data_publicacao)
select m.id, extract(epoch from now()) + 23,
       '{}'::uuid[],
       r.ids, r.ids[1],
       'Mitos e Verdades',
       'monitorado',
       'alta',
       array['Facebook', 'Instagram']::text[],
       array['Reel / vídeo curto']::text[],
       array['Atrair tráfego']::text[],
       array['Reconhecimento (awareness)']::text[],
       array['Educação', 'Mitos']::text[],
       '[{"label":"Design 1","url":"https://canva.link/vhsvjwp6nd3izhn"}]'::jsonb,
       '2026-09-14T11:30:00.000Z'
from public.marketing_marcas m
cross join lateral (select coalesce(array_agg(pr.id), '{}'::uuid[]) as ids from public.profiles pr
            where split_part(translate(lower(coalesce(pr.nome, '')), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc'), ' ', 1) = any(array['valeria']::text[])) r
where lower(m.nome) = '2siglas'
  and not exists (select 1 from public.marketing_conteudos x
                  where x.marca_id = m.id and x.titulo = 'Mitos e Verdades' and x.headline is null);

-- 25. Outubro APF - Aplicador de Produtos Fitofarmacêuticos
insert into public.marketing_conteudos
    (marca_id, ordem, persona_ids, responsavel_ids, responsavel_id, titulo, estado, prioridade, canais, formato, objetivo, estrategia, links, anexos, data_publicacao)
select m.id, extract(epoch from now()) + 24,
       coalesce((select array_agg(p.id order by p.ordem) from public.marketing_personas p
                  where p.marca_id = m.id and translate(lower(p.papel), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc') = any(array['empregador/empresario', 'encarregado agricola', 'profissional autonomo']::text[])), '{}'::uuid[]),
       r.ids, r.ids[1],
       'Outubro APF - Aplicador de Produtos Fitofarmacêuticos',
       'monitorado',
       'alta',
       array['Facebook', 'Instagram']::text[],
       array['Carrossel']::text[],
       array['Divulgação Agenda']::text[],
       array['Consideração']::text[],
       '[{"label":"Design 1","url":"https://canva.link/55xcuted8qzighu"},{"label":"Design 2","url":"https://canva.link/nu0bpchkp74j60f"}]'::jsonb,
       '[{"nome":"Despacho_31.07.2026_COTS.pdf","url":"","categoria":"briefing"}]'::jsonb,
       '2026-09-11T16:30:00.000Z'
from public.marketing_marcas m
cross join lateral (select coalesce(array_agg(pr.id), '{}'::uuid[]) as ids from public.profiles pr
            where split_part(translate(lower(coalesce(pr.nome, '')), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc'), ' ', 1) = any(array['valeria']::text[])) r
where lower(m.nome) = '2siglas'
  and not exists (select 1 from public.marketing_conteudos x
                  where x.marca_id = m.id and x.titulo = 'Outubro APF - Aplicador de Produtos Fitofarmacêuticos' and x.headline is null);

-- 26. Outubro Arboricultura
insert into public.marketing_conteudos
    (marca_id, ordem, persona_ids, responsavel_ids, responsavel_id, titulo, estado, prioridade, canais, formato, objetivo, estrategia, links, anexos, data_publicacao)
select m.id, extract(epoch from now()) + 25,
       coalesce((select array_agg(p.id order by p.ordem) from public.marketing_personas p
                  where p.marca_id = m.id and translate(lower(p.papel), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc') = any(array['empregador/empresario', 'encarregado agricola', 'profissional autonomo']::text[])), '{}'::uuid[]),
       r.ids, r.ids[1],
       'Outubro Arboricultura',
       'monitorado',
       'alta',
       array['Facebook', 'Instagram']::text[],
       array['Carrossel']::text[],
       array['Divulgação Agenda']::text[],
       array['Consideração']::text[],
       '[{"label":"Design 1","url":"https://canva.link/55xcuted8qzighu"},{"label":"Design 2","url":"https://canva.link/nu0bpchkp74j60f"}]'::jsonb,
       '[{"nome":"Despacho_31.07.2026_COTS.pdf","url":"","categoria":"briefing"}]'::jsonb,
       '2026-09-15T18:30:00.000Z'
from public.marketing_marcas m
cross join lateral (select coalesce(array_agg(pr.id), '{}'::uuid[]) as ids from public.profiles pr
            where split_part(translate(lower(coalesce(pr.nome, '')), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc'), ' ', 1) = any(array['valeria']::text[])) r
where lower(m.nome) = '2siglas'
  and not exists (select 1 from public.marketing_conteudos x
                  where x.marca_id = m.id and x.titulo = 'Outubro Arboricultura' and x.headline is null);

-- 27. Newsletter Mensal 2Siglas
insert into public.marketing_conteudos
    (marca_id, ordem, persona_ids, responsavel_ids, responsavel_id, titulo, estado, prioridade, canais, formato, objetivo, estrategia, editoria, links, data_publicacao, data_entrega)
select m.id, extract(epoch from now()) + 26,
       '{}'::uuid[],
       r.ids, r.ids[1],
       'Newsletter Mensal 2Siglas',
       'monitorado',
       'alta',
       array['E-mail']::text[],
       array['Newsletter']::text[],
       array['Lembrança de marca']::text[],
       array['Consideração']::text[],
       array['Agenda', 'Cursos Online', 'Notícias']::text[],
       '[{"label":"Design 1","url":"https://my.brevo.com/template/yriOOysTVxIqRBNqMa6Fi8gbbYqP3GSbDoMyuRwuUbPVORK5zEuGXCUpEA"}]'::jsonb,
       '2026-09-29T14:20:00.000Z',
       '2026-09-25'
from public.marketing_marcas m
cross join lateral (select coalesce(array_agg(pr.id), '{}'::uuid[]) as ids from public.profiles pr
            where split_part(translate(lower(coalesce(pr.nome, '')), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc'), ' ', 1) = any(array['mafalda', 'valeria']::text[])) r
where lower(m.nome) = '2siglas'
  and not exists (select 1 from public.marketing_conteudos x
                  where x.marca_id = m.id and x.titulo = 'Newsletter Mensal 2Siglas' and x.headline is null);

-- 28. Curso Conduzir e operar um trator em segurança (divulgação email)
insert into public.marketing_conteudos
    (marca_id, ordem, persona_ids, responsavel_ids, responsavel_id, titulo, estado, headline, conceito, cta, canais, formato, objetivo, estrategia, editoria, hashtags, copies, links, anexos, data_publicacao, data_publicacao_2)
select m.id, extract(epoch from now()) + 27,
       '{}'::uuid[],
       r.ids, r.ids[1],
       'Curso Conduzir e operar um trator em segurança (divulgação email)',
       'monitorado',
       'Curso Conduzir e operar com o trator em segurança',
       'Agenda',
       '📩 Inscreva-se já através do nosso site ou contacte-nos:
📞 289 821 753 | 912 852 135',
       array['E-mail', 'Facebook', 'Instagram']::text[],
       array['Email marketing', 'Feed único', 'Flyer']::text[],
       array['Divulgação Agenda']::text[],
       array['Consideração', 'Conversão']::text[],
       array['Agenda']::text[],
       array['#2Siglas', '#Algarve', '#CondutorDeTrator', '#FormaçãoCertificada', '#SegurançaNoTrabalho']::text[],
       '[{"titulo":"Copy 1","texto":"É condutor de veículos agrícolas?\r\n\r\nAproveite as inscrições abertas para o curso \"Conduzir e Operar com o Trator em Segurança (COTS)\" e regularize a sua formação.\r\n\r\nO Despacho n.º 9675-C/2026, de 31 de julho, prorrogou até 1 de agosto de 2027, o prazo para comprovar a conclusão deste curso.\r\n\r\nO curso será em regime presencial das 9h às 17h, em:\r\n📍 Almancil\r\n⏱️ 35 horas\r\n🗓️ dias: 19, 21, 26, 28 e 30 de outubro de 2026\r\n🪙 Valor por formando: 210 euros\r\n\r\nPara além de permitir o cumprimento dos os requisitos legais, esta formação prepara para uma condução mais consciente, eficiente e segura, através de uma aprendizagem prática e orientada para a segurança.\r\n\r\nGaranta a sua formação este ano e inscreva-se já:\r\n📞 289 821 753 | 912 852 135\r\n\r\n#CondutorDeTrator #SegurançaNoTrabalho #FormaçãoCertificada #2Siglas #Algarve"},{"titulo":"Copy 2","texto":"É condutor \r\nde veículo agrícola? O Despacho n.º 9675-C/2026, de 31 de julho, prorrogou até 1 de agosto de 2027, o prazo para comprovar a conclusão desta formação.\r\n\r\n\r\nAbrimos as inscrições para o nosso curso \r\n\"Conduzir e Operar com o Trator em Segurança (COTS)\" \r\nAproveite e regularize-se.  Formação COTS Local: Almancil\r\nPeríodo: 35 horas | Das 9h às 17h |\r\n19, 21, 26, 28 e 30 de outubro de 2026\r\nValor por formando: 210 euros Este curso destina-se a todos os que conduzem ou pretendem conduzir veículos agrícolas, com licença de condução de tipo B, C e D.\r\n\r\n\r\n\r\nO objetivo é atualizar os conhecimentos dos formandos para uma condução mais consciente, eficiente e segura, em conformidade com a legislação em vigor, através de uma aprendizagem prática e orientada para a segurança."}]'::jsonb,
       '[{"label":"Design 1","url":"https://canva.link/de22g5uohgpe8bv"}]'::jsonb,
       '[{"nome":"campaign_3.pdf","url":"","categoria":"design"}]'::jsonb,
       '2026-09-22T14:00:00.000Z',
       '2026-09-22T14:40:00.000Z'
from public.marketing_marcas m
cross join lateral (select coalesce(array_agg(pr.id), '{}'::uuid[]) as ids from public.profiles pr
            where split_part(translate(lower(coalesce(pr.nome, '')), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc'), ' ', 1) = any(array['catarina', 'mafalda', 'valeria']::text[])) r
where lower(m.nome) = '2siglas'
  and not exists (select 1 from public.marketing_conteudos x
                  where x.marca_id = m.id and x.titulo = 'Curso Conduzir e operar um trator em segurança (divulgação email)' and x.headline = 'Curso Conduzir e operar com o trator em segurança');

-- 29. Curso Distribuição e Comercialização de Produtos Fitofarmacêuticos
insert into public.marketing_conteudos
    (marca_id, ordem, persona_ids, responsavel_ids, responsavel_id, titulo, estado, prioridade, briefing, canais, formato, objetivo, estrategia, copies, links, anexos, data_publicacao, data_publicacao_2)
select m.id, extract(epoch from now()) + 28,
       '{}'::uuid[],
       r.ids, r.ids[1],
       'Curso Distribuição e Comercialização de Produtos Fitofarmacêuticos',
       'monitorado',
       'alta',
       '25 horas em Almancil final de outubro/início de novembro  150 euros',
       array['E-mail', 'Facebook', 'Instagram']::text[],
       array['Email marketing', 'Feed único']::text[],
       array['Divulgação Agenda']::text[],
       array['Consideração']::text[],
       '[{"titulo":"Copy 1","texto":"Trabalha com produtos\r\nfitofarmacêuticos?Abrimos as inscrições para o nosso curso \r\n\"Distribuição e Comercialização de Produtos Fitofarmacêuticos (DCPF)\", em regime presencial.\r\n\r\n\r\nAproveite.  Formação DCPF Local: Faro\r\nPeríodo: 25 horas | final de outubro e início de novembro de 2026\r\nValor por formando: 150 euros\r\nAcesso ao cartão: Vendedor\r\nde Produtos Fitofarmacêuticos Este curso destina-se aos profissionais comerciais de produtos fitofarmacêuticos, na área agrícola ou florestal.\r\n\r\n\r\n\r\nO objetivo é adquirir os conhecimentos para o apoio aos agricultores no momento da venda, de forma segura e de acordo com as boas práticas fitossanitárias, decorrentes do novo quadro regulamentar e das inovações técnicas."},{"titulo":"Copy 2","texto":"Trabalha com produtos fitofarmacêuticos?Já estão abertas as inscrições para o nosso curso \"Distribuição e Comercialização de Produtos Fitofarmacêuticos (DCPF)\" em regime presencial.A formação será em:📍 Faro🗓️ entre o final de outubro e o início de 2026⏱️ 25 horas🪙 Valor por formando: 150 euros🪪Acesso ao cartão de Vendedor de Produtos FitofarmacêuticosCom o curso das 2Siglas DCPF, os formandos adquirirão conhecimentos que lhes permitirão apoiar os agricultores de forma segura e de acordo com as boas práticas fitossanitárias, no âmbito do novo quadro regulamentar e das inovações técnicas.Garanta já a sua inscrição!Para mais informações, contacte-nos:📞 289 821 753 ou 912 852 135.#DistribuiçãoeComercializaçãodeProdutosFitofarmacêuticos #ProdutosFitofarmacêuticos #FormaçãoCertificada #2Siglas #Algarve"}]'::jsonb,
       '[{"label":"Design 2","url":"https://canva.link/de22g5uohgpe8bv"}]'::jsonb,
       '[{"nome":"campaign_4.pdf","url":"","categoria":"design"}]'::jsonb,
       '2026-09-24T16:30:00.000Z',
       '2026-09-22T16:00:00.000Z'
from public.marketing_marcas m
cross join lateral (select coalesce(array_agg(pr.id), '{}'::uuid[]) as ids from public.profiles pr
            where split_part(translate(lower(coalesce(pr.nome, '')), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc'), ' ', 1) = any(array['catarina', 'mafalda', 'valeria']::text[])) r
where lower(m.nome) = '2siglas'
  and not exists (select 1 from public.marketing_conteudos x
                  where x.marca_id = m.id and x.titulo = 'Curso Distribuição e Comercialização de Produtos Fitofarmacêuticos' and x.headline is null);

-- 30. Semana da Mobilidade Europeia
insert into public.marketing_conteudos
    (marca_id, ordem, persona_ids, responsavel_ids, responsavel_id, titulo, estado, copies, links, data_publicacao)
select m.id, extract(epoch from now()) + 29,
       '{}'::uuid[],
       '{}'::uuid[], null::uuid,
       'Semana da Mobilidade Europeia',
       'monitorado',
       '[{"titulo":"Copy 1","texto":"Entre 16 e 22 de setembro, celebramos a Semana Europeia da Mobilidade. E esta necessidade continua a ser pertinente.É preciso reforçar diariamente a importância da consciencialização para a mobilidade sustentável, que não se resume apenas à forma como chegamos ao nosso destino, mas também ao tipo de futuro que queremos construir. 🌍As pequenas escolhas podem contribuir para cidades mais limpas, acessíveis e preparadas para as gerações futuras.Opte por:🌱 Caminhar mais.🚲 Pedalar.🚌 Use os transportes públicos.🚗 Partilhe viagens sempre que possível.☀️ No Algarve, onde o sol doura as falésias, o caminho é feito de liberdade, inclusão e sustentabilidade. Cada um com o seu ritmo, todos na mesma direção.🧡 De bicicletas a trotinetes, de passeios a pé a soluções adaptadas, o melhor é aproveitar a viagem.Comente: qual é o seu meio de transporte favorito quando pratica a modalidade sustentável para aproveitar as paisagens do Algarve?#SemanaEuropeiaDaMobilidade #MobilidadeSustentável #Sustentabilidade #Ambiente #MobilidadeParaTodos #Portugal #CidadesSustentáveis #2siglas"}]'::jsonb,
       '[{"label":"Design 1","url":"https://canva.link/bj97x6thu6008t3"},{"label":"Design 2","url":"https://canva.link/sulr4y6b667l9fa"}]'::jsonb,
       '2026-09-23T10:45:00.000Z'
from public.marketing_marcas m
where lower(m.nome) = '2siglas'
  and not exists (select 1 from public.marketing_conteudos x
                  where x.marca_id = m.id and x.titulo = 'Semana da Mobilidade Europeia' and x.headline is null);

-- 31. Dia Mundial do Turismo (ONU Turismo), 27 set.
insert into public.marketing_conteudos
    (marca_id, ordem, persona_ids, responsavel_ids, responsavel_id, titulo, estado, briefing, conceito, design_ideia, variacoes, cta, canais, formato, estrategia, hashtags, copies, links, metrica_principal)
select m.id, extract(epoch from now()) + 30,
       coalesce((select array_agg(p.id order by p.ordem) from public.marketing_personas p
                  where p.marca_id = m.id and translate(lower(p.papel), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc') = any(array['empregador/empresario', 'gestor/influenciador']::text[])), '{}'::uuid[]),
       '{}'::uuid[], null::uuid,
       'Dia Mundial do Turismo (ONU Turismo), 27 set.',
       'monitorado',
       'Data: Dia Mundial do Turismo (ONU Turismo), 27 set. Publicação a curto prazo — prioridade de produção. Confirmar internamente quais os cursos/áreas a destacar para empresas de turismo; não prometer áreas que não estejam em oferta. [Versão LinkedIn] O turismo continua a ser o motor económico do Algarve — e também um dos setores onde a sazonalidade e a rotação de pessoas mais dificultam a formação. A época baixa é a janela natural para investir em competências.

Na 2Siglas desenhamos planos de formação à medida para empresas do setor, ajustados ao calendário do negócio. E acompanhamos o turismo também através da investigação aplicada.',
       'No Algarve, a época baixa é a melhor época para formar a equipa',
       'Fotografia real de equipa de hotelaria/restauração algarvia em contexto de trabalho, ou unidade turística fora de época com luz de outono. Overlay azul profundo #0D124B a 40–45% com texto branco (guia p.19). Template Canva: post institucional com foto tratada.',
       'Story com pergunta: ''Na sua empresa, quando é que a equipa faz formação?'' (época alta / época baixa / nunca há tempo). Email curto para clientes do setor do turismo.',
       'Planeie connosco a formação de inverno da sua equipa 👉 link na bio',
       array['Facebook', 'Instagram']::text[],
       array['Feed único']::text[],
       array['Consideração']::text[],
       array['#2Siglas', '#Algarve', '#Formaçãoàmedida']::text[],
       '[{"titulo":"Copy 1","texto":"No Dia Mundial do Turismo, pode ser uma boa hora de planear a formação de inverno para chegar a 2027 com uma equipa mais segura e mais preparada.\r\n\r\nNa http://2siglas.pt/, pode escolher e combinar, entre as várias opções de formação de autoaprendizagem, em regime online, para construir um percurso formativo e completar as 40 horas anuais de formação obrigatória dos seus profissionais.\r\n\r\n📚 Escolha os cursos.\r\n🔗 Combine diferentes formações.\r\n💻 Aprenda online, ao seu ritmo.\r\n✅ Complete as 40 horas de formação contínua.\r\n🪙Valor por formando: 210 €\r\n\r\nConsulte as opções disponíveis no nosso site: http://www.2siglas.pt/\r\nE encontre a combinação de cursos certa para a sua equipa.\r\n\r\n#2Siglas #FormaçãoProfissional #DiaMundialdoTurismo\r\n#FormaçãoCertificadda #FormaçãoOnline #InvestigaçãoemTurismo"}]'::jsonb,
       '[{"label":"Design 1","url":"https://canva.link/sulr4y6b667l9fa"}]'::jsonb,
       'Alcance'
from public.marketing_marcas m
where lower(m.nome) = '2siglas'
  and not exists (select 1 from public.marketing_conteudos x
                  where x.marca_id = m.id and x.titulo = 'Dia Mundial do Turismo (ONU Turismo), 27 set.' and x.headline is null);

-- 32. Newsletter Mensal 2Siglas (1)
insert into public.marketing_conteudos
    (marca_id, ordem, persona_ids, responsavel_ids, responsavel_id, titulo, estado, prioridade, canais, formato, objetivo, estrategia, editoria, links, data_publicacao, data_entrega)
select m.id, extract(epoch from now()) + 31,
       '{}'::uuid[],
       r.ids, r.ids[1],
       'Newsletter Mensal 2Siglas (1)',
       'publicado',
       'alta',
       array['E-mail']::text[],
       array['Newsletter']::text[],
       array['Lembrança de marca']::text[],
       array['Consideração']::text[],
       array['Agenda', 'Cursos Online', 'Notícias']::text[],
       '[{"label":"Design 1","url":"https://my.brevo.com/template/yriOOysTVxIqRBNqMa6Fi8gbbYqP3GSbDoMyuRwuUbPVORK5zEuGXCUpEA"}]'::jsonb,
       '2026-10-26T10:00:00.000Z',
       '2026-10-20'
from public.marketing_marcas m
cross join lateral (select coalesce(array_agg(pr.id), '{}'::uuid[]) as ids from public.profiles pr
            where split_part(translate(lower(coalesce(pr.nome, '')), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc'), ' ', 1) = any(array['mafalda', 'valeria']::text[])) r
where lower(m.nome) = '2siglas'
  and not exists (select 1 from public.marketing_conteudos x
                  where x.marca_id = m.id and x.titulo = 'Newsletter Mensal 2Siglas (1)' and x.headline is null);

-- 33. Cibersegurança - websérie
insert into public.marketing_conteudos
    (marca_id, ordem, persona_ids, responsavel_ids, responsavel_id, titulo, estado, conceito, cta, copies, campanha, frente)
select m.id, extract(epoch from now()) + 32,
       '{}'::uuid[],
       '{}'::uuid[], null::uuid,
       'Cibersegurança - websérie',
       'curadoria',
       'Série de exemplos do que fazer - utilizar as ideias abaixo, mas modificar o texto para não haver plágio e citar a fonte de inspiração',
       'Fonte: CNCS - Centro Nacional de Cibersegurança',
       '[{"titulo":"Copy 1","texto":"Caso os seus dados bancários tenham sido comprometidos - 1. Contactar imediatamente a sua instituição financeira para que o seu cartão de cartão de crédito/bancário seja bloqueado. Poderá solicitar o reembolso dos montantes e evitar novos roubos;\r\n\r\n2. Alterar as suas palavras-passe;\r\n\r\n3. Atualizar o seu antivírus para combater novos vírus e proteger o seu dispositivo;\r\n\r\n4. Denunciar a fraude. As informações prestadas podem ajudar a capturar o autor da fraude e a prevenir novos incidentes;\r\n\r\n5. Certificar-se de que conserva todos os elementos de prova do roubo, por exemplo, mensagens de correio eletrónico, faturas, recibos, cópia do anúncio, etc;\r\n\r\n6. Partilhar a experiência com a sua família e os seus amigos para os ajudar a proteger-se."},{"titulo":"Copy 2","texto":"um esquema fraudulento de compras on-line quando, inadvertidamente, adquire um produto on-line num website falso ou a partir de um anúncio falso colocado num website genuíno. O produto pode não existir, ser contrafeito ou de qualidade inferior.\r\n\r\nO que fazer?\r\n1. Contacte a empresa vendedora. Pode haver uma razão legítima para o problema;\r\n2. Contacte imediatamente a sua instituição financeira se: \r\n• a segurança da sua conta bancária tiver ficado comprometida; \r\n• tiver detetado movimentos invulgares na sua conta de cartão de crédito;\r\n• não tiver recebido uma resposta do retalhista ou não estiver satisfeito com a resposta recebida. Poderá, assim, evitar novos roubos;\r\n3. Altere as suas palavras-passes;\r\n4. Atualize o seu antivírus para combater novos vírus e proteger o seu dispositivo;\r\n5. Denuncie a fraude. As informações prestadas podem ajudar a capturar o autor da fraude e a evitar novos incidentes."},{"titulo":"Copy 3","texto":"Caso a sua conta numa rede social tenha sido comprometida e seus dados pessoais acessados... se ainda conseguir aceder à sua conta, deve:\r\n• Alterar as suas palavras-passe;\r\n• Alterar os dados de início de sessão de outras contas em que utilize um nome de utilizador e/ou uma palavra-passe idênticos ou semelhantes, nomeadamente os dados de aplicações associadas à conta na rede social;\r\n• Atribuir uma palavra-passe única a cada conta;\r\n•  Torne a sua conta mais segura. Procure as definições de privacidade e segurança, onde poderá encontrar ferramentas para proteger a sua conta;\r\n• Aplicar o múltiplo-fator de autenticação.\r\nSe não conseguir aceder à sua conta: \r\nSe a conta estiver totalmente bloqueada, siga o processo de recuperação de conta previsto pelo prestador. Os principais prestadores dispõem de um processo de recuperação de conta. Contacte o centro de assistência do prestador em causa para obter aconselhamento. Deve ainda:\r\n• Denunciar a fraude. As informações prestadas podem ajudar a capturar o autor da fraude e a evitar novos incidentes;\r\n• Avisar os seus contactos de que a sua conta foi pirateada. Os seus contactos podem visualizar publicações ou receber mensagens enviadas a partir da sua conta que contenham ligações fraudulentas ou informações enganosas. Informe-os de que não publicou ou enviou as mensagens, para que não cliquem em eventuais ligações."},{"titulo":"Copy 4","texto":"Em todos os casos: Comunicar o incidente a:\r\nCNCS - Centro Nacional de Cibersegurança: cert@cert.pt\r\nNo caso de uma situação fraudulenta ou crime, deve também ser comunicado ao organismo de polícia criminal mais próximo (PSP, GNR, PJ). \r\nPGR - Procuradoria Geral da República: cibercrime@pgr.pt\r\nPJ - Polícia Judiciária: unc3t@pj.pt\r\n\r\nA Associação Portuguesa de Apoio à Vítima é a entidade que coordena a Linha Internet Segura, um serviço do Centro Internet Segura que compreende:\r\n- Esclarecimento e apoio ao cidadão - para utilização mais segura, responsável e saudável da Internet e tecnologias associadas. Acessível através de formulário pedido de esclarecimento , contacto telefónico gratuito (800 21 90 90), e correio eletrónico (linhainternetsegura@apav.pt).\r\n- Serviço de denúncia de conteúdos ilegais on-line - nomeadamente Conteúdos de Abuso Sexual de Menores, Apologia ao Racismo, Apologia à Violência. Acessível através de formulário Denunciar Conteúdo Ilegal, contacto telefónico gratuito (800 21 90 90), e correio eletrónico (linhainternetsegura@apav.pt).\r\nA Linha Internet Segura funciona nos dias úteis das 8h00 às 22h00.\r\nGuarde estes contactos! Nunca sabe quando precisará deles."}]'::jsonb,
       'Série: O que fazer após uma ameaça a segurança?',
       'Cibersegurança'
from public.marketing_marcas m
where lower(m.nome) = '2siglas'
  and not exists (select 1 from public.marketing_conteudos x
                  where x.marca_id = m.id and x.titulo = 'Cibersegurança - websérie' and x.headline is null);

-- 34. Cibersegurança - conceitos
insert into public.marketing_conteudos
    (marca_id, ordem, persona_ids, responsavel_ids, responsavel_id, titulo, estado, copies, campanha, frente)
select m.id, extract(epoch from now()) + 33,
       '{}'::uuid[],
       '{}'::uuid[], null::uuid,
       'Cibersegurança - conceitos',
       'ideia',
       '[{"titulo":"Copy 1","texto":"O que é phishing? uma mensagem eletrónica fraudulenta - Um exemplo: Ontem, quando cheguei a casa fui para o escritório e liguei o meu computador pessoal. Liguei-me à rede interna sem fios (Wi-Fi), acedi ao meu email pessoal introduzindo o nome de utilizador (username) e a palavra-passe (password) e verifiquei se tinha emails por ler na caixa de entrada. Nesse momento, verifiquei que tinha um email com a imagem do meu banco, mas desconhecia o remetente. O texto do email tinha erros ortográficos e uma ligação a dizer “clique aqui”, onde cliquei e fui direcionado para uma página que me pedia o nome, número de conta bancária e palavra-passe. Fonte CNCS PHISHINGEnvio aos internautas de mensagens de correio eletrónico, com a  aparência de terem  origem  em    organizaçõesfinanceiras  credíveis,  mas  com  ligações  para falsos  sítios  Web  que  replicam  os  originais,  e  nos  quais  são  feitos  pedidos  de atualização de dados privados dos clientes.[Fonte] -Associação  para  a  Promoção  e  Desenvolvimento  da  Sociedade  de Informação."},{"titulo":"Copy 2","texto":"“Ransomware” é “malware” (software malicioso) que bloqueia os seus computadores ou dispositivos móveis ou cifra os seus ficheiros digitais. Quando isto acontece, você não consegue recuperar os seus dados sem pagar um resgate. Neste caso procurar : https://www.nomoreransom.org/pt/index.html http://www.nomoreransom.org/ e reportar o crime RANSOMWAREO Ransomware representa um tipo de malware (vírus, trojans, etc.) queinfectam os sistemas informáticos dos utilizadores e manipulam o sistema de forma a que a vítima não consiga utilizar,  parcial ou totalmente,  os dados armazenados que estão armazenados. A vítima geralmente recebe um aviso de chantagem por pop-up, pressionando a vítima a pagar um resgate para recuperar o acesso total ao sistema e aos arquivos.\r\n\r\nGlossário CNCS"},{"titulo":"Copy 3","texto":"REDE PRIVADA VIRTUAL (VPN)Rede  virtual  de  comunicação  privada  que  utiliza  uma  infraestrutura  pública  de telecomunicações para transmitir dados que são protegidos devido à utilização de técnicas de cifragem ou de encapsulação."},{"titulo":"Copy 4","texto":"PROTOCOLO HTTPSVersão  segura  do  protocolo  HTTP.  Foi  criada  pela  Netscape  Communications Corporation  para  fornecer  autenticação  e  comunicação  cifrada  e  é  usada  no comércio electrónico.[Fonte] -Associação  para  a  Promoção  e  Desenvolvimento  da  Sociedade  de Informação. Glossário CNCS"}]'::jsonb,
       'O que é… phishing? Ransomware?',
       'Cibersegurança'
from public.marketing_marcas m
where lower(m.nome) = '2siglas'
  and not exists (select 1 from public.marketing_conteudos x
                  where x.marca_id = m.id and x.titulo = 'Cibersegurança - conceitos' and x.headline is null);

-- 35. A IA não adivinha. Peça melhor, receba melhor.
insert into public.marketing_conteudos
    (marca_id, ordem, persona_ids, responsavel_ids, responsavel_id, titulo, estado, briefing, conceito, design_ideia, cta, canais, formato, estrategia, editoria, pilar, hashtags, copies, data_publicacao, metrica_principal)
select m.id, extract(epoch from now()) + 34,
       coalesce((select array_agg(p.id order by p.ordem) from public.marketing_personas p
                  where p.marca_id = m.id and translate(lower(p.papel), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc') = any(array['profissional autonomo', 'empregador/empresario', 'gestor/influenciador']::text[])), '{}'::uuid[]),
       '{}'::uuid[], null::uuid,
       'A IA não adivinha. Peça melhor, receba melhor.',
       'publicado',
       'Não repetir o conteúdo legal do post de 21/10 (''A sua equipa já usa inteligência artificial. Sabe usá-la bem?''), apenas referenciá-lo. Não mostrar o logótipo nem a interface de nenhuma ferramenta concreta de IA (neutralidade e direitos de marca). O exemplo do slide 4 deve soar real para a 2Siglas; se preferirem, adaptem-no a uma situação da agricultura ou de RH. 02/11 é o Dia dos Fiéis Defuntos: o tom prático e neutro é adequado, mas evitar humor exagerado.',
       'O tema da lei (AI Act / literacia em IA) já foi trabalhado a 21/10 com bom resultado. Este post não o repete: passa da teoria à prática com um ''antes e depois'' de um pedido feito à IA. É conteúdo para guardar, mostra competência pedagógica (formar é a nossa área) e faz a ponte para o artigo de 21/10 no CTA 2. Fórmula simples e memorável: Papel + Tarefa + Contexto + Formato.',
       'Carrossel 7 slides que imita uma janela de chat neutra e sem marca de nenhuma ferramenta específica: slide ''antes'' com a resposta genérica desfocada/riscada, slide ''depois'' com o pedido completo e as 4 partes destacadas a cores. Manter a paleta do post de 21/10 (azul profundo + ciano, ícones de linha) para dar coerência à linha de IA. Versão Reel: gravação de ecrã em ecrã dividido ''pedido vago vs. pedido bem feito'', 15–20 s, com texto sobreposto.',
       'Guarde este post para usar no próximo email que tiver de escrever.',
       array['Facebook', 'Instagram', 'LinkedIn']::text[],
       array['Carrossel', 'Reel / vídeo curto']::text[],
       array['Educação', 'Engajamento']::text[],
       array['Interesse']::text[],
       array['Sábio-Mentor']::text[],
       array['#2Siglas', '#FormaçãoContínua', '#Formaçãoàmedida']::text[],
       '[{"titulo":"Legenda Instagram/Facebook","texto":"Se a IA lhe dá respostas genéricas, o problema raramente é a ferramenta. É o pedido. 🤖\r\n\r\nUm bom pedido tem 4 ingredientes: quem a IA deve ser, o que quer que faça, o contexto e o formato da resposta. No carrossel mostramos a diferença com um exemplo real do dia a dia de uma empresa.\r\n\r\nE duas regras que nunca falham: não coloque dados pessoais de clientes em ferramentas gratuitas e reveja sempre antes de enviar.\r\n\r\nGuarde para usar no próximo email. 📌"},{"titulo":"Versão LinkedIn","texto":"A maior parte das pessoas usa a IA como um motor de pesquisa: escreve meia frase e espera um milagre.\r\n\r\nA diferença entre uma resposta inútil e uma que poupa 20 minutos está quase sempre no pedido. Papel, tarefa, contexto e formato: quatro elementos simples que qualquer colaborador pode aprender numa manhã.\r\n\r\nÉ precisamente isto que significa literacia em IA no dia a dia: menos deslumbramento, mais critério. Falámos do enquadramento legal no nosso artigo de 21 de outubro; hoje fica a parte prática.\r\n\r\nQue tarefa da sua equipa beneficiaria mais de um bom pedido à IA?"},{"titulo":"Texto dos slides","texto":"1: A IA não adivinha. Peça melhor, receba melhor.\r\n2: Pedido vago: ''Escreve um email para um cliente.'' → Resultado: genérico, longo e que ninguém enviaria.\r\n3: A receita em 4 ingredientes: PAPEL (quem a IA deve ser) · TAREFA (o que quer) · CONTEXTO (para quem, porquê, detalhes) · FORMATO (tamanho, tom, estrutura).\r\n4: Pedido bem feito: ''És responsável pelo apoio ao cliente de uma empresa de formação no Algarve. Escreve um email curto e cordial a informar um formando de que a sessão de sábado passa para as 10h. Tom próximo, máximo 5 linhas, termina com o nosso contacto.''\r\n5: Truque extra: termine com ''Antes de responderes, faz-me as perguntas de que precisares.''\r\n6: 2 regras de ouro: 🔒 nunca cole dados pessoais de clientes ou colegas em ferramentas gratuitas · 👀 reveja sempre, porque a responsabilidade pelo que envia é sua.\r\n7: Guarde este post. Quer preparar a sua equipa? Fale connosco."},{"titulo":"Stories","texto":"Story 1 – quiz: ''Qual destes pedidos dá melhor resultado?'' A) ''Faz um post'' B) ''Escreve um post de 3 linhas para o Instagram de uma padaria, tom alegre, sobre o pão de Natal.'' (resposta: B)\r\nStory 2 – link para o artigo de 21/10 sobre literacia em IA."}]'::jsonb,
       '2026-11-02T10:00:00.000Z',
       'Engajamento'
from public.marketing_marcas m
where lower(m.nome) = '2siglas'
  and not exists (select 1 from public.marketing_conteudos x
                  where x.marca_id = m.id and x.titulo = 'A IA não adivinha. Peça melhor, receba melhor.' and x.headline is null);

-- 36. Os dados do seu cartão foram roubados. O que faz nos primeiros 10 minutos?
insert into public.marketing_conteudos
    (marca_id, ordem, persona_ids, responsavel_ids, responsavel_id, titulo, estado, briefing, conceito, design_ideia, cta, canais, formato, estrategia, pilar, hashtags, copies, data_publicacao, metrica_principal, frente)
select m.id, extract(epoch from now()) + 35,
       coalesce((select array_agg(p.id order by p.ordem) from public.marketing_personas p
                  where p.marca_id = m.id and translate(lower(p.papel), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc') = any(array['profissional autonomo', 'empregador/empresario', 'gestor/influenciador']::text[])), '{}'::uuid[]),
       '{}'::uuid[], null::uuid,
       'Os dados do seu cartão foram roubados. O que faz nos primeiros 10 minutos?',
       'publicado',
       'Baseado na página ''Cibersegurança - websérie'' do Banco de Ideias (conteúdo do CNCS). Conforme indicado nessa página, o texto foi reescrito por palavras nossas e a fonte é citada (CNCS), sem copiar o original. Antes de publicar, confirmar no site do CNCS/APAV que os contactos se mantêm (mailto:cert@cert.pt; Linha Internet Segura 800 21 90 90). Não dar aconselhamento jurídico nem garantir reembolsos (depende do banco). Depois de publicar, atualizar a página da websérie com a data do Ep. 1 e calendarizar os Ep. 2 e 3.',
       'Põe em marcha a websérie ''E agora?'', que já estava no Banco de Ideias como Prioridade sem data. É o complemento perfeito aos posts de prevenção: em vez de ''como evitar'', responde ''o que fazer quando já aconteceu'', que é um conteúdo muito guardado e partilhado. Ep. 1 = dados bancários (o mais universal). Sugestão para os próximos episódios: Ep. 2 compras online em sites falsos, Ep. 3 conta de rede social pirateada. Sai 2 dias depois do teaser da nova área (03/11) e reforça a autoridade antes do lançamento de 03/12.',
       'Conceito: o carrossel é um cronómetro. Cada slide avança no tempo (00:00 → 01:00 → 04:00 → 08:00 → 10:00 ✓) e um anel ciano vivo vai enchendo, para quem desliza sentir a urgência. Slide 1 = ecrã de telemóvel bloqueado às 14:07 com a notificação de uma compra não reconhecida (banco genérico, sem marcas reais). Slides 2–4 = número do passo grande em ciano vivo, ícone (telefone, cadeado, escudo) e anel. Slide 5 = muda para fundo branco com o anel completo e um visto: o urgente está feito, os passos 4–6 (pasta, megafone, pessoas) fazem-se com calma. Slide 6 = fecha a história no mesmo telemóvel da capa, dez minutos depois (14:17): três notificações com visto (cartão bloqueado, palavra-passe alterada, análise concluída) e uma nota afixada com os contactos úteis, pensada para captura de ecrã. Identidade da série de cibersegurança: azul profundo #0D124B, ciano #009CC3, ciano vivo #00B3D2, branco; Manrope nos títulos, Montserrat no texto. Selo fixo «E agora? | Ep. 1» no canto de cada slide. Rodapé: Fonte: CNCS – Centro Nacional de Cibersegurança.',
       'Guarde este post e partilhe-o com quem precisa de o ver.',
       array['Facebook', 'Instagram', 'LinkedIn']::text[],
       array['Carrossel']::text[],
       array['Educação', 'Valorização']::text[],
       array['Cuidador']::text[],
       array['#2Siglas', '#Algarve']::text[],
       '[{"titulo":"Legenda Instagram/Facebook","texto":"14:07. O telemóvel vibra: «Compra aprovada: 849,99 €». Não foi você. 💳\r\n\r\nRespire fundo. Nos minutos seguintes, a rapidez vale mais do que o pânico, e há uma ordem certa para fazer as coisas.\r\n\r\nNo primeiro episódio da websérie «E agora?», deslize e veja o que fazer nos primeiros 10 minutos e logo a seguir. No último slide ficam os contactos certos, prontos para guardar.\r\n\r\nGuarde este post e partilhe-o com quem precisa de o ver. 🔐\r\n\r\nFonte: CNCS – Centro Nacional de Cibersegurança.\r\n\r\n#2Siglas #Algarve #Cibersegurança"},{"titulo":"Versão LinkedIn","texto":"Falamos muito de prevenção, e bem. Mas quase ninguém sabe o que fazer nos minutos a seguir a uma fraude, que é quando cada decisão conta.\r\n\r\nLançamos hoje a websérie ''E agora?'', com respostas práticas para incidentes do dia a dia, baseada nas orientações do Centro Nacional de Cibersegurança. Episódio 1: dados bancários comprometidos.\r\n\r\nVale a pena partilhar com as equipas, sobretudo com quem trata de pagamentos."},{"titulo":"Copy 3","texto":"[Texto dos slides — 6 slides, com cronómetro que avança a cada slide]\r\n1 (00:00): ecrã de telemóvel às 14:07 com notificação «O SEU BANCO · agora | Compra aprovada: 849,99 € | Não reconhece esta compra?» | Os dados do seu cartão foram roubados. O que faz nos primeiros 10 minutos? | Deslize e comece a contar\r\n2 (01:00): 1 · Ligue já ao seu banco. Peça o bloqueio do cartão e pergunte como pode pedir a devolução dos valores.\r\n3 (04:00): 2 · Mude as palavras-passe. Comece pelo email e pelo homebanking. Use uma diferente para cada conta.\r\n4 (08:00): 3 · Analise o dispositivo. Atualize o antivírus e analise o telemóvel ou o computador onde usou os dados.\r\n5 (10:00 ✓): 10 minutos. O mais urgente está feito. Agora, com calma: 4 · Guarde as provas: emails, SMS, capturas de ecrã, faturas, o site ou anúncio onde comprou. 5 · Denuncie à PSP, GNR ou PJ. Ajuda a travar novos casos. 6 · Avise a família e os colegas, para não caírem no mesmo esquema.\r\n6: 14:17. Dez minutos depois. | O pânico ficou para trás. Agora, guarde este ecrã. | O mesmo telemóvel da capa, agora às 14:17, com três notificações (a mais recente em cima): ANTIVÍRUS · há 2 min — Análise concluída. · EMAIL · há 6 min — Palavra-passe alterada. · O SEU BANCO · há 9 min — Cartão bloqueado. | Nota afixada · Contactos úteis: O seu banco — número no verso do cartão · http://CERT.PT (CNCS) — mailto:cert@cert.pt · Linha Internet Segura (APAV) — 800 21 90 90 · dias úteis · Polícia — PSP · GNR · PJ\r\nRodapé em todos: Fonte: CNCS – Centro Nacional de Cibersegurança"},{"titulo":"Stories","texto":"Story 1: sondagem «Sabe o que fazer se lhe roubarem os dados do cartão?» Sim / Mais ou menos / Não. Depois, link para o carrossel.\r\nStory 2: quiz «Qual é o primeiro passo?» Mudar as palavras-passe / Ligar ao banco (certa) / Ir à polícia.\r\nStory 3: só o slide 6 (cartão de contactos), com o texto «Tire print a isto 📌»."}]'::jsonb,
       '2026-11-05T10:00:00.000Z',
       'Engajamento',
       'Cibersegurança'
from public.marketing_marcas m
where lower(m.nome) = '2siglas'
  and not exists (select 1 from public.marketing_conteudos x
                  where x.marca_id = m.id and x.titulo = 'Os dados do seu cartão foram roubados. O que faz nos primeiros 10 minutos?' and x.headline is null);

-- 37. O seu cartão de aplicador pode ter ganho mais 5 anos. Já confirmou?
insert into public.marketing_conteudos
    (marca_id, ordem, persona_ids, responsavel_ids, responsavel_id, titulo, estado, briefing, conceito, design_ideia, cta, canais, formato, objetivo, estrategia, editoria, pilar, hashtags, copies, data_publicacao, metrica_principal, frente)
select m.id, extract(epoch from now()) + 36,
       '{}'::uuid[],
       '{}'::uuid[], null::uuid,
       'O seu cartão de aplicador pode ter ganho mais 5 anos. Já confirmou?',
       'publicado',
       'FONTES: Decreto-Lei n.º 127/2026, de 26 de junho (4.ª alteração à Lei 26/2013) e nota de clarificação da CCDR Centro: validade passa de 10 para 15 anos; cartões válidos à data de entrada em vigor (27/06/2026) ganham +5 anos automaticamente, até ao limite de 15; a renovação continua a exigir a AAPF com aproveitamento ou prova de conhecimentos (casos previstos). Ver também o Despacho DGAV n.º 40/G/2026 (certificado de formação + cartão aceites até ao fim de 2026). A VALIDAR ANTES DE PUBLICAR: (1) a página do curso no site indica ''50 horas'' no título e ''35 horas'' na duração; corrigir e usar o valor certo; (2) confirmar com a CCDR Algarve se quem tem o cartão caducado antes de 27/06/2026 pode fazer a AAPF ou precisa de repetir a APF inicial, e ajustar o slide 5; (3) preço de 180 € retirado da página atual do site. ALERTA COMERCIAL: com +5 anos automáticos, muitos aplicadores deixam de precisar de renovar agora e a procura de AAPF pode baixar. O post honesto gera confiança, mas convém reforçar a abordagem direta a empresas e a antigos formandos.',
       'Em vez do clássico ''o seu cartão está a caducar'', a 2Siglas é a primeira a dar uma boa notícia útil: desde 27/06/2026 a habilitação vale 15 anos e os cartões válidos nessa data ganharam +5 anos automaticamente. Isto posiciona a marca como fonte de confiança (Sábio-Mentor) e, no fim, filtra quem realmente precisa da AAPF agora: cartões caducados antes de 27/06/2026, quem não sabe a data e empresas com equipas a gerir. A agenda entra no último slide.',
       'Carrossel 6 slides com fotografia real de campo/estufa do Algarve (não banco de imagens genérico). Slide 1 com um cartão de aplicador estilizado e um selo ''+5 ANOS''. Slides 2–5 com tipografia grande e pouco texto (o público lê no telemóvel, muitas vezes no campo). Slide 6 = cartão de agenda com datas, local, preço e contacto bem visíveis. Paleta verde/terra da área agrícola.',
       'Faça já a pré-inscrição no link da bio. As vagas são limitadas.',
       array['Facebook', 'Instagram', 'Website']::text[],
       array['Carrossel']::text[],
       array['Divulgação Agenda']::text[],
       array['Conversão', 'Educação']::text[],
       array['Agenda', 'Informação']::text[],
       array['Cuidador', 'Sábio-Mentor']::text[],
       array['#2Siglas', '#Algarve', '#FormaçãoCertificada', '#Faro']::text[],
       '[{"titulo":"Legenda Instagram/Facebook","texto":"Atenção, aplicadores 🌱\r\n\r\nDesde 27 de junho de 2026, a habilitação de aplicador de produtos fitofarmacêuticos passou a valer 15 anos, em vez de 10. Se o seu cartão estava válido nessa data, ganhou automaticamente mais 5 anos, sem precisar de pedir nada.\r\n\r\nO que não mudou: para renovar continua a ser obrigatório fazer a ação de atualização (AAPF) com aproveitamento.\r\n\r\nSe o seu cartão caducou antes dessa data, se não sabe bem quando caduca ou se tem uma equipa para pôr em dia, fale connosco e ajudamos a perceber qual é o curso certo.\r\n\r\n📅 Próxima ação AAPF: [datas] | [horário] | [local]\r\n💶 180 € (isento de IVA)\r\n👥 Vagas limitadas: a ação avança com um mínimo de 8 formandos\r\n\r\nPré-inscrição no link da bio ou pelo 289 821 753 | 912 852 135."},{"titulo":"Versão curta para grupos de Facebook locais/agrícolas","texto":"Sabia que os cartões de aplicador de produtos fitofarmacêuticos válidos a 27/06/2026 ganharam mais 5 anos de validade? A habilitação passou de 10 para 15 anos (Decreto-Lei n.º 127/2026). Para renovar continua a ser preciso fazer a formação de atualização. Próxima ação na 2Siglas: [datas], [local]. Informações: 289 821 753."},{"titulo":"Texto dos slides","texto":"1: O seu cartão de aplicador pode ter ganho mais 5 anos. | O que mudou em 2026 e quem precisa de fazer a atualização\r\n2: O que mudou? 10 → 15 anos de validade. Desde 27/06/2026, a habilitação de aplicador vale 15 anos. Antes eram 10. | Decreto-Lei n.º 127/2026\r\n3: Cartões válidos a 27/06/2026 ganharam +5 anos automaticamente. Não precisa de fazer nada.\r\n4: O que não mudou: para renovar, continua a ser obrigatória a formação de atualização. A AAPF (Ação de Atualização em Aplicação de Produtos Fitofarmacêuticos), concluída com aproveitamento.\r\n5: Próxima ação AAPF | Atualize o seu cartão com a 2Siglas | [datas] · [horário] · [local] · 180 € (isento de IVA) | Vagas limitadas · mínimo de 8 formandos\r\n6: Fale connosco já se: o seu cartão caducou antes de 27/06/2026 · não sabe quando o seu cartão caduca · gere uma equipa com vários cartões. | CTA: Faça já a pré-inscrição no link da bio. As vagas são limitadas. | 289 821 753 · 912 852 135"},{"titulo":"Copy 4","texto":"[Mensagem para lista de difusão de WhatsApp — canal preferido das personas Ricardo e Cátia]\r\nOlá! Daqui fala a 2Siglas 👋 Sabia que os cartões de aplicador que estavam válidos a 27/06/2026 ganharam mais 5 anos de validade? Vale a pena confirmar a data do seu. Se o cartão já caducou ou está perto do fim, temos uma ação de atualização (AAPF) a [datas] em [local]. Quer que lhe guardemos lugar? Responda a esta mensagem ou ligue 289 821 753."}]'::jsonb,
       '2026-10-29T10:00:00.000Z',
       'Engajamento',
       'Obrigatórias B2B'
from public.marketing_marcas m
where lower(m.nome) = '2siglas'
  and not exists (select 1 from public.marketing_conteudos x
                  where x.marca_id = m.id and x.titulo = 'O seu cartão de aplicador pode ter ganho mais 5 anos. Já confirmou?' and x.headline is null);

-- 38. Dores nas costas ao fim do dia? Pode não ser cansaço. Pode ser o seu posto de trabalho.
insert into public.marketing_conteudos
    (marca_id, ordem, persona_ids, responsavel_ids, responsavel_id, titulo, estado, briefing, conceito, design_ideia, cta, canais, formato, objetivo, estrategia, editoria, pilar, hashtags, copies, data_publicacao, metrica_principal, frente)
select m.id, extract(epoch from now()) + 37,
       coalesce((select array_agg(p.id order by p.ordem) from public.marketing_personas p
                  where p.marca_id = m.id and translate(lower(p.papel), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc') = any(array['gestor/influenciador', 'empregador/empresario', 'encarregado de sst']::text[])), '{}'::uuid[]),
       '{}'::uuid[], null::uuid,
       'Dores nas costas ao fim do dia? Pode não ser cansaço. Pode ser o seu posto de trabalho.',
       'publicado',
       'Dados do LinkedIn: a EU-OSHA identifica as lesões músculo-esqueléticas como o problema de saúde relacionado com o trabalho mais comum na UE; o valor de cerca de 3 em cada 5 trabalhadores com queixas vem do 6.º Inquérito Europeu sobre as Condições de Trabalho (Eurofound, 2015). Não apresentar o número como dado de 2026. A CONFIRMAR: datas, duração, preço, modalidade, público-alvo e se o programa cobre também a movimentação manual de cargas (se for só escritório, retirar o plano do armazém). As dicas são gerais e não substituem a avaliação de riscos nem o aconselhamento médico; não fazer promessas de saúde.',
       'Começar pela dor física que toda a gente reconhece e dar valor imediato (3 ajustes de 30 segundos) antes de vender. Depois alargar: ergonomia não é só a cadeira do escritório; é também carregar caixas no armazém, trabalhar curvado no campo ou passar 8 horas de pé na cozinha. É isso que transforma uma dica pessoal numa necessidade de empresa (personas Ana, João e Nuno). Argumento de autoridade no LinkedIn: as lesões músculo-esqueléticas são o problema de saúde ligado ao trabalho mais comum na UE.',
       'Feed Único 1080×1350 — conceito «A coluna tem um S», com foco na formação. O símbolo da 2Siglas é um S contínuo feito de duas curvas entrelaçadas em gradiente turquesa; a coluna vertebral também tem um S natural. A coluna é desenhada como duas curvas paralelas no gradiente da marca (#00B3D2 → #009CC3), com vértebras sugeridas por um traço largo tracejado em ciano a 28%. Não é o logótipo nem uma alteração dele; o logótipo oficial aparece intacto.
Topo: etiqueta «FORMAÇÃO CERTIFICADA · ERGONOMIA» em bloco ciano vivo (Manrope ExtraBold 20, azul profundo), para o post se ler como formação desde o primeiro segundo. Título em Manrope ExtraBold 46, duas linhas (branco + ciano vivo). Antes das zonas, «NA FORMAÇÃO, APRENDE A CORRIGIR:» (Manrope ExtraBold 18, branco a 75%), para os ajustes se lerem como conteúdo do curso e não como dica de saúde. Coluna e três zonas (pescoço, ombros, costas): causa riscada em Montserrat 25 branco a 50%, ajuste em Manrope Bold 31 branco.
Base: faixa ciano vivo #00B3D2 com 340 px de altura, dedicada à formação: «Formação em Ergonomia» em Manrope ExtraBold 46 azul profundo, subtítulo e dados em Montserrat 22, botão azul profundo «Inscreva-se · link na bio», linha «Também à medida para a sua equipa» e, à direita, logótipo 2Siglas e selo DGERT.',
       'Inscreva-se no link da bio. As vagas são limitadas.',
       array['Facebook', 'Instagram', 'LinkedIn']::text[],
       array['Feed único']::text[],
       array['Divulgação Agenda']::text[],
       array['Consideração', 'Conversão']::text[],
       array['Agenda']::text[],
       array['Cuidador', 'Sábio-Mentor']::text[],
       array['#2Siglas', '#SegurançaNoTrabalho', '#Formaçãoàmedida', '#SaúdeeSegurança']::text[],
       '[{"titulo":"Legenda Instagram","texto":"Dores nas costas, no pescoço ou nos ombros ao fim do dia? Muitas vezes não é cansaço: é a forma como o posto de trabalho está montado. 💺\r\n\r\nNa Formação em Ergonomia da 2Siglas, aprende a identificar estes riscos no seu posto e a corrigi-los. Na imagem fica uma amostra: 3 ajustes que demoram 30 segundos.\r\n\r\n📅 [datas] | [horário] | [local/online]\r\n💶 [preço]\r\n🎓 Formação certificada\r\n\r\nInscreva-se no link da bio ou pelo 289 821 753 | 912 852 135. Também fazemos a formação à medida, para a sua equipa.\r\n\r\n#FormaçãoCertificada #Ergonomia #SegurançaNoTrabalho #2Siglas #FormaçãoàMedida #Algarve"},{"titulo":"Versão LinkedIn","texto":"As lesões músculo-esqueléticas são o problema de saúde relacionado com o trabalho mais comum na União Europeia, segundo a Agência Europeia para a Segurança e Saúde no Trabalho (EU-OSHA). No Inquérito Europeu sobre as Condições de Trabalho (Eurofound, 2015), cerca de 3 em cada 5 trabalhadores referiram queixas deste tipo, com as dores nas costas no topo da lista.\r\n\r\nA boa notícia é que são, em grande parte, evitáveis. A maioria das soluções não exige grandes investimentos: exige conhecimento e hábitos. Na imagem deixamos três ajustes de 30 segundos que já fazem diferença.\r\n\r\nA nossa formação em Ergonomia ajuda as equipas a identificar riscos no próprio posto de trabalho e a corrigi-los.\r\nPróxima ação: [datas], [local]. Também disponível à medida para empresas."},{"titulo":"Legenda Facebook","texto":"Dores nas costas, no pescoço ou nos ombros ao fim do dia? Muitas vezes não é cansaço: é a forma como o posto de trabalho está montado. 💺\r\n\r\nNa Formação em Ergonomia da 2Siglas, aprende a identificar estes riscos no seu posto e a corrigi-los. Na imagem fica uma amostra: 3 ajustes que demoram 30 segundos.\r\n\r\n📅 [datas] | [horário] | [local/online]\r\n💶 [preço]\r\n🎓 Formação certificada\r\n\r\nInscreva-se em [link da página do curso] ou pelo 289 821 753 | 912 852 135. Também fazemos a formação à medida, para a sua equipa.\r\n\r\n💬 Conhece alguém que passa o dia sentado? Identifique-o nos comentários.\r\n\r\n#FormaçãoCertificada #Ergonomia #2Siglas #Algarve"},{"titulo":"Copy 4","texto":"[Texto do Feed Único — conceito «coluna em S», com foco na formação]\r\nEtiqueta no topo: FORMAÇÃO CERTIFICADA · ERGONOMIA\r\nTítulo (2 linhas): Dores nas costas ao fim do dia? / Pode ser o seu posto de trabalho.\r\nIntrodução às zonas: NA FORMAÇÃO, APRENDE A CORRIGIR:\r\nTexto vertical junto à coluna: A COLUNA TEM UM S NATURAL · PROTEJA-O\r\n01 · PESCOÇO: Ecrã demasiado baixo (riscado) → Topo do ecrã à altura dos olhos.\r\n02 · OMBROS: Ombros encolhidos, pulsos dobrados (riscado) → Cotovelos junto ao corpo, pulsos direitos.\r\n03 · COSTAS: Pés no ar, costas sem apoio (riscado) → Pés apoiados, costas encostadas.\r\nBloco da formação (faixa ciano vivo): Formação em Ergonomia | Prevenir lesões, trabalhar melhor · [presencial/online] | [datas] · [horário] · [local] · [duração] · [preço] | Botão: Inscreva-se · link na bio | Também à medida para a sua equipa · 289 821 753\r\nLogótipos: 2Siglas e Formação Certificada DGERT (dentro da faixa ciano, à direita)"}]'::jsonb,
       '2026-11-09T10:00:00.000Z',
       'Alcance',
       'Obrigatórias B2B'
from public.marketing_marcas m
where lower(m.nome) = '2siglas'
  and not exists (select 1 from public.marketing_conteudos x
                  where x.marca_id = m.id and x.titulo = 'Dores nas costas ao fim do dia? Pode não ser cansaço. Pode ser o seu posto de trabalho.' and x.headline is null);

-- 39. O inverno é a melhor altura para tirar o cartão de aplicador
insert into public.marketing_conteudos
    (marca_id, ordem, persona_ids, responsavel_ids, responsavel_id, titulo, estado, briefing, conceito, design_ideia, cta, canais, formato, objetivo, estrategia, editoria, pilar, hashtags, copies, data_publicacao, metrica_principal, frente)
select m.id, extract(epoch from now()) + 38,
       coalesce((select array_agg(p.id order by p.ordem) from public.marketing_personas p
                  where p.marca_id = m.id and translate(lower(p.papel), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc') = any(array['encarregado agricola', 'profissional autonomo', 'empregador/empresario']::text[])), '{}'::uuid[]),
       '{}'::uuid[], null::uuid,
       'O inverno é a melhor altura para tirar o cartão de aplicador',
       'publicado',
       'ATENÇÃO AO LINK: o link indicado para este curso (http://2siglas.pt/site/works/aplicador-produtos-fito/) descreve a formação de renovação (destinatários com cartão, para renovação) e tem uma incoerência de horas (título com 50 h, duração com 35 h). Confirmar qual é a página certa da APF inicial e corrigir o site antes de divulgar. Preço, duração e horário a confirmar. Validade de 15 anos: Decreto-Lei n.º 127/2026, de 26 de junho. A DGAV publicou também o Despacho n.º 68/G/2026 com um regime transitório até 31/12/2026 para quem conclui a formação inicial; só referir depois de confirmar os detalhes. Diferenciar visualmente de 29/10 (AAPF) com a etiqueta ''FORMAÇÃO INICIAL''.',
       'Usar a sazonalidade a favor: novembro/dezembro são meses mais calmos no campo. Quem tirar o cartão agora chega à primavera, altura dos tratamentos, já habilitado. Segundo argumento forte e novo: com o DL 127/2026, a habilitação passa a valer 15 anos (''uma formação, 15 anos de habilitação''). Público diferente do post de 29/10: quem AINDA NÃO tem cartão (novos agricultores, jardineiros, trabalhadores de espaços verdes, empresas a contratar).',
       'Reel 25–30 s filmado no terreno (exploração, estufa ou espaço verde), com luz de inverno do Algarve. Planos curtos: calçar luvas, ler o rótulo, colocar máscara/óculos, formador a explicar. Texto sobreposto grande, legendas sempre ativas (muita gente vê sem som). Feed Único de agenda no mesmo dia com o mesmo tratamento gráfico do post AAPF de 29/10 (verde/terra), mas com a etiqueta ''FORMAÇÃO INICIAL'' bem visível para não haver confusão entre os dois cursos.',
       'Faça a pré-inscrição no link da bio e chegue à primavera já habilitado.',
       array['Facebook', 'Instagram']::text[],
       array['Feed único', 'Reel / vídeo curto']::text[],
       array['Divulgação Agenda']::text[],
       array['Consideração', 'Conversão']::text[],
       array['Agenda', 'Conversão']::text[],
       array['Cuidador', 'Sábio-Mentor']::text[],
       array['#2Siglas', '#Algarve', '#FormaçãoCertificada', '#SegurançaNoTrabalho']::text[],
       '[{"titulo":"Legenda Instagram","texto":"Lá fora, o campo abranda. É a altura certa para tratar do cartão de aplicador. 🚜\r\n\r\nQuem o tira agora chega à primavera já habilitado e não perde trabalho por falta de papel.\r\n\r\nO cartão é obrigatório para comprar e aplicar produtos fitofarmacêuticos de uso profissional, seja na agricultura, na jardinagem ou em espaços verdes. E agora vale 15 anos.\r\n\r\nNa formação inicial APF aprende a trabalhar em segurança, a proteger-se a si, a quem consome e ao ambiente, e a saber o que fazer se algo correr mal.\r\n\r\n📅 [datas] | [horário] | [local]\r\n💶 [preço]\r\n\r\nPré-inscrição no link da bio ou pelo 289 821 753 | 912 852 135. Para empresas, fazemos turmas à medida.\r\n\r\n#AplicadordeProdutosFitofarmacêuticos #FormaçãoCertificada #2Siglas #Algarve #SegurançaNoTrabalho"},{"titulo":"Texto do Feed Único de agenda","texto":"FORMAÇÃO INICIAL | Aplicação de Produtos Fitofarmacêuticos (APF)\r\nPara quem ainda não tem cartão de aplicador\r\n📅 [datas] · ⏰ [horário] · 📍 [local] · ⏱ [duração] · 💶 [preço]\r\nHabilitação válida por 15 anos\r\nPré-inscrição: link na bio | 289 821 753"},{"titulo":"Guião do Reel, 25–30 s","texto":"0–3 s: close-up de mãos a calçar luvas. Texto: ''Antes de abrir esta embalagem, há uma coisa que tem de ter.''\r\n3–9 s: leitura do rótulo, colocação de máscara e óculos. Texto: ''O cartão de aplicador. Sem ele, não pode comprar nem aplicar produtos de uso profissional.''\r\n9–17 s: formador a explicar no terreno. Texto: ''Na formação APF aprende: segurança · legislação · boas práticas · equipamentos · o que fazer em caso de acidente.''\r\n17–22 s: plano aberto do campo. Texto: ''E agora a habilitação vale 15 anos.''\r\n22–30 s: cartão final com ''[datas] · [local] · Pré-inscrição no link da bio · 2Siglas''.\r\nÁudio: música calma e ambiente de campo; nada de tendências virais que não combinem com o público."},{"titulo":"Copy 4","texto":"[Mensagem WhatsApp/Facebook para empresas agrícolas e de jardinagem]\r\nOlá! Está a contratar ou tem colaboradores novos que vão trabalhar com produtos fitofarmacêuticos? A 2Siglas tem uma turma de formação inicial APF a [datas] em [local]. A habilitação passou a valer 15 anos. Também fazemos turmas exclusivas para empresas. Fale connosco: 289 821 753."}]'::jsonb,
       '2026-11-04T10:00:00.000Z',
       'Alcance',
       'Obrigatórias B2B'
from public.marketing_marcas m
where lower(m.nome) = '2siglas'
  and not exists (select 1 from public.marketing_conteudos x
                  where x.marca_id = m.id and x.titulo = 'O inverno é a melhor altura para tirar o cartão de aplicador' and x.headline is null);

-- 40. Outubro acaba. Os ataques informáticos não.
insert into public.marketing_conteudos
    (marca_id, ordem, persona_ids, responsavel_ids, responsavel_id, titulo, estado, briefing, headline, conceito, design_ideia, cta, canais, formato, estrategia, editoria, pilar, hashtags, copies, data_publicacao, metrica_principal, frente)
select m.id, extract(epoch from now()) + 39,
       '{}'::uuid[],
       '{}'::uuid[], null::uuid,
       'Outubro acaba. Os ataques informáticos não.',
       'publicado',
       'Contexto: outubro é o Mês Europeu da Cibersegurança (ECSM); o post sai a 3 dias do fim e dá gancho temporal. Regras: não usar números/estatísticas aqui (reservados para o ''Sabia que'' de 24/11, fonte CNCS); não aprofundar phishing (carrossel de 17/11); manter tom tranquilizador, sem alarmismo. É a 1.ª peça da série, por isso a identidade visual definida aqui deve ser reutilizada em todas as peças de cibersegurança até ao lançamento de 03/12.',
       'Outubro acaba. Os ataques informáticos não.',
       'Abrir a série de cibersegurança a desmontar 3 mitos confortáveis que deixam as PME expostas. É a porta de entrada da narrativa: 28/10 introdução → 03/11 teaser da nova área → 05/11 websérie ep.1 → 10/11 NIS2 → 17/11 phishing → 24/11 fator humano → 30/11 checklist → 03/12 lançamento. Por isso este post NÃO usa estatísticas (ficam para 24/11) nem fala de phishing em detalhe (fica para 17/11). Termina a plantar curiosidade para o teaser.',
       'Carrossel 6 slides, identidade visual fixa para toda a série de cibersegurança: fundo azul profundo, destaques em ciano, ícones de linha (escudo, cadeado). Nos slides 2–4, a palavra MITO em carimbo riscado e REALIDADE por baixo, em ciano. Evitar clichés (hacker de capuz, código verde tipo Matrix). Último slide com o logo da 2Siglas e ''Continua…''.',
       'Guarde este post e partilhe-o com quem trata do email da empresa.',
       array['Facebook', 'Instagram', 'LinkedIn']::text[],
       array['Carrossel']::text[],
       array['Reconhecimento (awareness)', 'Educação']::text[],
       array['Informação']::text[],
       array['Cuidador', 'Sábio-Mentor']::text[],
       array['#2Siglas', '#Algarve']::text[],
       '[{"titulo":"Legenda Instagram/Facebook","texto":"Outubro é o Mês Europeu da Cibersegurança e está quase a acabar. Os ataques informáticos, esses, não têm calendário.\r\n\r\nAinda se ouve muito nas empresas que são pequenas demais para ser alvo, que o antivírus chega ou que isto é assunto só do informático. São três ideias confortáveis… e perigosas.\r\n\r\nNo carrossel explicamos porquê, e o que significa proteger uma empresa no dia a dia.\r\n\r\nNas próximas semanas vamos partilhar sinais de alerta, o que fazer quando algo corre mal e uma novidade da 2Siglas nesta área. 🔐\r\n\r\n👉 Guarde este post e partilhe-o com quem trata do email da empresa.\r\n\r\n#Cibersegurança #MêsEuropeuDaCibersegurança #SegurançaDigital #PME #2Siglas #Algarve #Faro"},{"titulo":"Versão LinkedIn","texto":"Uma pequena empresa raramente é atacada por ser interessante. É atacada por estar desprotegida.\r\n\r\nMuitos ataques informáticos são automáticos: os mesmos emails falsos e as mesmas tentativas de acesso chegam a milhares de empresas ao mesmo tempo. O tamanho não protege ninguém. Os hábitos, sim.\r\n\r\nNo fecho do Mês Europeu da Cibersegurança, deixamos três mitos que ainda se ouvem com frequência, e o que fazer em vez disso.\r\n\r\nQual destes já ouviu na sua empresa?\r\n\r\n#Cibersegurança #MêsEuropeuDaCibersegurança #PME #2Siglas #Algarve"},{"titulo":"Texto dos slides","texto":"1 (capa): Outubro acaba. Os ataques informáticos não. | 3 mitos que deixam as empresas expostas\r\n2: MITO: ''A minha empresa é pequena demais para interessar.'' REALIDADE: muitos ataques são automáticos e em massa. Não escolhem pelo tamanho, escolhem pela porta aberta.\r\n3: MITO: ''Temos antivírus, estamos protegidos.'' REALIDADE: o antivírus ajuda, mas não impede ninguém de escrever a palavra-passe num site falso ou de pagar uma fatura fraudulenta.\r\n4: MITO: ''Isso é com o informático.'' REALIDADE: quem usa email, telemóvel e palavras-passe faz parte da segurança da empresa. Ou seja, todos.\r\n5: Então, o que é cibersegurança? Proteger pessoas, informação e equipamentos e saber o que fazer quando algo corre mal.\r\n6: Nas próximas semanas: sinais de alerta, o que fazer se for vítima… e uma novidade da 2Siglas. Siga-nos para não perder."},{"titulo":"Stories no mesmo dia","texto":"Story 1 – sondagem: ''A sua empresa já recebeu uma tentativa de burla por email ou SMS?'' Sim / Que eu saiba, não.\r\nStory 2 – caixa de perguntas: ''Que dúvida tem sobre segurança digital?'' (as respostas alimentam os próximos posts da série).\r\nStory 3 – partilha do carrossel com o autocolante ''Guarda para depois''."}]'::jsonb,
       '2026-10-28T10:00:00.000Z',
       'Alcance',
       'Cibersegurança'
from public.marketing_marcas m
where lower(m.nome) = '2siglas'
  and not exists (select 1 from public.marketing_conteudos x
                  where x.marca_id = m.id and x.titulo = 'Outubro acaba. Os ataques informáticos não.' and x.headline = 'Outubro acaba. Os ataques informáticos não.');

-- 41. Novo Curso Sensibilização CEO
insert into public.marketing_conteudos
    (marca_id, ordem, persona_ids, responsavel_ids, responsavel_id, titulo, estado, prioridade, briefing, headline, design_ideia, cta, canais, formato, objetivo, estrategia, editoria, pilar, hashtags, copies, anexos, data_publicacao, data_entrega, metrica_principal, frente)
select m.id, extract(epoch from now()) + 40,
       coalesce((select array_agg(p.id order by p.ordem) from public.marketing_personas p
                  where p.marca_id = m.id and translate(lower(p.papel), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc') = any(array['gestor/influenciador']::text[])), '{}'::uuid[]),
       r.ids, r.ids[1],
       'Novo Curso Sensibilização CEO',
       'arquivado',
       'media',
       'Reels de 40–45 s gravado no escritório da 2Siglas, com uma pessoa da equipa a falar para a câmara (cara visível). Só é preciso um monitor, um post-it amarelo, uma caneta e um caixote do lixo.
Conceito: o post-it com a palavra-passe colado no ecrã é um hábito que toda a gente reconhece e que mostra, em segundos, como a segurança digital depende de pequenos gestos e de quem decide. A frase "a lei mudou em abril" cria a urgência. O gesto final (amarrotar o post-it e deitá-lo fora) fecha a história de forma visual.
Como gravar: telemóvel na vertical, à altura dos olhos, num tripé ou apoiado numa pilha de livros; de frente para a janela (nunca de costas para ela); gravar primeiro o grande plano do post-it, depois a abertura e cada pergunta em takes separados, e por fim o post-it a cair no lixo; falar como se estivesse a explicar a um cliente, sem ler.
Base legal: Decreto-Lei n.º 125/2025, de 4 de dezembro (NIS 2), em vigor desde 3 de abril de 2026. "Avisar as autoridades" = alerta inicial ao Centro Nacional de Cibersegurança em 24 h após conhecimento de um incidente significativo. A responsabilidade pessoal dos gestores aplica-se em casos de dolo ou culpa grave.',
       'Uma palavra-passe num post-it colado no ecrã. Quem nunca?',
       'Vídeo vertical 9:16 gravado no escritório, com luz natural. Plano de abertura: grande plano da mão a descolar do monitor um post-it amarelo com "Senha: Empresa2026" escrito à mão, bem legível. Resto do vídeo em plano médio, sentado à secretária, com o post-it na mão. Plano final: o post-it amarrotado a cair no caixote do lixo. Legendas dinâmicas em Montserrat a branco com destaques em ciano #00B3D2. Cada pergunta entra como grafismo numerado (1, 2, 3) num bloco #0D124B no terço superior do ecrã, sem tapar a cara. Capa do Reels: frame do post-it no monitor + título "Quem nunca?". Último frame com logótipo 2Siglas, selo Formação Certificada (se aplicável) e CTA.',
       'Saiba mais no link da bio.',
       array['Facebook', 'Instagram', 'LinkedIn']::text[],
       array['Feed único', 'Reel / vídeo curto']::text[],
       array['Geração de Leads', 'Lançamento']::text[],
       array['Consideração']::text[],
       array['Soluções']::text[],
       array['Criativo', 'Sábio-Mentor']::text[],
       array['#2Siglas', '#Algarve', '#Formaçãoàmedida']::text[],
       '[{"titulo":"Guião do Reels, 40–45 s","texto":"0–4 s (grande plano: uma mão descola do monitor um post-it amarelo onde se lê \"Senha: Empresa2026\"): \"Quantas empresas conhece com isto colado no ecrã?\"\r\nTexto no ecrã: Quem nunca? 🟨\r\n\r\n4–11 s (a pessoa olha para a câmara, com o post-it na mão): \"Parece um pormenor. Mas desde abril há uma nova lei europeia, a NIS 2. E com ela, proteger a empresa no mundo digital deixou de ser só tarefa da informática. Começa em quem gere.\"\r\nTexto no ecrã: A lei mudou em abril.\r\n\r\n11–14 s: \"Por isso, faça este teste rápido. São três perguntas.\"\r\nTexto no ecrã: Teste rápido para gestores\r\n\r\n14–21 s: \"Um: esta lei aplica-se à minha empresa? Não se fie só na atividade que tem registada. E, mesmo que não se aplique, os seus clientes podem vir a exigir-lhe o mesmo.\"\r\nTexto no ecrã: 1. A lei aplica-se a mim?\r\n\r\n21–29 s: \"Dois: o que é que me cabe a mim? Decidir as regras, acompanhar se são cumpridas e perceber do assunto. Porque, se algo correr mal, o gestor pode ter de responder pessoalmente.\"\r\nTexto no ecrã: 2. O que me cabe a mim?\r\n\r\n29–36 s: \"Três: se formos atacados amanhã, quem dá o alarme? A lei dá 24 horas para avisar as autoridades.\"\r\nTexto no ecrã: 3. Quem dá o alarme em 24 h?\r\n\r\n36–45 s (amarrota o post-it e atira-o para o caixote do lixo): \"Se ficou a pensar em alguma, não está sozinho. É precisamente por aí que começa o nosso novo curso para gestores. Sem tecnicismos e com casos reais. Link na bio.\"\r\nTexto final: A segurança começa em quem decide. | Curso para gestores · 2Siglas"},{"titulo":"Legenda","texto":"Uma palavra-passe num post-it colado no ecrã. Quem nunca? 🟨\r\n\r\nParece um pormenor, mas desde abril está em vigor uma nova lei europeia de cibersegurança, a NIS 2. E mudou uma coisa importante: proteger a empresa no mundo digital deixou de ser só tarefa da informática. Agora, começa em quem gere.\r\n\r\nFaça o teste. Consegue responder sem hesitar?\r\n\r\n1️⃣ Esta lei aplica-se à minha empresa?\r\n2️⃣ O que é que me cabe a mim, enquanto gestor?\r\n3️⃣ Se formos atacados, quem dá o alarme nas primeiras 24 horas?\r\n\r\nSe ficou a pensar em alguma, o nosso novo curso para gestores foi feito para si: simples, prático e com exemplos do dia a dia.\r\n\r\nSaiba mais no link da bio. 👉\r\n\r\n#Cibersegurança #NIS2 #2Siglas #Gestão #PME #Algarve"}]'::jsonb,
       '[{"nome":"app.notion.com\\\\192.168.1.240\\marketing\\2Siglas\\3_Briefing\\Sensibilização Cibersegurança Curso CEO","url":"","categoria":"briefing"}]'::jsonb,
       '2026-11-12T10:00:00.000Z',
       '2026-11-06',
       'Retenção',
       'Cibersegurança'
from public.marketing_marcas m
cross join lateral (select coalesce(array_agg(pr.id), '{}'::uuid[]) as ids from public.profiles pr
            where split_part(translate(lower(coalesce(pr.nome, '')), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc'), ' ', 1) = any(array['pedro']::text[])) r
where lower(m.nome) = '2siglas'
  and not exists (select 1 from public.marketing_conteudos x
                  where x.marca_id = m.id and x.titulo = 'Novo Curso Sensibilização CEO' and x.headline = 'Uma palavra-passe num post-it colado no ecrã. Quem nunca?');

-- 42. Reel Arboricultura — "É para si se…"
insert into public.marketing_conteudos
    (marca_id, ordem, persona_ids, responsavel_ids, responsavel_id, titulo, estado, prioridade, briefing, headline, conceito, design_ideia, cta, canais, formato, objetivo, estrategia, editoria, hashtags, copies, campanha, data_publicacao, metrica_principal)
select m.id, extract(epoch from now()) + 41,
       '{}'::uuid[],
       '{}'::uuid[], null::uuid,
       'Reel Arboricultura — "É para si se…"',
       'arquivado',
       'alta',
       'Público: quem gosta de natureza e de estar ao ar livre, quem está farto do escritório, quem trabalha em jardinagem/espaços verdes, praticantes de escalada e trail. Não usar o termo "arboricultura" no gancho (o público não o conhece). Gravado no escritório, sem imagens reais de árvores. Base: Reels do IG perdem pessoas aos 2–6 s, por isso gancho no 1.º segundo; pedir envio/partilha em vez de comentários.',
       'Mais um dia aqui sentado?',
       'Pessoa aborrecida à secretária vai acenando que sim a uma lista de frases no ecrã; no fim levanta-se e sai — "o seu escritório é lá fora".',
       'Guião (vídeo vertical, 15–16 s, luz de janela):
0–2 s — Pessoa à secretária olha para a câmara e suspira. Texto: "Mais um dia aqui sentado?"
2–4 s — Acena que sim. Texto: "Adora natureza ✅"
4–6 s — Acena que sim. Texto: "Odeia estar parado ✅"
6–8 s — Acena com entusiasmo. Texto: "Alturas? Zero medo ✅"
8–12 s — Levanta-se, pega no casaco e sai do enquadramento. Texto: "Então o seu escritório é lá fora 🌳"
12–16 s — Ecrã final verde. Texto: "Escalada em árvores · 17–20 nov · Benafim · 289 821 753"',
       'Tem um amigo que vive a olhar pela janela do escritório? Envie-lhe este vídeo. 📞 289 821 753 | 912 852 135',
       array['Facebook', 'Instagram']::text[],
       array['Reel / vídeo curto']::text[],
       array['Divulgação Agenda', 'Geração de Leads']::text[],
       array['Reconhecimento (awareness)', 'Conversão']::text[],
       array['Conversão', 'Vagas abertas']::text[],
       array['#2Siglas', '#Algarve', '#Arboricultura', '#EscaladaEmÁrvores']::text[],
       '[{"titulo":"Copy 1","texto":"Acenou às três? Já sabe o que isso quer dizer. 🌳\r\n\r\nHá quem passe o dia a olhar para um ecrã. E há quem passe o dia entre ramos, com corda, técnica e muita segurança.\r\n\r\nEm 4 dias aprende a escalar árvores e dá o primeiro passo numa profissão ao ar livre. Não precisa de experiência, só de vontade.\r\n\r\n🌿 Escalada em árvores – nível 1\r\n📍 Benafim e Vale Fuzeiros\r\n📅 17 a 20 de novembro\r\n📞 289 821 753 | 912 852 135\r\n\r\nTem um amigo que vive a olhar pela janela do escritório? Envie-lhe este vídeo. 😉\r\n\r\n#TrabalharAoArLivre #Natureza #Arboricultura #EscaladaEmÁrvores #Algarve #2Siglas"}]'::jsonb,
       'Arboricultura nível 1 · 17 a 20 nov · Benafim',
       '2026-11-11T10:00:00.000Z',
       'Alcance'
from public.marketing_marcas m
where lower(m.nome) = '2siglas'
  and not exists (select 1 from public.marketing_conteudos x
                  where x.marca_id = m.id and x.titulo = 'Reel Arboricultura — "É para si se…"' and x.headline = 'Mais um dia aqui sentado?');

-- 43. COTS — Grupo completo
insert into public.marketing_conteudos
    (marca_id, ordem, persona_ids, responsavel_ids, responsavel_id, titulo, estado, prioridade, briefing, headline, conceito, design_ideia, cta, canais, formato, objetivo, estrategia, editoria, pilar, hashtags, copies, campanha, data_publicacao, metrica_principal, frente)
select m.id, extract(epoch from now()) + 42,
       '{}'::uuid[],
       '{}'::uuid[], null::uuid,
       'COTS — Grupo completo',
       'agendado',
       'media',
       'Turma de COTS de 14/11 em Almancil esgotada. Objetivo: prova social e pré-inscrições para a próxima turma. Decisões baseadas na análise Meta (ago–nov): abrir com pergunta direta (o post COTS de 22/09 com "É condutor de veículos agrícolas?" teve o maior alcance no Facebook, 170); incluir informação concreta (acrescentar a data da próxima turma se existir); pedir envio/partilha em vez de comentários (comentários foram ~0); privilegiar contacto por mensagem. Atenção: o prolongamento até 1/8/2027 (Despacho n.º 9675-C/2026) aplica-se só a titulares de carta B que conduzam veículos agrícolas tipo II sem tomada de força, cardans ou sistema hidráulico.',
       'É condutor de veículos agrícolas?',
       'Turma esgotada como prova social, com convite para a lista de espera da próxima turma.',
       'Feed único 4:5 (1080×1350). Metade superior: fotografia de trator num campo com céu, com as rodas inteiras visíveis acima do painel (idealmente foto real da turma de 14/11). Canto superior esquerdo: selo "Formação certificada" com fundo branco sólido e texto azul profundo. Canto superior direito: selo oficial "Entidade Formadora Certificada DGERT" em cartão branco. Metade inferior: painel azul profundo #0D124B com:
• Título (branco, Manrope bold, maior): "Turma completa"
• Subtítulo (ciano #00B3D2): "Conduzir e Operar um Trator em Segurança (COTS)"
• Detalhe (branco): "Arranca hoje, 14 de novembro, em Almancil"
• Caixa ciano #00B3D2 a toda a largura, texto azul profundo: "Ficou sem lugar?" / "Inscreva-se para a próxima turma" (linha em destaque) / "289 821 753 | http://2siglas.pt"
• Rodapé esquerdo: logótipo oficial 2SIGLAS — Formação e Investigação Lda',
       'Ficou sem lugar? Inscreva-se para a próxima turma. 289 821 753 | http://2siglas.pt',
       array['Facebook', 'Instagram']::text[],
       array['Feed único']::text[],
       array['Geração de Leads', 'Lembrança de marca']::text[],
       array['Conversão', 'Valorização']::text[],
       array['Agenda', 'Prova Social']::text[],
       array['Cuidador', 'Sábio-Mentor']::text[],
       array['#2Siglas', '#Algarve', '#CondutorDeTrator', '#FormaçãoCertificada', '#SegurançaNoTrabalho']::text[],
       '[{"titulo":"Copy 1","texto":"É condutor de veículos agrícolas? 🚜\r\n\r\nA turma de COTS que arranca hoje em Almancil está completa. Obrigado a todos os formandos que confiaram na 2Siglas.\r\n\r\nPara alguns condutores, o prazo para ter o COTS foi prolongado até 1 de agosto de 2027. Ainda assim, não convém deixar para a última hora.\r\n\r\nFicou sem lugar? A próxima turma vem aí [📅 data, se já houver]. Envie-nos mensagem ou ligue 289 821 753 | 912 852 135 e faça já a pré-inscrição.\r\n\r\n👉 Conhece alguém que conduz trator e ainda não tem o curso? Envie-lhe esta publicação.\r\n\r\n#CondutorDeTrator #FormaçãoCertificada #SegurançaNoTrabalho #Algarve #2Siglas"}]'::jsonb,
       'COTS · turma de 14 nov · Almancil',
       '2026-11-14T10:00:00.000Z',
       'Alcance',
       'Obrigatórias B2B'
from public.marketing_marcas m
where lower(m.nome) = '2siglas'
  and not exists (select 1 from public.marketing_conteudos x
                  where x.marca_id = m.id and x.titulo = 'COTS — Grupo completo' and x.headline = 'É condutor de veículos agrícolas?');

-- 44. Porque é que escolhi ser formador
insert into public.marketing_conteudos
    (marca_id, ordem, persona_ids, responsavel_ids, responsavel_id, titulo, estado, conceito, design_ideia, cta, canais, formato, estrategia, editoria, pilar, hashtags, campanha, metrica_principal)
select m.id, extract(epoch from now()) + 43,
       '{}'::uuid[],
       '{}'::uuid[], null::uuid,
       'Porque é que escolhi ser formador',
       'ideia',
       'Cada formador responde numa frase à pergunta ''Porque é que escolheste ser formador?''. Versão Reel com montagem das respostas e versão LinkedIn com carrossel de retratos reais e citações. Humaniza a marca e valoriza a equipa.',
       'Retratos em contexto de trabalho, luz natural. Citação curta + nome + área + anos de experiência.',
       'Obrigado aos nossos formadores. 💙',
       array['Facebook', 'Instagram', 'LinkedIn']::text[],
       array['Carrossel', 'Reel / vídeo curto']::text[],
       array['Reconhecimento (awareness)', 'Valorização']::text[],
       array['Comemorações']::text[],
       array['Cuidador', 'Sábio-Mentor']::text[],
       array['#2Siglas', '#Algarve', '#FormaçãoCertificada']::text[],
       '18 de novembro — Dia Nacional do Formador',
       'Alcance'
from public.marketing_marcas m
where lower(m.nome) = '2siglas'
  and not exists (select 1 from public.marketing_conteudos x
                  where x.marca_id = m.id and x.titulo = 'Porque é que escolhi ser formador' and x.headline is null);

-- 45. A frase que todos os nossos formandos já ouviram
insert into public.marketing_conteudos
    (marca_id, ordem, persona_ids, responsavel_ids, responsavel_id, titulo, estado, conceito, design_ideia, cta, canais, formato, estrategia, editoria, pilar, hashtags, campanha, metrica_principal)
select m.id, extract(epoch from now()) + 44,
       '{}'::uuid[],
       '{}'::uuid[], null::uuid,
       'A frase que todos os nossos formandos já ouviram',
       'ideia',
       'Montagem rápida em que cada formador diz, para a câmara, a frase que repete em todas as formações (ex.: ''Capacete primeiro, conversa depois''). Humor leve, muito identificável para ex-formandos, e cada frase passa uma mensagem de segurança ou boa prática.',
       'Cortes rápidos, um formador por plano, em contexto real (sala, campo, trator). Nome e área do formador em legenda.',
       'Já ouviste alguma destas? Conta-nos nos comentários.',
       array['Facebook', 'Instagram', 'TikTok']::text[],
       array['Reel / vídeo curto']::text[],
       array['Reconhecimento (awareness)', 'Engajamento']::text[],
       array['Bastidores', 'Comemorações']::text[],
       array['Sábio-Mentor']::text[],
       array['#2Siglas', '#Algarve', '#SegurançaNoTrabalho']::text[],
       '18 de novembro — Dia Nacional do Formador',
       'Alcance'
from public.marketing_marcas m
where lower(m.nome) = '2siglas'
  and not exists (select 1 from public.marketing_conteudos x
                  where x.marca_id = m.id and x.titulo = 'A frase que todos os nossos formandos já ouviram' and x.headline is null);

-- 46. Curso online com certificado: 3 perguntas para saber se é válido (entidade DGERT, registo no SIGO/Passaporte Qualifica, formador)
insert into public.marketing_conteudos
    (marca_id, ordem, persona_ids, responsavel_ids, responsavel_id, titulo, estado, briefing, headline, conceito, design_ideia, cta, cta_2, canais, formato, estrategia, pilar, hashtags, copies, campanha, metrica_principal, frente)
select m.id, extract(epoch from now()) + 45,
       '{}'::uuid[],
       '{}'::uuid[], null::uuid,
       'Curso online com certificado: 3 perguntas para saber se é válido (entidade DGERT, registo no SIGO/Passaporte Qualifica, formador)',
       'agendado',
       'Frente: B2C online (Cátia, Hélder). Etapa: Descoberta/Consideração. Base de pesquisa (9 nov 2026): Google Trends mostra ''curso online'' > ''formação online'' (Faro 66% vs 30%) e pico anual em janeiro; intenção dominante ''grátis + certificado'' (IEFP). Semrush: certificado de formação profissional 170–210 (KD 32), consultar certificados de formação 140 (KD 18), sigo certificados de formação 90 (KD 7). Palavras-chave SEO (máx. 5): curso online com certificado · certificado de formação profissional · consultar certificados de formação · sigo certificados de formação · formação online certificada. Excluídas as palavras ''gratuito/grátis'' (KD 62, dominadas pelo IEFP, intenção desalinhada). Confirmar antes de publicar: certificados dos cursos online emitidos via SIGO e visíveis no Passaporte Qualifica; preço visível nas páginas de curso. Reaproveitar em janeiro (campanha Ano Novo) e transformar em artigo de blog ''Como consultar certificados de formação no SIGO''.',
       'Curso online com certificado: como saber se é válido?',
       'Checklist simples de 3 perguntas, uma ideia por slide e linguagem do dia a dia, para ajudar quem procura um curso online com certificado a confirmar se é válido. Fecha com uma dica útil (consultar certificados no Passaporte Qualifica) e com a 2Siglas a responder sim às 3 perguntas. Tom Sábio-Mentor e Cuidador, sem alarmismo.',
       'Carrossel 4:5 (1080x1350), 6 slides. Paleta #009CC3 / #00B3D2 / #0d124b, Manrope ExtraBold nos títulos e Montserrat no corpo. Slide 1 e 6 com fundo azul profundo #0d124b; slides 2–4 com fundo #EEF8FB, números 1–3 grandes em ciano e barra de progresso de 3 passos; slide 5 (dica) com fundo branco e ícone de lupa; slide 6 com botão ciano e selo DGERT. UTM: utm_source=instagram&utm_medium=social_organico&utm_campaign=b2c_certificado_1125&utm_content=carrossel_teste_certificado',
       'Veja os cursos online · link na bio (página de curso, nunca a homepage)',
       'Guarde este post para quando precisar',
       array['Facebook', 'Instagram']::text[],
       array['Carrossel']::text[],
       array['Consideração', 'Educação']::text[],
       array['Cuidador', 'Sábio-Mentor']::text[],
       array['#2Siglas', '#Algarve', '#FormaçãoCertificada']::text[],
       '[{"titulo":"Copy 1","texto":"CARROSSEL — 6 SLIDES\r\n\r\nSLIDE 1 (capa)\r\nCurso online com certificado: como saber se é válido?\r\n3 perguntas antes de se inscrever.\r\n\r\nSLIDE 2\r\nA entidade é certificada?\r\nSó uma entidade certificada pela DGERT dá formação certificada. Confirme se o nome está na lista oficial.\r\n\r\nSLIDE 3\r\nO certificado fica registado?\r\nUm certificado de formação profissional válido fica registado no SIGO e aparece no seu Passaporte Qualifica.\r\n\r\nSLIDE 4\r\nTem um formador a acompanhar?\r\nNum curso online, ter a quem fazer perguntas faz toda a diferença.\r\n\r\nSLIDE 5\r\nDica: já tem certificados?\r\nPode consultar os seus certificados de formação a qualquer momento no Passaporte Qualifica.\r\n\r\nSLIDE 6\r\nNa 2Siglas, a resposta é sim às 3.\r\nFormação online certificada, com formador real e certificado no seu Passaporte Qualifica.\r\nVeja os cursos online · link na bio"},{"titulo":"Copy 2","texto":"LEGENDA\r\nCurso online com certificado? Antes de se inscrever, faça estas 3 perguntas:\r\n\r\n1. A entidade é certificada pela DGERT?\r\n2. O certificado fica registado no Passaporte Qualifica?\r\n3. Há um formador a acompanhar?\r\n\r\nJá fez formação? Pode consultar os seus certificados de formação no Portal Qualifica.\r\n\r\nGuarde este post para quando precisar.\r\n\r\n#2Siglas #CursoOnline #FormaçãoCertificada #FormaçãoOnline #PassaporteQualifica #Algarve"},{"titulo":"Copy 3","texto":"TEXTO ALTERNATIVO (capa): Carrossel da 2Siglas com 3 perguntas para saber se um curso online com certificado é válido e como consultar certificados de formação no Passaporte Qualifica."},{"titulo":"Copy 4","texto":"PALAVRAS-CHAVE: curso online com certificado → capa, legenda, alt text · certificado de formação profissional + SIGO → slide 3 · consultar certificados de formação → slide 5, legenda, alt text · formação online certificada → slide 6."}]'::jsonb,
       'Teste de 30 segundos: o seu curso online com certificado conta mesmo? (validade, SIGO e Passaporte Qualifica)',
       'Engajamento',
       'Online B2C'
from public.marketing_marcas m
where lower(m.nome) = '2siglas'
  and not exists (select 1 from public.marketing_conteudos x
                  where x.marca_id = m.id and x.titulo = 'Curso online com certificado: 3 perguntas para saber se é válido (entidade DGERT, registo no SIGO/Passaporte Qualifica, formador)' and x.headline = 'Curso online com certificado: como saber se é válido?');

-- 47. Era a voz do chefe. Não era o chefe.
insert into public.marketing_conteudos
    (marca_id, ordem, persona_ids, responsavel_ids, responsavel_id, titulo, estado, briefing, conceito, design_ideia, cta, canais, formato, estrategia, editoria, pilar, hashtags, copies, campanha, data_publicacao, metrica_principal, frente)
select m.id, extract(epoch from now()) + 46,
       '{}'::uuid[],
       '{}'::uuid[], null::uuid,
       'Era a voz do chefe. Não era o chefe.',
       'ideia',
       'Objetivo: gerar interesse B2B e preparar o lançamento da formação online de ciber-higiene para PME (30 nov 2026). Personas: João (empresário PME), Ana (RH), Nuno (SST). Porquê agora: o CNCS publicou um relatório a alertar para o crescimento do CEO Fraud/BEC em Portugal e para o uso de deepfakes de voz e imagem de superiores; a 6 nov 2026 o Departamento de Justiça dos EUA acusou três homens de defraudar empresas em pelo menos 129 milhões de dólares com IA a imitar executivos e advogados. Duração-alvo: 45–60 s. Data sugerida: terça 24 nov, 10h00 (semana antes do lançamento). Regras do guia: nunca prometer ‘fica conforme’ com NIS2; vilões concretos, nunca o medo como argumento; não usar voz clonada real na gravação. Fontes: Tek Notícias sobre relatório CNCS; CyberScoop (6 nov 2026).',
       'Encenação curta + explicação: uma funcionária recebe uma chamada ‘do chefe’ a pedir uma transferência urgente e confidencial; corte seco para o formador revelar que a voz era falsa. Fecha com a metáfora da campanha: ‘O capacete protege no terreno. Isto é o EPI digital da sua equipa.’ Faz a ponte direta para o lançamento da formação de ciber-higiene a 30 nov.',
       'Capa do Reel: fundo #0d124b, ícone de telefone em #00B3D2, texto ‘Era a voz do chefe.’ branco + ‘Não era o chefe.’ em ciano. Legendas Manrope Bold. As 2 regras em cartões ciano numerados. Fecho com variante visual ‘Ciber’ da campanha (paleta #009CC3 / #0d124b) e ‘30 nov’.',
       'Partilhe com a sua equipa',
       array['Facebook', 'Instagram', 'LinkedIn']::text[],
       array['Reel / vídeo curto']::text[],
       array['Consideração', 'Educação']::text[],
       array['Soluções']::text[],
       array['Cuidador', 'Sábio-Mentor']::text[],
       array['#2Siglas', '#Algarve', '#SegurançaNoTrabalho']::text[],
       '[{"titulo":"Copy 1","texto":"ROTEIRO (45–60 s)\r\n0–3 s | Funcionária ao telefone, ar preocupado. Texto no ecrã: ‘O chefe ligou a pedir uma transferência urgente.’ Voz ao telefone: ‘Preciso que faças isto já. É confidencial, não fales com ninguém.’\r\n3–8 s | Corte seco para o formador: ‘Era a voz dele. Mas não era ele.’\r\n8–30 s | Formador para a câmara: ‘Hoje, bastam uns segundos de um vídeo ou de uma nota de voz para imitar uma voz com inteligência artificial. O esquema do falso CEO já não chega só por email: chega por telefone, com a voz certa e muita pressa.’\r\n30–50 s | 2 regras no ecrã. Formador: ‘Duas regras para a sua equipa. Um: pedido urgente de dinheiro? Desligue e ligue de volta para o número que já tem. Dois: combinem uma palavra-código para pagamentos fora do normal.’\r\n50–60 s | Formador: ‘O capacete protege no terreno. Isto é o EPI digital da sua equipa.’ Logótipo 2Siglas + ‘30 nov’."},{"titulo":"Copy 2","texto":"LEGENDA\r\nEra a voz do chefe. Não era o chefe.\r\n\r\nCom inteligência artificial, bastam poucos segundos de áudio para imitar uma voz. O esquema do falso CEO, que o Centro Nacional de Cibersegurança aponta como estando a crescer em Portugal, já chega por telefone e por nota de voz.\r\n\r\nDuas regras simples para qualquer equipa:\r\n1. Pedido urgente de pagamento? Desligue e ligue de volta para o número que já tem.\r\n2. Combinem uma palavra-código para pagamentos fora do normal.\r\n\r\nA 30 de novembro há novidades da 2Siglas para proteger a sua equipa também no digital.\r\n\r\n#2Siglas #Cibersegurança #CiberHigiene #FalsoCEO #PME #Algarve"},{"titulo":"Copy 3","texto":"TEXTOS NO ECRÃ\r\n1. O chefe ligou a pedir uma transferência urgente.\r\n2. Era a voz dele. Não era ele.\r\n3. A IA imita uma voz com poucos segundos de áudio\r\n4. Regra 1: desligue e ligue de volta para o número que já tem\r\n5. Regra 2: palavra-código para pagamentos fora do normal\r\n6. O EPI digital da sua equipa · 30 nov\r\n\r\nVERSÃO LINKEDIN (post que acompanha o vídeo)\r\nO falso CEO mudou de canal: agora liga, com a voz certa. Duas regras que qualquer PME pode aplicar amanhã: verificar por um contacto conhecido e combinar uma palavra-código para pagamentos fora do normal. A ciber-higiene é o EPI digital da equipa. A 30 de novembro, a 2Siglas tem novidades nesta área."},{"titulo":"Copy 4","texto":"NOTAS DE GRAVAÇÃO PARA O FORMADOR\r\n• Cena de abertura com 2 pessoas: uma colega faz de funcionária; outra pessoa faz a ‘voz do chefe’ ao telefone (em alta-voz). NÃO usar ferramentas de clonagem de voz real.\r\n• Escritório real ou sala de formação da 2Siglas (autenticidade, como pede o guia de marca).\r\n• Corte seco aos 3 s para o formador, plano médio, a olhar para a lente.\r\n• Vertical 9:16, legendas sempre visíveis, tom calmo e confiante.\r\n• Não mencionar NIS2 nem prometer conformidade.\r\n• Exportar duas versões: 9:16 (Instagram/Facebook) e 4:5 ou 1:1 (LinkedIn)."}]'::jsonb,
       'Reel · Falso CEO com voz clonada por IA: 2 regras para proteger a equipa (pré-lançamento ciber-higiene)',
       '2026-11-24T10:00:00.000Z',
       'Engajamento',
       'Cibersegurança'
from public.marketing_marcas m
where lower(m.nome) = '2siglas'
  and not exists (select 1 from public.marketing_conteudos x
                  where x.marca_id = m.id and x.titulo = 'Era a voz do chefe. Não era o chefe.' and x.headline is null);

-- 48. Recebeu dinheiro por engano? Não devolva.
insert into public.marketing_conteudos
    (marca_id, ordem, persona_ids, responsavel_ids, responsavel_id, titulo, estado, briefing, conceito, design_ideia, cta, canais, formato, estrategia, editoria, pilar, hashtags, copies, campanha, data_publicacao, metrica_principal, frente)
select m.id, extract(epoch from now()) + 47,
       '{}'::uuid[],
       '{}'::uuid[], null::uuid,
       'Recebeu dinheiro por engano? Não devolva.',
       'ideia',
       'Objetivo: alcance e partilhas num tema muito atual, aquecendo a frente de cibersegurança antes do lançamento da formação de ciber-higiene (30 nov). Personas: todas (B2C Cátia/Hélder/Marta e B2B João/Ana), porque toda a gente usa MB WAY. Porquê agora: a PSP alertou para o esquema da transferência inesperada seguida de pedido de devolução por WhatsApp; o tema voltou à imprensa na semana de 2–6 nov 2026 (Leak, Magazine HD, Techenet) e o Millennium bcp alertou a 3 nov para SMS falsos de ‘atualização de segurança’ do MB WAY. Duração-alvo: 30–40 s. Data sugerida: quinta 12 nov, 10h00 (melhor horário do último conteúdo de ciber). Regras: não prometer recuperação de dinheiro; recomendar sempre banco + queixa às autoridades. Fontes: PSP (X, 21 abr 2026); http://leak.pt (6 nov 2026); http://magazine-hd.com (2 nov 2026); http://techenet.com (2 nov 2026).',
       'Pattern interrupt: o gesto que parece honesto (devolver dinheiro que não é nosso) é precisamente a armadilha. O formador desmonta o esquema em 30–40 s e deixa 3 passos claros. Frente ciber em aquecimento antes do lançamento de 30 nov; tom Sábio-Mentor sem alarmismo.',
       'Capa do Reel: fundo #0d124b, texto grande branco ‘Recebeu dinheiro por engano?’ + ‘Não devolva.’ em #00B3D2. Legendas Manrope Bold, branco com caixa #0d124b a 85%. Passos numerados em ciano. Logótipo 2Siglas no fim. Sem música com direitos; som da notificação como gancho.',
       'Partilhe com quem usa MB WAY',
       array['Facebook', 'Instagram', 'TikTok']::text[],
       array['Reel / vídeo curto']::text[],
       array['Reconhecimento (awareness)', 'Educação']::text[],
       array['Notícias']::text[],
       array['Cuidador', 'Sábio-Mentor']::text[],
       array['#2Siglas', '#Algarve']::text[],
       '[{"titulo":"Copy 1","texto":"ROTEIRO (30–40 s)\r\n0–3 s | Grande plano do telemóvel, notificação ‘Recebeu 50 €’. Texto no ecrã: ‘Recebeu dinheiro por engano? Não devolva.’ Só o som da notificação.\r\n3–10 s | Chega mensagem de WhatsApp de outro número: ‘Olá, enganei-me, pode devolver para este número?’ Formador (off): ‘Parece honesto devolver, certo? É exatamente com isso que contam.’\r\n10–25 s | Formador para a câmara: ‘Quem lhe enviou o dinheiro pode estar a usar a sua conta para fazer circular dinheiro de crimes. E se devolver para outro número, está a ajudar a apagar o rasto, sem saber.’\r\n25–35 s | 3 passos no ecrã. Formador: ‘Não devolva. Ligue para o seu banco, pela linha oficial. Guarde as mensagens e faça queixa.’\r\n35–40 s | Logótipo 2Siglas. Formador: ‘Partilhe com quem usa MB WAY.’"},{"titulo":"Copy 2","texto":"LEGENDA\r\nRecebeu dinheiro por engano no MB WAY e logo a seguir pedem-lhe para devolver? Pare.\r\n\r\nA PSP alertou para este esquema: o dinheiro pode ter origem ilícita e, ao devolvê-lo para outro número, pode estar a ajudar a esconder o rasto de um crime.\r\n\r\nO que fazer:\r\n1. Não devolva por iniciativa própria.\r\n2. Contacte o seu banco pela linha oficial.\r\n3. Guarde as mensagens e os números e apresente queixa à PSP, GNR, PJ ou através da Queixa Eletrónica.\r\n\r\nE lembre-se: para receber dinheiro no MB WAY, nunca precisa de introduzir o PIN.\r\n\r\nPartilhe com quem usa MB WAY.\r\n\r\n#2Siglas #MBWAY #Burlas #Cibersegurança #CiberHigiene #Algarve"},{"titulo":"Copy 3","texto":"TEXTOS NO ECRÃ (legendas fixas)\r\n1. Recebeu dinheiro por engano? Não devolva.\r\n2. ‘Enganei-me, devolve para este número’ = sinal de alerta\r\n3. Pode estar a ajudar a esconder dinheiro de crimes\r\n4. ① Não devolva ② Ligue ao banco (linha oficial) ③ Guarde provas e faça queixa\r\n5. Para receber no MB WAY nunca precisa do PIN\r\n6. Partilhe com quem usa MB WAY"},{"titulo":"Copy 4","texto":"NOTAS DE GRAVAÇÃO PARA O FORMADOR\r\n• Vertical 9:16, luz natural, telemóvel estável (tripé).\r\n• Gravar o ecrã do telemóvel com uma notificação e uma conversa de WhatsApp simuladas (números fictícios, sem nomes reais, sem dados bancários visíveis).\r\n• Tom calmo e próximo: explica, não assusta.\r\n• Falar devagar; frases curtas; olhar para a lente.\r\n• Legendas sempre no ecrã (muita gente vê sem som).\r\n• Publicar primeiro no Instagram com o ficheiro original (sem marca de água do TikTok)."}]'::jsonb,
       'Reel · Burla MB WAY da transferência inesperada + pedido de devolução por WhatsApp (alerta PSP)',
       '2026-11-12T10:00:00.000Z',
       'Alcance',
       'Cibersegurança'
from public.marketing_marcas m
where lower(m.nome) = '2siglas'
  and not exists (select 1 from public.marketing_conteudos x
                  where x.marca_id = m.id and x.titulo = 'Recebeu dinheiro por engano? Não devolva.' and x.headline is null);

-- 49. Esta loja não existe.
insert into public.marketing_conteudos
    (marca_id, ordem, persona_ids, responsavel_ids, responsavel_id, titulo, estado, briefing, conceito, design_ideia, cta, canais, formato, estrategia, editoria, pilar, hashtags, copies, campanha, data_publicacao, metrica_principal, frente)
select m.id, extract(epoch from now()) + 48,
       '{}'::uuid[],
       '{}'::uuid[], null::uuid,
       'Esta loja não existe.',
       'ideia',
       'Objetivo: alcance e guardados na semana antes do pico da Black Friday (27 nov 2026) e ponte natural para a campanha Black Friday B2C da 2Siglas. Personas: Cátia, Hélder, Marta (B2C). Porquê agora: a Black Friday é a 27 nov; em 2026 a IA permite criar em segundos lojas falsas com fotografias, avaliações e textos em português quase perfeito (ECO, opinião, out 2026); a ESET alertou que assistentes de IA podem sugerir lojas fraudulentas, embora sem evidência de campanha generalizada em Portugal; a GNR recomenda escrever o endereço à mão em vez de clicar em links de anúncios ou mensagens. Duração-alvo: ~45 s (cerca de 120 palavras). Data sugerida: segunda 23 nov, 10h00 (alternativa: terça 24 nov). Pré-requisitos: checkout de http://2siglas.pt testado; loja da gravação 100% fictícia (nunca imitar marca ou site real). Fontes: http://leak.pt (Black Friday 2026); http://eco.sapo.pt; http://grandeconsumo.com (ESET); http://leak.pt (aviso GNR).',
       'O formador ‘faz compras’ no telemóvel e, em 3 verificações rápidas (endereço, contactos, pagamento), desmonta uma loja que parece perfeita mas foi criada com IA. Fecho com o exemplo da própria 2Siglas: a Black Friday da marca só acontece em http://2siglas.pt. Liga o conteúdo educativo à campanha B2C sem urgência artificial.',
       'Capa do Reel: fundo #0d124b, ‘Esta loja’ em branco + ‘não existe.’ em #00B3D2, com o telemóvel a mostrar a loja fictícia desfocada atrás. Cartões das 3 verificações numerados em ciano, Manrope Bold. Fecho com logótipo 2Siglas e ‘http://2siglas.pt’ bem visível. Sem música com direitos; som de scroll e de clique como apoio. UTM do link na bio: utm_source=instagram&utm_medium=social_organico&utm_campaign=b2c_blackfriday_2026&utm_content=reel_loja_falsa',
       'Guarde este vídeo para dia 27',
       array['Facebook', 'Instagram', 'TikTok']::text[],
       array['Reel / vídeo curto']::text[],
       array['Reconhecimento (awareness)', 'Educação', 'Engajamento']::text[],
       array['Comemorações']::text[],
       array['Cuidador', 'Sábio-Mentor']::text[],
       array['#2Siglas', '#Algarve']::text[],
       '[{"titulo":"Copy 1","texto":"ROTEIRO POR BLOCOS (~45 s) — negrito = acentuar · / = pausa\r\n\r\nBLOCO 1 · Gancho (0–3 s) | Ação: mostra o telemóvel à câmara com a loja aberta.\r\nFala: ‘Esta loja / não existe.’\r\n\r\nBLOCO 2 · O problema (3–10 s) | Ação: scroll devagar pela loja.\r\nFala: ‘Parece perfeita. Fotografias bonitas, avaliações de cinco estrelas, setenta por cento de desconto. / Mas foi feita com inteligência artificial, em minutos.’\r\n\r\nBLOCO 3 · Transição (10–12 s) | Ação: olha para a câmara.\r\nFala: ‘Antes de pagar, faça três verificações.’\r\n\r\nBLOCO 4 · Verificação 1 (12–19 s) | Ação: aponta para a barra de endereço.\r\nFala: ‘Um: o endereço. Leia letra a letra. / Uma letra trocada e já não é a loja que pensa.’\r\n\r\nBLOCO 5 · Verificação 2 (19–26 s) | Ação: scroll até ao fundo da página.\r\nFala: ‘Dois: os contactos. Procure uma morada e um telefone reais. / Se não houver, desconfie.’\r\n\r\nBLOCO 6 · Verificação 3 (26–34 s) | Ação: abre a página de pagamento.\r\nFala: ‘Três: o pagamento. Se só aceita transferência ou MB WAY para um particular, / pare.’\r\n\r\nBLOCO 7 · Dica extra (34–40 s) | Ação: baixa o telemóvel, fala para a câmara.\r\nFala: ‘E se chegou aqui por um anúncio ou por uma mensagem, / não clique. Escreva o endereço à mão.’\r\n\r\nBLOCO 8 · Fecho (40–47 s) | Ação: guarda o telemóvel e sorri.\r\nFala: ‘Na nossa Black Friday, a regra é a mesma: / só em dois siglas ponto pt. / Guarde este vídeo para dia 27.’"},{"titulo":"Copy 2","texto":"LEGENDA\r\nEsta loja não existe, mas parecia perfeita.\r\n\r\nNa Black Friday, a inteligência artificial ajuda os burlões a criar lojas falsas com fotografias, avaliações e textos muito convincentes. Antes de pagar, faça 3 verificações:\r\n\r\n1. O endereço do site é mesmo o da loja?\r\n2. Há morada e contactos reais?\r\n3. O pagamento é feito por um meio seguro, e não por transferência para um particular?\r\n\r\nChegou por um anúncio ou mensagem? Escreva o endereço à mão em vez de clicar.\r\n\r\nGuarde este vídeo para dia 27 e envie a quem vai às compras.\r\n\r\n#2Siglas #BlackFriday #ComprasOnline #Burlas #CiberHigiene #Algarve"},{"titulo":"Copy 3","texto":"TEXTOS NO ECRÃ\r\n1. ESTA LOJA NÃO EXISTE.\r\n2. Feita com IA, em minutos\r\n3. 3 verificações antes de pagar\r\n4. 1. O endereço está certo?\r\n5. 2. Há morada e contactos reais?\r\n6. 3. Como pede para pagar?\r\n7. Anúncio ou SMS? Escreva o endereço à mão\r\n8. Black Friday 2Siglas · só em http://2siglas.pt · Guarde para dia 27\r\n\r\nVERSÃO PARA TELEPONTO\r\nEsta loja não existe. Parece perfeita. Fotografias bonitas, avaliações de cinco estrelas, setenta por cento de desconto. Mas foi feita com inteligência artificial, em minutos. Antes de pagar, faça três verificações. Um: o endereço. Leia letra a letra. Uma letra trocada e já não é a loja que pensa. Dois: os contactos. Procure uma morada e um telefone reais. Se não houver, desconfie. Três: o pagamento. Se só aceita transferência ou MB WAY para um particular, pare. E se chegou aqui por um anúncio ou por uma mensagem, não clique. Escreva o endereço à mão. Na nossa Black Friday, a regra é a mesma: só em dois siglas ponto pt. Guarde este vídeo para dia 27."},{"titulo":"Copy 4","texto":"NOTAS DE GRAVAÇÃO PARA O FORMADOR\r\n• Gravar bloco a bloco (facilita a edição e permite repetir só o que correu mal).\r\n• A loja mostrada tem de ser inventada: nome e marca fictícios, produtos genéricos, maqueta simples no Canva gravada no ecrã do telemóvel. Nunca mostrar ou imitar o site, logótipo ou nome de uma loja real.\r\n• Tom de quem dá uma dica a um amigo, não de quem dá um aviso. Nos blocos 4–6, manter a mesma estrutura (‘Um: o endereço…’) para criar ritmo.\r\n• O ‘pare’ do bloco 6 é o único momento mais firme: pausa antes para lhe dar peso.\r\n• Vertical 9:16, legendas em todo o vídeo, luz natural.\r\n• Confirmar que o checkout de http://2siglas.pt está a funcionar antes de publicar.\r\n• Publicar primeiro no Instagram com o ficheiro original (sem marca de água do TikTok)."}]'::jsonb,
       'Reel · Black Friday: 3 verificações para detetar uma loja online falsa criada com IA',
       '2026-11-23T10:00:00.000Z',
       'Alcance',
       'Online B2C'
from public.marketing_marcas m
where lower(m.nome) = '2siglas'
  and not exists (select 1 from public.marketing_conteudos x
                  where x.marca_id = m.id and x.titulo = 'Esta loja não existe.' and x.headline is null);

-- 50. Fraude E-mail
insert into public.marketing_conteudos
    (marca_id, ordem, persona_ids, responsavel_ids, responsavel_id, titulo, estado, briefing, conceito, design_ideia, cta, canais, formato, objetivo, estrategia, editoria, pilar, hashtags, copies, campanha, data_publicacao, data_publicacao_2, metrica_principal, frente)
select m.id, extract(epoch from now()) + 49,
       '{}'::uuid[],
       '{}'::uuid[], null::uuid,
       'Fraude E-mail',
       'producao',
       'Personas: João (empresário PME), Ana (RH), Nuno (SST). Arquétipos: Sábio-Mentor + Criativo (A), Sábio-Mentor + Cuidador (B). Funil: descoberta/consideração ciber. KPI: leads de cibersegurança (meta 50) via inscrições na sessão online gratuita; guardados e partilhas. Restrições: nunca prometer “fica conforme NIS2”; só usar “certificada” e selo Formação Certificada depois de confirmar a área 482; sem urgência artificial; PT-PT.',
       'Metáfora central B2B: o capacete protege no terreno, a ciber-higiene protege no ecrã. Ideia A: carrossel que emparelha cada EPI físico com o seu equivalente digital e leva à sessão online gratuita. Ideia B: post estático com um e-mail falso anotado (“fatura em atraso”), o vilão concreto da época de Black Friday e Natal, sem alarmismo.',
       'feed único 1080×1350, fundo branco, mockup de e-mail falso com 3 marcadores numerados #00B3D2. Manrope ExtraBold títulos · Montserrat corpo. Especificação slide a slide no corpo desta página.',
       'Inscreva-se na sessão online gratuita · link na bio',
       array['Facebook', 'Instagram', 'LinkedIn']::text[],
       array['Carrossel', 'Feed único']::text[],
       array['Lançamento']::text[],
       array['Reconhecimento (awareness)', 'Conversão', 'Educação']::text[],
       array['Notícias']::text[],
       array['Cuidador', 'Sábio-Mentor']::text[],
       array['#2Siglas', '#Algarve', '#SegurançaNoTrabalho']::text[],
       '[{"titulo":"Copy 2","texto":"IDEIA B · LEGENDA\r\nNovembro e dezembro são meses de muitas faturas, encomendas e pagamentos. São também os meses preferidos para a fraude do falso fornecedor.\r\n\r\nTrês sinais que qualquer pessoa da equipa consegue reconhecer:\r\n1. O domínio não bate certo. O nome parece familiar, o endereço não.\r\n2. Pressa e ameaça: “hoje”, “até às 18h”, “evite a suspensão”.\r\n3. Um pedido para mudar o IBAN ou os dados de pagamento.\r\n\r\nA regra de ouro: na dúvida, confirme por telefone, com o número que já tinha, nunca com o que vem no e-mail.\r\n\r\nJá recebeu um e-mail assim na sua empresa? Conte-nos nos comentários.\r\nE se quer que toda a equipa os saiba reconhecer, a sessão online gratuita de ciber-higiene está no link da bio.\r\n\r\n#2Siglas #FormaçãoProfissional #CiberHigiene #Cibersegurança #PME #Algarve"}]'::jsonb,
       '30 nov · Dia Internacional da Segurança Informática · Lançamento da formação em ciber-higiene',
       '2026-11-30T10:00:00.000Z',
       '2026-11-26T10:00:00.000Z',
       'Engajamento',
       'Cibersegurança'
from public.marketing_marcas m
where lower(m.nome) = '2siglas'
  and not exists (select 1 from public.marketing_conteudos x
                  where x.marca_id = m.id and x.titulo = 'Fraude E-mail' and x.headline is null);

-- 51. Ainda vai a tempo: feche as horas de formação de 2026 com a 2Siglas
insert into public.marketing_conteudos
    (marca_id, ordem, persona_ids, responsavel_ids, responsavel_id, titulo, estado, briefing, headline, conceito, design_ideia, cta, canais, formato, estrategia, editoria, pilar, hashtags, copies, campanha, data_publicacao, data_publicacao_2, metrica_principal, frente)
select m.id, extract(epoch from now()) + 50,
       '{}'::uuid[],
       '{}'::uuid[], null::uuid,
       'Ainda vai a tempo: feche as horas de formação de 2026 com a 2Siglas',
       'briefing',
       'Personas: Ana (RH), João (empresário PME), Nuno (SST). Arquétipos: Sábio-Mentor + Cuidador. Funil: consideração/decisão B2B. Mensagem: o ano está a acabar e ainda vai a tempo de fechar as horas de formação de 2026 nas formações da 2Siglas. Tom positivo, sem alarmismo nem prazos legais. KPI: pedidos de proposta e inscrições até 18 dez. Sem referência a preços.',
       '2026 está a acabar. As horas de formação da sua equipa já estão feitas?',
       'O ano está quase no fim, mas ainda há tempo. Uma barra do ano (janeiro a dezembro) quase cheia, com o marcador “Estamos aqui” em novembro e o troço final destacado “Ainda vai a tempo · turmas até 18 dez”. Leva quem ainda não fechou as horas de 2026 a inscrever a equipa nas formações da 2Siglas antes do fecho do ano.',
       'Feed único 1080×1350, fundo branco. Etiqueta “AINDA VAI A TEMPO”, título em #0d124b, barra do ano com 12 meses (preenchida #009CC3 até meados de novembro, troço final em #0d124b com “Turmas até 18 dez”), marcador “Estamos aqui”, três vantagens com ✓ #009CC3 e faixa de rodapé #0d124b com CTA. Logótipo no canto superior esquerdo, selo DGERT no rodapé. Especificação no corpo desta página.',
       'Peça proposta em 48 h · link na bio',
       array['Facebook', 'Instagram', 'LinkedIn']::text[],
       array['Feed único']::text[],
       array['Consideração', 'Conversão']::text[],
       array['Conversão']::text[],
       array['Cuidador', 'Sábio-Mentor']::text[],
       array['#2Siglas', '#Algarve', '#FormaçãoCertificada', '#Faro', '#FormaçãoContínua']::text[],
       '[{"titulo":"Copy 1","texto":"LEGENDA\r\nNovembro já vai a meio e dezembro está aí. E as horas de formação da sua equipa em 2026, já estão todas feitas?\r\n\r\nSe ainda faltam algumas, não é preciso esperar por janeiro. Ainda vai a tempo de fechar o ano em dia com a 2Siglas.\r\n\r\n✔ Turmas abertas até 18 de dezembro, presenciais no Algarve ou online\r\n✔ Formação à medida, só para a sua equipa, com as datas que lhe dão jeito\r\n✔ Formação certificada, com certificados registados no SIGO\r\n\r\nDiga-nos quantas pessoas e quantas horas faltam. Enviamos proposta em 48 horas.\r\nLink na bio.\r\n\r\n#2Siglas #FormaçãoCertificada #FormaçãoContínua #Formação40Horas #RecursosHumanos #Algarve #Faro"}]'::jsonb,
       'Fim do ano · horas de formação de 2026 · ainda há turmas até 18 dez',
       '2026-11-17T10:00:00.000Z',
       '2026-11-19T10:00:00.000Z',
       'Engajamento',
       'Obrigatórias B2B'
from public.marketing_marcas m
where lower(m.nome) = '2siglas'
  and not exists (select 1 from public.marketing_conteudos x
                  where x.marca_id = m.id and x.titulo = 'Ainda vai a tempo: feche as horas de formação de 2026 com a 2Siglas' and x.headline = '2026 está a acabar. As horas de formação da sua equipa já estão feitas?');

-- 52. 3 ferramentas que pode juntar ao seu CV em 2027.
insert into public.marketing_conteudos
    (marca_id, ordem, persona_ids, responsavel_ids, responsavel_id, titulo, estado, briefing, conceito, design_ideia, cta, canais, formato, estrategia, editoria, pilar, hashtags, copies, campanha, data_publicacao, data_publicacao_2, metrica_principal, frente)
select m.id, extract(epoch from now()) + 51,
       '{}'::uuid[],
       '{}'::uuid[], null::uuid,
       '3 ferramentas que pode juntar ao seu CV em 2027.',
       'agendado',
       'Personas: Cátia (independente), Hélder (futuro formador/CCP), Marta (treinadora). Arquétipos: Cuidador + Criativo (com o Sábio-Mentor na clareza de preço e certificado). Funil: descoberta (A) e decisão (B). KPI: inscrições online pagas (meta 80) e vales-formação (meta 30); comentários (A). Sem urgência artificial: mencionar a Black Friday só como data. Ligações sempre para a página de curso, nunca para a homepage.',
       'Metáfora central B2C: cada certificado é uma ferramenta nova para aceitar mais clientes ou mudar de função. Ideia A: carrossel “5 ferramentas que pode juntar ao seu CV em 2027”, um curso online por slide, que aquece a Black Friday. Ideia B: post “Este Natal, ofereça uma ferramenta” com uma etiqueta de presente que é, na verdade, um vale-formação.',
       'A = carrossel 8 slides 1080×1350, fundo branco, cada ferramenta numa “etiqueta de ferramenta” (cartão com furo) em ciano #009CC3 com número grande, foto real do perfil de formando de cada curso. B = feed único 1080×1350, fundo azul profundo #0d124b, etiqueta de presente branca inclinada −6° com fio #00B3D2 e campos Para/De. Especificação slide a slide no corpo desta página.',
       'Responda com o número nos comentários · cursos online no link da bio',
       array['Facebook', 'Instagram']::text[],
       array['Carrossel', 'Feed único']::text[],
       array['Reconhecimento (awareness)', 'Conversão', 'Engajamento']::text[],
       array['Conversão', 'Interesse']::text[],
       array['Cuidador']::text[],
       array['#2Siglas', '#Algarve', '#FormaçãoCertificada', '#FormaçãoContínua']::text[],
       '[{"titulo":"Copy 1","texto":"Cada certificado é uma ferramenta nova. Para aceitar mais clientes, pedir uma função diferente ou começar a ensinar o que já sabe fazer.\r\n\r\nTrês ferramentas que pode juntar ao seu CV em 2027:\r\n1. Gestão da Formação (FCF)\r\n2. Desenvolvimento Pessoal\r\n3. Desporto e Saúde\r\n\r\nOnline ou presencial e certificado de uma entidade certificada pela DGERT. A inscrição faz-se em três passos.\r\n\r\nQual vai juntar primeiro? Responda com o número nos comentários.\r\n\r\nCursos no link da bio.\r\n\r\n#2Siglas #FormaçãoCertificada #FormaçãoOnline #DesenvolvimentoPessoal #FormaçãoProfissional #Algarve"}]'::jsonb,
       'Caixa de ferramentas · B2C online · Black Friday (27 nov) + Vale-formação de Natal (1–20 dez)',
       '2026-11-24T10:00:00.000Z',
       '2026-12-01T10:00:00.000Z',
       'Engajamento',
       'Online B2C'
from public.marketing_marcas m
where lower(m.nome) = '2siglas'
  and not exists (select 1 from public.marketing_conteudos x
                  where x.marca_id = m.id and x.titulo = '3 ferramentas que pode juntar ao seu CV em 2027.' and x.headline is null);

-- 53. FCT · C1 Tem saldo no FCT? Há 3 sinais
insert into public.marketing_conteudos
    (marca_id, ordem, persona_ids, responsavel_ids, responsavel_id, titulo, estado, prioridade, briefing, headline, conceito, design_ideia, cta, cta_2, canais, formato, objetivo, estrategia, editoria, pilar, hashtags, copies, campanha, data_publicacao, data_entrega, frente)
select m.id, extract(epoch from now()) + 52,
       coalesce((select array_agg(p.id order by p.ordem) from public.marketing_personas p
                  where p.marca_id = m.id and translate(lower(p.papel), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc') = any(array['empregador/empresario']::text[])), '{}'::uuid[]),
       '{}'::uuid[], null::uuid,
       'FCT · C1 Tem saldo no FCT? Há 3 sinais',
       'aprovacao',
       'alta',
       'Persona João. Interativo (comentário ''FCT'' = lead a contactar por mensagem privada no próprio dia). Exportar PNG para IG/FB e PDF para LinkedIn.',
       'Tem saldo no FCT? Há 3 sinais.',
       'Autoidentificação em 3 sinais. Carrossel panorâmico contínuo: a linha 2S atravessa os 7 slides, ligando-os.',
       '7 slides 1080×1350 desenhados numa prancheta única 7560×1350 para a linha 2S ser contínua. Slides 1–6 fundo branco, slide 7 #0d124b. Números gigantes 1/2/3 a 15% de opacidade nos slides 2–4.',
       'Comente FCT ou envie mensagem',
       'Guarde este post',
       array['Facebook', 'Instagram', 'LinkedIn']::text[],
       array['Carrossel', 'PDF']::text[],
       array['Geração de Leads']::text[],
       array['Reconhecimento (awareness)', 'Engajamento']::text[],
       array['Sabia que']::text[],
       array['Sábio-Mentor']::text[],
       array['#2Siglas', '#Algarve', '#FormaçãoCertificada']::text[],
       '[{"titulo":"Copy 1","texto":"O Fundo de Compensação do Trabalho (FCT) já não recebe entregas. Mas muitas empresas ainda têm lá saldo, e muitas nem sabem.\r\n\r\nEntre 2013 e 2023, milhares de empresas fizeram entregas mensais para este fundo. O saldo continua lá, numa conta global em nome da empresa. E pode ser usado, entre outras finalidades, para financiar formação certificada dos trabalhadores.\r\n\r\nDeslize para ver os 3 sinais de que a sua empresa tem saldo e o que fazer a seguir.\r\n\r\nGuarde este post. E se quiser ajuda, comente \"FCT\" ou envie-nos mensagem.\r\n\r\nPrazo legal para pedir: 31/12/2026 · Acompanhamento 2siglas até 20/12.\r\n\r\n#2Siglas #FormaçãoCertificada #FormaçãoProfissional #RecursosHumanos #PME #Algarve"},{"titulo":"Copy 2","texto":"S1: Tem saldo no FCT? | Há 3 sinais. E se tiver, o dinheiro é seu. | Deslize →\r\nS2: Sinal 1 | Contratou trabalhadores depois de outubro de 2013. | Os contratos celebrados a partir dessa data passaram a estar abrangidos pelo FCT.\r\nS3: Sinal 2 | Pagou entregas mensais entre 2013 e 2023. | Pequenos valores por trabalhador, todos os meses. Somados, podem fazer diferença.\r\nS4: Sinal 3 | Nunca pediu o saldo, ou só pediu uma vez. | Abaixo de 400.000 € há até 2 pedidos. A partir desse valor, até 4.\r\nS5: O saldo é da sua empresa. | É o que dizem as FAQ oficiais do FCT. O que não for pedido até ao prazo deixa de poder ser recuperado.\r\nS6: E agora? | 1. Consulte o saldo no portal dos Fundos de Compensação. 2. Defina o destino: a formação certificada é uma opção prevista na lei. 3. Prepare um plano antes de pedir.\r\nS7: Quer ajuda para decidir? | Diagnóstico FCT com a 2siglas. | Comente FCT ou envie mensagem | Prazo legal: 31/12/2026 · Acompanhamento 2siglas até 20/12"}]'::jsonb,
       'Campanha FCT ''Já é seu'' · Fase 1 Sensibilização',
       '2026-11-16T10:00:00.000Z',
       '2026-11-13',
       'Obrigatórias B2B'
from public.marketing_marcas m
where lower(m.nome) = '2siglas'
  and not exists (select 1 from public.marketing_conteudos x
                  where x.marca_id = m.id and x.titulo = 'FCT · C1 Tem saldo no FCT? Há 3 sinais' and x.headline = 'Tem saldo no FCT? Há 3 sinais.');

-- 54. FCT · C2 6 regras antes de pedir o saldo
insert into public.marketing_conteudos
    (marca_id, ordem, persona_ids, responsavel_ids, responsavel_id, titulo, estado, prioridade, briefing, headline, conceito, design_ideia, cta, cta_2, canais, formato, objetivo, estrategia, editoria, pilar, hashtags, copies, campanha, data_publicacao, data_entrega, frente)
select m.id, extract(epoch from now()) + 53,
       coalesce((select array_agg(p.id order by p.ordem) from public.marketing_personas p
                  where p.marca_id = m.id and translate(lower(p.papel), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc') = any(array['gestor/influenciador']::text[])), '{}'::uuid[]),
       '{}'::uuid[], null::uuid,
       'FCT · C2 6 regras antes de pedir o saldo',
       'briefing',
       'alta',
       'Persona Ana. Corpo mínimo 34 px. Ícones todos do mesmo conjunto (Lucide ou Phosphor).',
       'FCT: 6 regras antes de pedir o saldo',
       'Manual de bolso: fichas de referência numeradas, uma regra por slide.',
       '8 slides. Cartão branco (raio 32) sobre fundo #F2F8FA; etiqueta ''REGRA X/6'' #009CC3; ícone de linha 160 px (chave, calendário, fichas 2/4, balão, selo ✓, seta). Slide 8 fundo #009CC3 com selo DGERT.',
       'Partilhe com a sua contabilidade',
       'Envie mensagem',
       array['Facebook', 'Instagram', 'LinkedIn']::text[],
       array['Carrossel', 'PDF']::text[],
       array['Posicionamento']::text[],
       array['Educação']::text[],
       array['Educação']::text[],
       array['Sábio-Mentor']::text[],
       array['#2Siglas', '#FormaçãoCertificada']::text[],
       '[{"titulo":"Copy 1","texto":"O Fundo de Compensação do Trabalho (FCT) mudou em 2024 e as regras para resgatar o saldo têm pormenores que fazem a diferença.\r\n\r\nReunimos as 6 regras essenciais, com base no DL 115/2023 e nas FAQ oficiais. Partilhe com a sua contabilidade ou com quem trata dos RH.\r\n\r\nDúvidas? Escreva-nos. Respondemos com base na lei, sem rodeios.\r\n\r\n#2Siglas #FormaçãoCertificada #RecursosHumanos #Contabilidade #PME"},{"titulo":"Copy 2","texto":"S1: FCT: 6 regras antes de pedir o saldo | Fundo de Compensação do Trabalho · com base no DL 115/2023 e nas FAQ oficiais. | Guarde para consultar\r\nS2: REGRA 1/6 · O saldo é da empresa | O dinheiro entregue ao FCT continua a ser do empregador, descontadas eventuais dívidas ao FGCT.\r\nS3: REGRA 2/6 · Há um prazo | Pode pedir até 31/12/2026. O Governo anunciou uma prorrogação, mas ainda não há nova data em lei.\r\nS4: REGRA 3/6 · Há um limite de pedidos | Saldo < 400.000 €: até 2 mobilizações. Saldo ≥ 400.000 €: até 4. Os pedidos de compensação por cessação contam.\r\nS5: REGRA 4/6 · Os trabalhadores são ouvidos | Auscultação das estruturas representativas. Sem estas, comunicação aos trabalhadores com 10 dias consecutivos de antecedência.\r\nS6: REGRA 5/6 · A formação tem de ser certificada | Por entidade formadora certificada ou estabelecimento de ensino reconhecido. Para trabalhadores com contrato (não estagiários).\r\nS7: REGRA 6/6 · A formação pode ser depois | A lei não fixa prazo para usar o valor. Se pedir antes, tenha um plano de formação estruturado e divulgado.\r\nS8: Quer aplicar estas regras ao seu caso? | Diagnóstico FCT com a 2siglas. | Envie mensagem | 31 DEZ prazo legal · 20 DEZ acompanhamento 2siglas | Info geral · DL 115/2023"}]'::jsonb,
       'Campanha FCT ''Já é seu'' · Fase 2 Educação',
       '2026-11-20T10:00:00.000Z',
       '2026-11-18',
       'Obrigatórias B2B'
from public.marketing_marcas m
where lower(m.nome) = '2siglas'
  and not exists (select 1 from public.marketing_conteudos x
                  where x.marca_id = m.id and x.titulo = 'FCT · C2 6 regras antes de pedir o saldo' and x.headline = 'FCT: 6 regras antes de pedir o saldo');

-- 55. FCT · P1 Há dinheiro da sua empresa no FCT
insert into public.marketing_conteudos
    (marca_id, ordem, persona_ids, responsavel_ids, responsavel_id, titulo, estado, prioridade, briefing, headline, conceito, design_ideia, cta, canais, formato, objetivo, estrategia, editoria, pilar, hashtags, copies, campanha, data_publicacao, data_entrega, frente)
select m.id, extract(epoch from now()) + 54,
       coalesce((select array_agg(p.id order by p.ordem) from public.marketing_personas p
                  where p.marca_id = m.id and translate(lower(p.papel), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc') = any(array['empregador/empresario', 'gestor/influenciador']::text[])), '{}'::uuid[]),
       '{}'::uuid[], null::uuid,
       'FCT · P1 Há dinheiro da sua empresa no FCT',
       'aprovacao',
       'alta',
       'Persona João. Despertar: a maioria não sabe que tem saldo. Não usar ''custo zero''. Sem selo DGERT (peça informativa).',
       'Há dinheiro da sua empresa no FCT.',
       'Já é seu: o saldo do FCT é propriedade da empresa. A linha 2S liga o € (desenhado em linha) a um grupo de pessoas em pictograma: o destino do saldo é a equipa.',
       '1080×1350, fundo branco, sem fotografia. € em linha (#009CC3) no terço superior direito; a linha 2S desce em curva e termina num grupo de 5 pessoas em pictograma de linha (#0d124b) no canto inferior direito. Título à esquerda. Especificação no corpo.',
       'Leia o guia (link na bio)',
       array['Facebook', 'Instagram', 'LinkedIn']::text[],
       array['Feed único']::text[],
       array['Atrair tráfego', 'Lançamento']::text[],
       array['Reconhecimento (awareness)']::text[],
       array['Informação']::text[],
       array['Sábio-Mentor']::text[],
       array['#2Siglas', '#Algarve', '#FormaçãoCertificada']::text[],
       '[{"titulo":"Copy 1","texto":"O Fundo de Compensação do Trabalho (FCT) fechou em 2024. Mas o dinheiro que muitas empresas lá entregaram continua lá.\r\n\r\nSe contratou trabalhadores depois de outubro de 2013, é provável que a sua empresa tenha saldo. Esse saldo continua a ser seu. E, até 31 de dezembro de 2026, pode pedir o resgate para financiar formação certificada dos seus trabalhadores.\r\n\r\nO que não for pedido deixa de poder ser recuperado.\r\n\r\nExplicamos tudo no nosso guia (link na bio).\r\n\r\nPrazo legal: 31/12/2026 · Acompanhamento 2siglas até 20/12.\r\n\r\n#2Siglas #FormaçãoCertificada #FormaçãoProfissional #RecursosHumanos #PME #Algarve"},{"titulo":"Copy 2","texto":"TEXTO NO DESIGN\r\nEtiqueta: FUNDO DE COMPENSAÇÃO DO TRABALHO\r\nTítulo: Há dinheiro da sua empresa no FCT.\r\nSubtítulo: E a sua equipa pode ser o destino.\r\nCTA visual: Saiba como →\r\nRodapé: Prazo legal: 31/12/2026 · Acompanhamento 2siglas até 20/12 · Info geral · DL 115/2023"}]'::jsonb,
       'Campanha FCT ''Já é seu'' · Fase 1 Sensibilização',
       '2026-11-12T10:00:00.000Z',
       '2026-11-11',
       'Obrigatórias B2B'
from public.marketing_marcas m
where lower(m.nome) = '2siglas'
  and not exists (select 1 from public.marketing_conteudos x
                  where x.marca_id = m.id and x.titulo = 'FCT · P1 Há dinheiro da sua empresa no FCT' and x.headline = 'Há dinheiro da sua empresa no FCT.');

-- 56. FCT · C5 O prazo é 31. O processo começa esta semana.
insert into public.marketing_conteudos
    (marca_id, ordem, persona_ids, responsavel_ids, responsavel_id, titulo, estado, prioridade, briefing, headline, conceito, design_ideia, cta, canais, formato, objetivo, estrategia, editoria, pilar, hashtags, copies, campanha, data_publicacao, data_entrega, frente)
select m.id, extract(epoch from now()) + 55,
       coalesce((select array_agg(p.id order by p.ordem) from public.marketing_personas p
                  where p.marca_id = m.id and translate(lower(p.papel), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc') = any(array['empregador/empresario', 'gestor/influenciador']::text[])), '{}'::uuid[]),
       '{}'::uuid[], null::uuid,
       'FCT · C5 O prazo é 31. O processo começa esta semana.',
       'briefing',
       'alta',
       'Todas as personas. Sem fotografia de calendário real: tudo vetorial.

ATENÇÃO: o Governo anunciou em outubro uma prorrogação do prazo do FCT, ainda sem data. Se for publicada em lei antes de 14/12, rever todas as datas desta peça antes de publicar.',
       'O prazo é 31. O processo começa esta semana.',
       'Alternativa B ''Calendário verdadeiro'': folhas de calendário vetoriais, dia a dia.',
       '7 slides fundo #0d124b. Folha de calendário vetorial branca (680×680, raio 24, argolas no topo, rotação 2°), dia em Manrope ExtraBold 260 px #0d124b, mês ''DEZ'' em #009CC3. Etiquetas ''2siglas'' e ''10 dias'' em pílula #00B3D2. Linha 2S atravessa as folhas.',
       'Marque hoje o seu diagnóstico',
       array['Facebook', 'Instagram', 'LinkedIn']::text[],
       array['Carrossel', 'PDF']::text[],
       array['Geração de Leads']::text[],
       array['Conversão']::text[],
       array['Agenda', 'Conversão']::text[],
       array['Sábio-Mentor']::text[],
       array['#2Siglas', '#FormaçãoCertificada']::text[],
       '[{"titulo":"Copy 1","texto":"31 de dezembro é o prazo legal para pedir o resgate do saldo do Fundo de Compensação do Trabalho (FCT). Mas, se a sua empresa não tem estruturas representativas, os trabalhadores têm de ser informados com 10 dias de antecedência.\r\n\r\nFeitas as contas, esta é a semana decisiva. Deslize para ver o que fazer dia a dia.\r\n\r\nO acompanhamento da 2siglas termina a 20/12 (últimos diagnósticos até sexta, 18/12).\r\n\r\n#2Siglas #FormaçãoCertificada #RecursosHumanos"},{"titulo":"Copy 2","texto":"S1: O prazo é 31. O processo começa esta semana. | Faça a conta connosco.\r\nS2: Segunda, 14 | Consulte o saldo e confirme quantas mobilizações lhe restam.\r\nS3: Até quarta, 16 | Diagnóstico das necessidades de formação da equipa.\r\nS4: Até sexta, 18 | Plano de formação fechado. Último dia útil de acompanhamento 2siglas.\r\nS5: Até segunda, 21 | Último dia para comunicar aos trabalhadores e ainda pedir a 31/12 (10 dias consecutivos).\r\nS6: Até 31 | Submeter o pedido no portal dos Fundos de Compensação. Evite o último dia.\r\nS7: Marque hoje o seu diagnóstico. | Ligar [TELEFONE] / link na bio | 31 DEZ prazo legal · 20 DEZ acompanhamento 2siglas | Leitura conservadora das FAQ #21 e #22. Confirme o seu caso."}]'::jsonb,
       'Campanha FCT ''Já é seu'' · Fase 5 Urgência',
       '2026-12-14T09:00:00.000Z',
       '2026-12-10',
       'Obrigatórias B2B'
from public.marketing_marcas m
where lower(m.nome) = '2siglas'
  and not exists (select 1 from public.marketing_conteudos x
                  where x.marca_id = m.id and x.titulo = 'FCT · C5 O prazo é 31. O processo começa esta semana.' and x.headline = 'O prazo é 31. O processo começa esta semana.');

-- 57. FCT · C3 Primeiro o plano. Depois o pedido.
insert into public.marketing_conteudos
    (marca_id, ordem, persona_ids, responsavel_ids, responsavel_id, titulo, estado, prioridade, briefing, headline, conceito, design_ideia, cta, canais, formato, objetivo, estrategia, editoria, pilar, hashtags, copies, campanha, data_publicacao, data_entrega, frente)
select m.id, extract(epoch from now()) + 56,
       coalesce((select array_agg(p.id order by p.ordem) from public.marketing_personas p
                  where p.marca_id = m.id and translate(lower(p.papel), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc') = any(array['gestor/influenciador', 'empregador/empresario']::text[])), '{}'::uuid[]),
       '{}'::uuid[], null::uuid,
       'FCT · C3 Primeiro o plano. Depois o pedido.',
       'briefing',
       'alta',
       'Persona Ana e João. Substitui a foto prevista no slide 1 por ilustração vetorial.',
       'Primeiro o plano. Depois o pedido.',
       'Antes/depois: SEM PLANO (metade cinza, traço irregular) vs COM PLANO (metade branca, linha 2S limpa).',
       'Sem foto. S1: ilustração de documento em linha (folha com 4 linhas e um ✓ #00B3D2), linha 2S a sublinhar ''plano''. S2–S4: divisão vertical 50/50 (#ECEEF0 / branco). S5: 7 etiquetas ligadas pela linha. S6: citação com barra lateral #00B3D2. S7: fundo #0d124b com selo DGERT.',
       'Marcar diagnóstico (link na bio)',
       array['Facebook', 'Instagram', 'LinkedIn']::text[],
       array['Carrossel', 'PDF']::text[],
       array['Geração de Leads']::text[],
       array['Consideração']::text[],
       array['Educação', 'Soluções']::text[],
       array['Sábio-Mentor']::text[],
       array['#2Siglas', '#FormaçãoCertificada', '#Formaçãoàmedida']::text[],
       '[{"titulo":"Copy 1","texto":"Se vai pedir o resgate do Fundo de Compensação do Trabalho (FCT) para formação que só acontece em 2027, há um documento que faz toda a diferença: o plano de formação.\r\n\r\nAs FAQ oficiais apontam-no como a forma de demonstrar, numa fiscalização, que o valor vai mesmo para formação certificada. E é também o que garante que o dinheiro serve o negócio.\r\n\r\nDeslize e veja a diferença entre pedir com e sem plano.\r\n\r\nPreparamos o plano consigo. Acompanhamento até 20/12; prazo legal 31/12.\r\n\r\n#2Siglas #PlanoDeFormação #FormaçãoCertificada #RecursosHumanos"},{"titulo":"Copy 2","texto":"S1: Primeiro o plano. Depois o pedido. | Porque é que a ordem importa no FCT.\r\nS2: SEM PLANO: Pede um valor redondo. | COM PLANO: Pede o valor que o plano justifica.\r\nS3: SEM PLANO: Escolhe a formação mais rápida de arranjar. | COM PLANO: Escolhe a formação de que a equipa precisa.\r\nS4: SEM PLANO: Numa fiscalização, explica de memória. | COM PLANO: Numa fiscalização, mostra o documento.\r\nS5: O que tem um bom plano | Diagnóstico · Objetivos · Trabalhadores · Calendário · Entidade certificada · Custo por trabalhador · Divulgação\r\nS6: O que dizem as FAQ oficiais | Para formação ainda não realizada, um plano estruturado, divulgado e em vigor parece permitir cumprir o objetivo em caso de fiscalização. | FAQ #2b — http://fundoscompensacao.pt\r\nS7: Preparamos o plano consigo | Diagnóstico → Plano → Formação certificada | Marcar diagnóstico | 31 DEZ prazo legal · 20 DEZ acompanhamento 2siglas"}]'::jsonb,
       'Campanha FCT ''Já é seu'' · Fase 3 Solução',
       '2026-12-02T10:00:00.000Z',
       '2026-11-27',
       'Obrigatórias B2B'
from public.marketing_marcas m
where lower(m.nome) = '2siglas'
  and not exists (select 1 from public.marketing_conteudos x
                  where x.marca_id = m.id and x.titulo = 'FCT · C3 Primeiro o plano. Depois o pedido.' and x.headline = 'Primeiro o plano. Depois o pedido.');

-- 58. FCT · E6 Urgência: a conta dos 10 dias
insert into public.marketing_conteudos
    (marca_id, ordem, persona_ids, responsavel_ids, responsavel_id, titulo, estado, prioridade, briefing, headline, conceito, design_ideia, cta, canais, formato, objetivo, estrategia, pilar, copies, campanha, data_publicacao, data_entrega, frente)
select m.id, extract(epoch from now()) + 57,
       coalesce((select array_agg(p.id order by p.ordem) from public.marketing_personas p
                  where p.marca_id = m.id and translate(lower(p.papel), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc') = any(array['empregador/empresario']::text[])), '{}'::uuid[]),
       '{}'::uuid[], null::uuid,
       'FCT · E6 Urgência: a conta dos 10 dias',
       'briefing',
       'alta',
       'Todos os não convertidos.

ATENÇÃO: o Governo anunciou em outubro uma prorrogação do prazo do FCT, ainda sem data. Se for publicada em lei antes de 15/12, rever a conta dos 10 dias e o assunto antes de enviar.',
       '31 de dezembro é o prazo. Mas 22 já pode ser tarde.',
       'Calendário verdadeiro: a conta dos 10 dias em 30 segundos.',
       'Calendário de dezembro vetorial com 18, 20, 21 e 31 assinalados, fundo #0d124b.',
       'Marcar diagnóstico esta semana',
       array['E-mail']::text[],
       array['Email marketing']::text[],
       array['Geração de Leads']::text[],
       array['Conversão']::text[],
       array['Sábio-Mentor']::text[],
       '[{"titulo":"Copy 1","texto":"ASSUNTOS: 1) 31 de dezembro é o prazo. Mas 22 já pode ser tarde. · 2) Última semana de acompanhamento FCT · 3) [Nome], ainda vai a tempo, se começar esta semana\r\nPREHEADER: A conta dos 10 dias explicada em 30 segundos."}]'::jsonb,
       'Campanha FCT ''Já é seu'' · Sequência de e-mails 4/4 (último contacto)',
       '2026-12-15T10:00:00.000Z',
       '2026-12-11',
       'Obrigatórias B2B'
from public.marketing_marcas m
where lower(m.nome) = '2siglas'
  and not exists (select 1 from public.marketing_conteudos x
                  where x.marca_id = m.id and x.titulo = 'FCT · E6 Urgência: a conta dos 10 dias' and x.headline = '31 de dezembro é o prazo. Mas 22 já pode ser tarde.');

-- 59. FCT · NL Newsletter especial FCT
insert into public.marketing_conteudos
    (marca_id, ordem, persona_ids, responsavel_ids, responsavel_id, titulo, estado, prioridade, briefing, headline, conceito, design_ideia, cta, cta_2, canais, formato, objetivo, estrategia, editoria, pilar, copies, campanha, data_publicacao, data_entrega, frente)
select m.id, extract(epoch from now()) + 58,
       coalesce((select array_agg(p.id order by p.ordem) from public.marketing_personas p
                  where p.marca_id = m.id and translate(lower(p.papel), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc') = any(array['empregador/empresario', 'gestor/influenciador']::text[])), '{}'::uuid[]),
       '{}'::uuid[], null::uuid,
       'FCT · NL Newsletter especial FCT',
       'aprovacao',
       'alta',
       'Segmentos A (clientes) + B (leads B2B). Excluir B2C. Sem fotografia (hero vetorial).',
       'Há dinheiro da sua empresa no FCT. A sua equipa pode ser o destino.',
       'Já é seu: a história completa (oportunidade, 3 regras, plano, solução 2siglas, duas datas).',
       '600 px. Cabeçalho com logótipo → hero vetorial 600×320 (€ em linha ligado por linha 2S a pictogramas de pessoas, fundo #F2F8FA) → título Manrope 30 px #0d124b → selo de duas datas → texto → 3 cartões numerados → caixa ''O papel do plano'' → grelha 2×2 da solução → botão #009CC3 280×48 → rodapé #0d124b com selo DGERT.',
       'Marcar diagnóstico FCT',
       'Ler o guia completo',
       array['E-mail']::text[],
       array['Newsletter']::text[],
       array['Geração de Leads']::text[],
       array['Conversão', 'Educação']::text[],
       array['Educação', 'Soluções']::text[],
       array['Cuidador', 'Sábio-Mentor']::text[],
       '[{"titulo":"Copy 1","texto":"ASSUNTOS: 1) Há dinheiro da sua empresa no FCT. Já decidiu o destino? · 2) FCT: o saldo é seu até 31 de dezembro. E depois? · 3) Formação certificada paga com um valor que já é da empresa\r\nPREHEADERS: 1) O que diz a lei, o que tem de preparar e onde a 2siglas entra. · 2) Duas datas, um plano e uma decisão que não convém deixar para a última semana. · 3) Explicamos em 4 minutos, sem jargão."}]'::jsonb,
       'Campanha FCT ''Já é seu'' · Fase 2 Educação',
       '2026-11-19T10:00:00.000Z',
       '2026-11-17',
       'Obrigatórias B2B'
from public.marketing_marcas m
where lower(m.nome) = '2siglas'
  and not exists (select 1 from public.marketing_conteudos x
                  where x.marca_id = m.id and x.titulo = 'FCT · NL Newsletter especial FCT' and x.headline = 'Há dinheiro da sua empresa no FCT. A sua equipa pode ser o destino.');

-- 60. FCT · E3 O plano de formação
insert into public.marketing_conteudos
    (marca_id, ordem, persona_ids, responsavel_ids, responsavel_id, titulo, estado, prioridade, briefing, headline, conceito, design_ideia, cta, canais, formato, objetivo, estrategia, pilar, copies, campanha, data_publicacao, data_entrega, frente)
select m.id, extract(epoch from now()) + 59,
       coalesce((select array_agg(p.id order by p.ordem) from public.marketing_personas p
                  where p.marca_id = m.id and translate(lower(p.papel), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc') = any(array['gestor/influenciador']::text[])), '{}'::uuid[]),
       '{}'::uuid[], null::uuid,
       'FCT · E3 O plano de formação',
       'briefing',
       'alta',
       'Segmentos A + B.',
       'Primeiro o plano. Depois o pedido.',
       'Primeiro o plano. Depois o pedido.',
       'Ilustração vetorial de documento com ✓ e as 4 perguntas sobrepostas (substitui a foto).',
       'Pedir apoio no plano de formação',
       array['E-mail']::text[],
       array['Email marketing']::text[],
       array['Qualificação de Leads']::text[],
       array['Consideração']::text[],
       array['Sábio-Mentor']::text[],
       '[{"titulo":"Copy 1","texto":"ASSUNTOS: 1) Primeiro o plano. Depois o pedido. · 2) O documento que protege o seu pedido do FCT · 3) Vai pedir o FCT para formação de 2027? Leia isto primeiro\r\nPREHEADER: O que as FAQ oficiais dizem sobre a formação que ainda não aconteceu."}]'::jsonb,
       'Campanha FCT ''Já é seu'' · Sequência de e-mails 2/4',
       '2026-12-02T10:00:00.000Z',
       '2026-11-27',
       'Obrigatórias B2B'
from public.marketing_marcas m
where lower(m.nome) = '2siglas'
  and not exists (select 1 from public.marketing_conteudos x
                  where x.marca_id = m.id and x.titulo = 'FCT · E3 O plano de formação' and x.headline = 'Primeiro o plano. Depois o pedido.');

-- 61. FCT · E1 A oportunidade
insert into public.marketing_conteudos
    (marca_id, ordem, persona_ids, responsavel_ids, responsavel_id, titulo, estado, prioridade, briefing, headline, conceito, design_ideia, cta, canais, formato, objetivo, estrategia, pilar, copies, campanha, data_publicacao, data_entrega, frente)
select m.id, extract(epoch from now()) + 60,
       coalesce((select array_agg(p.id order by p.ordem) from public.marketing_personas p
                  where p.marca_id = m.id and translate(lower(p.papel), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc') = any(array['empregador/empresario']::text[])), '{}'::uuid[]),
       '{}'::uuid[], null::uuid,
       'FCT · E1 A oportunidade',
       'aprovacao',
       'alta',
       'Segmentos A + B. Envio terça 10h00.',
       'O FCT da sua empresa ainda tem dinheiro?',
       'Uma pergunta direta: sabe quanto tem no FCT?',
       'Hero vetorial (€ em linha + linha 2S + pessoas) + selo de duas datas.',
       'Ver como consultar o saldo',
       array['E-mail']::text[],
       array['Email marketing']::text[],
       array['Atrair tráfego']::text[],
       array['Reconhecimento (awareness)']::text[],
       array['Sábio-Mentor']::text[],
       '[{"titulo":"Copy 1","texto":"ASSUNTOS: 1) O FCT da sua empresa ainda tem dinheiro? · 2) Há um saldo em nome da [Empresa] à espera de destino · 3) Sabe quanto tem no Fundo de Compensação do Trabalho?\r\nPREHEADER: O saldo é da sua empresa. Até 31 de dezembro, pode transformá-lo em formação."}]'::jsonb,
       'Campanha FCT ''Já é seu'' · Sequência de e-mails 1/4',
       '2026-11-17T10:00:00.000Z',
       '2026-11-13',
       'Obrigatórias B2B'
from public.marketing_marcas m
where lower(m.nome) = '2siglas'
  and not exists (select 1 from public.marketing_conteudos x
                  where x.marca_id = m.id and x.titulo = 'FCT · E1 A oportunidade' and x.headline = 'O FCT da sua empresa ainda tem dinheiro?');

-- 62. FCT · NL-C E-mail comercial a clientes atuais
insert into public.marketing_conteudos
    (marca_id, ordem, persona_ids, responsavel_ids, responsavel_id, titulo, estado, prioridade, briefing, headline, conceito, design_ideia, cta, canais, formato, objetivo, estrategia, editoria, pilar, copies, campanha, data_publicacao, data_entrega, frente)
select m.id, extract(epoch from now()) + 61,
       coalesce((select array_agg(p.id order by p.ordem) from public.marketing_personas p
                  where p.marca_id = m.id and translate(lower(p.papel), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc') = any(array['empregador/empresario', 'gestor/influenciador']::text[])), '{}'::uuid[]),
       '{}'::uuid[], null::uuid,
       'FCT · NL-C E-mail comercial a clientes atuais',
       'briefing',
       'alta',
       'Segmento A (clientes 2024–2026). Remetente: gestor de cliente.',
       '[Nome], podemos usar o saldo do FCT no vosso plano de formação',
       'Proximidade: já conhecemos a vossa equipa, falta decidir o destino do saldo.',
       'Texto simples, sem imagem, assinatura pessoal do gestor de cliente.',
       'Responder a este e-mail',
       array['E-mail']::text[],
       array['Email marketing']::text[],
       array['Geração de Leads']::text[],
       array['Conversão', 'Fidelização']::text[],
       array['Conversão']::text[],
       array['Cuidador']::text[],
       '[{"titulo":"Copy 1","texto":"ASSUNTO: [Nome], podemos usar o saldo do FCT no vosso plano de formação\r\nPREHEADER: Já conhecemos a vossa equipa. Falta só decidir o que fazer com o saldo."}]'::jsonb,
       'Campanha FCT ''Já é seu'' · Fase 3 Solução',
       '2026-12-03T15:00:00.000Z',
       '2026-11-30',
       'Obrigatórias B2B'
from public.marketing_marcas m
where lower(m.nome) = '2siglas'
  and not exists (select 1 from public.marketing_conteudos x
                  where x.marca_id = m.id and x.titulo = 'FCT · NL-C E-mail comercial a clientes atuais' and x.headline = '[Nome], podemos usar o saldo do FCT no vosso plano de formação');

-- 63. FCT · E5 O acompanhamento 2siglas
insert into public.marketing_conteudos
    (marca_id, ordem, persona_ids, responsavel_ids, responsavel_id, titulo, estado, prioridade, briefing, headline, conceito, design_ideia, cta, canais, formato, objetivo, estrategia, pilar, copies, campanha, data_publicacao, data_entrega, frente)
select m.id, extract(epoch from now()) + 62,
       coalesce((select array_agg(p.id order by p.ordem) from public.marketing_personas p
                  where p.marca_id = m.id and translate(lower(p.papel), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc') = any(array['empregador/empresario', 'gestor/influenciador']::text[])), '{}'::uuid[]),
       '{}'::uuid[], null::uuid,
       'FCT · E5 O acompanhamento 2siglas',
       'briefing',
       'alta',
       'Quem clicou em E1 ou E3 + segmento A. Remetente: [Nome do gestor] | 2siglas. Confirmar se há turmas online.',
       'Como acompanhamos o seu processo FCT, passo a passo',
       'Proposta clara: o que fazemos e o que fica do lado da empresa.',
       'Diagrama de 4 passos (o mesmo de P6), sem retrato.',
       'Escolher um horário para o diagnóstico',
       array['E-mail']::text[],
       array['Email marketing']::text[],
       array['Geração de Leads']::text[],
       array['Conversão']::text[],
       array['Cuidador']::text[],
       '[{"titulo":"Copy 1","texto":"ASSUNTOS: 1) Como acompanhamos o seu processo FCT, passo a passo · 2) [Nome], do saldo ao certificado num só interlocutor · 3) O que fazemos (e o que faz a sua empresa) no processo FCT\r\nPREHEADER: Diagnóstico, plano, organização e formação certificada. Até 20 de dezembro."}]'::jsonb,
       'Campanha FCT ''Já é seu'' · Sequência de e-mails 3/4',
       '2026-12-10T10:00:00.000Z',
       '2026-12-07',
       'Obrigatórias B2B'
from public.marketing_marcas m
where lower(m.nome) = '2siglas'
  and not exists (select 1 from public.marketing_conteudos x
                  where x.marca_id = m.id and x.titulo = 'FCT · E5 O acompanhamento 2siglas' and x.headline = 'Como acompanhamos o seu processo FCT, passo a passo');

-- 64. FCT · B1 Artigo pilar: FCT para formação
insert into public.marketing_conteudos
    (marca_id, ordem, persona_ids, responsavel_ids, responsavel_id, titulo, estado, prioridade, briefing, headline, design_ideia, cta, canais, formato, objetivo, estrategia, editoria, pilar, copies, campanha, data_publicacao, data_entrega, frente)
select m.id, extract(epoch from now()) + 63,
       coalesce((select array_agg(p.id order by p.ordem) from public.marketing_personas p
                  where p.marca_id = m.id and translate(lower(p.papel), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc') = any(array['empregador/empresario', 'gestor/influenciador']::text[])), '{}'::uuid[]),
       '{}'::uuid[], null::uuid,
       'FCT · B1 Artigo pilar: FCT para formação',
       'aprovacao',
       'alta',
       'Links internos: página de formação para empresas, página ''Por formando ou por equipa?''. É o único artigo da campanha: é o destino dos links ''Ler o guia'' (bio, E1, NL). Schema FAQPage na secção ''Perguntas frequentes''.

PESQUISA DE PALAVRAS-CHAVE (12/11/2026 · Google Trends, AnswerThePublic, Semrush · PT):
• fundo de compensação do trabalho: ~1.000/mês, KD 17, tendência a subir → principal
• fundos de compensação: ~3.600/mês, KD 19, maioritariamente navegacional (procuram o portal) → secção ''como consultar o saldo''
• o que é o fundo de compensação do trabalho: ~170/mês → responder nas 2 primeiras frases do 1.º H2
• mobilização dos montantes do FCT: ~90/mês (expressão do portal) · resgate (grupo): ~80/mês e a subir no Trends
• Dúvidas de quem está desatualizado: ''ainda existe'', ''vai acabar'', ''é obrigatório'', ''adesão'' → H2 + FAQ
• ''levantar FCT'', ''reembolso FCT'', ''mobilização FCT'', ''prorrogação FCT'': ~0 → não usar
• ''resgate para formação'': ~10 → a formação é a resposta, não a pesquisa; CTA a meio do artigo
• Hashtag #fundodecompensacaodotrabalho: volume 0 no Instagram',
       'Fundo de Compensação do Trabalho: como resgatar o saldo e usá-lo em formação',
       'Imagem de destaque vetorial 1200×630: € em linha + linha 2S + pessoas, fundo #F2F8FA.',
       'Marcar diagnóstico FCT',
       array['Blog', 'Website']::text[],
       array['Notícia', 'Página web']::text[],
       array['Atrair tráfego']::text[],
       array['Reconhecimento (awareness)', 'Educação']::text[],
       array['Educação']::text[],
       array['Sábio-Mentor']::text[],
       '[{"titulo":"Copy 1","texto":"META TITLE: Fundo de Compensação do Trabalho: o que é e como resgatar\r\nMETA DESCRIPTION: O que é o Fundo de Compensação do Trabalho, como consultar e resgatar o saldo e como usá-lo em formação certificada para a sua equipa.\r\nSLUG: /blog/fct-formacao-como-usar-saldo-fundo-compensacao-trabalho\r\nPALAVRA-CHAVE: fundo de compensação do trabalho\r\nSECUNDÁRIAS: fundos de compensação, o que é o fundo de compensação do trabalho, como resgatar o fundo de compensação do trabalho, resgate FCT, mobilização dos montantes do fundo de compensação do trabalho, fundo de garantia de compensação do trabalho, resgate para formação\r\nEVITAR: \"FCT\" sozinho em títulos (colide com Fundação para a Ciência e a Tecnologia e Formação em Contexto de Trabalho), fundo de garantia salarial, \"compensação\" sozinho\r\nINTENÇÃO: informacional → transacional"}]'::jsonb,
       'Campanha FCT ''Já é seu'' · Fase 1 · Blog',
       '2026-11-13T09:00:00.000Z',
       '2026-11-12',
       'Obrigatórias B2B'
from public.marketing_marcas m
where lower(m.nome) = '2siglas'
  and not exists (select 1 from public.marketing_conteudos x
                  where x.marca_id = m.id and x.titulo = 'FCT · B1 Artigo pilar: FCT para formação' and x.headline = 'Fundo de Compensação do Trabalho: como resgatar o saldo e usá-lo em formação');

commit;
