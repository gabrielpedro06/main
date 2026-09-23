/**
 * Motor Inteligente de Análise e Separação de Documentos PDF
 * Especializado em documentação administrativa, fiscal e empresarial (Portugal & Internacional)
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
  { name: "Levi's", pattern: /\blevi'?s\b/i },

  // Restauração Rápida & Cadeias
  { name: "McDonald's", pattern: /\bmcdonald'?s\b/i, nifs: ["502167017", "505538725", "505323745", "505166690"] },
  { name: "Burger King", pattern: /\b(?:burger\s*king|food4kings)\b/i, nifs: ["510728090"] },
  { name: "KFC", pattern: /\b(?:kfc|iberusa)\b/i, nifs: ["502604735"] },
  { name: "Pans & Company", pattern: /\b(?:pans\s*(?:&|e)\s*company|ibersande)\b/i, nifs: ["503799149"] },
  { name: "Taco Bell", pattern: /\b(?:taco\s*bell|firmoven)\b/i, nifs: ["507517970"] },
  { name: "Pizza Hut", pattern: /\bpizza\s*hut\b/i },
  { name: "Wok to Walk", pattern: /\bwok\s*to\s*walk\b/i },
  { name: "Qualitalhos", pattern: /\bqualitalhos\b/i, nifs: ["503290688"] },
  { name: "Sirius Fuel", pattern: /\bsirius\s*fuel\b/i, nifs: ["510958427"] },
  { name: "Hora Doce", pattern: /\bhora\s*doce\b/i, nifs: ["509396100"] },
  { name: "Sushi Mundo", pattern: /\bsushi\s*mundo\b/i, nifs: ["506290174"] },
  { name: "Yummy Sweet", pattern: /\byummy\s*sweet\b/i },
  { name: "Talho Burger", pattern: /\btalho\s*burger\b/i },
  { name: "O Seu Bitoque", pattern: /\bo\s*seu\s*bitoque\b/i },
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

/**
 * Remove espaços múltiplos e normaliza caracteres
 */
export function normalizeText(text) {
  if (!text) return "";
  return String(text).replace(/\s+/g, " ").trim();
}

/**
 * Deteta a numeração de páginas indicada no próprio conteúdo do documento.
 * Ex: "Página 2 de 4", "Pág. 2/3", "Page 1 of 2", "2 de 3", "2/4"
 */
export function extractPageNumbering(text) {
  if (!text) return null;
  const normalized = normalizeText(text);

  // Padrões comuns de paginação
  const patterns = [
    // Página 2 de 4 / Page 2 of 4 / Pág. 2 de 4 / Folha 2 de 4
    /(?:p[aá]gina|p[aá]g\.?|page|folha)\s*(\d{1,3})\s*(?:de|\/|of)\s*(\d{1,3})/i,
    // [Página] 2 / 4 ou 2 de 4 isolados no texto
    /\b(\d{1,3})\s*(?:\/|de)\s*(\d{1,3})\b/i,
  ];

  for (const regex of patterns) {
    const match = normalized.match(regex);
    if (match) {
      const current = parseInt(match[1], 10);
      const total = parseInt(match[2], 10);
      // Validações razoáveis de bom senso (evita apanhar datas 12/2024 ou rácios)
      if (current >= 1 && total >= 1 && current <= total && total <= 50) {
        return { current, total, isContinuation: current > 1, isFirst: current === 1 };
      }
    }
  }

  // Padrões com apenas número da página: "Página 2", "Pág 3"
  const singlePageMatch = normalized.match(/(?:p[aá]gina|p[aá]g\.?|page)\s*(\d{1,3})\b/i);
  if (singlePageMatch) {
    const current = parseInt(singlePageMatch[1], 10);
    if (current >= 1 && current <= 50) {
      return { current, total: null, isContinuation: current > 1, isFirst: current === 1 };
    }
  }

  return null;
}

/**
 * Avalia a qualidade e legibilidade de um texto OCR em português
 * Permite detetar instantaneamente se a rotação do OCR está correta
 */
export function scoreOcrText(text) {
  if (!text) return 0;
  const keywords = (text.match(/\b(?:fatura|factura|invoice|extrato|extracto|recibo|vencimento|conta|cliente|fornecedor|total|iva|nif|nipc|contribuinte|data|pagamento|banco|bpi|cgd|santander|millennium|makro|endesa|top[aá]zio|valor|eur|euros|lda|sa|unipessoal|portugal|movimentos|saldo|cr[eé]dito)\b/gi) || []).length;
  const ptWords = (text.match(/\b(?:de|da|do|dos|das|em|para|por|com|não|na|no|nas|nos|um|uma|os|as|ao|aos|que|se)\b/gi) || []).length;
  const clean = text.replace(/[^a-zA-ZÀ-ÿ]/g, "");
  return (keywords * 25) + (ptWords * 10) + Math.min(clean.length * 0.1, 30);
}

/**
 * Extrai número de conta bancária ou cartão (ex: 4-4698307-035-001)
 */
export function extractBankAccount(text) {
  if (!text) return "";
  const normalized = normalizeText(text);
  const match = normalized.match(/(?:conta\s*(?:n[ºo.]?|corrente|cart[aã]o\s*n[ºo.]?)?)\s*([0-9-]{7,25})/i);
  return match ? match[1].trim() : "";
}

/**
 * Extrai número de fatura, documento ou recibo.
 * Ex: "FT 2024/104", "FS A/123", "FAC 10207202601/007642", "VFAT15/FV2600493", "Extracto 005/2026"
 */
export function extractDocumentNumber(text) {
  if (!text) return "";
  const normalized = normalizeText(text);

  const patterns = [
    // Séries fiscais portuguesas: FT, FS, FR, NC, ND, FAC, VFAT, GT, GR, FP, RC, NE
    /\b(?:FT|FS|FR|NC|ND|FAC|VFAT|GT|GR|FP|RC|NE)\b\s*([A-Z0-9.\-_]+(?:\s*\/\s*[A-Z0-9]+)?)/i,
    // Séries personalizadas com barra: Nº F2/483, Nº A/105395, Nº 125143
    /(?:n[ºo.]?|n[uú]mero)\s*([A-Z0-9]{1,6}\s*\/\s*[0-9]{1,10})/i,
    // Fatura / Factura n.º 123456
    /(?:fatura|factura|invoice|nota\s*de\s*cr[eé]dito|recibo|guia)\s*(?:n[ºo.]?|n[uú]mero|num\.?|#|[:-]?)\s*([A-Z0-9/\-_]{3,24})/i,
    // Extrato de Conta número sequencial: Extracto 005/2026
    /(?:extrato|extracto)\s*[-:]?\s*(\d{3}\/\d{4})\b/i,
    // Extrato de Conta nº 12345
    /(?:extrato|extracto)\s*(?:n[ºo.]?|de\s*conta\s*n[ºo.]?)\s*([A-Z0-9/\-_]{3,24})/i,
    // Documento n.º 12345
    /(?:documento|doc\.?)\s*(?:n[ºo.]?|#)\s*([A-Z0-9/\-_]{3,24})/i,
  ];

  for (const regex of patterns) {
    const match = normalized.match(regex);
    if (match && match[1]) {
      const clean = match[1].replace(/\s+/g, " ").trim();
      // Não aceitar apenas números pequenos ou datas
      if (clean.length >= 3 && !/^\d{4}$/.test(clean)) {
        return clean;
      }
    }
  }

  return "";
}

/**
 * Extrai NIF / NIPC português (9 dígitos com validação de formato fiscal)
 */
export function extractNif(text) {
  if (!text) return "";
  const normalized = normalizeText(text);

  // Procura por NIF rotulado explicitamente (incluindo N.I.F. com pontos)
  const labeled = normalized.match(/(?:n\.?i\.?f\.?|nipc|contribuinte|vat|cif|n\.?[ºo]?\s*de\s*identifica[cç][aã]o\s*fiscal)[\s:.]*([A-Z]{2})?\s*([1235689]\d{8})\b/i);
  if (labeled && labeled[2]) {
    return labeled[2];
  }

  // Procura padrão PT + 9 dígitos
  const ptNif = normalized.match(/\bPT\s*([1235689]\d{8})\b/i);
  if (ptNif && ptNif[1]) {
    return ptNif[1];
  }

  return "";
}

/**
 * Extrai o nome da Entidade (Empresa / Fornecedor / Organismo)
 */
export function extractEntity(text) {
  if (!text) return "";
  const normalized = normalizeText(text);

  // 1. Procura correspondência por NIF conhecido no texto do documento
  for (const item of KNOWN_ENTITIES) {
    if (item.nifs && item.nifs.some((nif) => normalized.includes(nif))) {
      return item.name;
    }
  }

  // 2. Catálogo de entidades conhecidas (por padrões textuais contextuais)
  for (const item of KNOWN_ENTITIES) {
    if (item.pattern.test(normalized)) {
      return item.name;
    }
  }

  // 3. Procura sufixos de empresas em Portugal (LDA, UNIPESSOAL, S.A., etc.)
  const companyMatch = normalized.match(
    /\b([A-ZÁÀÃÂÉÊÍÓÔÕÚÜ][\w&.-]+(?:\s+[A-ZÁÀÃÂÉÊÍÓÔÕÚÜ][\w&.-]+){0,5})\s+(?:Lda\.?|Limitada|S\.?A\.?|SA|Unipessoal\s+Lda\.?|Unipessoal|Sociedade\s+Unipessoal|E\.?I\.?R\.?L\.?|SGPS)\b/i
  );
  if (companyMatch && companyMatch[1]) {
    const name = companyMatch[1].trim();
    if (name.length > 2 && !/^(?:O|A|Os|As|De|Do|Da|Em|Por|Para|Nos|Nas|Pelo|Pela|Com|Sem)$/i.test(name)) {
      return name;
    }
  }

  // 4. Procura cabeçalho com fornecedor / prestador
  const supplierMatch = normalized.match(/(?:fornecedor|prestador|emitente|cedente)\s*[:-]\s*([A-ZÁÀÃÂÉÊÍÓÔÕÚÜ\w\s&.-]{3,45})/i);
  if (supplierMatch && supplierMatch[1]) {
    return supplierMatch[1].trim();
  }

  return "";
}

/**
 * Extrai a data do documento (dia/mês/ano) e calcula o ano principal com alta precisão
 */
export function extractDocumentDate(text) {
  if (!text) return { dateStr: "", year: String(new Date().getFullYear()), month: "" };
  const normalized = normalizeText(text);

  // 1. Procurar PRIMEIRO datas explicitamente rotuladas (têm máxima fiabilidade)
  // Ex: "Data: 10/09/2026", "Data: 2026-08-28", "Data de emissão: 2026-08-28", "Emitida em 2026-08-28",
  // "Data Hora 04-09-26", "Data: 26-09-10", "Fatura FT ... de 05/09/2026"
  const labeledPatterns = [
    // Data rotulada com AAAA-MM-DD ou AAAA/MM/DD
    /(?:data(?:\s*de\s*emiss[aã]o|\s*do\s*documento|\s*hora)?|emitid[ao]\s*em)\s*[:-]?\s*(20[12]\d)[/\-.](0?[1-9]|1[0-2])[/\-.](0?[1-9]|[12]\d|3[01])\b/i,
    // Data rotulada com DD-MM-AAAA ou DD/MM/AAAA
    /(?:data(?:\s*de\s*emiss[aã]o|\s*do\s*documento|\s*hora)?|emitid[ao]\s*em)\s*[:-]?\s*(0?[1-9]|[12]\d|3[01])[/\-.](0?[1-9]|1[0-2])[/\-.](20[12]\d)\b/i,
    // Data rotulada com ano a 2 dígitos: DD-MM-YY (ex: 04-09-26)
    /(?:data(?:\s*de\s*emiss[aã]o|\s*do\s*documento|\s*hora)?|emitid[ao]\s*em)\s*[:-]?\s*(0?[1-9]|[12]\d|3[01])[/\-.](0?[1-9]|1[0-2])[/\-.](2[0-9])\b/i,
    // Data rotulada com ano a 2 dígitos: YY-MM-DD (ex: 26-09-10)
    /(?:data(?:\s*de\s*emiss[aã]o|\s*do\s*documento|\s*hora)?|emitid[ao]\s*em)\s*[:-]?\s*(2[0-9])[/\-.](0?[1-9]|1[0-2])[/\-.](0?[1-9]|[12]\d|3[01])\b/i,
    // Fatura / Factura ... de DD/MM/AAAA
    /(?:fatura|factura|documento|estadia\s*de)\s*[^;\n\r]{0,35}?\s*de\s*(0?[1-9]|[12]\d|3[01])[/\-.](0?[1-9]|1[0-2])[/\-.](20[12]\d)\b/i,
  ];

  for (const regex of labeledPatterns) {
    const m = normalized.match(regex);
    if (m) {
      let d; let mo; let y;
      if (m[1].length === 4) {
        y = m[1]; mo = m[2].padStart(2, "0"); d = m[3].padStart(2, "0");
      } else if (m[3].length === 4) {
        d = m[1].padStart(2, "0"); mo = m[2].padStart(2, "0"); y = m[3];
      } else if (m[1].length === 2 && Number(m[1]) >= 20 && Number(m[1]) <= 35) {
        y = `20${m[1]}`; mo = m[2].padStart(2, "0"); d = m[3].padStart(2, "0");
      } else if (m[3].length === 2 && Number(m[3]) >= 20 && Number(m[3]) <= 35) {
        d = m[1].padStart(2, "0"); mo = m[2].padStart(2, "0"); y = `20${m[3]}`;
      }
      if (y && mo && d) return { dateStr: `${y}-${mo}-${d}`, year: y, month: mo };
    }
  }

  // 2. Limpar menções a leis fiscais, decretos, portarias e certificados que induzem em erro anos passados (ex: Decreto-Lei 152-D/2017)
  const cleanedText = normalized
    .replace(/\b(?:decreto(?:[- ]lei)?|lei|portaria)\s*(?:n[ºo.]?)?\s*[\w\-/]+(?:\s*de\s*\d{1,2}\/\d{1,2})?/gi, " ")
    .replace(/\b(?:certificado|programa\s*certificado)\s*(?:n[ºo.]?)?\s*[\w\-/]+/gi, " ")
    .replace(/\b(?:art(?:igo)?\.?\s*\d+[^.,\n\r]*)/gi, " ")
    .replace(/\b(?:capital\s*social)\s*[:.]?\s*[\d.,]+/gi, " ");

  // 3. Data não rotulada formato AAAA/MM/DD ou AAAA-MM-DD
  const ymdMatch = cleanedText.match(/\b(20[12]\d)[/\-.](0?[1-9]|1[0-2])[/\-.](0?[1-9]|[12]\d|3[01])\b/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = ymdMatch[2].padStart(2, "0");
    const day = ymdMatch[3].padStart(2, "0");
    return { dateStr: `${year}-${month}-${day}`, year, month };
  }

  // 4. Data não rotulada formato DD/MM/AAAA ou DD-MM-AAAA
  const dmyMatch = cleanedText.match(/\b(0?[1-9]|[12]\d|3[01])[/\-.](0?[1-9]|1[0-2])[/\-.](20[12]\d)\b/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, "0");
    const month = dmyMatch[2].padStart(2, "0");
    const year = dmyMatch[3];
    return { dateStr: `${year}-${month}-${day}`, year, month };
  }

  // 5. Data por extenso em Português: "15 de março de 2026"
  const textMonthMatch = cleanedText.match(/\b(0?[1-9]|[12]\d|3[01])\s+de\s+(janeiro|fevereiro|março|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\s+(?:de\s+)?(20[12]\d)\b/i);
  if (textMonthMatch) {
    const months = {
      janeiro: "01", fevereiro: "02", março: "03", marco: "03", abril: "04",
      maio: "05", junho: "06", julho: "07", agosto: "08", setembro: "09",
      outubro: "10", novembro: "11", dezembro: "12",
    };
    const day = textMonthMatch[1].padStart(2, "0");
    const month = months[textMonthMatch[2].toLowerCase()] || "01";
    const year = textMonthMatch[3];
    return { dateStr: `${year}-${month}-${day}`, year, month };
  }

  // 6. Data com ano de 2 dígitos não rotulada: YY-MM-DD ou DD-MM-YY (onde YY >= 20 e <= 35)
  const yymmddMatch = cleanedText.match(/\b(2[0-9])[/\-.](0?[1-9]|1[0-2])[/\-.](0?[1-9]|[12]\d|3[01])\b/);
  if (yymmddMatch) {
    const year = `20${yymmddMatch[1]}`;
    const month = yymmddMatch[2].padStart(2, "0");
    const day = yymmddMatch[3].padStart(2, "0");
    return { dateStr: `${year}-${month}-${day}`, year, month };
  }
  const ddmmyyMatch = cleanedText.match(/\b(0?[1-9]|[12]\d|3[01])[/\-.](0?[1-9]|1[0-2])[/\-.](2[0-9])\b/);
  if (ddmmyyMatch) {
    const day = ddmmyyMatch[1].padStart(2, "0");
    const month = ddmmyyMatch[2].padStart(2, "0");
    const year = `20${ddmmyyMatch[3]}`;
    return { dateStr: `${year}-${month}-${day}`, year, month };
  }

  // 7. Mês e Ano de Processamento: "Mês: 02/2026", "Período: 2026-03"
  const monthYearMatch = cleanedText.match(/(?:m[eê]s|per[ií]odo|vencimento|refer[eê]ncia)\s*[:-]?\s*(0?[1-9]|1[0-2])[/\-.](20[12]\d)\b/i);
  if (monthYearMatch) {
    const month = monthYearMatch[1].padStart(2, "0");
    const year = monthYearMatch[2];
    return { dateStr: `${year}-${month}`, year, month };
  }

  // 8. Fallback seguro de ano (procura anos contemporâneos 202X primeiro)
  const recentYearMatch = cleanedText.match(/\b(202[0-9])\b/);
  if (recentYearMatch) {
    return { dateStr: "", year: recentYearMatch[1], month: "" };
  }

  const anyYearMatch = cleanedText.match(/\b(20[12]\d)\b/);
  if (anyYearMatch) {
    return { dateStr: "", year: anyYearMatch[1], month: "" };
  }

  return { dateStr: "", year: String(new Date().getFullYear()), month: "" };
}

/**
 * Classifica a categoria do documento com pontuação ponderada
 */
export function classifyCategory(text, fileName = "") {
  const source = `${fileName} ${text}`.toLowerCase();

  let scores = {
    "Faturas": 0,
    "Vencimentos": 0,
    "Extratos bancários": 0,
    "Gastos": 0,
    "Contratos": 0,
    "Guias": 0,
    "Impostos / Estado": 0,
  };

  // Pontuação Faturas
  if (/(?:fatura|factura|invoice|ft\s*\d|fs\s*\d|nc\s*\d|iva\s*a\s*\d+%)/i.test(source)) scores["Faturas"] += 5;
  if (/(?:total\s*(?:a\s*pagar|do\s*documento|fatura)|incidência|taxa\s*iva|valor\s*tribut[aá]vel)/i.test(source)) scores["Faturas"] += 4;
  if (/(?:cliente\s*n[ºo.]?|nif|nipc|contribuinte)/i.test(source)) scores["Faturas"] += 2;

  // Pontuação Vencimentos / Salários
  if (/(?:recibo\s*de\s*vencimento|folha\s*(?:salarial|de\s*vencimento)|processamento\s*salarial|demonstra[cç][aã]o\s*de\s*remunera[cç][oõ]es)/i.test(source)) scores["Vencimentos"] += 8;
  if (/(?:vencimento\s*base|subs[ií]dio\s*de\s*alimenta[cç][aã]o|reten[cç][aã]o\s*irs|seguran[cç]a\s*social\s*11%|tsu)/i.test(source)) scores["Vencimentos"] += 6;
  if (/(?:remunera[cç][aã]o|sal[aá]rio\s*base|dias\s*trabalhados|vencimento\s*l[ií]quido)/i.test(source)) scores["Vencimentos"] += 4;

  // Pontuação Extratos Bancários
  if (/(?:extrato|extracto)\s*(?:de\s*conta|banc[aá]rio|combinado|mensal|do\s*cart[aã]o)|posi[cç][aã]o\s*integrada/i.test(source)) scores["Extratos bancários"] += 9;
  if (/(?:saldo\s*(?:inicial|final|dispon[ií]vel|autorizado|utilizado)|movimentos\s*(?:da\s*conta|do\s*m[eê]s)|data\s*valor|iban|bic\/swift)/i.test(source)) scores["Extratos bancários"] += 5;
  if (/\b(?:bpi|cgd|santander|millennium|novo\s*banco|montepio|activobank|banco)\b/i.test(source) && /(?:conta|extrato|extracto)/i.test(source)) scores["Extratos bancários"] += 4;

  // Pontuação Guias
  if (/(?:guia\s*de\s*(?:remessa|transporte|devolu[cç][aã]o|movimenta[cç][aã]o)|c[oó]digo\s*at\s*da\s*guia)/i.test(source)) scores["Guias"] += 8;

  // Pontuação Impostos / Estado
  if (/(?:documento\s*[uú]nico\s*de\s*cobran[cç]a|duc\b|autoridade\s*tribut[aá]ria|declara[cç][aã]o\s*peri[oó]dica|modelo\s*22|ies\b)/i.test(source)) scores["Impostos / Estado"] += 8;

  // Pontuação Gastos / Talões
  if (/(?:tal[aã]o\s*de\s*compra|simplificada|via\s*verde|combust[ií]vel|despesa|parqu[ií]metro|portagem)/i.test(source)) scores["Gastos"] += 5;

  // Pontuação Contratos
  if (/(?:contrato\s*de\s*trabalho|contrato\s*de\s*presta[cç][aã]o|primeiro\s*outorgante|segundo\s*outorgante|cl[aá]usula)/i.test(source)) scores["Contratos"] += 8;

  // Determinar vencedor
  let bestCategory = "Outros";
  let maxScore = 2; // threshold mínimo para não classificar com falso positivo

  for (const [cat, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      bestCategory = cat;
    }
  }

  return bestCategory;
}

/**
 * Deteta se a página é provavelmente uma folha em branco ou verso de digitalização vazio
 */
export function isBlankPage(text) {
  if (!text) return true;
  const clean = text.replace(/[^a-zA-Z0-9]/g, "");
  // Se tiver menos de 10 caracteres alfanuméricos, é praticamente em branco / lixo de scanner
  return clean.length < 10;
}

/**
 * Sinais fortes de que a página é a continuação direta da página anterior
 */
export function hasContinuationSignals(currentPage, previousPage) {
  if (!currentPage || !previousPage) return false;

  const currentText = currentPage.text || "";
  const prevText = previousPage.text || "";

  // Se a página anterior atingiu o total de páginas (ex: 2 de 2), o documento anterior TERMINOU!
  const prevNum = extractPageNumbering(prevText);
  if (prevNum && prevNum.total && prevNum.current >= prevNum.total) {
    return false;
  }

  // Se a página atual diz explicitamente que é a Página 1, NUNCA é continuação!
  const currentNum = extractPageNumbering(currentText);
  if (currentNum && currentNum.isFirst) {
    return false;
  }

  // Se ambos têm número de documento e são DIFERENTES, NUNCA é continuação!
  const currentDocNum = extractDocumentNumber(currentText);
  const prevDocNum = extractDocumentNumber(prevText);
  if (currentDocNum && prevDocNum && currentDocNum.toLowerCase() !== prevDocNum.toLowerCase()) {
    return false;
  }

  // Se ambos têm número de conta bancária e são DIFERENTES, NUNCA é continuação!
  const currentAccount = extractBankAccount(currentText);
  const prevAccount = extractBankAccount(prevText);
  if (currentAccount && prevAccount && currentAccount !== prevAccount) {
    return false;
  }

  // Se ambos têm NIF emissor e são DIFERENTES, NUNCA é continuação!
  const currentNif = extractNif(currentText);
  const prevNif = extractNif(prevText);
  if (currentNif && prevNif && currentNif !== prevNif) {
    return false;
  }

  // 1. Paginação explícita: "Página 2 de X", "3/4", "Pág. 2/2"
  if (currentNum && currentNum.isContinuation) {
    return true; // Continuação clara: Página > 1
  }

  // 2. Mesmo número de fatura ou documento
  if (currentDocNum && prevDocNum && currentDocNum.toLowerCase() === prevDocNum.toLowerCase()) {
    return true; // Continuação exata do mesmo documento!
  }

  // 3. Mesma conta bancária com sequência de extrato
  if (currentAccount && prevAccount && currentAccount === prevAccount && !extractDocumentNumber(currentText)) {
    return true;
  }

  // 4. Termos contabilísticos de transporte para a próxima página (na anterior)
  // Ex: "A transportar...", "Continua...", "Continua na página seguinte"
  if (/\b(?:a\s*transportar|continua\b|continua\s*na\s*p[aá]gina|segue\b)\b/i.test(prevText)) {
    return true;
  }

  // 5. Termos de continuação na PRÓPRIA página atual
  // Ex: "Continuação da fatura...", "Transporte", "Subtotal anterior"
  if (/\b(?:continua[cç][aã]o|transporte|de\s*transporte|subtotal\s*anterior|vem\s*de\s*tr[aá]s)\b/i.test(currentText)) {
    return true;
  }

  return false;
}

/**
 * Sinais fortes de que a página é o INÍCIO de um novo documento
 */
export function hasNewDocumentSignals(currentPage, previousPage) {
  if (!currentPage) return false;
  if (!previousPage) return true;

  const currentText = currentPage.text || "";
  const prevText = previousPage.text || "";

  // 1. Paginação explícita: "Página 1 de X", "Page 1 of Y", "1 / 4", "Original - Pág. 1/1"
  const currentNum = extractPageNumbering(currentText);
  if (currentNum && currentNum.isFirst) {
    return true; // Início inequívoco de documento
  }

  // 2. Mudança explícita de número de documento (ex: FT, FAC, VFAT, Extracto 005 vs 006)
  const currentDocNum = extractDocumentNumber(currentText);
  const prevDocNum = extractDocumentNumber(prevText);
  if (currentDocNum && prevDocNum && currentDocNum.toLowerCase() !== prevDocNum.toLowerCase()) {
    return true;
  }

  // 3. Mudança explícita de conta bancária (ex: 4-4698307 vs 5-4081335)
  const currentAccount = extractBankAccount(currentText);
  const prevAccount = extractBankAccount(prevText);
  if (currentAccount && prevAccount && currentAccount !== prevAccount) {
    return true;
  }

  // 4. Mudança explícita de NIF do emissor ou cliente
  const currentNif = extractNif(currentText);
  const prevNif = extractNif(prevText);
  if (currentNif && prevNif && currentNif !== prevNif) {
    return true;
  }

  // 5. Mudança de Entidade reconhecida com certeza (ex: Factor Triplo vs Geoflicks vs Makro)
  const currentEntity = extractEntity(currentText);
  const prevEntity = extractEntity(prevText);
  if (currentEntity && prevEntity && currentEntity.toLowerCase() !== prevEntity.toLowerCase()) {
    return true;
  }

  // 6. Cabeçalho de Extrato Bancário
  // Um extrato bancário inicia sempre um novo documento a menos que haja sinal claro de continuação (ex: Pág 2/2)
  const isBankCurrent = /(?:extrato|extracto)\s*(?:de\s*conta|banc[aá]rio|do\s*cart[aã]o)|posi[cç][aã]o\s*integrada/i.test(currentText);
  if (isBankCurrent && (!currentNum || currentNum.isFirst)) {
    if (!hasContinuationSignals(currentPage, previousPage)) {
      return true;
    }
  }

  // 7. Cabeçalho de Fatura / Factura
  const hasInvoiceHeader = /\b(?:fatura|factura|invoice|resumo\s*da\s*fatura|fatura-recibo)\b/i.test(currentText)
    && /\b(?:n[ºo.]?|total|iva|cliente|data|contribuinte|venda|makro|endesa|top[aá]zio|vfat|fac)\b/i.test(currentText);
  if (hasInvoiceHeader && (!currentNum || currentNum.isFirst)) {
    return true;
  }

  return false;
}

/**
 * Decide com alta precisão se uma página deve iniciar um novo documento
 */
export function shouldBreakPage(currentPage, previousPage, pageIndex, isNewFile = false) {
  // A primeira página do primeiro ficheiro é sempre quebra
  if (pageIndex === 0) return true;

  // Se mudou de ficheiro original importado, é quebra por defeito
  if (isNewFile) return true;

  // 1. Sinais explícitos de novo documento (mudança de entidade, número de doc, nova conta bancária ou cabeçalho novo)
  if (hasNewDocumentSignals(currentPage, previousPage)) {
    return true; // QUEBRA!
  }

  // 2. Verificar primeiro se há sinal INEQUÍVOCO de continuação (Pág. 2, mesmo docNum, transporte)
  if (hasContinuationSignals(currentPage, previousPage)) {
    return false; // NÃO QUEBRA! Pertence ao documento anterior.
  }

  // 3. Se a página anterior previa mais páginas (ex: "Página 1 de 3") E a atual é o número seguinte
  const prevNum = extractPageNumbering(previousPage?.text || "");
  if (prevNum && prevNum.total && prevNum.current < prevNum.total) {
    const currentNum = extractPageNumbering(currentPage?.text || "");
    if (currentNum && currentNum.current === prevNum.current + 1) {
      return false; // Continuação confirmada
    }
  }

  // 4. Mudança de Categoria estrutural
  const currentCat = classifyCategory(currentPage?.text || "");
  const prevCat = classifyCategory(previousPage?.text || "");
  if (currentCat !== prevCat) {
    if (currentCat !== "Outros" || prevCat !== "Outros") {
      return true;
    }
  }

  // 5. Fallback seguro: se não temos razão forte para quebrar, mantém junto para evitar fatiar faturas
  return false;
}

/**
 * Gera um nome limpo e normalizado para o documento PDF
 * Ex: Fatura_Makro_FT2024-104_2024-03-15.pdf
 */
export function generateSmartFilename({ category, entity, docNumber, dateStr, year, person, fallbackTitle = "Documento" }) {
  const parts = [];

  // 1. Categoria limpa
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
  const catLabel = catMap[category] || "Documento";
  parts.push(catLabel);

  // 2. Entidade ou Pessoa
  const namePart = (entity || person || "").trim().replace(/[\\/:*?"<>|\s]+/g, "_");
  if (namePart) {
    parts.push(namePart);
  }

  // 3. Número de Documento (se existir)
  if (docNumber) {
    const cleanDocNum = docNumber.replace(/[\\/:*?"<>|\s]+/g, "-");
    parts.push(cleanDocNum);
  }

  // 4. Data ou Ano
  if (dateStr) {
    parts.push(dateStr);
  } else if (year) {
    parts.push(year);
  }

  const filename = parts.length > 1 ? parts.join("_") : (fallbackTitle || "Documento");
  return filename.slice(0, 70);
}

/**
 * Analisa e extrai metadados completos de um conjunto de páginas que formam um documento
 */
export function extractGroupMetadata(pages, fallbackFileName = "") {
  if (!pages || !pages.length) {
    return {
      category: "Outros",
      year: String(new Date().getFullYear()),
      entity: "",
      person: "",
      docNumber: "",
      dateStr: "",
      filename: "Documento",
      isBlank: false,
    };
  }

  // Concatenar texto das primeiras páginas (onde costumam estar os cabeçalhos fiscais)
  const headerText = pages.slice(0, 2).map((p) => p.text || "").join(" ");
  const fullText = pages.map((p) => p.text || "").join(" ");

  const category = classifyCategory(headerText || fullText, fallbackFileName);
  const { dateStr, year } = extractDocumentDate(headerText || fullText);
  const entity = extractEntity(headerText || fullText);
  const docNumber = extractDocumentNumber(headerText || fullText);
  const nif = extractNif(headerText || fullText);

  // Se for recibo de vencimento, tentar extrair nome do funcionário
  let person = "";
  if (category === "Vencimentos") {
    const personMatch = fullText.match(/(?:nome|colaborador|trabalhador|funcion[aá]rio)\s*[:-]\s*([A-Za-zÀ-ÿ]+(?:\s+[A-Za-zÀ-ÿ]+){1,3})/i);
    if (personMatch) {
      person = personMatch[1].replace(/\b(?:nif|nipc|contribuinte|vencimento|data|categoria|departamento|morada|c[oó]digo)\b.*$/i, "").trim();
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

  const isBlank = pages.every((p) => isBlankPage(p.text));

  return {
    category,
    year,
    entity: entity || person,
    person: person || entity,
    docNumber,
    nif,
    dateStr,
    filename,
    isBlank,
  };
}
