import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const GRAPH_VERSION = "v19.0";

const phoneId =
  process.env.WHATSAPP_LEADS_PHONE_ID ||
  process.env.WHATSAPP_PHONE_ID;

const token =
  process.env.WHATSAPP_LEADS_TOKEN ||
  process.env.WHATSAPP_TOKEN;

const templateName =
  process.env.WHATSAPP_LEADS_TEMPLATE_NAME ||
  "confirmar_empresa_v1";

const templateLang =
  process.env.WHATSAPP_LEADS_TEMPLATE_LANG ||
  "pt_BR";

const dryRun =
  process.env.WHATSAPP_LEADS_DRY_RUN === "true";

const url = `https://graph.facebook.com/${GRAPH_VERSION}/${phoneId}/messages`;

const headers = {
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
};

function normalizeBRPhone(value = "") {
  let digits = String(value || "").replace(/\D/g, "");

  if (!digits) return "";

  if (!digits.startsWith("55")) {
    digits = `55${digits}`;
  }

  return digits;
}

async function send(payload) {
  const safePayload = {
    ...payload,
    to: normalizeBRPhone(payload.to),
  };

  if (!safePayload.to) {
    throw new Error("Telefone inválido para envio de prospecção.");
  }

  if (dryRun) {
    console.log("🟡 WHATSAPP LEADS DRY RUN:", {
      phoneId,
      to: safePayload.to,
      payload: safePayload,
    });

    return {
      dry_run: true,
      to: safePayload.to,
      payload: safePayload,
    };
  }

  if (!phoneId || !token) {
    throw new Error(
      "WHATSAPP_LEADS_PHONE_ID ou WHATSAPP_LEADS_TOKEN ausente."
    );
  }

  await new Promise((resolve) =>
    setTimeout(resolve, 2000 + Math.random() * 2500)
  );

  try {
    const res = await axios.post(url, safePayload, {
      headers,
    });

    console.log("✅ WHATSAPP LEADS OK:", JSON.stringify(res.data));

    return res.data;
  } catch (err) {
    console.error("❌ ERRO WHATSAPP LEADS:");

    if (err.response) {
      console.error("STATUS:", err.response.status);
      console.error("DATA:", JSON.stringify(err.response.data));
    } else {
      console.error(err.message);
    }

    throw err;
  }
}

export async function sendLeadTemplate({
  to,
  businessName,
}) {
  return send({
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: templateName,
      language: {
        code: templateLang,
      },
      components: [
        {
          type: "body",
          parameters: [
            {
              type: "text",
              text: businessName || "empresa",
            },
          ],
        },
      ],
    },
  });
}

export async function sendLeadText(to, text) {
  return send({
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: {
      body: text,
    },
  });
}