import { supabase } from "../../lib/supabase";

export const ORDER_STATUS = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
  PAID: "paid",
};

export function orderStatusLabel(status) {
  if (status === "confirmed") return "Confirmado";
  if (status === "delivered") return "Entregue";
  if (status === "cancelled") return "Cancelado";
  if (status === "paid") return "Pago";
  return "Pendente";
}

export async function updateOrderStatus(orderId, status, extra = {}) {
  const { data, error } = await supabase
    .from("profile_orders")
    .update({
      status,
      ...extra,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .select()
    .single();

  if (error) {
    console.error("❌ updateOrderStatus:", error);
    throw error;
  }

  return data;
}