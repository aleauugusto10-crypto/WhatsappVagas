import { supabase } from "../src/lib/supabase";

export async function getServerSideProps({ res }) {
  const BASE_URL = "https://rendaja.online";

  // 🔥 BUSCA TODOS OS PERFIS ATIVOS
  const { data: profiles } = await supabase
    .from("profiles_pages")
    .select("slug, updated_at")
    .eq("is_active", true);

  const urls = [
    `
    <url>
      <loc>${BASE_URL}</loc>
      <changefreq>daily</changefreq>
      <priority>1.0</priority>
    </url>
    `,
  ];

  if (profiles && profiles.length) {
    profiles.forEach((profile) => {
      urls.push(`
        <url>
          <loc>${BASE_URL}/p/${profile.slug}</loc>
          <lastmod>${profile.updated_at || new Date().toISOString()}</lastmod>
          <changefreq>weekly</changefreq>
          <priority>0.8</priority>
        </url>
      `);
    });
  }

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
  <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    ${urls.join("")}
  </urlset>`;

  res.setHeader("Content-Type", "text/xml");
  res.write(sitemap);
  res.end();

  return {
    props: {},
  };
}

export default function Sitemap() {
  return null;
}