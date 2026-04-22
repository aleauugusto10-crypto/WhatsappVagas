import { supabase } from "./supabase.js";
import { sendText } from "./services/whatsapp.js";
import {
  sendRootMenu,
  sendMenuUsuario,
  sendMenuContratante,
  sendMenuEmpresa,
} from "./flows/menus.js";
import { handleOnboarding } from "./flows/onboarding.js";
import { handleJobsMenu, handleUserFallback } from "./flows/jobs.js";
import {
  handleServicesMenu,
  handleContratanteFallback,
} from "./flows/services.js";
import { handleMissions } from "./flows/missions.js";
import {
  handleCompanyMenu,
  handleCompanyFallback,
} from "./flows/company.js";
import {
  getPendingPaymentById,
  getMercadoPagoPayment,
  processApprovedMercadoPagoPayment,
} from "./services/payments.js";

const processingUsers = new Set();

async function getCategorias(contexto) {
  const { data, error } = await supabase
    .from("categorias")
    .select("*")
    .eq("contexto", contexto)
    .eq("ativo", true)
    .order("nome");

  if (error) {
    console.error("❌ erro getCategorias:", error);
    return [];
  }

  return data || [];
}

async function getCategoriasPorGrupo(contexto, grupo) {
  const { data, error } = await supabase
    .from("categorias")
    .select("*")
    .eq("contexto", contexto)
    .eq("grupo", grupo)
    .eq("ativo", true)
    .order("nome");

  if (error) {
    console.error("❌ erro getCategoriasPorGrupo:", error);
    return [];
  }

  return data || [];
}

function getMenuByTipo(tipo, phone) {
  if (tipo === "empresa") return sendMenuEmpresa(phone);
  if (tipo === "contratante") return sendMenuContratante(phone);
  return sendMenuUsuario(phone);
}

async function getLastUserPayment(userId) {
  const { data, error } = await supabase
    .from("pagamentos_plataforma")
    .select("*")
    .eq("usuario_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("❌ erro ao buscar último pagamento do usuário:", error);
    return null;
  }

  return data || null;
}

async function handlePaymentCheckStatus(user, phone) {
  const payment = await getLastUserPayment(user.id);

  if (!payment) {
    return sendText(
      phone,
      "Não encontrei nenhum pagamento recente para verificar."
    );
  }

  // Se internamente já está pago, informa logo
  if (payment.status === "pago") {
    return sendText(
      phone,
      `✅ Seu pagamento já foi aprovado!\n\nPedido: ${payment.id}\nTipo: ${payment.referencia_tipo}`
    );
  }

  // Se existe mp_payment_id, tenta consultar no Mercado Pago
  if (payment.mp_payment_id) {
    try {
      const mpStatus = await getMercadoPagoPayment(payment.mp_payment_id);

      if (mpStatus?.status === "approved") {
        await processApprovedMercadoPagoPayment(String(payment.mp_payment_id));

        const updated = await getPendingPaymentById(payment.id);

        return sendText(
          phone,
          `✅ Pagamento confirmado com sucesso!\n\nPedido: ${
            updated?.id || payment.id
          }\nStatus: aprovado`
        );
      }

      return sendText(
        phone,
        `⏳ Seu pagamento ainda está pendente.\n\nPedido: ${payment.id}\nStatus atual: ${
          mpStatus?.status || payment.status || "pendente"
        }`
      );
    } catch (err) {
      console.error("❌ erro ao consultar status no Mercado Pago:", err);

      return sendText(
        phone,
        `⏳ Ainda não consegui confirmar esse pagamento.\n\nPedido: ${payment.id}\nTente novamente em instantes.`
      );
    }
  }

  return sendText(
    phone,
    `⏳ Seu pedido foi criado, mas ainda não encontrei confirmação de pagamento.\n\nPedido: ${payment.id}\nStatus: ${payment.status || "pendente"}`
  );
}

export async function handleMessage(msg) {
  const phone = msg?.from;
  if (!phone) return;

  if (processingUsers.has(phone)) {
    console.log("⏳ ignorado (já processando):", phone);
    return;
  }

  processingUsers.add(phone);

  try {
    const text =
      msg?.interactive?.button_reply?.id ||
      msg?.interactive?.list_reply?.id ||
      msg?.text?.body?.toLowerCase().trim() ||
      "";

    let { data: user, error: userError } = await supabase
      .from("usuarios")
      .select("*")
      .eq("telefone", phone)
      .maybeSingle();

    if (userError) {
      console.error("❌ erro ao buscar usuário:", userError);
      return sendText(phone, "Erro ao buscar usuário.");
    }

    if (!user) {
      const { data: created, error: createError } = await supabase
        .from("usuarios")
        .insert({
          telefone: phone,
          tipo: "usuario",
          etapa: "tipo",
          ativo: true,
          onboarding_finalizado: false,
        })
        .select()
        .single();

      if (createError) {
        console.error("❌ erro ao criar usuário:", createError);
        return sendText(phone, "Erro ao iniciar cadastro.");
      }

      user = created;
      return sendRootMenu(phone);
    }

    const updateUser = async (data) => {
      const { data: updated, error } = await supabase
        .from("usuarios")
        .update(data)
        .eq("id", user.id)
        .select()
        .single();

      if (error) {
        console.error("❌ erro ao atualizar usuário:", error);
        return null;
      }

      Object.assign(user, updated);
      return updated;
    };

    if (["oi", "menu", "inicio", "início"].includes(text)) {
      if (user.onboarding_finalizado) {
        return getMenuByTipo(user.tipo, phone);
      }
      return sendRootMenu(phone);
    }

    if (text === "voltar_menu") {
      return getMenuByTipo(user.tipo, phone);
    }

    if (text === "payment_check_status") {
      return handlePaymentCheckStatus(user, phone);
    }

    if (text === "redefinir_perfil") {
      const updated = await updateUser({
        etapa: "tipo",
        onboarding_finalizado: false,
        area_principal: null,
        categoria_principal: null,
        raio_km: 20,
      });

      if (!updated) {
        return sendText(phone, "Erro ao redefinir perfil.");
      }

      return sendRootMenu(phone);
    }

    const onboardingResponse = await handleOnboarding({
      user,
      text,
      phone,
      updateUser,
      getCategorias,
      getCategoriasPorGrupo,
    });

    if (onboardingResponse) return onboardingResponse;

    if (user.tipo === "usuario") {
      const jobsResponse = await handleJobsMenu({
        user,
        text,
        phone,
        supabase,
      });
      if (jobsResponse) return jobsResponse;

      const missionsResponse = await handleMissions({
        user,
        text,
        phone,
        supabase,
        updateUser,
      });
      if (missionsResponse) return missionsResponse;

      return handleUserFallback(phone);
    }

    if (user.tipo === "contratante") {
      const servicesResponse = await handleServicesMenu({
        user,
        text,
        phone,
        supabase,
        updateUser,
        getCategorias,
        getCategoriasPorGrupo,
      });
      if (servicesResponse) return servicesResponse;

      const missionsResponse = await handleMissions({
        user,
        text,
        phone,
        supabase,
        updateUser,
      });
      if (missionsResponse) return missionsResponse;

      return handleContratanteFallback(phone);
    }

    if (user.tipo === "empresa") {
      const companyResponse = await handleCompanyMenu({
        user,
        text,
        phone,
        supabase,
        updateUser,
        getCategorias,
        getCategoriasPorGrupo,
      });
      if (companyResponse) return companyResponse;

      return handleCompanyFallback(phone);
    }

    return sendRootMenu(phone);
  } catch (err) {
    console.error("❌ erro geral no bot:", err);
    return sendText(phone, "Erro ao processar sua mensagem.");
  } finally {
    processingUsers.delete(phone);
  }
}