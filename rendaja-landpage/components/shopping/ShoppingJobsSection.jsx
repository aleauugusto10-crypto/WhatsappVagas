import { useEffect, useState } from "react";
import { supabase } from "../../src/lib/supabase";

function money(value) {
  if (value === null || value === undefined || value === "") return "A combinar";

  const raw = String(value).trim();

  if (raw.includes("R$")) return raw;

  const number = Number(raw.replace(",", "."));

  if (Number.isNaN(number)) return raw;

  return number.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function normalizeWhatsapp(phone = "") {
  let digits = String(phone || "").replace(/\D/g, "");

  if (!digits) return "";

  if (!digits.startsWith("55")) {
    digits = `55${digits}`;
  }

  return digits;
}

function tipoContratacaoLabel(value = "") {
  const map = {
    clt: "CLT",
    diaria: "Diária",
    freelance: "Freelance",
    mei: "MEI",
    meio_periodo: "Meio período",
    comissao: "Comissão",
    a_combinar: "A combinar",
  };

  return map[value] || value;
}

export default function ShoppingJobsSection() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    async function loadJobs() {
      try {
        setLoading(true);

        const { data, error } = await supabase
          .from("vagas")
          .select("*")
          .eq("status", "ativa")
          .order("created_at", { ascending: false })
          .limit(12);

        if (!alive) return;

        if (error) {
          console.error("Erro ao buscar vagas:", error);
          setJobs([]);
          return;
        }

        setJobs(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Erro geral ao buscar vagas:", err);
        if (alive) setJobs([]);
      } finally {
        if (alive) setLoading(false);
      }
    }

    loadJobs();

    return () => {
      alive = false;
    };
  }, []);

  return (
    <section className="shoppingSection" id="vagas">
      <div className="shoppingSectionHead">
        <div>
          <span>Vagas</span>
          <h2>Vagas perto de você</h2>
          <p>Oportunidades cadastradas por empresas no CompreTudo.shop.</p>
        </div>
      </div>

      {loading ? (
        <div className="shoppingEmptyState">
          <div>💼</div>
          <h2>Carregando vagas...</h2>
          <p>Buscando oportunidades disponíveis no momento.</p>
        </div>
      ) : jobs.length === 0 ? (
        <div className="shoppingEmptyState">
          <div>💼</div>
          <h2>Nenhuma vaga publicada ainda</h2>
          <p>Quando empresas cadastrarem oportunidades, elas aparecerão aqui.</p>
        </div>
      ) : (
        <div className="shoppingListingGrid">
          {jobs.map((job) => {
            const whatsapp = normalizeWhatsapp(job.contato_whatsapp);

            return (
              <article key={job.id} className="shoppingListingCard">
                <div className="shoppingListingIcon">💼</div>

                <div>
                  <small>{job.nome_empresa || "Empresa"}</small>

                  <h2>{job.titulo || "Vaga disponível"}</h2>

                  <p>
                    {job.descricao ||
                      "Oportunidade cadastrada no CompreTudo.shop."}
                  </p>

                  <div className="shoppingListingMeta">
                    <span>
                      📍 {job.cidade || "Cidade não informada"}
                      {job.estado ? `/${job.estado}` : ""}
                    </span>

                    <strong>{money(job.salario)}</strong>

                    {job.tipo_contratacao && (
                      <span>{tipoContratacaoLabel(job.tipo_contratacao)}</span>
                    )}
                  </div>

                  {whatsapp ? (
                    <a
                      href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(
                        `Olá! Vi a vaga "${job.titulo || "disponível"}" no CompreTudo.shop e gostaria de saber mais.`
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Falar no WhatsApp
                    </a>
                  ) : (
                    <a href="/shopping">Ver oportunidade</a>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}