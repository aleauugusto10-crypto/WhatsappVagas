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
const ownerTempActions = new Map();
const processingUsers = new Set();
async function findOwnerProfileByPhone(phone) {
  const candidates = getBRPhoneCandidates(phone);

  const { data, error } = await supabase
    .from("profiles_pages")
    .select("*")
    .in("whatsapp", candidates)
    .maybeSingle();

  if (error) {
    console.error("❌ erro findOwnerProfileByPhone:", error);
    return null;
  }

  return data || null;
}

function buildOwnerStaff(ownerProfile, phone) {
  return {
    id: null,
    nome: ownerProfile.nome || "Dono",
    telefone: phone,
    role: "owner",
    profile_page_id: ownerProfile.id,
    profiles_pages: ownerProfile,

    whatsapp_enabled: true,

    can_view_orders: true,
    can_confirm_orders: true,
    can_finalize_orders: true,

    can_view_bookings: true,
    can_confirm_bookings: true,
    can_finalize_bookings: true,

    commission_type: "none",
    commission_value: 0,
  };
}

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
function money(value = 0) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}
function paymentMethodLabel(method) {
  const map = {
    pix: "Pix",
    cash: "Dinheiro",
    card: "Cartão",
    debit_card: "Cartão de débito",
    credit_card: "Cartão de crédito",
    transfer: "Transferência",
    other: "Outro",
  };

  return map[method] || "Outro";
}

function sendPaymentMethodList(phone) {
  return sendList(phone, "💳 Como o cliente pagou?", [
    {
      title: "Forma de pagamento",
      rows: [
        { id: "paymethod_pix", title: "Pix" },
        { id: "paymethod_cash", title: "Dinheiro" },
        { id: "paymethod_debit_card", title: "Cartão débito" },
        { id: "paymethod_credit_card", title: "Cartão crédito" },
        { id: "paymethod_transfer", title: "Transferência" },
        { id: "paymethod_other", title: "Outro" },
      ],
    },
  ]);
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
async function getStaffById(staffId) {
  if (!staffId) return null;

  const { data, error } = await supabase
    .from("profile_staff")
    .select("*")
    .eq("id", staffId)
    .eq("ativo", true)
    .maybeSingle();

  if (error) {
    console.error("❌ erro getStaffById:", error);
    return null;
  }

  return data || null;
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
const isOwner = staff?.role === "owner";
const staffId = isOwner ? null : staff?.id;
const profilePageId = staff?.profile_page_id || staff?.profiles_pages?.id;

console.log("🧑‍💼 STAFF DEBUG:", {
  phone,
  text,
  role: staff?.role,
  staffId: staff?.id,
  isOwner,
  profilePageId,
});

const pendingPaymentAction = ownerTempActions.get(phone);

if (
  pendingPaymentAction?.action === "finish_payment_method" &&
  text.startsWith("paymethod_")
) {
  const paymentMethod = text.replace("paymethod_", "");
  const amount = Number(pendingPaymentAction.amount || 0);
  const profilePageId = pendingPaymentAction.profilePageId;

  if (pendingPaymentAction.type === "order") {
    const { data: order, error: orderError } = await supabase
      .from("profile_orders")
      .update({
        status: "delivered",
        paid_amount: amount,
        payment_status: "paid",
        payment_method: paymentMethod,
        finalized_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", pendingPaymentAction.orderId)
      .eq("profile_page_id", profilePageId)
      .select()
      .single();

    if (orderError) {
      console.error("❌ erro finalizar pedido:", orderError);
      return sendText(phone, "Erro ao finalizar pedido.");
    }

    const commissionStaffId =
  order.seller_staff_id ||
  order.assigned_staff_id ||
  order.staff_id ||
  null;

const commissionStaff = await getStaffById(commissionStaffId);

const commissionAmount = commissionStaff
  ? calcStaffCommission(commissionStaff, amount)
  : 0;

    await supabase.from("finance_movements").insert({
      profile_page_id: profilePageId,
      type: "income",
      amount,
      payment_method: paymentMethod,
      description: `Pedido finalizado - ${order.customer_name || "Cliente"}`,
      note:
        staff.role === "owner"
          ? "Finalizado pelo dono via WhatsApp"
          : "Finalizado pelo funcionário via WhatsApp",
      source_type: "order",
      source_id: order.id,
      items: Array.isArray(order.items) ? order.items : [],
      customer_name: order.customer_name || null,
      customer_phone: order.customer_phone || null,
     staff_id: commissionStaff?.id || null,
staff_name: commissionStaff?.nome || null,

registered_by_id: staff.role === "owner" ? null : staff.id,
registered_by_name: staff.role === "owner" ? "Dono" : staff.nome,
registered_by_role: staff.role || "staff",

commission_amount: commissionAmount,
commission_type: commissionStaff?.commission_type || "none",
commission_to_staff_id: commissionStaff?.id || null,
commission_to_staff_name: commissionStaff?.nome || null,
      created_at: new Date().toISOString(),
    });

    if (staff.role !== "owner") {
      await supabase
        .from("profile_staff")
        .update({
          temp_action: null,
          temp_order_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", staff.id);
    }

    ownerTempActions.delete(phone);

    const customerPhone = normalizeBRPhone(order.customer_phone);

    if (customerPhone) {
      await sendText(
        customerPhone,
        `✅ *Pedido finalizado!*\n\nSeu pedido foi concluído com sucesso.\n\nObrigado pela preferência! 🙌`
      );
    }

    return sendActionButtons(
      phone,
      `✅ Pedido finalizado!\n\nValor: *${money(amount)}*\nPagamento: *${paymentMethodLabel(paymentMethod)}*`,
      [
        { id: "staff_orders", title: "Pedidos" },
        { id: "staff_menu", title: "Menu" },
      ]
    );
  }

  if (pendingPaymentAction.type === "booking") {
    const { data: booking, error: bookingError } = await supabase
      .from("profile_bookings")
      .update({
        status: "completed",
        total: amount,
        paid_amount: amount,
        payment_status: "paid",
        payment_method: paymentMethod,
        
        finalized_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", pendingPaymentAction.bookingId)
      .eq("profile_page_id", profilePageId)
      .select()
      .single();

    if (bookingError) {
      console.error("❌ erro finalizar agendamento:", bookingError);
      return sendText(phone, "Erro ao finalizar agendamento.");
    }

    const commissionStaffId =
  booking.assigned_staff_id ||
  booking.staff_id ||
  booking.seller_staff_id ||
  null;

const commissionStaff = await getStaffById(commissionStaffId);

const commissionAmount = commissionStaff
  ? calcStaffCommission(commissionStaff, amount)
  : 0;

    await supabase.from("finance_movements").insert({
      profile_page_id: profilePageId,
      type: "income",
      amount,
      payment_method: paymentMethod,
      description: `Atendimento finalizado - ${booking.customer_name || "Cliente"}`,
      note:
        staff.role === "owner"
          ? "Finalizado pelo dono via WhatsApp"
          : "Finalizado pelo funcionário via WhatsApp",
      source_type: "booking",
      source_id: booking.id,
      customer_name: booking.customer_name || null,
      customer_phone: booking.customer_phone || null,
    staff_id: commissionStaff?.id || null,
staff_name: commissionStaff?.nome || null,

registered_by_id: staff.role === "owner" ? null : staff.id,
registered_by_name: staff.role === "owner" ? "Dono" : staff.nome,
registered_by_role: staff.role || "staff",

commission_amount: commissionAmount,
commission_type: commissionStaff?.commission_type || "none",
commission_to_staff_id: commissionStaff?.id || null,
commission_to_staff_name: commissionStaff?.nome || null,
      created_at: new Date().toISOString(),
    });

    if (staff.role !== "owner") {
      await supabase
        .from("profile_staff")
        .update({
          temp_action: null,
          temp_booking_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", staff.id);
    }

    ownerTempActions.delete(phone);

    const customerPhone = normalizeBRPhone(booking.customer_phone);

    if (customerPhone) {
      await sendText(
        customerPhone,
        `✅ *Atendimento finalizado!*\n\nSeu atendimento foi concluído com sucesso.\n\nObrigado pela preferência! 🙌`
      );
    }

    return sendActionButtons(
      phone,
      `✅ Atendimento finalizado!\n\nValor: *${money(amount)}*\nPagamento: *${paymentMethodLabel(paymentMethod)}*`,
      [
        { id: "staff_bookings", title: "Agenda" },
        { id: "staff_menu", title: "Menu" },
      ]
    );
  }
}
if (staff.temp_action === "finish_booking" && staff.temp_booking_id) {

  const amount = parseMoneyFromText(text);

  if (!amount || amount <= 0) {

    return sendText(

      phone,

      "Valor inválido. Envie apenas o valor recebido.\n\nExemplo: *80* ou *80,00*"

    );

  }

  ownerTempActions.set(phone, {

    action: "finish_payment_method",

    type: "booking",

    bookingId: staff.temp_booking_id,

    profilePageId: staff.profile_page_id || staff.profiles_pages?.id,

    amount,

  });

  return sendPaymentMethodList(phone);
}
const ownerBookingPendingAction = ownerTempActions.get(phone);

if (ownerBookingPendingAction?.action === "finish_booking") {
  const amount = parseMoneyFromText(text);

  if (!amount || amount <= 0) {
    return sendText(
      phone,
      "Valor inválido. Envie apenas o valor recebido.\n\nExemplo: *80* ou *80,00*"
    );
  }

  ownerTempActions.set(phone, {
    action: "finish_payment_method",
    type: "booking",
    bookingId: ownerBookingPendingAction.bookingId,
    profilePageId: ownerBookingPendingAction.profilePageId,
    amount,
  });

  return sendPaymentMethodList(phone);
}
if (["menu", "oi", "inicio", "início", "staff_menu"].includes(text)) {
    return sendStaffMenu(phone, staff);
  }

  if (text === "staff_orders" || text.startsWith("staff_orders_page_")) {
  if (!staff.can_view_orders) {
    return sendText(phone, "Você não tem permissão para ver pedidos.");
  }

  const profilePageId = staff.profile_page_id || staff.profiles_pages?.id;
const page = text.startsWith("staff_orders_page_")
  ? Number(text.replace("staff_orders_page_", "") || 0)
  : 0;

const pageSize = 9;
const from = page * pageSize;
const to = from + pageSize;
  let query = supabase
    .from("profile_orders")
    .select("*")
    .eq("profile_page_id", profilePageId)
    .in("status", ["pending", "confirmed"])
    .order("created_at", { ascending: true })
.range(from, to);

  const canSeeGeneralOrders =
    staff.role === "manager" ||
    staff.role === "cashier" ||
    staff.can_confirm_orders ||
    staff.can_finalize_orders;

  if (!canSeeGeneralOrders) {
  if (!staffId) {
    return sendText(phone, "Funcionário inválido para ver pedidos.");
  }

  query = query.or(
    `staff_id.eq.${staffId},assigned_staff_id.eq.${staffId},seller_staff_id.eq.${staffId}`
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

  let rows = data.slice(0, 9).map((order, index) => ({
  id: `staff_order_${order.id}`,
  title: `Pedido ${from + index + 1}`,
  description: `${String(order.customer_name || "Cliente").slice(0, 28)} • ${
    order.has_quote ? "Orçamento" : money(order.total || 0)
  }`,
}));

if (data.length > 9) {
  rows.push({
    id: `staff_orders_page_${page + 1}`,
    title: "Próxima página",
    description: "Ver mais pedidos",
  });
}

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

  const profilePageId = staff.profile_page_id || staff.profiles_pages?.id;

  let query = supabase
    .from("profile_bookings")
    .select("*")
    .eq("profile_page_id", profilePageId)
    .in("status", ["pending", "confirmed"])
    .order("date", { ascending: true })
    .order("time", { ascending: true })
    .limit(10);

  if (!isOwner) {
  if (!staffId) {
    return sendText(phone, "Funcionário inválido para ver agendamentos.");
  }

  query = query.or(`staff_id.eq.${staffId},assigned_staff_id.eq.${staffId}`);
}

  const { data, error } = await query;

  if (error) {
    console.error("❌ erro staff_bookings:", error);
    return sendText(phone, "Erro ao buscar seus agendamentos.");
  }

  if (!data?.length) {
    return sendText(phone, "📅 Nenhum agendamento pendente no momento.");
  }

  const rows = data.map((booking, index) => ({
    id: `staff_booking_${booking.id}`,
    title: `Agenda ${index + 1}`,
    description: `${String(booking.customer_name || "Cliente").slice(0, 24)} • ${
      booking.date || ""
    } ${booking.time || ""}`,
  }));

  return sendList(phone, "📅 *Agendamentos disponíveis:*\n\nEscolha um para ver detalhes:", [
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

  const isOwner = staff?.role === "owner" || staff?.id === "owner";
  const staffId = isOwner ? null : staff?.id;
  const profilePageId = staff?.profile_page_id || staff?.profiles_pages?.id;

  console.log("✅ CONFIRM BOOKING DEBUG:", {
    bookingId,
    role: staff?.role,
    staffIdOriginal: staff?.id,
    isOwner,
    staffId,
    profilePageId,
  });

  if (!staff.can_confirm_bookings) {
    return sendText(phone, "Você não tem permissão para confirmar agendamentos.");
  }

  let confirmBookingQuery = supabase
    .from("profile_bookings")
    .update({
      status: "confirmed",
      updated_at: new Date().toISOString(),
    })
    .eq("id", bookingId);

  if (isOwner) {
    confirmBookingQuery = confirmBookingQuery.eq("profile_page_id", profilePageId);
  } else {
    if (!staffId || staffId === "owner") {
      console.error("❌ staffId inválido ao confirmar booking:", staff);
      return sendText(phone, "Erro interno: funcionário inválido para confirmar agendamento.");
    }

    confirmBookingQuery = confirmBookingQuery.or(
      `staff_id.eq.${staffId},assigned_staff_id.eq.${staffId}`
    );
  }

  const { data: confirmedBooking, error } = await confirmBookingQuery
    .select()
    .single();

  if (error) {
    console.error("❌ erro confirmar booking:", error);
    return sendText(phone, "Erro ao confirmar agendamento.");
  }
const customerPhone = normalizeBRPhone(confirmedBooking.customer_phone);

if (customerPhone) {
  await sendText(
    customerPhone,
    `Olá, ${confirmedBooking.customer_name || "tudo bem"}! ✅\n\n` +
      `Seu agendamento foi confirmado.\n\n` +
      `📅 Data: ${confirmedBooking.date || "-"}\n` +
      `⏰ Horário: ${confirmedBooking.time || "-"}\n\n` +
      `Fique atento às próximas mensagens 📲`
  );
}
  await sendText(phone, "✅ Agendamento confirmado com sucesso.");

  return sendActionButtons(phone, "O que deseja fazer agora?", [
    {
      id: `staff_finish_booking_${confirmedBooking.id}`,
      title: "Finalizar",
    },
    {
      id: `staff_booking_${confirmedBooking.id}`,
      title: "Ver agenda",
    },
    {
      id: "staff_bookings",
      title: "Agenda",
    },
  ]);
}

if (text.startsWith("staff_cancel_booking_")) {
  const bookingId = text.replace("staff_cancel_booking_", "");

  let cancelBookingQuery = supabase
    .from("profile_bookings")
    .update({
      status: "cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("id", bookingId);

  if (isOwner) {
  cancelBookingQuery = cancelBookingQuery.eq(
    "profile_page_id",
    profilePageId
  );
} else {
  if (!staffId) {
    return sendText(phone, "Funcionário inválido para cancelar agendamento.");
  }

  cancelBookingQuery = cancelBookingQuery.or(
    `staff_id.eq.${staffId},assigned_staff_id.eq.${staffId}`
  );
}

  const { error } = await cancelBookingQuery;

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

  const { data: order, error } = await supabase
  .from("profile_orders")
  .update({
    status: "confirmed",
    updated_at: new Date().toISOString(),
  })
  .eq("id", orderId)
  .eq("profile_page_id", profilePageId)
  .select()
  .single();

  if (error) {
    console.error("❌ erro confirmar pedido:", error);
    return sendText(phone, "Erro ao confirmar pedido.");
  }
const customerPhone = normalizeBRPhone(order.customer_phone);

if (customerPhone) {
  await sendText(
    customerPhone,
    `Olá, ${order.customer_name || "tudo bem"}! ✅\n\n` +
      `Seu pedido foi confirmado e já está em atendimento.\n\n` +
      `Em alguns instantes, um atendente da loja poderá entrar em contato diretamente por este WhatsApp para confirmar os detalhes e dar continuidade ao seu pedido.\n\n` +
      `Fique atento às próximas mensagens 📲`
  );
}
  await sendText(phone, "✅ Pedido confirmado com sucesso.");

return sendActionButtons(phone, "O que deseja fazer agora?", [
  {
    id: `staff_finish_order_${order.id}`,
    title: "Finalizar",
  },
  {
    id: `staff_order_${order.id}`,
    title: "Ver pedido",
  },
  {
    id: "staff_orders",
    title: "Pedidos",
  },
]);
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

if (staff.role === "owner") {
  ownerTempActions.set(phone, {
    action: "finish_order",
    orderId,
    profilePageId: staff.profile_page_id || staff.profiles_pages?.id,
  });

  return;
}

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

  if (staff.role === "owner") {
    ownerTempActions.set(phone, {
      action: "finish_booking",
      bookingId,
      profilePageId: staff.profile_page_id || staff.profiles_pages?.id,
    });

    return;
  }

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
const ownerPendingAction = ownerTempActions.get(phone);

if (ownerPendingAction?.action === "finish_order") {

  const amount = parseMoneyFromText(text);

  if (!amount || amount <= 0) {

    return sendText(

      phone,

      "Valor inválido. Envie apenas o valor recebido.\n\nExemplo: *120* ou *120,00*"

    );

  }

  ownerTempActions.set(phone, {

    action: "finish_payment_method",

    type: "order",

    orderId: ownerPendingAction.orderId,

    profilePageId: ownerPendingAction.profilePageId,

    amount,

  });

  return sendPaymentMethodList(phone);

}
if (staff.temp_action === "finish_order" && staff.temp_order_id) {

  const amount = parseMoneyFromText(text);

  if (!amount || amount <= 0) {

    return sendText(

      phone,

      "Valor inválido. Envie apenas o valor recebido.\n\nExemplo: *120* ou *120,00*"

    );

  }

  ownerTempActions.set(phone, {

    action: "finish_payment_method",

    type: "order",

    orderId: staff.temp_order_id,

    profilePageId: staff.profile_page_id || staff.profiles_pages?.id,

    amount,

  });

  return sendPaymentMethodList(phone);
}

if (text.startsWith("staff_order_") && !text.startsWith("staff_orders_page_")) {
  const orderId = text.replace("staff_order_", "");
  const profilePageId = staff.profile_page_id || staff.profiles_pages?.id;

  const { data: order, error } = await supabase
    .from("profile_orders")
    .select("*")
    .eq("id", orderId)
    .eq("profile_page_id", profilePageId)
    .maybeSingle();

  if (error || !order) {
    console.error("❌ erro staff_order detalhe:", error);
    return sendText(phone, "Não consegui encontrar esse pedido.");
  }

  const items = Array.isArray(order.items) ? order.items : [];

  const itemsText = items.length
    ? items
        .map((item) => {
          const qty = item.qty || 1;
          const title = item.title || item.name || "Item";
          const price =
            item.price_type === "quote"
              ? "Sob orçamento"
              : money(Number(item.price || 0) * Number(qty));

          return `• ${qty}x ${title} — ${price}`;
        })
        .join("\n")
    : "Itens não informados";

  await sendText(
    phone,
    `📦 *Detalhes do pedido*\n\n` +
      `👤 Cliente: ${order.customer_name || "Cliente"}\n` +
      `📞 WhatsApp: ${order.customer_phone || "Não informado"}\n` +
      `📌 Status: ${order.status || "pending"}\n` +
      `💰 Total: ${
        order.has_quote ? "Sob orçamento" : money(order.total || 0)
      }\n\n` +
      `🛍️ *Itens:*\n${itemsText}\n` +
      `${order.note ? `\n📝 Observação:\n${order.note}` : ""}`
  );

  const buttons = [];

  if (order.status === "pending" && staff.can_confirm_orders) {
    buttons.push({
      id: `staff_confirm_order_${order.id}`,
      title: "Confirmar",
    });
  }

  if (order.status !== "delivered" && staff.can_finalize_orders) {
    buttons.push({
      id: `staff_finish_order_${order.id}`,
      title: "Finalizar",
    });
  }

  buttons.push({
    id: "staff_orders",
    title: "Pedidos",
  });

  return sendActionButtons(phone, "O que deseja fazer?", buttons.slice(0, 3));
}
if (text.startsWith("staff_booking_")) {
  const bookingId = text.replace("staff_booking_", "");

  let bookingQuery = supabase
  .from("profile_bookings")
  .select("*")
  .eq("id", bookingId);

if (isOwner) {
  bookingQuery = bookingQuery.eq(
    "profile_page_id",
    profilePageId
  );
} else {
  if (!staffId) {
    return sendText(phone, "Funcionário inválido para ver agendamento.");
  }

  bookingQuery = bookingQuery.or(
    `staff_id.eq.${staffId},assigned_staff_id.eq.${staffId}`
  );
}

const { data: booking, error } = await bookingQuery.maybeSingle();

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

      // =====================
// CLIENTE RESPONDE PRESENÇA DO AGENDAMENTO
// =====================
if (text.startsWith("booking_presence_confirm_")) {
  const bookingId = text.replace("booking_presence_confirm_", "");

  const { data: booking, error } = await supabase
    .from("profile_bookings")
    .update({
      confirmation_status: "confirmed",
      confirmed_at: new Date().toISOString(),
      customer_response_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", bookingId)
    .select(`
      *,
      profiles_pages (
        id,
        nome,
        whatsapp
      )
    `)
    .single();

  if (error || !booking) {
    console.error("❌ erro confirmar presença:", error);
    return sendText(phone, "Não consegui confirmar sua presença agora.");
  }

  const ownerPhone = normalizeBRPhone(booking.profiles_pages?.whatsapp);

  if (ownerPhone) {
    await sendText(
      ownerPhone,
      `✅ *Cliente confirmou presença!*\n\n` +
        `👤 Cliente: ${booking.customer_name || "Cliente"}\n` +
        `📞 WhatsApp: ${booking.customer_phone || phone}\n` +
        `📅 Data: ${booking.date || "-"}\n` +
        `⏰ Horário: ${booking.time || "-"}`
    );
  }

  return sendText(
    phone,
    `✅ Presença confirmada!\n\n` +
      `Seu agendamento está confirmado para:\n` +
      `📅 ${booking.date || "-"} às ${booking.time || "-"}`
  );
}

if (text.startsWith("booking_presence_cancel_")) {
  const bookingId = text.replace("booking_presence_cancel_", "");

  const { data: booking, error } = await supabase
    .from("profile_bookings")
    .update({
      status: "cancelled",
      confirmation_status: "cancelled",
      cancelled_by: "customer",
      customer_response_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", bookingId)
    .select(`
      *,
      profiles_pages (
        id,
        nome,
        whatsapp
      )
    `)
    .single();

  if (error || !booking) {
    console.error("❌ erro cancelar presença:", error);
    return sendText(phone, "Não consegui cancelar seu agendamento agora.");
  }

  const ownerPhone = normalizeBRPhone(booking.profiles_pages?.whatsapp);

  if (ownerPhone) {
    await sendText(
      ownerPhone,
      `🚫 *Cliente cancelou o agendamento!*\n\n` +
        `👤 Cliente: ${booking.customer_name || "Cliente"}\n` +
        `📞 WhatsApp: ${booking.customer_phone || phone}\n` +
        `📅 Data: ${booking.date || "-"}\n` +
        `⏰ Horário: ${booking.time || "-"}`
    );
  }

  return sendText(
    phone,
    "🚫 Seu agendamento foi cancelado. Obrigado por avisar."
  );
}

if (text.startsWith("booking_presence_reschedule_")) {
  const bookingId = text.replace("booking_presence_reschedule_", "");

  const { data: booking, error } = await supabase
    .from("profile_bookings")
    .update({
      confirmation_status: "reschedule_requested",
      customer_response_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", bookingId)
    .select(`
      *,
      profiles_pages (
        id,
        nome,
        whatsapp
      )
    `)
    .single();

  if (error || !booking) {
    console.error("❌ erro pedir reagendamento:", error);
    return sendText(phone, "Não consegui solicitar o reagendamento agora.");
  }

  const ownerPhone = normalizeBRPhone(booking.profiles_pages?.whatsapp);

  if (ownerPhone) {
    await sendText(
      ownerPhone,
      `🔄 *Cliente pediu reagendamento!*\n\n` +
        `👤 Cliente: ${booking.customer_name || "Cliente"}\n` +
        `📞 WhatsApp: ${booking.customer_phone || phone}\n` +
        `📅 Data atual: ${booking.date || "-"}\n` +
        `⏰ Horário atual: ${booking.time || "-"}\n\n` +
        `Entre em contato com o cliente para combinar outro horário.`
    );
  }

  return sendText(
    phone,
    `🔄 Solicitação de reagendamento enviada!\n\n` +
      `A loja/profissional foi avisado e poderá falar com você para combinar outro horário.`
  );
}
      const pendingOwnerAction = ownerTempActions.get(phone);

if (pendingOwnerAction) {
  const ownerProfile = await findOwnerProfileByPhone(phone);

  if (ownerProfile) {
    return handleStaffMenu({
      phone,
      text,
      staff: buildOwnerStaff(ownerProfile, phone),
    });
  }
}
      if (text.startsWith("staff_")) {
  const ownerProfile = await findOwnerProfileByPhone(phone);

  if (ownerProfile) {
    return handleStaffMenu({
      phone,
      text,
      staff: buildOwnerStaff(ownerProfile, phone),
    });
  }
}
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
        `Status atual: *${order.status || "pendente"}*\n\n` +
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

