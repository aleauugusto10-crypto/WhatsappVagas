export default function ShoppingFeatureStrip({ items = [] }) {
  const defaultItems = [
    {
      href: "#vagas",
      label: "💼 Vagas",
      title: "Vagas perto de você",
      text: "Veja oportunidades cadastradas por empresas e comércios da sua região.",
    },
    {
      href: "#missoes",
      label: "🎯 Missões",
      title: "Missões rápidas",
      text: "Tarefas locais, divulgações, entregas e ações pontuais.",
    },
    {
      href: "#alertas",
      label: "🔔 Alertas",
      title: "Receba no WhatsApp",
      text: "Escolha um pacote e receba vagas e missões direto no celular.",
    },
  ];

  const cards = Array.isArray(items) && items.length > 0 ? items : defaultItems;

  return (
    <section className="shoppingFeatureStrip">
      {cards.map((item, index) => (
        <a
          key={`${item.href || "feature"}-${index}`}
          href={item.href || "#"}
        >
          <span>{item.label}</span>
          <h3>{item.title}</h3>
          <p>{item.text}</p>
        </a>
      ))}
    </section>
  );
}