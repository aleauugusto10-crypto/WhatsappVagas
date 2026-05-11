import { supabase } from "../../../src/supabase";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      error: "Método não permitido.",
    });
  }

  try {
    const { paymentId, pendingSignupId } = req.query;

    if (!paymentId) {
      return res.status(400).json({
        error: "paymentId obrigatório.",
      });
    }

    /*
    =========================================
    PAGAMENTO
    =========================================
    */

    const { data: payment, error: paymentError } =
      await supabase
        .from("pagamentos_plataforma")
        .select("*")
        .eq("id", paymentId)
        .maybeSingle();

    if (paymentError || !payment) {
      return res.status(404).json({
        error: "Pagamento não encontrado.",
      });
    }

    /*
    =========================================
    NÃO PAGO AINDA
    =========================================
    */

    if (payment.status !== "pago") {
      return res.status(200).json({
        ok: true,
        paid: false,
        status: payment.status,
      });
    }

    /*
    =========================================
    JÁ PAGO
    =========================================
    */

    let profile = null;

    /*
    =========================================
    PROFILE VIA METADATA
    =========================================
    */

    const profileId =
      payment.metadata?.profile_page_id;

    if (profileId) {
      const { data: existingProfile } =
        await supabase
          .from("profiles_pages")
          .select("*")
          .eq("id", profileId)
          .maybeSingle();

      if (existingProfile) {
        profile = existingProfile;
      }
    }

    /*
    =========================================
    PROFILE VIA PENDING SIGNUP
    =========================================
    */

    if (!profile && pendingSignupId) {
      const { data: pending } =
        await supabase
          .from("profile_pending_signups")
          .select("*")
          .eq("id", pendingSignupId)
          .maybeSingle();

      if (pending?.created_profile_id) {
        const { data: pendingProfile } =
          await supabase
            .from("profiles_pages")
            .select("*")
            .eq("id", pending.created_profile_id)
            .maybeSingle();

        if (pendingProfile) {
          profile = pendingProfile;
        }
      }
    }

    /*
    =========================================
    PROFILE VIA USER
    =========================================
    */

    if (!profile && payment.usuario_id) {
      const { data: latestProfile } =
        await supabase
          .from("profiles_pages")
          .select("*")
          .eq("user_id", payment.usuario_id)
          .order("created_at", {
            ascending: false,
          })
          .limit(1)
          .maybeSingle();

      if (latestProfile) {
        profile = latestProfile;
      }
    }

    /*
    =========================================
    RETORNO FINAL
    =========================================
    */

    return res.status(200).json({
      ok: true,

      paid: true,

      status: payment.status,

      creatingProfile: !profile,

      profile: profile || null,
    });
  } catch (err) {
    console.error(
      "❌ erro check-payment:",
      err
    );

    return res.status(500).json({
      error:
        err?.message ||
        "Erro ao verificar pagamento.",
    });
  }
}