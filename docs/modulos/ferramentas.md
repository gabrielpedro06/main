# Ferramentas: TransferGest, Organizador de PDFs e Ativos TI

- `src/pages/TransferGest.jsx` — `/dashboard/transfergest`
- `src/pages/OrganizadorPdf.jsx` — `/dashboard/organizador-pdf`
- `src/pages/AtivosTIDashboard.jsx` — `/dashboard/ativos-ti`
- Ver também: [../03-base-de-dados.md](../03-base-de-dados.md), [../04-seguranca.md](../04-seguranca.md), [../06-frontend-partilhado.md](../06-frontend-partilhado.md), [marketing.md](marketing.md#campanhas-de-email-brevo)

## TransferGest

Base de contactos de empresas (dados de terceiros) para campanhas de email, por campanha.

### Acesso

| Camada | Regra |
|---|---|
| Rota | `admin`, `administrador`, `gestor` |
| RLS `transfergest_registos` | `transfergest_staff`: só `bizin_e_staff()` (migração 070) |
| Envio (`POST /api/notificacoes/transfergest`) | `PAPEIS.gestao` (admin, administrador, gestor); máx. 2000 destinatários; regista `campanha_transfergest` no `audit_log` |

### Tabela `transfergest_registos` (migrações 024, 025)

Campos do CSV (`CSV_FIELDS`): denominação, nome, telefone, email, nº e data de registo, NIF (`numero_contribuinte`, **índice único**), morada da sede, ERT/DRT, NUT II/III, observações, ano, classificação, `interesse_email_marketing` (bool), target. Mais: `campanha` (texto livre; vazio é tratado como "Campanha 1"), `estado`, `estado_historico` (jsonb `{ estado: "AAAA-MM-DD" }`, guarda só a última data de cada estado), `ativo` (arquivar).

Estados: `novo` → `contactado` → `reuniao`, ou `cancelado`.

### Fluxo da página

1. Ecrã inicial: escolher a campanha (lista = valores distintos de `campanha`) ou "Todas". O ícone do cabeçalho volta a este menu.
2. Lista filtrada **na BD** pela campanha (`.range(0, 9999)`), depois no browser por separador de estado, arquivados e pesquisa. A pesquisa aceita filtros `localidade:`, `ano:`, `target:`, `interesse:sim|nao` (sinónimos em `parseFilterQuery`); o resto é texto livre com E lógico.
3. Ações: criar/editar (muda de estado → acrescenta ao histórico com a data), arquivar/reativar, alterar estado em massa com data, exportar CSV (`;`, regista evento `exportacao`), importar CSV, enviar campanha.

### Importação CSV

- Separador `;` ou `,` (o mais frequente na 1.ª linha). Todas as colunas de `CSV_FIELDS` são obrigatórias; cabeçalhos comparados sem acentos/pontuação e com sinónimos (`HEADER_ALIASES`).
- Datas `DD/MM/AAAA` ou ISO; `interesse` aceita `1/sim/s/yes/y/true/x`; email em minúsculas.
- Entram como `novo` na campanha indicada (ou na atual, ou "Campanha 1").
- Ignora linhas cujo NIF já existe em **qualquer** campanha (o NIF é único na tabela).

### Envio de campanha (Brevo)

`transfergestSender.js` → `/api/notificacoes/transfergest` → `server/brevoCampaignSender.js` (perfil `transfergest`; variáveis `TRANSFERGEST_BREVO_*`, com recurso às `BREVO_*`).

- Destinatários: registos selecionados com email válido.
- Modo **template**: ID numérico de um template do Brevo (verificado como ativo antes de enviar); parâmetros por pessoa `nome`, `fullname`, `FULLNAME`, `firstName`, `FIRSTNAME` → um email por destinatário.
- Modo **HTML manual**: assunto + HTML.
- Lotes (75 por omissão, pausa 1200 ms, até 3 novas tentativas; o servidor limita lote ≤100, pausa ≤3000 ms).
- Opção "marcar como contactado" após envio (com a data de hoje).
- O resumo devolvido lista enviados e falhados com o motivo.

## Organizador de PDFs

Separa, identifica e arruma faturas/talões digitalizados. Acessível a qualquer colaborador autenticado (rota sem restrição; aparece na sidebar a todos).

### Processamento (tudo no browser)

Bibliotecas: `pdfjs-dist` (leitura/desenho), `tesseract.js` (OCR, `por+eng`), `jsqr` (QR), `pdf-lib` (gerar PDFs), `jszip`.

Para cada página (`readPdfPage`):

1. Texto da camada de texto do PDF.
2. Desenho a 3×, reforço de contraste; se a imagem sair em branco tenta de novo (até 3×).
3. QR fiscal da AT (Portaria 195/2020) com `findFiscalQr` → `parseFiscalQr` (`src/utils/faturasQr.js`): NIF emitente (A), NIF adquirente (B), tipo (D: FT, FS, FR, NC…), data (F), nº (G), ATCUD (H), total (O).
4. Se o texto for fraco: OCR na "tira" com tinta (`inkStrip`); se o resultado for mau tenta a imagem rodada 180°; em último caso a página inteira.

Os descodificadores do pdf.js (JBIG2/JPEG2000 em WebAssembly, ICC, fontes, cmaps) têm de estar publicados em `public/pdfjs/`. Sem eles, digitalizações a preto e branco saem em branco; a página avisa e há "Mais → Reler páginas em branco".

### Separação e metadados

- `segmentPages`: regras de texto (`computeBreaks` em `pdfOrganizerEngine.js`) corrigidas pelo QR — páginas com o mesmo QR (ATCUD ou NIF+nº) ficam juntas, QR diferente começa documento novo.
- `buildDocMeta`: categoria (Faturas, Vencimentos, Extratos bancários, Gastos, Contratos, Guias, Impostos / Estado, Outros), tipo, NIF, fornecedor, data, nº, ATCUD, total, confiança (`alta`/`media`/…) e campos em falta. O NIF do adquirente (a própria empresa) é ignorado como fornecedor.
- Fornecedores corrigidos à mão ficam "aprendidos" por NIF em `localStorage["bz-pdf-fornecedores"]`.
- Revisão manual: tesoura entre páginas (separar), juntar ao anterior, rodar, excluir página, editar campos. Duplicados detetados pelo ATCUD. Filtros: todos / a rever / duplicados.
- Sessão guardada em IndexedDB (`bizin-pdf-organizer`, chaves `v2-state` e `v2-files`, incluindo os bytes dos PDFs). "Limpar tudo" apaga-a.

### "Pedir à IA" (redação obrigatória)

1. Escolhe documentos com confiança ≠ `alta` + vizinhos do mesmo ficheiro; blocos de até 40 páginas (documentos maiores ficam de fora).
2. Diálogo de confirmação explica o que sai.
3. Para cada página envia **só texto** passado por `redigir()` (`src/utils/iaRedacao.js`), que tapa: emails, IBAN, NISS (e o nome a seguir), NIF de pessoas singulares (começados por 1, 2, 3 ou 45 e válidos), nºs de conta e de cartão, telemóveis, nomes em transferências e em linhas "trabalhador/colaborador". Mantém NIF de empresas, valores, datas e nºs de documento. Do QR envia apenas NIF emitente, data, nº, total e tipo.
4. `POST /api/organizador/ia` (sessão obrigatória, quota diária 40 por pessoa, `ia_organizador`; modelo Haiku; máx. 3500 caracteres por página). Devolve documentos (páginas, categoria, entidade, data, nº, total, descrição, confiança) e custo.
5. A resposta substitui as separações desse bloco e grava os campos como overrides marcados "IA"; os de confiança não alta ficam a rever. Editar à mão retira a dúvida.

Nenhuma imagem sai do computador. A redação é feita **só no browser** — o servidor confia no que recebe.

### Exportação

ZIP `documentos-organizados-AAAA-MM-DD.zip` com `Ano/Categoria/<data>_<Fornecedor>_<Tipo>_<Número>.pdf` (nomes repetidos numerados) e `resumo.csv` (`;`, UTF-8 com BOM): data, fornecedor, NIF, tipo, nº, ATCUD, total, categoria, ficheiro, páginas.

## Ativos TI

Inventário de material informático, software/licenças e acessos a plataformas.

### Acesso

| Camada | Regra |
|---|---|
| Rota e sidebar | `admin`, `administrador`, `gestor`, `marketing plus` |
| Palavras-passe dos acessos | cofre (Supabase Vault, migração 072): RPC `cofre_revelar` / `cofre_guardar`, só se `bizin_pode_acessos_ti()`; cada revelação fica no histórico |
| `equipamentos` | migração 070 removeu as regras antigas que deixavam qualquer um inserir; a política "Apenas admins podem inserir/editar ativos" foi criada fora das migrações (confirmar no Supabase se inclui `gestor`/`marketing plus`) |
| `software` | RLS: qualquer autenticado lê e escreve (migração 039) |

### Tabelas

| Tabela | Campos principais | Estados |
|---|---|---|
| `equipamentos` | `num_inventario` (4 dígitos, sugerido = maior + 1), `tipo`, `modelo`, `colaborador` (id do perfil), `nome_pc`, `entidade` (Geoflicks, Neomarca, 2 Siglas, Factor Triplo), `fornecedor`, `fatura`, `data_aquisicao`, `prazo_garantia` (também copiado para `data_garantia`, campo antigo) | `em_stock`, `em_uso`, `em_reparacao`, `reservado`, `abatido` |
| `software` | `codigo` (`SW-xxxxxx`), `nome`, `tipo` (Windows, macOS, Microsoft 365…), `versao`, `entidade`, `data_expiracao`, `licenca_chave` | `ativo`, `licenca_expirada`, `arquivado` |
| `acessos` | `nome_plataforma`, `url`, `username`, `segredo_id` (cofre), `estado` | `ativo`, `expirado`, `inativo` |

### Funcionamento

- Separadores: `painel` (resumo por categoria, garantias, pessoas), `equip_ativos`, `equip_inativos` (abatidos), `software`, `acessos`.
- Explorador de equipamentos com vistas lista / cartões / por pessoa (preferência em `localStorage.ti_equip_view`), filtros por categoria, tipo, entidade, colaborador e garantia; ordenação.
- Atribuir a um colaborador → `estado = em_uso`; devolver → `colaborador = null`, `em_stock`.
- Inativar/reativar só muda o estado (equipamento ↔ `abatido`/`em_stock`; software ↔ `arquivado`/`ativo`; acesso ↔ `inativo`/`ativo`).
- Garantia: expirada, a acabar (≤90 dias), ok ou sem garantia; barra com a percentagem de tempo decorrido.
- Acessos: a lista nunca traz a palavra-passe (`semPalavraPasse`); mostrar/copiar pede-a ao cofre e guarda-a em memória enquanto a página está aberta. Ao editar, palavra-passe em branco = manter.
- Exportações: PDF (`jsPDF` + `autotable`, uma página por colaborador + material em stock) e Excel (`xlsx`, folhas "Atribuídos" e "Em Stock").

## Riscos e pontos a rever

- **Brevo, modo HTML** (e template sem parâmetros por destinatário): um único email por lote com todos os endereços em `to` — os destinatários veem os endereços uns dos outros.
- TransferGest: a lista de campanhas lê `campanha` de todas as linhas sem paginação (limite por omissão do PostgREST, 1000) — campanhas podem faltar. Registos com `campanha` vazia aparecem como "Campanha 1" na lista mas o filtro `eq("campanha","Campanha 1")` não os encontra.
- TransferGest: NIF repetido **dentro** do mesmo CSV não é filtrado; o índice único faz falhar a importação inteira. A consulta de duplicados usa `.in()` com todos os NIF do ficheiro (URL pode ficar demasiado longo em ficheiros grandes).
- Organizador: a redação de dados pessoais só existe no browser; `api/organizador/ia.js` não volta a redigir.
- Ativos TI: `gerarProximoInventario` não reserva o número (dois registos em simultâneo podem ficar com o mesmo) e ordena texto (um número sem zeros à esquerda estraga a sequência).
- Ativos TI: criar acesso grava a linha e só depois a palavra-passe no cofre; se o cofre falhar fica um acesso sem palavra-passe.
- Ativos TI: `software.licenca_chave` está em texto simples numa tabela legível por qualquer autenticado.
