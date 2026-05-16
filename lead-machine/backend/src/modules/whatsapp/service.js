const GRAPH_VERSION = "v22.0";

function normalizeBrazilPhone(value = "") {
  const digits = String(value || "").replace(/\D/g, "");

  if (!digits) return "";

  if (digits.startsWith("55")) {
    return digits;
  }

  return `55${digits}`;
}

export async function sendWhatsAppTemplate({
  to,
  businessName,
}) {
  const token = String(process.env.WHATSAPP_ACCESS_TOKEN || "").trim();
const phoneNumberId = String(process.env.WHATSAPP_PHONE_NUMBER_ID || "").trim();
console.log("========== WHATSAPP ENV DEBUG ==========");
console.log(
  "ACCESS TOKEN EXISTS:",
  !!process.env.WHATSAPP_ACCESS_TOKEN
);

console.log(
  "TOKEN START:",
  process.env.WHATSAPP_ACCESS_TOKEN?.slice(0, 15)
);

console.log(
  "TOKEN END:",
  process.env.WHATSAPP_ACCESS_TOKEN?.slice(-15)
);

console.log(
  "PHONE_NUMBER_ID:",
  process.env.WHATSAPP_PHONE_NUMBER_ID
);

console.log(
  "PHONE_ID:",
  process.env.WHATSAPP_PHONE_ID
);

console.log(
  "TOKEN ALT EXISTS:",
  !!process.env.WHATSAPP_TOKEN
);

console.log("=======================================");
  const templateName =
    process.env.WHATSAPP_TEMPLATE_NAME ||
    "confirmacao_empresa_v1";
  const language =
    process.env.WHATSAPP_TEMPLATE_LANG || "pt_BR";

  const normalizedTo = normalizeBrazilPhone(to);

  if (!normalizedTo) {
    throw new Error("Telefone inválido para WhatsApp.");
  }

  if (process.env.WHATSAPP_DRY_RUN === "true") {
    console.log("🟡 WHATSAPP DRY RUN:", {
      to: normalizedTo,
      templateName,
      businessName,
    });

    return {
      dry_run: true,
      to: normalizedTo,
      template: templateName,
    };
  }

  if (!token || !phoneNumberId) {
    throw new Error(
      "WHATSAPP_ACCESS_TOKEN ou WHATSAPP_PHONE_NUMBER_ID ausente."
    );
  }

  const url =
    `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`;

  const body = {
    messaging_product: "whatsapp",
    to: normalizedTo,
    type: "template",
    template: {
      name: templateName,
      language: {
        code: language,
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
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error("❌ Erro WhatsApp:", data);
    throw new Error(
      data?.error?.message ||
        "Erro ao enviar template WhatsApp."
    );
  }

  return data;
}