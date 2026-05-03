import { supabase } from "./supabase.js";
import { sendText, sendList } from "./services/whatsapp.js";
import { handleSupport } from "./flows/support.js";
import {
  sendEntradaInicial,
  sendRootMenu,
  sendMenuUsuario,
  sendMenuContratante,
  sendMenuEmpresa,
  sendActionButtons,
} from "./flows/menus.js";
import { handleOnboarding } from "./flows/onboarding.js";
import { handleJobsMenu, handleUserFallback } from "./flows/jobs.js";
import { handleAdminMenu } from "./flows/admin.js";
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
  createProfilePageSubscriptionPayment,
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

async function getCategoriasPorGrupos(contexto, grupos = []) {
  if (!grupos.length) return [];

  const { data, error } = await supabase
    .from("categorias")
    .select("*")
    .eq("contexto", contexto)
    .in("grupo", grupos)
    .eq("ativo", true)
    .order("nome");

  if (error) {
    console.error("❌ erro getCategoriasPorGrupos:", error);
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
    console.error("❌ erro ao buscar último pagamento:", error);
    return null;
  }

  return data || null;
}

async function handlePaymentCheckStatus(user, phone) {
  const payment = await getLastUserPayment(user.id);

  if (!payment) {
    return sendText(phone, "Nenhum pagamento recente encontrado.");
  }

  if (payment.mp_payment_id) {
    try {
      const mpStatus = await getMercadoPagoPayment(payment.mp_payment_id);

      if (mpStatus?.status === "approved") {
  await processApprovedMercadoPagoPayment(String(payment.mp_payment_id));

  const editarId =
    user.tipo === "empresa" ? "empresa_editar_pagina" : "prof_editar_pagina";

  const verId =
    user.tipo === "empresa" ? "empresa_ver_perfil" : "prof_ver_pagina";

  await sendText(
    phone,
    `✅ *Pagamento confirmado!*\n\n` +
      `Sua página agora está ativa e disponível para clientes 🚀`
  );

  return sendActionButtons(phone, "O que deseja fazer agora?", [
    { id: editarId, title: "Editar página" },
    { id: verId, title: "Ver página" },
    { id: "voltar_menu", title: "Menu" },
  ]);
}

      return sendText(
        phone,
        `⏳ Pagamento pendente\nStatus: ${mpStatus?.status || "pendente"}`
      );
    } catch (err) {
      console.error("❌ erro MP:", err);

      return sendText(
        phone,
        "⏳ Ainda não consegui confirmar seu pagamento."
      );
    }
  }

  return sendText(
    phone,
    `⏳ Pedido criado, aguardando pagamento.\nID: ${payment.id}`
  );
}

export async function handleMessage(msg) {
  
  const phone = msg?.from;
  if (!phone) return;

  if (processingUsers.has(phone)) {
    console.log("⏳ ignorado:", phone);
    return;
  }

  processingUsers.add(phone);

  try {
    const text =
      msg?.interactive?.button_reply?.id ||
      msg?.interactive?.list_reply?.id ||
      msg?.text?.body?.toLowerCase().trim() ||
      "";

    let { data: user } = await supabase
      .from("usuarios")
      .select("*")
      .eq("telefone", phone)
      .maybeSingle();

    if (!user) {
      const { data: created } = await supabase
        .from("usuarios")
       .insert({
  telefone: phone,
  tipo: "usuario",
  etapa: "entrada",
  ativo: true,
  onboarding_finalizado: false,
})
        .select()
        .single();

      user = created;

await sendText(
  phone,
  "🤖 Você está falando com o assistente automático do RendaJá.\n\n" +
    "Ele ajuda no cadastro e nas principais dúvidas.\n\n" +
    "Se precisar, você também pode falar com um atendente humano.\n\n" +
    "A qualquer momento, digite *suporte* para abrir a Central de ajuda."
);

return sendEntradaInicial(phone);
    }

const updateUser = async (data) => {
  const { data: updated } = await supabase
    .from("usuarios")
    .update(data)
    .eq("id", user.id)
    .select()
    .single();

  Object.assign(user, updated);
  return updated;
};

const supportResponse = await handleSupport({
  user,
  text,
  phone,
  updateUser,
  supabase,
});

if (supportResponse) return supportResponse;

if (
  ["suporte_nome", "suporte_assunto", "suporte_fila", "suporte_em_atendimento"].includes(user.etapa)
) {
  const suporteTravado = await handleSupport({
    user,
    text,
    phone,
    updateUser,
    supabase,
  });

  if (suporteTravado) return suporteTravado;

  return sendText(
    phone,
    "Estamos no atendimento. Digite sua mensagem ou aguarde o retorno."
  );
}
const suporteIds = [
  "suporte_termos",
  "suporte_regras",
  "suporte_atendente",
];

if (suporteIds.includes(text)) {
  const suporteDireto = await handleSupport({
    user,
    text,
    phone,
    updateUser,
    supabase,
  });

  if (suporteDireto) return suporteDireto;

  return sendText(
    phone,
    "Não consegui abrir essa opção do suporte agora. Digite *suporte* para tentar novamente."
  );
}

const isAdmin = user?.tipo_admin === true;

if (isAdmin) {
  const adminResponse = await handleAdminMenu({
    user,
    text,
    phone,
    supabase,
    updateUser,
  });

  if (adminResponse) return adminResponse;
}
    // =====================
    // COMANDOS GLOBAIS
    // =====================


    if (text === "iniciar_cadastro") {
  await updateUser({
    etapa: "tipo",
    onboarding_finalizado: false,
  });

  return sendRootMenu(phone);
}

if (text === "abrir_suporte" || text === "suporte") {
  await updateUser({
    etapa: "suporte_menu",
  });

  return sendList(
  phone,
  "🛟 *Central de ajuda RendaJá*\n\n" +
  "Selecione uma opção abaixo ou fale com um atendente 👇",
  [
    {
      title: "Suporte",
      rows: [
        {
          id: "suporte_termos",
          title: "📄 Termos de uso",
        },
        {
          id: "suporte_regras",
          title: "📌 Regras da plataforma",
        },
        {
          id: "suporte_atendente",
          title: "👤 Falar com atendente",
        },
        {
          id: "iniciar_cadastro",
          title: "🚀 Criar cadastro",
        },
      ],
    },
  ]
);
}

    if (["oi", "menu", "inicio", "início"].includes(text)) {
  if (user.onboarding_finalizado) {
    return getMenuByTipo(user.tipo, phone);
  }

  await updateUser({
    etapa: "entrada",
  });

  return sendEntradaInicial(phone);
}

    if (text === "voltar_menu") {
      return getMenuByTipo(user.tipo, phone);
    }

    if (text === "payment_check_status") {
      return handlePaymentCheckStatus(user, phone);
    }
    if (text === "prof_editar_pagina" || text === "empresa_editar_pagina") {
  const { data: profile, error } = await supabase
    .from("profiles_pages")
    .select("id, slug, is_active, subscription_expires_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !profile) {
    return sendText(
      phone,
      "Você ainda não tem uma página criada. Primeiro crie sua página profissional."
    );
  }

  const assinaturaValida =
    profile.is_active === true &&
    (!profile.subscription_expires_at ||
      new Date(profile.subscription_expires_at) > new Date());

  if (!assinaturaValida) {
    await sendText(
      phone,
      "🔒 Sua página ainda não está ativa ou a assinatura expirou.\n\nPara acessar o painel e editar sua página, primeiro você precisa ativá-la."
    );

    return sendActionButtons(phone, "Deseja ativar sua página agora?", [
      { id: "comprar_pagina", title: "Ativar página" },
      { id: "prof_ver_pagina", title: "Ver página" },
      { id: "voltar_menu", title: "Voltar menu" },
    ]);
  }

  const dashboardUrl =
    process.env.DASHBOARD_URL ||
    "https://rendaja.online/dashboard/";

  return sendText(
    phone,
    `✏️ *Editar sua página*\n\n` +
      `Sua página está ativa ✅\n\n` +
      `Acesse o painel abaixo e faça login com o mesmo número do seu WhatsApp:\n\n` +
      `${dashboardUrl}`
  );
}
if (text === "comprar_pagina") {
  const { data: profile, error: profileError } = await supabase
    .from("profiles_pages")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return sendText(phone, "Ainda não encontrei sua página profissional.");
  }

  const payment = await createProfilePageSubscriptionPayment({
    user,
    profile,
  });

  if (!payment?.qr_code) {
    return sendText(phone, "Não consegui gerar o Pix agora. Tente novamente.");
  }

  await sendText(
    phone,
    `💎 *Ativar página profissional RendaJá*\n\n` +
      `📦 *Plano:* Página profissional mensal\n` +
      `💵 *Valor:* R$ 19,90/mês\n\n` +
      `ℹ️ O pagamento é processado com segurança pelo Mercado Pago.\n` +
      `Na hora do Pix, pode aparecer o nome do responsável pela conta de recebimento do RendaJá.\n\n` +
      `📌 *PIX copia e cola:*`
  );

  await sendText(phone, payment.qr_code);

  if (payment.checkout_url) {
    await sendText(phone, `🔗 *Link de pagamento:*\n${payment.checkout_url}`);
  }

  return sendActionButtons(phone, "Depois do pagamento:", [
    { id: "payment_check_status", title: "Já paguei" },
    { id: user.tipo === "empresa" ? "empresa_ver_perfil" : "prof_ver_pagina", title: "Ver página" },
    { id: "voltar_menu", title: "Voltar menu" },
  ]);
}
if (text === "prof_ver_pagina") {
  const { data: profile, error } = await supabase
    .from("profiles_pages")
    .select("slug,is_active,is_preview,preview_expires_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !profile) {
    return sendText(
      phone,
      "Você ainda não tem uma página pública criada. Primeiro crie seu perfil profissional."
    );
  }

  const baseUrl =
    process.env.PROFILE_PUBLIC_BASE_URL ||
    process.env.FRONTEND_BASE_URL ||
    process.env.APP_PUBLIC_URL ||
    process.env.APP_BASE_URL ||
    "https://rendaja.online";

  const link = `${baseUrl.replace(/\/$/, "")}/p/${profile.slug}`;

  const previewValida =
    profile.is_preview &&
    profile.preview_expires_at &&
    new Date(profile.preview_expires_at) > new Date();

  if (profile.is_active || previewValida) {
    await sendText(phone, `🌐 Sua página pública:\n${link}`);
  } else {
    await sendText(
      phone,
      `🌐 Sua página já foi criada, mas a prévia expirou.\n\nLink:\n${link}\n\nPara deixar online novamente, ative a página.`
    );
  }

  return sendActionButtons(phone, "O que deseja fazer?", [
    { id: "comprar_pagina", title: "Ativar página" },
    { id: "prof_criar_perfil", title: "Editar perfil" },
    { id: "voltar_menu", title: "Voltar ao menu" },
  ]);
}
    if (text === "redefinir_perfil") {
      await updateUser({
        etapa: "tipo",
        onboarding_finalizado: false,
        area_principal: null,
        categoria_principal: null,
        subcategorias_temp: [],
        raio_km: 20,
      });

      return sendRootMenu(phone);
    }

    // =====================
    // ONBOARDING
    // =====================

    const onboardingResponse = await handleOnboarding({
      user,
      text,
      phone,
      supabase,
      updateUser,
      getCategorias,
      getCategoriasPorGrupos,
    });

    if (onboardingResponse) return onboardingResponse;

    // =====================
    // USUÁRIO
    // =====================

    if (user.tipo === "usuario") {
      const jobs = await handleJobsMenu({
  user,
  text,
  phone,
  supabase,
  updateUser,
});
      if (jobs) return jobs;

      const missions = await handleMissions({
        user,
        text,
        phone,
        supabase,
        updateUser,
      });
      if (missions) return missions;

      return handleUserFallback(phone);
    }

    // =====================
    // CONTRATANTE
    // =====================

    if (user.tipo === "contratante") {
      const services = await handleServicesMenu({
        user,
        text,
        phone,
        supabase,
        updateUser,
        getCategorias,
        getCategoriasPorGrupos,
      });
      if (services) return services;

      const missions = await handleMissions({
        user,
        text,
        phone,
        supabase,
        updateUser,
      });
      if (missions) return missions;

      return handleContratanteFallback(phone);
    }

    // =====================
    // EMPRESA
    // =====================

    if (user.tipo === "empresa") {
  const company = await handleCompanyMenu({
    user,
    text,
    phone,
    supabase,
    updateUser,
    getCategorias,
    getCategoriasPorGrupos,
  });

  if (company) return company;

  const missions = await handleMissions({
    user,
    text,
    phone,
    supabase,
    updateUser,
  });

  if (missions) return missions;

  return handleCompanyFallback(phone);
}

    await updateUser({
  etapa: "entrada",
});

return sendEntradaInicial(phone);
  } catch (err) {
    console.error("❌ erro geral:", err);
    return sendText(phone, "Erro ao processar mensagem.");
  } finally {
    processingUsers.delete(phone);
  }
}