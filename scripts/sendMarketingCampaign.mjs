import "dotenv/config";
import { sendTransactionalCampaign } from "../server/brevoCampaignSender.js";

async function run() {
  // Replace this with your filtered list from DB, CSV, or manual paste.
  const emailsFromDatabase = [
    "cliente1@example.com",
    "cliente2@example.com",
    "cliente2@example.com", // duplicate example (will be ignored)
    "invalid-email", // invalid example (will be ignored)
  ];

  // Preferred mode: Brevo template.
  const templateId = 1;
  const params = {
    nome: "Cliente",
    empresa: "GeoFlicks",
    link: "https://geoflicks.pt",
  };

  // Fallback mode (optional): direct HTML + subject.
  const subject = "Nova campanha GeoFlicks";
  const htmlContent = `
    <h1 style=\"font-family:Arial,sans-serif;\">Ola!</h1>
    <p style=\"font-family:Arial,sans-serif;\">Esta e uma campanha enviada via Brevo Transactional API.</p>
    <p style=\"font-family:Arial,sans-serif;\">Obrigado.</p>
  `;

  const summary = await sendTransactionalCampaign({
    emails: emailsFromDatabase,
    templateId,
    params,
    // To use HTML fallback instead, comment templateId/params and uncomment subject/htmlContent.
    // subject,
    // htmlContent,
    options: {
      batchSize: 75,
      batchDelayMs: 1500,
      maxRetries: 3,
      requestTimeoutMs: 15000,
    },
  });

  console.log("\n=== Campaign summary ===");
  console.log(JSON.stringify(summary, null, 2));

  if (summary.failedRecipients.length > 0) {
    process.exitCode = 1;
  }
}

run().catch((error) => {
  console.error("Campaign execution failed:", error);
  process.exit(1);
});
