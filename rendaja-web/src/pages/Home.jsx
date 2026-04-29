import React from "react";
import { Link } from "react-router-dom";
import { Briefcase, Building2, CheckCircle2, Megaphone, Search, Star, Users, WalletCards } from "lucide-react";
import Card from "../components/Card.jsx";
import { whatsappLink } from "../lib/format.js";

const stats = [
  { label: "Vagas liberadas", value: "Grátis" },
  { label: "Missões pagas", value: "Ativas" },
  { label: "Perfis profissionais", value: "Liberados" },
  { label: "Contato direto", value: "WhatsApp" },
];

export default function Home() {
  return (
    <div className="page">
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">Nova fase do RendaJá 🚀</span>
          <h1>Trabalho, missões e contratações em um só lugar.</h1>
          <p>
            O RendaJá conecta quem quer trabalhar, quem precisa contratar e empresas
            que querem divulgar vagas ou criar campanhas pagas.
          </p>
          <div className="hero-actions">
            <Link className="btn primary" to="/vagas">Procurar vagas</Link>
            <Link className="btn secondary" to="/missoes">Ver missões</Link>
            <a className="btn ghost" href={whatsappLink("", "como funciona? 🤔")} target="_blank" rel="noreferrer">Falar no WhatsApp</a>
          </div>
        </div>

        <div className="hero-panel">
          <div className="logo-orb">R</div>
          <h2>RendaJá</h2>
          <p>Ganhe dinheiro hoje. Direto no WhatsApp.</p>
          <div className="pill-row">
            <span>Vagas</span><span>Bicos</span><span>Oportunidades</span>
          </div>
        </div>
      </section>

      <section className="stats-grid">
        {stats.map((s) => (
          <Card key={s.label}>
            <strong>{s.value}</strong>
            <span>{s.label}</span>
          </Card>
        ))}
      </section>

      <section className="audience-grid">
        <Card>
          <Briefcase className="card-icon blue" />
          <h3>Para quem quer trabalhar</h3>
          <p>Encontre vagas, missões pagas e oportunidades perto de você. Crie seu perfil profissional de graça.</p>
          <Link to="/vagas">Ver vagas</Link>
        </Card>
        <Card>
          <Search className="card-icon green" />
          <h3>Para quem precisa contratar</h3>
          <p>Busque profissionais por categoria, cidade e área de atuação. Fale direto pelo WhatsApp.</p>
          <Link to="/profissionais">Buscar profissionais</Link>
        </Card>
        <Card>
          <Building2 className="card-icon orange" />
          <h3>Para empresas</h3>
          <p>Publique vagas, receba candidatos, destaque anúncios e crie campanhas de missão para redes sociais.</p>
          <Link to="/empresas">Área da empresa</Link>
        </Card>
      </section>

      <section className="feature-strip">
        <div><CheckCircle2 /> Vagas liberadas</div>
        <div><Megaphone /> Missões pagas</div>
        <div><Users /> Profissionais grátis</div>
        <div><Star /> Destaques opcionais</div>
        <div><WalletCards /> Planos só para mais alcance</div>
      </section>
    </div>
  );
}
