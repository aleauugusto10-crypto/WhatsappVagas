import { supabase } from "../../src/lib/supabase";

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
    .from("profile_seo_keywords")
    .select("keyword_slug, city_slug, created_at")
    .eq("active", true)
    .not("keyword_slug", "is", null)
    .not("city_slug", "is", null);

  if (error) {
    console.error("Erro ao gerar categories.xml:", error);
  }

  const uniqueCategories = new Map();

  (data || []).forEach((item) => {
    const key = `${item.city_slug}/${item.keyword_slug}`;

    const current = uniqueCategories.get(key);

    uniqueCategories.set(key, {
      loc: `${BASE_URL}/${item.city_slug}/${item.keyword_slug}`,
      lastmod:
        current?.lastmod && new Date(current.lastmod) > new Date(item.created_at)
          ? current.lastmod
          : item.created_at || new Date().toISOString(),
    });
  });

  const urls = Array.from(uniqueCategories.values())
    .map(
      (item) => `
  <url>
    <loc>${escapeXml(item.loc)}</loc>
    <lastmod>${escapeXml(item.lastmod)}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.85</priority>
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

export default function CategoriesSitemap() {
  return null;
}