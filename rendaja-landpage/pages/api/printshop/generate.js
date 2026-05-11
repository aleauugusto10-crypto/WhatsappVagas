import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  try {
    const { product, profile, brief } = req.body;

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        error: "OPENAI_API_KEY não configurada no .env.local",
      });
    }

    const prompt = `
Crie uma arte gráfica profissional para ${product?.name || "material gráfico"}.

Empresa: ${profile?.nome || "Empresa local"}
Área: ${profile?.servico || "Comércio local"}
Cidade: ${profile?.cidade || ""}
Briefing: ${brief || "Arte moderna, limpa, comercial e vendável."}

A arte deve parecer premium, brasileira, elegante, com boa hierarquia visual,
bom espaço negativo, cores comerciais e pronta para divulgação.
`;

    const response = await openai.images.generate({
      model: "gpt-image-1",
      prompt,
      size: "1536x1024",
    });

    const item = response.data?.[0];

    if (!item) {
      return res.status(500).json({
        error: "A OpenAI respondeu, mas não retornou imagem.",
      });
    }

    const image =
      item.url ||
      (item.b64_json ? `data:image/png;base64,${item.b64_json}` : null);

    if (!image) {
      console.log("Resposta OpenAI sem imagem:", item);

      return res.status(500).json({
        error: "Imagem gerada, mas veio em formato inesperado.",
      });
    }

    return res.status(200).json({ image });
  } catch (err) {
    console.error("Erro ao gerar imagem:", err);

    return res.status(500).json({
      error: err?.message || "Erro ao gerar imagem",
    });
  }
}