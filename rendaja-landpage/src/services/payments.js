import crypto from "crypto";
import { supabase } from "../supabase.js";
import { sendText } from "../services/whatsapp.js";

const MP_BASE_URL = "https://api.mercadopago.com";
const MP_TOKEN = process.env.MERCADO_PAGO_ACCESS_TOKEN;
const MP_WEBHOOK_SECRET = process.env.MERCADO_PAGO_WEBHOOK_SECRET || "";
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || "";

function ensureMpToken() {
  if (!MP_TOKEN) {
    throw new Error("MERCADO_PAGO_ACCESS_TOKEN não configurado.");
  }
}

function buildIdempotencyKey(prefix, id) {
  return `${prefix}_${id}`;
}

async function mpFetch(path, options = {}) {
  ensureMpToken();

  const headers = {
    Authorization: `Bearer ${MP_TOKEN}`,
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  const res = await fetch(`${MP_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const text = await res.text();
  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    console.error("❌ Mercado Pago error:", res.status, data);
    throw new Error(`Mercado Pago ${res.status}`);
  }

  return data;
}

export async function getPendingPaymentById(paymentId) {
  const { data, error } = await supabase
    .from("pagamentos_plataforma")
    .select("*")
    .eq("id", paymentId)
    .maybeSingle();

  if (error) {
    console.error("❌ erro ao buscar pagamento:", error);
    return null;
  }

  return data || null;
}

export async function updatePayment(paymentId, data) {
  const { data: updated, error } = await supabase
    .from("pagamentos_plataforma")
    .update(data)
    .eq("id", paymentId)
    .select()
    .single();

  if (error) {
    console.error("❌ erro ao atualizar pagamento:", error);
    return null;
  }

  return updated;
}

export async function markPaymentAsPaid(paymentId, extra = {}) {
  return updatePayment(paymentId, {
    status: "pago",
    pago_em: new Date().toISOString(),
    ...extra,
  });
}

export async function markPaymentAsCancelled(paymentId, extra = {}) {
  return updatePayment(paymentId, {
    status: "cancelado",
    ...extra,
  });
}

function buildNotificationUrl() {
  if (!PUBLIC_BASE_URL) {
    throw new Error("PUBLIC_BASE_URL não configurado.");
  }

  return `${PUBLIC_BASE_URL.replace(/\/+$/, "")}/payments/webhook`;
}

function buildPixDescription(payment) {
  const md = payment.metadata || {};

  if (md.titulo) return md.titulo;
  if (payment.plano_codigo) return `Pagamento ${payment.plano_codigo}`;
  return `Pagamento plataforma ${payment.id}`;
}

async function buildPayerEmail(payment) {
  const { data: usuario, error } = await supabase
    .from("usuarios")
    .select("email")
    .eq("id", payment.usuario_id)
    .maybeSingle();

  if (error) {
    console.error("❌ erro ao buscar email do usuário:", error);
  }

  const email = usuario?.email;

  if (
    email &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim().toLowerCase())
  ) {
    return String(email).trim().toLowerCase();
  }

  const safeUserId = String(payment.usuario_id || "guest")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 40);

  return `${safeUserId}@example.com`;
}

export async function createMercadoPagoPixIntent(paymentId) {
  const payment = await getPendingPaymentById(paymentId);

  if (!payment) return null;

  if (payment.status !== "pendente") {
    return payment;
  }

  if (payment.mp_payment_id && payment.qr_code) {
    return payment;
  }

  const body = {
    transaction_amount: Number(payment.valor),
    description: buildPixDescription(payment),
    payment_method_id: "pix",
    notification_url: buildNotificationUrl(),
    external_reference: payment.id,
    payer: {
      email: await buildPayerEmail(payment),
    },
    metadata: {
      plataforma_payment_id: payment.id,
      referencia_tipo: payment.referencia_tipo,
      usuario_id: payment.usuario_id,
      ...(payment.metadata || {}),
    },
  };

  const mpData = await mpFetch("/v1/payments", {
    method: "POST",
    headers: {
      "X-Idempotency-Key": buildIdempotencyKey("pix", payment.id),
    },
    body: JSON.stringify(body),
  });

  const qrData = mpData?.point_of_interaction?.transaction_data || {};

  const updated = await updatePayment(payment.id, {
    mp_payment_id: String(mpData.id),
    status: "pendente",
    qr_code: qrData.qr_code || null,
    qr_code_base64: qrData.qr_code_base64 || null,
    checkout_url: qrData.ticket_url || null,
    metadata: {
      ...(payment.metadata || {}),
      mercado_pago_status: mpData.status || null,
      mercado_pago_status_detail: mpData.status_detail || null,
    },
  });

  return updated;
}

export async function getMercadoPagoPayment(mpPaymentId) {
  if (!mpPaymentId) return null;

  return mpFetch(`/v1/payments/${mpPaymentId}`, {
    method: "GET",
  });
}

export function verifyMercadoPagoWebhookSignature(req) {
  if (!MP_WEBHOOK_SECRET) {
    return true;
  }

  const signature = req.headers["x-signature"];
  const requestId = req.headers["x-request-id"] || "";
  const dataId = req.query["data.id"] || req.body?.data?.id || "";

  if (!signature || !dataId) {
    return false;
  }

  const parts = String(signature)
    .split(",")
    .map((p) => p.trim());

  const tsPart = parts.find((p) => p.startsWith("ts="));
  const v1Part = parts.find((p) => p.startsWith("v1="));

  if (!tsPart || !v1Part) {
    return false;
  }

  const ts = tsPart.replace("ts=", "");
  const v1 = v1Part.replace("v1=", "");

  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;

  const expected = crypto
    .createHmac("sha256", MP_WEBHOOK_SECRET)
    .update(manifest)
    .digest("hex");

  return expected === v1;
}

/**
 * Assinaturas recorrentes que ainda fazem sentido:
 * - trabalhador semanal
 * - trabalhador mensal/notificações
 */
export async function activateSubscriptionFromPayment(payment) {
  if (!payment?.usuario_id) return null;

  const now = new Date();
  const fim = new Date(now);
  const md = payment.metadata || {};

  let tipo = null;
  let dias = 0;

  if (payment.referencia_tipo === "usuario_vagas_semanal") {
    tipo = "usuario_vagas_semanal";
    dias = 7;
  }

  if (payment.referencia_tipo === "usuario_alerta_mensal") {
    tipo = "usuario_alerta_mensal";
    dias = 30;
  }

  if (!tipo || !dias) return null;

  fim.setDate(fim.getDate() + dias);

  const notificacaoScope = md.notificacao_scope || "categoria_atual";
  const categoriasExtras = Array.isArray(md.categorias_extras)
    ? md.categorias_extras
    : [];

  const { data, error } = await supabase
    .from("assinaturas_usuario")
    .insert({
      usuario_id: payment.usuario_id,
      tipo,
      status: "ativa",
      inicio_em: now.toISOString(),
      fim_em: fim.toISOString(),
      notificacao_scope: notificacaoScope,
      categorias_extras: categoriasExtras,
    })
    .select()
    .single();

  if (error) {
    console.error("❌ erro ao ativar assinatura:", error);
    return null;
  }

  return data;
}

/**
 * Créditos de publicação de vagas da empresa
 */
export async function activateCompanyJobCreditsFromPayment(payment) {
  if (!payment?.usuario_id) return null;

  let totalCreditos = 0;
  const dias = 30;

  if (payment.plano_codigo === "empresa_1_vaga") totalCreditos = 1;
  if (payment.plano_codigo === "empresa_3_vagas") totalCreditos = 3;
  if (payment.plano_codigo === "empresa_10_vagas") totalCreditos = 10;

  if (!totalCreditos) return null;

  const validade = new Date();
  validade.setDate(validade.getDate() + dias);

  const { data, error } = await supabase
    .from("empresa_creditos_vagas")
    .insert({
      empresa_id: payment.usuario_id,
      pagamento_id: payment.id,
      plano_codigo: payment.plano_codigo,
      total_creditos: totalCreditos,
      creditos_usados: 0,
      status: "ativo",
      validade_em: validade.toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error("❌ erro ao ativar créditos de vagas da empresa:", error);
    return null;
  }

  return data;
}

export async function getActiveCompanyJobCredits(empresaId) {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("empresa_creditos_vagas")
    .select("*")
    .eq("empresa_id", empresaId)
    .eq("status", "ativo")
    .gt("validade_em", now)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("❌ erro ao buscar créditos ativos da empresa:", error);
    return [];
  }

  return data || [];
}

export async function consumeCompanyJobCredit(empresaId) {
  const credits = await getActiveCompanyJobCredits(empresaId);

  const credit = credits.find(
    (c) => Number(c.creditos_usados || 0) < Number(c.total_creditos || 0)
  );

  if (!credit) return null;

  const novosUsados = Number(credit.creditos_usados || 0) + 1;
  const novoStatus =
    novosUsados >= Number(credit.total_creditos || 0) ? "esgotado" : "ativo";

  const { data, error } = await supabase
    .from("empresa_creditos_vagas")
    .update({
      creditos_usados: novosUsados,
      status: novoStatus,
    })
    .eq("id", credit.id)
    .select()
    .single();

  if (error) {
    console.error("❌ erro ao consumir crédito de vaga:", error);
    return null;
  }

  return data;
}

/**
 * Missões
 */
export async function publishMissionFromPayment(payment) {
  if (payment.referencia_tipo !== "missao_publicacao") return null;

  const md = payment.metadata || {};

  const { data, error } = await supabase
    .from("missoes")
    .insert({
      usuario_id: payment.usuario_id,
      titulo: md.titulo,
      descricao: md.descricao,
      categoria_chave: md.categoria_chave,
      tipo: md.tipo || "individual",
vagas_total: Number(md.vagas_total || 1),
vagas_ocupadas: 0,
valor_total: Number(md.valor_total || md.valor_missao || 0),
valor_por_pessoa: Number(md.valor_por_pessoa || md.valor_missao || 0),

valor: Number(md.valor_missao || md.valor_por_pessoa || 0),
taxa_plataforma: md.taxa_plataforma || 0,
      urgencia: !!md.urgencia,
      cidade: md.cidade,
      estado: md.estado,
      status: "aberta",
      pagamento_status: "retido",
    })
    .select()
    .single();

  if (error) {
    console.error("❌ erro ao publicar missão a partir do pagamento:", error);
    return null;
  }

  return data;
}

/**
 * Vagas pagas individualmente.
 * No modelo atual da empresa, a publicação normal acontece por crédito.
 * Mantemos essa função por compatibilidade caso ainda exista algum fluxo legado.
 */
export async function activateProfilePlanFromPayment(payment) {
  if (
    payment.referencia_tipo !== "profile_plan_setup" &&
    payment.referencia_tipo !== "profile_page_subscription"
  ) {
    return null;
  }

  if (payment.status !== "pago") return null;

  const md = payment.metadata || {};

  const profilePageId = md.profile_page_id;

  const planCode =
    md.plan_code ||
    payment.plano_codigo ||
    "store_start";

  const finalPlanCode =
    planCode === "profile_page_mensal" ? "store_start" : planCode;

  if (!profilePageId || !finalPlanCode) {
    console.error("❌ dados ausentes para ativar plano:", {
      payment_id: payment.id,
      referencia_tipo: payment.referencia_tipo,
      plano_codigo: payment.plano_codigo,
      metadata: md,
    });
    return null;
  }

  const planCredits = {
  store_start: 30,
 
  equipe_pro: 100,
  complete_pro: 250,
};
  const credits = planCredits[finalPlanCode] || 0;

  const now = new Date();
  const nextPayment = new Date(now);
  nextPayment.setDate(nextPayment.getDate() + 30);
const graceUntil = new Date(nextPayment);
graceUntil.setDate(graceUntil.getDate() + 15);
  console.log("🚀 ATIVANDO PLANO DA VITRINE:", {
    payment_id: payment.id,
    profilePageId,
    finalPlanCode,
    credits,
  });

  const { data, error } = await supabase
    .from("profiles_pages")
    .update({
      plan_code: finalPlanCode,
      plan_status: "active",

      is_active: true,
      is_preview: false,
      preview_expires_at: null,

      monthly_credits: credits,
      monthly_credits_balance: credits,
      monthly_credits_used: 0,
      monthly_credits_reset_at: nextPayment.toISOString(),

      plan_started_at: now.toISOString(),
      plan_next_billing_at: nextPayment.toISOString(),

plan_expires_at: nextPayment.toISOString(),
payment_grace_until: graceUntil.toISOString(),
billing_notice_count: 0,
last_billing_notice_at: null,

subscription_started_at: now.toISOString(),
activated_at: now.toISOString(),

last_payment_id: payment.id,
last_payment_at: now.toISOString(),
next_payment_at: nextPayment.toISOString(),

      updated_at: now.toISOString(),
    })
    .eq("id", profilePageId)
    .select("id, plan_code, plan_status, monthly_credits_balance, last_payment_id")
    .single();

  if (error) {
    console.error("❌ ERRO REAL AO ATIVAR PLANO:", error);
    return null;
  }

  console.log("✅ PLANO ATIVADO COM SUCESSO:", data);

  return data;
}
export async function publishJobFromPayment(payment) {
  if (payment.referencia_tipo !== "empresa_publicar_vaga") return null;

  if (payment.status !== "pago") {
    console.log("⛔ tentativa de publicar vaga sem pagamento aprovado");
    return null;
  }

  const md = payment.metadata || {};

  const { data: existing } = await supabase
    .from("vagas")
    .select("id")
    .eq("empresa_id", payment.usuario_id)
    .eq("titulo", md.titulo || "")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    console.log("ℹ️ vaga já existe, não duplicando");
    return existing;
  }

  const { data, error } = await supabase
    .from("vagas")
    .insert({
      empresa_id: payment.usuario_id,
      nome_empresa: md.nome_empresa || null,
      titulo: md.titulo,
      descricao: md.descricao,
      requisitos: md.requisitos,
      tipo_contratacao: md.tipo_contratacao,
      salario: md.salario,
      jornada: md.jornada,
      quantidade_vagas: md.quantidade_vagas || 1,
      categoria_chave: md.categoria_chave,
      cidade: md.cidade,
      estado: md.estado,
      destaque: !!md.destaque,
      status: "ativa",
      publicada_em: new Date().toISOString(),
      contato_whatsapp: md.contato_whatsapp || null,
    })
    .select()
    .single();

  if (error) {
    console.error("❌ erro ao publicar vaga:", error);
    return null;
  }

  return data;
}

/**
 * Publicação do profissional em "servicos"
 */
export async function publishProfessionalServiceFromPayment(payment) {
  if (payment.referencia_tipo !== "profissional_anuncio") return null;
  if (payment.status !== "pago") return null;

  const md = payment.metadata || {};

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("nome, telefone, cidade, estado, categoria_principal")
    .eq("id", payment.usuario_id)
    .maybeSingle();

  const categoriaChave =
    md.categoria_chave || usuario?.categoria_principal || null;

  const tituloBase = md.titulo || usuario?.nome || "Profissional";
  const descricaoBase =
    md.descricao ||
    "Profissional disponível para oportunidades e prestação de serviço.";

  const { data: existing } = await supabase
    .from("servicos")
    .select("id")
    .eq("usuario_id", payment.usuario_id)
    .eq("categoria_chave", categoriaChave)
    .eq("ativo", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    console.log("ℹ️ anúncio profissional já existe, não duplicando");
    return existing;
  }

  const { data, error } = await supabase
    .from("servicos")
    .insert({
      usuario_id: payment.usuario_id,
      titulo: tituloBase,
      descricao: descricaoBase,
      categoria_chave: categoriaChave,
      cidade: md.cidade || usuario?.cidade || null,
      estado: md.estado || usuario?.estado || null,
      contato_whatsapp: md.contato_whatsapp || usuario?.telefone || null,
      ativo: true,
      nivel_visibilidade: 0,
    })
    .select()
    .single();

  if (error) {
    console.error("❌ erro ao publicar anúncio profissional:", error);
    return null;
  }

  return data;
}

/**
 * Destaque profissional:
 * eleva a visibilidade do último anúncio ativo do usuário.
 */
export async function applyProfessionalHighlightFromPayment(payment) {
  if (payment.referencia_tipo !== "profissional_destaque") return null;
  if (payment.status !== "pago") return null;

  const { data: servico, error: findError } = await supabase
    .from("servicos")
    .select("*")
    .eq("usuario_id", payment.usuario_id)
    .eq("ativo", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (findError) {
    console.error("❌ erro ao localizar serviço para destaque:", findError);
    return null;
  }

  if (!servico) {
    console.log("ℹ️ nenhum anúncio ativo encontrado para destacar");
    return null;
  }

  const novoNivel = Math.max(Number(servico.nivel_visibilidade || 0), 1);
const md = payment.metadata || {};
const dias = Number(md.dias_destaque || 30);
const destaqueAte = new Date();
destaqueAte.setDate(destaqueAte.getDate() + dias);
  const { data, error } = await supabase
    .from("servicos")
   .update({
  nivel_visibilidade: novoNivel,
  destaque_ate: destaqueAte.toISOString(),
})
    .eq("id", servico.id)
    .select()
    .single();

  if (error) {
    console.error("❌ erro ao aplicar destaque profissional:", error);
    return null;
  }

  return data;
}
async function ensureCarteira(usuarioId) {
  const { data: existente } = await supabase
    .from("carteiras")
    .select("*")
    .eq("usuario_id", usuarioId)
    .maybeSingle();

  if (existente) return existente;

  const { data } = await supabase
    .from("carteiras")
    .insert({
      usuario_id: usuarioId,
      saldo: 0,
      saldo_pendente: 0,
    })
    .select()
    .single();

  return data;
}

export async function createProfilePageSubscriptionPayment({
  user,
  profile = null,
  planCode = "store_start",
  leadData = {},
}) {
  if (!user?.id) {
    throw new Error("Usuário inválido.");
  }

  

  const PLAN_PRICES = {
  store_start: 19.9,
  complete_pro: 49.9,
};

const PLAN_TITLES = {
  store_start: "Vitrine Inteligente",
  complete_pro: "Gestão Completa",
};

const valor =
  PLAN_PRICES[planCode] ||
  PLAN_PRICES.store_start;

const tituloPlano =
  PLAN_TITLES[planCode] ||
  PLAN_TITLES.store_start;

  const { data: payment, error } = await supabase
    .from("pagamentos_plataforma")
    .insert({
      usuario_id: user.id,
      referencia_tipo: "profile_page_subscription",
      plano_codigo: planCode,
      status: "pendente",
      valor,
     metadata: {
  titulo: `${tituloPlano} - CompreTudo.Shop`,
  profile_page_id: profile?.id || null,
  profile_slug: profile?.slug || null,
  lead_data: leadData,
  dias_assinatura: 30,
  plan_code: planCode,
},
    })
    .select()
    .single();

  if (error) {
    console.error("❌ erro ao criar pagamento da página:", error);
    throw error;
  }

  return createMercadoPagoPixIntent(payment.id);
}

export async function activateProfilePageFromPayment(payment) {
  if (payment.referencia_tipo !== "profile_page_subscription") return null;
  if (payment.status !== "pago") return null;

  const md = payment.metadata || {};
  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setDate(expiresAt.getDate() + Number(md.dias_assinatura || 30));

  console.log("🧾 ativando página pelo pagamento:", {
    payment_id: payment.id,
    usuario_id: payment.usuario_id,
    profile_page_id_metadata: md.profile_page_id,
    profile_slug: md.profile_slug,
  });

  let profile = null;

  if (md.profile_page_id) {
    const byId = await supabase
      .from("profiles_pages")
      .select("id,user_id,slug")
      .eq("id", md.profile_page_id)
      .maybeSingle();

    if (!byId.error && byId.data) {
      profile = byId.data;
    } else {
      console.log("⚠️ não achei profile pelo metadata, tentando por user_id:", byId.error);
    }
  }

  if (!profile) {
    const byUser = await supabase
      .from("profiles_pages")
      .select("id,user_id,slug")
      .eq("user_id", payment.usuario_id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (byUser.error || !byUser.data) {
      console.error("❌ não encontrei página para ativar:", byUser.error);
      return null;
    }

    profile = byUser.data;
  }

  const { data, error } = await supabase
    .from("profiles_pages")
    .update({
      is_active: true,
      is_preview: false,
      preview_expires_at: null,
      plan_status: "active",
      subscription_started_at: now.toISOString(),
      subscription_expires_at: expiresAt.toISOString(),
      activated_at: now.toISOString(),
      last_payment_id: payment.id,
      updated_at: now.toISOString(),
    })
    .eq("id", profile.id)
    .select("*")
    .single();

  if (error) {
    console.error("❌ erro ao ativar página profissional:", error);
    return null;
  }

  console.log("✅ página ativada no banco:", {
    id: data.id,
    user_id: data.user_id,
    is_active: data.is_active,
    is_preview: data.is_preview,
    plan_status: data.plan_status,
  });

  return data;
}

export async function activateAlertPlanFromPayment(payment) {
  if (payment.referencia_tipo !== "pacote_alertas_whatsapp") return null;
  if (payment.status !== "pago") return null;

  const md = payment.metadata || {};
  const now = new Date();
  const expiresAt = new Date(now);

  expiresAt.setDate(expiresAt.getDate() + Number(md.dias || 30));

  const assinaturaId = md.alerta_assinatura_id || null;

  let query = supabase
    .from("alerta_planos_usuarios")
    .update({
      status: "ativo",
      activated_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      receber_vagas: md.receber_vagas !== false,
      receber_missoes: md.receber_missoes !== false,
    });

  if (assinaturaId) {
    query = query.eq("id", assinaturaId);
  } else {
    query = query
      .eq("usuario_id", payment.usuario_id)
      .eq("plano_codigo", payment.plano_codigo)
      .eq("status", "pendente");
  }

  const { data, error } = await query.select().single();

  if (error) {
    console.error("❌ erro ao ativar plano de alertas:", error);
    return null;
  }

  console.log("✅ plano de alertas ativado:", {
  assinatura_id: data.id,
  usuario_id: data.usuario_id,
  plano_codigo: data.plano_codigo,
  expires_at: data.expires_at,
});

await sendAlertPlanWelcomeMessage(data);

return data;
}

async function sendAlertPlanWelcomeMessage(subscription) {
  if (!subscription?.usuario_id) return;

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("*")
    .eq("id", subscription.usuario_id)
    .maybeSingle();

  if (!usuario?.telefone) return;

  const telefone = String(usuario.telefone).replace(/\D/g, "");

  let mensagem = "";

  mensagem += "🚀 *Plano ativado com sucesso!*\n\n";

  mensagem +=
    "Agora você começará a receber oportunidades diretamente no WhatsApp.\n\n";

  if (subscription.receber_vagas) {
    mensagem += "💼 Vagas de emprego\n";
  }

  if (subscription.receber_missoes) {
    mensagem += "🎯 Missões e oportunidades rápidas\n";
  }

  mensagem += "\n📲 O CompreTudo.shop irá avisar automaticamente quando surgirem novas oportunidades perto de você.";

  try {
    await sendText(telefone, mensagem);
  } catch (err) {
    console.error("❌ erro ao enviar mensagem de boas-vindas:", err);
  }
}


const PROFILE_PLAN_CREDITS = {
  store_start: 30,
  equipe_pro: 100,
  complete_pro: 250,
};

function normalizeSlug(value = "") {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 55);
}

async function uniqueProfileSlug(base = "") {
  const clean = normalizeSlug(base || "minha-vitrine");

  const { data: existing } = await supabase
    .from("profiles_pages")
    .select("id")
    .eq("slug", clean)
    .maybeSingle();

  if (!existing) return clean;

  return `${clean}-${Math.floor(1000 + Math.random() * 9000)}`;
}
/*
export async function createProfileFromPendingSignupPayment(payment) {
  if (payment.referencia_tipo !== "profile_pending_signup") return null;
  if (payment.status !== "pago") return null;

  const pendingSignupId = payment.metadata?.pending_signup_id;

  if (!pendingSignupId) {
    console.error("❌ pagamento sem pending_signup_id:", payment.id);
    return null;
  }

  const { data: pending, error: pendingError } = await supabase
    .from("profile_pending_signups")
    .select("*")
    .eq("id", pendingSignupId)
    .maybeSingle();

  if (pendingError || !pending) {
    console.error("❌ cadastro pendente não encontrado:", pendingError);
    return null;
  }

  if (pending.created_profile_id) {
    console.log("🔁 vitrine já criada para este pagamento:", pending.created_profile_id);

    const { data: existingProfile } = await supabase
      .from("profiles_pages")
      .select("*")
      .eq("id", pending.created_profile_id)
      .maybeSingle();

    return existingProfile || null;
  }

  const planCode = pending.plan_code || payment.plano_codigo || "store_start";
  const now = new Date();

  const nextPayment = new Date(now);
  nextPayment.setDate(nextPayment.getDate() + 30);

  const graceUntil = new Date(nextPayment);
  graceUntil.setDate(graceUntil.getDate() + 15);

  const { data: user, error: userError } = await supabase
    .from("usuarios")
    .upsert(
      {
        nome: pending.name,
        telefone: pending.phone,
        tipo: "profissional",
        cidade: pending.city || null,
        estado: pending.state || null,
        categoria_principal: pending.work_area,
        area_principal: pending.work_area,
        etapa: "perfil_criado",
      },
      { onConflict: "telefone" }
    )
    .select()
    .single();

  if (userError || !user) {
    console.error("❌ erro ao criar usuário pós-pagamento:", userError);
    return null;
  }

  const aiPayload = await generateProfilePagePayload({
    id: user.id,
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
    servico_principal: pending.work_area,
    categoria_principal: pending.work_area,
    area_principal: pending.work_area,
    reference_image_url: pending.reference_image_url || "",
    plan_code: planCode,
    planCode,
  });

  const finalSlug = await uniqueProfileSlug(
    `${pending.business_name}-${pending.work_area}-${pending.city || ""}-${pending.state || ""}`
  );

  const credits = PROFILE_PLAN_CREDITS[planCode] || 0;

  const profilePayload = {
    ...aiPayload,

    user_id: user.id,
    slug: finalSlug,

    nome: aiPayload.nome || pending.business_name,
    servico: aiPayload.servico || pending.work_area,
    cidade: pending.city || "",
    estado: pending.state || "",
    whatsapp: pending.phone,

    is_active: true,
    is_preview: false,
    preview_expires_at: null,

    plan_code: planCode,
    plan_status: "active",

    monthly_credits: credits,
    monthly_credits_balance: credits,
    monthly_credits_used: 0,
    monthly_credits_reset_at: nextPayment.toISOString(),

    next_payment_at: nextPayment.toISOString(),
    plan_next_billing_at: nextPayment.toISOString(),
    plan_expires_at: nextPayment.toISOString(),
    payment_grace_until: graceUntil.toISOString(),

    billing_notice_count: 0,
    last_billing_notice_at: null,

    plan_started_at: now.toISOString(),
    subscription_started_at: now.toISOString(),
    activated_at: now.toISOString(),
    last_payment_id: payment.id,
    last_payment_at: now.toISOString(),

    show_store: true,
    show_booking: true,

    created_by_ai: true,
    updated_at: now.toISOString(),
  };

  const { data: profile, error: profileError } = await supabase
    .from("profiles_pages")
    .upsert(profilePayload, { onConflict: "user_id" })
    .select("*")
    .single();

  if (profileError || !profile) {
    console.error("❌ erro ao criar vitrine pós-pagamento:", profileError);
    return null;
  }

  await supabase
    .from("profile_pending_signups")
    .update({
      status: "completed",
      created_profile_id: profile.id,
      updated_at: now.toISOString(),
    })
    .eq("id", pending.id);

  await supabase
    .from("pagamentos_plataforma")
    .update({
      usuario_id: user.id,
      metadata: {
        ...(payment.metadata || {}),
        profile_page_id: profile.id,
        profile_slug: profile.slug,
        usuario_id: user.id,
      },
    })
    .eq("id", payment.id);

  console.log("✅ vitrine criada após pagamento:", {
    profile_id: profile.id,
    slug: profile.slug,
    planCode,
  });

  return profile;
}*/
async function createAffiliateCommissionFromPayment(payment, profile = null) {
  if (!payment?.id) return null;

  const md = payment.metadata || {};
  const affiliateCode = String(
    md.affiliate_code || md.affiliate_ref || ""
  ).trim();

  if (!affiliateCode) return null;

  const { data: staffMember, error: staffError } = await supabase
    .from("profile_staff")
    .select("*")
    .eq("affiliate_code", affiliateCode)
    .maybeSingle();

  if (staffError || !staffMember) {
    console.error("❌ funcionário afiliado não encontrado:", {
      affiliateCode,
      staffError,
    });
    return null;
  }

  const saleAmount = Number(payment.valor || 0);
  const commissionType = staffMember.commission_type || "none";
  const commissionValue = Number(staffMember.commission_value || 0);

  let commissionAmount = 0;

  if (commissionType === "percent") {
    commissionAmount = (saleAmount * commissionValue) / 100;
  }

  if (commissionType === "fixed") {
    commissionAmount = commissionValue;
  }

  commissionAmount = Number(commissionAmount.toFixed(2));

  if (!saleAmount || saleAmount <= 0 || commissionAmount <= 0) {
    console.log("ℹ️ comissão ignorada:", {
      affiliateCode,
      saleAmount,
      commissionType,
      commissionValue,
      commissionAmount,
    });
    return null;
  }

  const { data, error } = await supabase
    .from("affiliate_commissions")
    .upsert(
      {
        affiliate_code: affiliateCode,
        affiliate_user_id: null,

        payment_id: payment.id,
        profile_page_id: profile?.id || md.profile_page_id || null,

        buyer_user_id: payment.usuario_id || md.usuario_id || null,

        plan_code: md.plan_code || payment.plano_codigo || "store_start",

        sale_amount: saleAmount,
        commission_percent:
          commissionType === "percent" ? commissionValue : 0,
        commission_amount: commissionAmount,

        status: "pending",

        metadata: {
          source: "profile_plan_sale",
          staff_id: staffMember.id,
          commission_type: commissionType,
          commission_value: commissionValue,
          profile_slug: profile?.slug || md.profile_slug || null,
        },
      },
      {
        onConflict: "payment_id",
      }
    )
    .select()
    .single();

  if (error) {
    console.error("❌ erro ao criar comissão de afiliado:", error);
    return null;
  }

  const novoValor =
    Number(staffMember.pending_commission_amount || 0) + commissionAmount;

  const { error: updateStaffError } = await supabase
    .from("profile_staff")
    .update({
      pending_commission_amount: Number(novoValor.toFixed(2)),
      updated_at: new Date().toISOString(),
    })
    .eq("id", staffMember.id);

  if (updateStaffError) {
    console.error("❌ comissão criada, mas não somou no funcionário:", updateStaffError);
    return data;
  }

  console.log("💰 comissão somada no funcionário:", {
    affiliateCode,
    staffId: staffMember.id,
    saleAmount,
    commissionType,
    commissionValue,
    commissionAmount,
    novoValor,
  });

  return data;
}
export async function processApprovedMercadoPagoPayment(mpPaymentId) {
  const mpPayment = await getMercadoPagoPayment(mpPaymentId);

  if (!mpPayment) return null;

  if (mpPayment.status !== "approved") {
    console.log("⏳ pagamento ainda não aprovado no Mercado Pago:", {
      id: mpPayment.id,
      status: mpPayment.status,
      status_detail: mpPayment.status_detail,
    });
    return null;
  }

  const internalPaymentId =
    mpPayment.external_reference ||
    mpPayment.metadata?.plataforma_payment_id ||
    null;

  if (!internalPaymentId) {
    console.error("❌ pagamento Mercado Pago sem external_reference interno.");
    return null;
  }

  const internalPayment = await getPendingPaymentById(internalPaymentId);
  if (!internalPayment) return null;

  // Se já está pago internamente, não reaplica efeitos
  if (internalPayment.status === "pago") {
  console.log("🔁 pagamento já marcado como pago, garantindo efeitos...");
//const existingProfile = await createProfileFromPendingSignupPayment(internalPayment);
await createAffiliateCommissionFromPayment(internalPayment, existingProfile);
  await activateProfilePageFromPayment(internalPayment);
  await activateProfilePlanFromPayment(internalPayment);

await activateSubscriptionFromPayment(internalPayment);
await activateAlertPlanFromPayment(internalPayment);
await activateCompanyJobCreditsFromPayment(internalPayment);
  await publishJobFromPayment(internalPayment);
  await publishProfessionalServiceFromPayment(internalPayment);
  await applyProfessionalHighlightFromPayment(internalPayment);

  return internalPayment;
}

  const paid = await markPaymentAsPaid(internalPayment.id, {
    mp_payment_id: String(mpPayment.id),
    metadata: {
      ...(internalPayment.metadata || {}),
      mercado_pago_status: mpPayment.status,
      mercado_pago_status_detail: mpPayment.status_detail || null,
    },
  });

  if (!paid) return null;
const existingProfile = null;
const createdProfile = null;
await createAffiliateCommissionFromPayment(paid, createdProfile);
  await activateSubscriptionFromPayment(paid);
await activateAlertPlanFromPayment(paid);
await activateProfilePlanFromPayment(paid);
await activateCompanyJobCreditsFromPayment(paid);


  if (paid.referencia_tipo === "usuario_vagas_avulso_24h") {
  const unlockAte = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  await supabase
    .from("usuarios")
    .update({ vagas_unlock_ate: unlockAte })
    .eq("id", paid.usuario_id);
}
  if (paid.referencia_tipo === "missao_publicacao") {
  const md = paid.metadata || {};

  const valorBloqueado = Number(paid.valor || 0);

const carteira = await ensureCarteira(paid.usuario_id);

await supabase
  .from("carteiras")
  .update({
    saldo_pendente: Number(carteira.saldo_pendente || 0) + valorBloqueado,
  })
  .eq("usuario_id", paid.usuario_id);

await publishMissionFromPayment(paid);

console.log("💰 valor bloqueado para missão:", valorBloqueado);
  }
  await publishJobFromPayment(paid);
await publishProfessionalServiceFromPayment(paid);
await applyProfessionalHighlightFromPayment(paid);
await activateProfilePageFromPayment(paid);
await activateProfilePlanFromPayment(paid);

return paid;
}