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
import { sendLeadTemplate } from "../../services/whatsappLeads.js";
import { sendText } from "../../../../../src/services/whatsapp.js";

const DEFAULT_EXAMPLE_URL =
  process.env.DEFAULT_EXAMPLE_URL ||
  "https://compretudo.shop/p/sb-make-up-itabaiana-se";

const MARKETPLACE_URL =
  process.env.COMPRETUDO_MARKETPLACE_URL ||
  "https://compretudo.shop";

function normalizeText(value = "") {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function isSimpleYes(message = "") {
  const text = normalizeText(message);

  return [
    "sim",
    "s",
    "pode",
    "pode sim",
    "claro",
    "ok",
    "beleza",
    "blz",
    "quero",
    "quero sim",
    "manda",
    "mande",
    "bora",
    "vamos",
  ].includes(text);
}

function isGreetingOnly(message = "") {
  const text = normalizeText(message);

  return [
    "oi",
    "ola",
    "olá",
    "bom dia",
    "boa tarde",
    "boa noite",
    "menu",
    "inicio",
    "início",
  ].includes(text);
}

function isDirectShowcaseRequest(message = "") {
  const text = normalizeText(message);

  return (
    text.includes("quero minha vitrine") ||
    text.includes("como coloco minha vitrine") ||
    text.includes("como colocar minha vitrine") ||
    text.includes("quero uma vitrine") ||
    text.includes("minha vitrine") ||
    text.includes("vitrine")
  );
}

function isNegativeOrLater(message = "") {
  const text = normalizeText(message);

  return (
    text.includes("agora nao") ||
    text.includes("agora não") ||
    text.includes("depois") ||
    text.includes("mais tarde") ||
    text.includes("vou pensar") ||
    text.includes("nao quero") ||
    text.includes("não quero") ||
    text.includes("sem dinheiro") ||
    text.includes("caro") ||
    text.includes("nao tenho interesse") ||
    text.includes("não tenho interesse")
  );
}

function wantsFreeActivation(message = "") {
  const text = normalizeText(message);

  return (
    text.includes("gratis") ||
    text.includes("grátis") ||
    text.includes("gratuita") ||
    text.includes("gratuito") ||
    text.includes("ativar gratis") ||
    text.includes("ativar grátis") ||
    text.includes("pode ativar") ||
    text.includes("ativar gratuitamente") ||
    text.includes("sim") ||
    text.includes("quero")
  );
}

function wantsPreview(message = "") {
  const text = normalizeText(message);

  return (
    text.includes("como ficaria") ||
    text.includes("quero ver") ||
    text.includes("minha empresa") ||
    text.includes("previa") ||
    text.includes("prévia") ||
    text.includes("preview") ||
    text.includes("me mostra") ||
    text.includes("faz um exemplo") ||
    text.includes("pode fazer") ||
    text.includes("fazer a minha")
  );
}
function extractLocation(message = "") {
  const text = String(message || "");

  const cityMatch = text.match(/cidade\s*:\s*([^,;\n]+?)(?=\s+estado\s*:|$)/i);
  const stateMatch = text.match(/estado\s*:\s*([a-zA-Z]{2})/i);

  return {
    cidade: cityMatch?.[1]?.trim() || null,
    estado: stateMatch?.[1]?.trim()?.toUpperCase() || null,
  };
}

function buildMarketplaceGreeting() {
  return `Oi! 👋

Você está falando com o *CompreTudo.Shop*.

Aqui a pessoa consegue encontrar produtos, serviços, profissionais e empresas da cidade em um só lugar.

Acesse aqui:
${MARKETPLACE_URL}

Se você tem uma empresa ou trabalha por conta própria e quer aparecer no shopping local, me diga: *quero minha vitrine*.`;
}

function buildInterestReply(lead = {}) {
  return `Perfeito 😄

A ideia é colocar a ${
    lead.empresa || "sua empresa"
  } em uma vitrine profissional da cidade, com informações organizadas, presença online e botão direto para WhatsApp.

Assim, quando alguém procurar por ${
    lead.categoria || "serviços"
  } em ${lead.cidade || "sua região"}, fica mais fácil encontrar vocês.

Posso te mostrar um exemplo real de como essa vitrine fica?`;
}

function buildExampleReply() {
  return `Claro. Esse é um exemplo real de vitrine no CompreTudo.Shop:

${DEFAULT_EXAMPLE_URL}

Ela mostra como uma empresa pode aparecer com visual profissional, informações organizadas, botão de WhatsApp, catálogo e presença online.

Quer que eu monte uma prévia gratuita de como ficaria a vitrine da sua empresa?`;
}

function buildDirectClosingReply(lead = {}) {
  return `Que massa 😄

Vi que você veio pelo botão da vitrine, então vou direto ao ponto.

A gente pode colocar a ${
    lead.empresa || "sua empresa"
  } dentro do *CompreTudo.Shop*, para aparecer no shopping local da cidade com informações organizadas e botão direto para WhatsApp.

Hoje temos duas opções:

1️⃣ *Vitrine Inteligente* — R$ 19,90/mês  
Ideal para aparecer no e-commerce local, ter página profissional e receber clientes no WhatsApp.

2️⃣ *Gestão Completa* — R$ 49,90/mês  
Ideal para quem quer vitrine + loja/catálogo + controle de pedidos, equipe, caixa e gestão.

Qual dessas faz mais sentido para você hoje?`;
}

function buildFreeOfferReply(lead = {}) {
  return `Sem problema 😄

Para você não sair sem testar, posso ativar uma *vitrine gratuita inicial* para a ${
    lead.empresa || "sua empresa"
  } aparecer no e-commerce local.

Ela fica como uma presença básica dentro do CompreTudo.Shop, e depois, se fizer sentido, você pode ativar o plano completo.

Posso ativar gratuitamente para você?`;
}

function buildFreeActivatedReply(lead = {}) {
  return `Pronto 😄

A vitrine gratuita inicial da ${
    lead.empresa || "sua empresa"
  } foi preparada para aparecer no e-commerce local.

Agora os clientes podem entrar no CompreTudo.Shop e procurar pelo nome da empresa:

${MARKETPLACE_URL}

Depois, se quiser deixar mais completa, com catálogo, destaque e personalização, é só me chamar por aqui.`;
}

function buildPlanOfferReply() {
  return `Perfeito 😄

Temos duas opções:

1️⃣ *Vitrine Inteligente — R$ 19,90/mês*

✅ vitrine profissional  
✅ catálogo online  
✅ botão direto para WhatsApp  
✅ presença no CompreTudo.Shop local  

---

2️⃣ *Gestão Completa — R$ 49,90/mês*

✅ tudo da Vitrine Inteligente  
✅ *visibilidade no Google*  
✅ otimização para aparecer em buscas locais  
✅ presença profissional no Google  
✅ pedidos, equipe, caixa e gestão  
✅ mais chances de clientes encontrarem sua empresa

A presença no Google é ativada *somente na Gestão Completa*.

Qual plano faz mais sentido para você hoje?`;
}

async function createPreviewForLead(lead) {
    if (
    !lead?.empresa ||
    lead.empresa === "Nova empresa" ||
    lead.empresa === "Cadastro em andamento" ||
    !lead?.cidade ||
    !lead?.categoria ||
    lead.categoria === "comércio local"
  ) {
    throw new Error(
      "Dados incompletos para gerar vitrine. Colete nome comercial, telefone, cidade/estado e ramo antes."
    );
  }
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
    },
  });

  const previewUrl = `https://compretudo.shop/p/${previewPage.slug}`;

  await service.updateLead(lead.id, {
    preview_url: previewUrl,
    preview_status: "generated",
    preview_requested_at: new Date().toISOString(),
    preview_generated_at: new Date().toISOString(),
  });

  return {
    previewPage,
    previewUrl,
  };
}

export async function startProspection(req, res) {
  try {
    const leadId = req.params.leadId;
    const lead = await service.getLeadById(leadId);

    if (!lead) {
      return res.status(404).json({
        error: "Lead não encontrado.",
      });
    }

    if (lead.status === "contacted") {
      return res.status(400).json({
        error: "Lead já foi prospectado.",
        lead,
      });
    }

    const conversation =
      await service.getOrCreateConversation(leadId);

    await getOrCreateAIState(conversation.id);

    await updateAIState(conversation.id, {
      stage: "greeting",
      last_intent: "initial_greeting",
      lead_temperature: 1,
    });

    const empresa = lead?.empresa || "empresa";
    const hour = new Date().getHours();

    const greetingOptions =
      hour < 12
        ? [
            `Oi, é da ${empresa}? Bom dia 😄`,
            `Olá! Tudo bem? É da ${empresa}, certo?`,
            `Opa, bom dia 😄 É da ${empresa}, certo?`,
          ]
        : hour < 18
          ? [
              `Oi, é da ${empresa}? Boa tarde 😄`,
              `Olá! Tudo bem? É da ${empresa}, certo?`,
              `Opa, boa tarde 😄 É da ${empresa}, certo?`,
            ]
          : [
              `Oi, é da ${empresa}? Boa noite 😄`,
              `Olá! Tudo bem? É da ${empresa}, certo?`,
              `Opa, boa noite 😄 É da ${empresa}, certo?`,
            ];

    const aiMessage =
      greetingOptions[
        Math.floor(Math.random() * greetingOptions.length)
      ];

    const savedMessage = await service.createMessage({
      conversation_id: conversation.id,
      role: "assistant",
      message: aiMessage,
      metadata: {
        type: "first_contact",
        generated_by: "ai",
        stage: "greeting",
      },
    });

    const phone = lead.whatsapp || lead.telefone;

    if (phone) {
      await sendLeadTemplate({
        to: phone,
        businessName: lead.empresa,
      });
    }

    await service.updateLead(lead.id, {
      status: "contacted",
      prospection_started_at: new Date().toISOString(),
      last_message: aiMessage,
    });

    return res.json({
      lead,
      conversation,
      message: savedMessage,
    });
  } catch (err) {
    console.error("Erro em startProspection:", err);

    return res.status(500).json({
      error: err.message,
    });
  }
}
export async function create(req, res) {
  try {
    const data = await service.createLead(req.body);

    return res.json(data);
  } catch (err) {
    console.error("Erro em create:", err);

    return res.status(500).json({
      error: err.message,
    });
  }
}

export async function list(req, res) {
  try {
    const data = await service.getLeads();

    return res.json(data);
  } catch (err) {
    console.error("Erro em list:", err);

    return res.status(500).json({
      error: err.message,
    });
  }
}

export async function createConversation(req, res) {
  try {
    const leadId = req.params.leadId;

    const conversation =
      await service.getOrCreateConversation(leadId);

    await getOrCreateAIState(conversation.id);

    return res.json(conversation);
  } catch (err) {
    console.error("Erro em createConversation:", err);

    return res.status(500).json({
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

    return res.json(data);
  } catch (err) {
    console.error("Erro em createMessage:", err);

    return res.status(500).json({
      error: err.message,
    });
  }
}

export async function getMessages(req, res) {
  try {
    const data =
      await service.getMessages(req.params.conversationId);

    return res.json(data);
  } catch (err) {
    console.error("Erro em getMessages:", err);

    return res.status(500).json({
      error: err.message,
    });
  }
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
    console.error("Erro em assumeConversation:", err);

    return res.status(500).json({
      error: err.message,
    });
  }
}

export async function generateLeadPayment(req, res) {
  try {
    const leadId = req.params.leadId;
    const {
      conversationId,
      planCode = "store_start",
    } = req.body;

    const lead = await service.getLeadById(leadId);

    if (!lead) {
      return res.status(404).json({
        error: "Lead não encontrado.",
      });
    }

    if (!conversationId) {
      return res.status(400).json({
        error: "conversationId obrigatório.",
      });
    }

    const selectedPlan =
      planCode === "complete_pro"
        ? "complete_pro"
        : "store_start";

    const planLabel =
      selectedPlan === "complete_pro"
        ? "Gestão Completa"
        : "Vitrine Inteligente";

    const planValue =
      selectedPlan === "complete_pro"
        ? "R$ 49,90/mês"
        : "R$ 19,90/mês";

    const phone = lead.whatsapp || lead.telefone || "";

    const { data: usuario, error: usuarioError } =
      await supabase
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
      console.error(
        "Erro ao criar/buscar usuário:",
        usuarioError
      );

      return res.status(500).json({
        error:
          "Não foi possível preparar usuário para pagamento.",
      });
    }

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
      const preview = await createPreviewForLead(lead);

      profile = preview.previewPage;

      await service.updateLead(lead.id, {
        preview_url: preview.previewUrl,
        preview_status: "generated",
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
      console.error(
        "Erro ao vincular vitrine:",
        updateProfileError
      );

      return res.status(500).json({
        error:
          "Não foi possível vincular a vitrine ao usuário.",
      });
    }

    const payment =
      await createProfilePageSubscriptionPayment({
        user: { id: usuario.id },
        profile: updatedProfile,
        planCode: selectedPlan,
      });

    const introMessage = `Perfeito 😄

Aqui está a ativação da *${planLabel}* para a ${lead.empresa}.

Plano: *${planValue}*

Assim que o pagamento for confirmado, a vitrine será ativada automaticamente.`;

    const pixMessage =
      payment.qr_code || "Pix não gerado.";

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
    console.error("Erro em generateLeadPayment:", err);

    return res.status(500).json({
      error: err.message,
    });
  }
}
export async function continueConversation(req, res) {
  try {
    const conversationId =
      req.params.conversationId;

    const userMessage =
      req.body.message || "";

    const normalizedMessage =
      normalizeText(userMessage);

    const receiverPhoneNumberId =
      req.body.receiverPhoneNumberId ||
      process.env.WHATSAPP_PHONE_ID;

    const conversation =
      await service.getConversationById(
        conversationId
      );

    if (!conversation) {
      return res.status(404).json({
        error: "Conversa não encontrada.",
      });
    }

    const lead =
      await service.getLeadById(
        conversation.lead_id
      );

    if (!lead) {
      return res.status(404).json({
        error: "Lead não encontrado.",
      });
    }

    const aiState =
      await getOrCreateAIState(
        conversationId
      );

    const currentStage =
      aiState?.stage || "greeting";

    const lastIntent =
      aiState?.last_intent || null;

    console.log(
      "🔥 DEBUG CONVERSA",
      {
        message: userMessage,
        currentStage,
        lastIntent,
        empresa: lead.empresa,
        categoria: lead.categoria,
      }
    );

    // salva mensagem do usuário
    await service.createMessage({
      conversation_id: conversationId,
      role: "user",
      message: userMessage,
      metadata: {
        generated_by: "whatsapp",
      },
    });

    const phone =
      lead.whatsapp ||
      lead.telefone;
      const isIncompleteLead =
  !lead.empresa ||
  lead.empresa === "Cadastro em andamento" ||
  lead.empresa === "Nova empresa" ||
  !lead.cidade ||
  !lead.estado ||
  !lead.categoria ||
  lead.categoria === "comércio local";

const safeOnboardingStages = [
  "onboarding_name",
  "onboarding_phone",
  "onboarding_city",
  "onboarding_category",
];

if (
  isIncompleteLead &&
  !safeOnboardingStages.includes(currentStage)
) {
  await updateAIState(conversationId, {
    stage: "onboarding_name",
    last_intent: "forced_onboarding",
    lead_temperature: 6,
  });

  const reply = `Perfeito 😄

Vou montar sua vitrine no CompreTudo.Shop.

Primeiro me diga o *nome comercial da empresa ou serviço*.`;

  const saved = await service.createMessage({
    conversation_id: conversationId,
    role: "assistant",
    message: reply,
    metadata: {
      stage: "onboarding_name",
      generated_by: "forced_onboarding_guard",
    },
  });

  if (phone) {
    await sendText(phone, reply, {
      phoneNumberId: receiverPhoneNumberId,
    });
  }

  return res.json(saved);
}
/*
|--------------------------------------------------------------------------
| ONBOARDING DE VITRINE SEM LEAD COMPLETO
|--------------------------------------------------------------------------
*/

if (currentStage === "onboarding_name") {
  await service.updateLead(lead.id, {
    empresa: userMessage,
    last_message: userMessage,
    updated_at: new Date().toISOString(),
  });

  await updateAIState(conversationId, {
    stage: "onboarding_phone",
    last_intent: "collect_business_phone",
    lead_temperature: 6,
  });

  const reply = `Perfeito 😄

Agora me diga o *melhor WhatsApp para atendimento da empresa*.

Pode ser esse mesmo número ou outro.`;

  await sendText(phone, reply, {
    phoneNumberId: receiverPhoneNumberId,
  });

  const saved = await service.createMessage({
    conversation_id: conversationId,
    role: "assistant",
    message: reply,
    metadata: {
      stage: "onboarding_phone",
      generated_by: "onboarding_flow",
    },
  });

  return res.json(saved);
}

if (currentStage === "onboarding_phone") {
  const cleanPhone = String(userMessage || "").replace(/\D/g, "");

  await service.updateLead(lead.id, {
    whatsapp: cleanPhone.length >= 10 ? cleanPhone : lead.whatsapp,
    telefone: cleanPhone.length >= 10 ? cleanPhone : lead.telefone,
    last_message: userMessage,
    updated_at: new Date().toISOString(),
  });

  await updateAIState(conversationId, {
    stage: "onboarding_city",
    last_intent: "collect_business_city",
    lead_temperature: 7,
  });

  const reply = `Show 😄

Qual é a *cidade e estado* da empresa?

Exemplo:
Itabaiana - SE`;

  await sendText(phone, reply, {
    phoneNumberId: receiverPhoneNumberId,
  });

  const saved = await service.createMessage({
    conversation_id: conversationId,
    role: "assistant",
    message: reply,
    metadata: {
      stage: "onboarding_city",
      generated_by: "onboarding_flow",
    },
  });

  return res.json(saved);
}

if (currentStage === "onboarding_city") {
  const rawLocation = String(userMessage || "").trim();

const explicitLocation = extractLocation(rawLocation);

let city = explicitLocation.cidade;
let uf = explicitLocation.estado;

if (!city) {
  const parts = rawLocation.split(/-|,|\//);

  city = parts[0]?.trim() || rawLocation;
  uf = parts[1]?.trim()?.toUpperCase() || lead.estado || "SE";
}

uf = String(uf || "SE").replace(/[^a-zA-Z]/g, "").slice(0, 2).toUpperCase();

  await service.updateLead(lead.id, {
    cidade: city,
    estado: uf,
    last_message: userMessage,
    updated_at: new Date().toISOString(),
  });

  await updateAIState(conversationId, {
    stage: "onboarding_category",
    last_intent: "collect_business_category",
    lead_temperature: 8,
  });

  const reply = `Última coisa 😄

Qual é o *ramo de atividade* da empresa?

Exemplo:
som automotivo, pizzaria, barbearia, oficina, estética, roupas, clínica...`;

  await sendText(phone, reply, {
    phoneNumberId: receiverPhoneNumberId,
  });

  const saved = await service.createMessage({
    conversation_id: conversationId,
    role: "assistant",
    message: reply,
    metadata: {
      stage: "onboarding_category",
      generated_by: "onboarding_flow",
    },
  });

  return res.json(saved);
}

if (currentStage === "onboarding_category") {
  await service.updateLead(lead.id, {
    categoria: userMessage,
    last_message: userMessage,
    updated_at: new Date().toISOString(),
  });

  const updatedLead = await service.getLeadById(lead.id);

  await updateAIState(conversationId, {
    stage: "closing",
    last_intent: "onboarding_completed",
    lead_temperature: 9,
  });

  const reply = buildDirectClosingReply(updatedLead);

  await sendText(phone, reply, {
    phoneNumberId: receiverPhoneNumberId,
  });

  const saved = await service.createMessage({
    conversation_id: conversationId,
    role: "assistant",
    message: reply,
    metadata: {
      stage: "closing",
      generated_by: "onboarding_completed",
    },
  });

  return res.json(saved);
}
    /*
    |--------------------------------------------------------------------------
    | PROSPECÇÃO (INICIADA PELO BOT)
    |--------------------------------------------------------------------------
    */

    if (
      lastIntent ===
      "initial_greeting"
    ) {
      const affirmative =
        isSimpleYes(userMessage) ||
        normalizedMessage.includes(
          "sou eu"
        ) ||
        normalizedMessage.includes(
          "sim e"
        );

      if (affirmative) {
        const reply = `Perfeito 😄

Vi a ${
          lead.empresa
        } e achei que vocês poderiam aparecer melhor nas buscas da cidade.

Hoje muita gente procura *${
          lead.categoria ||
          "serviços"
        }* no Google e no marketplace local e acaba não encontrando empresas da região.

Olha um exemplo real de vitrine no CompreTudo.Shop:

${DEFAULT_EXAMPLE_URL}

Posso montar uma prévia gratuita da ${
          lead.empresa
        } para você ver como ficaria?`;

        await updateAIState(
          conversationId,
          {
            stage: "preview_offer",
            last_intent:
              "prospection_preview_offer",
            lead_temperature: 5,
          }
        );

        const saved =
          await service.createMessage(
            {
              conversation_id:
                conversationId,
              role: "assistant",
              message: reply,
              metadata: {
                stage:
                  "preview_offer",
                generated_by:
                  "prospection_flow",
              },
            }
          );

        if (phone) {
          await sendText(
            phone,
            reply,
            {
              phoneNumberId:
                receiverPhoneNumberId,
            }
          );
        }

        return res.json(saved);
      }

      const softReply = `Tudo certo 😄

Só queria confirmar se estou falando com a ${
        lead.empresa
      }.`;

      const saved =
        await service.createMessage({
          conversation_id:
            conversationId,
          role: "assistant",
          message: softReply,
          metadata: {
            stage: "greeting",
            generated_by:
              "prospection_flow",
          },
        });

      if (phone) {
        await sendText(
          phone,
          softReply,
          {
            phoneNumberId:
              receiverPhoneNumberId,
          }
        );
      }

      return res.json(saved);
    }

    /*
    |--------------------------------------------------------------------------
    | FLUXO DE PRÉVIA DA PROSPECÇÃO
    |--------------------------------------------------------------------------
    */

    if (
      currentStage ===
      "preview_offer"
    ) {
      if (
        isSimpleYes(
          userMessage
        ) ||
        wantsPreview(
          userMessage
        )
      ) {
        const {
          previewUrl,
        } =
          await createPreviewForLead(
            lead
          );

        const reply = `Perfeito 😄

Montei uma prévia inicial da ${
          lead.empresa
        }.

Veja aqui:

${previewUrl}

O que acha? Se fizer sentido para vocês, posso ativar a versão completa com presença no marketplace, WhatsApp, catálogo e personalização.`;

        await updateAIState(
          conversationId,
          {
            stage:
              "offer",
            last_intent:
              "preview_generated",
            lead_temperature:
              8,
          }
        );

        const saved =
          await service.createMessage(
            {
              conversation_id:
                conversationId,
              role: "assistant",
              message: reply,
              metadata: {
                stage:
                  "offer",
                generated_by:
                  "preview_generator",
              },
            }
          );

        if (phone) {
          await sendText(
            phone,
            reply,
            {
              phoneNumberId:
                receiverPhoneNumberId,
            }
          );
        }

        return res.json(saved);
      }

      if (
        isNegativeOrLater(
          userMessage
        )
      ) {
        const reply = `Sem problema 😄

Se quiser depois conhecer melhor como sua empresa pode aparecer no CompreTudo.Shop, me chama por aqui.

Estamos ajudando empresas locais a serem encontradas mais facilmente na cidade.`;

        const saved =
          await service.createMessage(
            {
              conversation_id:
                conversationId,
              role: "assistant",
              message: reply,
              metadata: {
                stage:
                  "paused",
                generated_by:
                  "prospection_flow",
              },
            }
          );

        if (phone) {
          await sendText(
            phone,
            reply,
            {
              phoneNumberId:
                receiverPhoneNumberId,
            }
          );
        }

        return res.json(saved);
      }
    }
        /*
    |--------------------------------------------------------------------------
    | ENTRADA DIRETA PELO BOTÃO "QUERO MINHA VITRINE"
    |--------------------------------------------------------------------------
    */

    const cameFromShoppingButton =
      isDirectShowcaseRequest(
        userMessage
      );

    if (
  currentStage === "greeting" ||
  (
    lastIntent === "inbound_showcase_request" &&
    lead.empresa !== "Cadastro em andamento" &&
    lead.empresa !== "Nova empresa" &&
    lead.categoria !== "comércio local"
  )
) {
      // veio direto do shopping
     if (cameFromShoppingButton) {
  const missingBusinessData =
    !lead.empresa ||
    lead.empresa === "Cadastro em andamento" ||
    lead.empresa === "Nova empresa" ||
    !lead.cidade ||
    !lead.estado ||
    !lead.categoria ||
    lead.categoria === "comércio local";

  // NÃO TEM DADOS -> COMEÇA ONBOARDING
  if (missingBusinessData) {
    await updateAIState(conversationId, {
      stage: "onboarding_name",
      last_intent: "collect_business_name",
      lead_temperature: 6,
    });

    const reply = `Perfeito 😄

Vou montar sua vitrine no CompreTudo.Shop.

Primeiro me diga o *nome comercial da empresa ou serviço*.`;

    const saved = await service.createMessage({
      conversation_id: conversationId,
      role: "assistant",
      message: reply,
      metadata: {
        stage: "onboarding_name",
        generated_by: "direct_showcase_onboarding",
      },
    });

    if (phone) {
      await sendText(phone, reply, {
        phoneNumberId: receiverPhoneNumberId,
      });
    }

    return res.json(saved);
  }

  // TEM DADOS -> VAI PARA FECHAMENTO
  const reply = buildDirectClosingReply(lead);

  await updateAIState(conversationId, {
    stage: "closing",
    last_intent: "direct_showcase_entry",
    lead_temperature: 8,
  });

  const saved = await service.createMessage({
    conversation_id: conversationId,
    role: "assistant",
    message: reply,
    metadata: {
      stage: "closing",
      generated_by: "direct_showcase_flow",
    },
  });

  if (phone) {
    await sendText(phone, reply, {
      phoneNumberId: receiverPhoneNumberId,
    });
  }

  return res.json(saved);
}

      // saudação simples
      if (
        isGreetingOnly(
          userMessage
        )
      ) {
        const reply =
          buildMarketplaceGreeting();

        const saved =
          await service.createMessage(
            {
              conversation_id:
                conversationId,
              role: "assistant",
              message: reply,
              metadata: {
                stage:
                  "greeting",
                generated_by:
                  "marketplace_greeting",
              },
            }
          );

        if (phone) {
          await sendText(
            phone,
            reply,
            {
              phoneNumberId:
                receiverPhoneNumberId,
            }
          );
        }

        return res.json(saved);
      }

      // interesse normal
      const reply =
        buildInterestReply(
          lead
        );

      await updateAIState(
        conversationId,
        {
          stage:
            "interest",
          last_intent:
            "marketplace_interest",
          lead_temperature:
            5,
        }
      );

      const saved =
        await service.createMessage(
          {
            conversation_id:
              conversationId,
            role: "assistant",
            message: reply,
            metadata: {
              stage:
                "interest",
              generated_by:
                "interest_flow",
            },
          }
        );

      if (phone) {
        await sendText(
          phone,
          reply,
          {
            phoneNumberId:
              receiverPhoneNumberId,
          }
        );
      }

      return res.json(saved);
    }

    /*
    |--------------------------------------------------------------------------
    | FASE EXEMPLO / PRÉVIA
    |--------------------------------------------------------------------------
    */
if (
  currentStage === "interest" &&
  isSimpleYes(userMessage)
) {
  const reply = buildExampleReply();

  await updateAIState(conversationId, {
    stage: "example",
    last_intent: "example_sent",
    lead_temperature: 7,
  });

  const saved = await service.createMessage({
    conversation_id: conversationId,
    role: "assistant",
    message: reply,
    metadata: {
      stage: "example",
      generated_by: "example_flow",
    },
  });

  if (phone) {
    await sendText(phone, reply, {
      phoneNumberId: receiverPhoneNumberId,
    });
  }

  return res.json(saved);
}
    if (
      currentStage ===
      "interest"
    ) {
      if (
        wantsPreview(
          userMessage
        ) ||
        isSimpleYes(
          userMessage
        )
      ) {
        const reply =
          buildExampleReply();

        await updateAIState(
          conversationId,
          {
            stage:
              "example",
            last_intent:
              "example_sent",
            lead_temperature:
              7,
          }
        );

        const saved =
          await service.createMessage(
            {
              conversation_id:
                conversationId,
              role: "assistant",
              message: reply,
              metadata: {
                stage:
                  "example",
                generated_by:
                  "example_flow",
              },
            }
          );

        if (phone) {
          await sendText(
            phone,
            reply,
            {
              phoneNumberId:
                receiverPhoneNumberId,
            }
          );
        }

        return res.json(saved);
      }
    }

    if (
      currentStage ===
      "example"
    ) {
      if (
        wantsPreview(
          userMessage
        ) ||
        isSimpleYes(
          userMessage
        )
      ) {
        const {
          previewUrl,
        } =
          await createPreviewForLead(
            lead
          );

        const reply = `Perfeito 😄

Já deixei uma prévia inicial da ${
          lead.empresa
        } pronta:

${previewUrl}

Se fizer sentido, podemos ativar a versão completa da vitrine para sua empresa aparecer com mais destaque e receber clientes da cidade.`;

        await updateAIState(
          conversationId,
          {
            stage:
              "offer",
            last_intent:
              "preview_ready",
            lead_temperature:
              9,
          }
        );

        const saved =
          await service.createMessage(
            {
              conversation_id:
                conversationId,
              role: "assistant",
              message: reply,
              metadata: {
                stage:
                  "offer",
                generated_by:
                  "preview_flow",
              },
            }
          );

        if (phone) {
          await sendText(
            phone,
            reply,
            {
              phoneNumberId:
                receiverPhoneNumberId,
            }
          );
        }

        return res.json(saved);
      }
    }
        /*
    |--------------------------------------------------------------------------
    | OFERTA, FECHAMENTO, GRATUITO E PAGAMENTO
    |--------------------------------------------------------------------------
    */

    const asksPrice =
      normalizedMessage.includes("preco") ||
      normalizedMessage.includes("preço") ||
      normalizedMessage.includes("valor") ||
      normalizedMessage.includes("quanto") ||
      normalizedMessage.includes("plano") ||
      normalizedMessage.includes("mensalidade") ||
      normalizedMessage.includes("ativar");

    const selectedBasicPlan =
      normalizedMessage.includes("19") ||
      normalizedMessage.includes("vitrine inteligente") ||
      normalizedMessage.includes("primeiro plano") ||
      normalizedMessage.includes("mais simples") ||
      normalizedMessage.includes("basico") ||
      normalizedMessage.includes("básico");

    const selectedFullPlan =
      normalizedMessage.includes("49") ||
      normalizedMessage.includes("gestao") ||
      normalizedMessage.includes("gestão") ||
      normalizedMessage.includes("completa") ||
      normalizedMessage.includes("completo");

    if (
      isNegativeOrLater(userMessage) &&
      ["closing", "offer", "payment"].includes(currentStage)
    ) {
      const reply = buildFreeOfferReply(lead);

      await updateAIState(conversationId, {
        stage: "free_offer",
        last_intent: "offered_free_showcase",
        lead_temperature: 6,
      });

      const saved = await service.createMessage({
        conversation_id: conversationId,
        role: "assistant",
        message: reply,
        metadata: {
          stage: "free_offer",
          generated_by: "free_fallback_flow",
        },
      });

      if (phone) {
        await sendText(phone, reply, {
          phoneNumberId: receiverPhoneNumberId,
        });
      }

      return res.json(saved);
    }

    if (
      currentStage === "free_offer" &&
      wantsFreeActivation(userMessage)
    ) {
      await createPreviewForLead(lead);

      const reply = buildFreeActivatedReply(lead);

      await updateAIState(conversationId, {
        stage: "free_active",
        last_intent: "free_showcase_activated",
        lead_temperature: 7,
      });

      await service.updateLead(lead.id, {
        status: "free_showcase_active",
        preview_status: "generated",
        last_message: reply,
      });

      const saved = await service.createMessage({
        conversation_id: conversationId,
        role: "assistant",
        message: reply,
        metadata: {
          stage: "free_active",
          generated_by: "free_activation_flow",
          marketplace_url: MARKETPLACE_URL,
        },
      });

      if (phone) {
        await sendText(phone, reply, {
          phoneNumberId: receiverPhoneNumberId,
        });
      }

      return res.json(saved);
    }
if (
  currentStage !== "payment" &&
  (
    asksPrice ||
    selectedBasicPlan ||
    selectedFullPlan ||
    (
      isSimpleYes(userMessage) &&
      ["closing", "offer", "preview"].includes(currentStage)
    )
  )
) {
      const planCode =
        selectedFullPlan ? "complete_pro" : "store_start"; 

      const reply =
        selectedFullPlan
          ? `Perfeito 😄

A *Gestão Completa* fica *R$ 49,90/mês* e inclui:

✅ vitrine profissional  
✅ loja/catálogo online  
✅ botão direto para WhatsApp  
✅ presença no marketplace local  
✅ controle de pedidos  
✅ caixa, equipe e comissões  

Posso gerar o Pix de ativação agora?`
          : buildPlanOfferReply();

      await updateAIState(conversationId, {
        stage: "payment",
        last_intent:
          planCode === "complete_pro"
            ? "selected_full_plan"
            : "selected_basic_plan",
        lead_temperature: 10,
      });

      const saved = await service.createMessage({
        conversation_id: conversationId,
        role: "assistant",
        message: reply,
        metadata: {
          stage: "payment",
          generated_by: "plan_selection",
          selected_plan: planCode,
        },
      });

      if (phone) {
        await sendText(phone, reply, {
          phoneNumberId: receiverPhoneNumberId,
        });
      }

      return res.json(saved);
    }
if (
  currentStage === "payment" &&
  (
    isSimpleYes(userMessage) ||
    selectedBasicPlan ||
    selectedFullPlan
  )
) {
     const selectedPlan =
  selectedFullPlan || lastIntent === "selected_full_plan"
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
        const preview = await createPreviewForLead(lead);
        profile = preview.previewPage;
      }

      const phoneNumber = lead.whatsapp || lead.telefone || "";

      const { data: usuario, error: usuarioError } =
        await supabase
          .from("usuarios")
          .upsert(
            {
              telefone: phoneNumber,
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
        console.error(
          "Erro ao criar/buscar usuário para pagamento:",
          usuarioError
        );

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
        console.error(
          "Erro ao transferir vitrine para usuário:",
          updateProfileError
        );

        return res.status(500).json({
          error: "Não foi possível vincular a vitrine ao usuário.",
        });
      }

      const payment =
        await createProfilePageSubscriptionPayment({
          user: { id: usuario.id },
          profile: updatedProfile,
          planCode: selectedPlan,
        });

      const reply = `Perfeito 😄

Já deixei tudo pronto.

Assim que o pagamento for confirmado, sua vitrine será ativada automaticamente.

💳 *Pagamento via Pix:*

🔗 ${payment.checkout_url || ""}

📌 *Copia e cola Pix:*
${payment.qr_code || "Pix não gerado."}

Depois que pagar, é só me avisar aqui 👍`;

      await updateAIState(conversationId, {
        stage: "payment_sent",
        last_intent: "payment_generated",
        lead_temperature: 10,
      });

      const saved = await service.createMessage({
        conversation_id: conversationId,
        role: "assistant",
        message: reply,
        metadata: {
          generated_by: "payment_system",
          stage: "payment_sent",
          payment_id: payment.id,
          selected_plan: selectedPlan,
        },
      });

      await service.updateLead(lead.id, {
        status: "payment",
        last_message: reply,
      });

      if (phone) {
        await sendText(phone, reply, {
          phoneNumberId: receiverPhoneNumberId,
        });
      }

      return res.json(saved);
    }

    /*
    |--------------------------------------------------------------------------
    | FALLBACK INTELIGENTE
    |--------------------------------------------------------------------------
    */

    let intent = null;

    try {
      intent = await classifyLeadIntent(userMessage);
    } catch (err) {
      console.error("Erro ao classificar intenção:", err);
    }

    const nextStage =
      intent?.nextStage ||
      currentStage ||
      "interest";

    const updatedAIState = await updateAIState(conversationId, {
      stage: nextStage,
      last_intent: intent?.intent || "fallback",
      lead_temperature: intent?.temperature || 5,
    });

    const history =
      await service.getConversationMessages(conversationId);

    const aiReply =
      await generateConversationReply({
        messages: history,
        stage: updatedAIState.stage,
        lead: {
          ...lead,
          example_url: DEFAULT_EXAMPLE_URL,
          marketplace_url: MARKETPLACE_URL,
        },
      });

    const savedReply = await service.createMessage({
      conversation_id: conversationId,
      role: "assistant",
      message: aiReply,
      metadata: {
        generated_by: "ai",
        stage: updatedAIState.stage,
        intent: intent?.intent || "fallback",
        example_url: DEFAULT_EXAMPLE_URL,
        preview_url: lead.preview_url || null,
      },
    });

    if (phone) {
      await sendText(phone, aiReply, {
        phoneNumberId: receiverPhoneNumberId,
      });
    }

    return res.json(savedReply);
  } catch (err) {
    console.error("Erro em continueConversation:", err);

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
      receiverPhoneNumberId,
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
  empresa: empresa || nome || "Cadastro em andamento",
  telefone: phone,
  whatsapp: phone,
  cidade: extractedCity || cidade || null,
  estado: extractedState || estado || "SE",
  categoria: categoria || "comércio local",
  status: "inbound",
  source: "whatsapp_button_showcase",
  last_message: inboundMessage,
});

    const conversation =
      await service.getOrCreateConversation(lead.id);

    const currentAIState =
  await getOrCreateAIState(conversation.id);

const onboardingIncomplete =
  !lead.empresa ||
  lead.empresa === "Nova empresa" ||
  lead.empresa === "Cadastro em andamento" ||
  !lead.whatsapp ||
  !lead.cidade ||
  !lead.estado ||
  !lead.categoria ||
  lead.categoria === "comércio local";

const onboardingStages = [
  "onboarding_name",
  "onboarding_phone",
  "onboarding_city",
  "onboarding_category",
];

if (isGreetingOnly(inboundMessage) && !isDirectShowcaseRequest(inboundMessage)) {
  await updateAIState(conversation.id, {
    stage: "greeting",
    last_intent: "marketplace_greeting",
    lead_temperature: 1,
  });

  const reply = buildMarketplaceGreeting();

  await service.createMessage({
    conversation_id: conversation.id,
    role: "assistant",
    message: reply,
    metadata: {
      stage: "greeting",
      generated_by: "marketplace_greeting",
    },
  });

  await sendText(phone, reply, {
    phoneNumberId:
      receiverPhoneNumberId ||
      process.env.WHATSAPP_PHONE_ID,
  });

  return res.json({
    greeting: true,
    stage: "greeting",
    conversation,
    lead,
  });
}

if (onboardingStages.includes(currentAIState?.stage)) {
  const fakeReq = {
    params: {
      conversationId: conversation.id,
    },
    body: {
      message: inboundMessage,
      receiverPhoneNumberId:
        receiverPhoneNumberId ||
        process.env.WHATSAPP_PHONE_ID,
    },
  };

  const fakeRes = {
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return payload;
    },
  };

  await continueConversation(fakeReq, fakeRes);

  return res.json({
    continued: true,
    conversation,
    response: fakeRes.payload,
  });
}

if (onboardingIncomplete) {
  const replyStage = currentAIState?.stage;

  if (onboardingStages.includes(replyStage)) {
    const fakeReq = {
      params: {
        conversationId: conversation.id,
      },
      body: {
        message: inboundMessage,
        receiverPhoneNumberId:
          receiverPhoneNumberId || process.env.WHATSAPP_PHONE_ID,
      },
    };

    return continueConversation(fakeReq, res);
  }

  await updateAIState(conversation.id, {
    stage: "onboarding_name",
    last_intent: "collect_business_name",
    lead_temperature: 5,
  });

  const reply = `Perfeito 😄

Antes de montar sua vitrine, me fala:

Qual é o *nome comercial da empresa ou serviço*?`;

  await service.createMessage({
    conversation_id: conversation.id,
    role: "assistant",
    message: reply,
    metadata: {
      stage: "onboarding_name",
      generated_by: "inbound_onboarding_start",
    },
  });

  await sendText(phone, reply, {
    phoneNumberId:
      receiverPhoneNumberId ||
      process.env.WHATSAPP_PHONE_ID,
  });

  return res.json({
    onboarding: true,
    stage: "onboarding_name",
    conversation,
    lead,
  });
}

const alreadyStarted =
  currentAIState?.last_intent &&
  currentAIState?.last_intent !== "initial_greeting";

if (alreadyStarted) {
  const fakeReq = {
    params: {
      conversationId: conversation.id,
    },
    body: {
      message: inboundMessage,
      receiverPhoneNumberId:
        receiverPhoneNumberId ||
        process.env.WHATSAPP_PHONE_ID,
    },
  };

  const fakeRes = {
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return payload;
    },
  };

  await continueConversation(fakeReq, fakeRes);

  return res.json({
    continued: true,
    conversation,
    response: fakeRes.payload,
  });
}
    await updateAIState(conversation.id, {
      stage: "closing",
      last_intent: "inbound_showcase_request",
      lead_temperature: 8,
    });

    await service.createMessage({
      conversation_id: conversation.id,
      role: "user",
      message: inboundMessage,
      metadata: {
        source: "whatsapp_button_showcase",
        inbound: true,
      },
    });

    const aiMessage =
      isGreetingOnly(inboundMessage)
        ? buildMarketplaceGreeting()
        : buildDirectClosingReply(lead);

    const savedReply = await service.createMessage({
      conversation_id: conversation.id,
      role: "assistant",
      message: aiMessage,
      metadata: {
        generated_by: "inbound_showcase_flow",
        stage: isGreetingOnly(inboundMessage)
          ? "greeting"
          : "closing",
      },
    });

    await sendText(phone, aiMessage, {
      phoneNumberId:
        receiverPhoneNumberId ||
        process.env.WHATSAPP_PHONE_ID,
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
    console.error("Erro em getProspectionQueue:", err);

    return res.status(500).json({
      error: err.message,
    });
  }
}

export async function startQueueProspection(req, res) {
  try {
    const limit = Number(req.body.limit || 5);

    const leads =
      await service.getReadyToContactLeads(limit);

    const results = [];

    for (const lead of leads) {
      const fakeReq = {
        params: {
          leadId: lead.id,
        },
      };

      const fakeRes = {
        status(code) {
          this.statusCode = code;
          return this;
        },
        json(payload) {
          this.payload = payload;
          return payload;
        },
      };

      await startProspection(fakeReq, fakeRes);

      results.push({
        lead: lead.empresa,
        whatsapp: lead.whatsapp,
        response: fakeRes.payload,
      });
    }

    return res.json({
      success: true,
      total: results.length,
      results,
    });
  } catch (err) {
    console.error("Erro em startQueueProspection:", err);

    return res.status(500).json({
      error: err.message,
    });
  }
}