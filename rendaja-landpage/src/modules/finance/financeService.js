import { supabase } from "../../lib/supabase";

export async function createFinanceEntry({
  profilePageId,
  orderId = null,
  staffId = null,
  staffName = null,
  type = "income",
  description = "",
  amount = 0,
  paymentMethod = "manual",
  status = "paid",
}) {
  const payload = {
    profile_page_id: profilePageId,
    order_id: orderId,
    staff_id: staffId,
    staff_name: staffName,
    type,
    description,
    amount: Number(amount || 0),
    payment_method: paymentMethod,
    status,
  };

  const { data, error } = await supabase
    .from("profile_finance_entries")
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error("❌ createFinanceEntry:", error);
    throw error;
  }

  return data;
}

export async function createFinanceEntryFromOrder(order) {
  if (!order) return null;

  return createFinanceEntry({
    profilePageId: order.profile_page_id,
    orderId: order.id,

    staffId: order.assigned_staff_id,
    staffName: order.assigned_staff_name,

    type: "income",

    description:
      order.customer_name ||
      "Pedido finalizado",

    amount:
      order.final_amount ||
      order.total ||
      0,

    paymentMethod:
      order.payment_method ||
      "manual",

    status: "paid",
  });
}

export async function getFinanceEntries(profilePageId) {
  const { data, error } = await supabase
    .from("profile_finance_entries")
    .select("*")
    .eq("profile_page_id", profilePageId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("❌ getFinanceEntries:", error);
    return [];
  }

  return data || [];
}