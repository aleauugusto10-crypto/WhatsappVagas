export async function getServerSideProps({ res }) {
  const BASE_URL = "https://compretudo.shop";

  const sitemapIndex = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">

  <sitemap>
    <loc>${BASE_URL}/sitemaps/profiles.xml</loc>
  </sitemap>

  <sitemap>
    <loc>${BASE_URL}/sitemaps/categories.xml</loc>
  </sitemap>

  <sitemap>
    <loc>${BASE_URL}/sitemaps/cities.xml</loc>
  </sitemap>

  <sitemap>
    <loc>${BASE_URL}/sitemaps/seo-pages.xml</loc>
  </sitemap>

</sitemapindex>`;

  res.setHeader("Content-Type", "text/xml");
  res.write(sitemapIndex);
  res.end();

  return {
    props: {},
  };
}

export default function Sitemap() {
  return null;
}