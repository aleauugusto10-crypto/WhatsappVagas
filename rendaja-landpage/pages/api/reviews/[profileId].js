import { supabase } from "../../../src/lib/supabase";

export default async function handler(req, res) {
  const { profileId } = req.query;

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  if (!profileId) {
    return res.status(400).json({ error: "profileId obrigatório" });
  }

  try {
    const { data, error } = await supabase
      .from("profile_reviews")
      .select("id,name,rating,comment,is_verified,status,created_at")
.eq("profile_id", profileId)
.eq("status", "approved")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro Supabase GET reviews:", error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json(data || []);
  } catch (err) {
    console.error("Erro geral GET reviews:", err);
    return res.status(500).json({
      error: "Erro interno ao buscar avaliações",
    });
  }
}