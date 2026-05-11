import { supabase } from "./supabase";

export async function getAiCreditWallet(userId) {
  if (!userId) return { credits: 0 };

  const { data, error } = await supabase
    .from("ai_credit_wallets")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Erro ao buscar créditos:", error);
    return { credits: 0 };
  }

  return data || { credits: 0 };
}

export async function getAiGeneratedAssets(userId) {
  if (!userId) return [];

  const { data, error } = await supabase
    .from("ai_generated_assets")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erro ao buscar galeria IA:", error);
    return [];
  }

  return data || [];
}