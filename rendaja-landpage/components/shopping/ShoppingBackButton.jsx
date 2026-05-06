import Link from "next/link";

export default function ShoppingBackButton() {
  return (
    <Link
      href="/shopping"
      className="shoppingBackButton"
    >
      ← Voltar para shopping
    </Link>
  );
}