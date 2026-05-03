import { useEffect, useMemo, useState } from "react";

export default function HomeProfilesShowcase() {
  const WHATSAPP = "https://wa.me/5579999033717";

  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfiles() {
      try {
        const res = await fetch("/api/profiles/active");
        const data = await res.json().catch(() => []);

        setProfiles(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Erro ao carregar perfis:", err);
        setProfiles([]);
      } finally {
        setLoading(false);
      }
    }

    loadProfiles();
  }, []);

  const carouselProfiles = useMemo(() => {
  if (!profiles.length) return [];

  const minItems = 30;
  const repeatTimes = Math.max(6, Math.ceil(minItems / profiles.length));

  return Array.from({ length: repeatTimes }).flatMap(() => profiles);
}, [profiles]);

  return (
    <section className="homeProfilesShowcase" id="perfis">
      <div className="profilesShowcaseHeader">
        <span className="sectionLabel dark">Catálogo local</span>

        <h2>Catálogo de profissionais e empresas.</h2>

        <p>
          Encontre profissionais, empresas e serviços ativos na sua região.
          Veja perfis públicos, conheça o trabalho de cada um e fale direto pelo
          WhatsApp.
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

      <div className="profilesCarouselShell">
        <div className="profilesCarouselFade left" />
        <div className="profilesCarouselFade right" />

        <div className="profilesGrid">
          {loading ? (
            <article className="profileShowcaseCard">
              <div className="profileShowcaseCover" />
              <div className="profileShowcaseAvatar">RJ</div>
              <h3>Carregando perfis...</h3>
              <p>Buscando perfis ativos no RendaJá</p>
              <div className="profileShowcaseMeta">
                <span>Online</span>
                <span>Aguarde</span>
              </div>
              <button type="button">Carregando</button>
            </article>
          ) : profiles.length === 0 ? (
            <article className="profileShowcaseCard">
              <div className="profileShowcaseCover" />
              <div className="profileShowcaseAvatar">RJ</div>
              <h3>Perfis em breve</h3>
              <p>Os perfis ativos aparecerão aqui automaticamente.</p>
              <div className="profileShowcaseMeta">
                <span>RendaJá</span>
                <span>Perfil ativo</span>
              </div>
              <button type="button">Em breve</button>
            </article>
          ) : (
            carouselProfiles.map((profile, index) => (
              <article
                className="profileShowcaseCard"
                key={`${profile.id || profile.slug}-${index}`}
              >
                <div className="profileShowcaseCover">
                  {profile.hero_image_url && (
                    <img src={profile.hero_image_url} alt={profile.nome} />
                  )}
                </div>

                <div className="profileShowcaseAvatar">
                  {profile.logo_url ? (
                    <img src={profile.logo_url} alt={profile.nome} />
                  ) : (
                    String(profile.nome || "RJ").slice(0, 2).toUpperCase()
                  )}
                </div>

                <h3>{profile.nome}</h3>
                <p>{profile.servico || "Profissional"}</p>

                <div className="profileShowcaseMeta">
                  <span>
                    {profile.cidade || "Cidade"}
                    {profile.estado ? `-${profile.estado}` : ""}
                  </span>
                  <span>Perfil ativo</span>
                </div>

                <a href={`/p/${profile.slug}`} className="profileShowcaseBtn">
                  Ver perfil
                </a>
              </article>
            ))
          )}
        </div>
      </div>
    </section>
  );
}