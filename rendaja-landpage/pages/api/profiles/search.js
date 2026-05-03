import { supabase } from "../../../src/lib/supabase";

function normalizeText(value = "") {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export default async function handler(req, res) {
  try {
    const q = normalizeText(req.query.q || "");

    if (q.length < 2) {
      return res.status(200).json([]);
    }

    const { data, error } = await supabase
      .from("profiles_pages")
      .select("id, slug, nome, servico, cidade, estado, descricao, logo_url, hero_image_url, is_active")
      .eq("is_active", true)
      .limit(30);

    if (error) {
      console.error("Erro search profiles:", error);
      return res.status(500).json({ error: "Erro ao buscar perfis." });
    }

    const results = (data || []).filter((profile) => {
      const searchable = normalizeText(`
        ${profile.nome || ""}
        ${profile.servico || ""}
        ${profile.cidade || ""}
        ${profile.estado || ""}
        ${profile.descricao || ""}
        ${profile.slug || ""}
      `);

      return searchable.includes(q);
    });

    return res.status(200).json(results.slice(0, 10));
  } catch (err) {
    console.error("Erro geral search profiles:", err);
    return res.status(500).json({ error: "Erro interno." });
  }
}