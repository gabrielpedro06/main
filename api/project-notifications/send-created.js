import { sendTransactionalCampaign } from "../../server/brevoCampaignSender.js";

export const config = {
  runtime: "nodejs",
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Method Not Allowed" });
    return;
  }

  // 1. Lemos o senderType que configurámos no Frontend (embora neste ficheiro seja sempre projeto)
  const { email, projectTitle, projectUrl, responsibleName, clientName, senderType } = req.body || {};

  if (!email || typeof email !== "string") {
    res.status(400).json({ ok: false, error: "email is required." });
    return;
  }

  if (!projectTitle || !projectUrl) {
    res.status(400).json({ ok: false, error: "projectTitle and projectUrl are required." });
    return;
  }

  const safeProjectTitle = String(projectTitle).trim();
  const safeProjectUrl = String(projectUrl).trim();
  const safeResponsibleName = String(responsibleName || "Responsável").trim() || "Responsável";
  const safeClientName = String(clientName || "").trim();

  const subject = `Novo projeto atribuído: ${safeProjectTitle}`;
  const htmlContent = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1e293b">
      <h2 style="margin:0 0 12px 0;color:#0f172a">Foi criado um novo projeto</h2>
      <p style="margin:0 0 8px 0">Olá, ${safeResponsibleName}.</p>
      <p style="margin:0 0 8px 0">Foi criado o projeto <strong>${safeProjectTitle}</strong>${safeClientName ? ` para ${safeClientName}` : ""}.</p>
      <p style="margin:0 0 20px 0">Podes abrir diretamente aqui:</p>
      <p style="margin:0 0 24px 0"><a href="${safeProjectUrl}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:bold">Abrir projeto</a></p>
      <p style="margin:0;color:#64748b;font-size:12px">Se o botão não funcionar, copia este link: ${safeProjectUrl}</p>
    </div>
  `;

  try {
    const summary = await sendTransactionalCampaign({
      senderProfile: "marketing", // Usa a mesma configuração base de chaves e email
      
      // 2. FORÇAMOS O NOME DO REMETENTE AQUI 
      senderName: "Bizin Manager", // Passamos como prop avulsa
      sender: { 
        name: "Bizin Manager", 
        email: process.env.BREVO_SENDER_EMAIL || "marketing@geoflicks.pt" 
      }, // Passamos também como objeto padrão da API do Brevo
      
      emails: [email],
      subject,
      htmlContent,
    });

    res.status(200).json({ ok: true, summary });
  } catch (error) {
    const statusCode = typeof error.status === "number" ? Math.min(Math.max(error.status, 400), 502) : 500;
    res.status(statusCode).json({
      ok: false,
      error: error.message || "Unexpected error while sending project notification.",
      details: error.details || null,
    });
  }
}