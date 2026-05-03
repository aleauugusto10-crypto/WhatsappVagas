export default function HomeJobs() {
  const WHATSAPP = "https://wa.me/5579990000000";

  const jobs = [
    {
      title: "Vagas locais",
      text: "Encontre oportunidades perto de você, sem precisar sair procurando em vários lugares.",
    },
    {
      title: "Bicos e renda extra",
      text: "Trabalhos temporários e serviços rápidos para quem quer ganhar dinheiro no dia a dia.",
    },
    {
      title: "Oportunidades reais",
      text: "Empresas e pessoas publicando demandas reais dentro da sua região.",
    },
  ];

  return (
    <section className="homeJobs">
      <div className="jobsHeader">
        <span className="sectionLabel dark">Oportunidades</span>

        <h2>Encontre trabalho de forma simples e direta</h2>

        <p>
          O RendaJá conecta você a vagas, bicos e oportunidades reais. Tudo
          acontece de forma rápida e sem burocracia.
        </p>
      </div>

      <div className="jobsGrid">
        {jobs.map((job) => (
          <div className="jobCard" key={job.title}>
            <h3>{job.title}</h3>
            <p>{job.text}</p>
          </div>
        ))}
      </div>

      <div className="jobsCTA">
        <a href={WHATSAPP} className="jobsBtn">
          Ver oportunidades no WhatsApp
        </a>
      </div>
    </section>
  );
}