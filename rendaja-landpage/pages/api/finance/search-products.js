import { supabase } from "../../../src/lib/supabase";

const PRODUCT_TABLES = [
  "profile_products",
  "products",
  "store_products",
  "profile_store_products",
];

function normalize(value = "") {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function getTitle(p) {
  return p.title || p.name || p.nome || p.product_name || "";
}

function getReference(p) {
  return p.reference_code || p.reference || p.codigo || p.sku || "";
}

function getImage(p) {
  return (
    p.image_url ||
    p.image ||
    p.photo_url ||
    p.cover_url ||
    p.product_image_url ||
    ""
  );
}

function getPrice(p) {
  return p.price || p.preco || p.amount || p.valor || 0;
}

function mapProduct(p) {
  return {
    id: p.id,
    title: getTitle(p),
    reference_code: getReference(p),
    image_url: getImage(p),
    price: getPrice(p),
    raw: p,
  };
}

function scoreProduct(product, term) {
  const title = normalize(getTitle(product));
  const ref = normalize(getReference(product));
  const desc = normalize(product.description || product.descricao || "");

  if (title === term || ref === term) return 100;
  if (title.includes(term)) return 80;
  if (ref.includes(term)) return 75;
  if (desc.includes(term)) return 50;

  const words = term.split(/\s+/).filter(Boolean);
  let score = 0;

  words.forEach((word) => {
    if (title.includes(word)) score += 20;
    if (ref.includes(word)) score += 18;
    if (desc.includes(word)) score += 8;
  });

  return score;
}

async function fetchFromTable(table, profilePageId) {
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .eq("profile_page_id", profilePageId)
    .limit(100);

  if (error) {
    return { data: null, error };
  }

  return { data: data || [], error: null };
}

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Método não permitido." });
    }

    const { profilePageId, q } = req.query;

    if (!profilePageId) {
      return res.status(400).json({ error: "profilePageId obrigatório." });
    }

    const term = normalize(q);

    let products = [];
    let usedTable = null;
    let lastError = null;

    for (const table of PRODUCT_TABLES) {
      const result = await fetchFromTable(table, profilePageId);

      if (result.error) {
        lastError = result.error;
        continue;
      }

      products = result.data;
      usedTable = table;
      break;
    }

    if (!usedTable) {
      return res.status(500).json({
        error:
          lastError?.message ||
          "Nenhuma tabela de produtos encontrada. Confira o nome da tabela.",
      });
    }

    if (!term || term.length < 2) {
      return res.status(200).json(
        products.slice(0, 12).map(mapProduct)
      );
    }

    const ranked = products
      .map((product) => ({
        product,
        score: scoreProduct(product, term),
      }))
      .sort((a, b) => b.score - a.score);

    const matched = ranked.filter((item) => item.score > 0);

    const finalResults =
      matched.length > 0 ? matched : ranked.slice(0, 12);

    return res.status(200).json(
      finalResults
        .slice(0, 12)
        .map((item) => mapProduct(item.product))
    );
  } catch (err) {
    console.error("❌ finance/search-products:", err);

    return res.status(500).json({
      error: err.message || "Erro ao buscar produtos.",
    });
  }
}