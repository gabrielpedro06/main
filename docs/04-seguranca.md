# 04 · Segurança

> Como o Bizin Manager protege os dados: papéis, RLS, MFA obrigatório, auditoria, alertas de
> segurança, cofre de credenciais, ficheiros privados, redação antes da IA e o que fazer na manutenção.
> Modelo de dados completo em [03-base-de-dados.md](03-base-de-dados.md); endpoints em
> [05-api-e-servidor.md](05-api-e-servidor.md); variáveis de ambiente em [02-setup-e-deploy.md](02-setup-e-deploy.md).

Princípio geral: **o browser fala diretamente com o Supabase** usando a chave pública (anon). Tudo o
que impede um utilizador de ver/alterar o que não deve está **na base de dados** (RLS, triggers,
funções) — os ecrãs da app só escondem botões. O servidor (Vercel, `api/`) usa a chave de serviço
(ignora RLS) e por isso **verifica sempre a sessão e o papel antes** de a usar.

---

## 1. Modelo de autorização

### 1.1 Papéis

O papel está em `profiles.role` (enum `user_role`), com `profiles.tipo` (texto) como fallback antigo.
Valores em uso: `admin`, `administrador`, `gestor`, `colaborador`, `marketing`, `marketing plus`;
algumas regras de RH aceitam também `rh` / `recursos humanos`.

| Grupo | Papéis | Na BD | No servidor (`api/_lib/seguranca.js → PAPEIS`) |
|---|---|---|---|
| admin | `admin`, `administrador` | `bizin_e_admin()` | `PAPEIS.admin` |
| staff / RH | admin + `gestor` | `bizin_e_staff()` | `PAPEIS.gestao` |
| acessos TI | staff + `marketing plus` | `bizin_pode_acessos_ti()` | — |
| marketing | staff + `marketing`, `marketing plus` | (sem regra na BD) | `PAPEIS.marketing` |
| RH em saldos de férias | staff + `rh`, `recursos humanos` | política em `vacation_balances` | — |

Funções de apoio (migração 068, todas `security definer`, `set search_path = public`, `EXECUTE` só a
`authenticated`):

* `bizin_papel()` → `lower(coalesce(role::text, tipo::text, ''))` do utilizador atual.
* `bizin_e_admin()` → papel em (`admin`, `administrador`).
* `bizin_e_staff()` → papel em (`admin`, `administrador`, `gestor`).

São `security definer` para poderem ler `profiles` sem recursão de RLS. Quem muda papéis:
só administradores, pelo endpoint `POST /api/admin/contas` (ação `papel`, exige a palavra-passe de
quem pede) — o trigger `profiles_proteger` impede qualquer outra via (exceto service role / SQL Editor).

Desativar uma pessoa (`/api/admin/contas`, ação `definir`): `profiles.ativo = false` **e** `ban_duration`
de ~100 anos no Supabase Auth (deixa de conseguir renovar a sessão). `autenticar()` no servidor recusa
contas com `ativo = false`.

### 1.2 RLS por tabela (resumo)

Todas as tabelas abaixo têm RLS ativo **e** a política restritiva `mfa_obrigatorio` (§ 2).

| Tabela(s) | Ler | Escrever |
|---|---|---|
| `profiles` | todos os autenticados (política manual "Ver toda a equipa") | o próprio; staff (todos). Trigger `profiles_proteger` limita campos |
| `profiles_privado` | o próprio; staff | o próprio; staff. `valor_sa` só staff (trigger). Sem DELETE |
| `ferias` | o próprio; linhas sem `user_id` (tolerâncias); staff | criar/alterar: o próprio ou staff (trigger `ferias_proteger` impede autoaprovação); apagar: staff |
| `vacation_balances` | o próprio; admin/administrador/rh | inserir/atualizar: staff + rh |
| `assiduidade`, `task_logs` | todos | o próprio; staff |
| `app_settings` | todos | staff |
| `rh_settings` | o próprio; staff | staff |
| `transfergest_registos` | staff | staff |
| `pedidos_reembolso` | todos | criar/alterar: todos; apagar: staff |
| `entidade_configuracoes` | todos | criar: todos; alterar/apagar: criador ou staff |
| `propostas_comerciais` | (no repo) só as próprias; há regras manuais para admin | as próprias |
| `cursos` | autenticados | criar: todos; alterar/apagar: criador |
| `acoes_formacao*`, `areas_formacao`, `homologacoes_formacao`, `programas_financiamento`, `avisos` (089) | autenticados | criar/alterar: autenticados; apagar: gestão |
| `marketing_*` (089) | gestão + `marketing`/`marketing plus` (`bizin_pode_marketing()`); `marketing_marcas`: todos; `marketing_conteudos`: também os aprovadores da peça | gestão + marketing; aprovadores podem alterar as suas peças |
| `software` (089) | `bizin_pode_acessos_ti()` | `bizin_pode_acessos_ti()` |
| `proposta_cursos` (089) | gestão | gestão |
| `medalhas`, `medalhas_colaboradores` | autenticados | `pode_gerir_medalhas()` (admin/gestor) |
| `chat_rooms` | participantes | criar: autenticados |
| `chat_participants` | o próprio; membros da sala | `chat_pode_adicionar()` (membro, criador, ou o próprio em grupos) |
| `chat_messages` | membros | membro e `sender_id = auth.uid()` |
| `chat_room_reads` | membros | o próprio, se membro |
| `forum_comment_likes`, `forum_reactions`, `chat_reactions` | autenticados | o próprio |
| `notificacoes_projetos` | o próprio | inserir (089): qualquer autenticado, mas só com `created_by` = o próprio (ou vazio) e `link` interno (`/…`); alterar/apagar: o próprio |
| `projetos_estado_historico` | quem vê o projeto | só triggers |
| `audit_log` | admin | ninguém (só funções definer e service role) |
| `tentativas_login`, `logs_supabase_*`, `seguranca_estado` | admin | só service role |
| `alertas_seguranca` | admin | admin só pode mudar `visto_por`/`visto_em` (grant por coluna) |

Políticas no Postgres **somam-se** (basta uma permissiva dizer "sim"). A 070 apagou várias políticas
antigas criadas no painel do tipo "Permitir tudo a todos" que anulavam as regras certas. Ao rever
permissões, olhar sempre para **todas** as políticas da tabela:

```sql
select tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies where schemaname = 'public' and tablename = 'ferias';
```

### 1.3 Funções `security definer` e anónimos

* O Supabase dá `EXECUTE` em funções novas a `anon` e `authenticated` por omissão, e
  `revoke ... from public` **não** retira isso. A 068 corrigiu as funções existentes e fez
  `alter default privileges in schema public revoke execute on functions from anon, public`.
  Funções novas continuam executáveis por `authenticated` até haver `revoke` explícito.
* Funções de trigger e internas: `revoke all ... from public, anon, authenticated`.
* Só servidor: `calcular_dias_ferias_gozados`, `aprovar_pedido_ferias_por_email`,
  `seguranca_criar_alerta` (→ `service_role`).
* Única função aberta a `anon`: `bizin_programas_financiamento()` (§ 7).

---

## 2. MFA / TOTP obrigatório

### Na base de dados (071)
Política **restritiva** em **todas** as tabelas de `public` com RLS (no momento da 071) e em
`storage.objects`:

```sql
create policy mfa_obrigatorio on public.<tabela> as restrictive for all to authenticated
  using ((auth.jwt() ->> 'aal') = 'aal2') with check ((auth.jwt() ->> 'aal') = 'aal2');
```

Uma sessão só com palavra-passe (`aal1`) não lê nem escreve nada, mesmo chamando a API do Supabase
diretamente. Não afeta a service role, o SQL Editor, nem os URLs públicos de baldes públicos.
Tabelas criadas depois da 071 levam a política na própria migração (072 `profiles_privado`, 075
tabelas de segurança) — **as próximas também têm de levar** (ver § 8). Para listar tabelas sem ela:

```sql
select c.relname from pg_class c
where c.relnamespace = 'public'::regnamespace and c.relkind = 'r' and c.relrowsecurity
  and not exists (select 1 from pg_policies p where p.schemaname = 'public'
                  and p.tablename = c.relname and p.policyname = 'mfa_obrigatorio');
```

A 071 tem no fim um bloco **DESFAZER** comentado (apaga a política em todas as tabelas) para emergências.

### Na app
* `src/context/AuthContext.jsx`: depois da palavra-passe usa
  `supabase.auth.mfa.getAuthenticatorAssuranceLevel()`; se `nextLevel = aal2` pede o código,
  se a conta não tem fator obriga a configurar a app autenticadora (TOTP).
* Validade local da verificação: cookie de sessão `bz_mfa` + carimbo `bz-mfa-at` em `localStorage`,
  máximo **12 horas**; falta um dos dois → `signOut()`.
* Admin pode ver o estado do MFA de cada pessoa e **repor** (apaga os fatores) via
  `POST /api/admin/mfa` (`api/_lib/adminMfa.js`, evento `mfa_reposto` no `audit_log`).
* O cofre (`cofre_verificar`) volta a exigir `aal2` explicitamente.

---

## 3. Auditoria (`audit_log`, migração 064)

* **Trigger `trg_audit`** em todas as tabelas de `public` (exceto as de `audit_excluida()`:
  `audit_log`, `chat_messages`, `chat_room_reads`, `notificacoes_projetos` e as 5 tabelas de segurança).
  * INSERT → `dados_depois`; DELETE → `dados_antes`; UPDATE → só os campos alterados
    (`campos_alterados`, antes/depois), ignorando `updated_at`/`atualizado_em`.
  * `audit_mascarar()` substitui por `•••` chaves que pareçam segredos
    (`passw|senha|password|token|secret|segredo|api_key|chave_api|credencia|private_key|^codigo$`) e corta
    textos com mais de 4000 caracteres.
  * Nunca bloqueia a operação original (erros → `raise warning`).
  * Tabelas novas: o event trigger `trg_audit_nova_tabela` liga o `trg_audit` automaticamente; se o
    Supabase não tiver deixado criar o event trigger, correr `select public.audit_ativar();`.
  * `transacao` (075) = `txid_current()`, para distinguir "1 apagar em cascata" de "50 apagares".
* **Eventos da aplicação** (`operacao = 'EVENTO'`, coluna `acao`):

  | Origem | Eventos |
  |---|---|
  | `src/utils/registarEvento.js` → RPC `registar_evento` | `login` (fallback), `logout`, `sessao_expirada`, `acesso_negado` (`AuthContext.jsx`, `Login.jsx`), `exportacao` (Clientes, Projetos, RH, Ativos TI, Ações de Formação, TransferGest, Leads — com `detalhes.linhas` e `detalhes.area`), `exportar_registos` (`RegistoAtividade.jsx`) |
  | Servidor (`auditar()` / insert com service role) | `login` (com IP/país), `ia_organizador`, `ia_ideias_marketing` (servem também de quota diária), `colaborador_desativado`, `colaborador_reativado`, `contas_inativas_bloqueadas`, `papel_alterado`, `mudanca_papel_recusada`, `mfa_reposto` |
  | BD | `credencial_revelada` (`cofre_revelar`) |

* **Quotas de IA**: `consumirQuota()` conta eventos do dia (UTC) no `audit_log` — 40/dia para o
  organizador de PDFs, 60/dia para ideias de marketing.
* Leitura: só admins (`audit_log_select_admin`), ecrã `src/pages/RegistoAtividade.jsx` e
  `components/admin/AdminVisaoGeral.jsx`.
* Retenção: `audit_limpar(p_dias default 730)` existe mas **não está agendada**.

---

## 4. Alertas de segurança (075, 075b)

### Componentes

| Peça | Onde | Papel |
|---|---|---|
| `tentativas_login` | BD | Falhas de palavra-passe/2FA/conta bloqueada (`email`, `ip`, `pais`, `motivo`, `agente`) |
| `alertas_seguranca` | BD | Alertas (`tipo`, `gravidade alta/media/baixa`, `titulo`, `mensagem`, `chave` de deduplicação, `email_enviado`, `email_tentativas`, `visto_por/_em`) |
| `logs_supabase_api` | BD | Pedidos à API do Supabase agrupados por IP + método + caminho normalizado + estado, por janela |
| `logs_supabase_auth` | BD | Eventos/erros do Auth (`id` do log = PK, sem duplicados) |
| `seguranca_estado` | BD | `chave='recolha_logs'`: `ate` (fim da última janela), `ultima_execucao`, `ultimo_sucesso`, `ultimo_erro`, `ultimo_resumo` |
| `seguranca_criar_alerta(...)` | BD (definer, só service_role) | Insere o alerta (máx. **1 por `chave` por hora** e **30 por hora no total**) e cria uma notificação `tipo='seguranca'` em `notificacoes_projetos` para cada admin ativo, com link `/dashboard/registos?alertas=1` |
| `seguranca_vigiar_audit()` / `trg_seguranca_vigiar` | BD, AFTER INSERT em `audit_log` | Regras sobre o registo de atividade (abaixo) |
| `api/_lib/alertasSeguranca.js` via `api/seguranca/[op].js` | Vercel | `POST /api/seguranca/tentativa`, `/login`, `/recolher` |
| `src/utils/alertasSeguranca.js` | Browser | `reportarTentativaFalhada(email, motivo)` (nunca envia a palavra-passe/código) e `registarLoginSeguro()` |
| `components/admin/AlertasSeguranca.jsx` | Browser | Lista e "marcar como visto" |

### Regras e limiares

Na BD (`seguranca_vigiar_audit`):

| Tipo | Condição | Gravidade |
|---|---|---|
| `apagar_em_massa` | mesma pessoa, últimos 10 min: ≥ 20 operações (transações) DELETE **ou** ≥ 200 linhas apagadas | alta |
| `cofre_em_massa` | ≥ 10 `credencial_revelada` na última hora pela mesma pessoa | alta |
| `conta_desativada` | evento `acesso_negado` | média |
| `exportacao_grande` | evento `exportacao`/`exportar_registos` com `detalhes.linhas ≥ 500` | média |

No servidor (`LIM` em `api/_lib/alertasSeguranca.js` — ajustar aí):

| Tipo | Condição |
|---|---|
| `login_falhado` | ≥ 5 falhas na mesma conta **ou** no mesmo IP em 15 min (via `/tentativa`); ou ≥ 5 recusas de `token/verify/factors/otp` nos logs do Auth por IP |
| `conta_desativada` | tentativa com `motivo = conta_bloqueada` |
| `login_estrangeiro` | login com sucesso com `x-vercel-ip-country` ≠ `PT` |
| `api_negado` | ≥ 20 respostas 401/403 da API por IP por 10 min |
| `leitura_volumosa` | ≥ 1500 GET por IP por 10 min a tabelas sensíveis (`clientes`, `contactos_cliente`, `moradas_cliente`, `acessos`, `acessos_cliente`, `profiles_privado`, `ferias`, `rh_anexos`, `marketing_leads`, `marketing_prospects`, `transfergest_registos`, `equipamentos`, `software`) |
| `downloads_volume` | ≥ 300 downloads de storage por IP por 10 min |

Anti-inundação em `/tentativa`: acima de 40 registos por IP em 15 min deixa de gravar (responde 200 na mesma).

### Recolha (cron de 10 em 10 minutos)

1. pg_cron `bizin-seguranca-recolha` (`*/10 * * * *`) faz `net.http_post` para o URL guardado no
   Vault em **`bizin_seguranca_url`**, com cabeçalho `x-cron-segredo` = segredo do Vault
   **`bizin_seguranca_segredo`**.
2. `/api/seguranca/recolher` valida o cabeçalho contra `SEGURANCA_CRON_SEGREDO` (≥ 32 caracteres,
   `timingSafeEqual`).
3. Lê os logs na Management API do Supabase
   (`https://api.supabase.com/v1/projects/<ref>/analytics/endpoints/logs`) com `SUPABASE_ACCESS_TOKEN`
   (ref do projeto = `SUPABASE_PROJECT_REF` ou extraído de `VITE_SUPABASE_URL`). Janela: desde
   `seguranca_estado.valor.ate` até agora − 1 min (máx. 23 h).
4. Grava em `logs_supabase_api` / `logs_supabase_auth`, aplica os limiares (escalados ao tamanho da janela),
   atualiza `seguranca_estado` e chama `enviarAlertasPendentes()`.
5. **Email**: alertas com `email_enviado = false`, < 3 tentativas e das últimas 24 h são "reservados"
   (update condicional) e enviados num só email aos admins ativos via **Brevo**
   (`server/brevoCampaignSender.js`, `sendTransactionalCampaign`, perfil `marketing` → `BREVO_API_KEY`,
   `BREVO_SENDER_*`). Se falhar, voltam à fila com `email_tentativas + 1`.
6. Limpeza: cron `bizin-seguranca-limpeza` (`30 3 1 * *`) → `seguranca_limpar(180)` apaga logs e
   tentativas com mais de 180 dias (mín. 30); os alertas ficam.

Diagnóstico rápido:
```sql
select valor from seguranca_estado where chave = 'recolha_logs';
select status, return_message, start_time from cron.job_run_details
 where jobid = (select jobid from cron.job where jobname = 'bizin-seguranca-recolha')
 order by start_time desc limit 10;
select status_code, content, created from net._http_response order by created desc limit 10;
```

---

## 5. Cofre de credenciais

* Palavras-passe de **Clientes → Acessos** (`acessos_cliente`) e **Ativos TI → Acessos** (`acessos`)
  vivem no **Supabase Vault** (`vault.secrets`, cifrado). A tabela só guarda `segredo_id`.
* `src/utils/cofre.js`:
  * `semPalavraPasse(linhas, tabela)` — tira a coluna antiga das listas e marca `tem_palavra_passe`;
  * `revelarPalavraPasse(tabela, id)` → RPC `cofre_revelar` (mostrar/copiar; regista `credencial_revelada`);
  * `guardarPalavraPasse(tabela, id, valor)` → RPC `cofre_guardar` (vazio = apagar).
* Verificações (`cofre_verificar`): sessão `aal2`; para `acessos` exige `bizin_pode_acessos_ti()`;
  para `acessos_cliente` basta estar autenticado com 2FA.
* Ao apagar a linha, o trigger `cofre_apagar_segredo` apaga o segredo.
* As colunas antigas (`codigo`, `password`) foram esvaziadas na 073 (irreversível).
* Muitas revelações seguidas geram o alerta `cofre_em_massa`.

---

## 6. Outras proteções

### 6.1 SQL injection
* Não há SQL montado no cliente nem no servidor: tudo passa pelo `supabase-js`/PostgREST, que
  parametriza os valores. As funções SQL com SQL dinâmico usam `format('%I')` e `execute ... using`.
* Ponto fraco do PostgREST: filtros em texto como `.or("user_id.eq.X,...")` — um valor com vírgulas ou
  parênteses podia alterar o filtro. **Regra**: valores interpolados em `.or()` passam por
  `src/utils/filtroSeguro.js`:
  * `uuidSeguro(v)` → o UUID ou `00000000-0000-0000-0000-000000000000`;
  * `dataSegura(v)` → data ISO ou `1970-01-01`.
  Hoje todos os `.or()` com interpolação usam estas funções (`CalendarioColaborador.jsx`, `Ausencias.jsx`,
  `RecursosHumanos.jsx`, `AprovarPedido.jsx`, `utils/feriasSaldo.js`). Os `.ilike()` com
  `` `${sigla}-${ano}-%` `` são parametrizados (no máximo alargam a pesquisa com `%`/`_`).
* No servidor: `escapeHtml()` em tudo o que entra em HTML de emails, `emailsInternos()` só deixa enviar
  para emails de perfis ativos, `urlDaApp()` só aceita links para a própria app.

### 6.2 Ficheiros privados (069, 070)
* Baldes privados: `rh_anexos` (o próprio por prefixo `<user_id>_` e staff), `documentos` (autenticados;
  apagar: dono/staff), `chat_ficheiros` (pasta `<room_id>/`, só participantes).
* Públicos: `avatars`, `forum_media`, `medalhas`, `documents` (ver riscos).
* `src/utils/ficheirosPrivados.js`: `instalarAberturaSegura()` interceta cliques em links para baldes
  privados e abre um **URL assinado de 10 minutos**; `useUrlAssinado(url)` para `<img>`; cache local.
* Todos os acessos autenticados a `storage.objects` exigem `aal2`.

### 6.3 Dados pessoais
* NIF, NISS, CC, morada, etc. em `profiles_privado` (só o próprio e staff) — ver
  [03 § 1](03-base-de-dados.md#1-perfis-utilizadores-e-configurações).
* Ausências: um colaborador só lê as suas (074) — o tipo (ex.: doença) e o anexo não são visíveis à equipa.

### 6.4 Redação antes da IA
* O **Organizador de PDFs** (`src/pages/OrganizadorPdf.jsx`) envia ao servidor **só texto**, já
  passado por `redigir()` de `src/utils/iaRedacao.js`, que substitui: emails `[EMAIL]`, IBAN `[IBAN]`,
  NISS (+ nome a seguir) `[NISS] [NOME]`, NIF de pessoas singulares (começa por 1, 2, 3 ou 45 e é válido)
  `[NIF]` — os de empresas ficam —, nºs de conta `[CONTA]`, cartões `[CARTAO]`, telemóveis `[TELEFONE]`,
  nomes em transferências bancárias e em "Trabalhador:/Colaborador:" `[NOME]`.
* `api/organizador/ia.js`: exige sessão (`autenticar`), quota de 40/dia, limita a 40 páginas e 3500
  caracteres por página, e instrui o modelo a nunca adivinhar os campos tapados. Chave `ANTHROPIC_API_KEY`
  (e `ANTHROPIC_WORKSPACE_ID` opcional) só no servidor.
* O assistente de ideias de Marketing (`api/marketing/ideias.js`) usa dados de marketing (não pessoais),
  com quota de 60/dia.

### 6.5 Aprovação de ausências
* Links antigos dos emails (`/api/absence-notifications/action`, token HMAC com `ABSENCE_ACTION_SECRET`)
  **já não alteram nada**: redirecionam para `#/dashboard/pedidos/<id>`, onde é preciso login + 2FA.
* A decisão é feita no browser (`utils/decisaoPedido.js`) com `update ... eq('estado', <anterior>)` e as
  regras da BD (`ferias_proteger`, RLS) garantem que só staff aprova.

---

## 7. Catálogo público para o BizInControl (078)

O BizInControl (aplicação externa) lê com a **chave pública, sem sessão**. Desde a 070 a tabela
`programas_financiamento` só é legível com sessão, por isso a 078 criou:

```sql
public.bizin_programas_financiamento() returns table (nome text)  -- security definer, search_path=public
grant execute ... to anon, authenticated;
```

Devolve **só os nomes** de todos os programas (ativos e inativos). A tabela continua protegida; colunas
novas não ficam públicas. Se o BizInControl precisar de mais campos, acrescentá-los à função um a um, e
só se puderem ser públicos (a chave anon está no site, qualquer pessoa a pode usar). Chamada:
`POST <SUPABASE_URL>/rest/v1/rpc/bizin_programas_financiamento` com o cabeçalho `apikey`.

---

## 8. Checklist de manutenção

### Rotação de chaves / segredos (nomes das variáveis; valores nunca no repo)

| O quê | Onde rodar | Onde atualizar |
|---|---|---|
| Chave **service role** do Supabase | Supabase → Settings → API (rodar a JWT secret/keys) | Vercel: `SUPABASE_SERVICE_ROLE_KEY` (e `server/` local). Atenção: rodar o JWT secret invalida também a chave anon → atualizar `VITE_SUPABASE_ANON_KEY` e **fazer novo build** (as `VITE_*` ficam embutidas no bundle) e avisar o BizInControl |
| `SUPABASE_ACCESS_TOKEN` (Management API, logs) | supabase.com → Account → Access Tokens | Vercel |
| **Brevo** | Painel Brevo → SMTP & API | Vercel: `BREVO_API_KEY` (e `TRANSFERGEST_BREVO_API_KEY` se existir) |
| **Anthropic** | Consola Anthropic | Vercel: `ANTHROPIC_API_KEY` (+ `ANTHROPIC_WORKSPACE_ID`) |
| Segredo do cron de segurança | SQL: `select vault.update_secret((select id from vault.secrets where name='bizin_seguranca_segredo'), '<novo>');` | Vercel: `SEGURANCA_CRON_SEGREDO` com o **mesmo** valor (≥ 32 caracteres), e redeploy |
| `ABSENCE_ACTION_SECRET` | gerar novo | Vercel (só afeta links de emails antigos) |

### Mudança de domínio da app
1. Atualizar o URL de recolha no Vault:
   ```sql
   select vault.update_secret((select id from vault.secrets where name = 'bizin_seguranca_url'),
                              'https://<novo-dominio>/api/seguranca/recolher');
   ```
2. `APP_URL` no Vercel (links dos emails e redirecionamentos).
3. Supabase → Authentication → URL Configuration (Site URL e Redirect URLs).
4. Confirmar em `net._http_response` que a recolha devolve 200.

### Limpeza periódica
* Automática: `seguranca_limpar(180)` mensal (cron `bizin-seguranca-limpeza`).
* Manual/por agendar: `select public.audit_limpar(730);` — ou criar o cron sugerido na 064:
  `select cron.schedule('audit-limpeza', '0 3 1 * *', $c$select public.audit_limpar(730)$c$);`

### Ao criar tabelas / funções
* RLS + políticas `to authenticated` + **`mfa_obrigatorio`** + `revoke all ... from anon`.
* Confirmar `trg_audit` (ou `select public.audit_ativar();`); tabelas ruidosas → `audit_excluida()`.
* Funções definer: `set search_path`, `revoke ... from public, anon`, grants mínimos.
* Correr a consulta de "tabelas sem `mfa_obrigatorio`" do § 2.

### Verificações periódicas
* `select * from alertas_seguranca where visto_em is null order by created_at desc;`
* `seguranca_estado` sem `ultimo_erro` e `ultimo_sucesso` recente.
* `select jobname, schedule, active from cron.job;` (3 jobs esperados).
* Políticas com `qual = 'true'` para `public`/`anon`:
  `select tablename, policyname, roles, cmd from pg_policies where schemaname='public' and (roles @> '{public}' or roles @> '{anon}');`

---

## 9. Riscos e pendentes conhecidos

1. **Políticas e esquema fora do repo** (painel do Supabase): `profiles`, `equipamentos`,
   `propostas_comerciais` (leitura de admin), baldes `avatars`/`forum_media`/`documents`,
   `handle_new_user`, `bizin_projetos_por_cliente_nif`, `get_tabelas_externas`, `get_colunas_externas`.
   Não é possível auditar tudo pelo código; fazer um dump do esquema e das políticas.
2. **Balde `documents` é público** (criado na 013, não tocado pela 069): anexos e guia de marca do
   Marketing (`marketing/Anexos.jsx`, `MarcaGuia.jsx`) ficam acessíveis a quem tiver o link, sem sessão
   nem 2FA. Ficheiros antigos do chat também lá estavam até correr `scripts/migrar-ficheiros-chat.mjs`.
3. **Cofre `acessos_cliente`**: qualquer colaborador com 2FA pode revelar qualquer palavra-passe de cliente
   (não há verificação de papel, ao contrário de `acessos`). Mitigado só pelo alerta `cofre_em_massa` (≥ 10/h).
4. **Tabelas "abertas a todos os autenticados" para escrita**: `marketing_*`, `acoes_formacao*`,
   `areas_formacao`, `homologacoes_formacao`, `software`, `proposta_cursos`, `programas_financiamento`,
   `avisos`, `pedidos_reembolso` (exceto apagar), `entidade_configuracoes` (inserir). O controlo é só nos ecrãs.
5. **`notificacoes_projetos`**: qualquer autenticado pode criar notificações para qualquer pessoa com
   `link` arbitrário (possível phishing interno).
6. **`provisionar_saldos_ferias`** é executável por qualquer autenticado (para qualquer ano) e reescreve
   `dias_gozados` com o cálculo SQL (que provavelmente não reconhece `"Férias"` com acento — ver
   [03 § 19](03-base-de-dados.md#19-problemas-conhecidos-nas-migrações-e-no-modelo)).
7. **`vacation_balances`**: gestor escreve mas não lê saldos de outros (política de SELECT da 040 não inclui `gestor`).
8. **`ferias_proteger`**: um colaborador pode passar um pedido `rejeitado` para `pendente` e mudar-lhe as datas
   (só `aprovado`/`rejeitado` estão vedados como estado novo); um pedido aprovado pode passar a
   `pedido_cancelamento` com datas alteradas no mesmo update.
9. **`bizin_cc_a_expirar`** aceita qualquer pessoa cuja `funcao` contenha "rh" (`like '%rh%'`), o que pode
   apanhar funções que não são de RH.
10. **`/api/seguranca/tentativa`** é público (por desenho): alguém pode gerar alertas falsos/emails aos
    admins; limitado a 1 por chave/hora e 30/hora no total, e 40 gravações por IP/15 min.
11. **`audit_log` sem retenção agendada** (`audit_limpar` existe, cron não). O `audit_mascarar` esconde
    qualquer campo `codigo`, mesmo quando não é segredo.
12. **MFA em tabelas futuras**: a 071 não é retroativa para tabelas novas; esquecer a política numa
    migração nova deixa essa tabela acessível com `aal1`.
13. **`alter default privileges`** da 068 só retira `EXECUTE` a `anon`/`public`; funções novas ficam
    executáveis por `authenticated` sem `revoke` explícito.
14. A Edge Function `fetch-caes-sicae` tem `verify_jwt = false` e CORS `*` (só faz scraping do SICAE,
    não toca na BD, mas pode ser usada por terceiros como proxy).
