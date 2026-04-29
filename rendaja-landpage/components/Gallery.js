import { useState } from "react";

export default function Gallery({ images = [] }) {
  const [active, setActive] = useState(null);

  if (!images.length) {
    return (
      <div className="gallery-empty">
        <span>Nenhuma imagem adicionada ainda</span>
      </div>
    );
  }

  return (
    <>
      <div className="gallery-grid">
        {images.map((img, i) => (
          <div
            key={i}
            className="gallery-item"
            onClick={() => setActive(img)}
          >
            <img src={img} alt={`Imagem ${i}`} />

            <div className="gallery-overlay">
              <span>Ver imagem</span>
            </div>
          </div>
        ))}
      </div>

      {active && (
        <div className="gallery-lightbox" onClick={() => setActive(null)}>
          <img src={active} />
        </div>
      )}
    </>
  );
}