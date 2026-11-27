/**
 * Motor Inteligente de Análise e Separação de Documentos PDF
 * Especializado em documentação administrativa, fiscal e empresarial (Portugal & Internacional)
 *
 * Funções puras sobre texto (OCR/pdf.js); não acede à rede nem ao Supabase.
 * Usado por pages/OrganizadorPdf.jsx, utils/faturasQr.js, utils/iaRedacao.js e
 * também pelo servidor (api/organizador/ia.js) — não importar nada do browser aqui.
 * Para reconhecer um fornecedor novo de forma fiável, acrescentar a KNOWN_ENTITIES.
 */

// Categorias suportadas
export const PDF_CATEGORIES = [
  "Faturas",
  "Vencimentos",
  "Extratos bancários",
  "Gastos",
  "Contratos",
  "Guias",
  "Impostos / Estado",
  "Outros",
];

// Catálogo expandido de entidades conhecidas em Portugal com NIFs e padrões textuais estritos
const KNOWN_ENTITIES = [
  // Telecomunicações & TI
  {
    name: "NOS",
    pattern: /\b(?:nos\s*comunica[cç][oõ]es|nos\s*empresas|zon\s*multim[eé]dia|zon\s*tv\s*cabo|nos\s*(?:madeira|a[cç]ores|sgps|telecom|lusomundo|gsm)|fatura\s*nos|cliente\s*nos|servi[cç]os?\s*nos|portal\s*nos|app\s*nos|cart[aã]o\s*nos)\b/i,
    nifs: ["507783857", "500744863", "502030611", "504615947"],
  },
  {
    name: "MEO",
    pattern: /\b(?:meo\s*servi[cç]os|altice\s*portugal|pt\s*comunica[cç][oõ]es|meo)\b/i,
    nifs: ["500225490", "503215058"],
  },
  {
    name: "Vodafone",
    pattern: /\bvodafone\s*(?:portugal|empresas)?\b/i,
    nifs: ["502590811"],
  },
  { name: "NOWO", pattern: /\bnowo\b/i, nifs: ["503610992"] },
  { name: "Digi", pattern: /\bdigi\s*portugal\b/i },

  // Energia & Águas
  {
    name: "EDP",
    pattern: /\b(?:edp\s*comercial|edp\s*distribui[cç][aã]o|e-redes|edp)\b/i,
    nifs: ["503504564", "500697256"],
  },
  {
    name: "Galp",
    pattern: /\b(?:galp\s*power|galp\s*energia|galp\s*g[aá]s|petrogal|galp)\b/i,
    nifs: ["503492493", "500109741", "502891102"],
  },
  { name: "Endesa", pattern: /\bendesa\s*(?:energia|geraci[oó]n|portugal)?\b/i, nifs: ["503831832"] },
  { name: "Iberdrola", pattern: /\biberdrola\s*(?:clientes|portugal)?\b/i, nifs: ["506450625"] },
  { name: "Repsol", pattern: /\brepsol\s*(?:portuguesa|g[aá]s)?\b/i, nifs: ["500266642"] },
  { name: "Goldenergy", pattern: /\bgoldenergy\b/i, nifs: ["508701420"] },
  { name: "EPAL", pattern: /\b(?:epal|empresa\s*portuguesa\s*das?\s*[aá]guas\s*livres)\b/i, nifs: ["500051078"] },
  { name: "Águas de Portugal", pattern: /\b[aá]guas\s+d[oe]\s+(?:portugal|gaia|porto|tejo|cascais|sintra|alentejo|algarve)\b/i },

  // Retalho, Alimentação & Grossistas
  { name: "Makro", pattern: /\b(?:makro\s*cash\s*&\s*carry|makro)\b/i, nifs: ["502129200"] },
  {
    name: "Recheio",
    pattern: /\b(?:recheio\s*(?:cash\s*&\s*carry|armazenista|distribui[cç][aã]o|masterchef)|recheio\s*-\s*cash)\b/i,
    nifs: ["500117079"],
  },
  {
    name: "Continente",
    pattern: /\b(?:continente\s*(?:hipermercados|bom\s*dia|modelo|online|alimentar)|modelo\s*continente|sonae\s*mc)\b/i,
    nifs: ["500654510"],
  },
  { name: "Pingo Doce", pattern: /\b(?:pingo\s*doce|jer[oó]nimo\s*martins)\b/i, nifs: ["500829990"] },
  { name: "Auchan", pattern: /\bauchan\s*(?:portugal|hipermercados|energy)?\b/i, nifs: ["500049448", "516527835"] },
  { name: "Lidl", pattern: /\blidl\s*(?:portugal|supermercados)?\b/i, nifs: ["503403017"] },
  { name: "Aldi", pattern: /\baldi\s*portugal\b/i, nifs: ["507110151"] },
  { name: "Intermarché", pattern: /\b(?:intermarch[eé]|superfaro)\b/i, nifs: ["514540850"] },
  { name: "El Corte Inglés", pattern: /\bel\s*corte\s*ingl[eé]s\b/i, nifs: ["502506829"] },
  { name: "Mercadona", pattern: /\bmercadona\s*(?:portugal)?\b/i, nifs: ["513998595"] },
  { name: "Note!", pattern: /\b(?:note!|mundo\s*note)\b/i, nifs: ["517309505"] },
  { name: "Levi's", pattern: /\blevi'?s\b/i, nifs: ["509684831"] },
  { name: "O Seu Bitoque", pattern: /\bo\s*seu\s*bitoque\b/i, nifs: ["507602101"] },
  { name: "Snack Bar A Madrugada", pattern: /\bsnack\s*bar\s*a\s*madrugada\b/i, nifs: ["515371599"] },
  { name: "Restaurante Chefe Branco", pattern: /\bchefe\s*branco\b/i, nifs: ["503166820"] },
  { name: "A. Pinto Combustíveis", pattern: /\ba\.?\s*pinto\s*-?\s*com[eé]rcio\s*de\s*combust/i, nifs: ["509033687"] },

  // Restauração Rápida & Cadeias
  { name: "McDonald's", pattern: /\bmcdonald'?s\b/i, nifs: ["502167017", "505538725", "505323745", "505166690"] },
  { name: "Burger King", pattern: /\b(?:burg[e3]r\s*k[il1|!]ng|food4kings|bk\s*portugal)\b/i, nifs: ["510728090"] },
  { name: "KFC", pattern: /\b(?:kfc|iberusa)\b/i, nifs: ["502604735"] },
  { name: "Pans & Company", pattern: /\b(?:pans\s*(?:&|e)\s*company|ibersande)\b/i, nifs: ["503799149"] },
  { name: "Taco Bell", pattern: /\b(?:taco\s*bell|firmoven)\b/i, nifs: ["507517970"] },
  { name: "Pizza Hut", pattern: /\bpizza\s*hut\b/i },
  { name: "Wok to Walk", pattern: /\bwok\s*to\s*walk\b/i },
  { name: "Qualitalhos", pattern: /\bqual[il1]ta[l1]h[oe0]s\b/i, nifs: ["503290688"] },
  { name: "Sirius Fuel", pattern: /\bsirius\s*fuel\b/i, nifs: ["510958427"] },
  { name: "Hora Doce", pattern: /\bhora\s*doce\b/i, nifs: ["509396100"] },
  { name: "Sushi Mundo", pattern: /\bsushi\s*mundo\b/i, nifs: ["506290174"] },
  { name: "Yummy Sweet", pattern: /\byummy\s*swee[tl]\b/i, nifs: ["518140105"] },
  { name: "Talho Burger", pattern: /\b[tf]al[e]?h[o0]\s*(?:&\s*)?burger\b/i },
  { name: "Cantinho da Ronha", pattern: /\bcantinho\s*da\s*ronha\b/i, nifs: ["514493020"] },
  { name: "Portis Hoteis", pattern: /\bportis\b/i, nifs: ["502033568"] },

  // Bricolage, Equipamento & Logística
  { name: "Leroy Merlin", pattern: /\bleroy\s*merlin\b/i, nifs: ["505876353"] },
  { name: "Brico Depôt", pattern: /\bbrico\s*dep[oô]t\b/i },
  { name: "Staples", pattern: /\bstaples\b/i, nifs: ["503657417"] },
  { name: "Worten", pattern: /\bworten\b/i, nifs: ["503630330"] },
  { name: "FNAC", pattern: /\bfnac\s*(?:portugal)?\b/i, nifs: ["503952230"] },
  { name: "Rádio Popular", pattern: /\br[aá]dio\s*popular\b/i, nifs: ["500674201"] },
  { name: "IKEA", pattern: /\bikea\b/i, nifs: ["506306001"] },
  { name: "CTT", pattern: /\b(?:ctt\s*correios|ctt\s*expresso|ctt)\b/i, nifs: ["500077568", "502898956"] },
  { name: "Via Verde", pattern: /\bvia\s*verde\s*(?:portugal)?\b/i, nifs: ["505054361"] },

  // Bancos & Finanças
  { name: "Caixa Geral de Depósitos", pattern: /\b(?:cgd|caixa\s*geral\s*de\s*dep[oó]sitos)\b/i, nifs: ["500960046"] },
  { name: "Millennium BCP", pattern: /\b(?:millennium\s*bcp|banco\s*comercial\s*portugu[eê]s)\b/i, nifs: ["501525882"] },
  { name: "Banco Santander", pattern: /\b(?:santander\s*totta|banco\s*santander|santander)\b/i, nifs: ["500844321"] },
  { name: "Banco BPI", pattern: /\b(?:banco\s*bpi|bpi)\b/i, nifs: ["501214534"] },
  { name: "Novo Banco", pattern: /\bnovo\s*banco\b/i, nifs: ["513204016"] },
  { name: "Banco Montepio", pattern: /\b(?:montepio\s*geral|banco\s*montepio|montepio)\b/i, nifs: ["500792612"] },
  { name: "Banco CTT", pattern: /\bbanco\s*ctt\b/i, nifs: ["513680935"] },
  { name: "ActivoBank", pattern: /\bactivobank\b/i, nifs: ["503254924"] },
  { name: "Bankinter", pattern: /\bbankinter\b/i, nifs: ["980547491"] },
  { name: "Crédito Agrícola", pattern: /\bcr[eé]dito\s*agr[ií]cola\b/i, nifs: ["500745479"] },
  { name: "EuroBic", pattern: /\beurobic\b/i, nifs: ["508115017"] },

  // Seguradoras
  {
    name: "Fidelidade",
    pattern: /\b(?:fidelidade\s*(?:companhia\s*de\s*seguros|seguros|mundial)|seguros\s*fidelidade)\b/i,
    nifs: ["500918880"],
  },
  {
    name: "Tranquilidade",
    pattern: /\b(?:tranquilidade\s*(?:companhia\s*de\s*seguros|seguros)|seguros\s*tranquilidade|generali\s*seguros)\b/i,
    nifs: ["500940231"],
  },
  { name: "Allianz", pattern: /\ballianz\s*(?:portugal|seguros)?\b/i, nifs: ["500060000"] },
  { name: "Zurich", pattern: /\b(?:zurich\s*seguros|seguros\s*zurich|zurich\s*insurance)\b/i, nifs: ["500693892"] },
  { name: "Mapfre", pattern: /\bmapfre\s*seguros\b/i, nifs: ["502246819"] },
  { name: "Lusitania", pattern: /\blusitania\s*seguros\b/i, nifs: ["501712062"] },
  { name: "Ageas", pattern: /\bageas\s*(?:portugal|seguros)?\b/i, nifs: ["503454109"] },

  // Estado & Organismos Públicos
  {
    name: "Autoridade Tributária",
    pattern: /\b(?:autoridade\s*tribut[aá]ria|at\s*-\s*finan[cç]as|dire[cç][aã]o-geral\s*dos?\s*impostos|portal\s*das\s*finan[cç]as|minist[eé]rio\s*das\s*finan[cç]as|reparti[cç][aã]o\s*de\s*finan[cç]as)\b/i,
    nifs: ["503933813", "600084700"],
  },
  {
    name: "Segurança Social",
    pattern: /\b(?:seguran[cç]a\s*social|instituto\s*da\s*seguran[cç]a\s*social|iss,\s*i\.?p\.?)\b/i,
    nifs: ["505305500"],
  },

  // Empresas parceiras / existentes no projeto
  { name: "Factor Triplo", pattern: /\bfactor\s*triplo\b/i },
  { name: "Geoflicks", pattern: /\bgeoflicks\b/i },
  { name: "Duas Siglas", pattern: /\bduas\s*siglas\b/i },
  { name: "Neomarca", pattern: /\bneomarca\b/i },
  { name: "Topázio", pattern: /\btop[aá]zio\b/i },
  { name: "Garantia Mútua", pattern: /\bgarantia\s*m[uú]tua\b/i },
  { name: "Wild Nut Co", pattern: /\b(?:wild\s*nut|i'm\s*nat)\b/i },
  { name: "Matidiver", pattern: /\b(?:matidiver|mativiver)\b/i },
];

// Entidades que aparecem em quase todos os documentos (pagamentos, descontos, clientes)
// e que por isso só contam como emissor quando o tipo de documento bate certo.
const BANK_ENTITIES = new Set([
  "Caixa Geral de Depósitos", "Millennium BCP", "Banco Santander", "Banco BPI", "Novo Banco",
  "Banco Montepio", "Banco CTT", "ActivoBank", "Bankinter", "Crédito Agrícola", "EuroBic",
]);
const STATE_ENTITIES = new Set(["Autoridade Tributária", "Segurança Social"]);
// Empresas do próprio grupo: costumam ser o CLIENTE da fatura, não o emissor
const OWN_ENTITIES = new Set(["Factor Triplo", "Geoflicks", "Duas Siglas", "Neomarca", "Topázio", "Matidiver"]);

/**
 * Remove espaços múltiplos e normaliza caracteres
 */
export function normalizeText(text) {
  if (!text) return "";
  return String(text).replace(/\s+/g, " ").trim();
}

/**
 * Numeração de páginas escrita no próprio documento.
 * Só aceita numeração ROTULADA ("Página 2 de 4", "Pág. 2/3", "Page 1 of 2", "Folha 2").
 * (Antes, qualquer "1/3" ou "01/03/2024" era lido como "página 1 de 3".)
 */
export function extractPageNumbering(text) {
  if (!text) return null;
  const normalized = normalizeText(text);

  const full = normalized.match(/\b(?:p[aá]gina|p[aá]g|page|folha|fl)\.?\s*(?:n\.?[ºo]\s*)?(\d{1,3})\s*(?:de|\/|of|-)\s*(\d{1,3})\b/i);
  if (full) {
    const current = parseInt(full[1], 10);
    const total = parseInt(full[2], 10);
    if (current >= 1 && total >= 1 && current <= total && total <= 200) {
      return { current, total, isContinuation: current > 1, isFirst: current === 1 };
    }
  }

  const single = normalized.match(/\b(?:p[aá]gina|p[aá]g|page|folha)\.?\s*(\d{1,3})\b(?!\s*[/.-]\s*\d)/i);
  if (single) {
    const current = parseInt(single[1], 10);
    if (current >= 1 && current <= 200) {
      return { current, total: null, isContinuation: current > 1, isFirst: current === 1 };
    }
  }

  return null;
}

/**
 * Avalia a qualidade e legibilidade de um texto OCR em português
 * Permite detetar se a rotação do OCR está correta
 */
export function scoreOcrText(text) {
  if (!text) return 0;
  const keywords = (text.match(/\b(?:fatura|factura|invoice|extrato|extracto|recibo|vencimento|conta|cliente|fornecedor|total|iva|nif|nipc|contribuinte|data|pagamento|banco|valor|eur|euros|lda|unipessoal|portugal|movimentos|saldo|cr[eé]dito|morada|quantidade|pre[cç]o|desconto)\b/gi) || []).length;
  const ptWords = (text.match(/\b(?:de|da|do|dos|das|em|para|por|com|não|na|no|nas|nos|um|uma|os|as|ao|aos|que|se)\b/gi) || []).length;
  const clean = text.replace(/[^a-zA-ZÀ-ÿ]/g, "");
  return (keywords * 25) + (ptWords * 10) + Math.min(clean.length * 0.1, 30);
}

/**
 * Valida um NIF/NIPC português (dígito de controlo módulo 11).
 * Evita usar "NIFs" lidos mal pelo OCR como sinal de mudança de documento.
 */
export function isValidNif(nif) {
  if (!/^[1235689]\d{8}$/.test(nif || "")) return false;
  let sum = 0;
  for (let i = 0; i < 8; i += 1) sum += Number(nif[i]) * (9 - i);
  const check = 11 - (sum % 11);
  return Number(nif[8]) === (check >= 10 ? 0 : check);
}

/**
 * Todos os NIF válidos presentes no texto (emissor e cliente)
 */
export function extractNifs(text) {
  if (!text) return [];
  const found = new Set();
  const normalized = normalizeText(text).replace(/(\d)\s(?=\d)/g, "$1");
  const re = /(?:^|[^\d])([1235689]\d{8})(?!\d)/g;
  let m;
  while ((m = re.exec(normalized))) {
    if (isValidNif(m[1])) found.add(m[1]);
  }
  return [...found];
}

/**
 * NIF principal (o primeiro rotulado; senão o primeiro válido)
 */
export function extractNif(text) {
  if (!text) return "";
  const normalized = normalizeText(text);
  const labeled = normalized.match(/(?:n\.?i\.?f\.?|nipc|contribuinte|vat|n\.?[ºo]?\s*de\s*identifica[cç][aã]o\s*fiscal)[\s:.nº°]*(?:PT)?\s*([1235689]\d{8})\b/i);
  if (labeled && isValidNif(labeled[1])) return labeled[1];
  return extractNifs(text)[0] || "";
}

/**
 * Conta bancária / IBAN (só faz sentido em extratos)
 */
export function extractBankAccount(text) {
  if (!text) return "";
  const normalized = normalizeText(text);
  const iban = normalized.match(/\bPT\s?50(?:\s?\d){21}\b/i);
  if (iban) return iban[0].replace(/\s/g, "").toUpperCase();
  const match = normalized.match(/\b(?:conta|n\.?[ºo]\s*conta|conta\s*n\.?[ºo]?|conta\s*(?:dep[oó]sitos\s*[aà]\s*ordem|corrente)\s*n?\.?[ºo]?)\s*[:.]?\s*((?:\d[\s-]?){7,20}\d)\b/i);
  if (!match) return "";
  const digits = match[1].replace(/\D/g, "");
  // Ignora datas (ex.: "conta 2024-03-15")
  if (/^20\d{2}(0[1-9]|1[0-2])/.test(digits) && digits.length === 8) return "";
  return digits;
}

/**
 * ATCUD: código único que todas as faturas portuguesas trazem desde 2023
 */
export function extractAtcud(text) {
  if (!text) return "";
  // Tolera leituras do OCR como "AICUD", "ATCILD;", "ATC D :"
  const m = normalizeText(text).match(/\bA[TI1]C\s?[UVIL1]{0,2}\s?D\s*[:;.]?\s*([A-Z0-9]{8,12}\s*-\s*\d{1,10})\b/i);
  return m ? m[1].replace(/\s+/g, "").toUpperCase() : "";
}

/**
 * Número de fatura, documento ou recibo.
 * Ex: "FT 2024/104", "FR A1/123", "FAC 10207202601/007642", "VFAT15/FV2600493", "Extracto 005/2026"
 * (Antes "FS", "NE", "GR"… seguidos de QUALQUER palavra contavam como número.)
 */
export function extractDocumentNumber(text) {
  if (!text) return "";
  const normalized = normalizeText(text);
  const hasDigit = (v) => /\d/.test(v);

  const patterns = [
    // Séries fiscais (prefixo em MAIÚSCULAS): FT 2024A/104, FR FR2024/12, NC A/3, VFAT15/FV2600493
    /\b((?:FT|FR|FS|NC|ND|GT|GR|GD|RC|RG|VD|FAC|VFAT)\s*[A-Z0-9]{0,14}\s*\/\s*[A-Z0-9]{1,14})\b/,
    // Fatura / Recibo / Nota de crédito / Guia n.º 123456
    /\b(?:fatura|factura|fatura-recibo|invoice|nota\s*de\s*cr[eé]dito|nota\s*de\s*d[eé]bito|recibo|guia(?:\s*de\s*remessa|\s*de\s*transporte)?)\s*(?:n\.?[ºo°]|n[uú]mero|num\.?|no\.?|#)\s*[:.]?\s*([A-Z0-9][A-Z0-9/\-_.]{2,24})/i,
    // Extrato 005/2026
    /\b(?:extrato|extracto)\s*(?:n\.?[ºo°]\s*)?[-:]?\s*(\d{1,4}\s*\/\s*\d{4})\b/i,
    // Documento n.º 12345
    /\b(?:documento|doc\.?)\s*(?:n\.?[ºo°]|#)\s*[:.]?\s*([A-Z0-9][A-Z0-9/\-_.]{2,24})/i,
  ];

  for (const regex of patterns) {
    const match = normalized.match(regex);
    if (match && match[1]) {
      const clean = match[1].replace(/\s+/g, "").replace(/[.\-_]+$/, "");
      if (clean.length >= 3 && hasDigit(clean) && !/^(?:19|20)\d{2}$/.test(clean)) {
        return clean;
      }
    }
  }
  return "";
}

// Nomes aprendidos com as correções do utilizador: { nif: "Nome" }
// Nota: setLearnedEntities não é chamado em lado nenhum; os nomes aprendidos chegam
// por outro caminho (parâmetro `learned` de buildDocMeta em faturasQr.js).
let learnedEntities = {};
export function setLearnedEntities(map) {
  learnedEntities = map && typeof map === "object" ? map : {};
}

// Texto com as trocas mais comuns do OCR desfeitas (1/l/| → i, 0 → o, 3 → e)
function ocrFuzzy(text) {
  return text.replace(/[1|!]/g, "i").replace(/0/g, "o").replace(/(?<=[a-z])3|3(?=[a-z])/gi, "e");
}

/**
 * Parece um nome de empresa a sério? Rejeita lixo do OCR como "GripaPTE xQ".
 */
export function looksLikeName(name) {
  const clean = String(name || "").trim();
  if (clean.length < 3 || clean.length > 60) return false;
  const words = clean.split(/\s+/);
  const okWord = (w) =>
    /^(?:de|da|do|dos|das|e|&|y)$/i.test(w)
    || /^[A-ZÁÀÃÂÉÊÍÓÔÕÚÇ][a-zà-ÿ'’.&-]+$/.test(w)       // Palavra Normal
    || /^[A-ZÁÀÃÂÉÊÍÓÔÕÚÇ&'’.-]{2,}$/.test(w);            // SIGLA / MAIÚSCULAS
  if (!words.every(okWord)) return false;
  const letters = clean.replace(/[^A-Za-zÀ-ÿ]/g, "");
  const vowels = letters.replace(/[^aeiouáàãâéêíóôõúAEIOUÁÀÃÂÉÊÍÓÔÕÚ]/g, "");
  return letters.length >= 3 && vowels.length / letters.length >= 0.25;
}

/**
 * Nome da Entidade (emissor / fornecedor / organismo).
 * Ordem: 1) nomes aprendidos pelo NIF, 2) entidades conhecidas (as que aparecem mais cedo),
 * 3) nome com sufixo societário perto do NIF do emissor, 4) "Fornecedor: …".
 * Não usa bancos, Estado ou empresas do próprio grupo quando não fazem sentido.
 */
export function extractEntity(text, category = "") {
  if (!text) return "";
  const normalized = normalizeText(text);
  const fuzzy = ocrFuzzy(normalized);
  const digitsOnly = normalized.replace(/(\d)\s(?=\d)/g, "$1");

  // 1. Aprendido com correções anteriores (o NIF que aparece primeiro ganha)
  let learned = null;
  Object.entries(learnedEntities).forEach(([nif, name]) => {
    if (!name) return;
    const i = digitsOnly.indexOf(nif);
    if (i >= 0 && (!learned || i < learned.pos)) learned = { name, pos: i };
  });
  if (learned) return learned.name;

  const allowed = (name) => {
    if (BANK_ENTITIES.has(name)) return category === "Extratos bancários";
    if (STATE_ENTITIES.has(name)) return category === "Impostos / Estado";
    return true;
  };

  // 2. Entidades conhecidas (por NIF ou nome, também com erros típicos de OCR)
  const candidates = [];
  KNOWN_ENTITIES.forEach((item) => {
    if (!allowed(item.name)) return;
    let pos = Infinity;
    (item.nifs || []).forEach((nif) => {
      const i = digitsOnly.indexOf(nif);
      if (i >= 0) pos = Math.min(pos, i - 5000); // NIF conhecido ganha a qualquer nome solto
    });
    const m = normalized.match(item.pattern) || fuzzy.match(item.pattern);
    if (m && m.index !== undefined) pos = Math.min(pos, m.index);
    if (pos !== Infinity) candidates.push({ name: item.name, pos, own: OWN_ENTITIES.has(item.name) });
  });
  candidates.sort((a, b) => (a.own - b.own) || (a.pos - b.pos));
  const best = candidates.find((c) => !c.own);
  if (best) return best.name;

  // 3. Nomes com sufixo societário ("Sabores do Sul, Lda"), só os que parecem nomes a sério.
  //    Preferência pelo que está mais perto (antes) do primeiro NIF rotulado = o emissor.
  const companyRe = /\b((?:[A-ZÁÀÃÂÉÊÍÓÔÕÚÇ][\wÀ-ÿ&.'’-]*|de|da|do|dos|das|e|&)(?:\s+(?:[A-ZÁÀÃÂÉÊÍÓÔÕÚÇ][\wÀ-ÿ&.'’-]*|de|da|do|dos|das|e|&)){0,5}),?\s+(?:Lda\.?|LDA\.?|Limitada|S\.A\.|SA|Unipessoal,?\s*Lda\.?|Unipessoal|E\.I\.R\.L\.?|SGPS)(?=$|[\s,.;:)])/g;
  const firstNif = normalized.search(/\b(?:n\.?i\.?f|nipc|contribuinte)\b/i);
  const companies = [];
  let cm;
  const STREET = /^(?:rua|r\.|av\.?|avenida|travessa|tv\.?|estrada|largo|pra[cç]a|urb\.?|urbaniza[cç][aã]o|bairro|quinta|lote|edif[ií]cio|zona)$/i;
  while ((cm = companyRe.exec(normalized))) {
    const words = cm[1].split(/\s+/);
    while (words.length && HEADER_WORDS.test(words[0])) words.shift();
    // Morada ("Rua Sporting Clube Farense Lda n19") não é nome de empresa
    // olha até 3 palavras para trás (o OCR parte nomes: "Rua Spor ting Clube Farense")
    const before = normalized.slice(Math.max(0, cm.index - 30), cm.index).trim().split(/\s+/).slice(-3);
    if (words.some((w) => STREET.test(w)) || before.some((w) => STREET.test(w))) continue;
    let name = words.join(" ").trim();
    // "Qualitalhos, Ind e Com. de Carnes Lda" → o nome é a palavra antes da vírgula
    const prevWord = normalized.slice(Math.max(0, cm.index - 40), cm.index).match(/([A-ZÁÀÃÂÉÊÍÓÔÕÚÇ][\wÀ-ÿ&'’-]{3,}),\s*$/);
    if (prevWord && !STREET.test(prevWord[1])) name = prevWord[1];
    if (looksLikeName(name) && !OWN_ENTITIES.has(name)) {
      const dist = firstNif >= 0 && cm.index <= firstNif ? firstNif - cm.index : 100000 + cm.index;
      companies.push({ name, dist });
    }
  }
  companies.sort((a, b) => a.dist - b.dist);
  if (companies.length) return companies[0].name.slice(0, 50);

  // 4. "Fornecedor: …"
  const supplierMatch = normalized.match(/(?:fornecedor|prestador|emitente|vendedor)\s*[:-]\s*([A-ZÁÀÃÂÉÊÍÓÔÕÚÇ][\wÀ-ÿ&.'’ -]{2,45})/i);
  if (supplierMatch && looksLikeName(supplierMatch[1].trim())) return supplierMatch[1].trim();

  const own = candidates.find((c) => c.own);
  return own ? own.name : "";
}

const HEADER_WORDS = /^(?:de|da|do|dos|das|e|&|recibo|vencimento|remunera[cç][aã]o|fatura|factura|fatura-recibo|nota|cr[eé]dito|empresa|entidade|cliente|fornecedor|emitente|nome|original|duplicado|triplicado|exmo\.?|exmos\.?|sr\.?|sra\.?|guia|remessa|extrato|extracto|or[cç]amento|proposta)$/i;

const MONTHS = {
  janeiro: "01", fevereiro: "02", março: "03", marco: "03", abril: "04", maio: "05", junho: "06",
  julho: "07", agosto: "08", setembro: "09", outubro: "10", novembro: "11", dezembro: "12",
};

/**
 * Data do documento (dia/mês/ano) e ano principal.
 * Se não houver nenhuma data, o ano fica vazio ("Sem ano") em vez de inventar o ano atual.
 */
export function extractDocumentDate(text) {
  if (!text) return { dateStr: "", year: "", month: "" };
  const normalized = normalizeText(text);
  const label = "(?:data(?:\\s*de\\s*emiss[aã]o|\\s*do\\s*documento|\\s*da\\s*fatura|\\s*doc\\.?)?|emitid[ao]\\s*em|emiss[aã]o)";

  const build = (y, mo, d) => {
    const yy = y.length === 2 ? `20${y}` : y;
    const n = Number(yy);
    if (n < 2000 || n > new Date().getFullYear() + 1) return null;
    return { dateStr: `${yy}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`, year: yy, month: String(mo).padStart(2, "0") };
  };

  // 1. Datas rotuladas
  const labeled = [
    [new RegExp(`${label}\\s*[:-]?\\s*(20\\d{2})[/\\-.](0?[1-9]|1[0-2])[/\\-.](0?[1-9]|[12]\\d|3[01])\\b`, "i"), (m) => build(m[1], m[2], m[3])],
    [new RegExp(`${label}\\s*[:-]?\\s*(0?[1-9]|[12]\\d|3[01])[/\\-.](0?[1-9]|1[0-2])[/\\-.](20\\d{2})\\b`, "i"), (m) => build(m[3], m[2], m[1])],
    [new RegExp(`${label}\\s*[:-]?\\s*(0?[1-9]|[12]\\d|3[01])[/\\-.](0?[1-9]|1[0-2])[/\\-.](\\d{2})\\b`, "i"), (m) => build(m[3], m[2], m[1])],
    [/(?:fatura|factura|documento)\s*[^;\n\r]{0,35}?\s*de\s*(0?[1-9]|[12]\d|3[01])[/\-.](0?[1-9]|1[0-2])[/\-.](20\d{2})\b/i, (m) => build(m[3], m[2], m[1])],
  ];
  for (const [re, fn] of labeled) {
    const m = normalized.match(re);
    const r = m && fn(m);
    if (r) return r;
  }

  // 2. Limpa leis, decretos e certificados (trazem anos antigos)
  const cleanedText = normalized
    .replace(/\b(?:decreto(?:[- ]lei)?|lei|portaria|despacho|regulamento)\s*(?:n\.?[ºo]?)?\s*[\w\-/]+(?:\s*,?\s*de\s*\d{1,2}(?:\s*de\s*\w+|\/\d{1,2}))?/gi, " ")
    .replace(/\b(?:certificado|programa\s*certificado|processado\s*por\s*programa)\s*(?:n\.?[ºo]?)?\s*[\w\-/]+/gi, " ")
    .replace(/\bart(?:igo)?\.?\s*\d+[^.,\n\r]*/gi, " ")
    .replace(/\bcapital\s*social\s*[:.]?\s*[\d.,]+/gi, " ");

  // 3. Datas não rotuladas
  const unlabeled = [
    [/\b(20\d{2})[/\-.](0?[1-9]|1[0-2])[/\-.](0?[1-9]|[12]\d|3[01])\b/, (m) => build(m[1], m[2], m[3])],
    [/\b(0?[1-9]|[12]\d|3[01])[/\-.](0?[1-9]|1[0-2])[/\-.](20\d{2})\b/, (m) => build(m[3], m[2], m[1])],
    [/\b(0?[1-9]|[12]\d|3[01])\s+de\s+(janeiro|fevereiro|março|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\s+(?:de\s+)?(20\d{2})\b/i, (m) => build(m[3], MONTHS[m[2].toLowerCase()], m[1])],
    [/\b(0?[1-9]|[12]\d|3[01])[/\-.](0?[1-9]|1[0-2])[/\-.](2\d)\b/, (m) => build(m[3], m[2], m[1])],
  ];
  for (const [re, fn] of unlabeled) {
    const m = cleanedText.match(re);
    const r = m && fn(m);
    if (r) return r;
  }

  // 4. Mês/ano de referência: "Mês: 02/2026", "Período: 03-2026", "março de 2026"
  const monthYear = cleanedText.match(/(?:m[eê]s|per[ií]odo|vencimento|refer[eê]ncia)\s*[:-]?\s*(0?[1-9]|1[0-2])[/\-.](20\d{2})\b/i);
  if (monthYear) return { dateStr: `${monthYear[2]}-${monthYear[1].padStart(2, "0")}`, year: monthYear[2], month: monthYear[1].padStart(2, "0") };
  const monthName = cleanedText.match(/\b(janeiro|fevereiro|março|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\s+(?:de\s+)?(20\d{2})\b/i);
  if (monthName) {
    const mo = MONTHS[monthName[1].toLowerCase()];
    return { dateStr: `${monthName[2]}-${mo}`, year: monthName[2], month: mo };
  }

  // 5. Só o ano
  const yearOnly = cleanedText.match(/\b(20[0-4]\d)\b/);
  if (yearOnly && Number(yearOnly[1]) <= new Date().getFullYear() + 1) {
    return { dateStr: "", year: yearOnly[1], month: "" };
  }
  return { dateStr: "", year: "", month: "" };
}

/**
 * Classifica a categoria do documento com pontuação ponderada
 */
export function classifyCategory(text, fileName = "") {
  const source = `${fileName} ${text || ""}`.toLowerCase();
  const scores = {
    "Faturas": 0,
    "Vencimentos": 0,
    "Extratos bancários": 0,
    "Gastos": 0,
    "Contratos": 0,
    "Guias": 0,
    "Impostos / Estado": 0,
  };

  // Faturas / recibos
  if (/\b(?:fatura|factura|fatura-recibo|invoice|nota\s*de\s*cr[eé]dito|atcud)\b/i.test(source)) scores["Faturas"] += 5;
  if (/(?:total\s*(?:a\s*pagar|do\s*documento|da\s*fatura|l[ií]quido)|incid[eê]ncia|taxa\s*(?:de\s*)?iva|valor\s*tribut[aá]vel|base\s*tribut[aá]vel)/i.test(source)) scores["Faturas"] += 4;
  if (/\brecibo\s*(?:n\.?[ºo°]|de\s*quita[cç][aã]o)/i.test(source)) scores["Faturas"] += 3;

  // Vencimentos
  if (/(?:recibo\s*de\s*vencimento|recibo\s*de\s*remunera|folha\s*(?:salarial|de\s*vencimento)|processamento\s*salarial|demonstra[cç][aã]o\s*de\s*remunera[cç][oõ]es)/i.test(source)) scores["Vencimentos"] += 9;
  if (/(?:vencimento\s*base|subs[ií]dio\s*de\s*(?:alimenta[cç][aã]o|refei[cç][aã]o|f[eé]rias|natal)|reten[cç][aã]o\s*(?:na\s*fonte\s*)?(?:de\s*)?irs|seg(?:uran[cç]a)?\.?\s*social\s*\(?11\s*%)/i.test(source)) scores["Vencimentos"] += 6;
  if (/(?:sal[aá]rio\s*base|dias\s*trabalhados|vencimento\s*l[ií]quido|l[ií]quido\s*a\s*receber|abonos|descontos)/i.test(source)) scores["Vencimentos"] += 3;

  // Extratos
  if (/(?:extrato|extracto)\s*(?:de\s*conta|banc[aá]rio|combinado|integrado|mensal|do\s*cart[aã]o)|posi[cç][aã]o\s*integrada/i.test(source)) scores["Extratos bancários"] += 9;
  if (/(?:saldo\s*(?:inicial|final|anterior|dispon[ií]vel|contabil[ií]stico)|movimentos\s*(?:da\s*conta|do\s*m[eê]s|do\s*per[ií]odo)|data\s*(?:-\s*)?valor|data\s*mov)/i.test(source)) scores["Extratos bancários"] += 5;

  // Guias
  if (/(?:guia\s*de\s*(?:remessa|transporte|devolu[cç][aã]o|movimenta[cç][aã]o)|c[oó]digo\s*(?:de\s*)?at\s*(?:da\s*guia)?|local\s*de\s*carga)/i.test(source)) scores["Guias"] += 8;

  // Impostos / Estado (com \b — antes "ies" apanhava "séries", "propriedades"…)
  if (/(?:documento\s*[uú]nico\s*de\s*cobran[cç]a|declara[cç][aã]o\s*peri[oó]dica\s*(?:de\s*)?iva|declara[cç][aã]o\s*(?:modelo\s*)?(?:22|10)\b|informa[cç][aã]o\s*empresarial\s*simplificada|nota\s*de\s*liquida[cç][aã]o|guia\s*de\s*pagamento\s*(?:de\s*)?(?:imposto|iva|irs|irc|contribui)|refer[eê]ncia\s*para\s*pagamento\s*(?:de\s*)?(?:imposto|contribui[cç][oõ]es)|imposto\s*municipal\s*sobre\s*im[oó]veis|imposto\s*[uú]nico\s*de\s*circula[cç][aã]o)/i.test(source)) scores["Impostos / Estado"] += 8;
  // Siglas só em MAIÚSCULAS e com contexto fiscal (antes "ies" de "Nações" partido pelo OCR contava como IES)
  if (/\b(?:DUC|IES|IMI|IUC|IRC|IRS)\b/.test(text || "") && /\b(?:autoridade\s*tribut|finan[cç]as|liquida[cç][aã]o|declara[cç][aã]o|pagamento\s*de\s*imposto|seguran[cç]a\s*social)/i.test(source)) scores["Impostos / Estado"] += 8;
  if (/\b(?:autoridade\s*tribut[aá]ria|portal\s*das\s*finan[cç]as|seguran[cç]a\s*social\s*direta|instituto\s*da\s*seguran[cç]a\s*social)\b/i.test(source)) scores["Impostos / Estado"] += 3;

  // Gastos / talões
  if (/(?:tal[aã]o\s*de\s*(?:compra|venda)|fatura\s*simplificada|consumidor\s*final|combust[ií]vel|gas[oó]leo|gasolina|parqu[ií]metro|estacionamento|portagem|via\s*verde)/i.test(source)) scores["Gastos"] += 6;

  // Contratos
  if (/(?:contrato\s*de\s*(?:trabalho|presta[cç][aã]o|arrendamento|fornecimento|compra\s*e\s*venda)|primeiro\s*outorgante|segundo\s*outorgante|entre\s*:?\s*.{0,80}\s*e\s*.{0,80}\s*[eé]\s*celebrado)/i.test(source)) scores["Contratos"] += 9;
  if (/\bcl[aá]usula\s*(?:1|primeira|i)\b/i.test(source)) scores["Contratos"] += 3;

  let bestCategory = "Outros";
  let maxScore = 4; // mínimo para não classificar por acaso
  for (const [cat, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      bestCategory = cat;
    }
  }
  return bestCategory;
}

/**
 * Página em branco ou verso de digitalização vazio
 */
export function isBlankPage(text) {
  if (!text) return true;
  const clean = text.replace(/[^a-zA-Z0-9À-ÿ]/g, "");
  return clean.length < 10;
}

// ---------------------------------------------------------------------
// ANÁLISE POR PÁGINA (com cache: o mesmo texto não é analisado 2 vezes)
// ---------------------------------------------------------------------
const analysisCache = new Map();

function hasDocumentTitle(text) {
  return /\b(?:fatura(?:-recibo)?|factura(?:-recibo)?|fatura\s*simplificada|nota\s*de\s*cr[eé]dito|nota\s*de\s*d[eé]bito|recibo(?:\s*de\s*vencimento)?|guia\s*de\s*(?:remessa|transporte)|extrato|extracto|contrato\s*de|or[cç]amento|proposta|documento\s*[uú]nico\s*de\s*cobran[cç]a|declara[cç][aã]o)\b/i.test(text);
}

/**
 * Tipo de página para documentos que não são faturas:
 *  extrato   → extrato / consulta de movimentos do banco
 *  pagamento → comprovativo de pagamento (detalhe de movimento, talão MB, guia AT/SS)
 *  declRem   → extrato da declaração de remunerações (Segurança Social)
 */
export function pageKind(text) {
  const t = String(text || "");
  if (/consulta\s*de\s*movimentos|extra[c]?to\s*(?:de\s*conta|banc[aá]rio|combinado|integrado|mensal)|saldo\s*contabil[ií]stico/i.test(t)) return "extrato";
  const fatura = /\bfa[ck]?tura\b|\bA[TI1]C\s?[UVIL1]{0,2}\s?D\b/i.test(t);
  if (/extra[c]?to\s*da\s*declara[cç][aã]o\s*de\s*remunera|declara[cç][aã]o\s*de\s*remunera[cç][oõ]es\s*abaixo/i.test(t)) return "declRem";
  // Tolerante a erros de OCR: "Detalhe da Movimento", "OCUMENTO DE PAG", "Multi-~Imposto"…
  if (!fatura && /detalhe\s*d[aeo]\s*mov[il1]mento|pagamentos?\s*ao\s*estado|pagamento\s*de\s*servi[cç]os|refer[eêé]n?c[il1]?a\s*(?:\(s\)\s*)?para\s*pagamento|ocumento\s*de\s*pag|import[aâ]ncia\s*a\s*pagar|multi\W{0,3}imposto|pag\.?\s*esp\.?\s*pag\W{0,2}estado|pag\.?\s*serv\.?\s*\d{5}/i.test(t)) return "pagamento";
  return "";
}

/**
 * Referências de pagamento citadas na página (ligam detalhe do banco, talão MB e guia):
 *  - AT: 15 dígitos (156 290 268 798 176 / 156.290.268.798.176)
 *  - Pagamento de serviços: entidade (5 dígitos) + referência (9 dígitos)
 */
export function paymentRefs(text) {
  const t = String(text || "");
  const out = new Set();
  for (const m of t.matchAll(/(?<!\d)(1\d{2})[ .]?(\d{3})[ .]?(\d{3})[ .]?(\d{3})[ .]?(\d{3})(?!\d)/g)) out.add(m.slice(1).join(""));
  const ent = (t.match(/entidade\W{0,6}(\d{5})(?!\d)/i) || t.match(/pag\.?\s*serv\.?\s*(\d{5})(?!\d)/i) || [])[1];
  const ref = (t.match(/refer[eêé]n?c?[il1]?a\W{0,6}(\d{3}\s?\d{3}\s?\d{3})(?![\d])/i) || t.match(/pag\.?\s*serv\.?\s*\d{5}\s+(\d{3}\s?\d{3}\s?\d{3})(?!\d)/i) || [])[1];
  if (ref) out.add(`${ent || ""}:${ref.replace(/\s/g, "")}`);
  return [...out];
}

/**
 * Valores em euros escritos na página (formato português: 1.188,00), em cêntimos
 */
export function pageAmounts(text) {
  const out = new Set();
  const re = /(?<![\d.,])(\d{1,3}(?:[.\s]\d{3})+|\d+),(\d{2})(?![\d])/g;
  let m;
  while ((m = re.exec(String(text || "")))) {
    const v = Number(m[1].replace(/[.\s]/g, "")) * 100 + Number(m[2]);
    if (v >= 100) out.add(v);
  }
  return [...out];
}

/**
 * Análise de uma página (categoria, NIFs, ATCUD, nº, datas, tipo, refs. de pagamento…)
 * usada pelas regras de quebra. Resultado em cache pelo texto.
 * @param {string} text
 * @returns {object}
 */
export function analyzePage(text) {
  const key = text || "";
  if (analysisCache.has(key)) return analysisCache.get(key);
  const t = normalizeText(key);
  const category = classifyCategory(t);
  const atcud = extractAtcud(t);
  const result = {
    blank: isBlankPage(t),
    num: extractPageNumbering(t),
    atcud,
    docNum: extractDocumentNumber(t).toLowerCase(),
    docId: atcud || extractDocumentNumber(t),
    statementNo: (t.match(/\b(?:extrato|extracto)\s*(?:n\.?[ºo°]\s*)?[-:]?\s*(\d{1,4}\s*\/\s*\d{4})\b/i)?.[1] || "").replace(/\s+/g, ""),
    nifs: extractNifs(t),
    entity: extractEntity(t, category),
    account: category === "Extratos bancários" ? extractBankAccount(t) : "",
    category,
    title: hasDocumentTitle(t),
    hasTotal: /\btotal\b/i.test(t),
    date: extractDocumentDate(t).dateStr,
    transportOut: /\b(?:a\s*transportar|continua(?:\s*na\s*p[aá]gina\s*seguinte)?\s*[.…]*$|continua\s*\.{2,})/i.test(t),
    kind: pageKind(t),
    amounts: pageAmounts(key),
    refs: paymentRefs(t),
    declRef: (t.match(/ano\s*\/\s*m[eêé]s\s*de\s*refer[eê]ncia[^\d]{0,40}(20\d{2})\s*\/\s*(\d{1,2})/i) || []).slice(1).join("-"),
    niss: (t.match(/seguran[cç]a\s*social\s*(?:\(niss\))?\s*:?\s*(\d{11})\b/i) || [])[1] || "",
    stmtHead: /dados\s*da\s*conta|saldo\s*contabil[ií]stico|n[ºo°]?\s*conta\b.{0,40}\bproduto/i.test(t),
    transportIn: /\b(?:transporte|de\s*transporte|continua[cç][aã]o|subtotal\s*anterior|vem\s*de\s*tr[aá]s)\b/i.test(t),
  };
  if (analysisCache.size > 5000) analysisCache.clear();
  analysisCache.set(key, result);
  return result;
}

function newGroupState(a) {
  return {
    docIds: new Set(a.docId ? [a.docId.toLowerCase()] : []),
    atcuds: new Set(a.atcud ? [a.atcud] : []),
    docNums: new Set(a.docNum ? [a.docNum] : []),
    stmtIds: new Set(a.statementNo ? [a.statementNo] : []),
    nifs: new Set(a.nifs),
    accounts: new Set(a.account ? [a.account] : []),
    category: a.category,
    entity: a.entity,
    date: a.date,
    hasTotal: a.hasTotal,
    title: a.title,
    pages: 1,
    kind: a.kind,
    amounts: new Set(a.amounts),
    declRef: a.declRef,
    niss: a.niss,
    refs: new Set(a.refs),
  };
}

function addToGroup(g, a) {
  if (a.docId) g.docIds.add(a.docId.toLowerCase());
  if (a.atcud) g.atcuds.add(a.atcud);
  if (a.docNum) g.docNums.add(a.docNum);
  if (a.statementNo) g.stmtIds.add(a.statementNo);
  a.nifs.forEach((n) => g.nifs.add(n));
  if (a.account) g.accounts.add(a.account);
  if (g.category === "Outros" && a.category !== "Outros") g.category = a.category;
  if (!g.entity && a.entity) g.entity = a.entity;
  if (!g.date && a.date) g.date = a.date;
  g.hasTotal = g.hasTotal || a.hasTotal;
  g.title = g.title || a.title;
  g.pages += 1;
  if (!g.kind && a.kind) g.kind = a.kind;
  a.amounts.forEach((v) => g.amounts.add(v));
  if (!g.declRef && a.declRef) g.declRef = a.declRef;
  if (!g.niss && a.niss) g.niss = a.niss;
  a.refs.forEach((r) => g.refs.add(r));
}

/**
 * Decide se a página `a` começa um documento novo, sabendo o que já se viu
 * no documento atual (`g`) e na página imediatamente anterior (`prev`).
 * Regra de ouro: na dúvida, NÃO corta (é mais fácil dividir do que reconstruir).
 */
function decideBreak(a, prev, g, hubNifs = new Set()) {
  // Folhas em branco ficam com o documento atual (podem ser removidas depois)
  if (a.blank) return false;
  if (prev.blank && g.pages === 1 && !g.title) return false;

  // Documentos do banco e do Estado (sem QR nem ATCUD)
  if (a.kind && g.kind && a.kind !== g.kind) return true;
  if (a.kind === "extrato" && g.kind === "extrato") return a.stmtHead; // cabeçalho novo = outro extrato
  if (a.kind === "pagamento" && g.kind === "pagamento") {
    // Detalhe do banco + talão MB + guia do mesmo pagamento: mesmo valor ou mesma referência de pagamento
    if (a.refs.some((r) => g.refs.has(r))) return false;
    return !a.amounts.some((v) => g.amounts.has(v));
  }
  // Extratos da declaração de remunerações da SS: cada um (um por taxa contributiva) é um documento
  // à parte, e também separados do pagamento à SS (pedido da contabilidade, 27/11/2026).
  // Folhas de continuação de uma declaração longa não repetem o cabeçalho (kind "") e ficam juntas.
  if (a.kind === "declRem" && g.kind === "declRem") return true;
  if (a.kind && !g.kind && g.pages && (g.title || g.hasTotal)) return true;

  // 0. ATCUD: código único por fatura. Comparado só com outros ATCUD.
  if (a.atcud && g.atcuds.size) return !g.atcuds.has(a.atcud);

  // Nos extratos, os movimentos citam nºs de faturas: aí só conta o nº do próprio extrato
  const extrato = a.category === "Extratos bancários" || g.category === "Extratos bancários";
  const id = extrato ? a.statementNo : a.docNum;
  const ids = extrato ? g.stmtIds : g.docNums;

  // 1. Nº do documento (comparado só com nºs do mesmo tipo)
  if (id && ids.size) return !ids.has(id);

  // 2. Numeração rotulada, só se fizer sentido em sequência com a página anterior
  //    (os carimbos do scanner, ex. "Página 4 de 4" em todas as folhas, já vêm filtrados)
  if (a.num?.isFirst) return true;
  if (a.num?.isContinuation) {
    const seguida = !prev.num || a.num.current === prev.num.current + 1;
    if (seguida) return false;
  }
  if (id && a.title) return true; // cabeçalho com número depois de páginas sem número

  // 3. O documento anterior anunciou que acabou ("Página 3 de 3")
  if (prev.num?.total && prev.num.current >= prev.num.total) return true;

  // 4. Avisos de transporte → continua
  if (prev.transportOut || a.transportIn) return false;

  // 5. Emissor diferente (Sushi Mundo → Hora Doce), quando a página tem cara de documento
  if (a.entity && g.entity && a.entity.toLowerCase() !== g.entity.toLowerCase()
      && (a.title || a.hasTotal || a.nifs.length)) return true;

  // 6. NIFs de emissor diferentes. O NIF do CLIENTE (a própria empresa) aparece em
  //    talões de vários fornecedores, por isso não conta como "NIF em comum".
  const aNifs = a.nifs.filter((n) => !hubNifs.has(n));
  const gNifs = [...g.nifs].filter((n) => !hubNifs.has(n));
  if (aNifs.length && gNifs.length && !aNifs.some((n) => gNifs.includes(n))) return true;

  // 6. Extratos: conta diferente
  if (a.account && g.accounts.size && !g.accounts.has(a.account)) return true;

  // 7. Tipos de documento diferentes (só quando AMBOS são reconhecidos;
  //    antes uma 2.ª página sem palavras-chave era sempre cortada)
  if (a.category !== "Outros" && g.category !== "Outros" && a.category !== g.category && a.title) return true;

  // 7b. Recibos de vencimento: cada cabeçalho novo é o recibo de outro trabalhador/mês
  if (a.category === "Vencimentos" && g.category === "Vencimentos" && a.title && g.title) return true;

  // 8. Dois talões/faturas completos seguidos, com datas diferentes
  if (a.title && a.hasTotal && g.hasTotal && a.date && g.date && a.date !== g.date
      && a.category !== "Extratos bancários" && g.category !== "Extratos bancários") return true;

  return false;
}

/**
 * Calcula as quebras de documento para uma lista de páginas (por ordem).
 * Cada ficheiro importado começa sempre um documento novo.
 * Devolve um array de booleanos (true = esta página começa um documento).
 */
function findHubNifs(analyses) {
  const partners = new Map();
  analyses.forEach((a) => {
    a.nifs.forEach((n) => {
      if (!partners.has(n)) partners.set(n, new Set());
      a.nifs.forEach((o) => { if (o !== n) partners.get(n).add(o); });
    });
  });
  const hub = new Set();
  partners.forEach((set, nif) => { if (set.size >= 2) hub.add(nif); });
  return hub;
}

export function computeBreaks(pages) {
  const analyses = pages.map((page) => analyzePage(page?.text || ""));
  const hubByFile = new Map();
  pages.forEach((page, i) => {
    const key = page?.fileId ?? "_";
    if (!hubByFile.has(key)) hubByFile.set(key, []);
    hubByFile.get(key).push(analyses[i]);
  });
  hubByFile.forEach((list, key) => hubByFile.set(key, findHubNifs(list)));

  // "Página 4 de 4" carimbado pelo scanner em todas as folhas → ignorar
  const numCount = new Map();
  pages.forEach((page, i) => {
    const n = analyses[i].num;
    if (!n) return;
    const k = `${page?.fileId ?? "_"}|${n.current}/${n.total}`;
    numCount.set(k, (numCount.get(k) || 0) + 1);
  });
  pages.forEach((page, i) => {
    const n = analyses[i].num;
    if (n && (numCount.get(`${page?.fileId ?? "_"}|${n.current}/${n.total}`) || 0) >= 3) {
      analyses[i] = { ...analyses[i], num: null };
    }
  });
  const result = [];
  let group = null;
  let prev = null;
  pages.forEach((page, index) => {
    const a = analyses[index];
    const newFile = index === 0 || !pages[index - 1] || pages[index - 1].fileId !== page.fileId;
    const brk = newFile || !group ? true : decideBreak(a, prev, group, hubByFile.get(page?.fileId ?? "_"));
    if (brk) group = newGroupState(a);
    else addToGroup(group, a);
    result.push(brk);
    prev = a;
  });
  return result;
}

/**
 * Compatibilidade: decisão só com a página anterior
 */
export function shouldBreakPage(currentPage, previousPage, pageIndex, isNewFile = false) {
  if (pageIndex === 0 || isNewFile || !previousPage) return true;
  const prev = analyzePage(previousPage.text || "");
  return decideBreak(analyzePage(currentPage?.text || ""), prev, newGroupState(prev));
}

/** Compatibilidade (sem uso atual): a página continua a anterior? */
export function hasContinuationSignals(currentPage, previousPage) {
  if (!currentPage || !previousPage) return false;
  return !shouldBreakPage(currentPage, previousPage, 1, false);
}

/** Compatibilidade (sem uso atual): a página começa documento novo? */
export function hasNewDocumentSignals(currentPage, previousPage) {
  if (!currentPage) return false;
  if (!previousPage) return true;
  return shouldBreakPage(currentPage, previousPage, 1, false);
}

/**
 * Nome limpo e normalizado para o PDF. Ex: Fatura_Makro_FT2024-104_2024-03-15
 */
export function generateSmartFilename({ category, entity, docNumber, dateStr, year, person, fallbackTitle = "Documento" }) {
  const catMap = {
    "Faturas": "Fatura",
    "Vencimentos": "Recibo_Vencimento",
    "Extratos bancários": "Extrato_Bancario",
    "Gastos": "Despesa",
    "Contratos": "Contrato",
    "Guias": "Guia",
    "Impostos / Estado": "Imposto_Estado",
    "Outros": "Documento",
  };
  const parts = [catMap[category] || "Documento"];

  const namePart = ((category === "Vencimentos" ? (person || entity) : (entity || person)) || "")
    .trim().replace(/[\\/:*?"<>|\s]+/g, "_");
  if (namePart) parts.push(namePart);
  if (docNumber) parts.push(docNumber.replace(/[\\/:*?"<>|\s]+/g, "-"));
  if (dateStr) parts.push(dateStr);
  else if (year) parts.push(year);

  const filename = parts.length > 1 ? parts.join("_") : (fallbackTitle || "Documento");
  return filename.slice(0, 80);
}

/**
 * Metadados de um conjunto de páginas que formam um documento
 */
export function extractGroupMetadata(pages, fallbackFileName = "") {
  if (!pages || !pages.length) {
    return { category: "Outros", year: "", entity: "", person: "", docNumber: "", nif: "", dateStr: "", filename: "Documento", isBlank: false };
  }

  const texts = pages.map((p) => p.text || "");
  const headerText = texts.slice(0, 2).join(" ");
  const fullText = texts.join(" ");
  const source = headerText.trim() ? headerText : fullText;

  // Categoria: pelo cabeçalho; se não chegar, pelo documento todo
  let category = classifyCategory(source, fallbackFileName);
  if (category === "Outros") category = classifyCategory(fullText, fallbackFileName);

  const { dateStr, year } = extractDocumentDate(source).year ? extractDocumentDate(source) : extractDocumentDate(fullText);
  const statementNo = (source.match(/\b(?:extrato|extracto)\s*(?:n\.?[ºo°]\s*)?[-:]?\s*(\d{1,4}\s*\/\s*\d{4})\b/i)?.[1] || "").replace(/\s+/g, "");
  const docNumber = category === "Extratos bancários"
    ? statementNo
    : (extractDocumentNumber(source) || extractAtcud(source));
  const nif = extractNif(source);
  const entity = extractEntity(source, category) || extractEntity(fullText, category);

  // Recibo de vencimento: nome do trabalhador
  let person = "";
  if (category === "Vencimentos") {
    const personMatch = fullText.match(/(?:[Nn]ome|[Cc]olaborador|[Tt]rabalhador|TRABALHADOR|[Ff]uncion[aá]rio|[Ee]mpregado)\s*[:-]?\s*([A-ZÁÀÃÂÉÊÍÓÔÕÚÇ][a-zà-ÿ]+(?:\s+(?:de|da|do|dos|das|e)?\s*[A-ZÁÀÃÂÉÊÍÓÔÕÚÇ][a-zà-ÿ]+){1,4})/);
    if (personMatch) {
      person = personMatch[1].replace(/\b(?:nif|nipc|contribuinte|vencimento|data|categoria|departamento|morada|c[oó]digo|n\.?[ºo])\b.*$/i, "").trim();
    }
  }

  const filename = generateSmartFilename({
    category,
    entity,
    docNumber,
    dateStr,
    year,
    person,
    fallbackTitle: fallbackFileName.replace(/\.pdf$/i, "").replace(/[_-]+/g, " "),
  });

  return {
    category,
    year,
    entity: entity || person,
    person: person || entity,
    docNumber,
    nif,
    dateStr,
    filename,
    isBlank: pages.every((p) => isBlankPage(p.text)),
  };
}

/**
 * Nome conhecido para um NIF (catálogo interno)
 */
export function nameForNif(nif) {
  if (!nif) return "";
  const hit = KNOWN_ENTITIES.find((e) => (e.nifs || []).includes(nif));
  return hit ? hit.name : "";
}

/**
 * O nome pertence ao catálogo interno?
 */
export function isKnownName(name) {
  return Boolean(name) && KNOWN_ENTITIES.some((e) => e.name === name);
}
