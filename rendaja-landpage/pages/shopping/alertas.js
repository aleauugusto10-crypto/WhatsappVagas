import Head from "next/head";

import NotificationPlans from "../../components/notifications/NotificationPlans";
import ShoppingBackButton from "../../components/shopping/ShoppingBackButton";

export default function AlertasPage() {
  return (
    <>
      <Head>
        <title>Alertas RendaJá — Receba vagas e missões</title>
        <meta
          name="description"
          content="Receba vagas, missões e oportunidades direto no WhatsApp."
        />
      </Head>

      <main className="notificationPlansPage">
        <ShoppingBackButton />
        <NotificationPlans />
      </main>
    </>
  );
}