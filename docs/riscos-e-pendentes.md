# Riscos e pendentes

Esta lista foi feita a 20/11/2026, ao documentar o código. São achados de leitura de código: **nenhum foi corrigido** e alguns ainda precisam de confirmação em execução (marcados com *"a confirmar"*). Quando resolveres um, risca-o ou apaga-o daqui.

## 🔴 Alta prioridade

### Segurança
1. **Dá para contornar o 2FA nas rotas de admin.** `api/_lib/seguranca.js` (`autenticar`), `adminMfa.js` e `adminContas.js` aceitam um token só com password (`aal1`), e a service_role ignora a regra `mfa_obrigatorio`. Quem souber a password de um admin pode chamar `POST /api/admin/mfa {acao:"repor"}` e reconfigurar o 2FA. **Correção:** exigir `aal2` no JWT. Ver [05](05-api-e-servidor.md).
2. **Os emails de campanha mostram os destinatários uns aos outros (RGPD).** `server/brevoCampaignSender.js` (`buildPayload`), em modo HTML ou template sem parâmetros por destinatário, mete 75–100 endereços no mesmo `to`. Afeta o TransferGest e as Leads.
3. **O balde `documents` é público** (migração 013; a 069 só tornou privado `documentos`). Os anexos de Marketing e o guia de marca abrem sem sessão para quem tiver o link.
4. **RLS demasiado aberta.** Qualquer utilizador autenticado pode escrever em:
   - `marketing_*`
   - `acoes_formacao*`
   - `software` (incluindo `licenca_chave` em claro)
   - `proposta_cursos`
   - `programas_financiamento`
   - `avisos`
   - `pedidos_reembolso`
   - `notificacoes_projetos` (dá para criar notificações para qualquer pessoa, com link arbitrário)

   Além disso, qualquer utilizador autenticado pode executar `provisionar_saldos_ferias`.
5. **Cofre:** em `acessos_cliente`, qualquer pessoa com 2FA pode revelar qualquer password, sem verificação de papel.
6. **O esquema base não está no repositório.** `001_initial_schema.sql` está vazia. Tabelas centrais (`profiles`, `clientes`, `projetos`, `tarefas`, `ferias`, `forum_*`, `equipamentos`…) e várias políticas foram criadas no painel. **Fazer um `supabase db dump` do esquema e guardá-lo no repositório.**

### Funcionalidade
7. **Notificações de decisão de férias nunca aparecem.** O tipo `absence_status_changed` não está no filtro `.in("tipo", …)` de `DashboardHome.jsx` nem no mapa `TIPO` do `NotificationsPanel`.
8. **Recuperação de password provavelmente partida** *(a confirmar)*:
   - o `redirectTo` aponta para `/reset-password` (caminho real) mas a app usa HashRouter;
   - o `AuthContext` termina sessões sem o cookie `bz_mfa`.
9. **Possível bug nas férias em SQL** *(a confirmar com `select distinct tipo from ferias`)*:
   - as funções reconhecem férias com `lower(tipo) like '%fer%'`, mas a app grava "Férias" com acento;
   - SQL e JS calculam os dias gozados de maneiras diferentes (o SQL não desconta feriados nem tolerâncias);
   - `transito_expira_em` está incoerente entre os dois.
10. **"Parar e concluir" em `Projetos.jsx` conclui o projeto inteiro**, porque `completeLogItem` dá prioridade ao `projeto_id`.
11. **Os links de entregáveis e anexos de tarefas podem não abrir.** Usam `getPublicUrl` no balde `documentos`, que é privado.

## 🟠 Média prioridade

- Anexar um documento a um pedido de férias **aprovado** é bloqueado pelo trigger `ferias_proteger`. Do lado oposto, um colaborador consegue passar um pedido rejeitado para `pendente`.
- O PDF individual de assiduidade pode somar vários meses. O S.A. usa um mínimo de 5 h no ecrã e de 4 h nos PDFs.
- A aprovação em massa de ausências não é atómica. Em `executarAcaoRH` falta o `.eq("estado", esperado)`, por isso dois RH podem decidir o mesmo pedido.
- Os números das propostas são calculados no browser e podem repetir-se. A ordenação é por texto e falha depois do 999.
- A cascata ao concluir atividades é diferente consoante a página: `Tarefas` / `concludeActivityWithChildren` / `ProjetoDetalhe`.
- `Tarefas.handleSubmit` e `GestaoLeads.updateStatus` mostram sucesso mesmo quando o Supabase devolve erro. Editar ou apagar o curso de outra pessoa também diz "sucesso" sem fazer nada.
- Campanhas grandes podem passar os 60 s de `maxDuration` no Vercel.
- Papéis desalinhados:
  - a Sidebar só verifica `admin`, enquanto as rotas aceitam `administrador`;
  - o seletor de papel não oferece `marketing plus`;
  - as políticas de `vacation_balances` referem o papel `rh`, que a app não consegue atribuir.
- Em `api/organizador/ia.js` os dados pessoais só são redigidos no browser; o servidor não volta a redigir o que recebe.
- O `audit_log` não tem limpeza agendada: `audit_limpar` existe, mas não tem cron.
- `/api/sicae-caes`, `/api/cae-descriptions` e a edge function `fetch-caes-sicae` não pedem sessão, por isso funcionam como proxy público para o SICAE.
- `api/_lib/nif.js` aceita `VITE_NIFPT_KEY`. Uma variável com prefixo `VITE_` corre o risco de ir parar ao bundle público.

- **Enviar Agora** (Leads) e **Enviar** (TransferGest) não pedem confirmação. Em Leads, com **Arquivo** marcado, os contactos arquivados também recebem a campanha.
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
- `PAGE_TITLES` não tem marketing, registos nem pedidos (no telemóvel o título aparece como "Início").
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
