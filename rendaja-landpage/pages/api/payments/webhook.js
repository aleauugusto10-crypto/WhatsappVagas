import { supabase } from "../../../src/lib/supabase";

const MP_TOKEN = process.env.MERCADO_PAGO_ACCESS_TOKEN;

async function getMercadoPagoPayment(paymentId) {
  const res = await fetch(
    `https://api.mercadopago.com/v1/payments/${paymentId}`,
    {
      headers: {
        Authorization: `Bearer ${MP_TOKEN}`,
      },
    }
  );

  const data = await res.json();

  if (!res.ok) {
    console.error("❌ erro Mercado Pago:", data);
    throw new Error(
      data?.message || "Erro ao consultar pagamento."
    );
  }

  return data;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(200).json({
      ok: true,
    });
  }

  try {
    console.log(
      "📩 webhook Mercado Pago recebido:",
      JSON.stringify(req.body, null, 2)
    );

    const type =
      req.body?.type ||
      req.query?.type;

    const paymentId =
      req.body?.data?.id ||
      req.query?.["data.id"];

    if (!paymentId || type !== "payment") {
      return res.status(200).json({
        ok: true,
        ignored: true,
      });
    }

    /*
    =========================================
    CONSULTA PAGAMENTO MP
    =========================================
    */

    const mpPayment =
      await getMercadoPagoPayment(paymentId);

    console.log(
      "💰 pagamento consultado:",
      mpPayment.id,
      mpPayment.status
    );

    const externalReference =
      mpPayment.external_reference;

    if (!externalReference) {
      return res.status(200).json({
        ok: true,
        ignored: true,
        reason: "sem external_reference",
      });
    }

    /*
    =========================================
    LOCALIZA PAGAMENTO INTERNO
    =========================================
    */

    const { data: internalPayment, error } =
      await supabase
        .from("pagamentos_plataforma")
        .select("*")
        .eq("id", externalReference)
        .maybeSingle();

    if (error || !internalPayment) {
      console.error(
        "❌ pagamento interno não encontrado:",
        error
      );

      return res.status(404).json({
        error: "Pagamento interno não encontrado.",
      });
    }

    /*
    =========================================
    APROVADO
    =========================================
    */

    if (mpPayment.status === "approved") {
      await supabase
        .from("pagamentos_plataforma")
        .update({
          status: "pago",

          pago_em: new Date().toISOString(),

          mp_payment_id: String(mpPayment.id),

          metadata: {
            ...(internalPayment.metadata || {}),
            mercado_pago_status:
              mpPayment.status,
            mercado_pago_status_detail:
              mpPayment.status_detail || null,
          },

          updated_at: new Date().toISOString(),
        })
        .eq("id", internalPayment.id);

      console.log(
        "✅ pagamento aprovado:",
        internalPayment.id
      );
    }

    return res.status(200).json({
      ok: true,
    });
  } catch (err) {
    console.error(
      "❌ erro webhook:",
      err
    );

    return res.status(500).json({
      error:
        err?.message ||
        "Erro interno webhook.",
    });
  }
}