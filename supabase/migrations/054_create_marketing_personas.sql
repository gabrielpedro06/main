-- =====================================================================
-- MARKETING: buyer personas por marca (como a base "Buyer Personas" do Notion)
-- e ligação dos conteúdos às personas (persona_ids)
-- =====================================================================

create table if not exists public.marketing_personas (
    id uuid primary key default gen_random_uuid(),
    marca_id uuid not null references public.marketing_marcas(id) on delete cascade,
    papel text not null default '',            -- Notion: "Nome" (ex.: Empregador/Empresário)
    nome_persona text not null default '',     -- Notion: "Nome Persona" (ex.: João)
    faixa_etaria text,
    genero text,
    localizacao text[] not null default '{}',
    ocupacao text,
    rendimento text,
    canais text[] not null default '{}',
    comportamento text[] not null default '{}',
    desafios text[] not null default '{}',
    necessidades text[] not null default '{}',
    objetivos text[] not null default '{}',
    solucoes text[] not null default '{}',
    frase text,
    ordem integer not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_marketing_personas_marca
    on public.marketing_personas (marca_id, ordem);

drop trigger if exists trg_marketing_personas_updated_at on public.marketing_personas;
create trigger trg_marketing_personas_updated_at
before update on public.marketing_personas
for each row execute function public.set_updated_at_generic();

alter table public.marketing_personas enable row level security;

drop policy if exists marketing_personas_all_authenticated on public.marketing_personas;
create policy marketing_personas_all_authenticated
on public.marketing_personas for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

-- Conteúdo → personas a que se dirige
alter table public.marketing_conteudos
    add column if not exists persona_ids uuid[] not null default '{}';

-- ---------------------------------------------------------------------
-- Personas da 2Siglas (export do Notion). Só entram se a marca ainda não tiver personas.
-- ---------------------------------------------------------------------
insert into public.marketing_personas
    (marca_id, ordem, papel, nome_persona, faixa_etaria, genero, localizacao, ocupacao, rendimento,
     canais, comportamento, desafios, necessidades, objetivos, solucoes, frase)
select m.id, v.ordem, v.papel, v.nome_persona, v.faixa_etaria, v.genero, v.localizacao, v.ocupacao, v.rendimento,
       v.canais, v.comportamento, v.desafios, v.necessidades, v.objetivos, v.solucoes, v.frase
from public.marketing_marcas m
cross join (values
    (1, 'Empregador/Empresário', 'João', '40-58 anos', 'Masculino', array['Faro'],
     'Sócio/Proprietário de Pequena/Média Empresa', '3.000 € – 6.000 €',
     array['E-mail','Facebook','Instagram','LinkedIn','Website'],
     array['Compra pelo site','Compra por telemóvel'],
     array['Experiências teóricas demais','Falta de tempo','Investimento reduzido','Receio de investir sem retorno'],
     array['Cumprir obrigações','Gerir equipas','Melhorar o desempenho dos profissionais'],
     array['Aumentar a produtividade da equipa','Estimular o crescimento do negócio','Investir tempo e dinheiro em formações que tenham utilidade prática'],
     array['Consultoria','Formação online','Formação prática e relevante','Formação à medida','Formações obrigatórias'],
     'Preciso de soluções adequadas às necessidades do meu negócio'),
    (2, 'Gestor/Influenciador', 'Ana', '35-50 anos', 'Feminino', array['Algarve','Faro','Lisboa'],
     'Gestor/Responsável por RH/Formação de médias e grandes empresas', '1.500 € – 3.000 €',
     array['E-mail','Facebook','Instagram','LinkedIn','Website'],
     array['Acompanha notícias do setor','Analisa os cursos nos canais de comunicação','Compra pelo site','Compra por email','Fideliza parcerias','Planea formações'],
     array['Administrar recursos em formações genéricas','Falta de certificações','Falta de tempo','Gestão de entidades diferentes'],
     array['Cumprir obrigações','Melhorar o desempenho dos profissionais','Planear formações','Simplificar a gestão da formação'],
     array['Aumentar a produtividade da equipa','Cuidar do bem-estar e segurança dos profissionais','Estimular o desenvolvimento profissional','Incentivar a integração da equipa'],
     array['Formação prática e relevante','Formação à medida','Formações Presenciais','Formações certificadas','Formações obrigatórias'],
     'Quero contar com um parceiro fiável, que conhece a realidade da empresa'),
    (3, 'Encarregado Agrícola', 'Ricardo', '35-55 anos', 'Masculino', array['Algarve'],
     'Encarregado/Coordenador de Produção', 'Até 1.500 €',
     array['Facebook','Website','WhatsApp'],
     array['Compra pelo site','Compra por telemóvel'],
     array['Comportamento de risco','Erros repetitivos','Falhas na organização','Falta de segurança','Falta de tempo'],
     array['Cumprir obrigações','Melhorar o desempenho dos profissionais'],
     array['Desenvolver habilidades e competências específicas do negócio','Gerir profissionais','Resolver falhas operacionais'],
     array['Formação à medida','Formações em Agricultura','Formações em Saúde e Segurança','Formações obrigatórias'],
     'Preciso de soluções práticas e eficientes para melhorar a produtividade'),
    (4, 'Condutor', 'Tiago', '25-55 anos', 'Masculino', array['Algarve','Faro'],
     'Condutor/Operador de trator e máquinas agrícolas', 'Até 1.500 €',
     array['Facebook','Instagram','Website','WhatsApp'],
     array['Compra pelo site','Compra por telemóvel'],
     array['Comportamento de risco','Falta de certificações','Falta de tempo','Investimento reduzido'],
     array['Cumprir obrigações','Formações em Saúde e Segurança'],
     array['Cuidar do bem-estar e segurança dos profissionais','Desenvolver habilidades e competências específicas do negócio'],
     array['Formações Presenciais','Formações certificadas','Formações em Agricultura','Formações obrigatórias'],
     'Sem o COTS não posso levar o trator à estrada — preciso da formação e do certificado.'),
    (5, 'Profissional Autónomo', 'Cátia', '28-50 anos', 'Feminino', array['Algarve','Faro'],
     'Trabalhadora independente / prestadora de serviços (jardinagem, apicultura, comércio, cuidados, desporto)', 'Até 1.500 €',
     array['Facebook','Instagram','Website','WhatsApp'],
     array['Analisa os cursos nos canais de comunicação','Compra pelo site','Compra por telemóvel'],
     array['Falta de certificações','Falta de tempo','Investimento reduzido','Receio de investir sem retorno'],
     array['Cumprir obrigações','Desenvolver pessoas','Melhorar o desempenho dos profissionais'],
     array['Desenvolver habilidades e competências específicas do negócio','Estimular o desenvolvimento profissional','Investir tempo e dinheiro em formações que tenham utilidade prática'],
     array['Formação online','Formação prática e relevante','Formações certificadas','Formações em Saúde e Segurança'],
     'Cada certificado que junto é um cliente novo que consigo aceitar.'),
    (6, 'Treinador', 'Marta', '25-45 anos', 'Feminino', array['Algarve','Faro','Lisboa'],
     'Treinadora de desporto em clube, ginásio ou escola', 'Até 1.500 €',
     array['E-mail','Instagram','Website','WhatsApp'],
     array['Analisa os cursos nos canais de comunicação','Compra pelo site','Compra por telemóvel'],
     array['Experiências teóricas demais','Falta de certificações','Falta de tempo','Investimento reduzido'],
     array['Cumprir obrigações','Desenvolver habilidades e competências específicas','Evoluir profissionalmente'],
     array['Desenvolver habilidades e competências específicas do negócio','Estimular o desenvolvimento profissional','Incentivar a integração da equipa'],
     array['Formação online','Formação prática e relevante','Formações Presenciais','Formações certificadas'],
     'Quero revalidar a cédula de treinador sem parar os treinos.'),
    (7, 'Formador', 'Hélder', '30-55 anos', 'Masculino', array['Algarve','Faro','Lisboa'],
     'Formador/a certificado ou candidato ao CCP (Certificado de Competências Pedagógicas)', '1.500 € – 3.000 €',
     array['E-mail','Instagram','LinkedIn','Website'],
     array['Acompanha notícias do setor','Analisa os cursos nos canais de comunicação','Compra pelo site','Compra por email'],
     array['Experiências teóricas demais','Falta de certificações','Falta de tempo'],
     array['Cumprir obrigações','Desenvolver pessoas','Evoluir profissionalmente'],
     array['Desenvolver habilidades e competências específicas do negócio','Estimular o desenvolvimento profissional','Investir tempo e dinheiro em formações que tenham utilidade prática'],
     array['Formação online','Formação prática e relevante','Formações Presenciais','Formações certificadas'],
     'Domino a minha área — falta-me o CCP para poder formar.'),
    (8, 'Encarregado de SST', 'Nuno', '30-55 anos', 'Masculino', array['Algarve','Faro'],
     'Representante do empregador para a SST / Encarregado de Segurança e Higiene do Trabalho', '1.500 € – 3.000 €',
     array['E-mail','Facebook','LinkedIn','Website','WhatsApp'],
     array['Acompanha notícias do setor','Compra pelo site','Compra por email'],
     array['Erros repetitivos','Falta de certificações','Falta de segurança','Falta de tempo'],
     array['Cumprir obrigações','Formações em Saúde e Segurança','Gerir equipas'],
     array['Cuidar do bem-estar e segurança dos profissionais','Desenvolver habilidades e competências específicas do negócio','Resolver falhas operacionais'],
     array['Consultoria','Formações certificadas','Formações em Saúde e Segurança','Formações obrigatórias'],
     'Se acontecer um acidente, a responsabilidade passa por mim — quero estar preparado.')
) as v(ordem, papel, nome_persona, faixa_etaria, genero, localizacao, ocupacao, rendimento,
       canais, comportamento, desafios, necessidades, objetivos, solucoes, frase)
where lower(m.nome) = '2siglas'
  and not exists (select 1 from public.marketing_personas p where p.marca_id = m.id);
