import ProductCard from "./ProductCard";

export default function ProductWall({
  products = [],
  eyebrow = "Vitrine aberta",
  title = "Mais produtos no shopping",
  subtitle = "Itens, serviços e ofertas cadastradas pelas empresas.",
}) {
  const items = products.slice(0, 32);

  if (!items.length) return null;

  return (
    <section className="productWall productWallDynamic">
      <div className="shoppingSectionHead">
        <div>
          <span>{eyebrow}</span>
          <h2>{title}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
      </div>

      <div className="productWallTrack">
        {items.map((product) => (
          <div className="productWallItem" key={`wall-${product.id}`}>
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </section>
  );
}