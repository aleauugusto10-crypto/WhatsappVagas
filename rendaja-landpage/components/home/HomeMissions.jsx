export default function HomeMissions() {
  const WHATSAPP = "https://wa.me/5579999033717";

  const missions = [
    {
      icon: "📢",
      title: "Divulgar negócios",
      text: "Ganhe ajudando empresas, lojas e profissionais a divulgarem campanhas, posts, ofertas e serviços.",
    },
    {
      icon: "🚚",
      title: "Entregas e favores",
      text: "Missões simples do dia a dia: buscar algo, entregar, resolver uma tarefa rápida ou ajudar alguém perto de você.",
    },
    {
      icon: "🧹",
      title: "Serviços rápidos",
      text: "Pequenos bicos como limpeza, montagem, organização, jardinagem, pintura e outras tarefas locais.",
    },
  ];

  return (
    <section className="homeMissions" id="missoes">
      <div className="missionsContent">
        <span className="sectionLabel">Missões pagas</span>

        <h2>Ganhe dinheiro fazendo tarefas simples perto de você.</h2>

        <p>
          No RendaJá, uma missão pode ser uma divulgação, uma entrega, um favor,
          um serviço rápido ou qualquer oportunidade honesta para gerar renda no
          dia a dia.
        </p>

        <a href={WHATSAPP} className="missionsBtn">
          Ver missões pelo WhatsApp
        </a>
      </div>

      <div className="missionsGrid">
        {missions.map((mission) => (
          <article className="missionCard" key={mission.title}>
            <div className="missionIcon">{mission.icon}</div>
            <h3>{mission.title}</h3>
            <p>{mission.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}