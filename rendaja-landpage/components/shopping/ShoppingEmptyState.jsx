export default function ShoppingEmptyState({ query }) {
  return (
    <section className="shoppingEmptyState">
      <div>🔎</div>

      <h2>Nada encontrado por enquanto</h2>

      <p>
        {query
          ? `Não encontramos resultados para "${query}". Tente buscar por outra categoria, produto ou serviço.`
          : "Ainda não encontramos vitrines para essa categoria."}
      </p>
    </section>
  );
}