import { sendText } from "../services/whatsapp.js";
import { sendMenuUsuario, sendActionButtons } from "./menus.js";
import {
  buildJobsPreview,
  createPendingPayment,
  getPlanoByCodigo,
  hasPaidAccessForJobs,
} from "../lib/monetization.js";

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

export async function handleJobsMenu({
  user,
  text,
  phone,
  supabase,
}) {
  if (text === "user_redefinir_interesses") {
    return sendText(phone, "Envie 'redefinir perfil' no menu para refazer seus interesses.");
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
    const plano = await getPlanoByCodigo(supabase, "vaga_avulsa_usuario");

    if (!plano) {
      await sendText(phone, "Plano indisponível no momento.");
      return sendActionButtons(phone, "O que deseja fazer agora?", [
        { id: "voltar_menu", title: "Voltar ao menu" },
      ]);
    }

    const payment = await createPendingPayment(supabase, {
      usuarioId: user.id,
      referenciaTipo: "usuario_vagas_avulso",
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

    await sendText(
      phone,
      `💳 Cobrança criada com sucesso!\n\nAcesso: ${plano.nome}\nValor: R$ ${Number(plano.valor).toFixed(2)}\nPedido: ${payment.id}\n\nEm seguida vamos conectar esse pedido ao pagamento.`
    );

    return sendActionButtons(phone, "O que deseja fazer agora?", [
      { id: "user_ver_vagas", title: "Ver vagas de novo" },
      { id: "voltar_menu", title: "Voltar ao menu" },
    ]);
  }

  if (text === "jobs_buy_week") {
    const plano = await getPlanoByCodigo(supabase, "vaga_semanal_usuario");

    if (!plano) {
      await sendText(phone, "Plano indisponível no momento.");
      return sendActionButtons(phone, "O que deseja fazer agora?", [
        { id: "voltar_menu", title: "Voltar ao menu" },
      ]);
    }

    const payment = await createPendingPayment(supabase, {
      usuarioId: user.id,
      referenciaTipo: "usuario_vagas_semanal",
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

    await sendText(
      phone,
      `💳 Cobrança criada com sucesso!\n\nPlano: ${plano.nome}\nValor: R$ ${Number(plano.valor).toFixed(2)}\nPedido: ${payment.id}\n\nQuando o pagamento for integrado, esse acesso libera suas buscas por 7 dias.`
    );

    return sendActionButtons(phone, "O que deseja fazer agora?", [
      { id: "user_ver_vagas", title: "Ver vagas de novo" },
      { id: "voltar_menu", title: "Voltar ao menu" },
    ]);
  }

  if (text === "jobs_buy_alert") {
    const plano = await getPlanoByCodigo(supabase, "alerta_mensal_usuario");

    if (!plano) {
      await sendText(phone, "Plano indisponível no momento.");
      return sendActionButtons(phone, "O que deseja fazer agora?", [
        { id: "voltar_menu", title: "Voltar ao menu" },
      ]);
    }

    const payment = await createPendingPayment(supabase, {
      usuarioId: user.id,
      referenciaTipo: "usuario_alerta_mensal",
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

    await sendText(
      phone,
      `🔔 Pedido de assinatura criado!\n\nPlano: ${plano.nome}\nValor: R$ ${Number(plano.valor).toFixed(2)}\nPedido: ${payment.id}\n\nEsse plano vai liberar a busca e também permitir receber notificações automáticas.`
    );

    return sendActionButtons(phone, "O que deseja fazer agora?", [
      { id: "user_ver_vagas", title: "Ver vagas de novo" },
      { id: "voltar_menu", title: "Voltar ao menu" },
    ]);
  }

  return false;
}

export async function handleUserFallback(phone) {
  return sendMenuUsuario(phone);
}