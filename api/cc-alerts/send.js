import { sendTransactionalCampaign } from "../../server/brevoCampaignSender.js";

export const config = {
  runtime: "nodejs",
};

export default async function handler(req, res) {
  // 1. Garantir que é um pedido POST
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Method Not Allowed" });
    return;
  }

  // 2. Extrair os dados que o frontend (Perfil.jsx) enviou
  const { emailDestino, colaboradorNome, dataValidade, ncc } = req.body || {};

  // 3. Validar campos obrigatórios
  if (!emailDestino || typeof emailDestino !== "string") {
    res.status(400).json({ ok: false, error: "emailDestino is required." });
    return;
  }

  if (!colaboradorNome) {
    res.status(400).json({ ok: false, error: "colaboradorNome is required." });
    return;
  }

  // 4. Limpar/Sanitizar as variáveis
  const safeEmailDestino = String(emailDestino).trim();
  const safeColaboradorNome = String(colaboradorNome).trim();
  const safeDataValidade = String(dataValidade || "N/A").trim();
  const safeNcc = String(ncc || "N/A").trim();

  // 5. Preparar o email (Assunto e HTML)
  const subject = `Aviso: Atualização de Cartão de Cidadão - ${safeColaboradorNome}`;
  const htmlContent = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1e293b;max-width:600px;margin:0 auto;border:1px solid #e2e8f0;border-radius:12px;padding:24px;">
      <h2 style="margin:0 0 16px 0;color:#0f172a;border-bottom:1px solid #e2e8f0;padding-bottom:12px;">
        Atualização de Documento
      </h2>
      <p style="margin:0 0 12px 0">Olá Equipa de Recursos Humanos,</p>
      <p style="margin:0 0 20px 0">O colaborador <strong>${safeColaboradorNome}</strong> atualizou os dados do seu Cartão de Cidadão na plataforma.</p>
      
      <div style="background:#f8fafc;padding:16px;border-radius:8px;border:1px solid #cbd5e1;margin-bottom:24px;">
        <p style="margin:0 0 8px 0"><strong>Nº do Cartão de Cidadão:</strong> ${safeNcc}</p>
        <p style="margin:0"><strong>Data de Validade:</strong> ${safeDataValidade}</p>
      </div>
      
      <p style="margin:0;color:#64748b;font-size:12px;border-top:1px solid #e2e8f0;padding-top:12px;">
        Este é um email automático gerado pelo sistema.
      </p>
    </div>
  `;

  // 6. Enviar o email via Brevo
  try {
    const summary = await sendTransactionalCampaign({
      senderProfile: "marketing", // Podes mudar para "rh" se tiveres esse perfil configurado no Brevo
      emails: [safeEmailDestino],
      subject,
      htmlContent,
    });

    // Sucesso!
    res.status(200).json({ ok: true, summary });
  } catch (error) {
    // Tratamento de Erros
    const statusCode = typeof error.status === "number" ? Math.min(Math.max(error.status, 400), 502) : 500;
    res.status(statusCode).json({
      ok: false,
      error: error.message || "Unexpected error while sending CC notification.",
      details: error.details || null,
    });
  }
}