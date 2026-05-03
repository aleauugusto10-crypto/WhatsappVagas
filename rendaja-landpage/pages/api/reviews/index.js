import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const { profile_id, name, rating, comment } = req.body || {};

  if (!profile_id || !name || !comment) {
    return res.status(400).json({ error: "Dados obrigatórios ausentes" });
  }

  try {
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles_pages")
      .select("reviews_require_approval")
      .eq("id", profile_id)
      .maybeSingle();

    if (profileError) {
      console.error("Erro ao buscar configuração de avaliações:", profileError);
      return res.status(500).json({ error: profileError.message });
    }

    const status =
      profile?.reviews_require_approval === false ? "approved" : "pending";

    const { data, error } = await supabaseAdmin
      .from("profile_reviews")
      .insert({
        profile_id,
        name: String(name).trim(),
        rating: Number(rating || 5),
        comment: String(comment).trim(),
        is_verified: false,
        status,
      })
      .select()
      .single();

    if (error) {
      console.error("Erro Supabase POST review:", error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(201).json(data);
  } catch (err) {
    console.error("Erro geral POST review:", err);
    return res.status(500).json({ error: "Erro interno ao enviar avaliação" });
  }
}