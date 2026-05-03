export default function HomeForCompanies() {
  const WHATSAPP = "https://wa.me/5579990000000";

  const benefits = [
    {
      title: "Encontre profissionais",
      text: "Busque pessoas e empresas por serviço, cidade, área de atuação ou perfil público.",
    },
    {
      title: "Publique oportunidades",
      text: "Divulgue vagas, bicos e demandas para trabalhadores da sua região.",
    },
    {
      title: "Contrate com mais agilidade",
      text: "O contato acontece direto pelo WhatsApp, sem formulários complicados.",
    },
  ];

  return (
    <section className="homeForCompanies" id="empresas">
      <div className="companiesVisual">
        <div className="companyPanel">
          <div className="companyPanelHeader">
            <span />
            <span />
            <span />
          </div>

          <div className="companyPanelBody">
            <div className="companySearchLine">
              <span>🔍</span>
              <p>Buscar profissional para serviço...</p>
            </div>

            <div className="companyResultCard">
              <div className="companyAvatar">PF</div>

              <div>
                <strong>Paulo Fretes</strong>
                <small>Fretes • Mudanças • Entregas</small>
              </div>

              <button>Contato</button>
            </div>

            <div className="companyResultCard">
              <div className="companyAvatar">DL</div>

              <div>
                <strong>Dona Limpeza</strong>
                <small>Diarista • Organização • Faxina</small>
              </div>

              <button>Contato</button>
            </div>
          </div>
        </div>
      </div>

      <div className="companiesContent">
        <span className="sectionLabel">Para empresas e contratantes</span>

        <h2>Precisa contratar? O RendaJá aproxima você de quem resolve.</h2>

        <p>
          Empresas, patrões e clientes podem encontrar profissionais, divulgar
          oportunidades e transformar uma necessidade em contato direto pelo
          WhatsApp.
        </p>

        <div className="companiesBenefits">
          {benefits.map((item) => (
            <div key={item.title}>
              <strong>{item.title}</strong>
              <span>{item.text}</span>
            </div>
          ))}
        </div>

        <a href={WHATSAPP} className="companiesBtn">
          Buscar ou divulgar pelo WhatsApp
        </a>
      </div>
    </section>
  );
}