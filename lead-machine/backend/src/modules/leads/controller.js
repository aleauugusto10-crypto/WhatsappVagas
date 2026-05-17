import * as service from "./service.js";
import {
  generateFirstContact,
  generateConversationReply,
  classifyLeadIntent,
} from "./ai.service.js";
import {
  getOrCreateAIState,
  updateAIState,
} from "./state.service.js";
import { supabase } from "../../supabase.js";
import { createOrUpdateProfilePage } from "../../lib/pageGenerator.js";
import {
  createProfilePageSubscriptionPayment,
} from "../../services/payments.js";
import { sendWhatsAppTemplate } from "../whatsapp/service.js";
import { sendLeadTemplate } from "../../services/whatsappLeads.js";
const DEFAULT_EXAMPLE_URL =
  process.env.DEFAULT_EXAMPLE_URL ||
  "https://compretudo.shop/p/sb-make-up-itabaiana-se";

function isSimpleYes(message = "") {
  const text = String(message || "").toLowerCase().trim();

  return (
    text === "sim" ||
    text === "pode sim" ||
    text === "claro" ||
    text === "ok" ||
    text === "beleza" ||
    text === "pode" ||
    text.includes("pode sim")
  );
}

function buildInterestReply(lead = {}) {
  return `Perfeito. A ideia é colocar a ${
    lead.empresa || "empresa"
  } em uma vitrine profissional da cidade, com informações organizadas, presença no Google e botão direto para o WhatsApp.

Assim, quando alguém procurar por ${
    lead.categoria || "serviços"
  } em ${lead.cidade || "sua região"}, fica mais fácil encontrar vocês e chamar para orçamento.

Posso te mostrar um exemplo de como essa vitrine fica?`;
}

function buildExampleReply() {
  return `Claro. Esse é um exemplo real de vitrine no CompreTudo.Shop:

${DEFAULT_EXAMPLE_URL}

Ela mostra como a empresa pode aparecer com visual profissional, informações organizadas, botão de WhatsApp, catálogo e presença online.

Quer que eu monte uma prévia gratuita de como ficaria a vitrine da sua empresa?`;
}
function extractLocation(message = "") {
  const cityMatch =
    message.match(/minha cidade:\s*(.+)/i);

  const stateMatch =
    message.match(/estado:\s*(.+)/i);

  return {
    cidade: cityMatch?.[1]?.trim() || null,
    estado: stateMatch?.[1]?.trim() || null,
  };
}
export async function startProspection(req, res) {
  try {
    const leadId = req.params.leadId;

    const lead = await service.getLeadById(leadId);if (lead.status === "contacted") {
  return res.status(400).json({
    error: "Lead já foi prospectado.",
    lead,
  });
}

    const conversation = await service.getOrCreateConversation(leadId);

await getOrCreateAIState(conversation.id);

await updateAIState(conversation.id, {
  stage: "greeting",
  last_intent: "initial_greeting",
  lead_temperature: 1,
});
const empresa =
  lead?.empresa || "empresa";

const hour = new Date().getHours();

const greetingOptions =
  hour < 12
    ? [
           `Oi, boa noite! Tudo bem? É da ${empresa}, certo?`,
        `Oi, é da ${empresa}? Bom dia 😄`,
        `Olá! Tudo bem? É da ${empresa}, certo?`,
        `Opa, bom dia 😄 É da ${empresa}, certo?`,
      ]
    : hour < 18
      ? [
           `Oi, boa noite! Tudo bem? É da ${empresa}, certo?`,
          `Oi, é da ${empresa}? Boa tarde 😄`,
          `Olá! Tudo bem? É da ${empresa}, certo?`,
          `Opa, boa tarde 😄 É da ${empresa}, certo?`,
        ]
      : [
          `Oi, boa noite! Tudo bem? É da ${empresa}, certo?`,
          `Oi, é da ${empresa}? Boa noite 😄`,
          `Olá! Tudo bem? É da ${empresa}, certo?`,
          `Opa, boa noite 😄 É da ${empresa}, certo?`,
        ];

const aiMessage =
  greetingOptions[
    Math.floor(
      Math.random() * greetingOptions.length
    )
  ];

    const savedMessage = await service.createMessage({
      conversation_id: conversation.id,
      role: "assistant",
      message: aiMessage,
      metadata: {
        type: "first_contact",
        generated_by: "ai",
      },
    });
    const phone = lead.whatsapp || lead.telefone;

if (phone) {
  await sendWhatsAppTemplate({
    to: phone,
    businessName: lead.empresa,
  });
}
await service.updateLead(lead.id, {
  status: "contacted",
  prospection_started_at: new Date().toISOString(),
  last_message: aiMessage,
});
    res.json({
      lead,
      conversation,
      message: savedMessage,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: err.message,
    });
  }
}

export async function create(req, res) {
  try {
    const data = await service.createLead(req.body);

    res.json(data);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: err.message,
    });
  }
}

export async function list(req, res) {
  try {
    const data = await service.getLeads();

    res.json(data);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: err.message,
    });
  }
}

export async function createConversation(req, res) {
  try {
    const leadId = req.params.leadId;

    const conversation = await service.getOrCreateConversation(leadId);

    await getOrCreateAIState(conversation.id);

    res.json(conversation);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: err.message,
    });
  }
}

export async function createMessage(req, res) {
  try {
    const data = await service.createMessage({
      conversation_id: req.params.conversationId,
      role: req.body.role,
      message: req.body.message,
      metadata: req.body.metadata || {},
    });

    res.json(data);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: err.message,
    });
  }
}

export async function getMessages(req, res) {
  try {
    const data = await service.getMessages(req.params.conversationId);

    res.json(data);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: err.message,
    });
  }
}
function wantsPreview(message = "") {
  const text = String(message || "")
    .toLowerCase()
    .trim();
return (
  text.includes("como ficaria") ||
  text.includes("quero ver") ||
  text.includes("minha empresa") ||
  text.includes("prévia") ||
  text.includes("preview") ||
  text.includes("me mostra") ||
  text.includes("faz um exemplo") ||
  text.includes("pode fazer") ||
  text.includes("fazer a minha")
);
}
export async function assumeConversation(req, res) {
  try {
    const leadId = req.params.leadId;

    const updated = await service.updateLead(leadId, {
      conversation_mode: "human",
      assigned_human_at: new Date().toISOString(),
    });

    return res.json(updated);
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      error: err.message,
    });
  }
}
export async function generateLeadPayment(req, res) {
  try {
    const leadId = req.params.leadId;
    const { conversationId, planCode = "store_start" } = req.body;

    const lead = await service.getLeadById(leadId);

    if (!lead) {
      return res.status(404).json({ error: "Lead não encontrado." });
    }

    if (!conversationId) {
      return res.status(400).json({ error: "conversationId obrigatório." });
    }

    const selectedPlan =
      planCode === "complete_pro" ? "complete_pro" : "store_start";

    const planLabel =
      selectedPlan === "complete_pro"
        ? "Gestão Completa"
        : "Vitrine Inteligente";

    const planValue =
      selectedPlan === "complete_pro" ? "R$ 49,90/mês" : "R$ 19,90/mês";

    const phone = lead.whatsapp || lead.telefone || "";

    const { data: usuario, error: usuarioError } = await supabase
      .from("usuarios")
      .upsert(
        {
          telefone: phone,
          nome: lead.empresa,
          tipo: "empresa",
          cidade: lead.cidade || null,
          estado: lead.estado || "SE",
          categoria_principal: lead.categoria || null,
          area_principal: lead.categoria || null,
          etapa: "lead_pagamento",
        },
        { onConflict: "telefone" }
      )
      .select()
      .single();

    if (usuarioError || !usuario) {
      console.error("Erro ao criar/buscar usuário:", usuarioError);
      return res.status(500).json({
        error: "Não foi possível preparar usuário para pagamento.",
      });
    }
let profile = null;

if (lead.preview_url) {
  const slug = String(lead.preview_url)
    .split("/p/")[1]
    ?.split("?")[0];

  console.log("🟡 BUSCANDO PROFILE PELO SLUG:", slug);

  if (slug) {
    const bySlug = await supabase
      .from("profiles_pages")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();

    profile = bySlug.data || null;
  }
}

if (!profile) {
  console.log("🟡 NÃO ACHOU PROFILE. GERANDO NOVA PRÉVIA");

  const previewPage =
    await createOrUpdateProfilePage({
      supabase,
      user: {
        id: lead.id,

        nome: lead.empresa,
        nome_empresa: lead.empresa,
        businessName: lead.empresa,

        telefone:
          lead.whatsapp || lead.telefone,

        whatsapp:
          lead.whatsapp || lead.telefone,

        cidade: lead.cidade,
        estado: lead.estado || "SE",

        ramo_empresa: lead.categoria,
        categoria_principal:
          lead.categoria,

        area_principal:
          lead.categoria,

        servico_principal:
          lead.categoria,

        workArea:
          lead.categoria,

        plan_code: "free",
        create_store_items: true,
      },
    });

  const previewUrl =
    `https://compretudo.shop/p/${previewPage.slug}`;

  await service.updateLead(lead.id, {
    preview_url: previewUrl,
    preview_status: "generated",
  });

  profile = previewPage;
}

console.log("✅ PROFILE ENCONTRADO:", profile?.id);

    const { data: updatedProfile, error: updateProfileError } = await supabase
      .from("profiles_pages")
      .update({
        user_id: usuario.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", profile.id)
      .select("*")
      .single();

    if (updateProfileError || !updatedProfile) {
      console.error("Erro ao vincular vitrine:", updateProfileError);
      return res.status(500).json({
        error: "Não foi possível vincular a vitrine ao usuário.",
      });
    }

    const payment = await createProfilePageSubscriptionPayment({
      user: { id: usuario.id },
      profile: updatedProfile,
      planCode: selectedPlan,
    });

    const introMessage = `Perfeito 😄

Aqui está a ativação da *${planLabel}* para a ${lead.empresa}.

Plano: *${planValue}*

Assim que o pagamento for confirmado, a vitrine será ativada automaticamente.`;

    const pixMessage = payment.qr_code || "Pix não gerado.";

    const savedIntro = await service.createMessage({
      conversation_id: conversationId,
      role: "assistant",
      message: introMessage,
      metadata: {
        source: "human_payment",
        payment_id: payment.id,
        selected_plan: selectedPlan,
      },
    });

    const savedPix = await service.createMessage({
      conversation_id: conversationId,
      role: "assistant",
      message: pixMessage,
      metadata: {
        source: "human_payment_pix_code",
        payment_id: payment.id,
        selected_plan: selectedPlan,
      },
    });

    return res.json({
      payment,
      messages: [savedIntro, savedPix],
    });
  } catch (err) {
    console.error("Erro ao gerar pagamento manual:", err);

    return res.status(500).json({
      error: err.message,
    });
  }
}

export async function startInboundShowcaseFlow(req, res) {
  try {
    const {
      nome,
      empresa,
      telefone,
      whatsapp,
      cidade,
      estado = "SE",
      categoria,
      message,
    } = req.body;
const inboundMessage =
  message || "Quero minha vitrine, como faz?";

const {
  cidade: extractedCity,
  estado: extractedState,
} = extractLocation(inboundMessage);
    const phone = whatsapp || telefone;

    if (!phone) {
      return res.status(400).json({
        error: "whatsapp ou telefone obrigatório.",
      });
    }

    const lead = await service.createOrGetLeadByPhone({
      empresa: empresa || nome || "Nova empresa",
      nome_responsavel: nome || null,
      telefone: phone,
      whatsapp: phone,
      cidade:
  extractedCity ||
  cidade ||
  null,

estado:
  extractedState ||
  estado ||
  "SE",
      categoria: categoria || "comércio local",
      status: "inbound",
      source: "whatsapp_button_showcase",
      last_message: inboundMessage,
    });

    const conversation =
      await service.getOrCreateConversation(lead.id);

    await getOrCreateAIState(conversation.id);

    await updateAIState(conversation.id, {
      stage: "interest",
      last_intent: "inbound_showcase_request",
      lead_temperature: 8,
    });

    await service.createMessage({
      conversation_id: conversation.id,
      role: "user",
      message:
        message || "Quero minha vitrine, como faz?",
      metadata: {
        source: "whatsapp_button_showcase",
        inbound: true,
      },
    });

    const aiMessage = `Opa, que massa 😄

Funciona assim: a gente monta uma vitrine profissional da sua empresa no CompreTudo.Shop, com botão direto para WhatsApp, informações organizadas, catálogo e presença online para ajudar mais pessoas da cidade a encontrarem você.

Eu posso primeiro te mostrar um exemplo real de como fica e, se fizer sentido, gero uma prévia gratuita da sua empresa.

Quer ver um exemplo?`;

    const savedReply = await service.createMessage({
      conversation_id: conversation.id,
      role: "assistant",
      message: aiMessage,
      metadata: {
        generated_by: "inbound_showcase_flow",
        stage: "interest",
      },
    });

    await service.updateLead(lead.id, {
      status: "inbound_contacted",
      prospection_started_at: new Date().toISOString(),
      last_message: aiMessage,
    });

    return res.json({
      lead,
      conversation,
      message: savedReply,
    });
  } catch (err) {
    console.error("Erro no fluxo inbound showcase:", err);

    return res.status(500).json({
      error: err.message,
    });
  }
}
export async function continueConversation(req, res) {
  try {
    const conversationId = req.params.conversationId;
    const userMessage = String(req.body.message || "").trim();

    if (!userMessage) {
      return res.status(400).json({
        error: "Mensagem vazia.",
      });
    }

    const conversation = await service.getConversationById(conversationId);
const lead = await service.getLeadById(conversation.lead_id);

const currentAIState =
  await getOrCreateAIState(conversationId);

if (currentAIState?.stage === "greeting") {
  await service.createMessage({
    conversation_id: conversationId,
    role: "user",
    message: userMessage,
    metadata: {
      source: "greeting_reply",
    },
  });

  const aiMessage =
    await generateFirstContact(lead);

  await updateAIState(conversationId, {
    stage: "interest",
    last_intent: "greeting_replied",
    lead_temperature: 2,
  });

  const savedReply =
    await service.createMessage({
      conversation_id: conversationId,
      role: "assistant",
      message: aiMessage,
      metadata: {
        generated_by: "ai_after_greeting",
        stage: "interest",
      },
    });

  return res.json(savedReply);
}
    if (
  lead.conversation_mode === "human" ||
  lead.conversation_mode === "waiting_human"
) {
  const savedMessage = await service.createMessage({
    conversation_id: conversationId,
    role: "user",
    message: userMessage,
    metadata: {
      source: "customer_message",
      handled_by: "human_mode",
    },
  });

  return res.json({
    ...savedMessage,
    human_mode: true,
    message:
      "Mensagem recebida. A conversa está em atendimento manual.",
  });
}
const requestedPreview =
  wantsPreview(userMessage);



const simpleYes =
  isSimpleYes(userMessage);
const normalizedMessage =
  String(userMessage || "").toLowerCase();
  if (requestedPreview) {
console.log("🔥 ENTROU NO FLOW requestedPreview()");
  const previewPage = await createOrUpdateProfilePage({
    supabase,
   user: {
  id: lead.id,

  nome: lead.empresa,
  nome_empresa: lead.empresa,
  businessName: lead.empresa,

  telefone: lead.whatsapp || lead.telefone,
  whatsapp: lead.whatsapp || lead.telefone,

  cidade: lead.cidade,
  estado: lead.estado || "SE",

  ramo_empresa: lead.categoria,
  categoria_principal: lead.categoria,
  area_principal: lead.categoria,
  servico_principal: lead.categoria,
  workArea: lead.categoria,

  plan_code: "free",
  create_store_items: true,
}
  });

  const fakePreviewUrl = `https://compretudo.shop/p/${previewPage.slug}`;

  await service.updateLead(lead.id, {
    preview_url: fakePreviewUrl,
    preview_status: "generated",
    preview_requested_at: new Date().toISOString(),
    preview_generated_at: new Date().toISOString(),
  });

  const previewReply = `Perfeito. Preparei uma prévia inicial de como a presença online da ${lead.empresa} pode ficar:

${fakePreviewUrl}

Nela você consegue visualizar:
- vitrine profissional
- botão de WhatsApp
- presença online
- descoberta no Google
- catálogo da empresa

Se quiser, posso te explicar também como funciona a ativação completa.`;

  const savedReply = await service.createMessage({
    conversation_id: conversationId,
    role: "assistant",
    message: previewReply,
    metadata: {
      generated_by: "preview_system",
      preview_url: fakePreviewUrl,
      stage: "preview",
    },
  });

  return res.json(savedReply);
}
const wantsHuman =
  /(humano|atendente|pessoa|falar com alguém|falar com alguem|suporte|responsável|responsavel|não entendi|nao entendi|confuso|dúvida|duvida)/i
    .test(normalizedMessage);

if (wantsHuman) {
  await service.updateLead(lead.id, {
    conversation_mode: "waiting_human",
    human_requested_at: new Date().toISOString(),
    human_request_reason: userMessage,
  });

  const reply = `Claro 😄

Eu sou a assistente virtual do CompreTudo.Shop e posso ajudar com a maioria das informações.

Mas para tirar essa dúvida com mais segurança, vou deixar sua conversa aguardando um atendente humano.

Assim que alguém assumir por aqui, continua o atendimento com você, tudo bem?`;

  const savedReply = await service.createMessage({
    conversation_id: conversationId,
    role: "assistant",
    message: reply,
    metadata: {
      generated_by: "human_handoff",
      stage: "waiting_human",
    },
  });

  return res.json(savedReply);
}
const didntLikePreview =
  /(não gostei|nao gostei|não curti|nao curti|não gostei muito|modelo|alterar|personalizar|mudar|trocar|editar|ficou estranho|não ficou legal)/i
    .test(normalizedMessage);

if (
  didntLikePreview &&
  lead.preview_url
) {
  const reply = `Sem problema 😄

Essa prévia é só um ponto de partida para você visualizar a ideia.

Depois da ativação, você pode personalizar do jeito que quiser:
- trocar visual
- mudar cores
- trocar fotos
- ajustar informações
- adicionar ou remover produtos
- organizar a loja do jeito da empresa

A ideia é deixar com a cara da ${lead.empresa} mesmo.

Inclusive, você prefere algo mais moderno, mais simples ou algo mais parecido com o visual da empresa hoje?`;

  const savedReply =
    await service.createMessage({
      conversation_id: conversationId,
      role: "assistant",
      message: reply,
      metadata: {
        generated_by: "customization_flow",
        stage: "offer",
        preview_url: lead.preview_url,
      },
    });

  return res.json(savedReply);
}
console.log("🔥 DEBUG CONVERSA", {
  message: userMessage,
  requestedPreview,
  simpleYes,
  currentStage: currentAIState?.stage,
  lastIntent: currentAIState?.last_intent,
  empresa: lead?.empresa,
  categoria: lead?.categoria,
});

const paymentConfirm =
  simpleYes ||
  /(pode ser|pode sim|manda|mande|envia|enviar|gera|gerar|fechado|vamos|bora|ok|confirmo)/i
    .test(normalizedMessage);

if (
  paymentConfirm &&
  currentAIState.stage === "payment"
) {
  const selectedPlan =
    currentAIState.last_intent === "selected_full_plan"
      ? "complete_pro"
      : "store_start";

  let profile = null;

if (lead.preview_url) {
  const slug = String(lead.preview_url)
    .split("/p/")[1]
    ?.split("?")[0];

  if (slug) {
    const bySlug = await supabase
      .from("profiles_pages")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();

    profile = bySlug.data || null;
  }
}

if (!profile) {
  return res.status(400).json({
    error: "Nenhuma vitrine encontrada para gerar pagamento.",
  });
}
const phone =
  lead.whatsapp || lead.telefone || "";

const { data: usuario, error: usuarioError } = await supabase
  .from("usuarios")
  .upsert(
    {
      telefone: phone,
      nome: lead.empresa,
      tipo: "empresa",
      cidade: lead.cidade || null,
      estado: lead.estado || "SE",
      categoria_principal: lead.categoria || null,
      area_principal: lead.categoria || null,
      etapa: "lead_pagamento",
    },
    { onConflict: "telefone" }
  )
  .select()
  .single();

if (usuarioError || !usuario) {
  console.error("Erro ao criar/buscar usuário para pagamento:", usuarioError);
  return res.status(500).json({
    error: "Não foi possível criar usuário para pagamento.",
  });
}
const { data: updatedProfile, error: updateProfileError } =
  await supabase
    .from("profiles_pages")
    .update({
      user_id: usuario.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", profile.id)
    .select("*")
    .single();

if (updateProfileError || !updatedProfile) {
  console.error("Erro ao transferir vitrine para usuário:", updateProfileError);

  return res.status(500).json({
    error: "Não foi possível vincular a vitrine ao usuário.",
  });
}
  const payment = await createProfilePageSubscriptionPayment({
    user: { id: usuario.id },
    profile: updatedProfile,
    planCode: selectedPlan,
  });

  const reply = `Perfeito 😄

Já deixei tudo pronto.

Assim que o pagamento for confirmado, sua vitrine será ativada automaticamente.

💳 *Pagamento via Pix:*

🔗 ${payment.checkout_url}

📌 *Copia e cola Pix:*
${payment.qr_code}

Depois que pagar, é só me avisar aqui 👍`;

  const savedReply = await service.createMessage({
    conversation_id: conversationId,
    role: "assistant",
    message: reply,
    metadata: {
      generated_by: "payment_system",
      stage: "payment",
      payment_id: payment.id,
      selected_plan: selectedPlan,
    },
  });

  return res.json(savedReply);
}

const wantsPrice =
  /(preço|valor|quanto custa|quanto fica|plano|mensalidade|quanto é|como ativa|ativar|assinar|como funciona o plano)/i
    .test(normalizedMessage);

const showedInterest =
  /(gostei|ficou legal|interessante|quero|tenho interesse|curti|massa|bacana|legal|show|top)/i
    .test(normalizedMessage);
const selectedBasicPlan =
  /(19,90|vitrine inteligente|plano vitrine|vitrine|primeiro plano|mais simples|essa de 19|quero começar|quero comecar)/i
    .test(normalizedMessage) ||
  (
    /(sim|pode ser|pode sim|fechado|vamos|bora|quero esse|esse mesmo|ok esse|sim esse|blz|beleza)/i
      .test(normalizedMessage) &&
    lead.preview_url &&
    ["offer", "closing", "activation", "preview", "interest"].includes(currentAIState.stage)
  );
const selectedFullPlan =
  /(49,90|gestao|gestão|completo|segunda|essa de 49)/i
    .test(normalizedMessage);

if (selectedBasicPlan) {
  await updateAIState(conversationId, {
    stage: "payment",
    last_intent: "selected_basic_plan",
    lead_temperature: 10,
  });

  const reply = `Perfeito 😄

A *Vitrine Inteligente* fica *R$ 19,90/mês* e inclui:

✅ vitrine profissional  
✅ loja/catálogo online  
✅ botão direto para WhatsApp  
✅ presença no marketplace local  
✅ possibilidade de personalizar depois

Posso gerar o Pix de ativação agora?`;
  const savedReply =
    await service.createMessage({
      conversation_id: conversationId,
      role: "assistant",
      message: reply,
      metadata: {
        generated_by: "plan_selection",
        selected_plan: "store_start",
        stage: "payment",
      },
    });

  return res.json(savedReply);
}

if (selectedFullPlan) {
  await updateAIState(conversationId, {
    stage: "payment",
    last_intent: "selected_full_plan",
    lead_temperature: 10,
  });

  const reply = `Perfeito 😄

Excelente escolha. A **Gestão Completa** fica **R$ 49,90/mês** e inclui vitrine, loja, caixa, funcionários, comissões e destaque no marketplace local.

Posso seguir com a ativação e gerar o pagamento agora?`;

  const savedReply =
    await service.createMessage({
      conversation_id: conversationId,
      role: "assistant",
      message: reply,
      metadata: {
        generated_by: "plan_selection",
        selected_plan: "complete_pro",
        stage: "payment",
      },
    });

  return res.json(savedReply);
}
if (
  wantsPrice ||
  (
    showedInterest &&
    [
      "example",
      "value",
      "preview",
      "activation",
    ].includes(currentAIState.stage)
  )
) {
  console.log("💰 INDO PARA OFFER");

  await updateAIState(conversationId, {
    stage: "offer",
    last_intent: "plan_interest",
    lead_temperature: 9,
  });

  currentAIState.stage = "offer";
}
    await service.createMessage({
      conversation_id: conversationId,
      role: "user",
      message: userMessage,
      metadata: {
        source: "manual_reply",
      },
    });

    let intent = await classifyLeadIntent(userMessage);

    
if (
  simpleYes &&
  (!currentAIState.stage || currentAIState.stage === "intro")
) {

      intent = {
        intent: "permission_to_explain",
        nextStage: "interest",
        temperature: 2,
      };
    }
    
if (
  simpleYes &&
  ["example", "value", "closing"].includes(currentAIState.stage)
) {
  if (!lead.preview_url) {
    const previewPage = await createOrUpdateProfilePage({
      supabase,
      user: {
  id: lead.id,

  nome: lead.empresa,
  nome_empresa: lead.empresa,
  businessName: lead.empresa,

  telefone: lead.whatsapp || lead.telefone,
  whatsapp: lead.whatsapp || lead.telefone,

  cidade: lead.cidade,
  estado: lead.estado || "SE",

  ramo_empresa: lead.categoria,
  categoria_principal: lead.categoria,
  area_principal: lead.categoria,
  servico_principal: lead.categoria,
  workArea: lead.categoria,

  plan_code: "free",
  create_store_items: true,
}
    });

    const previewUrl = `https://compretudo.shop/p/${previewPage.slug}`;

    await service.updateLead(lead.id, {
      preview_url: previewUrl,
      preview_status: "generated",
      preview_requested_at: new Date().toISOString(),
      preview_generated_at: new Date().toISOString(),
    });

    const previewReply = `Perfeito. Montei uma prévia gratuita de como a vitrine da ${lead.empresa} pode ficar:

${previewUrl}

Ela ajuda a empresa a ter uma presença mais profissional no Google e também dentro do marketplace local CompreTudo.Shop, com informações organizadas, botão de WhatsApp e espaço para catálogo.

Dá uma olhada e me diz se quer que eu siga com a ativação.`;

    const savedReply = await service.createMessage({
      conversation_id: conversationId,
      role: "assistant",
      message: previewReply,
      metadata: {
        generated_by: "preview_system",
        preview_url: previewUrl,
        page_id: previewPage.id,
        stage: "preview",
      },
    });

    return res.json(savedReply);
  }

  const activationReply = `Perfeito. Posso seguir com a ativação da vitrine da ${lead.empresa}.

Ela já fica preparada para presença no Google e também para aparecer dentro do marketplace local CompreTudo.Shop.

Quer que eu siga com a ativação?`;

  const savedReply = await service.createMessage({
    conversation_id: conversationId,
    role: "assistant",
    message: activationReply,
    metadata: {
      generated_by: "system_fixed",
      stage: "activation",
      intent: "activation_interest",
      preview_url: lead.preview_url,
    },
  });

  return res.json(savedReply);
}
    if (
      simpleYes &&
      currentAIState.stage === "interest" &&
      currentAIState.last_intent === "permission_to_explain"
    ) {
      intent = {
        intent: "wants_example",
        nextStage: "example",
        temperature: 3,
      };
    }

    if (intent.intent === "permission_to_explain") {
      
      const updatedAIState = await updateAIState(conversationId, {
        stage: "interest",
        last_intent: intent.intent,
        lead_temperature: intent.temperature,
      });

      const fixedReply = buildInterestReply(lead);

      const savedReply = await service.createMessage({
        conversation_id: conversationId,
        role: "assistant",
        message: fixedReply,
        metadata: {
          generated_by: "system_fixed",
          stage: updatedAIState.stage,
          intent: intent.intent,
          example_url: DEFAULT_EXAMPLE_URL,
          preview_url: lead.preview_url || null,
        },
      });

      return res.json(savedReply);
    }

    if (intent.intent === "wants_example") {
      console.log("🔥 ENTROU NO FLOW simpleYes PREVIEW");
      const updatedAIState = await updateAIState(conversationId, {
        stage: "example",
        last_intent: intent.intent,
        lead_temperature: intent.temperature,
      });

      const fixedReply = buildExampleReply();

      const savedReply = await service.createMessage({
        conversation_id: conversationId,
        role: "assistant",
        message: fixedReply,
        metadata: {
          generated_by: "system_fixed",
          stage: updatedAIState.stage,
          intent: intent.intent,
          example_url: DEFAULT_EXAMPLE_URL,
          preview_url: lead.preview_url || null,
        },
      });

      return res.json(savedReply);
    }

    const updatedAIState = await updateAIState(conversationId, {
      stage: intent.nextStage,
      last_intent: intent.intent,
      lead_temperature: intent.temperature,
    });

    const history = await service.getConversationMessages(conversationId);

    const aiReply = await generateConversationReply({
      messages: history,
      stage: updatedAIState.stage,
      lead: {
        ...lead,
        example_url: DEFAULT_EXAMPLE_URL,
      },
    });

    const savedReply = await service.createMessage({
      conversation_id: conversationId,
      role: "assistant",
      message: aiReply,
      metadata: {
        generated_by: "ai",
        stage: updatedAIState.stage,
        intent: intent.intent,
        example_url: DEFAULT_EXAMPLE_URL,
        preview_url: lead.preview_url || null,
      },
    });

    return res.json(savedReply);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: err.message,
    });
  }
}

export async function getProspectionQueue(req, res) {
  try {
    const limit = Number(req.query.limit || 10);

    const leads =
      await service.getReadyToContactLeads(limit);

    return res.json({
      total: leads.length,
      leads,
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      error: err.message,
    });
  }
}

export async function startQueueProspection(req, res) {
  try {
    const limit = Number(req.body.limit || 5);

    const leads = await service.getReadyToContactLeads(limit);

    const results = [];

    for (const lead of leads) {
      const conversation = await service.getOrCreateConversation(lead.id);

      await getOrCreateAIState(conversation.id);



await updateAIState(conversation.id, {
  stage: "greeting",
  last_intent: "initial_greeting",
  lead_temperature: 1,
});

const hour = new Date().getHours();

const aiMessage =
  hour < 12
    ? "Oi, bom dia! Tudo bem?"
    : hour < 18
      ? "Oi, boa tarde! Tudo bem?"
      : "Oi, boa noite! Tudo bem?";

      await service.createMessage({
        conversation_id: conversation.id,
        role: "assistant",
        message: aiMessage,
        metadata: {
          type: "first_contact",
          generated_by: "ai",
        },
      });

      await service.updateLead(lead.id, {
        status: "contacted",
        prospection_started_at: new Date().toISOString(),
        last_message: aiMessage,
      });

      results.push({
        lead: lead.empresa,
        whatsapp: lead.whatsapp,
        message: aiMessage,
      });
    }

    return res.json({
      success: true,
      total: results.length,
      results,
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      error: err.message,
    });
  }
}