import Head from "next/head";
import Link from "next/link";
import { supabase } from "../src/lib/supabase";
import {
  buildSeoFaq,
  buildFaqSchema,
} from "../src/lib/seoFaq";
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

export async function getServerSideProps({ params }) {
  const citySlug = normalize(params?.city || "");

  const parts = citySlug.split("-");
  const estado = parts.pop()?.toUpperCase() || "";
  const cidade = parts.join(" ");

  const { data: profiles } = await supabase
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
      descricao
    `)
    .eq("is_active", true);

  const filteredProfiles = (profiles || []).filter((profile) => {
    return (
      normalize(profile.cidade) === normalize(cidade) &&
      normalize(profile.estado) === normalize(estado)
    );
  });

  return {
    props: {
      citySlug,
      cidade: titleFromSlug(cidade),
      estado,
      profiles: filteredProfiles,
    },
  };
}
function buildCitySchemas({
  cidade,
  estado,
  profiles = [],
  canonicalUrl,
}) {
  const cityName = `${cidade}-${estado}`;

  const itemList = profiles.slice(0, 30).map((profile, index) => ({
    "@type": "ListItem",
    position: index + 1,
    url: `https://compretudo.shop/p/${profile.slug}`,
    name: profile.nome,
  }));

  return [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: `Empresas em ${cityName}`,
      url: canonicalUrl,
      description: `Empresas, profissionais e serviços disponíveis em ${cityName}.`,
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
          item: canonicalUrl,
        },
      ],
    },

    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      itemListElement: itemList,
    },
  ];
}
export default function CityPage({ citySlug, cidade, estado, profiles }) {
  const cityName = `${cidade}-${estado}`;
  const canonicalUrl = `https://compretudo.shop/${citySlug}`;
  const schemaData = buildCitySchemas({
  cidade,
  estado,
  profiles,
  canonicalUrl,
});
const faq = buildSeoFaq({
  cidade,
  estado,
});

const faqSchema = buildFaqSchema(faq);
  return (
    <>
      <Head>
        <title>Empresas em {cityName} | CompreTudo.shop</title>

        <meta
          name="description"
          content={`Encontre empresas, lojas, profissionais e serviços em ${cityName}. Veja vitrines locais, produtos, atendimento por WhatsApp e negócios da cidade.`}
        />

        <link rel="canonical" href={canonicalUrl} />
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
            <span className="seo-kicker">Cidade CompreTudo</span>

            <h1>Empresas em {cityName}</h1>

            <p>
              Descubra empresas, profissionais, lojas, produtos e serviços em{" "}
              <strong>{cityName}</strong>. Veja vitrines locais e fale direto
              pelo WhatsApp.
            </p>
          </section>

          {profiles.length === 0 ? (
            <section className="seo-empty-box">
              <h2>Nenhuma vitrine encontrada ainda</h2>
              <p>Em breve novas empresas de {cityName} poderão aparecer aqui.</p>
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
                    alt={`${profile.nome} em ${cityName}`}
                  />

                  <div>
                    <strong>{profile.nome}</strong>
                    <p>
                      {profile.servico ||
                        profile.descricao ||
                        `Vitrine em ${cityName}`}
                    </p>
                  </div>
                </Link>
              ))}
            </section>
          )}

          <section className="seo-text-section">
            <h2>Guia de empresas em {cityName}</h2>

            <p>
              O CompreTudo.shop reúne vitrines de empresas, profissionais e
              serviços em {cityName}, ajudando moradores da cidade a encontrar
              opções locais com fotos, descrições, catálogo e contato direto.
            </p>
          </section>
          <section className="seo-faq-section">
  <h2>Perguntas frequentes</h2>

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