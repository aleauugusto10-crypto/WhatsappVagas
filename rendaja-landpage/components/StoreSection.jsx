import { useMemo, useState } from "react";
import { supabase } from "../src/lib/supabase";

function money(value = 0) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function onlyDigits(value = "") {
  return String(value || "").replace(/\D/g, "");
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

export default function StoreSection({ profile }) {
  if (profile?.show_store === false) return null;

  const whatsapp = onlyDigits(profile?.whatsapp || profile?.phone || "");

  const categories = useMemo(() => {
    return Array.isArray(profile?.store_categories)
      ? profile.store_categories.filter((category) => category?.active !== false)
      : [];
  }, [profile]);

  const items = useMemo(() => {
    return Array.isArray(profile?.store_items)
      ? profile.store_items.filter((item) => item?.active !== false)
      : [];
  }, [profile]);

  const hasServices = items.some(isService);
  const hasProducts = items.some(isProduct);

  const dynamicTitle = useMemo(() => {
    if (profile?.store_title) return profile.store_title;

    if (hasProducts && hasServices) return "Escolha o que você precisa";
    if (hasProducts) return "Produtos selecionados";
    if (hasServices) return "Serviços disponíveis";

    return "Catálogo";
  }, [profile?.store_title, hasProducts, hasServices]);

  const dynamicText = useMemo(() => {
    if (profile?.store_text) return profile.store_text;

    if (hasProducts && hasServices) {
      return "Confira produtos, serviços e soluções disponíveis para solicitar com facilidade.";
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
    if (hasProducts && hasServices) return "Catálogo premium";
    if (hasProducts) return "Produtos";
    if (hasServices) return "Serviços";
    return "Catálogo";
  }, [hasProducts, hasServices]);

  const [cart, setCart] = useState([]);
  const [filter, setFilter] = useState("all");
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [customer, setCustomer] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    note: "",
  });

  const visibleItems = useMemo(() => {
    if (filter === "all") return items;
    if (filter === "service") return items.filter(isService);
    if (filter === "product") return items.filter(isProduct);
    return items.filter((item) => item.category_id === filter);
  }, [items, filter]);

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

  function updateCustomer(field, value) {
    setCustomer((prev) => ({ ...prev, [field]: value }));
  }

  function addToCart(item) {
    setCart((prev) => {
      const exists = prev.find((cartItem) => cartItem.id === item.id);

      if (exists) {
        return prev.map((cartItem) =>
          cartItem.id === item.id
            ? { ...cartItem, qty: cartItem.qty + 1 }
            : cartItem
        );
      }

      return [...prev, { ...item, qty: 1 }];
    });
  }

  function removeFromCart(id) {
    setCart((prev) => prev.filter((item) => item.id !== id));
  }

  function changeQty(id, delta) {
    setCart((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, qty: Math.max(1, item.qty + delta) } : item
      )
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

    document.getElementById("agendamento")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function buildWhatsAppLink() {
    if (!whatsapp || cart.length === 0) return "#";

    const customerName = `${customer.firstName} ${customer.lastName}`.trim();
    const customerPhone = onlyDigits(customer.phone);

    let message = `Olá! 👋\n\n`;
    message += `Acabei de fazer uma solicitação pela página ${
      profile?.name || profile?.nome || "profissional"
    }.\n\n`;

    message += `👤 Cliente: ${customerName}\n`;
    message += `📞 WhatsApp: ${customerPhone}\n\n`;
    message += `🛍️ Itens solicitados:\n`;

    cart.forEach((item) => {
      const typeLabel = isProduct(item) ? "Produto" : "Serviço";
      const priceLabel = isQuote(item)
        ? "Sob orçamento"
        : money(Number(item.price || 0) * item.qty);

      message += `• ${item.qty}x ${typeLabel}: ${item.title} — ${priceLabel}\n`;
    });

    if (!cartHasQuote) {
      message += `\n💰 Total estimado: ${money(total)}\n`;
    } else {
      message += `\n💰 Total parcial dos itens com preço: ${money(total)}\n`;
      message += `ℹ️ Alguns itens estão sob orçamento.\n`;
    }

    if (customer.note.trim()) {
      message += `\n📝 Observação:\n${customer.note.trim()}\n`;
    }

    message += `\nAguardo retorno.`;

    return `https://wa.me/${whatsapp}?text=${encodeURIComponent(message)}`;
  }

  function openCheckoutModal() {
    if (cart.length === 0 || !whatsapp) return;
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
    }));

    const { error } = await supabase.from("profile_orders").insert({
      profile_page_id: profile.id,
      customer_name: customerName,
      customer_phone: phone,
      note: customer.note.trim(),
      items: orderItems,
      total,
      has_quote: cartHasQuote,
      status: "pending",
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.error("Erro ao salvar pedido:", error);
      alert(error.message || "Não foi possível salvar o pedido.");
      return;
    }

    window.open(buildWhatsAppLink(), "_blank", "noopener,noreferrer");

    setShowCheckoutModal(false);
    setCart([]);
    setCustomer({
      firstName: "",
      lastName: "",
      phone: "",
      note: "",
    });

    alert("Pedido enviado com sucesso!");
  }

  function renderItemCard(item) {
    const product = isProduct(item);
    const quote = isQuote(item);
    const canBook = serviceUsesBooking(item, profile);

    return (
      <article key={item.id} className="store-card">
        {item.image_url ? (
          <div className="store-card-image">
            <img src={item.image_url} alt={item.title || "Item"} />
          </div>
        ) : (
          <div className="store-card-image store-card-image-empty">
            <span>{product ? "🛍️" : "✨"}</span>
          </div>
        )}

        <div className="store-card-body">
          <div className="store-card-top">
            <span>{product ? "Produto" : "Serviço"}</span>

            <div>
              {canBook && <small>Agenda online</small>}
              {quote && <small>Orçamento</small>}
            </div>
          </div>

          <h3>{item.title || "Item sem nome"}</h3>

          {item.description && <p>{item.description}</p>}

          <div className="store-card-bottom">
            <strong>{getItemPriceLabel(item)}</strong>

            <button type="button" onClick={() => addToCart(item)}>
              Adicionar
            </button>
          </div>
        </div>
      </article>
    );
  }

  return (
    <>
      <section className="store-section" id="loja">
        <div className="store-shell">
          <div className="store-luxury-head">
            <div className="store-luxury-copy">
              <span className="store-luxury-kicker">{catalogLabel}</span>
              <h2>{dynamicTitle}</h2>
              <p>{dynamicText}</p>
            </div>

            <div className="store-luxury-stats">
              <div>
                <strong>{items.length}</strong>
                <span>opções</span>
              </div>

              {hasProducts && (
                <div>
                  <strong>{items.filter(isProduct).length}</strong>
                  <span>produtos</span>
                </div>
              )}

              {hasServices && (
                <div>
                  <strong>{items.filter(isService).length}</strong>
                  <span>serviços</span>
                </div>
              )}
            </div>
          </div>

          <div className="store-layout">
            <div className="store-content">
              {(hasServices || hasProducts || categories.length > 0) && (
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

                  {hasServices && (
                    <button
                      type="button"
                      className={filter === "service" ? "active" : ""}
                      onClick={() => setFilter("service")}
                    >
                      Serviços
                    </button>
                  )}

                  {hasProducts && (
                    <button
                      type="button"
                      className={filter === "product" ? "active" : ""}
                      onClick={() => setFilter("product")}
                    >
                      Produtos
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
              )}

              {visibleItems.length === 0 ? (
                <div className="store-empty">
                  <strong>Nenhum item cadastrado ainda</strong>
                  <p>Em breve novas opções estarão disponíveis nesta página.</p>
                </div>
              ) : (
                <div className="store-category-stack">
                  {visibleCategoryGroups.map(({ category, items }) => (
                    <section key={category.id} className="store-category-block">
                      <div className="store-category-head">
                        <div>
                          <span>Categoria</span>
                          <h3>{category.name}</h3>
                        </div>

                        <small>{items.length} item(ns)</small>
                      </div>

                      <div className="store-carousel">
                        {items.map(renderItemCard)}
                      </div>
                    </section>
                  ))}

                  {uncategorizedItems.length > 0 && (
                    <section className="store-category-block">
                      {visibleCategoryGroups.length > 0 && (
                        <div className="store-category-head">
                          <div>
                            <span>Seleção</span>
                            <h3>Outras opções</h3>
                          </div>

                          <small>{uncategorizedItems.length} item(ns)</small>
                        </div>
                      )}

                      <div className="store-carousel">
                        {uncategorizedItems.map(renderItemCard)}
                      </div>
                    </section>
                  )}
                </div>
              )}
            </div>

            <aside className="cart-card">
              <div className="cart-head">
                <span>🛒</span>
                <div>
                  <strong>Sacola</strong>
                  <small>{cart.length} item(ns)</small>
                </div>
              </div>

              {cart.length === 0 ? (
                <div className="cart-empty">
                  Adicione uma opção para continuar sua solicitação.
                </div>
              ) : (
                <div className="cart-list">
                  {cart.map((item) => {
                    const quote = isQuote(item);
                    const canBook = serviceUsesBooking(item, profile);

                    return (
                      <div key={item.id} className="cart-item">
                        <div>
                          <strong>{item.title}</strong>
                          <small>
                            {quote
                              ? "Sob orçamento"
                              : `${money(item.price)} cada`}
                            {canBook ? " • precisa escolher horário" : ""}
                          </small>
                        </div>

                        <div className="cart-controls">
                          <button type="button" onClick={() => changeQty(item.id, -1)}>
                            −
                          </button>

                          <span>{item.qty}</span>

                          <button type="button" onClick={() => changeQty(item.id, 1)}>
                            +
                          </button>

                          <button type="button" onClick={() => removeFromCart(item.id)}>
                            ✕
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="cart-total">
                <span>{cartHasQuote ? "Total parcial" : "Total estimado"}</span>
                <strong>{money(total)}</strong>
              </div>

              {cartHasQuote && (
                <p className="cart-note">
                  Itens sob orçamento serão combinados pelo WhatsApp.
                </p>
              )}

              {cartHasBookableService ? (
                <button
                  type="button"
                  className={`cart-checkout ${cart.length === 0 ? "disabled" : ""}`}
                  onClick={openBookingFromCart}
                  disabled={cart.length === 0}
                >
                  Escolher horário
                </button>
              ) : (
                <button
                  type="button"
                  className={`cart-checkout ${
                    cart.length === 0 || !whatsapp ? "disabled" : ""
                  }`}
                  onClick={openCheckoutModal}
                  disabled={cart.length === 0 || !whatsapp}
                >
                  {cartHasQuote ? "Solicitar orçamento" : "Finalizar pedido"}
                </button>
              )}
            </aside>
          </div>
        </div>
      </section>

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
                  {cart.map((item) => `${item.qty}x ${item.title}`).join(" • ")}
                </span>
              </div>

              <div className="booking-modal-actions">
                <button
                  type="button"
                  className="booking-modal-secondary"
                  onClick={() => setShowCheckoutModal(false)}
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