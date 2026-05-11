import { supabase } from "../../src/supabase.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      error: "Método não permitido.",
    });
  }

  try {
    const { paymentId } = req.query || {};

    if (!paymentId) {
      return res.status(400).json({
        error: "Pagamento não informado.",
      });
    }

    const { data: payment, error: paymentError } =
      await supabase
        .from("pagamentos_plataforma")
        .select("*")
        .eq("id", paymentId)
        .maybeSingle();

    if (paymentError || !payment) {
      console.error(
        "❌ erro ao buscar pagamento:",
        paymentError
      );

      return res.status(404).json({
        error: "Pagamento não encontrado.",
      });
    }

    let profile = null;

    const profileId =
      payment.metadata?.profile_page_id;

    if (profileId) {
      const { data } = await supabase
        .from("profiles_pages")
        .select("*")
        .eq("id", profileId)
        .maybeSingle();

      profile = data || null;
    }

    return res.status(200).json({
      ok: true,

      payment_status: payment.status,

      paid: payment.status === "pago",

      profile,
    });
  } catch (err) {
    console.error(
      "❌ erro geral status pagamento:",
      err
    );

    return res.status(500).json({
      error:
        err?.message ||
        "Erro interno ao consultar pagamento.",
    });
  }
}