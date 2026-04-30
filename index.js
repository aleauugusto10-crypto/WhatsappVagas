import express from "express";
import dotenv from "dotenv";
import { handleMessage } from "./src/bot.js";
import paymentsRouter from "./src/routes/payments.js";
import { processNotificationQueue } from "./src/services/notificationQueue.js";
import authRoutes from "./src/routes/authRoutes.js";
import cors from "cors";

dotenv.config();
const app = express();

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(express.json());

// 🔥 ANTI DUPLICAÇÃO EM MEMÓRIA
const processedMessages = new Set();

// ✅ ROTAS INTERNAS
app.use("/payments", paymentsRouter);

app.use("/auth", authRoutes);



/**
 * 🔐 VERIFICAÇÃO DO WEBHOOK (META)
 */
app.get("/webhook", (req, res) => {
  const verifyToken = process.env.VERIFY_TOKEN;

  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === verifyToken) {
    console.log("✅ Webhook verificado");
    return res.status(200).send(challenge);
  }

  console.log("❌ Falha na verificação");
  return res.sendStatus(403);
});

/**
 * 📩 RECEBENDO EVENTOS DO WHATSAPP
 */
app.post("/webhook", async (req, res) => {
  try {
    console.log("📩 webhook recebido");

    const entry = req.body?.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;

    // 🚨 IGNORAR EVENTOS SEM MENSAGEM
    if (!value || !value.messages || !value.messages.length) {
      console.log("⛔ ignorado: sem messages (status/evento)");
      return res.sendStatus(200);
    }

    const msg = value.messages[0];

    // 🚨 VALIDAR MENSAGEM
    if (!msg?.from || !msg?.id) {
      console.log("⛔ mensagem inválida");
      return res.sendStatus(200);
    }

    // 🚨 IGNORAR TIPOS NÃO SUPORTADOS
    const allowedTypes = ["text", "interactive"];
    if (!allowedTypes.includes(msg.type)) {
      console.log("⛔ tipo ignorado:", msg.type);
      return res.sendStatus(200);
    }

    // 🔥 ANTI DUPLICAÇÃO
    if (processedMessages.has(msg.id)) {
      console.log("🔁 duplicado ignorado:", msg.id);
      return res.sendStatus(200);
    }

    processedMessages.add(msg.id);

    // limpa depois de 60s
    setTimeout(() => {
      processedMessages.delete(msg.id);
    }, 60000);

    // 🔍 LOGS PRA DEBUG
    console.log("📱 de:", msg.from);
    console.log("💬 tipo:", msg.type);

    if (msg.text?.body) {
      console.log("📝 texto:", msg.text.body);
    }

    if (msg.interactive) {
      console.log("🧠 interação:", JSON.stringify(msg.interactive, null, 2));
    }

    // 🚀 PROCESSA
    await handleMessage(msg);

    return res.sendStatus(200);
  } catch (err) {
    console.error("❌ erro no webhook:", err);
    return res.sendStatus(500);
  }
});

/**
 * ❤️ HEALTHCHECK
 */
app.get("/", (req, res) => {
  return res.status(200).json({
    ok: true,
    service: "whatsapp-marketplace",
  });
});

/**
 * 🚀 START DO SERVIDOR
 */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);

  // roda uma vez ao subir
  processNotificationQueue(20).catch((err) => {
    console.error("❌ erro inicial no worker de notificações:", err);
  });

  // roda continuamente
  setInterval(() => {
    processNotificationQueue(20).catch((err) => {
      console.error("❌ erro no worker de notificações:", err);
    });
  }, 60000);
});