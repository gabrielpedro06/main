// Ponte dos avisos antigos das páginas para os avisos globais (utils/toast.js + ToastGlobal).
//   {notification && <AvisoToast tipo={notification.type} mensagem={notification.message} />}
// Já não desenha nada: quando aparece (ou muda de mensagem) envia o aviso para a pilha
// global, que é a mesma dos avisos com Desfazer (em baixo, arrastar para fechar, etc.).
// Assim as ~12 páginas que ainda usam o estado `notification` passaram todas para o
// sistema novo sem mudar cada uma. Código novo deve chamar toast() diretamente.
import { useEffect } from "react";
import { toast } from "../utils/toast";

const TIPOS = { success: "sucesso", error: "erro", warning: "aviso", info: "info" };

/**
 * @param {object} props
 * @param {"success"|"error"|"warning"|"info"} [props.tipo="info"]
 * @param {React.ReactNode} props.mensagem
 */
export default function AvisoToast({ tipo = "info", mensagem }) {
  useEffect(() => {
    if (mensagem == null || mensagem === "") return;
    toast(mensagem, { tipo: TIPOS[tipo] || "info" });
  }, [tipo, mensagem]);
  return null;
}
