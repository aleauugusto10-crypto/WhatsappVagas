import Head from "next/head";
import ShoppingJobsSection from "../../components/shopping/ShoppingJobsSection";
import ShoppingBackButton from "../../components/shopping/ShoppingBackButton";

export default function ShoppingVagasPage() {
  return (
    <>
      <Head>
        <title>Vagas — Shopping RendaJá</title>
      </Head>

      <main className="shoppingPage shoppingListingPage">
        <ShoppingBackButton />

        <ShoppingJobsSection />
      </main>
    </>
  );
}