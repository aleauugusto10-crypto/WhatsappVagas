import { supabase } from "../../../src/lib/supabase";

export default async function handler(req, res) {
  try {
    const { data, error } = await supabase
      .from("profiles_pages")
      .select(`
        id,
        slug,
        nome,
        servico,
        cidade,
        estado,
        logo_url,
        hero_image_url
      `)
      .eq("is_active", true)
      .order("updated_at", { ascending: false })
      .limit(20);

    if (error) throw error;

    return res.status(200).json(data || []);
  } catch (err) {
    console.error("Erro ao buscar perfis ativos:", err);
    return res.status(500).json([]);
  }
}