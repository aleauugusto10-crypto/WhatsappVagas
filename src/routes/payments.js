import express from "express";
import { supabase } from "../supabase.js";

import {
  createMercadoPagoPixIntent,
  getPendingPaymentById,
  getMercadoPagoPayment,
  processApprovedMercadoPagoPayment,
  verifyMercadoPagoWebhookSignature,
} from "../services/payments.js";

const router = express.Router();

function onlyDigits(value = "") {
  return String(value || "").replace(/\D/g, "");
}

function normalizeBRPhone(phone = "") {
  let digits = onlyDigits(phone);

  if (!digits) return "";

  if (!digits.startsWith("55")) {
    digits = `55${digits}`;
  }

  const country = digits.slice(0, 2);
  const ddd = digits.slice(2, 4);
  let number = digits.slice(4);

  if (country === "55" && ddd.length === 2 && number.length === 8) {
    number = `9${number}`;
  }

  return `${country}${ddd}${number}`;
}

const ALERT_PLANS = {
  alerta_basico: {
    nome: "Plano Básico",
    valor: 9.9,
    dias: 30,
    receber_vagas: true,
    receber_missoes: false,
  },
  alerta_plus: {
    nome: "Plano Plus",
    valor: 19.9,
    dias: 30,
    receber_vagas: true,
    receber_missoes: true,
  },
  alerta_total: {
    nome: "Plano Total",
    valor: 29.9,
    dias: 30,
    receber_vagas: true,
    receber_missoes: true,
  },
};

router.post("/create-alert-plan", async (req, res) => {
  try {
    const { nome, sobrenome, email, telefone, plano_codigo } = req.body || {};

    const plan = ALERT_PLANS[plano_codigo];

    if (!plan) {
      return res.status(400).json({ error: "Plano inválido." });
    }

    const cleanNome = String(nome || "").trim();
    const cleanSobrenome = String(sobrenome || "").trim();
    const cleanEmail = String(email || "").trim().toLowerCase();
    const cleanPhone = normalizeBRPhone(telefone);

    if (!cleanNome || !cleanEmail || !cleanPhone) {
      return res.status(400).json({
        error: "Preencha nome, e-mail e telefone.",
      });
    }

    let { data: user, error: userError } = await supabase
      .from("usuarios")
      .select("*")
      .eq("telefone", cleanPhone)
      .maybeSingle();

    if (userError) {
      console.error("❌ erro ao buscar usuário:", userError);
      return res.status(500).json({ error: "Erro ao buscar usuário." });
    }

    if (!user) {
      const { data: createdUser, error: createUserError } = await supabase
        .from("usuarios")
        .insert({
          telefone: cleanPhone,
          nome: `${cleanNome} ${cleanSobrenome}`.trim(),
          email: cleanEmail,
          tipo: "usuario",
          etapa: "entrada",
          ativo: true,
          onboarding_finalizado: true,
        })
        .select()
        .single();

      if (createUserError) {
        console.error("❌ erro ao criar usuário:", createUserError);
        return res.status(500).json({ error: "Erro ao criar usuário." });
      }

      user = createdUser;
    } else {
      await supabase
        .from("usuarios")
        .update({
          nome: user.nome || `${cleanNome} ${cleanSobrenome}`.trim(),
          email: user.email || cleanEmail,
          ativo: true,
        })
        .eq("id", user.id);
    }

    const { data: assinatura, error: assinaturaError } = await supabase
      .from("alerta_planos_usuarios")
      .insert({
        usuario_id: user.id,
        nome: cleanNome,
        sobrenome: cleanSobrenome,
        email: cleanEmail,
        telefone: cleanPhone,
        plano_codigo,
        plano_nome: plan.nome,
        status: "pendente",
        receber_vagas: plan.receber_vagas,
        receber_missoes: plan.receber_missoes,
      })
      .select()
      .single();

    if (assinaturaError) {
      console.error("❌ erro ao criar assinatura:", assinaturaError);
      return res.status(500).json({ error: "Erro ao criar assinatura." });
    }

    const { data: payment, error: paymentError } = await supabase
      .from("pagamentos_plataforma")
      .insert({
        usuario_id: user.id,
        referencia_tipo: "pacote_alertas_whatsapp",
        plano_codigo,
        valor: plan.valor,
        status: "pendente",
        metadata: {
          titulo: `Assinatura ${plan.nome} - Alertas WhatsApp`,
          alerta_assinatura_id: assinatura.id,
          plano_nome: plan.nome,
          dias: plan.dias,
          receber_vagas: plan.receber_vagas,
          receber_missoes: plan.receber_missoes,
          nome: cleanNome,
          sobrenome: cleanSobrenome,
          email: cleanEmail,
          telefone: cleanPhone,
        },
      })
      .select()
      .single();

    if (paymentError) {
      console.error("❌ erro ao criar pagamento:", paymentError);
      return res.status(500).json({ error: "Erro ao criar pagamento." });
    }

    const intent = await createMercadoPagoPixIntent(payment.id);

    if (!intent?.qr_code) {
      return res.status(500).json({ error: "Erro ao gerar Pix." });
    }

    return res.json({
      ok: true,
      payment_id: intent.id,
      qr_code: intent.qr_code,
      qr_code_base64: intent.qr_code_base64,
      checkout_url: intent.checkout_url,
    });
  } catch (err) {
    console.error("❌ erro em /payments/create-alert-plan:", err);
    return res.status(500).json({ error: "Erro interno ao gerar Pix." });
  }
});

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

    return res.json({ ok: true, payment });
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
    const dataId = req.body?.data?.id || req.query["data.id"] || null;

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