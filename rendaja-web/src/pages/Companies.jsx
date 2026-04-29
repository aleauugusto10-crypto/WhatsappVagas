import React from "react";
import { useState } from "react";
import { Building2, Megaphone, PlusCircle, Users } from "lucide-react";
import SectionHeader from "../components/SectionHeader.jsx";
import Card from "../components/Card.jsx";
import { createJob } from "../lib/rendajaApi.js";
import { whatsappLink } from "../lib/format.js";

export default function Companies() {
  const [form, setForm] = useState({ titulo: "", descricao: "", nome_empresa: "", cidade: "", estado: "", salario: "" });

  async function submitJob(e) {
    e.preventDefault();
    try {
      await createJob({
        ...form,
        status: "ativa",
        quantidade_vagas: 1,
        destaque: false,
        publicada_em: new Date().toISOString(),
      });
      alert("Vaga preparada com sucesso. Quando conectar o login, ela será vinculada à empresa correta.");
      setForm({ titulo: "", descricao: "", nome_empresa: "", cidade: "", estado: "", salario: "" });
    } catch (err) {
      alert("Erro ao criar vaga: " + err.message);
    }
  }

  return (
    <div className="page">
      <SectionHeader
        eyebrow="Área da empresa"
        title="Publique vagas, receba candidatos e crie campanhas"
        subtitle="Um painel visual para empresas divulgarem oportunidades e alcançarem pessoas pelo WhatsApp."
      />

      <div className="audience-grid">
        <Card>
          <PlusCircle className="card-icon green" />
          <h3>Publicar vaga</h3>
          <p>Crie vagas com função, descrição, requisitos, salário, jornada e contato direto.</p>
        </Card>
        <Card>
          <Users className="card-icon blue" />
          <h3>Receber candidatos</h3>
          <p>Os interessados chegam direto no WhatsApp da empresa, sem burocracia.</p>
        </Card>
        <Card>
          <Megaphone className="card-icon orange" />
          <h3>Criar missão/campanha</h3>
          <p>Defina valor total, vagas e pagamento por pessoa.</p>
        </Card>
      </div>

      <form className="form-panel" onSubmit={submitJob}>
        <h2>Publicar vaga visual</h2>
        <input placeholder="Nome da empresa" value={form.nome_empresa} onChange={(e) => setForm({ ...form, nome_empresa: e.target.value })} required />
        <input placeholder="Título da vaga" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} required />
        <textarea placeholder="Descrição da vaga" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} required />
        <div className="form-row">
          <input placeholder="Cidade" value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} />
          <input placeholder="UF" maxLength="2" value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value.toUpperCase() })} />
          <input placeholder="Salário" value={form.salario} onChange={(e) => setForm({ ...form, salario: e.target.value })} />
        </div>
        <button className="btn primary" type="submit">Preparar vaga</button>
      </form>

      <section className="cta-panel">
        <Building2 />
        <h2>Quer usar o RendaJá na sua empresa?</h2>
        <p>Fale com a gente pelo WhatsApp e comece com vagas e missões liberadas.</p>
        <a className="btn primary" href={whatsappLink("", "Sou empresa e quero entender o RendaJá")} target="_blank" rel="noreferrer">
          Falar com o RendaJá
        </a>
      </section>
    </div>
  );
}
