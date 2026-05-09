import { supabase } from "./supabase.js";
import { sendActionButtons, sendText } from "../services/whatsapp.js";

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

function money(value = 0) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function getServiceName(service) {
  return service?.name || service?.title || service?.service_title || "Serviço";
}

function getOrderItemsText(items = []) {
  if (!Array.isArray(items) || items.length === 0) {
    return "Itens não informados";
  }

  return items
    .map((item) => {
      const qty = item.qty || 1;
      const title = item.title || item.name || "Item";
      const price =
        item.price_type === "quote"
          ? "Sob orçamento"
          : money(Number(item.price || 0) * Number(qty));

      let line = `• ${qty}x ${title} — ${price}`;

      if (Array.isArray(item.selected_variants)) {
        item.selected_variants.forEach((variant) => {
          line += `\n   ↳ ${variant.variant_name}: ${variant.label}`;
        });
      }

      return line;
    })
    .join("\n");
}

function getBookingServicesText(services = []) {
  if (!Array.isArray(services) || services.length === 0) {
    return "Serviço não informado";
  }

  return services
    .map((service) => {
      const qty = service.qty || 1;
      const name = getServiceName(service);
      const price =
        service.price_type === "quote"
          ? "Sob orçamento"
          : service.price
          ? money(Number(service.price || 0) * Number(qty))
          : "";

      return `• ${qty}x ${name}${price ? ` — ${price}` : ""}`;
    })
    .join("\n");
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
    console.error("❌ getStaffById:", error);
    return null;
  }

  return data || null;
}

async function getAvailableStaffForProfile(profilePageId, permissionField) {
  const { data, error } = await supabase
    .from("profile_staff")
    .select("*")
    .eq("profile_page_id", profilePageId)
    .eq("ativo", true)
    .eq("whatsapp_enabled", true)
    .eq(permissionField, true);

  if (error) {
    console.error("❌ getAvailableStaffForProfile:", error);
    return [];
  }

  return data || [];
}

function pickStaffPhone(staff) {
  return normalizeBRPhone(staff?.telefone || staff?.phone || "");
}

export async function notifyStaffNewOrder(order) {
  try {
    if (!order?.profile_page_id) return;

    const assignedStaffId =
      order.assigned_staff_id ||
      order.staff_id ||
      order.seller_staff_id ||
      null;

    let targets = [];

    if (assignedStaffId) {
      const staff = await getStaffById(assignedStaffId);
      if (staff?.whatsapp_enabled !== false && staff?.can_view_orders) {
        targets = [staff];
      }
    } else {
      targets = await getAvailableStaffForProfile(
        order.profile_page_id,
        "can_view_orders"
      );
    }

    if (!targets.length) return;

    const itemsText = getOrderItemsText(order.items);
    const totalText = order.has_quote ? "Sob orçamento" : money(order.total || 0);

    for (const staff of targets) {
      const phone = pickStaffPhone(staff);
      if (!phone) continue;

      await sendText(
        phone,
        `📦 *Novo pedido recebido!*\n\n` +
          `👤 Cliente: ${order.customer_name || "Cliente"}\n` +
          `📞 WhatsApp: ${order.customer_phone || "Não informado"}\n` +
          `💰 Total: ${totalText}\n\n` +
          `🛍️ *Itens:*\n${itemsText}\n` +
          `${order.note ? `\n📝 Observação:\n${order.note}` : ""}`
      );

      const buttons = [];

      if (staff.can_confirm_orders) {
        buttons.push({
          id: `staff_confirm_order_${order.id}`,
          title: "Confirmar",
        });
      }

      if (staff.can_finalize_orders) {
        buttons.push({
          id: `staff_finish_order_${order.id}`,
          title: "Finalizar",
        });
      }

      buttons.push({
        id: `staff_order_${order.id}`,
        title: "Ver detalhes",
      });

      if (buttons.length > 0) {
        await sendActionButtons(
          phone,
          "O que deseja fazer com este pedido?",
          buttons.slice(0, 3)
        );
      }
    }
  } catch (err) {
    console.error("❌ notifyStaffNewOrder:", err);
  }
}

export async function notifyStaffNewBooking(booking) {
  try {
    if (!booking?.profile_page_id) return;

    const assignedStaffId =
      booking.assigned_staff_id ||
      booking.staff_id ||
      null;

    let targets = [];

    if (assignedStaffId) {
      const staff = await getStaffById(assignedStaffId);
      if (staff?.whatsapp_enabled !== false && staff?.can_view_bookings) {
        targets = [staff];
      }
    } else {
      targets = await getAvailableStaffForProfile(
        booking.profile_page_id,
        "can_view_bookings"
      );
    }

    if (!targets.length) return;

    const servicesText = getBookingServicesText(booking.services);

    for (const staff of targets) {
      const phone = pickStaffPhone(staff);
      if (!phone) continue;

      await sendText(
        phone,
        `📅 *Novo agendamento recebido!*\n\n` +
          `👤 Cliente: ${booking.customer_name || "Cliente"}\n` +
          `📞 WhatsApp: ${booking.customer_phone || "Não informado"}\n` +
          `📆 Data: ${booking.date || "Não informada"}\n` +
          `⏰ Horário: ${booking.time || "Não informado"}\n\n` +
          `🛠️ *Serviço(s):*\n${servicesText}\n` +
          `${booking.note ? `\n📝 Observação:\n${booking.note}` : ""}`
      );

      const buttons = [];

      if (staff.can_confirm_bookings) {
        buttons.push({
          id: `staff_confirm_booking_${booking.id}`,
          title: "Confirmar",
        });
      }

      if (staff.can_finalize_bookings) {
        buttons.push({
          id: `staff_finish_booking_${booking.id}`,
          title: "Finalizar",
        });
      }

      buttons.push({
        id: `staff_booking_${booking.id}`,
        title: "Ver detalhes",
      });

      if (buttons.length > 0) {
        await sendActionButtons(
          phone,
          "O que deseja fazer com este agendamento?",
          buttons.slice(0, 3)
        );
      }
    }
  } catch (err) {
    console.error("❌ notifyStaffNewBooking:", err);
  }
}

export async function notifyStaffOrderCancelled(order) {
  try {
    const staffId = order?.assigned_staff_id || order?.staff_id || order?.seller_staff_id;
    const staff = await getStaffById(staffId);
    const phone = pickStaffPhone(staff);

    if (!phone) return;

    return sendText(
      phone,
      `🚫 *Pedido cancelado*\n\n` +
        `Cliente: ${order.customer_name || "Cliente"}\n` +
        `Pedido: ${order.id}`
    );
  } catch (err) {
    console.error("❌ notifyStaffOrderCancelled:", err);
  }
}

export async function notifyStaffBookingCancelled(booking) {
  try {
    const staffId = booking?.assigned_staff_id || booking?.staff_id;
    const staff = await getStaffById(staffId);
    const phone = pickStaffPhone(staff);

    if (!phone) return;

    return sendText(
      phone,
      `🚫 *Agendamento cancelado*\n\n` +
        `Cliente: ${booking.customer_name || "Cliente"}\n` +
        `Data: ${booking.date || ""} às ${booking.time || ""}`
    );
  } catch (err) {
    console.error("❌ notifyStaffBookingCancelled:", err);
  }
}