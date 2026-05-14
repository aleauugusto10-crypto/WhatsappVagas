import Head from "next/head";
import Link from "next/link";
import { supabase } from "../../src/lib/supabase";
import {
  buildSeoFaq,
  buildFaqSchema,
} from "../../src/lib/seoFaq";
function normalize(value = "") {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function titleFromSlug(slug = "") {
  return String(slug || "")
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function cityFromSlug(citySlug = "") {
  const parts = String(citySlug || "").split("-");
  const estado = parts.pop()?.toUpperCase() || "";
  const cidade = parts
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  return { cidade, estado };
}

export async function getServerSideProps({ params }) {
  const citySlug = normalize(params?.city || "");
  const categorySlug = normalize(params?.category || "");

  const { cidade, estado } = cityFromSlug(citySlug);
  const keyword = titleFromSlug(categorySlug);

  const { data: keywordRows, error: keywordError } = await supabase
    .from("profile_seo_keywords")
    .select("profile_page_id")
    .eq("active", true)
    .eq("city_slug", citySlug)
    .eq("keyword_slug", categorySlug);

  if (keywordError) {
    console.error("Erro ao buscar profile_seo_keywords:", keywordError);
  }

  const profileIds = [
    ...new Set(
      (keywordRows || [])
        .map((row) => row.profile_page_id)
        .filter(Boolean)
    ),
  ];

  let profiles = [];

  if (profileIds.length > 0) {
    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles_pages")
      .select(`
        id,
        slug,
        nome,
        servico,
        cidade,
        estado,
        logo_url,
        hero_image_url,
        descricao,
        is_active
      `)
      .in("id", profileIds);

    if (profilesError) {
      console.error("Erro ao buscar profiles_pages:", profilesError);
    }

    profiles = (profilesData || []).filter(
      (profile) => profile?.is_active !== false
    );
  }

  return {
    props: {
      citySlug,
      categorySlug,
      cidade,
      estado,
      keyword,
      profiles,
      debug: {
        citySlug,
        categorySlug,
        keywordRowsCount: keywordRows?.length || 0,
        profileIdsCount: profileIds.length,
        profilesCount: profiles.length,
      },
    },
  };
}
function buildCategorySchemas({
  keyword,
  cidade,
  estado,
  profiles = [],
  canonicalUrl,
}) {
  const cityName = `${cidade}-${estado}`;

  return [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: `${keyword} em ${cityName}`,
      url: canonicalUrl,
      description: `Empresas e profissionais relacionados a ${keyword} em ${cityName}.`,
    },

    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "CompreTudo.shop",
          item: "https://compretudo.shop",
        },
        {
          "@type": "ListItem",
          position: 2,
          name: cityName,
          item: `https://compretudo.shop/${normalize(cidade)}-${normalize(
            estado
          )}`,
        },
        {
          "@type": "ListItem",
          position: 3,
          name: keyword,
          item: canonicalUrl,
        },
      ],
    },

    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      itemListElement: profiles.slice(0, 30).map((profile, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: `https://compretudo.shop/p/${profile.slug}`,
        name: profile.nome,
      })),
    },
  ];
}
export default function CategoryCityPage({
  citySlug,
  categorySlug,
  cidade,
  estado,
  keyword,
  profiles,
  debug,
}) {
  const cityLabel = `${cidade}-${estado}`;
  const pageTitle = `${keyword} em ${cityLabel}`;
  const canonicalUrl = `https://compretudo.shop/${citySlug}/${categorySlug}`;

  const schemaData = buildCategorySchemas({
  keyword,
  cidade,
  estado,
  profiles,
  canonicalUrl,
});
const faq = buildSeoFaq({
  cidade,
  estado,
  keyword,
});

const faqSchema = buildFaqSchema(faq);
  return (
    <>
      <Head>
        <title>{pageTitle} | CompreTudo.shop</title>

        <meta
          name="description"
          content={`Encontre ${keyword.toLowerCase()} em ${cityLabel}. Veja vitrines, empresas, profissionais, produtos e serviços disponíveis na cidade.`}
        />

        <link rel="canonical" href={canonicalUrl} />

        <meta property="og:title" content={`${pageTitle} | CompreTudo.shop`} />
        <meta
          property="og:description"
          content={`Veja vitrines relacionadas a ${keyword.toLowerCase()} em ${cityLabel}.`}
        />
        <meta property="og:url" content={canonicalUrl} />
        {schemaData.map((schema, index) => (
            
  <script
    key={`schema-${index}`}
    type="application/ld+json"
    dangerouslySetInnerHTML={{
      __html: JSON.stringify(schema).replace(/</g, "\\u003c"),
    }}
  />
))}
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{
    __html: JSON.stringify(faqSchema).replace(/</g, "\\u003c"),
  }}
/>
      </Head>

      <main className="seo-page">
        <div className="seo-shell">
          <section className="seo-hero">
            <span className="seo-kicker">Guia local CompreTudo</span>

            <h1>{pageTitle}</h1>

            <p>
              Veja empresas, profissionais e vitrines relacionadas a{" "}
              <strong>{keyword}</strong> em <strong>{cityLabel}</strong>.
              Compare opções, conheça serviços e fale direto pelo WhatsApp.
            </p>
          </section>

          {profiles.length === 0 ? (
            <section className="seo-empty-box">
              <h2>Nenhuma vitrine encontrada ainda</h2>

              <p>
                Ainda não encontramos vitrines específicas para{" "}
                <strong>{keyword.toLowerCase()}</strong> em{" "}
                <strong>{cityLabel}</strong>.
              </p>

              <pre
                style={{
                  marginTop: 20,
                  padding: 14,
                  borderRadius: 14,
                  background: "#111827",
                  color: "#22c55e",
                  overflow: "auto",
                  fontSize: 12,
                }}
              >
                {JSON.stringify(debug, null, 2)}
              </pre>
            </section>
          ) : (
            <section className="seo-profile-grid">
              {profiles.map((profile) => (
                <Link
                  key={profile.id}
                  href={`/p/${profile.slug}`}
                  className="seo-profile-card"
                >
                  <img
                    src={
                      profile.hero_image_url ||
                      profile.logo_url ||
                      "/placeholder.png"
                    }
                    alt={`${profile.nome} - ${keyword} em ${cityLabel}`}
                  />

                  <div>
                    <strong>{profile.nome}</strong>

                    <p>
                      {profile.servico ||
                        profile.descricao ||
                        `Vitrine em ${cityLabel}`}
                    </p>
                    
                  </div>
                </Link>
              ))}
            </section>
          )}

          <section className="seo-text-section">
  <h2>{pageTitle}</h2>

  <p>
    O CompreTudo.shop ajuda moradores de {cityLabel} a encontrar
    empresas, profissionais, produtos e serviços relacionados a{" "}
    {keyword.toLowerCase()}. As vitrines exibidas nesta página podem
    conter fotos, catálogo, descrição, atendimento por WhatsApp e
    outras informações úteis para escolher com mais confiança.
  </p>
</section>

<section className="seo-faq-section">
  <h2>Perguntas frequentes sobre {keyword}</h2>

  <div className="seo-faq-list">
    {faq.map((item, index) => (
      <details key={index} className="seo-faq-item">
        <summary>{item.question}</summary>
        <p>{item.answer}</p>
      </details>
    ))}
  </div>
</section>
        </div>
      </main>
    </>
  );
}