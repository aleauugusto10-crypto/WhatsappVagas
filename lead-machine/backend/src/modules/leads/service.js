import { supabase } from "../../supabase.js";

export async function createLead(payload) {
  const { data, error } = await supabase
    .from("lead_leads")
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function getLeads() {
  const { data, error } = await supabase
    .from("lead_leads")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data;
}

export async function getLeadById(leadId) {
  const { data, error } = await supabase
    .from("lead_leads")
    .select("*")
    .eq("id", leadId)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function createConversation(leadId) {
  const { data, error } = await supabase
    .from("lead_conversations")
    .insert({
      lead_id: leadId,
      status: "open",
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function getConversationById(conversationId) {
  const { data, error } = await supabase
    .from("lead_conversations")
    .select("*")
    .eq("id", conversationId)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function getOrCreateConversation(leadId) {
  const { data: existing, error: findError } = await supabase
    .from("lead_conversations")
    .select("*")
    .eq("lead_id", leadId)
    .eq("status", "open")
    .maybeSingle();

  if (findError) {
    throw findError;
  }

  if (existing) {
    return existing;
  }

  return createConversation(leadId);
}

export async function createMessage(payload) {
  const { data, error } = await supabase
    .from("lead_messages")
    .insert({
      conversation_id: payload.conversation_id,
      role: payload.role,
      message: payload.message,
      metadata: payload.metadata || {},
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function getMessages(conversationId) {
  const { data, error } = await supabase
    .from("lead_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return data || [];
}

export async function getConversationMessages(conversationId) {
  return getMessages(conversationId);
}

export async function getReadyToContactLeads(limit = 10) {
  const { data, error } = await supabase
    .from("lead_leads")
    .select("*")
    .eq("status", "ready_to_contact")
    .not("whatsapp", "is", null)
    .neq("whatsapp", "")
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    throw error;
  }

  return data || [];
}

export async function updateLead(leadId, updates) {
  const { data, error } = await supabase
    .from("lead_leads")
    .update(updates)
    .eq("id", leadId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}