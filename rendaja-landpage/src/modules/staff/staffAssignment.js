import { supabase } from "../../../src/lib/supabase";

export async function assignStaffToItem({
  profilePageId,
  staffId,
  itemId,
  itemTitle,
  assignmentType = "allowed",
}) {
  const { data, error } = await supabase
    .from("profile_item_staff")
    .upsert({
      profile_page_id: profilePageId,
      staff_id: staffId,
      item_id: itemId,
      item_title: itemTitle,
      assignment_type: assignmentType,
    })
    .select();

  if (error) {
    console.error("❌ assignStaffToItem:", error);
    throw error;
  }

  return data;
}

export async function getItemStaff(profilePageId, itemId) {
  const { data, error } = await supabase
    .from("profile_item_staff")
    .select(`
      *,
      profile_staff (*)
    `)
    .eq("profile_page_id", profilePageId)
    .eq("item_id", itemId);

  if (error) {
    console.error("❌ getItemStaff:", error);
    return [];
  }

  return data || [];
}

export async function removeItemStaff(profilePageId, staffId, itemId) {
  const { error } = await supabase
    .from("profile_item_staff")
    .delete()
    .eq("profile_page_id", profilePageId)
    .eq("staff_id", staffId)
    .eq("item_id", itemId);

  if (error) {
    console.error("❌ removeItemStaff:", error);
    throw error;
  }

  return true;
}