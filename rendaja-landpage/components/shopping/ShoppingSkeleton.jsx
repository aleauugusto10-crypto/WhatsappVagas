export default function ShoppingSkeleton() {
  return (
    <section className="shoppingSkeleton">
      {Array.from({ length: 8 }).map((_, index) => (
        <div className="shoppingSkeletonCard" key={index}>
          <span />
          <strong />
          <em />
        </div>
      ))}
    </section>
  );
}