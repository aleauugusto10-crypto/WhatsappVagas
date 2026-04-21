import express from "express";
import dotenv from "dotenv";
import { handleMessage } from "./src/bot.js";

dotenv.config();

const app = express();
app.use(express.json());

/**
 * 🔐 VERIFICAÇÃO DO WEBHOOK (Facebook)
 */
app.get("/webhook", (req, res) => {
  const verify_token = process.env.VERIFY_TOKEN;

  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === verify_token) {
    console.log("✅ Webhook verificado");
    return res.status(200).send(challenge);
  } else {
    console.log("❌ Falha na verificação");
    return res.sendStatus(403);
  }
});

/**
 * 📩 RECEBIMENTO DE EVENTOS DO WHATSAPP
 */
app.post("/webhook", async (req, res) => {
  try {
    console.log("📩 webhook recebido");

    const entry = req.body.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;

    // 🚨 1. Ignorar eventos sem mensagens (status, delivery, etc)
    if (!value || !value.messages) {
      console.log("⛔ ignorando evento (sem messages)");
      return res.sendStatus(200);
    }

    const msg = value.messages[0];

    // 🚨 2. Validar mensagem
    if (!msg || !msg.from) {
      console.log("⛔ mensagem inválida");
      return res.sendStatus(200);
    }

    // 🚨 3. Ignorar tipos que não são interação de usuário
    const allowedTypes = ["text", "interactive"];

    if (!allowedTypes.includes(msg.type)) {
      console.log("⛔ tipo ignorado:", msg.type);
      return res.sendStatus(200);
    }

    // 🔥 LOG LIMPO PRA DEBUG
    console.log("📱 de:", msg.from);
    console.log("💬 tipo:", msg.type);

    if (msg.text) {
      console.log("📝 texto:", msg.text.body);
    }

    if (msg.interactive) {
      console.log("🧠 interação:", msg.interactive);
    }

    // 🚀 PROCESSAR MENSAGEM
    await handleMessage(msg);

    return res.sendStatus(200);

  } catch (err) {
    console.error("❌ erro no webhook:", err);
    return res.sendStatus(500);
  }
});

/**
 * 🚀 START SERVER
 */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});