import Head from "next/head";

export default function ShoppingListingPage({
  title,
  description,
  badge,
  items = [],
  type = "default",
}) {
  return (
    <>
      <Head>
        <title>{title} — RendaJá</title>
        <meta name="description" content={description} />
      </Head>

      <main className="shoppingPage shoppingListingPage">
        <section className="shoppingListingHero">
          <a href="/shopping" className="shoppingBackLink">
            ← Voltar ao shopping
          </a>

          <span>{badge}</span>
          <h1>{title}</h1>
          <p>{description}</p>
        </section>

        <section className="shoppingListingGrid">
          {items.map((item) => (
            <article className="shoppingListingCard" key={item.id}>
              <div className="shoppingListingIcon">{item.icon}</div>

              <div>
                <small>{item.label}</small>
                <h2>{item.title}</h2>
                <p>{item.description}</p>

                <div className="shoppingListingMeta">
                  <span>{item.city}</span>
                  <strong>{item.price}</strong>
                </div>

                <a href={item.href}>
                  {type === "missao" ? "Ver missão" : type === "vaga" ? "Ver vaga" : "Ver destaque"}
                </a>
              </div>
            </article>
          ))}
        </section>
      </main>
    </>
  );
}