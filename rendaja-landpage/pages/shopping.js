import Head from "next/head";
import { useEffect, useMemo, useState } from "react";
import ShoppingJobsSection from "../components/shopping/ShoppingJobsSection";
import ShoppingMissionsSection from "../components/shopping/ShoppingMissionsSection";
import NotificationPackages from "../components/shopping/NotificationPackages";
import ShoppingTopbar from "../components/shopping/ShoppingTopbar";
import {
  ShoppingSearchBar,
  ShoppingCategoryRail,
  
  ShoppingCarousel,
  BusinessCard,
  ProductCard,
  PromoBanner,
  ShoppingEmptyState,
  ShoppingSkeleton,
  ShoppingFeatureStrip,
  SeasonalShowcase,
  ProductWall,
  ShoppingOutdoor,

  
} from "../components/shopping";

const CATEGORIES = [
  { id: "todos", label: "Todos", icon: "✦" },

  { id: "moda", label: "Moda", icon: "👕" },

  { id: "beleza", label: "Beleza", icon: "💄" },

  { id: "servicos", label: "Serviços", icon: "🛠️" },

  { id: "comida", label: "Gastronomia", icon: "🍽️" },

  { id: "tecnologia", label: "Tecnologia", icon: "📱" },

  { id: "casa", label: "Casa", icon: "🏡" },
];

function normalizeText(value = "") {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getStoreItems(profile) {
  if (!profile?.store_items) return [];
  if (Array.isArray(profile.store_items)) return profile.store_items;

  try {
    return JSON.parse(profile.store_items);
  } catch {
    return [];
  }
}

function profileMatchesCategory(profile, category) {
  if (!category || category === "todos") return true;

  const fullText = normalizeText(
    [
      profile.nome,
      profile.servico,
      profile.categoria,
      profile.categoria_principal,
      profile.area_principal,
      profile.descricao,
      profile.descricao_perfil,
      JSON.stringify(profile.store_items || ""),
    ].join(" ")
  );

  const map = {
    moda: ["moda", "roupa", "estilo", "camisa", "calcado", "calçado", "tenis", "tênis"],
    beleza: ["beleza", "estetica", "estética", "barbearia", "cabelo", "unha", "nails"],
    servicos: ["servico", "serviço", "profissional", "manutencao", "manutenção", "frete", "pedreiro"],
    comida: ["comida", "lanche", "pizza", "restaurante", "delivery", "hamburguer", "hambúrguer"],
    tecnologia: ["tecnologia", "software", "site", "sistema", "design", "celular", "assistência"],
    casa: ["casa", "decoracao", "decoração", "moveis", "móveis", "limpeza", "jardim"],
  };

  return (map[category] || []).some((word) =>
    fullText.includes(normalizeText(word))
  );
}

function buildProductsFromProfiles(profiles = []) {
  return profiles.flatMap((profile) => {
    const items = getStoreItems(profile);

    return items.map((item, index) => ({
      ...item,
      id: `${profile.id}-${index}`,
      profile_id: profile.id,
      profile_slug: profile.slug,
      business_name: profile.nome,
      whatsapp: profile.whatsapp,
      image_url:
        item.image_url ||
        item.image ||
        item.photo_url ||
        profile.hero_image_url ||
        profile.logo_url,
    }));
  });
}

function shuffleArray(array = []) {
  return [...array].sort(() => Math.random() - 0.5);
}

function filterProductsByQuery(products = [], query = "") {
  const q = normalizeText(query);
  if (!q) return products;

  return products.filter((product) => {
    const text = normalizeText(
      [
        product.title,
        product.name,
        product.description,
        product.category,
        product.business_name,
      ].join(" ")
    );

    return text.includes(q);
  });
}

function hasProducts(products = []) {
  return Array.isArray(products) && products.length > 0;
}
export default function ShoppingPage() {
  const [profiles, setProfiles] = useState([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("todos");
  const [loading, setLoading] = useState(true);
  const [shoppingLocation, setShoppingLocation] = useState(null);

  const isSearching = query.trim().length > 0;

  useEffect(() => {
    let alive = true;

    async function loadProfiles() {
      try {
        setLoading(true);

        const res = await fetch("/api/shopping/search?q=");
        const json = await res.json();

        const rows = Array.isArray(json)
          ? json
          : json.profiles || json.data || [];

        if (!alive) return;

        setProfiles(rows.filter((item) => item?.is_active !== false));
      } catch (err) {
        console.error("Erro ao carregar shopping:", err);
        if (alive) setProfiles([]);
      } finally {
        if (alive) setLoading(false);
      }
    }

    loadProfiles();

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("shopping_location");

    if (saved) {
      try {
        setShoppingLocation(JSON.parse(saved));
        return;
      } catch {}
    }

    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;

          const res = await fetch(
            `/api/location/reverse?lat=${latitude}&lng=${longitude}`
          );

          const data = await res.json().catch(() => null);

          if (res.ok && data?.city) {
            const next = {
              city: data.city,
              state: data.state,
            };

            localStorage.setItem("shopping_location", JSON.stringify(next));
            setShoppingLocation(next);
          }
        } catch (err) {
          console.error("Erro ao detectar localização:", err);
        }
      },
      () => {},
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 1000 * 60 * 10,
      }
    );
  }, []);

  const filteredProfiles = useMemo(() => {
    const q = normalizeText(query);

    return profiles.filter((profile) => {
      const matchesCategory = profileMatchesCategory(profile, category);
      const storeItems = getStoreItems(profile);

      const storeText = storeItems
        .map((item) =>
          [
            item.title,
            item.name,
            item.description,
            item.category,
            item.price,
          ].join(" ")
        )
        .join(" ");

      const profileText = normalizeText(
        [
          profile.nome,
          profile.servico,
          profile.cidade,
          profile.estado,
          profile.descricao,
          profile.descricao_perfil,
          profile.slug,
          storeText,
        ].join(" ")
      );

      const matchesQuery = !q || profileText.includes(q);

      const matchesLocation =
        !shoppingLocation?.city ||
        normalizeText(profile.cidade) === normalizeText(shoppingLocation.city);

      return matchesCategory && matchesQuery && matchesLocation;
    });
  }, [profiles, query, category, shoppingLocation]);

  const allProductsFromFilteredProfiles = useMemo(
    () => buildProductsFromProfiles(filteredProfiles),
    [filteredProfiles]
  );

  const filteredProducts = useMemo(
    () => filterProductsByQuery(allProductsFromFilteredProfiles, query),
    [allProductsFromFilteredProfiles, query]
  );

  const randomProfiles = useMemo(
    () => shuffleArray(filteredProfiles),
    [filteredProfiles]
  );

  const randomProducts = useMemo(
    () => shuffleArray(filteredProducts),
    [filteredProducts]
  );
  return (
    <>
      <Head>
        <title>Shopping RendaJá — Comércios e profissionais perto de você</title>
        <meta
          name="description"
          content="Explore empresas, produtos, serviços e profissionais cadastrados no RendaJá. Um shopping digital aberto para sua cidade."
        />
      </Head>

      <main className={`shoppingPage ${isSearching ? "isSearching" : ""}`}>
        <ShoppingTopbar
  location={shoppingLocation}
  onLocationChange={setShoppingLocation}
/>
        {!isSearching && (
          <ShoppingOutdoor profiles={randomProfiles} products={randomProducts} />
        )}

        <ShoppingSearchBar value={query} onChange={setQuery} />

        <ShoppingCategoryRail
          categories={CATEGORIES}
          active={category}
          onChange={setCategory}
        />

     {!isSearching && <PromoBanner />}

{!isSearching && (
  <>
    <ShoppingFeatureStrip
     items={[
  {
    href: "/shopping/vagas",
    label: "💼 Vagas",
    title: "Vagas perto de você",
    text: "Veja oportunidades cadastradas por empresas e comércios da sua região.",
  },
  {
    href: "/shopping/missoes",
    label: "🎯 Missões",
    title: "Missões rápidas",
    text: "Tarefas locais, divulgações, entregas e ações pontuais.",
  },
  {
    href: "/shopping/alertas",
    label: "📲 Alertas",
    title: "Receba no WhatsApp",
    text: "Escolha um pacote e receba vagas e missões direto no celular.",
  },
]}
    />

  
  </>
)}

{loading ? (
  <ShoppingSkeleton />
) : filteredProfiles.length === 0 && filteredProducts.length === 0 ? (
          <ShoppingEmptyState query={query} />
        ) : isSearching ? (
          <>
            {hasProducts(randomProducts) && (
              <ProductWall
                products={randomProducts}
                eyebrow="Busca"
                title={`Produtos para "${query}"`}
                subtitle="Itens e serviços encontrados nas vitrines cadastradas."
              />
            )}

            <ShoppingCarousel
              eyebrow="Resultados"
              title={`Vitrines para "${query}"`}
              subtitle={`${filteredProfiles.length} perfis encontrados`}
            >
              {randomProfiles.slice(0, 18).map((profile, index) => (
                <div
                  key={`search-profile-${profile.id}`}
                  className={`dynamicBusinessItem ${
                    index % 4 === 0 ? "large" : index % 3 === 0 ? "medium" : ""
                  }`}
                >
                  <BusinessCard profile={profile} compact={index % 2 === 0} />
                </div>
              ))}
            </ShoppingCarousel>
          </>
        ) : (
  <>
    <ShoppingCarousel
              eyebrow="Destaques"
              title="Produtos em destaque"
              subtitle="Itens aleatórios das vitrines do RendaJá."
            >
              {randomProducts.slice(0, 12).map((product) => (
                <ProductCard key={`featured-${product.id}`} product={product} />
              ))}
            </ShoppingCarousel>

            <SeasonalShowcase products={filteredProducts} />



            <ShoppingCarousel
              eyebrow="Serviços"
              title="Profissionais e serviços"
              subtitle="Descubra profissionais ativos na plataforma."
            >
              {randomProfiles.slice(0, 12).map((profile) => (
                <BusinessCard key={`service-${profile.id}`} profile={profile} />
              ))}
            </ShoppingCarousel>

            <ShoppingCarousel
              eyebrow="Vitrines"
              title="Empresas e lojas"
              subtitle="Negócios locais cadastrados no shopping."
            >
              {randomProfiles.slice(0, 12).map((profile) => (
                <BusinessCard
                  key={`business-${profile.id}`}
                  profile={profile}
                  compact
                />
              ))}
            </ShoppingCarousel>

            <ProductWall
              products={randomProducts}
              eyebrow="Vitrine aberta"
              title="Mais produtos no shopping"
              subtitle="Itens, serviços para explorar."
            />

          <ShoppingCarousel
  eyebrow="Descoberta"
  title="Outras vitrines abertas"
  subtitle="Empresas, profissionais e comércios para conhecer."
>
  {randomProfiles.slice(0, 18).map((profile) => (
    <div key={`open-vitrine-${profile.id}`} className="wideBusinessItem">
      <BusinessCard profile={profile} />
    </div>
  ))}
</ShoppingCarousel>
          </>
        )}
      </main>
    </>
  );
}