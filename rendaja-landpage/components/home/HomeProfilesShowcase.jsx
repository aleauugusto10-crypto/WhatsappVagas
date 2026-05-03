export default function HomeProfilesShowcase() {
  const WHATSAPP = "https://wa.me/5579990000000";

  const profiles = [
    {
      initials: "JP",
      name: "João Pedreiro",
      category: "Construção e reformas",
      city: "Itabaiana-SE",
    },
    {
      initials: "SB",
      name: "Studio Bella",
      category: "Beleza e estética",
      city: "Aracaju-SE",
    },
    {
      initials: "PF",
      name: "Paulo Fretes",
      category: "Fretes e mudanças",
      city: "Itabaiana-SE",
    },
    {
      initials: "DL",
      name: "Dona Limpeza",
      category: "Diarista e organização",
      city: "Nossa Senhora Aparecida-SE",
    },
  ];

  return (
    <section className="homeProfilesShowcase" id="perfis">
      <div className="profilesShowcaseHeader">
        <span className="sectionLabel dark">Vitrine de perfis</span>

        <h2>Um catálogo elegante para encontrar profissionais e empresas.</h2>

        <p>
          Essa área já fica pronta para evoluir como uma vitrine organizada,
          onde qualquer pessoa poderá buscar, filtrar e encontrar perfis ativos
          no RendaJá.
        </p>

        <div className="profilesActions">
          <a href="#buscar" className="profilesPrimaryBtn">
            Buscar profissionais
          </a>

          <a href={WHATSAPP} className="profilesSecondaryBtn">
            Criar meu perfil
          </a>
        </div>
      </div>

      <div className="profilesGrid">
        {profiles.map((profile) => (
          <article className="profileShowcaseCard" key={profile.name}>
            <div className="profileShowcaseCover" />

            <div className="profileShowcaseAvatar">
              {profile.initials}
            </div>

            <h3>{profile.name}</h3>
            <p>{profile.category}</p>

            <div className="profileShowcaseMeta">
              <span>{profile.city}</span>
              <span>Perfil ativo</span>
            </div>

            <button type="button">Ver perfil</button>
          </article>
        ))}
      </div>
    </section>
  );
}