export default function Reviews({ reviews = [] }) {
  if (!reviews.length) {
    return (
      <section className="reviews-section">
        <span className="eyebrow">Avaliações</span>
        <h2>O que estão dizendo</h2>

        <div className="reviews-empty">
          <p>Este profissional ainda não possui avaliações.</p>
          <span>Seja o primeiro a deixar um comentário.</span>
        </div>
      </section>
    );
  }

  return (
    <section className="reviews-section">
      <span className="eyebrow">Avaliações</span>
      <h2>O que clientes dizem</h2>

      <div className="reviews-grid">
        {reviews.map((r, i) => (
          <div key={i} className="review-card">
            <div className="review-top">
              <div className="avatar">
                {r.nome?.charAt(0).toUpperCase() || "U"}
              </div>

              <div>
                <strong>{r.nome || "Usuário"}</strong>
                <div className="stars">
                  {"⭐".repeat(r.estrelas || 5)}
                </div>
              </div>
            </div>

            <p className="review-text">
              {r.comentario || "Ótimo atendimento!"}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}