export default function HomeFinalCTA() {
  const WHATSAPP = "https://wa.me/5579999033717";

  return (
    <section className="homeFinalCTA">
      <div className="finalCTACard">
        <span className="sectionLabel">Comece agora</span>

        <h2>Seu trabalho merece ser encontrado.</h2>

        <p>
          Crie sua página profissional, apareça online e facilite o contato com
          clientes, empresas e oportunidades pelo WhatsApp.
        </p>

        <div className="finalCTAActions">
          <a href={WHATSAPP} className="finalPrimaryBtn">
            Criar meu perfil pelo WhatsApp
          </a>

          <a href="#buscar" className="finalSecondaryBtn">
            Buscar profissionais
          </a>
        </div>
      </div>
    </section>
  );
}