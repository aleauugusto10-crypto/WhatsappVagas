import { supabase } from "../../../src/supabase.js";
import { createMercadoPagoPixIntent } from "../../../src/services/payments.js";

const MP_BASE_URL = "https://api.mercadopago.com";
const MP_TOKEN = process.env.MERCADO_PAGO_ACCESS_TOKEN;

const PUBLIC_BASE_URL =
  process.env.PUBLIC_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.BACKEND_URL ||
  "";

const PLAN_LABELS = {
  store_start: "Loja Start",
  equipe_pro: "Equipe Pro",
  complete_pro: "Finance Premium",
};

function getBaseUrl(req) {
  if (PUBLIC_BASE_URL) return PUBLIC_BASE_URL.replace(/\/+$/, "");

  const proto = req.headers["x-forwarded-proto"] || "http";
  const host = req.headers.host;

  return `${proto}://${host}`;
}

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
    console.error("❌ Mercado Pago checkout error:", res.status, data);
    throw new Error(data?.message || `Mercado Pago ${res.status}`);
  }

  return data;
}

async function createMercadoPagoCheckout({ req, payment, plan, profile }) {
  const baseUrl = getBaseUrl(req);
  const planName = PLAN_LABELS[payment.plano_codigo] || plan.name;

  const preference = await mpFetch("/checkout/preferences", {
    method: "POST",
    body: JSON.stringify({
      items: [
        {
          id: payment.plano_codigo,
          title: `Ativação do plano ${planName}`,
          description: `Ativação da vitrine ${profile.nome || profile.slug || ""}`,
          quantity: 1,
          currency_id: "BRL",
          unit_price: Number(payment.valor),
        },
      ],

      external_reference: payment.id,

      notification_url: `${baseUrl}/payments/webhook`,

      back_urls: {
        success: `${baseUrl}/dashboard?payment=success`,
        pending: `${baseUrl}/dashboard?payment=pending`,
        failure: `${baseUrl}/dashboard?payment=failure`,
      },

      auto_return: "approved",

      metadata: {
        plataforma_payment_id: payment.id,
        referencia_tipo: payment.referencia_tipo,
        usuario_id: payment.usuario_id,
        profile_page_id: profile.id,
        plan_code: payment.plano_codigo,
      },
    }),
  });

  const checkoutUrl = preference?.init_point || preference?.sandbox_init_point || null;

  if (!checkoutUrl) {
    throw new Error("Mercado Pago não retornou link de checkout.");
  }

  await supabase
    .from("pagamentos_plataforma")
    .update({
      checkout_url: checkoutUrl,
      metadata: {
        ...(payment.metadata || {}),
        mercado_pago_preference_id: preference.id || null,
        mercado_pago_checkout_url: checkoutUrl,
      },
    })
    .eq("id", payment.id);

  return {
    preference,
    checkout_url: checkoutUrl,
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido." });
  }

  try {
    const {
      profilePageId,
      planCode,
      paymentMethod = "pix",
    } = req.body || {};

    if (!profilePageId || !planCode) {
      return res.status(400).json({ error: "Dados inválidos." });
    }

    if (!["pix", "checkout"].includes(paymentMethod)) {
      return res.status(400).json({ error: "Forma de pagamento inválida." });
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
const TEST_PLAN_VALUES = {
  store_start: 19.9,
  equipe_pro: 49.9,
  complete_pro: 59.9,
};

const valor = Number(
  TEST_PLAN_VALUES[planCode] ||
  plan.monthly_price ||
  0
);

    if (!valor || valor <= 0) {
      return res.status(400).json({ error: "Plano sem valor de ativação." });
    }

    const { data: payment, error: paymentError } = await supabase
      .from("pagamentos_plataforma")
      .insert({
        usuario_id: profile.user_id,
        referencia_tipo: "profile_plan_subscription",
        plano_codigo: planCode,
        status: "pendente",
        valor,
        metadata: {
          titulo: `Assinatura do plano ${
  PLAN_LABELS[planCode] || plan.name
}`,
          profile_page_id: profile.id,
          profile_slug: profile.slug,
          plan_code: planCode,
          plan_name: plan.name,
          setup_price: Number(plan.monthly_price || 0),
monthly_price: Number(plan.monthly_price || 0),
dias_ate_primeira_mensalidade: 0,
          dias_ate_primeira_mensalidade: 30,
          payment_method: paymentMethod,
        },
      })
      .select()
      .single();

    if (paymentError || !payment) {
      console.error("❌ erro ao criar pagamento do plano:", paymentError);
      return res.status(500).json({ error: "Erro ao criar pagamento." });
    }

    if (paymentMethod === "pix") {
      const pixPayment = await createMercadoPagoPixIntent(payment.id);

      if (!pixPayment) {
        return res.status(500).json({ error: "Erro ao gerar Pix." });
      }

      return res.status(200).json({
        ok: true,
        method: "pix",
        payment: pixPayment,
        checkout_url: pixPayment.checkout_url,
        qr_code: pixPayment.qr_code,
        qr_code_base64: pixPayment.qr_code_base64,
      });
    }

    const checkout = await createMercadoPagoCheckout({
      req,
      payment,
      plan,
      profile,
    });

    return res.status(200).json({
      ok: true,
      method: "checkout",
      payment,
      checkout_url: checkout.checkout_url,
      preference_id: checkout.preference?.id || null,
    });
  } catch (err) {
    console.error("❌ erro geral ao criar pagamento do plano:", err);

    return res.status(500).json({
      error: err?.message || "Erro interno ao gerar pagamento.",
    });
  }
}