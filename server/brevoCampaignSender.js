const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

const DEFAULTS = {
  senderEmail: process.env.BREVO_SENDER_EMAIL || "marketing@geoflicks.pt",
  senderName: process.env.BREVO_SENDER_NAME || "GeoFlicks Marketing",
  batchSize: Number(process.env.BREVO_BATCH_SIZE || 75),
  batchDelayMs: Number(process.env.BREVO_BATCH_DELAY_MS || 1200),
  maxRetries: Number(process.env.BREVO_MAX_RETRIES || 3),
  requestTimeoutMs: Number(process.env.BREVO_REQUEST_TIMEOUT_MS || 15000),
};

const RETRIABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function isValidEmail(value) {
  return emailRegex.test(value);
}

function splitInChunks(list, size) {
  if (!Array.isArray(list) || size <= 0) return [];
  const chunks = [];
  for (let i = 0; i < list.length; i += size) {
    chunks.push(list.slice(i, i + size));
  }
  return chunks;
}

function getBackoffDelay(baseDelayMs, attempt) {
  const jitter = Math.floor(Math.random() * 250);
  return Math.min(baseDelayMs * 2 ** (attempt - 1) + jitter, 30000);
}

function buildPayload({
  to,
  subject,
  htmlContent,
  templateId,
  params,
  recipientParamsByEmail,
  senderEmail,
  senderName,
}) {
  const payload = {
    sender: {
      email: senderEmail,
      name: senderName,
    },
    to: to.map((email) => ({ email })),
  };

  if (templateId) {
    payload.templateId = Number(templateId);

    const baseParams =
      params &&
      typeof params === "object" &&
      !Array.isArray(params) &&
      Object.keys(params).length > 0
        ? params
        : null;

    // Safety fallback: some Brevo templates require top-level params even when using messageVersions.
    const firstEmail = Array.isArray(to) && to.length > 0 ? to[0] : null;
    const firstRecipientParams =
      firstEmail && recipientParamsByEmail && typeof recipientParamsByEmail[firstEmail] === "object"
        ? recipientParamsByEmail[firstEmail]
        : null;

    payload.params = {
      nome: "Cliente",
      firstName: "Cliente",
      FIRSTNAME: "Cliente",
      ...(baseParams || {}),
      ...(firstRecipientParams || {}),
    };

    const hasRecipientParamsMap =
      recipientParamsByEmail &&
      typeof recipientParamsByEmail === "object" &&
      Object.keys(recipientParamsByEmail).length > 0;

    if (hasRecipientParamsMap) {
      payload.messageVersions = to.map((email) => ({
        to: [{ email }],
        params: {
          ...payload.params,
          ...(recipientParamsByEmail[email] && typeof recipientParamsByEmail[email] === "object"
            ? recipientParamsByEmail[email]
            : {}),
        },
      }));

      delete payload.to;
      return payload;
    }
  } else {
    payload.subject = subject;
    payload.htmlContent = htmlContent;
  }

  return payload;
}

async function callBrevoApi({ apiKey, payload, timeoutMs }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(BREVO_API_URL, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const text = await response.text();
    const parsed = text ? safeJsonParse(text) : null;

    if (!response.ok) {
      const error = new Error(parsed?.message || response.statusText || "Brevo API request failed");
      error.status = response.status;
      error.details = parsed || text;
      throw error;
    }

    return {
      messageId: parsed?.messageId || null,
      responseBody: parsed,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function safeJsonParse(input) {
  try {
    return JSON.parse(input);
  } catch {
    return null;
  }
}

function isRetriableError(error) {
  if (!error) return false;
  if (error.name === "AbortError") return true;
  if (typeof error.status === "number") return RETRIABLE_STATUS.has(error.status);
  return true;
}

async function sendBatchWithRetry({ batch, apiKey, campaign, config, logger }) {
  const payload = buildPayload({
    to: batch,
    subject: campaign.subject,
    htmlContent: campaign.htmlContent,
    templateId: campaign.templateId,
    params: campaign.params,
    recipientParamsByEmail: campaign.recipientParamsByEmail,
    senderEmail: config.senderEmail,
    senderName: config.senderName,
  });

  let lastError = null;

  for (let attempt = 1; attempt <= config.maxRetries + 1; attempt += 1) {
    try {
      const result = await callBrevoApi({
        apiKey,
        payload,
        timeoutMs: config.requestTimeoutMs,
      });

      return {
        ok: true,
        messageId: result.messageId,
      };
    } catch (error) {
      lastError = error;
      const canRetry = attempt <= config.maxRetries && isRetriableError(error);

      logger.warn(
        `[Brevo] Batch send failed (attempt ${attempt}/${config.maxRetries + 1}) for ${batch.length} recipients: ${error.message}`,
      );

      if (!canRetry) break;

      const delay = getBackoffDelay(config.batchDelayMs, attempt);
      await sleep(delay);
    }
  }

  return {
    ok: false,
    error: lastError,
  };
}

async function sendSingleWithRetry({ email, apiKey, campaign, config, logger }) {
  const result = await sendBatchWithRetry({
    batch: [email],
    apiKey,
    campaign,
    config,
    logger,
  });

  return {
    email,
    ok: result.ok,
    messageId: result.messageId || null,
    error: result.error || null,
  };
}

export function prepareRecipients(rawEmails) {
  const invalidEmails = [];
  const duplicates = [];
  const unique = new Set();
  const validUniqueEmails = [];

  for (const candidate of rawEmails || []) {
    const normalized = normalizeEmail(candidate);
    if (!normalized || !isValidEmail(normalized)) {
      if (normalized) invalidEmails.push(normalized);
      continue;
    }

    if (unique.has(normalized)) {
      duplicates.push(normalized);
      continue;
    }

    unique.add(normalized);
    validUniqueEmails.push(normalized);
  }

  return {
    validUniqueEmails,
    invalidEmails,
    duplicates,
  };
}

export async function sendTransactionalCampaign({
  emails,
  subject,
  htmlContent,
  templateId,
  params,
  recipientParamsByEmail,
  options = {},
  logger = console,
}) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    throw new Error("Missing BREVO_API_KEY environment variable.");
  }

  const hasTemplate = Number(templateId) > 0;
  const hasHtmlFallback = Boolean(subject && typeof subject === "string" && htmlContent && typeof htmlContent === "string");

  if (!hasTemplate && !hasHtmlFallback) {
    throw new Error("Provide templateId (preferred) or subject + htmlContent (fallback).");
  }

  if (hasTemplate && params && typeof params !== "object") {
    throw new Error("params must be a JSON object when using templateId.");
  }

  const config = {
    ...DEFAULTS,
    ...options,
  };

  config.batchSize = Math.max(1, Math.min(100, Number(config.batchSize || DEFAULTS.batchSize)));
  config.batchDelayMs = Math.max(0, Number(config.batchDelayMs || DEFAULTS.batchDelayMs));
  config.maxRetries = Math.max(0, Number(config.maxRetries || DEFAULTS.maxRetries));
  config.requestTimeoutMs = Math.max(1000, Number(config.requestTimeoutMs || DEFAULTS.requestTimeoutMs));

  const { validUniqueEmails, invalidEmails, duplicates } = prepareRecipients(emails);

  if (validUniqueEmails.length === 0) {
    return {
      totalInput: Array.isArray(emails) ? emails.length : 0,
      acceptedRecipients: 0,
      sentRecipients: 0,
      failedRecipients: [],
      invalidEmails,
      duplicates,
      batchesProcessed: 0,
      message: "No valid recipients to send.",
    };
  }

  const batches = splitInChunks(validUniqueEmails, config.batchSize);
  const failedRecipients = [];
  let sentRecipients = 0;
  const campaign = {
    subject,
    htmlContent,
    templateId: hasTemplate ? Number(templateId) : null,
    params: hasTemplate ? params || {} : null,
    recipientParamsByEmail: hasTemplate ? recipientParamsByEmail || null : null,
  };

  logger.info(
    `[Brevo] Starting campaign for ${validUniqueEmails.length} valid recipients in ${batches.length} batches.`,
  );

  for (let i = 0; i < batches.length; i += 1) {
    const batch = batches[i];
    const batchNumber = i + 1;

    logger.info(`[Brevo] Sending batch ${batchNumber}/${batches.length} (${batch.length} recipients)...`);

    const shouldSendTemplatePerRecipient =
      Boolean(campaign.templateId) &&
      campaign.recipientParamsByEmail &&
      typeof campaign.recipientParamsByEmail === "object" &&
      Object.keys(campaign.recipientParamsByEmail).length > 0;

    if (shouldSendTemplatePerRecipient) {
      for (const email of batch) {
        const singleCampaign = {
          ...campaign,
          params: {
            ...(campaign.params && typeof campaign.params === "object" ? campaign.params : {}),
            ...(campaign.recipientParamsByEmail[email] && typeof campaign.recipientParamsByEmail[email] === "object"
              ? campaign.recipientParamsByEmail[email]
              : {}),
          },
          recipientParamsByEmail: null,
        };

        if (!singleCampaign.params.nome) {
          singleCampaign.params.nome = "Cliente";
        }

        const singleResult = await sendSingleWithRetry({
          email,
          apiKey,
          campaign: singleCampaign,
          config,
          logger,
        });

        if (singleResult.ok) {
          sentRecipients += 1;
          logger.info(`[Brevo] Sent to ${email}.`);
        } else {
          failedRecipients.push({
            email,
            reason: singleResult.error?.message || "Unknown send error",
            status: singleResult.error?.status || null,
          });
          logger.error(
            `[Brevo] Failed recipient ${email}: ${singleResult.error?.message || "Unknown send error"}`,
          );
        }
      }

      const isLastTemplateBatch = batchNumber === batches.length;
      if (!isLastTemplateBatch && config.batchDelayMs > 0) {
        await sleep(config.batchDelayMs);
      }
      continue;
    }

    const batchResult = await sendBatchWithRetry({
      batch,
      apiKey,
      campaign,
      config,
      logger,
    });

    if (batchResult.ok) {
      sentRecipients += batch.length;
      logger.info(
        `[Brevo] Batch ${batchNumber} sent successfully.${batchResult.messageId ? ` messageId=${batchResult.messageId}` : ""}`,
      );
    } else {
      logger.error(
        `[Brevo] Batch ${batchNumber} failed after retries. Falling back to single-recipient retries to isolate failures.`,
      );

      for (const email of batch) {
        const singleResult = await sendSingleWithRetry({
          email,
          apiKey,
          campaign,
          config,
          logger,
        });

        if (singleResult.ok) {
          sentRecipients += 1;
          logger.info(`[Brevo] Sent to ${email}.`);
        } else {
          failedRecipients.push({
            email,
            reason: singleResult.error?.message || "Unknown send error",
            status: singleResult.error?.status || null,
          });
          logger.error(
            `[Brevo] Failed recipient ${email}: ${singleResult.error?.message || "Unknown send error"}`,
          );
        }
      }
    }

    const isLastBatch = batchNumber === batches.length;
    if (!isLastBatch && config.batchDelayMs > 0) {
      await sleep(config.batchDelayMs);
    }
  }

  return {
    totalInput: Array.isArray(emails) ? emails.length : 0,
    acceptedRecipients: validUniqueEmails.length,
    sentRecipients,
    failedRecipients,
    invalidEmails,
    duplicates,
    batchesProcessed: batches.length,
    message:
      failedRecipients.length > 0
        ? "Campaign completed with partial failures."
        : "Campaign completed successfully.",
  };
}
