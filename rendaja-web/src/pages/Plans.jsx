import React from "react";
import { CheckCircle2, Sparkles } from "lucide-react";
import SectionHeader from "../components/SectionHeader.jsx";
import Card from "../components/Card.jsx";
import { Loading, ErrorBox } from "../components/Status.jsx";
import { useAsyncData } from "../hooks/useAsyncData.js";
import { listPlans } from "../lib/rendajaApi.js";
import { money } from "../lib/format.js";

export default function Plans() {
  const { data: plans, loading, error } = useAsyncData(() => listPlans(), []);

  return (
    <div className="page">
      <SectionHeader
        eyebrow="O essencial é grátis"
        title="Planos apenas para quem quer mais alcance"
        subtitle="Vagas, missões e perfil profissional ficam liberados. A monetização vem de alertas, destaques e alcance extra."
      />

      <section className="free-box">
        <h2>Grátis para começar</h2>
        <div><CheckCircle2 /> Procurar vagas</div>
        <div><CheckCircle2 /> Participar de missões</div>
        <div><CheckCircle2 /> Criar perfil profissional</div>
        <div><CheckCircle2 /> Buscar profissionais</div>
        <div><CheckCircle2 /> Publicar vagas básicas</div>
      </section>

      {loading && <Loading />}
      {error && <ErrorBox message={error} />}

      <div className="list-grid">
        {plans.map((p) => (
          <Card key={p.id || p.codigo || p.nome}>
            <div className="card-top">
              <Sparkles />
              <span>{money(p.valor)}</span>
            </div>
            <h3>{p.nome}</h3>
            <p>{p.descricao || "Plano RendaJá para mais alcance e visibilidade."}</p>
            <div className="meta">Código: {p.codigo || "-"}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}
