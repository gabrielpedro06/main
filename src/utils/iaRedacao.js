// Anonimização de texto OCR antes de o Organizador de PDFs o mandar para a IA
// (pages/OrganizadorPdf.jsx → api/organizador/ia.js). Só regex, corre no browser.
import { isValidNif } from "./pdfOrganizerEngine.js";

/**
 * Tapa dados pessoais no texto antes de o enviar para a IA.
 * Mantém o que é preciso para separar e classificar (NIF de empresas, valores, datas, nºs de documento).
 *
 * Tapa: NIF de pessoas singulares, NISS (e o nome que vem a seguir), IBAN, nºs de conta,
 * cartões, emails, telemóveis e nomes em transferências / listas de trabalhadores.
 *
 * A ordem das substituições importa (ex.: IBAN antes dos NIF, NISS antes dos NIF).
 * @param {string} texto
 * @returns {string} texto com marcadores [EMAIL], [IBAN], [NISS], [NIF], [NOME], [CONTA], [CARTAO], [TELEFONE]
 */
export function redigir(texto) {
  let t = String(texto || "");

  // Emails e IBAN
  t = t.replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[EMAIL]");
  t = t.replace(/\b[A-Z]{2}\d{2}(?:[ .]?[A-Z0-9]{4}){4,7}(?:[ .]?[A-Z0-9]{1,3})?\b/g, "[IBAN]");

  // NISS (11 dígitos, começa por 1 ou 2) + nome do trabalhador que vem a seguir na mesma linha
  t = t.replace(/(?<!\d)[12]\d{10}(?!\d)([ \t]+[A-ZÀ-Ý][\p{L}'.-]*(?:[ \t]+(?:d[aeo]s?|e|[A-ZÀ-Ý][\p{L}'.-]*))*)?/gu, (_, nome) => (nome ? "[NISS] [NOME]" : "[NISS]"));

  // NIF de pessoas (começa por 1, 2, 3 ou 45) — os das empresas ficam (são públicos e identificam o fornecedor)
  t = t.replace(/(?<![\d.,])(\d{9})(?![\d.,]\d)/g, (m) => (/^(?:[123]|45)/.test(m) && isValidNif(m) ? "[NIF]" : m));

  // Nºs de conta e cartões
  t = t.replace(/(n[ºo°.]?\s*(?:de\s*)?conta|conta)\s*[:.]?\s*[\d][\d.\- ]{6,}\d/gi, "$1 [CONTA]");
  t = t.replace(/\*{3,}\s*\d{2,6}(?:\s*\d{2})?/g, "[CARTAO]");
  t = t.replace(/\b\d{4}[ -]\d{4}[ -]\d{4}[ -]\d{4}\b/g, "[CARTAO]");

  // Telemóveis
  t = t.replace(/(?<![\d.,])(?:\+351\s?)?9[1236]\d(?:[ ]?\d{3}){2}(?![\d.,]\d)/g, (m) => {
    const digits = m.replace(/\D/g, "").slice(-9);
    // um NIF válido de empresa (ex.: 9xxxxxxxx) escrito sem espaços fica
    return /^\d{9}$/.test(m) && isValidNif(digits) ? m : "[TELEFONE]";
  });

  // Nomes em transferências do extrato ("TRF.IPS P/ MARTA ...", "TR-IPS-MANUEL ...")
  t = t.replace(/(P\/|TR-IPS-|\bTRF\.?\s)[ \t]*[A-ZÀ-Ý][A-ZÀ-Ý.']*(?:[ \t]+(?:\(|[A-ZÀ-Ý][A-ZÀ-Ý.']*))*/g, (m, pre) => `${pre.trim()} [NOME]`);

  // Linhas "Nome do trabalhador / Titular: Fulano" (pessoas)
  t = t.replace(/(nome\s*do\s*trabalhador|trabalhador|funcion[aá]rio|colaborador)\s*:?\s+[A-ZÀ-Ý][\p{L}'.-]*(?:\s+(?:d[aeo]s?|e|[A-ZÀ-Ý][\p{L}'.-]*))*/giu, "$1 [NOME]");

  return t;
}
