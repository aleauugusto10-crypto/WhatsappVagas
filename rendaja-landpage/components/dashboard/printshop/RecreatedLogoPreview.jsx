export default function RecreatedLogoPreview({ logo, loading, onGenerate }) {
  return (
    <div className="recreated-logo-box">
      <div>
        <strong>Logomarca recriada</strong>
        <p>
          Primeiro gere a logo em PNG. Depois ela será usada como camada real na
          arte do cartão.
        </p>
      </div>

      <button type="button" onClick={onGenerate} disabled={loading}>
        {loading ? "Recriando..." : "Recriar logomarca"}
      </button>

      {logo && (
        <div className="recreated-logo-preview">
          <img src={logo} alt="Logomarca recriada" />
        </div>
      )}
    </div>
  );
}