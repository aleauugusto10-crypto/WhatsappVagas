export default function ShoppingSection({
  eyebrow,
  title,
  subtitle,
  children,
}) {
  return (
    <section className="shoppingSection">
      <div className="shoppingSectionHead">
        <div>
          {eyebrow ? <span>{eyebrow}</span> : null}
          <h2>{title}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>

        <button type="button">Ver tudo</button>
      </div>

      <div className="shoppingGrid">{children}</div>
    </section>
  );
}