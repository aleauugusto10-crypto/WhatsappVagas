export default function ShoppingHero({
  totalProfiles = 0,
  totalProducts = 0,
  featuredProfile,
  featuredProduct,
}) {
  const profileName = featuredProfile?.nome || "Comércio em destaque";
  const profileService = featuredProfile?.servico || "Produtos e serviços";
  const profileCity = featuredProfile?.cidade || "Sua cidade";
  const profileState = featuredProfile?.estado || "";
  const profileImage = featuredProfile?.hero_image_url || featuredProfile?.logo_url;

  const productTitle =
    featuredProduct?.title ||
    featuredProduct?.name ||
    "Produto ou serviço em destaque";

  return (
    <section className="shoppingHero">
      <div className="shoppingHeroGlow shoppingHeroGlowOne" />
      <div className="shoppingHeroGlow shoppingHeroGlowTwo" />

      <div className="shoppingHeroContent">
        <span className="shoppingHeroBadge">Shopping digital aberto</span>

        <h1>Descubra comércios, profissionais e produtos perto de você.</h1>

        <p>
          Explore vitrines, serviços, promoções e páginas profissionais do
          CompreTudo.shop em um só lugar.
        </p>

        <div className="shoppingHeroStats">
          <div>
            <strong>{totalProfiles}</strong>
            <span>perfis ativos</span>
          </div>

          <div>
            <strong>{totalProducts}</strong>
            <span>itens na vitrine</span>
          </div>

          <div>
            <strong>24h</strong>
            <span>aberto online</span>
          </div>
        </div>
      </div>

      <div className="shoppingHeroVisual">
        <div className="shoppingPhoneMock">
          <div className="shoppingPhoneTop">
            <span />
            <span />
            <span />
          </div>

          <div
            className="shoppingMiniCard big"
            style={
              profileImage
                ? {
                    backgroundImage: `
                      linear-gradient(180deg, rgba(15,23,42,.08), rgba(15,23,42,.76)),
                      url("${profileImage}")
                    `,
                  }
                : undefined
            }
          >
            <small>Em destaque</small>
            <strong>{profileName}</strong>
            <span>
              {profileService} • {profileCity}
              {profileState ? `/${profileState}` : ""}
            </span>
          </div>

          <div className="shoppingMiniGrid">
            <div>
              <b>👕</b>
              <span>Moda</span>
            </div>
            <div>
              <b>💇</b>
              <span>Beleza</span>
            </div>
            <div>
              <b>🛠️</b>
              <span>Serviços</span>
            </div>
            <div>
              <b>🍔</b>
              <span>Comida</span>
            </div>
          </div>

          <div className="shoppingMiniCard">
            <small>Produto</small>
            <strong>{productTitle}</strong>
            <span>Ver na loja →</span>
          </div>
        </div>
      </div>
    </section>
  );
}