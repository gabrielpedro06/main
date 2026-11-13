-- =====================================================================
-- MARKETING: guia de marca (identidade, voz, visual, ficheiros) e
-- campos de ativação das personas (como abordar, gatilhos, mensagem-chave...)
-- =====================================================================

-- Guia de marca em JSON (blocos: sobre, personalidade, e_nao_e, voz, visual, ficheiros)
alter table public.marketing_marcas
    add column if not exists guia jsonb not null default '{}'::jsonb;

-- Personas: principal/complementar + matriz de ativação
alter table public.marketing_personas
    add column if not exists tipo text,
    add column if not exists decisao text,
    add column if not exists gatilhos text[] not null default '{}',
    add column if not exists formacao_ancora text,
    add column if not exists canal_chave text,
    add column if not exists como_abordar text,
    add column if not exists mensagem_chave text;

alter table public.marketing_personas drop constraint if exists marketing_personas_tipo_chk;
alter table public.marketing_personas
    add constraint marketing_personas_tipo_chk check (tipo is null or tipo in ('principal', 'complementar'));

-- ---------------------------------------------------------------------
-- 2Siglas: guia de marca (Brand Personality + Manual de Identidade v3)
-- Só preenche se o guia ainda estiver vazio.
-- ---------------------------------------------------------------------
update public.marketing_marcas
set guia = $guia${
  "sobre": {
    "nome_legal": "2Siglas — Formação e Investigação, Lda",
    "setor": "Formação profissional certificada",
    "sede": "Fundada em Tavira, com delegação em Faro — Algarve, Portugal",
    "fundacao": "2007 (28 de março) · 20 anos de atividade em 2027",
    "certificacao": "Entidade Formadora Certificada DGERT (desde 2013)",
    "website": "www.2siglas.pt",
    "descricao": "Empresa de formação e consultoria em diversos domínios da aquisição e desenvolvimento de competências nas empresas e nas pessoas. A estratégia é a diferenciação de produtos e serviços, indo ao encontro das necessidades e da melhoria contínua das expectativas dos clientes.",
    "missao": "Desenvolver e promover a investigação e o conhecimento em agricultura de precisão e biotecnologia, integrando-o no desenvolvimento empresarial e nacional através de um serviço de excelência.",
    "posicionamento": "Entidade formadora do Algarve, certificada pela DGERT, que ensina a partir da prática: métodos e equipamentos testados antes de qualquer formando chegar.",
    "areas": [
      { "codigo": "621", "nome": "Produção agrícola e animal" },
      { "codigo": "622", "nome": "Floricultura e jardinagem" },
      { "codigo": "090", "nome": "Desenvolvimento pessoal" },
      { "codigo": "341", "nome": "Comércio" },
      { "codigo": "813", "nome": "Desporto" },
      { "codigo": "862", "nome": "Segurança e higiene no trabalho" },
      { "codigo": "729", "nome": "Saúde — programas não classificados noutra área" },
      { "codigo": "342", "nome": "Marketing e publicidade" },
      { "codigo": "346", "nome": "Secretariado e trabalho administrativo" },
      { "codigo": "347", "nome": "Enquadramento na organização/empresa" },
      { "codigo": "482", "nome": "Informática na ótica do utilizador" }
    ],
    "parceiros": ["DGERT", "CCDR Algarve", "AMAR à Terra (Agricultura e Pescas)", "IPDJ — Instituto Português do Desporto e Juventude"]
  },
  "personalidade": {
    "resumo": "A 2Siglas combina rigor técnico com proximidade humana — forma pessoas e empresas para trabalhar com segurança e competência, sem perder a autenticidade do terreno.",
    "arquetipos": [
      { "nome": "Sábio-Mentor", "papel": "Principal", "peso": 60, "descricao": "Transmite conhecimento prático com rigor e confiança, preparando profissionais e empresas para desempenhar funções com segurança e competência. Desenvolve competências especializadas, em conformidade legal, constantemente atualizadas.", "expressoes": "Informação atualizada com clareza e objetividade · evidências de transparência e excelência", "emocao": "Confiança", "promessa": "Ensinar e orientar" },
      { "nome": "Cuidador", "papel": "Apoio", "peso": 25, "descricao": "A formação nasce de uma preocupação genuína com a segurança e o bem-estar de quem trabalha. Assegura as condições necessárias à aprendizagem, com flexibilidade, clareza, rigor e objetividade.", "expressoes": "Mantém proximidade e gera identificação e fiabilidade · oferece suporte contínuo · defende a ética e a integridade", "emocao": "Segurança e proximidade", "promessa": "Cuidar e apoiar" },
      { "nome": "Criativo", "papel": "Apoio", "peso": 15, "descricao": "Traduz o conhecimento técnico em formações práticas, visuais e facilitadoras da aprendizagem. Personaliza cursos para atender às necessidades do mercado profissional.", "expressoes": "Aplica a criatividade no dia a dia · oferece inovação pedagógica · inspira boas práticas educacionais e de desenvolvimento pessoal", "emocao": "Inspiração", "promessa": "Criar e transformar" }
    ],
    "regra_arquetipos": "O Sábio-Mentor abre a mensagem (o que se aprende e com que rigor), o Criativo mostra como se aprende, o Cuidador fecha com a garantia de segurança e acompanhamento.",
    "tracos": [
      { "nome": "Rigorosa", "descricao": "Cada curso é preparado ao detalhe, com métodos e equipamentos testados antes de qualquer formando chegar." },
      { "nome": "Próxima", "descricao": "Fala com formandos, formadores e empresários como parceiros, não como números." },
      { "nome": "Autêntica", "descricao": "Mostra o trabalho real, sem cenários encenados — bastidores, terreno, pessoas verdadeiras." },
      { "nome": "Experiente", "descricao": "Quase duas décadas de atividade e acreditação DGERT sustentam cada mensagem." },
      { "nome": "Prática", "descricao": "O foco está sempre na aplicação real do conhecimento, não na teoria pela teoria." }
    ],
    "valores": [
      { "nome": "Competência", "subtitulo": "Habilidade e conhecimento", "descricao": "Possuir as habilidades e o conhecimento necessários para realizar tarefas." },
      { "nome": "Compromisso e esforço", "subtitulo": "Dedicação", "descricao": "Demonstrar compromisso e esforço contínuo em todas as atividades." },
      { "nome": "Dinamismo", "subtitulo": "Energia e proatividade", "descricao": "Ser enérgico, proativo e adaptável às mudanças." },
      { "nome": "Integridade e moralidade", "subtitulo": "Ética", "descricao": "Agir com integridade, honestidade e respeito pelos outros." },
      { "nome": "Experiência / know-how", "subtitulo": "Conhecimento prático", "descricao": "Ter experiência prática e conhecimento especializado na área de atuação." },
      { "nome": "Criatividade e novidade", "subtitulo": "Inovação", "descricao": "Procurar novas ideias, soluções e abordagens." },
      { "nome": "Profissionalismo", "subtitulo": "Conduta e postura", "descricao": "Manter uma conduta profissional, respeitosa e confiável." },
      { "nome": "Excelência e padrões", "subtitulo": "Qualidade", "descricao": "Entregar trabalho de alta qualidade, atendendo ou superando os padrões." },
      { "nome": "Responsabilidade", "subtitulo": "Assumir consequências", "descricao": "Assumir responsabilidade por ações e resultados." },
      { "nome": "Honestidade e transparência", "subtitulo": "Veracidade", "descricao": "Ser honesto, transparente e confiável em todas as comunicações." }
    ],
    "regra_valores": "Em comunicação, escolha no máximo três valores por peça — só os que a mensagem consegue provar com factos."
  },
  "e_nao_e": {
    "e": ["Rigorosa e certificada", "Próxima e humana", "Prática e ativa", "Autêntica e leve", "Reconhecida no Algarve"],
    "nao_e": ["Amadora ou informal", "Distante ou burocrática", "Puramente teórica", "Encenada, artificial ou formal demais", "Genérica ou sem identidade local"],
    "teste": "Teste rápido antes de publicar: se a peça cai na coluna da direita, volta para trás e reescreve-se.",
    "provar": "Sempre que possível, provar: número de horas, local, acreditação, nome do parceiro.",
    "alarme": "Sinais de alarme: fotografia de banco de imagens, promessas sem prazo, superlativos sem dados."
  },
  "voz": {
    "tom": "Direto e caloroso, com autoridade técnica sem ser distante. A 2Siglas fala como quem já viveu o que ensina — confiante nos factos, próxima nas palavras, sempre em português claro e sem jargão desnecessário, no Português de Portugal atual.",
    "caracteristicas": [
      { "nome": "Confiante", "descricao": "Comunicamos com segurança e clareza", "fazemos": "Afirmações diretas", "nao_fazemos": "Linguagem hesitante" },
      { "nome": "Empático", "descricao": "Entendemos as necessidades do público", "fazemos": "Personalizamos a mensagem", "nao_fazemos": "Linguagem genérica" },
      { "nome": "Claro", "descricao": "Evitamos jargões desnecessários", "fazemos": "Linguagem simples", "nao_fazemos": "Termos técnicos sem explicação" }
    ],
    "usamos": ["Formação certificada", "Formando(a)", "Segurança", "Algarve", "Faro", "Formação profissional", "Curso", "Profissionais"],
    "evitamos": ["soluções disruptivas", "sinergias", "jargão corporativo", "o melhor do mercado"],
    "canais": [
      { "canal": "Instagram / Facebook", "tom": "Próximo e visual. Autenticidade, bastidores, notícias, educação, sustentabilidade, desenvolvimento pessoal e profissional.", "exemplo": "Reels e carrossel com fotos reais de formandos e formadores, com CTA direto (\"Segue-nos 👉\")." },
      { "canal": "LinkedIn", "tom": "Institucional e credível. Oportunidades.", "exemplo": "Marcos da empresa, parcerias e acreditações (DGERT, CCDR Algarve)." },
      { "canal": "E-mail / Newsletter", "tom": "Direto e informativo. Notícias, novidades, campanhas.", "exemplo": "Novos cursos, prazos de inscrição e locais de formação." },
      { "canal": "Blog / Site", "tom": "Educativo, informativo, acessível e prático.", "exemplo": "Artigos sobre segurança, certificações e novidades regulatórias." }
    ],
    "em_vez_de": "Oferecemos formações certificadas e pensadas para atender às necessidades reais de diferentes empresas.",
    "dizemos": "A qualidade das nossas formações começa muito antes da primeira aula.",
    "tratamento": "\"Você\" em comunicação comercial e formativa; terceira pessoa em relatórios de investigação. Nunca alternar dentro da mesma peça."
  },
  "visual": {
    "logotipo": "Símbolo construído a partir de duas formas entrelaçadas — leitura visual das \"2 siglas\" do nome — em ciano. Junto a ele, o nome 2SIGLAS com o \"2\" em ciano marca e o restante em azul profundo; por baixo, o descritor \"Formação e Investigação Lda\". Nunca redesenhar, recontornar, rodar, distorcer ou aplicar sombras. Versão branca em fundos escuros e fotografia; colorida em fundos claros (≥ 85%).",
    "cores": [
      { "nome": "Azul profundo", "hex": "#0D124B", "papel": "Autoridade", "uso": "H1 e H2, hero, investigação e fundos institucionais" },
      { "nome": "Ciano marca", "hex": "#009CC3", "papel": "Identidade", "uso": "Categorias, linhas, ícones, indicadores e estatísticas. Não é cor de texto em fundo claro." },
      { "nome": "Ciano vivo", "hex": "#00B3D2", "papel": "Energia", "uso": "Destaques e CTA em fundo escuro. Raro por definição — no máximo um CTA por peça." },
      { "nome": "Preto marca", "hex": "#0F0F0F", "papel": "Conteúdo", "uso": "Texto principal, subtítulos e leitura editorial longa" },
      { "nome": "Cinza", "hex": "#585F69", "papel": "Informação secundária", "uso": "Metadados, legendas, categorias e datas" },
      { "nome": "Branco", "hex": "#FFFFFF", "papel": "Clareza", "uso": "Fundo principal e texto sobre fundos escuros" },
      { "nome": "Branco azulado", "hex": "#F5F7FB", "papel": "Leveza estrutural", "uso": "Alternância de secções, cartões e superfícies suaves" },
      { "nome": "Linha", "hex": "#DDE3EC", "papel": "Estrutura", "uso": "Filetes, contornos de cartão e separadores de tabela" },
      { "nome": "Petróleo profundo", "hex": "#06414E", "papel": "Auxiliar", "uso": "Fundo alternativo ao azul profundo em temas de campo e sustentabilidade" },
      { "nome": "Verde ardósia", "hex": "#38564A", "papel": "Auxiliar", "uso": "Superfícies calmas, tabelas, faixas e blocos de citação" },
      { "nome": "Âmbar queimado", "hex": "#C25D00", "papel": "Auxiliar", "uso": "Prazos, alertas e um CTA por peça. Máximo 5% da área." }
    ],
    "tipografias": [
      { "nome": "Manrope", "papel": "Principal · títulos H1 e H2 (600 · 700 · 800)", "descricao": "Geométrica contemporânea: moderna, minimalista, tecnológica e amigável. Excelente legibilidade mesmo em corpo pequeno. Usa-se em bold para títulos e chamadas." },
      { "nome": "Montserrat", "papel": "Secundária · H3, H4 e textos (400 · 500 · 600 · 700)", "descricao": "Geométrica com personalidade mais forte e urbana: institucional, editorial, robusta. Usa-se em regular para o corpo de texto." }
    ],
    "regras": [
      "H1 e H2 sempre em #0D124B ou branco; subtítulos e corpo em #0F0F0F ou #585F69.",
      "CTA em ciano vivo leva texto #0F0F0F (7,6:1), nunca branco.",
      "Em fotografia com overlay, medir o contraste no ponto exato do texto.",
      "A cor nunca é o único portador de informação — acompanhar com rótulo, ícone ou padrão.",
      "Nunca mais de dois pesos por peça, além da etiqueta em maiúsculas. Títulos sempre alinhados à esquerda."
    ],
    "fotografia": "Fotografia real e não encenada: formadores e formandos em contexto de trabalho — campo, tratores, equipamentos de segurança — com luz natural. Pessoas reais da 2Siglas, com autorização. Equipamento de proteção sempre correto. Texto sobre foto só sobre bloco de cor sólida ou zona tratada (overlay #0D124B a 40–45%). Banco de imagens só como último recurso. Evitar produção de estúdio e imagens infantilizadas.",
    "selos": "Selo \"Formação Certificada\" e logótipos institucionais: 2Siglas primeiro, à esquerda; DGERT e parceiros à direita, alinhados pela base e à mesma altura ótica. Usar sempre os ficheiros oficiais de cada entidade, sem recolorir."
  },
  "ficheiros": []
}$guia$::jsonb
where lower(nome) = '2siglas'
  and (guia is null or guia = '{}'::jsonb);

-- ---------------------------------------------------------------------
-- 2Siglas: ativação das personas (Guia de Personas v3 · matriz de ativação)
-- Só preenche campos vazios.
-- ---------------------------------------------------------------------
update public.marketing_personas p
set tipo = coalesce(p.tipo, v.tipo),
    decisao = coalesce(p.decisao, v.decisao),
    gatilhos = case when cardinality(p.gatilhos) = 0 then v.gatilhos else p.gatilhos end,
    formacao_ancora = coalesce(p.formacao_ancora, v.formacao_ancora),
    canal_chave = coalesce(p.canal_chave, v.canal_chave),
    como_abordar = coalesce(p.como_abordar, v.como_abordar),
    mensagem_chave = coalesce(p.mensagem_chave, v.mensagem_chave)
from public.marketing_marcas m,
(values
    ('João', 'principal', null,
     array['Obrigação legal', 'Necessidade de produtividade'],
     'Formação à medida + SST obrigatória', 'E-mail → telefone',
     'Proposta com custo, carga horária e retorno à vista. Falar de equipa, não de curso. Contacto telefónico depois do e-mail.',
     'Formação que a sua equipa aplica no dia seguinte.'),
    ('Ana', 'principal', null,
     array['Plano anual de formação', 'Auditoria'],
     'Plano de formação certificado', 'LinkedIn + e-mail',
     'LinkedIn e e-mail com calendário, certificação DGERT e evidência documental. Mostrar o antes e o depois de um plano anual.',
     'Um parceiro DGERT que conhece a sua operação.'),
    ('Ricardo', 'principal', null,
     array['Erro repetido', 'Quase-acidente'],
     'SST agrícola + COTS para a equipa', 'WhatsApp + site',
     'WhatsApp e conversa direta. Falar de acidentes evitados e de tarefas que passam a correr bem. Formação no local, em horário de campanha.',
     'Menos erros no terreno, equipa mais segura.'),
    ('Tiago', 'complementar', 'Própria ou paga pela empresa',
     array['Prazo legal a fechar e risco de coima', 'Formação perto de casa, com datas concretas', 'Certificado registado no SIGO', 'Colega ou patrão que recomenda'],
     'COTS — Conduzir e Operar com o Trator em Segurança · 35 h presenciais, com prática', 'WhatsApp + Facebook',
     'Linguagem direta, sem jargão. Data, local, preço e certificado logo na primeira mensagem. Fotografia real de terreno.',
     'A formação que a lei exige, com prática e certificado.'),
    ('Nuno', 'complementar', 'Influencia; a empresa paga',
     array['Visita ou notificação da ACT', 'Acidente ou quase-acidente recente', 'Auditoria ou exigência de cliente', 'Formador que conhece o setor'],
     'HST — representante do empregador para a segurança no trabalho', 'E-mail + site',
     'Referência legal explícita, programa e carga horária. Casos reais do setor. E-mail e website, com contacto direto para dúvidas.',
     'Formação certificada para quem responde pela segurança.'),
    ('Marta', 'complementar', 'Própria; clube apoia em parte',
     array['Prazo de revalidação da cédula', 'Horário pós-laboral, fim de semana ou online', 'Formador com prática desportiva reconhecida', 'Grupo do clube a inscrever-se em conjunto'],
     'Formação contínua de treinadores — revalidação de cédula (área 813)', 'Instagram + WhatsApp',
     'Instagram e WhatsApp. Vídeo curto de formação real. Calendário com prazos de revalidação e horários compatíveis.',
     'Revalide a cédula sem parar para os treinos.'),
    ('Hélder', 'complementar', 'Própria — investimento de carreira',
     array['Oportunidade concreta que exige CCP', 'Formato blended ou online acompanhado', 'Entidade certificada DGERT com histórico', 'Possibilidade de entrar na bolsa de formadores'],
     'Formação Pedagógica Inicial de Formadores (CCP) e formação pedagógica contínua', 'LinkedIn + e-mail',
     'LinkedIn e e-mail, tom profissional: metodologia, certificação DGERT, saídas concretas. Convite à bolsa de formadores.',
     'Transforme o que sabe fazer em formação certificada.'),
    ('Cátia', 'complementar', 'Própria — decide e paga sozinha',
     array['Exigência de um cliente ou candidatura', 'Curso curto, com preço e datas transparentes', 'Formato online ou pós-laboral', 'Certificado reconhecido, com menção DGERT'],
     'Curso técnico curto certificado (621 agrícola · 622 jardinagem · 341 comércio · 090 desenvolvimento pessoal)', 'Instagram + Facebook',
     'Instagram e Facebook com prova social de antigos formandos. Preço, duração e retorno à vista. Inscrição simples pelo telemóvel.',
     'Formação curta que se paga no próximo cliente.')
) as v(nome_persona, tipo, decisao, gatilhos, formacao_ancora, canal_chave, como_abordar, mensagem_chave)
where p.marca_id = m.id
  and lower(m.nome) = '2siglas'
  and p.nome_persona = v.nome_persona;
