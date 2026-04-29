import React from "react";
import { Link, NavLink } from "react-router-dom";
import { Briefcase, Building2, Home, Megaphone, Sparkles, Users } from "lucide-react";
import { whatsappLink } from "../lib/format.js";

const nav = [
  { to: "/", label: "Início", icon: Home },
  { to: "/vagas", label: "Vagas", icon: Briefcase },
  { to: "/profissionais", label: "Profissionais", icon: Users },
  { to: "/missoes", label: "Missões", icon: Megaphone },
  { to: "/empresas", label: "Empresas", icon: Building2 },
  { to: "/planos", label: "Planos", icon: Sparkles },
];

export default function Shell({ children }) {
  return (
    <div className="app-shell">
      <header className="topbar">
        <Link to="/" className="brand">
          <span className="brand-mark">R</span>
          <span>
            <strong>RendaJá</strong>
            <small>Vagas • Bicos • Oportunidades</small>
          </span>
        </Link>

        <nav className="nav">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink key={item.to} to={item.to} className={({ isActive }) => isActive ? "active" : ""}>
                <Icon size={17} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <a className="whatsapp-cta" href={whatsappLink("", "como funciona? 🤔")} target="_blank" rel="noreferrer">
          Entrar pelo WhatsApp
        </a>
      </header>

      <main>{children}</main>

      <footer className="footer">
        <strong>RendaJá</strong>
        <span>Conectando pessoas a oportunidades reais.</span>
        <span>Instagram: {import.meta.env.VITE_RENDAJA_INSTAGRAM || "@rendaja.zap"} • WhatsApp: 79 99903-3717</span>
      </footer>
    </div>
  );
}
