export default function ShoppingCarousel({ eyebrow, title, subtitle, children }) {
  return (
    <section className="shoppingCarouselSection">
      <div className="shoppingSectionHead">
        <div>
          {eyebrow ? <span>{eyebrow}</span> : null}
          <h2>{title}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
      </div>

      <div className="shoppingCarousel">
        {children}
      </div>
    </section>
  );
}