import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const url = `https://graph.facebook.com/v19.0/${process.env.WHATSAPP_PHONE_ID}/messages`;

const headers = {
  Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
  "Content-Type": "application/json"
};

// 🔥 FUNÇÃO CENTRAL COM LOG
async function send(payload){
  try {
    const res = await axios.post(url, payload, { headers });

    console.log("✅ WHATSAPP OK:", JSON.stringify(res.data));

    return res.data;

  } catch (err) {

    console.error("❌ ERRO AO ENVIAR WHATSAPP:");

    if(err.response){
      console.error("STATUS:", err.response.status);
      console.error("DATA:", JSON.stringify(err.response.data));
    } else {
      console.error(err.message);
    }

    return null;
  }
}

// 📩 TEXTO
export async function sendText(to, text){
  return send({
    messaging_product: "whatsapp",
    to,
    text: { body: text }
  });
}

// 🔘 BOTÕES
export async function sendButtons(to, body, buttons){
  return send({
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
  });
}

// 📋 LISTA
export async function sendList(to, body, sections){
  return send({
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
  });
}