export default function ShoppingSearchBar({ value = "", onChange }) {
  return (
    <section className="shoppingSearchWrap">
      <div className="shoppingSearchBox">
        <span className="shoppingSearchIcon">🔎</span>

        <input
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder="Buscar produto, serviço, empresa ou profissional..."
        />

        {value ? (
          <button type="button" onClick={() => onChange?.("")}>
            Limpar
          </button>
        ) : (
          <em>Ex: manicure, site, camisa, pizza...</em>
        )}
      </div>
    </section>
  );
}