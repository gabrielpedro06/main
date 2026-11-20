# 05 — API e servidor

Referência de todas as rotas do servidor (`api/` no Vercel, `server/index.js` em dev), do código
partilhado em `api/_lib/`, dos módulos em `server/` e dos `scripts/`. Variáveis de ambiente
completas em [02-setup-e-deploy.md](02-setup-e-deploy.md#3-variáveis-de-ambiente); modelo de
segurança em [04-seguranca.md](04-seguranca.md); tabelas em [03-base-de-dados.md](03-base-de-dados.md).

---

## 1. Como está organizado

```
api/                                  (Vercel: 1 ficheiro = 1 função Node; máx. 12 no Hobby)
├── _lib/                             (não conta como função — código partilhado)
│   ├── seguranca.js                  autenticar, papéis, escapeHtml, quotas, auditoria
│   ├── notificacoes.js               emails (5 tipos)
│   ├── emailPedidoAusencia.js        HTML do email de pedido de ausência
│   ├── alertasSeguranca.js           tentativas/login/recolha de logs + emails de alerta
│   ├── adminMfa.js                   estado e reposição do MFA
│   ├── adminContas.js                ativar/desativar contas, mudar papéis
│   └── nif.js                        proxy nif.pt
├── admin/[op].js                     → _lib/adminMfa | _lib/adminContas
├── notificacoes/[tipo].js            → _lib/notificacoes
├── seguranca/[op].js                 → _lib/alertasSeguranca
├── nif.js                            → _lib/nif
├── marketing/ideias.js               (lógica no próprio ficheiro)
├── organizador/ia.js                 (idem)
├── absence-notifications/action.js   (idem)
├── sicae-caes.js                     → server/sicaeCaeLookup
├── cae-descriptions.js               → server/caeCatalog
└── health.js
server/
├── index.js                          Express local (porta 8787) — monta os mesmos handlers
├── brevoCampaignSender.js            envio de emails pelo Brevo (usado por api/ também)
├── caeCatalog.js                     catálogo CAE a partir do CSV
└── sicaeCaeLookup.js                 scraping do SICAE
```

Os handlers têm a assinatura `(req, res)` estilo Vercel/Express (`req.method`, `req.query`,
`req.body` já em JSON, `req.headers`; `res.status().json()`, `res.setHeader`, `res.write`,
`res.end`). Por isso o mesmo código corre nos dois ambientes.

### Contagem de funções Vercel (10 de 12)

`absence-notifications/action`, `admin/[op]`, `cae-descriptions`, `health`, `marketing/ideias`,
`nif`, `notificacoes/[tipo]`, `organizador/ia`, `seguranca/[op]`, `sicae-caes`.
Para acrescentar uma rota sem gastar uma função: novo `op` em `api/admin/[op].js` (mapa `ROTAS`),
novo `tipo` em `api/_lib/notificacoes.js` (mapa `TIPOS`) ou novo `op` em
`api/_lib/alertasSeguranca.js` (mapa `OPS`) — e registar a rota equivalente em `server/index.js`
se não for coberta por um parâmetro `:tipo`/`:op`.

### Convenções

- Resposta JSON `{ ok: true, ... }` ou `{ ok: false, error: "<mensagem para o utilizador>" }`.
- Erros previstos: `throw new ErroHttp(status, mensagem)`; o resto vira 500 com mensagem genérica
  (`responderErro`) e detalhe só no log (`console.error`, visível em Vercel → Logs).
- Autenticação: cabeçalho `Authorization: Bearer <access_token Supabase>` (o frontend usa
  `src/utils/apiAutenticada.js`).
- Escritas sensíveis registam em `public.audit_log` (`operacao = 'EVENTO'`, campo `acao`).

## 2. `api/_lib/seguranca.js` (núcleo partilhado)

| Export | O que faz |
|---|---|
| `PAPEIS` | `admin: [admin, administrador]`, `gestao: [+ gestor]`, `marketing: [+ marketing, marketing plus]` |
| `clienteServico()` | cliente Supabase com `SUPABASE_SERVICE_ROLE_KEY` (ignora RLS) ou `null` se faltar a chave |
| `ErroHttp` | erro com `status` |
| `autenticar(req)` | valida o Bearer com `auth.getUser`, lê `profiles (id, nome, email, role, tipo, ativo)`; 401 sem sessão, 403 se `ativo = false`. Devolve `{ user, perfil, papel, admin }`. Sem service role usa o anon key + token (RLS) e `admin = null` |
| `exigirPapel(ctx, lista)` | 403 se `ctx.papel` não estiver na lista |
| `responderErro(res, err, contexto)` | resposta de erro uniforme |
| `escapeHtml(v)` | escape para HTML de emails |
| `emailValido(e)` | validação de formato |
| `emailsInternos(admin, emails)` | filtra para emails de `profiles` ativos (impede usar a app para enviar a externos) |
| `origemApp(req)` | `APP_URL` ou cabeçalho `Origin` |
| `urlDaApp(req, url)` | aceita só URLs http(s) da origem da app |
| `limitar(v, min, max, omissão)` | clamp numérico de parâmetros do cliente |
| `auditar(admin, ctx, acao, detalhes, registoId, tabela)` | insert em `audit_log`; nunca lança |
| `consumirQuota(ctx, acao, limiteDiario)` | conta eventos `acao` do utilizador em `audit_log` desde 00:00 UTC; 429 se ≥ limite; senão regista mais um |

> `autenticar` não verifica o nível 2FA (`aal`) do token. Ver secção 7 (riscos).

## 3. Endpoints

Legenda de autenticação: **Pública** (sem token), **Sessão** (Bearer válido + conta ativa),
**Segredo** (cabeçalho partilhado).

### 3.1 `GET /api/health`

- Ficheiro: `api/health.js` (dev: `server/index.js`). Pública.
- Saída: `{ ok: true, service: "marketing-email-sender" }`.
- Usado por `services/marketingSender.js` e `services/transfergestSender.js` para testar ligação.

### 3.2 `POST /api/notificacoes/:tipo`

- Ficheiros: `api/notificacoes/[tipo].js` → `api/_lib/notificacoes.js` (`notificar`).
- Autenticação: Sessão (`autenticar`). Só `POST` (405 caso contrário); `tipo` desconhecido → 404.
- Envio sempre por `sendTransactionalCampaign` (Brevo). Erros do Brevo → status 400–502 com
  mensagem curta.
- `maxDuration` 60 s.

| `tipo` | Autorização | Corpo | Ação / tabelas | Saída |
|---|---|---|---|---|
| `marketing` | `PAPEIS.marketing` | `{ emails[] (≤2000), templateId? , params?, recipientParamsByEmail?, subject?, htmlContent?, batchSize?, batchDelayMs?, maxRetries?, requestTimeoutMs? }` | Campanha perfil Brevo "marketing". `audit_log` `campanha_marketing` | `{ ok, summary }` |
| `transfergest` | `PAPEIS.gestao` | idem | Perfil "transfergest". `audit_log` `campanha_transfergest` | `{ ok, summary }` |
| `cc-alerta` | qualquer sessão | `{}` | Lê `profiles` (nome) e `profiles_privado` (ncc, validade_cc) **do próprio** e envia para `RH_EMAIL` | `{ ok, summary }` |
| `projeto-criado` | qualquer sessão | `{ email, projectTitle, projectUrl, responsibleName?, clientName? }` | `email` tem de ser de um `profiles` ativo (`emailsInternos`); `projectUrl` tem de ser da app (`urlDaApp`) | `{ ok, summary }` |
| `pedido-ausencia` | dono do pedido ou `PAPEIS.gestao` | `{ requestId, isEditing? }` | Lê `ferias` por id e `profiles` (admins ativos + dono); um email por admin com link `<origem>/#/dashboard/pedidos/<id>` (HTML de `emailPedidoAusencia.js`). Requer service role (503 se faltar) | `{ ok, sent, failed }` |

`summary` (de `sendTransactionalCampaign`): `{ totalInput, acceptedRecipients, sentRecipients,
failedRecipients[{email, reason, status}], invalidEmails, duplicates, batchesProcessed, message }`.

Variáveis: `BREVO_*`, `TRANSFERGEST_BREVO_*`, `RH_EMAIL`, `APP_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
`VITE_SUPABASE_URL`.

### 3.3 `POST /api/admin/mfa`

- Ficheiros: `api/admin/[op].js` → `api/_lib/adminMfa.js`. Frontend: `components/admin/SegurancaMFA.jsx`.
- Autenticação: Sessão validada com service role; papel `admin`/`administrador` (403 caso contrário).
  Não usa `autenticar()` (código próprio; não verifica `profiles.ativo`).
- Corpo e saída:
  - `{ acao: "estado" }` → `{ ok, estado: { [userId]: { fatores, verificado, desde, ultimoLogin, bloqueado } } }`.
    Lista `auth.users` (até 20 páginas × 200) e pede os fatores pessoa a pessoa (lotes de 10).
  - `{ acao: "repor", userId }` → apaga todos os fatores MFA da pessoa
    (`auth.admin.mfa.deleteFactor`); `audit_log` `mfa_reposto` (tabela `auth.mfa_factors`).
    Saída `{ ok, removidos }`. Na próxima entrada a pessoa configura o TOTP de novo.
- Erros: 400 ação desconhecida/sem `userId`, 404 utilizador inexistente, 503 sem service role.
- Variáveis: `SUPABASE_SERVICE_ROLE_KEY`, `VITE_SUPABASE_URL`/`SUPABASE_URL`. `maxDuration` 60 s.

### 3.4 `POST /api/admin/contas`

- Ficheiros: `api/admin/[op].js` → `api/_lib/adminContas.js`. Frontend: `RecursosHumanos.jsx`,
  `AdminDashboard.jsx`, `SegurancaMFA.jsx`.
- Autenticação: Sessão (service role) + papel conforme a ação. Não verifica `profiles.ativo`.

| `acao` | Papel | Corpo | Efeito | Saída |
|---|---|---|---|---|
| `definir` | admin, administrador, gestor | `{ userId, ativo: boolean }` | `profiles.ativo = ativo` e `auth.users.ban_duration` = `876000h` (≈100 anos) ou `none`. Não pode desativar-se a si próprio; gestor não mexe em admins. `audit_log` `colaborador_desativado`/`colaborador_reativado` | `{ ok }` |
| `sincronizar` | admin | `{}` | Bloqueia no Auth todas as contas com `profiles.ativo = false` (exceto a própria). `audit_log` `contas_inativas_bloqueadas` | `{ ok, bloqueados }` |
| `papel` | admin | `{ userId, papel, password }` | Re-autentica quem pede com `signInWithPassword` (anon key); se falhar → 403 e `audit_log` `mudanca_papel_recusada`. Atualiza `profiles.role` **e** `profiles.tipo`. Um admin não pode retirar-se o papel de admin. `audit_log` `papel_alterado` | `{ ok, perfil }` |

`papel` ∈ `colaborador`, `gestor`, `marketing`, `marketing plus`, `admin`.
Variáveis: `SUPABASE_SERVICE_ROLE_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.

### 3.5 `POST /api/seguranca/:op`

- Ficheiros: `api/seguranca/[op].js` → `api/_lib/alertasSeguranca.js`. Só `POST`. `maxDuration` 60 s.
- Tabelas (migração 075): `tentativas_login`, `alertas_seguranca` (via RPC
  `seguranca_criar_alerta`, que deduplica por `chave` durante 1 h), `logs_supabase_api`,
  `logs_supabase_auth`, `seguranca_estado`, `audit_log`, `profiles`.
- Limites em `LIM` no topo do ficheiro: 5 falhas/15 min por conta ou IP; 40 tentativas/15 min por IP
  (acima disto deixa de gravar); 20 respostas 401/403 por IP/10 min; 1500 leituras de tabelas
  sensíveis (`TABELAS_SENSIVEIS`) por IP/10 min; 300 downloads do Storage por IP/10 min; país
  permitido `PT`.

| `op` | Autenticação | Corpo | O que faz | Saída |
|---|---|---|---|---|
| `tentativa` | **Pública** (requer service role no servidor) | `{ email?, motivo: "password"\|"mfa"\|"conta_bloqueada" }` | Grava a tentativa (IP de `x-forwarded-for`, país de `x-vercel-ip-country`, user-agent); cria alertas `login_falhado` (alta) ou `conta_desativada` (média) e envia logo os emails pendentes | sempre `{ ok: true }` |
| `login` | Sessão | `{}` | `audit_log` `login` com IP/país/agente; se país ≠ PT cria `login_estrangeiro` e envia email | `{ ok: true }` |
| `recolher` | **Segredo**: cabeçalho `x-cron-segredo` = `SEGURANCA_CRON_SEGREDO` (≥32 chars, comparação em tempo constante) | `{}` | Chamado pelo pg_cron a cada 10 min. Lê `edge_logs` e `auth_logs` na Management API do Supabase (`/v1/projects/<ref>/analytics/endpoints/logs`) desde a última janela (máx. 23 h), guarda-os, aplica as regras (`login_falhado`, `api_negado`, `leitura_volumosa`, `downloads_volume`), atualiza `seguranca_estado['recolha_logs']` e envia os alertas pendentes (incluindo os criados por triggers da BD) | `{ ok, resumo, enviados, erro }` |

Emails de alerta (`enviarAlertasPendentes`): até 30 alertas das últimas 24 h com
`email_enviado = false` e `email_tentativas < 3`; marca-os como enviados antes de enviar (evita
duplicados em paralelo) e, se o Brevo falhar, devolve-os à fila com `email_tentativas + 1`.
Destino: todos os `profiles` ativos com papel admin. Link "Ver no Bizin" →
`<APP_URL>/#/dashboard/registos?alertas=1`.

Variáveis: `SUPABASE_SERVICE_ROLE_KEY`, `VITE_SUPABASE_URL`, `SEGURANCA_CRON_SEGREDO`,
`SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF` (opcional), `APP_URL`, `BREVO_*`.

### 3.6 `GET /api/nif?q=<NIF>`

- Ficheiros: `api/nif.js` → `api/_lib/nif.js`. Frontend: `consultarNif()` em `utils/apiAutenticada.js`.
- Autenticação: Sessão. Só `GET`. NIF com 9 dígitos (400 caso contrário).
- Chama `https://www.nif.pt/?json=1&q=<nif>&key=<NIFPT_KEY>` (timeout 10 s) e devolve o JSON tal
  como vem do nif.pt, com `Cache-Control: private, max-age=3600`.
- Erros: 503 sem chave, 502 se o nif.pt não devolver JSON.
- Variáveis: `NIFPT_KEY` (aceita `VITE_NIFPT_KEY` por compatibilidade — evitar). `maxDuration` 15 s.

### 3.7 `POST /api/marketing/ideias` (SSE)

- Ficheiro: `api/marketing/ideias.js`. Frontend: `components/marketing/AssistenteIdeias.jsx`.
- Autenticação: Bearer validado com o **anon key** (cliente do utilizador, sujeito a RLS); papel lido
  de `profiles.role` ∈ admin, administrador, gestor, marketing, marketing plus. Quota 60/dia
  (`ia_ideias_marketing`).
- Corpo: `{ marcaId, mensagem (≤6000 chars), historico?: [{role, content}] (≤1,5 MB), pesquisaWeb?: boolean }`.
- Na 1.ª mensagem (`historico` vazio) junta o contexto da marca, lido de `marketing_marcas`,
  `marketing_personas`, `marketing_ciclos`, `marketing_conteudos`, `marketing_recursos`.
- Modelo `claude-opus-5-5`, `effort: high`, `max_tokens` 64000, prompt caching, até 8 voltas de
  ferramenta. Ferramentas: `propor_ideias` (strict, devolve cartões) e, se ligada,
  `web_search` (máx. 5 pesquisas). Listas de valores permitidos vêm de `src/constants/marketing.js`
  (`CANAIS`, `FORMATOS`, `OBJETIVOS`, `ESTRATEGIAS`).
- Resposta `text/event-stream`, linhas `data: <json>`:
  `{type:"text", delta}`, `{type:"pesquisa", query}`, `{type:"estado", texto}`,
  `{type:"ideias", toolUseId, ideias[]}`, `{type:"erro", texto}`,
  `{type:"fim", novas[], uso:{input, output, cache_lida, cache_escrita, pesquisas, custo_usd}}`.
  O browser acrescenta `novas` ao histórico e reenvia-o no pedido seguinte (o servidor não guarda
  conversas). Guardar ideias no Banco de Ideias é feito pelo browser, não aqui.
- Erros antes do stream: 401/403/429/400/503 JSON. Erros durante: evento `erro`.
- Variáveis: `ANTHROPIC_API_KEY`, `ANTHROPIC_WORKSPACE_ID`, `MARKETING_IA_WEB_SEARCH`,
  `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (quota).
  `maxDuration` 300 s (`vercel.json` e `config`).

### 3.8 `POST /api/organizador/ia`

- Ficheiro: `api/organizador/ia.js`. Frontend: `pages/OrganizadorPdf.jsx`.
- Autenticação: Sessão (`autenticar`), quota 40/dia (`ia_organizador`).
- Corpo: `{ paginas: [{ texto, qr?: { nifEmitente, data, numero, total, tipo } }] }`, 1 a 40 páginas,
  texto cortado a 3500 caracteres por página. **O texto chega já com dados pessoais tapados** no
  browser por `redigir()` (`src/utils/iaRedacao.js`: NIF de pessoas singulares, NISS, IBAN, contas,
  cartões, emails, telemóveis, nomes); o prompt proíbe adivinhar os campos tapados. Não são enviadas
  imagens.
- Modelo `claude-haiku-5-5`, saída estruturada por JSON Schema (`SCHEMA`), categorias de
  `PDF_CATEGORIES` (`src/utils/pdfOrganizerEngine.js`). Valida que os documentos cobrem as páginas
  1..n por ordem; até 2 tentativas.
- Saída: `{ ok, documentos: [{ paginas[], entidade, data (AAAA-MM-DD|""), numero, total (number|null), categoria, descricao, confianca }], uso: { input, output, custo_usd } }`.
- Erros: 400 nº de páginas, 422 recusa da IA, 429 rate limit, 502 separação inválida/erro da API,
  503 sem chave.
- Variáveis: `ANTHROPIC_API_KEY`, `ANTHROPIC_WORKSPACE_ID`, Supabase (sessão e quota). `maxDuration` 120 s.

### 3.9 `GET|POST /api/absence-notifications/action`

- Ficheiro: `api/absence-notifications/action.js`. Pública.
- Compatibilidade com emails **antigos** de ausência (botões com token HMAC). Já não decide nada:
  valida o token com `ABSENCE_ACTION_SECRET` e responde `303` para
  `<APP_URL ou https://Host>/#/dashboard/pedidos/<id>?acao=aprovar|rejeitar` (página
  `AprovarPedido`, que exige login + 2FA + papel). Token inválido → `/#/dashboard/rh`.
- Em dev aceita também `application/x-www-form-urlencoded` (`server/index.js`).

### 3.10 `GET|POST /api/sicae-caes?nif=<NIF>`

- Ficheiro: `api/sicae-caes.js` → `server/sicaeCaeLookup.js`. **Pública**. Em dev só `GET`.
- Faz scraping de `http://www.sicae.pt/Detalhe.aspx?NIPC=<nif>` e devolve
  `{ ok, nif, total, caes: [{ codigo, descricao, fonte: "sicae" }], sourceUrl, fetchedAt }`.
- Erros: 400 NIF inválido, 502 SICAE em baixo. Alternativa: edge function `fetch-caes-sicae`.

### 3.11 `GET|POST /api/cae-descriptions?codes=a,b,c`

- Ficheiro: `api/cae-descriptions.js` → `server/caeCatalog.js`. **Pública**. Em dev só `GET`.
- Saída `{ ok, total, caes: [{ codigo, descricao|null }] }`.

### 3.12 Só no servidor local

`GET /.well-known/appspecific/com.chrome.devtools.json` → 204 (silencia um pedido do Chrome DevTools).

### Tabela-resumo

| Método | Rota | Auth | Papel | Ficheiro |
|---|---|---|---|---|
| GET | `/api/health` | Pública | — | `api/health.js` |
| POST | `/api/notificacoes/marketing` | Sessão | admin, gestor, marketing, marketing plus | `_lib/notificacoes.js` |
| POST | `/api/notificacoes/transfergest` | Sessão | admin, gestor | idem |
| POST | `/api/notificacoes/cc-alerta` | Sessão | — | idem |
| POST | `/api/notificacoes/projeto-criado` | Sessão | — (destino interno) | idem |
| POST | `/api/notificacoes/pedido-ausencia` | Sessão | dono ou admin/gestor | idem |
| POST | `/api/admin/mfa` | Sessão | admin | `_lib/adminMfa.js` |
| POST | `/api/admin/contas` | Sessão | gestor/admin conforme ação | `_lib/adminContas.js` |
| POST | `/api/seguranca/tentativa` | Pública | — | `_lib/alertasSeguranca.js` |
| POST | `/api/seguranca/login` | Sessão | — | idem |
| POST | `/api/seguranca/recolher` | Segredo | — | idem |
| GET | `/api/nif` | Sessão | — | `_lib/nif.js` |
| POST | `/api/marketing/ideias` | Sessão | admin, gestor, marketing, marketing plus | `api/marketing/ideias.js` |
| POST | `/api/organizador/ia` | Sessão | — | `api/organizador/ia.js` |
| GET/POST | `/api/absence-notifications/action` | Pública (token) | — | `api/absence-notifications/action.js` |
| GET(/POST) | `/api/sicae-caes` | Pública | — | `api/sicae-caes.js` |
| GET(/POST) | `/api/cae-descriptions` | Pública | — | `api/cae-descriptions.js` |

## 4. `server/`

### `server/index.js` — Express local

- Só para desenvolvimento (`npm run dev:server` / `dev:full`). Carrega `.env` com `dotenv`.
- CORS restrito a `CORS_ORIGINS`; JSON até 5 MB; escuta em `127.0.0.1:${PORT||8787}`.
- Monta exatamente os handlers de `api/` (ver tabela acima). Diferenças: `sicae-caes` e
  `cae-descriptions` só `GET`; não aplica `maxDuration`; não existe `x-vercel-ip-country`.

### `server/brevoCampaignSender.js`

- `sendTransactionalCampaign({ senderProfile, emails, subject, htmlContent, templateId, params, recipientParamsByEmail, options, logger })`
  — único ponto de envio de email da app. Modo template (verifica primeiro que o template está ativo
  em `GET /v3/smtp/templates/:id`) ou modo HTML. Normaliza e deduplica destinatários
  (`prepareRecipients`), divide em lotes (`batchSize` ≤ 100), tenta de novo em 408/425/429/5xx e
  timeouts com backoff exponencial (máx. 30 s), e se um lote falhar tenta um a um.
  Com `recipientParamsByEmail` envia um email por pessoa (`messageVersions` / envio individual).
- Perfis: `marketing` → `BREVO_API_KEY`, `BREVO_SENDER_*`; `transfergest` →
  `TRANSFERGEST_BREVO_*` com recurso a `BREVO_*`.
- `prepareRecipients(rawEmails)` também é exportada.

### `server/caeCatalog.js`

- Lê uma vez `src/data/CAE rev4.xlsx - Table 1.csv` (colunas `classe`, `subclasse`,
  `designacao`) para um `Map` em memória. Exporta `getCaeDescription(code)` e
  `getCaeDescriptions(codes)`. Para atualizar o catálogo CAE, substituir o CSV mantendo o nome e as
  colunas.

### `server/sicaeCaeLookup.js`

- `lookupSicaeCaesByNif(nif)`: descarrega a página do SICAE e extrai números de 5 dígitos
  próximos da palavra "CAE". Frágil por natureza: se o SICAE mudar o HTML, corrigir aqui e na edge
  function.

## 5. Edge function `supabase/functions/fetch-caes-sicae`

- `POST` `{ nif }` → `{ nif, total, caes: [{ codigo, descricao: null, fonte: "sicae" }], sourceUrl, fetchedAt }`
  (sem campo `ok`; a descrição é preenchida depois pelo frontend via `/api/cae-descriptions`);
  `OPTIONS` para CORS; erro → 500 `{ error, details }`.
- Deno + `deno_dom` para ler o HTML. Pública (`verify_jwt = false`, CORS `*`).
- Deploy: `npx supabase functions deploy fetch-caes-sicae` (ver 02).

## 6. Scripts

| Script | Como correr | O que faz | Variáveis |
|---|---|---|---|
| `scripts/dev-all.mjs` | `npm run dev:full` | Lança `server/index.js` e o Vite em paralelo; se um terminar com erro, termina o outro | as do `.env` |
| `scripts/sendMarketingCampaign.mjs` | `npm run send:campaign` | Exemplo de envio manual de campanha Brevo (lista de emails, `templateId` e `params` fixos no ficheiro — editar antes de usar). Sai com código 1 se houver falhas | `BREVO_*` |
| `scripts/migrar-ficheiros-chat.mjs` | `node scripts/migrar-ficheiros-chat.mjs` (simula) → `--executar` (copia para o balde privado `chat_ficheiros` e atualiza `chat_messages.file_url`) → `--apagar-originais` (apaga em `documents/chat-files/` só os que já têm cópia) | Migração única dos anexos antigos do chat do balde público `documents` para o privado | `VITE_SUPABASE_URL`/`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |

## 7. Riscos e pontos fracos conhecidos (não corrigidos)

1. **2FA não é exigido nas rotas do servidor.** `autenticar()`, `adminMfa.js` e `adminContas.js`
   aceitam um token `aal1` (só palavra-passe). Como usam a service role, a RLS da migração 071 não
   se aplica. Exemplo: com a palavra-passe de um admin (sem o telemóvel), é possível chamar
   `POST /api/admin/mfa {acao:"repor"}` para apagar os fatores 2FA — incluindo os do próprio — e
   depois configurar um TOTP novo. Correção sugerida: verificar `aal === "aal2"` no JWT em
   `autenticar()` e nos dois handlers de admin.
2. **Destinatários visíveis entre si nas campanhas.** Em modo HTML (e em modo template sem
   `recipientParamsByEmail`), `buildPayload` põe até 75–100 destinatários no mesmo campo `to`;
   cada pessoa vê os emails das outras (problema de RGPD em campanhas para clientes/leads).
3. **Tempo das campanhas grandes.** Até 2000 destinatários com pausa entre lotes (até 3 s) e
   novas tentativas podem passar os 60 s de `maxDuration` de `notificacoes/[tipo]`; a função é
   cortada a meio e o browser não recebe o resumo.
4. `adminMfa.js`/`adminContas.js` não verificam `profiles.ativo` de quem pede (dependem do
   bloqueio no Auth estar sincronizado).
5. `/api/marketing/ideias` lê o papel só de `profiles.role` (ignora `tipo`, ao contrário do resto).
   O `historico` vem do browser e é reenviado ao modelo tal como está (pode conter mensagens
   "assistant" forjadas; impacto limitado ao próprio utilizador e custo).
6. As quotas de IA são consumidas antes de validar o corpo do pedido (um pedido inválido gasta quota).
7. `/api/sicae-caes`, `/api/cae-descriptions` e a edge function são públicos (podem ser usados por
   terceiros como proxy para o SICAE).
8. `api/_lib/nif.js` aceita `VITE_NIFPT_KEY`; se alguém definir a chave com esse nome e algum
   código do frontend a referenciar, fica pública no bundle.
9. `adminContas.js` `papel` usa `signInWithPassword` para confirmar a palavra-passe: isto cria uma
   sessão nova (aal1) no Supabase Auth e aparece nos `auth_logs` como login.
10. `TRANSFERGEST_BREVO_SMTP_KEY` existe no `.env.example` mas não é usada.
