# Clientes e área comercial

Entidades (clientes, consultoras, organismos), leads, propostas comerciais (financiamento e
formação) com geração de PDF, programas de financiamento e a parte de formação (cursos e
ações de formação).

Ver também: [base de dados](../03-base-de-dados.md),
[frontend partilhado](../06-frontend-partilhado.md) e
[projetos e tarefas](projetos-e-tarefas.md) (os projetos pertencem a entidades).

## Ficheiros

| Ficheiro | Rota | Acesso (rota) |
|---|---|---|
| `src/pages/Clientes.jsx` | `/dashboard/clientes` | qualquer utilizador com sessão |
| `src/pages/GestaoLeads.jsx` | `/dashboard/leads` | admin, administrador, gestor, marketing |
| `src/pages/ListaPropostas.jsx` | `/dashboard/propostas` | admin, administrador |
| `src/pages/PropostasComerciais.jsx` | `/dashboard/propostas/novo`, `/dashboard/propostas/:id` | admin, administrador |
| `src/pages/PropostasFinanciamento.jsx` | (aberto por PropostasComerciais) | — |
| `src/pages/PropostasFormacao.jsx` | (aberto por PropostasComerciais) | — |
| `src/pages/Cursos.jsx` | `/dashboard/cursos` | qualquer utilizador com sessão |
| `src/pages/AcoesFormacao.jsx` | `/dashboard/acoes-formacao` | qualquer utilizador com sessão |
| `src/components/pdfProposalGenerator.jsx` | — | PDF proposta de financiamento |
| `src/components/pdfFormacaoGenerator.jsx` | — | PDF proposta de formação |
| `api/nif.js` + `api/_lib/nif.js` | `GET /api/nif?q=` | consulta nif.pt (exige sessão) |
| `api/sicae-caes.js` + `server/sicaeCaeLookup.js` | `GET /api/sicae-caes?nif=` | CAE no SICAE (sem sessão) |
| `api/cae-descriptions.js` + `server/caeCatalog.js` | `GET /api/cae-descriptions?codes=` | designações CAE rev. 4 (sem sessão) |
| `supabase/functions/fetch-caes-sicae` | edge function | alternativa ao `/api/sicae-caes` |

Os programas de financiamento e os avisos são geridos em `/dashboard/avisos`
(`src/pages/GestaoAvisos.jsx`, documentado em
[comunicação e dashboard](comunicacao-e-dashboard.md)).

## Entidades (`Clientes.jsx`)

Uma **entidade** é uma linha de `clientes`. A mesma tabela guarda vários papéis, ligados por
flags (separador "Funções"):

| Flag | Significado | Efeito |
|---|---|---|
| — | Cliente | Pode ser cliente/parceiro de projetos |
| `eh_empresa_consultora` | Empresa do grupo que emite propostas | Aparece como consultora nas propostas; ativa o separador "Configurações" |
| `eh_organismo` | Entidade financiadora / organismo (ex.: CCDR) | Aparece como organismo nos projetos e como entidade financiadora de programas |
| `tem_cursos` | Disponibiliza formação | As suas propostas são de **formação** |

Colunas principais: `nif` (único, 9 dígitos — migração 003), `marca` (nome comercial),
`sigla` (usada nos números das propostas), `entidade` (denominação legal), `avatar_url`
(bucket `avatars`), `objeto_social`, `website`, `plano`, `certidao_permanente` +
`validade_certidao`, `rcbe` + `validade_rcbe`, `termos_gerais`, `ativo` (desativar em vez de
apagar).

Tabelas filhas:
- `contactos_cliente`: `nome_contacto`, `cargo`, `email`, `telefone`, `faz_propostas`
  (só estes contactos aparecem nas propostas, migração 026).
- `moradas_cliente`: `morada`, `codigo_postal`, `localidade`, `concelho`, `distrito`, `regiao`.
- `caes_cliente`: `codigo`, `descricao`, `principal`; único por `(cliente_id, codigo)` (016).
- `acessos_cliente` + `tipos_acessos`: credenciais de portais do cliente. A palavra-passe
  está no **cofre** (Supabase Vault, migrações 072/073): a lista não a traz; "mostrar/copiar"
  chama `cofre_revelar` e fica registado quem viu. Ver `src/utils/cofre.js`.
- `entidade_configuracoes` (033/034): 1 linha por consultora com os textos e a assinatura
  usados nos PDFs (carta, "como podemos ajudar", processo de trabalho, plano de pagamento,
  exclusões, nota de honorários, textos de formação, imagem de certificações).

### Preenchimento automático pelo NIF
Ao escrever 9 dígitos no NIF (`handleNifChange`):
1. procura outra entidade com o mesmo NIF → se existir, avisa e pára;
2. CAE no SICAE: `/api/sicae-caes` (scraping de sicae.pt); fora de localhost, se falhar,
   tenta a edge function `fetch-caes-sicae`;
3. dados da empresa no nif.pt via `/api/nif` (o servidor tem a chave `NIFPT_KEY`; limite
   diário de créditos do nif.pt);
4. preenche nome, sigla (iniciais do nome), contactos, morada e CAE. Os CAE e a morada ficam
   **pendentes** e só são gravados depois de gravar a entidade
   (`persistPendingAutoCaes`, `persistPendingAutoMorada`, sem duplicar).

Falhas de um serviço só dão aviso. Códigos postais e concelhos são completados pela GeoAPI
pública (`json.geoapi.pt`) diretamente do browser. As designações dos CAE vêm do CSV
`src/data/CAE rev4.xlsx - Table 1.csv`.

## Leads (`GestaoLeads.jsx`)

Dois separadores, duas tabelas:
- **Prospects** (`marketing_prospects`): contactos frios, vista em grelha.
- **Leads** (`marketing_leads`): o **CRM** (`components/crm/`, migração 083).

Estados das leads: `novo` → `contactado` → `reuniao` → `proposta` → `convertido` (etiqueta
"Ganho") | `perdido`.

### CRM das Leads (`components/crm/CrmLeads.jsx`, `FichaLead.jsx`, `crm.js`, `styles/crm.css`)
- **Indicadores**: funil em aberto (soma do valor das leads em aberto), previsão ponderada
  (valor × probabilidade; sem probabilidade própria usa a da etapa: 10/25/50/70/100/0 %),
  ganhas este mês, taxa de fecho dos últimos 90 dias (ganhas ÷ ganhas+perdidas), ações para
  hoje/em atraso e esquecidas. Os dois últimos são clicáveis (filtram).
- **Responsáveis**: qualquer pessoa ativa da equipa (`profiles.ativo`).
- **Filtros**: todas / as minhas / ações hoje / esquecidas, setor e responsável; mais a
  pesquisa da página (empresa, pessoa, email, NIF), localidade, CAE e arquivo.
- **Funil**: colunas por etapa com total em € por coluna; arrastar muda a etapa (com
  Desfazer). Passar a **Perdido** pede o motivo (`motivo_perda`). Cartões ordenados pela
  próxima ação. **Lista**: a mesma informação em tabela. A escolha fica no browser.
- **Por tratar**: em Novo e sem responsável (ex.: acabadas de importar por CSV). É a fila de
  trabalho: não conta como esquecida nem mostra "Sem próximo passo"; tem um filtro próprio.
- **Esquecida**: lead já trabalhada (com responsável ou fora de Novo), em aberto, sem
  movimento há 7+ dias (`DIAS_ESQUECIDA` em `crm.js`).
  Movimento = o mais recente de `ultimo_contacto_em`, `estado_desde` e `created_at`.
- **Ficha** (painel lateral, abre também por `/dashboard/leads?lead=<id>`): etapa, valor,
  probabilidade, responsável, próxima ação (texto + data, atalhos Hoje/Amanhã/…), contactos
  (links `mailto:`/`tel:`), notas e **histórico** (`marketing_leads_interacoes`: chamada,
  email, reunião, proposta, nota). As mudanças de etapa entram sozinhas no histórico
  (trigger). Chamadas/emails/reuniões/propostas atualizam `ultimo_contacto_em`; notas não.
  Tudo grava ao sair do campo; se a BD recusar, o ecrã volta ao valor anterior.
- **Origem** (`origem`, 085): de onde veio a lead (lista `ORIGENS` em `crm.js`; aceita outras).
  Posta sozinha: "Importação CSV" (importar no separador Leads) e "Prospeção" (promover prospect).
  Se a 085 não tiver corrido, as inserções tentam de novo sem a origem (`inserirLeads`).
- **Resultados** (3.ª vista, `ResultadosCrm.jsx`): por período (data de criação da lead), tabelas
  por origem e por pessoa (leads, em aberto, ganhas, perdidas, taxa de fecho, valor ganho, valor em
  aberto), funil atual e motivos de perda. Respeita os filtros de setor e responsável.
- **Propostas**: a ficha lista as propostas (`propostas_comerciais`) da entidade ligada
  (`marketing_leads.cliente_id`, 085). "Criar proposta" (só admin/administrador, como a rota):
  `garantirEntidade()` usa a entidade ligada, ou a de igual NIF, ou cria uma nova em `clientes`;
  grava `cliente_id` e abre `/dashboard/propostas/novo?cliente=<id>`. Os formulários de proposta
  (`PropostasFinanciamento`, `PropostasFormacao`) escolhem esse cliente sozinhos.
  "Tornar cliente" não cria outra entidade se a lead já estiver ligada a uma.
- **Pessoas** (`PessoasLead.jsx`, 086): o contacto principal continua nos campos da lead
  (`titular`, `email`, `contacto`: são os que as campanhas, a exportação e a pesquisa usam);
  as outras pessoas ficam em `marketing_leads_pessoas` (nome, cargo, papel decisor/financeiro/
  técnico/outro, email, telefone). "Tornar principal" troca a pessoa com os campos da lead.
- **Registo rápido de chamadas** (`RegistoChamada.jsx`): tocar num telefone na ficha guarda a
  chamada (`iniciarChamada`, localStorage, válida 3 h). Ao voltar à app (separador visível /
  janela com foco, 4 s depois) abre "Como correu a chamada?": Atendeu / Não atendeu / Caixa de
  correio / Número errado, nota e próximo passo (Não atendeu sugere "Voltar a ligar" amanhã).
  Grava uma interação `chamada`; "Atendeu" numa lead em Novo passa-a para Contactado. A ficha
  aberta recarrega o histórico pelo evento `crm-historico`.
- **Marcar reunião** (ficha, bloco Próxima ação): dia, hora e assunto. Cria o evento na tabela
  `agenda` (o Calendário da barra lateral) de quem marca e tenta também no do responsável; se a
  regra da tabela não deixar, avisa-o no sino (`crm_reuniao`). Regista "reunião" no histórico
  (conta como contacto), põe a reunião como próxima ação (com lembrete) e passa a lead para
  Reunião se estava em Novo/Contactado.
- **Lembretes**: ao abrir o Início, `gerarLembretesLeads()` cria uma notificação
  (`crm_lembrete`) por cada lead do utilizador com a próxima ação para hoje ou em atraso,
  uma vez por data (`lembrete_enviado_para`). Atribuir uma lead a outra pessoa avisa-a
  (`crm_atribuida`). Ambas abrem a ficha da lead.

Fluxo:
1. **Promover a Lead**: copia o prospect para `marketing_leads` (`estado = novo`) e desativa
   o prospect (`ativo = false`).
2. **Tornar Cliente** (lead convertida): cria em `clientes` (`marca`, `entidade`, `nif`) e
   arquiva a lead (`ativo = false`, `estado = convertido`). Falha se o NIF já existir.

Aspeto: cabeçalho comum (`PageHero`) com os separadores Leads/Prospects, pesquisa, localidade,
CAE, Arquivo, copiar emails e CSV; janelas comuns (`Janela`) para criar/editar, importar e campanha;
confirmações com `confirmar()`. Prospects: cartões de setores → empresas do setor em cartões ou
tabela. Criar uma lead abre logo a sua ficha no CRM. Estilos `.ld-*` em `styles/crm.css`.

Outras funções: filtros por setor/localidade/CAE, importação CSV (separador `;`, 1.ª linha é
cabeçalho, NIF já existentes na tabela são ignorados), exportação CSV, copiar emails e
**campanhas de email** (Brevo) enviadas pelo servidor de marketing
(`src/services/marketingSender.js`, em lotes com repetição).

## Propostas comerciais

### Fluxo geral
1. `/dashboard/propostas/novo` → `PropostasComerciais.jsx` pede a **empresa consultora**
   (clientes ativos com `eh_empresa_consultora`).
2. Consultora com `tem_cursos` → `PropostasFormacao`; senão → `PropostasFinanciamento`.
   Ao reabrir (`/dashboard/propostas/:id`) decide pelo `payload.tipo_proposta` (só as de
   formação o gravam; as de financiamento seguem a regra da consultora).
3. O formulário é um assistente por passos; "Guardar" grava em `propostas_comerciais`;
   "Gerar PDF" grava primeiro (em silêncio) e depois gera o PDF no browser.
4. Na lista (`ListaPropostas.jsx`) muda-se o estado, duplica-se, edita-se ou apaga-se.

### Tabela `propostas_comerciais` (migrações 020, 021, 022, 027)
- `numero_proposta` (bigint, sequência automática — interno) e
  **`numero_proposta_str`** (o número visível, único).
- `empresa_consultora_id`, `cliente_id` (→ `clientes`), `contato_cliente_id`,
  `tipo_projeto_id` (primeiro tipo escolhido), `programa_id`, `sigla_empresa`.
- `estado`, `plano_pagamentos` (jsonb), `payload` (jsonb), `created_by`, datas.
- `tarefa_id` é legado (a proposta já foi ligada a uma tarefa; hoje é opcional).
- **`payload` guarda o formulário inteiro** (`recolherDados()`): é o que se usa para reabrir a
  proposta e para gerar o PDF. As colunas soltas servem para listar/filtrar.

Estados (027): `em_preparacao` (omissão) → `revisao` → `enviada` → `analise` → `ganha` |
`perdida`. Estados antigos são convertidos ao ler: `em_analise` → `analise`,
`aprovada` → `ganha`, `arquivada` → `perdida`. A mudança de estado é livre (qualquer
estado para qualquer estado) e não tem efeitos secundários (não cria projeto).

### Numeração
Formato **`SIGLA-ANO-NNN`** (ex.: `NEO-2026-007`), com a sigla da consultora (ou "PRO").
- Calculado **no browser** ao gravar uma proposta nova: procura o maior
  `numero_proposta_str` que começa por `SIGLA-ANO-` e soma 1. Antes de gravar o ecrã mostra
  uma pré-visualização (não reserva o número).
- Duplicar na lista usa outra regra: **contagem** das propostas desse prefixo + 1.
- Uma proposta gravada mantém o número.

### Proposta de financiamento (`PropostasFinanciamento.jsx`)
Passos: 1 Identificação (consultora, estado) · 2 Cliente (dados e contacto com
`faz_propostas`) · 3 Tipos de projeto (serviços; reordenáveis por arrastar) ·
4 Programa/aviso · um passo por tipo de projeto (etapas do modelo `template_atividades/_tarefas`
e honorários) · Revisão de descrições · Orçamento e fecho · Revisão final.

Honorários por tipo de projeto (`modo_honorario`):
- `fixo`: `num_horas × base_eur_hora` (valores por omissão de `tipos_projeto.default_num_horas`
  e `default_base_eur_hora`, migração 028; base 50 €/h se não houver);
- `variavel`: Σ `valor_base × percentagem / 100` por linha (cada linha com descrição, n.º de parcelas e frequência);
- `ambos`: soma dos dois.

Também: plano de pagamentos, notas/exclusões, condições gerais (texto `termos_gerais`
da consultora) e os textos de `entidade_configuracoes`.

### Proposta de formação (`PropostasFormacao.jsx`)
Passos: Empresa Consultora · Cliente · Cursos · Condições · Revisão. Os cursos vêm da tabela
`cursos`; os textos das condições são pré-preenchidos a partir dos cursos e da configuração da
consultora. Grava `propostas_comerciais` (sem tipo de projeto nem programa,
`payload.tipo_proposta = "formacao"`) e **`proposta_cursos`** (034: `curso_id`,
`duracao_horas`, `modulos_customizados`, `ordem`), apagadas e reinseridas a cada gravação.

### Geração de PDF
Tudo no browser com `jspdf` + `jspdf-autotable`; o ficheiro é descarregado, **não é guardado**
em lado nenhum (para o refazer, reabre-se a proposta e gera-se de novo a partir do `payload`).

| Gerador | Ficheiro gerado | Secções |
|---|---|---|
| `pdfProposalGenerator.jsx` | `Proposta-<numero>.pdf` | capa, carta de apresentação, serviços/etapas, programa/aviso e fases, orçamento, plano de pagamentos, exclusões, condições, assinatura |
| `pdfFormacaoGenerator.jsx` | `Proposta-Formacao-<numero>.pdf` | capa, âmbito, informações gerais/condições, um bloco por curso (módulos e horas), condições finais |
| `pdfGenerator.jsx` | `Relatorio_Projeto_<titulo>.pdf` | relatório de um projeto (ver projetos-e-tarefas) |

O logotipo (e, na formação, as cores) é escolhido pelo **nome** da consultora: contém
"factortriplo", "2siglas"/"2 siglas", "geoflicks", senão `neomarca`. As imagens estão em
`/public`. Uma consultora nova precisa de um logotipo lá e de uma regra em `getLogoPath`.

## Programas de financiamento e avisos

- `programas_financiamento` (020, 022, 031, 032): `codigo` (único), `nome`, `aviso` (texto),
  `avisos_ids` (ligação aos avisos), `pct`, `tipo_incentivo`, `investimento_minimo`, `regiao`,
  prazos, `descricao`, `objetivos`, `area_geografica`, `acoes_elegiveis`,
  `condicoes_especificas`, `entidade_financiadora_id` (→ `clientes`), `ativo`.
- `avisos`: `codigo` (único), `nome`, `descricao`, `fases` (jsonb `[{ nome, prazo }]`), `ativo`.
- Usados nos projetos (`programa_id`, `aviso_id`, fases → `prazos_fases`) e nas propostas de
  financiamento (só programas `ativo = true`).
- Leitura só com sessão (070).

### Ligação ao BizInControl
O **BizInControl** é outra aplicação, que lê dados desta base com a chave pública (sem
sessão). Desde a 070 a tabela `programas_financiamento` deixou de ser legível sem sessão,
por isso a migração **078** criou a função:

```sql
public.bizin_programas_financiamento() returns table (nome text)
-- security definer, grant execute a anon e authenticated
```

Devolve **só o nome** de todos os programas (ativos e inativos), por ordem alfabética.
O BizInControl deve chamá-la por RPC (ex.: `supabase.rpc("bizin_programas_financiamento")`); o código do BizInControl não está neste repositório.
Regras:
- qualquer pessoa com a chave pública (que está no site) consegue chamá-la — só acrescentar
  colunas que possam ser públicas, uma a uma, editando a função;
- colunas novas da tabela **não** ficam públicas automaticamente;
- existe outra função usada pelo BizInControl, `bizin_projetos_por_cliente_nif`, que não está
  no repositório (a 070 tirou-lhe o acesso anónimo).

## Formação

### Cursos (`Cursos.jsx`, tabela `cursos`, migrações 032/035/072)
Catálogo para as propostas de formação: `nome`, `descricao`, `duracao_horas`, `valor`,
textos (`texto_enquadramento`, `objetivos_pedagogicos`, `metodologia`, `honorarios_texto`,
`plano_pagamento`, `consideracoes`), `modulos` (jsonb, cada módulo com nome e horas),
`ativo`, `criado_por`.
RLS: todos com sessão leem e criam; **só o criador edita e apaga**.

### Ações de formação (`AcoesFormacao.jsx`, migração 040)
Registo das turmas realizadas (separadores: Formações, Checklist, CCDR, DGADR,
Estatísticas, definições de áreas e homologações).
- `acoes_formacao`: `ano`, `sequencia`, **`codigo`** gerado na BD
  (`'C' || yy || lpad(sequencia, 2)`, ex.: `C2603`), curso, formador, área
  (`areas_formacao`), carga horária, local, datas, `regime` (Online/Hibrido/Presencial),
  homologação (`homologacoes_formacao`: N/A, CCDR, IPDJ, DGADR), `status_curso`
  (Adiado/Em Andamento/Concluído/Cancelado), inscritos, certificados,
  `volume_formacao` (gerado = certificados × carga horária), pagamentos ao formador,
  `status_dtp` e os blocos de campos `ccdr_*` e `dgadr_*`.
- A sequência é por ano: ao criar lê o maior `sequencia` do ano e soma 1 (`unique(ano, sequencia)`).
- **Checklist** (`acoes_formacao_checklist`): as colunas são a árvore do modelo do tipo de
  projeto chamado exatamente **"Formação Profissional"** (`template_atividades` > tarefas >
  subtarefas). Cada clique roda o estado `na` → `em_falta` → `incompleto` → `falta_assinar`
  → `concluido`. Ao criar uma ação é criado o checklist inicial (tudo `na`).
- RLS: qualquer utilizador com sessão lê e escreve.

## Quem pode o quê (resumo)

| Área | Ver | Criar/editar | Notas |
|---|---|---|---|
| Entidades | todos com sessão | todos com sessão | Acessos: todos veem; palavras-passe via cofre (fica registado) |
| Leads | admin, administrador, gestor, marketing (rota) | idem | RLS das tabelas marketing_* noutro módulo |
| Propostas | admin, administrador (rota) | idem | RLS (020): cada pessoa só vê/edita as que criou |
| Programas/avisos | todos com sessão | todos com sessão | Função pública só com o nome (078) |
| Cursos | todos com sessão | criar: todos; editar/apagar: só o criador | |
| Ações de formação | todos com sessão | todos com sessão | |
| `entidade_configuracoes` | todos com sessão | criar: todos; editar/apagar: criador ou `is_admin` | |

As regras RLS de `clientes`, `contactos_cliente`, `moradas_cliente`, `caes_cliente` e
`acessos_cliente` (além do cofre) não estão nas migrações; confirmar no Supabase.

## Armadilhas e riscos conhecidos

- **Números de proposta podem colidir**: são calculados no browser (maior + 1), sem reserva,
  e a RLS da 020 só deixa cada pessoa ver as suas propostas — duas pessoas com a mesma
  consultora no mesmo ano calculam o mesmo número; o índice único rejeita a segunda gravação
  ("Erro ao guardar proposta"). Além disso a ordenação é por texto, por isso passado o `999`
  (`...-1000` < `...-999`) o cálculo volta a dar números repetidos.
- **Duplicar** usa contagem + 1 (diferente do maior + 1): com propostas apagadas repete
  números. Na formação não copia `proposta_cursos`.
- **Lista de propostas por utilizador**: com a RLS do repositório, um administrador só vê
  as propostas que ele próprio criou.
- **Cursos de outra pessoa**: editar/apagar não dá erro mas não muda nada (RLS devolve 0
  linhas) e a página mostra "sucesso".
- **Checklist das ações de formação** usa a coluna `template_atividade_id` em
  `acoes_formacao_checklist`, que não está na migração 040 (alterada fora do repositório);
  e depende do nome exato do tipo de projeto "Formação Profissional".
- `/api/sicae-caes` depende do HTML do sicae.pt (scraping); se mudar, corrigir
  `server/sicaeCaeLookup.js` e a edge function.
- O logotipo do PDF depende do nome da consultora (texto), não de um campo.
- `GestaoLeads.updateStatus` atualiza o ecrã antes da BD e ignora erros.
