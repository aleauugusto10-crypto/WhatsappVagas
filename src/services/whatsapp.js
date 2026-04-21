import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const url = `https://graph.facebook.com/v19.0/${process.env.WHATSAPP_PHONE_ID}/messages`;

const headers = {
  Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
  "Content-Type": "application/json"
};

export async function sendText(to, text){
  await axios.post(url, {
    messaging_product: "whatsapp",
    to,
    text: { body: text }
  }, { headers });
}

export async function sendButtons(to, body, buttons){
  await axios.post(url, {
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: body },
      action: {
        buttons: buttons.slice(0,3).map(b => ({
          type: "reply",
          reply: {
            id: b.id,
            title: b.title
          }
        }))
      }
    }
  }, { headers });
}

export async function sendList(to, body, sections){
  await axios.post(url, {
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive: {
      type: "list",
      body: { text: body },
      action: {
        button: "Ver opções",
        sections
      }
    }
  }, { headers });
}