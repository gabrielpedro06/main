# 02 — Setup e deploy

Como pôr o Bizin Manager a correr localmente, publicar no Vercel, aplicar migrações no Supabase e
mudar de domínio. Arquitetura geral em [01-arquitetura.md](01-arquitetura.md); detalhe de cada rota
do servidor em [05-api-e-servidor.md](05-api-e-servidor.md).

---

## 1. Requisitos

- **Node.js** recente (o código usa `fetch` global, `AbortSignal.timeout`, `String.replaceAll`,
  `import.meta`; foi desenvolvido com Node 26). No Vercel usar a versão Node mais recente disponível
  em *Settings → General → Node.js Version*.
- npm (há `package-lock.json`; usar `npm ci` para instalações reprodutíveis).
- Acesso ao projeto Supabase (dashboard) e ao projeto Vercel.
- Contas/chaves: Brevo (email), Anthropic (Claude), nif.pt (consulta de NIF).
- Opcional: Supabase CLI — já vem como devDependency (`npx supabase ...`), útil sobretudo para a
  edge function.

## 2. Scripts npm (`package.json`)

| Script | O que faz |
|---|---|
| `npm run dev` | Só o Vite (http://localhost:5173). Sem servidor, as chamadas a `/api` falham (emails, IA, admin, NIF). |
| `npm run dev:server` | Só o servidor Express local (`server/index.js`, http://127.0.0.1:8787). |
| `npm run dev:full` | Os dois em paralelo (`scripts/dev-all.mjs`). **É o modo normal de desenvolvimento.** |
| `npm run build` | `vite build` → `dist/`. |
| `npm run preview` | Serve o `dist/` localmente (sem `/api`). |
| `npm run lint` | ESLint em todo o repositório. |
| `npm run send:campaign` | `scripts/sendMarketingCampaign.mjs`: envio manual de uma campanha pelo Brevo (exemplo; editar o ficheiro antes). |

Outro script, sem atalho npm: `node scripts/migrar-ficheiros-chat.mjs [--executar | --apagar-originais]`
(migração única dos anexos do chat para o balde privado; ver [05](05-api-e-servidor.md#scripts)).

> Estado atual: `npm run lint` acusa muitos erros antigos (sobretudo `no-unused-vars` nas páginas
> grandes). Não bloqueiam o build. Ao mexer num ficheiro, convém não acrescentar erros novos.

## 3. Variáveis de ambiente

Modelo em `.env.example`. Localmente criar `.env` na raiz (está no `.gitignore`; nunca o enviar
para o git). No Vercel definir em *Settings → Environment Variables* (o Vercel não lê o `.env`).

Regra de ouro: **só variáveis com prefixo `VITE_` chegam ao browser** (são embutidas no bundle no
`vite build`, por isso alterá-las exige novo deploy). Segredos nunca podem ter prefixo `VITE_`.

### 3.1 Frontend (`import.meta.env`)

| Variável | Obrigatória | Usada em | Para quê |
|---|---|---|---|
| `VITE_SUPABASE_URL` | sim | `src/services/supabase.js` (e servidor, ver abaixo) | URL do projeto Supabase |
| `VITE_SUPABASE_ANON_KEY` | sim | `src/services/supabase.js` (e servidor) | chave anónima (pública) |
| `VITE_MARKETING_API_BASE` | não (vazia em produção) | `services/marketingSender.js`, `utils/apiAutenticada.js`, `utils/alertasSeguranca.js`, `AssistenteIdeias.jsx`, `SegurancaMFA.jsx`, `OrganizadorPdf.jsx`, `AdminDashboard.jsx`, `RecursosHumanos.jsx`, `Ausencias.jsx` | prefixo para chamar `/api` noutro servidor |
| `VITE_TRANSFERGEST_API_BASE` | não | `services/transfergestSender.js` | idem só para TransferGest (ignorada se apontar para localhost com a app remota) |
| `VITE_PROJECT_NOTIFICATIONS_API_BASE` | não | `pages/Projetos.jsx`, `pages/Perfil.jsx` | idem para `projeto-criado` e `cc-alerta`. Atenção: se ficar vazia **e** a app estiver em `localhost`, estas páginas não enviam o email (a função devolve `null`) |

### 3.2 Servidor (`process.env`) — funções `api/`, `server/` e `scripts/`

| Variável | Obrigatória | Usada em | Para quê |
|---|---|---|---|
| `VITE_SUPABASE_URL` (ou `SUPABASE_URL`) | sim | `api/_lib/seguranca.js`, `adminMfa.js`, `adminContas.js`, `alertasSeguranca.js`, `marketing/ideias.js`, `scripts/migrar-ficheiros-chat.mjs` | URL do Supabase no servidor |
| `VITE_SUPABASE_ANON_KEY` (ou `SUPABASE_ANON_KEY`) | sim | `seguranca.js` (modo sem service role), `marketing/ideias.js` (lê dados da marca com RLS do utilizador), `adminContas.js` (confirmar palavra-passe) | |
| `SUPABASE_SERVICE_ROLE_KEY` | sim | `api/_lib/*`, `scripts/migrar-ficheiros-chat.mjs` | cliente que ignora RLS: validar sessões, admin de contas/MFA, emails internos, alertas, quotas de IA. **Nunca no browser.** |
| `BREVO_API_KEY` | sim | `server/brevoCampaignSender.js` | todos os emails (perfil "marketing") |
| `BREVO_SENDER_EMAIL` | recomendado | idem | remetente (tem um valor por omissão no código; definir sempre) |
| `BREVO_SENDER_NAME` | não | idem | nome do remetente (omissão "Bizin Manager") |
| `BREVO_BATCH_SIZE`, `BREVO_BATCH_DELAY_MS`, `BREVO_MAX_RETRIES`, `BREVO_REQUEST_TIMEOUT_MS` | não | idem | afinação dos lotes (omissões 75, 1200 ms, 3, 15000 ms) |
| `TRANSFERGEST_BREVO_API_KEY` | não (cai para `BREVO_API_KEY`) | idem, perfil "transfergest" | conta Brevo da TransferGest |
| `TRANSFERGEST_BREVO_SENDER_EMAIL`, `TRANSFERGEST_BREVO_SENDER_NAME` | não | idem | remetente TransferGest |
| `TRANSFERGEST_BREVO_BATCH_SIZE`, `…_BATCH_DELAY_MS`, `…_MAX_RETRIES`, `…_REQUEST_TIMEOUT_MS` | não | idem | afinação |
| `TRANSFERGEST_BREVO_SMTP_KEY` | — | só aparece no `.env.example`; **não é lida por nenhum código** | |
| `RH_EMAIL` | recomendado | `api/_lib/notificacoes.js` (`cc-alerta`) | destino dos avisos de CC alterado (há um email por omissão no código) |
| `APP_URL` | recomendado | `api/_lib/seguranca.js` (`origemApp`, `urlDaApp`), `api/absence-notifications/action.js` | origem oficial da app (ex.: `https://bizin.exemplo.pt`, sem `/` no fim) para links nos emails e validação de links. Sem ela usa o `Origin`/`Host` do pedido; no pg_cron não há `Origin`, por isso os emails de alertas saem sem botão "Ver no Bizin" |
| `ABSENCE_ACTION_SECRET` | só para links antigos | `api/absence-notifications/action.js` | HMAC dos tokens dos emails antigos de ausência (≥ 32 caracteres; sem ela os links antigos abrem só o painel de RH) |
| `ANTHROPIC_API_KEY` | sim para IA | `api/marketing/ideias.js`, `api/organizador/ia.js` (lida pelo SDK) | chave do Claude |
| `ANTHROPIC_WORKSPACE_ID` | não | idem | só se a chave não estiver ligada a um workspace |
| `MARKETING_IA_WEB_SEARCH` | não | `api/marketing/ideias.js` | `off` desliga a pesquisa na web do assistente |
| `NIFPT_KEY` | sim para NIF | `api/_lib/nif.js` | chave do nif.pt. O código aceita também `VITE_NIFPT_KEY` por compatibilidade — **não usar**: com prefixo `VITE_` arrisca acabar no bundle público |
| `JAAS_APP_ID`, `JAAS_KEY_ID` | sim para videochamadas | `api/_lib/reunioes.js` | conta Jitsi as a Service (jaas.8x8.vc → API keys). Não são secretos |
| `JAAS_PRIVATE_KEY` | sim para videochamadas | idem | chave privada RSA (conteúdo do ficheiro `.pk`, com `BEGIN/END`). **Secreta** — só no Vercel/.env. Se for exposta: revogar em jaas.8x8.vc e gerar outra |
| `SEGURANCA_CRON_SEGREDO` | sim para alertas | `api/_lib/alertasSeguranca.js` | segredo partilhado com o pg_cron (≥ 32 caracteres; igual ao `bizin_seguranca_segredo` do Vault) |
| `SUPABASE_ACCESS_TOKEN` | sim para alertas | idem | token pessoal da Management API do Supabase para ler logs |
| `SUPABASE_PROJECT_REF` | não | idem | ref do projeto; por omissão extraída do URL `https://<ref>.supabase.co` |
| `CORS_ORIGINS` | não | `server/index.js` | origens permitidas no Express local (omissão `http://localhost:5173,http://127.0.0.1:5173`) |
| `PORT` | não | `server/index.js` | porta do Express local (omissão 8787) |

Edge function `fetch-caes-sicae`: não lê variáveis de ambiente.

## 4. Desenvolvimento local

```bash
npm ci
cp .env.example .env      # preencher com valores reais (pedir a quem gere as contas)
npm run dev:full          # Vite em :5173 + Express em :8787
```

- Abrir http://localhost:5173/ → login. A conta tem de existir no Supabase (convite) e o 2FA é
  pedido logo no primeiro login.
- O Vite encaminha `/api/*` para `http://localhost:8787` (`vite.config.js`); deixar as
  `VITE_*_API_BASE` vazias.
- O Express escuta só em `127.0.0.1` e replica as rotas de `api/` (mesmos handlers). Ao criar uma
  rota nova em `api/`, registá-la também em `server/index.js`.
- O desenvolvimento local usa **a mesma base de dados Supabase** que estiver no `.env` (não há
  ambiente de staging no repositório). Cuidado com testes de envio de emails e alterações de dados.
- No dev local, `x-vercel-ip-country` não existe, por isso `/api/seguranca/login` nunca deteta
  país.

## 5. Deploy no Vercel

O deploy é feito pelo Vercel a partir do repositório git (integração Git do Vercel; o ramo de
produção é o definido em *Settings → Git*, normalmente `main`). Não há scripts de deploy no repo.

- **Build**: deteção automática Vite (`npm run build`, saída `dist/`).
- **Funções**: cada ficheiro `.js` em `api/` fora de pastas começadas por `_` vira uma função Node.
  Hoje são **10**: `absence-notifications/action`, `admin/[op]`, `cae-descriptions`, `health`,
  `marketing/ideias`, `nif`, `notificacoes/[tipo]`, `organizador/ia`, `seguranca/[op]`,
  `sicae-caes`.
- **Limite do plano Hobby: 12 funções por deploy.** Por isso as rotas relacionadas estão agrupadas
  em routers dinâmicos (`[op]`, `[tipo]`) e o código vive em `api/_lib/`. Para uma rota nova,
  preferir acrescentar um `op`/`tipo` a um router existente em vez de criar ficheiro novo.
- **Duração máxima**: definida em `export const config = { maxDuration }` em cada função
  (15 s `nif`, 60 s `admin`, `notificacoes`, `seguranca`, 120 s `organizador/ia`) e em
  `vercel.json` (300 s para `api/marketing/ideias.js`). No Hobby os limites reais dependem do plano
  (com Fluid Compute até 300 s); confirmar nas definições do projeto se uma função for cortada.
- O Hobby é, nos termos do Vercel, para uso não comercial; considerar o plano Pro se o uso o exigir.

### `vercel.json`

- `rewrites`: tudo o que não começa por `api/` → `/index.html` (SPA).
- `functions`: `api/marketing/ideias.js` com `maxDuration: 300` (conversa longa em SSE).
- `headers` para todas as respostas: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: strict-origin-when-cross-origin`, HSTS 2 anos com subdomínios,
  `Permissions-Policy` (câmara só da própria origem — hoje nenhum código usa a câmara —, sem
  microfone, geolocalização ou pagamentos) e uma `Content-Security-Policy` mínima
  (`frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'`).

### Checklist de um deploy novo (projeto Vercel de raiz)

1. Importar o repositório no Vercel (framework Vite).
2. Definir todas as variáveis da secção 3 em Production (e Preview se for usado).
3. Fazer deploy e abrir `https://<domínio>/api/health` → `{"ok":true,...}`.
4. Configurar o Supabase para o domínio (secção 7).

## 6. Supabase

### 6.1 Migrações

As migrações estão em `supabase/migrations/` com numeração própria (`001_…` a `078_…`), **não** no
formato de timestamp do Supabase CLI. Há números repetidos (`032`, `034`, `039`, `040` têm dois
ficheiros), sufixos (`072b`, `075b`, `077b`, `077c`) e um ficheiro sem número
(`modulo_ativos_ti.sql`). Por isso **não usar `supabase db push`**: as migrações foram e devem ser
aplicadas à mão, por ordem, no *SQL Editor* do dashboard. Muitas têm instruções no cabeçalho
(ex.: "correr DEPOIS de…", blocos para desfazer).

Para uma alteração nova: criar `079_descricao.sql` (próximo número livre), escrever SQL idempotente
(`if not exists`, `drop policy if exists`…) e correr no SQL Editor. Descrição das tabelas e
políticas em [03-base-de-dados.md](03-base-de-dados.md).

Extensões usadas: `pg_cron`, `pg_net` (075b), Vault (`vault.secrets`, 072/075b).

### 6.2 Tarefas agendadas (pg_cron)

Criadas pelas migrações (ver `select * from cron.job;`):

| Job | Quando | O quê | Migração |
|---|---|---|---|
| `bizin-seguranca-recolha` | a cada 10 min | `net.http_post` para o URL guardado no Vault (`bizin_seguranca_url`) com o cabeçalho `x-cron-segredo` (`bizin_seguranca_segredo`) → `POST /api/seguranca/recolher` | `075b_agendar_recolha_logs.sql` |
| `bizin-seguranca-limpeza` | dia 1 às 03:30 | `public.seguranca_limpar(180)` | 075b |
| `provisionar-saldos-ferias-ano-seguinte` | 1 de dezembro, 00:00 | `public.provisionar_saldos_ferias(<ano seguinte>)` | `040_create_vacation_balances.sql` |

`064_audit_log.sql` sugere (comentado) um job `audit-limpeza` para `audit_limpar(730)`.

Diagnóstico da recolha:

```sql
select status, return_message, start_time from cron.job_run_details
 where jobid = (select jobid from cron.job where jobname = 'bizin-seguranca-recolha')
 order by start_time desc limit 10;
select status_code, content, created from net._http_response order by created desc limit 10;
select valor from public.seguranca_estado where chave = 'recolha_logs';  -- última execução/erro
```

### 6.3 Edge function `fetch-caes-sicae`

- Código: `supabase/functions/fetch-caes-sicae/index.ts` (Deno). Configuração em
  `supabase/config.toml`: `verify_jwt = false` (pública, CORS `*`).
- Faz o mesmo que `/api/sicae-caes` (scraping de `sicae.pt`); `pages/Clientes.jsx` usa-a como
  alternativa quando a rota do Vercel falha.
- Deploy: `npx supabase login`, `npx supabase link --project-ref <ref>`,
  `npx supabase functions deploy fetch-caes-sicae`.
- Teste local: `npx supabase functions serve fetch-caes-sicae --no-verify-jwt` e
  `POST http://127.0.0.1:54321/functions/v1/fetch-caes-sicae` com `{"nif":"<9 dígitos>"}`.

### 6.4 Configuração no dashboard (não está no repositório)

- *Authentication → Sign In / Providers*: email com palavra-passe; registo livre desligado
  (contas por convite).
- *Authentication → Multi-Factor*: TOTP ativo.
- *Authentication → URL Configuration*: **Site URL** e **Redirect URLs** (ver secção 7).
- *Storage*: baldes públicos (fotos, fórum, medalhas…) e privados (`rh_anexos`, `documentos`,
  `chat_ficheiros`) — políticas nas migrações 069/071.
- *Database → Extensions*: `pg_cron`, `pg_net`; *Vault* com os segredos `bizin_seguranca_url` e
  `bizin_seguranca_segredo`, e os segredos do cofre de acessos (072).
- *Account → Access Tokens*: token usado em `SUPABASE_ACCESS_TOKEN`.

## 7. Mudança de domínio (ou de projeto Vercel)

Quando a app passar a outro endereço, atualizar **todos** estes pontos:

1. **Vercel**: adicionar o domínio (*Settings → Domains*) e atualizar `APP_URL` para
   `https://<novo-domínio>` (sem `/` final). Fazer redeploy (as variáveis só valem em deploys novos).
2. **Supabase → Authentication → URL Configuration**:
   - *Site URL* → `https://<novo-domínio>` (usado nos emails de convite e recuperação).
   - *Redirect URLs* → acrescentar `https://<novo-domínio>/**` (o `ForgotPassword.jsx` usa
     `${window.location.origin}/reset-password`) e, para dev, `http://localhost:5173/**`.
     Remover o domínio antigo quando deixar de ser usado.
3. **Vault do Supabase** — URL de recolha dos alertas de segurança (senão o pg_cron continua a
   chamar o domínio antigo e os alertas deixam de ser recolhidos). No SQL Editor:

   ```sql
   select vault.update_secret(
       (select id from vault.secrets where name = 'bizin_seguranca_url'),
       'https://<novo-domínio>/api/seguranca/recolher');
   ```

   Confirmar depois com as consultas de diagnóstico da secção 6.2 (esperar `status_code` 200).
4. **Express local**: se o frontend de dev mudar de porta/host, ajustar `CORS_ORIGINS`.
5. Remetentes Brevo: se o domínio de email também mudar, validar o novo domínio/remetente no
   Brevo e atualizar `BREVO_SENDER_EMAIL` / `TRANSFERGEST_BREVO_SENDER_EMAIL`.
6. Links já enviados em emails antigos apontam para o domínio antigo; manter um redirecionamento
   se possível.

### Rodar o segredo do cron

```sql
select vault.update_secret(
    (select id from vault.secrets where name = 'bizin_seguranca_segredo'),
    encode(extensions.gen_random_bytes(32), 'hex'));
select decrypted_secret from vault.decrypted_secrets where name = 'bizin_seguranca_segredo';
```

Copiar o valor para `SEGURANCA_CRON_SEGREDO` no Vercel e fazer redeploy (até lá a recolha devolve 401).

## 8. Problemas comuns

| Sintoma | Causa provável |
|---|---|
| "A API local … não está disponível" / erros de rede em `/api` em dev | correu `npm run dev` em vez de `npm run dev:full` |
| `503 Falta configurar SUPABASE_SERVICE_ROLE_KEY` | variável em falta no Vercel/`.env` |
| `Missing BREVO_API_KEY environment variable.` | idem para o Brevo |
| Assistente de ideias / organizador: "chave … inválida", "sem créditos", "workspace" | ver `ANTHROPIC_API_KEY`, saldo na Claude Console, `ANTHROPIC_WORKSPACE_ID` |
| `429 Atingiu o limite diário` | quota de IA por pessoa (60 ideias/dia, 40 organizador/dia) contada em `audit_log` |
| Alertas de segurança deixaram de chegar | URL do Vault desatualizado, `SEGURANCA_CRON_SEGREDO` diferente do Vault, ou `SUPABASE_ACCESS_TOKEN` expirado — ver `seguranca_estado.valor.ultimo_erro` |
| Utilizador "entra" mas não vê dados | sessão sem 2FA (aal1) — a RLS da migração 071 bloqueia tudo |
