import { supabase } from "../../../src/lib/supabase";

/**
 * Busca funcionários permitidos para um item.
 * Se o item estiver marcado como "todos", retorna todos os ativos.
 */
export async function getEligibleStaffForItem({
  profilePageId,
  itemId,
  allowAllStaff = false,
}) {
  if (!profilePageId) return [];

  if (allowAllStaff) {
    const { data, error } = await supabase
      .from("profile_staff")
      .select("*")
      .eq("profile_page_id", profilePageId)
      .eq("ativo", true)
      .order("nome");

    if (error) {
      console.error("❌ getEligibleStaffForItem all:", error);
      return [];
    }

    return data || [];
  }

  const { data, error } = await supabase
    .from("profile_item_staff")
    .select(`
      *,
      profile_staff (*)
    `)
    .eq("profile_page_id", profilePageId)
    .eq("item_id", itemId);

  if (error) {
    console.error("❌ getEligibleStaffForItem item:", error);
    return [];
  }

  return (data || [])
    .map((row) => row.profile_staff)
    .filter((staff) => staff?.ativo === true);
}

/**
 * Distribuição simples e justa:
 * escolhe o funcionário com menos pedidos pendentes/confirmados.
 */
export async function chooseStaffForOrder({
  profilePageId,
  itemId,
  allowAllStaff = false,
}) {
  const staffList = await getEligibleStaffForItem({
    profilePageId,
    itemId,
    allowAllStaff,
  });

  if (staffList.length === 0) return null;

  const staffIds = staffList.map((staff) => staff.id);

  const { data: orders, error } = await supabase
    .from("profile_orders")
    .select("assigned_staff_id,status")
    .eq("profile_page_id", profilePageId)
    .in("assigned_staff_id", staffIds)
    .in("status", ["pending", "confirmed"]);

  if (error) {
    console.error("❌ chooseStaffForOrder orders:", error);
    return staffList[0];
  }

  const countMap = new Map();

  staffIds.forEach((id) => countMap.set(id, 0));

  (orders || []).forEach((order) => {
    if (!order.assigned_staff_id) return;

    countMap.set(
      order.assigned_staff_id,
      (countMap.get(order.assigned_staff_id) || 0) + 1
    );
  });

  const sorted = [...staffList].sort((a, b) => {
    const countA = countMap.get(a.id) || 0;
    const countB = countMap.get(b.id) || 0;

    if (countA !== countB) return countA - countB;

    return String(a.nome || "").localeCompare(String(b.nome || ""));
  });

  return sorted[0] || null;
}