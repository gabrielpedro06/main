# 03 · Base de dados (Supabase / Postgres)

> Documento de referência da base de dados do Bizin Manager: tabelas, funções, triggers,
> tarefas agendadas, segredos do Vault, baldes de ficheiros e histórico de migrações.
> A parte de autorização (RLS, MFA, auditoria, alertas) está aprofundada em
> [04-seguranca.md](04-seguranca.md). Arquitetura geral em [01-arquitetura.md](01-arquitetura.md),
> variáveis de ambiente e deploy em [02-setup-e-deploy.md](02-setup-e-deploy.md),
> endpoints em [05-api-e-servidor.md](05-api-e-servidor.md).

---

## 0. Antes de começar: o que está (e o que NÃO está) no repositório

* **O esquema base não está versionado.** `supabase/migrations/001_initial_schema.sql` tem 2 bytes
  (vazio). As tabelas mais antigas — `profiles`, `clientes`, `projetos`, `atividades`, `tarefas`,
  `subtarefas`, `task_logs`, `assiduidade`, `ferias`, `template_*`, `tipos_projeto`, `forum_*`,
  `chat_reactions`, `equipamentos`, `acessos`, `acessos_cliente`, `agenda`, `formacoes`, etc. — foram
  criadas à mão no painel do Supabase. As migrações só acrescentam colunas/regras a essas tabelas.
* Também há **políticas RLS e funções criadas à mão** que não aparecem em nenhum ficheiro
  (ex.: política `"Ver toda a equipa"` em `profiles`, `"Apenas admins podem inserir/editar ativos"`
  em `equipamentos`, funções `handle_new_user`, `bizin_projetos_por_cliente_nif`,
  `get_tabelas_externas`, `get_colunas_externas`). A 070 refere-as pelo nome.
* **Fonte de verdade = a base de dados de produção.** Para ter o DDL completo:
  `supabase db dump --schema public > esquema.sql` (Supabase CLI com o projeto ligado) ou
  *Database → Schema Visualizer* no painel. Vale a pena fazer isto e guardar o resultado fora do repo
  antes de qualquer alteração estrutural grande.
* As migrações foram **corridas à mão no SQL Editor**, por ordem numérica, e já estão todas aplicadas
  em produção. Não há `supabase db push` no fluxo; o `supabase/config.toml` só configura a Edge Function.

Convenções que se repetem:

| Convenção | Significado |
|---|---|
| `created_at` / `updated_at` | Tabelas "inglesas" (maioria). `updated_at` mantido pelo trigger `set_updated_at_generic()`. |
| `criado_em` / `atualizado_em` | Tabelas mais recentes (`vacation_balances`, `profiles_privado`…). |
| `criado_por` / `created_by` | `default auth.uid()` — quem criou a linha (usado em RLS "por criador"). |
| `estado text` + `check (...)` | Máquinas de estados simples, sem tipos enum (exceto `profiles.role`, que é o enum `user_role`). |
| `dados jsonb` / `payload jsonb` | Campos flexíveis (marketing, propostas). A estrutura vive no frontend. |
| "staff" | Papéis `admin`, `administrador`, `gestor` (função `bizin_e_staff()`). |

Papéis (`profiles.role`, com `profiles.tipo` como alternativa antiga): `admin`, `administrador`,
`gestor`, `colaborador`, `marketing`, `marketing plus`, e nalgumas regras `rh` / `recursos humanos`.
Ver [04-seguranca.md § 1](04-seguranca.md#1-modelo-de-autorização).

---

## 1. Perfis, utilizadores e configurações

### `profiles` *(esquema base, fora do repo)*
Um registo por utilizador de `auth.users` (mesmo `id`). Criado pelo trigger `handle_new_user` (definido
à mão no painel) quando uma conta é convidada.

* Colunas conhecidas: `id`, `nome`, `nome_completo`, `email`, `email_pessoal` (a migração 012 que a
  criava está vazia — foi criada à mão), `role` (enum `user_role`), `tipo` (texto, legado),
  `ativo`, `avatar_url`, `funcao`, `empresa_interna`, `telemovel`, `data_nascimento`,
  `data_admissao`, `tipo_contrato`, `dias_ferias` (legado), `dias_ferias_total` (002, "limite anual",
  default 22), `recebe_sa` (007, default `true`), `estado_temporario_tipo/_inicio/_fim/_motivo` (039).
* As colunas sensíveis antigas (`nif`, `niss`, `ncc`, `validade_cc`, `morada`, `concelho`,
  `estado_civil`, `nacionalidade`, `sexo`, `nr_dependentes`, `valor_sa`) **continuam a existir mas
  estão vazias** desde a 073 — os dados estão em `profiles_privado`.
* Triggers:
  * `profiles_proteger` (068, BEFORE INSERT/UPDATE): só admin muda `role`, `tipo`, `ativo`; só
    admin/gestor mudam campos de RH (`valor_sa`, `recebe_sa`, `dias_ferias*`, `tipo_contrato`,
    `data_admissao`, `empresa_interna`, `funcao`, `estado_temporario_*`). Sem `auth.uid()`
    (service role / SQL Editor) passa tudo.
  * `profiles_criar_privado` (073, AFTER INSERT): cria a linha vazia em `profiles_privado`.
  * `trg_audit` (064): auditoria.
* RLS: leitura por todos os autenticados (política manual "Ver toda a equipa"); `profiles_update_proprio`
  (o próprio) e `profiles_update_rh` (staff) — 070.
* Quem usa: praticamente todas as páginas; `AuthContext.jsx` (papel e estado), `Perfil.jsx`,
  `RecursosHumanos.jsx`; servidor em `api/_lib/seguranca.js` (`autenticar`), `adminContas.js`,
  `adminMfa.js`, `alertasSeguranca.js`, `notificacoes.js`.

### `profiles_privado` (072)
Dados pessoais sensíveis, separados para que a leitura de `profiles` (que toda a equipa faz) não os exponha.

* PK/FK `id → profiles.id` (on delete cascade). Colunas: `nif`, `niss`, `ncc`, `validade_cc date`,
  `morada`, `concelho`, `estado_civil`, `nacionalidade`, `sexo`, `nr_dependentes int`,
  `valor_sa numeric`, `atualizado_em`.
* RLS: ler/criar/alterar = o próprio **ou** staff; sem política de DELETE; `mfa_obrigatorio`.
* Trigger `profiles_privado_proteger`: só staff define/altera `valor_sa`; atualiza `atualizado_em`.
* Função `bizin_cc_a_expirar(p_ate date)` devolve só `id, nome, validade_cc` (aviso de CC a expirar no
  Dashboard), para staff ou para quem tem `funcao` contendo "rh".
* Quem usa: `src/utils/dadosPrivados.js` (`juntarPrivados`, `separarPrivados`, `guardarPrivados`),
  `RecursosHumanos.jsx`, `api/_lib/notificacoes.js`, `DashboardHome.jsx` (RPC).

### `app_settings` (004)
Pares chave/valor globais. `setting_key text PK`, `setting_value text`. Semente:
`rh_km_reembolso_eur = 0.4` (valor por km nos pedidos de deslocação).
RLS (068): ler = autenticados; escrever = staff. Usado em `RecursosHumanos.jsx`.

### `rh_settings` (006)
Dia de pagamento do subsídio de alimentação por utilizador/mês: `user_id`, `ano`, `mes`,
`sa_payment_day`, `unique(user_id, ano, mes)`. RLS (068): ler = próprio ou staff; escrever = staff.

### `profile_empresas` *(fora do repo)*
Empresas internas associáveis aos perfis (lida em `RecursosHumanos.jsx`).

---

## 2. Recursos Humanos: ausências, férias, assiduidade

### `ferias` *(esquema base, fora do repo)* — pedidos de ausência
Apesar do nome, guarda **todas** as ausências: férias, doença, assistência à família, tolerâncias de
ponto (com `user_id = null` = para todos), pedidos de deslocação/km, etc.

* `id` é **numérico** (bigint) — ver 045, que corrigiu a função que o tratava como uuid.
* Colunas usadas: `user_id`, `tipo` (texto livre; férias = `"Férias"`), `estado`
  (`pendente`, `aprovado`, `rejeitado`, `cancelado`, `pedido_cancelamento`), `data_inicio`, `data_fim`,
  `is_parcial`, `hora_inicio`, `hora_fim`, `motivo`, anexo (caminho no balde `rh_anexos`),
  `km_origem`, `km_destino`, `km_total`, `km_ida_volta` (051).
* Triggers:
  * `ferias_proteger` (068, BEFORE): um colaborador só cria pedidos em seu nome e em `pendente`, não
    muda o dono, só pode pôr `pendente`/`cancelado`/`pedido_cancelamento`, e só cancela diretamente se
    ainda estava pendente. Staff e service role passam.
  * `sincronizar_saldo_ferias_apos_alteracao` (042, AFTER INSERT/UPDATE OF estado, datas, horas,
    is_parcial) → `sincronizar_saldo_ferias_por_pedido()`: recalcula `vacation_balances.dias_gozados`
    do ano antigo e do ano novo do pedido.
* RLS (070 + 074): ler = próprio, linhas sem `user_id` (tolerâncias) ou staff; criar = próprio ou
  staff; alterar = próprio ou staff (limitado pelo trigger); apagar = staff.
* Quem usa: `Ausencias.jsx`, `RecursosHumanos.jsx`, `AprovarPedido.jsx`, `utils/decisaoPedido.js`
  (aprovar/rejeitar com `update ... eq('estado', de)` para evitar corridas), `utils/feriasSaldo.js`,
  `CalendarioColaborador.jsx`, `WidgetCalendar.jsx`, `AdminVisaoGeral.jsx`, `api/_lib/notificacoes.js`
  (emails de pedidos).

### `vacation_balances` (040, 041, 076, 077b/c) — saldo anual de férias
Uma linha por `(user_id, ano)`.

| Coluna | Notas |
|---|---|
| `dias_atribuidos numeric(6,2)` | Default 22. No **ano de admissão** = "limite anual" do perfil (`dias_ferias_total`, depois `dias_ferias`, depois 22). Nos outros anos o SQL usa 22. |
| `dias_transitados` | Dias que vêm do ano anterior (= `dias_disponiveis` do ano anterior no momento do provisionamento). Nunca no ano de admissão (regra da app e da correção 077b). |
| `dias_gozados` | Recalculado por `calcular_dias_ferias_gozados` (SQL) ou escrito pela app (`sincronizarSaldoFeriasPerfil`). |
| `dias_disponiveis` | **Coluna gerada** (`stored`): `greatest(0, atribuidos + transitados - gozados)`. Não se escreve. |
| `transito_expira_em date` | Data-limite para gozar os transitados. O SQL grava `31/03` do próprio ano; a app grava `31/03` do ano seguinte (ver riscos). A app decide a validade com `getCarryoverDeadline(ano)` e não usa esta coluna. |

Funções:

* `calcular_dias_ferias_gozados(p_user_id, p_ano)` — SQL, `security definer`, `search_path=public`.
  Soma pedidos `estado='aprovado'` cujo `tipo` tem `fer`: dias úteis (seg–sex) dentro do ano, ou
  `(hora_fim - hora_inicio)/8` nos parciais. **Não desconta feriados nem tolerâncias** (a app desconta).
  Execução: só service role (068).
* `provisionar_saldos_ferias(p_ano)` — cria (ou atualiza) o saldo de `p_ano` para todos os perfis
  ativos. Em conflito: só atualiza `dias_transitados` se `p_ano` for o próximo ano, e recalcula sempre
  `dias_gozados`. Executável por `authenticated` e `service_role`.
  É chamada (a) pelo **pg_cron** `provisionar-saldos-ferias-ano-seguinte` (`0 0 1 12 *`, 00:00 UTC de
  1 de dezembro, para o ano seguinte) e (b) pela página `RecursosHumanos.jsx` sempre que é aberta em
  dezembro (rede de segurança caso o cron não exista).
* `aprovar_pedido_ferias_por_email(p_pedido_id bigint)` (043/045) — aprovação atómica antiga pelos links
  dos emails. **Já não é usada**: `api/absence-notifications/action.js` agora só redireciona para a
  página `AprovarPedido` (login + 2FA). Só service role a pode executar.

RLS: o próprio lê o seu; leitura de todos para `admin/administrador/rh/recursos humanos` (040);
inserir/atualizar para staff + `rh` (076). **Gestor não tem política de leitura** (ver riscos).
Quem usa: `src/utils/feriasSaldo.js` (leitura e `upsert`), RPC em `RecursosHumanos.jsx`.

Correções de dados pontuais (não voltar a correr sem perceber): 077 (só mostra), 077b (zera
transitados inventados), 077c (ano de admissão = limite anual).

### `assiduidade` *(fora do repo)* — registo de ponto
`user_id`, `data_registo`, `hora_entrada`, `hora_saida`, `ultima_pausa_inicio`,
`tempo_pausa_acumulado`, `tarefas_planeadas`, `observacoes`.
RLS (070): todos leem; cada um escreve as suas linhas; staff escreve tudo.
Quem usa: `WidgetAssiduidade.jsx`, `CalendarioColaborador.jsx`, `DashboardHome.jsx`,
`AdminDashboard.jsx`, `RecursosHumanos.jsx`, `utils/attendanceGuard.js`.

### `formacoes` *(fora do repo)*
Formações frequentadas pelos colaboradores (separador de RH, `RecursosHumanos.jsx`). Não confundir com
`acoes_formacao` (cursos que a empresa organiza, § 5).

### `medalhas` e `medalhas_colaboradores` (067)
Medalhas de eventos internos.
* `medalhas`: `nome` (1–120), `data`, `descricao` (≤ 500), `imagem_path` (no balde `medalhas`),
  `imagem_url`, `criado_por`. Trigger `medalhas_touch_updated_at`.
* `medalhas_colaboradores`: PK `(medalha_id, user_id)`, `atribuida_por`.
* `pode_gerir_medalhas()` (definer): papel em `admin/administrador/gestor`.
* RLS: todos os autenticados leem; só quem `pode_gerir_medalhas()` escreve.
* Quem usa: `components/medalhas/MedalhasRH.jsx`, `useMedalhas.js` (perfil e avatares online).

---

## 3. Projetos, tarefas e cronómetros

### Estrutura (esquema base, fora do repo)
```
tipos_projeto ─┬─ template_atividades ─ template_tarefas ─ template_subtarefas   (modelos)
               │
clientes ── projetos ── atividades ── tarefas ── subtarefas                       (instâncias)
                  │                      └─ task_logs (tempo/cronómetros)
                  ├─ projeto_entidades (entidades parceiras: papel, investimento, incentivo)
                  ├─ pedidos_reembolso
                  ├─ projetos_estado_historico
                  └─ notificacoes_projetos
```

* `tipos_projeto` (id **bigint**): `nome`, `eh_formacao`, `tem_programa` (022),
  `default_num_horas`, `default_base_eur_hora` (028). Gerido em `GestaoTemplates.jsx`.
* `template_atividades` / `template_tarefas` / `template_subtarefas`: modelos de cada tipo.
  `info_adicional jsonb` (008: ex. `{"exige": true, "campos": ["investimento", ...]}`) e dependências
  `depende_de_template_atividade_id` / `depende_de_template_tarefa_id` (010).
* `projetos`: `titulo`, `codigo_projeto`, `estado`, `cliente_id`, `responsavel_id`, datas,
  `organismo_contacto_id` (030), `programa_id → programas_financiamento`, `aviso_id → avisos`,
  `prazos_fases jsonb` (036). A restrição `data_inicio <= data_fim` foi criada (048) e removida (049).
* `atividades` e `tarefas`: `estado` (inclui `em_analise`, `concluido`), dependências
  `depende_de_atividade_id` / `depende_de_tarefa_id` + `ignorar_dependencia` (010/011), campos de
  "em análise" `analise_destino` (`proprio|colega|cliente|contabilista|organismo`),
  `analise_data_prevista`, `analise_data_envio`, `analise_data_retorno`, `analise_destino_user_id`,
  `analise_alerta_pendente`, `analise_destino_contacto_id` (017–019, com índices parciais
  `where estado = 'em_analise'`).
  `tarefas` tem ainda `investimento`, `financiamento`, `incentivo`, `data_prevista_aprovacao` (008),
  `template_tarefa_id` (009), `numero_seq bigint` único (020, sequência `tarefas_numero_seq_seq`),
  `data_conclusao`.
* `task_logs`: registos de tempo (`user_id`, tarefa/atividade, `start_time`, `end_time`,
  `duration_minutes`…). Cronómetro ativo = linha sem `end_time` (ver `utils/taskTimerLifecycle.js`,
  `utils/activeTimerResolver.js`). RLS (070): todos leem; cada um escreve os seus; staff tudo.
* Quem usa: `Projetos.jsx`, `ProjetoDetalhe.jsx`, `Tarefas.jsx`, `MinhasTarefas.jsx`, `Atividades.jsx`,
  `DashboardHome.jsx`, `AdminDashboard.jsx`, `StopTimerNoteModal.jsx`, `WidgetAssiduidade.jsx`,
  `utils/activityStatusCascade.js`.

### `projetos_estado_historico` (065, 066)
"Seguimento tipo encomenda" do projeto. `projeto_id`, `tipo` (`projeto|atividade|tarefa`), `item_id`,
`item_titulo`, `atividade_titulo`, `estado_anterior`, `estado_novo`, `user_id`, `nota`
(`data_aproximada` nas linhas reconstruídas), `created_at`.
* Escrita **só por triggers** (definer): `trg_projetos_estado_hist` (projetos, insert + update de
  estado), `trg_atividades_estado_hist`, `trg_tarefas_estado_hist`. Erros nunca bloqueiam a operação.
* RLS: lê quem consegue ver o projeto (`exists (select 1 from projetos ...)`); sem políticas de escrita.
* As migrações reconstruíram o histórico a partir de `audit_log` e de `tarefas.data_conclusao`.
* Quem usa: `components/ProjetoTracker.jsx`.

### `pedidos_reembolso` (046, 047)
Pedidos de pagamento de projetos financiados: `projeto_id`, `pedido`, `data_pedido`,
`valor_investimento`, `valor_incentivo`, `valor_pago` (todos ≥ 0), `data_pagamento`, `notas`.
RLS: todos os autenticados leem/criam/editam; só staff apaga (070). Usado em `ProjetoDetalhe.jsx`, `Projetos.jsx`.

### `notificacoes_projetos` (038, 063, 075) — sino do Dashboard
Apesar do nome, é a tabela genérica de notificações: `user_id` (destinatário), `project_id`,
`conteudo_id → marketing_conteudos` (063), `created_by`, `tipo` (`project_created`, `seguranca`, …),
`titulo`, `mensagem`, `link`, `is_read`, `read_at`.
RLS: cada um lê/atualiza/apaga as suas; **qualquer autenticado insere para qualquer pessoa**.
Excluída da auditoria. Quem usa: `utils/dashboardNotifications.js`, `DashboardHome.jsx`, `Projetos.jsx`,
`marketing/mkAprovacao.js`, e a função `seguranca_criar_alerta` (alertas para admins).

### `agenda` *(fora do repo)*
Eventos do calendário do Dashboard (`WidgetCalendar.jsx`: `titulo`, `hora`, …).

---

## 4. Clientes, comercial e propostas

### `clientes` *(esquema base)*
Empresas clientes, consultoras e organismos. Colunas adicionadas por migrações: `nif` (003: só 9
dígitos, `unique` parcial `clientes_nif_unique_idx`), `avatar_url` (005), `eh_empresa_consultora` (022),
`termos_gerais` (029), `tem_cursos` (032). Também: `sigla`, `marca`, `ativo`, `eh_organismo`.
Tabelas filhas (fora do repo): `contactos_cliente` (`nome_contacto`, `cargo`, `email`,
`faz_propostas` (026)), `moradas_cliente`, `caes_cliente` (`codigo`, `principal`; `unique(cliente_id, codigo)` 016),
`acessos_cliente` (credenciais de portais do cliente — palavra-passe no Vault, ver § 9), `tipos_acessos`.
Quem usa: `Clientes.jsx` (inclui CAE via Edge Function `fetch-caes-sicae` e `/api/sicae-caes`),
propostas, projetos, `utils/pdfProposalGenerator.jsx`.

### `entidade_configuracoes` (033, 034)
Textos reutilizáveis por entidade/consultora para gerar propostas (`unique(cliente_id)`): blocos de
propostas de financiamento (`texto_compromisso`, `texto_apresentacao_empresa`, `texto_documentos_*`,
`texto_plano_pagamento`, `texto_exclusoes`, `texto_nota_honorarios`, signatário…) e de formação
(`texto_areas_formacao`, `texto_obrigacoes_*`, `imagem_certificacoes`…).
RLS: autenticados leem e criam; alterar/apagar = criador ou staff (070).
Quem usa: `Clientes.jsx`, `PropostasFinanciamento.jsx`, `PropostasFormacao.jsx`.

### `programas_financiamento` (020, 022, 023, 031, 032)
Catálogo de programas (PRR, Compete, SICE…): `codigo` único, `nome`, `aviso`, `pct` (0–100),
`tipo_incentivo`, `investimento_minimo`, `regiao`, `descricao`, `ativo`, `aviso_id → avisos`,
`objetivos`, `area_geografica`, `acoes_elegiveis`, `condicoes_especificas` (031),
`entidade_financiadora_id → clientes` (032). Os prazos passaram para `avisos.fases` (023).
RLS: ler = autenticados (070); escrever = autenticados. Leitura pública controlada só pela função
`bizin_programas_financiamento()` (078, nomes apenas, para o BizInControl).
Quem usa: `GestaoAvisos.jsx`, `GestaoTemplates.jsx`, `Projetos.jsx`, `ProjetoDetalhe.jsx`, `PropostasFinanciamento.jsx`.

### `avisos` (022, 023)
Avisos de abertura de candidaturas: `codigo` único, `nome`, `descricao`, `ativo`, `fases jsonb`
(prazos por fase). RLS: ler = autenticados (070); escrever = autenticados.
(Não confundir com "avisos" no sentido de notificações.)

### `propostas_comerciais` (020, 021, 022, 027)
Propostas de financiamento e de formação.
* `numero_proposta bigint` (sequência própria `propostas_comerciais_numero_seq_seq`, 021),
  `numero_proposta_str` único (ex.: `SIGLA-2026-…`), `estado`
  (`em_preparacao` → `revisao` → `enviada` → `analise` → `ganha`/`perdida`, 027), `programa_id`,
  `tarefa_id` (opcional), `empresa_consultora_id`, `cliente_id`, `contato_cliente_id text`,
  `tipo_projeto_id bigint`, `sigla_empresa`, `plano_pagamentos jsonb`, `payload jsonb`,
  `html_gerado`, `created_by`.
* RLS no repo: cada um só vê/edita as suas (`created_by = auth.uid()`). A app de admin
  (`AdminVisaoGeral.jsx`, `ListaPropostas.jsx`) lê de todos → **deve existir política manual** não versionada.

### `cursos` (032, 035) e `proposta_cursos` (034)
* `cursos`: catálogo global de cursos (`nome`, `duracao_horas`, textos, `modulos jsonb`, `valor`,
  `consideracoes`, `criado_por`). RLS: ler = autenticados (072); editar/apagar = criador.
* `proposta_cursos`: M:N proposta ↔ curso (`unique(proposta_id, curso_id)`, `duracao_horas` e
  `modulos_customizados` sobrepõem o curso, `ordem`). RLS: tudo para autenticados.
* Quem usa: `Cursos.jsx`, `PropostasFormacao.jsx`.

### `transfergest_registos` (024, 025)
Base de empresas de transporte (dados de terceiros, TransferGest) para prospeção: `denominacao`,
contactos, morada/NUTs, `numero_contribuinte` (único parcial), `estado`
(`novo|contactado|reuniao|cancelado|proposta|ganho|perdido`), `estado_historico jsonb`,
`interesse_email_marketing`, `ultimo_contacto_em`.
RLS (070): só staff. Quem usa: `TransferGest.jsx`.

### `marketing_leads`, `marketing_prospects` *(fora do repo)*
Leads e prospects (`GestaoLeads.jsx`, `AdminVisaoGeral.jsx`). Consideradas "sensíveis" pelos alertas
de leitura volumosa.

---

## 5. Formação (ações de formação organizadas pela empresa) — 040_create_acoes_formacao

* `areas_formacao`: `nome` único, `ativo`.
* `homologacoes_formacao`: `codigo` em (`N/A`, `CCDR`, `IPDJ`, `DGADR`), semeada na migração.
* `acoes_formacao`: `ano`, `sequencia`, `codigo` **gerado** `'C' || yy || nn` (ex.: `C2603`),
  `nome_curso`, `nome_formador`, `area_formacao_id`, `homologacao_id`, `carga_horaria`, `regime`
  (`Online|Hibrido|Presencial`), `status_curso` (`Adiado|Em Andamento|Concluído|Cancelado`),
  contagens de inscritos/certificados, `volume_formacao` **gerado** (`n_certificados × carga_horaria`),
  e blocos de campos por entidade homologadora (`ccdr_*`, `dgadr_*`). `unique(ano, sequencia)`.
* `acoes_formacao_checklist`: estado de cada tarefa/subtarefa de um modelo de projeto para uma ação
  (`concluido|falta_assinar|incompleto|em_falta|na`).
* RLS: tudo para autenticados. Quem usa: `AcoesFormacao.jsx`.

---

## 6. Marketing (052–063)

| Tabela | Propósito | Colunas-chave |
|---|---|---|
| `marketing_marcas` | Marcas (2Siglas, Geoflicks, TransferGest…) | `nome` (único, case-insensitive), `cor`, `ordem`, `logo_url` (053; ficheiro em `avatars/marcas/`), `guia jsonb` (055: sobre, voz, visual, ficheiros) |
| `marketing_conteudos` | Ideias e peças do fluxo (uma linha percorre todo o fluxo) | `marca_id`, `estado` (063: `ideia, briefing, curadoria, criacao, revisao, aprovacao, alteracoes, programacao, publicado, arquivado`), `estado_antes_arquivo`, `ordem`, `responsavel_id` + `responsavel_ids uuid[]`, `formato/objetivo/estrategia/editoria/pilar text[]` (057), `canais[]`, `persona_ids uuid[]` (054), `frente` (056), `copies jsonb`, `anexos jsonb` (ficheiros no balde `documents`), `metricas jsonb`, `url_publicacao`, `utm_campaign`, `oferta_ids[]` (061), `aprovadores uuid[]`, `historico_aprovacao jsonb`, `enviado_aprovacao_por/_em` (063) |
| `marketing_personas` | Buyer personas por marca | `papel`, `nome_persona`, arrays de dores/objetivos…, `tipo`, `gatilhos[]`, `como_abordar`, `mensagem_chave` (055) |
| `marketing_ciclos` | Estratégia por período | `nome`, `inicio`, `fim`, `dados jsonb` (9 secções: objetivos, mercado, …, analise) |
| `marketing_recursos` | Bases de apoio por marca | `tipo` (`oferta, turma, campanha, lead, metrica, ativo, facto, regra, canal`), `titulo`, `estado`, `data`, `data_fim`, `dados jsonb` |

* RLS: **todas** "for all to authenticated" — o acesso à aba é controlado só pela app
  (papéis `marketing`, `marketing plus`, staff).
* Migrações 058, 059, 060, 062 são **sementes de dados** (export do Notion da 2Siglas); idempotentes.
* Quem usa: `Marketing.jsx`, `components/marketing/*` (`AprovacaoModal.jsx`, `mkAprovacao.js` cria
  notificações em `notificacoes_projetos`), `api/marketing/ideias.js` (assistente de IA).

---

## 7. Fórum (Comunicação Interna) e chat

* `forum_posts`, `forum_comments`, `forum_reactions` *(fora do repo)*. `forum_comments.parent_id`
  (050, respostas em fio; tipo detetado dinamicamente, uuid ou bigint).
* `forum_comment_likes` (050): PK `(comment_id, user_id)`; ler = autenticados, inserir/apagar = o próprio.
* `forum_reactions`, `chat_reactions`: leitura só com sessão (070).
* Chat (013–015, 068):
  * `chat_rooms`: `nome`, `is_group`, `criado_por` (068). Ler = participantes; criar = autenticados.
  * `chat_participants`: PK `(room_id, user_id)`. Ler = o próprio ou membros da sala
    (`chat_user_in_room`, definer com `row_security = off` para evitar recursão — 014). Inserir =
    `chat_pode_adicionar(room, user)`: quem já participa, quem criou a sala, ou o próprio em **grupos**.
  * `chat_messages`: `content` ou `file_url`/`file_name` (check), `requires_sig`, `is_signed`.
    Ler = membros; inserir = membro e `sender_id = auth.uid()`. Excluída da auditoria.
  * `chat_room_reads`: "lido até" por utilizador/sala (`last_read_at`), trigger `updated_at`.
  * Ficheiros novos no balde privado `chat_ficheiros/<room_id>/…`; os antigos estavam em
    `documents/chat-files/` (script `scripts/migrar-ficheiros-chat.mjs` move-os).
* Quem usa: `Forum.jsx` (página com o chat em modal), `Sidebar.jsx` (contadores de não lidas).

---

## 8. Ativos TI

* `equipamentos` *(base fora do repo)* + colunas `entidade`, `fornecedor`, `fatura`,
  `data_aquisicao`, `data_garantia`, `prazo_garantia` (039). RLS com políticas manuais
  ("Apenas admins podem inserir/editar ativos"); a 070 removeu as genéricas.
* `software` (039): `id bigserial`, `codigo` único, `nome`, `tipo`, `versao`, `licenca_chave`,
  `estado` (`ativo|licenca_expirada|arquivado`), datas. RLS: tudo para autenticados.
* `acessos` *(fora do repo)*: credenciais de TI; palavra-passe no Vault (`segredo_id`, § 9).
* Quem usa: `AtivosTIDashboard.jsx` (acesso na app: `admin/administrador/gestor/marketing plus`,
  igual a `bizin_pode_acessos_ti()`).
* `supabase/migrations/modulo_ativos_ti.sql` é um **rascunho de modelo** (tabelas `ativo_equipamento`,
  `licenca`, `instalacao`, `site`, `credencial`, `acesso_log`, vistas `vw_conformidade_licenca`,
  `vw_rotacao_pendente`). **Não foi aplicado** (nenhum código usa estas tabelas; o `create table software`
  colidiria com a 039; não tem RLS). Não correr.

---

## 9. Cofre de credenciais (072, 072b, 073)

* `acessos_cliente.segredo_id` e `acessos.segredo_id` apontam para `vault.secrets`. As colunas antigas
  `acessos_cliente.codigo` e `acessos.password` estão vazias (073) e são opcionais (072b).
* Funções (todas definer):
  * `cofre_guardar(p_tabela, p_id, p_valor)` — app; valor vazio apaga o segredo.
  * `cofre_revelar(p_tabela, p_id)` — app; devolve a palavra-passe e grava `audit_log`
    `acao='credencial_revelada'`.
  * `cofre_verificar` (interna): exige `aal2`; para `acessos` exige `bizin_pode_acessos_ti()`.
  * `cofre_gravar_interno` (interna, `search_path = public, vault`): `vault.create_secret` /
    `update_secret` / `delete`.
  * Trigger `cofre_apagar_segredo` (AFTER DELETE em `acessos` e `acessos_cliente`) apaga o segredo.
  * `cofre_sincronizar_coluna` e `profiles_sincronizar_privado` existiram só na transição (removidos na 073).
* Frontend: `src/utils/cofre.js`. Detalhe em [04-seguranca.md § 5](04-seguranca.md#5-cofre-de-credenciais).

---

## 10. Auditoria e segurança (resumo)

| Tabela | Propósito |
|---|---|
| `audit_log` (064, 075) | Uma linha por INSERT/UPDATE/DELETE em qualquer tabela de `public` + eventos (`operacao='EVENTO'`, `acao`). Colunas: `user_id`, `user_email`, `tabela`, `operacao`, `acao`, `registo_id`, `campos_alterados[]`, `dados_antes`, `dados_depois`, `detalhes`, `transacao` (txid). Só admins leem. |
| `tentativas_login` (075) | Logins/2FA falhados reportados pelo servidor. |
| `alertas_seguranca` (075) | Alertas (tipo, gravidade, chave de deduplicação, email enviado, visto). |
| `logs_supabase_api` / `logs_supabase_auth` (075) | Cópia resumida dos logs do Supabase (recolha a cada 10 min). |
| `seguranca_estado` (075) | Estado da recolha (`chave='recolha_logs'`: janela, último erro/sucesso). |

Tudo descrito em [04-seguranca.md](04-seguranca.md).

---

## 11. Funções SQL / RPC

Legenda: **D** = `security definer`; **SP** = tem `set search_path`. "Exec." = quem tem `EXECUTE` após 068/070
(o Supabase dá `EXECUTE` a `anon` e `authenticated` por omissão; desde a 068 há
`alter default privileges ... revoke execute on functions from anon, public`, mas **`authenticated`
continua a receber EXECUTE por omissão** em funções novas).

| Função | D | SP | Exec. | Para quê | Chamada por |
|---|---|---|---|---|---|
| `bizin_papel()` | ✔ | ✔ | authenticated | Papel do utilizador (`lower(role or tipo)`) | RLS |
| `bizin_e_admin()` | ✔ | ✔ | authenticated | `admin`/`administrador` | RLS |
| `bizin_e_staff()` | ✔ | ✔ | authenticated | `admin`/`administrador`/`gestor` | RLS |
| `bizin_pode_acessos_ti()` | ✔ | ✔ | authenticated | staff + `marketing plus` | cofre |
| `chat_user_in_room(uuid)` | ✔ | ✔ (+`row_security off`) | authenticated | Membro da sala? | RLS chat |
| `chat_pode_adicionar(uuid, uuid)` | ✔ | ✔ | authenticated | Pode juntar alguém à sala? | RLS chat |
| `chat_ficheiro_permitido(text)` | ✔ | ✔ | authenticated | Pasta `<room_id>/` de um membro? | RLS storage |
| `pode_gerir_medalhas()` | ✔ | ✔ | authenticated | admin/gestor | RLS medalhas |
| `calcular_dias_ferias_gozados(uuid,int)` | ✔ | ✔ | service_role | Dias de férias aprovados no ano | funções/trigger |
| `provisionar_saldos_ferias(int)` | ✔ | ✔ | authenticated, service_role | Saldos do ano | pg_cron, `RecursosHumanos.jsx` |
| `aprovar_pedido_ferias_por_email(bigint)` | ✔ | ✔ | service_role | Aprovação antiga por email (sem uso) | — |
| `registar_evento(text, jsonb)` | ✔ | ✔ | authenticated | Evento no `audit_log` | `utils/registarEvento.js` |
| `audit_ativar()` | ✔ | ✔ | ninguém (só SQL Editor) | Liga `trg_audit` a todas as tabelas | manual |
| `audit_limpar(int)` | ✔ | ✔ | ninguém | Apaga `audit_log` com mais de N dias (mín. 30) | manual (sem cron) |
| `audit_mascarar(jsonb)`, `audit_excluida(text)` | — | — | default | Máscara de campos sensíveis / lista de exclusões | trigger |
| `cofre_guardar`, `cofre_revelar` | ✔ | ✔ | authenticated | Cofre | `utils/cofre.js` |
| `cofre_verificar`, `cofre_gravar_interno` | ✔ | ✔ | ninguém | Internas | cofre |
| `bizin_cc_a_expirar(date)` | ✔ | ✔ | authenticated | CCs a expirar | `DashboardHome.jsx` |
| `seguranca_criar_alerta(...)` | ✔ | ✔ | service_role | Cria alerta + notificação aos admins | `api/_lib/alertasSeguranca.js`, trigger |
| `seguranca_limpar(int)` | ✔ | ✔ | ninguém | Limpa logs/tentativas (default 180 dias) | pg_cron |
| `bizin_programas_financiamento()` | ✔ | ✔ | **anon**, authenticated | Só `nome` dos programas | BizInControl (externo) |
| `set_updated_at_generic()`, `set_updated_at_chat_room_reads()`, `set_updated_at_software()`, `medalhas_touch_updated_at()` | — | — | — | `updated_at = now()` | triggers |
| `bizin_projetos_por_cliente_nif`, `get_tabelas_externas`, `get_colunas_externas`, `handle_new_user` | ? | ? | authenticated/service_role | **Criadas à mão, fora do repo** | (externo / auth) |

## 12. Triggers

| Trigger | Tabela | Quando | Função |
|---|---|---|---|
| `trg_audit` | todas as tabelas de `public` exceto excluídas | AFTER I/U/D | `audit_registar()` |
| `trg_audit_nova_tabela` (event trigger) | DDL `CREATE TABLE` | ddl_command_end | `audit_ao_criar_tabela()` (se o Supabase deixou criar; senão correr `select public.audit_ativar();`) |
| `trg_seguranca_vigiar` | `audit_log` | AFTER INSERT | `seguranca_vigiar_audit()` |
| `profiles_proteger` | `profiles` | BEFORE I/U | campos só admin / só RH |
| `profiles_criar_privado` | `profiles` | AFTER INSERT | cria `profiles_privado` |
| `profiles_privado_proteger` | `profiles_privado` | BEFORE I/U | `valor_sa` só RH |
| `ferias_proteger` | `ferias` | BEFORE I/U | regras de estado do colaborador |
| `sincronizar_saldo_ferias_apos_alteracao` | `ferias` | AFTER I/U (estado, datas, horas) | recalcula `vacation_balances` |
| `trg_projetos_estado_hist` | `projetos` | AFTER I / U OF estado | histórico |
| `trg_atividades_estado_hist`, `trg_tarefas_estado_hist` | `atividades`, `tarefas` | AFTER U OF estado | histórico |
| `cofre_apagar_segredo` | `acessos`, `acessos_cliente` | AFTER DELETE | apaga segredo do Vault |
| `trg_*_updated_at` | `programas_financiamento`, `propostas_comerciais`, `avisos`, `transfergest_registos`, `notificacoes_projetos`, `pedidos_reembolso`, `marketing_*`, `software`, `chat_room_reads`, `medalhas` | BEFORE UPDATE | `updated_at` |

Tabelas **excluídas** da auditoria (`audit_excluida`): `audit_log`, `chat_messages`, `chat_room_reads`,
`notificacoes_projetos`, `tentativas_login`, `alertas_seguranca`, `logs_supabase_api`,
`logs_supabase_auth`, `seguranca_estado`.

## 13. Tarefas agendadas (pg_cron) — horários em UTC

| Nome | Cron | O que faz | Criada em |
|---|---|---|---|
| `provisionar-saldos-ferias-ano-seguinte` | `0 0 1 12 *` | `provisionar_saldos_ferias(ano_atual + 1)` | 040 (criada só se houver permissão; erros engolidos) |
| `bizin-seguranca-recolha` | `*/10 * * * *` | `net.http_post` para o URL do Vault `bizin_seguranca_url` com cabeçalho `x-cron-segredo` = `bizin_seguranca_segredo` (timeout 55 s) → `/api/seguranca/recolher` | 075b |
| `bizin-seguranca-limpeza` | `30 3 1 * *` | `seguranca_limpar(180)` | 075b |
| *(sugerida, não criada)* `audit-limpeza` | `0 3 1 * *` | `audit_limpar(730)` | comentário na 064 |

Verificar: `select jobname, schedule, active from cron.job;` e
`select * from cron.job_run_details order by start_time desc limit 20;`
Respostas HTTP do pg_net: `select status_code, content, created from net._http_response order by created desc limit 10;`

## 14. Segredos no Vault (só nomes)

| Nome / origem | Conteúdo | Usado por |
|---|---|---|
| `bizin_seguranca_url` | URL completo de `/api/seguranca/recolher` no domínio da app | cron `bizin-seguranca-recolha` |
| `bizin_seguranca_segredo` | Segredo aleatório (32 bytes hex). Tem de ser **igual** à variável `SEGURANCA_CRON_SEGREDO` no Vercel | idem |
| `bizin acessos <id>` / `bizin acessos_cliente <id>` (descrição) | Palavras-passe do cofre (um segredo por linha) | `cofre_*` |

## 15. Storage (baldes)

| Balde | Público? | Limites | Regras (`storage.objects`) | Usado em |
|---|---|---|---|---|
| `rh_anexos` | **privado** (069) | 15 MB; PDF, imagens, Word | ler: staff, ou nome começa por `<auth.uid>_`, ou dono; carregar: staff ou prefixo próprio; alterar/apagar: staff ou dono | `Ausencias.jsx`, `RecursosHumanos.jsx` |
| `documentos` | **privado** (069) | 50 MB | ler/carregar: autenticados; apagar: staff ou dono | `Tarefas.jsx`, `MinhasTarefas.jsx`, `ProjetoDetalhe.jsx` |
| `chat_ficheiros` | **privado** (069) | 25 MB | pasta `<room_id>/`: só participantes (`chat_ficheiro_permitido`); apagar: dono | `Forum.jsx` |
| `avatars` | público | 5 MB; png/jpeg/webp/gif | (políticas manuais) | `Perfil.jsx`, `Clientes.jsx`, logos de marcas em `marcas/` |
| `forum_media` | público | 10 MB; imagens | (políticas manuais) | `Forum.jsx` |
| `medalhas` | público (067) | 2 MB; png/webp/jpeg | ler: todos; escrever: `pode_gerir_medalhas()` | `MedalhasRH.jsx` |
| `documents` | **público** (013) | — | (políticas manuais) | anexos e guia de marca do Marketing (`marketing/Anexos.jsx`, `MarcaGuia.jsx`); ficheiros antigos do chat |

Ficheiros privados abrem-se com URLs assinados de 10 minutos (`src/utils/ficheirosPrivados.js`). A BD
guarda o URL "público" só para saber balde + caminho. Todos os acessos autenticados a `storage.objects`
exigem `aal2` (política restritiva `mfa_obrigatorio`, 071).

## 16. Edge Functions

* `supabase/functions/fetch-caes-sicae` (Deno, `verify_jwt = false` em `config.toml`): recebe um NIF e
  devolve os CAE do SICAE (scraping HTML). Chamada por `Clientes.jsx` via `supabase.functions.invoke`.
  CORS `*`. Não toca na BD.

---

## 17. Índice das migrações

Notas: **[dados]** = correção/semente de dados; **[ver]** = só leitura/consulta; **[manual]** = exige
passos manuais; **[!]** = ficheiro com problema (ver § 19).

| Nº | Ficheiro | Resumo | Notas |
|---|---|---|---|
| 001 | initial_schema | Vazio (2 bytes) — esquema base nunca foi versionado | [!] |
| 002 | add_dias_ferias_total | `profiles.dias_ferias_total` (default 22) | |
| 003 | enforce_unique_nif_clientes | Normaliza NIF, check 9 dígitos, único parcial | aborta se houver duplicados |
| 004 | create_app_settings | Tabela `app_settings` + `rh_km_reembolso_eur` | |
| 005 | add_avatar_url_to_clientes | `clientes.avatar_url` | |
| 006 | create_rh_settings | Tabela `rh_settings` (dia de pagamento do SA) | sem RLS até à 068 |
| 007 | add_recebe_sa_to_profiles | `profiles.recebe_sa` | |
| 008 | add_info_adicional_to_templates | `info_adicional` em modelos; campos financeiros em `tarefas` | não idempotente |
| 009 | add_template_tarefa_id_to_tarefas | `tarefas.template_tarefa_id` | não idempotente |
| 010 | add_dependency_fields… | Dependências entre atividades/tarefas (e modelos) | |
| 011 | add_dependency_override_flags | `ignorar_dependencia` | |
| 012 | add_email_pessoal_to_profiles | Ficheiro contém só `a` (1 byte) | [!] coluna criada à mão |
| 013 | create_internal_chat | `chat_rooms`, `chat_participants`, `chat_messages`, balde `documents` público | [!] `create policy if not exists` |
| 014 | fix_chat_participants_rls_recursion | `chat_user_in_room` com `row_security off` | |
| 015 | create_chat_room_reads | Recibos de leitura do chat | [!] `create policy if not exists` |
| 016 | enforce_unique_cae_per_cliente | Remove CAE duplicados, único `(cliente_id, codigo)` | [dados] apaga duplicados |
| 017 | add_analysis_routing_fields | Campos "em análise" em tarefas/atividades | |
| 018 | add_analysis_colleague_alert_fields | `analise_destino_user_id`, `analise_alerta_pendente` | |
| 019 | add_analysis_destination_contact_field | `analise_destino_contacto_id` | |
| 020 | create_programas_e_propostas_comerciais | `tarefas.numero_seq`, `programas_financiamento` (+3 sementes), `propostas_comerciais`, RLS "só as minhas" | |
| 021 | alter_propostas_id_auto_increment | Numeração própria de propostas; `tarefa_id` opcional | |
| 022 | enhance_propostas_structure | `avisos`, consultora/cliente/tipo nas propostas, RLS de avisos/programas | |
| 023 | move_prazos_to_avisos | `avisos.fases`; remove prazos de programas | |
| 024 | create_transfergest_registos | Tabela TransferGest | |
| 025 | add_cancelado_to_transfergest_estado | Estado `cancelado` | |
| 026 | add_faz_propostas_to_contactos_cliente | `contactos_cliente.faz_propostas` | não idempotente |
| 027 | update_propostas_estado_workflow | Novos estados das propostas | [dados] converte estados |
| 028 | add_default_budget_fields_to_tipos_projeto | Horas e €/hora por omissão | |
| 029 | add_termos_gerais_to_clientes | `clientes.termos_gerais` | |
| 030 | add_organismo_contacto_to_projetos | `projetos.organismo_contacto_id` | |
| 031 | add_programas_financiamento_fields | 4 campos de texto em programas | [!] ficheiro em UTF-16 |
| 032 | add_entidade_financiadora_to_programas | `entidade_financiadora_id` | nº duplicado |
| 032 | add_tem_cursos_and_create_cursos_table | `clientes.tem_cursos`, tabela `cursos` | nº duplicado |
| 033 | create_entidade_configuracoes | Textos por entidade para propostas | |
| 034 | add_texto_nota_honorarios | `texto_nota_honorarios` (já incluída na 033) | nº duplicado |
| 034 | create_proposta_cursos | M:N propostas ↔ cursos | nº duplicado |
| 035 | add_valor_consideracoes_to_cursos | `cursos.valor`, `consideracoes` | |
| 036 | add_programa_aviso_fases_to_projetos | `projetos.programa_id`, `aviso_id`, `prazos_fases` | |
| 037 | — | (não existe) | |
| 038 | create_notificacoes_projetos | Tabela de notificações | |
| 039 | add_ativos_ti_fields_and_software | Campos em `equipamentos`, tabela `software` | nº duplicado |
| 039 | add_profile_temporario_status | `profiles.estado_temporario_*` | nº duplicado |
| 040 | create_acoes_formacao | Formação: áreas, homologações, ações, checklist | nº duplicado |
| 040 | create_vacation_balances | Saldos de férias, funções, cron 1/dez, backfill 2026 | nº duplicado; [dados] backfill |
| 041 | allow_rh_to_sync_vacation_balances | Insert/update de saldos para RH/admin | substituído pela 076 |
| 042 | sync_vacation_balance_on_request_change | Trigger em `ferias` → saldo | |
| 043 | approve_vacation_request_atomically | Aprovação por email (uuid) | substituída pela 045 |
| 044 | allow_email_vacation_sync | `provisionar_saldos_ferias` para service_role | |
| 045 | fix_email_approval_request_id_type | Mesma função com `bigint` | função hoje sem uso |
| 046 | create_pedidos_reembolso | Pedidos de reembolso de projetos | |
| 047 | add_notas_to_pedidos_reembolso | `notas` | |
| 048 | prevent_invalid_project_date_ranges | Check de datas em projetos (`not valid`) | revertida pela 049 |
| 049 | remove_project_date_range_constraint | Remove o check da 048 | |
| 050 | forum_comment_threads_and_likes | Respostas em fio e gostos | |
| 051 | ferias_km_ida_volta | `ferias.km_ida_volta` + `notify pgrst` | |
| 052 | create_marketing | Marcas e conteúdos | |
| 053 | add_logo_to_marketing_marcas | `logo_url` | |
| 054 | create_marketing_personas | Personas + `persona_ids` | inclui sementes |
| 055 | marketing_guia_marca | `guia jsonb`, campos de ativação das personas | inclui sementes |
| 056 | marketing_estrategia | `marketing_ciclos`, `frente` | |
| 057 | marketing_conteudos_multi | Campos passam a `text[]`, vários responsáveis, anexos | [dados] converte |
| 058 | seed_banco_ideias_2siglas | 20 ideias do Notion | [dados] semente |
| 059 | seed_fluxo_conteudos_2siglas | 64 conteúdos do Notion | [dados] semente |
| 060 | seed_estrategia_2siglas | Ciclo "Nov 2026 – Jan 2027" | [dados] semente |
| 061 | marketing_recursos | `marketing_recursos` + métricas por peça | inclui sementes/limpeza |
| 062 | marketing_analytics_2siglas | Tipo `metrica` + 6 métricas | [dados] semente |
| 063 | marketing_fluxo_aprovacao | Novo fluxo e circuito de aprovação | [dados] converte estados |
| 064 | audit_log | Registo de atividade global | |
| 065 | projetos_estado_historico | Histórico de estados do projeto | [dados] reconstrói histórico |
| 066 | projetos_seguimento_atividades | Histórico de atividades/tarefas | [dados] reconstrói; correr depois da 065 |
| 067 | medalhas | Medalhas + balde `medalhas` | |
| 068 | seguranca_fase2 | Papéis (`bizin_*`), permissões de funções, RLS em settings, proteções de `profiles`/`ferias`/chat | |
| 069 | seguranca_ficheiros | Baldes privados e regras de storage | [ver] termina com consulta às políticas |
| 070 | seguranca_regras_antigas | Remove políticas manuais abertas e cria as corretas | |
| 071 | mfa_obrigatorio | Política restritiva `aal2` em todas as tabelas com RLS e no storage | tem bloco "DESFAZER" |
| 072 | cofre_e_dados_privados | Vault para passwords, `profiles_privado`, `cursos` só com sessão | [manual] extensão `supabase_vault` |
| 072b | colunas_antigas_opcionais | Colunas antigas deixam de ser `not null` | |
| 073 | limpar_colunas_antigas | Esvazia passwords e dados pessoais antigos | [dados] **irreversível** |
| 074 | ferias_privadas | Colaborador deixa de ler ausências aprovadas dos outros | |
| 075 | alertas_seguranca | Tabelas e regras de alertas | |
| 075b | agendar_recolha_logs | pg_cron + pg_net + segredos no Vault | [manual] trocar URL; copiar segredo para o Vercel |
| 076 | saldos_ferias_gestor | Gestor pode inserir/atualizar saldos | |
| 077 | saldos_ferias_ver | Lista saldos a corrigir | [ver] |
| 077b | saldos_ferias_corrigir | Zera transitados inventados | [dados] pontual, correr antes de 1/dez |
| 077c | saldos_ferias_limite_anual | Ano de admissão = limite anual | [dados] pontual |
| 078 | catalogo_programas_bizincontrol | `bizin_programas_financiamento()` para anon | |
| — | modulo_ativos_ti.sql | Rascunho de modelo de Ativos TI | **não aplicado, não correr** |

---

## 18. Como criar uma nova migração

1. **Nome**: `NNN_descricao_em_snake_case.sql`, com `NNN` = próximo número livre (hoje: `079`).
   Para passos do mesmo tema use sufixos `b`, `c` (ex.: `075b_…`). Evite números repetidos (já há
   vários duplicados — não repita o erro). Para consultas de verificação/pré-visualização use um ficheiro
   próprio terminado em `_ver` que **não altera nada** (padrão 077 → 077b).
2. **Cabeçalho** em comentário: o que faz, porquê, se apaga dados, se é idempotente, ordem/dependências
   ("correr depois da …"), e passos manuais.
3. **Idempotência** (padrão do projeto — a migração deve poder correr duas vezes):
   * `create table if not exists`, `alter table ... add column if not exists`, `create index if not exists`;
   * `create or replace function`;
   * `drop trigger if exists …; create trigger …` e `drop policy if exists …; create policy …`
     (**não** existe `create policy if not exists` no Postgres);
   * restrições: `drop constraint if exists` + `add constraint`, ou bloco `do $$ … if not exists (select from pg_constraint …)`;
   * dados: `insert … on conflict do nothing/update` ou `where not exists (…)`;
   * passos que dependem de objetos opcionais: `do $$ begin if to_regclass('public.x') is null then raise notice …; return; end if; … end $$;`.
4. **Checklist de segurança para cada tabela nova** (ver [04-seguranca.md § 8](04-seguranca.md#8-checklist-de-manutenção)):
   * `alter table … enable row level security;`
   * políticas com `to authenticated` e usando `bizin_e_staff()` / `bizin_e_admin()` / `auth.uid()`;
   * **política restritiva `mfa_obrigatorio`** (a 071 só a criou nas tabelas que existiam):
     ```sql
     drop policy if exists mfa_obrigatorio on public.minha_tabela;
     create policy mfa_obrigatorio on public.minha_tabela as restrictive for all to authenticated
       using ((auth.jwt() ->> 'aal') = 'aal2') with check ((auth.jwt() ->> 'aal') = 'aal2');
     ```
   * `revoke all on public.minha_tabela from anon;`
   * auditoria: confirmar que o `trg_audit` foi ligado (event trigger) ou correr `select public.audit_ativar();`;
     se a tabela for ruidosa, acrescentá-la a `audit_excluida()`.
   * funções `security definer`: sempre `set search_path = public` (e `vault` se precisar),
     `revoke all on function … from public, anon;` e `grant execute` só a quem precisa
     (`authenticated` e/ou `service_role`).
5. **Correr**: Supabase → *SQL Editor* → colar o ficheiro → *Run*. Ver o resultado da consulta de
   confirmação no fim (as migrações recentes terminam com um `select` de verificação).
   Se a app usar colunas novas e o PostgREST não as vir: `notify pgrst, 'reload schema';`.
6. Fazer commit do ficheiro **depois** de corrido com sucesso, e nunca editar uma migração já aplicada —
   criar uma nova.

---

## 19. Problemas conhecidos nas migrações e no modelo

* **001 vazia e 012 com só `a`** — o esquema base e `profiles.email_pessoal` não estão em nenhum ficheiro;
  reconstruir um ambiente a partir do repo é impossível sem um dump.
* **013 e 015 usam `create policy if not exists`**, que não é SQL válido no Postgres — estas políticas
  devem ter sido criadas à mão (ou corridas e corrigidas no editor). Não voltar a correr como estão.
* **031 está codificada em UTF-16 (com BOM)** — pode falhar ao colar/correr com ferramentas que esperam UTF-8.
* **Números duplicados** (032, 034, 039, 040 — dois ficheiros cada) e o **037 não existe**.
* **`modulo_ativos_ti.sql`** está na pasta de migrações mas não é uma migração aplicada.
* **Esquema e políticas criadas no painel** (`propostas_comerciais` lida por admins, `equipamentos`,
  `profiles`, buckets `avatars`/`forum_media`/`documents`, `handle_new_user`, …) não estão versionados.
* **Férias com acento**: `calcular_dias_ferias_gozados`, `sincronizar_saldo_ferias_por_pedido` e
  `aprovar_pedido_ferias_por_email` reconhecem férias com `lower(tipo) like '%fer%'`; a app grava
  `tipo = 'Férias'` (com "é"), que **não** corresponde a `%fer%`. Na prática o cálculo em SQL deve dar 0
  para pedidos novos; quem mantém `dias_gozados` correto é a app (`sincronizarSaldoFeriasPerfil`). Se
  alguém correr `provisionar_saldos_ferias(<ano corrente>)`, os `dias_gozados` desse ano podem ser
  reescritos com o valor SQL. Confirmar com
  `select distinct tipo from ferias;` antes de depender do cálculo em SQL.
* **Cálculo SQL ≠ cálculo da app**: o SQL conta seg–sex sem feriados nem tolerâncias; a app desconta tolerâncias.
* **`transito_expira_em` inconsistente**: SQL grava `31/03/<ano>`, o backfill da 040 e a app gravam `31/03/<ano+1>`.
  A app ignora a coluna; `dias_disponiveis` (gerada) também não considera a expiração.
* **`vacation_balances`: gestor pode inserir/atualizar (076) mas não tem política de SELECT** (a da 040 não
  inclui `gestor`). Um `upsert` com conflito por um gestor sobre a linha de outra pessoa pode falhar.
* **Regra do ano de admissão no SQL**: nos anos seguintes ao de admissão, `provisionar_saldos_ferias`
  atribui sempre 22, ignorando `dias_ferias_total` (é intencional, mas convém saber).
* **`audit_mascarar` esconde qualquer chave `codigo`** (regex `^codigo$`, 068), também em tabelas onde
  `codigo` não é segredo (`programas_financiamento`, `avisos`, `software`, `acoes_formacao`…).
* `profiles.role` é enum (`user_role`) e `tipo` é texto; todas as verificações usam
  `lower(coalesce(role::text, tipo::text, ''))` — se `role` não for nulo, `tipo` é ignorado.
