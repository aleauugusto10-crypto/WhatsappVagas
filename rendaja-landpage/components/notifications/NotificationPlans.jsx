import { useState } from "react";

import { NOTIFICATION_PACKAGES } from "../../src/constants/notificationPackages";

import NotificationPlanCard from "./NotificationPlanCard";
import NotificationCheckoutModal from "./NotificationCheckoutModal";

export default function NotificationPlans() {
  const [selectedPlan, setSelectedPlan] = useState(null);

  return (
    <>
      <section className="notificationPlansContent">
        <div className="notificationPlansHero">
          <small>Alertas CompreTudo.shop</small>

          <h1>
            Receba vagas e missões
            direto no WhatsApp
          </h1>

          <p>
            Escolha um plano e receba oportunidades,
            missões e alertas diretamente no seu celular.
          </p>
        </div>

        <div className="notificationPlansGrid">
          {NOTIFICATION_PACKAGES.map((plan) => (
            <NotificationPlanCard
              key={plan.code}
              plan={plan}
              onSelect={setSelectedPlan}
            />
          ))}
        </div>
      </section>

      <NotificationCheckoutModal
        open={!!selectedPlan}
        plan={selectedPlan}
        onClose={() => setSelectedPlan(null)}
      />
    </>
  );
}