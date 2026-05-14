import { supabaseAdmin } from "../../../src/lib/supabaseAdmin";
function calcCommission(staff, amount) {
  const finalAmount = Number(amount || 0);
  const value = Number(staff?.commission_value || 0);

  if (!staff || staff.commission_type === "none") return 0;

  if (staff.commission_type === "percent") {
    return Number(((finalAmount * value) / 100).toFixed(2));
  }

  if (staff.commission_type === "fixed") {
    return Number(value.toFixed(2));
  }

  return 0;
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Método não permitido." });
    }

    const {
      bookingId,
      profilePageId,
      amount,
      paymentMethod = "manual",
      note = "",
      staffId = null,
    } = req.body || {};

    if (!bookingId || !profilePageId) {
      return res.status(400).json({
        error: "bookingId e profilePageId são obrigatórios.",
      });
    }

    const finalAmount = Number(amount || 0);

    if (finalAmount <= 0) {
      return res.status(400).json({
        error: "Informe um valor final válido.",
      });
    }

    const { data: booking, error: bookingError } = await supabaseAdmin
      .from("profile_bookings")
      .update({
        status: "completed",
        total: finalAmount,
        paid_amount: finalAmount,
        payment_status: "paid",
        payment_method: paymentMethod,
        financial_note: note,
        assigned_staff_id: staffId,
        finalized_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", bookingId)
      .eq("profile_page_id", profilePageId)
      .select()
      .single();

    if (bookingError) throw bookingError;
console.log("✅ BOOKING FINALIZADO:", {
  id: booking?.id,
  status: booking?.status,
  payment_status: booking?.payment_status,
  finalized_at: booking?.finalized_at,
});
    let staff = null;

    if (staffId) {
      const { data: staffData, error: staffError } = await supabaseAdmin
        .from("profile_staff")
        .select("*")
        .eq("id", staffId)
        .maybeSingle();

      if (staffError) throw staffError;

      staff = staffData;
    }

    const commissionAmount = calcCommission(staff, finalAmount);

    const { error: movementError } = await supabaseAdmin
      .from("finance_movements")
      .insert({
        profile_page_id: profilePageId,
        staff_id: staffId,

        type: "income",
        amount: finalAmount,
        payment_method: paymentMethod,

        description: `Agendamento finalizado - ${
          booking.customer_name || "Cliente"
        }`,
        note,

        source_type: "booking",
        source_id: bookingId,

        customer_name: booking.customer_name || "",
        customer_phone: booking.customer_phone || "",

        items: Array.isArray(booking.services)
          ? booking.services.map((service) => ({
              title: service.name || service.title || "Serviço",
              qty: service.qty || 1,
              price: service.price || finalAmount,
            }))
          : null,

        commission_amount: commissionAmount,
        commission_type: staff?.commission_type || "",
        commission_to_staff_id: staffId,
        commission_to_staff_name: staff?.nome || booking.staff_name || "",

        registered_by_id: null,
        registered_by_name: "Finalização de agendamento",
        registered_by_role: "system",

        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (movementError) throw movementError;

    return res.status(200).json({
      ok: true,
      booking,
      commissionAmount,
    });
  } catch (err) {
    console.error("❌ finalize-booking:", err);
    return res.status(500).json({
      error: err.message || "Erro ao finalizar agendamento.",
    });
  }
}