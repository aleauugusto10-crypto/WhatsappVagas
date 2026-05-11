import { supabase } from "../../src/lib/supabase.js";
import { createMercadoPagoPixIntent } from "../../../src/services/payments.js";

function cleanPhone(phone = "") {
  let num = String(phone || "").replace(/\D/g, "");

  if (!num) return "";

  if (!num.startsWith("55")) {
    num = `55${num}`;
  }

  return num;
}

const PLAN_PRICES = {
  free: 0,
  store_start: 50,
  equipe_pro: 150,
  complete_pro: 350,
};

const PLAN_LABELS = {
  free: "Plano Gratuito",
  store_start: "Loja Start",
  equipe_pro: "Equipe Pro",
  complete_pro: "Finance Premium",
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Método não permitido.",
    });
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
      city,
      state,
    } = req.body || {};

    const finalBusinessType = businessType || workArea;

    if (
      !name ||
      !businessName ||
      !phone ||
      !finalBusinessType
    ) {
      return res.status(400).json({
        error:
          "Preencha nome, nome comercial, telefone e ramo de trabalho.",
      });
    }

    if (!PLAN_PRICES.hasOwnProperty(planCode)) {
      return res.status(400).json({
        error: "Plano inválido.",
      });
    }

    const whatsapp = cleanPhone(phone);

    /*
    =========================================
    FREE
    =========================================
    */

    if (planCode === "free") {
      return res.status(200).json({
        ok: true,
        free: true,
        createInstantly: true,
      });
    }

    /*
    =========================================
    CADASTRO PENDENTE
    =========================================
    */

    const { data: pendingSignup, error: pendingError } =
      await supabase
        .from("profile_pending_signups")
        .insert({
          plan_code: planCode,

          name,
          business_name: businessName,

          phone: whatsapp,

          work_area: finalBusinessType,

          city: city || null,
          state: state || null,

          reference_image_url:
            referenceImageUrl || null,

          status: "pending_payment",
        })
        .select()
        .single();

    if (pendingError || !pendingSignup) {
      console.error(
        "❌ erro cadastro pendente:",
        pendingError
      );

      return res.status(500).json({
        error:
          "Erro ao iniciar cadastro da vitrine.",
      });
    }

    /*
    =========================================
    PAGAMENTO
    =========================================
    */

    const valor = Number(
      PLAN_PRICES[planCode] || 0
    );

    const { data: payment, error: paymentError } =
      await supabase
        .from("pagamentos_plataforma")
        .insert({
          referencia_tipo:
            "profile_pending_signup",

          status: "pendente",

          valor,

          plano_codigo: planCode,

          metadata: {
            pending_signup_id:
              pendingSignup.id,

            plan_code: planCode,

            plan_name:
              PLAN_LABELS[planCode] ||
              planCode,

            source:
              "public_profile_plans_section",
          },
        })
        .select()
        .single();

    if (paymentError || !payment) {
      console.error(
        "❌ erro pagamento:",
        paymentError
      );

      return res.status(500).json({
        error: "Erro ao criar pagamento.",
      });
    }

    /*
    =========================================
    VINCULA PAYMENT
    =========================================
    */

    await supabase
      .from("profile_pending_signups")
      .update({
        payment_id: payment.id,
      })
      .eq("id", pendingSignup.id);

    /*
    =========================================
    PIX
    =========================================
    */

    const pixPayment =
      await createMercadoPagoPixIntent(
        payment.id
      );

    return res.status(200).json({
      ok: true,

      free: false,

      pendingSignupId:
        pendingSignup.id,

      payment: pixPayment,
    });
  } catch (err) {
    console.error(
      "❌ erro geral profile-plan-signup:",
      err
    );

    return res.status(500).json({
      error:
        err?.message ||
        "Erro interno ao criar pagamento.",
    });
  }
}