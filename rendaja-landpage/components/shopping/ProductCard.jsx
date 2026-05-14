function formatPrice(value) {
  const number = Number(value || 0);

  if (!number) return "Consultar";

  return number.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default function ProductCard({ product }) {
  if (!product) return null;

  const url = product.profile_slug
    ? `/p/${product.profile_slug}?produto=${encodeURIComponent(product.title || "")}`
    : "#";

  return (
    <article className="productCard">
      <a href={url} className="productCardImage">
        {product.image_url ? (
          <img src={product.image_url} alt={product.title || "Produto"} />
        ) : (
          <div className="productCardFallback">🛍️</div>
        )}

        <span>Ver na loja</span>
      </a>

      <div className="productCardBody">
        <small>{product.business_name || "CompreTudo.shop"}</small>

        <a href={url}>
          <h3>{product.title || product.name || "Produto ou serviço"}</h3>
        </a>

        <strong>{formatPrice(product.price)}</strong>
      </div>
    </article>
  );
}