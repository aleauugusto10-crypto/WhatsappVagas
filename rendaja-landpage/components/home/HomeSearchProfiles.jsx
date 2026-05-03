import { useEffect, useState } from "react";

export default function HomeSearchProfiles() {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  async function searchProfiles(term) {
    const q = String(term || "").trim();

    if (q.length < 2) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    try {
      setSearching(true);
      setHasSearched(true);

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
  }

  function handleSubmit(e) {
    e.preventDefault();
    searchProfiles(search);
  }

  function handleSuggestion(term) {
    setSearch(term);
    searchProfiles(term);
  }

  useEffect(() => {
    const term = search.trim();

    if (term.length < 2) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    const timer = setTimeout(() => {
      searchProfiles(term);
    }, 350);

    return () => clearTimeout(timer);
  }, [search]);

  return (
    <section className="homeSearchProfiles" id="buscar">
      <div className="searchIntro">
        <span className="sectionLabel">Buscar profissionais</span>

        <h2>Encontre quem resolve o que você precisa</h2>

        <p>
          Pesquise por profissão, serviço, empresa, cidade ou nome. A busca
          mostra os perfis públicos ativos dentro do RendaJá.
        </p>
      </div>

      <form className="searchBoxLarge" onSubmit={handleSubmit}>
        <div className="searchIcon">🔍</div>

        <input
          type="text"
          placeholder="Ex: pedreiro, manicure, eletricista, empresa..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <button type="submit">
          {searching ? "Buscando..." : "Buscar"}
        </button>
      </form>

      <div className="searchSuggestions">
        <span>Buscas populares:</span>

        <button type="button" onClick={() => handleSuggestion("pedreiro")}>
          Pedreiro
        </button>

        <button type="button" onClick={() => handleSuggestion("manicure")}>
          Manicure
        </button>

        <button type="button" onClick={() => handleSuggestion("eletricista")}>
          Eletricista
        </button>

        <button type="button" onClick={() => handleSuggestion("diarista")}>
          Diarista
        </button>
      </div>

      {hasSearched && (
        <div className="homeSearchResults">
          {searching ? (
            <div className="homeSearchStatus">Buscando perfis ativos...</div>
          ) : results.length === 0 ? (
            <div className="homeSearchStatus">
              Nenhum perfil ativo encontrado.
            </div>
          ) : (
            results.map((item) => (
              <a
                key={item.id || item.slug}
                href={`/p/${item.slug}`}
                className="homeSearchResultCard"
              >
                <div className="homeSearchResultAvatar">
                  {item.logo_url ? (
                    <img src={item.logo_url} alt={item.nome} />
                  ) : (
                    <span>{String(item.nome || "R").charAt(0)}</span>
                  )}
                </div>

                <div>
                  <strong>{item.nome}</strong>
                  <p>
                    {item.servico || "Profissional"}
                    {item.cidade ? ` • ${item.cidade}` : ""}
                    {item.estado ? `/${item.estado}` : ""}
                  </p>
                </div>

                <em>Ver perfil</em>
              </a>
            ))
          )}
        </div>
      )}
    </section>
  );
}