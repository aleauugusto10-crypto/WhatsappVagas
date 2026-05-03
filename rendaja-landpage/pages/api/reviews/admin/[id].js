import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: "ID obrigatório" });
  }

  if (req.method === "PATCH") {
    const { status } = req.body || {};

    if (!["pending", "approved"].includes(status)) {
      return res.status(400).json({ error: "Status inválido" });
    }

    const { data, error } = await supabaseAdmin
      .from("profile_reviews")
      .update({
        status,
        is_verified: status === "approved",
      })
      .eq("id", id)
      .select("id,status,is_verified")
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json(data);
  }

  if (req.method === "DELETE") {
    const { data, error } = await supabaseAdmin
      .from("profile_reviews")
      .delete()
      .eq("id", id)
      .select("id")
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json(data);
  }

  return res.status(405).json({ error: "Método não permitido" });
}