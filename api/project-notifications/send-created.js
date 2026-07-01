import { sendTransactionalCampaign } from "../../server/brevoCampaignSender.js";

export const config = {
  runtime: "nodejs",
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Method Not Allowed" });
    return;
  }

  const { email, projectTitle, projectUrl, responsibleName, clientName } = req.body || {};

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
      senderProfile: "marketing",
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