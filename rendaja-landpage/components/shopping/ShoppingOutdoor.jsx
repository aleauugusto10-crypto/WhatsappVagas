import { useEffect, useMemo, useState } from "react";
import { DEFAULT_SEASONAL_CAMPAIGN, SEASONAL_CAMPAIGNS } from "./seasonalCampaigns";

function normalizeText(value = "") {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function isDateInsideSeason(campaign) {
  const now = new Date();
  const year = now.getFullYear();

  const start = new Date(`${year}-${campaign.startsAt}T00:00:00`);
  const end = new Date(`${year}-${campaign.endsAt}T23:59:59`);

  return now >= start && now <= end;
}

function getCurrentSeasonalCampaign() {
  return (
    SEASONAL_CAMPAIGNS.find((campaign) => isDateInsideSeason(campaign)) ||
    DEFAULT_SEASONAL_CAMPAIGN
  );
}

function productMatchesCampaign(product, campaign) {
  const text = normalizeText(`
    ${product.title || ""}
    ${product.name || ""}
    ${product.description || ""}
  `);

  return campaign.keywords.some((keyword) =>
    text.includes(normalizeText(keyword))
  );
}

function getProductImage(product) {
  return (
    product.image_url ||
    product.image ||
    product.hero_image_url ||
    product.logo_url ||
    ""
  );
}

export default function ShoppingOutdoor({ profiles = [], products = [] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const campaign = getCurrentSeasonalCampaign();

  const seasonalProducts = useMemo(() => {
    return products
      .filter((product) => productMatchesCampaign(product, campaign))
      .slice(0, 8);
  }, [products, campaign]);

  const slides = useMemo(() => {
    const profileSlides = profiles.slice(0, 8).map((profile) => ({
      type: "profile",
      eyebrow: profile.servico || "Vitrine em destaque",
      title: profile.nome || "Comércio CompreTudo.shop",
      subtitle: `${profile.cidade || "Sua cidade"}${
        profile.estado ? `/${profile.estado}` : ""
      }`,
      image: profile.hero_image_url || profile.logo_url,
      href: profile.slug ? `/p/${profile.slug}` : "/shopping",
      cta: "Ver vitrine",
    }));

    const productSlides = products.slice(0, 6).map((product) => ({
      type: "product",
      eyebrow: product.business_name || "Produto em destaque",
      title: product.title || product.name || "Produto ou serviço",
      subtitle: product.price ? `A partir de R$ ${product.price}` : "Consultar",
      image: getProductImage(product),
      href: product.profile_slug
        ? `/p/${product.profile_slug}?produto=${encodeURIComponent(
            product.title || product.name || ""
          )}`
        : "/shopping",
      cta: "Ver produto",
    }));

    const seasonalSlide = {
      type: "seasonal",
      eyebrow: "Temporada especial",
      title: campaign.title,
      subtitle: campaign.subtitle,
      image: campaign.imageUrl,
      href: "/shopping/sazonal",
      cta: "Explorar temporada",
      products: seasonalProducts,
    };

    return [seasonalSlide, ...profileSlides, ...productSlides].filter(
      (slide) => slide.image
    );
  }, [profiles, products, campaign, seasonalProducts]);

  useEffect(() => {
    if (paused || slides.length <= 1) return;

    const timer = setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, 5200);

    return () => clearInterval(timer);
  }, [paused, slides.length]);

  const activeSlide = slides[activeIndex];

  if (!activeSlide) return null;

  return (
    <section
      className={`shoppingOutdoor shoppingOutdoor-${activeSlide.type}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
     {activeSlide.type === "seasonal" ? (
  <div
    className="shoppingOutdoorMain"
    style={{
      backgroundImage: `
        linear-gradient(90deg, rgba(2,6,23,.86), rgba(2,6,23,.48), rgba(2,6,23,.12)),
        url("${activeSlide.image}")
      `,
    }}
  >
    <div className="shoppingOutdoorText">
      <span>{activeSlide.eyebrow}</span>
      <h1>{activeSlide.title}</h1>
      <p>{activeSlide.subtitle}</p>
    </div>
  </div>
) : (
  <a
    href={activeSlide.href}
    className="shoppingOutdoorMain"
    style={{
      backgroundImage: `
        linear-gradient(90deg, rgba(2,6,23,.86), rgba(2,6,23,.48), rgba(2,6,23,.12)),
        url("${activeSlide.image}")
      `,
    }}
  >
    <div className="shoppingOutdoorText">
      <span>{activeSlide.eyebrow}</span>
      <h1>{activeSlide.title}</h1>
      <p>{activeSlide.subtitle}</p>
      <strong>{activeSlide.cta} →</strong>
    </div>
  </a>
)}
      {activeSlide.type === "seasonal" && seasonalProducts.length > 0 && (
        <div
          className="shoppingOutdoorProducts"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          {seasonalProducts.map((product) => (
            <a
              key={`outdoor-product-${product.id}`}
              href={
                product.profile_slug
                  ? `/p/${product.profile_slug}?produto=${encodeURIComponent(
                      product.title || product.name || ""
                    )}`
                  : "/shopping"
              }
            >
              <img
                src={getProductImage(product)}
                alt={product.title || product.name || "Produto"}
              />
              <div>
                <small>{product.business_name || "CompreTudo.shop"}</small>
                <b>{product.title || product.name}</b>
              </div>
            </a>
          ))}
        </div>
      )}

      <button
  type="button"
  className="shoppingOutdoorArrow left"
  onClick={() =>
    setActiveIndex((current) =>
      current === 0 ? slides.length - 1 : current - 1
    )
  }
>
  ‹
</button>

<button
  type="button"
  className="shoppingOutdoorArrow right"
  onClick={() =>
    setActiveIndex((current) =>
      current === slides.length - 1 ? 0 : current + 1
    )
  }
>
  ›
</button>
    </section>
  );
}