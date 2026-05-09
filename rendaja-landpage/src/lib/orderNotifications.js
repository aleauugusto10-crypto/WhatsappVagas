import { sendText } from "../services/whatsapp.js";

function normalizePhone(phone = "") {
  let digits = String(phone || "").replace(/\D/g, "");

  if (!digits) return "";

  if (!digits.startsWith("55")) {
    digits = `55${digits}`;
  }

  return digits;
}

function money(value = 0) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export async function notifyCustomerOrderStatus(order, status) {
  try {
    const phone = normalizePhone(order.customer_phone);

    if (!phone) return;

    const customerName =
      order.customer_name || "cliente";

    const totalText =
      order.has_quote
        ? "Sob orçamento"
        : money(order.total || 0);

    if (status === "confirmed") {
      return sendText(
        phone,
        `✅ *Pedido confirmado!*\n\n` +
          `Olá, ${customerName}.\n\n` +
          `Seu pedido foi confirmado e já está sendo preparado.\n\n` +
          `💰 Total: ${totalText}`
      );
    }

    if (status === "cancelled") {
      return sendText(
        phone,
        `❌ *Pedido cancelado*\n\n` +
          `Olá, ${customerName}.\n\n` +
          `Seu pedido foi cancelado.\n\n` +
          `Se tiver dúvidas, fale com o estabelecimento.`
      );
    }

    if (status === "delivered") {
      return sendText(
        phone,
        `🚚 *Pedido finalizado!*\n\n` +
          `Olá, ${customerName}.\n\n` +
          `Seu pedido foi finalizado com sucesso.\n\n` +
          `Obrigado pela preferência ❤️`
      );
    }
  } catch (err) {
    console.error("❌ notifyCustomerOrderStatus:", err);
  }
}