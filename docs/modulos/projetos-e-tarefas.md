# Projetos, atividades e tarefas

Este módulo é o núcleo operacional da app: os projetos de clientes (candidaturas a
fundos, gestão de projetos aprovados, formação…), divididos em **atividades**, cada uma
com **tarefas**, e estas com **subtarefas** (na interface chamam-se "passos"). O tempo
gasto é registado com **cronómetros** (tabela `task_logs`).

Ver também: [base de dados](../03-base-de-dados.md) e
[frontend partilhado](../06-frontend-partilhado.md) (modais, toasts, `clicavel`, etc.).

## Ficheiros

| Ficheiro | Rota | Para quê |
|---|---|---|
| `src/pages/Projetos.jsx` | `/dashboard/projetos` | Carteira, Vista Geral (financeira), criar/editar projeto |
| `src/pages/ProjetoDetalhe.jsx` | `/dashboard/projetos/:id` | Tudo sobre um projeto (atividades, Gantt, seguimento, tempos, execução financeira, dados) |
| `src/pages/Tarefas.jsx` | `/dashboard/tarefas` | Trabalho de projeto de toda a equipa (por projeto, prazos ou estados) |
| `src/pages/MinhasTarefas.jsx` | `/dashboard/minhas-tarefas` | Agenda pessoal (tarefas de projeto + tarefas avulsas) |
| `src/pages/Atividades.jsx` | `/dashboard/atividades` | Lista simples de todas as atividades |
| `src/components/ProjetoTracker.jsx` | — | Separador "Seguimento" (histórico de estados) |
| `src/components/pdfGenerator.jsx` | — | Relatório PDF do projeto |
| `src/components/StopTimerNoteModal.jsx` | — | Modal ao parar cronómetro (nota, novo estado, encaminhamento) |
| `src/components/TimerSwitchModal.jsx` | — | Confirmar troca de cronómetro |
| `src/utils/taskTimerLifecycle.js` | — | Fechar logs e aplicar o estado escolhido ao parar |
| `src/utils/activityStatusCascade.js` | — | Concluir atividade + tarefas + subtarefas |
| `src/utils/dependencyGuards.js` | — | Saber se uma atividade/tarefa está bloqueada por dependência |
| `src/utils/activeTimerResolver.js` | — | Título e link do cronómetro ativo ("Cliente - Projeto - Tarefa") |
| `src/utils/attendanceGuard.js` | — | Verificar/iniciar a picagem de ponto antes de cronometrar |

Os modelos de projeto (tipos de projeto e as suas árvores `template_*`) são geridos em
`/dashboard/modelos` (`src/components/GestaoTemplates.jsx`), fora deste módulo.

## Modelo de dados

O esquema base destas tabelas não está nas migrações (a `001` está vazia); só as
alterações posteriores estão. Colunas abaixo são as que o código usa.

```
clientes ──< projetos ──< atividades ──< tarefas ──< subtarefas
               │   │            │            │
               │   └──< projeto_entidades    └── task_logs (task_id / tarefa_id)
               ├──< pedidos_reembolso
               ├──< projetos_estado_historico (triggers)
               └──< notificacoes_projetos
tipos_projeto ──< template_atividades ──< template_tarefas ──< template_subtarefas
```

### `projetos`
- Identificação: `titulo`, `codigo_projeto`, `numero_projeto`, `descricao`, `observacoes`.
- Entidades: `cliente_id` (líder, obrigatório), `is_parceria` + `parceiros_ids` (array),
  `organismo_id` + `organismo_contacto_id` (entidade financiadora e a pessoa de contacto),
  `cliente_texto` (legado, gravado sempre vazio).
- Equipa: `responsavel_id` (responsável global), `colaboradores` (array de ids de `profiles`).
- Tipo: `tipo_projeto_id` → `tipos_projeto` (`eh_formacao` dispensa investimento/incentivo).
- Datas: `data_inicio`, `data_fim`. A regra "início ≤ fim" chegou a existir na BD
  (migração 048) mas foi removida (049); hoje só é validada no browser.
- Financiamento: `programa_id` → `programas_financiamento`, `aviso_id` → `avisos`, mais as
  cópias em texto `programa` ("CODIGO - Nome") e `aviso` (código). O formulário usa também
  `avisos_ids` (ver "Armadilhas").
- `prazos_fases` (jsonb): `[{ nome, prazo }]` — prazos das fases do aviso (copiados do aviso
  e editáveis no projeto).
- `investimento`, `incentivo`: totais. Com várias entidades são a soma de `projeto_entidades`.
- `estado`: ver abaixo.

### `projeto_entidades`
Uma linha por entidade do projeto: `projeto_id`, `entidade_id`, `papel` (`lider` |
`parceiro`), `investimento`, `incentivo`. Chave única `(projeto_id, entidade_id)` (o código
faz `upsert` com `onConflict`). Gravada ao criar/editar no modal (`syncProjetoEntidades`) e no
separador "Execução financeira" (`saveOrcamentoEntidade`), que recalcula os totais do projeto.

### `pedidos_reembolso` (migrações 046/047)
`projeto_id`, `entidade_id`, `pedido` (referência), `data_pedido`, `valor_investimento`,
`valor_incentivo`, `valor_pago`, `data_pagamento`, `notas`, `user_id`. Alimentam a
**TXE** (taxa de execução = Σ `valor_investimento` / `projetos.investimento`) e os mapas
mensais "Investimento"/"Incentivo" da Vista Geral.

### `atividades`, `tarefas`, `subtarefas`
Campos comuns: `titulo`, `estado`, `responsavel_id`, `ordem`, `data_inicio`, `data_fim`,
`descricao`, `created_at`.
- `atividades`: `projeto_id`, `colaboradores` / `colaboradores_extra`, `investimento`,
  `incentivo`, `financiamento`, `data_prevista_aprovacao`, `observacoes`, `info_adicional`
  (jsonb vindo do modelo), `depende_de_atividade_id`, `ignorar_dependencia`, campos de análise.
- `tarefas`: `atividade_id` (**nulo nas tarefas avulsas** de Minhas Tarefas),
  `numero_seq` (sequencial único, migração 020), `prioridade`, `colaboradores_extra` (array),
  `data_limite` (prazo das avulsas; as de projeto usam `data_fim`), `data_conclusao`,
  entregável (`tem_entregavel`, `nome_entregavel`, `data_entregavel`, `arquivo_url`),
  `anexos` (lista jsonb `[{id, nome, data_limite, url}]` usada em Minhas Tarefas),
  `template_tarefa_id` (modelo de origem), `depende_de_tarefa_id`, `ignorar_dependencia`,
  `criado_por`, campos de análise.
- `subtarefas`: `tarefa_id`, `titulo`, `estado`, `data_fim`, `ordem`, `responsavel_id`.

Campos de análise (migrações 017–019), em `atividades` e `tarefas`:
`analise_destino` (`proprio` | `colega` | `cliente` | `contabilista` | `organismo`),
`analise_data_prevista`, `analise_data_envio`, `analise_data_retorno`,
`analise_destino_user_id` (colega), `analise_destino_contacto_id` (contacto do cliente),
`analise_alerta_pendente`.

### `task_logs` (registo de horas)
`user_id`, `projeto_id`, `task_id` (e o legado `tarefa_id`), `atividade_id`,
`subtarefa_id` (pode não existir em BDs antigas — o código tenta sem ela), `start_time`,
`end_time` (nulo = cronómetro a correr), `duration_minutes`, `observacoes` (nota de paragem).

### Histórico (`projetos_estado_historico`, migrações 065/066)
Triggers `security definer` registam cada mudança de `estado` em projetos, atividades e
tarefas: `tipo` (`projeto` | `atividade` | `tarefa`), `item_id`, `item_titulo`,
`atividade_titulo`, `estado_anterior`, `estado_novo`, `user_id`, `created_at`. Os erros do
trigger só geram *warning* (nunca bloqueiam a gravação). É lido pelo `ProjetoTracker`.

### `notificacoes_projetos` (migração 038)
Criada ao criar um projeto (`tipo = 'project_created'`) para o responsável; cada pessoa só
lê/edita as suas. Em paralelo o browser pede ao servidor o email
(`POST /api/notificacoes/projeto-criado`).

## Estados

### Projeto (`projetos.estado`)

| Valor | Etiqueta | Notas |
|---|---|---|
| `pendente` | Pendente | Valor por omissão ao criar |
| `em_curso` | Em Curso | |
| `em_analise` | Em Análise | Submetido / à espera de decisão |
| `concluido` | Concluído | Trabalho terminado |
| `encerrado` | Encerrado | "Arquivar" no detalhe. Inativo |
| `cancelado` | Cancelado | Inativo |

- `encerrado` e `cancelado` são **inativos**: escondidos das listas (salvo "mostrar
  concluídos" ou filtro explícito de estado na Vista Geral) e **não aceitam cronómetro**.
- O estado muda-se à mão no modal/separador de dados. Mudanças automáticas:
  - **Tarefas.jsx**: ao concluir a última atividade de um projeto, o projeto passa a
    `concluido` e aparece o convite "iniciar a próxima etapa" (abre o modal de novo projeto
    com os dados copiados — ex.: candidatura → gestão).
  - "Parar e concluir" num cronómetro cujo item é o projeto (ver Cronómetros).
- O percurso esperado (usado no Seguimento) é pendente → em curso → em análise →
  concluído → encerrado.

### Atividade, tarefa e subtarefa
`pendente`, `em_curso`, `em_analise`, `concluido`, `cancelado` (no detalhe do projeto
também se mostra `encerrado` em alguns seletores).

- Arrancar cronómetro numa tarefa/atividade `pendente` passa-a a `em_curso`
  (em `ProjetoDetalhe` a tarefa passa sempre a `em_curso`).
- O check "concluir/reabrir" alterna `concluido` ↔ `pendente` (em `Atividades.jsx`, reabrir
  uma atividade volta a `em_curso`).
- Ao gravar com estado `em_analise`, `analise_destino` fica `proprio` por omissão; noutros
  estados os campos de análise são limpos.

### Cascata ao concluir uma atividade

A regra "concluir atividade conclui o que está dentro" está implementada em sítios diferentes,
com pequenas diferenças:

| Onde | Atividade | Tarefas | `data_conclusao` | Subtarefas | Fecha projeto? |
|---|---|---|---|---|---|
| `concludeActivityWithChildren` (usado em ProjetoDetalhe, Atividades, Projetos) | ✔ | ✔ | ✔ | ✔ | não |
| `Tarefas.jsx` (`handleToggleStatus`, `completeLogItem`) | ✔ | ✔ | ✔ | **não** | sim, se todas as atividades ficaram concluídas |

Reabrir uma atividade **não** reabre as tarefas. Concluir uma tarefa não conclui subtarefas.
Em `ProjetoDetalhe.toggleTarefaStatus` a `data_conclusao` não é preenchida (nas outras
páginas é).

### Encaminhamento "em análise"
Quando, ao parar o cronómetro, se escolhe o estado `em_analise`
(`applyStopStatusUpdateForLogTarget`):
- grava `analise_destino`, `analise_data_envio = agora`, `analise_data_prevista`, e o
  `analise_destino_user_id` (colega) ou `analise_destino_contacto_id` (contacto do cliente);
- se o destino é um colega: `analise_alerta_pendente = true` e o colega é acrescentado a
  `colaboradores_extra` (passa a ver a tarefa). O `WidgetAssiduidade` mostra-lhe o alerta e
  limpa a flag;
- ao sair de `em_analise` grava `analise_data_retorno` e limpa o alerta.

## Criar um projeto (modal em 5 passos, `Projetos.jsx`)

1. **Base & Entidade** — tipo de projeto (modelo), nome, cliente líder, parcerias.
2. **Organismo & Equipa** — organismo (cliente com `eh_organismo`, pode criar-se ali mesmo
   com consulta de NIF) e pessoa de contacto, responsável global, colaboradores.
3. **Planeamento** — datas, programa e aviso (as fases do aviso são copiadas para
   `prazos_fases`).
4. **Atividades** — árvore do modelo do tipo de projeto com caixas para escolher o que criar.
5. **Finanças & Notas** — investimento/incentivo (por entidade se houver parceiros),
   observações, estado.

Validação na criação: nome, cliente, tipo, responsável, data de fim, fases (se houver
programa/aviso) e investimento e incentivo > 0 (exceto tipos de formação). Em qualquer
gravação: data de início ≤ data de fim.

Geração da árvore a partir do modelo (só na criação):
- cada atividade começa onde a anterior acabou (`data_inicio` encadeada pelos
  `dias_estimados`); sem `dias_estimados` o fim é a data de fim do projeto (ou da última fase);
- o mesmo dentro de cada atividade para as tarefas, e para as subtarefas;
- responsável e colaboradores do projeto são copiados para todos os itens;
- as dependências do modelo (`depende_de_template_atividade_id`,
  `depende_de_template_tarefa_id`) são traduzidas para ids reais depois de tudo criado;
- erros em itens individuais não param o processo: no fim aparece "N elemento(s) não foram
  gravados" (detalhe na consola).

Depois: `projeto_entidades`, notificação ao responsável e navegação para o detalhe.

Também se abre o modal com dados pré-preenchidos vindos de outras páginas via
`location.state` (`openModal` + `prefillData`, ou `prefillClienteId` vindo de Clientes).

## Detalhe do projeto (`ProjetoDetalhe.jsx`)

| Separador | O que faz |
|---|---|
| Atividades | Árvore com arrastar para reordenar (grava `ordem` = posição; tarefas só dentro da mesma atividade), check concluir/reabrir, cronómetro por atividade/tarefa, adicionar atividade/tarefa/passo, "reaproveitar bloco" (duplica a atividade com tarefas e passos), modais de edição (inclui entregável com upload) e apagar |
| Gantt | Janela de 1, 2, 6 meses ou total; progresso calculado pelos filhos; exporta PDF |
| Seguimento | `ProjetoTracker`: linha temporal de estados do projeto, atividades e tarefas |
| Relatório de tempos | `task_logs` do projeto (filtra por `projeto_id`), registos manuais (criar/editar/apagar) e PDF (`pdfGenerator`) |
| Execução financeira | Valores por entidade e pedidos de reembolso |
| Configurações e dados | Dados do projeto; **Arquivar** (= `encerrado`) e **Apagar permanentemente** (pede "APAGAR"; apaga logs, subtarefas, tarefas, atividades e projeto) |

## Dependências

- Uma atividade pode depender de outra (`depende_de_atividade_id`); uma tarefa de outra
  tarefa (`depende_de_tarefa_id`). Normalmente vêm do modelo.
- `dependencyGuards.js`: um item está **bloqueado** se a dependência existe e não está
  `concluido`. Uma tarefa também fica bloqueada se a sua atividade está bloqueada.
- `ignorar_dependencia = true` desliga o bloqueio. O botão "desbloquear" no detalhe
  grava esta flag na BD — o desbloqueio é **permanente**, apesar do nome `unlock…ForNow`.
- O bloqueio é só visual/de interface (impede iniciar/concluir no ecrã); a BD não o impõe.

## Cronómetros e registo de horas

Regras:
- **Um cronómetro aberto por pessoa**: `task_logs` com `end_time` nulo. Cada página procura-o
  com `.is("end_time", null).maybeSingle()`.
- **Arrancar** (em qualquer página): se já há outro aberto, `TimerSwitchModal` pergunta se o
  quer terminar; se for o mesmo item, não faz nada. Antes de arrancar verifica-se a **picagem
  de ponto** (`assiduidade` do dia); se faltar, pergunta se quer picar agora — o cronómetro
  arranca na mesma.
- O log guarda o alvo: `task_id` ou `atividade_id` (+ `projeto_id` quando conhecido;
  `subtarefa_id` só nos registos manuais).
- **Parar**: `StopTimerNoteModal` pede nota (→ `observacoes`), o novo estado do item
  (ou manter) e, se for `em_analise`, o destino. Grava `end_time` e
  `duration_minutes = max(1, minutos inteiros)`. Opcionalmente "concluir o item"
  (`completeLogItem`).
- **Fecho automático**: `closeAllActiveTaskLogsForUser` fecha todos os cronómetros abertos ao
  terminar sessão (`AuthContext.signOut`) e ao pausar/terminar a assiduidade
  (`WidgetAssiduidade`), com nota automática.
- **Registos manuais**: no detalhe do projeto (com `subtarefa_id` opcional), em Minhas
  Tarefas, Tarefas e Atividades. Início = data + hora escolhidas, fim = início + minutos.

O que "concluir o item" conclui depende da página (ordem em que testa os campos do log):

| Página | Ordem |
|---|---|
| ProjetoDetalhe, Tarefas, MinhasTarefas | tarefa → atividade → projeto |
| Atividades | atividade → tarefa → projeto |
| **Projetos** | **projeto** → atividade → tarefa |

Como os logs têm quase sempre `projeto_id`, em `Projetos.jsx` "parar e concluir" conclui o
**projeto inteiro** (ver Armadilhas).

## Tarefas, Minhas Tarefas e Atividades

**Tarefas (`Tarefas.jsx`)** — vistas "Projetos" (árvore), "Prazos" (kanban por prazo:
atrasadas, hoje, …, sem prazo, concluídas) e "Estados" (kanban pelos 5 estados).
- admin/administrador/gestor (`profiles.tipo`) veem tudo e filtram por cliente/projeto;
- os restantes veem atividades/tarefas onde são responsáveis ou estão em
  `colaboradores_extra`, e só as suas subtarefas;
- só itens ligados a projetos (joins `!inner`); as tarefas avulsas não aparecem aqui.

**Minhas Tarefas (`MinhasTarefas.jsx`)** — tarefas não concluídas onde sou responsável ou
colaborador, em colunas Atrasadas / Para hoje / Amanhã / Depois / Sem data. Arrastar muda o
prazo (`data_fim` nas de projeto, `data_limite` nas avulsas; "Atrasadas" = ontem, "Depois" =
+3 dias). Permite criar **tarefas avulsas** (`atividade_id` nulo), anexos, cronómetro,
histórico de concluídas (restaurar ou apagar de vez).

**Atividades (`Atividades.jsx`)** — lista de todas as atividades com pesquisa,
criar/editar, concluir (com cascata) e cronómetro.

## Quem pode o quê

Rotas (`src/App.jsx`): todas as páginas deste módulo estão disponíveis a **qualquer
utilizador com sessão** (sem `allowedRoles`).

Dentro das páginas:
- `Tarefas.jsx`: "admin" (= `tipo` admin, administrador ou gestor) vê toda a equipa; os
  outros só o que lhes está atribuído.
- `Projetos.jsx`: "Só os meus" é um filtro de conveniência, não uma restrição; a Vista Geral
  mostra todos os projetos.
- Não há verificações de papel para editar/apagar projetos, atividades ou tarefas no
  frontend.

Base de dados (o que está nas migrações):
- `task_logs` (070): todos leem; cada pessoa só cria/altera/apaga os **seus** registos;
  staff (`bizin_e_staff()`: admin, administrador, gestor) mexe em todos.
- `notificacoes_projetos`: cada pessoa só vê as suas.
- `projetos_estado_historico`: lê quem consegue ler o projeto; escrita só pelos triggers.
- As regras RLS de `projetos`, `atividades`, `tarefas`, `subtarefas`, `projeto_entidades` e
  `pedidos_reembolso` **não estão no repositório** (foram criadas no painel do Supabase).
  Confirmar no Supabase antes de assumir o que quer que seja — ver
  [base de dados](../03-base-de-dados.md).
- Ficheiros de entregáveis/anexos: bucket `documentos`, privado desde a migração 069
  (qualquer colaborador com sessão).

## Armadilhas e riscos conhecidos

- **"Parar e concluir" em Projetos.jsx conclui o projeto** em vez da tarefa/atividade
  (o log tem `projeto_id` e é o primeiro campo testado). As outras páginas fazem o contrário.
- **Cascata diferente** entre `Tarefas.jsx` (não conclui subtarefas, fecha o projeto) e
  `concludeActivityWithChildren` (conclui subtarefas, não fecha o projeto).
- **Erros silenciosos** em `Tarefas.handleSubmit`: o Supabase não lança exceções, e o código
  só usa `try/catch`; uma gravação recusada mostra "Alterações guardadas".
- **Ficheiros com URL público** num bucket privado: entregáveis e anexos guardam
  `getPublicUrl(...)` do bucket `documentos`, que desde a 069 é privado — esses links podem
  não abrir. Ver `src/utils/ficheirosPrivados.js` para a forma correta.
- **Apagar projeto de vez** com registos de tempo de colegas: quem não é staff não os
  consegue apagar (RLS devolve 0 linhas, sem erro) e o resto pode falhar por chave estrangeira.
- **`avisos_ids` vs `aviso_id`**: o formulário de `Projetos.jsx` guarda o aviso escolhido em
  `form.avisos_ids` e envia o formulário inteiro para `projetos` (insert/update). O detalhe
  usa `aviso_id`. Se a coluna `avisos_ids` não existir em `projetos`, a gravação falha.
- **Datas com `toISOString()`**: várias datas "de hoje" são calculadas em UTC
  (`toISOString().split('T')[0]`); entre a meia-noite e a 1h (hora de verão) dá o dia anterior.
- **Relatório de tempos** filtra `task_logs` por `projeto_id`: registos sem `projeto_id`
  (ex.: tarefa iniciada fora de um projeto conhecido) não aparecem.
- O PDF do projeto é chamado sem os contactos das entidades (parâmetro opcional
  `entidadePessoas` fica vazio).
