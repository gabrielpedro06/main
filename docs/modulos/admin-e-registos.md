# Administração, registos, medalhas e autenticação

Cobre o painel de administração, o registo de atividade e os alertas de segurança,
as medalhas e todo o fluxo de autenticação (login, 2FA, recuperação de password).
Regras gerais de segurança (RLS, `aal2`, chaves): [../04-seguranca.md](../04-seguranca.md).
Tabelas: [../03-base-de-dados.md](../03-base-de-dados.md). Componentes partilhados
(AuthLayout, OtpInput, ProtectedRoute…): [../06-frontend-partilhado.md](../06-frontend-partilhado.md).

## 1. Painel de administração (`/#/dashboard/admin`)

Ficheiros: `src/pages/AdminDashboard.jsx`, `src/components/admin/AdminVisaoGeral.jsx`,
`src/components/admin/SegurancaMFA.jsx`. Acesso: só `admin`/`administrador`
(`ProtectedRoute` em `App.jsx` + verificação `isAdmin` na própria página).

Ao abrir, carrega de uma vez `profiles`, `projetos`, `atividades`, `tarefas`,
`subtarefas`, até 5000 `task_logs` e até 5000 registos de `assiduidade`.

| Separador | O que mostra / faz |
|---|---|
| Visão geral | `AdminVisaoGeral`: horas por dia (14 dias), semana atual vs. anterior, projetos por estado, tarefas em atraso, projetos com mais horas no mês, aniversários (30 dias), pedidos de ausência pendentes (`ferias`), propostas (90 dias), leads ativas e as 8 últimas linhas de `audit_log`. |
| Tempo & Projetos | Horas registadas (`task_logs`) por projeto/pessoa, filtros dia/mês/intervalo, gráficos, quem está online e dados financeiros dos projetos (investimento, incentivo, autofinanciamento). |
| Equipa & Assiduidade | Tabela por colaborador: presença (assiduidade), tempo em tarefas e o que está a fazer agora. |
| Gestão individual | Escolher uma pessoa: tarefas/atividades/subtarefas abertas onde é responsável ou colaboradora, horas, e **Tag de Perfil** (papel). |
| Segurança | `SegurancaMFA`: estado do 2FA de cada pessoa, repor MFA, bloquear contas inativas. |

### 1.1 Gestão de contas (servidor)

O browser nunca muda papéis nem bloqueia contas diretamente: o trigger
`profiles_proteger` (migração 068) só deixa admins mudar `role`, `tipo` e `ativo`, e o
bloqueio no Supabase Auth exige a chave de serviço. Tudo passa por
`POST /api/admin/contas` (`api/admin/[op].js` → `api/_lib/adminContas.js`), com o
token da sessão no cabeçalho `Authorization`:

| `acao` | Quem | Efeito |
|---|---|---|
| `definir` `{ userId, ativo }` | admin, administrador, gestor | `profiles.ativo` + ban/unban no Auth (usado pelos RH) |
| `sincronizar` `{}` | admin | Bane todas as contas com `ativo = false` que ainda não estavam bloqueadas |
| `papel` `{ userId, papel, password }` | admin | Confirma a password de quem pede no Supabase e muda o papel |

Papéis aceites pelo servidor: `colaborador`, `gestor`, `marketing`, `marketing plus`,
`admin`. O seletor do painel só oferece os quatro primeiros sem `marketing plus`.
Cada operação fica em `audit_log` como `EVENTO`.

Desativar = 2 camadas: `profiles.ativo = false` (a app termina a sessão no
`AuthContext.fetchProfile` e o Login recusa) e conta banida no Auth (não consegue
obter nem renovar sessão).

### 1.2 MFA (2FA)

`POST /api/admin/mfa` (`api/_lib/adminMfa.js`), só admins:

- `estado` → por utilizador: tem fator TOTP verificado? conta bloqueada?
- `repor { userId }` → apaga os fatores MFA da pessoa (ex.: perdeu o telemóvel). Na
  próxima entrada o Login obriga a configurar a app autenticadora de novo. Fica em
  `audit_log` (`mfa_reposto`).

O painel avisa quando existem "inativos com acesso" (inativos nos RH mas não banidos)
e oferece o botão para os bloquear (`sincronizar`).

## 2. Registos (`/#/dashboard/registos`)

Ficheiros: `src/pages/RegistoAtividade.jsx`, `src/components/admin/AlertasSeguranca.jsx`,
`src/utils/auditoria.js` (nomes legíveis das tabelas e eventos),
`src/utils/registarEvento.js`. Só admins (rota e RLS).

### 2.1 Registo de atividade (`audit_log`, migração 064)

- Trigger em todas as tabelas de `public` (exceto as de `audit_excluida`, p.ex. chat
  e tabelas de segurança): uma linha por INSERT/UPDATE/DELETE com `user_id`,
  `user_email`, `tabela`, `registo_id`, `campos_alterados`, `dados_antes`,
  `dados_depois` (no UPDATE só os campos alterados). Campos sensíveis (passwords,
  tokens, chaves, `codigo`) ficam mascarados.
- Eventos sem alteração de dados via RPC `registar_evento` (`registarEvento(acao, detalhes)`):
  `login`, `logout`, `sessao_expirada`, `acesso_negado`, `exportacao`,
  `exportar_registos`, `mfa_reposto`, `credencial_revelada`, … (lista em `EVENTOS`).
  Para um evento novo aparecer legível, acrescentar a chave em `EVENTOS`.
- `transacao` (075) guarda o id da transação, para distinguir "apagar 1 projeto com
  50 tarefas" de "50 eliminações".
- Ninguém altera nem apaga registos a partir da app.

Ecrã: filtros por pessoa, área (tabela), operação (Criações/Alterações/Eliminações/
Eventos) e período (hoje, 7, 30, 90 dias, tudo); 50 linhas por página ("carregar
mais"); detalhe com antes/depois; filtrar pelo histórico de um registo. **Exportar
CSV** exporta só as linhas carregadas e regista `exportar_registos`.

### 2.2 Alertas de segurança (`?alertas=1`, migração 075)

| Tabela | Conteúdo | Quem escreve |
|---|---|---|
| `tentativas_login` | email, IP, país, motivo (`password`, `mfa`, `conta_bloqueada`) | Servidor (`/api/seguranca/tentativa`) |
| `alertas_seguranca` | tipo, gravidade (alta/média/baixa), título, mensagem, `visto_por`/`visto_em` | Servidor e regras da BD |
| `logs_supabase_api`, `logs_supabase_auth` | Resumos dos logs do Supabase | `/api/seguranca/recolher` (pg_cron a cada 10 min, 075b) |
| `seguranca_estado` | Estado da recolha (`recolha_logs`: última execução, último erro) | Idem |

Alertas gerados (no máximo 1 por situação por hora e 30 por hora no total; cada
alerta novo envia email aos admins):

- `login_falhado` — ≥ 5 falhas na mesma conta ou IP em 15 min;
- `conta_desativada` — tentativa de entrar com conta bloqueada;
- `login_estrangeiro` — login com sucesso fora de Portugal;
- `api_negado`, `leitura_volumosa`, `downloads_volume` — a partir dos logs do Supabase
  (limites em `LIM`, `api/_lib/alertasSeguranca.js`);
- regras na BD sobre `audit_log` (`seguranca_vigiar_audit`): apagar em massa
  (≥ 20 operações ou ≥ 200 registos em 10 min), ≥ 10 passwords do cofre vistas numa
  hora, exportações ≥ 500 linhas, entrada com conta desativada.

O separador mostra os alertas por ver (com contador), "marcar como visto", as
tentativas falhadas dos últimos 7 dias e o estado da recolha de logs. A limpeza
(`seguranca_limpar(180)`) apaga logs e tentativas com mais de 180 dias; os alertas
ficam. Variáveis do servidor necessárias: ver comentário no topo de
`api/_lib/alertasSeguranca.js` (nunca pôr os valores no código).

## 3. Medalhas

Ficheiros: `src/components/medalhas/MedalhasRH.jsx` (separador **Medalhas** do painel
de RH), `medalhasConfig.js`, `useMedalhas.js`. Migração `067`.

- `medalhas`: um evento interno (nome, data, descrição opcional ≤ 500, `imagem_path`,
  `imagem_url`).
- `medalhas_colaboradores`: `(medalha_id, user_id)`; chave primária composta, apaga
  em cascata com a medalha.
- Imagem no balde **público** `medalhas` (PNG/WebP/JPEG, máx. 2 MB; nome = UUID).
  Substituir a imagem apaga a antiga.
- Leitura: qualquer autenticado. Escrita (tabelas e balde): `pode_gerir_medalhas()` =
  admin/administrador/gestor.

Fluxo de atribuição (`guardar`): carregar imagem → gravar medalha → inserir as pessoas
novas e apagar as desmarcadas → apagar a imagem antiga. Só aparecem para escolha
colaboradores **ativos**.

Onde aparecem:

- **ProfilePeek** (cartão de perfil): vitrine com as medalhas da pessoa
  (`useMedalhas`), mais recentes primeiro.
- **DashboardHome**, lista de quem está online: badge 🏅 no avatar
  (`useMedalhasEquipa`), com o número quando há mais de uma e os nomes no `title`.

Se a migração 067 não existir, os hooks devolvem listas vazias e o separador mostra
o aviso "falta correr a migração 067".

## 4. Autenticação

Não há registo livre: as contas são criadas por **convite** no Supabase
(Authentication → Invite user). `src/pages/SignUp.jsx` existe mas **não tem rota**.

### 4.1 Login (`/`, `src/pages/Login.jsx`)

1. `signInWithPassword`. Em erro: `reportarTentativaFalhada(email, motivo)` →
   `POST /api/seguranca/tentativa` (sem sessão, só email e motivo; nunca a password).
   Mensagem "banned" ⇒ motivo `conta_bloqueada` e aviso de conta desativada.
2. Lê `profiles.ativo`; se `false` regista `acesso_negado`, termina a sessão e avisa.
3. 2FA obrigatório (`getAuthenticatorAssuranceLevel`):
   - tem fator e falta o código → passo **code** (OtpInput, 6 dígitos,
     `challengeAndVerify`); código errado → tentativa `mfa`;
   - não tem fator → passo **setup** (`useTotpEnroll` + `TotpEnrollSteps`: QR,
     segredo, confirmação).
4. `entrar()`: `checkMfa`, `registarLoginSeguro()` (`POST /api/seguranca/login`: guarda
   IP/país, alerta se fora de PT; sem servidor regista só `login` no audit_log) e
   navega para a página pedida antes do login (`location.state.from`, só
   `/dashboard…`) ou `/dashboard`.

### 4.2 Sessão e validade do 2FA (`src/context/AuthContext.jsx`)

- A verificação 2FA vale **12 horas** e só neste browser: cookie de sessão `bz_mfa` +
  carimbo `bz-mfa-at` em localStorage, gravados no evento `MFA_CHALLENGE_VERIFIED`.
- Ao abrir a app com sessão guardada mas sem cookie (browser fechado) ou com mais de
  12 h → `sessao_expirada` e logout local. Com a app aberta verifica a cada 5 min.
- `ProtectedRoute` manda para o Login enquanto `mfaPending` for verdadeiro e
  depois volta à página pedida (é assim que funcionam os links dos emails).
- Na BD, a política restritiva `mfa_obrigatorio` (071) exige `aal2` em todas as
  tabelas e ficheiros privados: sem 2FA a sessão não lê nada.
- Logout (`signOut`): fecha cronómetros de tarefas abertos, regista `logout`.

### 4.3 Configurar 2FA no Perfil

`Perfil → Segurança` usa `<TwoFactorSetup/>` (mesmo hook `useTotpEnroll`). A
reposição por um admin está em §1.2.

### 4.4 Recuperação de password

1. `/forgot-password` (`ForgotPassword.jsx`): `resetPasswordForEmail(email, { redirectTo: origin + "/reset-password" })`.
   A resposta é sempre "se existir uma conta…".
2. `/reset-password` (`ResetPassword.jsx`): exige 8+ caracteres com letras e números
   e confirmação. Se a conta tem 2FA, pede primeiro o código (o Supabase só deixa
   mudar a password com sessão `aal2`). Depois `updateUser({ password })` e volta ao login.

No Perfil também se muda a password, mas aí a validação é só "6+ caracteres".

## 5. Riscos e pontos de atenção

- **Recuperação de password a verificar em produção**: o `redirectTo` é
  `${origin}/reset-password` (caminho, não `#/reset-password`) e a app usa
  `HashRouter`. Além disso o `AuthContext` termina qualquer sessão sem o cookie
  `bz_mfa` válido ao arrancar — o que pode incluir a sessão de recuperação aberta
  pelo link do email. Testar o fluxo completo num browser limpo.
- Validação de password diferente entre Perfil (6+) e reset (8+, letras e números).
- O seletor de papel no Admin não oferece `marketing plus`, embora o servidor e as
  rotas (`/dashboard/marketing`, `/dashboard/ativos-ti`) o usem.
- O CSV dos Registos não neutraliza valores começados por `=`, `+`, `-`, `@`
  (injeção de fórmulas ao abrir no Excel).
- O painel de Admin carrega no máximo 5000 `task_logs`/`assiduidade`; com mais
  histórico, as estatísticas por intervalo ficam incompletas sem aviso.
- Gravar uma medalha não é transacional (medalha gravada + atribuições falhadas é
  possível).
