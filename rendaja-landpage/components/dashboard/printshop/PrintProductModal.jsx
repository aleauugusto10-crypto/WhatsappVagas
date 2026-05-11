import { useMemo, useState } from "react";
import PrintUploadBox from "./PrintUploadBox";
import PrintPreviewBox from "./PrintPreviewBox";
import { formatMoneyBR } from "./printProducts";
 import LogoModeSelector from "./LogoModeSelector";
import RecreatedLogoPreview from "./RecreatedLogoPreview";

export default function PrintProductModal({ product, profile, onClose }) {
  const [quantity, setQuantity] = useState(100);
  const [mode, setMode] = useState("ai");
  const [brief, setBrief] = useState("");
  const [logoMode, setLogoMode] = useState("improve");
const [recreatedLogo, setRecreatedLogo] = useState("");
const [recreatingLogo, setRecreatingLogo] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
const [generating, setGenerating] = useState(false);
const [generatedImage, setGeneratedImage] = useState("");
  const estimatedPrice = useMemo(() => {
    const base = Number(product.priceFrom || 0);
    if (quantity <= 100) return base;
    if (quantity <= 250) return base * 1.6;
    if (quantity <= 500) return base * 2.3;
    return base * 3.5;
  }, [product.priceFrom, quantity]);


async function handleRecreateLogo() {
  if (!uploadedFile) {
    alert("Envie uma imagem de referência primeiro.");
    return;
  }

  try {
    setRecreatingLogo(true);

    const formData = new FormData();
    formData.append("file", uploadedFile);
    formData.append("mode", logoMode);
    formData.append("profileName", profile?.nome || "");
    formData.append("profileService", profile?.servico || "");

    const response = await fetch("/api/printshop/recreate-logo", {
      method: "POST",
      body: formData,
    });

    const json = await response.json();

    if (!response.ok) {
      alert(json.error || "Erro ao recriar logomarca.");
      return;
    }

    setRecreatedLogo(json.logo);
  } catch (err) {
    console.error(err);
    alert("Erro ao recriar logomarca.");
  } finally {
    setRecreatingLogo(false);
  }
}


async function handleSubmit() {
  try {
    setGenerating(true);

    const response = await fetch("/api/printshop/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        product,
        profile,
        brief,
      }),
    });

    const json = await response.json();

    if (!response.ok) {
      alert(json.error || "Erro ao gerar arte");
      return;
    }

    setGeneratedImage(json.image);
  } catch (err) {
    console.error(err);
    alert("Erro ao gerar arte");
  } finally {
    setGenerating(false);
  }
}
  return (
    <div className="print-modal-backdrop">
      <div className="print-modal">
        <div className="print-modal-header">
          <div>
            <span className="printshop-kicker">Novo pedido</span>
            <h2>{product.name}</h2>
            <p>{product.subtitle}</p>
          </div>

          <button type="button" className="print-modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="print-modal-body">
          <div className="print-modal-form">
            <div className="print-field">
              <label>Quantidade</label>
              <select
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
              >
                <option value={50}>50 unidades</option>
                <option value={100}>100 unidades</option>
                <option value={250}>250 unidades</option>
                <option value={500}>500 unidades</option>
                <option value={1000}>1000 unidades</option>
              </select>
            </div>

            <div className="print-field">
              <label>Como deseja criar?</label>
              <div className="print-mode-grid">
                <button
                  type="button"
                  className={mode === "ai" ? "active" : ""}
                  onClick={() => setMode("ai")}
                >
                  Criar com IA
                  <span>Usar dados do perfil e identidade visual</span>
                </button>

                <button
                  type="button"
                  className={mode === "upload" ? "active" : ""}
                  onClick={() => setMode("upload")}
                >
                  Enviar arte pronta
                  <span>Você já tem o arquivo final</span>
                </button>
              </div>
            </div>

            <PrintUploadBox
              mode={mode}
              uploadedFile={uploadedFile}
              onFileChange={setUploadedFile}
            />
<LogoModeSelector value={logoMode} onChange={setLogoMode} />

<RecreatedLogoPreview
  logo={recreatedLogo}
  loading={recreatingLogo}
  onGenerate={handleRecreateLogo}
/>
            <div className="print-field">
              <label>Observações para a arte</label>
              <textarea
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                placeholder="Ex: quero algo elegante, com destaque para WhatsApp, Instagram e endereço..."
                rows={4}
              />
            </div>
          </div>

          <PrintPreviewBox
  product={product}
  profile={profile}
  uploadedFile={uploadedFile}
  generatedImage={generatedImage}
/>
        </div>

        <div className="print-modal-footer">
          <div>
            <span>Estimativa</span>
            <strong>{formatMoneyBR(estimatedPrice)}</strong>
          </div>

          <button type="button" onClick={handleSubmit}>
            {generating ? "Gerando arte..." : "Gerar arte com IA"}
          </button>
        </div>
      </div>
    </div>
  );
}