import { useEffect, useState } from "react";

export default function PrintPreviewBox({
  product,
  profile,
  uploadedFile,
  generatedImage,
}) {
  const [uploadedPreviewUrl, setUploadedPreviewUrl] = useState("");

  useEffect(() => {
    if (!uploadedFile || uploadedFile.type === "application/pdf") {
      setUploadedPreviewUrl("");
      return;
    }

    const url = URL.createObjectURL(uploadedFile);
    setUploadedPreviewUrl(url);

    return () => URL.revokeObjectURL(url);
  }, [uploadedFile]);

  return (
    <aside className="print-preview-panel">
      <div className="print-preview-title">
        <span>Prévia técnica</span>
        <strong>{product.sizeLabel}</strong>
      </div>

      <div
        className="print-preview-canvas"
        style={{
          aspectRatio: `${product.finalWidthPx} / ${product.finalHeightPx}`,
        }}
      >
        <div className="print-preview-bleed" />
        <div className="print-preview-cut" />
        <div className="print-preview-safe" />

        {generatedImage ? (
  <img
    src={generatedImage}
    alt="Arte gerada"
    className="print-preview-uploaded-image"
  />
) : uploadedPreviewUrl ? (
          <img
            src={uploadedPreviewUrl}
            alt="Prévia do arquivo enviado"
            className="print-preview-uploaded-image"
          />
        ) : (
          <div className="print-preview-content">
            <div className="print-preview-logo">
              {profile?.logo_url ? (
                <img src={profile.logo_url} alt="Logo do perfil" />
              ) : (
                <span>{profile?.nome?.charAt(0) || "C"}</span>
              )}
            </div>

            <strong>{profile?.nome || "Nome do negócio"}</strong>
            <p>{profile?.servico || "Produto ou serviço principal"}</p>
          </div>
        )}
      </div>

      <div className="print-technical-list">
        <div>
          <span>Arquivo final</span>
          <strong>
            {product.finalWidthPx} × {product.finalHeightPx}px
          </strong>
        </div>

        <div>
          <span>DPI</span>
          <strong>{product.dpi}</strong>
        </div>

        <div>
          <span>Sangria</span>
          <strong>{product.bleedMm}mm</strong>
        </div>

        <div>
          <span>Área segura</span>
          <strong>{product.safeAreaMm}mm</strong>
        </div>
      </div>

      {uploadedFile?.type === "application/pdf" && (
        <p className="print-preview-note">
          PDF selecionado: {uploadedFile.name}. A prévia visual será validada na próxima etapa.
        </p>
      )}

      <p className="print-preview-note">
        A linha externa representa a sangria, a linha central o corte e a linha
        interna a área segura.
      </p>
    </aside>
  );
}