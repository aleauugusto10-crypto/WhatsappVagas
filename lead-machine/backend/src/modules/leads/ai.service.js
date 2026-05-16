import OpenAI from "openai";
import { SYSTEM_PROMPT, STAGE_PROMPTS } from "./prompts.js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MODEL = "gpt-4.1-mini";

function getMessageContent(completion) {
  return completion?.choices?.[0]?.message?.content || "";
}

function normalizeMessages(messages = []) {
  return messages
    .filter((msg) => msg?.role && (msg?.message || msg?.content))
    .map((msg) => ({
      role: msg.role,
      content: String(msg.message || msg.content || ""),
    }));
}

export async function generateAIResponse(messages = []) {
  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content: SYSTEM_PROMPT,
      },
      ...normalizeMessages(messages),
    ],
    temperature: 0.7,
  });

  return getMessageContent(completion);
}

export async function generateFirstContact(lead = {}) {
  const prompt = `
Dados do lead:
Empresa: ${lead.empresa || "empresa local"}
Categoria: ${lead.categoria || "comércio local"}
Cidade: ${lead.cidade || "cidade local"}

Crie uma primeira mensagem fria para WhatsApp.

OBJETIVO DA PRIMEIRA MENSAGEM:
- abrir conversa
- gerar curiosidade
- parecer humano
- pedir permissão para explicar melhor a ideia
- NÃO vender cedo
- NÃO mandar exemplo ainda
- NÃO oferecer link ainda
- NÃO falar em criar prévia ainda
- NÃO falar em catálogo logo de cara
- NÃO falar em pagamento
- NÃO parecer robô

A mensagem deve:
- ser curta
- ser educada
- explicar o motivo do contato
- falar de presença no Google ou visibilidade local de forma leve
- pedir permissão para explicar melhor a ideia
- não parecer venda direta
- não fazer perguntas invasivas
- não perguntar como a empresa atrai clientes

Exemplo de direção:
"Oi! Aqui é da CompreTudo.Shop. Vi a [empresa] em [cidade] e tive uma ideia simples para ajudar mais pessoas da região encontrarem vocês online. Posso te explicar rapidinho?"

Retorne apenas a mensagem final.
`;

  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content: SYSTEM_PROMPT,
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.75,
  });

  return getMessageContent(completion);
}

export async function generateConversationReply({
  messages = [],
  stage = "intro",
  lead = {},
}) {
  const formattedMessages = normalizeMessages(messages);
  const stagePrompt = STAGE_PROMPTS[stage] || STAGE_PROMPTS.intro || "";

  const exampleUrl =
  process.env.DEFAULT_EXAMPLE_URL ||
  lead.example_url ||
  lead.exampleUrl ||
  "";
  const previewUrl = lead.preview_url || lead.previewUrl || "";

  const systemContext = `
${SYSTEM_PROMPT}

ETAPA ATUAL:
${stagePrompt}

DADOS DO LEAD:
Empresa: ${lead.empresa || lead.nome || ""}
Categoria: ${lead.categoria || ""}
Cidade: ${lead.cidade || ""}
Estado: ${lead.estado || ""}

EXEMPLO DISPONÍVEL:
${exampleUrl || "nenhum"}

PREVIEW DISPONÍVEL:
${previewUrl || "nenhum"}

REGRAS DE CONVERSA:
- Venda com leveza.
- Não empurre link cedo demais.
- Primeiro gere entendimento e valor.
- Se o cliente perguntou "como funciona", explique de forma simples e desperte interesse.
- Se o cliente respondeu apenas "sim" depois da primeira abordagem, explique a ideia antes de mandar exemplo.
- Só entre no exemplo quando o cliente pedir para ver, pedir modelo, pedir link, disser "quero ver", "manda", "pode mandar" ou demonstrar claramente que quer visualizar.
- Nunca diga "já te envio", "já está encaminhado", "vou preparar hoje" ou algo parecido sem ação real.
- Nunca diga que criou prévia se PREVIEW DISPONÍVEL estiver como "nenhum".
- Nunca invente links.
- Mantenha respostas curtas, humanas e naturais para WhatsApp.
- Quando o cliente responder "sim", "pode sim", "pode explicar" ou algo parecido, isso significa permissão para explicar a ideia, NÃO permissão para criar prévia.
- Na etapa "interest", explique a ideia de forma simples e depois pergunte se pode mostrar um exemplo.
- Na etapa "interest", é proibido dizer que vai criar prévia.
- Só fale em criar prévia quando a etapa for "example" ou quando o cliente pedir claramente para ver como ficaria.

REGRAS IMPORTANTES PARA LINKS:
- Se PREVIEW DISPONÍVEL tiver uma URL real, priorize a prévia personalizada.
- Se EXEMPLO DISPONÍVEL tiver uma URL real e o cliente pedir exemplo/modelo/link, envie o link.
- Se não existir link real, não diga que enviou.
- Se não existir preview, ofereça criar a prévia, mas sem fingir que já criou.

`;

  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content: systemContext,
      },
      ...formattedMessages,
    ],
    temperature: 0.65,
  });

  return getMessageContent(completion);
}

export async function classifyLeadIntent(message = "") {
  const text = String(message || "").toLowerCase().trim();
  if (
  text.includes("minha empresa") ||
  text.includes("como ficaria") ||
  text.includes("faz a minha") ||
  text.includes("fazer a minha") ||
  text.includes("prévia da minha") ||
  text.includes("previa da minha") ||
  text.includes("minha vitrine") ||
  text.includes("vitrine da minha")
) {
  return {
    intent: "wants_preview",
    nextStage: "example",
    temperature: 4,
  };
}

  if (
    text.includes("exemplo") ||
    text.includes("me mostra") ||
    text.includes("mostrar") ||
    text.includes("modelo") ||
    text.includes("link") ||
    text.includes("amostra") ||
    text.includes("prévia") ||
    text.includes("previa") ||
    text.includes("quero ver") ||
    text.includes("manda") ||
    text.includes("envia") ||
    text.includes("pode mandar")
  ) {
    return {
      intent: "wants_example",
      nextStage: "example",
      temperature: 3,
    };
  }

  if (
    text === "sim" ||
    text.includes("pode sim") ||
    text.includes("pode explicar") ||
    text.includes("explique") ||
    text.includes("me explica") ||
    text.includes("fala mais")
  ) {
    return {
      intent: "permission_to_explain",
      nextStage: "interest",
      temperature: 2,
    };
  }

  if (
    text.includes("como funciona") ||
    text.includes("saber mais") ||
    text.includes("explica") ||
    text.includes("entendi")
  ) {
    return {
      intent: "interest",
      nextStage: "value",
      temperature: 2,
    };
  }

  if (
    text.includes("valor") ||
    text.includes("preço") ||
    text.includes("preco") ||
    text.includes("quanto") ||
    text.includes("custa") ||
    text.includes("plano")
  ) {
    return {
      intent: "price",
      nextStage: "closing",
      temperature: 3,
    };
  }

  if (
    text.includes("caro") ||
    text.includes("depois") ||
    text.includes("não tenho interesse") ||
    text.includes("nao tenho interesse") ||
    text.includes("sem interesse") ||
    text.includes("agora não") ||
    text.includes("agora nao")
  ) {
    return {
      intent: "objection",
      nextStage: "objection",
      temperature: 0,
    };
  }

  if (
    text.includes("quero") ||
    text.includes("vamos") ||
    text.includes("pode fazer") ||
    text.includes("fechar") ||
    text.includes("começar") ||
    text.includes("comecar")
  ) {
    return {
      intent: "ready_to_close",
      nextStage: "closing",
      temperature: 4,
    };
  }

  return {
    intent: "unknown",
    nextStage: "interest",
    temperature: 1,
  };
}