import { sendList, sendText } from "../services/whatsapp.js";
import { sendMenuUsuario, sendActionButtons } from "./menus.js";
import {
  createPendingPayment,
  getPlanoByCodigo,
  hasPaidAccessForJobs,
} from "../lib/monetization.js";
import { createMercadoPagoPixIntent } from "../services/payments.js";

async function buscarVagasParaUsuario(supabase, user, limit = 30) {
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

  return map[tipo] || tipo || "A combinar";
}

function buildJobsPreviewLocked(vagas = []) {
  if (!vagas.length) {
    return "Sem vagas no momento para seu perfil.";
  }

  const preview = vagas.slice(0, 5);
  const restante = Math.max(0, vagas.length - preview.length);

  let out = "🔎 *Encontramos vagas para o seu perfil:*\n";

  preview.forEach((vaga) => {
    out +=
      `\n\n• *${vaga.titulo || "Vaga"}*` +
      `\n🏢 ${vaga.nome_empresa || "Empresa não informada"}` +
      `\n📍 ${vaga.cidade || "Sem cidade"}${vaga.estado ? `/${vaga.estado}` : ""}` +
      `\n💰 ${vaga.salario || "A combinar"}`;
  });

  if (restante > 0) {
    out += `\n\n📌 E ainda existem *mais ${restante} oportunidade(s)* nessa busca.`;
  }

  out +=
    "\n\n🔒 Para liberar a lista completa desta busca, o desbloqueio é *avulso por R$ 4,90*." +
    "\n\n📣 Se preferir, você também pode assinar um pacote de notificações.";

  return out;
}

function buildJobsFull(vagas = []) {
  if (!vagas.length) {
    return "Sem vagas no momento para seu perfil.";
  }

  let out = "💼 *Vagas disponíveis para você:*\n";

  vagas.forEach((vaga) => {
    out +=
      `\n\n• *${vaga.titulo || "Vaga"}*` +
      `\n🏢 ${vaga.nome_empresa || "Empresa não informada"}` +
      `\n📍 ${vaga.cidade || "Sem cidade"}${vaga.estado ? `/${vaga.estado}` : ""}` +
      `\n💰 ${vaga.salario || "A combinar"}` +
      `\n📌 ${formatTipoContratacao(vaga.tipo_contratacao)}` +
      `\n👥 ${vaga.quantidade_vagas || 1} posição(ões)`;
  });

  return out;
}

function buildPixResumo(intent, titulo, valor) {
  const checkoutUrl = intent?.checkout_url || null;

  let out =
    `💳 *Pagamento gerado com sucesso!*\n\n` +
    `📦 *Plano:* ${titulo}\n` +
    `💵 *Valor:* R$ ${Number(valor).toFixed(2)}`;

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
  planoCodigo = null,
  referenciaTipo,
  tituloPlano,
  valorFinal,
  metadataExtra = {},
  afterSuccessLabel = "Acesso liberado após a aprovação do pagamento.",
  backActionId = "jobs_pacotes",
  backActionTitle = "Ver pacotes",
}) {
  let plano = null;
  let valor = Number(valorFinal || 0);
  let titulo = tituloPlano || "Plano";

  if (planoCodigo) {
    plano = await getPlanoByCodigo(supabase, planoCodigo);

    if (!plano) {
      await sendText(phone, "Plano indisponível no momento.");
      return sendActionButtons(phone, "O que deseja fazer agora?", [
        { id: backActionId, title: backActionTitle },
        { id: "voltar_menu", title: "Voltar ao menu" },
      ]);
    }

    if (!valor) valor = Number(plano.valor || 0);
    if (!tituloPlano) titulo = plano.nome;
  }

  const payment = await createPendingPayment(supabase, {
    usuarioId: user.id,
    referenciaTipo,
    planoCodigo: plano?.codigo || planoCodigo,
    valor,
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
        `📦 *Plano:* ${titulo}\n` +
        `💵 *Valor:* R$ ${Number(valor).toFixed(2)}\n` +
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

  await sendText(phone, buildPixResumo(intent, titulo, valor));
  await sendText(phone, buildPixCodeOnly(intent));
  await sendText(phone, afterSuccessLabel);

  return sendActionButtons(phone, "Depois do pagamento:", [
    { id: "payment_check_status", title: "Já paguei" },
    { id: backActionId, title: backActionTitle },
    { id: "voltar_menu", title: "Voltar ao menu" },
  ]);
}

async function mostrarPacotesUsuario(phone) {
  return sendList(phone, "💼 *Pacotes do trabalhador*", [
    {
      title: "Buscar emprego",
      rows: [
        { id: "jobs_buy_week_base", title: "Semanal categoria atual - R$ 9,90" },
        { id: "jobs_buy_week_plus2", title: "Semanal + 2 categorias - R$ 13,80" },
        { id: "jobs_buy_week_all", title: "Semanal todas categorias - R$ 17,80" },
        { id: "jobs_buy_month_base", title: "Mensal categoria atual - R$ 19,90" },
        { id: "jobs_buy_month_plus2", title: "Mensal + 2 categorias - R$ 23,80" },
        { id: "jobs_buy_month_all", title: "Mensal todas categorias - R$ 27,80" },
      ],
    },
    {
      title: "Divulgar meu trabalho",
      rows: [
        { id: "job_service_buy_30d", title: "Anunciar meu serviço 30 dias - R$ 9,90" },
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
    const { vagas, error } = await buscarVagasParaUsuario(supabase, user, 30);

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
      await sendText(phone, buildJobsFull(vagas));

      return sendActionButtons(phone, "O que deseja fazer agora?", [
        { id: "user_ver_vagas", title: "Atualizar vagas" },
        { id: "jobs_pacotes", title: "Ver pacotes" },
        { id: "voltar_menu", title: "Voltar ao menu" },
      ]);
    }

    await sendText(phone, buildJobsPreviewLocked(vagas));

    return sendActionButtons(phone, "Escolha como deseja continuar:", [
      { id: "jobs_buy_single", title: "Liberar por R$ 4,90" },
      { id: "jobs_pacotes", title: "Ver pacotes" },
      { id: "voltar_menu", title: "Voltar ao menu" },
    ]);
  }

  // =====================
  // DESBLOQUEIO AVULSO DA BUSCA
  // =====================

  if (text === "jobs_buy_single") {
    return gerarPagamentoPix({
      supabase,
      phone,
      user,
      planoCodigo: "vaga_avulsa_usuario",
      referenciaTipo: "usuario_vagas_avulso",
      tituloPlano: "Desbloqueio da busca atual",
      valorFinal: 4.9,
      metadataExtra: {
        modo: "desbloqueio_busca_vagas",
        categoria_principal: user.categoria_principal,
      },
      afterSuccessLabel:
        "Assim que o pagamento for aprovado, a lista completa desta busca ficará liberada.",
      backActionId: "user_ver_vagas",
      backActionTitle: "Ver vagas",
    });
  }

  // =====================
  // NOTIFICAÇÕES SEMANAIS
  // =====================

  if (text === "jobs_buy_week_base") {
    return gerarPagamentoPix({
      supabase,
      phone,
      user,
      planoCodigo: "vaga_semanal_usuario",
      referenciaTipo: "usuario_vagas_semanal",
      tituloPlano: "Notificações semanais - categoria atual",
      valorFinal: 9.9,
      metadataExtra: {
        notificacao_scope: "categoria_atual",
      },
      afterSuccessLabel:
        "Assim que o pagamento for aprovado, você passará a receber notificações semanais da sua categoria atual.",
    });
  }

  if (text === "jobs_buy_week_plus2") {
    return gerarPagamentoPix({
      supabase,
      phone,
      user,
      planoCodigo: "vaga_semanal_usuario",
      referenciaTipo: "usuario_vagas_semanal",
      tituloPlano: "Notificações semanais - categoria atual + 2 extras",
      valorFinal: 13.8,
      metadataExtra: {
        notificacao_scope: "mais_2",
        adicional_categorias: 2,
      },
      afterSuccessLabel:
        "Assim que o pagamento for aprovado, suas notificações semanais ficarão liberadas para a categoria atual + 2 categorias extras.",
    });
  }

  if (text === "jobs_buy_week_all") {
    return gerarPagamentoPix({
      supabase,
      phone,
      user,
      planoCodigo: "vaga_semanal_usuario",
      referenciaTipo: "usuario_vagas_semanal",
      tituloPlano: "Notificações semanais - todas as categorias",
      valorFinal: 17.8,
      metadataExtra: {
        notificacao_scope: "todas",
      },
      afterSuccessLabel:
        "Assim que o pagamento for aprovado, você passará a receber notificações semanais de todas as categorias.",
    });
  }

  // =====================
  // NOTIFICAÇÕES MENSAIS
  // =====================

  if (text === "jobs_buy_month_base") {
    return gerarPagamentoPix({
      supabase,
      phone,
      user,
      planoCodigo: "alerta_mensal_usuario",
      referenciaTipo: "usuario_alerta_mensal",
      tituloPlano: "Notificações mensais - categoria atual",
      valorFinal: 19.9,
      metadataExtra: {
        notificacao_scope: "categoria_atual",
      },
      afterSuccessLabel:
        "Assim que o pagamento for aprovado, você passará a receber notificações mensais da sua categoria atual.",
    });
  }

  if (text === "jobs_buy_month_plus2") {
    return gerarPagamentoPix({
      supabase,
      phone,
      user,
      planoCodigo: "alerta_mensal_usuario",
      referenciaTipo: "usuario_alerta_mensal",
      tituloPlano: "Notificações mensais - categoria atual + 2 extras",
      valorFinal: 23.8,
      metadataExtra: {
        notificacao_scope: "mais_2",
        adicional_categorias: 2,
      },
      afterSuccessLabel:
        "Assim que o pagamento for aprovado, suas notificações mensais ficarão liberadas para a categoria atual + 2 categorias extras.",
    });
  }

  if (text === "jobs_buy_month_all") {
    return gerarPagamentoPix({
      supabase,
      phone,
      user,
      planoCodigo: "alerta_mensal_usuario",
      referenciaTipo: "usuario_alerta_mensal",
      tituloPlano: "Notificações mensais - todas as categorias",
      valorFinal: 27.8,
      metadataExtra: {
        notificacao_scope: "todas",
      },
      afterSuccessLabel:
        "Assim que o pagamento for aprovado, você passará a receber notificações mensais de todas as categorias.",
    });
  }

  // =====================
  // DIVULGAR MEU TRABALHO
  // =====================

  if (text === "job_service_buy_30d") {
    return gerarPagamentoPix({
      supabase,
      phone,
      user,
      planoCodigo: "profissional_anuncio_30d",
      referenciaTipo: "profissional_anuncio",
      tituloPlano: "Divulgação do meu serviço - 30 dias",
      valorFinal: 9.9,
      metadataExtra: {
        modo: "divulgacao_trabalho",
        categoria_chave: user.categoria_principal,
        contato_whatsapp: user.telefone,
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
      tituloPlano: "Destaque do meu serviço - 30 dias",
      valorFinal: 19.9,
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