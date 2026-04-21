import express from "express";
import dotenv from "dotenv";
import { handleMessage } from "./src/bot.js";

dotenv.config();

const app = express();
app.use(express.json());

// 🔐 verificação do webhook
app.get("/webhook", (req, res) => {
  const verify_token = process.env.VERIFY_TOKEN;

  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === verify_token) {
    console.log("✅ Webhook verificado");
    return res.status(200).send(challenge);
  } else {
    return res.sendStatus(403);
  }
});

// 📩 recebendo mensagens
app.post("/webhook", async (req, res) => {
  try {
    console.log("📩 mensagem recebida:", JSON.stringify(req.body, null, 2));

    const msg = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

    if (msg) {
      await handleMessage(msg);
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("❌ erro no webhook:", err);
    res.sendStatus(500);
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});