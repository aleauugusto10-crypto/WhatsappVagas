import { sendText } from "../services/whatsapp.js";
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
    .eq("status", "aberta")
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

function buildPixResumo(intent, plano) {
  const checkoutUrl = intent?.checkout_url || null;

  let out =
    `💳 Pagamento gerado com sucesso!\n\n` +
    `Plano: ${plano.nome}\n` +
    `Valor: R$ ${Number(plano.valor).toFixed(2)}`;

  if (checkoutUrl) {
    out += `\n\n🔗 Link de pagamento:\n${checkoutUrl}`;
  }

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
  afterSuccessLabel = "Acesso liberado após a aprovação do pagamento.",
}) {
  const plano = await getPlanoByCodigo(supabase, planoCodigo);

  if (!plano) {
    await sendText(phone, "Plano indisponível no momento.");
    return sendActionButtons(phone, "O que deseja fazer agora?", [
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
    },
  });

  if (!payment) {
    await sendText(phone, "Erro ao gerar cobrança.");
    return sendActionButtons(phone, "O que deseja fazer agora?", [
      { id: "user_ver_vagas", title: "Tentar novamente" },
      { id: "voltar_menu", title: "Voltar ao menu" },
    ]);
  }

  let intent = null;
  try {
    intent = await createMercadoPagoPixIntent(payment.id);
  } catch (err) {
    console.error("❌ erro ao gerar Pix das vagas:", err);
  }

  if (!intent) {
    await sendText(
      phone,
      `💳 Pedido criado com sucesso!\n\nPlano: ${plano.nome}\nValor: R$ ${Number(
        plano.valor
      ).toFixed(2)}\nPedido: ${
        payment.id
      }\n\nNão consegui gerar o Pix automaticamente agora, mas o pedido foi criado.`
    );

    return sendActionButtons(phone, "O que deseja fazer agora?", [
      { id: "user_ver_vagas", title: "Ver vagas de novo" },
      { id: "voltar_menu", title: "Voltar ao menu" },
    ]);
  }

  await sendText(phone, buildPixResumo(intent, plano));

  await sendText(
    phone,
    `\n\n${buildPixCodeOnly(intent)}`
  );

  await sendText(phone, afterSuccessLabel);

  return sendActionButtons(phone, "Depois do pagamento:", [
    { id: "payment_check_status", title: "Já paguei" },
    { id: "user_ver_vagas", title: "Ver vagas de novo" },
    { id: "voltar_menu", title: "Voltar ao menu" },
  ]);
}

export async function handleJobsMenu({
  user,
  text,
  phone,
  supabase,
}) {
  if (text === "user_redefinir_interesses") {
    return sendText(
      phone,
      "Envie 'redefinir perfil' no menu para refazer seus interesses."
    );
  }

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
        { id: "voltar_menu", title: "Voltar ao menu" },
      ]);
    }

    if (paidAccess) {
      const fullMessage = buildJobsPreview(vagas, false);
      await sendText(phone, fullMessage);
      return sendActionButtons(phone, "O que deseja fazer agora?", [
        { id: "user_ver_vagas", title: "Atualizar vagas" },
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

  if (text === "jobs_buy_single") {
    return gerarPagamentoPix({
      supabase,
      phone,
      user,
      planoCodigo: "vaga_avulsa_usuario",
      referenciaTipo: "usuario_vagas_avulso",
      afterSuccessLabel:
        "Assim que o pagamento for aprovado, você poderá visualizar essa busca.",
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
    });
  }

  return false;
}

export async function handleUserFallback(phone) {
  return sendMenuUsuario(phone);
}