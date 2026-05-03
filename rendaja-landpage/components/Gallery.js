import { useState } from "react";

export default function Gallery({ images = [] }) {
  const [active, setActive] = useState(null);

  const safeImages = Array.isArray(images)
    ? images
        .map((img, i) => {
          if (typeof img === "string") {
            return {
              id: `img-${i}`,
              url: img,
              title: `Imagem ${i + 1}`,
            };
          }

          return {
            id: img?.id || `img-${i}`,
            url: img?.url || img?.publicUrl || "",
            title: img?.title || `Imagem ${i + 1}`,
          };
        })
        .filter((img) => img.url && img.url.startsWith("http"))
    : [];

  if (!safeImages.length) {
    return (
      <div className="gallery-empty">
        <span>Nenhuma imagem adicionada ainda</span>
      </div>
    );
  }

  return (
    <>
      <div className="gallery-grid">
        {safeImages.map((img) => (
          <div
            key={img.id}
            className="gallery-item"
            onClick={() => setActive(img.url)}
          >
            <img src={img.url} alt={img.title} />

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