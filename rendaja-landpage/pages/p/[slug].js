import Head from "next/head";
import { supabase } from "../../../src/lib/supabase";
import Hero from "../../components/Hero";
import Gallery from "../../components/Gallery";
import Reviews from "../../components/Reviews";

function normalizePhoneBR(phone = "") {
  let num = String(phone || "").replace(/\D/g, "");

  if (!num) return "";

  if (num.startsWith("55")) {
    num = num.slice(2);
  }

  const ddd = num.slice(0, 2);
  let rest = num.slice(2);

  if (rest.length === 8) {
    rest = "9" + rest;
  }

  return `55${ddd}${rest}`;
}

function buildTitle(profile) {
  return `${profile.servico || "Profissional"} em ${
    profile.cidade || "sua região"
  } | ${profile.nome || "RendaJá"}`;
}

function buildDescription(profile) {
  return (
    profile.descricao ||
    `Conheça o trabalho de ${profile.nome || "um profissional"} em ${
      profile.cidade || "sua região"
    }. Fale diretamente pelo WhatsApp.`
  );
}

export async function getServerSideProps({ params }) {
  const { data, error } = await supabase
    .from("profiles_pages")
    .select("*")
    .eq("slug", params.slug)
    .maybeSingle();

  if (error) {
    console.error("Erro ao buscar profile page:", error);
  }

  return { props: { profile: data || null } };
}

export default function Page({ profile }) {
  if (!profile) {
    return (
      <main className="page-shell">
        <section className="not-found">
          <h1>Perfil não encontrado</h1>
          <p>Essa página ainda não está disponível.</p>
        </section>
      </main>
    );
  }

  const whatsapp = normalizePhoneBR(profile.whatsapp);
  const title = buildTitle(profile);
  const description = buildDescription(profile);

  const safeProfile = {
    ...profile,
    whatsapp,
  };

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />

        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="website" />

        <meta name="robots" content="index,follow" />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "LocalBusiness",
              name: profile.nome || profile.servico,
              description,
              areaServed: profile.cidade,
              telephone: whatsapp,
              url: `/p/${profile.slug}`,
            }),
          }}
        />
      </Head>

      <main className="profile-page">
        <Hero profile={safeProfile} />

        <section className="section section-about">
          <div className="section-media">
            <div className="image-card">
              <span>{profile.servico || "Profissional"}</span>
            </div>
          </div>

          <div className="section-content">
            <span className="eyebrow">Sobre o profissional</span>
            <h2>{profile.nome || profile.servico}</h2>
            <p>{description}</p>

            <div className="info-grid">
              <div>
                <strong>Atendimento</strong>
                <span>{profile.cidade || "Região informada"}</span>
              </div>
              <div>
                <strong>Contato direto</strong>
                <span>WhatsApp</span>
              </div>
            </div>
          </div>
        </section>

        <section className="section section-services">
          <span className="eyebrow">Destaques</span>
          <h2>Por que contratar este profissional?</h2>

          <div className="cards-grid">
            <article className="feature-card">
              <span>⚡</span>
              <h3>Atendimento rápido</h3>
              <p>Entre em contato direto pelo WhatsApp e combine os detalhes.</p>
            </article>

            <article className="feature-card">
              <span>📍</span>
              <h3>Atende na região</h3>
              <p>Profissional disponível em {profile.cidade || "sua cidade"}.</p>
            </article>

            <article className="feature-card">
              <span>✅</span>
              <h3>Perfil verificado</h3>
              <p>Informações organizadas para facilitar sua decisão.</p>
            </article>
          </div>
        </section>

        <section id="portfolio" className="section section-gallery">
          <span className="eyebrow">Portfólio</span>
          <h2>Trabalhos, serviços ou produtos</h2>
          <Gallery images={profile.gallery || []} />
        </section>

        <section className="section section-reviews">
          <Reviews reviews={profile.reviews || []} />
        </section>

        <section className="final-cta">
          <div>
            <span className="eyebrow">Contato</span>
            <h2>Gostou do perfil?</h2>
            <p>Fale agora pelo WhatsApp e combine atendimento, orçamento ou disponibilidade.</p>
          </div>

          <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer">
            Falar no WhatsApp
          </a>
        </section>
      </main>
    </>
  );
}