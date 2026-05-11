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

  if (!token || !phoneNumberId || !phone) return null;

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

        text: { body: text },

      }),

    }

  );

  const json = await response.json().catch(() => null);

  if (!response.ok) console.error("❌ Erro ao enviar WhatsApp:", json);

  return json;

}

function buildStatusMessage({ order, profile, status }) {

  const customerName = order.customer_name || "tudo bem";

  const companyName = profile?.nome || "a empresa";

  if (status === "confirmed") {

    return `Olá, ${customerName}! ✅

Seu pedido em ${companyName} foi recebido com sucesso e já está em atendimento. 🤝

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

function getReservableItems(order = {}) {

  const reservedItems = Array.isArray(order.reserved_items)

    ? order.reserved_items

    : [];

  if (reservedItems.length > 0) return reservedItems;

  return Array.isArray(order.items)

    ? order.items.filter(

        (item) =>

          item.type === "product" &&

          item.stock_mode === "quantity" &&

          item.stock_enabled === true &&

          Number(item.qty || 0) > 0

      )

    : [];

}

async function updateReservedStock(order, action) {

  const reservableItems = getReservableItems(order);

  if (reservableItems.length === 0) {

    return null;

  }

  const { data: profile, error } = await supabase

    .from("profiles_pages")

    .select("id, store_items")

    .eq("id", order.profile_page_id)

    .single();

  if (error || !profile) {

    throw new Error("Perfil não encontrado para atualizar estoque.");

  }

  const storeItems = Array.isArray(profile.store_items)

    ? profile.store_items

    : [];

  const updatedStoreItems = storeItems.map((storeItem) => {

    const orderedItem = reservableItems.find(

      (item) => String(item.id) === String(storeItem.id)

    );

    if (!orderedItem) return storeItem;

    const qty = Number(orderedItem.qty || 0);

    const reservedQty = Number(storeItem.reserved_qty || 0);

    const soldQty = Number(storeItem.sold_qty || 0);

    const stockQty = Number(storeItem.stock_qty || 0);

    let nextReservedQty = reservedQty;

    let nextSoldQty = soldQty;

    if (action === "cancelled") {

      nextReservedQty = Math.max(0, reservedQty - qty);

    }

    if (action === "delivered") {

      nextReservedQty = Math.max(0, reservedQty - qty);

      nextSoldQty = soldQty + qty;

    }

    const availableQty = Math.max(0, stockQty - nextReservedQty - nextSoldQty);

    return {

      ...storeItem,

      reserved_qty: nextReservedQty,

      sold_qty: nextSoldQty,

      in_stock: availableQty > 0,

    };

  });

  const { error: updateError } = await supabase

    .from("profiles_pages")

    .update({

      store_items: updatedStoreItems,

      updated_at: new Date().toISOString(),

    })

    .eq("id", order.profile_page_id);

  if (updateError) {

    throw new Error(updateError.message);

  }

  return updatedStoreItems;

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

    const { data: currentOrder, error: currentOrderError } = await supabase

      .from("profile_orders")

      .select("*")

      .eq("id", orderId)

      .single();

    if (currentOrderError || !currentOrder) {

      throw new Error("Pedido não encontrado.");

    }

    const canMoveReservedStock =

      currentOrder.stock_reserved === true &&

      currentOrder.stock_status === "reserved";

    let updatedStoreItems = null;

    let nextStockStatus = currentOrder.stock_status || "none";

    let nextStockReserved = currentOrder.stock_reserved === true;

    if (status === "cancelled" && canMoveReservedStock) {

      updatedStoreItems = await updateReservedStock(currentOrder, "cancelled");

      nextStockStatus = "cancelled";

      nextStockReserved = false;

    }

    if (status === "delivered" && canMoveReservedStock) {

      updatedStoreItems = await updateReservedStock(currentOrder, "delivered");

      nextStockStatus = "completed";

      nextStockReserved = false;

    }

    const { data: order, error: orderError } = await supabase

      .from("profile_orders")

      .update({

        status,

        stock_status: nextStockStatus,

        stock_reserved: nextStockReserved,

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

    if (

      customerPhone &&

      ["confirmed", "cancelled", "delivered"].includes(status)

    ) {

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

      updated_store_items: updatedStoreItems,

    });

  } catch (err) {

    console.error("❌ orders/update-status:", err);

    return res.status(500).json({

      error: err.message || "Erro ao atualizar pedido.",

    });

  }

}