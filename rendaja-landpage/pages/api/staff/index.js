import { supabase } from "../../../src/lib/supabase";

function onlyDigits(value = "") {
  return String(value || "").replace(/\D/g, "");
}

function normalizeCommissionType(value) {
  if (["none", "percent", "fixed"].includes(value)) return value;
  return "none";
}
function generateAffiliateCode(nome = "") {
  const clean = String(nome || "funcionario")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");

  const random = Math.floor(1000 + Math.random() * 9000);

  return `${clean || "func"}${random}`;
}
async function upsertStaffRecurringExpense(staff) {
  if (!staff?.id || !staff?.profile_page_id) return;

  const fixedSalary = Number(staff.fixed_salary || 0);
  const noteKey = `staff_id:${staff.id}`;

  const { data: existing } = await supabase
    .from("finance_recurring_expenses")
    .select("*")
    .eq("profile_page_id", staff.profile_page_id)
    .eq("category", "staff_payment")
    .ilike("note", `%${noteKey}%`)
    .maybeSingle();

  if (fixedSalary <= 0) {
    if (existing?.id) {
      await supabase
        .from("finance_recurring_expenses")
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
    }

    return;
  }

  const payload = {
  profile_page_id: staff.profile_page_id,
  title: `Pagamento funcionário - ${staff.nome}`,

  amount: fixedSalary,
  base_amount: fixedSalary,
  fixed_salary: fixedSalary,
  pending_commission_amount: 0,

  staff_id: staff.id,

  payment_method: "cash",
  category: "staff_payment",
  frequency: staff.payment_frequency || "monthly",
  next_due_date: staff.next_payment_date || null,

  note: `${noteKey} | Pagamento recorrente do funcionário ${staff.nome}`,
  is_active: true,
  updated_at: new Date().toISOString(),
};

  if (existing?.id) {
    await supabase
      .from("finance_recurring_expenses")
      .update(payload)
      .eq("id", existing.id);

    return;
  }

  await supabase.from("finance_recurring_expenses").insert({
    ...payload,
    created_at: new Date().toISOString(),
  });
}

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const { profilePageId } = req.query;

      if (!profilePageId) {
        return res.status(400).json({ error: "profilePageId obrigatório." });
      }

      const { data, error } = await supabase
        .from("profile_staff")
        .select("*")
        .eq("profile_page_id", profilePageId)
        .eq("ativo", true)
        .order("nome", { ascending: true });

      if (error) throw error;

const staffList = data || [];

const { data: commissions, error: commissionError } = await supabase
  .from("finance_movements")
  .select("commission_amount, commission_to_staff_id, created_at")
  .eq("profile_page_id", profilePageId)
  .gt("commission_amount", 0);

if (commissionError) throw commissionError;

const enrichedStaff = staffList.map((staff) => {
  const lastPaidAt = staff.last_commission_payment_at
    ? new Date(staff.last_commission_payment_at)
    : null;

  const pendingCommission = (commissions || [])
    .filter((movement) => {
      if (String(movement.commission_to_staff_id) !== String(staff.id)) {
        return false;
      }

      if (lastPaidAt && new Date(movement.created_at) <= lastPaidAt) {
        return false;
      }

      return true;
    })
    .reduce(
      (acc, movement) => acc + Number(movement.commission_amount || 0),
      0
    );

  return {
    ...staff,
    pending_commission_amount: pendingCommission,
  };
});

return res.status(200).json(enrichedStaff);
    }

    if (req.method === "POST") {
  const {
  profilePageId,
  nome,
  telefone,
  email,
  role = "staff",
  positionTitle = "",
  fixedSalary = 0,
        paymentFrequency = "monthly",
        nextPaymentDate = null,
        commissionType = "none",
        commissionValue = 0,
        specialties = [],
        workingDays = [1, 2, 3, 4, 5, 6],
        workingHours = { start: 8, end: 18, interval: 1 },
        canViewOrders = false,
canViewBookings = false,
canConfirmOrders = false,
canConfirmBookings = false,
canFinalizeOrders = false,
canFinalizeBookings = false,
receivesCommission = false,
whatsappEnabled = true,
      } = req.body || {};

      if (!profilePageId) {
        return res.status(400).json({ error: "profilePageId obrigatório." });
      }

      if (!nome) {
        return res.status(400).json({ error: "Nome obrigatório." });
      }

      const finalCommissionType = normalizeCommissionType(commissionType);
const affiliateCode = generateAffiliateCode(nome);
      const payload = {
        profile_page_id: profilePageId,
        nome: String(nome).trim(),
        telefone: onlyDigits(telefone) || null,
        email: email || null,
role,
fixed_salary: Number(fixedSalary || 0),
        payment_frequency: paymentFrequency || "monthly",
        next_payment_date: nextPaymentDate || null,
        commission_type: finalCommissionType,
        commission_value:
          finalCommissionType === "none" ? 0 : Number(commissionValue || 0),
        specialties: Array.isArray(specialties) ? specialties : [],
        working_days: Array.isArray(workingDays)
          ? workingDays
          : [1, 2, 3, 4, 5, 6],
        working_hours: workingHours || { start: 8, end: 18, interval: 1 },
        ativo: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        position_title: positionTitle || null,

can_view_orders: !!canViewOrders,
can_view_bookings: !!canViewBookings,
can_confirm_orders: !!canConfirmOrders,
can_confirm_bookings: !!canConfirmBookings,
can_finalize_orders: !!canFinalizeOrders,
can_finalize_bookings: !!canFinalizeBookings,

receives_commission:
  receivesCommission === true || finalCommissionType !== "none",

whatsapp_enabled: whatsappEnabled !== false,

affiliate_code: affiliateCode,
affiliate_slug: affiliateCode,
      };

      const { data, error } = await supabase
        .from("profile_staff")
        .insert(payload)
        .select()
        .single();

      if (error) throw error;

      await upsertStaffRecurringExpense(data);

      return res.status(201).json(data);
    }

    if (req.method === "PATCH") {
      const { staffId, updates = {} } = req.body || {};
if ("canViewOrders" in updates) payload.can_view_orders = !!updates.canViewOrders;
if ("canViewBookings" in updates) payload.can_view_bookings = !!updates.canViewBookings;

if ("canConfirmOrders" in updates) payload.can_confirm_orders = !!updates.canConfirmOrders;
if ("canConfirmBookings" in updates) payload.can_confirm_bookings = !!updates.canConfirmBookings;

if ("canFinalizeOrders" in updates) payload.can_finalize_orders = !!updates.canFinalizeOrders;
if ("canFinalizeBookings" in updates) payload.can_finalize_bookings = !!updates.canFinalizeBookings;

if ("receivesCommission" in updates) payload.receives_commission = !!updates.receivesCommission;
if ("whatsappEnabled" in updates) payload.whatsapp_enabled = updates.whatsappEnabled !== false;
      if (!staffId) {
        return res.status(400).json({ error: "staffId obrigatório." });
      }

      const payload = {
        updated_at: new Date().toISOString(),
      };

      if ("nome" in updates) payload.nome = String(updates.nome || "").trim();
      if ("telefone" in updates) payload.telefone = onlyDigits(updates.telefone) || null;
      if ("email" in updates) payload.email = updates.email || null;
      if ("role" in updates) payload.role = updates.role;
if ("positionTitle" in updates) {
  payload.position_title = updates.positionTitle || null;
}
      if ("fixedSalary" in updates) {
        payload.fixed_salary = Number(updates.fixedSalary || 0);
      }

      if ("paymentFrequency" in updates) {
        payload.payment_frequency = updates.paymentFrequency || "monthly";
      }

      if ("nextPaymentDate" in updates) {
        payload.next_payment_date = updates.nextPaymentDate || null;
      }

      if ("commissionType" in updates) {
        payload.commission_type = normalizeCommissionType(updates.commissionType);
      }

      if ("commissionValue" in updates) {
  const nextType =
    "commissionType" in updates
      ? normalizeCommissionType(updates.commissionType)
      : payload.commission_type || "none";

  payload.commission_value =
    nextType === "none" ? 0 : Number(updates.commissionValue || 0);
}

      const { data, error } = await supabase
        .from("profile_staff")
        .update(payload)
        .eq("id", staffId)
        .select()
        .single();

      if (error) throw error;

      await upsertStaffRecurringExpense(data);

      return res.status(200).json(data);
    }

    if (req.method === "DELETE") {
      const { staffId } = req.body || {};

      if (!staffId) {
        return res.status(400).json({ error: "staffId obrigatório." });
      }

      const { data, error } = await supabase
        .from("profile_staff")
        .update({
          ativo: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", staffId)
        .select()
        .single();

      if (error) throw error;

      await upsertStaffRecurringExpense({
        ...data,
        fixed_salary: 0,
      });

      return res.status(200).json(data);
    }

    return res.status(405).json({ error: "Método não permitido." });
  } catch (err) {
    console.error("❌ API staff/index:", err);
    return res.status(500).json({
      error: err.message || "Erro interno no módulo de funcionários.",
    });
  }
}