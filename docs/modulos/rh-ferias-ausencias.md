# Recursos Humanos: férias, ausências, Km's e assiduidade

Este documento descreve o módulo de RH do Bizin Manager: perfis de colaborador,
saldos de férias, pedidos de ausência e de quilómetros, fluxo de aprovação,
assiduidade, subsídio de alimentação e PDFs. Para as regras gerais de segurança
(RLS, 2FA obrigatório, papéis) ver [../04-seguranca.md](../04-seguranca.md); para o
esquema completo das tabelas ver [../03-base-de-dados.md](../03-base-de-dados.md).

## 1. Mapa rápido

| O quê | Onde |
|---|---|
| Painel de RH (só staff) | `src/pages/RecursosHumanos.jsx` → rota `/#/dashboard/rh` |
| Pedidos do colaborador | `src/pages/Ausencias.jsx` → `/#/dashboard/ferias` |
| Pedidos de Km's | `src/pages/PedidoKm.jsx` (= `Ausencias` com `forcedType="Pedido de Km's"`) → `/#/dashboard/pedido-km` |
| Decidir um pedido a partir do email | `src/pages/AprovarPedido.jsx` → `/#/dashboard/pedidos/:id[?acao=aprovar\|rejeitar]` |
| Regras de saldo, feriados, dias úteis | `src/utils/feriasSaldo.js` |
| Aprovar/rejeitar (lógica partilhada) | `src/utils/decisaoPedido.js` |
| Email aos admins | `api/_lib/notificacoes.js` (`pedido-ausencia`) + `api/_lib/emailPedidoAusencia.js` |
| Links de emails antigos | `api/absence-notifications/action.js` (só redireciona) |
| PDFs | `src/components/pdfRecursosHumanos.jsx`, `pdfIndividual.jsx`, `pdfDeslocacoesMensais.jsx` |
| Ponto (entrada/pausa/saída) | `src/components/WidgetAssiduidade.jsx` (no Dashboard) |
| Calendário mensal do colaborador | `src/components/CalendarioColaborador.jsx` |
| Calculadora de rota para Km's | `src/components/CalculadoraKm.jsx` (Photon/OSM + OSRM) |
| Medalhas | ver [admin-e-registos.md](admin-e-registos.md#3-medalhas) |

Migrações relevantes: `002` (dias_ferias_total), `006` (rh_settings), `039` (estado
temporário), `040`–`045` (vacation_balances, trigger, cron), `051` (km ida e volta),
`068` (triggers de proteção), `069` (rh_anexos privado), `071` (MFA obrigatório),
`074` (cada um só lê as suas ausências), `076`–`077c` (saldos: gestor pode gravar,
correções de dados).

## 2. Quem pode o quê

Os papéis vêm de `profiles.role` (ou `profiles.tipo` em contas antigas), sempre
comparados em minúsculas. Na BD: `bizin_papel()`, `bizin_e_admin()`
(admin/administrador) e `bizin_e_staff()` (admin/administrador/gestor), definidas na
migração `068`.

| Ação | Colaborador | Gestor | Admin/administrador | Servidor (service_role) |
|---|---|---|---|---|
| Ver as suas ausências e saldo | sim | sim | sim | — |
| Ver ausências de outros | não (074) | sim | sim | sim |
| Criar pedido em seu nome (estado `pendente`) | sim | sim | sim | — |
| Criar ausência já `aprovado` / em nome de outro | não | sim | sim | sim |
| Editar pedido próprio pendente | sim (volta a `pendente`) | sim | sim | — |
| Cancelar pedido pendente | sim → `cancelado` | sim | sim | — |
| Pedir cancelamento de aprovado | sim → `pedido_cancelamento` | sim | sim | — |
| Aprovar / rejeitar / decidir cancelamentos | **não** (trigger `ferias_proteger`) | sim | sim | sim |
| Painel de RH (`/dashboard/rh`) e AprovarPedido | não | sim | sim | — |
| Mudar limite de férias, admissão, contrato, S.A., estado temporário | não (trigger `profiles_proteger`) | sim | sim | sim |
| Gravar em `vacation_balances` | não | sim (076) | sim | sim |
| Ativar/desativar colaborador | não | sim (via `/api/admin/contas`) | sim | — |
| Receber o email "novo pedido" | não | **não** | sim | — |
| Ler anexos (`rh_anexos`) | só os seus (nome começa por `<user_id>_`) | todos | todos | — |

Notas:

- As políticas de `vacation_balances` ainda mencionam o papel `rh`/`recursos humanos`,
  que não é atribuível pela app (`PAPEIS_VALIDOS` em `api/_lib/adminContas.js`). Na
  prática "RH" = admin + gestor.
- Todas as tabelas exigem sessão `aal2` (2FA confirmado) desde a migração `071`.
- O ecrã testa o papel com `ProtectedRoute allowedRoles={["admin","administrador","gestor"]}`;
  a proteção real está nas RLS/triggers.

## 3. Perfil do colaborador

Tabela `profiles` (pública dentro da empresa) + `profiles_privado` (NIF, NISS, CC,
morada, `valor_sa`…; só o próprio e o staff). A junção é feita por
`src/utils/dadosPrivados.js` (`juntarPrivados`, `separarPrivados`, `guardarPrivados`).

Campos relevantes para RH (editados no separador **Gestão → Dados** do painel):

| Campo | Significado |
|---|---|
| `data_admissao` | Data de entrada. Define o ano de admissão (regra de férias) e o início do cálculo de assiduidade. |
| `dias_ferias_total` | "Limite anual" = dias atribuídos **no ano de admissão**. Nos anos seguintes são 22. |
| `dias_ferias` | Coluna antiga (saldo). Só usada se `dias_ferias_total` não existir (modo legado). Já não se edita. |
| `valor_sa` | Valor diário do subsídio de alimentação (em `profiles_privado`). |
| `empresa_interna` + tabela `profile_empresas` | Empresas do grupo (Neomarca, Geoflicks, 2 Siglas, Fator Triplo). Um colaborador pode estar em várias; a primeira é a "principal". |
| `estado_temporario_tipo/inicio/fim/motivo` | Estado temporário (licença, baixa…) mostrado na grelha "hoje". Os tipos válidos são `COLLABORATOR_STATUS_TYPES`. |
| `ativo` | `false` = colaborador desativado (sai das listas e não consegue entrar; ver §10). |
| `veiculos` | Lista de viaturas do próprio (Perfil → Veículos), usada nos pedidos de Km's. |

Ao gravar a ficha (`handleUpdateUserProfile`) o painel volta a sincronizar o saldo do
ano corrente (`sincronizarSaldoFeriasDosPerfis`).

### Sugestão automática do limite anual

No formulário, ao mudar a **data de admissão** (`mudarDataAdmissao`), o campo
"Limite anual" é preenchido sozinho (`limiteAutomatico`):

- admissão no ano corrente ou futura → `calcularFeriasAnoAdmissao(dataAdmissao)`;
- admissão em anos anteriores → 22.

Os RH podem alterar o valor depois; o que fica gravado é o que está no campo.

## 4. Saldos de férias

### 4.1 Regra de atribuição

`calcularFeriasAnoAdmissao` (feriasSaldo.js), regra definida pelos RH da Bizin:

1. **Mês de entrada**: 2 dias se a pessoa entra até ao **1.º dia útil** do mês
   (inclui entrar antes dele, p.ex. num fim de semana); 1 dia se entra **até dia 15**;
   0 dias se entra depois do dia 15.
2. **Cada mês seguinte até dezembro**: +2 dias.
3. **Máximo 20 dias** no ano de admissão.
4. **Anos seguintes**: 22 dias (`ANNUAL_VACATION_DAYS`).
5. **Anos anteriores à admissão**: 0 (`getAnnualVacationLimitForYear`).

Exemplos (2026): entrada a 2/3 (1.º dia útil de março) → 2 + 9×2 = 20; entrada a
10/6 → 1 + 6×2 = 13; entrada a 20/9 → 0 + 3×2 = 6; entrada a 2/1 → 2 + 11×2 = 24 → 20.

O "1.º dia útil" salta fins de semana e feriados (`getFeriados`: nacionais + Carnaval +
feriado municipal de Faro a 7 de setembro).

### 4.2 Tabela `vacation_balances` (migração 040)

Uma linha por `(user_id, ano)`:

| Coluna | Significado |
|---|---|
| `dias_atribuidos` | Dias do ano (limite anual no ano de admissão; 22 nos outros). |
| `dias_transitados` | Dias que sobraram do ano anterior. Só valem **até 31 de março** (`transito_expira_em`). |
| `dias_gozados` | Dias de férias aprovados no ano (meios-dias incluídos: horas / 8). |
| `dias_disponiveis` | Coluna gerada: `max(0, atribuidos + transitados − gozados)`. |

Como se lê o saldo no ecrã (`obterSaldoFeriasAnoComTransicao`):

- Se existe linha para o ano → usa-a. Os transitados só contam se a data de
  referência for do mesmo ano e ≤ 31/3.
- Se não existe → **estimativa**: limite do ano − férias aprovadas; transitados só se
  existir uma linha **real** do ano anterior (nunca de anos estimados).

Validação de um pedido (`validarSaldoFeriasParaIntervalo`), por cada ano que o
pedido toca:

- disponível = atribuídos + transitados − gozados (aprovados) − **pendentes**
  (exceto o próprio pedido, se for edição);
- os transitados só entram se o pedido (ou férias já aprovadas) cair entre 1/1 e 31/3;
- se a linha da tabela já tiver `dias_disponiveis ≤ 0`, recusa logo.

### 4.3 Quem escreve nos saldos

Há **três** escritores, que convém conhecer:

1. **Browser (staff)** — `sincronizarSaldoFeriasPerfil` faz *upsert* da linha do ano
   com `dias_gozados` calculado em JS (sem fins de semana, **sem feriados e sem
   tolerâncias**). Chamado depois de aprovar/cancelar, registar ausência, mudar a
   ficha ou criar/apagar tolerâncias.
2. **Trigger `sincronizar_saldo_ferias_apos_alteracao`** (042, refeito na 090) — em cada
   insert/update/delete de `ferias` de férias (com ou sem acento, `bizin_tipo_e_ferias`) ou de
   tolerância, recalcula `dias_gozados` com `calcular_dias_ferias_gozados`, que **conta como a
   app**: sem fins de semana, feriados (`bizin_feriados`, igual a `getFeriados`) nem tolerâncias;
   parciais = horas/8. Tolerância global → recalcula todos; pedidos que atravessam o ano →
   os dois anos. Só atualiza linhas existentes (não cria).
3. **`provisionar_saldos_ferias(p_ano)`** (040) — cria as linhas do ano para todos os
   perfis ativos: `dias_atribuidos` = limite do perfil se `p_ano` é o ano de admissão,
   senão 22; `dias_transitados` = `dias_disponiveis` do ano anterior (sem limite);
   em conflito recalcula `dias_gozados` e, se for o ano seguinte, os transitados.

Desde a 090 (27/11/2026) os dois cálculos de `dias_gozados` (JS e SQL) dão o mesmo valor
(testado com PGlite contra `feriasSaldo.js`: feriados 2024–2035, tipos com/sem acento,
parciais, tolerâncias globais e pessoais). Antes, o SQL ignorava os pedidos "Férias" (com
acento) e contava feriados e tolerâncias. **Ao mudar uma regra num lado, mudar no outro.**

### 4.4 Provisionamento anual

- **pg_cron** `provisionar-saldos-ferias-ano-seguinte`, `0 0 1 12 *` (1 de dezembro,
  00:00 UTC): `select provisionar_saldos_ferias(ano_corrente + 1)`.
- **Rede de segurança**: em dezembro, ao abrir o painel de RH, a página chama a mesma
  RPC (`provisionarSaldosFeriasAnoSeguinte`).
- A partir de 1/12 o colaborador pode marcar férias do ano seguinte
  (`isVacationBookingBeforeAnnualOpening` bloqueia antes disso) e o painel mostra o
  saldo do ano seguinte (`isAnnualVacationOpeningAvailable`).
- Os dias transitados são fotografados no momento do provisionamento: férias gozadas
  em dezembro depois do dia 1 só reduzem o transitado se a função voltar a correr.

### 4.5 Correções de dados já feitas

`077` (ver), `077b` (corrigir transitados inventados) e `077c` (ano de admissão segue o
limite anual) são scripts manuais de correção. Não são migrações de esquema e não
precisam de voltar a correr; servem de exemplo para futuras correções.

## 5. Tolerâncias de ponto

São linhas em `ferias` com `tipo = "Tolerância de Ponto"`, `estado = "aprovado"`,
`data_inicio = data_fim` e:

- `user_id = null` → tolerância **global** (todos);
- `user_id = <id>` → individual.

Efeitos: não contam como dia útil nas férias (`buildToleranciasSkipSet`), não
geram falta automática e aparecem no calendário. "Eliminar" passa o estado a
`cancelado`. Criadas no separador **Tolerâncias** do painel.

## 6. Pedidos de ausência

### 6.1 Tabela `ferias`

Guarda ausências, pedidos de Km's e tolerâncias. Colunas principais: `user_id`,
`tipo`, `motivo` (texto livre / observações), `data_inicio`, `data_fim`, `is_parcial`,
`hora_inicio`, `hora_fim`, `estado`, `anexo_url`, `km_origem`, `km_destino`,
`km_total`, `veiculo`, `km_ida_volta`, `created_at`.

### 6.2 Motivos (`tipo`)

`Férias`, `Assistência à família`, `Outros - Assuntos pessoais`,
`Ausência sem motivo - injustificada`, `Doença, acidente e obrigação legal`,
`Casamento`, `Deslocação a estabelecimento de ensino`, `Licença maternal/paternal`,
`Licença sem vencimento`, `Falecimento de familiar`, `Prestação de provas de avaliação`,
`Candidato a cargo público`. Mais os tipos especiais `Pedido de Km's` e
`Tolerância de Ponto`.

Só **férias** descontam saldo (`isVacationType`: texto normalizado contém "ferias";
no SQL: `lower(tipo) like '%fer%'`). Ausências parciais contam horas / 8.

### 6.3 Estados

```
                 colaborador cancela
   pendente ───────────────────────────► cancelado
     │  │
     │  └── RH rejeita ──► rejeitado
     │
     └── RH aprova ──► aprovado ── colaborador pede cancelamento ──► pedido_cancelamento
                          ▲                                           │       │
                          └────────── RH recusa cancelamento ─────────┘       │
                                                RH aceita cancelamento ──► cancelado
   (RH também pode cancelar diretamente uma ausência do histórico: "cancelar_direto")
```

Validações no browser antes de gravar (Ausencias.jsx `handleSubmit`):

- datas válidas e pelo menos um dia útil (pedidos não parciais);
- sem sobreposição com outro pedido ativo do próprio (ignora rejeitados,
  cancelados e Km's);
- parcial com ≥ 8 h passa sozinho a dia completo;
- férias: abertura do ano seguinte só a 1/12 e saldo suficiente
  (`validarSaldoFeriasParaIntervalo`);
- Km's: data, veículo, De/Para e km > 0.

O trigger `ferias_proteger` (068) garante na BD que um colaborador só cria pedidos
seus em `pendente`, não muda o dono e só grava os estados `pendente`, `cancelado`
(se o anterior era `pendente`) ou `pedido_cancelamento`.

Anexos: balde **privado** `rh_anexos`, nome `<user_id>_<timestamp>.<ext>` (o prefixo
é o que dá acesso ao próprio — ver `rh_anexos_ler` em 069). A BD guarda o URL
"público", mas ao abrir a app troca-o por um link assinado de 10 min
(`src/utils/ficheirosPrivados.js`, instalado globalmente em `main.jsx`).

### 6.4 Fluxo de aprovação

1. Colaborador grava o pedido (`pendente`).
2. O browser chama `POST /api/notificacoes/pedido-ausencia` com `{ requestId, isEditing }`
   (sessão obrigatória). O servidor:
   - lê o pedido na BD com a chave de serviço (nunca confia no browser);
   - só aceita se quem chama for o dono do pedido ou staff;
   - envia email (Brevo, `sendTransactionalCampaign`) a **todos os admins ativos**
     com detalhe do pedido e botões **Aprovar / Rejeitar / Ver detalhes**.
3. Os botões apontam para `${APP}/#/dashboard/pedidos/<id>?acao=aprovar|rejeitar`.
   O admin faz login + 2FA (o `ProtectedRoute` guarda a página pedida e o Login volta
   a ela). `?acao=` só abre o diálogo de confirmação.
4. Em **AprovarPedido** o decisor vê: pedido, anexo, saldo do ano (com transitados
   se o pedido é até 31/3), com quanto fica, e colegas ausentes nesses dias.
5. `decidirPedido` (decisaoPedido.js):
   - confirma que o estado atual é o esperado (`ACOES`);
   - férias a aprovar → revalida o saldo;
   - `update ... where id = X and estado = <esperado>` — se ninguém foi alterado, outro
     decisor já tratou (proteção contra decisões em simultâneo);
   - notifica o colaborador no sino (`notificacoes_projetos`, tipo `absence_status_changed`);
   - ressincroniza `vacation_balances` do ano do pedido.
6. Em alternativa, os RH decidem no separador **Pedidos** do painel (`executarAcaoRH`,
   mesma lógica, sem a proteção de estado no `update`), incluindo **aprovação em massa**
   de pedidos pendentes selecionados.

Emails antigos (antes de 2026) traziam links com token assinado para
`/api/absence-notifications/action`. Esse endpoint já não altera nada: valida o token
(`ABSENCE_ACTION_SECRET`) e redireciona (303) para a página do pedido, ou para o painel
de RH se o token for inválido. A função SQL `aprovar_pedido_ferias_por_email` (043)
continua na BD mas só `service_role` a pode chamar e a app já não a usa.

Registo pelos RH: no painel (modal "Nova ausência", `handleSaveAbsence`) os RH podem
registar/editar uma ausência em nome de alguém; fica logo **aprovada**, sem email.

## 7. Pedidos de Km's (deslocações)

- Mesmo ecrã (`PedidoKm` → `Ausencias` com tipo fixo) e mesma tabela `ferias`, com
  `tipo = "Pedido de Km's"`, `data_fim = data_inicio`, `km_origem`, `km_destino`,
  `km_total`, `veiculo` (das viaturas do perfil) e `km_ida_volta` (051; sem a coluna
  a app escreve "(ida e volta)" no destino).
- A `CalculadoraKm` ajuda a obter a distância (pesquisa Photon/OpenStreetMap, rota
  OSRM); o colaborador pode ajustar o valor.
- Não contam para sobreposição de datas nem para saldo.
- Aprovação igual à das ausências (no painel aparecem numa tabela própria).
- Valor de reembolso: €/km definido na barra do separador **Gestão** do painel (campos "S.A. GLOBAL" e €/KM), gravado
  em `app_settings` com `setting_key = "rh_km_reembolso_eur"` (0,40 € por omissão).
- PDF mensal por colaborador: ver §9.

## 8. Assiduidade e subsídio de alimentação

### 8.1 Registo de ponto

`WidgetAssiduidade` (Dashboard) grava na tabela `assiduidade`: `user_id`,
`data_registo`, `hora_entrada`, `hora_saida`, `ultima_pausa_inicio`,
`tempo_pausa_acumulado` (segundos), `observacoes`. Se um registo ficou aberto de um
dia anterior, ao abrir a app é fechado às 23:59:59 com a nota "Não picou ponto para
sair. Encerrado automaticamente.".

### 8.2 Início do cálculo

`getAttendanceCalculationStartDate`: o maior entre a data de admissão e
`ATTENDANCE_GLOBAL_CUTOFF` (`2026-03-01`, data a partir da qual o ponto passou a
ser obrigatório na app). Antes disso não há faltas automáticas nem descontos.

### 8.3 Regras no painel de RH

- **Dia com S.A.**: dia útil passado com tempo efetivo (saída − entrada − pausas)
  ≥ **5 h** (`MIN_SA_WORK_SECONDS`).
- **Valor de S.A. do mês** = (dias úteis do mês desde o início de cálculo − dias
  descontados) × `valor_sa`. Descontado: dia útil com ausência de dia inteiro
  (pendente ou aprovada, exceto Km's) ou dia passado com menos de 5 h. Dias futuros
  contam como pagos (é uma previsão).
- **Falta injustificada automática**: dia útil passado, após o início de cálculo, sem
  qualquer registo em `assiduidade` e sem ausência que o cubra. Não é gravada na BD;
  é calculada no ecrã e entra no PDF individual.
- Separador **Processamento**: a mesma conta para toda a equipa ativa, com total e
  exportação Excel (`Processamento_SA_<ano>_<mes>.xlsx`, registada em `audit_log`).
- Valor diário de S.A. para todos: "aplicar a todos" grava `valor_sa` em todos os
  perfis (`confirmarBulkUpdateSA`).

## 9. PDFs de RH

| Botão | Gerador | Conteúdo | Dados |
|---|---|---|---|
| PDF geral do mês | `pdfRecursosHumanos.jsx` | Um PDF **por empresa interna**; linha por colaborador: faltas just./injust., férias, Km's, dias ≥ 4 h, S.A., horas | `assiduidade` do mês + ausências **aprovadas** do mês |
| PDF individual | `pdfIndividual.jsx` | Resumo + tabelas de assiduidade, ausências e Km's | Dados já carregados no ecrã (inclui pendentes e faltas automáticas) |
| Mapa de deslocações | `pdfDeslocacoesMensais.jsx` | Por colaborador: data, percurso, viatura, km, reembolso | Pedidos de Km's **aprovados** do mês × €/km |

Os PDFs usam jsPDF + jspdf-autotable e os logótipos `/logo1.png` e `/logos_all.png`
(pasta `public/`). **Atenção**: nos PDFs o mínimo para S.A. é **4 h**; no ecrã são 5 h.

## 10. Ativar e desativar colaboradores

Separadores **Gestão** (botão desativar) e **Colab. Inativos** (reativar) chamam
`POST /api/admin/contas` com `{ acao: "definir", userId, ativo }`. O servidor:

- grava `profiles.ativo`;
- bane/desbane a conta no Supabase Auth (`ban_duration` ≈ 100 anos / `none`);
- regista o evento em `audit_log`.

Um utilizador desativado com a app aberta é expulso no próximo carregamento do perfil
(`AuthContext.fetchProfile`). Ver também [admin-e-registos.md](admin-e-registos.md).

## 11. Notificações

| Evento | Canal | Destino |
|---|---|---|
| Novo / editado pedido | Email (Brevo) | Admins ativos (`role`/`tipo` admin ou administrador) |
| Decisão do pedido | Sino do Dashboard (`notificacoes_projetos`, `absence_status_changed`) | Dono do pedido |
| CC alterado no Perfil | Email (`/api/notificacoes/cc-alerta`) | Email dos RH (`RH_EMAIL` no servidor) |

## 12. Riscos e pontos de atenção conhecidos

- **Dois cálculos de dias gozados** (JS vs SQL, §4.3): o SQL conta feriados e
  tolerâncias como dias de férias. Se a sincronização em JS falhar (é só registada
  na consola em `sincronizarSaldoFeriasDosPerfis`), fica o valor do trigger.
- **Sincronização só do ano corrente**: `handleSaveAbsence`, tolerâncias e
  `handleUpdateUserProfile` chamam `sincronizarSaldoFeriasDosPerfis` sem ano, logo
  ausências/tolerâncias noutro ano ficam só com o valor do trigger.
- **Transitados sem teto** e "fotografados" a 1/12 (§4.4).
- **Anexar documento a um pedido aprovado**: o botão existe para pedidos não
  fechados, mas o trigger `ferias_proteger` recusa o `update` feito pelo colaborador
  quando o estado é `aprovado`.
- **Aprovação em massa** não é atómica: se um pedido falhar, os anteriores já
  ficaram aprovados.
- `executarAcaoRH` não usa a condição `estado = <esperado>` no `update` (ao contrário
  de `decidirPedido`): duas pessoas podem decidir o mesmo pedido.
- **PDF individual**: as linhas de assiduidade não são filtradas pelo mês; com um
  colaborador selecionado, `fetchDadosMensais` carrega desde o início de cálculo, por
  isso o PDF pode somar meses anteriores (dias ≥ 4 h, horas e tabela).
- Regras de S.A. diferentes (5 h no ecrã, 4 h nos PDFs).
- "Hoje" em alguns cálculos usa `toISOString()` (UTC): entre 00:00 e 01:00 (hora de
  verão) o dia de hoje ainda é considerado ontem.
- Os emails de pedido vão só para admins; gestores podem decidir mas não são avisados.
