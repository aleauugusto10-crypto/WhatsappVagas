import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { createOrUpdateProfilePage } from "../../src/services/pageGenerator.js";
import { createMercadoPagoPixIntent } from "../../src/services/payments.js";

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function cleanPhone(phone = "") {
  let num = String(phone || "").replace(/\D/g, "");
  if (!num) return "";
  if (!num.startsWith("55")) num = `55${num}`;
  return num;
}

const PLAN_PRICES = {
  free: 0,
  store_start: 50,
  equipe_pro: 50,
  complete_pro: 50,
};

const PLAN_LABELS = {
  free: "Plano Gratuito",
  store_start: "Loja Start",
  equipe_pro: "Equipe Pro",
  complete_pro: "Finance Premium",
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido." });
  }

  try {
    const {
      planCode = "free",
      name,
      businessName,
      phone,
      businessType,
      workArea,
      referenceImageUrl,
      affiliateRef,
      city,
      state,
      affiliateCode,
    } = req.body || {};

    const finalBusinessType = businessType || workArea;

    if (!name || !businessName || !phone || !finalBusinessType) {
      return res.status(400).json({
        error: "Preencha nome, nome comercial, telefone e ramo de trabalho.",
      });
    }

    if (!Object.prototype.hasOwnProperty.call(PLAN_PRICES, planCode)) {
      return res.status(400).json({ error: "Plano inválido." });
    }

    const whatsapp = cleanPhone(phone);

    if (planCode === "free") {
      const profile = await createOrUpdateProfilePage({
        supabase,
        user: {
          id: crypto.randomUUID(),
          nome: name,
          nome_empresa: businessName,
          businessName,
          telefone: whatsapp,
          phone: whatsapp,
          whatsapp,
          cidade: city || "",
          estado: state || "",
          ramo_empresa: finalBusinessType,
          workArea: finalBusinessType,
          categoria_principal: finalBusinessType,
          area_principal: finalBusinessType,
          servico_principal: finalBusinessType,
          plan_code: "free",
          planCode: "free",
          reference_image_url: "",
        },
      });

      return res.status(200).json({
        ok: true,
        free: true,
        profile,
        profile_url: `/p/${profile.slug}`,
      });
    }

    const { data: pendingSignup, error: pendingError } = await supabase
      .from("profile_pending_signups")
      .insert({
        plan_code: planCode,
        name,
        business_name: businessName,
        phone: whatsapp,
        work_area: finalBusinessType,
        city: city || null,
        state: state || null,
        reference_image_url: referenceImageUrl || null,
        status: "pending_payment",
      })
      .select()
      .single();

    if (pendingError || !pendingSignup) {
      console.error("❌ erro cadastro pendente:", pendingError);
      return res.status(500).json({
        error: "Erro ao iniciar cadastro da vitrine.",
      });
    }

    const valor = Number(PLAN_PRICES[planCode] || 0);

    if (!valor || valor <= 0) {
      return res.status(400).json({
        error: "Valor do plano inválido para gerar Pix.",
      });
    }

    const { data: payment, error: paymentError } = await supabase
      .from("pagamentos_plataforma")
      .insert({
        referencia_tipo: "profile_pending_signup",
        status: "pendente",
        valor,
        plano_codigo: planCode,
        metadata: {
          pending_signup_id: pendingSignup.id,
          affiliate_ref: affiliateRef || null,
          plan_code: planCode,
          plan_name: PLAN_LABELS[planCode] || planCode,
          affiliate_code: affiliateCode || null,
          source: "public_profile_plans_section",
        },
      })
      .select()
      .single();

    if (paymentError || !payment) {
      console.error("❌ erro pagamento:", paymentError);
      return res.status(500).json({ error: "Erro ao criar pagamento." });
    }

    await supabase
      .from("profile_pending_signups")
      .update({
        payment_id: payment.id,
      })
      .eq("id", pendingSignup.id);

    const pixPayment = await createMercadoPagoPixIntent(payment.id);

    if (!pixPayment?.qr_code) {
      return res.status(500).json({
        error: "Erro ao gerar Pix.",
      });
    }

    return res.status(200).json({
      ok: true,
      free: false,
      pendingSignupId: pendingSignup.id,
      platformPaymentId: payment.id,
      payment: {
        ...pixPayment,
        platform_payment_id: payment.id,
        payment_id: payment.id,
      },
    });
  } catch (err) {
    console.error("❌ erro geral profile-plan-signup:", err);

    return res.status(500).json({
      error: err?.message || "Erro interno ao criar pagamento.",
    });
  }
}