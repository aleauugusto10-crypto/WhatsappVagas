import Head from "next/head";
import { supabase } from "../../src/lib/supabase";
import { useState, useEffect } from "react";
import Hero from "../../components/Hero";
import Gallery from "../../components/Gallery";
import Reviews from "../../components/Reviews";
import StoreSection from "../../components/StoreSection";
import BookingSection from "../../components/BookingSection";
import ServicesSection from "../../components/ServicesSection";

/* =========================
   HELPERS
========================= */
function ReviewForm({ profileId, onSuccess }) {
  const [name, setName] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);

  async function submitReview() {
    if (sending) return;

    if (!profileId) {
      alert("Perfil inválido para avaliação.");
      return;
    }

    if (!name.trim() || !comment.trim()) {
      alert("Preencha seu nome e a avaliação.");
      return;
    }

    try {
      setSending(true);

      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          profile_id: profileId,
          name: name.trim(),
          rating: Number(rating),
          comment: comment.trim(),
          is_verified: false,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || "Erro ao enviar avaliação.");
      }

      alert("Avaliação enviada com sucesso!");

      setName("");
      setComment("");
      setRating(5);

      if (typeof onSuccess === "function") {
        await onSuccess();
      }
    } catch (err) {
      console.error("Erro ao enviar avaliação:", err);
      alert(err.message || "Erro ao enviar avaliação.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="review-form-modern">
      <div className="review-user">
        <div className="avatar">
          {name ? name.charAt(0).toUpperCase() : "U"}
        </div>

        <input
          placeholder="Seu nome"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="review-stars">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={star <= rating ? "active" : ""}
            onClick={() => setRating(star)}
          >
            ⭐
          </span>
        ))}
      </div>

      <textarea
        placeholder="Compartilhe sua experiência..."
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />

      <button type="button" onClick={submitReview} disabled={sending}>
        {sending ? "Enviando..." : "Enviar comentário"}
      </button>
    </div>
  );
}
function ReviewsSection({ profileId, enabled }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
const totalReviews = reviews.length;

const averageRating =
  totalReviews > 0
    ? reviews.reduce((sum, item) => sum + Number(item.rating || 5), 0) /
      totalReviews
    : 0;

const roundedAverage = averageRating.toFixed(1);

const averageStars = "⭐".repeat(Math.round(averageRating));
  async function loadReviews() {
    try {
      setLoading(true);

      const res = await fetch(`/api/reviews/${profileId}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Erro ao carregar avaliações");
      }

      setReviews(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Erro ao buscar avaliações:", err);
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (profileId) loadReviews();
  }, [profileId]);

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

      {loading ? (
        <div className="reviews-loading">
          <div className="spinner" />
        </div>
      ) : reviews.length === 0 ? (
        <div className="reviews-empty">
          <strong>Seja o primeiro a avaliar ⭐</strong>
          <p>Ajude outros usuários compartilhando sua experiência.</p>
        </div>
      ) : (
        <div className="reviews-carousel">
          {reviews.map((r) => (
            <article key={r.id} className="review-card-modern">
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
        <p>
          Avaliações sem cadastro podem passar por análise antes de aparecer.
        </p>

        <ReviewForm profileId={profileId} onSuccess={loadReviews} />
      </div>
    </section>
  );
}
function normalizePhoneBR(phone = "") {
  let num = String(phone || "").replace(/\D/g, "");
  if (!num) return "";

  if (num.startsWith("55")) num = num.slice(2);

  const ddd = num.slice(0, 2);
  let rest = num.slice(2);

  if (rest.length === 8) rest = `9${rest}`;

  return `55${ddd}${rest}`;
}

function buildTitle(profile) {
  return `${profile.servico || "Profissional"} em ${
    profile.cidade || "sua região"
  } | ${profile.nome || "Página profissional"}`;
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

/* =========================
   DEFAULTS
========================= */

function applyProfileDefaults(profile = {}) {
  const servicesItems = normalizeJsonArray(profile.services_items);

  return {
    ...profile,

    primary_color: profile.primary_color || "#d9a84e",
    secondary_color: profile.secondary_color || "#06111d",
    accent_color: profile.accent_color || "#f5d28b",
    background_color: profile.background_color || "#f7f3ed",
    text_color: profile.text_color || "#07111f",
store_text_color: profile.store_text_color || profile.text_color || "#07111f",
store_card_bg_color: profile.store_card_bg_color || "#ffffff",
services_bg_color:
  profile.services_bg_color || profile.background_color || "#f7f3ed",
services_text_color: profile.services_text_color || profile.text_color || "#07111f",
    hero_bg_color: profile.hero_bg_color || profile.secondary_color || "#06111d",
    topbar_bg_color:
      profile.topbar_bg_color || profile.secondary_color || "#06111d",
    hero_overlay_color:
      profile.hero_overlay_color ||
      profile.hero_bg_color ||
      profile.secondary_color ||
      "#06111d",

    about_bg_color:
      profile.about_bg_color || profile.background_color || "#f7f3ed",
    portfolio_bg_color:
      profile.portfolio_bg_color || profile.secondary_color || "#06111d",
    reviews_bg_color:
      profile.reviews_bg_color || profile.background_color || "#f7f3ed",
    store_bg_color:
      profile.store_bg_color || profile.sales_bg_color || "#ffffff",
    sales_bg_color:
      profile.sales_bg_color || profile.store_bg_color || "#ffffff",
    cta_bg_color: profile.cta_bg_color || profile.primary_color || "#d9a84e",

    font_heading: profile.font_heading || "Georgia",
    font_body: profile.font_body || "Arial",

    show_about: profile.show_about !== false,
    show_services: profile.show_services !== false,
    show_portfolio: profile.show_portfolio !== false,
    show_reviews: profile.show_reviews !== false,
    show_store: profile.show_store !== false,
    show_booking: profile.show_booking === true,
    show_final_cta: profile.show_final_cta !== false,

    about_title: profile.about_title || "Sobre meu trabalho",
    about_text: profile.about_text || "",

    services_title: profile.services_title || "Serviços",
    services_text:
      profile.services_text || "Conheça as principais soluções que ofereço.",
    services_items: servicesItems.length
      ? servicesItems
      : [
          {
            id: "service-1",
            icon: "⚖️",
            title: "Consultoria",
            description:
              "Atendimento profissional com orientação clara e personalizada.",
            active: true,
          },
        ],

    gallery: normalizeJsonArray(profile.gallery),
    reviews: normalizeJsonArray(profile.reviews),

    store_title: profile.store_title || "Serviços e produtos disponíveis",
    store_text:
      profile.store_text ||
      "Escolha o que precisa e finalize direto pelo WhatsApp.",
    store_items: normalizeJsonArray(profile.store_items),
    store_categories: normalizeJsonArray(profile.store_categories),

    cta_title: profile.cta_title || "Pronto para contratar com confiança?",
    cta_text:
      profile.cta_text || "Fale comigo agora pelo WhatsApp e solicite seu orçamento.",
    cta_button_text: profile.cta_button_text || "Falar agora",
    cta_action_type: profile.cta_action_type || "whatsapp",
    cta_custom_link: profile.cta_custom_link || "",

    instagram_url: profile.instagram_url || "",
    youtube_url: profile.youtube_url || "",
    facebook_url: profile.facebook_url || "",
    tiktok_url: profile.tiktok_url || "",
    website_url: profile.website_url || "",

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
  };
}

/* =========================
   SERVER SIDE
========================= */
export async function getServerSideProps({ params }) {
  const { data: profile, error } = await supabase
    .from("profiles_pages")
    .select("*")
    .eq("slug", params.slug)
    .maybeSingle();

  if (error) {
    console.error("Erro profile:", error);
  }

  if (!profile) {
    return {
      props: {
        profile: null,
        isPreview: false,
      },
    };
  }

  const now = new Date();

  const previewValido =
    profile.is_preview === true &&
    profile.preview_expires_at &&
    new Date(profile.preview_expires_at) > now;

  const canView = profile.is_active === true || previewValido;

  if (!canView) {
    return {
      props: {
        profile: null,
        isPreview: false,
      },
    };
  }

  const { data: bookings, error: bookingsError } = await supabase
    .from("profile_bookings")
    .select("id,date,time,status,services,expires_at")
    .eq("profile_page_id", profile.id)
    .in("status", ["pending", "confirmed"]);

  if (bookingsError) {
    console.error("Erro bookings:", bookingsError);
  }

  return {
    props: {
      profile: {
        ...profile,
        bookings: bookings || [],
      },
      isPreview: previewValido && profile.is_active !== true,
    },
  };
}

/* =========================
   PAGE
========================= */

export default function Page({ profile, isPreview }) {
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

  const normalizedProfile = applyProfileDefaults(profile);
  const whatsapp = normalizePhoneBR(normalizedProfile.whatsapp);

  const title = buildTitle(normalizedProfile);
  const description = buildDescription(normalizedProfile);

  const safeProfile = {
    ...normalizedProfile,
    whatsapp,
  };

  const ctaHref =
    normalizedProfile.cta_action_type === "custom_link" &&
    normalizedProfile.cta_custom_link
      ? normalizedProfile.cta_custom_link
      : `https://wa.me/${whatsapp}`;

  const themeStyle = {
    "--primary": normalizedProfile.primary_color,
    "--secondary": normalizedProfile.secondary_color,
    "--accent": normalizedProfile.accent_color,
    "--background": normalizedProfile.background_color,
    "--text": normalizedProfile.text_color,
"--store-text": normalizedProfile.store_text_color || normalizedProfile.text_color,
    "--hero-bg": normalizedProfile.hero_bg_color,
    "--topbar-bg": normalizedProfile.topbar_bg_color,
    "--about-bg": normalizedProfile.about_bg_color,
    "--portfolio-bg": normalizedProfile.portfolio_bg_color,
    "--reviews-bg": normalizedProfile.reviews_bg_color,
    "--store-bg": normalizedProfile.store_bg_color,
    "--cta-bg": normalizedProfile.cta_bg_color,
"--store-text": normalizedProfile.store_text_color,
"--store-card-bg": normalizedProfile.store_card_bg_color,
"--services-bg": normalizedProfile.services_bg_color,
"--services-text": normalizedProfile.services_text_color,
    "--dark-rgb": hexToRgb(normalizedProfile.secondary_color),
    "--hero-rgb": hexToRgb(normalizedProfile.hero_bg_color),
    "--text-rgb": hexToRgb(normalizedProfile.text_color),

    "--font-heading": normalizedProfile.font_heading,
    "--font-body": normalizedProfile.font_body,
  };

  return (
    <>
      <Head>
        <title>{normalizedProfile.seo_title || title}</title>

<meta
  name="description"
  content={normalizedProfile.seo_description || description}
/>

        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />

        {normalizedProfile.hero_image_url && (
          <meta property="og:image" content={normalizedProfile.hero_image_url} />
        )}
      </Head>

      <main className="profile-page" style={themeStyle}>
  {isPreview && (
    <div className="preview-warning">
      Esta é uma prévia temporária da página profissional. Para manter online,
      é necessário ativar o plano.
    </div>
  )}

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
  profileId={normalizedProfile.id}
  enabled={normalizedProfile.show_reviews}
/>
          </section>
        )}

     {normalizedProfile.show_final_cta && (
  <section id="cta-final" className="final-cta">
    <div>
      <h2>{normalizedProfile.cta_title || "Fale agora pelo WhatsApp"}</h2>

      {normalizedProfile.cta_text && <p>{normalizedProfile.cta_text}</p>}
    </div>

    <a href={ctaHref} target="_blank" rel="noreferrer">
      {normalizedProfile.cta_button_text || "Falar agora"}
    </a>
  </section>
)}

<section className="profile-seo-drawer">
  <details className="seo-drawer-details">
    <summary className="seo-drawer-summary">
      <span>Informações de busca e presença online</span>
      <strong>⌄</strong>
    </summary>

    <div className="profile-seo-footer">
      <div className="seo-footer-card seo-footer-main">
        <span>Presença profissional online</span>

        <h2>
          {normalizedProfile.servico} em {normalizedProfile.cidade}
          {normalizedProfile.estado ? `-${normalizedProfile.estado}` : ""}
        </h2>
<p>
  {normalizedProfile.seo_content ||
    `${normalizedProfile.nome} está disponível no RendaJá como ${normalizedProfile.servico} em ${normalizedProfile.cidade}${normalizedProfile.estado ? `-${normalizedProfile.estado}` : ""}. Nesta página você encontra informações sobre atendimento, serviços, fotos, avaliações, formas de contato e detalhes para contratar com mais segurança.`}
</p>

        <div className="seo-ai-box">
          <strong>Termos relacionados a esta página</strong>
<p>
  {(normalizedProfile.seo_keywords || []).length
    ? normalizedProfile.seo_keywords.join(", ")
    : `${normalizedProfile.servico} em ${normalizedProfile.cidade}${normalizedProfile.estado ? `-${normalizedProfile.estado}` : ""}, profissional em ${normalizedProfile.cidade}, atendimento em ${normalizedProfile.cidade}, serviços em ${normalizedProfile.cidade}, ${normalizedProfile.nome} em ${normalizedProfile.cidade}, contratar ${normalizedProfile.servico}, perfil profissional no RendaJá.`}
</p>
        </div>

        <div className="seo-tags">
  {(
    normalizedProfile.seo_tags?.length
      ? normalizedProfile.seo_tags
      : [
          normalizedProfile.servico,
          normalizedProfile.cidade,
          normalizedProfile.estado,
          "Perfil profissional",
          "Atendimento local",
          "Contato pelo WhatsApp",
        ].filter(Boolean)
  ).map((tag) => (
    <small key={tag}>{tag}</small>
  ))}
</div>
      </div>

      <div className="seo-footer-card seo-footer-ad">
        <span>Também quer aparecer?</span>

        <h3>
          Tenha seu perfil profissional no RendaJá em{" "}
          {normalizedProfile.cidade}
          {normalizedProfile.estado ? `-${normalizedProfile.estado}` : ""}
        </h3>

        <p>
          Crie uma página elegante para seu negócio, serviço ou empresa. O
          RendaJá organiza suas informações e ajuda seu perfil a ser encontrado
          na internet em {normalizedProfile.cidade}
          {normalizedProfile.estado ? `-${normalizedProfile.estado}` : ""}.
        </p>

        <ul>
          <li>Perfil público profissional em {normalizedProfile.cidade}</li>
          <li>Página pronta para divulgar seu trabalho</li>
          <li>Serviços, dados e categorias organizadas</li>
          <li>Mais presença nas buscas do Google</li>
        </ul>

        <a
          href="https://wa.me/5579999033717"
          target="_blank"
          rel="noreferrer"
        >
          Criar meu perfil também
        </a>
      </div>
    </div>
  </details>
</section>
        
      </main>
    </>
  );
}