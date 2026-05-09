import { supabase } from "../supabase.js";
import { sendText, sendButtons } from "./whatsapp.js";

function buildJobMessage(payload) {
  return (
    `📢 *Nova vaga para você!*\n\n` +
    `🏢 ${payload.nome_empresa || "Empresa"}\n` +
    `💼 ${payload.titulo || "Vaga"}\n` +
    `📍 ${payload.cidade || "-"}${payload.estado ? `/${payload.estado}` : ""}\n` +
    `💰 ${payload.salario || "A combinar"}\n\n` +
    `👉 Digite *menu* para ver mais oportunidades.`
  );
}

function buildMissionMessage(payload) {
  return (
    `🔥 *Nova missão disponível!*\n\n` +
    `📌 ${payload.titulo || "Missão"}\n` +
    `📝 ${payload.descricao || "Veja os detalhes no RendaJá."}\n` +
    `💰 R$ ${payload.valor || payload.valor_por_pessoa || "A combinar"}\n` +
    `📍 ${payload.cidade || "-"}${payload.estado ? `/${payload.estado}` : ""}\n\n` +
    `👉 Digite *menu* para visualizar.`
  );
}

function buildBookingReminderMessage(payload) {
  return (
    `📅 *Confirmação de presença*\n\n` +
    `Olá, ${payload.customer_name || "tudo bem"}! 👋\n\n` +
    `Você tem um agendamento amanhã:\n\n` +
    `🏪 ${payload.profile_name || "Estabelecimento"}\n` +
    `📆 Data: ${payload.date || "-"}\n` +
    `⏰ Horário: ${payload.time || "-"}\n\n` +
    `Escolha uma opção abaixo:`
  );
}

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

function tomorrowKey() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const yyyy = tomorrow.getFullYear();
  const mm = String(tomorrow.getMonth() + 1).padStart(2, "0");
  const dd = String(tomorrow.getDate()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}`;
}

async function alreadyQueued({ assinaturaId = null, tipo, referenciaId }) {
  let query = supabase
    .from("fila_notificacoes")
    .select("id")
    .eq("tipo", tipo)
    .eq("referencia_id", referenciaId)
    .limit(1)
    .maybeSingle();

  if (assinaturaId) {
    query = query.eq("assinatura_id", assinaturaId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("❌ erro ao verificar duplicidade:", error);
    return true;
  }

  return !!data;
}

async function enqueueForActiveSubscriptions() {
  const now = new Date().toISOString();

  const { data: assinaturas, error } = await supabase
    .from("alerta_planos_usuarios")
    .select("*")
    .eq("status", "ativo")
    .gt("expires_at", now);

  if (error) {
    console.error("❌ erro ao buscar assinaturas ativas:", error);
    return;
  }

  if (!assinaturas?.length) return;

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: vagas, error: vagasError } = await supabase
    .from("vagas")
    .select("*")
    .eq("status", "ativa")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(20);

  if (vagasError) console.error("❌ erro ao buscar vagas:", vagasError);

  const { data: missoes, error: missoesError } = await supabase
    .from("missoes")
    .select("*")
    .eq("status", "aberta")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(20);

  if (missoesError) console.error("❌ erro ao buscar missões:", missoesError);

  for (const assinatura of assinaturas) {
    const telefone = normalizeBRPhone(assinatura.telefone);
    if (!telefone) continue;

    if (assinatura.receber_vagas === true && Array.isArray(vagas)) {
      for (const vaga of vagas) {
        const exists = await alreadyQueued({
          assinaturaId: assinatura.id,
          tipo: "vaga",
          referenciaId: vaga.id,
        });

        if (exists) continue;

        await supabase.from("fila_notificacoes").insert({
          assinatura_id: assinatura.id,
          referencia_id: vaga.id,
          tipo: "vaga",
          telefone,
          payload: vaga,
          status: "pendente",
          criado_em: new Date().toISOString(),
          tentativas: 0,
        });
      }
    }

    if (assinatura.receber_missoes === true && Array.isArray(missoes)) {
      for (const missao of missoes) {
        const exists = await alreadyQueued({
          assinaturaId: assinatura.id,
          tipo: "missao",
          referenciaId: missao.id,
        });

        if (exists) continue;

        await supabase.from("fila_notificacoes").insert({
          assinatura_id: assinatura.id,
          referencia_id: missao.id,
          tipo: "missao",
          telefone,
          payload: missao,
          status: "pendente",
          criado_em: new Date().toISOString(),
          tentativas: 0,
        });
      }
    }
  }
}

async function enqueueBookingReminders() {
  const targetDate = tomorrowKey();

  const { data: bookings, error } = await supabase
    .from("profile_bookings")
    .select(`
      *,
      profiles_pages (
        id,
        nome,
        whatsapp
      )
    `)
    .eq("status", "confirmed")
    .eq("date", targetDate)
    .is("reminder_sent_at", null);

  if (error) {
    console.error("❌ erro ao buscar lembretes de agendamento:", error);
    return;
  }

  if (!bookings?.length) return;

  for (const booking of bookings) {
    const customerPhone = normalizeBRPhone(booking.customer_phone);

    if (!customerPhone) {
      await supabase
        .from("profile_bookings")
        .update({ reminder_sent_at: new Date().toISOString() })
        .eq("id", booking.id);

      continue;
    }

    const exists = await alreadyQueued({
      tipo: "booking_reminder",
      referenciaId: booking.id,
    });

    if (exists) continue;

    await supabase.from("fila_notificacoes").insert({
      assinatura_id: null,
      referencia_id: booking.id,
      tipo: "booking_reminder",
      telefone: customerPhone,
      payload: {
        ...booking,
        profile_name: booking.profiles_pages?.nome || "",
        owner_phone: booking.profiles_pages?.whatsapp || "",
      },
      status: "pendente",
      criado_em: new Date().toISOString(),
      tentativas: 0,
    });

    await supabase
      .from("profile_bookings")
      .update({ reminder_sent_at: new Date().toISOString() })
      .eq("id", booking.id);
  }
}

async function sendQueueItem(item, phone, message) {
  if (item.tipo === "booking_reminder") {
    return sendButtons(phone, message, [
      {
        id: `booking_presence_confirm_${item.referencia_id}`,
        title: "Confirmar",
      },
      {
        id: `booking_presence_reschedule_${item.referencia_id}`,
        title: "Reagendar",
      },
      {
        id: `booking_presence_cancel_${item.referencia_id}`,
        title: "Cancelar",
      },
    ]);
  }

  return sendText(phone, message);
}

export async function processNotificationQueue(limit = 20) {
  console.log("🟡 [QUEUE] Iniciando processamento...");

  await enqueueForActiveSubscriptions();
  await enqueueBookingReminders();

  const { data: fila, error } = await supabase
    .from("fila_notificacoes")
    .select("*")
    .eq("status", "pendente")
    .order("criado_em", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("❌ erro ao buscar fila:", error);
    return;
  }

  console.log("🟡 [QUEUE] itens encontrados:", fila?.length || 0);

  if (!fila?.length) {
    console.log("🟡 [QUEUE] nada para processar");
    return;
  }

  for (const item of fila) {
    try {
      let message = "";

      if (item.tipo === "vaga") {
        message = buildJobMessage(item.payload || {});
      }

      if (item.tipo === "missao") {
        message = buildMissionMessage(item.payload || {});
      }

      if (item.tipo === "booking_reminder") {
        message = buildBookingReminderMessage(item.payload || {});
      }

      if (!message) {
        await supabase
          .from("fila_notificacoes")
          .update({
            status: "erro",
            erro: "Tipo desconhecido",
            tentativas: Number(item.tentativas || 0) + 1,
          })
          .eq("id", item.id);

        continue;
      }

      const phone = normalizeBRPhone(item.telefone);

      if (!phone) {
        await supabase
          .from("fila_notificacoes")
          .update({
            status: "erro",
            erro: "Telefone inválido",
            tentativas: Number(item.tentativas || 0) + 1,
          })
          .eq("id", item.id);

        continue;
      }

      await sendQueueItem(item, phone, message);

      await supabase
        .from("fila_notificacoes")
        .update({
          status: "enviado",
          enviado_em: new Date().toISOString(),
        })
        .eq("id", item.id);

      console.log("✅ notificação enviada:", phone);
    } catch (err) {
      console.error("❌ erro ao enviar notificação:", err);

      await supabase
        .from("fila_notificacoes")
        .update({
          status: "erro",
          erro: err.message,
          tentativas: Number(item.tentativas || 0) + 1,
        })
        .eq("id", item.id);
    }
  }

  console.log("🟢 [QUEUE] processamento finalizado");
}