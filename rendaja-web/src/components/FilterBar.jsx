import React from "react";
export default function FilterBar({ search, setSearch, cidade, setCidade, estado, setEstado, placeholder = "Buscar..." }) {
  return (
    <div className="toolbar">
      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={placeholder} />
      <input value={cidade} onChange={(e) => setCidade(e.target.value)} placeholder="Cidade" />
      <input value={estado} onChange={(e) => setEstado(e.target.value.toUpperCase())} placeholder="UF" maxLength={2} />
    </div>
  );
}
