import { useMemo, useState, useRef, useEffect } from "react";

function money(value = 0) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function getAffiliateRef() {
  if (typeof window === "undefined") return "";

  const params = new URLSearchParams(window.location.search);

  return (
    params.get("ref") ||
    params.get("affiliate") ||
    params.get("vendedor") ||
    ""
  );
}

function onlyDigits(value = "") {
  return String(value || "").replace(/\D/g, "");
}

function normalizeText(value = "") {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function isService(item) {
  return (item?.type || "service") === "service";
}

function isProduct(item) {
  return item?.type === "product";
}

function isQuote(item) {
  return item?.price_type === "quote";
}

function serviceUsesBooking(item, profile) {
  return (
    profile?.show_booking === true &&
    isService(item) &&
    item?.booking_enabled === true
  );
}

function getItemPriceLabel(item) {
  if (isQuote(item)) return "Sob orçamento";
  return money(item?.price || 0);
}

function itemControlsStock(item) {
  return isProduct(item) && item?.stock_mode === "quantity";
}

function getStockQty(item) {
  const total = Number(item?.stock_qty || 0);
  const reserved = Number(item?.reserved_qty || 0);
  const sold = Number(item?.sold_qty || 0);

  return Math.max(0, total - reserved - sold);
}

function itemIsUnavailable(item) {
  if (!isProduct(item)) return false;

  if (item?.in_stock === false) return true;

  if (itemControlsStock(item)) {
    return getStockQty(item) <= 0;
  }

  return false;
}

function getPublicStockLabel(item) {
  if (!isProduct(item)) return "";

  if (itemIsUnavailable(item)) return "Indisponível";

  if (itemControlsStock(item)) {
    const qty = getStockQty(item);

    if (qty <= 3) return `Últimas ${qty} peça(s)`;
    return `${qty} peça(s) restantes`;
  }

  return "Disponível";
}

function getCartQty(cart, itemId) {
  return cart
    .filter((item) => String(item.id) === String(itemId))
    .reduce((acc, item) => acc + Number(item.qty || 0), 0);
}

function getCartTotalQty(cart) {
  return cart.reduce((acc, item) => acc + Number(item.qty || 0), 0);
}

function productHasVariants(item) {
  return (
    item?.variants_enabled === true &&
    Array.isArray(item?.variants) &&
    item.variants.length > 0
  );
}

function StoreDetailsModal({
  item,
  onClose,
  onAdd,
  isUnavailable,
  stockLabel,
  priceLabel,
}) {
  const [qty, setQty] = useState(1);
  const [activeSlide, setActiveSlide] = useState(0);
  const sliderRef = useRef(null);

  if (!item) return null;

  function goToSlide(index) {
    setActiveSlide(index);

    const slider = sliderRef.current;
    if (!slider) return;

    slider.scrollTo({
      left: slider.clientWidth * index,
      behavior: "smooth",
    });
  }

  function handleSliderScroll() {
    const slider = sliderRef.current;
    if (!slider) return;

    const index = Math.round(slider.scrollLeft / slider.clientWidth);
    setActiveSlide(index);
  }

  const images = [];

  if (item.image_url) {
    images.push({
      url: item.image_url,
      label: item.title || "Imagem principal",
    });
  }

  if (Array.isArray(item.variants)) {
    item.variants.forEach((variant) => {
      (variant.options || []).forEach((option) => {
        if (option.image_url) {
          images.push({
            url: option.image_url,
            label: `${variant.name}: ${option.label}`,
          });
        }
      });
    });
  }

  const uniqueImages = images.filter(
    (img, index, arr) =>
      img.url && arr.findIndex((i) => i.url === img.url) === index
  );

  return (
    <div className="store-details-backdrop" onClick={onClose}>
      <div className="product-modal-card" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="product-modal-close" onClick={onClose}>
          ×
        </button>

        <div className="product-modal-media">
          {uniqueImages.length > 0 ? (
            <div
              ref={sliderRef}
              className="product-modal-slider"
              onScroll={handleSliderScroll}
            >
              {uniqueImages.map((img, index) => (
                <div key={`${img.url}-${index}`} className="product-modal-slide">
                  <img src={img.url} alt={img.label} />
                </div>
              ))}
            </div>
          ) : (
            <div className="product-modal-empty-image">
              {isProduct(item) ? "🛍️" : "✨"}
            </div>
          )}

          {uniqueImages.length > 1 && (
            <div className="product-modal-dots">
              {uniqueImages.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  className={index === activeSlide ? "active" : ""}
                  onClick={() => goToSlide(index)}
                  aria-label={`Ver imagem ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>

        <div className="product-modal-body">
          <div className="product-modal-topline">
            <span>{isProduct(item) ? "Produto" : "Serviço"}</span>

            {stockLabel && (
              <small className={isUnavailable ? "danger" : ""}>{stockLabel}</small>
            )}
          </div>

          <h3>{item.title || item.name || "Item sem nome"}</h3>

          <p>
            {item.description ||
              "Confira os detalhes deste item e escolha a quantidade antes de adicionar ao carrinho."}
          </p>

          <div className="product-modal-buy-row">
            <strong>{priceLabel}</strong>

            <div className="product-modal-qty">
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
              >
                −
              </button>

              <span>{qty}</span>

              <button type="button" onClick={() => setQty((q) => q + 1)}>
                +
              </button>
            </div>
          </div>

          <button
            type="button"
            className="product-modal-main-add"
            disabled={isUnavailable}
            onClick={() => onAdd(item, qty)}
          >
            {isUnavailable ? "Indisponível" : "Adicionar ao carrinho"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CartModal({
  cart,
  total,
  cartHasQuote,
  cartHasBookableService,
  automationWhatsapp,
  profile,
  customer,
  onClose,
  onChangeQty,
  onRemove,
  onCheckout,
  onOpenBooking,
}) {
  const totalQty = getCartTotalQty(cart);

  return (
    <div className="store-cart-modal-backdrop" onClick={onClose}>
      <div className="store-cart-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="store-cart-sheet-handle" />

        <div className="store-cart-sheet-head">
          <div>
            <span>Seu carrinho</span>
            <h3>{totalQty} item(ns) selecionado(s)</h3>
          </div>

          <button type="button" onClick={onClose} aria-label="Fechar carrinho">
            ×
          </button>
        </div>

        {cart.length === 0 ? (
          <div className="cart-empty cart-empty-modal">
            Adicione uma opção para continuar sua solicitação.
          </div>
        ) : (
          <div className="store-cart-sheet-list">
            {cart.map((item) => {
              const quote = isQuote(item);
              const canBook = serviceUsesBooking(item, profile);

              return (
                <div key={item.id} className="store-cart-sheet-item">
                  <div className="store-cart-sheet-item-main">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.title || "Item"} />
                    ) : (
                      <div className="store-cart-sheet-placeholder">
                        {isProduct(item) ? "🛍️" : "✨"}
                      </div>
                    )}

                    <div>
                      <strong>{item.title || item.name || "Item"}</strong>

                      {Array.isArray(item.selected_variants) &&
                        item.selected_variants.length > 0 && (
                          <small>
                            {item.selected_variants
                              .map((v) => `${v.variant_name}: ${v.label}`)
                              .join(" • ")}
                          </small>
                        )}

                      <small>
                        {quote ? "Sob orçamento" : `${money(item.price)} cada`}
                        {canBook ? " • precisa escolher horário" : ""}
                      </small>
                    </div>
                  </div>

                  <div className="store-cart-sheet-controls">
                    <button type="button" onClick={() => onChangeQty(item.id, -1)}>
                      −
                    </button>

                    <span>{item.qty}</span>

                    <button type="button" onClick={() => onChangeQty(item.id, 1)}>
                      +
                    </button>

                    <button
                      type="button"
                      className="remove"
                      onClick={() => onRemove(item.id)}
                    >
                      Remover
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="store-cart-sheet-summary">
          <div>
            <span>{cartHasQuote ? "Total parcial" : "Total estimado"}</span>
            <strong>{money(total)}</strong>
          </div>

          {cartHasQuote && (
            <p>Itens sob orçamento serão combinados pelo WhatsApp.</p>
          )}

          {cartHasBookableService ? (
            <button
              type="button"
              className="cart-checkout"
              onClick={onOpenBooking}
              disabled={cart.length === 0}
            >
              Escolher horário
            </button>
          ) : (
            <button
              type="button"
              className={`cart-checkout ${
                cart.length === 0 || !automationWhatsapp ? "disabled" : ""
              }`}
              onClick={onCheckout}
              disabled={cart.length === 0 || !automationWhatsapp}
            >
              {cartHasQuote ? "Solicitar orçamento" : "Finalizar pedido"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function StoreSection({ profile }) {
  const [liveStoreItems, setLiveStoreItems] = useState(
    Array.isArray(profile?.store_items) ? profile.store_items : []
  );

  const [cart, setCart] = useState([]);
  const [cartModalOpen, setCartModalOpen] = useState(false);
  const [variantModalOpen, setVariantModalOpen] = useState(false);
  const [variantProduct, setVariantProduct] = useState(null);
  const [pendingVariantQty, setPendingVariantQty] = useState(1);
  const [selectedVariants, setSelectedVariants] = useState({});
  const [filter, setFilter] = useState("all");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [detailsItem, setDetailsItem] = useState(null);
  const [customer, setCustomer] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    note: "",
  });

  const searchRef = useRef(null);

  useEffect(() => {
    setLiveStoreItems(
      Array.isArray(profile?.store_items) ? profile.store_items : []
    );
  }, [profile?.store_items]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (!searchRef.current) return;

      if (!searchRef.current.contains(event.target)) {
        setSearchOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  const automationWhatsapp = onlyDigits(
    process.env.NEXT_PUBLIC_AUTOMATION_WHATSAPP ||
      profile?.automation_whatsapp ||
      profile?.whatsapp ||
      profile?.phone ||
      ""
  );

  const affiliateRef = getAffiliateRef();

  const categories = useMemo(() => {
    return Array.isArray(profile?.store_categories)
      ? profile.store_categories.filter((category) => category?.active !== false)
      : [];
  }, [profile]);

  const items = useMemo(() => {
    return Array.isArray(liveStoreItems)
      ? liveStoreItems.filter((item) => item?.active !== false)
      : [];
  }, [liveStoreItems]);

  const hasServices = items.some(isService);
  const hasProducts = items.some(isProduct);

  const dynamicTitle = useMemo(() => {
    if (profile?.store_title) return profile.store_title;

    if (hasProducts && hasServices) return "Cardápio e serviços";
    if (hasProducts) return "Produtos disponíveis";
    if (hasServices) return "Serviços disponíveis";

    return "Catálogo";
  }, [profile?.store_title, hasProducts, hasServices]);

  const dynamicText = useMemo(() => {
    if (profile?.store_text) return profile.store_text;

    if (hasProducts && hasServices) {
      return "Escolha produtos, serviços ou opções do cardápio e envie seu pedido com praticidade.";
    }

    if (hasProducts) {
      return "Veja os produtos disponíveis e faça seu pedido direto pelo WhatsApp.";
    }

    if (hasServices) {
      return "Conheça os serviços disponíveis e solicite atendimento de forma rápida.";
    }

    return "Em breve novas opções estarão disponíveis nesta página.";
  }, [profile?.store_text, hasProducts, hasServices]);

  const catalogLabel = useMemo(() => {
    if (hasProducts && hasServices) return "Marketplace local";
    if (hasProducts) return "Vitrine de produtos";
    if (hasServices) return "Vitrine de serviços";
    return "Catálogo";
  }, [hasProducts, hasServices]);

  const categoryMap = useMemo(() => {
    return new Map(categories.map((category) => [category.id, category]));
  }, [categories]);

  const visibleItems = useMemo(() => {
    const term = normalizeText(searchTerm);

    return items.filter((item) => {
      const matchFilter =
        filter === "all" ||
        (filter === "service" && isService(item)) ||
        (filter === "product" && isProduct(item)) ||
        item.category_id === filter;

      const category = categoryMap.get(item.category_id);

      const searchableText = normalizeText(
        [
          item.title,
          item.name,
          item.description,
          item.type,
          item.price_type,
          category?.name,
        ]
          .filter(Boolean)
          .join(" ")
      );

      const matchSearch = !term || searchableText.includes(term);

      return matchFilter && matchSearch;
    });
  }, [items, filter, searchTerm, categoryMap]);

  const visibleCategoryGroups = useMemo(() => {
    return categories
      .map((category) => ({
        category,
        items: visibleItems.filter((item) => item.category_id === category.id),
      }))
      .filter((group) => group.items.length > 0);
  }, [categories, visibleItems]);

  const uncategorizedItems = useMemo(() => {
    return visibleItems.filter((item) => !item.category_id);
  }, [visibleItems]);

  const cartHasBookableService = cart.some((item) =>
    serviceUsesBooking(item, profile)
  );

  const cartHasQuote = cart.some(isQuote);

  const total = cart.reduce((acc, item) => {
    if (isQuote(item)) return acc;
    return acc + Number(item.price || 0) * item.qty;
  }, 0);

  const totalCartQty = getCartTotalQty(cart);

  if (profile?.show_store === false) return null;

  function updateCustomer(field, value) {
    setCustomer((prev) => ({ ...prev, [field]: value }));
  }

  function handleAddItem(item, qty = 1) {
    if (itemIsUnavailable(item)) {
      alert("Este produto está indisponível no momento.");
      return;
    }

    if (itemControlsStock(item)) {
      const alreadyInCart = getCartQty(cart, item.id);
      const available = getStockQty(item);

      if (alreadyInCart >= available) {
        alert(`Só existem ${available} peça(s) disponíveis deste produto.`);
        return;
      }
    }

    if (productHasVariants(item)) {
      setPendingVariantQty(qty);
      setVariantProduct(item);
      setSelectedVariants({});
      setVariantModalOpen(true);
      return;
    }

    addToCart(item, qty);
  }

  function selectVariant(variantId, option) {
    setSelectedVariants((prev) => ({
      ...prev,
      [variantId]: option,
    }));
  }

  function allVariantsSelected() {
    if (!variantProduct?.variants) return true;

    return variantProduct.variants.every((variant) => {
      if (variant.required === false) return true;
      return selectedVariants[variant.id];
    });
  }

  function confirmVariantSelection() {
    if (!allVariantsSelected()) {
      alert("Selecione todas as opções obrigatórias.");
      return;
    }

    const variantSummary = Object.values(selectedVariants).map((opt) => ({
      id: opt.id,
      label: opt.label,
      variant_name: opt.variant_name,
      image_url: opt.image_url || "",
    }));

    addToCart(
      {
        ...variantProduct,
        selected_variants: variantSummary,
      },
      pendingVariantQty
    );

    setVariantModalOpen(false);
    setVariantProduct(null);
    setSelectedVariants({});
    setPendingVariantQty(1);
  }

  function getVariantImage() {
    const options = Object.values(selectedVariants);

    const withImage = options.map((opt) => opt.image_url).filter(Boolean);

    return withImage.at(-1) || variantProduct?.image_url;
  }

  function addToCart(item, qtyToAdd = 1) {
  if (itemIsUnavailable(item)) return;

  const qty = Math.max(1, Number(qtyToAdd || 1));

  setCart((prev) => {
    const exists = prev.find((cartItem) => String(cartItem.id) === String(item.id));

    if (itemControlsStock(item)) {
      const currentQty = exists ? Number(exists.qty || 0) : 0;
      const available = getStockQty(item);

      if (currentQty + qty > available) {
        alert(`Só existem ${available} peça(s) disponíveis deste produto.`);
        return prev;
      }
    }

    if (exists) {
      return prev.map((cartItem) =>
        String(cartItem.id) === String(item.id)
          ? { ...cartItem, qty: Number(cartItem.qty || 0) + qty }
          : cartItem
      );
    }

    return [...prev, { ...item, qty }];
  });
}

  function removeFromCart(id) {
    setCart((prev) => prev.filter((item) => String(item.id) !== String(id)));
  }

  function changeQty(id, delta) {
    setCart((prev) =>
      prev.map((item) => {
        if (String(item.id) !== String(id)) return item;

        const nextQty = Math.max(1, Number(item.qty || 1) + delta);

        if (delta > 0 && itemControlsStock(item)) {
          const available = getStockQty(item);

          if (nextQty > available) {
            alert(`Só existem ${available} peça(s) disponíveis deste produto.`);
            return item;
          }
        }

        return { ...item, qty: nextQty };
      })
    );
  }

  function openBookingFromCart() {
    const bookableServices = cart
      .filter((item) => serviceUsesBooking(item, profile))
      .map((item) => ({
        id: item.id,
        name: item.title || item.name || "Serviço",
        price: isQuote(item) ? null : item.price || null,
        price_type: item.price_type || "fixed",
        duration: item.duration_minutes || item.duration || null,
        qty: item.qty || 1,
      }));

    if (bookableServices.length === 0) return;

    window.sessionStorage.setItem(
      "selected_booking_services",
      JSON.stringify(bookableServices)
    );

    window.sessionStorage.setItem(
      "selected_booking_service",
      JSON.stringify(bookableServices[0])
    );

    window.dispatchEvent(
      new CustomEvent("booking-service-selected", {
        detail: bookableServices[0],
      })
    );

    window.dispatchEvent(
      new CustomEvent("booking-services-selected", {
        detail: bookableServices,
      })
    );

    setCartModalOpen(false);

    document.getElementById("agendamento")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function buildWhatsAppLink(orderId = "") {
    if (!automationWhatsapp || cart.length === 0) return "#";

    const customerName = `${customer.firstName} ${customer.lastName}`.trim();

    const message = `Olá! Quero acompanhar minha solicitação.

Código do pedido: ${orderId}

Cliente: ${customerName}
Página: ${profile?.nome || profile?.name || "Vitrine profissional"}

Aguardo a confirmação.`;

    return `https://wa.me/${automationWhatsapp}?text=${encodeURIComponent(
      message
    )}`;
  }

  function openCheckoutModal() {
    if (cart.length === 0 || !automationWhatsapp) return;
    setCartModalOpen(false);
    setShowCheckoutModal(true);
  }

  async function confirmCheckout() {
    const firstName = customer.firstName.trim();
    const lastName = customer.lastName.trim();
    const customerName = `${firstName} ${lastName}`.trim();
    const phone = onlyDigits(customer.phone);

    if (!firstName) {
      alert("Informe seu nome.");
      return;
    }

    if (!phone || phone.length < 10) {
      alert("Informe um WhatsApp válido com DDD.");
      return;
    }

    if (!profile?.id) {
      alert("Não foi possível identificar a página do profissional.");
      return;
    }

    const orderItems = cart.map((item) => ({
      id: item.id,
      type: item.type || "service",
      title: item.title || item.name || "Item",
      qty: item.qty || 1,
      price: isQuote(item) ? null : Number(item.price || 0),
      price_type: item.price_type || "fixed",
      category_id: item.category_id || "",
      image_url: item.image_url || "",
      commission_enabled: item.commission_enabled === true,
      allowed_staff_ids:
        item.allowed_staff_ids || item.staff_ids || item.seller_staff_ids || [],
      allow_all_staff: item.allow_all_staff === true || item.all_staff === true || false,
      stock_mode: item.stock_mode || "single",
      stock_enabled: item.stock_enabled === true || item.stock_mode === "quantity",
      stock_qty: Number(item.stock_qty || 0),
      reserved_qty: Number(item.reserved_qty || 0),
      sold_qty: Number(item.sold_qty || 0),
      available_qty: getStockQty(item),
      in_stock: item.in_stock !== false,
      selected_variants: Array.isArray(item.selected_variants)
        ? item.selected_variants
        : [],
    }));

    const res = await fetch("/api/profile-orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        profile_page_id: profile.id,
        customer_name: customerName,
        customer_phone: phone,
        note: customer.note.trim(),
        items: orderItems,
        total,
        has_quote: cartHasQuote,
        affiliate_ref: affiliateRef,
        source_ref: affiliateRef,
        source_channel: affiliateRef ? "affiliate_link" : "whatsapp_automation",
        automation_status: "waiting_owner_confirmation",
        profile_owner_name: profile.nome || profile.name || "",
        profile_owner_phone: onlyDigits(profile.whatsapp || profile.phone || ""),
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.error("Erro ao salvar pedido:", data);
      alert(data?.error || "Não foi possível salvar o pedido.");
      return;
    }

    const orderedItems = cart;

    if (Array.isArray(data.updated_store_items)) {
      setLiveStoreItems(data.updated_store_items);
    } else {
      setLiveStoreItems((prev) =>
        prev.map((storeItem) => {
          const orderedItem = orderedItems.find(
            (item) => String(item.id) === String(storeItem.id)
          );

          if (
            !orderedItem ||
            storeItem.type !== "product" ||
            storeItem.stock_enabled !== true ||
            storeItem.stock_mode !== "quantity"
          ) {
            return storeItem;
          }

          const qty = Number(orderedItem.qty || 0);
          const reservedQty = Number(storeItem.reserved_qty || 0);
          const soldQty = Number(storeItem.sold_qty || 0);
          const stockQty = Number(storeItem.stock_qty || 0);

          const nextReservedQty = reservedQty + qty;
          const availableQty = Math.max(0, stockQty - nextReservedQty - soldQty);

          return {
            ...storeItem,
            reserved_qty: nextReservedQty,
            in_stock: availableQty > 0,
          };
        })
      );
    }

    setShowCheckoutModal(false);
    setCart([]);

    const orderId = data?.id || data?.order?.id || "";

    window.open(buildWhatsAppLink(orderId), "_blank", "noopener,noreferrer");

    setCustomer({
      firstName: "",
      lastName: "",
      phone: "",
      note: "",
    });

    alert("Pedido enviado com sucesso!");
  }

  function renderMarketplaceItem(item) {
    const product = isProduct(item);
    const quote = isQuote(item);
    const canBook = serviceUsesBooking(item, profile);
    const unavailable = itemIsUnavailable(item);
    const stockLabel = getPublicStockLabel(item);
    const cartQty = getCartQty(cart, item.id);

    return (
      <article
        key={item.id}
        className={`store-market-item ${unavailable ? "unavailable" : ""}`}
        onClick={() => setDetailsItem(item)}
      >
        <div className="store-market-info">
          <div className="store-market-badges">
            <span>{product ? "Produto" : "Serviço"}</span>

            {canBook && <small>Agenda online</small>}
            {quote && <small>Orçamento</small>}
          </div>

          <h3>{item.title || item.name || "Item sem nome"}</h3>

          {item.description && <p>{item.description}</p>}

          {stockLabel && (
            <div className={`store-public-stock ${unavailable ? "danger" : ""}`}>
              {stockLabel}
            </div>
          )}

          <div className="store-market-bottom">
            <strong>{getItemPriceLabel(item)}</strong>

            {cartQty > 0 && (
              <em>
                {cartQty} no carrinho
              </em>
            )}
          </div>
        </div>

        <div className="store-market-media">
          {item.image_url ? (
            <img src={item.image_url} alt={item.title || item.name || "Item"} />
          ) : (
            <div className="store-market-placeholder">
              {product ? "🛍️" : "✨"}
            </div>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleAddItem(item);
            }}
            disabled={unavailable}
            className={unavailable ? "disabled" : ""}
            aria-label={`Adicionar ${item.title || item.name || "item"}`}
          >
            {unavailable ? "×" : "+"}
          </button>
        </div>
      </article>
    );
  }

  function renderCategorySection(title, subtitle, sectionItems, key) {
    if (!sectionItems.length) return null;

    return (
      <section key={key} className="store-market-category">
        <div className="store-market-category-head">
          <div>
            <span>{subtitle}</span>
            <h3>{title}</h3>
          </div>

          
        </div>

        <div className="store-market-carousel">
  {sectionItems.map(renderMarketplaceItem)}
</div>
      </section>
    );
  }

  return (
    <>
      <section className="store-section store-section-marketplace" id="loja">
        <div className="store-shell">
          <div className="store-market-hero">
            <div>
              <span className="store-luxury-kicker">{catalogLabel}</span>
              <h2>{dynamicTitle}</h2>
              <p>{dynamicText}</p>
            </div>

            
          </div>

          <div className="store-market-toolbar">
            <div className="store-filters">
              {(hasServices && hasProducts) || categories.length > 0 ? (
                <button
                  type="button"
                  className={filter === "all" ? "active" : ""}
                  onClick={() => setFilter("all")}
                >
                  Todos
                </button>
              ) : null}

              {hasProducts && (
                <button
                  type="button"
                  className={filter === "product" ? "active" : ""}
                  onClick={() => setFilter("product")}
                >
                  Produtos
                </button>
              )}

              {hasServices && (
                <button
                  type="button"
                  className={filter === "service" ? "active" : ""}
                  onClick={() => setFilter("service")}
                >
                  Serviços
                </button>
              )}

              {categories
                .filter((category) =>
                  items.some((item) => item.category_id === category.id)
                )
                .map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    className={filter === category.id ? "active" : ""}
                    onClick={() => setFilter(category.id)}
                  >
                    {category.name}
                  </button>
                ))}
            </div>

            <div
              ref={searchRef}
              className={`store-filter-search ${searchOpen ? "open" : ""}`}
            >
              <button
                type="button"
                className="store-filter-search-toggle"
                onClick={() => setSearchOpen((prev) => !prev)}
                aria-label="Buscar"
              >
                🔎
              </button>

              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar no catálogo..."
              />

              {searchTerm && (
                <button
                  type="button"
                  className="store-filter-search-clear"
                  onClick={() => setSearchTerm("")}
                  aria-label="Limpar busca"
                >
                  ×
                </button>
              )}
            </div>
          </div>

          {visibleItems.length === 0 ? (
            <div className="store-empty">
              <strong>
                {searchTerm ? "Nenhum resultado encontrado" : "Nenhum item cadastrado ainda"}
              </strong>

              <p>
                {searchTerm
                  ? "Tente buscar por outro nome, serviço ou categoria."
                  : "Em breve novas opções estarão disponíveis nesta página."}
              </p>
            </div>
          ) : (
            <div className="store-market-stack">
              {visibleCategoryGroups.map(({ category, items }) =>
                renderCategorySection(
                  category.name,
                  "Categoria",
                  items,
                  category.id
                )
              )}

              {uncategorizedItems.length > 0 &&
                renderCategorySection(
                  visibleCategoryGroups.length > 0 ? "Outras opções" : "Destaques",
                  visibleCategoryGroups.length > 0 ? "Seleção" : "Catálogo",
                  uncategorizedItems,
                  "uncategorized"
                )}
            </div>
          )}
        </div>
      </section>

      {totalCartQty > 0 && (
       <button
  type="button"
  className="floating-cart-button"
  data-count={totalCartQty}
  onClick={() => setCartModalOpen(true)}
>
  <span>🛒</span>

  <strong>
    {totalCartQty} item(ns)
  </strong>

  <small>{cartHasQuote ? "Ver carrinho" : money(total)}</small>
</button>
      )}

      {cartModalOpen && (
        <CartModal
          cart={cart}
          total={total}
          cartHasQuote={cartHasQuote}
          cartHasBookableService={cartHasBookableService}
          automationWhatsapp={automationWhatsapp}
          profile={profile}
          customer={customer}
          onClose={() => setCartModalOpen(false)}
          onChangeQty={changeQty}
          onRemove={removeFromCart}
          onCheckout={openCheckoutModal}
          onOpenBooking={openBookingFromCart}
        />
      )}

      {detailsItem && (
        <StoreDetailsModal
          item={detailsItem}
          onClose={() => setDetailsItem(null)}
          isUnavailable={itemIsUnavailable(detailsItem)}
          stockLabel={getPublicStockLabel(detailsItem)}
          priceLabel={getItemPriceLabel(detailsItem)}
          onAdd={(item, qty) => {
            handleAddItem(item, qty);
            setDetailsItem(null);
          }}
        />
      )}

      {variantModalOpen && variantProduct && (
        <div className="booking-modal-backdrop">
          <div className="booking-modal variant-modal-clean">
            <button
              type="button"
              className="variant-modal-x"
              onClick={() => setVariantModalOpen(false)}
            >
              ×
            </button>

            <div className="variant-modal-cover">
              <img src={getVariantImage()} alt={variantProduct.title || "Produto"} />
            </div>

            <div className="variant-modal-content">
              <h3>{variantProduct.title}</h3>

              {variantProduct.description && <p>{variantProduct.description}</p>}

              {variantProduct.variants.map((variant) => (
                <div key={variant.id} className="variant-modal-group">
                  <strong>{variant.name}</strong>

                  <div className="variant-modal-options">
                    {variant.options.map((option) => {
                      const active =
                        selectedVariants[variant.id]?.id === option.id;

                      return (
                        <button
                          key={option.id}
                          type="button"
                          className={active ? "active" : ""}
                          onClick={() =>
                            selectVariant(variant.id, {
                              ...option,
                              variant_name: variant.name,
                            })
                          }
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {getPublicStockLabel(variantProduct) && (
                <div
                  className={`store-public-stock ${
                    itemIsUnavailable(variantProduct) ? "danger" : ""
                  }`}
                >
                  {getPublicStockLabel(variantProduct)}
                </div>
              )}

              <button
                type="button"
                className="variant-modal-add"
                onClick={confirmVariantSelection}
                disabled={itemIsUnavailable(variantProduct)}
              >
                {itemIsUnavailable(variantProduct)
                  ? "Produto indisponível"
                  : "Adicionar ao carrinho"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCheckoutModal && (
        <div className="booking-modal-backdrop" role="presentation">
          <div className="booking-modal" role="dialog" aria-modal="true">
            <div className="booking-modal-head">
              <div>
                <span className="eyebrow">Dados do cliente</span>

                <h3>{cartHasQuote ? "Solicitar orçamento" : "Finalizar pedido"}</h3>

                <p>
                  Informe seus dados para enviar a solicitação ao profissional pelo
                  WhatsApp.
                </p>
              </div>

              <button
                type="button"
                className="booking-modal-close"
                onClick={() => setShowCheckoutModal(false)}
              >
                ×
              </button>
            </div>

            <div className="booking-client-form">
              <label>
                <span>Nome</span>

                <input
                  value={customer.firstName}
                  onChange={(e) => updateCustomer("firstName", e.target.value)}
                  placeholder="Seu nome"
                  autoFocus
                />
              </label>

              <label>
                <span>Sobrenome</span>

                <input
                  value={customer.lastName}
                  onChange={(e) => updateCustomer("lastName", e.target.value)}
                  placeholder="Seu sobrenome"
                />
              </label>

              <label className="full">
                <span>WhatsApp com DDD</span>

                <input
                  value={customer.phone}
                  onChange={(e) => updateCustomer("phone", e.target.value)}
                  placeholder="Ex: 79999999999"
                />
              </label>

              <label className="full">
                <span>Observação opcional</span>

                <textarea
                  value={customer.note}
                  onChange={(e) => updateCustomer("note", e.target.value)}
                  placeholder="Alguma informação importante para o atendimento?"
                />
              </label>

              <div className="booking-modal-summary">
                <strong>
                  {cart.length} item(ns) •{" "}
                  {cartHasQuote ? "Total parcial" : "Total estimado"}:{" "}
                  {money(total)}
                </strong>

                <span>
                  {cart.map((item) => `${item.qty}x ${item.title || item.name}`).join(" • ")}
                </span>
              </div>

              <div className="booking-modal-actions">
                <button
                  type="button"
                  className="booking-modal-secondary"
                  onClick={() => {
                    setShowCheckoutModal(false);
                    setCartModalOpen(true);
                  }}
                >
                  Voltar
                </button>

                <button
                  type="button"
                  className="booking-modal-primary"
                  onClick={confirmCheckout}
                >
                  Enviar pelo WhatsApp
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}