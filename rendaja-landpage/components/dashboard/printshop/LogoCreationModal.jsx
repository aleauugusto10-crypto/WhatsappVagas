import { useState } from "react";
import LogoModeSelector from "./LogoModeSelector";
import PrintUploadBox from "./PrintUploadBox";
import { formatMoneyBR } from "./printProducts";

export default function LogoCreationModal({ product, profile, onClose }) {
  const [logoName, setLogoName] = useState(profile?.nome || "");
  const [brief, setBrief] = useState("");
  const [uploadedFile, setUploadedFile] = useState(null);
  const [logoMode, setLogoMode] = useState("improve");
  const [loading, setLoading] = useState(false);
  const [generatedLogo, setGeneratedLogo] = useState("");

  const needsReference = logoMode === "improve" || logoMode === "new_inspired";

  async function handleGenerateLogo() {
    if (!logoName.trim()) {
      alert("Informe o nome da logomarca.");
      return;
    }

    if (needsReference && !uploadedFile) {
      alert("Envie uma imagem de referência primeiro.");
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();

      if (uploadedFile) {
        formData.append("file", uploadedFile);
      }

      formData.append("mode", logoMode);
      formData.append("profileName", logoName);
      formData.append("profileService", profile?.servico || "");
      formData.append("brief", brief || "");
      formData.append("primaryColor", profile?.primary_color || "");
      formData.append("secondaryColor", profile?.secondary_color || "");

      const response = await fetch("/api/printshop/recreate-logo", {
        method: "POST",
        body: formData,
      });

      const json = await response.json();

      if (!response.ok) {
        alert(json.error || "Erro ao gerar logomarca.");
        return;
      }

      setGeneratedLogo(json.logo);
    } catch (err) {
      console.error(err);
      alert("Erro ao gerar logomarca.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="print-modal-backdrop">
      <div className="print-modal logo-creation-modal">
        <div className="print-modal-header">
          <div>
            <span className="printshop-kicker">Produto gráfico</span>
            <h2>{product.name}</h2>
            <p>{product.subtitle}</p>
          </div>

          <button type="button" className="print-modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="print-modal-body logo-creation-body">
          <div className="print-modal-form">
            <div className="print-field">
              <label>Nome da logomarca</label>
              <input
                value={logoName}
                onChange={(e) => setLogoName(e.target.value)}
                placeholder="Ex: CompreTudo, Bella Modas, Oficina Silva..."
              />
            </div>

            <LogoModeSelector value={logoMode} onChange={setLogoMode} />

            {needsReference && (
              <PrintUploadBox
                mode="ai"
                uploadedFile={uploadedFile}
                onFileChange={setUploadedFile}
              />
            )}

            <div className="print-field">
              <label>Observações</label>
              <textarea
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                placeholder="Ex: quero algo elegante, laranja e preto, com ícone de bolsa, estilo moderno..."
                rows={4}
              />
            </div>
          </div>

          <aside className="logo-result-panel">
            <div>
              <span className="card-label">Resultado</span>
              <h3>Logomarca em PNG</h3>
              <p>
                A logo gerada ficará salva na galeria para baixar e usar em
                cartões, panfletos e posts.
              </p>
            </div>

            <div className="logo-result-preview">
              {generatedLogo ? (
                <img src={generatedLogo} alt="Logomarca gerada" />
              ) : (
                <div>
                  <strong>Prévia da logo</strong>
                  <span>Gere uma logomarca para visualizar aqui.</span>
                </div>
              )}
            </div>

            {generatedLogo && (
              <a
                className="logo-download-button"
                href={generatedLogo}
                download={`${logoName || "logomarca"}.png`}
              >
                Baixar PNG
              </a>
            )}
          </aside>
        </div>

        <div className="print-modal-footer">
          <div>
            <span>Estimativa</span>
            <strong>{formatMoneyBR(product.priceFrom)}</strong>
          </div>

          <button type="button" onClick={handleGenerateLogo} disabled={loading}>
            {loading ? "Gerando logomarca..." : "Gerar logomarca"}
          </button>
        </div>
      </div>
    </div>
  );
}