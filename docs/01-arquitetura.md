# 01 — Arquitetura

Visão geral do Bizin Manager: o que é, como está montado e por onde passam os dados.
Para instalar e publicar ver [02-setup-e-deploy.md](02-setup-e-deploy.md); para cada rota do servidor
ver [05-api-e-servidor.md](05-api-e-servidor.md); tabelas e RLS em [03-base-de-dados.md](03-base-de-dados.md);
segurança (2FA, cofre, alertas) em [04-seguranca.md](04-seguranca.md); componentes e utilitários
partilhados do frontend em [06-frontend-partilhado.md](06-frontend-partilhado.md); cada módulo
funcional em `docs/modulos/`.

---

## 1. O que é

Aplicação web interna (SPA) para a gestão da empresa: tarefas e agenda, projetos, entidades
(clientes), atividades, comunicação interna (fórum/chat), RH (ausências, férias, pedidos de km,
saldos), marketing (marcas, conteúdos, assistente de ideias com IA, leads, campanhas por email),
TransferGest, propostas comerciais, programas/avisos de financiamento, cursos e ações de formação,
ativos de TI, organizador de PDFs com IA e área de administração/segurança.

Utilizadores: só colaboradores da empresa. **Não há registo livre** — as contas são criadas por
convite no Supabase (Authentication → Invite user). O 2FA (TOTP) é obrigatório para todos.

## 2. Stack

| Camada | Tecnologia | Onde |
|---|---|---|
| UI | React 19, React Router 7 (`HashRouter`) | `src/` |
| Build/dev | Vite via **rolldown-vite 7.2.5** (alias `vite` em `package.json` → `overrides`) | `vite.config.js` |
| Base de dados, auth, ficheiros | Supabase (Postgres + RLS, Auth com MFA TOTP, Storage, pg_cron, pg_net, Vault) | `supabase/migrations/` |
| Servidor (produção) | Funções serverless Node do Vercel (plano Hobby, máx. 12 funções; hoje 10) | `api/` |
| Servidor (dev local) | Express na porta 8787 que reutiliza os handlers de `api/` | `server/index.js` |
| Email | Brevo (API transacional) | `server/brevoCampaignSender.js` |
| IA | Claude via `@anthropic-ai/sdk` (assistente de ideias e organizador de PDF) | `api/marketing/ideias.js`, `api/organizador/ia.js` |
| Edge function | Deno no Supabase (`fetch-caes-sicae`) | `supabase/functions/` |
| Bibliotecas de destaque | recharts (gráficos), leaflet/react-leaflet (mapas km), jspdf/html2pdf/pdf-lib/pdfjs-dist (PDF), tesseract.js (OCR; `por.traineddata` na raiz), jsqr (QR fiscal), xlsx/jszip, emoji-picker-react, lucide-react | `src/` |

Sem TypeScript, sem testes automáticos, sem biblioteca de estado global: o estado vive nos
componentes e em dois contextos React (Auth e Tema).

## 3. Estrutura de pastas

```
/
├── index.html               # HTML base (lang pt-PT, fonte Manrope) → /src/main.jsx
├── vite.config.js           # plugin React + proxy /api → http://localhost:8787 (dev)
├── vercel.json              # rewrites SPA, maxDuration do assistente, cabeçalhos de segurança
├── eslint.config.js
├── .env.example             # modelo de variáveis (o .env real nunca vai para o git)
├── por.traineddata          # dados de OCR português do tesseract.js
├── REFERENCIA_TEMAS.txt     # notas sobre os temas visuais
├── api/                     # funções serverless (cada ficheiro fora de _lib = 1 função Vercel)
│   ├── _lib/                # código partilhado (pasta com "_" NÃO conta como função)
│   ├── admin/[op].js        # /api/admin/mfa | contas
│   ├── notificacoes/[tipo].js
│   ├── seguranca/[op].js
│   ├── marketing/ideias.js
│   ├── organizador/ia.js
│   ├── absence-notifications/action.js
│   ├── nif.js, sicae-caes.js, cae-descriptions.js, health.js
├── server/                  # Express local + módulos usados também pelas funções (Brevo, CAE)
├── scripts/                 # dev-all.mjs, migrar-ficheiros-chat.mjs, sendMarketingCampaign.mjs
├── supabase/
│   ├── config.toml          # só configura a edge function (verify_jwt = false)
│   ├── functions/fetch-caes-sicae/
│   └── migrations/          # 001_… a 078_… (+ variantes 072b, 075b, 077b/c e modulo_ativos_ti.sql)
├── public/                  # logótipos, fundos, pdfjs/ (worker do pdf.js)
└── src/
    ├── main.jsx             # entrada: CSS globais, instalarAberturaSegura(), <AuthProvider><App/>
    ├── App.jsx              # rotas
    ├── context/             # AuthContext.jsx, ThemeContext.jsx
    ├── hooks/               # useAuth.js (reexporta), useTotpEnroll.js
    ├── services/            # supabase.js (cliente único), marketingSender.js, transfergestSender.js
    ├── pages/               # uma página por rota (+ CSS de algumas páginas)
    ├── components/          # Sidebar, ProtectedRoute, diálogos, PDFs, admin/, marketing/, medalhas/
    ├── utils/               # lógica partilhada (ver 06-frontend-partilhado.md)
    ├── constants/           # themes.js, marketing.js (listas usadas também pelo servidor)
    ├── data/                # CSV do catálogo CAE rev.4, frases.js
    ├── styles/              # CSS por área (camadas.css, main.css, motion.css, acessibilidade.css…)
    └── assets/
```

Ficheiros em `src/` que o servidor também importa (não podem usar APIs do browser no topo do módulo):
`src/constants/marketing.js` (por `api/marketing/ideias.js`), `src/utils/pdfOrganizerEngine.js`
(por `api/organizador/ia.js`, para `PDF_CATEGORIES`) e `src/data/CAE rev4.xlsx - Table 1.csv`
(por `server/caeCatalog.js`).

Páginas existentes mas **sem rota**: `src/pages/SignUp.jsx` (registo livre, desativado de propósito).
`PropostasFinanciamento.jsx` e `PropostasFormacao.jsx` não têm rota própria: são usados dentro de
`PropostasComerciais.jsx`.

## 4. Arranque da aplicação no browser

1. `index.html` carrega `src/main.jsx`.
2. `main.jsx` importa os CSS globais (`camadas.css`, `main.css`, `motion.css`, `acessibilidade.css`),
   chama `instalarAberturaSegura()` (`src/utils/ficheirosPrivados.js`: qualquer `<a href>` para um
   balde privado — `rh_anexos`, `documentos`, `chat_ficheiros` — passa a abrir com URL assinado de
   10 minutos) e monta `<AuthProvider><App/></AuthProvider>`.
3. `App.jsx` monta `ThemeProvider > AuthProvider > GlobalTooltipProvider > HashRouter > Routes`
   e, fora do router, `<DialogoGlobal />` (diálogos de confirmação/aviso usados via `src/utils/dialogo.js`).

> Há **dois** `AuthProvider` (em `main.jsx` e em `App.jsx`). Os componentes leem o mais interior;
> o exterior corre em duplicado (pedidos de sessão/perfil e listeners repetidos). Ver secção 10.

## 5. Routing

`HashRouter` → todos os URLs da app têm a forma `https://<domínio>/#/dashboard/...`. Isto é
importante para links em emails (ex.: `api/_lib/notificacoes.js` gera
`<APP_URL>/#/dashboard/pedidos/<id>`) e porque o servidor nunca vê a rota (tudo é `index.html`;
ver `rewrites` em `vercel.json`).

### Rotas públicas

| Rota | Página | Notas |
|---|---|---|
| `/` | `pages/Login.jsx` | Login + passo de código 2FA ou configuração do TOTP |
| `/forgot-password` | `pages/ForgotPassword.jsx` | `supabase.auth.resetPasswordForEmail` |
| `/reset-password` | `pages/ResetPassword.jsx` | Nova palavra-passe (pede código 2FA se a conta tiver) |
| `*` | 404 inline em `App.jsx` | |

### Rotas protegidas (`/dashboard`, layout `pages/Dashboard.jsx` com `<Sidebar>` e `<Outlet>`)

Todas exigem sessão + 2FA verificado (`ProtectedRoute` sem papéis). As que têm papéis indicados
usam um segundo `ProtectedRoute allowedRoles=[...]` (comparação em minúsculas com
`profiles.role || profiles.tipo`).

| Caminho (`/#/dashboard/…`) | Componente | Papéis exigidos |
|---|---|---|
| *(index)* | `DashboardHome` | todos |
| `minhas-tarefas` | `MinhasTarefas` (Agenda) | todos |
| `tarefas` | `Tarefas` | todos |
| `projetos` | `Projetos` | todos |
| `projetos/:id` | `ProjetoDetalhe` | todos |
| `clientes` | `Clientes` (Entidades) | todos |
| `atividades` | `Atividades` | todos |
| `forum` | `Forum` (Comunicação / chat) | todos |
| `rh` | `RecursosHumanos` | admin, administrador, gestor |
| `pedidos/:id` | `AprovarPedido` (link dos emails de ausência; `?acao=aprovar\|rejeitar`) | admin, administrador, gestor |
| `ferias` | `Ausencias` | todos |
| `pedido-km` | `PedidoKm` | todos |
| `perfil` | `Perfil` | todos |
| `leads` | `GestaoLeads` | admin, administrador, gestor, marketing |
| `marketing` | `Marketing` | admin, administrador, gestor, marketing, marketing plus |
| `transfergest` | `TransferGest` | admin, administrador, gestor |
| `ativos-ti` | `AtivosTIDashboard` | admin, administrador, gestor, marketing plus |
| `propostas` | `ListaPropostas` | admin, administrador |
| `propostas/novo`, `propostas/:id` | `PropostasComerciais` | admin, administrador |
| `avisos` | `GestaoAvisos` (Programas/Avisos) | todos |
| `admin` | `AdminDashboard` | admin, administrador |
| `registos` | `RegistoAtividade` (audit log e alertas de segurança; `?alertas=1`) | admin, administrador |
| `modelos` | `components/GestaoTemplates` (modelos de projeto) | todos |
| `cursos` | `Cursos` | todos |
| `acoes-formacao` | `AcoesFormacao` | todos |
| `organizador-pdf` | `OrganizadorPdf` | todos |

Papéis conhecidos (coluna `profiles.role`, espelhada em `profiles.tipo`): `colaborador`, `gestor`,
`marketing`, `marketing plus`, `admin` (`administrador` é aceite como sinónimo antigo). A lista
válida para mudança de papel está em `api/_lib/adminContas.js` (`PAPEIS_VALIDOS`).

**Ao criar uma página nova** é preciso tocar em cinco sítios:
1. o importador em `src/rotas.js` (`PAGINAS`);
2. o `lazy(...)` e a `<Route>` em `App.jsx`;
3. se a página tiver CSS novo, o import no fim de `src/estilosPaginas.js`;
4. o título em `PAGE_TITLES` de `pages/Dashboard.jsx`;
5. o link em `components/Sidebar.jsx` (que tem a sua própria verificação de papéis, nem sempre igual
   à de `App.jsx`, ex.: o menu usa `role` exato `'admin'`) e a entrada em `PAGINAS` de
   `components/CommandMenu.jsx` (com os mesmos papéis da rota).

### Carregamento por partes (code splitting)

Cada página é um ficheiro JS à parte (`React.lazy` + `src/rotas.js`), descarregado só quando é
aberta. O ficheiro principal passou de 5,4 MB para ~780 KB.
- **Pré-carregamento:** `Dashboard.jsx` tem um ouvinte único (`onMouseOver`/`onFocus`/`onTouchStart`)
  que, ao passar por cima de qualquer link interno, chama `prefetchRota(href)`. Com o browser parado
  descarrega também as páginas mais usadas (`prefetchEmSegundoPlano`).
- **Enquanto carrega:** `<Suspense fallback={<PaginaSkeleton/>}>` à volta do `<Outlet>`
  (`components/Skeleton.jsx`, estilos `styles/skeleton.css`). Também exporta `ListaSkeleton` e
  `CartoesSkeleton` para listas a carregar dados.
- **CSS:** fica todo no pacote principal (`src/estilosPaginas.js`), **pela mesma ordem de antes**,
  porque há estilos partilhados entre páginas e a ordem decide empates. Foi verificado que o CSS
  gerado é idêntico ao anterior.

### Command Menu (Ctrl+K / ⌘K)

`components/CommandMenu.jsx`, montado em `Dashboard.jsx`. Abre com Ctrl+K, com o botão
"Pesquisar" da barra lateral ou com a lupa da barra de topo no telemóvel (evento `bz:comando`,
`utils/comando.js`). Procura páginas (filtradas pelo papel), ações rápidas, projetos, entidades
(abre a ficha via `state.openClienteId`), pessoas (abre o `ProfilePeek`) e áreas da Ajuda.
Os dados ficam em cache em memória e são atualizados ao reabrir; os últimos escolhidos ficam em
`localStorage` (`bz-comando-recentes`).

### Avisos com Desfazer (toasts globais)

`utils/toast.js` + `components/ToastGlobal.jsx` (montado em `App.jsx`, estilos `styles/toast.css`).
- `toast(msg, { tipo })` para avisos simples.
- `toastDesfazer(msg, { executar, desfazer })` para apagar com Desfazer: a interface tira o item logo e
  `executar` (o `delete` no Supabase) só corre passados ~6 s. `desfazer` repõe o estado. Se `executar`
  falhar, chama `desfazer` e mostra erro. Ao fechar a página, as ações pendentes correm já (`pagehide`).
- Ctrl+Z / ⌘Z desfaz o último (fora de campos de texto). Rato por cima pausa; arrastar para o lado fecha.
- Já usado em: Agenda (apagar tarefa, apagar do arquivo, apagar registo de tempo, **concluir tarefa**),
  Tarefas globais (concluir tarefa/passo) e Fórum (publicações e comentários; `postsAApagar` impede que
  um recarregamento as faça reaparecer). Concluir usa `toastDesfazer` só com `desfazer` (reabre na BD).
  Também: apagar tarefa/passo/atividade e registo de tempo em Tarefas globais (`itensAApagar`), apagar
  projeto (`projetosAApagar`), apagar sub-registos das Entidades (`deleteItem`) e apagar formação nos RH.
- `components/AvisoToast.jsx` é agora uma ponte: as páginas que ainda usam o estado `notification`
  mostram os avisos na pilha global (tipos `success|error|warning|info` → `sucesso|erro|aviso|info`).
  Ainda com avisos próprios: Fórum, Marketing e Ativos TI.
- Optimistic updates: concluir na Agenda tira o cartão logo (a BD grava em paralelo; se falhar, repõe);
  no detalhe do projeto, concluir tarefa/passo repõe o estado se a gravação falhar.
  Aprovar/recusar pedidos nos RH (`executarAcaoRH`) tira a linha e fecha a janela logo; se a validação
  (saldo) ou a gravação falhar, a linha volta. Marcar notificação como lida (Início) sai logo da lista. As páginas ainda têm os
  seus próprios toasts (`showToast`), que devem ir passando para este.

### Atalhos de teclado (tecla "?")

`components/AtalhosTeclado.jsx` (montado em `Dashboard.jsx`, estilos `.at-*` em `styles/command-menu.css`).
`?` abre a lista de atalhos (também pelo evento `bz:atalhos`, usado pela ação "Atalhos de teclado" do
Command Menu). `G` + letra (até 1,2 s) navega com `navegarComTransicao` (lista `IR_PARA`, com papéis).
Ignorado em campos de texto, com Ctrl/Alt/⌘ e quando há uma janela aberta.

### Hit slop

`styles/refinamentos.css`: classe `.hit-slop` (manual) e, em ecrãs de toque, um `::before` com `inset: -8px`
nos botões pequenos de ícone (chat, agenda, tabelas: `.fx-*`, `.ag-check`, `.ag-play`, `.*-icon-btn`).
Ao criar um botão de ícone pequeno novo, acrescentá-lo a essa lista (ou usar `.hit-slop`).

### Placeholders das fotos (estilo BlurHash)

`utils/placeholderImagem.js`, ligado em `main.jsx` (`instalarPlaceholders()`). Ao carregar uma foto em
`Perfil.jsx`, as cores da imagem reduzida a 4×4 vão no nome do ficheiro (`<user>-<data>-ph<64 chars>.jpg`).
Um `MutationObserver` vê as `<img>` com `/avatars/` no `src` ainda por carregar e põe por trás o mosaico
ampliado (desfocado); fotos antigas sem código têm um fundo neutro. Sem coluna nova na BD.

### Cantos contínuos e safe triangle

`styles/refinamentos.css`: `corner-shape: superellipse(1.5)` (só com `@supports`) numa lista de cartões e
janelas (nunca em círculos/pílulas). Menus de hover por cima de um botão usam `data-triangulo` /
`data-triangulo-gatilho` / `data-triangulo-painel` + `utils/trianguloSeguro.js` (ligado em `main.jsx`):
um triângulo invisível do cursor até ao menu mantém-no aberto na diagonal. Usado nas reações do Fórum.

### Animação ao fechar janelas

`utils/saidaJanelas.js` (ligado em `main.jsx`): quando um fundo de janela (`utils/janelas.js`, lista
partilhada com `GestosJanelas`) sai do DOM, uma cópia "fantasma" (`.bz-janela-fantasma`, inerte) é
animada para fora com a Web Animations API (~170 ms) e apagada. Se abrir outra janela entretanto, os
fantasmas saem logo. Fica de fora: reduzir movimento, fecho por gesto (`data-fechado-por-gesto`),
`data-sem-saida`, janelas com saída própria (`.is-closing`/`.is-leaving`/`.is-saindo`) e > 600 elementos.

### Cronómetro do Marketing

`utils/cronometroMarketing.js` (`useCronometroMarketing`) + `components/marketing/Cronometro.jsx`
(`CronoChip` no cartão do quadro, `CronoPainel` no cabeçalho do `ConteudoDrawer`). Usa `task_logs`
com `conteudo_id` (082) e as mesmas regras das tarefas: um cronómetro por pessoa
(`closeAllActiveTaskLogsForUser`), pergunta pela picagem (`attendanceGuard`), dispara/ouve
`task-logs-updated`. `activeTimerResolver.js` e o Início reconhecem `conteudo_id` (rota
`/dashboard/marketing?conteudo=<id>`).
Total por campanha: `tempoDe([ids])` soma várias peças; `CampanhaTempo` aparece por cima do quadro
quando há filtro de campanha (total, por pessoa, peças com mais tempo); o filtro mostra o total em
cada opção e o `CronoPainel` mostra o total da campanha da peça.

### Gestos no telemóvel (voltar fecha / arrastar fecha)

`components/GestosJanelas.jsx` (montado em `Dashboard.jsx`, só em ecrãs ≤ 900px ou de toque) observa o
DOM e, para cada fundo de janela conhecido (lista `JANELAS`, ou atributo `data-janela`):
- acrescenta um passo ao histórico: o "voltar" do telemóvel fecha a janela em vez de sair da página;
- liga `arrastarParaFechar` (`utils/gestos.js`) à caixa da janela: arrastar para baixo fecha.
Para fechar simula Esc e, se não chegar, um clique no fundo (se a janela não fechar assim, fica aberta).
`data-sem-gestos` no fundo deixa uma janela de fora; a videochamada (`vc-overlay`) está de fora de propósito.
A gaveta do menu fecha arrastando para a esquerda e com "voltar" (marcador `.bz-gaveta-marcador`).

### Transições entre páginas (View Transitions)

`utils/transicaoPagina.js`. `Dashboard.jsx` interceta (fase de captura) os cliques em links internos
`#/...` e navega dentro de `document.startViewTransition`; só `.dashboard-main` é animado
(`view-transition-name: bz-pagina` durante `html.bz-vt-pagina`, CSS em `styles/refinamentos.css`).
A página que entrou assim recebe `.sem-entrada` para não repetir a animação antiga `.bz-route`.
Sem suporte do browser ou com "reduzir movimento", navega normalmente.

### Cache das páginas (stale-while-revalidate)

`utils/cachePaginas.js` (`lerCache`/`guardarCache`): Agenda (`agenda`), Tarefas (`tarefas`),
Projetos (`projetos`), Entidades (`clientes`), Início (`inicio`), RH (`rh`: colaboradores e pedidos
pendentes) e Ausências (`ausencias:<tipo>`) guardam em memória os últimos dados. Ao voltar à
página, os estados começam com esses dados (sem spinner) e o fetch normal atualiza por trás.
Só em memória (F5 limpa) e apagada ao terminar sessão ou mudar de conta. Na primeira visita
aparece o `PaginaSkeleton` em vez do spinner.

> A verificação de papéis no frontend é só conveniência de interface. Quem garante o acesso aos
> dados são as **políticas RLS** no Supabase e as verificações nas rotas de `api/`.

## 6. Autenticação, 2FA e `ProtectedRoute`

### `src/context/AuthContext.jsx`

Expõe via `useAuth()`:

| Valor | Significado |
|---|---|
| `user` | utilizador do Supabase Auth (ou `null`) |
| `userProfile` | linha de `profiles` + campos de `profiles_privado` (NIF, NISS, CC, morada… via `juntarPrivado`) |
| `setUserProfile` | para as páginas atualizarem o perfil em memória (ex.: Perfil) |
| `loading` | `true` até haver resposta de sessão + perfil |
| `mfaPending` | a sessão ainda não está em `aal2` (falta código ou configuração) |
| `mfaSetup` | a conta não tem fator TOTP verificado (tem de configurar) |
| `checkMfa()` | relê o AAL e atualiza os dois anteriores |
| `signOut(opts)` | fecha cronómetros de tarefas abertos, regista `logout`, termina a sessão e recarrega `/` |

Regras implementadas:

- **2FA válido 12 h por dispositivo e por sessão do browser.** Ao confirmar um código
  (`MFA_CHALLENGE_VERIFIED`) grava-se o cookie de sessão `bz_mfa=1` e o carimbo `bz-mfa-at` no
  `localStorage`. Ao abrir a app, se houver sessão Supabase mas faltar um dos dois (browser fechado)
  ou tiverem passado 12 h, a sessão local é terminada (`terminarSessaoExpirada`, regista
  `sessao_expirada`). Com a app aberta, de 5 em 5 min verifica e faz `signOut()` ao fim das 12 h.
- **Conta desativada** (`profiles.ativo = false`): `fetchProfile` regista `acesso_negado`, guarda o
  aviso em `sessionStorage` (`AVISO_LOGIN_KEY`) e termina a sessão. Do lado do servidor, a conta
  também fica "banida" no Supabase Auth (ver `api/_lib/adminContas.js`).

### Fluxo de login (`src/pages/Login.jsx`)

```
signInWithPassword ──erro──► reportarTentativaFalhada(email, "password"|"conta_bloqueada")  → POST /api/seguranca/tentativa
      │ ok
      ▼
profiles.ativo === false? ──sim──► signOut local + mensagem "conta desativada"
      │ não
      ▼
mfa.getAuthenticatorAssuranceLevel()
  ├─ nextLevel=aal2 e current≠aal2 → passo "code": mfa.challengeAndVerify(código)
  │        erro → reportarTentativaFalhada(email, "mfa")
  ├─ nextLevel≠aal2 (sem TOTP)     → passo "setup": useTotpEnroll (QR + código)
  └─ já aal2 ──────────────────────┐
                                   ▼
                    entrar(): checkMfa() → registarLoginSeguro() (POST /api/seguranca/login)
                              → navigate(destino)   // destino = location.state.from, só se começar por /dashboard
```

`src/hooks/useTotpEnroll.js`: `start()` remove fatores TOTP por confirmar e cria um novo
(`mfa.enroll`), `confirm(código, { replaceIds })` verifica e, opcionalmente, apaga fatores antigos
(usado para "mudar de telemóvel" sem ficar sem 2FA), `cancel()` desfaz.

A exigência real do 2FA está na base de dados: a migração `071_mfa_obrigatorio.sql` cria em
**todas** as tabelas com RLS (e em `storage.objects`) uma política restritiva
`mfa_obrigatorio` que exige `auth.jwt() ->> 'aal' = 'aal2'`. Uma sessão só com palavra-passe
(aal1) não lê nem escreve nada pelo cliente anónimo.

### `src/components/ProtectedRoute.jsx`

1. `loading` → indicador de espera.
2. Sem `user` → `<Navigate to="/" state={{ from }}>` (o login devolve a pessoa a esta página).
3. `mfaPending` → volta a `/` (o Login mostra o passo do código/configuração).
4. Com `allowedRoles`: espera pelo `userProfile`; se o papel não estiver na lista → `/dashboard`.

## 7. Tema (`src/context/ThemeContext.jsx`)

- Temas definidos em `src/constants/themes.js` (`THEMES`, `DEFAULT_THEME`); notas em
  `REFERENCIA_TEMAS.txt`.
- `applyThemeVariables(nome)` escreve em `<html>` as variáveis CSS `--color-<chave>` (mais
  `--color-bgGradient`, `--color-sidebarBgSecondary`, `--color-accentColor`). Todo o CSS usa
  estas variáveis (ex.: `var(--color-btnPrimary)`).
- Persistência: `localStorage['app-theme']` — é por browser, não por utilizador.
- `changeTheme(nome)` usa `document.startViewTransition` para um cross-fade (com a classe
  `bz-theme-transition`), exceto com `prefers-reduced-motion`.
- Seletor visual: `components/ThemeSelector.jsx`; decorações por tema: `ThemeDecor*.jsx`,
  `utils/themeDecor.js`.

## 8. Fluxo de dados

### 8.1 Browser → Supabase (a maior parte da app)

As páginas falam **diretamente** com o Supabase através do cliente único
`src/services/supabase.js` (chave anónima + sessão do utilizador):

- `supabase.from('<tabela>').select/insert/update/delete` — sujeito a RLS (papel, dono do
  registo, aal2).
- `supabase.rpc('<função>')` — funções SQL (ex.: `registar_evento` em `utils/registarEvento.js`,
  `cofre_guardar`/`cofre_revelar` em `utils/cofre.js`, `provisionar_saldos_ferias`,
  `bizin_cc_a_expirar`).
- `supabase.storage` — ficheiros; os baldes privados abrem-se com URL assinado
  (`utils/ficheirosPrivados.js`).
- `supabase.channel(...)` — Realtime (chat/fórum, notificações).
- `supabase.functions.invoke('fetch-caes-sicae')` — edge function (alternativa ao `/api/sicae-caes`).

Auditoria: alterações de dados ficam em `audit_log` por triggers na BD (migração 064); ações sem
alteração de tabelas (login, logout, exportações) são registadas com `registarEvento()`.

### 8.2 Browser → `api/` (só o que precisa de segredos ou da chave de serviço)

O servidor existe apenas para: enviar emails (chave Brevo), chamar o Claude (chave Anthropic),
consultar o nif.pt (chave NIF), operações de administração que precisam da `service_role`
(MFA, bloquear contas, mudar papéis), alertas de segurança, e scraping do SICAE.

Chamadas com sessão usam `src/utils/apiAutenticada.js`:

```js
postAutenticado(url, body)   // POST JSON com Authorization: Bearer <access_token da sessão>
getAutenticado(url)          // GET com o mesmo cabeçalho
consultarNif(nif)            // GET /api/nif?q=<nif>
```

O token é obtido com `supabase.auth.getSession()`. No servidor, `autenticar(req)`
(`api/_lib/seguranca.js`) valida-o com `auth.getUser(token)`, lê `profiles` (papel, `ativo`) e
devolve `{ user, perfil, papel, admin }` (sendo `admin` um cliente `service_role`). Alguns ecrãs
fazem o `fetch` à mão com o mesmo cabeçalho (`SegurancaMFA.jsx`, `AssistenteIdeias.jsx` — que lê
SSE —, `OrganizadorPdf.jsx`, `RecursosHumanos.jsx`).

Base dos URLs: por omissão vazia (mesma origem: `/api/...`). `VITE_MARKETING_API_BASE`,
`VITE_TRANSFERGEST_API_BASE` e `VITE_PROJECT_NOTIFICATIONS_API_BASE` permitem apontar para outro
servidor; em produção devem ficar vazias. Em dev, o Vite faz proxy de `/api` para
`http://localhost:8787`.

Quem chama o quê:

| Frontend | Rota |
|---|---|
| `services/marketingSender.js` (GestaoLeads) | `GET /api/health`, `POST /api/notificacoes/marketing` |
| `services/transfergestSender.js` (TransferGest) | `GET /api/health`, `POST /api/notificacoes/transfergest` |
| `pages/Perfil.jsx` (CC alterado) | `POST /api/notificacoes/cc-alerta` |
| `pages/Projetos.jsx` (projeto criado) | `POST /api/notificacoes/projeto-criado` |
| `pages/Ausencias.jsx` (pedido criado/editado) | `POST /api/notificacoes/pedido-ausencia` |
| `components/admin/SegurancaMFA.jsx` | `POST /api/admin/mfa`, `POST /api/admin/contas` |
| `pages/AdminDashboard.jsx`, `pages/RecursosHumanos.jsx` | `POST /api/admin/contas` |
| `utils/alertasSeguranca.js` (Login) | `POST /api/seguranca/tentativa`, `POST /api/seguranca/login` |
| `components/marketing/AssistenteIdeias.jsx` | `POST /api/marketing/ideias` (SSE) |
| `pages/OrganizadorPdf.jsx` | `POST /api/organizador/ia` |
| `utils/apiAutenticada.js → consultarNif` | `GET /api/nif` |
| `pages/Clientes.jsx` | `GET /api/sicae-caes`, `GET /api/cae-descriptions` (sem sessão) |
| pg_cron do Supabase (não é o browser) | `POST /api/seguranca/recolher` |
| Emails antigos de ausência | `GET /api/absence-notifications/action` (só redireciona) |

### 8.3 Diagrama

```mermaid
flowchart LR
  subgraph Browser["Browser (SPA React, HashRouter)"]
    UI[Páginas e componentes]
    SB[services/supabase.js<br/>chave anónima + sessão]
    API[utils/apiAutenticada.js<br/>Bearer access_token]
  end

  subgraph Vercel
    STATIC[index.html + bundle Vite]
    FN["api/* (11 funções Node)<br/>_lib/seguranca.autenticar()"]
  end

  subgraph Supabase
    AUTH[Auth + MFA TOTP]
    DB[(Postgres + RLS<br/>aal2 obrigatório)]
    ST[(Storage<br/>baldes públicos e privados)]
    CRON[pg_cron + pg_net + Vault]
    EDGE[edge function<br/>fetch-caes-sicae]
    LOGS[Logs / Management API]
  end

  BREVO[Brevo<br/>email]
  CLAUDE[Anthropic<br/>Claude]
  NIFPT[nif.pt]
  SICAE[sicae.pt]

  UI --> SB --> AUTH
  SB --> DB
  SB --> ST
  SB --> EDGE --> SICAE
  UI --> API --> FN
  FN -- service_role --> DB
  FN -- service_role --> AUTH
  FN --> BREVO
  FN --> CLAUDE
  FN --> NIFPT
  FN --> SICAE
  FN -- SUPABASE_ACCESS_TOKEN --> LOGS
  CRON -- "POST /api/seguranca/recolher<br/>x-cron-segredo (a cada 10 min)" --> FN
```

Em desenvolvimento, `Vercel` é substituído por: Vite (5173) + `server/index.js` (8787), com o
Vite a encaminhar `/api/*` para o Express.

## 9. Convenções do código

- Textos, nomes de variáveis novas e comentários em português de Portugal; há código mais antigo
  em inglês (ex.: `brevoCampaignSender.js`, `transfergestSender.js`).
- Respostas da API sempre `{ ok: boolean, error?: string, ... }`; mensagens de erro já em
  português para mostrar ao utilizador; detalhes internos só no `console.error` do servidor.
- Todo o HTML de email passa por `escapeHtml` (`api/_lib/seguranca.js`).
- Destinatários de emails internos são calculados no servidor ou validados contra `profiles`
  (`emailsInternos`), nunca confiados ao browser.
- Migrações SQL numeradas e escritas para correr à mão no SQL Editor (ver 02 e 03).

## 10. Pontos de atenção conhecidos

- `AuthProvider` montado duas vezes (`main.jsx` e `App.jsx`): o exterior duplica pedidos
  (`getUser`, `profiles`) e listeners de `onAuthStateChange`.
- `fetchProfile` faz `window.location.replace("/")` só se `pathname !== "/"`; com `HashRouter` o
  `pathname` é quase sempre `/`, por isso esse redirecionamento raramente acontece (a sessão é
  terminada na mesma e o `ProtectedRoute` manda para o login).
- Recuperação de palavra-passe: `ForgotPassword.jsx` pede `redirectTo: <origem>/reset-password`
  (caminho real). O link volta com `#access_token=…&type=recovery`, que o cliente Supabase lê e
  apaga, e o `HashRouter` cairia no login. `utils/recuperacao.js` é importado **primeiro** em
  `main.jsx`: marca "recuperação em curso" (sessionStorage, 30 min). Com isso o `Login` reencaminha
  uma vez para `/#/reset-password` (`consumirIrParaReset`) e o `AuthContext` não termina a sessão por
  falta do cookie `bz_mfa`. `ResetPassword` pede o código 2FA, trata link expirado ("sem sessão")
  e chama `terminarRecuperacao()` no fim. Links com `#error=…` (ex.: `otp_expired`) vão para
  `/#/forgot-password` com a mensagem. Limite de emails do Supabase (429) tem mensagem própria.
- A verificação de papéis do `Sidebar.jsx` e a de `App.jsx` não são idênticas (ex.: `administrador`
  passa em `App.jsx` mas não em alguns `includes(userProfile?.role)` do menu).
