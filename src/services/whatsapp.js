import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

function getPhoneNumberId(phoneNumberId) {
  return phoneNumberId || process.env.WHATSAPP_PHONE_ID;
}

function getToken() {
  return (
    process.env.WHATSAPP_TOKEN ||
    process.env.WHATSAPP_ACCESS_TOKEN
  );
}

function getUrl(phoneNumberId) {
  const id = getPhoneNumberId(phoneNumberId);
  return `https://graph.facebook.com/v19.0/${id}/messages`;
}

function getHeaders() {
  return {
    Authorization: `Bearer ${getToken()}`,
    "Content-Type": "application/json",
  };
}

async function send(payload, options = {}) {
  try {
    const phoneNumberId = options.phoneNumberId;

    await new Promise((r) =>
      setTimeout(r, 1000 + Math.random() * 1000)
    );

    console.log("📤 ENVIANDO WHATSAPP:", {
      to: payload.to,
      phoneNumberId: getPhoneNumberId(phoneNumberId),
    });

    const res = await axios.post(
      getUrl(phoneNumberId),
      payload,
      { headers: getHeaders() }
    );

    console.log("✅ WHATSAPP OK:", JSON.stringify(res.data));

    return res.data;
  } catch (err) {
    console.error("❌ ERRO AO ENVIAR WHATSAPP:");

    if (err.response) {
      console.error("STATUS:", err.response.status);
      console.error("DATA:", JSON.stringify(err.response.data));
    } else {
      console.error(err.message);
    }

    return null;
  }
}

export async function sendText(to, text, options = {}) {
  return send(
    {
      messaging_product: "whatsapp",
      to,
      text: { body: text },
    },
    options
  );
}

export async function sendButtons(to, body, buttons, options = {}) {
  return send(
    {
      messaging_product: "whatsapp",
      to,
      type: "interactive",
      interactive: {
        type: "button",
        body: { text: body },
        action: {
          buttons: buttons.slice(0, 3).map((b) => ({
            type: "reply",
            reply: {
              id: b.id,
              title: b.title,
            },
          })),
        },
      },
    },
    options
  );
}

export async function sendList(to, body, sections, options = {}) {
  return send(
    {
      messaging_product: "whatsapp",
      to,
      type: "interactive",
      interactive: {
        type: "list",
        body: { text: body },
        action: {
          button: "Ver opções",
          sections,
        },
      },
    },
    options
  );
}

export function randomize(arr = []) {
  if (!Array.isArray(arr) || arr.length === 0) return "";
  return arr[Math.floor(Math.random() * arr.length)];
}