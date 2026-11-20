# Bizin Manager

Aplicação interna da Bizin para gerir o dia a dia da consultora. Cobre projetos e tarefas, clientes e propostas, formação, RH (férias, ausências, assiduidade, km's), marketing, comunicação interna, ativos de TI e ferramentas como o TransferGest e o Organizador de PDFs.

- **Frontend:** React 19 + Vite, com HashRouter (os URLs são `/#/dashboard/...`).
- **Backend:** Supabase (Postgres com RLS, Auth com 2FA obrigatório, Storage, pg_cron, Vault) e funções serverless em `api/` no Vercel.
- **Serviços externos:** Brevo (emails e campanhas), Claude/Anthropic (assistente de ideias e organizador de PDFs, com dados pessoais redigidos antes de serem enviados), nif.pt e SICAE (dados de empresas).

## Arranque rápido

```bash
npm install
cp .env.example .env      # preencher com os valores reais (nunca fazer commit do .env)
npm run dev:full          # Vite (http://localhost:5173) + API local (http://127.0.0.1:8787)
```

Com `npm run dev` arranca só o Vite, e as funcionalidades que usam `/api` (emails, IA, admin, NIF) deixam de funcionar.

| Script | O que faz |
|---|---|
| `npm run dev:full` | Frontend e API local, o modo normal de desenvolvimento |
| `npm run dev` / `npm run dev:server` | Só o frontend / só a API local |
| `npm run build` | Build de produção para `dist/` |
| `npm run lint` | ESLint |

## Estrutura

```
src/pages/          páginas (uma por rota — ver src/App.jsx)
src/components/     componentes partilhados e por área (marketing/, admin/, medalhas/)
src/utils/          lógica reutilizável (saldos de férias, auditoria, cronómetros, PDFs…)
src/content/ajuda/  conteúdo do manual de utilizador (página Ajuda)
src/styles/         um CSS por área + camadas.css (z-index) e acessibilidade.css
api/                funções serverless do Vercel (máx. 12 no plano Hobby)
server/             servidor Express que replica a api/ em desenvolvimento
supabase/           migrações SQL (correm-se à mão no SQL Editor, por ordem) e edge functions
docs/               documentação técnica
```

## Documentação

- **Técnica:** [docs/README.md](docs/README.md). Cobre arquitetura, setup e deploy, base de dados, segurança, API, frontend e cada módulo.
- **Problemas conhecidos:** [docs/riscos-e-pendentes.md](docs/riscos-e-pendentes.md).
- **Manual de utilizador:** está dentro da app, no menu da conta → **Ajuda**.

## Deploy

O deploy é automático no Vercel a cada push para `main`. As variáveis de ambiente configuram-se no painel do Vercel (o `.env` local não é lido lá). A lista completa, com o que cada uma faz, está em [docs/02-setup-e-deploy.md](docs/02-setup-e-deploy.md#3-variáveis-de-ambiente). As principais são:

- **Supabase:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- **Emails:** `BREVO_API_KEY`, `BREVO_SENDER_EMAIL` (e as variantes `TRANSFERGEST_BREVO_*`)
- **IA:** `ANTHROPIC_API_KEY`
- **NIF:** `NIFPT_KEY`
- **App:** `APP_URL`, o domínio oficial, usado nos links dos emails
- **Alertas de segurança:** `SEGURANCA_CRON_SEGREDO`, `SUPABASE_ACCESS_TOKEN`

Para mudar de domínio é preciso atualizar o `APP_URL`, os URLs no Supabase e um segredo no Vault. O checklist está em [docs/02-setup-e-deploy.md](docs/02-setup-e-deploy.md#7-mudança-de-domínio-ou-de-projeto-vercel).

## Regras

- Segredos só no Vercel ou no Supabase Vault, **nunca** no código, no git ou em mensagens.
- Cada tabela nova leva RLS **e** a política restritiva `mfa_obrigatorio` (ver [docs/04-seguranca.md](docs/04-seguranca.md)).
- As migrações são numeradas, idempotentes e correm-se à mão. Ver [docs/03-base-de-dados.md](docs/03-base-de-dados.md).
- Quando mudares um ecrã, atualiza também o ficheiro correspondente em `src/content/ajuda/`.
