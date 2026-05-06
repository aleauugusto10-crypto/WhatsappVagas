import { supabaseAdmin as supabase } from "../../../src/lib/supabaseAdmin";

const API_BASE =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "";

const PACKAGES = {
  alertas_7_dias: {
    code: "alertas_7_dias",
    name: "Alerta Start",
    price: 4.9,
    days: 7,
    receber_vagas: true,
    receber_missoes: true,
  },
  alertas_30_dias: {
    code: "alertas_30_dias",
    name: "Alerta Pro",
    price: 14.9,
    days: 30,
    receber_vagas: true,
    receber_missoes: true,
  },
  alertas_vagas_30_dias: {
    code: "alertas_vagas_30_dias",
    name: "Só Vagas",
    price: 9.9,
    days: 30,
    receber_vagas: true,
    receber_missoes: false,
  },
};

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

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido." });
  }

  try {
    const planCode = req.body?.plan_code || req.body?.plano_codigo;
    const { nome, sobrenome, email, telefone } = req.body || {};

    const plan = PACKAGES[planCode];

    if (!plan) {
      return res.status(400).json({
        error: `Plano inválido: ${planCode || "vazio"}`,
      });
    }

    const cleanNome = String(nome || "").trim();
    const cleanSobrenome = String(sobrenome || "").trim();
    const cleanEmail = String(email || "").trim().toLowerCase();
    const cleanPhone = normalizeBRPhone(telefone);

    if (!cleanNome || !cleanSobrenome || !cleanEmail || cleanPhone.length < 12) {
      return res.status(400).json({ error: "Dados incompletos." });
    }

    let { data: user, error: userSearchError } = await supabase
      .from("usuarios")
      .select("*")
      .eq("telefone", cleanPhone)
      .maybeSingle();

    if (userSearchError) {
      console.error("Erro ao buscar usuário:", userSearchError);
      return res.status(500).json({ error: "Erro ao verificar usuário." });
    }

    if (!user) {
      const { data: createdUser, error: createUserError } = await supabase
        .from("usuarios")
        .insert({
          telefone: cleanPhone,
          nome: `${cleanNome} ${cleanSobrenome}`,
          tipo: "usuario",
          ativo: true,
          etapa: "entrada",
          onboarding_finalizado: true,
          email: cleanEmail,
        })
        .select()
        .single();

      if (createUserError) {
        console.error("Erro ao criar usuário:", createUserError);
        return res.status(500).json({
          error: createUserError.message || "Erro ao criar usuário.",
        });
      }

      user = createdUser;
    } else {
      const { data: updatedUser } = await supabase
        .from("usuarios")
        .update({
          nome: user.nome || `${cleanNome} ${cleanSobrenome}`,
          email: user.email || cleanEmail,
          ativo: true,
        })
        .eq("id", user.id)
        .select()
        .single();

      if (updatedUser) user = updatedUser;
    }

    const { data: assinatura, error: assinaturaError } = await supabase
      .from("alerta_planos_usuarios")
      .insert({
        usuario_id: user.id,
        nome: cleanNome,
        sobrenome: cleanSobrenome,
        email: cleanEmail,
        telefone: cleanPhone,
        plano_codigo: plan.code,
        plano_nome: plan.name,
        status: "pendente",
        receber_vagas: plan.receber_vagas,
        receber_missoes: plan.receber_missoes,
      })
      .select()
      .single();

    if (assinaturaError) {
      console.error("Erro ao criar assinatura:", assinaturaError);
      return res.status(500).json({
        error: assinaturaError.message || "Erro ao criar assinatura.",
      });
    }

    const { data: pagamento, error: paymentError } = await supabase
      .from("pagamentos_plataforma")
      .insert({
        usuario_id: user.id,
        referencia_tipo: "pacote_alertas_whatsapp",
        plano_codigo: plan.code,
        valor: plan.price,
        status: "pendente",
        metadata: {
          origem: "shopping_alertas",
          alerta_assinatura_id: assinatura.id,
          nome: cleanNome,
          sobrenome: cleanSobrenome,
          email: cleanEmail,
          telefone: cleanPhone,
          plano_nome: plan.name,
          dias: plan.days,
          receber_vagas: plan.receber_vagas,
          receber_missoes: plan.receber_missoes,
        },
      })
      .select()
      .single();

    if (paymentError || !pagamento) {
      console.error("Erro ao criar pagamento:", paymentError);
      return res.status(500).json({
        error: paymentError?.message || "Erro ao criar pagamento.",
      });
    }

    if (!API_BASE) {
      return res.status(500).json({
        error: "URL do backend não configurada.",
      });
    }

    const mpRes = await fetch(`${API_BASE.replace(/\/$/, "")}/payments/create-intent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        paymentId: pagamento.id,
      }),
    });

    const mpData = await mpRes.json().catch(() => ({}));

    if (!mpRes.ok) {
      console.error("Erro Mercado Pago:", mpData);
      return res.status(500).json({
        error: mpData?.error || "Erro ao gerar Pix.",
      });
    }

    return res.status(200).json({
      ok: true,
      user_id: user.id,
      payment_id: pagamento.id,
      payment: mpData.payment,
    });
  } catch (err) {
    console.error("Erro geral create-payment:", err);

    return res.status(500).json({
      error: "Erro interno ao gerar pagamento.",
      details: err.message,
    });
  }
}