export default function HomeHero() {
  const WHATSAPP = "https://wa.me/5579990000000";

  return (
    <section className="homeHero">
      <div className="heroGlow heroGlowOne" />
      <div className="heroGlow heroGlowTwo" />

      <div className="heroContent">
        <div className="heroBadge">
          <span>●</span>
          Perfis, vagas, missões e oportunidades pelo WhatsApp
        </div>

        <h1>
          Seu trabalho precisa ser visto.
          <strong> O RendaJá coloca você online.</strong>
        </h1>

        <p>
          Crie sua página profissional, apareça com mais facilidade nas buscas,
          receba clientes pelo WhatsApp e encontre oportunidades reais perto de
          você.
        </p>

        <div className="heroActions">
          <a href={WHATSAPP} className="heroPrimaryBtn">
            Criar meu perfil pelo WhatsApp
          </a>

          <a href="#buscar" className="heroSecondaryBtn">
            Buscar profissionais
          </a>
        </div>

        <div className="heroStats">
          <div>
            <strong>Perfil online</strong>
            <span>vitrine profissional</span>
          </div>

          <div>
            <strong>WhatsApp</strong>
            <span>cadastro simples</span>
          </div>

          <div>
            <strong>Missões</strong>
            <span>renda rápida</span>
          </div>
        </div>
      </div>

      <div className="heroVisual">
        <div className="phoneMockup">
          <div className="phoneTop" />

          <div className="profilePreview">
            <div className="profileCover" />

            <div className="profileAvatar">
              RJ
            </div>

            <h3>João Pedreiro</h3>
            <p>Construção • Reformas • Acabamento</p>

            <div className="profileTags">
              <span>Pedreiro</span>
              <span>Itabaiana-SE</span>
            </div>

            <button>Chamar no WhatsApp</button>
          </div>
        </div>

        <div className="floatingCard floatingCardOne">
          <strong>+ visibilidade</strong>
          <span>perfil pronto para divulgar</span>
        </div>

        <div className="floatingCard floatingCardTwo">
          <strong>clientes direto</strong>
          <span>sem complicar com login</span>
        </div>

        <div className="floatingCard floatingCardThree">
          <strong>missões pagas</strong>
          <span>bicos e tarefas locais</span>
        </div>
      </div>
    </section>
  );
}