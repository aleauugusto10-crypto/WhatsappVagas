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
function getJobPackageDetails(packageId) {
  const map = {
    jobs_buy_single: {
      titulo: "Desbloqueio da busca atual",
      valor: 4.9,
      descricao:
        "Libera a lista completa da busca que você acabou de fazer. Ideal para ver todas as vagas disponíveis agora, sem assinatura.",
      confirmId: "confirm_jobs_buy_single",
      backId: "jobs_pacotes",
      backTitle: "Ver pacotes",
    },

    jobs_buy_week_base: {
      titulo: "Notificações semanais",
      valor: 9.9,
      descricao:
        "Você recebe notificações por 7 dias sempre que surgir vaga compatível com a sua categoria atual.",
      confirmId: "confirm_jobs_buy_week_base",
      backId: "jobs_pacotes",
      backTitle: "Ver pacotes",
    },

    jobs_buy_week_plus2: {
      titulo: "Notificações semanais + 2 categorias",
      valor: 13.8,
      descricao:
        "Você recebe notificações por 7 dias da sua categoria atual e também poderá ampliar para mais 2 categorias extras.",
      confirmId: "confirm_jobs_buy_week_plus2",
      backId: "jobs_pacotes",
      backTitle: "Ver pacotes",
    },

    jobs_buy_week_all: {
      titulo: "Notificações semanais totais",
      valor: 17.8,
      descricao:
        "Você recebe notificações por 7 dias de vagas em todas as categorias disponíveis.",
      confirmId: "confirm_jobs_buy_week_all",
      backId: "jobs_pacotes",
      backTitle: "Ver pacotes",
    },

    jobs_buy_month_base: {
      titulo: "Notificações mensais",
      valor: 19.9,
      descricao:
        "Você recebe notificações por 30 dias sempre que surgir vaga compatível com a sua categoria atual.",
      confirmId: "confirm_jobs_buy_month_base",
      backId: "jobs_pacotes",
      backTitle: "Ver pacotes",
    },

    jobs_buy_month_plus2: {
      titulo: "Notificações mensais + 2 categorias",
      valor: 23.8,
      descricao:
        "Você recebe notificações por 30 dias da sua categoria atual e também poderá ampliar para mais 2 categorias extras.",
      confirmId: "confirm_jobs_buy_month_plus2",
      backId: "jobs_pacotes",
      backTitle: "Ver pacotes",
    },

    jobs_buy_month_all: {
      titulo: "Notificações mensais totais",
      valor: 27.8,
      descricao:
        "Você recebe notificações por 30 dias de vagas em todas as categorias disponíveis.",
      confirmId: "confirm_jobs_buy_month_all",
      backId: "jobs_pacotes",
      backTitle: "Ver pacotes",
    },

    job_service_buy_30d: {
      titulo: "Perfil profissional por 30 dias",
      valor: 9.9,
      descricao:
        "Seu perfil profissional ficará visível por 30 dias nas buscas de pessoas e empresas que procurarem profissionais da sua área.",
      confirmId: "confirm_job_service_buy_30d",
      backId: "prof_pacotes",
      backTitle: "Ver divulgação",
    },

    job_service_highlight_30d: {
      titulo: "Destaque profissional por 30 dias",
      valor: 19.9,
      descricao:
        "Seu perfil profissional ficará em destaque por 30 dias, aparecendo com prioridade nas buscas da sua área.",
      confirmId: "confirm_job_service_highlight_30d",
      backId: "prof_pacotes",
      backTitle: "Ver divulgação",
    },
  };

  return map[packageId] || null;
}

async function explicarPacoteAntesDoPagamento(phone, packageId) {
  const pkg = getJobPackageDetails(packageId);

  if (!pkg) {
    return sendText(phone, "Não encontrei os detalhes desse pacote.");
  }

  await sendText(
    phone,
    `📦 *${pkg.titulo}*\n\n` +
      `💵 *Valor:* R$ ${Number(pkg.valor).toFixed(2)}\n\n` +
      `${pkg.descricao}`
  );

  return sendActionButtons(phone, "Deseja continuar?", [
    { id: pkg.confirmId, title: "Continuar" },
    { id: pkg.backId, title: pkg.backTitle },
    { id: "voltar_menu", title: "Voltar ao menu" },
  ]);
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
        { id: "jobs_buy_week_base", title: "Semanal R$ 9,90" },
        { id: "jobs_buy_week_plus2", title: "Semanal +2 cat. R$ 13,80" },
        { id: "jobs_buy_week_all", title: "Semanal total R$ 17,80" },
        { id: "jobs_buy_month_base", title: "Mensal R$ 19,90" },
        { id: "jobs_buy_month_plus2", title: "Mensal +2 cat. R$ 23,80" },
        { id: "jobs_buy_month_all", title: "Mensal total R$ 27,80" },
      ],
    },
    {
      title: "Divulgar trabalho",
      rows: [
        { id: "job_service_buy_30d", title: "Anunciar 30d R$ 9,90" },
        { id: "job_service_highlight_30d", title: "Destaque 30d R$ 19,90" },
      ],
    },
  ]);
}
async function mostrarPacotesProfissionais(phone) {
  return sendList(phone, "🧑‍🔧 *Divulgação profissional*", [
    {
      title: "Seu perfil profissional",
      rows: [
        { id: "job_service_buy_30d", title: "Perfil 30d R$ 9,90" },
        { id: "job_service_highlight_30d", title: "Destaque 30d R$ 19,90" },
      ],
    },
  ]);
}
function buildProfessionalProfileResumo(user) {
  const temPerfil = !!String(user?.descricao_perfil || "").trim();

  if (!temPerfil) {
    return (
      "🧑‍🔧 *Perfil profissional ainda não criado.*\n\n" +
      "Crie seu perfil para depois poder divulgar seu trabalho e aparecer nas buscas por profissionais."
    );
  }

  return (
    "🧑‍🔧 *Seu perfil profissional*\n\n" +
    `👤 *Nome:* ${user?.nome || "-"}\n` +
    `📍 *Cidade:* ${user?.cidade || "-"}${user?.estado ? `/${user.estado}` : ""}\n` +
    `🏷️ *Área:* ${user?.area_principal || "-"}\n` +
    `💼 *Categoria:* ${user?.categoria_principal || "-"}\n` +
    `📝 *Descrição:* ${user?.descricao_perfil || "-"}\n` +
    `📞 *WhatsApp:* ${user?.telefone || "-"}`
  );
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

if (text === "prof_pacotes") {
  return mostrarPacotesProfissionais(phone);
}

if (text === "prof_criar_perfil") {
  const { error } = await supabase
    .from("usuarios")
    .update({
      etapa: "prof_criar_perfil_descricao",
    })
    .eq("id", user.id);

  if (error) {
    console.error("❌ erro ao iniciar criação do perfil profissional:", error);
    await sendText(phone, "Erro ao iniciar seu perfil profissional.");
    return sendActionButtons(phone, "O que deseja fazer agora?", [
      { id: "voltar_menu", title: "Voltar ao menu" },
    ]);
  }

  user.etapa = "prof_criar_perfil_descricao";

  await sendText(
    phone,
    "🧑‍🔧 Vamos criar seu perfil profissional.\n\nDescreva de forma curta e clara o que você faz.\n\nExemplo:\nFaço vendas presenciais e online, atendimento ao cliente e fechamento de pedidos."
  );

  return sendActionButtons(phone, "O que deseja fazer agora?", [
    { id: "voltar_menu", title: "Voltar ao menu" },
  ]);
}
if (user.etapa === "prof_criar_perfil_descricao") {
  const descricao = String(text || "").trim();

  if (!descricao || descricao.length < 10) {
    await sendText(
      phone,
      "Descreva melhor seu trabalho em pelo menos 10 caracteres.\n\nExemplo:\nAtuo com vendas, atendimento ao cliente e fechamento de pedidos."
    );

    return sendActionButtons(phone, "O que deseja fazer agora?", [
      { id: "voltar_menu", title: "Voltar ao menu" },
    ]);
  }

  const { error } = await supabase
    .from("usuarios")
    .update({
      descricao_perfil: descricao,
      etapa: "menu",
    })
    .eq("id", user.id);

  if (error) {
    console.error("❌ erro ao salvar descrição do perfil profissional:", error);
    await sendText(phone, "Erro ao salvar seu perfil profissional.");
    return sendActionButtons(phone, "O que deseja fazer agora?", [
      { id: "prof_criar_perfil", title: "Tentar novamente" },
      { id: "voltar_menu", title: "Voltar ao menu" },
    ]);
  }

  user.descricao_perfil = descricao;
  user.etapa = "menu";

  await sendText(
    phone,
    "✅ *Perfil profissional criado com sucesso!*\n\nAgora você já pode visualizar seu perfil e contratar um pacote para divulgar seu trabalho."
  );

  await sendText(phone, buildProfessionalProfileResumo(user));

  return sendActionButtons(phone, "O que deseja fazer agora?", [
    { id: "prof_ver_perfil", title: "Ver meu perfil" },
    { id: "prof_pacotes", title: "Ver divulgação" },
    { id: "voltar_menu", title: "Voltar ao menu" },
  ]);
}
if (text === "prof_ver_perfil") {
  await sendText(phone, buildProfessionalProfileResumo(user));

  return sendActionButtons(phone, "O que deseja fazer agora?", [
    { id: "prof_criar_perfil", title: "Editar perfil" },
    { id: "prof_pacotes", title: "Ver divulgação" },
    { id: "voltar_menu", title: "Voltar ao menu" },
  ]);
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
if (text === "confirm_jobs_buy_single") {
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
      notificacao_scope: "categoria_atual",
      categorias_extras: [],
    },
    afterSuccessLabel:
      "Assim que o pagamento for aprovado, a lista completa desta busca ficará liberada.",
    backActionId: "user_ver_vagas",
    backActionTitle: "Ver vagas",
  });
}

if (text === "confirm_jobs_buy_week_base") {
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
      categorias_extras: [],
    },
    afterSuccessLabel:
      "Assim que o pagamento for aprovado, você passará a receber notificações semanais da sua categoria atual.",
  });
}

if (text === "confirm_jobs_buy_week_plus2") {
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
      categorias_extras: [],
    },
    afterSuccessLabel:
      "Assim que o pagamento for aprovado, suas notificações semanais ficarão liberadas para a categoria atual + 2 categorias extras.",
  });
}

if (text === "confirm_jobs_buy_week_all") {
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
      categorias_extras: [],
    },
    afterSuccessLabel:
      "Assim que o pagamento for aprovado, você passará a receber notificações semanais de todas as categorias.",
  });
}

if (text === "confirm_jobs_buy_month_base") {
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
      categorias_extras: [],
    },
    afterSuccessLabel:
      "Assim que o pagamento for aprovado, você passará a receber notificações mensais da sua categoria atual.",
  });
}

if (text === "confirm_jobs_buy_month_plus2") {
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
      categorias_extras: [],
    },
    afterSuccessLabel:
      "Assim que o pagamento for aprovado, suas notificações mensais ficarão liberadas para a categoria atual + 2 categorias extras.",
  });
}


if (text === "confirm_jobs_buy_month_all") {
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
      categorias_extras: [],
    },
    afterSuccessLabel:
      "Assim que o pagamento for aprovado, você passará a receber notificações mensais de todas as categorias.",
  });
}

if (text === "confirm_job_service_buy_30d") {
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
      categorias_extras: [],
    },
    afterSuccessLabel:
      "Assim que o pagamento for aprovado, seu perfil profissional ficará visível por 30 dias nas buscas.",
      backActionId: "prof_pacotes",
      backActionTitle: "Ver divulgação",
  });
}


if (text === "confirm_job_service_highlight_30d") {
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
      categorias_extras: [],
    },
    afterSuccessLabel:
      "Assim que o pagamento for aprovado, seu perfil profissional ficará em destaque nas buscas por 30 dias.",
    backActionId: "prof_pacotes",
    backActionTitle: "Ver divulgação",
  });
}


  // =====================
  // DESBLOQUEIO AVULSO DA BUSCA
  // =====================

  if (text === "jobs_buy_single") {
  return explicarPacoteAntesDoPagamento(phone, "jobs_buy_single");
}

  // =====================
  // NOTIFICAÇÕES SEMANAIS
  // =====================
if (text === "jobs_buy_week_base") {
  return explicarPacoteAntesDoPagamento(phone, "jobs_buy_week_base");
}


  if (text === "jobs_buy_week_plus2") {
  return explicarPacoteAntesDoPagamento(phone, "jobs_buy_week_plus2");
}

  if (text === "jobs_buy_week_all") {

  return explicarPacoteAntesDoPagamento(phone, "jobs_buy_week_all");

}



  // =====================
  // NOTIFICAÇÕES MENSAIS
  // =====================

  if (text === "jobs_buy_month_base") {

  return explicarPacoteAntesDoPagamento(phone, "jobs_buy_month_base");

}

  if (text === "jobs_buy_month_plus2") {

  return explicarPacoteAntesDoPagamento(phone, "jobs_buy_month_plus2");

}

  if (text === "jobs_buy_month_all") {

  return explicarPacoteAntesDoPagamento(phone, "jobs_buy_month_all");

}

  // =====================
  // DIVULGAR MEU TRABALHO
  // =====================

  if (text === "job_service_buy_30d") {

  return explicarPacoteAntesDoPagamento(phone, "job_service_buy_30d");

}

  if (text === "job_service_highlight_30d") {

  return explicarPacoteAntesDoPagamento(phone, "job_service_highlight_30d");

}

  return false;
}

export async function handleUserFallback(phone) {
  return sendMenuUsuario(phone);
}