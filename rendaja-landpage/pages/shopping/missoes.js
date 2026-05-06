import Head from "next/head";
import ShoppingMissionsSection from "../../components/shopping/ShoppingMissionsSection";
import ShoppingBackButton from "../../components/shopping/ShoppingBackButton";

export default function ShoppingMissoesPage() {
  return (
    <>
      <Head>
        <title>Missões — Shopping RendaJá</title>
      </Head>

      <main className="shoppingPage shoppingListingPage">
        <ShoppingBackButton />

        <ShoppingMissionsSection />
      </main>
    </>
  );
}