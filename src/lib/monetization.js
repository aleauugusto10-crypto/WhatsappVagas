export async function getPlanoByCodigo(supabase, codigo) {
  const { data, error } = await supabase
    .from("planos_precos")
    .select("*")
    .eq("codigo", codigo)
    .eq("ativo", true)
    .maybeSingle();

  if (error) {
    console.error("❌ erro ao buscar plano:", error);
    return null;
  }

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

  console.log("📦 createPendingPayment payload:", JSON.stringify(payload, null, 2));

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

export async function hasPaidAccessForJobs(supabase, usuarioId) {
  return hasActiveSubscription(supabase, usuarioId, [
    "usuario_vagas_semanal",
    "usuario_alerta_mensal",
  ]);
}

export async function hasPaidAccessForProfessionals(supabase, usuarioId) {
  return hasActiveSubscription(supabase, usuarioId, [
    "empresa_busca_prof_semanal",
    "empresa_busca_prof_mensal",
    "contratante_busca_prof_semanal",
    "contratante_busca_prof_mensal",
  ]);
}

export function buildJobsPreview(vagas = [], locked = true) {
  if (!vagas.length) {
    return "Sem vagas no momento para seu perfil.";
  }

  let out = locked
    ? "🔎 Encontramos vagas para seu perfil:\n"
    : "💼 Vagas disponíveis:\n";

  vagas.forEach((vaga) => {
    out += `\n• ${vaga.titulo} (${vaga.cidade || "Sem cidade"})`;
  });

  if (locked) {
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