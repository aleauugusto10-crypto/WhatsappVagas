import { supabase } from "../../src/lib/supabase";
async function sendText(phone, text) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    console.error("❌ WHATSAPP_TOKEN ou WHATSAPP_PHONE_NUMBER_ID ausente");
    return null;
  }

  const res = await fetch(
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

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    console.error("❌ Erro WhatsApp:", data);
  }

  return data;
}

function money(value = 0) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
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

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido." });
  }

  try {
    const {
      profile_page_id,
      customer_name,
      customer_phone,
      note,
      items,
      total,
      has_quote,
    } = req.body || {};

    if (!profile_page_id) {
      return res.status(400).json({ error: "Perfil não informado." });
    }

    if (!customer_name || !customer_phone) {
      return res.status(400).json({ error: "Dados do cliente incompletos." });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles_pages")
      .select("id, nome, whatsapp, user_id")
      .eq("id", profile_page_id)
      .maybeSingle();

    if (profileError || !profile) {
      return res.status(404).json({ error: "Perfil não encontrado." });
    }

    const { data: order, error } = await supabase
      .from("profile_orders")
      .insert({
        profile_page_id,
        customer_name,
        customer_phone: onlyDigits(customer_phone),
        note: String(note || "").trim(),
        items: Array.isArray(items) ? items : [],
        total: Number(total || 0),
        has_quote: !!has_quote,
        status: "pending",
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("Erro ao salvar pedido:", error);
      return res.status(500).json({ error: "Erro ao salvar pedido." });
    }

    const ownerPhone = normalizeBRPhone(profile.whatsapp);

    if (ownerPhone) {
      const itemLines = Array.isArray(items)
        ? items
            .map((item) => {
              const price =
                item.price_type === "quote"
                  ? "Sob orçamento"
                  : money(Number(item.price || 0) * Number(item.qty || 1));

              return `• ${item.qty || 1}x ${item.title || "Item"} — ${price}`;
            })
            .join("\n")
        : "Itens não informados";

      await sendText(
        ownerPhone,
        `🔔 *Novo pedido recebido!*\n\n` +
          `📌 Página: ${profile.nome || "Perfil profissional"}\n` +
          `👤 Cliente: ${customer_name}\n` +
          `📞 WhatsApp: ${onlyDigits(customer_phone)}\n\n` +
          `🛍️ *Itens:*\n${itemLines}\n\n` +
          `💰 Total: ${has_quote ? "Sob orçamento / parcial " + money(total) : money(total)}\n` +
          `${note ? `\n📝 Observação:\n${note}\n` : ""}\n` +
          `Acesse seu painel RendaJá para confirmar, entregar ou excluir o pedido.`
      );
    }

    return res.status(200).json({ ok: true, order });
  } catch (err) {
    console.error("Erro geral profile-orders:", err);
    return res.status(500).json({ error: "Erro interno ao criar pedido." });
  }
}