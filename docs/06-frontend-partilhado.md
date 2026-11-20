# 06 — Frontend partilhado

Componentes, utilitários, constantes e estilos reutilizados por várias páginas, e as
convenções do código. Para a visão geral ver [01-arquitetura.md](01-arquitetura.md); tabelas e
RLS em [03-base-de-dados.md](03-base-de-dados.md); segurança (2FA, cofre, ficheiros privados) em
[04-seguranca.md](04-seguranca.md); rotas `api/*` em [05-api-e-servidor.md](05-api-e-servidor.md);
cada módulo funcional em `docs/modulos/`.

Onde fica o quê:

| Pasta | Conteúdo |
|---|---|
| `src/components/*.jsx` | Componentes partilhados (este documento). Os `pdf*.jsx` são geradores de PDF (ver o módulo respetivo). |
| `src/components/marketing\|admin\|medalhas/` | Componentes de um só módulo (ver `docs/modulos/`). |
| `src/utils/` | Funções sem UI (regras de negócio, acesso ao Supabase, helpers). |
| `src/constants/` | `themes.js` (temas) e `marketing.js` (vocabulário do fluxo de conteúdos). |
| `src/context/` | `AuthContext` (sessão, perfil, 2FA, logout) e `ThemeContext` (tema atual). |
| `src/hooks/` | `useAuth` (atalho para o contexto) e `useTotpEnroll` (configurar 2FA). |
| `src/data/frases.js` | Frases motivacionais do Início. |
| `src/styles/` | Um CSS por área + camadas globais (ver secção 4). |

---

## 1. Catálogo de componentes partilhados

Todos os ficheiros têm um cabeçalho e JSDoc das props; aqui fica o resumo para saber
**qual usar** e **onde já é usado**.

### 1.1 Montados uma vez (infraestrutura)

| Componente | Para que serve | Onde está montado |
|---|---|---|
| `ProtectedRoute` | Guarda de rota. Sem sessão ou com 2FA por validar → `/` (guarda a origem em `state.from` para voltar depois do login). Com `allowedRoles` compara com `profiles.role` (ou `.tipo`), sem maiúsculas; sem permissão → `/dashboard`. Enquanto o perfil carrega mostra `.bz-hold`. **Só esconde ecrãs** — a proteção real são as políticas RLS. | `App.jsx` (à volta de `/dashboard` e de cada rota restrita) |
| `GlobalTooltipProvider` | Qualquer elemento com `title="…"` passa a ter um balão com as cores do tema em vez do tooltip nativo. Remove o `title` enquanto o balão está aberto e repõe-no depois. Não é preciso fazer nada por componente. | `App.jsx` |
| `DialogoGlobal` | Caixa de confirmação/aviso (substitui `window.confirm`/`alert`). Usa-se **só** através de `confirmar()`/`avisar()` de `utils/dialogo.js` (ver 2.1). Camada `--z-dialogo`. | `App.jsx` |
| `Sidebar` | Menu lateral de `/dashboard`: grupos recolhíveis, destaque deslizante do item ativo, itens filtrados por papel, contador "Comunicação Interna" (fórum + chat, com realtime e som), botão "Calendário de Prazos" (abre `WidgetCalendar`) e cartão do utilizador (abre `AccountMenu`). Props: `menuOpen`, `setMenuOpen`, `isMobile`. | `pages/Dashboard.jsx` |
| `AccountMenu` | Menu da conta (portal): Perfil, Ausências, Pedido de km, Tema (`ThemeSelector`), Som das notificações, Terminar sessão. Props: `open`, `onClose`, `anchorRef`, `placement` (`"up"`/`"right"`), `displayName`, `initials`, `roleLabel`. | `Sidebar` |
| `BrandIntro` | Animação de entrada (logo + saudação). Uma vez por separador (`sessionStorage["bz-intro-played"]`); o Login chama `resetBrandIntro()` para voltar a tocar. Clique salta. | `pages/Dashboard.jsx` |
| `ThemeDecor` | Camada fixa, sem cliques, com a decoração animada do tema festivo atual. Some se o utilizador desligar as decorações. Ver 4.4. | `pages/Dashboard.jsx` |
| `ThemeSelector` | Grelha de temas: separadores "Celebrações" (época atual primeiro) e "Básicos", pesquisa, interruptor das decorações. | `AccountMenu` |
| `AuthLayout` (+ `AuthField`, `AuthAlert`, `AuthSubmit`, `AuthDone`) | Layout dos ecrãs públicos. `AuthField.onChange` recebe o **valor**, não o evento. | Login, ForgotPassword, ResetPassword (e SignUp, que não tem rota) |

### 1.2 Peças de formulário e navegação

**`FancySelect`** — substitui o `<select>` nativo (menu num portal, nunca é cortado por `overflow`).

```jsx
<FancySelect
  value={estado}                 // compara como string: ids numéricos funcionam
  onChange={setEstado}           // recebe o value da opção, NÃO um evento
  ariaLabel="Estado"             // obrigatório se não houver <label> visível
  icon={<Filter size={15} />}    // opcional, à esquerda no botão
  options={[
    { value: "", label: "Todos" },
    { value: "pendente", label: "Pendente", hint: "Ainda não começou", group: "Abertos" },
    { value: "em_curso", label: "Em curso", group: "Abertos" },
    { value: "concluido", label: "Concluído", group: "Fechados", icon: <Check size={14} /> },
  ]}
/>
```

- `label` — texto principal; `hint` — segunda linha cinzenta (também é pesquisável);
  `group` — cabeçalho que aparece quando o grupo muda em relação à opção anterior
  (**ordenar as opções por grupo** antes de passar); `icon` — nó React.
- Com 7 ou mais opções aparece uma caixa de pesquisa (ignora acentos).
- Teclado: ↓/Enter/Espaço abre, ↑↓ navega, Enter escolhe, Esc fecha.
- Outras props: `placeholder`, `className` (no botão), `menuWidth` (mín. 320), `searchPlaceholder`.
- Usado em Ausências, RH, Minhas Tarefas, Tarefas, Perfil, Ativos TI, Ações de Formação,
  Registos, Marketing e `components/marketing/*`.

**`SlidingTabs`** — abas com destaque deslizante (o mesmo efeito da Sidebar).
Props: `tabs=[{ id, label, count?, tone?, icon? }]`, `value`, `onChange(id)`,
`variant="pill"|"underline"`, `ariaLabel`, `className`. Controlado; não renderiza o conteúdo.
Usado no Início e no Marketing.

**`OtpInput`** — 6 caixas para o código 2FA; aceita colar, setas, backspace e o
preenchimento automático `one-time-code`. Props: `value`, `onChange`, `length`, `autoFocus`,
`disabled`, `invalid`, `onComplete(code)`. Usado no Login, ResetPassword e TwoFactorSetup.

**`TwoFactorSetup`** — cartão "Autenticação de dois fatores" do Perfil (o 2FA é obrigatório:
não há "desativar", só "Mudar de telemóvel", que cria o fator novo e só depois apaga o antigo).
Exporta também `TotpEnrollSteps` (QR + chave + código), reutilizado no Login no primeiro acesso.
A lógica está em `hooks/useTotpEnroll`. Ver [04-seguranca.md](04-seguranca.md).

### 1.3 Avisos, diálogos e painéis

**`AvisoToast`** — o único toast da app. Não se fecha sozinho: o padrão é o da secção 5.3.
Props: `tipo` (`success`/`error`/`warning`/`info`), `mensagem`, `children` (ex.: botão "Anular"),
`style`. Erros/avisos usam `role="alert"`, sucesso/info `role="status"`.

**`NotificationsPanel`** — painel do sino do Início (ancorado ao sino no desktop, *bottom sheet*
no mobile ≤640px). Só apresentação: o Início (`pages/DashboardHome.jsx`) lê
`notificacoes_projetos` (`is_read = false`) e grava `is_read/read_at`.
Props: `open`, `onClose`, `anchorRef`, `items`, `loading`, `onOpenItem(n)`, `onMarkRead(id)`,
`onMarkAll()`. Agrupa em "Hoje / Esta semana / Anteriores".

Tipos de notificação (`notificacoes_projetos.tipo`) com aspeto próprio no painel (mapa `TIPO`):

| `tipo` | Criado por | Ícone / botão |
|---|---|---|
| `project_created` | `pages/Projetos.jsx` (é o *default* da coluna) | Foguete, "Abrir projeto" |
| `mk_aprovacao` | `components/marketing/mkAprovacao.js` (conteúdo enviado para aprovar) | Carimbo, "Rever e aprovar" |
| `mk_aprovado` | idem (aprovado) | Visto, "Abrir no Marketing" |
| `mk_alteracoes` | idem (pedidas alterações) | Seta para trás, "Ver alterações" |
| `seguranca` | Triggers de alertas de segurança (migração 075) | Escudo, "Ver alerta" |
| `absence_status_changed` | `utils/decisaoPedido.js` e RH (decisão de ausência) | **Nunca aparece**: não está no filtro do Início nem no mapa `TIPO` (ver secção 7) |

O Início só carrega os tipos `project_created`, `mk_*` e `seguranca`
(`.in("tipo", […])` em `DashboardHome.jsx`). Para criar notificações a partir do frontend usar
`createDashboardNotifications` (2.2). Ao inventar um tipo novo: acrescentar ao filtro do
`DashboardHome` **e** a entrada em `TIPO` no `NotificationsPanel`.

**`ProfilePeek`** — cartão de um colega aberto a partir da "Equipa online" do Início:
contactos com copiar/ligar/email, aniversário e medalhas (`components/medalhas`).
Props: `entry` (registo de assiduidade com `profiles` e `user_id`), `onClose`.

**`ImagemPrivada`** — `<img>` para ficheiros em baldes privados: troca o link "público"
guardado na BD por um link assinado (10 min). Props: `src`, `alt`, resto vai para o `<img>`.
Usado no Fórum/Chat. Para links `<a href>` não é preciso nada (ver `ficheirosPrivados`, 2.3).

### 1.4 Cronómetros de tarefas

Regra: **cada utilizador só tem um cronómetro ativo** (`task_logs` com `end_time` nulo).
O fluxo, repetido em Tarefas, Minhas Tarefas, Projetos, ProjetoDetalhe, Atividades, Clientes,
Fórum e Início, é:

1. Antes de arrancar, `hasAttendanceStartedToday` (`utils/attendanceGuard.js`); se ainda não
   picou o ponto, a página oferece `startAttendanceNow`.
2. Se já há um log ativo, `resolveActiveTimerMeta(supabase, log)` (`utils/activeTimerResolver.js`)
   dá o título "Cliente - Projeto - Item" e mostra-se o **`TimerSwitchModal`**
   (props `open`, `title`, `message`, `onCancel`, `onConfirm`, `cancelLabel`, `confirmLabel`).
3. Ao confirmar a troca ou ao parar: **`StopTimerNoteModal`** pede nota e, com
   `showStatusOption`, o novo estado do item. Se o estado for `em_analise` pede ainda destino
   (próprio/colega/cliente/contabilista/organismo), data prevista de retorno e o colega
   (`profiles`) ou o contacto do cliente (`contactos_cliente`, descobertos a partir de
   `analysisTargetLog`). Devolve `onConfirm(nota, concluir, extra)`.
4. A página grava com `utils/taskTimerLifecycle.js`:
   - `closeAllActiveTaskLogsForUser(supabase, userId, { note })` — fecha todos os logs abertos
     (duração em minutos, mínimo 1). Também é chamado no logout (AuthContext) e na saída do dia
     (WidgetAssiduidade).
   - `applyStopStatusUpdateForLogTarget(supabase, log, extra)` — muda o estado do item
     (tarefa → atividade → subtarefa → projeto), grava os campos `analise_*` e, se o destino for
     um colega, junta-o a `colaboradores_extra`. Tolera a falta das colunas `analise_*`.
5. Dispara `window.dispatchEvent(new CustomEvent("task-logs-updated"))` para outros
   componentes (WidgetAssiduidade, Início) recarregarem.

### 1.5 Widgets de RH, calendário e projetos

| Componente | Para que serve | Props principais | Onde |
|---|---|---|---|
| `WidgetAssiduidade` | Picar o ponto: entrada, pausa/retomar, saída (`assiduidade`). Na entrada escolhe tarefas planeadas; na saída pede resumo e fecha cronómetros. Avisa de itens "em análise" com retorno hoje e dos encaminhados por colegas. Ouve `attendance-updated` e `task-logs-updated`. | `onViewHistory?` | Início |
| `WidgetCalendar` | "Calendário de Prazos": vistas ano/mês/dia com feriados, aniversários, ausências aprovadas e agenda pessoal (tabela `agenda`, com criar/editar/apagar/arrastar). | `onClose` | Modal da Sidebar |
| `CalendarioColaborador` | Calendário mensal de um colaborador para os RH: assiduidade, ausências, feriados, tolerâncias e estado temporário; editar/apagar o dia, preencher o mês em lote, gerir tolerâncias. Sincroniza o saldo de férias depois de mudanças. | `userId`, `userName`, `dataAdmissao`, `estadoTemporario`, `onVacationBalanceUpdated`, `onMonthChange` | RH |
| `CalculadoraKm` | Mapa Leaflet + pesquisa (Photon/OSM) + rota real (OSRM) para pedidos de km. Escreve `km_origem`, `km_destino`, `km_total`, `km_ida_volta` no formulário do pai. Ao editar um pedido antigo não reescreve `km_total`. | `form`, `setForm` | Ausências / Pedido de km |
| `ProjetoTracker` | Percurso do projeto (Pendente → Em curso → Em análise → Concluído → Encerrado) e histórico de estados de projeto/atividades/tarefas (`projetos_estado_historico`). | `projeto`, `atividades`, `historicoAberto` | ProjetoDetalhe |
| `GestaoTemplates` | Na verdade uma **página** (rota `/dashboard/modelos`): árvore `tipos_projeto → template_atividades → template_tarefas → template_subtarefas`. | — | `App.jsx` |

Os serviços do `CalculadoraKm` (Photon, OSRM, tiles do OpenStreetMap) são públicos e gratuitos,
sem chave nem SLA: se deixarem de responder, o utilizador pode escrever os km à mão.

---

## 2. Catálogo de utilitários (`src/utils/`)

Assinaturas resumidas; o JSDoc completo está em cada ficheiro.

### 2.1 UI e acessibilidade

| Função | Ficheiro | Descrição |
|---|---|---|
| `confirmar(titulo, { mensagem?, botao?, perigoso? }) → Promise<boolean>` | `dialogo.js` | Confirmação no estilo da app. `perigoso` = botão vermelho. Esc/fora = `false`. |
| `avisar(titulo, { mensagem?, botao? }) → Promise<true>` | `dialogo.js` | Aviso com um botão ("Entendido"). |
| `registarDialogo(fn) → cleanup` | `dialogo.js` | Uso interno do `DialogoGlobal`. Sem ele montado, cai para `window.confirm/alert`. |
| `clicavel(acao, { papel = "button" }) → props` | `clicavel.js` | `role`, `tabIndex=0`, `onClick` e Enter/Espaço para `<div>`/`<tr>` clicáveis. `papel: null` em linhas de tabela. |
| `isDecorEnabled()`, `setDecorEnabled(on)`, `onDecorChange(cb) → cleanup` | `themeDecor.js` | Preferência das decorações animadas (`localStorage["bz-theme-decor"]` + evento `bz-theme-decor-change`). |
| `BRAND_INTRO_KEY`, `resetBrandIntro()` | `brandIntro.js` | Controlo da intro (sessionStorage). |
| `bindNotificationUnlock()` | `notifySound.js` | No 1.º clique/tecla acorda o áudio e pede (uma vez) permissão de notificações. |
| `isNotifySoundEnabled()`, `setNotifySoundEnabled(on)` | `notifySound.js` | Preferência do som (`localStorage["bz-notify-sound"]`). |
| `playNotifySound()` | `notifySound.js` | "Ding-dong" com Web Audio (sem ficheiros de som). |
| `announceNewMessages({ total, onClick })` | `notifySound.js` | Separador visível → som; escondido → notificação do Windows/macOS. |

### 2.2 Supabase, servidor e auditoria

| Função | Ficheiro | Descrição |
|---|---|---|
| `postAutenticado(url, body) → Response` | `apiAutenticada.js` | POST JSON com `Authorization: Bearer <JWT da sessão>`. Não lança em 4xx/5xx: verificar `r.ok`. |
| `getAutenticado(url) → Response` | `apiAutenticada.js` | GET com o mesmo cabeçalho. |
| `consultarNif(nif) → Response` | `apiAutenticada.js` | `GET {VITE_MARKETING_API_BASE}/api/nif?q=`; a chave do nif.pt fica no servidor. |
| `registarEvento(acao, detalhes?)` | `registarEvento.js` | RPC `registar_evento` → `audit_log`. Nunca lança. Só para ações que **não** alteram tabelas (login, exportar…); os INSERT/UPDATE/DELETE já são registados por triggers. |
| `TABELAS`, `nomeTabela(t)`, `VERBO`, `EVENTOS`, `rotuloRegisto(r)` | `auditoria.js` | Textos legíveis do `audit_log` para Registos e Admin. **Evento novo → acrescentar a frase em `EVENTOS`.** |
| `reportarTentativaFalhada(email, motivo)` | `alertasSeguranca.js` | Login/2FA falhado → `/api/seguranca/tentativa` (sem palavra-passe nem código). |
| `registarLoginSeguro()` | `alertasSeguranca.js` | Login com sucesso → `/api/seguranca/login` (IP/país); sem servidor, regista `login` na BD. |
| `createDashboardNotifications({ supabaseClient, recipientIds, createdBy?, type, title, message, link? })` | `dashboardNotifications.js` | Insere em `notificacoes_projetos` (uma por destinatário) e dispara `project-notifications-updated`. Lança se falhar. |
| `uuidSeguro(v)`, `dataSegura(v)` | `filtroSeguro.js` | **Obrigatório** ao interpolar valores em filtros de texto (`.or("user_id.eq.${uuidSeguro(id)}")`): só passam UUIDs/datas válidos; o resto vira um UUID nulo / `1970-01-01`. |
| `CONTA_DESATIVADA`, `AVISO_LOGIN_KEY` | `contaDesativada.js` | Mensagem de conta desativada e chave usada para a passar ao Login. |

### 2.3 Dados sensíveis e ficheiros privados

| Função | Ficheiro | Descrição |
|---|---|---|
| `CAMPOS_PRIVADOS` | `dadosPrivados.js` | Colunas que vivem em `profiles_privado` (NIF, NISS, CC, morada, estado civil, nº dependentes, valor SA…). |
| `juntarPrivados(perfis) → perfis`, `juntarPrivado(perfil)` | `dadosPrivados.js` | Junta os dados privados que o utilizador pode ver (o próprio ou RH). |
| `separarPrivados(payload) → { publico, privado }` | `dadosPrivados.js` | Antes de gravar um perfil. |
| `guardarPrivados(userId, privado) → { error }` | `dadosPrivados.js` | Upsert em `profiles_privado`; sem a tabela, grava em `profiles` (compatibilidade). |
| `BALDES_PRIVADOS` | `ficheirosPrivados.js` | `rh_anexos`, `documentos`, `chat_ficheiros`. Balde privado novo → acrescentar aqui. |
| `ficheiroPrivado(url) → { bucket, path } \| null` | `ficheirosPrivados.js` | Identifica links de baldes privados. |
| `urlAssinado(url) → Promise<string>` | `ficheirosPrivados.js` | Link assinado de 10 min (com cache). |
| `abrirFicheiro(url)` | `ficheirosPrivados.js` | Abre num separador novo (abre primeiro o separador para não ser bloqueado). |
| `instalarAberturaSegura()` | `ficheirosPrivados.js` | Chamado em `main.jsx`: interceta **todos** os cliques em `<a href>` para baldes privados. |
| `useUrlAssinado(url)` | `ficheirosPrivados.js` | Hook para `<img src>` (usado pelo `ImagemPrivada`). |
| `semPalavraPasse(linhas, tabela)` | `cofre.js` | Remove a coluna antiga da palavra-passe e acrescenta `tem_palavra_passe`. |
| `revelarPalavraPasse(tabela, id) → string` | `cofre.js` | RPC `cofre_revelar` (Supabase Vault); fica em `audit_log` como `credencial_revelada`. Só chamar quando o utilizador carrega em mostrar/copiar. |
| `guardarPalavraPasse(tabela, id, valor)` | `cofre.js` | RPC `cofre_guardar` (vazio = remover). `tabela` = `acessos_cliente` (Clientes) ou `acessos` (Ativos TI). |

### 2.4 Férias, ausências e assiduidade — `feriasSaldo.js`

O ficheiro mais importante de regras de negócio. Tabelas: `ferias` (pedidos de ausência,
**tolerâncias de ponto** e **pedidos de km**, distinguidos por `tipo`), `vacation_balances`
(saldo por `user_id` + `ano`) e `profiles` (`data_admissao`, `dias_ferias_total`; `dias_ferias`
é o campo antigo). Ver também [modulos/rh-ferias-ausencias.md](modulos/rh-ferias-ausencias.md).

**Regra das férias do ano de admissão** — `calcularFeriasAnoAdmissao(dataAdmissao) → number|null`:

- Mês de entrada: **2 dias** se entra até ao 1.º dia útil do mês (inclusive, ou antes dele —
  ex.: num fim de semana); **1 dia** se entra até ao dia 15; **0** se entra depois do dia 15.
- **+2 dias por cada mês seguinte** até dezembro.
- **Máximo 20 dias.**
- Nos anos seguintes: **22 dias** (`ANNUAL_VACATION_DAYS`).

Exemplos: 2026-03-02 (1.º dia útil de março) → 2 + 2×9 = 20; 2026-09-10 → 1 + 2×3 = 7;
2026-11-20 → 0 + 2×1 = 2. No painel de RH esta função só **sugere** o "Limite anual" ao mudar a
data de admissão (`RecursosHumanos.jsx`, `limiteAutomatico`); os RH podem alterar e o valor
efetivo é `profiles.dias_ferias_total`.

Outras regras: dias não gozados **transitam** para o ano seguinte e expiram a **31 de março**;
parciais contam **horas/8**; fins de semana, feriados e tolerâncias não contam; marcar férias do
ano seguinte só a partir de **1 de dezembro**; a assiduidade conta a partir da data mais tardia
entre a admissão e `ATTENDANCE_GLOBAL_CUTOFF` (2026-03-01).

| Função | Descrição |
|---|---|
| `ANNUAL_VACATION_DAYS` (22), `ATTENDANCE_GLOBAL_CUTOFF`, `TOLERANCIA_TIPO`, `TOLERANCIA_TIPOS`, `COLLABORATOR_STATUS_TYPES` | Constantes. |
| `resolveAnnualVacationLimit(v)` | Número positivo ou 22. |
| `getAnnualVacationLimitFromProfile(perfil)` | `dias_ferias_total ?? dias_ferias`, ou 22. |
| `getAnnualVacationLimitForYear({ diasLimiteAnual, dataAdmissao, ano })` | Antes da admissão 0; ano de admissão = limite dos RH; depois 22. |
| `normalizeAbsenceType(t)`, `isVacationType(t)`, `isCollaboratorStatusType(t)`, `formatAbsenceTypeLabel(t)` | Comparação de tipos sem acentos. |
| `parseLocalDate(v) → Date\|null`, `formatDateKey(v) → "AAAA-MM-DD"` | Datas em hora **local** (nunca usar `new Date("AAAA-MM-DD")`, que é UTC). |
| `getFeriados(ano) → [{ d, m, nome }]` | Feriados nacionais + Carnaval + feriado municipal de Faro (7/9). `m` é 0-based. |
| `isHoliday(date)` | |
| `buildToleranciasSkipSet(tolerancias, userId) → Set` | Datas a ignorar (globais + do utilizador). |
| `obterToleranciasAtivas({ supabaseClient, userId? })` | Lê tolerâncias não canceladas/rejeitadas. |
| `getAttendanceCalculationStartDate(dataAdmissao, cutoff?)` | |
| `calcularDiasUteis(inicio, fim?, skip?)` | Dias úteis inclusive. |
| `calcularDiasUteisNoPeriodo(...)`, `calcularDiasUteisNoMes(inicio, fim, ano, mes, skip?)`, `calcularDiasFeriasNoAno(inicio, fim, ano, skip?)`, `getYearsInRange(inicio, fim)` | Recortes do intervalo. |
| `isVacationBookingBeforeAnnualOpening(dataInicio, ref?)`, `isAnnualVacationOpeningAvailable(ref?)` | Abertura a 1 de dezembro. |
| `obterSaldoFeriasAno({...})` | Saldo só a partir de pedidos aprovados (sem transitados). |
| `obterSaldoFeriasAnoComTransicao({...})` | Saldo para mostrar: usa `vacation_balances` se existir, senão calcula; inclui transitados válidos. |
| `validarSaldoFeriasParaIntervalo({...}) → { ok, ano?, diasPedidoNoAno?, diasDisponiveis?, detalhes }` | Antes de criar/aprovar: conta aprovados + pendentes, ano a ano. |
| `sincronizarSaldoFeriasPerfil({ supabaseClient, userId, ano, diasLimiteAnual, dataAdmissao?, tolerancias? })` | Upsert em `vacation_balances`; chamar sempre depois de aprovar/cancelar/editar férias. |

**`decisaoPedido.js`** — decisão dos RH sobre um pedido (usado em `AprovarPedido`, a página aberta
pelo link do email):

| Função | Descrição |
|---|---|
| `ACOES` | `aprovar`/`rejeitar` (de `pendente`), `aceitar_cancelamento`/`recusar_cancelamento` (de `pedido_cancelamento`). |
| `KM_REQUEST_TYPE`, `ehPedidoKm(p)` | Pedidos de km vivem em `ferias` com `tipo = "Pedido de Km's"`. |
| `diasDoPedido(pedido, tolerancias?)` | Dias úteis ou horas/8. |
| `decidirPedido({ pedido, acao, perfil, autorId }) → novoEstado` | Valida transição e saldo, faz `UPDATE … WHERE estado = antigo` (evita decidir duas vezes), notifica o colaborador e sincroniza o saldo. Lança erros com texto para o utilizador. |
| `fmtDias(n)` | "1 dia", "0,5 dias". |

**`attendanceGuard.js`** — `hasAttendanceStartedToday(supabase, userId)` e
`startAttendanceNow(supabase, userId)` (ver 1.4).

### 2.5 Projetos, tarefas e cronómetros

| Função | Ficheiro | Descrição |
|---|---|---|
| `resolveActiveTimerMeta(supabase, log) → { title, route, projectId, locationLabel }` | `activeTimerResolver.js` | Ver 1.4. |
| `closeAllActiveTaskLogsForUser(supabase, userId, { note? }) → { closedCount, errors }` | `taskTimerLifecycle.js` | Ver 1.4. |
| `applyStopStatusUpdateForLogTarget(supabase, log, statusMeta) → { applied, skipped, … }` | `taskTimerLifecycle.js` | Ver 1.4. |
| `concludeActivityWithChildren(supabase, atividadeId) → { error, taskIds }` | `activityStatusCascade.js` | Conclui atividade + tarefas (com `data_conclusao`) + subtarefas. Não é transacional. |
| `buildDependencyMaps(atividades, tarefas)`, `getActivityBlockReason(a, mapa)`, `getTaskBlockReason(t, tarefas, atividades)`, `isConcludedState(e)` | `dependencyGuards.js` | Bloqueios por `depende_de_atividade_id`/`depende_de_tarefa_id` (salvo `ignorar_dependencia`). Devolvem o texto do motivo ou `null`. |

### 2.6 Organizador de PDFs

Tudo corre no browser; só o texto **redigido** pode ir para a IA. Ver
[modulos/ferramentas.md](modulos/ferramentas.md).

| Função | Ficheiro | Descrição |
|---|---|---|
| `PDF_CATEGORIES` | `pdfOrganizerEngine.js` | Faturas, Vencimentos, Extratos bancários, Gastos, Contratos, Guias, Impostos / Estado, Outros. |
| `normalizeText`, `extractNif(s)`, `extractNifs`, `isValidNif` (mód. 11), `extractAtcud`, `extractDocumentNumber`, `extractDocumentDate → { dateStr, year }`, `extractEntity(text, cat)`, `classifyCategory(text, nome?)`, `isBlankPage`, `pageKind`, `pageAmounts`, `paymentRefs`, `analyzePage` | `pdfOrganizerEngine.js` | Extração por regex sobre texto OCR/pdf.js. Fornecedores conhecidos (com NIF) no catálogo interno `KNOWN_ENTITIES`; `nameForNif`, `isKnownName`. |
| `computeBreaks(pages) → boolean[]` | `pdfOrganizerEngine.js` | Onde começa cada documento. Regra: na dúvida, não corta. |
| `parseFiscalQr(raw)` | `faturasQr.js` | Lê o QR fiscal da AT (Portaria 195/2020): NIF emitente/cliente, tipo, data, nº, ATCUD, total. |
| `inkStrip(canvas)`, `cropCanvas(canvas, strip)`, `findFiscalQr(canvas, strip?)` | `faturasQr.js` | Procura o QR na página (com jsQR), por zonas. |
| `segmentPages(pages)` | `faturasQr.js` | `computeBreaks` corrigido pelo QR (mesmo QR = mesmo documento). |
| `buildDocMeta(pages, learned?, clientNifs?)`, `buildFilename(meta)`, `buildFolder(meta)`, `headerName`, `TIPOS_DOC` | `faturasQr.js` | Metadados, nome (`data_Fornecedor_Tipo_Nº`) e pasta (`Ano/Categoria`) no ZIP. |
| `redigir(texto)` | `iaRedacao.js` | Tapa NIF de pessoas, NISS, IBAN, contas, cartões, emails, telemóveis e nomes antes de enviar à IA. Mantém NIF de empresas, valores e datas. |

`pdfOrganizerEngine.js` também é importado pelo servidor (`api/organizador/ia.js`): não pode
importar nada que só exista no browser.

---

## 3. Constantes e dados

- **`src/constants/themes.js`** — `THEMES` (chave → tema), `DEFAULT_THEME = "default"`,
  `THEME_KEYS`, `isThemeInSeason(tema, data?)`. Cada tema nasce de **duas cores**
  (`createTheme(nome, descrição, fundoClaro, corEscura)`) que geram ~20 tokens. Ver 4.4.
- **`src/constants/marketing.js`** — `ETAPAS` (fluxo de conteúdos), `ESTADO_IDEIA`,
  `ESTADO_ARQUIVO`, `ESTADOS_TODOS`, `estadoInfo(id)`, `CANAIS`/`canalInfo`, `FORMATOS`,
  `OBJETIVOS`, `ESTRATEGIAS`, `EDITORIAS`, `PRIORIDADES`, `METRICAS`, `AVALIACOES`,
  `CORES_MARCA`, `GENEROS`, `RENDIMENTOS`. Os `id` são valores gravados na BD
  (`marketing_conteudos.estado`, ver migração 063); mudar um `id` obriga a migrar dados.
- **`src/data/frases.js`** — `frasesMotivacionais`; o Início escolhe uma por dia.
- `src/data/CAE rev4.xlsx - Table 1.csv` — tabela CAE de origem (referência).

---

## 4. Estilos

### 4.1 Organização de `src/styles/`

Sem CSS-in-JS nem Tailwind: CSS simples, **um ficheiro por área**, importado pelo componente/página
que o usa. Classes com prefixo da área para não colidirem.

| Ficheiro | Importado por | Prefixos típicos |
|---|---|---|
| `camadas.css` | `main.jsx` | tokens `--z-*` |
| `main.css` | `main.jsx` | base global, `.bz-*` |
| `motion.css` | `main.jsx` | animações, layout mobile, sidebar, menus, toasts |
| `acessibilidade.css` | `main.jsx` (último) | foco, toque, movimento reduzido |
| `dashboard.css` | Sidebar, Dashboard e a maioria das páginas | `.dashboard-*`, `.sidebar-*`, `.toast-container`, cartões, tabelas, modais genéricos |
| `auth.css` | AuthLayout | `.au-*` |
| `otp.css` | OtpInput, TwoFactorSetup | `.otp*`, `.tf-*` |
| `fancy-select.css` | FancySelect | `.fs-*` |
| `dialogo.css` | DialogoGlobal | `.dlg-*` |
| `home.css` | DashboardHome (inclui `.np-*` do NotificationsPanel e `.pp-*` do ProfilePeek) | |
| `calendar.css`, `calendario-colaborador.css`, `attendance.css`, `km.css`, `projeto-tracker.css`, `templates.css`, `themeSelector.css`, `theme-decor.css`, `theme-decor-extra.css`, `medalhas.css` | o componente com o mesmo nome | |
| `absences.css`, `admin.css`, `agenda.css`, `aprovar-pedido.css`, `ativos-ti.css`, `entidades.css`, `formacao.css`, `forum.css`, `marketing.css`, `portfolio.css`, `profile.css`, `programas.css`, `projeto-detalhe.css`, `registos.css`, `rh.css`, `seguranca-mfa.css`, `tarefas.css` | a página respetiva | |

Ordem de carregamento: os CSS das páginas entram primeiro (via `App.jsx`); depois `main.jsx`
carrega `camadas`, `main`, `motion` e `acessibilidade`, que por isso ganham em empates de
especificidade.

Mobile: a app muda para gaveta + barra superior/inferior a **≤900px** (`pages/Dashboard.jsx`,
`MOBILE_QUERY`); o painel de notificações usa *bottom sheet* a ≤640px.

### 4.2 Camadas (z-index) — `camadas.css`

Usar **sempre** os tokens (`z-index: var(--z-modal)` ou `style={{ zIndex: "var(--z-modal)" }}`);
um degrau acima faz-se com `calc(var(--z-modal) + 1)`. Números soltos só abaixo de 100
(dentro de um componente).

| Token | Valor | Para quê |
|---|---|---|
| `--z-app` | 100 | Sidebar, barras fixas, navegação móvel, controlos do mapa |
| `--z-modal` | 1000 | Janelas e painéis laterais normais |
| `--z-modal-topo` | 2000 | Janelas por cima de outras janelas, menus de escolha (TimerSwitchModal, ProfilePeek) |
| `--z-modal-max` | 3000 | Janelas de ecrã inteiro (Fórum, Clientes, Projeto) |
| `--z-dialogo` | 4000 | `DialogoGlobal` e ecrã de carregamento |
| `--z-toast` | 5000 | Toasts, sempre por cima de tudo |

### 4.3 Acessibilidade — `acessibilidade.css`

Regras globais (não é preciso repetir nos componentes):

- **Foco visível só com teclado** (`:focus-visible`) com a cor do tema em botões, links,
  `[role=button|tab|option…]` e `[tabindex]`.
- **Alvos de toque de 44×44 px** em ecrãs táteis (`@media (pointer: coarse)`) para botões só
  com ícone — **por isso os botões só com ícone têm de ter `aria-label`** (é o seletor usado).
- Campos com letra ≥16px em ecrãs táteis (evita o zoom do iPhone).
- `prefers-reduced-motion`: anula animações e transições.
- `touch-action: manipulation`, sem realce azul ao tocar; `cursor: pointer` em `[role=button]`.
- `scroll-margin-top: 80px` em âncoras; `overscroll-behavior: contain` em diálogos.

Para elementos clicáveis que não são `<button>` usar `clicavel()` (2.1).

### 4.4 Temas

- **Definição:** `src/constants/themes.js`. `THEME_CATALOG` = temas básicos (só paleta);
  `FESTIVE_CATALOG` = temas de celebração com `decor` e época sugerida `["MM-DD","MM-DD"]`
  (pode atravessar o fim do ano).
- **Aplicação:** `src/context/ThemeContext.jsx` copia `theme.colors` para variáveis CSS
  `--color-<chave>` em `:root` (ex.: `--color-btnPrimary`, `--color-textPrimary`,
  `--color-bgSecondary`, `--color-borderColor`, `--color-sidebarBg`) e também
  `--color-bgGradient`, `--color-sidebarBgSecondary`, `--color-accentColor`. Guarda a escolha em
  `localStorage["app-theme"]`. A troca usa *View Transitions* (classe `bz-theme-transition`)
  quando o browser suporta e o utilizador não pediu movimento reduzido.
- **Nos CSS:** usar sempre `var(--color-…)` para cores de marca/fundo/texto principal; nunca
  codificar o azul/escuro da marca.
- **Decorações:** `ThemeDecor.jsx` (formas SVG em `SHAPES`, configuração por decoração em
  `DECOR`, emblema do seletor em `DecorEmblem`) e `ThemeDecorExtra.jsx` (Café, Livraria, F1,
  Páscoa-Ressurreição: `EXTRA_SHAPES`, `EXTRA_DECOR`, `ExtraScene`, `ExtraEmblem`). Camada
  `pointer-events: none`. Preferência ligar/desligar em `utils/themeDecor.js`.
- **Tema novo:** uma linha no catálogo. Festivo: escolher uma `decor` existente ou criar a
  configuração em `DECOR`/`EXTRA_DECOR` + emblema.
- `REFERENCIA_TEMAS.txt` (raiz) está **desatualizado** (fala em 8 temas); a fonte de verdade é
  `themes.js`.

### 4.5 Animações — `motion.css`

Tokens: `--bz-ease-out`, `--bz-ease-spring`, `--bz-ease-in-out`, `--bz-dur-fast` (160ms),
`--bz-dur` (280ms), `--bz-dur-slow` (460ms), `--bz-topbar-h`, `--bz-bottomnav-h`.
Keyframes reutilizáveis: `bzPageIn`, `bzRise`, `bzTabIn`, `bzFadeIn`, `bzPopIn`,
`bzSlideFromRight`, `bzSlideUp`, `bzTitleIn`, `bzIndicatorIn`, `bzPillIn`.
Classes prontas: `.bz-route` (entrada escalonada ao mudar de rota), `.bz-tab-panel` (troca de
abas), abertura de modais/painéis, micro-interações de botões/cartões/inputs, destaque da
Sidebar (`.sidebar-active-pill`) e menu da conta (`.bz-account-*`). Preferir estes tokens e
keyframes a criar animações novas.

### 4.6 Cores, contraste e ícones

- **Cinzento mínimo para texto: `#64748b`** (slate-500) sobre fundo branco/claro. Tons mais
  claros (`#94a3b8`, `#cbd5e1`) só para bordas, ícones decorativos ou texto desativado.
- **Ícones: `lucide-react`** (`import { Calendar } from "lucide-react"`), com `aria-hidden` se
  forem decorativos e `aria-label` no botão se forem o único conteúdo. **Sem emojis na UI**
  (houve uma limpeza explícita — commits "remoção emojis da plataforma"). Vários componentes
  antigos ainda têm SVG inline copiados do Lucide (Sidebar, NotificationsPanel, AuthLayout…):
  funciona igual; em código novo usar o pacote.

---

## 5. Convenções do código

### 5.1 Nomes e língua

- Interface, comentários, mensagens de erro e nomes novos em **português de Portugal**
  (`confirmar`, `abrirFicheiro`, `diasDoPedido`). Há código antigo com nomes em inglês
  (`closeAllActiveTaskLogsForUser`, `isVacationType`) — não renomear só por renomear.
- Tabelas e colunas na BD em português e `snake_case` (`ferias`, `data_inicio`), com exceções
  históricas (`task_logs`, `vacation_balances`, `profiles`).
- Tratamento por "tu" na maior parte das mensagens da app; textos de RH/ausências usam "o seu
  pedido" (formal). Seguir o que já existe no ecrã.

### 5.2 Chamadas ao Supabase

```js
import { supabase } from "../services/supabase";

const { data, error } = await supabase
  .from("tarefas")
  .select("id, titulo, atividades(projeto_id, projetos(titulo, clientes(marca, sigla)))")
  .eq("responsavel_id", user.id)
  .order("created_at", { ascending: false });
if (error) { showToast("Não foi possível carregar as tarefas.", "error"); return; }
```

- Sempre desestruturar `{ data, error }` e tratar o `error` (o cliente **não lança**).
- Joins embutidos podem vir como objeto ou array de 1 elemento: normalizar
  (`Array.isArray(x) ? x[0] : x`, como em `activeTimerResolver`).
- Filtros de texto (`.or(...)`) **sempre** com `uuidSeguro`/`dataSegura`.
- `.maybeSingle()` quando pode não haver linha; `.single()` só quando tem de haver.
- Atualizações concorrentes: condicionar ao estado antigo (`.eq("estado", antigo).select("id")`
  e verificar se mudou alguma linha), como em `decidirPedido`.
- Compatibilidade com migrações por correr: o código antigo tolera `42P01` (tabela não existe)
  e `42703` (coluna não existe). Em código novo, preferir exigir a migração.
- Rotas do servidor (chaves privadas: email, IA, nif.pt) via `postAutenticado`/`getAutenticado`.
- Ações sem alteração de dados que devam ficar no histórico → `registarEvento`.
- Eventos `window` usados para sincronizar componentes: `attendance-updated`,
  `task-logs-updated`, `project-notifications-updated`, `bz-theme-decor-change`.

### 5.3 Toasts

Padrão repetido nas páginas (não há contexto global de toasts):

```jsx
const [notification, setNotification] = useState(null);
const showToast = (message, type = "success") => {
  setNotification({ message, type });
  setTimeout(() => setNotification(null), 3000);
};
// …
{notification && <AvisoToast tipo={notification.type} mensagem={notification.message} />}
```

Mensagens curtas, a dizer o que aconteceu ("Tarefa guardada.", "Não foi possível apagar o
registo."). Não usar `alert()`.

### 5.4 Confirmações

```js
import { confirmar, avisar } from "../utils/dialogo";

if (!(await confirmar("Apagar este registo?", { perigoso: true, botao: "Apagar",
  mensagem: "Esta ação não pode ser anulada." }))) return;
```

Nunca `window.confirm`/`window.alert`. Exceções antigas com diálogo próprio: `GestaoTemplates`
(`confirmDialog`) e `OrganizadorPdf` (`askConfirm`).

### 5.5 Como adicionar uma página nova

1. **Página:** `src/pages/MinhaPagina.jsx` (export default). CSS próprio em
   `src/styles/minha-pagina.css`, importado pela página, com classes prefixadas.
2. **Rota** em `src/App.jsx`, dentro de `<Route path="/dashboard" …>` (herda Sidebar, tema e
   proteção de sessão):
   ```jsx
   <Route path="minha-pagina" element={
     <ProtectedRoute allowedRoles={["admin", "administrador", "gestor"]}><MinhaPagina /></ProtectedRoute>
   } />
   ```
   Sem `allowedRoles` qualquer utilizador autenticado entra. A app usa `HashRouter`: os links
   ficam `/#/dashboard/minha-pagina` (importante em emails e notificações).
3. **Entrada na Sidebar** (`src/components/Sidebar.jsx`): um `<li className={isActive('/dashboard/minha-pagina')}>`
   com `<Link to=… title={getSidebarTooltip("…")}>`, ícone e `<span className="link-text">`, no
   grupo certo. Envolver com a **mesma** condição de papel da rota, p. ex.
   `{['admin', 'gestor'].includes(userProfile?.role) && (…)}`.
4. **Permissões na BD:** criar/ajustar políticas RLS numa migração nova em
   `supabase/migrations/` — a rota e a Sidebar só escondem ecrãs. Ver
   [03-base-de-dados.md](03-base-de-dados.md) e [04-seguranca.md](04-seguranca.md).
5. **Auditoria:** acrescentar as tabelas novas a `TABELAS` em `utils/auditoria.js` (nome legível
   nos Registos) e, se houver eventos manuais, as frases em `EVENTOS`.
6. Reutilizar `FancySelect`, `AvisoToast`, `confirmar`, `SlidingTabs`, `clicavel`; camadas com
   `--z-*`; cores com `--color-*`; ícones `lucide-react`.

Papéis existentes (`profiles.role`): `admin`, `administrador`, `gestor`, `marketing`,
`marketing plus`, e colaboradores sem papel especial.

---

## 6. Ficheiros desta área

`src/components/{AccountMenu, AuthLayout, AvisoToast, BrandIntro, CalculadoraKm,
CalendarioColaborador, DialogoGlobal, FancySelect, GestaoTemplates, GlobalTooltipProvider,
ImagemPrivada, NotificationsPanel, OtpInput, ProfilePeek, ProjetoTracker, ProtectedRoute, Sidebar,
SlidingTabs, StopTimerNoteModal, ThemeDecor, ThemeDecorExtra, ThemeSelector, TimerSwitchModal,
TwoFactorSetup, WidgetAssiduidade, WidgetCalendar}.jsx`, `src/utils/*.js`,
`src/constants/*.js`, `src/data/frases.js`, `src/styles/*.css`.

---

## 7. Pontos de atenção conhecidos

Encontrados ao documentar; não corrigidos.

- **Notificações de ausências nunca são mostradas:** `decisaoPedido.js` e o RH inserem
  `notificacoes_projetos` com `tipo = "absence_status_changed"`, mas o Início só lê
  `project_created`, `mk_*` e `seguranca`. Mesmo que se acrescente ao filtro, falta a entrada no
  mapa `TIPO` do `NotificationsPanel` (apareceria com foguete e "Abrir projeto").
- **Papéis inconsistentes entre rotas e Sidebar:** `App.jsx` aceita `administrador` em RH,
  Leads, Marketing, TransferGest, Ativos TI e Propostas, mas a Sidebar só testa `admin`
  (e `role`, não `tipo`) nesses itens — um utilizador `administrador` entra pela URL mas não vê o
  link. Admin e Registos testam `role || tipo` em minúsculas; os outros não.
- **`AuthProvider` montado duas vezes** (`main.jsx` e `App.jsx`); só o interior é usado.
- **Tooltip abaixo de janelas altas:** o `GlobalTooltipProvider` usa
  `calc(var(--z-modal) + 11)` (1011), por baixo de `--z-modal-topo`/`--z-modal-max`; títulos
  dentro dessas janelas podem ficar tapados.
- **Feriados duplicados:** `WidgetCalendar` tem uma cópia local de `getFeriados`; o feriado de
  Faro (7/9) é municipal e está nas duas listas. Mudar num sítio obriga a mudar no outro.
- **`transito_expira_em`** gravado como `${ano+1}-03-31` na linha do ano `ano`, enquanto os
  transitados dessa linha (vindos de `ano-1`) expiram a `${ano}-03-31` no cálculo. Confirmar o
  significado da coluna antes de a usar.
- `obterSaldoFeriasAno` aceita `dataAdmissao` mas não a usa (aviso de lint pré-existente).
- `KM_REQUEST_TYPE` e `TOLERANCIA_TIPO` redefinidos localmente em `CalendarioColaborador`
  (já existem em `decisaoPedido.js`/`feriasSaldo.js`).
- **Código morto:** `pdfOrganizerEngine.setLearnedEntities` nunca é chamado (os nomes aprendidos
  entram por `buildDocMeta(…, learned)`); `hasContinuationSignals`, `hasNewDocumentSignals`,
  `extractGroupMetadata`/`generateSmartFilename` sem uso; `THEME_KEYS` sem uso;
  `pages/SignUp.jsx` sem rota.
- **Textos sem acentos/PT-BR** no `StopTimerNoteModal` ("Parar cronometro", "Em analise",
  "Concluido", "Proprio") e no `TimerSwitchModal` ("Trocar Cronômetro").
- **Emoji gravado em dados:** a saída do dia no `WidgetAssiduidade` escreve "📝 NOTAS
  ADICIONAIS" em `assiduidade.observacoes`.
- `TimerSwitchModal` e `StopTimerNoteModal` usam estilos inline com cores fixas (não seguem o
  tema nem têm CSS próprio).
