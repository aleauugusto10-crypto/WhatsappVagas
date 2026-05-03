import Head from "next/head";

import HomeHeader from "../components/home/HomeHeader";
import HomeHero from "../components/home/HomeHero";
import HomeSearchProfiles from "../components/home/HomeSearchProfiles";
import HomeLogoCarousel from "../components/home/HomeLogoCarousel";
import HomeProfessionalPage from "../components/home/HomeProfessionalPage";
import HomeHowItWorks from "../components/home/HomeHowItWorks";
import HomeMissions from "../components/home/HomeMissions";
import HomeJobs from "../components/home/HomeJobs";
import HomeForCompanies from "../components/home/HomeForCompanies";
import HomeProfilesShowcase from "../components/home/HomeProfilesShowcase";
import HomeFinalCTA from "../components/home/HomeFinalCTA";

export default function Home() {
  return (
    <>
      <Head>
        <title>RendaJá — Perfis, vagas, missões e oportunidades</title>
        <meta
          name="description"
          content="Crie sua página profissional online, encontre vagas, missões, empresas e oportunidades pelo WhatsApp."
        />
      </Head>

      <main className="rendajaHome">
        <HomeHeader />
        <HomeHero />
        <HomeSearchProfiles />
        <HomeLogoCarousel />
        <HomeProfessionalPage />
        <HomeHowItWorks />
        <HomeMissions />
        <HomeJobs />
        <HomeForCompanies />
        <HomeProfilesShowcase />
        <HomeFinalCTA />
      </main>
    </>
  );
}