// src/lib/pageGenerator.js

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const PEXELS_API_KEY = process.env.PEXELS_API_KEY;
const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;

const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";

function normalizeSlug(value = "") {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

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

function cleanText(value = "", fallback = "") {
  const text = String(value || "").trim();
  return text || fallback;
}
function removeCidadeDoServico(servico = "", cidade = "", estado = "") {
  let text = String(servico || "").trim();
  const city = String(cidade || "").trim();
  const uf = String(estado || "").trim();

  if (!text) return "";

  if (city) {
    const escapedCity = city.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    text = text.replace(new RegExp(`\\s+em\\s+${escapedCity}\\b`, "gi"), "");
    text = text.replace(new RegExp(`\\s+-\\s+${escapedCity}\\b`, "gi"), "");
  }

  if (uf) {
    const escapedUf = uf.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    text = text.replace(new RegExp(`\\s*/\\s*${escapedUf}\\b`, "gi"), "");
    text = text.replace(new RegExp(`\\s*-\\s*${escapedUf}\\b`, "gi"), "");
  }

  return text.replace(/\s{2,}/g, " ").trim();
}
function pick(arr = []) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function normalizeImageUrl(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    return value.url || value.publicUrl || value.src?.large || value.urls?.regular || "";
  }
  return "";
}

function buildSearchTerms(user = {}) {
  const area = user.area_principal || "";
  const categoria = user.categoria_principal || "";
  const nome = user.nome_empresa || user.nome || "";
  const cidade = user.cidade || "";

  const base = `${categoria} ${area} profissional ${cidade}`.trim();

  return [
    base,
    `${categoria} service professional`,
    `${area} profissional`,
    nome,
  ].filter(Boolean);
}

async function searchPexelsImage(query) {
  if (!PEXELS_API_KEY || !query) return null;

  try {
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(
      query
    )}&per_page=8&orientation=landscape&locale=pt-BR`;

    const res = await fetch(url, {
      headers: {
        Authorization: PEXELS_API_KEY,
      },
    });

    if (!res.ok) return null;

    const data = await res.json();
    const photos = Array.isArray(data.photos) ? data.photos : [];

    if (!photos.length) return null;

    const photo = pick(photos);

    return (
      photo?.src?.large2x ||
      photo?.src?.large ||
      photo?.src?.medium ||
      null
    );
  } catch (err) {
    console.error("Erro Pexels:", err.message);
    return null;
  }
}

async function searchUnsplashImage(query) {
  if (!UNSPLASH_ACCESS_KEY || !query) return null;

  try {
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(
      query
    )}&per_page=8&orientation=landscape&content_filter=high`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`,
      },
    });

    if (!res.ok) return null;

    const data = await res.json();
    const results = Array.isArray(data.results) ? data.results : [];

    if (!results.length) return null;

    const photo = pick(results);

    return photo?.urls?.regular || photo?.urls?.full || null;
  } catch (err) {
    console.error("Erro Unsplash:", err.message);
    return null;
  }
}

async function findImage(query) {
  const pexels = await searchPexelsImage(query);
  if (pexels) return pexels;

  const unsplash = await searchUnsplashImage(query);
  if (unsplash) return unsplash;

  return "";
}

async function findImagesForProfile(user = {}) {
  const terms = buildSearchTerms(user);

  const hero =
    (await findImage(terms[0])) ||
    (await findImage(terms[1])) ||
    "";

  const about =
    (await findImage(terms[2])) ||
    hero ||
    "";

  const gallery1 =
    (await findImage(`${terms[0]} trabalho resultado`)) ||
    hero ||
    "";

  const gallery2 =
    (await findImage(`${terms[0]} cliente serviço`)) ||
    about ||
    hero ||
    "";

  return {
    logo_url: "",
    hero_image_url: normalizeImageUrl(hero),
    about_image_url: normalizeImageUrl(about),
    gallery: [
      gallery1
        ? {
            id: "gallery-1",
            url: normalizeImageUrl(gallery1),
            title: "Trabalho realizado",
            active: true,
          }
        : null,
      gallery2
        ? {
            id: "gallery-2",
            url: normalizeImageUrl(gallery2),
            title: "Resultado profissional",
            active: true,
          }
        : null,
    ].filter(Boolean),
  };
}

function fallbackProfile(user = {}, images = {}) {
  const nome = user.nome_empresa || user.nome || "Profissional RendaJá";
  const categoria = user.categoria_principal || user.area_principal || "serviços";
  const cidade = user.cidade || "sua região";
  const estado = user.estado || "";

  return {
    nome,
    slug: normalizeSlug(nome),
    servico: categoria,
    cidade,
    estado,
    descricao: `${nome} oferece atendimento profissional em ${cidade}${estado ? `-${estado}` : ""}, com qualidade, confiança e contato direto pelo WhatsApp.`,
    seo_title: `${categoria} em ${cidade}${estado ? `-${estado}` : ""} | ${nome} | RendaJá`,
    seo_description: `${nome} atende como ${categoria} em ${cidade}${estado ? `-${estado}` : ""}. Veja serviços, informações, fotos e fale direto pelo WhatsApp pelo RendaJá.`,
    seo_content: `${nome} está disponível no RendaJá como ${categoria} em ${cidade}${estado ? `-${estado}` : ""}. Nesta página você encontra informações sobre atendimento, serviços, fotos, avaliações e contato direto pelo WhatsApp.`,
    seo_keywords: [
      `${categoria} em ${cidade}${estado ? `-${estado}` : ""}`,
      `${categoria} ${cidade}`,
      `profissional em ${cidade}`,
      `serviços em ${cidade}`,
      `${nome} em ${cidade}`,
      `perfil profissional no RendaJá`,
    ],
    seo_tags: [
      categoria,
      cidade,
      estado,
      "Perfil profissional",
      "Atendimento local",
      "Contato pelo WhatsApp",
    ].filter(Boolean),
    primary_color: "#d9a84e",
    secondary_color: "#06111d",
    accent_color: "#f5d28b",
    background_color: "#f7f3ed",
    text_color: "#07111f",

    hero_bg_color: "#06111d",
    topbar_bg_color: "#06111d",
    hero_overlay_color: "#06111d",
    about_bg_color: "#f7f3ed",
    portfolio_bg_color: "#06111d",
    reviews_bg_color: "#f7f3ed",
    store_bg_color: "#ffffff",
    store_text_color: "#07111f",
    services_bg_color: "#f7f3ed",
    services_text_color: "#07111f",
    cta_bg_color: "#d9a84e",

    hero_kicker: "Atendimento profissional com confiança",

    about_title: "Sobre meu trabalho",
    about_text: `Sou ${nome} e atendo em ${cidade}. Meu foco é entregar um serviço bem feito, com clareza, responsabilidade e facilidade para o cliente.`,

    services_title: "Serviços",
    services_text: "Conheça algumas soluções que posso oferecer.",
    services_items: [
      {
        id: "service-1",
        icon: "✅",
        title: "Atendimento profissional",
        description: "Serviço feito com cuidado, clareza e compromisso.",
        active: true,
      },
      {
        id: "service-2",
        icon: "📲",
        title: "Contato direto",
        description: "Fale pelo WhatsApp para tirar dúvidas e solicitar orçamento.",
        active: true,
      },
      {
        id: "service-3",
        icon: "⭐",
        title: "Qualidade no resultado",
        description: "Foco em entregar uma experiência confiável para cada cliente.",
        active: true,
      },
    ],

    store_title: "Escolha o que você precisa",
    store_text: "Veja as opções disponíveis e solicite direto pelo WhatsApp.",
    store_categories: [
      {
        id: "category-1",
        name: "Serviços",
        active: true,
      },
    ],
    store_items: [
      {
        id: "item-1",
        type: "service",
        title: "Orçamento personalizado",
        description: "Solicite uma avaliação conforme sua necessidade.",
        price: 0,
        price_type: "quote",
        category_id: "category-1",
        active: true,
        booking_enabled: false,
        duration_minutes: 60,
      },
    ],

    gallery: images.gallery || [],

    cta_title: "Pronto para contratar com confiança?",
    cta_text: "Fale agora pelo WhatsApp e solicite seu orçamento.",
    cta_button_text: "Falar agora",
    cta_action_type: "whatsapp",
    cta_custom_link: "",
  };
}

async function generateAIProfile(user = {}, images = {}) {
  if (!OPENAI_API_KEY) {
    return fallbackProfile(user, images);
  }

  const prompt = `
Você é uma IA silenciosa do sistema RendaJá Pages.

Sua função é criar uma página profissional completa usando poucos dados do usuário.

Dados do usuário:
${JSON.stringify(
  {
    nome: user.nome,
    nome_empresa: user.nome_empresa,
    telefone: user.telefone,
    tipo: user.tipo,
    cidade: user.cidade,
    estado: user.estado,
    area_principal: user.area_principal,
    categoria_principal: user.categoria_principal,
    subcategorias_temp: user.subcategorias_temp,
  },
  null,
  2
)}

Crie um JSON puro, sem markdown, com estes campos:

{
  "nome": "",
  "slug": "",
  "servico": "",
  "descricao": "",
  "primary_color": "",
  "secondary_color": "",
  "accent_color": "",
  "background_color": "",
  "text_color": "",
  "hero_bg_color": "",
  "topbar_bg_color": "",
  "hero_overlay_color": "",
  "about_bg_color": "",
  "portfolio_bg_color": "",
  "reviews_bg_color": "",
  "store_bg_color": "",
  "store_text_color": "",
  "services_bg_color": "",
  "services_text_color": "",
  "cta_bg_color": "",
  "hero_kicker": "",
  "about_title": "",
  "about_text": "",
  "services_title": "",
  "services_text": "",
  "services_items": [],
  "store_title": "",
  "store_text": "",
  "store_categories": [],
  "store_items": [],
  "cta_title": "",
  "cta_text": "",
  "cta_button_text": "",
  "seo_title": "",
  "seo_description": "",
  "seo_content": "",
  "seo_keywords": [],
  "seo_tags": []
}

Regras:
- Responda somente JSON válido.
- Use português do Brasil.
- Pense nas cores como um designer. Não use sempre as mesmas cores para a mesma área.
- As cores precisam ter contraste bom.
- Crie 3 serviços em services_items.
- Crie 1 categoria em store_categories.
- Crie 2 itens em store_items.

- Use emojis nos serviços.
- Não invente dados sensíveis.
- Crie seo_title com foco em serviço + cidade + estado + nome + RendaJá.
- Crie seo_description com até 160 caracteres, natural e vendável.
- Crie seo_content com 2 parágrafos curtos, naturais, usando serviço, cidade, estado, nome e RendaJá.
- Crie seo_keywords com 10 a 18 variações úteis de busca local.
- Crie seo_tags com 6 a 10 tags curtas.
- Não faça keyword stuffing. As palavras-chave devem parecer naturais.
- Inclua variações como: serviço em cidade, contratar serviço, profissional em cidade, atendimento em cidade, empresa em cidade, página profissional no RendaJá.
- Não use imagens no JSON.
- O slug deve ser curto e amigável.
- store_items deve ter id, type, title, description, price, price_type, category_id, active, booking_enabled, duration_minutes.
- price_type pode ser "fixed" ou "quote".

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
        temperature: 0.9,
        messages: [
          {
            role: "system",
            content:
              "Você gera páginas profissionais completas para pequenos negócios brasileiros. Responda apenas JSON válido.",
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
      console.error("Erro OpenAI pageGenerator:", data);
      return fallbackProfile(user, images);
    }

    const content = data?.choices?.[0]?.message?.content;
    const parsed = safeJsonParse(content);

    if (!parsed) {
      console.error("JSON inválido da IA:", content);
      return fallbackProfile(user, images);
    }

    return parsed;
  } catch (err) {
    console.error("Erro geral OpenAI pageGenerator:", err);
    return fallbackProfile(user, images);
  }
}

function normalizeGeneratedProfile(ai = {}, user = {}, images = {}) {
  const nome = cleanText(ai.nome, user.nome_empresa || user.nome || "Profissional RendaJá");
  const slug = normalizeSlug(ai.slug || nome);
  const cidade = cleanText(user.cidade, "");
  const estado = cleanText(user.estado, "");
const servicoBase = cleanText(
  ai.servico,
  user.categoria_principal || user.area_principal || "Serviços profissionais"
);

const servicoLimpo = removeCidadeDoServico(servicoBase, cidade, estado);
  const servicesItems = Array.isArray(ai.services_items)
    ? ai.services_items.slice(0, 6).map((item, index) => ({
        id: item.id || `service-${index + 1}`,
        icon: item.icon || "⭐",
        title: cleanText(item.title, `Serviço ${index + 1}`),
        description: cleanText(item.description, "Serviço profissional disponível."),
        active: item.active !== false,
      }))
    : fallbackProfile(user, images).services_items;

  const storeCategories = Array.isArray(ai.store_categories) && ai.store_categories.length
    ? ai.store_categories.map((cat, index) => ({
        id: cat.id || `category-${index + 1}`,
        name: cleanText(cat.name, "Serviços"),
        active: cat.active !== false,
      }))
    : [{ id: "category-1", name: "Serviços", active: true }];

  const firstCategoryId = storeCategories[0]?.id || "category-1";

  const storeItems = Array.isArray(ai.store_items)
    ? ai.store_items.slice(0, 6).map((item, index) => ({
        id: item.id || `item-${index + 1}`,
        type: item.type === "product" ? "product" : "service",
        title: cleanText(item.title, `Item ${index + 1}`),
        description: cleanText(item.description, "Solicite mais informações pelo WhatsApp."),
        price: Number(item.price || 0),
        price_type: item.price_type === "fixed" ? "fixed" : "quote",
        category_id: item.category_id || firstCategoryId,
        active: item.active !== false,
        booking_enabled: item.booking_enabled === true,
        duration_minutes: Number(item.duration_minutes || 60),
        image_url: "",
      }))
    : fallbackProfile(user, images).store_items;

  const previewExpiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

return {
  user_id: user.id,

  is_active: false,
  is_preview: true,
  preview_expires_at: previewExpiresAt,
  activated_at: null,

    slug,
    nome,
    servico: servicoLimpo,
    cidade,
    estado,
    descricao: cleanText(ai.descricao, fallbackProfile(user, images).descricao),
        seo_title: cleanText(
      ai.seo_title,
      `${cleanText(ai.servico, user.categoria_principal || user.area_principal || "Profissional")} em ${cidade}${estado ? `-${estado}` : ""} | ${nome} | RendaJá`
    ),

    seo_description: cleanText(
      ai.seo_description,
      `${nome} atende como ${cleanText(ai.servico, user.categoria_principal || user.area_principal || "profissional")} em ${cidade}${estado ? `-${estado}` : ""}. Veja serviços e fale pelo WhatsApp.`
    ),

    seo_content: cleanText(
      ai.seo_content,
      `${nome} está disponível no RendaJá como ${cleanText(ai.servico, user.categoria_principal || user.area_principal || "profissional")} em ${cidade}${estado ? `-${estado}` : ""}. Nesta página você encontra informações sobre atendimento, serviços, fotos, avaliações e contato direto pelo WhatsApp.`
    ),

    seo_keywords: Array.isArray(ai.seo_keywords)
      ? ai.seo_keywords.slice(0, 20).map((item) => cleanText(item)).filter(Boolean)
      : [
          `${cleanText(ai.servico, user.categoria_principal || user.area_principal || "profissional")} em ${cidade}${estado ? `-${estado}` : ""}`,
          `${cleanText(ai.servico, user.categoria_principal || user.area_principal || "profissional")} ${cidade}`,
          `profissional em ${cidade}`,
          `serviços em ${cidade}`,
          `${nome} em ${cidade}`,
          `perfil profissional no RendaJá`,
        ],

    seo_tags: Array.isArray(ai.seo_tags)
      ? ai.seo_tags.slice(0, 12).map((item) => cleanText(item)).filter(Boolean)
      : [
          cleanText(ai.servico, user.categoria_principal || user.area_principal || "Profissional"),
          cidade,
          estado,
          "Perfil profissional",
          "Atendimento local",
          "Contato pelo WhatsApp",
        ].filter(Boolean),
    whatsapp: user.telefone || user.phone || "",

    logo_url: images.logo_url || "",
    hero_image_url: images.hero_image_url || "",
    about_image_url: images.about_image_url || "",

    primary_color: cleanText(ai.primary_color, "#d9a84e"),
    secondary_color: cleanText(ai.secondary_color, "#06111d"),
    accent_color: cleanText(ai.accent_color, "#f5d28b"),
    background_color: cleanText(ai.background_color, "#f7f3ed"),
    text_color: cleanText(ai.text_color, "#07111f"),

    hero_bg_color: cleanText(ai.hero_bg_color, ai.secondary_color || "#06111d"),
    topbar_bg_color: cleanText(ai.topbar_bg_color, ai.secondary_color || "#06111d"),
    hero_overlay_color: cleanText(ai.hero_overlay_color, ai.hero_bg_color || "#06111d"),
    about_bg_color: cleanText(ai.about_bg_color, ai.background_color || "#f7f3ed"),
    portfolio_bg_color: cleanText(ai.portfolio_bg_color, ai.secondary_color || "#06111d"),
    reviews_bg_color: cleanText(ai.reviews_bg_color, ai.background_color || "#f7f3ed"),
    store_bg_color: cleanText(ai.store_bg_color, "#ffffff"),
    store_text_color: cleanText(ai.store_text_color, ai.text_color || "#07111f"),
    services_bg_color: cleanText(ai.services_bg_color, ai.background_color || "#f7f3ed"),
    services_text_color: cleanText(ai.services_text_color, ai.text_color || "#07111f"),
    cta_bg_color: cleanText(ai.cta_bg_color, ai.primary_color || "#d9a84e"),

    show_about: true,
    show_services: true,
    show_portfolio: true,
    show_reviews: true,
    show_store: true,
    show_booking: false,
    show_final_cta: true,

    font_heading: "Georgia",
    font_body: "Inter",

    hero_kicker: cleanText(ai.hero_kicker, "Atendimento profissional com confiança"),

    about_title: cleanText(ai.about_title, "Sobre meu trabalho"),
    about_text: cleanText(ai.about_text, fallbackProfile(user, images).about_text),

    services_title: cleanText(ai.services_title, "Serviços"),
    services_text: cleanText(ai.services_text, "Conheça as principais soluções disponíveis."),
    services_items: servicesItems,

    gallery: Array.isArray(images.gallery) ? images.gallery : [],

    store_title: cleanText(ai.store_title, "Escolha o que você precisa"),
    store_text: cleanText(ai.store_text, "Veja as opções disponíveis e solicite direto pelo WhatsApp."),
    store_categories: storeCategories,
    store_items: storeItems,

    cta_title: cleanText(ai.cta_title, "Pronto para contratar com confiança?"),
    cta_text: cleanText(ai.cta_text, "Fale comigo agora pelo WhatsApp e solicite seu orçamento."),
    cta_button_text: cleanText(ai.cta_button_text, "Falar agora"),
    cta_action_type: "whatsapp",
    cta_custom_link: "",

    updated_at: new Date().toISOString(),
created_by_ai: true,
  };
}

export async function generateProfilePagePayload(user = {}) {
  const images = await findImagesForProfile(user);
  const aiProfile = await generateAIProfile(user, images);

  return normalizeGeneratedProfile(aiProfile, user, images);
}

export async function createOrUpdateProfilePage({ supabase, user }) {
  if (!supabase) {
    throw new Error("Supabase não informado.");
  }

  if (!user?.id) {
    throw new Error("Usuário inválido para gerar página.");
  }

  const payload = await generateProfilePagePayload(user);

  const { data: existing } = await supabase
  .from("profiles_pages")
  .select("id,is_active")
  .eq("user_id", user.id)
  .maybeSingle();

const finalPayload = {
  ...payload,
  is_active: existing?.is_active === true ? true : false,
  is_preview: existing?.is_active === true ? false : true,
  preview_expires_at:
    existing?.is_active === true
      ? null
      : new Date(Date.now() + 5 * 60 * 1000).toISOString(),
};

const { data, error } = await supabase
  .from("profiles_pages")
  .upsert(finalPayload, {
    onConflict: "user_id",
  })
  .select("*")
  .single();

  if (error) {
    console.error("Erro ao salvar profiles_pages:", error);
    throw error;
  }

  return data;
}