import { supabase } from "../../src/lib/supabase";

function escapeXml(value = "") {
  return String(value)
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
    .select("city_slug, keyword_slug, created_at")
    .eq("active", true);

  if (error) {
    console.error("Erro ao gerar sitemap SEO pages:", error);
  }

  const uniqueUrls = new Map();

  (data || []).forEach((item) => {
    if (!item.city_slug || !item.keyword_slug) return;

    const path = `/${item.city_slug}/${item.keyword_slug}`;
    const existing = uniqueUrls.get(path);

    if (!existing || new Date(item.created_at) > new Date(existing.lastmod)) {
      uniqueUrls.set(path, {
        loc: `${BASE_URL}${path}`,
        lastmod: item.created_at || new Date().toISOString(),
      });
    }
  });

  const urls = Array.from(uniqueUrls.values())
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

  res.setHeader("Content-Type", "text/xml");
  res.write(sitemap);
  res.end();

  return { props: {} };
}

export default function SeoPagesSitemap() {
  return null;
}