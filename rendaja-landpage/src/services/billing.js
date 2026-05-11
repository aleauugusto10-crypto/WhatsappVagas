import { supabase } from "../supabase.js";
import { sendText } from "../services/whatsapp.js";

const PLAN_MONTHLY_PRICE = {
  store_start: 19.9,
  equipe_pro: 49.9,
  complete_pro: 59.9,
};

function money(value = 0) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function cleanPhone(phone = "") {
  return String(phone || "").replace(/\D/g, "");
}

function buildRenewalMessage(profile) {
  const valor = PLAN_MONTHLY_PRICE[profile.plan_code] || 0;

  return `⚠️ *Sua assinatura CompreTudo.shop venceu*

Olá, ${profile.nome || "tudo bem"}!

Seu plano *${profile.plan_code}* venceu e precisa ser renovado.

💳 Valor da renovação: *${money(valor)}*

Você ainda tem um prazo de tolerância antes do perfil voltar para o plano gratuito.

Acesse seu painel para renovar.`;
}

async function notifyProfileBilling(profile) {
  const phone = cleanPhone(profile.whatsapp);

  if (!phone) {
    console.log("⚠️ perfil sem WhatsApp para cobrança:", profile.id);
    return false;
  }

  await sendText(phone, buildRenewalMessage(profile));
  return true;
}

async function downgradeToFree(profile) {
  const { data, error } = await supabase
    .from("profiles_pages")
    .update({
      plan_code: "free",
      plan_status: "active",

      monthly_credits: 0,
      monthly_credits_balance: 0,
      monthly_credits_used: 0,

      next_payment_at: null,
      plan_next_billing_at: null,
      plan_expires_at: null,
      payment_grace_until: null,

      billing_notice_count: 0,
      last_billing_notice_at: null,

      updated_at: new Date().toISOString(),
    })
    .eq("id", profile.id)
    .select("id,nome,plan_code,plan_status")
    .single();

  if (error) {
    console.error("❌ erro ao voltar perfil para grátis:", error);
    return null;
  }

  console.log("✅ perfil voltou para grátis:", data);
  return data;
}

export async function processBillingCycle() {
  const now = new Date().toISOString();

  const { data: profiles, error } = await supabase
    .from("profiles_pages")
    .select(
      "id,nome,whatsapp,plan_code,plan_status,next_payment_at,plan_expires_at,payment_grace_until,billing_notice_count,last_billing_notice_at"
    )
    .neq("plan_code", "free")
    .eq("plan_status", "active")
    .not("next_payment_at", "is", null);

  if (error) {
    console.error("❌ erro ao buscar planos para cobrança:", error);
    return { ok: false, error };
  }

  const result = {
    checked: profiles?.length || 0,
    notified: 0,
    downgraded: 0,
  };

  for (const profile of profiles || []) {
    const vencido = profile.next_payment_at && profile.next_payment_at <= now;
    const toleranciaAcabou =
      profile.payment_grace_until && profile.payment_grace_until <= now;

    if (!vencido) continue;

    if (toleranciaAcabou) {
      const downgraded = await downgradeToFree(profile);
      if (downgraded) result.downgraded += 1;
      continue;
    }

    const noticeCount = Number(profile.billing_notice_count || 0);

    if (noticeCount >= 3) continue;

    const sent = await notifyProfileBilling(profile);

    if (sent) {
      await supabase
        .from("profiles_pages")
        .update({
          billing_notice_count: noticeCount + 1,
          last_billing_notice_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", profile.id);

      result.notified += 1;
    }
  }

  return { ok: true, ...result };
}