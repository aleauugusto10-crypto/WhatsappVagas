import { useRef } from "react";

export default function ShoppingCarousel({
  eyebrow,
  title,
  subtitle,
  children,
}) {
  const carouselRef = useRef(null);

  function scrollCarousel(direction) {
    const el = carouselRef.current;
    if (!el) return;

    el.scrollBy({
      left: direction === "right" ? 360 : -360,
      behavior: "smooth",
    });
  }

  return (
    <section className="shoppingCarouselSection">
      <div className="shoppingSectionHead">
        <div>
          {eyebrow ? <span>{eyebrow}</span> : null}
          <h2>{title}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
      </div>

      <div className="shoppingCarouselWrapper">
        <button
          type="button"
          className="shoppingCarouselArrow left"
          onClick={() => scrollCarousel("left")}
        >
          ‹
        </button>

        <div ref={carouselRef} className="shoppingCarousel">
          {children}
        </div>

        <button
          type="button"
          className="shoppingCarouselArrow right"
          onClick={() => scrollCarousel("right")}
        >
          ›
        </button>
      </div>
    </section>
  );
}