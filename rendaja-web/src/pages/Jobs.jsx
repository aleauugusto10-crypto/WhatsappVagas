import React from "react";
import { useState } from "react";
import { Briefcase, MapPin, MessageCircle } from "lucide-react";
import SectionHeader from "../components/SectionHeader.jsx";
import Card from "../components/Card.jsx";
import FilterBar from "../components/FilterBar.jsx";
import { Loading, ErrorBox, Empty } from "../components/Status.jsx";
import { useAsyncData } from "../hooks/useAsyncData.js";
import { listJobs } from "../lib/rendajaApi.js";
import { place, toTitleCase, whatsappLink } from "../lib/format.js";

export default function Jobs() {
  const [search, setSearch] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");

  const { data: jobs, loading, error } = useAsyncData(
    () => listJobs({ search, cidade, estado }),
    [search, cidade, estado]
  );

  return (
    <div className="page">
      <SectionHeader
        eyebrow="Vagas liberadas"
        title="Encontre oportunidades perto de você"
        subtitle="Visualize vagas, veja detalhes e fale com a empresa direto pelo WhatsApp."
      />

      <FilterBar
        search={search}
        setSearch={setSearch}
        cidade={cidade}
        setCidade={setCidade}
        estado={estado}
        setEstado={setEstado}
        placeholder="Buscar por cargo, cidade ou empresa..."
      />

      {loading && <Loading />}
      {error && <ErrorBox message={error} />}
      {!loading && !jobs.length && <Empty message="Nenhuma vaga encontrada com esses filtros." />}

      <div className="list-grid">
        {jobs.map((job) => (
          <Card key={job.id}>
            <div className="card-top">
              <Briefcase />
              <span>{toTitleCase(job.tipo_contratacao || "Oportunidade")}</span>
            </div>
            <h3>{toTitleCase(job.titulo || "Vaga")}</h3>
            <p>{job.descricao || "Sem descrição informada."}</p>
            <div className="meta"><MapPin size={16} /> {place(job.cidade, job.estado)}</div>
            <div className="meta">🏢 {toTitleCase(job.nome_empresa || "Empresa não informada")}</div>
            <div className="meta">💰 {job.salario || "A combinar"}</div>
            <a className="btn small" href={whatsappLink(job.contato_whatsapp, `Tenho interesse na vaga: ${job.titulo || "vaga"}`)} target="_blank" rel="noreferrer">
              <MessageCircle size={16} /> Falar no WhatsApp
            </a>
          </Card>
        ))}
      </div>
    </div>
  );
}
