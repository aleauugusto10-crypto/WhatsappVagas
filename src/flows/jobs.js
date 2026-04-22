import { sendList, sendText } from "../services/whatsapp.js";
import { sendMenuUsuario, sendActionButtons } from "./menus.js";
import {
  buildJobsPreview,
  createPendingPayment,
  getPlanoByCodigo,
  hasPaidAccessForJobs,
} from "../lib/monetization.js";
import { createMercadoPagoPixIntent } from "../services/payments.js";

async function buscarVagasParaUsuario(supabase, user, limit = 10) {
  let query = supabase
    .from("vagas")
    .select("*")
    .eq("status", "ativa")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (user.categoria_principal) {
    query = query.eq("categoria_chave", user.categoria_principal);
  }

  if (user.cidade) {
    query = query.ilike("cidade", user.cidade);
  }

  if (user.estado) {
    query = query.eq("estado", user.estado);
  }

  const { data, error } = await query;

  if (error) {
    console.error("❌ erro ao buscar vagas:", error);
    return { vagas: [], error };
  }

  return { vagas: data || [], error: null };
}

function formatVagaResumo(vaga) {
  const empresa = vaga.nome_empresa || "Empresa não informada";
  const salario = vaga.salario || "A combinar";
  const tipo = vaga.tipo_contratacao || "A combinar";
  const qtd = vaga.quantidade_vagas || 1;

  return (
    `🏢 *Empresa:* ${empresa}\n` +
    `💼 *Vaga:* ${vaga.titulo || "-"}\n` +
    `📍 *Local:* ${vaga.cidade || "-"}${vaga.estado ? `/${vaga.estado}` : ""}\n` +
    `💰 *Salário:* ${salario}\n` +
    `📌 *Contratação:* ${tipo}\n` +
    `👥 *Quantidade:* ${qtd}`
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

async function gerarPagamentoPix({
  supabase,
  phone,
  user,
  planoCodigo,
  referenciaTipo,
  metadataExtra = {},
  afterSuccessLabel = "Acesso liberado após a aprovação do pagamento.",
  backActionId = "jobs_pacotes",
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
      categoria_principal: user.categoria_principal,
      ...metadataExtra,
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
    console.error("❌ erro ao gerar Pix:", err);
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

async function mostrarPacotesUsuario(phone) {
  return sendList(phone, "💼 Escolha um pacote:", [
    {
      title: "Pacotes para ver vagas",
      rows: [
        { id: "jobs_buy_single", title: "Ver vagas agora - R$ 4,90" },
        { id: "jobs_buy_week", title: "Passe semanal - R$ 9,90" },
        { id: "jobs_buy_alert", title: "Mensal + alertas - R$ 19,90" },
      ],
    },
    {
      title: "Pacotes para divulgar trabalho",
      rows: [
        { id: "job_service_buy_30d", title: "Anunciar serviço 30 dias - R$ 9,90" },
        { id: "job_service_highlight_30d", title: "Destaque profissional 30 dias - R$ 19,90" },
      ],
    },
  ]);
}

export async function handleJobsMenu({
  user,
  text,
  phone,
  supabase,
}) {
  // =====================
  // MENU DE PACOTES
  // =====================

  if (text === "jobs_pacotes") {
    return mostrarPacotesUsuario(phone);
  }

  // =====================
  // VER VAGAS
  // =====================

  if (text === "user_ver_vagas") {
    const paidAccess = await hasPaidAccessForJobs(supabase, user.id);

    const { vagas, error } = await buscarVagasParaUsuario(
      supabase,
      user,
      paidAccess ? 10 : 3
    );

    if (error) {
      await sendText(phone, "Erro ao buscar vagas.");
      return sendActionButtons(phone, "O que deseja fazer agora?", [
        { id: "voltar_menu", title: "Voltar ao menu" },
      ]);
    }

    if (!vagas.length) {
      await sendText(phone, "Sem vagas no momento para seu perfil.");
      return sendActionButtons(phone, "O que deseja fazer agora?", [
        { id: "jobs_pacotes", title: "Ver pacotes" },
        { id: "voltar_menu", title: "Voltar ao menu" },
      ]);
    }

    if (paidAccess) {
      const fullMessage = buildJobsPreview(vagas, false);
      await sendText(phone, fullMessage);

      if (vagas[0]) {
        await sendText(phone, formatVagaResumo(vagas[0]));
      }

      return sendActionButtons(phone, "O que deseja fazer agora?", [
        { id: "user_ver_vagas", title: "Atualizar vagas" },
        { id: "jobs_pacotes", title: "Ver pacotes" },
        { id: "voltar_menu", title: "Voltar ao menu" },
      ]);
    }

    const previewMessage = buildJobsPreview(vagas, true);
    await sendText(phone, previewMessage);

    return sendActionButtons(phone, "Escolha como deseja desbloquear:", [
      { id: "jobs_buy_single", title: "Pagar R$ 4,90" },
      { id: "jobs_buy_week", title: "7 dias R$ 9,90" },
      { id: "jobs_buy_alert", title: "30 dias R$ 19,90" },
    ]);
  }

  // =====================
  // PACOTES PARA VER VAGAS
  // =====================

  if (text === "jobs_buy_single") {
    return gerarPagamentoPix({
      supabase,
      phone,
      user,
      planoCodigo: "vaga_avulsa_usuario",
      referenciaTipo: "usuario_vagas_avulso",
      afterSuccessLabel:
        "Assim que o pagamento for aprovado, você poderá visualizar essa busca.",
      backActionId: "jobs_pacotes",
      backActionTitle: "Ver pacotes",
    });
  }

  if (text === "jobs_buy_week") {
    return gerarPagamentoPix({
      supabase,
      phone,
      user,
      planoCodigo: "vaga_semanal_usuario",
      referenciaTipo: "usuario_vagas_semanal",
      afterSuccessLabel:
        "Assim que o pagamento for aprovado, suas buscas ficarão liberadas por 7 dias.",
      backActionId: "jobs_pacotes",
      backActionTitle: "Ver pacotes",
    });
  }

  if (text === "jobs_buy_alert") {
    return gerarPagamentoPix({
      supabase,
      phone,
      user,
      planoCodigo: "alerta_mensal_usuario",
      referenciaTipo: "usuario_alerta_mensal",
      afterSuccessLabel:
        "Assim que o pagamento for aprovado, sua busca será liberada e você também poderá receber notificações automáticas.",
      backActionId: "jobs_pacotes",
      backActionTitle: "Ver pacotes",
    });
  }

  // =====================
  // PACOTES PARA DIVULGAR TRABALHO
  // =====================

  if (text === "job_service_buy_30d") {
    return gerarPagamentoPix({
      supabase,
      phone,
      user,
      planoCodigo: "profissional_anuncio_30d",
      referenciaTipo: "profissional_anuncio",
      metadataExtra: {
        modo: "divulgacao_trabalho",
      },
      afterSuccessLabel:
        "Assim que o pagamento for aprovado, seu anúncio profissional poderá ser publicado por 30 dias.",
      backActionId: "jobs_pacotes",
      backActionTitle: "Ver pacotes",
    });
  }

  if (text === "job_service_highlight_30d") {
    return gerarPagamentoPix({
      supabase,
      phone,
      user,
      planoCodigo: "profissional_destaque_30d",
      referenciaTipo: "profissional_destaque",
      metadataExtra: {
        modo: "destaque_trabalho",
      },
      afterSuccessLabel:
        "Assim que o pagamento for aprovado, seu anúncio profissional ficará em destaque por 30 dias.",
      backActionId: "jobs_pacotes",
      backActionTitle: "Ver pacotes",
    });
  }

  return false;
}

export async function handleUserFallback(phone) {
  return sendMenuUsuario(phone);
}