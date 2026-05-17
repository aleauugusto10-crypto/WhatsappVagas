import { supabase } from "./supabase.js";
import { sendText } from "./services/whatsapp.js";

const processingUsers = new Set();

function normalizeBRPhone(phone = "") {
  let digits = String(phone || "").replace(/\D/g, "");

  if (!digits) return "";

  if (!digits.startsWith("55")) {
    digits = `55${digits}`;
  }

  const country = digits.slice(0, 2);
  const ddd = digits.slice(2, 4);
  let number = digits.slice(4);

  if (country === "55" && ddd.length === 2 && number.length === 8) {
    number = `9${number}`;
  }

  return `${country}${ddd}${number}`;
}

function getMessageText(msg = {}) {
  return (
    msg?.interactive?.button_reply?.title ||
    msg?.interactive?.button_reply?.id ||
    msg?.interactive?.list_reply?.title ||
    msg?.interactive?.list_reply?.id ||
    msg?.text?.body ||
    ""
  );
}

function normalizeText(value = "") {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

async function callSalesFlow({ phone, rawText, conversationId }) {
  const PORT = process.env.PORT || 3000;

  const endpoint = conversationId
    ? `http://localhost:${PORT}/api/leads/conversations/${conversationId}/reply`
    : `http://localhost:${PORT}/api/leads/inbound/showcase`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      whatsapp: phone,
      telefone: phone,
      message: rawText || "Quero minha vitrine, como faz?",
      receiverPhoneNumberId: process.env.WHATSAPP_PHONE_ID,
    }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    console.error("❌ ERRO FLUXO DE VENDAS:", data);
    throw new Error(data?.error || "Erro ao chamar fluxo de vendas.");
  }

  console.log("✅ BOT VENDAS PROCESSADO:", data);

  return data;
}

export async function handleMessage(msg) {
  const rawPhone = msg?.from;
  const phone = normalizeBRPhone(rawPhone);

  if (!phone) return;

  if (processingUsers.has(phone)) {
    console.log("⏳ usuário já em processamento:", phone);
    return;
  }

  processingUsers.add(phone);

  try {
    const rawText = getMessageText(msg);
    const normalizedText = normalizeText(rawText);

    console.log("🔥 BOT VENDAS RECEBEU:", {
      phone,
      rawText,
      normalizedText,
    });

const { data: existingLead, error } = await supabase
  .from("lead_leads")
  .select(`
    id,
    status,
    source,
    lead_conversations (
      id,
      status,
      created_at
    )
  `)
  .eq("whatsapp", phone)
  .eq("source", "whatsapp_button_showcase")
  .order("created_at", {
    ascending: false,
    referencedTable: "lead_conversations",
  })
  .limit(1, {
    referencedTable: "lead_conversations",
  })
  .maybeSingle();
  const activeConversationId =
  existingLead?.lead_conversations?.find((c) => c.status === "open")?.id ||
  null;

    if (error) {
      console.error("❌ erro ao buscar lead de vendas:", error);
    }

    const hasActiveSalesFlow =
      !!existingLead && existingLead.status !== "closed";

    const wantsShowcase =
      normalizedText.includes("quero minha vitrine") ||
      normalizedText.includes("quero vitrine") ||
      normalizedText.includes("minha vitrine") ||
      normalizedText.includes("vitrine") ||
      normalizedText.includes("quero vender") ||
      normalizedText.includes("vender") ||
      normalizedText.includes("loja online") ||
      normalizedText.includes("criar loja") ||
      normalizedText.includes("criar minha loja") ||
      normalizedText.includes("compretudo") ||
      normalizedText === "oi" ||
      normalizedText === "ola" ||
      normalizedText === "olá" ||
      normalizedText === "menu" ||
      normalizedText === "sim" ||
      normalizedText === "ok" ||
      normalizedText === "beleza";

    if (hasActiveSalesFlow || wantsShowcase) {
  await callSalesFlow({
    phone,
    rawText,
    conversationId: activeConversationId,
  });

  return;
}

    await callSalesFlow({
  phone,
  rawText: rawText || "Oi, quero conhecer a vitrine do CompreTudo.Shop",
  conversationId: activeConversationId,
});

    return;
  } catch (err) {
    console.error("❌ erro no bot de vendas:", err);

    await sendText(
      phone,
      "Tive um erro aqui ao processar sua mensagem. Pode me mandar novamente?"
    );

    return;
  } finally {
    processingUsers.delete(phone);
  }
}