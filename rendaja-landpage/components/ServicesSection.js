const DEFAULT_SERVICES = [
  {
    id: "default-1",
    icon: "💼",
    title: "Atendimento profissional",
    description: "Serviço personalizado de acordo com a necessidade do cliente.",
    active: true,
  },
];

export default function ServicesSection({ profile }) {
  if (profile?.show_services === false) return null;

  const services = Array.isArray(profile?.services_items)
    ? profile.services_items.filter((item) => item?.active !== false)
    : DEFAULT_SERVICES;

  if (!services.length) return null;

  return (
    <section id="servicos" className="services-section">
      <div className="services-inner">
        <div className="services-head">
          <span className="eyebrow">Serviços</span>
          <h2>{profile?.services_title || "Serviços"}</h2>
          <p>
            {profile?.services_text ||
              "Conheça as principais soluções oferecidas."}
          </p>
        </div>

        <div className="services-grid">
          {services.map((service) => (
            <article key={service.id} className="service-card">
              <div className="service-icon">{service.icon || "💼"}</div>
              <h3>{service.title || "Serviço"}</h3>
              <p>{service.description || "Descrição do serviço oferecido."}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}