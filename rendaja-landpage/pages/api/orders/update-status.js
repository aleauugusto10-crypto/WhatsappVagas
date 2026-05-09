import { supabase } from "../../../src/lib/supabase";

function onlyDigits(value = "") {
  return String(value || "").replace(/\D/g, "");
}

function normalizeBRPhone(phone = "") {
  let digits = onlyDigits(phone);

  if (!digits) return "";

  if (!digits.startsWith("55")) digits = `55${digits}`;

  const country = digits.slice(0, 2);
  const ddd = digits.slice(2, 4);
  let number = digits.slice(4);

  if (country === "55" && ddd.length === 2 && number.length === 8) {
    number = `9${number}`;
  }

  return `${country}${ddd}${number}`;
}

async function sendText(phone, text) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    console.error("❌ WHATSAPP_TOKEN ou WHATSAPP_PHONE_NUMBER_ID ausente");
    return null;
  }

  const response = await fetch(
    `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: phone,
        type: "text",
        text: {
          body: text,
        },
      }),
    }
  );

  const json = await response.json().catch(() => null);

  if (!response.ok) {
    console.error("❌ Erro ao enviar WhatsApp:", json);
  }

  return json;
}

function buildStatusMessage({ order, profile, status }) {
  const customerName = order.customer_name || "tudo bem";
  const companyName = profile?.nome || "a empresa";

  if (status === "confirmed") {
    return `Olá, ${customerName}! ✅

Seu pedido em ${companyName} foi recebido com sucesso e já está em atendimento. 🤝

Em alguns instantes, um atendente da loja poderá entrar em contato por WhatsApp para confirmar os detalhes e dar continuidade ao seu pedido.

Fique atento às próximas mensagens 📲`;
  }

  if (status === "cancelled") {
    return `Olá, ${customerName}.

Seu pedido em ${companyName} foi cancelado.

Caso tenha alguma dúvida, responda esta mensagem.`;
  }

  if (status === "delivered") {
    return `Olá, ${customerName}! ✅

Seu pedido em ${companyName} foi finalizado com sucesso.

Obrigado pela preferência!`;
  }

  return `Olá, ${customerName}.

Seu pedido em ${companyName} foi atualizado para: ${status}.`;
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Método não permitido." });
    }

    const { orderId, status } = req.body || {};

    if (!orderId || !status) {
      return res.status(400).json({
        error: "orderId e status são obrigatórios.",
      });
    }

    const allowedStatus = ["pending", "confirmed", "delivered", "cancelled"];

    if (!allowedStatus.includes(status)) {
      return res.status(400).json({
        error: "Status inválido.",
      });
    }

    const { data: order, error: orderError } = await supabase
      .from("profile_orders")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId)
      .select("*")
      .single();

    if (orderError) throw orderError;

    const { data: profile, error: profileError } = await supabase
      .from("profiles_pages")
      .select("id, nome, whatsapp")
      .eq("id", order.profile_page_id)
      .maybeSingle();

    if (profileError) throw profileError;

    const customerPhone = normalizeBRPhone(order.customer_phone);

    if (customerPhone && ["confirmed", "cancelled", "delivered"].includes(status)) {
      await sendText(
        customerPhone,
        buildStatusMessage({
          order,
          profile,
          status,
        })
      );
    }

    return res.status(200).json({
      ok: true,
      order,
    });
  } catch (err) {
    console.error("❌ orders/update-status:", err);
    return res.status(500).json({
      error: err.message || "Erro ao atualizar pedido.",
    });
  }
}