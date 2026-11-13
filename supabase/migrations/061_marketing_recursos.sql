-- =====================================================================
-- MARKETING: recursos da marca (o que faltava no modelo do Notion)
--  * marketing_recursos → uma tabela por marca para tudo o que é "base de dados
--    de apoio", separado por tipo:
--      oferta    → catálogo de cursos/serviços (duração, preço, modalidade, link…)
--      turma     → agenda de turmas/eventos (datas, local, vagas, estado)
--      campanha  → campanhas (objetivo, período, orçamento, KPI e meta)
--      lead      → registo de leads/inscrições/propostas (para medir as metas)
--      ativo     → biblioteca de ativos (logos, selos, templates, fotos + autorização)
--      facto     → factos e legislação verificados (e pendentes "a confirmar")
--      regra     → regras de comunicação (nunca / sempre / confirmar)
--      canal     → configuração dos canais (conta, link na bio, frequência, horários)
--    Campos comuns em colunas (titulo, estado, data, data_fim); o resto em "dados".
--  * marketing_conteudos: métricas por peça, link da publicação, UTM e ofertas ligadas
--  * Limpeza de vocabulário vindo do Notion (#2siglas, Criador, Autônomo)
-- =====================================================================

create table if not exists public.marketing_recursos (
    id uuid primary key default gen_random_uuid(),
    marca_id uuid not null references public.marketing_marcas(id) on delete cascade,
    tipo text not null,
    titulo text not null default '',
    estado text,
    data date,
    data_fim date,
    dados jsonb not null default '{}'::jsonb,
    ordem double precision not null default extract(epoch from now()),
    created_by uuid references public.profiles(id) on delete set null default auth.uid(),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint marketing_recursos_tipo_chk check (tipo in ('oferta', 'turma', 'campanha', 'lead', 'ativo', 'facto', 'regra', 'canal')),
    constraint marketing_recursos_datas_chk check (data is null or data_fim is null or data_fim >= data)
);

create index if not exists idx_marketing_recursos_marca_tipo
    on public.marketing_recursos (marca_id, tipo, ordem);

drop trigger if exists trg_marketing_recursos_updated_at on public.marketing_recursos;
create trigger trg_marketing_recursos_updated_at
before update on public.marketing_recursos
for each row execute function public.set_updated_at_generic();

alter table public.marketing_recursos enable row level security;

drop policy if exists marketing_recursos_all_authenticated on public.marketing_recursos;
create policy marketing_recursos_all_authenticated
on public.marketing_recursos for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

-- Conteúdos: resultados detalhados e ligação ao catálogo
alter table public.marketing_conteudos
    add column if not exists metricas jsonb not null default '{}'::jsonb,  -- { alcance, visualizacoes, interacoes, guardados, partilhas, cliques, leads }
    add column if not exists url_publicacao text,
    add column if not exists utm_campaign text,
    add column if not exists oferta_ids uuid[] not null default '{}';

-- ---------------------------------------------------------------------
-- Limpeza de vocabulário (dados importados do Notion)
-- ---------------------------------------------------------------------
update public.marketing_conteudos c
set hashtags = sub.limpas
from (
    select id, array(
        select distinct on (lower(t)) t
        from (
            select case
                     when lower(regexp_replace(h, '^#?', '#')) = '#2siglas' then '#2Siglas'
                     else regexp_replace(trim(h), '^#?', '#')
                   end as t, ord
            from unnest(hashtags) with ordinality as u(h, ord)
            where trim(h) <> ''
        ) x
        order by lower(t), ord
    ) as limpas
    from public.marketing_conteudos
    where cardinality(hashtags) > 0
) sub
where c.id = sub.id and c.hashtags is distinct from sub.limpas;

update public.marketing_conteudos
set pilar = array_replace(pilar, 'Criador', 'Criativo')
where 'Criador' = any(pilar);

update public.marketing_personas
set papel = replace(papel, 'Autônomo', 'Autónomo')
where papel like '%Autônomo%';

-- =====================================================================
-- 2Siglas: dados iniciais (só se a marca ainda não tiver recursos)
-- =====================================================================
with m as (
    select id from public.marketing_marcas where lower(nome) = '2siglas'
),
vazio as (
    select m.id from m where not exists (select 1 from public.marketing_recursos r where r.marca_id = m.id)
)
insert into public.marketing_recursos (marca_id, tipo, titulo, estado, data, data_fim, dados, ordem)
select vazio.id, v.tipo, v.titulo, v.estado, v.data::date, v.data_fim::date, v.dados::jsonb, v.ordem
from vazio
cross join (values
-- ---------- Catálogo ----------
('oferta', 'COTS — Conduzir e Operar com o Trator em Segurança', 'ativa', null, null,
 '{"codigo":"COTS","area":"621","duracao":"35 h","preco":"210 € por formando","modalidade":"Presencial","certificado":"Certificado de formação (SIGO) · equivalente UFCD 9596","publico":"Condutores de veículos agrícolas com carta B, C ou D","url":"","personas":"Tiago, Ricardo, João","notas":"Prazo prorrogado até 1/8/2027 só para carta B + veículos tipo II sem TDF, cardans ou sistema hidráulico (Despacho 9675-C/2026)."}', 1),
('oferta', 'APF — Aplicação de Produtos Fitofarmacêuticos (formação inicial)', 'ativa', null, null,
 '{"codigo":"APF","area":"621","duracao":"A CONFIRMAR (site diz 50 h no título e 35 h na duração)","preco":"A confirmar","modalidade":"Presencial, pós-laboral","certificado":"Habilitação de aplicador, válida 15 anos (DL 127/2026)","publico":"Quem ainda não tem cartão de aplicador","url":"","notas":"O link atual do site descreve a renovação, não a formação inicial. Corrigir antes de divulgar."}', 2),
('oferta', 'AAPF — Ação de Atualização em Aplicação de Produtos Fitofarmacêuticos', 'ativa', null, null,
 '{"codigo":"AAPF","area":"621","duracao":"A confirmar","preco":"180 € (isento de IVA)","modalidade":"Presencial","certificado":"Renovação da habilitação de aplicador","publico":"Titulares de cartão de aplicador","url":"http://2siglas.pt/site/works/aplicador-produtos-fito/","notas":"Avança com um mínimo de 8 formandos."}', 3),
('oferta', 'DCPF — Distribuição e Comercialização de Produtos Fitofarmacêuticos', 'ativa', null, null,
 '{"codigo":"DCPF","area":"621","duracao":"25 h","preco":"150 € por formando","modalidade":"Presencial","certificado":"Acesso ao cartão de vendedor de produtos fitofarmacêuticos","publico":"Profissionais comerciais de produtos fitofarmacêuticos","url":""}', 4),
('oferta', 'Arboricultura: escalada de árvores — nível 1', 'ativa', null, null,
 '{"area":"622","duracao":"28 h","preco":"A confirmar","modalidade":"Presencial","publico":"Quem quer iniciar-se na arboricultura","url":""}', 5),
('oferta', 'Estilos e tipologias no boxe competitivo', 'ativa', null, null,
 '{"area":"813","duracao":"15 h","preco":"A confirmar","modalidade":"Presencial (Lisboa)","certificado":"3 UC (unidades de crédito) para treinadores","publico":"Treinadores de boxe","personas":"Marta"}', 6),
('oferta', 'Campanha Ibérica Alterações Climáticas', 'ativa', null, null,
 '{"area":"862","duracao":"4 h","preco":"A confirmar","modalidade":"Online, autoaprendizagem","publico":"Quem trabalha exposto a calor e frio extremos"}', 7),
('oferta', 'Ergonomia no local de trabalho', 'ativa', null, null,
 '{"area":"862","duracao":"4 h","preco":"A confirmar","modalidade":"Online","notas":"Confirmar se cobre também movimentação manual de cargas."}', 8),
('oferta', 'Inteligência Emocional', 'ativa', null, null,
 '{"area":"090","modalidade":"Online, autoaprendizagem","preco":"A confirmar","duracao":"A confirmar"}', 9),
('oferta', 'Gestão do Tempo e do Stress', 'ativa', null, null,
 '{"area":"090","modalidade":"Online, autoaprendizagem","preco":"A confirmar","duracao":"A confirmar"}', 10),
('oferta', 'Gestão da Imagem Pessoal e Organizacional', 'ativa', null, null,
 '{"area":"090","modalidade":"Online, autoaprendizagem com tutoria","preco":"A confirmar","duracao":"A confirmar"}', 11),
('oferta', 'Pacote online 40 horas (formação contínua)', 'ativa', null, null,
 '{"preco":"210 € por formando (confirmar)","modalidade":"Online, cursos combináveis","publico":"Empresas que precisam de cumprir as 40 h anuais","personas":"João, Ana"}', 12),
('oferta', 'Ciber-higiene para PME', 'em_preparacao', null, null,
 '{"area":"482 (a confirmar)","modalidade":"Online, por formando ou por equipa","preco":"A definir","publico":"Todos os colaboradores de PME","personas":"João, Ana, Nuno","notas":"Só usar \"formação certificada\" e o selo depois de confirmar a área 482. Nunca prometer conformidade NIS2."}', 13),
('oferta', 'Cibersegurança para gestores (NIS2)', 'em_preparacao', null, null,
 '{"modalidade":"A definir","publico":"Gestores e decisores","notas":"A peça do Reel foi arquivada; confirmar se o curso avança."}', 14),
('oferta', 'Formação Pedagógica Inicial de Formadores (CCP)', 'ativa', null, null,
 '{"modalidade":"A confirmar","preco":"A confirmar","personas":"Hélder"}', 15),
('oferta', 'HST — Representante do empregador para a SST', 'ativa', null, null,
 '{"area":"862","modalidade":"A confirmar","preco":"A confirmar","personas":"Nuno"}', 16),
('oferta', 'Diagnóstico e plano de formação (FCT)', 'ativa', null, null,
 '{"modalidade":"Serviço / acompanhamento","preco":"A definir","publico":"Empresas com saldo no Fundo de Compensação do Trabalho","notas":"Acompanhamento até 20/12/2026; últimos diagnósticos até 18/12."}', 17),
-- ---------- Turmas ----------
('turma', 'COTS · Almancil', 'decorrida', '2026-10-19', '2026-10-30',
 '{"oferta":"COTS — Conduzir e Operar com o Trator em Segurança","local":"Almancil","horario":"9h–17h","vagas":"","inscritos":"","notas":"Dias 19, 21, 26, 28 e 30 de outubro."}', 1),
('turma', 'COTS · Almancil', 'esgotada', '2026-11-14', null,
 '{"oferta":"COTS — Conduzir e Operar com o Trator em Segurança","local":"Almancil","notas":"Turma completa. Há lista de espera para a próxima turma (data por definir)."}', 2),
('turma', 'Arboricultura nível 1 · Benafim e Vale Fuzeiros', 'aberta', '2026-11-17', '2026-11-20',
 '{"oferta":"Arboricultura: escalada de árvores — nível 1","local":"Benafim e Vale Fuzeiros"}', 3),
('turma', 'COTS · próxima turma', 'planeada', null, null,
 '{"oferta":"COTS — Conduzir e Operar com o Trator em Segurança","local":"A definir","notas":"DATA POR DEFINIR — necessária para a peça \"COTS — Grupo completo\"."}', 4),
-- ---------- Campanhas ----------
('campanha', 'Campanha FCT ''Já é seu''', 'ativa', '2026-11-12', '2026-12-22',
 '{"objetivo":"Empresas usarem o saldo do FCT em formação certificada","frente":"Obrigatórias/à medida","kpi":"Diagnósticos FCT marcados","meta":"","orcamento":"","personas":"João, Ana, Nuno","notas":"Sem publicações FCT a 27/11 e 30/11. Distinguir sempre 31/12 (legal) de 20/12 (2Siglas)."}', 1),
('campanha', 'Lançamento ciber-higiene', 'ativa', '2026-10-28', '2027-01-31',
 '{"objetivo":"Entrar no mercado de cibersegurança","frente":"Cibersegurança","kpi":"Leads de cibersegurança","meta":"50","orcamento":"600–900 €","notas":"Data de lançamento por confirmar: 30/11 (estratégia) ou 03/12 (peças de out/nov)."}', 2),
('campanha', 'Black Friday B2C online', 'planeada', '2026-11-23', '2026-12-02',
 '{"objetivo":"Vender cursos online B2C","frente":"B2C online","kpi":"Inscrições online pagas","meta":"80","orcamento":"500–800 € (com vale e Ano Novo)","notas":"Confirmar condições reais (sem inventar percentagens) e checkout testado antes de 27/11."}', 3),
('campanha', 'Vale-formação de Natal', 'planeada', '2026-12-01', '2026-12-20',
 '{"frente":"B2C online","kpi":"Vales vendidos","meta":"30"}', 4),
('campanha', 'Fecho das 40 horas de 2026', 'ativa', '2026-11-09', '2026-12-18',
 '{"frente":"Obrigatórias/à medida","kpi":"Propostas aceites","meta":"12 (≥ 4 por equipa)","orcamento":"400–600 €"}', 5),
('campanha', 'Rumo aos 20 anos', 'planeada', '2026-12-01', '2027-03-28',
 '{"objetivo":"Reforçar autoridade antes do aniversário (28/03/2027)","kpi":"Alcance"}', 6),
-- ---------- Factos e legislação ----------
('facto', 'Cartão de aplicador passa a valer 15 anos', 'verificado', '2026-07-08', null,
 '{"referencia":"Decreto-Lei n.º 127/2026, de 26 de junho · Nota de esclarecimento DGAV (8/7/2026)","resumo":"Cartões válidos a 27/06/2026 ganham +5 anos automaticamente. Caducados nessa data fazem a formação base. Renovação continua a exigir a ação de atualização.","fonte":""}', 1),
('facto', 'Prazo do COTS prorrogado até 1/8/2027 (só alguns condutores)', 'verificado', '2026-07-31', null,
 '{"referencia":"Despacho n.º 9675-C/2026, de 31 de julho","resumo":"Só para carta B e veículos agrícolas tipo II sem TDF, veio telescópico de cardans e sistema hidráulico. Não elimina a obrigatoriedade.","fonte":""}', 2),
('facto', 'FCT: pedir a mobilização até 31/12/2026', 'a_rever', null, null,
 '{"referencia":"DL 115/2023 · FAQ oficiais do FCT","resumo":"Prazo legal 31/12/2026. O Governo anunciou uma prorrogação (out. 2026) ainda sem data em lei. Se for publicada, rever todas as peças FCT.","fonte":"https://www.fundoscompensacao.pt/pt/dl-115/2023-de-15-dez-faq","rever_em":"2026-12-01"}', 3),
('facto', 'NIS2 em vigor desde 3 de abril de 2026', 'verificado', null, null,
 '{"referencia":"Decreto-Lei n.º 125/2025, de 4 de dezembro","resumo":"Alerta inicial ao CNCS em 24 h após incidente significativo. Responsabilidade pessoal dos gestores em casos de dolo ou culpa grave. A 2Siglas forma, não certifica conformidade.","fonte":""}', 4),
('facto', 'Contactos úteis em incidentes digitais', 'a_rever', null, null,
 '{"referencia":"CNCS · APAV","resumo":"cert@cert.pt (CNCS) · Linha Internet Segura 800 21 90 90 (dias úteis, 8h–22h) · cibercrime@pgr.pt · unc3t@pj.pt","fonte":"","rever_em":"2026-12-31"}', 5),
-- ---------- A confirmar (pendentes da equipa) ----------
('facto', 'Data de lançamento da ciber-higiene: 30/11 ou 03/12?', 'a_confirmar', null, null, '{"resumo":"A estratégia e as peças novas dizem 30/11; as peças de 28/10 e 05/11 dizem 03/12."}', 10),
('facto', 'Ciber-higiene está na área DGERT 482?', 'a_confirmar', null, null, '{"resumo":"Até confirmar, não usar \"formação certificada\" nem o selo nas peças de ciber."}', 11),
('facto', 'Duração da APF: 50 h ou 35 h?', 'a_confirmar', null, null, '{"resumo":"O site tem 50 h no título e 35 h na duração."}', 12),
('facto', 'DCPF: Faro ou Almancil?', 'a_confirmar', null, null, '{"resumo":"O briefing diz Almancil, o texto e o e-mail dizem Faro."}', 13),
('facto', 'Data da próxima turma de COTS', 'a_confirmar', null, null, '{"resumo":"Necessária para a peça \"COTS — Grupo completo\" (14/11)."}', 14),
('facto', '"Ferramentas para o CV": 3 ou 5 cursos, e quais?', 'a_confirmar', null, null, '{"resumo":"A legenda tem 3 (FCF, Desenvolvimento Pessoal, Desporto e Saúde); a especificação tem 5 (CCP, Desenvolvimento Pessoal, Informática, Marketing, Desporto e Saúde)."}', 15),
('facto', 'Black Friday: contraprogramação ou campanha real?', 'a_confirmar', null, null, '{"resumo":"A peça de contraprogramação (27/11) diz para ser substituída se houver campanha real. Há campanha real planeada."}', 16),
('facto', 'Ticket médio 2026 (B2C, por formando, por equipa)', 'a_confirmar', null, null, '{"resumo":"Prazo interno: apurar até 15/11/2026."}', 17),
('facto', 'Números reais de 2026 (formandos, ações, horas, empresas)', 'a_confirmar', null, null, '{"resumo":"Para a retrospetiva de 30/12 e para a campanha dos 20 anos. Não estimar."}', 18),
('facto', 'FCT: telefone e link de marcação do diagnóstico', 'a_confirmar', null, null, '{"resumo":"Os e-mails e carrosséis FCT têm [TELEFONE] e [LINK MARCAÇÃO] por preencher."}', 19),
('facto', 'Sessão online gratuita de ciber-higiene: data, hora e landing', 'a_confirmar', null, null, '{"resumo":"Necessário antes de publicar as peças de 26/11 e 30/11."}', 20),
-- ---------- Regras de comunicação ----------
('regra', 'Nunca prometer "fica conforme" com a NIS2', 'nunca', null, null, '{"porque":"A 2Siglas forma, não certifica conformidade."}', 1),
('regra', 'Nunca usar "custo zero", "100% financiado" ou "reembolso garantido"', 'nunca', null, null, '{"porque":"Campanha FCT: o saldo é da empresa, não é dinheiro grátis."}', 2),
('regra', 'Sem urgência artificial nem percentagens de desconto inventadas', 'nunca', null, null, '{"porque":"Tom da marca; Black Friday só como data, salvo condições reais confirmadas."}', 3),
('regra', 'Não imitar marcas, lojas ou bancos reais em mockups', 'nunca', null, null, '{"porque":"Usar sempre nomes, domínios e números fictícios."}', 4),
('regra', 'Não usar voz clonada real nem ferramentas de clonagem nas gravações', 'nunca', null, null, '{}', 5),
('regra', 'Selo "Formação Certificada"/DGERT só em peças de formação certificada', 'sempre', null, null, '{"porque":"Em peças informativas (ex.: FCT P1) não leva selo."}', 6),
('regra', 'Citar a fonte oficial quando se fala de lei ou dados', 'sempre', null, null, '{"porque":"CNCS, DGAV, Diário da República, FAQ do FCT, EU-OSHA… Reescrever por palavras nossas, sem plágio."}', 7),
('regra', 'Distinguir sempre o prazo legal (31/12) do prazo 2Siglas (20/12)', 'sempre', null, null, '{"porque":"Campanha FCT. 20/12 é domingo: últimos diagnósticos até sexta, 18/12."}', 8),
('regra', 'Ligar para a página do curso, nunca para a homepage', 'sempre', null, null, '{"porque":"Menos cliques perdidos. No Facebook não existe \"link na bio\": pôr o link no texto."}', 9),
('regra', 'Todos os links externos com UTM', 'sempre', null, null, '{"porque":"utm_campaign = frente_tema_data, minúsculas e underscores."}', 10),
('regra', 'Confirmar datas, preço, duração e local antes de publicar', 'confirmar', null, null, '{"porque":"Nenhuma peça sai com [datas], [preço] ou outros campos por preencher."}', 11),
('regra', 'Fotografias de pessoas só com autorização registada', 'confirmar', null, null, '{"porque":"RGPD. Registar a autorização no ativo correspondente."}', 12),
-- ---------- Canais ----------
('canal', 'Instagram', 'ativo', null, null, '{"canal":"Instagram","conta":"","link_bio":"","frequencia":"3 por semana (B2C)","horarios":"Quinta 10h teve o melhor alcance (5/11)","tom":"Cuidador, próximo e visual"}', 1),
('canal', 'Facebook', 'ativo', null, null, '{"canal":"Facebook","conta":"","frequencia":"2 por semana","horarios":"Segunda 10h (5/10) e terça ~17h30","tom":"Próximo; perguntas diretas funcionam (COTS 22/09: 170 de alcance)","notas":"Carrossel orgânico aparece em grelha: preferir imagem única."}', 2),
('canal', 'LinkedIn', 'ativo', null, null, '{"canal":"LinkedIn","conta":"","frequencia":"1–2 por semana","tom":"Sábio-Mentor, institucional, para decisores","notas":"Carrosséis como documento PDF."}', 3),
('canal', 'E-mail', 'ativo', null, null, '{"canal":"E-mail","conta":"Brevo · info@2siglas.com","frequencia":"Newsletter mensal + sequências de campanha","tom":"Direto e informativo"}', 4),
('canal', 'Website', 'ativo', null, null, '{"canal":"Website","conta":"www.2siglas.pt","notas":"Corrigir a página da APF (50 h vs 35 h) e criar páginas de curso com tabela-resumo."}', 5),
('canal', 'WhatsApp', 'ativo', null, null, '{"canal":"WhatsApp","conta":"912 852 135 (confirmar)","tom":"Direto, para Ricardo, Tiago e Cátia"}', 6),
-- ---------- Ativos ----------
('ativo', 'Guia de Marca v3 (09.09.2026)', 'aprovado', null, null, '{"categoria":"Documento","url":"","notas":"PDF no Notion (Brand Personality)."}', 1),
('ativo', 'Guia de Personas v3 (09.09.2026)', 'aprovado', null, null, '{"categoria":"Documento","url":""}', 2),
('ativo', 'Selo Entidade Formadora Certificada DGERT', 'aprovado', null, null, '{"categoria":"Selo","url":"","notas":"Usar o ficheiro oficial, sem recolorir."}', 3),
('ativo', 'Logótipo 2Siglas (colorido, branco, preto, símbolo)', 'aprovado', null, null, '{"categoria":"Logótipo","url":""}', 4),
('ativo', 'Template Canva · post institucional com foto tratada', 'aprovado', null, null, '{"categoria":"Template","url":"https://canva.link/sulr4y6b667l9fa"}', 5),
('ativo', 'Template Canva · agenda de curso', 'aprovado', null, null, '{"categoria":"Template","url":"https://canva.link/c8wzvcbkh65gk71"}', 6),
('ativo', 'Template Canva · informação/notícia', 'aprovado', null, null, '{"categoria":"Template","url":"https://canva.link/hesmkoxrfpxtle4"}', 7),
('ativo', 'Fotografia · turma COTS novembro 2026', 'por_autorizar', null, null, '{"categoria":"Fotografia","url":"","autorizacao":"pendente","notas":"Confirmar autorização de imagem de todos os formandos visíveis."}', 8)
) as v(tipo, titulo, estado, data, data_fim, dados, ordem);
