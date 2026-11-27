# Módulo de Marketing

Planeamento de conteúdos por marca: do banco de ideias à publicação, com estratégia, personas, guia de marca, recursos, aprovação e assistente de ideias com IA. As campanhas de email (Brevo) **não** estão nesta página: estão em Leads e no TransferGest (ver [Campanhas de email](#campanhas-de-email-brevo)).

- Rota: `/dashboard/marketing` → `src/pages/Marketing.jsx`
- Componentes: `src/components/marketing/` (todos com prefixo `mk-` no CSS, em `src/styles/marketing.css`)
- Vocabulário (etapas, canais, formatos…): `src/constants/marketing.js`
- Migrações: 052–063 (`supabase/migrations/`)
- Ver também: [../03-base-de-dados.md](../03-base-de-dados.md), [../04-seguranca.md](../04-seguranca.md), [../06-frontend-partilhado.md](../06-frontend-partilhado.md)

## Acesso e permissões

| Camada | Regra |
|---|---|
| Rota (`App.jsx`, `ProtectedRoute`) | `admin`, `administrador`, `gestor`, `marketing`, `marketing plus` |
| Sidebar | `admin`, `gestor`, `marketing`, `marketing plus` (não mostra a `administrador`, mas a rota deixa entrar) |
| RLS das tabelas `marketing_*` | **qualquer utilizador autenticado** pode ler e escrever (políticas `*_all_authenticated`, migrações 052/054/056/061). A restrição por papel é só na interface. |
| API de IA (`api/marketing/ideias.js`) | `admin`, `administrador`, `gestor`, `marketing`, `marketing plus` + quota diária de 60 pedidos por pessoa (`consumirQuota`, chave `ia_ideias_marketing`) |
| Aprovar um conteúdo | quem estiver em `aprovadores` recebe a notificação; a função não verifica se quem aprova está na lista |

## Tabelas

| Tabela | Conteúdo | Notas |
|---|---|---|
| `marketing_marcas` | marcas (`nome` único, `cor`, `logo_url`, `ativo`, `ordem`, `guia` jsonb) | apagar uma marca apaga em cascata tudo o que é dela |
| `marketing_conteudos` | ideias e peças | ver campos abaixo |
| `marketing_personas` | buyer personas por marca (`tipo` principal/complementar, listas de desafios, canais, gatilhos…) | |
| `marketing_ciclos` | ciclos de estratégia (`nome`, `inicio`, `dados` jsonb) | estrutura em `estrategiaModelo.js` |
| `marketing_recursos` | catálogo, turmas, campanhas, leads, métricas, ativos, factos, regras, canais (`tipo`) | campos fixos `titulo/estado/data/data_fim`; o resto em `dados` (ver `recursosModelo.js`) |
| `notificacoes_projetos` | notificações do sino (ver [comunicacao-e-dashboard.md](comunicacao-e-dashboard.md)) | `conteudo_id` liga ao conteúdo (migração 063) |

Campos importantes de `marketing_conteudos`:

- `estado`: `ideia` → `briefing` → `curadoria` → `criacao` → `revisao` → `aprovacao` → `alteracoes` → `programacao` → `publicado`; e `arquivado`. `estado_antes_arquivo` guarda a etapa para "Restaurar".
- `ordem` (número real): posição dentro da coluna. Ao largar entre dois cartões usa-se a média das ordens; novos itens recebem `Date.now()/1000` (vão para o fim).
- Datas — ver [Calendário](#calendário-editorial).
- `responsavel_ids` (uuid[]) — substitui o antigo `responsavel_id` (o código ainda lê o antigo se o novo estiver vazio).
- `persona_ids`, `oferta_ids` (uuid[]), `campanha` (texto livre, ligado por nome aos recursos do tipo campanha), `frente` (nome de uma frente da estratégia).
- `copies` (lista de textos), `links`, `anexos` (jsonb `[{ nome, url, caminho, tipo, tamanho, categoria }]`), `metricas` (jsonb).
- Aprovação: `aprovadores` (uuid[]), `enviado_aprovacao_por/_em`, `aprovado_por/_em`, `alteracoes` (texto do pedido), `historico_aprovacao` (jsonb, lista de `{ tipo: enviado|aprovado|alteracoes, por, em, para?, texto? }`).

## Marcas

- A marca escolhida fica em `localStorage["bizin-mk-marca"]`. Só aparecem marcas com `ativo = true`; se a guardada já não existir, usa a primeira.
- Ao mudar de marca, `Marketing.jsx` carrega conteúdos, personas, ciclos e recursos dessa marca. Para as contagens das outras marcas há uma consulta leve (`marca_id, estado` de todos os conteúdos).
- `MarcasModal.jsx`: criar/editar/ocultar/eliminar. O logo vai para o balde público `avatars` (só PNG/JPEG/WebP até 2 MB; SVG recusado). A paleta sugerida é extraída do logo (`mkColor.extrairCores`).
- Eliminar uma marca: FK `on delete cascade` apaga conteúdos, personas, ciclos e recursos. Os ficheiros no Storage ficam órfãos.

## Estratégia

`Estrategia.jsx` + `estrategiaModelo.js`. Cada ciclo (ex.: trimestre) tem um "Guia de Estratégia de Marca" em secções: Objetivos e KPIs, Pesquisa de mercado, Pesquisa de analytics, Curadoria de referência, Posicionamento, Storytelling por persona, Funil e jornada, Análise de dados (com marcos/pontos de controlo).

- Cada objetivo tem uma **frente** (nome curto). `frentesDoCiclo()` junta as frentes de todos os ciclos; aparecem como opções no campo Frente dos conteúdos e nos recursos.
- Os **marcos** (`dados.analise.marcos` com `data`) aparecem no calendário editorial.
- Ciclos podem ser duplicados (`dadosDuplicados` copia a estrutura e limpa resultados). Há um gerador de links UTM.

## Personas

`Personas.jsx` (lista + ficha lateral). Importa o CSV "Buyer Personas" exportado do Notion (`mkCsv.personasDoCsv`, aceita `;` ou `,`, aspas e BOM). Eliminar uma persona retira-a de `persona_ids` dos conteúdos (feito no browser, conteúdo a conteúdo).

## Recursos

`Recursos.jsx` + `recursosModelo.js`. Um só quadro para tudo o que os conteúdos referem:

| tipo | Uso |
|---|---|
| `oferta` (Catálogo) | cursos/serviços com preços, duração… (a IA usa estes valores) |
| `turma` | edições com datas, ligadas a uma oferta por nome (`dados.oferta`) |
| `campanha` | campanhas com metas; ligadas aos conteúdos por **nome** (`marketing_conteudos.campanha`) |
| `lead` | contactos/conversões, com `dados.campanha` |
| `metrica` | métricas por canal/período |
| `ativo` | ativos digitais (páginas, formulários…) |
| `facto` | factos verificados / `a_confirmar` (contagem no separador) |
| `regra` | regras de comunicação `nunca` / `sempre` / `confirmar` (aparecem no GuiaPeek e na IA) |
| `canal` | canais da marca |

Renomear uma campanha ou um curso propaga o novo nome às peças/leads/turmas **no browser** (`patchRecurso` em `Marketing.jsx`), não por trigger. Placeholders `[…]` no texto de uma peça (ex.: `[confirmar: preço]`) são detetados por `placeholdersDe()` e mostrados como alerta no cartão a partir da etapa Criação.

## Guia de marca

`MarcaGuia.jsx` grava em `marketing_marcas.guia` (jsonb): `sobre`, `personalidade` (arquétipos), `e_nao_e`, `voz` (`usamos`, `evitamos`), `visual` (cores, tipos de letra Google Fonts), `ficheiros`. O painel do conteúdo assinala termos da lista `voz.evitamos` (`termosEvitados`) e tem o botão "Guia" (`GuiaPeek.jsx`) para consultar o guia enquanto se escreve.

## Fluxo (quadro) e drawer do conteúdo

- Colunas = `ETAPAS` (sem `ideia` nem `arquivado`). Filtros comuns ao Fluxo/Calendário/Ideias/Arquivo: pesquisa (título, hook, hashtags, formato, campanha; sem acentos), responsável ("Os meus" = `__eu__`), canal e campanha.
- Drag-and-drop entre colunas muda `estado` e `ordem`. **Exceção:** largar na coluna Aprovação não muda o estado — abre a peça na secção Aprovação para escolher aprovadores.
- Indicadores no topo: em curso, para aprovar, publicações nos próximos 7 dias, publicados este mês, **com entrega atrasada** (etapas antes de agendar com `data_entrega` no passado).
- `ConteudoDrawer.jsx` (secções Planeamento, Criativo, Copy, Design, Notas, Aprovação, Resultados): selects/chips/datas gravam logo; textos gravam no blur; ao fechar grava o que ficou pendente. Estado, aprovação e datas de publicação são lidos sempre do item (podem mudar no quadro/calendário com o painel aberto).
- Anexos (`Anexos.jsx`) e ficheiros do guia vão para o balde `documents`, pasta `marketing/<marca>/…`, com URL **pública** (ver riscos).
- Ligação direta: `/dashboard/marketing?conteudo=<id>` muda para a marca certa e abre a peça (usado pelas notificações).

## Calendário editorial

`CalendarioEditorial.jsx`. Cada conteúdo pode aparecer em três dias:

| Tipo | Campo | Formato | Aspeto |
|---|---|---|---|
| Entrega (copy + design prontos) | `data_entrega` | `date` (`AAAA-MM-DD`) | etiqueta "Entrega"; **ATRASADA** se a peça ainda está numa etapa antes de agendar e a data passou; "já entregue" se já passou dessas etapas |
| 1.ª publicação | `data_publicacao` | `timestamptz` | etiqueta "1.ª", hora e sigla do 1.º canal |
| 2.ª publicação (repost, lembrete) | `data_publicacao_2` | `timestamptz` | etiqueta "2.ª" |

- A legenda funciona como filtro (mostrar/esconder cada tipo; pelo menos um fica ativo). Ideias e arquivados não mostram entrega.
- Arrastar um item muda **só** o campo daquele tipo; nas publicações mantém a hora original (nova data sem hora → 10:00).
- Lista lateral "Sem data": conteúdos sem `data_publicacao` (exceto ideias); arrastar para um dia define a 1.ª publicação.
- O "+" num dia cria um conteúdo novo em Briefing com `data_publicacao` nesse dia às 10:00.
- Marcos dos ciclos de estratégia aparecem como bandeiras.
- Cálculo de dias (`mkUtils.diasAte`) em hora local.

## Banco de ideias e arquivo

- Ideias: `estado = 'ideia'`, ordenadas por `created_at` (ou pela data da 1.ª publicação, opção "Ordenar"). "Para o fluxo" passa para a etapa inicial (`briefing`).
  - O cartão mostra a **data da 1.ª publicação** (`data_publicacao`, definida na ficha) com "hoje", "amanhã", "em N dias" ou "passou".
  - Filtro pela data da 1.ª publicação: Todas, Sem data, Esta semana (seg–dom), Este mês, Próximo mês e Intervalo (de/até). Soma-se aos filtros comuns. Lógica em `ideiaPassaData()` (`Marketing.jsx`).
- Arquivo: `estado = 'arquivado'`; "Restaurar" volta a `estado_antes_arquivo` (ou `ideia`).

## Aprovação

`mkAprovacao.js` (lógica) + secção Aprovação do drawer + `AprovacaoModal.jsx` (aberto pelo sino do Dashboard).

```
(qualquer etapa) --enviarParaAprovacao(aprovadores)--> aprovacao
aprovacao --aprovar--> programacao        (notifica equipa: mk_aprovado)
aprovacao --pedirAlteracoes(texto)--> alteracoes  (notifica equipa: mk_alteracoes)
```

- Enviar: grava `aprovadores`, `enviado_aprovacao_*`, limpa `aprovado_*`, acrescenta ao histórico e cria uma notificação `mk_aprovacao` para cada aprovador (`link` = `/dashboard/marketing?conteudo=<id>`).
- Basta **uma** decisão. Antes de decidir relê o estado; se já não estiver em `aprovacao`, fecha o pedido do próprio e dá erro. A notificação do aprovador fica lida quando decide.
- "Equipa de marketing" = perfis ativos com `role` em `marketing` / `marketing plus` (sem quem decidiu).
- O Dashboard esconde (e marca como lidos) pedidos `mk_aprovacao` cujo conteúdo já saiu de `aprovacao`.

## Importação CSV (Notion)

`ImportarFluxo.jsx` + `mkCsvFluxo.js`: importa o export CSV do "Fluxo de Conteúdos" ou do "Banco de Ideias" do Notion para a marca atual.

- Exige a coluna "Tema/Assunto" (ou "Headline/Hook"). Datas no formato do Notion ("12 de agosto de 2026 14:15 (GMT+1)") são convertidas por `dataPt`.
- Personas e responsáveis são ligados por nome (persona: `papel` ou `nome_persona`; perfil: nome completo ou primeiro nome).
- Duplicados = título igual (sem acentos/maiúsculas) a um conteúdo existente; por omissão não são importados ("importar mesmo assim"). Opção para não importar arquivados.
- Inserção em blocos de 50 (`importarConteudos`).

## Assistente de ideias com IA

Cliente: `AssistenteIdeias.jsx`. Servidor: `api/marketing/ideias.js` (Vercel, Node, `maxDuration` 300 s).

1. O browser envia `POST /api/marketing/ideias` com `Authorization: Bearer <access_token>` e `{ marcaId, historico, mensagem, pesquisaWeb }`.
2. O servidor valida a sessão, o papel e a quota; monta o contexto da marca (guia, personas, estratégia ativa, catálogo/turmas/factos/regras dos recursos, conteúdos e ideias existentes com avaliação) e chama o Claude com a ferramenta `propor_ideias` (e opcionalmente pesquisa web, desligável com `MARKETING_IA_WEB_SEARCH=off`).
3. Resposta em Server-Sent Events: `text`, `pesquisa`, `estado`, `ideias`, `erro`, `fim` (com as mensagens novas para o histórico e o custo estimado em USD).
4. Cada ideia vira um cartão; "Guardar" cria linhas em `marketing_conteudos` com `estado = 'ideia'` (`ideiaParaConteudo`). Na mensagem seguinte o Claude é avisado do que foi guardado.

A conversa vive num `Map` em memória por marca (perde-se ao recarregar a página). Variáveis de ambiente: ver comentário no topo de `api/marketing/ideias.js` (nomes apenas; nunca copiar valores para a documentação).

## Campanhas de email (Brevo)

Não há envio de email a partir de `Marketing.jsx`. Os envios em massa existem em:

| Página | Serviço no browser | Endpoint | Papéis | Perfil Brevo |
|---|---|---|---|---|
| Leads (`/dashboard/leads`, `GestaoLeads.jsx`) | `src/services/marketingSender.js` | `POST /api/notificacoes/marketing` | `PAPEIS.marketing` (admin, administrador, gestor, marketing, marketing plus) | `marketing` (`BREVO_*`) |
| TransferGest | `src/services/transfergestSender.js` | `POST /api/notificacoes/transfergest` | `PAPEIS.gestao` | `transfergest` (`TRANSFERGEST_BREVO_*`, com recurso às `BREVO_*`) |

- Ambos chamam `sendTransactionalCampaign` (`server/brevoCampaignSender.js`), que usa a API **transacional** do Brevo (`/v3/smtp/email`) em lotes (por omissão 75, com pausa e novas tentativas). Máximo 2000 destinatários por pedido; regista `campanha_<perfil>` no `audit_log`.
- **Templates** = IDs numéricos de templates do Brevo (criados no painel do Brevo). Antes de enviar verifica-se que o template existe e está ativo. Com parâmetros por destinatário (`recipientParamsByEmail`: `nome`, `FIRSTNAME`…) envia um email por pessoa. Alternativa: assunto + HTML manual.
- `src/components/GestaoTemplates.jsx` (rota `/dashboard/modelos`) **não** tem nada a ver com email: são modelos de projeto.

## Riscos e pontos a rever

- RLS aberta a todos os autenticados nas tabelas `marketing_*`; a restrição de papel é só na rota.
- Anexos e ficheiros do guia usam `getPublicUrl` no balde `documents` (público desde a migração 013; a 069 tornou privado o balde `documentos`, não este). Quem tiver o link abre sem sessão.
- Aprovação: a leitura do estado e o `update` não são atómicos — duas decisões em simultâneo podem passar ambas.
- O "+" da coluna Aprovação cria uma peça já em `aprovacao` sem aprovadores (o cartão mostra "Sem aprovador").
- "Para o fluxo" no Banco de Ideias mostra o aviso "Passou para o fluxo (Curadoria)", mas a etapa inicial é `briefing`.
- Envio Brevo em modo HTML (ou template sem parâmetros por destinatário) manda **um email por lote com todos os endereços em `to`** — os destinatários veem-se uns aos outros.
