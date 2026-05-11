 

export default function PrintUploadBox({ mode, uploadedFile, onFileChange }) {
  function handleChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    onFileChange(file);
  }

  return (
    <div className="print-upload-box">
      {mode === "ai" ? (
        <>
          <strong>Envie uma referência visual</strong>
          <p>
            Pode ser logomarca, cartão antigo, fachada, produto ou qualquer
            imagem que ajude a IA a entender a identidade visual.
          </p>
        </>
      ) : (
        <>
          <strong>Envie sua arte pronta</strong>
          <p>
            Envie o arquivo que você já possui. Depois vamos validar tamanho,
            resolução, sangria e qualidade.
          </p>
        </>
      )}

      <label className="print-upload-label">
        <input
          type="file"
          accept="image/*,.pdf"
          onChange={handleChange}
        />
        <span>{uploadedFile ? "Trocar arquivo" : "Escolher arquivo"}</span>
      </label>

      {uploadedFile && (
        <div className="print-upload-file">
          <span>Arquivo selecionado:</span>
          <strong>{uploadedFile.name}</strong>
        </div>
      )}
    </div>
  );
}