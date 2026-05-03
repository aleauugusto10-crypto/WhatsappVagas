const logos = [
  "RJ",
  "Studio Bella",
  "Oficina Silva",
  "Casa Forte",
  "Dona Limpeza",
  "Tech Mais",
  "Pintura Pro",
  "Auto Center",
  "Mãos de Ouro",
  "Delivery Já",
];

export default function HomeLogoCarousel() {
  const duplicatedLogos = [...logos, ...logos];

  return (
    <section className="homeLogoCarousel" aria-label="Perfis ativos no RendaJá">
      <div className="logoCarouselHeader">
        <span className="sectionLabel dark">Perfis ativos</span>

        <h2>Gente real construindo presença online</h2>

        <p>
          Empresas, autônomos e profissionais locais podem criar uma vitrine
          pública para serem encontrados com mais facilidade.
        </p>
      </div>

      <div className="logoCarouselShell">
        <div className="logoCarouselFade left" />
        <div className="logoCarouselFade right" />

        <div className="logoCarouselTrack">
          {duplicatedLogos.map((logo, index) => (
            <div className="logoCarouselItem" key={`${logo}-${index}`}>
              <div className="logoMark">{logo.slice(0, 2)}</div>
              <span>{logo}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}