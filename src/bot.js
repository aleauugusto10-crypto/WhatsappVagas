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

function getPhoneVariants(phone = "") {
  const normalized =
    String(phone || "").replace(/\D/g, "");

  if (!normalized) return [];

  const variants = new Set();

  let digits = normalized;

  if (!digits.startsWith("55")) {
    digits = `55${digits}`;
  }

  variants.add(digits);

  const country = digits.slice(0, 2);
  const ddd = digits.slice(2, 4);
  const number = digits.slice(4);

  // original
  variants.add(
    `${country}${ddd}${number}`
  );

  // celular COM 9 → SEM 9
  if (
    number.length === 9 &&
    number.startsWith("9")
  ) {
    variants.add(
      `${country}${ddd}${number.slice(1)}`
    );
  }

  // celular SEM 9 → COM 9
  if (number.length === 8) {
    variants.add(
      `${country}${ddd}9${number}`
    );
  }

  // fixo comercial
  if (
    number.length === 8 &&
    !number.startsWith("9")
  ) {
    variants.add(
      `${country}${ddd}${number}`
    );

    variants.add(
      `${country}${ddd}9${number}`
    );
  }

  return Array.from(variants);
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

const DASHBOARD_URL =
  process.env.DASHBOARD_URL ||
  "https://compretudo.shop/dashboard";

function isLoginRequest(text = "") {
  const t = normalizeText(text);

  return (
    t.includes("codigo de login") ||
    t.includes("código de login") ||
    t.includes("buscar meu codigo") ||
    t.includes("buscar meu código") ||
    t.includes("vim buscar") ||
    t.includes("login")
  );
}
function isOrderTrackingRequest(text = "") {
  const t = normalizeText(text);

  return (
    t.includes("codigo do pedido") ||
    t.includes("código do pedido") ||
    t.includes("acompanhar minha solicitacao") ||
    t.includes("acompanhar minha solicitação") ||
    t.includes("aguardo a confirmacao") ||
    t.includes("aguardo a confirmação")
  );
}

function extractOrderId(text = "") {
  const match = String(text).match(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
  );

  return match?.[0] || null;
}

async function sendOrderTrackingReply(phone, rawText) {
  const orderId = extractOrderId(rawText);

  if (!orderId) {
    return sendText(
      phone,
      "Recebi sua solicitação, mas não encontrei o código do pedido. Me envie o código para eu acompanhar."
    );
  }

  const { data: order, error } = await supabase
    .from("profile_orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();

  if (error || !order) {
    return sendText(
      phone,
      `Recebi seu pedido, mas não consegui localizar esse código agora:\n\n${orderId}`
    );
  }

  const statusLabel =
    order.status === "confirmed"
      ? "confirmado ✅"
      : order.status === "cancelled"
      ? "cancelado"
      : order.status === "delivered"
      ? "entregue ✅"
      : "pendente de confirmação";

  return sendText(
    phone,
    `📦 *Status do seu pedido*

Código: ${orderId}

Seu pedido está: *${statusLabel}*.

Assim que a empresa atualizar, você será avisado por aqui.`
  );
}
async function sendDashboardAccess(phone) {
  return sendText(
    phone,
    `🔐 *Acesso ao painel CompreTudo.shop*

Acesse o painel abaixo e entre com o mesmo número deste WhatsApp:

${DASHBOARD_URL}

Se você solicitou um código de login no site, aguarde alguns instantes.`
  );
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
    if (isLoginRequest(rawText)) {
  console.log("🔐 LOGIN REQUEST NO BOT:", {
    phone,
    rawText,
  });

  await sendDashboardAccess(phone);

  return;
}
if (isOrderTrackingRequest(rawText)) {
  console.log("📦 ORDER TRACKING REQUEST NO BOT:", {
    phone,
    rawText,
  });

  await sendOrderTrackingReply(phone, rawText);

  return;
}
const phoneVariants =
  getPhoneVariants(phone);

const { data: existingLeads, error } =
  await supabase
    .from("lead_leads")
    .select(`
      id,
      status,
      source,
      whatsapp,
      telefone,
      created_at,
      lead_conversations (
        id,
        status,
        created_at
      )
    `)
    .in(
      "phone_digits",
      phoneVariants
    )
    .in("source", [
      "whatsapp_button_showcase",
      "prospection",
      "google_maps",
    ])
    .neq("status", "closed")
    .order("created_at", {
      ascending: false,
    });

const normalizedLeads =
  (existingLeads || []).filter(
    (lead) => {
      const leadPhones = [
        lead.whatsapp,
        lead.telefone,
      ]
        .filter(Boolean)
        .map((p) =>
          String(p).replace(/\D/g, "")
        );

      return phoneVariants.some(
        (variant) =>
          leadPhones.includes(
            variant
          )
      );
    }
  );

if (error) {
  console.error("❌ erro ao buscar lead de vendas:", error);
}

const existingLead =
  normalizedLeads?.find((lead) =>
    lead.lead_conversations?.some((c) => c.status === "open")
  ) ||
  normalizedLeads?.[0] ||
  null;

const activeConversation =
  existingLead?.lead_conversations?.find(
    (c) => c.status === "open"
  ) ||
  existingLead?.lead_conversations?.[0] ||
  null;

const activeConversationId =
  activeConversation?.id || null;

  

    

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