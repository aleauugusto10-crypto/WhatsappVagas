export default function HomeProfessionalPage() {
  const WHATSAPP = "https://wa.me/5579999033717";

  return (
    <section className="homeProfessionalPage">
      <div className="professionalText">
        <span className="sectionLabel">Página profissional</span>

        <h2>
          Seu perfil vira uma vitrine online para clientes encontrarem você.
        </h2>

        <p>
          O RendaJá ajuda profissionais e empresas a terem presença digital sem
          complicação. Sua página pode mostrar quem você é, o que faz, onde
          atende e como falar com você pelo WhatsApp.
        </p>

        <div className="professionalBenefits">
          <div>
            <strong>Presença no Google</strong>
            <span>Uma página pública para divulgar seu trabalho.</span>
          </div>

          <div>
            <strong>Vitrine elegante</strong>
            <span>Serviços, fotos, descrição e botão direto de contato.</span>
          </div>

          <div>
            <strong>Contato rápido</strong>
            <span>Cliente interessado chama você direto no WhatsApp.</span>
          </div>
        </div>

        <a href={WHATSAPP} className="professionalBtn">
          Criar minha página pelo WhatsApp
        </a>
      </div>

      <div className="professionalPreview">
        <div className="browserMockup">
          <div className="browserTop">
            <span />
            <span />
            <span />
          </div>

          <div className="publicProfile">
            <div className="publicCover" />

            <div className="publicInfo">
              <div className="publicAvatar">RJ</div>

              <div>
                <h3>Studio Bella</h3>
                <p>Beleza • Estética • Atendimento com hora marcada</p>
              </div>
            </div>

            <div className="publicGrid">
              <div>
                <strong>4.9</strong>
                <span>Avaliação</span>
              </div>

              <div>
                <strong>24h</strong>
                <span>Contato</span>
              </div>

              <div>
                <strong>Online</strong>
                <span>Perfil ativo</span>
              </div>
            </div>

            <a href={WHATSAPP}>
              <button>Chamar no WhatsApp</button>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}