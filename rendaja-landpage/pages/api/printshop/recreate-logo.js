import fs from "fs";
import formidable from "formidable";
import OpenAI from "openai";

export const config = {
  api: {
    bodyParser: false,
  },
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function parseForm(req) {
  return new Promise((resolve, reject) => {
    const form = formidable({
      multiples: false,
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024,
    });

    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
}

function fieldValue(value) {
  return Array.isArray(value) ? value[0] : value || "";
}

function getModePrompt(mode, profileName, profileService) {
  if (mode === "preserve") {
    return `
Extraia e reconstrua APENAS a logomarca principal da imagem enviada.

Preserve ao máximo a marca original.
Não crie marca nova.
Não altere o nome.
Não invente símbolo.
Se for cartão/fachada, isole apenas a logo.
Resultado: apenas a logomarca em fundo transparente.
`;
  }

  if (mode === "new_inspired") {
    return `
Crie uma NOVA logomarca inspirada na imagem enviada.

Empresa: ${profileName || "empresa local"}
Área: ${profileService || "negócio local"}

Use a imagem como referência de cores, estilo, ramo e personalidade.
Resultado: apenas a logomarca em fundo transparente.
Sem cartão, sem mockup, sem cenário.
`;
  }

  return `
Recrie a logomarca da imagem enviada com máxima fidelidade.

Empresa: ${profileName || "empresa local"}
Área: ${profileService || "negócio local"}

Mantenha nome, símbolo, cores, proporções e estilo visual.
Melhore a qualidade, mas sem transformar em outra marca.
Se a imagem for cartão/fachada, isole apenas a logomarca.
Resultado: apenas a logomarca em fundo transparente.
Sem cartão, sem mockup, sem cenário.
`;
}

function extractImageFromResponse(response) {
  const outputs = response.output || [];

  for (const output of outputs) {
    const content = output.content || [];

    for (const item of content) {
      if (item.type === "output_image" && item.image_base64) {
        return `data:image/png;base64,${item.image_base64}`;
      }

      if (item.type === "image_generation_call" && item.result) {
        return `data:image/png;base64,${item.result}`;
      }
    }

    if (output.type === "image_generation_call" && output.result) {
      return `data:image/png;base64,${output.result}`;
    }
  }

  return null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido." });
  }

  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        error: "OPENAI_API_KEY não configurada.",
      });
    }

    const { fields, files } = await parseForm(req);

    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    const mode = fieldValue(fields.mode) || "improve";
    const profileName = fieldValue(fields.profileName);
    const profileService = fieldValue(fields.profileService);

    if (!file?.filepath) {
      return res.status(400).json({
        error: "Nenhuma imagem foi enviada.",
      });
    }

    const mimeType = file.mimetype || "image/png";
    const imageBase64 = fs.readFileSync(file.filepath, "base64");
    const prompt = getModePrompt(mode, profileName, profileService);

    const response = await openai.responses.create({
      model: "gpt-4.1",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: prompt,
            },
            {
              type: "input_image",
              image_url: `data:${mimeType};base64,${imageBase64}`,
            },
          ],
        },
      ],
      tools: [
        {
          type: "image_generation",
          size: "1024x1024",
        },
      ],
    });

    const logo = extractImageFromResponse(response);

    if (!logo) {
      console.log("Resposta sem imagem:", JSON.stringify(response, null, 2));

      return res.status(500).json({
        error: "A IA respondeu, mas não retornou imagem.",
      });
    }

    return res.status(200).json({
      logo,
      mode,
    });
  } catch (err) {
    console.error("Erro ao recriar logo:", err);

    return res.status(500).json({
      error: err?.message || "Erro ao recriar logomarca.",
    });
  }
}