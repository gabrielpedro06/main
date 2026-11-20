# Documentação do Bizin Manager

Documentação técnica da aplicação interna da Bizin. Foi escrita para que quem pegue no código consiga perceber, manter e evoluir a app sem ninguém a quem perguntar.

> Começa por **01 → 02**. Depois lê o módulo onde vais mexer. Antes de tocar em tabelas ou permissões, lê **03** e **04**.

## Geral

| # | Documento | Conteúdo |
|---|---|---|
| 01 | [Arquitetura](01-arquitetura.md) | Stack, estrutura de pastas, rotas e papéis, autenticação/2FA, fluxo de dados |
| 02 | [Setup e deploy](02-setup-e-deploy.md) | Correr localmente, variáveis de ambiente (só nomes), Vercel, Supabase, mudança de domínio |
| 03 | [Base de dados](03-base-de-dados.md) | Tabelas por domínio, funções/RPC, triggers, pg_cron, Vault, storage, índice das migrações |
| 04 | [Segurança](04-seguranca.md) | Papéis, RLS, MFA, auditoria, alertas de segurança, cofre, IA com redação, checklist de manutenção |
| 05 | [API e servidor](05-api-e-servidor.md) | Cada endpoint em `api/` e `server/`, autenticação, entradas/saídas |
| 06 | [Frontend partilhado](06-frontend-partilhado.md) | Componentes e utils reutilizáveis, estilos, temas, z-index, convenções, como criar uma página |

## Módulos

| Documento | Páginas |
|---|---|
| [RH, férias e ausências](modulos/rh-ferias-ausencias.md) | Recursos Humanos, Ausências, Aprovar pedido, Km's, assiduidade, saldos de férias |
| [Admin e registos](modulos/admin-e-registos.md) | Admin, Registos/Alertas de segurança, medalhas, login/2FA/password |
| [Projetos e tarefas](modulos/projetos-e-tarefas.md) | Projetos, Detalhe, Tarefas, Minhas Tarefas, Atividades, cronómetros |
| [Clientes e comercial](modulos/clientes-e-comercial.md) | Clientes, Leads, Propostas (comerciais/financiamento/formação), programas, cursos, ações de formação |
| [Marketing](modulos/marketing.md) | Marcas, estratégia, personas, fluxo, calendário editorial, aprovação, IA, campanhas |
| [Comunicação e dashboard](modulos/comunicacao-e-dashboard.md) | Início, notificações, Fórum/chat, presença, avisos |
| [Ferramentas](modulos/ferramentas.md) | TransferGest, Organizador de PDF, Ativos TI |

## Problemas conhecidos

[Riscos e pendentes](riscos-e-pendentes.md) junta numa lista única, por prioridade, os bugs e riscos encontrados ao documentar (20/11/2026).

## Manual de utilizador

O manual para quem usa a app está **dentro da app**: menu da conta → **Ajuda** (`/#/dashboard/ajuda`, página `src/pages/Ajuda.jsx`). O conteúdo fica em `src/content/ajuda/*.js`, com um ficheiro por área. Cada área e cada item podem ter `papeis: [...]` para só aparecerem a quem tem acesso. **Quando mudares um ecrã (nomes de botões, passos), atualiza o ficheiro respetivo.** Para acrescentar uma área, segue as instruções em `src/content/ajuda/index.js`.

## Comentários no código

Os ficheiros principais têm um cabeçalho que explica para que servem. As funções importantes têm JSDoc com parâmetros, retorno, efeitos e tabelas Supabase. Quando mudares comportamento, atualiza o comentário e o documento correspondente.

## Regras de ouro

- O `.env` nunca vai para o git. Os segredos vivem no Vercel ou no Supabase Vault.
- Cada tabela nova precisa de RLS **e** da política restritiva `mfa_obrigatorio` (ver 04).
- As migrações correm-se à mão no SQL Editor, por ordem. Devem ser idempotentes (ver 03).
- O plano Hobby do Vercel permite no máximo 12 funções em `api/`.
