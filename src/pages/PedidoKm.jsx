// =====================================================================
// Pedidos de Km's / deslocações (rota /dashboard/pedido-km).
// Reutiliza a página de ausências com o tipo fixo "Pedido de Km's": os pedidos
// vivem também na tabela `ferias` (km_origem, km_destino, km_total, veiculo,
// km_ida_volta) e seguem o mesmo fluxo pendente → aprovado/rejeitado pelos RH.
// =====================================================================
import Ausencias from "./Ausencias";

export default function PedidoKm() {
	return <Ausencias forcedType="Pedido de Km's" />;
}

