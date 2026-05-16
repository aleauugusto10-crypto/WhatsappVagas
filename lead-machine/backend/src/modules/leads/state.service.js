import { supabase } from "../../supabase.js";

export async function getOrCreateAIState(conversationId) {
  const { data: existing } = await supabase
    .from("lead_ai_state")
    .select("*")
    .eq("conversation_id", conversationId)
    .maybeSingle();

  if (existing) {
    return existing;
  }

  const { data, error } = await supabase
    .from("lead_ai_state")
    .insert({
      conversation_id: conversationId,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateAIState(
  conversationId,
  updates
) {
  const { data, error } = await supabase
    .from("lead_ai_state")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("conversation_id", conversationId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}