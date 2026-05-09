import { supabase } from "../../lib/supabase";
import { assignStaffToOrderItems } from "../staff/staffAssignment";

export async function assignOrderItemsToStaff({ orderId, profilePageId, items = [] }) {
  const assignedItems = await assignStaffToOrderItems({
    profilePageId,
    items,
  });

  const firstAssigned = assignedItems.find((item) => item.assigned_staff_id);

  const { data, error } = await supabase
    .from("profile_orders")
    .update({
      items: assignedItems,
      assigned_staff_id: firstAssigned?.assigned_staff_id || null,
      assigned_staff_name: firstAssigned?.assigned_staff_name || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .select()
    .single();

  if (error) {
    console.error("❌ assignOrderItemsToStaff:", error);
    throw error;
  }

  return data;
}