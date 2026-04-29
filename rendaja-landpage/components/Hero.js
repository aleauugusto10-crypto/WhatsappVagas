export default function Hero({ profile }) {
  const nome = profile?.nome || "Profissional";
  const servico = profile?.servico || "Serviço profissional";
  const cidade = profile?.cidade || "Sua cidade";
  const whatsapp = profile?.whatsapp || "";
  const logo = profile?.logo_url || profile?.logo || "";
  const heroImage =
    profile?.hero_image_url ||
    profile?.background_url ||
    "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?q=80&w=1600&auto=format&fit=crop";

  return (
    <header className="site-hero" id="inicio">
      <nav className="topbar">
        <div className="brand">
          <div className="brand-logo">
            {logo ? <img src={logo} alt={nome} /> : <span>{nome.charAt(0)}</span>}
          </div>

          <div className="brand-text">
            <strong>{nome}</strong>
            <small>{servico}</small>
          </div>
        </div>

        <div className="nav-links">
          <a href="#inicio">Início</a>
          <a href="#sobre">Sobre</a>
          <a href="#servicos">Serviços</a>
          <a href="#portfolio">Galeria</a>
          <a href="#avaliacoes">Depoimentos</a>
          <a href="#contato">Contato</a>
        </div>

        <a className="topbar-cta" href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer">
          Falar no WhatsApp
        </a>
      </nav>

      <div className="hero-wrap">
        <div className="hero-copy">
          <span className="hero-kicker">Atendimento profissional com excelência</span>

          <h1>
            {servico}
            <em> em {cidade}</em>
          </h1>

          <p>
            Atendimento personalizado, comunicação direta e soluções para quem precisa
            contratar com mais confiança.
          </p>

          <div className="hero-actions">
            <a className="main-cta" href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer">
              Falar no WhatsApp
            </a>
            <a className="ghost-cta" href="#servicos">
              Ver serviços
            </a>
          </div>

          <div className="hero-trust">
            <div>
              <span>🛡️</span>
              <strong>Atendimento</strong>
              <small>Personalizado</small>
            </div>
            <div>
              <span>⚡</span>
              <strong>Contato</strong>
              <small>Direto e rápido</small>
            </div>
            <div>
              <span>📍</span>
              <strong>Atende em</strong>
              <small>{cidade}</small>
            </div>
            <div>
              <span>✅</span>
              <strong>Perfil</strong>
              <small>Profissional</small>
            </div>
          </div>
        </div>

        <div className="hero-photo">
          <img src={heroImage} alt={servico} />
          <div className="hero-photo-shade" />
        </div>
      </div>
    </header>
  );
}