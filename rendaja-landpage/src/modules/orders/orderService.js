import { supabase } from "../../lib/supabase";

export async function getProfileOrders(profilePageId) {
  if (!profilePageId) return [];

  const { data, error } = await supabase
    .from("profile_orders")
    .select("*")
    .eq("profile_page_id", profilePageId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("❌ getProfileOrders:", error);
    return [];
  }

  return data || [];
}

export async function getOrderById(orderId) {
  if (!orderId) return null;

  const { data, error } = await supabase
    .from("profile_orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();

  if (error) {
    console.error("❌ getOrderById:", error);
    return null;
  }

  return data || null;
}

export async function updateOrder(orderId, updates = {}) {
  const { data, error } = await supabase
    .from("profile_orders")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .select()
    .single();

  if (error) {
    console.error("❌ updateOrder:", error);
    throw error;
  }

  return data;
}