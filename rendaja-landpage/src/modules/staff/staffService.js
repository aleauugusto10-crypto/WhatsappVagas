import { supabase } from "../../../src/lib/supabase";
import { getDefaultPermissions } from "../permissions/rolePermissions";

export async function getProfileStaff(profilePageId) {
  const { data, error } = await supabase
    .from("profile_staff")
    .select("*")
    .eq("profile_page_id", profilePageId)
    .eq("ativo", true)
    .order("nome");

  if (error) {
    console.error("❌ getProfileStaff:", error);
    return [];
  }

  return data || [];
}

export async function createStaff({
  profilePageId,
  nome,
  telefone,
  email,
  role = "staff",
  commissionType = "none",
  commissionValue = 0,
}) {
  const permissions = getDefaultPermissions(role);

  const payload = {
    profile_page_id: profilePageId,

    nome,
    telefone,
    email,

    role,

    commission_type: commissionType,
    commission_value: commissionValue,

    ...permissions,
  };

  const { data, error } = await supabase
    .from("profile_staff")
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error("❌ createStaff:", error);
    throw error;
  }

  return data;
}

export async function updateStaff(staffId, updates = {}) {
  const { data, error } = await supabase
    .from("profile_staff")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", staffId)
    .select()
    .single();

  if (error) {
    console.error("❌ updateStaff:", error);
    throw error;
  }

  return data;
}

export async function disableStaff(staffId) {
  return updateStaff(staffId, {
    ativo: false,
  });
}

export async function getStaffById(staffId) {
  const { data, error } = await supabase
    .from("profile_staff")
    .select("*")
    .eq("id", staffId)
    .maybeSingle();

  if (error) {
    console.error("❌ getStaffById:", error);
    return null;
  }

  return data || null;
}