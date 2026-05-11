import { supabase } from "../../src/lib/supabase.js";
import { createMercadoPagoPixIntent } from "../../../src/services/payments.js";
import { generateProfilePagePayload } from "../../../src/lib/pageGenerator.js";

function cleanPhone(phone = "") {
  let num = String(phone || "").replace(/\D/g, "");
  if (!num) return "";
  if (!num.startsWith("55")) num = `55${num}`;
  return num;
}

function normalizeSlug(value = "") {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 55);
}

async function uniqueSlug(base = "") {
  const clean = normalizeSlug(base || "minha-vitrine");

  const { data: existing } = await supabase
    .from("profiles_pages")
    .select("id")
    .eq("slug", clean)
    .maybeSingle();

  if (!existing) return clean;

  return `${clean}-${Math.floor(1000 + Math.random() * 9000)}`;
}

const PLAN_PRICES = {
  free: 0,
  store_start: 50,
  equipe_pro: 150,
  complete_pro: 350,
};

const PLAN_CREDITS = {
  free: 0,
  store_start: 30,
  equipe_pro: 100,
  complete_pro: 250,
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
      city,
      state,
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

    const { data: user, error: userError } = await supabase
      .from("usuarios")
      .upsert(
        {
          nome: name,
          telefone: whatsapp,
          tipo: "profissional",
          cidade: city || null,
          estado: state || null,
          categoria_principal: finalBusinessType,
          area_principal: finalBusinessType,
          etapa: "perfil_criado",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "telefone" }
      )
      .select()
      .single();

    if (userError || !user) {
      console.error("❌ erro ao criar usuário:", userError);
      return res.status(500).json({ error: "Erro ao criar usuário." });
    }

    const isFree = planCode === "free";

    const now = new Date();
    const nextPayment = new Date(now);
    nextPayment.setDate(nextPayment.getDate() + 30);

    const graceUntil = new Date(nextPayment);
    graceUntil.setDate(graceUntil.getDate() + 15);

    const aiPayload = await generateProfilePagePayload({
      id: user.id,
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
      servico_principal: finalBusinessType,
      categoria_principal: finalBusinessType,
      area_principal: finalBusinessType,
      reference_image_url: referenceImageUrl || "",
      plan_code: planCode,
      planCode,
    });

    const finalSlug = await uniqueSlug(
  `${businessName}-${finalBusinessType}-${city || ""}-${state || ""}`
);

    const profilePayload = {
      ...aiPayload,

      user_id: user.id,
      slug: finalSlug,

      nome: aiPayload.nome || businessName,
      servico: aiPayload.servico || finalBusinessType,
      cidade: city || "",
      estado: state || "",
      whatsapp,

      is_active: isFree,
      is_preview: !isFree,
      preview_expires_at: !isFree
        ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        : null,

      plan_code: planCode,
      plan_status: isFree ? "active" : "pending_payment",

      monthly_credits: PLAN_CREDITS[planCode] || 0,
      monthly_credits_balance: isFree ? 0 : PLAN_CREDITS[planCode] || 0,
      monthly_credits_used: 0,
      monthly_credits_reset_at: isFree ? null : nextPayment.toISOString(),

      next_payment_at: isFree ? null : nextPayment.toISOString(),
      plan_next_billing_at: isFree ? null : nextPayment.toISOString(),
      plan_expires_at: isFree ? null : nextPayment.toISOString(),
      payment_grace_until: isFree ? null : graceUntil.toISOString(),

      billing_notice_count: 0,
      last_billing_notice_at: null,

      show_store: planCode !== "free",
      show_booking: planCode !== "free",

      created_by_ai: true,
      updated_at: now.toISOString(),
    };

    const { data: profile, error: profileError } = await supabase
      .from("profiles_pages")
      .upsert(profilePayload, { onConflict: "user_id" })
      .select("*")
      .single();

    if (profileError || !profile) {
      console.error("❌ erro ao criar perfil:", profileError);
      return res.status(500).json({ error: "Erro ao criar vitrine." });
    }

    if (isFree) {
      return res.status(200).json({
        ok: true,
        free: true,
        profile,
        profile_url: `/p/${profile.slug}`,
        login_url: `/login`,
      });
    }

    const valor = Number(PLAN_PRICES[planCode] || 0);

    const { data: payment, error: paymentError } = await supabase
      .from("pagamentos_plataforma")
      .insert({
        usuario_id: user.id,
        referencia_tipo: "profile_plan_setup",
        plano_codigo: planCode,
        status: "pendente",
        valor,
        metadata: {
          titulo: `Ativação do plano ${PLAN_LABELS[planCode] || planCode}`,
          profile_page_id: profile.id,
          profile_slug: profile.slug,
          plan_code: planCode,
          plan_name: PLAN_LABELS[planCode] || planCode,
          setup_price: valor,
          monthly_credits: PLAN_CREDITS[planCode] || 0,
          payment_method: "pix",
          source: "public_profile_plans_section",
        },
      })
      .select()
      .single();

    if (paymentError || !payment) {
      console.error("❌ erro ao criar pagamento:", paymentError);
      return res.status(500).json({ error: "Erro ao criar pagamento." });
    }

    const pixPayment = await createMercadoPagoPixIntent(payment.id);

    return res.status(200).json({
      ok: true,
      free: false,
      profile,
      payment: pixPayment,
      profile_url: `/p/${profile.slug}`,
      login_url: `/login`,
    });
  } catch (err) {
    console.error("❌ erro geral no cadastro público:", err);

    return res.status(500).json({
      error: err?.message || "Erro interno ao criar vitrine.",
    });
  }
}