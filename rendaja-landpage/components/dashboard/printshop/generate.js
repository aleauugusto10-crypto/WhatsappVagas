import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Método não permitido",
    });
  }

  try {
    const {
      product,
      profile,
      brief,
      referenceImage,
    } = req.body;

    const prompt = `
Crie uma arte gráfica profissional para:

Produto:
${product.name}

Empresa:
${profile.nome}

Área:
${profile.servico}

Descrição:
${brief}

Estilo:
moderno, profissional, elegante, visual premium,
tipografia forte, identidade visual coerente,
marketing profissional brasileiro,
alta qualidade para impressão.
`;

    const image = await openai.images.generate({
      model: "gpt-image-1",
      prompt,
      size: "1536x1024",
    });

    return res.status(200).json({
      image: image.data?.[0]?.url,
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      error: "Erro ao gerar arte",
    });
  }
}