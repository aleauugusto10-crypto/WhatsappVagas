import { useEffect, useRef, useState } from "react";

export default function HomeHeader() {
  const WHATSAPP = "https://wa.me/5579990000000";

  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");

  const searchRef = useRef(null);

  function handleSearchSubmit(e) {
    e.preventDefault();

    const term = search.trim();

    if (!term) {
      setSearchOpen(true);
      return;
    }

    window.location.href = `/p?search=${encodeURIComponent(term)}`;
  }

  useEffect(() => {
    function handleClickOutside(event) {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setSearchOpen(false);
      }
    }

    function handleEsc(event) {
      if (event.key === "Escape") {
        setSearchOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEsc);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, []);

  return (
    <header className="header">
      <a href="/" className="brand">
        <img src="/rendaja-logo.png" alt="RendaJá" className="brandIcon" />

        <div className="logo">
          Renda<span>Já</span>
        </div>
      </a>

      <nav className="nav">
        <form
          ref={searchRef}
          className={`headerSearch ${searchOpen ? "open" : ""}`}
          onSubmit={handleSearchSubmit}
        >
          <button
            type="button"
            className="headerSearchToggle"
            onClick={() => setSearchOpen((value) => !value)}
            aria-label="Abrir busca"
          >
            🔍
          </button>

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar perfis..."
          />

          {searchOpen && (
            <button type="submit" className="headerSearchSubmit">
              Buscar
            </button>
          )}
        </form>

        <a href="#missoes">Missões</a>
        <a href="#empresas">Empresas</a>
        <a href="#perfis">Perfis</a>
      </nav>

      <div className="actions">
        <a href="#perfis" className="link">
          Ver perfis
        </a>

        <a href={WHATSAPP} className="btn-whatsapp">
          Entrar no WhatsApp
        </a>
      </div>

      <button
        type="button"
        className="menu-toggle"
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label="Abrir menu"
      >
        ☰
      </button>

      {menuOpen && (
        <div className="mobile-menu">
          <form className="mobileSearch" onSubmit={handleSearchSubmit}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar perfis..."
            />

            <button type="submit">Buscar</button>
          </form>

          <a href="#missoes" onClick={() => setMenuOpen(false)}>
            Missões
          </a>

          <a href="#empresas" onClick={() => setMenuOpen(false)}>
            Empresas
          </a>

          <a href="#perfis" onClick={() => setMenuOpen(false)}>
            Perfis
          </a>

          <a href={WHATSAPP} className="btn-whatsapp">
            WhatsApp
          </a>
        </div>
      )}
    </header>
  );
}