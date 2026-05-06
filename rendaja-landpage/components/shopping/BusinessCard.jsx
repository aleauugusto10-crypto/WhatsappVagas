import { getBusinessStatus, getDeliveryBadges } from "../../src/lib/businessStatus";



function getInitials(name = "") {
  return String(name || "RendaJá")
    .trim()
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export default function BusinessCard({ profile, compact = false }) {
  if (!profile) return null;

  const url = profile.slug ? `/p/${profile.slug}` : "#";
const status = getBusinessStatus(profile);
const deliveryBadges = getDeliveryBadges(profile);
  return (
    <article className={`businessCard ${compact ? "compact" : ""}`}>
      <a href={url} className="businessCardCover">
        {profile.hero_image_url ? (
          <img src={profile.hero_image_url} alt={profile.nome || "Perfil"} />
        ) : (
          <div className="businessCardFallback">{getInitials(profile.nome)}</div>
        )}

        <span className={`businessCardBadge ${status.open ? "open" : "closed"}`}>
  {status.open ? "● Aberto agora" : "● Fechado agora"}
</span>
      </a>

      <div className="businessCardBody">
        <div className="businessCardLogo">
          {profile.logo_url ? (
            <img src={profile.logo_url} alt={profile.nome || "Logo"} />
          ) : (
            <strong>{getInitials(profile.nome)}</strong>
          )}
        </div>

        <div className="businessCardInfo">
          <a href={url}>
            <h3>{profile.nome || "Empresa RendaJá"}</h3>
          </a>

          <p>{profile.servico || "Serviços e produtos"}</p>

          <div className="businessCardMeta">
            <span>📍 {profile.cidade || "Sua cidade"} {profile.estado ? `• ${profile.estado}` : ""}</span>
            <span>⭐ Novo</span>
          </div>
        </div>
        {deliveryBadges.length > 0 && (
  <div className="businessCardBadges">
    {deliveryBadges.slice(0, 2).map((badge) => (
      <span key={badge.type} className={`businessCardMiniBadge ${badge.type}`}>
        {badge.label}
      </span>
    ))}
  </div>
)}
      </div>
    </article>
  );
}