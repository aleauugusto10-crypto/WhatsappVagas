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
function normalizeBRPhone(phone = "") {
  let digits = String(phone || "").replace(/\D/g, "");

  if (!digits) return "";

  if (!digits.startsWith("55")) {
    digits = `55${digits}`;
  }

  const country = digits.slice(0, 2);
  const ddd = digits.slice(2, 4);
  let number = digits.slice(4);

  if (country === "55" && ddd.length === 2 && number.length === 8) {
    number = `9${number}`;
  }

  return `${country}${ddd}${number}`;
}

function getBRPhoneCandidates(phone = "") {
  const normalized = normalizeBRPhone(phone);
  const digits = String(phone || "").replace(/\D/g, "");

  const candidates = new Set([normalized, digits]);

  if (normalized.startsWith("55") && normalized.length === 13) {
    const withoutNine = `${normalized.slice(0, 4)}${normalized.slice(5)}`;
    candidates.add(withoutNine);
  }

  return [...candidates].filter(Boolean);
}


function parseMoneyFromText(text = "") {
  const clean = String(text || "")
    .replace("R$", "")
    .replace(/\s/g, "")
    .replace(",", ".");

  const value = Number(clean);

  return Number.isFinite(value) ? value : 0;
}

function calcStaffCommission(staff, amount) {
  const saleAmount = Number(amount || 0);
  const commissionValue = Number(staff?.commission_value || 0);

  if (!staff || staff.commission_type === "none") return 0;

  if (staff.commission_type === "percent") {
    return Number(((saleAmount * commissionValue) / 100).toFixed(2));
  }

  if (staff.commission_type === "fixed") {
    return Number(commissionValue.toFixed(2));
  }

  return 0;
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
  const paid = await processApprovedMercadoPagoPayment(String(payment.mp_payment_id));

  await new Promise((resolve) => setTimeout(resolve, 800));

  const { data: profileAtualizado, error: profileCheckError } = await supabase
    .from("profiles_pages")
    .select("id,is_active,subscription_status,subscription_expires_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profileCheckError) {
    console.error("❌ erro ao conferir ativação da página:", profileCheckError);
  }

  const paginaAtiva =
    profileAtualizado?.is_active === true &&
    profileAtualizado?.subscription_status === "active";

  if (!paginaAtiva) {
    console.log("⚠️ pagamento confirmado, mas página ainda não ativa:", {
      paymentId: payment.id,
      paidId: paid?.id,
      profileAtualizado,
    });

    return sendText(
      phone,
      "✅ Pagamento confirmado!\n\nSua ativação está finalizando. Aguarde alguns segundos e toque em *Já paguei* novamente."
    );
  }

  const editarId =
    user.tipo === "empresa" ? "empresa_editar_pagina" : "prof_editar_pagina";

  const verId =
    user.tipo === "empresa" ? "empresa_ver_perfil" : "prof_ver_pagina";

await sendText(
  phone,
  `✅ *Pagamento confirmado!*\n\n` +
    `Sua página agora está ativa e disponível para clientes 🚀\n\n` +
    `Agora você pode editar sua página e começar a receber clientes.`
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
async function findStaffByPhone(phone) {
  const candidates = getBRPhoneCandidates(phone);

  const { data, error } = await supabase
    .from("profile_staff")
    .select(`
      *,
      profiles_pages (
        id,
        nome,
        slug,
        whatsapp,
        user_id
      )
    `)
    .in("telefone", candidates)
    .eq("ativo", true)
    .eq("whatsapp_enabled", true)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("❌ erro findStaffByPhone:", error);
    return null;
  }

  return data || null;
}

function staffRoleLabel(role) {
  if (role === "manager") return "Gerente";
  if (role === "cashier") return "Caixa";
  return "Funcionário";
}

async function sendStaffMenu(phone, staff) {
  const rows = [];

  if (staff.can_view_orders) {
    rows.push({
      id: "staff_orders",
      title: "📦 Pedidos",
    });
  }

  if (staff.can_view_bookings) {
    rows.push({
      id: "staff_bookings",
      title: "📅 Agendamentos",
    });
  }

  if (staff.can_finalize_orders || staff.can_finalize_bookings) {
    rows.push({
      id: "staff_finalize",
      title: "✅ Finalizações",
    });
  }

  if (staff.receives_commission || staff.commission_type !== "none") {
    rows.push({
      id: "staff_commissions",
      title: "💰 Minhas comissões",
    });

    rows.push({
      id: "staff_affiliate",
      title: "🔗 Meu link de divulgação",
    });
  }

  rows.push({
    id: "staff_help",
    title: "🛟 Ajuda",
  });

  if (rows.length === 0) {
    return sendText(
      phone,
      "Você está cadastrado como funcionário, mas ainda não possui permissões liberadas. Fale com o dono da página."
    );
  }

  return sendList(
    phone,
    `👋 Olá, ${staff.nome}!\n\n` +
      `Você está no menu da equipe de *${staff.profiles_pages?.nome || "sua empresa"}*.\n\n` +
      `Cargo: ${staff.position_title || staffRoleLabel(staff.role)}\n\n` +
      `Escolha uma opção abaixo:`,
    [
      {
        title: "Menu da equipe",
        rows,
      },
    ]
  );
}

async function handleStaffMenu({ phone, text, staff }) {

if (staff.temp_action === "finish_booking" && staff.temp_booking_id) {
  const amount = parseMoneyFromText(text);

  if (!amount || amount <= 0) {
    return sendText(
      phone,
      "Valor inválido. Envie apenas o valor recebido.\n\nExemplo: *80* ou *80,00*"
    );
  }

  const bookingId = staff.temp_booking_id;
  const profilePageId = staff.profile_page_id || staff.profiles_pages?.id;
  const commissionAmount = calcStaffCommission(staff, amount);

  const { data: booking, error: bookingError } = await supabase
    .from("profile_bookings")
    .update({
      status: "completed",
      total: amount,
      paid_amount: amount,
      payment_status: "paid",
      payment_method: "manual",
      assigned_staff_id: staff.id,
      finalized_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", bookingId)
    .or(`staff_id.eq.${staff.id},assigned_staff_id.eq.${staff.id}`)
    .select()
    .single();

  if (bookingError) {
    console.error("❌ erro finalizar booking:", bookingError);
    return sendText(phone, "Erro ao finalizar atendimento.");
  }

  const { error: movementError } = await supabase
    .from("finance_movements")
    .insert({
      profile_page_id: profilePageId,
      type: "income",
      amount,
      payment_method: "manual",
      description: `Atendimento finalizado - ${booking.customer_name || "Cliente"}`,
      note: "Finalizado pelo funcionário via WhatsApp",
      source_type: "booking",
      source_id: bookingId,

      staff_id: staff.id,
      staff_name: staff.nome,

      registered_by_id: staff.id,
      registered_by_name: staff.nome,
      registered_by_role: staff.role || "staff",

      commission_amount: commissionAmount,
      commission_type: staff.commission_type || "none",
      commission_to_staff_id: staff.id,
      commission_to_staff_name: staff.nome,

      created_at: new Date().toISOString(),
    });

  if (movementError) {
    console.error("❌ erro movement booking:", movementError);
    return sendText(
      phone,
      "Atendimento finalizado, mas houve erro ao lançar no financeiro."
    );
  }

  await supabase
    .from("profile_staff")
    .update({
      temp_action: null,
      temp_booking_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", staff.id);


  return sendText(
    phone,
    `✅ Atendimento finalizado!\n\n` +
      `Valor recebido: *${amount.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      })}*\n` +
      `Comissão gerada: *${commissionAmount.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      })}*`
  );
}
  if (["menu", "oi", "inicio", "início", "staff_menu"].includes(text)) {
    return sendStaffMenu(phone, staff);
  }

  if (text === "staff_orders") {
  if (!staff.can_view_orders) {
    return sendText(phone, "Você não tem permissão para ver pedidos.");
  }

  const profilePageId = staff.profile_page_id || staff.profiles_pages?.id;

  let query = supabase
    .from("profile_orders")
    .select("*")
    .eq("profile_page_id", profilePageId)
    .in("status", ["pending", "confirmed"])
    .order("created_at", { ascending: false })
    .limit(10);

  const canSeeGeneralOrders =
    staff.role === "manager" ||
    staff.role === "cashier" ||
    staff.can_confirm_orders ||
    staff.can_finalize_orders;

  if (!canSeeGeneralOrders) {
    query = query.or(
      `staff_id.eq.${staff.id},assigned_staff_id.eq.${staff.id},seller_staff_id.eq.${staff.id}`
    );
  }

  const { data, error } = await query;

  if (error) {
    console.error("❌ erro staff_orders:", error);
    return sendText(phone, "Erro ao buscar pedidos.");
  }

  if (!data?.length) {
    return sendText(phone, "📦 Nenhum pedido pendente no momento.");
  }

  const rows = data.map((order) => ({
    id: `staff_order_${order.id}`,
    title: `${order.customer_name || "Cliente"} • ${
      order.has_quote ? "Orçamento" : money(order.total || 0)
    }`,
    description: `${order.status || "pendente"} • ${
      order.created_at ? new Date(order.created_at).toLocaleDateString("pt-BR") : ""
    }`,
  }));

  return sendList(phone, "📦 *Pedidos disponíveis:*\n\nEscolha um para ver detalhes:", [
    {
      title: "Pedidos",
      rows,
    },
  ]);
}

  if (text === "staff_bookings") {
  if (!staff.can_view_bookings) {
    return sendText(phone, "Você não tem permissão para ver agendamentos.");
  }

  const { data, error } = await supabase
    .from("profile_bookings")
    .select("*")
    .or(`staff_id.eq.${staff.id},assigned_staff_id.eq.${staff.id}`)
    .in("status", ["pending", "confirmed"])
    .order("date", { ascending: true })
    .order("time", { ascending: true })
    .limit(10);

  if (error) {
    console.error("❌ erro staff_bookings:", error);
    return sendText(phone, "Erro ao buscar seus agendamentos.");
  }

  if (!data?.length) {
    return sendText(phone, "📅 Você não possui agendamentos pendentes no momento.");
  }

  const rows = data.map((booking) => ({
    id: `staff_booking_${booking.id}`,
    title: `${booking.customer_name || "Cliente"} • ${booking.date}`,
    description: `${booking.time || ""} • ${booking.status || "pendente"}`,
  }));

  return sendList(phone, "📅 *Seus agendamentos:*\n\nEscolha um para ver detalhes:", [
    {
      title: "Agendamentos",
      rows,
    },
  ]);
}

  if (text === "staff_finalize") {
    return sendText(
      phone,
      "✅ *Finalizações*\n\nAqui vamos permitir finalizar pedido ou atendimento pelo WhatsApp, registrando pagamento no financeiro."
    );
  }

  if (text === "staff_commissions") {
    const pending = Number(staff.pending_commission_amount || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });

    return sendText(
      phone,
      `💰 *Minhas comissões*\n\n` +
        `Comissão configurada: ${
          staff.commission_type === "percent"
            ? `${Number(staff.commission_value || 0)}%`
            : staff.commission_type === "fixed"
            ? `R$ ${Number(staff.commission_value || 0).toFixed(2)}`
            : "Sem comissão"
        }\n\n` +
        `Comissão atual pendente: *${pending}*`
    );
  }

  if (text === "staff_affiliate") {
    const baseUrl =
      process.env.PROFILE_PUBLIC_BASE_URL ||
      process.env.FRONTEND_BASE_URL ||
      process.env.APP_PUBLIC_URL ||
      process.env.APP_BASE_URL ||
      "https://rendaja.online";

    const slug = staff.profiles_pages?.slug || "";
    const ref = staff.affiliate_code || staff.affiliate_slug || "";

    if (!slug || !ref) {
      return sendText(phone, "Seu link de divulgação ainda não foi gerado.");
    }

    return sendText(
      phone,
      `🔗 *Seu link de divulgação*\n\n` +
        `${baseUrl.replace(/\/$/, "")}/p/${slug}?ref=${ref}\n\n` +
        `Quando alguém comprar ou agendar por esse link, a comissão será vinculada a você.`
    );
  }

  if (text === "staff_help") {
    return sendText(
      phone,
      "🛟 *Ajuda da equipe*\n\nDigite *menu* para voltar ao menu da equipe."
    );
  }
  
  if (text.startsWith("staff_confirm_booking_")) {
  const bookingId = text.replace("staff_confirm_booking_", "");

  if (!staff.can_confirm_bookings) {
    return sendText(phone, "Você não tem permissão para confirmar agendamentos.");
  }

  const { error } = await supabase
    .from("profile_bookings")
    .update({
      status: "confirmed",
      updated_at: new Date().toISOString(),
    })
    .eq("id", bookingId)
    .or(`staff_id.eq.${staff.id},assigned_staff_id.eq.${staff.id}`);

  if (error) {
    console.error("❌ erro confirmar booking:", error);
    return sendText(phone, "Erro ao confirmar agendamento.");
  }

  return sendText(phone, "✅ Agendamento confirmado com sucesso.");
}

if (text.startsWith("staff_cancel_booking_")) {
  const bookingId = text.replace("staff_cancel_booking_", "");

  const { error } = await supabase
    .from("profile_bookings")
    .update({
      status: "cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("id", bookingId)
    .or(`staff_id.eq.${staff.id},assigned_staff_id.eq.${staff.id}`);

  if (error) {
    console.error("❌ erro cancelar booking:", error);
    return sendText(phone, "Erro ao cancelar agendamento.");
  }

  return sendText(phone, "🚫 Agendamento cancelado.");
}
if (text.startsWith("staff_confirm_order_")) {
  const orderId = text.replace("staff_confirm_order_", "");

  if (!staff.can_confirm_orders) {
    return sendText(phone, "Você não tem permissão para confirmar pedidos.");
  }

  const profilePageId = staff.profile_page_id || staff.profiles_pages?.id;

  const { error } = await supabase
    .from("profile_orders")
    .update({
      status: "confirmed",
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .eq("profile_page_id", profilePageId);

  if (error) {
    console.error("❌ erro confirmar pedido:", error);
    return sendText(phone, "Erro ao confirmar pedido.");
  }

  return sendText(phone, "✅ Pedido confirmado com sucesso.");
}

if (text.startsWith("staff_finish_order_")) {
  const orderId = text.replace("staff_finish_order_", "");

  if (!staff.can_finalize_orders) {
    return sendText(phone, "Você não tem permissão para finalizar pedidos.");
  }

  await sendText(
    phone,
    "💰 Para finalizar esse pedido, envie o valor recebido.\n\nExemplo: *120* ou *120,00*"
  );

  await supabase
    .from("profile_staff")
    .update({
      temp_action: "finish_order",
      temp_order_id: orderId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", staff.id);

  return;
}
if (text.startsWith("staff_cancel_order_")) {
  const orderId = text.replace("staff_cancel_order_", "");
  const profilePageId = staff.profile_page_id || staff.profiles_pages?.id;

  const { error } = await supabase
    .from("profile_orders")
    .update({
      status: "cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .eq("profile_page_id", profilePageId);

  if (error) {
    console.error("❌ erro cancelar pedido:", error);
    return sendText(phone, "Erro ao cancelar pedido.");
  }

  return sendText(phone, "🚫 Pedido cancelado.");
}
if (text.startsWith("staff_finish_booking_")) {
  const bookingId = text.replace("staff_finish_booking_", "");

  if (!staff.can_finalize_bookings) {
    return sendText(phone, "Você não tem permissão para finalizar agendamentos.");
  }

  await sendText(
    phone,
    "💰 Para finalizar esse atendimento, envie o valor recebido.\n\nExemplo: *80* ou *80,00*"
  );

  await supabase
    .from("profile_staff")
    .update({
      temp_action: "finish_booking",
      temp_booking_id: bookingId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", staff.id);

  return;
}
if (staff.temp_action === "finish_order" && staff.temp_order_id) {
  const amount = parseMoneyFromText(text);

  if (!amount || amount <= 0) {
    return sendText(
      phone,
      "Valor inválido. Envie apenas o valor recebido.\n\nExemplo: *120* ou *120,00*"
    );
  }

  const orderId = staff.temp_order_id;
  const profilePageId = staff.profile_page_id || staff.profiles_pages?.id;
  const commissionAmount = calcStaffCommission(staff, amount);

  const { data: order, error: orderError } = await supabase
    .from("profile_orders")
    .update({
      status: "delivered",
      paid_amount: amount,
      payment_status: "paid",
      payment_method: "manual",
      finalized_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .eq("profile_page_id", profilePageId)
    .select()
    .single();

  if (orderError) {
    console.error("❌ erro finalizar pedido:", orderError);
    return sendText(phone, "Erro ao finalizar pedido.");
  }

  const { error: movementError } = await supabase
    .from("finance_movements")
    .insert({
      profile_page_id: profilePageId,
      type: "income",
      amount,
      payment_method: "manual",
      description: `Pedido finalizado - ${order.customer_name || "Cliente"}`,
      note: "Finalizado pelo funcionário via WhatsApp",
      source_type: "order",
      source_id: orderId,

      items: Array.isArray(order.items) ? order.items : [],

      customer_name: order.customer_name || null,
      customer_phone: order.customer_phone || null,

      staff_id: staff.id,
      staff_name: staff.nome,

      registered_by_id: staff.id,
      registered_by_name: staff.nome,
      registered_by_role: staff.role || "staff",

      commission_amount: commissionAmount,
      commission_type: staff.commission_type || "none",
      commission_to_staff_id: staff.id,
      commission_to_staff_name: staff.nome,

      created_at: new Date().toISOString(),
    });

  if (movementError) {
    console.error("❌ erro movement pedido:", movementError);
    return sendText(
      phone,
      "Pedido finalizado, mas houve erro ao lançar no financeiro."
    );
  }

  await supabase
    .from("profile_staff")
    .update({
      temp_action: null,
      temp_order_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", staff.id);

  return sendText(
    phone,
    `✅ Pedido finalizado!\n\n` +
      `Valor recebido: *${amount.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      })}*\n` +
      `Comissão gerada: *${commissionAmount.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      })}*`
  );
}
if (text.startsWith("staff_booking_")) {
  const bookingId = text.replace("staff_booking_", "");

  const { data: booking, error } = await supabase
    .from("profile_bookings")
    .select("*")
    .eq("id", bookingId)
    .or(`staff_id.eq.${staff.id},assigned_staff_id.eq.${staff.id}`)
    .maybeSingle();

  if (error || !booking) {
    console.error("❌ erro staff_booking detalhe:", error);
    return sendText(phone, "Não consegui encontrar esse agendamento.");
  }

  const services = Array.isArray(booking.services) ? booking.services : [];

  const servicesText =
    services.length > 0
      ? services
          .map((service) => {
            const name =
              service.name ||
              service.title ||
              service.service_title ||
              "Serviço";

            const price =
              service.price_type === "quote"
                ? "Sob orçamento"
                : service.price
                ? `R$ ${Number(service.price || 0).toFixed(2)}`
                : "";

            return `• ${service.qty || 1}x ${name}${price ? ` — ${price}` : ""}`;
          })
          .join("\n")
      : "Serviço não informado";

  await sendText(
    phone,
    `📅 *Detalhes do agendamento*\n\n` +
      `👤 Cliente: ${booking.customer_name || "Cliente"}\n` +
      `📞 WhatsApp: ${booking.customer_phone || "Não informado"}\n` +
      `📅 Data: ${booking.date || "-"}\n` +
      `⏰ Horário: ${booking.time || "-"}\n` +
      `📌 Status: ${booking.status || "pending"}\n\n` +
      `🛠️ *Serviço(s):*\n${servicesText}\n` +
      `${booking.note ? `\n📝 Observação:\n${booking.note}` : ""}`
  );

  const buttons = [];

  if (booking.status === "pending" && staff.can_confirm_bookings) {
    buttons.push({
      id: `staff_confirm_booking_${booking.id}`,
      title: "Confirmar",
    });
  }

  if (booking.status === "confirmed" && staff.can_finalize_bookings) {
    buttons.push({
      id: `staff_finish_booking_${booking.id}`,
      title: "Finalizar",
    });
  }

  if (booking.status !== "cancelled") {
    buttons.push({
      id: `staff_cancel_booking_${booking.id}`,
      title: "Cancelar",
    });
  }

  buttons.push({
    id: "staff_bookings",
    title: "Voltar",
  });

  return sendActionButtons(phone, "O que deseja fazer?", buttons.slice(0, 3));
}
  return sendStaffMenu(phone, staff);
}
export async function handleMessage(msg) {
  
  const rawPhone = msg?.from;
const phone = normalizeBRPhone(rawPhone);

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
const staff = await findStaffByPhone(phone);

if (staff) {
  return handleStaffMenu({
    phone,
    text,
    staff,
  });
}
    const phoneCandidates = getBRPhoneCandidates(rawPhone);

let { data: user } = await supabase
  .from("usuarios")
  .select("*")
  .in("telefone", phoneCandidates)
  .order("created_at", { ascending: true })
  .limit(1)
  .maybeSingle();

if (user && user.telefone !== phone) {
  const { data: normalizedUser, error: normalizeError } = await supabase
    .from("usuarios")
    .update({ telefone: phone })
    .eq("id", user.id)
    .select()
    .single();

  if (!normalizeError && normalizedUser) {
    user = normalizedUser;
  }
}
const orderCodeMatch = String(text || "").match(
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
);

if (!user && orderCodeMatch) {
  const orderId = orderCodeMatch[0];

  const { data: order } = await supabase
    .from("profile_orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();

  if (order) {
    await sendText(
      phone,
      `📦 Pedido encontrado!\n\n` +
        `Status atual: *${order.status || "pending"}*\n\n` +
        `Assim que a loja confirmar seu pedido você será avisado aqui no WhatsApp.`
    );

    return;
  }
}
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
    .select("id, slug, is_active, subscription_status, subscription_expires_at")
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
  profile.subscription_status === "active";

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
      `💳 *Pagamento seguro via RendaJá*\n\n` +
    `🔐 O Pix pode aparecer no nome do responsável pela plataforma.\n` +
    `Isso é normal — o pagamento é processado com segurança.\n\n` +
    `📌 *PIX copia e cola:*`
  );

  

await sendText(phone, payment.qr_code);

if (payment.checkout_url) {
  await sendText(
    phone,
    `🔗 *Ou pague pelo link:*\n${payment.checkout_url}`
  );
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

