import { supabase } from "../services/supabase";
import { createDashboardNotifications } from "./dashboardNotifications";
import {
  buildToleranciasSkipSet,
  calcularDiasUteis,
  formatAbsenceTypeLabel,
  getAnnualVacationLimitFromProfile,
  isVacationType,
  obterToleranciasAtivas,
  parseLocalDate,
  sincronizarSaldoFeriasPerfil,
  validarSaldoFeriasParaIntervalo,
} from "./feriasSaldo";

// =====================================================================
// Decidir um pedido de ausência (aprovar / rejeitar / tratar cancelamento).
// Mesmas regras do painel de RH: valida o saldo de férias antes de aprovar,
// avisa o colaborador e sincroniza o saldo anual. A base de dados (migração 068)
// continua a garantir que só os RH podem mudar o estado.
// =====================================================================

export const KM_REQUEST_TYPE = "Pedido de Km's";

/** Ações possíveis por estado atual do pedido. */
export const ACOES = {
  aprovar: { de: "pendente", para: "aprovado" },
  rejeitar: { de: "pendente", para: "rejeitado" },
  aceitar_cancelamento: { de: "pedido_cancelamento", para: "cancelado" },
  recusar_cancelamento: { de: "pedido_cancelamento", para: "aprovado" },
};

export const ehPedidoKm = (pedido) => pedido?.tipo === KM_REQUEST_TYPE;

/** Dias (ou fração, se for parcial) que o pedido ocupa. */
export function diasDoPedido(pedido, tolerancias = []) {
  if (!pedido?.data_inicio) return 0;
  if (pedido.is_parcial && pedido.hora_inicio && pedido.hora_fim) {
    const [hI, mI] = pedido.hora_inicio.split(":").map(Number);
    const [hF, mF] = pedido.hora_fim.split(":").map(Number);
    const horas = (hF - hI) + (mF - mI) / 60;
    return horas > 0 ? horas / 8 : 0;
  }
  const skip = buildToleranciasSkipSet(tolerancias, pedido.user_id || null);
  return calcularDiasUteis(pedido.data_inicio, pedido.data_fim || pedido.data_inicio, skip);
}

async function avisarColaborador(pedido, novoEstado, acao, autorId) {
  if (!pedido?.user_id) return;
  const tipo = formatAbsenceTypeLabel(pedido.tipo);
  const data = pedido.data_inicio ? new Date(pedido.data_inicio).toLocaleDateString("pt-PT") : "";
  const recusaCancelamento = acao === "recusar_cancelamento";
  const estadoLabel = novoEstado === "aprovado" ? "aprovado" : novoEstado === "rejeitado" ? "recusado" : "cancelado";
  try {
    await createDashboardNotifications({
      supabaseClient: supabase,
      recipientIds: [pedido.user_id],
      createdBy: autorId,
      type: "absence_status_changed",
      title: recusaCancelamento ? "Pedido de cancelamento recusado" : `Pedido de ausência ${estadoLabel}`,
      message: recusaCancelamento
        ? `O pedido de cancelamento do seu pedido de ${tipo} de ${data} foi recusado. O pedido original mantém-se aprovado.`
        : `O seu pedido de ${tipo} de ${data} foi ${estadoLabel}.`,
    });
  } catch (err) {
    console.error("Erro ao notificar o colaborador:", err);
  }
}

/**
 * Executa a decisão. Devolve o novo estado; lança erro com mensagem legível.
 * `perfil` = perfil do dono do pedido (dias_ferias_total, dias_ferias, data_admissao).
 */
export async function decidirPedido({ pedido, acao, perfil, autorId }) {
  const regra = ACOES[acao];
  if (!regra) throw new Error("Ação desconhecida.");
  if (pedido.estado !== regra.de) throw new Error("Este pedido já foi tratado entretanto.");

  const km = ehPedidoKm(pedido);
  const ferias = !km && isVacationType(pedido.tipo);
  const tolerancias = ferias && pedido.user_id
    ? await obterToleranciasAtivas({ supabaseClient: supabase, userId: pedido.user_id })
    : [];
  const diasLimiteAnual = getAnnualVacationLimitFromProfile(perfil);

  if (acao === "aprovar" && ferias && diasDoPedido(pedido, tolerancias) > 0) {
    const saldo = await validarSaldoFeriasParaIntervalo({
      supabaseClient: supabase,
      userId: pedido.user_id,
      dataInicio: pedido.data_inicio,
      dataFim: pedido.data_fim || pedido.data_inicio,
      is_parcial: pedido.is_parcial,
      hora_inicio: pedido.hora_inicio,
      hora_fim: pedido.hora_fim,
      excluirPedidoId: pedido.id,
      diasLimiteAnual,
      dataAdmissao: perfil?.data_admissao,
      tolerancias,
    });
    if (!saldo.ok) {
      throw new Error(`Saldo insuficiente para ${saldo.ano}: pedido de ${fmtDias(saldo.diasPedidoNoAno)}, disponível ${fmtDias(saldo.diasDisponiveis)}.`);
    }
  }

  // Só muda se o estado continuar o mesmo (evita decidir duas vezes em simultâneo)
  const { data: alterados, error } = await supabase
    .from("ferias")
    .update({ estado: regra.para })
    .eq("id", pedido.id)
    .eq("estado", regra.de)
    .select("id");
  if (error) throw new Error(error.message || "Não foi possível atualizar o pedido.");
  if (!alterados?.length) throw new Error("Este pedido já foi tratado entretanto (ou não tem permissão).");

  await avisarColaborador(pedido, regra.para, acao, autorId);

  if (!km && pedido.user_id) {
    const ano = parseLocalDate(pedido.data_inicio)?.getFullYear() || new Date().getFullYear();
    try {
      await sincronizarSaldoFeriasPerfil({ supabaseClient: supabase, userId: pedido.user_id, ano, diasLimiteAnual });
    } catch (err) {
      console.error("Erro ao sincronizar o saldo de férias:", err);
      throw new Error("O pedido foi atualizado, mas o saldo de férias não sincronizou. Abra o painel de RH para o corrigir.");
    }
  }
  return regra.para;
}

export function fmtDias(n) {
  const v = Number(n) || 0;
  const txt = Number.isInteger(v) ? String(v) : v.toFixed(2).replace(/0+$/, "").replace(".", ",");
  return `${txt} ${v === 1 ? "dia" : "dias"}`;
}
