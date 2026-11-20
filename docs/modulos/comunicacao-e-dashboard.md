# Dashboard, Comunicação (Fórum/Chat) e Programas/Avisos

- `src/pages/Dashboard.jsx` — layout de todas as rotas `/dashboard/*`
- `src/pages/DashboardHome.jsx` — página Início (`/dashboard`)
- `src/pages/Forum.jsx` — Comunicação: feed + chat (`/dashboard/forum`)
- `src/pages/GestaoAvisos.jsx` — Programas e Avisos de financiamento (`/dashboard/avisos`)
- Ver também: [../03-base-de-dados.md](../03-base-de-dados.md), [../04-seguranca.md](../04-seguranca.md), [../06-frontend-partilhado.md](../06-frontend-partilhado.md), [marketing.md](marketing.md)

## Dashboard (layout)

`Dashboard.jsx` é o elemento da rota `/dashboard` (dentro de `ProtectedRoute`). Monta `Sidebar`, `BrandIntro` (introdução animada), `ThemeDecor` (decorações de tema) e `<Outlet />`. A `key={location.pathname}` faz cada página entrar com animação.

Mobile (`max-width: 900px`): a sidebar passa a gaveta (`menuOpen`), aparece a barra de topo com o título (`PAGE_TITLES`, por prefixo de rota) e a navegação inferior (Início, Agenda, Tarefas, Projetos, Menu). Ao mudar de página volta ao topo e fecha a gaveta. Rotas sem entrada em `PAGE_TITLES` (ex.: `marketing`, `registos`, `pedidos/:id`) mostram "Início".

## Início (DashboardHome)

### Widgets

| Zona | Conteúdo | Fonte |
|---|---|---|
| Hero | saudação, data, relógio (1 s), frase do dia (`src/data/frases`, escolhida pela data), sino de notificações, foco/timer ativo | `task_logs` com `end_time` nulo |
| Números | horas do mês (abre histórico de assiduidade), projetos ativos, entidades ativas, publicações do fórum | contagens `head: true` em `projetos`, `clientes`, `forum_posts` |
| Continuar onde paraste | últimos registos de tempo | `task_logs` |
| As minhas tarefas | separadores **Hoje** (prazo hoje ou atrasado), **Próximas**, **Em análise** (`estado = em_analise`) | `tarefas`/`atividades` onde sou `responsavel_id` ou estou em `colaboradores_extra`; esconde as bloqueadas por dependências (`dependencyGuards`) |
| Ponto | `WidgetAssiduidade` | `assiduidade` |
| Equipa online | quem picou hoje e ainda não saiu, com medalha | `assiduidade` (`data_registo` = hoje, `hora_saida` nula) + `medalhas_colaboradores` |
| Aniversários | próximos 3 | `profiles.data_nascimento` |

Pop-ups: aviso de Cartão de Cidadão a expirar (≤30 dias; gestores/RH veem a equipa via RPC `bizin_cc_a_expirar`, os outros o próprio; no máximo 1×/dia por `localStorage.ccWarningLastSeen`), parabéns no próprio aniversário (1×/sessão), histórico mensal de assiduidade com edição/adição de registos.

### Timer a partir do Início

Botão play numa tarefa → se já corre essa tarefa abre a nota de paragem (`StopTimerNoteModal`); se corre outra pede confirmação (`TimerSwitchModal`); senão cria um `task_log` e passa a tarefa/atividade de `pendente` a `em_curso`. Antes de iniciar (ou de concluir ao parar) verifica se o utilizador já picou o ponto hoje e oferece-se para o fazer (`runActionWithAttendanceWarning`). Parar pode concluir o item (tarefa → `concluido`; atividade → `concludeActivityWithChildren`; projeto → `concluido`).

### Atualização

Ao montar, ao focar a janela/voltar ao separador, a cada 90 s (trabalho + notificações) e 60 s (equipa online), e com os eventos `window` `task-logs-updated` e `project-notifications-updated` (disparados por outras páginas).

### Notificações (sino)

Tabela `notificacoes_projetos` (migração 038; `conteudo_id` na 063). O Início carrega as **não lidas** do utilizador (máx. 20) com `tipo` em:

| tipo | Criada por | Ao abrir |
|---|---|---|
| `project_created` | `Projetos.jsx` ao criar projeto | abre `/dashboard/projetos/<project_id>` |
| `mk_aprovacao` | `mkAprovacao.enviarParaAprovacao` (para cada aprovador) | abre `AprovacaoModal`; **não** fica lida até haver decisão |
| `mk_aprovado` / `mk_alteracoes` | `mkAprovacao.aprovar` / `pedirAlteracoes` (para a equipa de marketing) | fica lida e abre o conteúdo no Marketing |
| `seguranca` | função SQL `seguranca_criar_alerta` (migração 075), para administradores | fica lida e navega para `link` (`/dashboard/registos?alertas=1`) |

Pedidos `mk_aprovacao` cujo conteúdo já não está em `aprovacao` são marcados como lidos automaticamente. O aspeto de cada tipo está em `src/components/NotificationsPanel.jsx` (tipo desconhecido usa o de `project_created`).

## Comunicação: Fórum (feed)

| Tabela | Uso |
|---|---|
| `forum_posts` | `titulo`, `categoria` (`geral`, `aviso`, `duvida`, `ideia`; outro valor conta como `geral`), `conteudo`, `image_url` (formato antigo) |
| `forum_comments` | comentários, respostas por `parent_id` (migração 050) |
| `forum_comment_likes` | gostos em comentários (se a tabela não existir a funcionalidade desliga-se) |
| `forum_reactions` | uma reação por pessoa e post: 👍 ❤️ 💡 🚀 😂 😮 😢 |

- Conteúdo em blocos: `conteudo` começa por `BLOCKS_V1:` seguido de JSON `[{type:"text",text,align} | {type:"image",url,size}]`. Posts antigos (texto + `image_url`) continuam a abrir (`parsePostBlocks`).
- Imagens dos posts no balde **público** `forum_media` (só imagens, até 10 MB).
- Filtros por categoria e por autor; o feed carrega **todos** os posts de uma vez (sem paginação).
- Editar/apagar na interface: autor, `admin` ou `gestor` (não inclui `administrador`). A decisão final é da RLS.
- Visitar o fórum grava `localStorage.lastForumVisit` (usado pela sidebar para o indicador de novidades).

## Comunicação: Chat interno

| Tabela | Uso |
|---|---|
| `chat_rooms` | `is_group`, `nome` (grupos), `criado_por` |
| `chat_participants` | (`room_id`, `user_id`) |
| `chat_messages` | `content`, `file_url`, `file_name`, `sender_id` |
| `chat_reactions` | reações a mensagens |
| `chat_room_reads` | `last_read_at` por pessoa e sala (vistos ✓✓) |

- **Salas privadas**: `getOrCreatePrivateRoomByName` procura a pessoa por `profiles.nome`, reutiliza a sala privada em comum ou cria uma com os dois.
- **Grupos**: criados com participantes escolhidos; podem acrescentar-se membros. A RLS (`chat_pode_adicionar`, migração 068) deixa qualquer pessoa entrar sozinha num grupo existente; adicionar outros exige ser participante ou criador.
- **Ficheiros**: balde privado `chat_ficheiros`, caminho `<room_id>/<user_id>_<timestamp>_<aleatório>.<ext>` (até 25 MB). Só participantes leem (`chat_ficheiro_permitido`, migração 069). Na BD guarda-se o URL "público" como referência; a interface abre com link temporário (`ImagemPrivada` / `utils/ficheirosPrivados`). Ficheiros podem ser colados ou arrastados.
- **Tempo real** (bloco "TEMPO REAL" em `Forum.jsx`):
  - canal por sala `room_<id>` (criado uma vez e reaproveitado, `ROOM_CHANNELS`): `INSERT` em `chat_messages` + broadcasts `typing` e `read_receipt`;
  - canais com nome único por subscrição: avisos de mensagens novas em qualquer sala (contador de não lidas + aviso com excerto), alterações em `chat_room_reads`, entrada numa nova conversa;
  - rede de segurança: com uma conversa aberta, sincroniza mensagens novas a cada **1,2 s**.
- **Não lidas**: maior entre o "lido até" local (`localStorage chat_seen_rooms_<userId>`) e o da BD; conta mensagens de outros depois dessa data (só nas últimas 500 mensagens de todas as salas).
- **"A escrever…"**: broadcast no máximo a cada 800 ms; o rascunho vive no componente `ChatComposer` (Enter envia, Shift+Enter muda de linha).

### Presença online e medalha

A "presença" não usa Realtime Presence: está online quem tem registo em `assiduidade` hoje sem `hora_saida` (widget do Início, atualizado a cada 60 s). Sobre a foto aparece o emblema da medalha mais recente (`useMedalhasEquipa` → `medalhas_colaboradores` + `medalhas`, migração 067), com o número de medalhas se tiver mais do que uma; o tooltip lista os nomes. Classe CSS `mdl-avatar-badge`.

### Desempenho (pendente)

O rascunho do **chat** já foi extraído para `ChatComposer` (estado local), por isso escrever no chat já não redesenha o `Forum.jsx` inteiro. Continua pendente:
- os rascunhos dos **comentários** (`newCommentText`, `inlineCommentDrafts`) vivem no `Forum` e redesenham feed, salas e mensagens a cada tecla;
- a lista de mensagens não está memorizada (cada mensagem recalcula o visto ✓/✓✓ com comparações de datas em cada render).

## Programas/Avisos (GestaoAvisos)

Catálogo de **programas de financiamento** e dos **avisos** de candidatura (não confundir com notificações).

| Tabela | Campos principais |
|---|---|
| `programas_financiamento` | `codigo` (sigla), `nome`, `pct`, `tipo_incentivo`, `entidade_financiadora_id` (cliente com `eh_organismo`), `investimento_minimo`, `regiao`, objetivos/elegibilidade/condições, `avisos_ids` (array), `ativo` |
| `avisos` | `codigo`, `fases` (jsonb `[{ nome, prazo }]`), `ativo` |

- Separadores Ativos / Inativos / Todos; vista em cartões ou lista; pesquisa por nome/código.
- Ao criar/editar um programa pode escolher avisos existentes ou criar um novo inline (é inserido em `avisos` antes do programa).
- Arquivar = `ativo = false`; reativar volta a `true`. Nada é apagado.
- "Próximos prazos": fases de avisos de programas ativos nos próximos 60 dias (máx. 8). Tons: encerrada, urgente (≤7 dias), em breve (≤30), futuro.
- `fases` é normalizado por `normalizeFases` (aceita JSON em texto, mesmo duplamente serializado, e listas de strings).
- Permissões: rota sem restrição de papel; RLS (migrações 022/070) permite a qualquer autenticado ler e alterar. `programas_financiamento` é também lido pelo BizInControl via RPC `bizin_programas_financiamento` (migração 078).

## Riscos e pontos a rever

- "Equipa online" calcula "hoje" em UTC (`toISOString`) e a picagem grava a data local: entre 00:00 e 01:00 (hora de verão) a lista pode sair vazia ou errada.
- `loadProjectNotifications` corre duas vezes ao montar e ao focar a janela (direto e dentro de `refreshDashboardWorkItems`).
- Chat: polling de 1,2 s por conversa aberta, para além do Realtime; `syncActiveChatMessages` só traz mensagens novas, logo não atualiza reações de mensagens antigas (o comentário no código diz o contrário).
- Chat privado é encontrado por `profiles.nome`: dois colaboradores com o mesmo nome → pode abrir a conversa com a pessoa errada.
- Feed sem paginação (carrega todos os posts, comentários contados e reações).
- `canDelete`/`canEdit` no fórum não incluem o papel `administrador`.


## Videochamadas (Jitsi as a Service)

- **Onde:** botão **Chamada** no topo de uma conversa do chat (`Forum.jsx` → `useChamadas().ligar`). A conversa recebe a mensagem `MSG_CHAMADA` ("📹 Iniciou uma videochamada"), mostrada como cartão com **Entrar**.
- **Gestor global:** `src/context/ChamadasContext.jsx`, montado em `pages/Dashboard.jsx`. Guarda a chamada ativa, que continua aberta ao mudar de página, e mostra a janela `components/VideoChamada.jsx`.
- **Toque:** cada pessoa chamada é uma linha em `chamadas_convites` (migração 079), com os estados `a_tocar` → `aceite` / `recusada` / `perdida` / `cancelada`. Funciona assim:
  - O provider ouve por Realtime as linhas com `para = eu` e mostra o aviso **Atender/Recusar** no topo, com o som `playNotifySound` a cada 2,5 s.
  - Ao fim de 45 s sem resposta, a chamada passa a `perdida`.
  - Quem liga recebe as respostas, também por Realtime, e vê uma mensagem como "X recusou".
  - Ao sair da chamada, os toques pendentes passam a `cancelada`.
- **Em curso / terminada:** quem está numa chamada marca presença no canal Realtime `chamada-presenca-<conversa>` (`useChamadaEmCurso` em `ChamadasContext`, sem tabelas). O cartão mais recente da conversa mostra "Videochamada em curso · N pessoas" com **Entrar**; os outros cartões, ou quando ninguém está na chamada, mostram "Terminada". A última pessoa a sair deixa a mensagem `MSG_CHAMADA_FIM` ("📞 Chamada terminada · 12 min"; textos em `utils/chamadas.js`). Se dois saírem ao mesmo tempo, essa mensagem pode não aparecer, mas o cartão mostra "Terminada" na mesma.
- **Convidar:** o botão **Convidar** da janela abre a lista de colegas ativos. **Chamar** cria um convite, e o convidado entra mesmo sem participar na conversa (a `/api/reunioes` aceita um convite recente, de até 3 h).
- **Segurança:**
  - O token JaaS é gerado no servidor (`/api/reunioes`, que exige 2FA) e vale só para a sala `bizin-chat-<id>`.
  - O "convidar por link" do Jitsi está desligado (`disableInviteFunctions`).
  - **Chamadas internas, sem sala de espera** (decisão de 20/11/2026: não compensa). O link não é mostrado nem partilhável e a sala tem o id da conversa. **Risco aceite:** se alguém copiar à mão o endereço `8x8.vc/<appId>/bizin-chat-<id>` de dentro da chamada, um convidado sem token pode entrar enquanto houver alguém na reunião (e conta para os 25 utilizadores/mês). Se for preciso fechar, voltar a ligar o lobby + recusa automática (`toggleLobby`, `knockingParticipant` → `answerKnockingParticipant(id, false)`) ou procurar na consola do JaaS uma opção para desligar convidados.
  - O nome é fixo, vem do token (`readOnlyName`, `disableProfile`).
  - O RLS de `chamadas_convites` só deixa ver os próprios convites. Só se cria um convite em nome próprio, numa conversa em que se participa. O trigger só deixa mudar o estado.
- **Limites:** o plano gratuito tem 25 utilizadores ativos por mês. Gravação e transcrição estão desligadas no token.
