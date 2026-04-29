import React from "react";
import { useState } from "react";
import { Megaphone, Users, Wallet } from "lucide-react";
import SectionHeader from "../components/SectionHeader.jsx";
import Card from "../components/Card.jsx";
import FilterBar from "../components/FilterBar.jsx";
import { Loading, ErrorBox, Empty } from "../components/Status.jsx";
import { useAsyncData } from "../hooks/useAsyncData.js";
import { createMission, listMissions } from "../lib/rendajaApi.js";
import { money, place, toTitleCase, whatsappLink } from "../lib/format.js";

export default function Missions() {
  const [search, setSearch] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  const [form, setForm] = useState({ titulo: "", descricao: "", valor_total: "", vagas_total: 1 });

  const { data: missions, loading, error } = useAsyncData(
    () => listMissions({ search, cidade, estado }),
    [search, cidade, estado]
  );

  async function submitMission(e) {
    e.preventDefault();
    const vagas = Math.max(1, Number(form.vagas_total || 1));
    const total = Number(String(form.valor_total).replace(",", ".") || 0);
    const payload = {
      titulo: form.titulo,
      descricao: form.descricao,
      valor_total: total,
      valor_por_pessoa: vagas ? total / vagas : total,
      vagas_total: vagas,
      vagas_ocupadas: 0,
      tipo: vagas > 1 ? "campanha" : "individual",
      status: "pendente_pagamento",
      pagamento_status: "pendente",
      prazo_horas: 24,
    };

    try {
      await createMission(payload);
      alert("Missão preparada com sucesso. Quando conectar o login, ela será salva no usuário correto.");
      setForm({ titulo: "", descricao: "", valor_total: "", vagas_total: 1 });
    } catch (err) {
      alert("Erro ao criar missão: " + err.message);
    }
  }

  return (
    <div className="page">
      <SectionHeader
        eyebrow="Nova atualização de missões"
        title="Crie missões individuais ou campanhas para várias pessoas"
        subtitle="Perfeito para divulgação em redes sociais, tarefas locais e renda extra."
      />

      <section className="mission-highlight">
        <div>
          <h2>Exemplo: campanha para Instagram</h2>
          <p>Coloque R$ 100, defina 10 participantes e cada pessoa recebe R$ 10 para curtir, comentar e compartilhar um vídeo.</p>
        </div>
        <a className="btn primary" href={whatsappLink("", "Quero criar uma missão no RendaJá")} target="_blank" rel="noreferrer">
          Criar pelo WhatsApp
        </a>
      </section>

      <form className="form-panel" onSubmit={submitMission}>
        <h2>Criar missão visual</h2>
        <input placeholder="Título da missão" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} required />
        <textarea placeholder="Descrição/regras" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} required />
        <div className="form-row">
          <input placeholder="Valor total" value={form.valor_total} onChange={(e) => setForm({ ...form, valor_total: e.target.value })} required />
          <input type="number" min="1" placeholder="Vagas" value={form.vagas_total} onChange={(e) => setForm({ ...form, vagas_total: e.target.value })} required />
        </div>
        <button className="btn primary" type="submit">Preparar missão</button>
      </form>

      <FilterBar search={search} setSearch={setSearch} cidade={cidade} setCidade={setCidade} estado={estado} setEstado={setEstado} placeholder="Buscar missão..." />

      {loading && <Loading />}
      {error && <ErrorBox message={error} />}
      {!loading && !missions.length && <Empty message="Nenhuma missão encontrada." />}

      <div className="list-grid">
        {missions.map((m) => (
          <Card key={m.id}>
            <div className="card-top">
              <Megaphone />
              <span>{toTitleCase(m.tipo || "Missão")}</span>
            </div>
            <h3>{toTitleCase(m.titulo || "Missão")}</h3>
            <p>{m.descricao || "Sem descrição informada."}</p>
            <div className="meta">📍 {place(m.cidade, m.estado)}</div>
            <div className="meta"><Wallet size={16} /> Total: {money(m.valor_total || m.valor)}</div>
            <div className="meta"><Users size={16} /> {m.vagas_total || 1} vaga(s) • {money(m.valor_por_pessoa || m.valor)} por pessoa</div>
          </Card>
        ))}
      </div>
    </div>
  );
}
