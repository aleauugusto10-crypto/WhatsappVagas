import { useEffect, useMemo, useState } from "react";

export default function HomeLogoCarousel() {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfiles() {
      try {
        const res = await fetch("/api/profiles/active");
        const data = await res.json().catch(() => []);

        setProfiles(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Erro ao carregar perfis ativos:", err);
        setProfiles([]);
      } finally {
        setLoading(false);
      }
    }

    loadProfiles();
  }, []);

  const carouselProfiles = useMemo(() => {
  if (!profiles.length) return [];

  const minItems = 16;
  const repeatTimes = Math.max(4, Math.ceil(minItems / profiles.length));

  return Array.from({ length: repeatTimes })
    .flatMap(() => profiles);
}, [profiles]);

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
          {loading ? (
            <div className="logoCarouselItem">
              <div className="logoMark">RJ</div>
              <span>Carregando perfis...</span>
            </div>
          ) : carouselProfiles.length === 0 ? (
            <div className="logoCarouselItem">
              <div className="logoMark">RJ</div>
              <span>Perfis em breve</span>
            </div>
          ) : (
            carouselProfiles.map((profile, index) => (
              <a
                href={`/p/${profile.slug}`}
                className="logoCarouselItem"
                key={`${profile.id || profile.slug}-${index}`}
              >
                <div className="logoMark">
                  {profile.logo_url ? (
                    <img src={profile.logo_url} alt={profile.nome} />
                  ) : (
                    String(profile.nome || "RJ").slice(0, 2).toUpperCase()
                  )}
                </div>

                <span>{profile.nome}</span>
              </a>
            ))
          )}
        </div>
      </div>
    </section>
  );
}