-- =============================================================================
-- 058 · Banco de Ideias da 2Siglas (export do Notion, 20 registos)
-- Gerado a partir do CSV do Notion com o mesmo mapeamento do botão Importar.
-- Estados: ideia 14, curadoria 1, arquivado 5
--  · "Nova" → ideia · "Arquivada" → arquivado · "Passou para o Fluxo" → curadoria
--  · Status (Excelente/Bom/Razoável/Ruim) → avaliação · "Prioridade" → prioridade alta
--  · 30 ideias arquivadas não entram porque já estão no Fluxo de Conteúdos (migração 059)
-- Personas ligadas pelo papel (marketing_personas da 2Siglas, migração 054).
-- Responsáveis ligados pelo primeiro nome em profiles (Valéria), se existirem.
-- Idempotente: não volta a inserir um registo com o mesmo título + headline na 2Siglas.
-- Requer 052–057. Se a marca 2Siglas não existir, não insere nada.
-- =============================================================================

begin;

-- 1. 23 de setembro - Equinócio de Outono
insert into public.marketing_conteudos
    (marca_id, ordem, persona_ids, responsavel_ids, responsavel_id, titulo, estado, avaliacao, headline, design_ideia, cta, canais, formato, objetivo, estrategia, editoria, hashtags, copies, data_publicacao, created_at)
select m.id, extract(epoch from now()) + 0,
       coalesce((select array_agg(p.id order by p.ordem) from public.marketing_personas p
                  where p.marca_id = m.id and translate(lower(p.papel), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc') = any(array['empregador/empresario']::text[])), '{}'::uuid[]),
       '{}'::uuid[], null::uuid,
       '23 de setembro - Equinócio de Outono',
       'ideia',
       'razoavel',
       '23 de setembro: chega o outono, e com ele novos planos de formação',
       'Imagem com folhas de outono/paisagem algarvia em transição de estação, tons quentes suaves.',
       'Que novidades trazes tu para esta nova estação? Conta-nos 👇',
       array['Facebook', 'Instagram']::text[],
       array['Feed único']::text[],
       array['Comunicação Interna']::text[],
       array['Engajamento']::text[],
       array['Comemorações']::text[],
       array['#2siglas', '#Algarve']::text[],
       '[{"titulo":"Copy 1","texto":"O outono chega oficialmente com o equinócio, quando dia e noite ficam praticamente iguais em duração.\r\n\r\nÉ também a estação em que muitas empresas e profissionais retomam ritmo após o verão — e um bom momento para planear a formação do resto do ano."}]'::jsonb,
       '2026-09-23T09:00:00.000Z',
       '2026-08-21T11:13:00.000Z'
from public.marketing_marcas m
where lower(m.nome) = '2siglas'
  and not exists (select 1 from public.marketing_conteudos x
                  where x.marca_id = m.id and x.titulo = '23 de setembro - Equinócio de Outono' and x.headline = '23 de setembro: chega o outono, e com ele novos planos de formação');

-- 2. 29 de setembro - Dia Mundial do Coração
insert into public.marketing_conteudos
    (marca_id, ordem, persona_ids, responsavel_ids, responsavel_id, titulo, estado, avaliacao, briefing, headline, design_ideia, cta, canais, formato, objetivo, estrategia, editoria, hashtags, copies, data_publicacao, metrica_principal, created_at)
select m.id, extract(epoch from now()) + 1,
       coalesce((select array_agg(p.id order by p.ordem) from public.marketing_personas p
                  where p.marca_id = m.id and translate(lower(p.papel), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc') = any(array['encarregado de sst', 'empregador/empresario']::text[])), '{}'::uuid[]),
       '{}'::uuid[], null::uuid,
       '29 de setembro - Dia Mundial do Coração',
       'ideia',
       'fraco',
       'Confirmar se a 2Siglas tem curso de Primeiros Socorros/SBV em oferta própria ou em parceria; se não tiver, trocar o CTA para o curso SST mais próximo (ex.: Representante do Empregador). Não dar instruções clínicas no vídeo — remeter sempre para formação certificada.',
       'Se um colega caísse agora, quem na sua equipa saberia o que fazer?',
       'Reel 15–20 s: planos reais de sala de formação (manequim de treino, se existir material próprio), texto em ecrã com a pergunta do hook e terminar com ''112 + pessoas preparadas''. Alternativa em feed único: ícone de linha Lucide ''heart-pulse'' em ciano sobre azul profundo.',
       'Fale connosco sobre formação em primeiros socorros para a sua equipa 👉 link na bio',
       array['Facebook', 'Instagram']::text[],
       array['Reel / vídeo curto']::text[],
       array['Institucional']::text[],
       array['Reconhecimento (awareness)', 'Educação']::text[],
       array['Comemorações', 'Educativo']::text[],
       array['#2siglas', '#SegurançaNoTrabalho', '#SaúdeeSegurança']::text[],
       '[{"titulo":"Copy 1","texto":"Numa paragem cardiorrespiratória, os primeiros minutos contam — e quase sempre quem está mais perto é um colega de trabalho, não um profissional de saúde.\r\n\r\nPor isso, a legislação de segurança e saúde no trabalho exige que as empresas organizem os primeiros socorros e tenham trabalhadores designados e preparados para agir.\r\n\r\nNo Dia Mundial do Coração, a pergunta é simples: na sua empresa, quem são essas pessoas — e quando foi a última vez que praticaram?"}]'::jsonb,
       '2026-09-29T09:00:00.000Z',
       'Alcance',
       '2026-09-23T08:35:00.000Z'
from public.marketing_marcas m
where lower(m.nome) = '2siglas'
  and not exists (select 1 from public.marketing_conteudos x
                  where x.marca_id = m.id and x.titulo = '29 de setembro - Dia Mundial do Coração' and x.headline = 'Se um colega caísse agora, quem na sua equipa saberia o que fazer?');

-- 3. Campanha FCT 2026 · conceito-mãe · 12 nov a 22 dez
insert into public.marketing_conteudos
    (marca_id, ordem, persona_ids, responsavel_ids, responsavel_id, titulo, estado, briefing, headline, conceito, design_ideia, cta, cta_2, canais, formato, objetivo, estrategia, editoria, pilar, hashtags, data_publicacao, notas, created_at)
select m.id, extract(epoch from now()) + 2,
       coalesce((select array_agg(p.id order by p.ordem) from public.marketing_personas p
                  where p.marca_id = m.id and translate(lower(p.papel), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc') = any(array['empregador/empresario', 'gestor/influenciador', 'encarregado de sst']::text[])), '{}'::uuid[]),
       '{}'::uuid[], null::uuid,
       'Campanha FCT 2026 · conceito-mãe · 12 nov a 22 dez',
       'curadoria',
       'Personas: João (empresário PME, principal), Ana (RH), Nuno (SST). Regras: nunca ''custo zero'', ''100% financiado'' ou ''reembolso garantido''; selo DGERT só em peças sobre formação certificada 2siglas; distinguir sempre 31/12 (legal) de 20/12 (2siglas); 20/12 é domingo, últimos diagnósticos até sexta 18/12. Peças no Fluxo de Conteúdos com o prefixo ''FCT ·''.',
       'Já é seu. Invista-o na sua equipa.',
       'Mudar a moldura de ''prazo burocrático'' para ''dinheiro próprio que precisa de destino''. O saldo do FCT é da empresa (FAQ #4); o que não for pedido até 31/12/2026 deixa de poder ser recuperado. A 2siglas faz diagnóstico, plano de formação e formação certificada DGERT, com acompanhamento até 20/12.',
       'Sem banco de imagens: campanha 100% tipográfica e vetorial. Elemento-chave ''linha 2S'' (curva #00B3D2 derivada do símbolo) que liga um € desenhado em linha a ícones de pessoas. Selo de duas datas obrigatório: 31 DEZ prazo legal (sólido #0d124b) · 20 DEZ acompanhamento 2siglas (contorno #009CC3). A campanha escurece de fase para fase (branco → #0d124b).',
       'Marcar diagnóstico FCT',
       'Ler o guia completo',
       array['Blog', 'E-mail', 'Facebook', 'Instagram', 'LinkedIn']::text[],
       array['Email marketing', 'Carrossel', 'Feed único', 'Newsletter', 'Notícia']::text[],
       array['Institucional', 'Promocional']::text[],
       array['Reconhecimento (awareness)', 'Conversão', 'Educação']::text[],
       array['Conversão', 'Educativo', 'Soluções']::text[],
       array['Cuidador', 'Sábio-Mentor']::text[],
       array['#2siglas', '#Algarve', '#FormaçãoCertificada', '#FormaçãoContínua']::text[],
       '2026-11-12T10:00:00.000Z',
       'Período no Notion: 12 de novembro de 2026 → 22 de dezembro de 2026
Adicionado ao fluxo no Notion: 11 de novembro de 2026',
       '2026-11-11T12:48:00.000Z'
from public.marketing_marcas m
where lower(m.nome) = '2siglas'
  and not exists (select 1 from public.marketing_conteudos x
                  where x.marca_id = m.id and x.titulo = 'Campanha FCT 2026 · conceito-mãe · 12 nov a 22 dez' and x.headline = 'Já é seu. Invista-o na sua equipa.');

-- 4. 27 de novembro - Black Friday (contraprogramação)
insert into public.marketing_conteudos
    (marca_id, ordem, persona_ids, responsavel_ids, responsavel_id, titulo, estado, avaliacao, briefing, headline, design_ideia, cta, canais, formato, objetivo, estrategia, editoria, hashtags, copies, data_publicacao, metrica_principal, created_at)
select m.id, extract(epoch from now()) + 3,
       coalesce((select array_agg(p.id order by p.ordem) from public.marketing_personas p
                  where p.marca_id = m.id and translate(lower(p.papel), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc') = any(array['profissional autonomo', 'treinador']::text[])), '{}'::uuid[]),
       '{}'::uuid[], null::uuid,
       '27 de novembro - Black Friday (contraprogramação)',
       'ideia',
       'bom',
       'Contraprogramação à Black Friday: não usar mecânicas de promoção nem urgência artificial (diretriz de tom). Se a 2Siglas decidir fazer uma campanha real de Black Friday, esta peça deve ser substituída, não combinada.',
       'Nesta sexta-feira, o melhor investimento não vem com desconto',
       'Composição tipográfica sobre azul profundo, com o hook em destaque. Evitar etiquetas de preço, percentagens ou estética de promoção para não confundir com campanha de desconto.',
       'Qual a competência em que gostava de investir no próximo ano? Conte-nos 👇',
       array['Facebook', 'Instagram']::text[],
       array['Feed único']::text[],
       array['Institucional']::text[],
       array['Engajamento']::text[],
       array['Interesse']::text[],
       array['#2siglas', '#Algarve', '#FormaçãoContínua']::text[],
       '[{"titulo":"Copy 1","texto":"Hoje há descontos em quase tudo. Mas há investimentos que não dependem de promoções: uma competência nova, um certificado que abre portas, a confiança de saber fazer bem o seu trabalho.\r\n\r\nO que aprende não se gasta nem se devolve — fica consigo.\r\n\r\nSe tivesse de escolher uma competência para investir em 2027, qual seria?"}]'::jsonb,
       '2026-11-27T10:00:00.000Z',
       'Engajamento',
       '2026-09-23T12:01:00.000Z'
from public.marketing_marcas m
where lower(m.nome) = '2siglas'
  and not exists (select 1 from public.marketing_conteudos x
                  where x.marca_id = m.id and x.titulo = '27 de novembro - Black Friday (contraprogramação)' and x.headline = 'Nesta sexta-feira, o melhor investimento não vem com desconto');

-- 5. Dezembro - Planeamento da formação 2027 (diagnóstico de necessidades)
insert into public.marketing_conteudos
    (marca_id, ordem, persona_ids, responsavel_ids, responsavel_id, titulo, estado, avaliacao, briefing, headline, design_ideia, cta, cta_2, canais, formato, objetivo, estrategia, editoria, hashtags, copies, data_publicacao, metrica_principal, created_at)
select m.id, extract(epoch from now()) + 4,
       coalesce((select array_agg(p.id order by p.ordem) from public.marketing_personas p
                  where p.marca_id = m.id and translate(lower(p.papel), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc') = any(array['gestor/influenciador', 'empregador/empresario']::text[])), '{}'::uuid[]),
       '{}'::uuid[], null::uuid,
       'Dezembro - Planeamento da formação 2027 (diagnóstico de necessidades)',
       'ideia',
       'bom',
       'Peça de geração de leads para o 1.º trimestre de 2027. Complementa o post de Ano Novo (''Um novo ano, novos objetivos de formação''). Opcional: transformar as 5 perguntas numa checklist em PDF para download em troca de email. Enviar também por newsletter à base de empresas clientes.',
       'Antes de fazer o plano de formação de 2027, faça estas cinco perguntas',
       'Capa de artigo + carrossel com as 5 perguntas (uma por slide), numeração em ciano e ícones de linha. Opcional: PDF de checklist com a identidade da marca.',
       'Leia o artigo completo no nosso blog 👉',
       'Marque uma reunião de diagnóstico com a nossa equipa.',
       array['Blog', 'E-mail', 'LinkedIn']::text[],
       array['Carrossel', 'Newsletter', 'Notícia']::text[],
       array['Institucional', 'Promocional']::text[],
       array['Consideração', 'Conversão']::text[],
       array['Educativo', 'Soluções']::text[],
       array['#2siglas', '#FormaçãoContínua', '#Formaçãoàmedida']::text[],
       '[{"titulo":"Artigo blog — abertura e estrutura","texto":"Um bom plano de formação não começa no catálogo de cursos — começa no diagnóstico. Antes de fechar o plano para 2027, vale a pena responder a cinco perguntas:\r\n\r\n1. Que certificações obrigatórias da equipa caducam no próximo ano?\r\n2. Onde estão os erros, acidentes ou quebras de produtividade que se repetem?\r\n3. Que funções vão mudar (novos equipamentos, novas regras, novas ferramentas digitais)?\r\n4. Quem precisa de crescer para assumir mais responsabilidade?\r\n5. Quantas horas de formação contínua ficaram por cumprir em 2025 e 2026?\r\n\r\nCom estas respostas, o plano deixa de ser um cumprimento de calendário e passa a ser uma ferramenta de gestão. O artigo desenvolve cada pergunta com exemplos práticos e termina com a forma como a 2Siglas apoia o diagnóstico."},{"titulo":"Versão LinkedIn","texto":"Dezembro é mês de fechar orçamentos — e de decidir onde investir em formação no próximo ano. Antes de escolher cursos, faça o diagnóstico: que certificações caducam, onde se repetem erros, que funções vão mudar, quem precisa de crescer e que horas ficaram por cumprir. Reunimos as cinco perguntas essenciais no blog."}]'::jsonb,
       '2026-12-10T10:00:00.000Z',
       'Engajamento',
       '2026-09-23T12:01:00.000Z'
from public.marketing_marcas m
where lower(m.nome) = '2siglas'
  and not exists (select 1 from public.marketing_conteudos x
                  where x.marca_id = m.id and x.titulo = 'Dezembro - Planeamento da formação 2027 (diagnóstico de necessidades)' and x.headline = 'Antes de fazer o plano de formação de 2027, faça estas cinco perguntas');

-- 6. 21 de dezembro - Solstício de Inverno
insert into public.marketing_conteudos
    (marca_id, ordem, persona_ids, responsavel_ids, responsavel_id, titulo, estado, avaliacao, headline, design_ideia, cta, canais, formato, objetivo, estrategia, editoria, hashtags, copies, data_publicacao, created_at)
select m.id, extract(epoch from now()) + 5,
       coalesce((select array_agg(p.id order by p.ordem) from public.marketing_personas p
                  where p.marca_id = m.id and translate(lower(p.papel), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc') = any(array['empregador/empresario']::text[])), '{}'::uuid[]),
       '{}'::uuid[], null::uuid,
       '21 de dezembro - Solstício de Inverno',
       'ideia',
       'razoavel',
       '21 de dezembro: a noite mais longa do ano, e o momento de olhar para o próximo capítulo',
       'Imagem com luz suave de inverno, tons frios/quentes contrastantes, tom reflexivo.',
       'Como planeias fechar o ano em termos profissionais? Conta-nos 👇',
       array['Facebook', 'Instagram']::text[],
       array['Feed único']::text[],
       array['Comunicação Interna']::text[],
       array['Engajamento']::text[],
       array['Comemorações']::text[],
       array['#2siglas', '#Algarve']::text[],
       '[{"titulo":"Copy 1","texto":"O solstício de inverno marca a noite mais longa do ano — e, a partir daqui, os dias voltam a alongar-se pouco a pouco.\r\n\r\nÉ também uma boa altura para olhar para trás, avaliar o ano que termina e começar a desenhar os próximos passos, incluindo os de formação."}]'::jsonb,
       '2026-12-21T10:00:00.000Z',
       '2026-08-21T11:14:00.000Z'
from public.marketing_marcas m
where lower(m.nome) = '2siglas'
  and not exists (select 1 from public.marketing_conteudos x
                  where x.marca_id = m.id and x.titulo = '21 de dezembro - Solstício de Inverno' and x.headline = '21 de dezembro: a noite mais longa do ano, e o momento de olhar para o próximo capítulo');

-- 7. 25 de dezembro - Natal
insert into public.marketing_conteudos
    (marca_id, ordem, persona_ids, responsavel_ids, responsavel_id, titulo, estado, prioridade, headline, design_ideia, cta, canais, formato, objetivo, estrategia, editoria, hashtags, copies, data_publicacao, created_at)
select m.id, extract(epoch from now()) + 6,
       coalesce((select array_agg(p.id order by p.ordem) from public.marketing_personas p
                  where p.marca_id = m.id and translate(lower(p.papel), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc') = any(array['empregador/empresario', 'profissional autonomo']::text[])), '{}'::uuid[]),
       '{}'::uuid[], null::uuid,
       '25 de dezembro - Natal',
       'ideia',
       'alta',
       'Um Natal de gratidão por mais um ano de aprendizagem partilhada',
       'Imagem institucional festiva, discreta e elegante, sem apelo comercial excessivo, tons quentes de Natal.',
       'Feliz Natal a toda a nossa comunidade 🎄',
       array['Facebook', 'Instagram', 'LinkedIn']::text[],
       array['Feed único']::text[],
       array['Institucional']::text[],
       array['Engajamento', 'Fidelização']::text[],
       array['Comemorações']::text[],
       array['#2siglas', '#Algarve']::text[],
       '[{"titulo":"Copy 1","texto":"Um ano cheio de aprendizagens, novos certificados e histórias partilhadas está quase a terminar.\r\n\r\nDa equipa 2Siglas, um obrigado sincero a todos os formandos, formadores e parceiros que fizeram parte deste percurso. Feliz Natal!"}]'::jsonb,
       '2026-12-25T10:00:00.000Z',
       '2026-08-21T11:14:00.000Z'
from public.marketing_marcas m
where lower(m.nome) = '2siglas'
  and not exists (select 1 from public.marketing_conteudos x
                  where x.marca_id = m.id and x.titulo = '25 de dezembro - Natal' and x.headline = 'Um Natal de gratidão por mais um ano de aprendizagem partilhada');

-- 8. 30 de dezembro - Retrospetiva do ano
insert into public.marketing_conteudos
    (marca_id, ordem, persona_ids, responsavel_ids, responsavel_id, titulo, estado, prioridade, briefing, headline, design_ideia, cta, canais, formato, objetivo, estrategia, editoria, hashtags, copies, data_publicacao, metrica_principal, created_at)
select m.id, extract(epoch from now()) + 7,
       coalesce((select array_agg(p.id order by p.ordem) from public.marketing_personas p
                  where p.marca_id = m.id and translate(lower(p.papel), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc') = any(array['gestor/influenciador', 'profissional autonomo', 'condutor']::text[])), '{}'::uuid[]),
       '{}'::uuid[], null::uuid,
       '30 de dezembro - Retrospetiva do ano',
       'ideia',
       'alta',
       'Preencher os números reais com a coordenação (não estimar). Serve de ponte para a campanha dos 20 anos (28/03/2027). Recolher fotografias autorizadas ao longo do trimestre para a montagem.',
       '2026 em números: o ano da 2Siglas contado por quem o viveu',
       'Carrossel com um número por slide sobre azul profundo, usando o grafismo de barras de dados do guia; último slide teaser ''2027 · 20 anos''. Versão Reel com montagem de fotografias reais do ano.',
       'Fez formação connosco em 2026? Deixe-nos uma palavra 👇',
       array['Facebook', 'Instagram', 'LinkedIn']::text[],
       array['Carrossel', 'Reel / vídeo curto']::text[],
       array['Institucional']::text[],
       array['Indicação (advocacy)', 'Fidelização']::text[],
       array['Bastidores', 'Prova Social']::text[],
       array['#2siglas', '#Algarve', '#FormaçãoCertificada']::text[],
       '[{"titulo":"Copy 1","texto":"Antes de fechar o ano, olhamos para trás: [n.º] ações de formação, [n.º] formandos certificados, [n.º] horas de formação, [n.º] empresas parceiras, [n.º] localidades onde estivemos.\r\n\r\nMais do que números, são pessoas que hoje trabalham com mais segurança e mais confiança. Obrigado a todos os formandos, formadores e parceiros que fizeram 2026 connosco.\r\n\r\nE 2027 é ano de 20 anos. Já lá vamos."}]'::jsonb,
       '2026-12-30T10:00:00.000Z',
       'Engajamento',
       '2026-09-23T12:01:00.000Z'
from public.marketing_marcas m
where lower(m.nome) = '2siglas'
  and not exists (select 1 from public.marketing_conteudos x
                  where x.marca_id = m.id and x.titulo = '30 de dezembro - Retrospetiva do ano' and x.headline = '2026 em números: o ano da 2Siglas contado por quem o viveu');

-- 9. 1 de janeiro - Ano Novo
insert into public.marketing_conteudos
    (marca_id, ordem, persona_ids, responsavel_ids, responsavel_id, titulo, estado, prioridade, headline, design_ideia, cta, canais, formato, objetivo, estrategia, editoria, hashtags, copies, data_publicacao, created_at)
select m.id, extract(epoch from now()) + 8,
       coalesce((select array_agg(p.id order by p.ordem) from public.marketing_personas p
                  where p.marca_id = m.id and translate(lower(p.papel), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc') = any(array['empregador/empresario']::text[])), '{}'::uuid[]),
       '{}'::uuid[], null::uuid,
       '1 de janeiro - Ano Novo',
       'ideia',
       'alta',
       'Um novo ano, novos objetivos de formação',
       'Imagem minimalista com o ano em destaque, paleta institucional, sem elementos festivos genéricos de banco de imagens.',
       'Comece o ano a planear a formação da sua equipa 👉 link na bio',
       array['Facebook', 'Instagram', 'LinkedIn']::text[],
       array['Feed único']::text[],
       array['Institucional']::text[],
       array['Reconhecimento (awareness)']::text[],
       array['Comemorações']::text[],
       array['#2siglas', '#Algarve', '#FormaçãoContínua']::text[],
       '[{"titulo":"Copy 1","texto":"Um novo ano traz sempre a oportunidade de recomeçar com mais clareza sobre os objetivos que queremos alcançar. Para empresas e profissionais, isso passa muitas vezes por investir em novas competências.\r\n\r\nQue este ano seja também um ano de crescimento e aprendizagem — a 2Siglas está pronta para caminhar consigo."}]'::jsonb,
       '2027-01-01T10:00:00.000Z',
       '2026-08-21T11:09:00.000Z'
from public.marketing_marcas m
where lower(m.nome) = '2siglas'
  and not exists (select 1 from public.marketing_conteudos x
                  where x.marca_id = m.id and x.titulo = '1 de janeiro - Ano Novo' and x.headline = 'Um novo ano, novos objetivos de formação');

-- 10. Dia de montagem da árvore de Natal no escritório — dezembro 2026 (desejos de aprendizagem)
insert into public.marketing_conteudos
    (marca_id, ordem, persona_ids, responsavel_ids, responsavel_id, titulo, estado, briefing, headline, conceito, design_ideia, cta, cta_2, canais, formato, objetivo, estrategia, editoria, pilar, hashtags, copies, metrica_principal, created_at)
select m.id, extract(epoch from now()) + 9,
       '{}'::uuid[],
       '{}'::uuid[], null::uuid,
       'Dia de montagem da árvore de Natal no escritório — dezembro 2026 (desejos de aprendizagem)',
       'ideia',
       'Execução: preparar os cartões e uma caneta antes da montagem (10 min). Cada pessoa escreve o seu durante o momento. Fotografar com o telemóvel. Recolher as respostas dos comentários numa lista para a equipa pedagógica (pode inspirar novas turmas ou formação à medida).',
       'O que quer aprender em 2027?',
       'Em vez de bolas compradas, cada pessoa da equipa pendura na árvore um cartão com uma competência que quer aprender ou ensinar em 2027. A pergunta passa depois para os seguidores. Liga o Natal ao desenvolvimento pessoal e profissional (área 090) e gera informação útil para o planeamento de cursos.',
       'Carrossel: 1) árvore com os cartões, 2–5) close-ups das mãos a pendurar cartões legíveis (nome + competência), 6) slide final com a pergunta em Manrope Bold sobre fundo branco e acento ciano. Cartões simples em cartolina branca com fio ciano.',
       'Deixa nos comentários a competência que queres aprender em 2027 👇',
       'Guarda este post e volta a ele em dezembro de 2027.',
       array['Facebook', 'Instagram']::text[],
       array['Carrossel']::text[],
       array['Institucional']::text[],
       array['Consideração', 'Engajamento']::text[],
       array['Bastidores', 'Comemorações', 'Interesse']::text[],
       array['Criador', 'Cuidador']::text[],
       array['#2siglas', '#Algarve', '#FormaçãoContínua']::text[],
       '[{"titulo":"Copy 1","texto":"Este ano a nossa árvore não tem só bolas. Tem desejos.\r\n\r\nCada pessoa da equipa pendurou uma competência que quer aprender (ou ensinar) em 2027. Há de tudo: de Excel a primeiros socorros, passando por falar melhor em público.\r\n\r\nE tu? Que competência queres ganhar no próximo ano?"}]'::jsonb,
       'Engajamento',
       '2026-11-06T14:48:00.000Z'
from public.marketing_marcas m
where lower(m.nome) = '2siglas'
  and not exists (select 1 from public.marketing_conteudos x
                  where x.marca_id = m.id and x.titulo = 'Dia de montagem da árvore de Natal no escritório — dezembro 2026 (desejos de aprendizagem)' and x.headline = 'O que quer aprender em 2027?');

-- 11. Dia de montagem da árvore de Natal no escritório — dezembro 2026 (arranque da narrativa dos 20 anos, 28/03/2027)
insert into public.marketing_conteudos
    (marca_id, ordem, persona_ids, responsavel_ids, responsavel_id, titulo, estado, briefing, headline, conceito, design_ideia, cta, canais, formato, objetivo, estrategia, editoria, pilar, hashtags, copies, metrica_principal, created_at)
select m.id, extract(epoch from now()) + 10,
       '{}'::uuid[],
       '{}'::uuid[], null::uuid,
       'Dia de montagem da árvore de Natal no escritório — dezembro 2026 (arranque da narrativa dos 20 anos, 28/03/2027)',
       'ideia',
       'Execução: 5 minutos no fim da montagem. Telemóvel, luz natural, toda a equipa disponível. Tirar 3 a 4 variações (formal, descontraída, detalhe das mãos a colocar a estrela) para reaproveitar na campanha dos 20 anos. LinkedIn: versão mais institucional do texto. Publicar no próprio dia ou no dia seguinte.',
       'O nosso 20.º Natal',
       'Fundada em 2007, a 2Siglas vive este ano o seu 20.º Natal. Uma fotografia real da equipa junto à árvore acabada de montar abre, sem anunciar oficialmente, a contagem para os 20 anos de atividade (28 de março de 2027). Autêntico, institucional e reutilizável como primeira peça da campanha de aniversário.',
       'Foto de grupo com luz natural, equipa em roupa do dia a dia junto à árvore. Elemento gráfico mínimo: "20.º Natal" em Manrope Bold com o "20" em ciano #009CC3, logótipo no canto. Sem molduras natalícias carregadas.',
       'Segue-nos para acompanhares o que aí vem em 2027 👉',
       array['Facebook', 'Instagram', 'LinkedIn']::text[],
       array['Feed único', 'Imagem']::text[],
       array['Institucional']::text[],
       array['Reconhecimento (awareness)', 'Valorização']::text[],
       array['Bastidores', 'Comemorações']::text[],
       array['Cuidador', 'Sábio-Mentor']::text[],
       array['#2siglas', '#Algarve', '#FormaçãoCertificada']::text[],
       '[{"titulo":"Copy 1","texto":"Em 2007 montámos a primeira árvore. Este ano montámos a 20.ª.\r\n\r\nSão 20 Natais a formar profissionais no Algarve, com os mesmos princípios: rigor, proximidade e formação que se aplica no terreno.\r\n\r\nObrigado a todos os formandos, formadores e empresas que fizeram parte destes anos. Em 2027 há uma data especial a caminho. 🎄"}]'::jsonb,
       'Alcance',
       '2026-11-06T14:48:00.000Z'
from public.marketing_marcas m
where lower(m.nome) = '2siglas'
  and not exists (select 1 from public.marketing_conteudos x
                  where x.marca_id = m.id and x.titulo = 'Dia de montagem da árvore de Natal no escritório — dezembro 2026 (arranque da narrativa dos 20 anos, 28/03/2027)' and x.headline = 'O nosso 20.º Natal');

-- 12. Dia de montagem da árvore de Natal no escritório — dezembro 2026 (bastidores e agradecimento)
insert into public.marketing_conteudos
    (marca_id, ordem, persona_ids, responsavel_ids, responsavel_id, titulo, estado, briefing, headline, conceito, design_ideia, cta, canais, formato, objetivo, estrategia, editoria, pilar, hashtags, copies, metrica_principal, created_at)
select m.id, extract(epoch from now()) + 11,
       '{}'::uuid[],
       '{}'::uuid[], null::uuid,
       'Dia de montagem da árvore de Natal no escritório — dezembro 2026 (bastidores e agradecimento)',
       'ideia',
       'Execução: o mais simples de todos. Deixar o telemóvel em timelapse durante a montagem (20–30 min de gravação dão ~15 s). Não exige preparação nem edição além de cortar o início e juntar o texto final. Se houver números reais de 2026 (n.º de formandos/cursos), podem entrar no texto em ecrã — confirmar antes.',
       'Bastidores de um dia que não é de formação',
       'Timelapse curto e honesto da equipa a montar a árvore, do caixote à luz acesa. Sem guião nem encenação: mostra as pessoas por trás das inscrições, certificados e telefonemas. Fecha com um agradecimento simples aos formandos de 2026.',
       'Reel vertical de 10 a 15 s: telemóvel fixo num tripé, modo timelapse. Último plano em tempo real com a árvore acesa e texto em ecrã: "Obrigado por este ano de formação 🎄". Música natalícia leve da biblioteca do Instagram.',
       'Segue-nos para veres mais bastidores 👉',
       array['Facebook', 'Instagram', 'TikTok']::text[],
       array['Reel / vídeo curto']::text[],
       array['Institucional']::text[],
       array['Reconhecimento (awareness)', 'Engajamento']::text[],
       array['Bastidores', 'Comemorações']::text[],
       array['Cuidador']::text[],
       array['#2siglas', '#Algarve', '#Faro']::text[],
       '[{"titulo":"Copy 1","texto":"Hoje não houve aulas, mas a equipa esteve toda reunida.\r\n\r\nSão estas as pessoas que respondem às tuas dúvidas, tratam das inscrições e preparam cada curso ao detalhe. Hoje foi dia de montar a árvore.\r\n\r\nObrigado a quem formou e aprendeu connosco em 2026."}]'::jsonb,
       'Alcance',
       '2026-11-06T14:48:00.000Z'
from public.marketing_marcas m
where lower(m.nome) = '2siglas'
  and not exists (select 1 from public.marketing_conteudos x
                  where x.marca_id = m.id and x.titulo = 'Dia de montagem da árvore de Natal no escritório — dezembro 2026 (bastidores e agradecimento)' and x.headline = 'Bastidores de um dia que não é de formação');

-- 13. Dia de montagem das árvores de Natal no escritório — dezembro 2026
insert into public.marketing_conteudos
    (marca_id, ordem, persona_ids, responsavel_ids, responsavel_id, titulo, estado, avaliacao, headline, conceito, design_ideia, cta, canais, formato, objetivo, estrategia, editoria, pilar, hashtags, metrica_principal, created_at)
select m.id, extract(epoch from now()) + 12,
       '{}'::uuid[],
       '{}'::uuid[], null::uuid,
       'Dia de montagem das árvores de Natal no escritório — dezembro 2026',
       'ideia',
       'excelente',
       'A nossa árvore está equipada a rigor',
       'A ''árvore EPI'': decorações feitas com materiais das formações, como luvas, fita de sinalização, mini-capacetes, cordas de escalada e pinhas. Muito fotogénica e com a identidade da marca em cada detalhe.',
       'Carrossel com close-ups de cada decoração e legenda a ligar o objeto ao curso correspondente. Paleta da marca (ciano #009CC3) nos acentos.',
       'Adivinhas de que curso é cada decoração? 👇',
       array['Facebook', 'Instagram']::text[],
       array['Carrossel', 'Imagem']::text[],
       array['Institucional']::text[],
       array['Reconhecimento (awareness)', 'Engajamento']::text[],
       array['Bastidores', 'Comemorações', 'Interesse']::text[],
       array['Criador']::text[],
       array['#2siglas', '#FormaçãoCertificada', '#SegurançaNoTrabalho']::text[],
       'Engajamento',
       '2026-11-06T11:44:00.000Z'
from public.marketing_marcas m
where lower(m.nome) = '2siglas'
  and not exists (select 1 from public.marketing_conteudos x
                  where x.marca_id = m.id and x.titulo = 'Dia de montagem das árvores de Natal no escritório — dezembro 2026' and x.headline = 'A nossa árvore está equipada a rigor');

-- 14. Dia de montagem das árvores de Natal no escritório — dezembro 2026
insert into public.marketing_conteudos
    (marca_id, ordem, persona_ids, responsavel_ids, responsavel_id, titulo, estado, avaliacao, headline, conceito, design_ideia, cta, canais, formato, objetivo, estrategia, editoria, pilar, hashtags, metrica_principal, created_at)
select m.id, extract(epoch from now()) + 13,
       '{}'::uuid[],
       '{}'::uuid[], null::uuid,
       'Dia de montagem das árvores de Natal no escritório — dezembro 2026',
       'ideia',
       'excelente',
       'Até para montar a árvore de Natal usamos EPI',
       'A equipa monta a árvore a cumprir todas as regras de segurança: capacete, colete refletor, luvas, escadote verificado e checklist antes de pendurar a primeira bola. Humor autêntico que reforça o rigor e a cultura de segurança da marca.',
       'Reel com equipa real, luz natural. Texto em ecrã com os passos da checklist. Final: ''A segurança não tira férias, nem no Natal.''',
       'Segue-nos 👉 para mais dicas de segurança no trabalho.',
       array['Facebook', 'Instagram', 'TikTok']::text[],
       array['Reel / vídeo curto']::text[],
       array['Institucional']::text[],
       array['Reconhecimento (awareness)', 'Engajamento']::text[],
       array['Bastidores', 'Comemorações', 'Educativo']::text[],
       array['Cuidador', 'Sábio-Mentor']::text[],
       array['#2siglas', '#Algarve', '#SegurançaNoTrabalho']::text[],
       'Alcance',
       '2026-11-06T11:44:00.000Z'
from public.marketing_marcas m
where lower(m.nome) = '2siglas'
  and not exists (select 1 from public.marketing_conteudos x
                  where x.marca_id = m.id and x.titulo = 'Dia de montagem das árvores de Natal no escritório — dezembro 2026' and x.headline = 'Até para montar a árvore de Natal usamos EPI');

-- 15. 27 de setembro - Dia Mundial do Turismo (ONU Turismo)
insert into public.marketing_conteudos
    (marca_id, ordem, persona_ids, responsavel_ids, responsavel_id, titulo, estado, estado_antes_arquivo, briefing, headline, conceito, design_ideia, cta, canais, formato, estrategia, hashtags, copies, metrica_principal, created_at)
select m.id, extract(epoch from now()) + 14,
       '{}'::uuid[],
       '{}'::uuid[], null::uuid,
       '27 de setembro - Dia Mundial do Turismo (ONU Turismo)',
       'arquivado',
       'ideia',
       'Data: Dia Mundial do Turismo (ONU Turismo), 27 set. Publicação a curto prazo — prioridade de produção. Confirmar internamente quais os cursos/áreas a destacar para empresas de turismo; não prometer áreas que não estejam em oferta. [Versão LinkedIn] O turismo continua a ser o motor económico do Algarve — e também um dos setores onde a sazonalidade e a rotação de pessoas mais dificultam a formação. A época baixa é a janela natural para investir em competências.

Na 2Siglas desenhamos planos de formação à medida para empresas do setor, ajustados ao calendário do negócio. E acompanhamos o turismo também através da investigação aplicada.',
       'No Algarve, a época baixa é a melhor época para formar a equipa',
       'No Algarve, a época baixa é a melhor época para formar a equipa',
       'Fotografia real de equipa de hotelaria/restauração algarvia em contexto de trabalho, ou unidade turística fora de época com luz de outono. Overlay azul profundo #0D124B a 40–45% com texto branco (guia p.19). Template Canva: post institucional com foto tratada.',
       'Planeie connosco a formação de inverno da sua equipa 👉 link na bio',
       array['Facebook', 'Instagram']::text[],
       array['Feed único']::text[],
       array['Consideração']::text[],
       array['#2siglas', '#Algarve', '#Formaçãoàmedida']::text[],
       '[{"titulo":"Copy 1","texto":"No Dia Mundial do Turismo, pode ser uma boa hora de planear a formação de inverno para chegar a 2027 com uma equipa mais segura e mais preparada.\r\n\r\nNa http://2Siglas.pt, pode escolher e combinar, entre as várias opções de formação de autoaprendizagem, em regime online, para construir um percurso formativo e completar as 40 horas anuais de formação obrigatória dos seus profissionais.\r\n\r\n📚 Escolha os cursos.\r\n🔗 Combine diferentes formações.\r\n💻 Aprenda online, ao seu ritmo.\r\n✅ Complete as 40 horas de formação contínua.\r\n🪙Valor por formando: 210 €\r\n\r\nConsulte as opções disponíveis no nosso site: http://www.2Siglas.pt\r\nE encontre a combinação de cursos certa para a sua equipa.\r\n\r\n#2Siglas #FormaçãoProfissional #DiaMundialdoTurismo\r\n#FormaçãoCertificadda #FormaçãoOnline #InvestigaçãoemTurismo"}]'::jsonb,
       'Alcance',
       '2026-11-04T09:12:00.000Z'
from public.marketing_marcas m
where lower(m.nome) = '2siglas'
  and not exists (select 1 from public.marketing_conteudos x
                  where x.marca_id = m.id and x.titulo = '27 de setembro - Dia Mundial do Turismo (ONU Turismo)' and x.headline = 'No Algarve, a época baixa é a melhor época para formar a equipa');

-- 16. A importância da formação em segurança e saúde no trabalho para reconhecer riscos, adotar boas práticas e prevenir acidentes.
insert into public.marketing_conteudos
    (marca_id, ordem, persona_ids, responsavel_ids, responsavel_id, titulo, estado, headline, conceito, cta, canais, formato, objetivo, estrategia, editoria, pilar, hashtags, created_at)
select m.id, extract(epoch from now()) + 15,
       '{}'::uuid[],
       '{}'::uuid[], null::uuid,
       'A importância da formação em segurança e saúde no trabalho para reconhecer riscos, adotar boas práticas e prevenir acidentes.',
       'ideia',
       'A segurança no trabalho começa no conhecimento',
       'Mostrar situações reais de formação, equipamentos de proteção e exemplos de boas práticas, sempre com supervisão adequada.',
       'Partilha com alguém para quem a segurança no trabalho é essencial',
       array['Facebook', 'Instagram', 'LinkedIn']::text[],
       array['Carrossel']::text[],
       array['Institucional']::text[],
       array['Educação']::text[],
       array['Sabia que']::text[],
       array['Cuidador', 'Sábio-Mentor']::text[],
       array['#2siglas', '#FormaçãoCertificada', '#SegurançaNoTrabalho', '#Faro']::text[],
       '2026-10-26T17:33:00.000Z'
from public.marketing_marcas m
where lower(m.nome) = '2siglas'
  and not exists (select 1 from public.marketing_conteudos x
                  where x.marca_id = m.id and x.titulo = 'A importância da formação em segurança e saúde no trabalho para reconhecer riscos, adotar boas práticas e prevenir acidentes.' and x.headline = 'A segurança no trabalho começa no conhecimento');

-- 17. Comércio de produtos fitofarmacêuticos: responsabilidade e competência
insert into public.marketing_conteudos
    (marca_id, ordem, persona_ids, responsavel_ids, responsavel_id, titulo, estado, estado_antes_arquivo, avaliacao, canais, created_at)
select m.id, extract(epoch from now()) + 16,
       coalesce((select array_agg(p.id order by p.ordem) from public.marketing_personas p
                  where p.marca_id = m.id and translate(lower(p.papel), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc') = any(array['profissional autonomo', 'empregador/empresario']::text[])), '{}'::uuid[]),
       '{}'::uuid[], null::uuid,
       'Comércio de produtos fitofarmacêuticos: responsabilidade e competência',
       'arquivado',
       'ideia',
       'bom',
       array['Facebook', 'Instagram']::text[],
       '2026-09-29T15:45:00.000Z'
from public.marketing_marcas m
where lower(m.nome) = '2siglas'
  and not exists (select 1 from public.marketing_conteudos x
                  where x.marca_id = m.id and x.titulo = 'Comércio de produtos fitofarmacêuticos: responsabilidade e competência' and x.headline is null);

-- 18. Notícias - Renovação do certificado de Aplicador Fitofarmacêutico
insert into public.marketing_conteudos
    (marca_id, ordem, persona_ids, responsavel_ids, responsavel_id, titulo, estado, estado_antes_arquivo, avaliacao, headline, design_ideia, cta, canais, formato, objetivo, estrategia, editoria, hashtags, copies, created_at)
select m.id, extract(epoch from now()) + 17,
       coalesce((select array_agg(p.id order by p.ordem) from public.marketing_personas p
                  where p.marca_id = m.id and translate(lower(p.papel), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc') = any(array['encarregado agricola']::text[])), '{}'::uuid[]),
       '{}'::uuid[], null::uuid,
       'Notícias - Renovação do certificado de Aplicador Fitofarmacêutico',
       'arquivado',
       'ideia',
       'bom',
       'A validade do seu certificado de Aplicador de Produtos Fitofarmacêuticos pode estar a terminar',
       'Imagem com calendário estilizado e ícone de certificado/carimbo de validade, tons verdes ligados à agricultura. Texto de alerta: "A sua certificação ainda está válida?".',
       'Verifique a validade do seu certificado e evite contratempos 👉',
       array['Facebook', 'Instagram']::text[],
       array['Feed único']::text[],
       array['Divulgação Agenda']::text[],
       array['Reconhecimento (awareness)', 'Valorização']::text[],
       array['Notícias']::text[],
       array['#2siglas', '#Algarve', '#AplicadorFitofarmacêutico']::text[],
       '[{"titulo":"Copy 1","texto":"A certificação para aplicação de produtos fitofarmacêuticos tem prazo de validade, e a sua renovação atempada evita ficar impedido de exercer a atividade. É uma situação mais comum do que se imagina — e normalmente descoberta tarde demais.\r\n\r\nNa 2Siglas realizamos regularmente cursos de atualização para este certificado, com datas disponíveis ao longo do ano.\r\n\r\nSe não tem a certeza da validade do seu, este é o momento de confirmar."}]'::jsonb,
       '2026-08-21T10:33:00.000Z'
from public.marketing_marcas m
where lower(m.nome) = '2siglas'
  and not exists (select 1 from public.marketing_conteudos x
                  where x.marca_id = m.id and x.titulo = 'Notícias - Renovação do certificado de Aplicador Fitofarmacêutico' and x.headline = 'A validade do seu certificado de Aplicador de Produtos Fitofarmacêuticos pode estar a terminar');

-- 19. COTs - Últimas vagas de setembro
insert into public.marketing_conteudos
    (marca_id, ordem, persona_ids, responsavel_ids, responsavel_id, titulo, estado, estado_antes_arquivo, avaliacao, headline, design_ideia, cta, canais, formato, objetivo, estrategia, editoria, hashtags, copies, created_at)
select m.id, extract(epoch from now()) + 18,
       coalesce((select array_agg(p.id order by p.ordem) from public.marketing_personas p
                  where p.marca_id = m.id and translate(lower(p.papel), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc') = any(array['condutor', 'encarregado agricola']::text[])), '{}'::uuid[]),
       '{}'::uuid[], null::uuid,
       'COTs - Últimas vagas de setembro',
       'arquivado',
       'ideia',
       'bom',
       'As últimas vagas de setembro estão quase a fechar',
       'Reel dinâmico com contagem decrescente visual ("Últimas vagas") sobreposta a imagem de trator ou campo agrícola. Tipografia bold, tom de urgência mas profissional.',
       'Garanta o seu lugar antes que esgote 👉 link na bio',
       array['Facebook', 'Instagram']::text[],
       array['Reel / vídeo curto']::text[],
       array['Promocional']::text[],
       array['Conversão']::text[],
       array['Conversão', 'Interesse']::text[],
       array['#2siglas', '#Algarve', '#CondutorDeTrator']::text[],
       '[{"titulo":"Copy 1","texto":"Setembro é sempre um dos meses com maior procura nos nossos cursos — e este ano não é exceção. As vagas para as próximas turmas de condução de tratores e formação agrícola estão a preencher-se rapidamente.\r\n\r\nSe já pondera fazer esta formação, não vale a pena esperar mais: garantir o lugar agora evita ficar de fora da próxima turma disponível.\r\n\r\nFale connosco hoje e assegure a sua vaga."}]'::jsonb,
       '2026-08-21T10:33:00.000Z'
from public.marketing_marcas m
where lower(m.nome) = '2siglas'
  and not exists (select 1 from public.marketing_conteudos x
                  where x.marca_id = m.id and x.titulo = 'COTs - Últimas vagas de setembro' and x.headline = 'As últimas vagas de setembro estão quase a fechar');

-- 20. Formação contínua e sob medida
insert into public.marketing_conteudos
    (marca_id, ordem, persona_ids, responsavel_ids, responsavel_id, titulo, estado, estado_antes_arquivo, avaliacao, conceito, cta, canais, formato, objetivo, estrategia, editoria, hashtags, copies, created_at)
select m.id, extract(epoch from now()) + 19,
       coalesce((select array_agg(p.id order by p.ordem) from public.marketing_personas p
                  where p.marca_id = m.id and translate(lower(p.papel), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc') = any(array['gestor/influenciador', 'empregador/empresario', 'encarregado agricola']::text[])), '{}'::uuid[]),
       r.ids, r.ids[1],
       'Formação contínua e sob medida',
       'arquivado',
       'ideia',
       'bom',
       'Aula no campo',
       'Contacte-nos para saber mais:📞 289 821 753 | 912 852 135',
       array['Facebook', 'Instagram']::text[],
       array['Feed único']::text[],
       array['Institucional']::text[],
       array['Consideração']::text[],
       array['Educativo']::text[],
       array['#2siglas', '#FormaçãoCertificada', '#Faro', '#FormaçãoContínua', '#Formaçãoàmedida']::text[],
       '[{"titulo":"Copy 1","texto":"As empresas estão em constante evolução. E profissionais preparados mantêm as suas competências atualizadas. Mais do que saber fazer, é preciso desenvolver as habilidades e os conhecimentos certos, no momento certo, para responder às exigências do trabalho. A formação contínua permite acompanhar a mudança com mais confiança e segurança. Estar preparado começa por manter:✓ Certificações válidas✓ Conhecimentos atualizados✓ Procedimentos adequados✓ Equipamentos bem utilizados✓ Formação ajustada às funções. A sua equipa está preparada para novos desafios? Inicie já em setembro o nosso plano de formação para40 horas e assegure o cumprimento das obrigações legais até ao final do ano. Contacte-nos para saber mais:📞 289 821 753 | 912 852 135#2Siglas #formaçãocontínua #formaçãocertificada##formaçãoàmedida #Faro"}]'::jsonb,
       '2026-08-17T16:34:00.000Z'
from public.marketing_marcas m
cross join lateral (select coalesce(array_agg(pr.id), '{}'::uuid[]) as ids from public.profiles pr
            where split_part(translate(lower(coalesce(pr.nome, '')), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc'), ' ', 1) = any(array['valeria']::text[])) r
where lower(m.nome) = '2siglas'
  and not exists (select 1 from public.marketing_conteudos x
                  where x.marca_id = m.id and x.titulo = 'Formação contínua e sob medida' and x.headline is null);

commit;
