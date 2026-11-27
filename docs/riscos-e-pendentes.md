# Riscos e pendentes

Esta lista foi feita a 20/11/2026, ao documentar o código. São achados de leitura de código: **nenhum foi corrigido** e alguns ainda precisam de confirmação em execução (marcados com *"a confirmar"*). Quando resolveres um, risca-o ou apaga-o daqui.

## 🔴 Alta prioridade

### Segurança
1. ~~**Dá para contornar o 2FA nas rotas de admin.**~~ **corrigido (27/11/2026)**: `adminMfa.js` e `adminContas.js` exigem `aal2` (`temAal2()` em `seguranca.js`). `api/_lib/seguranca.js` (`autenticar`), `adminMfa.js` e `adminContas.js` aceitam um token só com password (`aal1`), e a service_role ignora a regra `mfa_obrigatorio`. Quem souber a password de um admin pode chamar `POST /api/admin/mfa {acao:"repor"}` e reconfigurar o 2FA. **Correção:** exigir `aal2` no JWT. Ver [05](05-api-e-servidor.md).
2. ~~**Os emails de campanha mostram os destinatários uns aos outros (RGPD).**~~ **corrigido (27/11/2026)**: `buildPayload` usa `messageVersions` — cada destinatário recebe uma cópia só para si. `server/brevoCampaignSender.js` (`buildPayload`), em modo HTML ou template sem parâmetros por destinatário, mete 75–100 endereços no mesmo `to`. Afeta o TransferGest e as Leads.
3. ~~**O balde `documents` é público**~~ **corrigido (089)**: privado; os anexos e o guia de marca abrem com links temporários. Regras de leitura: quem tem sessão; carregar: gestão + marketing. (migração 013; a 069 só tornou privado `documentos`). Os anexos de Marketing e o guia de marca abrem sem sessão para quem tiver o link.
4. **RLS demasiado aberta.** A 089 fechou `marketing_*` (gestão + marketing; aprovadores só nas suas peças), `software` (Ativos TI), `proposta_cursos` (gestão), `notificacoes_projetos` (só em nome próprio e com links internos) e `provisionar_saldos_ferias` (gestão). Formação (`acoes_formacao*`, `areas_formacao`, `homologacoes_formacao`), `programas_financiamento` e `avisos`: por decisão de 27/11/2026, todos veem, criam e alteram e **só a gestão apaga** (089), como já acontecia com `pedidos_reembolso`. **Resolvido.**

5. **Cofre:** em `acessos_cliente`, qualquer pessoa com 2FA pode revelar qualquer password, sem verificação de papel. **Risco aceite (27/11/2026)**: os colaboradores precisam destes acessos; fica o alerta `cofre_em_massa` (≥ 10 revelações/hora).
6. **O esquema base não está no repositório.** Já há o comando `npm run db:esquema` (gera `supabase/esquema-base.sql`; precisa de `npx supabase login` e `npx supabase link --project-ref <id>` uma vez). `001_initial_schema.sql` está vazia. Tabelas centrais (`profiles`, `clientes`, `projetos`, `tarefas`, `ferias`, `forum_*`, `equipamentos`…) e várias políticas foram criadas no painel. **Fazer um `supabase db dump` do esquema e guardá-lo no repositório.**

### Funcionalidade
7. ~~**Notificações de decisão de férias nunca aparecem.**~~ **corrigido (27/11/2026)**: o tipo está no filtro do Início e no `NotificationsPanel` (verde/vermelho conforme a decisão). O tipo `absence_status_changed` não está no filtro `.in("tipo", …)` de `DashboardHome.jsx` nem no mapa `TIPO` do `NotificationsPanel`.
8. ~~**Recuperação de password partida**~~ **corrigido (25/11/2026)**, confirmado por um colaborador: o ecrã de 2FA aparecia e desaparecia.
   - Causa: o HashRouter + o `AuthContext` terminavam a sessão de recuperação, que não tinha o cookie `bz_mfa`.
   - Ver `utils/recuperacao.js` e a secção "Recuperação de palavra-passe" em `01-arquitetura.md`.
   - ~~Pendente: SMTP próprio~~ **configurado (27/11/2026)**: Supabase → Authentication → Emails → SMTP com o relay da Brevo (`smtp-relay.brevo.com:587`, conta Geoflicks, remetente verificado). Atenção: o bloqueio de IPs não autorizados da Brevo tem de estar desligado (o Supabase envia de IPs variáveis).
9. ~~**Bug nas férias em SQL**~~ **corrigido (090, 27/11/2026)**: confirmado (há `Férias` e `ferias`; o SQL ignorava os com acento e contava feriados e tolerâncias). O SQL passou a contar exatamente como a app (testado), o trigger também reage a tolerâncias e a pedidos apagados, e `transito_expira_em` ficou igual nos dois. **Correr a 090 antes de 1 de dezembro** (o cron prepara 2027 a partir do saldo de 2026).
10. ~~**"Parar e concluir" em `Projetos.jsx` conclui o projeto inteiro**~~ **corrigido (27/11/2026)**: `completeLogItem` conclui o mais específico (tarefa → atividade → projeto)., porque `completeLogItem` dá prioridade ao `projeto_id`.
11. ~~**Os links de entregáveis e anexos de tarefas podem não abrir.**~~ **resolvido**: os cliques em links de baldes privados passam por `instalarAberturaSegura()` (`utils/ficheirosPrivados.js`), que abre um link temporário. Usam `getPublicUrl` no balde `documentos`, que é privado.

## 🟠 Média prioridade

- Anexar um documento a um pedido de férias **aprovado** é bloqueado pelo trigger `ferias_proteger`. Do lado oposto, um colaborador consegue passar um pedido rejeitado para `pendente`.
- O PDF individual de assiduidade pode somar vários meses. O S.A. usa um mínimo de 5 h no ecrã e de 4 h nos PDFs.
- A aprovação em massa de ausências não é atómica. Em `executarAcaoRH` falta o `.eq("estado", esperado)`, por isso dois RH podem decidir o mesmo pedido.
- Os números das propostas são calculados no browser e podem repetir-se. A ordenação é por texto e falha depois do 999.
- A cascata ao concluir atividades é diferente consoante a página: `Tarefas` / `concludeActivityWithChildren` / `ProjetoDetalhe`.
- `Tarefas.handleSubmit` mostra sucesso mesmo quando o Supabase devolve erro (~~`GestaoLeads.updateStatus`~~ resolvido: o CRM das Leads repõe e avisa se a gravação falhar). Editar ou apagar o curso de outra pessoa também diz "sucesso" sem fazer nada.
- Campanhas grandes podem passar os 60 s de `maxDuration` no Vercel.
- Papéis desalinhados:
  - a Sidebar só verifica `admin`, enquanto as rotas aceitam `administrador`;
  - o seletor de papel não oferece `marketing plus`;
  - as políticas de `vacation_balances` referem o papel `rh`, que a app não consegue atribuir.
- Em `api/organizador/ia.js` os dados pessoais só são redigidos no browser; o servidor não volta a redigir o que recebe.
- O `audit_log` não tem limpeza agendada: `audit_limpar` existe, mas não tem cron.
- `/api/sicae-caes`, `/api/cae-descriptions` e a edge function `fetch-caes-sicae` não pedem sessão, por isso funcionam como proxy público para o SICAE.
- `api/_lib/nif.js` aceita `VITE_NIFPT_KEY`. Uma variável com prefixo `VITE_` corre o risco de ir parar ao bundle público.

- **Enviar Agora** (Leads) e **Enviar** (TransferGest) não pedem confirmação (um duplo clique ou um reenvio igual nos 15 min seguintes já não manda emails a dobrar: idempotência, migração 081). Em Leads, com **Arquivo** marcado, os contactos arquivados também recebem a campanha.
- O Organizador de PDFs diz "100% local · nada é enviado", mas **Pedir à IA** envia texto (já redigido) para o servidor.
- Em Tarefas, quem vê a equipa toda é decidido por `profiles.tipo`, e não por `role`.

## 🟡 Baixa prioridade / limpeza

- `AuthProvider` está montado duas vezes (`main.jsx` e `App.jsx`).
- Várias datas "de hoje" usam `toISOString()` (UTC) e dão o dia errado entre as 00:00 e as 01:00 no verão.
- Tooltips com z-index 1011 ficam por baixo de `--z-modal-topo`/`--z-modal-max`.
- Fórum:
  - os rascunhos de comentários ainda re-renderizam o `Forum.jsx` inteiro a cada tecla (o chat já foi resolvido com o `ChatComposer`);
  - polling de 1,2 s em paralelo com o Realtime;
  - o chat privado encontra a pessoa por nome.
- ~~`PAGE_TITLES` não tem marketing, registos nem pedidos~~ **resolvido**.
- TransferGest: lista de campanhas sem paginação (corta nas 1000); um NIF repetido no CSV faz falhar a importação toda.
- Migrações:
  - números repetidos (032, 034, 039, 040) e falta a 037;
  - a 031 está em UTF-16;
  - a 013 e a 015 usam `create policy if not exists`, que não é válido;
  - `modulo_ativos_ti.sql` é um rascunho que nunca foi aplicado.
- O CSV dos Registos não neutraliza fórmulas (`=`, `+`, `-`, `@`).
- Código morto:
  - `SignUp.jsx`;
  - `setLearnedEntities`, `generateSmartFilename` e outras funções do motor de PDF;
  - `THEME_KEYS`;
  - `aprovar_pedido_ferias_por_email`.
- Textos sem acento ou em português do Brasil nos modais do cronómetro ("Cronômetro", "Concluido"…).
- `README.md` da raiz e `REFERENCIA_TEMAS.txt` desatualizados.

Os pormenores de cada ponto estão na secção de riscos do documento do módulo respetivo.
