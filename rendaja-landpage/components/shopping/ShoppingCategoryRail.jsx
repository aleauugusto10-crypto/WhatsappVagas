export default function ShoppingCategoryRail({
  categories = [],
  active = "todos",
  onChange,
}) {
  return (
    <section className="shoppingCategoryRail">
      {categories.map((category) => {
        const isActive = active === category.id;

        return (
          <button
            key={category.id}
            type="button"
            className={isActive ? "active" : ""}
            onClick={() => onChange?.(category.id)}
          >
            <span>{category.icon}</span>
            <strong>{category.label}</strong>
          </button>
        );
      })}
    </section>
  );
}