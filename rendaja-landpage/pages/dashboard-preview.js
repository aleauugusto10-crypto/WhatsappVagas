import { useEffect, useState } from "react";
import Hero from "../components/Hero";
import Gallery from "../components/Gallery";
import Reviews from "../components/Reviews";
import StoreSection from "../components/StoreSection";
import BookingSection from "../components/BookingSection";
import ServicesSection from "../components/ServicesSection";

function normalizePhoneBR(phone = "") {
  let num = String(phone || "").replace(/\D/g, "");
  if (!num) return "";

  if (num.startsWith("55")) num = num.slice(2);

  const ddd = num.slice(0, 2);
  let rest = num.slice(2);

  if (rest.length === 8) rest = `9${rest}`;

  return `55${ddd}${rest}`;
}

function buildDescription(profile) {
  return (
    profile.descricao ||
    `Conheça o trabalho de ${profile.nome || "um profissional"} em ${
      profile.cidade || "sua região"
    }. Fale diretamente pelo WhatsApp.`
  );
}

function hexToRgb(hex = "#06111d") {
  const clean = String(hex || "").replace("#", "");
  if (clean.length !== 6) return "6, 17, 29";

  return `${parseInt(clean.slice(0, 2), 16)}, ${parseInt(
    clean.slice(2, 4),
    16
  )}, ${parseInt(clean.slice(4, 6), 16)}`;
}

function normalizeJsonArray(value) {
  if (Array.isArray(value)) return value;

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
}

function normalizeJsonObject(value, fallback) {
  if (value && typeof value === "object" && !Array.isArray(value)) return value;

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? parsed
        : fallback;
    } catch {
      return fallback;
    }
  }

  return fallback;
}

function normalizeBookings(bookings = []) {
  const now = new Date();

  return normalizeJsonArray(bookings)
    .filter((booking) => {
      if (!booking?.date || !booking?.time) return false;
      if (booking.status === "cancelled") return false;
      if (booking.status === "expired") return false;

      if (booking.status === "confirmed") return true;

      if (booking.status === "pending" && booking.expires_at) {
        return new Date(booking.expires_at) > now;
      }

      return false;
    })
    .map((booking) => ({
      id: booking.id,
      date: booking.date,
      time: booking.time,
      status: booking.status,
      services: normalizeJsonArray(booking.services),
      expires_at: booking.expires_at || null,
    }));
}

function applyProfileDefaults(profile = {}) {
  const servicesItems = normalizeJsonArray(profile.services_items);

  return {
    ...profile,

    primary_color: profile.primary_color || "#d9a84e",
    secondary_color: profile.secondary_color || "#06111d",
    accent_color: profile.accent_color || "#f5d28b",
    background_color: profile.background_color || "#f7f3ed",
    text_color: profile.text_color || "#07111f",

    hero_bg_color: profile.hero_bg_color || profile.secondary_color || "#06111d",
    topbar_bg_color: profile.topbar_bg_color || profile.secondary_color || "#06111d",
    hero_overlay_color:
      profile.hero_overlay_color ||
      profile.hero_bg_color ||
      profile.secondary_color ||
      "#06111d",

    about_bg_color: profile.about_bg_color || profile.background_color || "#f7f3ed",

    services_bg_color:
      profile.services_bg_color || profile.background_color || "#f7f3ed",
    services_text_color:
      profile.services_text_color || profile.text_color || "#07111f",

    portfolio_bg_color:
      profile.portfolio_bg_color || profile.secondary_color || "#06111d",

    reviews_bg_color:
      profile.reviews_bg_color || profile.background_color || "#f7f3ed",

    store_bg_color:
      profile.store_bg_color || profile.sales_bg_color || "#ffffff",
    sales_bg_color:
      profile.sales_bg_color || profile.store_bg_color || "#ffffff",
    store_text_color:
      profile.store_text_color || profile.text_color || "#07111f",

    cta_bg_color: profile.cta_bg_color || profile.primary_color || "#d9a84e",

    font_heading: profile.font_heading || "Georgia",
    font_body: profile.font_body || "Arial",

    hero_kicker: profile.hero_kicker || "Atendimento profissional com excelência",

    about_title: profile.about_title || "Sobre meu trabalho",
    about_text: profile.about_text || "",

    services_title: profile.services_title || "Serviços",
    services_text:
      profile.services_text || "Conheça as principais soluções que ofereço.",
    services_items: servicesItems,

    gallery: normalizeJsonArray(profile.gallery),
    reviews: normalizeJsonArray(profile.reviews),

    store_title: profile.store_title || "Escolha o que você precisa",
    store_text:
      profile.store_text ||
      "Veja as opções disponíveis e solicite direto pelo WhatsApp.",
    store_items: normalizeJsonArray(profile.store_items),
    store_categories: normalizeJsonArray(profile.store_categories),

    show_store: profile.show_store !== false,
    show_booking: profile.show_booking === true,
    show_about: profile.show_about !== false,
    show_services: profile.show_services !== false,
    show_portfolio: profile.show_portfolio !== false,
    show_reviews: profile.show_reviews !== false,
    show_final_cta: profile.show_final_cta !== false,

    working_days: normalizeJsonArray(profile.working_days).length
      ? normalizeJsonArray(profile.working_days)
      : [1, 2, 3, 4, 5, 6],

    working_hours: normalizeJsonObject(profile.working_hours, {
      start: 8,
      end: 18,
      interval: 1,
    }),

    reserved_slots: normalizeJsonArray(profile.reserved_slots),
    bookings: normalizeBookings(profile.bookings),

    instagram_url: profile.instagram_url || "",
    youtube_url: profile.youtube_url || "",
    facebook_url: profile.facebook_url || "",
    tiktok_url: profile.tiktok_url || "",
    linkedin_url: profile.linkedin_url || "",
    website_url: profile.website_url || "",

    cta_title: profile.cta_title || "Pronto para contratar com confiança?",
    cta_text:
      profile.cta_text ||
      "Fale comigo agora pelo WhatsApp e solicite seu orçamento.",
    cta_button_text: profile.cta_button_text || "Falar agora",
    cta_action_type: profile.cta_action_type || "whatsapp",
    cta_custom_link: profile.cta_custom_link || "",
  };
}

function buildCtaHref(profile, whatsapp) {
  if (profile.cta_action_type === "custom_link" && profile.cta_custom_link) {
    return profile.cta_custom_link;
  }

  return whatsapp ? `https://wa.me/${whatsapp}` : "#";
}
function ReviewsSection({ reviews = [], enabled }) {
  const list = Array.isArray(reviews) ? reviews : [];

  const totalReviews = list.length;

  const averageRating =
    totalReviews > 0
      ? list.reduce((sum, item) => sum + Number(item.rating || 5), 0) /
        totalReviews
      : 0;

  const roundedAverage = averageRating.toFixed(1);

  if (!enabled) {
    return (
      <section className="reviews-disabled">
        <strong>Avaliações indisponíveis</strong>
        <p>
          Este profissional optou por não exibir avaliações públicas no momento.
        </p>
      </section>
    );
  }

  return (
    <section className="reviews">
      <div className="reviews-head">
        <span>Avaliações reais</span>

        <h2 className="reviews-title">
          Avaliações

          {totalReviews > 0 && (
            <span className="reviews-inline-rating">
              ⭐ {roundedAverage}
              <small>({totalReviews})</small>
            </span>
          )}
        </h2>

        <p>Comentários públicos de clientes sobre este profissional.</p>
      </div>

      {totalReviews === 0 ? (
        <div className="reviews-empty">
          <strong>Seja o primeiro a avaliar ⭐</strong>
          <p>Ajude outros usuários compartilhando sua experiência.</p>
        </div>
      ) : (
        <div className="reviews-carousel">
          {list.map((r, index) => (
            <article key={r.id || index} className="review-card-modern">
              <div className="review-card-top">
                <div className="avatar">
                  {r.name?.charAt(0)?.toUpperCase() || "U"}
                </div>

                <div>
                  <strong>{r.name || "Cliente"}</strong>
                  <span>{"⭐".repeat(Number(r.rating || 5))}</span>
                </div>
              </div>

              <p>{r.comment}</p>
            </article>
          ))}
        </div>
      )}

      <div className="review-write-box">
        <h3>Deixe sua avaliação</h3>
        <p>Avaliações sem cadastro podem passar por análise antes de aparecer.</p>

        <div className="review-form-modern">
          <div className="review-user">
            <div className="avatar">U</div>
            <input placeholder="Seu nome" disabled />
          </div>

          <div className="review-stars">
            {[1, 2, 3, 4, 5].map((star) => (
              <span key={star} className="active">
                ⭐
              </span>
            ))}
          </div>

          <textarea placeholder="Compartilhe sua experiência..." disabled />

          <button type="button" disabled>
            Enviar comentário
          </button>
        </div>
      </div>
    </section>
  );
}
export default function DashboardPreview() {
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("rendaja_preview_profile");

    if (!raw) {
      setProfile(null);
      return;
    }

    try {
      setProfile(JSON.parse(raw));
    } catch {
      setProfile(null);
    }
  }, []);

  if (!profile) {
    return (
      <main className="profile-page">
        <section className="not-found">
          <h1>Prévia indisponível</h1>
          <p>Altere alguma informação no painel para gerar a prévia.</p>
        </section>
      </main>
    );
  }

  const normalizedProfile = applyProfileDefaults(profile);
  const whatsapp = normalizePhoneBR(normalizedProfile.whatsapp);
  const description = buildDescription(normalizedProfile);

  const safeProfile = {
    ...normalizedProfile,
    whatsapp,
  };

  const ctaHref = buildCtaHref(normalizedProfile, whatsapp);

  const themeStyle = {
    "--primary": normalizedProfile.primary_color,
    "--secondary": normalizedProfile.secondary_color,
    "--accent": normalizedProfile.accent_color,
    "--background": normalizedProfile.background_color,
    "--text": normalizedProfile.text_color,

    "--hero-bg": normalizedProfile.hero_bg_color,
    "--topbar-bg": normalizedProfile.topbar_bg_color,
    "--about-bg": normalizedProfile.about_bg_color,

    "--services-bg": normalizedProfile.services_bg_color,
    "--services-text": normalizedProfile.services_text_color,

    "--portfolio-bg": normalizedProfile.portfolio_bg_color,
    "--reviews-bg": normalizedProfile.reviews_bg_color,

    "--store-bg": normalizedProfile.store_bg_color,
    "--store-text": normalizedProfile.store_text_color,

    "--cta-bg": normalizedProfile.cta_bg_color,

    "--dark-rgb": hexToRgb(normalizedProfile.secondary_color),
    "--hero-rgb": hexToRgb(normalizedProfile.hero_bg_color),
    "--text-rgb": hexToRgb(normalizedProfile.text_color),
    "--store-text-rgb": hexToRgb(normalizedProfile.store_text_color),
    "--services-text-rgb": hexToRgb(normalizedProfile.services_text_color),

    "--font-heading": normalizedProfile.font_heading,
    "--font-body": normalizedProfile.font_body,
  };

  return (
    <main className="profile-page" style={themeStyle}>
      <Hero profile={safeProfile} />

      {normalizedProfile.show_services && (
        <ServicesSection profile={safeProfile} />
      )}

      {normalizedProfile.show_store && (
        <StoreSection profile={safeProfile} />
      )}

      {normalizedProfile.show_booking && (
        <BookingSection profile={safeProfile} />
      )}

      {normalizedProfile.show_about && (
  <section id="sobre" className="section section-about">
    <div>
      <h2>{normalizedProfile.about_title || "Sobre"}</h2>

      {normalizedProfile.about_image_url && (
        <img
          className="about-inline-image"
          src={normalizedProfile.about_image_url}
          alt={normalizedProfile.about_title || "Sobre"}
        />
      )}
    </div>

    <p>{normalizedProfile.about_text || description}</p>
  </section>
)}

      {normalizedProfile.show_portfolio && (
        <section id="portfolio" className="section section-gallery">
          <Gallery images={normalizedProfile.gallery || []} />
        </section>
      )}

      {normalizedProfile.show_reviews && (
  <section id="avaliacoes" className="section section-reviews">
    <ReviewsSection
      reviews={normalizedProfile.reviews || []}
      enabled={normalizedProfile.show_reviews}
    />
  </section>
)}

      {normalizedProfile.show_final_cta && (
        <section className="final-cta">
          <div>
            <h2>{normalizedProfile.cta_title}</h2>
            {normalizedProfile.cta_text && <p>{normalizedProfile.cta_text}</p>}
          </div>

          <a href={ctaHref} target="_blank" rel="noreferrer">
            {normalizedProfile.cta_button_text || "Falar agora"}
          </a>
        </section>
      )}
    </main>
  );
}