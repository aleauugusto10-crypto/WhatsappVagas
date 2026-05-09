import { supabase } from "../../../src/lib/supabase";

async function sendText(phone, text) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId =
    process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    console.error("WhatsApp não configurado");
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

  return response.json().catch(() => null);
}

function onlyDigits(value = "") {
  return String(value || "").replace(/\D/g, "");
}

function normalizeBRPhone(phone = "") {
  let digits = onlyDigits(phone);

  if (!digits) return "";

  if (!digits.startsWith("55")) {
    digits = `55${digits}`;
  }

  const country = digits.slice(0, 2);
  const ddd = digits.slice(2, 4);

  let number = digits.slice(4);

  if (
    country === "55" &&
    ddd.length === 2 &&
    number.length === 8
  ) {
    number = `9${number}`;
  }

  return `${country}${ddd}${number}`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Método não permitido",
    });
  }

  try {
    const {
      order_id,
      confirmed_by_name = "",
    } = req.body || {};

    if (!order_id) {
      return res.status(400).json({
        error: "Pedido não informado",
      });
    }

    /*
      =====================================
      BUSCA PEDIDO
      =====================================
    */

    const { data: order, error: orderError } =
      await supabase
        .from("profile_orders")
        .select("*")
        .eq("id", order_id)
        .maybeSingle();

    if (orderError || !order) {
      return res.status(404).json({
        error: "Pedido não encontrado",
      });
    }

    /*
      =====================================
      ATUALIZA STATUS
      =====================================
    */

    const { error: updateError } =
      await supabase
        .from("profile_orders")
        .update({
          status: "confirmed",
          automation_status: "confirmed",
          confirmed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", order.id);

    if (updateError) {
      console.error(updateError);

      return res.status(500).json({
        error: "Erro ao confirmar pedido",
      });
    }

    /*
      =====================================
      ENVIA WHATSAPP CLIENTE
      =====================================
    */

    const customerPhone =
      normalizeBRPhone(order.customer_phone);

    if (customerPhone) {
      await sendText(
        customerPhone,

        `✅ *Seu pedido foi confirmado!*\n\n` +

          `🧾 Pedido: ${order.id}\n\n` +

          `Sua solicitação já foi aprovada e está sendo preparada.\n\n` +

          `Você continuará recebendo atualizações automáticas aqui no WhatsApp. 💬\n\n` +

          `${
            confirmed_by_name
              ? `👤 Confirmado por: ${confirmed_by_name}`
              : ""
          }`
      );
    }

    return res.status(200).json({
      ok: true,
    });

  } catch (err) {

    console.error(err);

    return res.status(500).json({
      error: "Erro interno",
    });
  }
}