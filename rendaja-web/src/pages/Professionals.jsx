import React from "react";
import { useState } from "react";
import { MapPin, MessageCircle, Star, UserRound } from "lucide-react";
import SectionHeader from "../components/SectionHeader.jsx";
import Card from "../components/Card.jsx";
import FilterBar from "../components/FilterBar.jsx";
import { Loading, ErrorBox, Empty } from "../components/Status.jsx";
import { useAsyncData } from "../hooks/useAsyncData.js";
import { listProfessionals } from "../lib/rendajaApi.js";
import { place, toTitleCase, whatsappLink } from "../lib/format.js";

export default function Professionals() {
  const [search, setSearch] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");

  const { data: professionals, loading, error } = useAsyncData(
    () => listProfessionals({ search, cidade, estado }),
    [search, cidade, estado]
  );

  return (
    <div className="page">
      <SectionHeader
        eyebrow="Profissionais liberados"
        title="Encontre profissionais por categoria"
        subtitle="Para contratantes e empresas encontrarem gente disponível sem complicação."
      />

      <FilterBar
        search={search}
        setSearch={setSearch}
        cidade={cidade}
        setCidade={setCidade}
        estado={estado}
        setEstado={setEstado}
        placeholder="Buscar profissional, serviço ou cidade..."
      />

      {loading && <Loading />}
      {error && <ErrorBox message={error} />}
      {!loading && !professionals.length && <Empty message="Nenhum profissional encontrado com esses filtros." />}

      <div className="list-grid">
        {professionals.map((p) => (
          <Card key={p.id}>
            <div className="card-top">
              <UserRound />
              <span><Star size={14} /> Perfil ativo</span>
            </div>
            <h3>{toTitleCase(p.titulo || "Profissional")}</h3>
            <p>{p.descricao || "Sem descrição informada."}</p>
            <div className="meta">👤 {toTitleCase(p.usuarios?.nome || p.nome || "Nome não informado")}</div>
            <div className="meta"><MapPin size={16} /> {place(p.cidade, p.estado)}</div>
            <a className="btn small" href={whatsappLink(p.contato_whatsapp, `Olá, vi seu perfil no RendaJá: ${p.titulo || "profissional"}`)} target="_blank" rel="noreferrer">
              <MessageCircle size={16} /> Chamar no WhatsApp
            </a>
          </Card>
        ))}
      </div>
    </div>
  );
}
