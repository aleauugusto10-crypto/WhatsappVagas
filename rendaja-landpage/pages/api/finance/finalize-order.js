import { supabaseAdmin } from "../../../src/lib/supabaseAdmin";

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

    const itemName =
      items[0]?.title ||
      items[0]?.name ||
      "Pedido";
console.log("🔥 FINALIZANDO PEDIDO:", {
  orderId,
  finalAmount,
  payment_method,
});

console.log("🔥 PEDIDO ENCONTRADO:", {
  id: order.id,
  profile_page_id: order.profile_page_id,
});
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
      error: "Erro interno ao finalizar pedido.",
    });
  }
}