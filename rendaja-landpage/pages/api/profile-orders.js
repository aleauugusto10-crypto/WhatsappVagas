import { supabase } from "../../src/lib/supabase";
import { notifyStaffNewOrder } from "../../src/lib/staffNotifications.js";

async function sendText(phone, text) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    console.error("❌ WHATSAPP_TOKEN ou WHATSAPP_PHONE_NUMBER_ID ausente");
    return null;
  }

  const res = await fetch(
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

  const data = await res.json().catch(() => null);
  if (!res.ok) console.error("❌ Erro WhatsApp:", data);
  return data;
}

function money(value = 0) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

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

function buildItemLines(items = []) {
  if (!Array.isArray(items) || items.length === 0) {
    return "Itens não informados";
  }

  return items
    .map((item) => {
      const qty = Number(item.qty || 1);
      const price =
        item.price_type === "quote"
          ? "Sob orçamento"
          : money(Number(item.price || 0) * qty);

      let line = `• ${qty}x ${item.title || "Item"} — ${price}`;

      if (Array.isArray(item.selected_variants)) {
        item.selected_variants.forEach((variant) => {
          line += `\n   ↳ ${variant.variant_name}: ${variant.label}`;
        });
      }

      return line;
    })
    .join("\n");
}

async function findAffiliateStaff(profilePageId, affiliateRef = "") {
  const ref = String(affiliateRef || "").trim();
  if (!profilePageId || !ref) return null;

  const { data, error } = await supabase
    .from("profile_staff")
    .select("*")
    .eq("profile_page_id", profilePageId)
    .eq("ativo", true)
    .or(`affiliate_code.eq.${ref},affiliate_slug.eq.${ref}`)
    .maybeSingle();

  if (error) {
    console.error("❌ erro ao buscar afiliado:", error);
    return null;
  }

  return data || null;
}

function reserveStockOnProfile(profile, orderItems = []) {
  const storeItems = Array.isArray(profile?.store_items)
    ? profile.store_items
    : [];

  const cartItems = Array.isArray(orderItems) ? orderItems : [];

  console.log("🧪 PROFILE STORE ITEMS:", JSON.stringify(storeItems, null, 2));
  console.log("🧪 ORDER ITEMS RECEBIDOS:", JSON.stringify(cartItems, null, 2));

  const reservedItems = [];

  const updatedStoreItems = storeItems.map((storeItem) => {
    const orderItem = cartItems.find(
      (item) => String(item.id) === String(storeItem.id)
    );

    if (!orderItem) return storeItem;

    const isControlledProduct =
      storeItem.type === "product" &&
      storeItem.stock_enabled === true &&
      storeItem.stock_mode === "quantity";

    if (!isControlledProduct) return storeItem;

    const qtyRequested = Number(orderItem.qty || 0);
    if (qtyRequested <= 0) return storeItem;

    const stockQty = Number(storeItem.stock_qty || 0);
    const reservedQty = Number(storeItem.reserved_qty || 0);
    const soldQty = Number(storeItem.sold_qty || 0);

    const availableQty = Math.max(0, stockQty - reservedQty - soldQty);

    console.log("🧪 CHECANDO ESTOQUE:", {
      id: storeItem.id,
      title: storeItem.title,
      stockQty,
      reservedQty,
      soldQty,
      availableQty,
      qtyRequested,
    });

    if (availableQty < qtyRequested) {
      throw new Error(
        `Estoque insuficiente para "${storeItem.title || "Produto"}". Disponível: ${availableQty}.`
      );
    }

    const nextReservedQty = reservedQty + qtyRequested;
    const nextAvailableQty = Math.max(0, stockQty - nextReservedQty - soldQty);

    reservedItems.push({
      id: storeItem.id,
      title: storeItem.title || orderItem.title || "Produto",
      qty: qtyRequested,
    });

    return {
      ...storeItem,
      reserved_qty: nextReservedQty,
      sold_qty: soldQty,
      in_stock: nextAvailableQty > 0,
    };
  });

  console.log("🧪 ITENS RESERVADOS:", JSON.stringify(reservedItems, null, 2));
  console.log("🧪 ESTOQUE DEPOIS:", JSON.stringify(updatedStoreItems, null, 2));

  return {
    ok: true,
    updatedStoreItems,
    reservedItems,
  };
}

async function saveStoreItems(profilePageId, storeItems) {
  const { error } = await supabase
    .from("profiles_pages")
    .update({
      store_items: storeItems,
      updated_at: new Date().toISOString(),
    })
    .eq("id", profilePageId);

  if (error) {
    throw new Error(error.message || "Erro ao atualizar estoque.");
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido." });
  }

  try {
    const {
      profile_page_id,
      customer_name,
      customer_phone,
      note,
      items,
      total,
      has_quote,
      affiliate_ref = "",
      source_ref = "",
      source_channel = "whatsapp_automation",
      automation_status = "waiting_owner_confirmation",
      profile_owner_name = "",
      profile_owner_phone = "",
    } = req.body || {};

    if (!profile_page_id) {
      return res.status(400).json({ error: "Perfil não informado." });
    }

    if (!customer_name || !customer_phone) {
      return res.status(400).json({ error: "Dados do cliente incompletos." });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles_pages")
      .select("id, nome, whatsapp, user_id, store_items")
      .eq("id", profile_page_id)
      .maybeSingle();

    if (profileError || !profile) {
      return res.status(404).json({ error: "Perfil não encontrado." });
    }

    const cleanCustomerPhone = normalizeBRPhone(customer_phone);
    const cleanOwnerPhone = normalizeBRPhone(
      profile_owner_phone || profile.whatsapp
    );

    const finalAffiliateRef = String(affiliate_ref || source_ref || "").trim();
    const affiliateStaff = await findAffiliateStaff(
      profile_page_id,
      finalAffiliateRef
    );

    const finalSourceChannel = affiliateStaff
      ? "affiliate_link"
      : source_channel || "whatsapp_automation";

    let stockReservation = {
      updatedStoreItems: profile.store_items || [],
      reservedItems: [],
    };

    try {
      stockReservation = reserveStockOnProfile(profile, items);
      await saveStoreItems(profile_page_id, stockReservation.updatedStoreItems);
    } catch (stockError) {
      console.error("❌ ERRO AO RESERVAR ESTOQUE:", stockError);
      return res.status(400).json({
        error: stockError.message || "Não foi possível reservar o estoque.",
      });
    }

    const reservedItems = stockReservation?.reservedItems || [];
    const hasReservedStock = reservedItems.length > 0;

    const { data: order, error } = await supabase
      .from("profile_orders")
      .insert({
        profile_page_id,
        customer_name: String(customer_name || "").trim(),
        customer_phone: cleanCustomerPhone,
        note: String(note || "").trim(),
        items: Array.isArray(items) ? items : [],
        total: Number(total || 0),
        has_quote: !!has_quote,
        status: "pending",

        stock_reserved: hasReservedStock,
        reserved_items: reservedItems,
        stock_status: hasReservedStock ? "reserved" : "none",

        source_channel: finalSourceChannel,
        source_ref: finalAffiliateRef || null,
        automation_status,

        seller_staff_id: affiliateStaff?.id || null,
        seller_staff_name: affiliateStaff?.nome || null,
        assigned_staff_id: affiliateStaff?.id || null,
        staff_id: affiliateStaff?.id || null,

        profile_owner_name: profile_owner_name || profile.nome || "",
        profile_owner_phone: cleanOwnerPhone,

        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("❌ Erro ao salvar pedido:", error);

      return res.status(500).json({
        error: error.message || "Erro ao salvar pedido.",
      });
    }

    if (cleanOwnerPhone) {
      await sendText(
        cleanOwnerPhone,
        `🔔 *Novo pedido recebido!*\n\n` +
          `🧾 Pedido: ${order.id}\n` +
          `📌 Página: ${profile.nome || "Perfil profissional"}\n\n` +
          `👤 Cliente: ${customer_name}\n` +
          `📞 WhatsApp: ${cleanCustomerPhone}\n\n` +
          `${
            affiliateStaff
              ? `🔗 Indicado por: *${affiliateStaff.nome || "Funcionário"}*\n\n`
              : ""
          }` +
          `🛍️ *Itens do pedido:*\n\n` +
          `${buildItemLines(items)}\n\n` +
          `💰 Total: ${
            has_quote ? `Sob orçamento / parcial ${money(total)}` : money(total)
          }\n` +
          `${note ? `\n📝 Observação:\n${note}\n` : ""}` +
          `Acesse o painel CompreTudo.shop para confirmar ou finalizar esse pedido.`
      );
    }

    await notifyStaffNewOrder(order);

    if (cleanCustomerPhone) {
      await sendText(
        cleanCustomerPhone,
        `✨ *Recebemos sua solicitação!*\n\n` +
          `Seu pedido foi enviado com sucesso para:\n` +
          `🏪 ${profile.nome || "a loja"}\n\n` +
          `🧾 Código do pedido:\n${order.id}\n\n` +
          `Agora é só aguardar a confirmação.\n\n` +
          `Você receberá atualizações automáticas diretamente aqui no WhatsApp. 💬`
      );
    }

   return res.status(200).json({
  ok: true,
  order,
  updated_store_items: stockReservation.updatedStoreItems,
  debug_stock: {
    stock_reserved: hasReservedStock,
    reserved_items: reservedItems,
  },
});
  } catch (err) {
    console.error("❌ Erro geral profile-orders:", err);

 
  }
}