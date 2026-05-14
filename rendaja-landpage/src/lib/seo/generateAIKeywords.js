const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    const match = String(text || "").match(/\{[\s\S]*\}/);
    if (!match) return null;

    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

function cleanKeyword(value = "") {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/^[-–—•\d.\s]+/, "");
}

function unique(values = []) {
  return [...new Set(values.map(cleanKeyword).filter(Boolean))];
}

export async function generateAIKeywords(profile = {}) {
  if (!OPENAI_API_KEY) {
    return [];
  }

  const storeItems = Array.isArray(profile.store_items)
    ? profile.store_items.slice(0, 30).map((item) => ({
        title: item.title || item.name || "",
        description: item.description || "",
        category: item.category || item.category_id || "",
        price_type: item.price_type || "",
      }))
    : [];

  const prompt = `
Você é especialista em SEO local para pequenos negócios brasileiros.

Gere palavras-chave reais de busca no Google para esta vitrine.

Dados:
${JSON.stringify(
  {
    nome: profile.nome,
    servico: profile.servico,
    descricao: profile.descricao,
    cidade: profile.cidade,
    estado: profile.estado,
    seo_keywords: profile.seo_keywords,
    seo_tags: profile.seo_tags,
    produtos: storeItems,
  },
  null,
  2
)}

Regras:
- Responda somente JSON válido.
- Gere entre 40 e 80 keywords.
- Use português do Brasil.
- Foque em buscas locais e comerciais.
- Inclua variações com cidade e estado.
- Inclua termos que pessoas realmente digitariam.
- Inclua variações como "onde comprar", "perto de mim", "melhor", "barato", "profissional", quando fizer sentido.
- Não use hashtags.
- Não use emojis.
- Não invente cidade diferente.
- Não crie termos ofensivos, ilegais ou enganosos.
- Não repita keywords quase iguais demais.

Formato obrigatório:
{
  "keywords": []
}
`;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        temperature: 0.45,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "Você gera keywords SEO locais para negócios brasileiros. Responda apenas JSON válido.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Erro OpenAI generateAIKeywords:", data);
      return [];
    }

    const content = data?.choices?.[0]?.message?.content;
    const parsed = safeJsonParse(content);

    if (!parsed || !Array.isArray(parsed.keywords)) {
      return [];
    }

    return unique(parsed.keywords).slice(0, 80);
  } catch (err) {
    console.error("Erro geral generateAIKeywords:", err);
    return [];
  }
}