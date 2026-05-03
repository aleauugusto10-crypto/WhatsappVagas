import { useState } from "react";

export default function HomeSearchProfiles() {
  const [search, setSearch] = useState("");

  function handleSubmit(e) {
    e.preventDefault();

    const term = search.trim();

    if (!term) return;

    window.location.href = `/p?search=${encodeURIComponent(term)}`;
  }

  return (
    <section className="homeSearchProfiles" id="buscar">
      <div className="searchIntro">
        <span className="sectionLabel">Buscar profissionais</span>

        <h2>Encontre quem resolve o que você precisa</h2>

        <p>
          Pesquise por profissão, serviço, empresa, cidade ou nome. A busca vai
          mostrar os perfis públicos ativos dentro do RendaJá.
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

        <button type="submit">Buscar</button>
      </form>

      <div className="searchSuggestions">
        <span>Buscas populares:</span>
        <button type="button" onClick={() => setSearch("pedreiro")}>
          Pedreiro
        </button>
        <button type="button" onClick={() => setSearch("manicure")}>
          Manicure
        </button>
        <button type="button" onClick={() => setSearch("eletricista")}>
          Eletricista
        </button>
        <button type="button" onClick={() => setSearch("diarista")}>
          Diarista
        </button>
      </div>
    </section>
  );
}