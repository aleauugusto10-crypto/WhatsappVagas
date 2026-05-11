import { supabase } from "../../../../src/supabase.js";

const MP_BASE_URL = "https://api.mercadopago.com";
const MP_TOKEN = process.env.MERCADO_PAGO_ACCESS_TOKEN;

const PLAN_LABELS = {
  store_start: "Loja Start",
  equipe_pro: "Financeiro Pro",
  complete_pro: "Completo Pro",
};

const PLAN_CREDITS = {
  store_start: 30,
  equipe_pro: 100,
  complete_pro: 250,
};

async function mpFetch(path, options = {}) {
  if (!MP_TOKEN) {
    throw new Error("MERCADO_PAGO_ACCESS_TOKEN não configurado.");
  }

  const res = await fetch(`${MP_BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${MP_TOKEN}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const text = await res.text();

  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    console.error("❌ Mercado Pago card error:", res.status, data);
    throw new Error(data?.message || `Mercado Pago ${res.status}`);
  }

  return data;
}

async function activatePlan({ payment, planCode, profilePageId }) {
  const now = new Date();
  const nextPayment = new Date(now);
  nextPayment.setDate(nextPayment.getDate() + 30);

  const { data, error } = await supabase
    .from("profiles_pages")
    .update({
      plan_code: planCode,
      subscription_status: "active",
      subscription_started_at: now.toISOString(),
      last_payment_at: now.toISOString(),
      next_payment_at: nextPayment.toISOString(),
      monthly_credits_balance: PLAN_CREDITS[planCode] || 0,
      monthly_credits_used: 0,
      monthly_credits_reset_at: nextPayment.toISOString(),
      updated_at: now.toISOString(),
    })
    .eq("id", profilePageId)
    .select("*")
    .single();

  if (error) {
    console.error("❌ erro ao ativar plano:", error);
    throw new Error("Pagamento aprovado, mas erro ao ativar plano.");
  }

  return data;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido." });
  }

  try {
    const { profilePageId, planCode, formData } = req.body || {};

    if (!profilePageId || !planCode || !formData?.token) {
      return res.status(400).json({ error: "Dados do pagamento inválidos." });
    }

    const { data: plan, error: planError } = await supabase
      .from("platform_plans")
      .select("*")
      .eq("code", planCode)
      .eq("active", true)
      .maybeSingle();

    if (planError || !plan) {
      return res.status(404).json({ error: "Plano não encontrado." });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles_pages")
      .select("id,user_id,slug,nome")
      .eq("id", profilePageId)
      .maybeSingle();

    if (profileError || !profile) {
      return res.status(404).json({ error: "Vitrine não encontrada." });
    }

    const valor = Number(plan.setup_price || 0);

    if (!valor || valor <= 0) {
      return res.status(400).json({ error: "Plano sem valor de ativação." });
    }

    const { data: internalPayment, error: paymentError } = await supabase
      .from("pagamentos_plataforma")
      .insert({
        usuario_id: profile.user_id,
        referencia_tipo: "profile_plan_setup",
        plano_codigo: planCode,
        status: "pendente",
        valor,
        metadata: {
          titulo: `Ativação do plano ${PLAN_LABELS[planCode] || plan.name}`,
          profile_page_id: profile.id,
          profile_slug: profile.slug,
          plan_code: planCode,
          plan_name: plan.name,
          setup_price: Number(plan.setup_price || 0),
          monthly_price: Number(plan.monthly_price || 0),
          monthly_credits: Number(plan.monthly_credits || 0),
          dias_ate_primeira_mensalidade: 30,
          payment_method: "card",
        },
      })
      .select()
      .single();

    if (paymentError || !internalPayment) {
      console.error("❌ erro ao criar pagamento interno:", paymentError);
      return res.status(500).json({ error: "Erro ao criar pagamento." });
    }

    const mpPayment = await mpFetch("/v1/payments", {
      method: "POST",
      headers: {
        "X-Idempotency-Key": `card_${internalPayment.id}`,
      },
      body: JSON.stringify({
        transaction_amount: valor,
        token: formData.token,
        description: `Ativação do plano ${PLAN_LABELS[planCode] || plan.name}`,
        installments: Number(formData.installments || 1),
        payment_method_id: formData.payment_method_id,
        issuer_id: formData.issuer_id,
        external_reference: internalPayment.id,
        payer: {
          email: formData.payer?.email,
          identification: formData.payer?.identification,
        },
        metadata: {
          plataforma_payment_id: internalPayment.id,
          referencia_tipo: "profile_plan_setup",
          usuario_id: profile.user_id,
          profile_page_id: profile.id,
          plan_code: planCode,
        },
      }),
    });

    const approved = mpPayment.status === "approved";

    await supabase
      .from("pagamentos_plataforma")
      .update({
        status: approved ? "pago" : "pendente",
        pago_em: approved ? new Date().toISOString() : null,
        mp_payment_id: String(mpPayment.id),
        metadata: {
          ...(internalPayment.metadata || {}),
          mercado_pago_status: mpPayment.status,
          mercado_pago_status_detail: mpPayment.status_detail || null,
          mercado_pago_payment_method_id: mpPayment.payment_method_id || null,
        },
      })
      .eq("id", internalPayment.id);

    let activatedProfile = null;

    if (approved) {
      activatedProfile = await activatePlan({
        payment: internalPayment,
        planCode,
        profilePageId: profile.id,
      });
    }

    return res.status(200).json({
      ok: true,
      approved,
      status: mpPayment.status,
      status_detail: mpPayment.status_detail,
      payment_id: internalPayment.id,
      mp_payment_id: mpPayment.id,
      profile: activatedProfile,
      message: approved
        ? "Pagamento aprovado e plano ativado."
        : "Pagamento não aprovado pelo Mercado Pago.",
    });
  } catch (err) {
    console.error("❌ erro geral no pagamento com cartão:", err);

    return res.status(500).json({
      error: err?.message || "Erro interno ao processar cartão.",
    });
  }
}