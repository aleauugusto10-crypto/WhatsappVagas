import { supabase } from "../../src/lib/supabase";
import { notifyStaffNewBooking } from "../../src/lib/staffNotifications.js";

async function sendText(phone, text) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    console.error("❌ WHATSAPP_TOKEN ausente");
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
        text: {
          body: text,
        },
      }),
    }
  );

  const json = await response.json().catch(() => null);

  if (!response.ok) {
    console.error("❌ erro WhatsApp:", json);
  }

  return json;
}

function onlyDigits(value = "") {
  return String(value || "").replace(/\D/g, "");
}

function normalizeBRPhone(phone = "") {
  let digits = onlyDigits(phone);

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

function money(value = 0) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function getServiceName(service) {
  return (
    service?.name ||
    service?.title ||
    service?.service_title ||
    "Serviço"
  );
}

function buildServicesText(services = []) {
  if (!Array.isArray(services) || !services.length) {
    return "Serviço não informado";
  }

  return services
    .map((service) => {
      const qty = service.qty || 1;

      const price =
        service.price_type === "quote"
          ? "Sob orçamento"
          : service.price
          ? money(Number(service.price || 0) * Number(qty))
          : "";

      return `• ${qty}x ${getServiceName(service)}${price ? ` — ${price}` : ""}`;
    })
    .join("\n");
}

function isUUID(value = "") {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    String(value || "")
  );
}

function cleanUUID(value) {
  return isUUID(value) ? value : null;
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({
        error: "Método não permitido.",
      });
    }

    const {
      profile_page_id,
      customer_name,
      customer_phone,
      date,
      time,
      note,
      services,
      assigned_staff_id = null,
      staff_id = null,
      staff_name = null,
      profile_owner_name = "",
      profile_owner_phone = "",
    } = req.body || {};

    const cleanProfilePageId = cleanUUID(profile_page_id);
    const cleanAssignedStaffId = cleanUUID(assigned_staff_id || staff_id);

    if (!cleanProfilePageId) {
      return res.status(400).json({
        error: "profile_page_id obrigatório ou inválido.",
      });
    }

    if (!customer_name || !customer_phone) {
      return res.status(400).json({
        error: "Dados do cliente incompletos.",
      });
    }

    if (!date || !time) {
      return res.status(400).json({
        error: "Data e horário são obrigatórios.",
      });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles_pages")
      .select("id,nome,whatsapp")
      .eq("id", cleanProfilePageId)
      .maybeSingle();

    if (profileError || !profile) {
      console.error("❌ perfil não encontrado:", profileError);

      return res.status(404).json({
        error: "Perfil não encontrado.",
      });
    }

    const cleanCustomerPhone = normalizeBRPhone(customer_phone);

    const cleanOwnerPhone = normalizeBRPhone(
      profile_owner_phone || profile.whatsapp
    );

    const cleanServices = Array.isArray(services) ? services : [];

    const bookingInsert = {
      profile_page_id: cleanProfilePageId,
      customer_name: String(customer_name || "").trim(),
      customer_phone: cleanCustomerPhone,
      date,
      time,
      note: String(note || "").trim() || null,
      services: cleanServices,
      assigned_staff_id: cleanAssignedStaffId,
      staff_id: cleanAssignedStaffId,
      staff_name: cleanAssignedStaffId ? staff_name || null : null,
      status: "pending",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    console.log("📅 BOOKING INSERT DEBUG:", {
      profile_page_id: bookingInsert.profile_page_id,
      assigned_staff_id: bookingInsert.assigned_staff_id,
      staff_id: bookingInsert.staff_id,
      staff_name: bookingInsert.staff_name,
      rawAssignedStaffId: assigned_staff_id,
      rawStaffId: staff_id,
    });

    const { data: booking, error } = await supabase
      .from("profile_bookings")
      .insert(bookingInsert)
      .select()
      .single();

    if (error) {
      console.error("❌ erro ao criar agendamento:", error);

      return res.status(500).json({
        error: error.message || "Erro ao criar agendamento.",
      });
    }

    if (cleanOwnerPhone) {
      await sendText(
        cleanOwnerPhone,
        `📅 *Novo agendamento recebido!*\n\n` +
          `👤 Cliente: ${customer_name}\n` +
          `📞 WhatsApp: ${cleanCustomerPhone}\n\n` +
          `📆 Data: ${date}\n` +
          `⏰ Horário: ${time}\n\n` +
          `🛠️ Serviços:\n${buildServicesText(cleanServices)}\n` +
          `${note ? `\n📝 Observação:\n${note}\n` : ""}\n` +
          `Acesse o painel RendaJá para confirmar o atendimento.`
      );
    }

    await notifyStaffNewBooking(booking);

    if (cleanCustomerPhone) {
      await sendText(
        cleanCustomerPhone,
        `✨ *Recebemos seu agendamento!*\n\n` +
          `🏪 ${profile.nome || "Empresa"}\n\n` +
          `📆 Data: ${date}\n` +
          `⏰ Horário: ${time}\n\n` +
          `Seu pedido de agendamento foi enviado com sucesso.\n\n` +
          `Você receberá atualizações automáticas aqui no WhatsApp 💬`
      );
    }

    return res.status(200).json({
      ok: true,
      booking,
    });
  } catch (err) {
    console.error("❌ profile-bookings:", err);

    return res.status(500).json({
      error: err.message || "Erro interno no agendamento.",
    });
  }
}