import { supabase } from "../../lib/supabase";
import { createFinanceEntryFromOrder } from "../finance/financeService";

export async function closeOrderWithPayment({
  order,
  finalAmount,
  paymentMethod = "manual",
  paidAt = new Date().toISOString(),
  receivedByStaffId = null,
  receivedByStaffName = null,
}) {
  if (!order?.id) {
    throw new Error("Pedido inválido.");
  }

  const amount = Number(finalAmount || order.total || 0);

  if (amount <= 0) {
    throw new Error("Informe um valor válido para finalizar o pedido.");
  }

  const { data: updatedOrder, error } = await supabase
    .from("profile_orders")
    .update({
      status: "paid",
      total: amount,
      final_amount: amount,
      payment_method: paymentMethod,
      paid_at: paidAt,
      received_by_staff_id: receivedByStaffId,
      received_by_staff_name: receivedByStaffName,
      updated_at: new Date().toISOString(),
    })
    .eq("id", order.id)
    .select()
    .single();

  if (error) {
    console.error("❌ closeOrderWithPayment:", error);
    throw error;
  }

  await createFinanceEntryFromOrder(updatedOrder);

  return updatedOrder;
}