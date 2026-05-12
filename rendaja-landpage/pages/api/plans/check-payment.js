import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { createOrUpdateProfilePage } from "../../../src/services/pageGenerator.js";

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Método não permitido." });
  }

  try {
    const { paymentId, pendingSignupId } = req.query;

    if (!paymentId) {
      return res.status(400).json({ error: "paymentId obrigatório." });
    }

    const { data: payment, error: paymentError } = await supabase
      .from("pagamentos_plataforma")
      .select("*")
      .eq("id", paymentId)
      .maybeSingle();

    if (paymentError || !payment) {
      return res.status(404).json({ error: "Pagamento não encontrado." });
    }

    if (payment.status !== "pago") {
      return res.status(200).json({
        ok: true,
        paid: false,
        status: payment.status,
      });
    }

    const pendingId =
      pendingSignupId ||
      payment.metadata?.pending_signup_id ||
      null;

    if (!pendingId) {
      return res.status(400).json({
        error: "Cadastro pendente não encontrado para criar a vitrine.",
      });
    }

    const { data: pending, error: pendingError } = await supabase
      .from("profile_pending_signups")
      .select("*")
      .eq("id", pendingId)
      .maybeSingle();

    if (pendingError || !pending) {
      return res.status(404).json({
        error: "Cadastro pendente não encontrado.",
      });
    }

    if (pending.created_profile_id) {
      const { data: existingProfile } = await supabase
        .from("profiles_pages")
        .select("*")
        .eq("id", pending.created_profile_id)
        .maybeSingle();

      if (existingProfile) {
        return res.status(200).json({
          ok: true,
          paid: true,
          status: "pago",
          creatingProfile: false,
          profile: {
            ...existingProfile,
            publicUrl: `/p/${existingProfile.slug}`,
          },
        });
      }
    }

    const planCode = pending.plan_code || payment.plano_codigo || "store_start";

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

        show_store: ["store_start", "equipe_pro", "complete_pro"].includes(planCode),
        show_booking: ["store_start", "equipe_pro", "complete_pro"].includes(planCode),

        updated_at: new Date().toISOString(),
      })
      .eq("id", profile.id)
      .select("*")
      .single();

    if (activeError) {
      throw activeError;
    }

    await supabase
      .from("profile_pending_signups")
      .update({
        status: "completed",
        created_profile_id: activeProfile.id,
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
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", payment.id);

    return res.status(200).json({
      ok: true,
      paid: true,
      status: "pago",
      creatingProfile: false,
      profile: {
        ...activeProfile,
        publicUrl: `/p/${activeProfile.slug}`,
      },
    });
  } catch (err) {
    console.error("❌ erro check-payment:", err);

    return res.status(500).json({
      error: err?.message || "Erro ao verificar pagamento.",
    });
  }
}