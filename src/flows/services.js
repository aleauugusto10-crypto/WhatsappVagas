import { sendList, sendText } from "../services/whatsapp.js";
import { sendMenuContratante, sendActionButtons } from "./menus.js";
import {
  createPendingPayment,
  getPlanoByCodigo,
  hasPaidAccessForProfessionals,
} from "../lib/monetization.js";
import { createMercadoPagoPixIntent } from "../services/payments.js";

const gruposMap = {
  construcao: "construcao",
  saude: "saude",
  logistica: "transporte",
  vendas: "comercio",
  administrativo: "administracao",
  servicos_gerais: "limpeza",
  tecnologia: "tecnologia",
  outros: "tarefas",
};

function buildProfessionalsPreview(servicos = [], locked = true) {
  if (!servicos.length) {
    return "Nenhum profissional encontrado no momento.";
  }

  let out = locked
    ? "🔎 *Encontramos profissionais para sua busca:*\n"
    : "🧑‍🔧 *Profissionais encontrados:*\n";

  servicos.forEach((s) => {
    const titulo = s.titulo || "Profissional";
    const cidade = s.cidade || "Sem cidade";
    out += `\n• ${titulo} - ${cidade}`;
  });

  if (locked) {
    out += "\n\n🔒 Para ver a lista completa e os detalhes, escolha uma opção abaixo:";
  }

  return out;
}

function buildProfessionalCard(servico) {
  return (
    `🧑‍🔧 *Profissional encontrado*\n\n` +
    `💼 *Serviço:* ${servico.titulo || "-"}\n` +
    `📍 *Cidade:* ${servico.cidade || "-"}${servico.estado ? `/${servico.estado}` : ""}\n` +
    `📝 *Descrição:* ${servico.descricao || "-"}`
  );
}

function buildPixResumo(intent, plano) {
  const checkoutUrl = intent?.checkout_url || null;

  let out =
    `💳 *Pagamento gerado com sucesso!*\n\n` +
    `📦 *Plano:* ${plano.nome}\n` +
    `💵 *Valor:* R$ ${Number(plano.valor).toFixed(2)}`;

  if (checkoutUrl) {
    out += `\n\n🔗 *Link de pagamento:*\n${checkoutUrl}`;
  }

  out += `\n\n📌 *PIX copia e cola:*`;

  return out;
}

function buildPixCodeOnly(intent) {
  return intent?.qr_code || "Código Pix indisponível no momento.";
}

async function gerarPagamentoPixProfissionais({
  supabase,
  phone,
  user,
  planoCodigo,
  referenciaTipo,
  afterSuccessLabel = "Acesso liberado após a aprovação do pagamento.",
  backActionId = "contratar_pacotes",
  backActionTitle = "Ver pacotes",
}) {
  const plano = await getPlanoByCodigo(supabase, planoCodigo);

  if (!plano) {
    await sendText(phone, "Plano indisponível no momento.");
    return sendActionButtons(phone, "O que deseja fazer agora?", [
      { id: backActionId, title: backActionTitle },
      { id: "voltar_menu", title: "Voltar ao menu" },
    ]);
  }

  const payment = await createPendingPayment(supabase, {
    usuarioId: user.id,
    referenciaTipo,
    planoCodigo: plano.codigo,
    valor: plano.valor,
    metadata: {
      telefone: user.telefone,
      cidade: user.cidade,
      estado: user.estado,
      area_principal: user.area_principal,
      categoria_principal: user.categoria_principal,
    },
  });

  if (!payment) {
    await sendText(phone, "Erro ao gerar cobrança.");
    return sendActionButtons(phone, "O que deseja fazer agora?", [
      { id: backActionId, title: backActionTitle },
      { id: "voltar_menu", title: "Voltar ao menu" },
    ]);
  }

  let intent = null;
  try {
    intent = await createMercadoPagoPixIntent(payment.id);
  } catch (err) {
    console.error("❌ erro ao gerar Pix da busca de profissionais:", err);
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

    await sendText(phone, afterSuccessLabel);

    return sendActionButtons(phone, "Depois do pagamento:", [
      { id: "payment_check_status", title: "Já paguei" },
      { id: backActionId, title: backActionTitle },
      { id: "voltar_menu", title: "Voltar ao menu" },
    ]);
  }

  await sendText(phone, buildPixResumo(intent, plano));
  await sendText(phone, buildPixCodeOnly(intent));
  await sendText(phone, afterSuccessLabel);

  return sendActionButtons(phone, "Depois do pagamento:", [
    { id: "payment_check_status", title: "Já paguei" },
    { id: backActionId, title: backActionTitle },
    { id: "voltar_menu", title: "Voltar ao menu" },
  ]);
}

async function mostrarPacotesContratante(phone) {
  return sendList(phone, "🛠️ Escolha um pacote para buscar profissionais:", [
    {
      title: "Pacotes de busca",
      rows: [
        { id: "prof_buy_single", title: "Busca avulsa - R$ 7,90" },
        { id: "prof_buy_week", title: "Passe semanal - R$ 14,90" },
        { id: "prof_buy_month", title: "Passe mensal - R$ 29,90" },
      ],
    },
  ]);
}

export async function handleServicesMenu({
  user,
  text,
  phone,
  supabase,
  updateUser,
  getCategorias,
  getCategoriasPorGrupo,
}) {
  // =====================
  // MENU DE PACOTES
  // =====================

  if (text === "contratar_pacotes") {
    return mostrarPacotesContratante(phone);
  }

  // =====================
  // BUSCAR PROFISSIONAIS
  // =====================

  if (text === "contratar_buscar_profissionais") {
    const areas = await getCategorias("geral");

    await updateUser({ etapa: "contratar_area" });

    return sendList(phone, "🧑‍🔧 Em qual área você quer buscar profissionais?", [
      {
        title: "Áreas",
        rows: areas
          .filter((a) => a.chave !== "profissional")
          .map((a) => ({
            id: `contratar_area_${a.chave}`,
            title: a.nome,
          })),
      },
    ]);
  }

  if (user.etapa === "contratar_area") {
    if (!text.startsWith("contratar_area_")) return false;

    const area = text.replace("contratar_area_", "");

    await updateUser({
      area_principal: area,
      etapa: "contratar_categoria",
    });

    const grupo = gruposMap[area] || area;
    const categorias = await getCategoriasPorGrupo("servico", grupo);

    if (!categorias.length) {
      await updateUser({ etapa: "menu" });
      await sendText(phone, "Não encontrei categorias nessa área.");
      return sendActionButtons(phone, "O que deseja fazer agora?", [
        { id: "contratar_pacotes", title: "Ver pacotes" },
        { id: "voltar_menu", title: "Voltar ao menu" },
      ]);
    }

    return sendList(phone, "Escolha a categoria do profissional:", [
      {
        title: "Categorias",
        rows: categorias.map((c) => ({
          id: `contratar_cat_${c.chave}`,
          title: c.nome,
        })),
      },
    ]);
  }

  if (user.etapa === "contratar_categoria") {
    if (!text.startsWith("contratar_cat_")) return false;

    const categoria = text.replace("contratar_cat_", "");
    const paidAccess = await hasPaidAccessForProfessionals(supabase, user.id);

    await updateUser({
      categoria_principal: categoria,
      etapa: "menu",
    });

    const { data: servicos, error } = await supabase
      .from("servicos")
      .select("*")
      .eq("ativo", true)
      .eq("categoria_chave", categoria)
      .ilike("cidade", user.cidade || "")
      .limit(paidAccess ? 10 : 3);

    if (error) {
      console.error("❌ erro ao buscar profissionais:", error);
      await sendText(phone, "Erro ao buscar profissionais.");
      return sendActionButtons(phone, "O que deseja fazer agora?", [
        { id: "contratar_pacotes", title: "Ver pacotes" },
        { id: "voltar_menu", title: "Voltar ao menu" },
      ]);
    }

    if (!servicos?.length) {
      await sendText(phone, "Nenhum profissional encontrado nessa categoria no momento.");
      return sendActionButtons(phone, "O que deseja fazer agora?", [
        { id: "contratar_pacotes", title: "Ver pacotes" },
        { id: "voltar_menu", title: "Voltar ao menu" },
      ]);
    }

    if (paidAccess) {
      await sendText(phone, buildProfessionalsPreview(servicos, false));

      if (servicos[0]) {
        await sendText(phone, buildProfessionalCard(servicos[0]));
      }

      return sendActionButtons(phone, "O que deseja fazer agora?", [
        { id: "contratar_buscar_profissionais", title: "Buscar novamente" },
        { id: "contratar_pacotes", title: "Ver pacotes" },
        { id: "voltar_menu", title: "Voltar ao menu" },
      ]);
    }

    await sendText(phone, buildProfessionalsPreview(servicos, true));

    return sendActionButtons(phone, "Escolha como deseja desbloquear:", [
      { id: "prof_buy_single", title: "Pagar R$ 7,90" },
      { id: "prof_buy_week", title: "7 dias R$ 14,90" },
      { id: "prof_buy_month", title: "30 dias R$ 29,90" },
    ]);
  }

  // =====================
  // PLANOS DE BUSCA
  // =====================

  if (text === "prof_buy_single") {
    return gerarPagamentoPixProfissionais({
      supabase,
      phone,
      user,
      planoCodigo: "empresa_busca_prof_avulso",
      referenciaTipo: "contratante_busca_prof_avulso",
      afterSuccessLabel:
        "Assim que o pagamento for aprovado, você poderá visualizar essa busca.",
      backActionId: "contratar_pacotes",
      backActionTitle: "Ver pacotes",
    });
  }

  if (text === "prof_buy_week") {
    return gerarPagamentoPixProfissionais({
      supabase,
      phone,
      user,
      planoCodigo: "empresa_busca_prof_semanal",
      referenciaTipo: "contratante_busca_prof_semanal",
      afterSuccessLabel:
        "Assim que o pagamento for aprovado, suas buscas ficarão liberadas por 7 dias.",
      backActionId: "contratar_pacotes",
      backActionTitle: "Ver pacotes",
    });
  }

  if (text === "prof_buy_month") {
    return gerarPagamentoPixProfissionais({
      supabase,
      phone,
      user,
      planoCodigo: "empresa_busca_prof_mensal",
      referenciaTipo: "contratante_busca_prof_mensal",
      afterSuccessLabel:
        "Assim que o pagamento for aprovado, suas buscas ficarão liberadas por 30 dias.",
      backActionId: "contratar_pacotes",
      backActionTitle: "Ver pacotes",
    });
  }

  return false;
}

export async function handleContratanteFallback(phone) {
  return sendMenuContratante(phone);
}