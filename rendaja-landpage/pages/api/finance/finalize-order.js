import { supabaseAdmin } from "../../../src/lib/supabaseAdmin";

function getReservableItems(order = {}) {
  const reservedItems = Array.isArray(order.reserved_items)
    ? order.reserved_items
    : [];

  if (reservedItems.length > 0) return reservedItems;

  const items = Array.isArray(order.items) ? order.items : [];

  return items.filter(
    (item) =>
      item.type === "product" &&
      item.stock_mode === "quantity" &&
      item.stock_enabled === true &&
      Number(item.qty || 0) > 0
  );
}

async function finalizeReservedStock(order) {
  if (!order?.profile_page_id) return;

  if (order.stock_status === "completed") return;

  const reservableItems = getReservableItems(order);
  if (reservableItems.length === 0) return;

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles_pages")
    .select("id, store_items")
    .eq("id", order.profile_page_id)
    .maybeSingle();

  if (profileError || !profile) {
    throw new Error("Perfil não encontrado para atualizar estoque.");
  }

  const storeItems = Array.isArray(profile.store_items)
    ? profile.store_items
    : [];

  const updatedStoreItems = storeItems.map((storeItem) => {
    const reservedItem = reservableItems.find(
      (item) => String(item.id) === String(storeItem.id)
    );

    if (!reservedItem) return storeItem;

    const qty = Number(reservedItem.qty || 0);

    const stockQty = Number(storeItem.stock_qty || 0);
    const reservedQty = Number(storeItem.reserved_qty || 0);
    const soldQty = Number(storeItem.sold_qty || 0);

    const nextReservedQty = Math.max(0, reservedQty - qty);
    const nextSoldQty = soldQty + qty;

    const availableQty = Math.max(
      0,
      stockQty - nextReservedQty - nextSoldQty
    );

    return {
      ...storeItem,
      reserved_qty: nextReservedQty,
      sold_qty: nextSoldQty,
      in_stock: availableQty > 0,
    };
  });

  const { error: updateStockError } = await supabaseAdmin
    .from("profiles_pages")
    .update({
      store_items: updatedStoreItems,
      updated_at: new Date().toISOString(),
    })
    .eq("id", order.profile_page_id);

  if (updateStockError) {
    throw new Error(updateStockError.message || "Erro ao atualizar estoque.");
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Método não permitido.",
    });
  }

  try {
    const { orderId, amount, payment_method, note } = req.body || {};

    if (!orderId) {
      return res.status(400).json({
        error: "Pedido não informado.",
      });
    }

    const finalAmount = Number(amount || 0);

    if (!finalAmount || finalAmount <= 0) {
      return res.status(400).json({
        error: "Valor recebido inválido.",
      });
    }

    const { data: order, error: orderError } = await supabaseAdmin
      .from("profile_orders")
      .select("*")
      .eq("id", orderId)
      .maybeSingle();

    if (orderError || !order) {
      return res.status(404).json({
        error: "Pedido não encontrado.",
      });
    }

    const { data: existingMovement } = await supabaseAdmin
      .from("finance_movements")
      .select("id")
      .eq("source_type", "order")
      .eq("source_id", order.id)
      .maybeSingle();

    if (existingMovement) {
      return res.status(409).json({
        error: "Esse pedido já foi lançado no financeiro.",
      });
    }

    const items = Array.isArray(order.items) ? order.items : [];

    const itemName = items[0]?.title || items[0]?.name || "Pedido";

    console.log("🔥 FINALIZANDO PEDIDO:", {
      orderId,
      finalAmount,
      payment_method,
    });

    console.log("🔥 PEDIDO ENCONTRADO:", {
      id: order.id,
      profile_page_id: order.profile_page_id,
      stock_status: order.stock_status,
      stock_reserved: order.stock_reserved,
      reserved_items: order.reserved_items,
    });

    await finalizeReservedStock(order);

    const { data: movement, error: movementError } = await supabaseAdmin
      .from("finance_movements")
      .insert({
        profile_page_id: order.profile_page_id,
        source_type: "order",
        source_id: order.id,
        type: "income",
        amount: finalAmount,
        payment_method: payment_method || "pix",
        description: `Pedido finalizado - ${itemName}`,
        note: note || null,
        staff_id: order.staff_id || order.assigned_staff_id || null,
        staff_name: order.staff_name || order.assigned_staff_name || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (movementError) {
      console.error("Erro ao criar movimentação:", movementError);

      return res.status(500).json({
        error: movementError.message || "Erro ao criar movimentação.",
      });
    }

    const { error: updateError } = await supabaseAdmin
      .from("profile_orders")
      .update({
        status: "delivered",
        payment_status: "paid",
        paid_amount: finalAmount,
        payment_method: payment_method || "pix",
        paid_at: new Date().toISOString(),

        stock_reserved: false,
        stock_status: "completed",

        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id);

    if (updateError) {
      console.error("Erro ao atualizar pedido:", updateError);

      return res.status(500).json({
        error: updateError.message || "Movimento criado, mas pedido não atualizou.",
      });
    }

    return res.status(200).json({
      ok: true,
      movement,
    });
  } catch (err) {
    console.error("Erro geral finalize-order:", err);

    return res.status(500).json({
      error: err.message || "Erro interno ao finalizar pedido.",
    });
  }
}