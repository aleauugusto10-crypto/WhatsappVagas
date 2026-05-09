import { supabase } from "../../../src/lib/supabase";

function onlyDigits(value = "") {
  return String(value || "").replace(/\D/g, "");
}

function normalizeBRPhone(phone = "") {
  let digits = onlyDigits(phone);
  if (!digits) return "";

  if (!digits.startsWith("55")) digits = `55${digits}`;

  const country = digits.slice(0, 2);
  const ddd = digits.slice(2, 4);
  let number = digits.slice(4);

  if (country === "55" && ddd.length === 2 && number.length === 8) {
    number = `9${number}`;
  }

  return `${country}${ddd}${number}`;
}

async function sendText(phone, text) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    console.error("❌ WHATSAPP_TOKEN ou WHATSAPP_PHONE_NUMBER_ID ausente");
    return null;
  }

  const response = await fetch(
    `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: phone,
        type: "text",
        text: { body: text },
      }),
    }
  );

  const json = await response.json().catch(() => null);

  if (!response.ok) {
    console.error("❌ Erro ao enviar WhatsApp:", json);
  }

  return json;
}

function formatBookingDate(date) {
  if (!date) return "";

  return new Date(`${date}T00:00:00`).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function getServiceName(service) {
  return service?.name || service?.title || service?.service_title || "Serviço";
}

function buildServicesText(services = []) {
  if (!Array.isArray(services) || services.length === 0) {
    return "Serviço não informado";
  }

  return services
    .map((service) => {
      const qty = Number(service.qty || 1);
      return `${qty > 1 ? `${qty}x ` : ""}${getServiceName(service)}`;
    })
    .join(" • ");
}

function getBookingStaffName(booking) {
  return (
    booking.staff_name ||
    booking.assigned_staff_name ||
    booking.professional_name ||
    booking.staff?.nome ||
    ""
  );
}

function buildStatusMessage({ booking, profile, status }) {
  const customerName = booking.customer_name || "tudo bem";
  const companyName = profile?.nome || "a empresa";
  const staffName = getBookingStaffName(booking);
  const servicesText = buildServicesText(booking.services);

  if (status === "confirmed") {
    return `Olá, ${customerName}! ✅

Seu agendamento em ${companyName} foi confirmado.

📅 Data: ${formatBookingDate(booking.date)}
⏰ Horário: ${booking.time}
🛠️ Serviço(s): ${servicesText}${staffName ? `\n👤 Profissional: ${staffName}` : ""}

Um dia antes, podemos enviar uma confirmação para lembrar você do horário.`;
  }

  if (status === "cancelled") {
    return `Olá, ${customerName}.

Seu agendamento em ${companyName} foi cancelado.

Caso tenha alguma dúvida, responda esta mensagem.`;
  }

  return `Olá, ${customerName}.

Seu agendamento em ${companyName} foi atualizado para: ${status}.`;
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Método não permitido." });
    }

    const { bookingId, status } = req.body || {};

    if (!bookingId || !status) {
      return res.status(400).json({
        error: "bookingId e status são obrigatórios.",
      });
    }

    const allowedStatus = ["pending", "confirmed", "completed", "cancelled", "expired"];

    if (!allowedStatus.includes(status)) {
      return res.status(400).json({
        error: "Status inválido.",
      });
    }

    const { data: booking, error: bookingError } = await supabase
      .from("profile_bookings")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", bookingId)
      .select("*")
      .single();

    if (bookingError) throw bookingError;

    const { data: profile, error: profileError } = await supabase
      .from("profiles_pages")
      .select("id, nome, whatsapp")
      .eq("id", booking.profile_page_id)
      .maybeSingle();

    if (profileError) throw profileError;

    const customerPhone = normalizeBRPhone(booking.customer_phone);

    if (customerPhone && ["confirmed", "cancelled"].includes(status)) {
      await sendText(
        customerPhone,
        buildStatusMessage({
          booking,
          profile,
          status,
        })
      );
    }

    return res.status(200).json({
      ok: true,
      booking,
    });
  } catch (err) {
    console.error("❌ bookings/update-status:", err);
    return res.status(500).json({
      error: err.message || "Erro ao atualizar agendamento.",
    });
  }
}