import { supabase } from "../../../src/lib/supabase";

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const { profilePageId } = req.query;

      if (!profilePageId) {
        return res.status(400).json({ error: "profilePageId obrigatório." });
      }

      const { data, error } = await supabase
        .from("finance_recurring_expenses")
        .select("*")
        .eq("profile_page_id", profilePageId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const { data: commissions, error: commissionError } = await supabase
        .from("finance_movements")
        .select("commission_amount, commission_to_staff_id, created_at")
        .eq("profile_page_id", profilePageId)
        .gt("commission_amount", 0);

      if (commissionError) throw commissionError;

      const enriched = (data || []).map((item) => {
        if (item.category !== "staff_payment" || !item.staff_id) {
          return item;
        }

        const lastPaidAt = item.last_paid_at ? new Date(item.last_paid_at) : null;

        const pendingCommissionAmount = (commissions || [])
          .filter((movement) => {
            if (String(movement.commission_to_staff_id) !== String(item.staff_id)) {
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

        const fixedSalary = Number(item.fixed_salary || item.base_amount || item.amount || 0);

        return {
          ...item,
          base_amount: fixedSalary,
          fixed_salary: fixedSalary,
          pending_commission_amount: pendingCommissionAmount,
          amount: fixedSalary + pendingCommissionAmount,
        };
      });

      return res.status(200).json(enriched);
    }

    if (req.method === "POST") {
      const {
        profilePageId,
        icon = "💸",
        title,
        amount,
        paymentMethod = "manual",
        category = "fixed_expense",
        note = "",
        frequency = "monthly",
        dueDay = null,
        nextDueDate = null,
      } = req.body || {};

      if (!profilePageId || !title || !amount) {
        return res.status(400).json({
          error: "profilePageId, title e amount são obrigatórios.",
        });
      }

      const { data, error } = await supabase
        .from("finance_recurring_expenses")
        .insert({
          profile_page_id: profilePageId,
          icon,
          title,
          amount: Number(amount),
          base_amount: Number(amount),
          fixed_salary: category === "staff_payment" ? Number(amount) : 0,
          pending_commission_amount: 0,
          payment_method: paymentMethod,
          category,
          note,
          frequency,
          due_day: dueDay ? Number(dueDay) : null,
          next_due_date: nextDueDate || null,
          is_active: true,
          last_paid_at: null,
          last_payment_movement_id: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      return res.status(201).json(data);
    }

    if (req.method === "PATCH") {
      const { id, updates } = req.body || {};

      if (!id) {
        return res.status(400).json({ error: "id obrigatório." });
      }

      const payload = {
        ...updates,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("finance_recurring_expenses")
        .update(payload)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      return res.status(200).json(data);
    }

    if (req.method === "DELETE") {
      const { id } = req.body || {};

      if (!id) {
        return res.status(400).json({ error: "id obrigatório." });
      }

      const { error } = await supabase
        .from("finance_recurring_expenses")
        .delete()
        .eq("id", id);

      if (error) throw error;

      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "Método não permitido." });
  } catch (err) {
    console.error("❌ finance/recurring-expenses:", err);
    return res.status(500).json({
      error: err.message || "Erro nas despesas recorrentes.",
    });
  }
}