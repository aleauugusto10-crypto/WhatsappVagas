import { useMemo, useState } from "react";
import PrintProductCard from "./PrintProductCard";
import PrintProductModal from "./PrintProductModal";
import LogoCreationModal from "./LogoCreationModal";
import { PRINT_CATEGORIES, PRINT_PRODUCTS } from "./printProducts";
import { useEffect } from "react";
import { getAiCreditWallet, getAiGeneratedAssets } from "../../../src/lib/aiCredits";
export default function PrintShopSection({ profile }) {
  const [selectedCategory, setSelectedCategory] = useState("logo");
  const [selectedProduct, setSelectedProduct] = useState(null);
const [wallet, setWallet] = useState({ credits: 0 });
const [assets, setAssets] = useState([]);
  const activeCategory = PRINT_CATEGORIES.find(
    (category) => category.id === selectedCategory
  );

  const products = useMemo(() => {
    return PRINT_PRODUCTS.filter(
      (product) => product.categoryId === selectedCategory
    );
  }, [selectedCategory]);
useEffect(() => {
  async function loadAiData() {
    const savedUser = localStorage.getItem("rendaja_user");
    const user = savedUser ? JSON.parse(savedUser) : null;

    if (!user?.id) return;

    const walletData = await getAiCreditWallet(user.id);
    const assetsData = await getAiGeneratedAssets(user.id);

    setWallet(walletData);
    setAssets(assetsData);
  }

  loadAiData();
}, []);
  return (
    <section className="printshop-section">
      <div className="printshop-hero">
        <div>
          <span className="printshop-kicker">Gráfica CompreTudo</span>
          <h2>Produtos gráficos para divulgar seu negócio</h2>
          <p>
            Crie logomarcas, cartões, panfletos, posts, adesivos e banners com
            padrão profissional, medidas corretas e suporte de IA.
          </p>
        </div>
<div className="printshop-ai-status">
  <div>
    <span>Créditos disponíveis</span>
    <strong>{wallet?.credits || 0}</strong>
  </div>

  <div>
    <span>Artes na galeria</span>
    <strong>{assets.length}</strong>
  </div>

  <button type="button">
    Comprar créditos
  </button>
</div>
        <div className="printshop-hero-badge">
          <strong>IA + gráfica</strong>
          <span>Artes, identidade visual e produção em um só lugar</span>
        </div>
      </div>

      <div className="printshop-store-layout">
        <aside className="printshop-category-sidebar">
          <span className="printshop-sidebar-label">Categorias</span>

          {PRINT_CATEGORIES.map((category) => (
            <button
              key={category.id}
              type="button"
              className={
                selectedCategory === category.id
                  ? "printshop-category-button active"
                  : "printshop-category-button"
              }
              onClick={() => setSelectedCategory(category.id)}
            >
              <span>{category.icon}</span>

              <div>
                <strong>{category.label}</strong>
                <small>{category.description}</small>
              </div>
            </button>
          ))}
        </aside>

        <div className="printshop-products-area">
          <div className="printshop-category-head">
            <div>
              <span className="printshop-kicker">
                {activeCategory?.icon} {activeCategory?.label}
              </span>

              <h3>{activeCategory?.label}</h3>
              <p>{activeCategory?.description}</p>
            </div>
          </div>

          <div className="printshop-grid">
            {products.map((product) => (
              <PrintProductCard
                key={product.id}
                product={product}
                onSelect={setSelectedProduct}
              />
            ))}
          </div>
        </div>
      </div>

      {selectedProduct?.type === "logo" && (
        <LogoCreationModal
          product={selectedProduct}
          profile={profile}
          onClose={() => setSelectedProduct(null)}
        />
      )}

      {selectedProduct && selectedProduct.type !== "logo" && (
        <PrintProductModal
          product={selectedProduct}
          profile={profile}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </section>
  );
}