export const LOGO_MODES = [
  {
    id: "preserve",
    title: "Preservar original",
    text: "Usa a imagem enviada como base, ideal para manter a marca atual.",
  },
  {
    id: "improve",
    title: "Melhorar fielmente",
    text: "Recria a logo mais limpa, mantendo cores, nome e estilo.",
  },
  {
    id: "new_inspired",
    title: "Criar nova inspirada",
    text: "Cria uma nova logo baseada na imagem, cores e identidade visual.",
  },
];

export default function LogoModeSelector({ value, onChange }) {
  return (
    <div className="print-field">
      <label>Modo da logomarca</label>

      <div className="print-logo-mode-grid">
        {LOGO_MODES.map((mode) => (
          <button
            key={mode.id}
            type="button"
            className={value === mode.id ? "active" : ""}
            onClick={() => onChange(mode.id)}
          >
            <strong>{mode.title}</strong>
            <span>{mode.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}