import crypto from "crypto";
import { supabase } from "../../../src/supabase.js";
import { createOrUpdateProfilePage } from "../../../src/services/pageGenerator.js";

const MP_BASE_URL = "https://api.mercadopago.com";
const MP_TOKEN = process.env.MERCADO_PAGO_ACCESS_TOKEN;

const PLAN_LABELS = {
  store_start: "Loja Start",
  equipe_pro: "Equipe Pro",
  complete_pro: "Finance Premium",
};

const PLAN_PRICES_TEST = {
  store_start: 1,
  equipe_pro: 2.5,
  complete_pro: 1.5,
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
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    console.error("❌ Mercado Pago card signup error:", res.status, data);
    throw new Error(data?.message || `Mercado Pago ${res.status}`);
  }

  return data;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido." });
  }

  try {
    const { pendingSignupId, paymentId, planCode, formData } = req.body || {};

    if (!pendingSignupId || !paymentId || !planCode || !formData?.token) {
      return res.status(400).json({
        error: "Dados do pagamento inválidos.",
      });
    }

    const { data: pending, error: pendingError } = await supabase
      .from("profile_pending_signups")
      .select("*")
      .eq("id", pendingSignupId)
      .maybeSingle();

    if (pendingError || !pending) {
      return res.status(404).json({
        error: "Cadastro pendente não encontrado.",
      });
    }

    const { data: payment, error: paymentError } = await supabase
      .from("pagamentos_plataforma")
      .select("*")
      .eq("id", paymentId)
      .maybeSingle();

    if (paymentError || !payment) {
      return res.status(404).json({
        error: "Pagamento interno não encontrado.",
      });
    }

    const valor = Number(PLAN_PRICES_TEST[planCode] || payment.valor || 0);

    if (!valor || valor <= 0) {
      return res.status(400).json({
        error: "Valor do plano inválido.",
      });
    }

    const mpPayment = await mpFetch("/v1/payments", {
      method: "POST",
      headers: {
        "X-Idempotency-Key": `card_signup_${payment.id}`,
      },
      body: JSON.stringify({
        transaction_amount: valor,
        token: formData.token,
        description: `Ativação ${PLAN_LABELS[planCode] || planCode}`,
        installments: Number(formData.installments || 1),
        payment_method_id: formData.payment_method_id,
        issuer_id: formData.issuer_id,
        external_reference: payment.id,
        payer: {
          email: formData.payer?.email || "cliente@compretudo.shop",
          identification: formData.payer?.identification,
        },
        metadata: {
          plataforma_payment_id: payment.id,
          pending_signup_id: pending.id,
          plan_code: planCode,
          source: "public_profile_signup_card",
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
          ...(payment.metadata || {}),
          mercado_pago_status: mpPayment.status,
          mercado_pago_status_detail: mpPayment.status_detail || null,
          mercado_pago_payment_method_id: mpPayment.payment_method_id || null,
          pending_signup_id: pending.id,
          plan_code: planCode,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", payment.id);

    if (!approved) {
      return res.status(200).json({
        ok: true,
        approved: false,
        status: mpPayment.status,
        status_detail: mpPayment.status_detail,
        message: "Pagamento não aprovado pelo Mercado Pago.",
      });
    }

    const profile = await createOrUpdateProfilePage({
      supabase,
      user: {
        id: pending.user_id || crypto.randomUUID(),

        nome: pending.name,
        nome_empresa: pending.business_name,
        businessName: pending.business_name,

        telefone: pending.phone,
        phone: pending.phone,
        whatsapp: pending.phone,

        cidade: pending.city || "",
        estado: pending.state || "",

        ramo_empresa: pending.work_area,
        workArea: pending.work_area,
        categoria_principal: pending.work_area,
        area_principal: pending.work_area,
        servico_principal: pending.work_area,

        reference_image_url: pending.reference_image_url || "",

        plan_code: planCode,
        planCode,
      },
    });

    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: activeProfile, error: activeError } = await supabase
      .from("profiles_pages")
      .update({
        is_active: true,
        is_preview: false,
        preview_expires_at: null,

        plan_code: planCode,
        plan_status: "active",
        plan_started_at: new Date().toISOString(),
        plan_expires_at: expiresAt,
        plan_next_billing_at: expiresAt,

        subscription_started_at: new Date().toISOString(),
        subscription_expires_at: expiresAt,

        show_store: true,
        show_booking: true,

        updated_at: new Date().toISOString(),
      })
      .eq("id", profile.id)
      .select("*")
      .single();

    if (activeError) throw activeError;

    await supabase
      .from("profile_pending_signups")
      .update({
        status: "completed",
        created_profile_id: activeProfile.id,
        payment_id: payment.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", pending.id);

    await supabase
      .from("pagamentos_plataforma")
      .update({
        referencia_id: activeProfile.id,
        metadata: {
          ...(payment.metadata || {}),
          profile_page_id: activeProfile.id,
          pending_signup_id: pending.id,
          plan_code: planCode,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", payment.id);

    return res.status(200).json({
      ok: true,
      approved: true,
      status: "approved",
      payment_id: payment.id,
      mp_payment_id: mpPayment.id,
      profile: activeProfile,
      message: "Pagamento aprovado e vitrine criada.",
    });
  } catch (err) {
    console.error("❌ erro geral no cartão signup:", err);

    return res.status(500).json({
      error: err?.message || "Erro interno ao processar cartão.",
    });
  }
}