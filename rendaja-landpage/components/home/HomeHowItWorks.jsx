export default function HomeHowItWorks() {
  const steps = [
    {
      number: "01",
      title: "Chame no WhatsApp",
      text: "Você começa pelo bot do RendaJá, sem precisar criar login complicado.",
    },
    {
      number: "02",
      title: "Informe seus dados",
      text: "Nome, cidade, profissão, serviços, fotos e forma de contato.",
    },
    {
      number: "03",
      title: "Monte sua vitrine",
      text: "Seu perfil público fica pronto para mostrar seu trabalho com elegância.",
    },
    {
      number: "04",
      title: "Receba contatos",
      text: "Clientes podem encontrar você e chamar direto no WhatsApp.",
    },
  ];

  return (
    <section className="homeHowItWorks" id="como-funciona">
      <div className="howWrapper">
        
        {/* TEXTO */}
        <div className="howContent">
          <div className="howHeader">
            <span className="sectionLabel dark">Como funciona</span>

            <h2>Do WhatsApp para sua presença online.</h2>

            <p>
              O RendaJá simplifica o caminho para quem quer divulgar seu trabalho,
              encontrar oportunidades ou contratar profissionais.
            </p>
          </div>

          <div className="howSteps">
            {steps.map((step) => (
              <div className="howStepCard" key={step.number}>
                <span>{step.number}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* IMAGEM */}
        <div className="howImage">
          <img
            src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?q=80&w=1000&auto=format&fit=crop"
            alt="Profissional usando celular para trabalho"
          />
        </div>

      </div>
    </section>
  );
}