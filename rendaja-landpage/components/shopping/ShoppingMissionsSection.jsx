import { useEffect, useState } from "react";
import { supabase } from "../../src/lib/supabase";

function money(value) {
  if (!value) return "A combinar";

  return String(value).includes("R$")
    ? value
    : `R$ ${String(value).replace(".", ",")}`;
}

export default function ShoppingMissionsSection() {
  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    async function loadMissions() {
      setLoading(true);

      const { data, error } = await supabase
        .from("missoes")
        .select("*")
        .eq("status", "ativa")
        .order("created_at", { ascending: false })
        .limit(12);

      if (!alive) return;

      if (error) {
        console.error("Erro ao buscar missões:", error);
        setMissions([]);
      } else {
        setMissions(data || []);
      }

      setLoading(false);
    }

    loadMissions();

    return () => {
      alive = false;
    };
  }, []);

  return (
    <section className="shoppingSection" id="missoes">
      <div className="shoppingSectionHead">
        <div>
          <span>Missões</span>
          <h2>Ganhe dinheiro com missões</h2>
          <p>
            Tarefas rápidas e oportunidades publicadas na plataforma.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="shoppingEmptyState">
          <div>🚀</div>
          <h2>Carregando missões...</h2>
        </div>
      ) : missions.length === 0 ? (
        <div className="shoppingEmptyState">
          <div>🚀</div>
          <h2>Nenhuma missão disponível</h2>
          <p>
            Assim que novas missões forem publicadas, elas aparecerão aqui.
          </p>
        </div>
      ) : (
        <div className="shoppingListingGrid">
          {missions.map((mission) => (
            <article key={mission.id} className="shoppingListingCard">
              <div className="shoppingListingIcon">⚡</div>

              <div>
                <small>
                  {mission.nome_empresa || "Missão publicada"}
                </small>

                <h2>{mission.titulo || "Missão disponível"}</h2>

                <p>
                  {mission.descricao ||
                    "Complete tarefas e ganhe dinheiro pelo RendaJá."}
                </p>

                <div className="shoppingListingMeta">
                  <strong>{money(mission.valor)}</strong>

                  {mission.cidade && (
                    <span>
                      📍 {mission.cidade}
                      {mission.estado ? ` • ${mission.estado}` : ""}
                    </span>
                  )}

                  {mission.tipo && <span>{mission.tipo}</span>}
                </div>

                {mission.contato_whatsapp ? (
                  <a
                    href={`https://wa.me/55${String(
                      mission.contato_whatsapp
                    ).replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Participar da missão
                  </a>
                ) : (
                  <a href="/shopping">Ver missão</a>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}