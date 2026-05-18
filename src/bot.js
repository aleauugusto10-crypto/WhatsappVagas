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
function looksLikeBusinessAutoReply(text = "") {
  const normalized = normalizeText(text);

  if (!normalized) return false;

  const wordCount = normalized
    .split(/\s+/)
    .filter(Boolean).length;

  const patterns = [
    "como podemos ajudar",
    "como posso ajudar",
    "em que podemos ajudar",
    "em que posso ajudar",
    "agradece seu contato",
    "obrigado pelo contato",
    "obrigada pelo contato",
    "bem vindo",
    "bem-vindo",
    "seja bem vindo",
    "seja bem-vindo",
    "estamos a disposicao",
    "estamos a disposição",
    "horario de atendimento",
    "horário de atendimento",
    "digite",
    "opcao",
    "opção",
    "atendimento",
    "assistente virtual",
  ];

  if (patterns.some((p) => normalized.includes(p))) {
    return true;
  }

  return wordCount >= 8 && normalized.length >= 45;
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

const { data: existingLeads, error } = await supabase
  .from("lead_leads")
  .select(`
    id,
    status,
    source,
    created_at,
    lead_conversations (
      id,
      status,
      created_at
    )
  `)
  .or(`whatsapp.eq.${phone},telefone.eq.${phone}`)
  .in("source", ["whatsapp_button_showcase", "prospection"])
  .neq("status", "closed")
  .order("created_at", { ascending: false })
  .limit(5);

if (error) {
  console.error("❌ erro ao buscar lead de vendas:", error);
}

const existingLead =
  existingLeads?.find((lead) =>
    lead.lead_conversations?.some((c) => c.status === "open")
  ) ||
  existingLeads?.[0] ||
  null;

const activeConversation =
  existingLead?.lead_conversations?.find(
    (c) => c.status === "open"
  ) ||
  existingLead?.lead_conversations?.[0] ||
  null;

const activeConversationId =
  activeConversation?.id || null;

    if (error) {
      console.error("❌ erro ao buscar lead de vendas:", error);
    }

    

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
    normalizedText === "menu";
console.log("🧪 DEBUG BOT", {
  existingLeadId: existingLead?.id,
  activeConversationId,
  leadConversations:
    existingLead?.lead_conversations,
});
const isBusinessAutoReply =
  looksLikeBusinessAutoReply(rawText);

if (isBusinessAutoReply && !activeConversationId) {
  console.log("🤖 auto-reply sem conversa ativa. Não vou criar inbound errado:", {
    phone,
    rawText,
  });

  return;
}

if (isBusinessAutoReply && activeConversationId) {
  console.log("🤖 auto-reply com conversa ativa. Continuando prospecção:", {
    phone,
    activeConversationId,
  });

  await callSalesFlow({
    phone,
    rawText,
    conversationId: activeConversationId,
  });

  return;
}
if (activeConversationId) {
  await callSalesFlow({
    phone,
    rawText,
    conversationId: activeConversationId,
  });

  return;
}

if (wantsShowcase) {
  await callSalesFlow({
    phone,
    rawText,
    conversationId: null,
  });

  return;
}

console.log("⛔ mensagem sem contexto ignorada:", {
  phone,
  rawText,
});

return;

    return;
  } catch (err) {
    console.error("❌ erro no bot de vendas:", err);

    await sendText(
  phone,
  "Tive um erro aqui ao processar sua mensagem. Vou reiniciar o atendimento da vitrine. Me diga: quero minha vitrine"
);

    return;
  } finally {
    processingUsers.delete(phone);
  }
}