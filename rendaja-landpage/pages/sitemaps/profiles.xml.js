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

  const { data: profiles, error } = await supabase
    .from("profiles_pages")
    .select("slug, updated_at")
    .eq("is_active", true)
    .not("slug", "is", null);

  if (error) {
    console.error("Erro ao gerar sitemap de perfis:", error);
  }

  const urls = (profiles || [])
    .filter((profile) => profile.slug)
    .map((profile) => {
      const lastmod = profile.updated_at || new Date().toISOString();

      return `
  <url>
    <loc>${escapeXml(`${BASE_URL}/p/${profile.slug}`)}</loc>
    <lastmod>${escapeXml(lastmod)}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
    })
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

export default function ProfilesSitemap() {
  return null;
}