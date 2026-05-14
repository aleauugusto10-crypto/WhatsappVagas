import { useState } from "react";
import ProfilePlanSignupModal from "./ProfilePlanSignupModal";

function money(value = 0) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

const PLANS = [
  {
    code: "free",
    badge: "COMECE GRÁTIS",
    name: "Essencial",
    setup: 0,
    monthly: 0,
    description:
      "Para profissionais que querem começar sua presença online.",
    features: [
      "Perfil público profissional",
      "WhatsApp integrado",
      "Sessão sobre e serviços",
      "Avaliações públicas",
      "Página online básica",
    ],
  },

  {
    code: "store_start",
    badge: "MAIS ESCOLHIDO",
    featured: true,
    name: "Loja Start",
    setup: 50,
    monthly: 19.9,
    description:
      "Ideal para negócios que querem vender e receber pedidos.",
    features: [
      "Tudo do Essencial",
      "Loja liberada",
      "Produtos e serviços",
      "Pedidos organizados",
      "Agendamentos",
      "30 créditos mensais",
    ],
  },

  {
    code: "equipe_pro",
    badge: "NEGÓCIOS EM CRESCIMENTO",
    name: "Equipe Pro",
    setup: 50,
    monthly: 49.9,
    description:
      "Controle vendedores, equipe e distribuição de pedidos.",
    features: [
      "Tudo do Loja Start",
      "Múltiplos atendentes",
      "Controle de equipe",
      "Comissões",
      "Distribuição inteligente",
      "100 créditos mensais",
    ],
  },

  {
    code: "complete_pro",
    badge: "OPERAÇÃO COMPLETA",
    name: "Finance Premium",
    setup: 50,
    monthly: 59.9,
    description:
      "Gestão avançada financeira e operacional completa.",
    features: [
      "Tudo do Equipe Pro",
      "Painel financeiro",
      "Fluxo de caixa",
      "Entradas e saídas",
      "Relatórios avançados",
      "250 créditos mensais",
    ],
  },
];

export default function ProfilePlansSection({
  city = "",
  state = "",
}) {
  const [selectedPlan, setSelectedPlan] = useState(null);

  return (
    <>
      <section
        className="profile-plans-section"
        id="criar-vitrine"
      >
        <div className="profile-plans-bg" />

        <div className="profile-plans-head">
          <span className="mini-badge">
            COMPRETUDO.SHOP PAGES
          </span>

          <h2>
            Transforme sua vitrine em uma
            <span> máquina de vendas</span>
          </h2>

          <p>
            Crie uma página profissional elegante,
            receba pedidos, organize atendimentos e
            fortaleça sua presença online.
            {city
              ? ` Disponível para negócios em ${city}${
                  state ? `-${state}` : ""
                }.`
              : ""}
          </p>
        </div>

        <div className="profile-plans-grid">
          {PLANS.map((plan) => (
            <article
              key={plan.code}
              className={`profile-plan-card ${
                plan.featured ? "featured" : ""
              }`}
            >
              <div className="card-glow" />

              <span className="plan-badge">
                {plan.badge}
              </span>

              <div className="plan-top">
                <h3>{plan.name}</h3>

                <p>{plan.description}</p>
              </div>

              <div className="plan-price">
                {plan.setup === 0 ? (
                  <>
                    <strong>Grátis</strong>

                    <small>
                      Sem mensalidade inicial
                    </small>
                  </>
                ) : (
                  <>
                    <strong>
                      {money(plan.setup)}
                    </strong>

                    <small>
                      + {money(plan.monthly)}/mês
                    </small>
                  </>
                )}
              </div>

              <ul className="plan-features">
                {plan.features.map((feature) => (
                  <li key={feature}>
                    <span>✦</span>
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                type="button"
                className="plan-button"
                onClick={() => setSelectedPlan(plan)}
              >
                {plan.code === "free"
                  ? "Começar grátis"
                  : "Escolher plano"}
              </button>
            </article>
          ))}
        </div>
      </section>

      {selectedPlan && (
        <ProfilePlanSignupModal
  plan={selectedPlan}
  city={city}
  state={state}
  onClose={() => setSelectedPlan(null)}
/>
      )}
    </>
  );
}