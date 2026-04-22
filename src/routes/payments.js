import express from "express";
import {
  createMercadoPagoPixIntent,
  getPendingPaymentById,
  getMercadoPagoPayment,
  processApprovedMercadoPagoPayment,
  verifyMercadoPagoWebhookSignature,
} from "../services/payments.js";

const router = express.Router();

router.post("/create-intent", async (req, res) => {
  try {
    const { paymentId } = req.body || {};

    if (!paymentId) {
      return res.status(400).json({
        ok: false,
        error: "paymentId é obrigatório.",
      });
    }

    const payment = await getPendingPaymentById(paymentId);

    if (!payment) {
      return res.status(404).json({
        ok: false,
        error: "Pagamento não encontrado.",
      });
    }

    const intent = await createMercadoPagoPixIntent(paymentId);

    if (!intent) {
      return res.status(500).json({
        ok: false,
        error: "Não foi possível gerar a cobrança Pix.",
      });
    }

    return res.json({
      ok: true,
      payment: intent,
      pix: {
        code: intent.qr_code,
        qrCodeBase64: intent.qr_code_base64,
        checkoutUrl: intent.checkout_url,
      },
    });
  } catch (err) {
    console.error("❌ erro em /payments/create-intent:", err);
    return res.status(500).json({
      ok: false,
      error: "Erro interno ao criar cobrança.",
    });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const payment = await getPendingPaymentById(req.params.id);

    if (!payment) {
      return res.status(404).json({
        ok: false,
        error: "Pagamento não encontrado.",
      });
    }

    return res.json({
      ok: true,
      payment,
    });
  } catch (err) {
    console.error("❌ erro em GET /payments/:id:", err);
    return res.status(500).json({
      ok: false,
      error: "Erro interno ao consultar pagamento.",
    });
  }
});

router.get("/:id/status", async (req, res) => {
  try {
    const payment = await getPendingPaymentById(req.params.id);

    if (!payment) {
      return res.status(404).json({
        ok: false,
        error: "Pagamento não encontrado.",
      });
    }

    let mpStatus = null;

    if (payment.mp_payment_id) {
      try {
        mpStatus = await getMercadoPagoPayment(payment.mp_payment_id);
      } catch (err) {
        console.error("❌ erro ao consultar status no Mercado Pago:", err);
      }
    }

    return res.json({
      ok: true,
      internal: payment,
      mercadoPago: mpStatus,
    });
  } catch (err) {
    console.error("❌ erro em GET /payments/:id/status:", err);
    return res.status(500).json({
      ok: false,
      error: "Erro interno ao consultar status.",
    });
  }
});

router.post("/webhook", async (req, res) => {
  try {
    const isValid = verifyMercadoPagoWebhookSignature(req);

    if (!isValid) {
      return res.status(401).json({
        ok: false,
        error: "Assinatura inválida.",
      });
    }

    const type = req.body?.type || req.query?.type || null;
    const action = req.body?.action || null;
    const dataId =
      req.body?.data?.id ||
      req.query["data.id"] ||
      null;

    console.log("📩 webhook Mercado Pago recebido:", {
      type,
      action,
      dataId,
    });

    if (!dataId) {
      return res.status(200).json({ ok: true, ignored: true });
    }

    if (type !== "payment") {
      return res.status(200).json({ ok: true, ignored: true });
    }

    const paid = await processApprovedMercadoPagoPayment(String(dataId));

    return res.status(200).json({
      ok: true,
      processed: !!paid,
    });
  } catch (err) {
    console.error("❌ erro em /payments/webhook:", err);
    return res.status(500).json({
      ok: false,
      error: "Erro interno no webhook.",
    });
  }
});

export default router;