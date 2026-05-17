import express from "express";
import dotenv from "dotenv";
import cors from "cors";

import { handleMessage } from "./src/bot.js";
import paymentsRouter from "./src/routes/payments.js";
import { processNotificationQueue } from "./src/services/notificationQueue.js";
import authRoutes from "./src/routes/authRoutes.js";
import leadsRoutes from "./lead-machine/backend/src/modules/leads/routes.js";
import discoveryRoutes from "./lead-machine/backend/src/modules/discovery/routes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

// 🔥 ANTI DUPLICAÇÃO EM MEMÓRIA
const processedMessages = new Set();

// ✅ ROTAS INTERNAS
app.use("/payments", paymentsRouter);
app.use("/auth", authRoutes);
app.use("/api/leads", leadsRoutes);
app.use("/api/discovery", discoveryRoutes);

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

    const receiverPhoneNumberId = value?.metadata?.phone_number_id;

    console.log("📞 Número que recebeu:", receiverPhoneNumberId);

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

    const textMessage =
      msg.text?.body ||
      msg.interactive?.button_reply?.title ||
      msg.interactive?.button_reply?.id ||
      msg.interactive?.list_reply?.title ||
      msg.interactive?.list_reply?.id ||
      "";

    const normalizedText = String(textMessage)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();

    const isSecondWhatsappNumber =
      String(receiverPhoneNumberId) ===
        String(process.env.WHATSAPP_PHONE_NUMBER_ID) ||
      String(receiverPhoneNumberId) ===
        String(process.env.HATSAPP_PHONE_NUMBER_ID);

    const isShowcaseLead =
      normalizedText.includes("quero minha vitrine") ||
      normalizedText.includes("minha vitrine como faz") ||
      normalizedText.includes("quero vitrine") ||
      normalizedText.includes("minha vitrine");

    console.log("🧪 DEBUG WEBHOOK:", {
      receiverPhoneNumberId,
      envWhatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
      envHatsappPhoneNumberId: process.env.HATSAPP_PHONE_NUMBER_ID,
      isSecondWhatsappNumber,
      textMessage,
      normalizedText,
      isShowcaseLead,
    });

    // 🔥 FLUXO DO NÚMERO DE VENDAS / VITRINE
    if (isSecondWhatsappNumber) {
      console.log("🔥 Mensagem recebida no número de vendas/vitrine");

      if (isShowcaseLead) {
        console.log("🔥 Entrou no fluxo Quero Minha Vitrine");

        const response = await fetch(
          `http://localhost:${PORT}/api/leads/inbound/showcase`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              whatsapp: msg.from,
              message: textMessage,
            }),
          }
        );

        const data = await response.json().catch(() => null);

        console.log("✅ Fluxo vitrine iniciado:", data);

        return res.sendStatus(200);
      }

      // Se chegou no número de vendas, mas não é a frase da vitrine,
      // deixa o bot normal responder.
      await handleMessage(msg);
      return res.sendStatus(200);
    }

    // 🔥 FLUXO NORMAL DO WHATSAPP
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
 * 🏙️ BUSCAR CIDADES POR UF
 */
app.get("/api/locations/cities", async (req, res) => {
  try {
    const uf = String(req.query.uf || "")
      .trim()
      .toUpperCase();

    if (!uf || uf.length !== 2) {
      return res.status(400).json({
        error: "Informe a UF do estado. Exemplo: SE, BA, SP.",
      });
    }

    const response = await fetch(
      `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`
    );

    if (!response.ok) {
      return res.status(400).json({
        error: "Não foi possível buscar cidades desse estado.",
      });
    }

    const data = await response.json();

    const cities = data
      .map((item) => ({
        name: item.nome,
        city: item.nome,
        state: uf,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

    return res.json({
      state: uf,
      count: cities.length,
      cities,
    });
  } catch (error) {
    console.error("Erro ao buscar cidades:", error);

    return res.status(500).json({
      error: "Erro interno ao buscar cidades.",
    });
  }
});

/**
 * 🚀 START DO SERVIDOR
 */
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);

  processNotificationQueue(20).catch((err) => {
    console.error("❌ erro inicial no worker de notificações:", err);
  });

  setInterval(() => {
    processNotificationQueue(20).catch((err) => {
      console.error("❌ erro no worker de notificações:", err);
    });
  }, 60000);
});