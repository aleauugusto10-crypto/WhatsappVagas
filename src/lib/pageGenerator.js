// src/lib/pageGenerator.js

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const PEXELS_API_KEY = process.env.PEXELS_API_KEY;
const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;

const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";
const OPENAI_VISION_MODEL = process.env.OPENAI_VISION_MODEL || "gpt-4.1-mini";
const ALLOWED_SERVICE_EMOJIS = [
  ...new Set([
    "⭐","✅","🔥","💼","🛠️","📦","🏠","🚗","📱","💰",
    "🔧","🔨","🪛","🪚","🧰","⚙️","🔩","🧱","🚧","⚡","💡","🔌","🚿","🚰","🧯","🪠","🧹","🧼","🧽","🪣","🧺","🧴","🧻","🪒","✂️","💈","💅","💄","👗","👔","👞","🧵","🪡","🧶","🧷","🧑‍🍳","🍽️","🥘","🍳","📸","🎥","🎬","🎤","🎧","🎨","🖌️","🖼️","🖥️","💻","🖨️","⌨️","🖱️","📡","📚","🧾","📄","📑","📝",
    "👷","👷‍♂️","👷‍♀️","🧑‍🔧","👨‍🔧","👩‍🔧","🧑‍🏭","👨‍🏭","👩‍🏭","🧑‍💼","👨‍💼","👩‍💼","🧑‍💻","👨‍💻","👩‍💻","👨‍🍳","👩‍🍳","🧑‍⚕️","👨‍⚕️","👩‍⚕️","🧑‍🏫","👨‍🏫","👩‍🏫","🧑‍⚖️","👨‍⚖️","👩‍⚖️","🧑‍🌾","👨‍🌾","👩‍🌾","🧑‍🎨","👨‍🎨","👩‍🎨","🧑‍✈️","👨‍✈️","👩‍✈️","🧑‍🚒","👨‍🚒","👩‍🚒","🧑‍🔬","👨‍🔬","👩‍🔬","🧑‍🚀","👨‍🚀","👩‍🚀","👮","👮‍♂️","👮‍♀️","🕵️","🕵️‍♂️","🕵️‍♀️","💂","💂‍♂️","💂‍♀️",
    "🛒","🛍️","🏷️","💳","💵","📫","📬","🚚","🚛","🚐","🏪","🏬","🏢","🏭","🏦","💎","👑","🎁","🎀","🪑","🛋️","🛏️","🪞","🚪","🪟","🧸","👕","👖","👚","🧥","🥼","🦺","👟","👠","👜","🎒","🧢","⌚","💍","🪥",
    "🏡","🏘️","🏚️","🏗️","🚽","🛁","🪴","🌿","🌱","🌳","🌵","🌷","🌹","🌻","🌼","🍃","💧","🔒","🔑","🗝️","🪜",
    "🚕","🚙","🚌","🚎","🏎️","🚓","🚑","🚒","🛻","🚜","🏍️","🛵","🚲","🛴","🛺","🚂","🚆","🚇","🚊","✈️","🛫","🛬","🚁","🚤","⛵","🛥️","🚢","⚓","⛽","🛞","🚦","🚥","🛣️","🗺️","📍","📌",
    "🏥","⚕️","🩺","💊","💉","🩹","🩼","🦷","🦴","👁️","👂","🧠","🫀","🫁","🧬","🦠","🧪","🌡️","🧫","😷","🤒","🤕","🤧","🛌","🧘",
    "🍴","🥄","🔪","🍲","🍛","🍜","🍝","🍕","🍔","🍟","🌭","🥪","🌮","🌯","🥗","🍱","🍣","🍤","🍙","🍚","🍘","🥟","🥠","🥡","🍞","🥐","🥖","🥨","🧀","🥚","🥓","🥩","🍗","🍖","🌽","🥕","🍅","🍎","🍌","🍓","🍇","🍉","🍰","🎂","🧁","☕","🥤",
    "🤝","👍","👏","🙌","🙏","💪","👋","👌","✌️","🤙","🙂","😄","😁","😊","😍","🤩","😎","🥳","😇","😉","👨","👩","🧑","👴","👵","👦","👧","👶","🧔","👱","👥","🫂","💬","📞","📲","📢","📣","💌","❤️","💙",
    "☑️","✔️","❌","❎","⚠️","🚨","🔔","🌟","✨","💥","💫","🎯","🏆","🥇","🔎","🔓","🛡️","⚖️","♻️","🔁","🔄","⬆️","⬇️","➡️","⬅️","🔝","🆕","🆗","🆒","🆓","💯",
    "🌴","🍀","🌾","🌺","🌸","🌞","🌝","🌛","🌈","☁️","⛅","🌧️","⛈️","🌊","❄️","☃️","🌪️","🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐷","🐮","🐔","🐦","🐴","🐝","🦋","🐞","🐟","🐠","🐢","🦜"
  ])
];

function safeServiceEmoji(value, fallback = "⭐") {
  const emoji = String(value || "").trim();
  return ALLOWED_SERVICE_EMOJIS.includes(emoji) ? emoji : fallback;
}

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
function buildReferenceImageContent(referenceImageUrl) {
  if (!referenceImageUrl) return null;

  return {
    type: "image_url",
    image_url: {
      url: referenceImageUrl,
    },
  };
}
function cleanText(value = "", fallback = "") {
  const text = String(value || "").trim();
  return text || fallback;
}
function getSafeHeroPalette(user = {}, ai = {}) {
  const categoria = String(
    user.categoria_principal ||
    user.area_principal ||
    ai.servico ||
    ""
  ).toLowerCase();

  if (
    categoria.includes("hamb") ||
    categoria.includes("lanche") ||
    categoria.includes("food") ||
    categoria.includes("restaurante") ||
    categoria.includes("pizz")
  ) {
    return {
      primary_color: "#f97316",
      secondary_color: "#120807",
      accent_color: "#facc15",
      hero_bg_color: "#160807",
      topbar_bg_color: "#0b0504",
      hero_overlay_color: "rgba(22, 8, 7, 0.74)",
    };
  }

  if (
    categoria.includes("beleza") ||
    categoria.includes("salão") ||
    categoria.includes("salao") ||
    categoria.includes("estet")
  ) {
    return {
      primary_color: "#d946ef",
      secondary_color: "#16051a",
      accent_color: "#f5d0fe",
      hero_bg_color: "#1a071f",
      topbar_bg_color: "#0f0312",
      hero_overlay_color: "rgba(26, 7, 31, 0.72)",
    };
  }

  if (
    categoria.includes("constru") ||
    categoria.includes("pedreiro") ||
    categoria.includes("reforma") ||
    categoria.includes("obra")
  ) {
    return {
      primary_color: "#d9a84e",
      secondary_color: "#11100c",
      accent_color: "#f5d28b",
      hero_bg_color: "#12100b",
      topbar_bg_color: "#080806",
      hero_overlay_color: "rgba(18, 16, 11, 0.74)",
    };
  }

  return {
    primary_color: "#25d366",
    secondary_color: "#06111d",
    accent_color: "#d9a84e",
    hero_bg_color: "#06111d",
    topbar_bg_color: "#030812",
    hero_overlay_color: "rgba(6, 17, 29, 0.74)",
  };
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
function buildFakeLogoUrl(user = {}) {
  const ramo =
    user.ramo_empresa ||
    user.categoria_principal ||
    user.area_principal ||
    user.servico_principal ||
    user.nome_empresa ||
    user.nome ||
    "negócio local";

  return `https://source.unsplash.com/512x512/?${encodeURIComponent(
    `${ramo} logo icon`
  )}`;
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
  const categoria =
    user.ramo_empresa ||
    user.categoria_principal ||
    user.area_principal ||
    user.servico_principal ||
    user.workArea ||
    "negócio local";

  const cidade = user.cidade || "";
  const estado = user.estado || "";

  const normalized = String(categoria).toLowerCase();
const nicheMap = {
  pizzaria: [
    "pizza restaurante pizzaria",
    "pizza artesanal forno lenha",
    "pizzaria ambiente comida",
    "pizza delivery",
  ],

  restaurante: [
    "restaurante comida brasileira",
    "prato restaurante gourmet",
    "restaurante ambiente elegante",
    "chef cozinha restaurante",
  ],

  hamburgueria: [
    "hamburguer artesanal restaurante",
    "burger gourmet",
    "hamburgueria ambiente",
    "hamburguer delivery",
  ],

  lanchonete: [
    "lanchonete brasileira",
    "snack bar food",
    "lanchonete atendimento",
    "comida rápida brasileira",
  ],

  açai: [
    "acai bowl food",
    "loja de acai",
    "acai delivery",
    "sobremesa acai",
  ],

  padaria: [
    "padaria artesanal",
    "bakery breads",
    "padaria interior",
    "pães doces salgados",
  ],

  cafeteria: [
    "cafeteria café especial",
    "coffee shop cozy",
    "cafeteria ambiente",
    "espresso coffee",
  ],

  farmácia: [
    "farmacia moderna",
    "drugstore pharmacy",
    "farmacia atendimento",
    "medicamentos farmacia",
  ],

  clínica: [
    "clinica médica moderna",
    "medical clinic professional",
    "consultório médico",
    "saúde atendimento",
  ],

  dentista: [
    "dentista consultório odontológico",
    "clínica odontológica",
    "dentista atendimento",
    "odontologia profissional",
  ],

  academia: [
    "academia musculação",
    "fitness gym treino",
    "academia moderna",
    "personal trainer academia",
  ],

  barbearia: [
    "barbearia corte masculino",
    "barbershop premium",
    "barbeiro profissional",
    "barbearia interior",
  ],

  salão: [
    "salão de beleza profissional",
    "beauty salon premium",
    "cabelo maquiagem beleza",
    "estética feminina",
  ],

  estética: [
    "estética facial corporal",
    "beauty clinic luxury",
    "procedimentos estéticos",
    "spa estética",
  ],

  petshop: [
    "pet shop animais",
    "pet grooming dog cat",
    "pet care professional",
    "banho e tosa",
  ],

  oficina: [
    "oficina mecânica automotiva",
    "car repair garage",
    "mecânico profissional",
    "automotive service",
  ],

  auto: [
    "auto elétrica oficina",
    "car electrical repair",
    "mecânico automotivo",
    "automotive garage",
  ],

  material: [
    "material construção loja",
    "construction materials store",
    "ferramentas construção",
    "obra construção",
  ],

  papelaria: [
    "papelaria escolar escritório",
    "stationery shop",
    "materiais escolares",
    "papelaria moderna",
  ],

  ótica: [
    "ótica óculos profissional",
    "optical store eyewear",
    "óculos atendimento",
    "vision optical",
  ],

  roupa: [
    "loja roupas fashion",
    "boutique clothing store",
    "moda feminina masculina",
    "fashion retail",
  ],

  mercado: [
    "mercado supermercado",
    "grocery store interior",
    "supermercado alimentos",
    "market shelves",
  ],

  advogado: [
    "advogado escritório advocacia",
    "law office luxury",
    "escritório jurídico",
    "advocacia atendimento",
  ],

  imobiliária: [
    "real estate office",
    "imobiliária moderna",
    "corretor imóveis",
    "property agency",
  ],

  hotel: [
    "hotel luxury interior",
    "hotel reception",
    "hotel room premium",
    "hospitality business",
  ],

  pousada: [
    "pousada brasileira",
    "inn cozy hospitality",
    "quarto pousada",
    "hotel pequeno aconchegante",
  ],

  escola: [
    "escola educação moderna",
    "classroom school",
    "educação infantil",
    "teacher classroom",
  ],

  curso: [
    "curso profissionalizante",
    "training classroom",
    "educação profissional",
    "online education",
  ],
};

  let nicheTerms = [];

  for (const key of Object.keys(nicheMap)) {
    if (normalized.includes(key)) {
      nicheTerms = nicheMap[key];
      break;
    }
  }

  if (!nicheTerms.length) {
    nicheTerms = [
      `${categoria} profissional`,
      `${categoria} atendimento`,
      `${categoria} fachada`,
      `${categoria} serviço`,
    ];
  }

  return [
    `${categoria} ${cidade} ${estado}`.trim(),
    ...nicheTerms,
  ];
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
const logo =
  (await findImage(`${user.categoria_principal || user.ramo_empresa} logo marca`)) ||
  (await findImage(`${user.categoria_principal || user.ramo_empresa} ícone`)) ||
  hero ||
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
  logo_url: normalizeImageUrl(logo),
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
  const nome = user.nome_empresa || user.nome || "Profissional CompreTudo.shop";
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
    seo_title: `${categoria} em ${cidade}${estado ? `-${estado}` : ""} | ${nome} | CompreTudo.shop`,
    seo_description: `${nome} atende como ${categoria} em ${cidade}${estado ? `-${estado}` : ""}. Veja serviços, informações, fotos e fale direto pelo WhatsApp pelo CompreTudo.shop.`,
    seo_content: `${nome} está disponível no CompreTudo.shop como ${categoria} em ${cidade}${estado ? `-${estado}` : ""}. Nesta página você encontra informações sobre atendimento, serviços, fotos, avaliações e contato direto pelo WhatsApp.`,
    seo_keywords: [
      `${categoria} em ${cidade}${estado ? `-${estado}` : ""}`,
      `${categoria} ${cidade}`,
      `profissional em ${cidade}`,
      `serviços em ${cidade}`,
      `${nome} em ${cidade}`,
      `perfil profissional no CompreTudo.shop`,
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

  const referenceImageUrl =
    user.reference_image_url ||
    user.referenceImageUrl ||
    images.reference_image_url ||
    "";

  const prompt = `
Você é uma IA especialista em criação de páginas profissionais, identidade visual, copywriting, SEO local e vitrine comercial.

Sua missão é gerar uma página profissional completa para o CompreTudo.shop Pages.

IMPORTANTE:
${referenceImageUrl ? `
- O usuário enviou uma imagem de referência.
- Analise a imagem para entender cores, estilo, segmento, estética, sensação da marca e identidade visual.
- Use a imagem como base para criar uma página coerente visualmente.
- Não descreva a imagem. Apenas use ela como referência.
` : `
- O usuário não enviou imagem. Crie uma identidade visual coerente com o ramo informado.
`}

Dados do usuário:
${JSON.stringify(
  {
    nome: user.nome,
    nome_empresa: user.nome_empresa,
    businessName: user.businessName,
    telefone: user.telefone || user.phone,
    cidade: user.cidade,
    estado: user.estado,
    ramo_empresa: user.ramo_empresa,
    workArea: user.workArea,
    servico_principal: user.servico_principal,
    area_principal: user.area_principal,
    categoria_principal: user.categoria_principal,
    plano: user.plan_code || user.planCode || "free",
  },
  null,
  2
)}

Retorne SOMENTE JSON válido com estes campos:

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
  "store_card_bg_color": "",
  "store_text_color": "",
  "services_bg_color": "",
  "services_text_color": "",
  "cta_bg_color": "",

  "font_heading": "",
  "font_body": "",

  "hero_kicker": "",
  "hero_title": "",
  "hero_subtitle": "",

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

Regras obrigatórias:
- Responda apenas JSON puro.
- Use português do Brasil.
- O nome deve ser o nome comercial quando existir.
- O slug deve ser curto, amigável e sem acentos.
- O serviço não deve conter cidade ou estado.
- A descrição deve parecer profissional e humana.
- As cores devem combinar entre si e ter contraste.
- Se houver imagem, extraia dela uma paleta coerente.
- Não use sempre verde.
- Crie uma aparência elegante, moderna e comercial.
- Crie 3 a 5 serviços em services_items.
- Cada serviço precisa ter: id, icon, title, description, active.
- Em services_items.icon, use SOMENTE emoji real.
- Escolha emojis coerentes com o serviço.
- Nunca use texto como ícone.
- Nunca use "cloud", "database", "support", "web", "mobile" ou nomes de ícones.
- Nunca use SVG, HTML, classes CSS ou nomes de biblioteca de ícones.
- As cores de texto das seções devem ser sempre escuras/preta.
- Use text_color, store_text_color e services_text_color como "#07111f".
- Nunca use texto claro em fundo claro.
- text_color, store_text_color e services_text_color devem ser sempre "#07111f".
- portfolio_bg_color, reviews_bg_color, services_bg_color, about_bg_color e store_bg_color devem ser fundos claros, preferencialmente "#ffffff" ou "#f7f3ed".
- Nunca use texto branco em seção clara.
- Nunca use galeria com fundo branco e texto branco.
- NÃO crie produtos, serviços de loja, ofertas, pacotes ou exemplos comerciais em store_items.
- store_categories deve ser sempre [].
- store_items deve ser sempre [].
- A loja será preenchida manualmente depois pelo usuário no Dashboard.
- Não invente nenhum produto, serviço vendável, preço, pacote ou oferta para a loja.
- Para plano grátis, mantenha a página simples, profissional e institucional.
- Para planos pagos, também não crie itens de loja automaticamente.
- seo_title deve focar em serviço + cidade + estado + nome.
- seo_description deve ter até 160 caracteres.
- seo_content deve ter 2 parágrafos curtos.
- seo_keywords deve ter 10 a 18 buscas locais naturais.
- seo_tags deve ter 6 a 10 tags curtas.
- Não invente endereço, CNPJ, certificados ou promessas falsas.
`;

  try {
    const userContent = [
      {
        type: "text",
        text: prompt,
      },
    ];

    const imageContent = buildReferenceImageContent(referenceImageUrl);

    if (imageContent) {
      userContent.push(imageContent);
    }

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: imageContent ? OPENAI_VISION_MODEL : OPENAI_MODEL,
        temperature: 0.75,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "Você cria páginas profissionais completas para pequenos negócios brasileiros. Responda somente JSON válido.",
          },
          {
            role: "user",
            content: userContent,
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

function darkenColor(hex, amount = 120) {
  let color = String(hex || "")
    .replace("#", "")
    .trim();

  if (color.length === 3) {
    color = color
      .split("")
      .map((c) => c + c)
      .join("");
  }

  if (color.length !== 6) {
    return "#06111d";
  }

  let r = parseInt(color.substring(0, 2), 16);
  let g = parseInt(color.substring(2, 4), 16);
  let b = parseInt(color.substring(4, 6), 16);

  r = Math.max(0, r - amount);
  g = Math.max(0, g - amount);
  b = Math.max(0, b - amount);

  return `#${[r, g, b]
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("")}`;
}
function normalizeGeneratedProfile(ai = {}, user = {}, images = {}) {
  const isFreePlan =
    user.plan_code === "free" ||
    user.planCode === "free";

  const nome = cleanText(
    ai.nome,
    user.nome_empresa ||
      user.businessName ||
      user.nome ||
      "Profissional CompreTudo"
  );

  const cidade = cleanText(user.cidade, "");
  const estado = cleanText(user.estado, "");

  const slug = normalizeSlug(
    `${ai.slug || nome}-${cidade}${estado ? `-${estado}` : ""}`
  );


  const servicoBase = cleanText(
  ai.servico,
  user.workArea ||
    user.ramo_empresa ||
    user.servico_principal ||
    user.categoria_principal ||
    user.area_principal ||
    "Serviços profissionais"
);



  const servicoLimpo = removeCidadeDoServico(servicoBase, cidade, estado);
  const safePalette = getSafeHeroPalette(user, ai);
  function getContrastButtonColor(bg = "#06111d") {
  const color = String(bg || "")
    .replace("#", "")
    .trim();

  if (color.length !== 6) {
    return "#d9a84e";
  }

  const r = parseInt(color.substring(0, 2), 16);
  const g = parseInt(color.substring(2, 4), 16);
  const b = parseInt(color.substring(4, 6), 16);

  const brightness = (r * 299 + g * 587 + b * 114) / 1000;

  // fundo escuro → botão dourado
  if (brightness < 120) {
    return "#d9a84e";
  }

  // fundo claro → botão escuro
  return "#06111d";
}


function getContrastTextColor(bg = "#d9a84e") {
  const color = String(bg || "")
    .replace("#", "")
    .trim();

  if (color.length !== 6) {
    return "#07111f";
  }

  const r = parseInt(color.substring(0, 2), 16);
  const g = parseInt(color.substring(2, 4), 16);
  const b = parseInt(color.substring(4, 6), 16);

  const brightness = (r * 299 + g * 587 + b * 114) / 1000;

  // fundo claro → texto escuro
  if (brightness > 150) {
    return "#07111f";
  }

  // fundo escuro → texto branco
  return "#ffffff";
}

  const aiPrimary =
  ai.primary_color ||
  safePalette.primary_color ||
  "#d9a84e";

const safeTopbarColor = darkenColor(aiPrimary, 120);
const safeButtonColor = getContrastButtonColor(
  cleanText(
    ai.hero_bg_color,
    safePalette.hero_bg_color
  )
);

const safeButtonTextColor =
  getContrastTextColor(safeButtonColor);
  const fallback = fallbackProfile(user, images);

  const servicesItems = Array.isArray(ai.services_items)
    ? ai.services_items.slice(0, 6).map((item, index) => ({
        id: item.id || `service-${index + 1}`,
        icon: safeServiceEmoji(
          item.icon,
          ALLOWED_SERVICE_EMOJIS[index % ALLOWED_SERVICE_EMOJIS.length]
        ),
        title: cleanText(item.title, `Serviço ${index + 1}`),
        description: cleanText(
          item.description,
          "Serviço profissional disponível."
        ),
        active: item.active !== false,
      }))
    : fallback.services_items;

  const storeCategories = [];
  const storeItems = [];

  const previewExpiresAt = isFreePlan
  ? null
  : new Date(Date.now() + 5 * 60 * 1000).toISOString();

  return {
    user_id: user.id,

is_active: isFreePlan,
is_preview: !isFreePlan,
preview_expires_at: previewExpiresAt,
    activated_at: null,

    slug,
    nome,
    servico: servicoLimpo,
    cidade,
    estado,

    descricao: cleanText(ai.descricao, fallback.descricao),

    seo_title: cleanText(
      ai.seo_title,
      `${servicoLimpo} em ${cidade}${estado ? `-${estado}` : ""} | ${nome} | CompreTudo`
    ),

    seo_description: cleanText(
      ai.seo_description,
      `${nome} atende como ${servicoLimpo} em ${cidade}${estado ? `-${estado}` : ""}. Veja serviços e fale pelo WhatsApp.`
    ),

    seo_content: cleanText(
      ai.seo_content,
      `${nome} está disponível no CompreTudo como ${servicoLimpo} em ${cidade}${estado ? `-${estado}` : ""}. Nesta página você encontra informações sobre atendimento, serviços, fotos, avaliações e contato direto pelo WhatsApp.`
    ),

    seo_keywords: Array.isArray(ai.seo_keywords)
      ? ai.seo_keywords
          .slice(0, 20)
          .map((item) => cleanText(item))
          .filter(Boolean)
      : [
          `${servicoLimpo} em ${cidade}${estado ? `-${estado}` : ""}`,
          `${servicoLimpo} ${cidade}`,
          `profissional em ${cidade}`,
          `serviços em ${cidade}`,
          `${nome} em ${cidade}`,
          `perfil profissional no CompreTudo`,
        ],

    seo_tags: Array.isArray(ai.seo_tags)
      ? ai.seo_tags
          .slice(0, 12)
          .map((item) => cleanText(item))
          .filter(Boolean)
      : [
          servicoLimpo,
          cidade,
          estado,
          "Perfil profissional",
          "Atendimento local",
          "Contato pelo WhatsApp",
        ].filter(Boolean),

    whatsapp: user.telefone || user.phone || user.whatsapp || "",

    logo_url: images.logo_url || user.reference_image_url || "",
    hero_image_url: images.hero_image_url || user.reference_image_url || "",
    about_image_url: images.about_image_url || user.reference_image_url || "",

    primary_color: safeButtonColor,

secondary_color: cleanText(
  ai.secondary_color,
  safePalette.secondary_color
),

accent_color: cleanText(
  ai.accent_color,
  safePalette.accent_color
),

button_text_color: safeButtonTextColor,

    background_color: "#ffffff",
    text_color: "#07111f",

    hero_bg_color: cleanText(
      ai.hero_bg_color,
      safePalette.hero_bg_color || "#06111d"
    ),
    topbar_bg_color: safeTopbarColor,
    hero_overlay_color: cleanText(
      ai.hero_overlay_color,
      safePalette.hero_overlay_color || "rgba(6, 17, 29, 0.74)"
    ),

    about_bg_color: "#ffffff",
    portfolio_bg_color: "#ffffff",
    reviews_bg_color: "#ffffff",
    store_bg_color: "#ffffff",
    store_card_bg_color: "#ffffff",

    store_text_color: "#07111f",
    services_bg_color: "#ffffff",
    services_text_color: "#07111f",

    cta_bg_color: cleanText(
  ai.cta_bg_color,
  safeButtonColor
),

    show_about: true,
    show_services: true,
    show_portfolio: true,
    show_reviews: true,
    show_store: !isFreePlan,
    show_booking: false,
    show_final_cta: true,

    font_heading: cleanText(ai.font_heading, "Georgia"),
    font_body: cleanText(ai.font_body, "Inter"),

    hero_kicker: cleanText(
      ai.hero_kicker,
      "Atendimento profissional com confiança"
    ),
    hero_title: cleanText(ai.hero_title, nome),
    hero_subtitle: cleanText(ai.hero_subtitle, fallback.descricao),

    about_title: cleanText(ai.about_title, "Sobre meu trabalho"),
    about_text: cleanText(ai.about_text, fallback.about_text),

    services_title: cleanText(ai.services_title, "Serviços"),
    services_text: cleanText(
      ai.services_text,
      "Conheça as principais soluções disponíveis."
    ),
    services_items: servicesItems,

    gallery: Array.isArray(images.gallery) ? images.gallery : [],

    store_title: cleanText(ai.store_title, "Loja"),
    store_text: cleanText(
      ai.store_text,
      "Os produtos e ofertas serão cadastrados pelo proprietário no painel."
    ),
    store_categories: storeCategories,
    store_items: storeItems,

    cta_title: cleanText(ai.cta_title, "Pronto para contratar com confiança?"),
    cta_text: cleanText(
      ai.cta_text,
      "Fale comigo agora pelo WhatsApp e solicite seu orçamento."
    ),
    cta_button_text: cleanText(ai.cta_button_text, "Falar agora"),
    cta_action_type: "whatsapp",
    cta_custom_link: "",

    updated_at: new Date().toISOString(),
    created_by_ai: true,
  };
}

export async function generateProfilePagePayload(user = {}) {
  const isFreePlan =
  user.plan_code === "free" ||
  user.planCode === "free";

const images =
  isFreePlan
    ? await findImagesForProfile(user)
    : user.reference_image_url
    ? {
        logo_url: user.reference_image_url,
        hero_image_url: user.reference_image_url,
        about_image_url: user.reference_image_url,
        reference_image_url: user.reference_image_url,
        gallery: [
          {
            id: "gallery-reference",
            url: user.reference_image_url,
            title: "Referência visual da marca",
            active: true,
          },
        ],
      }
    : await findImagesForProfile(user);

  const aiProfile = await generateAIProfile(user, images);

  return normalizeGeneratedProfile(aiProfile, user, images);
}


async function generateSeoKeywordsForProfile(profileId) {
  if (!profileId) return;

  try {
    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.APP_BASE_URL ||
      "https://compretudo.shop";

    await fetch(`${baseUrl}/api/seo/generate-keywords`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        profile_id: profileId,
      }),
    });
  } catch (err) {
    console.error("Erro ao gerar SEO keywords:", err);
  }
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


  const isFreePlan =
  user.plan_code === "free" ||
  user.planCode === "free";

const finalPayload = {
  ...payload,

  is_active:
    isFreePlan || existing?.is_active === true ? true : false,

  is_preview:
    isFreePlan || existing?.is_active === true ? false : true,

  preview_expires_at:
    isFreePlan || existing?.is_active === true
      ? null
      : new Date(Date.now() + 5 * 60 * 1000).toISOString(),

  plan_code: user.plan_code || user.planCode || "free",
  plan_status: "active",
  plan_price: isFreePlan ? 0 : payload.plan_price || null,
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
if (data?.id) {
  generateSeoKeywordsForProfile(data.id);
}

return data;
}

export async function updateProfilePageFields({ supabase, userId, slug, patch = {} }) {
  if (!supabase) {
    throw new Error("Supabase não informado.");
  }

  if (!userId && !slug) {
    throw new Error("Informe userId ou slug para corrigir a página.");
  }

  const allowedFields = [
    "slug",
    "nome",
    "servico",
    "cidade",
    "estado",
    "whatsapp",
    "descricao",

    "logo_url",
    "hero_image_url",
    "about_image_url",

    "primary_color",
    "secondary_color",
    "accent_color",
    "background_color",
    "text_color",

    "hero_bg_color",
    "topbar_bg_color",
    "hero_overlay_color",
    "about_bg_color",
    "portfolio_bg_color",
    "reviews_bg_color",
    "store_bg_color",
    "store_text_color",
    "services_bg_color",
    "services_text_color",
    "cta_bg_color",

    "hero_kicker",
    "about_title",
    "about_text",

    "services_title",
    "services_text",
    "services_items",

    "gallery",

    "store_title",
    "store_text",
    "store_categories",
    "store_items",

    "cta_title",
    "cta_text",
    "cta_button_text",
    "cta_action_type",
    "cta_custom_link",

    "seo_title",
    "seo_description",
    "seo_content",
    "seo_keywords",
    "seo_tags",

    "show_about",
    "show_services",
    "show_portfolio",
    "show_reviews",
    "show_store",
    "show_booking",
    "show_final_cta",

    "is_active",
    "is_preview",
    "preview_expires_at",
    "subscription_expires_at",
  ];

  const cleanPatch = {};

  for (const [key, value] of Object.entries(patch || {})) {
    if (allowedFields.includes(key)) {
      cleanPatch[key] = value;
    }
  }

  if (!Object.keys(cleanPatch).length) {
    throw new Error("Nenhum campo permitido foi enviado para correção.");
  }

  cleanPatch.updated_at = new Date().toISOString();

  let query = supabase.from("profiles_pages").update(cleanPatch);

  if (userId) {
    query = query.eq("user_id", userId);
  } else {
    query = query.eq("slug", slug);
  }

  const { data, error } = await query.select("*").single();

  if (error) {
    console.error("Erro ao corrigir profiles_pages:", error);
    throw error;
  }
if (data?.id) {
  generateSeoKeywordsForProfile(data.id);
}

return data;
}

export async function updateAnyTableRow({
  supabase,
  table,
  match = {},
  patch = {},
}) {
  if (!supabase) {
    throw new Error("Supabase não informado.");
  }

  if (!table) {
    throw new Error("Tabela não informada.");
  }

  if (!Object.keys(match).length) {
    throw new Error("Informe pelo menos uma condição em match.");
  }

  if (!Object.keys(patch).length) {
    throw new Error("Informe pelo menos um campo em patch.");
  }

  const allowedTables = [
    "usuarios",
    "profiles_pages",
    "servicos",
    "categorias",
    "areas",
    "vagas",
    "candidaturas",
  ];

  if (!allowedTables.includes(table)) {
    throw new Error(`Tabela não permitida para correção: ${table}`);
  }

  const finalPatch = {
    ...patch,
    updated_at: new Date().toISOString(),
  };

  let query = supabase.from(table).update(finalPatch);

  for (const [field, value] of Object.entries(match)) {
    query = query.eq(field, value);
  }

  const { data, error } = await query.select("*");

  if (error) {
    console.error(`Erro ao corrigir tabela ${table}:`, error);
    throw error;
  }

  return data;
}