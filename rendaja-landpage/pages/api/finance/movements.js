import { supabase } from "../../../src/lib/supabase";

function getDayRange(date) {
  const start = new Date(`${date}T00:00:00`);
  const end = new Date(`${date}T23:59:59.999`);

  return { start: start.toISOString(), end: end.toISOString() };
}

function normalizeSearch(value = "") {
  return String(value || "").trim().toLowerCase();
}

function calcCommission(amount, staff) {
  const value = Number(staff?.commission_value || 0);

  if (!staff || staff.commission_type === "none") return 0;
  if (staff.commission_type === "percent") return Number(((Number(amount) * value) / 100).toFixed(2));
  if (staff.commission_type === "fixed") return value;

  return 0;
}

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const { profilePageId, startDate, endDate, staffId, date, search, type } = req.query;

      if (!profilePageId) {
        return res.status(400).json({ error: "profilePageId obrigatório." });
      }

      let query = supabase
        .from("finance_movements")
        .select("*")
        .eq("profile_page_id", profilePageId)
        .order("created_at", { ascending: false });

      if (date) {
        const range = getDayRange(date);
        query = query.gte("created_at", range.start).lte("created_at", range.end);
      } else {
        if (startDate) query = query.gte("created_at", startDate);
        if (endDate) query = query.lte("created_at", endDate);
      }

      if (staffId) query = query.eq("staff_id", staffId);
      if (type && type !== "all") query = query.eq("type", type);

      const { data, error } = await query;
      if (error) throw error;

      let results = data || [];
      const term = normalizeSearch(search);

      if (term) {
        results = results.filter((item) => {
          const text = normalizeSearch(`
            ${item.description || ""}
            ${item.payment_method || ""}
            ${item.type || ""}
            ${item.note || ""}
            ${item.staff_name || ""}
            ${item.source_type || ""}
            ${item.registered_by_name || ""}
            ${item.customer_name || ""}
            ${item.customer_phone || ""}
          `);

          return text.includes(term);
        });
      }

      return res.status(200).json(results);
    }

    if (req.method === "POST") {
      const {
        profilePageId,
        type,
        amount,
        description,
        paymentMethod = "manual",
        staffId = null,
        note = "",

        sourceType = "manual",
        sourceId = null,

        registeredById = null,
        registeredByName = "",
        registeredByRole = "",

        customerName = "",
        customerPhone = "",
        items = null,

        commissionAmount = null,
        commissionType = "",
        commissionToStaffId = null,
        commissionToStaffName = "",
      } = req.body || {};

      if (!profilePageId || !type || !amount) {
        return res.status(400).json({
          error: "profilePageId, type e amount são obrigatórios.",
        });
      }

      const targetStaffId = commissionToStaffId || staffId || null;

      let finalCommissionAmount = Number(commissionAmount || 0);
      let finalCommissionType = commissionType || "";
      let finalCommissionStaffId = targetStaffId;
      let finalCommissionStaffName = commissionToStaffName || "";

      if (type === "income" && targetStaffId) {
        const { data: staffData, error: staffError } = await supabase
          .from("profile_staff")
          .select("id,nome,commission_type,commission_value,commission_pending")
          .eq("id", targetStaffId)
          .eq("profile_page_id", profilePageId)
          .maybeSingle();

        if (staffError) throw staffError;

        if (staffData) {
          finalCommissionAmount =
            finalCommissionAmount > 0
              ? finalCommissionAmount
              : calcCommission(amount, staffData);

          finalCommissionType = finalCommissionType || staffData.commission_type || "none";
          finalCommissionStaffName = finalCommissionStaffName || staffData.nome || "";

          if (finalCommissionAmount > 0) {
            const currentPending = Number(staffData.commission_pending || 0);

            const { error: updateStaffError } = await supabase
              .from("profile_staff")
              .update({
                commission_pending: currentPending + finalCommissionAmount,
                updated_at: new Date().toISOString(),
              })
              .eq("id", staffData.id);

            if (updateStaffError) throw updateStaffError;
          }
        }
      }

      const { data, error } = await supabase
        .from("finance_movements")
        .insert({
          profile_page_id: profilePageId,
          staff_id: staffId,

          registered_by_id: registeredById,
          registered_by_name: registeredByName,
          registered_by_role: registeredByRole,

          source_type: sourceType,
          source_id: sourceId,

          type,
          amount: Number(amount),

          payment_method: paymentMethod,
          description: description || "Movimento manual",
          note,

          customer_name: customerName,
          customer_phone: customerPhone,
          items,

          commission_amount: finalCommissionAmount,
          commission_type: finalCommissionType,
          commission_to_staff_id: finalCommissionStaffId,
          commission_to_staff_name: finalCommissionStaffName,

          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      return res.status(201).json(data);
    }

    return res.status(405).json({ error: "Método não permitido." });
  } catch (err) {
    console.error("❌ finance/movements:", err);
    return res.status(500).json({
      error: err.message || "Erro financeiro.",
    });
  }
}