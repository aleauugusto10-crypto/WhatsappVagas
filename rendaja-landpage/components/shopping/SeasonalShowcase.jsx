import ProductCard from "./ProductCard";
import {
  DEFAULT_SEASONAL_CAMPAIGN,
  SEASONAL_CAMPAIGNS,
} from "./seasonalCampaigns";

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

  return campaign.keywords.some((keyword) => {
    const word = normalizeText(keyword);
    return text.includes(word);
  });
}

export default function SeasonalShowcase({ products = [] }) {
  const campaign = getCurrentSeasonalCampaign();

  const items = products
    .filter((product) => productMatchesCampaign(product, campaign))
    .slice(0, 24);

  if (!items.length) return null;

  return (
    <section className="seasonalShowcase">
      <div
        className="seasonalHeroPlate"
        style={{
          backgroundImage: `
            linear-gradient(90deg, rgba(2,6,23,.86), rgba(2,6,23,.42), rgba(2,6,23,.12)),
            url("${campaign.imageUrl}")
          `,
        }}
      >
        <div>
          <small>Temporada especial</small>
          <h2>{campaign.title}</h2>
          <p>{campaign.subtitle}</p>
        </div>
      </div>

      <div className="seasonalProductCarousel">
        {items.map((product) => (
          <ProductCard key={`seasonal-${product.id}`} product={product} />
        ))}
      </div>
    </section>
  );
}