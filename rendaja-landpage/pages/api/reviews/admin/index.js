import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  const { profileId } = req.query;

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  if (!profileId) {
    return res.status(400).json({ error: "profileId obrigatório" });
  }

  const { data, error } = await supabaseAdmin
    .from("profile_reviews")
    .select("id,profile_id,name,rating,comment,is_verified,status,created_at")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erro Supabase admin reviews:", error);
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json(data || []);
}