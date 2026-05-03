import { useEffect, useRef, useState } from "react";

export default function Hero({ profile }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const searchRef = useRef(null);

  const nome = profile?.nome || "Profissional";
  const servico = profile?.servico || "Serviço profissional";
  const cidade = profile?.cidade || "Sua cidade";
  const descricao =
    profile?.descricao ||
    "Atendimento personalizado, comunicação direta e soluções para quem precisa contratar com mais confiança.";

  const whatsapp = profile?.whatsapp || "";
  const logo = profile?.logo_url || profile?.logo || "";

  const heroImage =
    profile?.hero_image_url ||
    profile?.background_url ||
    "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?q=80&w=1600&auto=format&fit=crop";

  const heroBg = profile?.hero_bg_color || "#06111d";
  const topbarBg = profile?.topbar_bg_color || "#06111d";
  const buttonColor = profile?.primary_color || "#d9a84e";
  const buttonTextColor = profile?.button_text_color || "#06111d";
  const accentColor = profile?.accent_color || buttonColor;
  const textColor = profile?.hero_text_color || "#ffffff";
  const overlayColor = profile?.hero_overlay_color || heroBg;
  const kicker = profile?.hero_kicker || "Atendimento profissional com excelência";

  const showAbout = profile?.show_about !== false;
  const showServices = profile?.show_services !== false;
  const showPortfolio = profile?.show_portfolio !== false;
  const showReviews = profile?.show_reviews !== false;
  const showStore = profile?.show_store !== false;

  const closeMenu = () => setMenuOpen(false);

  function goHome() {
    window.location.href = "https://rendaja.online";
  }

  function openSearch() {
    setSearchOpen(true);
    setTimeout(() => {
      searchRef.current?.focus();
    }, 80);
  }
useEffect(() => {
  function handleClickOutside(event) {
    if (!searchRef.current) return;

    const box = searchRef.current.closest(".profile-search");
    if (box && !box.contains(event.target)) {
      setSearchOpen(false);
      setSearch("");
      setResults([]);
    }
  }

  document.addEventListener("mousedown", handleClickOutside);
  return () => document.removeEventListener("mousedown", handleClickOutside);
}, []);
  useEffect(() => {
    if (!searchOpen) return;

    const q = search.trim();

    if (q.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setSearching(true);

        const res = await fetch(`/api/profiles/search?q=${encodeURIComponent(q)}`);
        const data = await res.json().catch(() => []);

        if (!res.ok) {
          setResults([]);
          return;
        }

        setResults(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Erro ao buscar perfis:", err);
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [search, searchOpen]);

  return (
    <header
      className="site-hero"
      id="inicio"
      style={{
        background: heroBg,
        color: textColor,
        "--hero-bg": heroBg,
        "--topbar-bg": topbarBg,
        "--primary": buttonColor,
        "--accent": accentColor,
        "--hero-text": textColor,
        "--hero-overlay": overlayColor,
      }}
    >
      <nav className="topbar" style={{ background: topbarBg }}>
        <div className="topbar-inner">
          <div className="brand" onClick={goHome} style={{ cursor: "pointer" }}>
            <div className="brand-logo">
              {logo ? <img src={logo} alt={nome} /> : <span>{nome.charAt(0)}</span>}
            </div>

            <div className="brand-text">
              <strong>{nome}</strong>
              <small>{servico}</small>
            </div>
          </div>

          <div className="nav-links">
            <a href="https://rendaja.online">Início</a>
            {showAbout && <a href="#sobre">Sobre</a>}
            {showServices && <a href="#servicos">Serviços</a>}
            {showStore && <a href="#loja">Loja</a>}
            {showPortfolio && <a href="#portfolio">Galeria</a>}
            {showReviews && <a href="#avaliacoes">Depoimentos</a>}
            <a href="#cta-final">Contato</a>
          </div>
<div className={`profile-search ${searchOpen ? "open" : ""}`}>
  <div className="profile-search-shell">
    <button
      type="button"
      className="profile-search-trigger"
      onClick={searchOpen ? () => setSearchOpen(false) : openSearch}
      aria-label="Buscar profissionais"
    >
      <svg
  width="18"
  height="18"
  viewBox="0 0 24 24"
  fill="none"
  aria-hidden="true"
>
  <path
    d="M10.8 18.1a7.3 7.3 0 1 1 0-14.6 7.3 7.3 0 0 1 0 14.6Z"
    stroke="currentColor"
    strokeWidth="2.4"
  />
  <path
    d="M16.2 16.2 21 21"
    stroke="currentColor"
    strokeWidth="2.4"
    strokeLinecap="round"
  />
</svg>
    </button>

    <input
      ref={searchRef}
      className="profile-search-input"
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      placeholder="Buscar profissional..."
    />
  </div>

  {searchOpen && (searching || results.length > 0 || search.length >= 2) && (
    <div className="profile-search-results">
      {searching ? (
        <span className="profile-search-empty">Buscando...</span>
      ) : results.length === 0 ? (
        <span className="profile-search-empty">
          Nenhum perfil ativo encontrado
        </span>
      ) : (
        results.map((item) => (
  <a
    key={item.id || item.slug}
    href={`/p/${item.slug}`}
    className="profile-search-item"
  >
    <div className="profile-search-avatar">
      {item.logo_url ? (
        <img src={item.logo_url} alt={item.nome} />
      ) : (
        <span>{String(item.nome || "R").charAt(0)}</span>
      )}
    </div>

    <div className="profile-search-info">
      <strong>{item.nome}</strong>
      <span>
        {item.servico || "Profissional"}
        {item.cidade ? ` • ${item.cidade}` : ""}
        {item.estado ? `/${item.estado}` : ""}
      </span>
    </div>

    <em>Ver</em>
  </a>
))
      )}
    </div>
  )}
</div>
          {whatsapp && (
            <a
              className="topbar-cta"
              href={`https://wa.me/${whatsapp}`}
              target="_blank"
              rel="noreferrer"
              style={{ background: buttonColor, color: buttonTextColor }}
            >
              Falar no WhatsApp
            </a>
          )}

          <button
  type="button"
  className={`mobile-menu-button ${menuOpen ? "active" : ""}`}
  onClick={() => setMenuOpen((prev) => !prev)}
  aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
>
  <span className="menu-line menu-line-top" />
  <span className="menu-line menu-line-middle" />
  <span className="menu-line menu-line-bottom" />
</button>
        </div>

        {menuOpen && (
          <div className="mobile-menu-panel">
            <a href="https://rendaja.online" onClick={closeMenu}>Início</a>
            {showAbout && <a href="#sobre" onClick={closeMenu}>Sobre</a>}
            {showServices && <a href="#servicos" onClick={closeMenu}>Serviços</a>}
            {showStore && <a href="#loja" onClick={closeMenu}>Loja</a>}
            {showPortfolio && <a href="#portfolio" onClick={closeMenu}>Galeria</a>}
            {showReviews && <a href="#avaliacoes" onClick={closeMenu}>Depoimentos</a>}
            <a href="#cta-final" onClick={closeMenu}>Contato</a>
          </div>
        )}
      </nav>

      <div className="hero-wrap">
        <div className="hero-copy">
          <span className="hero-kicker" style={{ color: buttonColor }}>
            {kicker}
          </span>

          <h1>
            {servico}
            <em style={{ color: accentColor }}> em {cidade}</em>
          </h1>

          <p>{descricao}</p>

          <div className="hero-actions">
            {whatsapp && (
              <a
                className="main-cta"
                href={`https://wa.me/${whatsapp}`}
                target="_blank"
                rel="noreferrer"
                style={{ background: buttonColor, color: buttonTextColor }}
              >
                Falar no WhatsApp
              </a>
            )}

            {showServices && (
              <a className="ghost-cta" href="#servicos">
                Ver serviços
              </a>
            )}
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