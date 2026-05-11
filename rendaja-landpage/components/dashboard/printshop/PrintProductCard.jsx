import { formatMoneyBR } from "./printProducts";
 

export default function PrintProductCard({ product, onSelect }) {
  return (
    <article className="print-product-card">
      <div className="print-product-top">
        <div className="print-product-icon">{product.icon}</div>

        <div>
          <h3>{product.name}</h3>
          <p>{product.subtitle}</p>
        </div>
      </div>

      <div className="print-product-specs">
        <span>{product.sizeLabel}</span>
        <span>{product.dpi} DPI</span>
        {product.bleedMm > 0 && <span>Sangria {product.bleedMm}mm</span>}
      </div>

      <div className="print-product-footer">
        <strong>A partir de {formatMoneyBR(product.priceFrom)}</strong>

        <button type="button" onClick={() => onSelect(product)}>
          Criar arte
        </button>
      </div>
    </article>
  );
}