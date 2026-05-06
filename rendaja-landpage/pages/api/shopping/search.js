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

    const { data, error } = await supabase
      .from("profiles_pages")
      .select(`
        id,
        user_id,
        slug,
        nome,
        servico,
        cidade,
        estado,
        descricao,
        whatsapp,
        logo_url,
        hero_image_url,
        about_image_url,
        is_active,
        is_preview,
        preview_expires_at,
        subscription_expires_at,
        store_items,
        created_at,
        business_hours,
delivery_enabled,
pickup_enabled,
home_service_enabled,
free_delivery,
delivery_fee

      `)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(80);

    if (error) {
      console.error("Erro shopping search:", error);
      return res.status(500).json({ error: "Erro ao buscar shopping." });
    }

    let results = data || [];

    results = results.filter((profile) => {
      const previewOk =
        profile.is_preview !== true ||
        !profile.preview_expires_at ||
        new Date(profile.preview_expires_at) > new Date();

      const subscriptionOk =
        !profile.subscription_expires_at ||
        new Date(profile.subscription_expires_at) > new Date();

      return previewOk && subscriptionOk;
    });

    if (q.length >= 2) {
      results = results.filter((profile) => {
        const searchable = normalizeText(`
          ${profile.nome || ""}
          ${profile.servico || ""}
          ${profile.cidade || ""}
          ${profile.estado || ""}
          ${profile.descricao || ""}
          ${profile.slug || ""}
          ${JSON.stringify(profile.store_items || "")}
        `);

        return searchable.includes(q);
      });
    }

    return res.status(200).json(results);
  } catch (err) {
    console.error("Erro geral shopping search:", err);
    return res.status(500).json({ error: "Erro interno." });
  }
}