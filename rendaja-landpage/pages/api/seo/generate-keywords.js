import { supabase } from "../../../src/lib/supabase";
import { generateAIKeywords } from "../../../src/lib/seo/generateAIKeywords";
function normalize(value = "") {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function extractWords(text = "") {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 4);
}

function buildKeywords(profile) {
  const keywords = [];

  const cidade = profile.cidade || "";
  const estado = profile.estado || "";

  const servico = profile.servico || "";
  const nome = profile.nome || "";
  const descricao = profile.descricao || "";

  const storeItems = Array.isArray(profile.store_items)
    ? profile.store_items
    : [];

  keywords.push(servico);
  keywords.push(`${servico} em ${cidade}`);
  keywords.push(`${servico} ${cidade}`);
  keywords.push(`${nome} em ${cidade}`);

  const serviceWords = extractWords(servico);
  const descriptionWords = extractWords(descricao);

  serviceWords.forEach((word) => {
    keywords.push(word);
    keywords.push(`${word} em ${cidade}`);
  });

  descriptionWords.slice(0, 20).forEach((word) => {
    keywords.push(word);
    keywords.push(`${word} ${cidade}`);
  });

  storeItems.forEach((item) => {
    const title = item?.title || item?.name || "";
    const category = item?.category || "";

    if (title) {
      keywords.push(title);
      keywords.push(`${title} em ${cidade}`);
    }

    if (category) {
      keywords.push(category);
      keywords.push(`${category} em ${cidade}`);
    }

    extractWords(title).forEach((word) => {
      keywords.push(word);
      keywords.push(`${word} em ${cidade}`);
    });
  });

  return unique(
    keywords
      .map((k) => String(k || "").trim())
      .filter((k) => k.length >= 3)
  ).slice(0, 120);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Método não permitido",
    });
  }

  try {
    const { profile_id } = req.body || {};

    if (!profile_id) {
      return res.status(400).json({
        error: "profile_id obrigatório",
      });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles_pages")
      .select("*")
      .eq("id", profile_id)
      .maybeSingle();

    if (profileError || !profile) {
      return res.status(404).json({
        error: "Perfil não encontrado",
      });
    }

    const citySlug = `${normalize(profile.cidade)}-${normalize(
      profile.estado
    )}`;

    const ruleKeywords = buildKeywords(profile);

const aiKeywords = await generateAIKeywords(profile);

const keywords = unique([
    
  ...ruleKeywords,
  ...aiKeywords,
])

  .map((k) => String(k || "").trim())
  .filter((k) => k.length >= 3)
  .slice(0, 200);
console.log("SEO RULE KEYWORDS:", ruleKeywords.length);
console.log("SEO AI KEYWORDS:", aiKeywords.length);
console.log("SEO FINAL KEYWORDS:", keywords.length);
    await supabase
      .from("profile_seo_keywords")
      .delete()
      .eq("profile_page_id", profile.id);

      

    const rows = keywords.map((keyword) => ({
      profile_page_id: profile.id,
      keyword,
      keyword_slug: normalize(keyword),
      city_slug: citySlug,
      active: true,
    }));

    const { error: insertError } = await supabase
      .from("profile_seo_keywords")
      .insert(rows);

    if (insertError) {
      console.error(insertError);

      return res.status(500).json({
        error: "Erro ao salvar keywords",
      });
    }

    return res.status(200).json({
      success: true,
      total: rows.length,
      keywords,
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      error: "Erro interno",
    });
  }
}