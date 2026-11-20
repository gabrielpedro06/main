// =====================================================================
// Índice do manual de utilizador (página Ajuda — src/pages/Ajuda.jsx).
// Para acrescentar uma área: criar <id>.js com o mesmo formato dos outros,
// importá-lo aqui e pô-lo em SECCOES_AJUDA (a ordem aqui é a ordem do menu).
// Ícones: o campo `icone` é o nome de um ícone lucide-react; tem de constar
// do mapa ICONES abaixo (importados um a um para não inchar o bundle).
// =====================================================================
import { createElement } from "react";
import {
  ArrowLeftRight, BookOpen, Briefcase, Building2, CalendarCheck, CalendarDays, Car, ClipboardList,
  FileStack, FileText, GraduationCap, History, House, ListChecks, Megaphone, MessagesSquare,
  Monitor, Palette, Rocket, Shield, Target, UserCog,
} from "lucide-react";

import inicio from "./inicio";
import agenda from "./agenda";
import comunicacao from "./comunicacao";
import ausencias from "./ausencias";
import pedidoKm from "./pedido-km";
import perfilConta from "./perfil-conta";
import projetos from "./projetos";
import tarefas from "./tarefas";
import modelos from "./modelos";
import entidades from "./entidades";
import programasAvisos from "./programas-avisos";
import propostas from "./propostas";
import formacao from "./formacao";
import leads from "./leads";
import marketing from "./marketing";
import transfergest from "./transfergest";
import recursosHumanos from "./recursos-humanos";
import ativosTi from "./ativos-ti";
import organizadorPdf from "./organizador-pdf";
import admin from "./admin";
import registos from "./registos";

/** Áreas do manual, pela ordem em que aparecem no menu da página Ajuda. */
export const SECCOES_AJUDA = [
  inicio, agenda, comunicacao, ausencias, pedidoKm, perfilConta,
  projetos, tarefas, modelos, entidades, programasAvisos, propostas, formacao,
  leads, marketing, transfergest,
  recursosHumanos, ativosTi, organizadorPdf,
  admin, registos,
];

/** Grupos da página inicial da Ajuda (ids das áreas). Áreas sem grupo vão para "Outros". */
export const GRUPOS_AJUDA = [
  { titulo: "O meu dia", ids: ["inicio", "agenda", "comunicacao", "ausencias", "pedido-km", "perfil-conta"] },
  { titulo: "Projetos e clientes", ids: ["projetos", "tarefas", "modelos", "entidades", "programas-avisos", "propostas", "formacao"] },
  { titulo: "Comercial e marketing", ids: ["leads", "marketing", "transfergest"] },
  { titulo: "Gestão e ferramentas", ids: ["recursos-humanos", "ativos-ti", "organizador-pdf", "admin", "registos"] },
];

const ICONES = {
  ArrowLeftRight, BookOpen, Briefcase, Building2, CalendarCheck, CalendarDays, Car, ClipboardList,
  FileStack, FileText, GraduationCap, History, House, ListChecks, Megaphone, MessagesSquare,
  Monitor, Palette, Rocket, Shield, Target, UserCog,
};

/** Ícone de uma área do manual: <IconeAjuda nome="Rocket" size={16} /> (BookOpen se não existir). */
export function IconeAjuda({ nome, ...props }) {
  return createElement(ICONES[nome] || BookOpen, props);
}

/**
 * Id da área do manual que corresponde a um caminho da app (a rota mais específica).
 * "/dashboard" (Início) só corresponde exatamente; a própria Ajuda não corresponde a nada.
 * Ex.: seccaoDaRota("/dashboard/projetos/123") → "projetos".
 */
export function seccaoDaRota(pathname) {
  const p = String(pathname || "").replace(/\/+$/, "") || "/";
  if (p.startsWith("/dashboard/ajuda")) return null;
  const candidatas = SECCOES_AJUDA.filter((s) => s.rota && (p === s.rota || (s.rota !== "/dashboard" && p.startsWith(s.rota + "/"))));
  candidatas.sort((a, b) => b.rota.length - a.rota.length);
  return candidatas[0]?.id || null;
}
