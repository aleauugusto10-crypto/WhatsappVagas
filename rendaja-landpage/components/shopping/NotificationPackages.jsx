const PACKAGES = [
  {
    id: 1,
    name: "Plano Semanal",
    price: "R$ 9,90",
    description:
      "Receba vagas e missões diretamente no WhatsApp durante 7 dias.",
    features: [
      "Vagas perto de você",
      "Missões rápidas",
      "Alertas em tempo real",
    ],
    badge: "Mais acessível",
  },

  {
    id: 2,
    name: "Plano Mensal",
    price: "R$ 19,90",
    description:
      "Receba notificações ilimitadas durante 30 dias no WhatsApp.",
    features: [
      "Vagas ilimitadas",
      "Missões ilimitadas",
      "Maior prioridade",
    ],
    badge: "Mais popular",
  },

  {
    id: 3,
    name: "Plano Completo",
    price: "R$ 39,90",
    description:
      "Receba tudo primeiro e tenha acesso aos melhores alertas.",
    features: [
      "Todas categorias",
      "Prioridade máxima",
      "Alertas premium",
    ],
    badge: "Premium",
  },
];

export default function NotificationPackages() {
  return (
    <section className="shoppingSection" id="alertas">
      <div className="shoppingSectionHead">
        <div>
          <span>Alertas</span>
          <h2>Receba vagas no WhatsApp</h2>
          <p>
            Escolha um pacote e receba oportunidades direto no celular.
          </p>
        </div>
      </div>

      <div className="shoppingGrid">
        {PACKAGES.map((item) => (
          <article
            key={item.id}
            className="productCard notificationPackageCard"
          >
            <div className="productCardBody">
              <small>{item.badge}</small>

              <h3>{item.name}</h3>

              <strong>{item.price}</strong>

              <p className="notificationPackageText">
                {item.description}
              </p>

              <div className="notificationPackageFeatures">
                {item.features.map((feature) => (
                  <span key={feature}>✓ {feature}</span>
                ))}
              </div>

              <a
                className="notificationPackageButton"
                href="https://wa.me/5579999033717"
                target="_blank"
                rel="noreferrer"
              >
                Assinar pacote
              </a>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}