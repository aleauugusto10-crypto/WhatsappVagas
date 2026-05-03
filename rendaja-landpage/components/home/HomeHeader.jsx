import { useEffect, useRef, useState } from "react";

export default function HomeHeader() {
  const WHATSAPP = "https://wa.me/5579999033717";

  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const searchRef = useRef(null);

  function openSearch() {
    setSearchOpen(true);
  }

  function handleSearchSubmit(e) {
    e.preventDefault();

    const firstResult = results[0];

    if (firstResult?.slug) {
      window.location.href = `/p/${firstResult.slug}`;
      return;
    }

    setSearchOpen(true);
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

  useEffect(() => {
    if (!searchOpen) return;

    const term = search.trim();

    if (term.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setSearching(true);

        const res = await fetch(
          `/api/profiles/search?q=${encodeURIComponent(term)}`
        );

        const data = await res.json().catch(() => []);

        if (!res.ok) {
          setResults([]);
          return;
        }

        setResults(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Erro ao buscar perfis:", error);
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [search, searchOpen]);

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
            onClick={() =>
              searchOpen ? setSearchOpen(false) : openSearch()
            }
            aria-label="Abrir busca"
          >
            🔍
          </button>

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={openSearch}
            placeholder="Buscar perfis..."
          />

          {searchOpen && (
            <button type="submit" className="headerSearchSubmit">
              Buscar
            </button>
          )}

          {searchOpen && search.trim().length >= 2 && (
            <div className="headerSearchResults">
              {searching ? (
                <span className="headerSearchEmpty">Buscando...</span>
              ) : results.length === 0 ? (
                <span className="headerSearchEmpty">
                  Nenhum perfil ativo encontrado
                </span>
              ) : (
                results.map((item) => (
                  <a
                    key={item.id || item.slug}
                    href={`/p/${item.slug}`}
                    className="headerSearchItem"
                  >
                    <div className="headerSearchAvatar">
                      {item.logo_url ? (
                        <img src={item.logo_url} alt={item.nome} />
                      ) : (
                        <span>{String(item.nome || "R").charAt(0)}</span>
                      )}
                    </div>

                    <div>
                      <strong>{item.nome}</strong>
                      <small>
                        {item.servico || "Profissional"}
                        {item.cidade ? ` • ${item.cidade}` : ""}
                        {item.estado ? `/${item.estado}` : ""}
                      </small>
                    </div>

                    <em>Ver</em>
                  </a>
                ))
              )}
            </div>
          )}
        </form>

        <a href="#missoes">Missões</a>
        <a href="#empresas">Empresas</a>
        <a href="#perfis">Perfis</a>
      </nav>
<div className="actions">
  <a
    href="https://instagram.com/rendaja.zap"
    target="_blank"
    rel="noopener noreferrer"
    className="btn-instagram"
    aria-label="Instagram RendaJá"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      width="20"
      height="20"
    >
      <path d="M7.75 2C4.574 2 2 4.574 2 7.75v8.5C2 19.426 4.574 22 7.75 22h8.5C19.426 22 22 19.426 22 16.25v-8.5C22 4.574 19.426 2 16.25 2h-8.5zm0 2h8.5C18.56 4 20 5.44 20 7.75v8.5C20 18.56 18.56 20 16.25 20h-8.5C5.44 20 4 18.56 4 16.25v-8.5C4 5.44 5.44 4 7.75 4zm8.75 1.5a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5zM12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 2a3 3 0 1 1 0 6 3 3 0 0 1 0-6z"/>
    </svg>
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
              onChange={(e) => {
                setSearch(e.target.value);
                setSearchOpen(true);
              }}
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