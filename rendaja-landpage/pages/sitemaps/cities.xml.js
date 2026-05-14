import { supabase } from "../../src/lib/supabase";

function slugify(value = "") {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function escapeXml(value = "") {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function getServerSideProps({ res }) {
  const BASE_URL = "https://compretudo.shop";

  const { data, error } = await supabase
    .from("profiles_pages")
    .select("cidade, estado, updated_at")
    .eq("is_active", true)
    .not("cidade", "is", null)
    .not("estado", "is", null);

  if (error) {
    console.error("Erro ao gerar cities.xml:", error);
  }

  const uniqueCities = new Map();

  (data || []).forEach((item) => {
    const citySlug = `${slugify(item.cidade)}-${slugify(item.estado)}`;
    if (!citySlug || citySlug === "-") return;

    const current = uniqueCities.get(citySlug);

    uniqueCities.set(citySlug, {
      slug: citySlug,
      lastmod:
        current?.lastmod && new Date(current.lastmod) > new Date(item.updated_at)
          ? current.lastmod
          : item.updated_at || new Date().toISOString(),
    });
  });

  const urls = Array.from(uniqueCities.values())
    .map(
      (city) => `
  <url>
    <loc>${escapeXml(`${BASE_URL}/${city.slug}`)}</loc>
    <lastmod>${escapeXml(city.lastmod)}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>`
    )
    .join("");

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

  res.setHeader("Content-Type", "text/xml; charset=utf-8");
  res.write(sitemap);
  res.end();

  return { props: {} };
}

export default function CitiesSitemap() {
  return null;
}