export async function getPlanoByCodigo(supabase, codigo) {
  const { data, error } = await supabase
    .from("planos_precos")
    .select("*")
    .eq("codigo", codigo)
    .eq("ativo", true)
    .maybeSingle();

  if (error) {
    console.error("❌ erro ao buscar plano:", {
      codigo,
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    return null;
  }

  console.log("📦 plano encontrado:", codigo, data);
  return data || null;
}

export async function hasActiveSubscription(supabase, usuarioId, tipos = []) {
  if (!usuarioId || !tipos.length) return false;

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("assinaturas_usuario")
    .select("*")
    .eq("usuario_id", usuarioId)
    .eq("status", "ativa")
    .gt("fim_em", now);

  if (error) {
    console.error("❌ erro ao verificar assinatura:", error);
    return false;
  }

  return (data || []).some((row) => tipos.includes(row.tipo));
}

export async function createPendingPayment(
  supabase,
  {
    usuarioId,
    referenciaTipo,
    referenciaId = null,
    planoCodigo = null,
    valor,
    metadata = {},
  }
) {
  const payload = {
    usuario_id: usuarioId,
    referencia_tipo: referenciaTipo,
    referencia_id: referenciaId,
    plano_codigo: planoCodigo,
    valor,
    status: "pendente",
    metadata,
  };

  console.log(
    "📦 createPendingPayment payload:",
    JSON.stringify(payload, null, 2)
  );

  const { data, error } = await supabase
    .from("pagamentos_plataforma")
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error("❌ erro ao criar pagamento pendente:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    return null;
  }

  return data;
}

function isPaymentApproved(status = "") {
  const s = String(status || "").toLowerCase();
  return s === "pago" || s === "approved" || s === "aprovado";
}

function getExpirationDaysByReferenceType(referenciaTipo = "") {
  const tipo = String(referenciaTipo || "");

  if (tipo === "usuario_vagas_avulso") return 1;
  if (tipo === "usuario_missoes_avulso") return 1;

  if (tipo === "usuario_vagas_semanal") return 7;

  if (
    tipo === "usuario_alerta_mensal" ||
    tipo === "usuario_missoes_mensal" ||
    tipo === "usuario_vagas_missoes_mensal" ||
    tipo === "usuario_total_mensal"
  ) {
    return 30;
  }

  return 0;
}

function isPaymentStillValid(pagamento) {
  if (!pagamento?.created_at) return false;

  const validadeDias = getExpirationDaysByReferenceType(
    pagamento.referencia_tipo
  );

  if (!validadeDias) return false;

  const createdAt = new Date(pagamento.created_at);
  const expiraEm = new Date(createdAt);
  expiraEm.setDate(expiraEm.getDate() + validadeDias);

  return new Date() <= expiraEm;
}

async function hasApprovedPlatformPayment(
  supabase,
  userId,
  referenciaTipos = []
) {
  if (!userId || !referenciaTipos.length) return false;

  const { data, error } = await supabase
    .from("pagamentos_plataforma")
    .select("*")
    .eq("usuario_id", userId)
    .in("referencia_tipo", referenciaTipos)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("❌ erro ao verificar pagamentos da plataforma:", error);
    return false;
  }

  if (!data?.length) return false;

  for (const pagamento of data) {
    if (!isPaymentApproved(pagamento.status)) continue;
    if (isPaymentStillValid(pagamento)) return true;
  }

  return false;
}

/**
 * Trabalhador:
 * acesso para VAGAS.
 */
export async function hasPaidAccessForJobs(supabase, userId) {
  if (!userId) return false;

  const assinaturaAtiva = await hasActiveSubscription(supabase, userId, [
    "usuario_vagas_semanal",
    "usuario_alerta_mensal",
    "usuario_vagas_missoes_mensal",
    "usuario_total_mensal",
  ]);

  if (assinaturaAtiva) {
    return true;
  }

  return hasApprovedPlatformPayment(supabase, userId, [
    "usuario_vagas_avulso",
    "usuario_vagas_semanal",
    "usuario_alerta_mensal",
    "usuario_vagas_missoes_mensal",
    "usuario_total_mensal",
  ]);
}

/**
 * Trabalhador:
 * acesso para MISSÕES.
 */
export async function hasPaidAccessForMissions(supabase, userId) {
  if (!userId) return false;

  const assinaturaAtiva = await hasActiveSubscription(supabase, userId, [
    "usuario_missoes_mensal",
    "usuario_vagas_missoes_mensal",
    "usuario_total_mensal",
  ]);

  if (assinaturaAtiva) {
    return true;
  }

  return hasApprovedPlatformPayment(supabase, userId, [
    "usuario_missoes_avulso",
    "usuario_missoes_mensal",
    "usuario_vagas_missoes_mensal",
    "usuario_total_mensal",
  ]);
}

/**
 * Busca de profissionais:
 * no modelo novo NÃO tem assinatura semanal/mensal.
 * É desbloqueio avulso por busca.
 */
export async function hasPaidAccessForProfessionals() {
  return false;
}

/**
 * Preview simples legado.
 */
export function buildJobsPreview(vagas = [], locked = true) {
  if (!vagas.length) {
    return "Sem vagas no momento para seu perfil.";
  }

  const lista = locked ? vagas.slice(0, 3) : vagas;

  let out = locked
    ? "🔎 Encontramos vagas para seu perfil:\n"
    : "💼 Vagas disponíveis:\n";

  lista.forEach((vaga) => {
    out += `\n• ${vaga.titulo || "Vaga"} (${vaga.cidade || "Sem cidade"})`;
  });

  if (locked) {
    const restante = Math.max(0, vagas.length - lista.length);

    if (restante > 0) {
      out += `\n\n📌 E ainda existem mais ${restante} oportunidade(s) nessa busca.`;
    }

    out +=
      "\n\n🔒 Para ver a lista completa e os detalhes, escolha uma opção abaixo:";
  }

  return out;
}

export function calcMissaoTaxa(valor) {
  const v = Number(valor || 0);
  return Number((v * 0.1).toFixed(2));
}

export function calcMissaoTotal(valor, urgencia = false) {
  const base = Number(valor || 0);
  const taxa = calcMissaoTaxa(base);
  const extraUrgencia = urgencia ? 4.9 : 0;

  return {
    valorMissao: base,
    taxa,
    urgencia: extraUrgencia,
    total: Number((base + taxa + extraUrgencia).toFixed(2)),
  };
}