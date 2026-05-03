import { sendList, sendText } from "../services/whatsapp.js";
import { sendMenuEmpresa, sendActionButtons } from "./menus.js";
import {
  createPendingPayment,
  getPlanoByCodigo,
} from "../lib/monetization.js";
import {
  createMercadoPagoPixIntent,
  getActiveCompanyJobCredits,
  consumeCompanyJobCredit,
} from "../services/payments.js";
import { notifyUsersAboutNewJob } from "../services/jobNotifier.js";
import { createOrUpdateProfilePage } from "../lib/pageGenerator.js";


function shortTitle(value = "") {
  const text = String(value || "").trim();
  return text.length > 24 ? `${text.slice(0, 21)}...` : text;
}

const PROFESSIONALS_PAGE_SIZE = 10;



function buildPreviewList(items = []) {
  return items
    .slice(0, 10)
    .map((item, index) => `${index + 1}. ${item.nome}`)
    .join("\n");
}

async function getAreasAtivas(supabase) {
  const { data, error } = await supabase
    .from("areas")
    .select("chave,nome,ativo,ordem")
    .eq("ativo", true)
    .order("ordem", { ascending: true })
    .order("nome", { ascending: true });

  if (error) {
    console.log("❌ erro ao buscar áreas:", error.message);
    return [];
  }

  return Array.isArray(data) ? data : [];
}

async function getCategoriasPorArea(supabase, areaChave) {
  const { data, error } = await supabase
    .from("categorias")
    .select("chave,nome,ativo,area_chave,ordem")
    .eq("ativo", true)
    .eq("area_chave", areaChave)
    .order("ordem", { ascending: true })
    .order("nome", { ascending: true });

  if (error) {
    console.log("❌ erro ao buscar categorias por área:", error.message);
    return [];
  }

  return Array.isArray(data) ? data : [];
}



function limparTempVagaPayload() {
  return {
    vaga_titulo_temp: null,
    vaga_descricao_temp: null,
    vaga_requisitos_temp: null,
    vaga_tipo_contratacao_temp: null,
    vaga_salario_temp: null,
    vaga_jornada_temp: null,
    vaga_quantidade_temp: null,
    vaga_destaque_temp: false,
  };
}

function formatTipoContratacao(tipo = "") {
  const map = {
    clt: "CLT",
    diaria: "Diária",
    freelance: "Freelance",
    mei: "MEI",
    meio_periodo: "Meio período",
    comissao: "Comissão",
    a_combinar: "A combinar",
  };
  return map[tipo] || tipo || "-";
}

function formatCategoria(chave = "") {
  const map = {
    auxiliar_limpeza: "Auxiliar de Limpeza",
    auxiliar_administrativo: "Auxiliar Administrativo",
    recepcionista: "Recepcionista",
    atendente: "Atendente",
    caixa: "Caixa",
    vendedor: "Vendedor",
    cozinheira: "Cozinheira",
    garcom: "Garçom",
    motoboy: "Motoboy",
    motorista: "Motorista",
    faxineira: "Faxineira / Diarista",
    pedreiro: "Pedreiro",
    pintor: "Pintor",
    eletricista: "Eletricista",
    encanador: "Encanador",
    cuidador: "Cuidador",
    frete: "Frete / Mudança",
  };
  return map[chave] || chave || "-";
}

function resumoVaga(user) {
  const qtd = Number(user.vaga_quantidade_temp || 1);

  return (
    `📋 *Resumo da vaga*\n\n` +
    `🏢 *Empresa:* ${user.nome_empresa || "Não informada"}\n` +
    `💼 *Função:* ${formatCategoria(user.categoria_principal)}\n` +
    `📝 *Título:* ${user.vaga_titulo_temp || "-"}\n` +
    `📄 *Descrição:* ${user.vaga_descricao_temp || "-"}\n` +
    `✅ *Requisitos:* ${user.vaga_requisitos_temp || "-"}\n` +
    `📌 *Tipo de contratação:* ${formatTipoContratacao(user.vaga_tipo_contratacao_temp)}\n` +
    `💰 *Salário:* ${user.vaga_salario_temp || "-"}\n` +
    `🕒 *Jornada:* ${user.vaga_jornada_temp || "-"}\n` +
    `👥 *Quantidade de vagas disponíveis:* ${qtd}\n` +
    `⭐ *Destaque:* ${user.vaga_destaque_temp ? "Sim" : "Não"}`
  );
}

function buildPixResumo(intent, plano, total, destaqueValor = 0) {
  const checkoutUrl = intent?.checkout_url || null;

  let out =
    `💳 *Pagamento gerado com sucesso!*\n\n` +
    `📦 *Plano:* ${plano.nome}\n` +
    `💵 *Valor base:* R$ ${Number(plano.valor).toFixed(2)}\n` +
    `⭐ *Destaque:* R$ ${Number(destaqueValor || 0).toFixed(2)}\n` +
    `🧾 *Total:* R$ ${Number(total || 0).toFixed(2)}`;

  if (checkoutUrl) {
    out += `\n\n🔗 *Link de pagamento:*\n${checkoutUrl}`;
  }

  out += `\n\n📌 *PIX copia e cola:*`;
  return out;
}

function buildPixCodeOnly(intent) {
  return intent?.qr_code || "Código Pix indisponível no momento.";
}

async function mostrarPacotesEmpresa(phone, supabase, user) {
  const credits = await getActiveCompanyJobCredits(user.id);
  const total = credits.reduce((acc, c) => acc + Number(c.total_creditos || 0), 0);
  const usados = credits.reduce((acc, c) => acc + Number(c.creditos_usados || 0), 0);
  const restantes = Math.max(0, total - usados);

  await sendText(
    phone,
    `📦 *Pacotes da empresa*\n\n` +
      `🎟️ *Créditos ativos:* ${restantes}\n` +
      `📊 *Total comprado:* ${total}\n` +
      `✅ *Usados:* ${usados}`
  );

  return sendList(phone, "Escolha um pacote:", [
    {
      title: "Pacotes de vagas",
      rows: [
        { id: "empresa_buy_1_vaga", title: "1 vaga - R$ 9,90" },
        { id: "empresa_buy_3_vagas", title: "3 vagas - R$ 24,90" },
        { id: "empresa_buy_10_vagas", title: "10 vagas - R$ 79,90" },
      ],
    },
  ]);
}

async function gerarPagamentoPacoteEmpresa({
  supabase,
  phone,
  user,
  planoCodigo,
  referenciaTipo = "empresa_pacote_vagas",
}) {
  const plano = await getPlanoByCodigo(supabase, planoCodigo);

  if (!plano) {
    await sendText(phone, "Plano indisponível no momento.");
    return sendActionButtons(phone, "O que deseja fazer agora?", [
      { id: "empresa_pacotes", title: "Ver pacotes" },
      { id: "voltar_menu", title: "Voltar ao menu" },
    ]);
  }

  const payment = await createPendingPayment(supabase, {
    usuarioId: user.id,
    referenciaTipo,
    planoCodigo: plano.codigo,
    valor: plano.valor,
    metadata: {
      empresa_id: user.id,
      nome_empresa: user.nome_empresa || null,
      telefone: user.telefone,
      cidade: user.cidade,
      estado: user.estado,
      modo: "pacote_vagas_empresa",
    },
  });

  if (!payment) {
    await sendText(phone, "Erro ao gerar cobrança do pacote.");
    return sendActionButtons(phone, "O que deseja fazer agora?", [
      { id: "empresa_pacotes", title: "Ver pacotes" },
      { id: "voltar_menu", title: "Voltar ao menu" },
    ]);
  }

  let intent = null;
  try {
    intent = await createMercadoPagoPixIntent(payment.id);
  } catch (err) {
    console.error("❌ erro ao gerar Pix do pacote da empresa:", err);
  }

  if (!intent) {
    await sendText(
      phone,
      `💳 *Pedido criado com sucesso!*\n\n` +
        `📦 *Plano:* ${plano.nome}\n` +
        `💵 *Valor:* R$ ${Number(plano.valor).toFixed(2)}\n` +
        `🆔 *Pedido:* ${payment.id}\n\n` +
        `Não consegui gerar o Pix automaticamente agora, mas o pedido foi criado.`
    );

    return sendActionButtons(phone, "Depois do pagamento:", [
      { id: "payment_check_status", title: "Já paguei" },
      { id: "empresa_pacotes", title: "Ver pacotes" },
      { id: "voltar_menu", title: "Voltar ao menu" },
    ]);
  }

  await sendText(phone, buildPixResumo(intent, plano, plano.valor, 0));
  await sendText(phone, buildPixCodeOnly(intent));

  return sendActionButtons(phone, "Depois do pagamento:", [
    { id: "payment_check_status", title: "Já paguei" },
    { id: "empresa_pacotes", title: "Ver pacotes" },
    { id: "voltar_menu", title: "Voltar ao menu" },
  ]);
}

async function cobrarDestaqueSeparado({ supabase, phone, user }) {
  const plano = await getPlanoByCodigo(supabase, "empresa_destaque_vaga");

  if (!plano) {
    await sendText(phone, "Plano de destaque indisponível no momento.");
    return null;
  }

  const payment = await createPendingPayment(supabase, {
    usuarioId: user.id,
    referenciaTipo: "empresa_destaque_vaga",
    planoCodigo: plano.codigo,
    valor: plano.valor,
    metadata: {
      empresa_id: user.id,
      nome_empresa: user.nome_empresa || null,
      titulo: user.vaga_titulo_temp,
      destaque: true,
    },
  });

  if (!payment) {
    await sendText(phone, "Erro ao gerar cobrança do destaque.");
    return null;
  }

  let intent = null;

try {
  intent = await createMercadoPagoPixIntent(payment.id);
} catch (err) {
  console.error("❌ erro ao gerar Pix do destaque:", err);
}

if (!intent) {
  await sendText(phone, "Não consegui gerar o Pix do destaque agora.");
  return payment;
}

  await sendText(phone, buildPixResumo(intent, plano, plano.valor, 0));
  await sendText(phone, buildPixCodeOnly(intent));

  return payment;
}

async function publicarVagaComCredito({ supabase, user }) {
  const consumed = await consumeCompanyJobCredit(user.id);
  if (!consumed) return null;

  const payload = {
    empresa_id: user.id,
    nome_empresa: user.nome_empresa || null,
    titulo: user.vaga_titulo_temp,
    descricao: user.vaga_descricao_temp,
    requisitos: user.vaga_requisitos_temp,
    tipo_contratacao: user.vaga_tipo_contratacao_temp,
    salario: user.vaga_salario_temp,
    jornada: user.vaga_jornada_temp,
    quantidade_vagas: Number(user.vaga_quantidade_temp || 1),
    categoria_chave: user.categoria_principal,
    cidade: user.cidade,
    estado: user.estado,
    destaque: !!user.vaga_destaque_temp,
    status: "ativa",
    publicada_em: new Date().toISOString(),
    contato_whatsapp: user.telefone || null,
  };

  const { data, error } = await supabase
    .from("vagas")
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error("❌ erro ao publicar vaga com crédito:", error);
    return null;
  }

  return { vaga: data, credito: consumed };
}
function getPublicBaseUrl() {
  return (
    process.env.PROFILE_PUBLIC_BASE_URL ||
    process.env.FRONTEND_BASE_URL ||
    process.env.APP_PUBLIC_URL ||
    process.env.APP_BASE_URL ||
    "https://rendaja.online"
  ).replace(/\/$/, "");
}
export async function handleCompanyMenu({
  user,
  text,
  phone,
  supabase,
  updateUser,
  getCategorias,
  getCategoriasPorGrupos,
}) {
  if (text === "voltar_menu") {
    await updateUser({ etapa: "menu" });
    return sendMenuEmpresa(phone);
  }
if (text === "empresa_criar_perfil") {
  const empresaUser = {
    ...user,

    // força a IA a tratar como empresa
    nome: user.nome_empresa || user.nome,
    nome_empresa: user.nome_empresa || user.nome,

    tipo: "empresa",

    // ajuda a IA a entender que é perfil empresarial
    area_principal: user.area_principal || "empresa",
    categoria_principal:
      user.categoria_principal ||
      user.vaga_titulo_temp ||
      "empresa local",
  };

  let profilePage = null;

  try {
    profilePage = await createOrUpdateProfilePage({
      supabase,
      user: empresaUser,
    });
  } catch (err) {
    console.error("❌ erro ao criar página pública da empresa:", err);
  }

  if (!profilePage?.slug) {
    return sendText(
      phone,
      "Não consegui criar a prévia da página da empresa agora. Tente novamente."
    );
  }

  const baseUrl = getPublicBaseUrl();
  const pageLink = `${baseUrl}/p/${profilePage.slug}`;

  await sendText(
    phone,
    `🚀 *Prévia da página da empresa criada!*\n\n` +
      `Criei uma página pública baseada no nome da empresa:\n` +
      `🏢 *${user.nome_empresa || user.nome || "Sua empresa"}*\n\n` +
      `Veja como ficou:\n${pageLink}\n\n` +
      `Essa página fica disponível por alguns minutos como teste.`
  );

  return sendActionButtons(phone, "Deseja ativar sua página empresarial?", [
    { id: "comprar_pagina", title: "Ativar página" },
    { id: "empresa_pacotes", title: "Ver pacotes" },
    { id: "voltar_menu", title: "Ver depois" },
  ]);
}
  if (text === "empresa_pacotes") {
    await updateUser({ etapa: "menu" });
    return mostrarPacotesEmpresa(phone, supabase, user);
  }

  if (text === "empresa_buy_1_vaga") {
    return gerarPagamentoPacoteEmpresa({
      supabase,
      phone,
      user,
      planoCodigo: "empresa_1_vaga",
    });
  }

  if (text === "empresa_buy_3_vagas") {
    return gerarPagamentoPacoteEmpresa({
      supabase,
      phone,
      user,
      planoCodigo: "empresa_3_vagas",
    });
  }

  if (text === "empresa_buy_10_vagas") {
    return gerarPagamentoPacoteEmpresa({
      supabase,
      phone,
      user,
      planoCodigo: "empresa_10_vagas",
    });
  }

  // =====================
  // BUSCAR PROFISSIONAIS
  // =====================

  if (text === "empresa_buscar_profissionais") {
  const areas = await getAreasAtivas(supabase);
  await updateUser({ etapa: "empresa_buscar_area" });

  const previewAreas = buildPreviewList(areas);

  await sendText(
    phone,
    `Em qual área você quer buscar profissionais?\n\n${previewAreas}\n\n👇 Toque em "Ver opções" para selecionar.`
  );

  return sendList(phone, "Selecione uma área:", [
    {
      title: "Áreas",
      rows: areas.slice(0, 10).map((a) => ({
        id: `empresa_area_${a.chave}`,
        title: shortTitle(a.nome),
      })),
    },
  ]);
}

  if (user.etapa === "empresa_buscar_area") {
    if (!text.startsWith("empresa_area_")) return false;

    const area = text.replace("empresa_area_", "");
    const categorias = await getCategoriasPorArea(supabase, area);

    await updateUser({
  area_principal: area,
  etapa: "empresa_buscar_categoria",
});

    if (!categorias.length) {
      await updateUser({
  etapa: "empresa_buscar_area",
  area_principal: null,
  categoria_principal: null,
});
      await sendText(phone, "Não encontrei categorias nessa área.");
      return sendActionButtons(phone, "O que deseja fazer agora?", [
        { id: "empresa_buscar_profissionais", title: "Buscar novamente" },
        { id: "voltar_menu", title: "Voltar ao menu" },
      ]);
    }
const previewCategorias = buildPreviewList(categorias);

await sendText(
  phone,
  `Escolha a categoria do profissional:\n\n${previewCategorias}\n\n👇 Toque em "Ver opções" para selecionar.`
);
    return sendList(phone, "Escolha a categoria do profissional:", [
      {
        title: "Categorias",
        rows: categorias.slice(0, 10).map((c) => ({
          id: `empresa_buscar_cat_${c.chave}`,
          title: shortTitle(c.nome),
        })),
      },
    ]);
  }

  if (
  user.etapa === "empresa_buscar_categoria" ||
  text.startsWith("empresa_prof_next_")
) {
  let categoria = null;
  let page = 0;

  if (text.startsWith("empresa_prof_next_")) {
    const raw = text.replace("empresa_prof_next_", "");
    const parts = raw.split("__page_");

    categoria = parts[0];
    page = Number(parts[1] || 0);
  } else {
    if (!text.startsWith("empresa_buscar_cat_")) return false;

    categoria = text.replace("empresa_buskar_cat_", "");
    categoria = text.replace("empresa_buscar_cat_", "");
    page = 0;
  }

  const from = page * PROFESSIONALS_PAGE_SIZE;
  const to = from + PROFESSIONALS_PAGE_SIZE;

  let query = supabase
    .from("servicos")
    .select("*")
    .eq("ativo", true)
    .eq("categoria_chave", categoria)
    .order("nivel_visibilidade", { ascending: false })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (user.cidade) {
    query = query.ilike("cidade", user.cidade);
  }

  if (user.estado) {
    query = query.eq("estado", user.estado);
  }

  const { data: servicos, error } = await query;

  await updateUser({ etapa: "menu" });

  if (error) {
    console.error("❌ erro ao buscar profissionais:", error);
    await sendText(phone, "Erro ao buscar profissionais.");
    return sendActionButtons(phone, "O que deseja fazer agora?", [
      { id: "empresa_buscar_profissionais", title: "Buscar novamente" },
      { id: "voltar_menu", title: "Voltar ao menu" },
    ]);
  }

  const lista = (servicos || []).slice(0, PROFESSIONALS_PAGE_SIZE);
  const temProximaPagina = (servicos || []).length > PROFESSIONALS_PAGE_SIZE;

  if (!lista.length) {
    await sendText(phone, "Nenhum profissional encontrado no momento.");
    return sendActionButtons(phone, "O que deseja fazer agora?", [
      { id: "empresa_buscar_profissionais", title: "Buscar novamente" },
      { id: "voltar_menu", title: "Voltar ao menu" },
    ]);
  }

  let out = `🔎 *Encontramos profissionais para sua busca:*\n\nPágina ${page + 1}`;

  for (const s of lista) {
    out +=
      `\n\n• *${s.titulo || "Profissional"}*` +
      `\n📍 ${s.cidade || "Sem cidade"}${s.estado ? `/${s.estado}` : ""}` +
      `\n📝 ${s.descricao || "Sem descrição informada."}` +
      `\n📞 WhatsApp: ${s.contato_whatsapp || "Não informado"}`;
  }

  await sendText(phone, out);

  const botoes = [];

  if (temProximaPagina) {
    botoes.push({
      id: `empresa_prof_next_${categoria}__page_${page + 1}`,
      title: "Próxima página",
    });
  }

  botoes.push(
    { id: "empresa_buscar_profissionais", title: "Nova busca" },
    { id: "voltar_menu", title: "Voltar ao menu" }
  );

  return sendActionButtons(phone, "O que deseja fazer agora?", botoes);
}

  // =====================
  // CRIAR VAGA
  // =====================

  if (text === "empresa_criar_vaga") {
    const areas = await getAreasAtivas(supabase);

    await updateUser({
      etapa: "empresa_vaga_area",
      ...limparTempVagaPayload(),
    });
const previewAreas = buildPreviewList(areas);

await sendText(
  phone,
  `Escolha a área da vaga:\n\n${previewAreas}\n\n👇 Toque em "Ver opções" para selecionar.`
);
    return sendList(phone, "Selecione uma área:", [
  {
    title: "Áreas",
    rows: areas
      .filter((a) => a.chave !== "profissional")
      .slice(0, 10)
      .map((a) => ({
        id: `vaga_area_${a.chave}`,
        title: shortTitle(a.nome),
      })),
  },
]);
  }

  if (user.etapa === "empresa_vaga_area") {
    if (!text.startsWith("vaga_area_")) return false;

    const area = text.replace("vaga_area_", "");
    const categorias = await getCategoriasPorArea(supabase, area);

    await updateUser({
  area_principal: area,
  etapa: "empresa_vaga_categoria",
});

    if (!categorias.length) {
      await updateUser({ etapa: "empresa_vaga_area" });
      await sendText(phone, "Não encontrei categorias de vaga nessa área.");
      return sendActionButtons(phone, "O que deseja fazer agora?", [
        { id: "empresa_criar_vaga", title: "Tentar novamente" },
        { id: "voltar_menu", title: "Voltar ao menu" },
      ]);
    }
const previewCategorias = buildPreviewList(categorias);

await sendText(
  phone,
  `Escolha a função da vaga:\n\n${previewCategorias}\n\n👇 Toque em "Ver opções" para selecionar.`
);
    return sendList(phone, "Selecione uma função:", [
      {
        title: "Funções",
        rows: categorias.slice(0, 10).map((c) => ({
          id: `vaga_cat_${c.chave}`,
          title: shortTitle(c.nome),
        })),
      },
    ]);
  }

  if (user.etapa === "empresa_vaga_categoria") {
    if (!text.startsWith("vaga_cat_")) return false;

    const categoria = text.replace("vaga_cat_", "");

    await updateUser({
      categoria_principal: categoria,
      etapa: "empresa_vaga_titulo",
    });

    return sendText(
      phone,
      "📝 Qual o título da vaga?\nEx: Vendedor interno, Auxiliar administrativo"
    );
  }

  if (user.etapa === "empresa_vaga_titulo") {
    if (!text || text.length < 3) {
      return sendText(phone, "Digite um título válido para a vaga:");
    }

    await updateUser({
      vaga_titulo_temp: text,
      etapa: "empresa_vaga_descricao",
    });

    return sendText(
      phone,
      "📄 Descreva a vaga em poucas palavras.\nEx: Atendimento ao cliente, organização da loja e fechamento de vendas."
    );
  }

  if (user.etapa === "empresa_vaga_descricao") {
    if (!text || text.length < 5) {
      return sendText(phone, "Descreva melhor a vaga:");
    }

    await updateUser({
      vaga_descricao_temp: text,
      etapa: "empresa_vaga_requisitos",
    });

    return sendText(
      phone,
      "✅ Quais os requisitos básicos?\nEx: ensino médio completo, boa comunicação, experiência com vendas."
    );
  }

  if (user.etapa === "empresa_vaga_requisitos") {
    if (!text || text.length < 5) {
      return sendText(phone, "Informe requisitos básicos válidos:");
    }

    await updateUser({
      vaga_requisitos_temp: text,
      etapa: "empresa_vaga_tipo_contratacao",
    });

    return sendList(phone, "📌 Escolha o tipo de contratação:", [
      {
        title: "Contratação",
        rows: [
          { id: "contratacao_clt", title: "CLT" },
          { id: "contratacao_diaria", title: "Diária" },
          { id: "contratacao_freelance", title: "Freelance" },
          { id: "contratacao_mei", title: "MEI" },
          { id: "contratacao_meio_periodo", title: "Meio período" },
          { id: "contratacao_comissao", title: "Comissão" },
          { id: "contratacao_a_combinar", title: "A combinar" },
        ],
      },
    ]);
  }

  if (user.etapa === "empresa_vaga_tipo_contratacao") {
    if (!text.startsWith("contratacao_")) return false;

    const tipoContratacao = text.replace("contratacao_", "");

    await updateUser({
      vaga_tipo_contratacao_temp: tipoContratacao,
      etapa: "empresa_vaga_salario",
    });

    return sendText(
      phone,
      "💰 Qual o salário ou faixa salarial?\nEx: 1600, 1800 + comissão, a combinar"
    );
  }

  if (user.etapa === "empresa_vaga_salario") {
    if (!text || text.length < 2) {
      return sendText(phone, "Digite um salário ou faixa válida:");
    }

    await updateUser({
      vaga_salario_temp: text,
      etapa: "empresa_vaga_jornada",
    });

    return sendText(
      phone,
      "🕒 Qual a jornada ou horário?\nEx: segunda a sábado, horário comercial"
    );
  }

  if (user.etapa === "empresa_vaga_jornada") {
    if (!text || text.length < 3) {
      return sendText(phone, "Digite uma jornada válida:");
    }

    await updateUser({
      vaga_jornada_temp: text,
      etapa: "empresa_vaga_quantidade",
    });

    return sendList(phone, "👥 Quantas posições essa vaga possui?", [
      {
        title: "Quantidade",
        rows: [
          { id: "vaga_qtd_1", title: "1 vaga" },
          { id: "vaga_qtd_2", title: "2 vagas" },
          { id: "vaga_qtd_3", title: "3 vagas" },
          { id: "vaga_qtd_5", title: "5 vagas" },
          { id: "vaga_qtd_10", title: "10 vagas" },
        ],
      },
    ]);
  }

  if (user.etapa === "empresa_vaga_quantidade") {
    if (!text.startsWith("vaga_qtd_")) return false;

    const quantidade = Number(text.replace("vaga_qtd_", ""));
    if (!quantidade) {
      return sendText(phone, "Escolha a quantidade pela lista.");
    }

    await updateUser({
      vaga_quantidade_temp: String(quantidade),
      etapa: "empresa_vaga_destaque",
    });

    return sendActionButtons(
      phone,
      "⭐ Quer colocar esse anúncio em destaque por +R$ 4,90?",
      [
        { id: "vaga_destaque_sim", title: "Com destaque" },
        { id: "vaga_destaque_nao", title: "Sem destaque" },
        { id: "voltar_menu", title: "Voltar ao menu" },
      ]
    );
  }

  if (
    user.etapa === "empresa_vaga_destaque" &&
    ["vaga_destaque_sim", "vaga_destaque_nao"].includes(text)
  ) {
    const destaque = text === "vaga_destaque_sim";

    await updateUser({
      vaga_destaque_temp: destaque,
      etapa: "empresa_vaga_confirmar_publicacao",
    });

    const fakeUser = { ...user, vaga_destaque_temp: destaque };
    await sendText(phone, resumoVaga(fakeUser));

    const credits = await getActiveCompanyJobCredits(user.id);
    const total = credits.reduce((acc, c) => acc + Number(c.total_creditos || 0), 0);
    const usados = credits.reduce((acc, c) => acc + Number(c.creditos_usados || 0), 0);
    const restantes = Math.max(0, total - usados);

    return sendActionButtons(
      phone,
      `🎟️ *Créditos disponíveis:* ${restantes}\n\nDeseja publicar essa vaga agora?`,
      [
        { id: "empresa_publicar_vaga_confirmada", title: "Publicar agora" },
        { id: "empresa_pacotes", title: "Ver pacotes" },
        { id: "voltar_menu", title: "Voltar ao menu" },
      ]
    );
  }

  if (text === "empresa_publicar_vaga_confirmada") {
    const credits = await getActiveCompanyJobCredits(user.id);
    const total = credits.reduce((acc, c) => acc + Number(c.total_creditos || 0), 0);
    const usados = credits.reduce((acc, c) => acc + Number(c.creditos_usados || 0), 0);
    const restantes = Math.max(0, total - usados);

    if (restantes <= 0) {
      await sendText(
        phone,
        "Você não tem créditos de vaga disponíveis no momento. Compre um pacote para publicar."
      );
      return sendActionButtons(phone, "O que deseja fazer agora?", [
        { id: "empresa_pacotes", title: "Ver pacotes" },
        { id: "voltar_menu", title: "Voltar ao menu" },
      ]);
    }

    const publicado = await publicarVagaComCredito({ supabase, user });

    if (!publicado?.vaga) {
      
      await sendText(phone, "Erro ao publicar vaga com seu crédito.");
      return sendActionButtons(phone, "O que deseja fazer agora?", [
        { id: "empresa_criar_vaga", title: "Tentar novamente" },
        { id: "empresa_pacotes", title: "Ver pacotes" },
        { id: "voltar_menu", title: "Voltar ao menu" },
      ]);
    }
try {
  const notifyResult = await notifyUsersAboutNewJob(publicado.vaga);
  console.log("📣 resultado notificação vaga:", notifyResult);
} catch (err) {
  console.error("❌ erro ao notificar usuários sobre nova vaga:", err);
}
    const restantesDepois =
      Number(publicado.credito.total_creditos || 0) -
      Number(publicado.credito.creditos_usados || 0);

    await updateUser({
      etapa: "menu",
      ...limparTempVagaPayload(),
    });

    if (user.vaga_destaque_temp) {
      await sendText(
        phone,
        `✅ *Vaga publicada com sucesso usando 1 crédito!*\n\n` +
          `📌 *Título:* ${publicado.vaga.titulo}\n` +
          `🎟️ *Créditos restantes neste pacote:* ${Math.max(0, restantesDepois)}\n\n` +
          `Como você marcou destaque, o sistema vai gerar a cobrança separada desse adicional.`
      );

      const payment = await cobrarDestaqueSeparado({ supabase, phone, user });

      if (!payment) {
        return sendActionButtons(phone, "O que deseja fazer agora?", [
          { id: "empresa_minhas_vagas", title: "Ver minhas vagas" },
          { id: "empresa_pacotes", title: "Ver pacotes" },
          { id: "voltar_menu", title: "Voltar ao menu" },
        ]);
      }

      return sendActionButtons(phone, "Depois do pagamento do destaque:", [
        { id: "payment_check_status", title: "Já paguei" },
        { id: "empresa_minhas_vagas", title: "Ver minhas vagas" },
        { id: "voltar_menu", title: "Voltar ao menu" },
      ]);
    }

    await sendText(
      phone,
      `✅ *Vaga publicada com sucesso!*\n\n` +
        `📌 *Título:* ${publicado.vaga.titulo}\n` +
        `🎟️ *Créditos restantes neste pacote:* ${Math.max(0, restantesDepois)}`
    );

    return sendActionButtons(phone, "O que deseja fazer agora?", [
      { id: "empresa_criar_vaga", title: "Criar outra vaga" },
      { id: "empresa_minhas_vagas", title: "Ver minhas vagas" },
      { id: "voltar_menu", title: "Voltar ao menu" },
    ]);
  }

  // =====================
  // MINHAS VAGAS
  // =====================

  if (text === "empresa_minhas_vagas") {
    const { data: vagas, error } = await supabase
      .from("vagas")
      .select("*")
      .eq("empresa_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    await updateUser({ etapa: "menu" });

    if (error) {
      console.error("❌ erro ao listar vagas da empresa:", error);
      await sendText(phone, "Erro ao buscar suas vagas.");
      return sendActionButtons(phone, "O que deseja fazer agora?", [
        { id: "voltar_menu", title: "Voltar ao menu" },
      ]);
    }

    if (!vagas?.length) {
      await sendText(phone, "Você ainda não criou nenhuma vaga.");
      return sendActionButtons(phone, "O que deseja fazer agora?", [
        { id: "empresa_criar_vaga", title: "Criar vaga" },
        { id: "empresa_pacotes", title: "Ver pacotes" },
        { id: "voltar_menu", title: "Voltar ao menu" },
      ]);
    }

    let out = "📋 *Suas vagas:*\n";
    for (const v of vagas) {
      const statusLabel =
        v.status === "ativa"
          ? "✅ Ativa"
          : v.status === "encerrada"
          ? "⛔ Encerrada"
          : v.status === "aberta"
          ? "✅ Ativa"
          : v.status;

      out += `\n• ${v.titulo} - ${statusLabel}`;
    }

    await sendText(phone, out);
    return sendActionButtons(phone, "O que deseja fazer agora?", [
      { id: "empresa_remover_vaga", title: "Remover vaga" },
      { id: "empresa_pacotes", title: "Ver pacotes" },
      { id: "voltar_menu", title: "Voltar ao menu" },
    ]);
  }

  if (text === "empresa_remover_vaga") {
    const { data: vagas, error } = await supabase
      .from("vagas")
      .select("id,titulo,status")
      .eq("empresa_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      console.error("❌ erro ao carregar vagas para remoção:", error);
      await sendText(phone, "Erro ao carregar vagas.");
      return sendActionButtons(phone, "O que deseja fazer agora?", [
        { id: "voltar_menu", title: "Voltar ao menu" },
      ]);
    }

    if (!vagas?.length) {
      await sendText(phone, "Você não tem vagas para remover.");
      return sendActionButtons(phone, "O que deseja fazer agora?", [
        { id: "voltar_menu", title: "Voltar ao menu" },
      ]);
    }

    await updateUser({ etapa: "empresa_remover_vaga_lista" });

    return sendList(phone, "Escolha a vaga que deseja remover:", [
      {
        title: "Suas vagas",
        rows: vagas.map((v) => ({
          id: `empresa_delete_vaga_${v.id}`,
          title: v.titulo.slice(0, 24),
          description: (v.status || "sem status").slice(0, 72),
        })),
      },
    ]);
  }

  if (user.etapa === "empresa_remover_vaga_lista") {
    if (!text.startsWith("empresa_delete_vaga_")) return false;

    const vagaId = text.replace("empresa_delete_vaga_", "");

    const { error } = await supabase
      .from("vagas")
      .delete()
      .eq("id", vagaId)
      .eq("empresa_id", user.id);

    await updateUser({ etapa: "menu" });

    if (error) {
      console.error("❌ erro ao remover vaga:", error);
      await sendText(phone, "Erro ao remover vaga.");
      return sendActionButtons(phone, "O que deseja fazer agora?", [
        { id: "empresa_minhas_vagas", title: "Ver minhas vagas" },
        { id: "voltar_menu", title: "Voltar ao menu" },
      ]);
    }

    await sendText(phone, "🗑️ Vaga removida com sucesso.");
    return sendActionButtons(phone, "O que deseja fazer agora?", [
      { id: "empresa_minhas_vagas", title: "Ver minhas vagas" },
      { id: "empresa_pacotes", title: "Ver pacotes" },
      { id: "voltar_menu", title: "Voltar ao menu" },
    ]);
  }

  return false;
}

export async function handleCompanyFallback(phone) {
  return sendMenuEmpresa(phone);
}