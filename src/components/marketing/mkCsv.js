// Importação de personas a partir do CSV exportado do Notion ("Buyer Personas")
import { CANAIS } from "../../constants/marketing";
import { norm } from "./mkUtils";

/** CSV → array de linhas (suporta aspas, vírgulas e quebras de linha dentro de aspas, BOM, ; ou ,) */
export function lerCsv(texto) {
  const t = String(texto || "").replace(new RegExp("^\\uFEFF"), "");
  const primeira = t.split(/\r?\n/, 1)[0] || "";
  const sep = (primeira.match(/;/g) || []).length > (primeira.match(/,/g) || []).length ? ";" : ",";
  const linhas = [];
  let linha = [];
  let campo = "";
  let aspas = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (aspas) {
      if (c === '"') {
        if (t[i + 1] === '"') { campo += '"'; i++; } else aspas = false;
      } else campo += c;
    } else if (c === '"') aspas = true;
    else if (c === sep) { linha.push(campo); campo = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && t[i + 1] === "\n") i++;
      linha.push(campo); campo = "";
      if (linha.some((x) => x.trim() !== "")) linhas.push(linha);
      linha = [];
    } else campo += c;
  }
  linha.push(campo);
  if (linha.some((x) => x.trim() !== "")) linhas.push(linha);
  return linhas;
}

const lista = (v) => String(v || "").split(/\s*,\s*/).map((s) => s.trim()).filter(Boolean);
const limparFrase = (v) => String(v || "").trim().replace(/^["“”«]+|["“”»]+$/g, "").trim();

const CANAL_ALIAS = { email: "E-mail", "e-mail": "E-mail", mail: "E-mail", site: "Website", web: "Website", "linked in": "LinkedIn" };
function canal(v) {
  const n = norm(v).trim();
  const c = CANAIS.find((x) => norm(x.id) === n);
  return c ? c.id : CANAL_ALIAS[n] || v.trim();
}

/** Coluna do CSV → campo da persona (nomes do Notion, sem acentos/maiúsculas) */
const MAPA = {
  nome: ["papel", "txt"],
  papel: ["papel", "txt"],
  "nome persona": ["nome_persona", "txt"],
  persona: ["nome_persona", "txt"],
  "faixa etaria": ["faixa_etaria", "txt"],
  idade: ["faixa_etaria", "txt"],
  genero: ["genero", "txt"],
  localizacao: ["localizacao", "lista"],
  ocupacao: ["ocupacao", "txt"],
  "rendimento mensal": ["rendimento", "txt"],
  rendimento: ["rendimento", "txt"],
  "canais preferidos": ["canais", "canais"],
  canais: ["canais", "canais"],
  comportamento: ["comportamento", "lista"],
  desafios: ["desafios", "lista"],
  necessidades: ["necessidades", "lista"],
  objetivos: ["objetivos", "lista"],
  solucoes: ["solucoes", "lista"],
  frases: ["frase", "frase"],
  frase: ["frase", "frase"],
};

/**
 * Converte o texto de um CSV de personas em objetos prontos a gravar.
 * Devolve { personas, ignoradas: [nomes de colunas não reconhecidas] } ou lança erro.
 */
export function personasDoCsv(texto) {
  const linhas = lerCsv(texto);
  if (linhas.length < 2) throw new Error("O ficheiro está vazio ou só tem cabeçalho.");
  const cab = linhas[0].map((h) => norm(h).replace(/[^\p{L}\p{N} ]/gu, "").replace(/\s+/g, " ").trim());
  const mapa = cab.map((h) => MAPA[h] || null);
  if (!mapa.some((m) => m && (m[0] === "papel" || m[0] === "nome_persona"))) {
    throw new Error("Não encontrei as colunas \"Nome\" ou \"Nome Persona\". É o export da base de personas do Notion?");
  }
  const ignoradas = linhas[0].filter((_, i) => !mapa[i] && linhas[0][i].trim());
  const personas = linhas.slice(1).map((l) => {
    const p = { localizacao: [], canais: [], comportamento: [], desafios: [], necessidades: [], objetivos: [], solucoes: [] };
    mapa.forEach((m, i) => {
      if (!m) return;
      const v = l[i] ?? "";
      const [campo, tipo] = m;
      if (tipo === "lista") p[campo] = lista(v);
      else if (tipo === "canais") p[campo] = [...new Set(lista(v).map(canal))];
      else if (tipo === "frase") p[campo] = limparFrase(v) || null;
      else if (!p[campo]) p[campo] = v.trim() || null;
    });
    p.papel = p.papel || "";
    p.nome_persona = p.nome_persona || "";
    return p;
  }).filter((p) => p.papel || p.nome_persona);
  return { personas, ignoradas };
}
