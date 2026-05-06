import { supabase } from "../supabase.js";
import { sendText } from "./whatsapp.js";

function buildJobMessage(payload) {
  return (
    `📢 *Nova vaga para você!*\n\n` +
    `🏢 ${payload.nome_empresa || "Empresa"}\n` +
    `💼 ${payload.titulo || "Vaga"}\n` +
    `📍 ${payload.cidade || "-"}${payload.estado ? `/${payload.estado}` : ""}\n` +
    `💰 ${payload.salario || "A combinar"}\n\n` +
    `👉 Digite *menu* para ver mais oportunidades.`
  );
}

function buildMissionMessage(payload) {
  return (
    `🔥 *Nova missão disponível!*\n\n` +
    `📌 ${payload.titulo || "Missão"}\n` +
    `📝 ${payload.descricao || "Veja os detalhes no RendaJá."}\n` +
    `💰 R$ ${payload.valor || payload.valor_por_pessoa || "A combinar"}\n` +
    `📍 ${payload.cidade || "-"}${payload.estado ? `/${payload.estado}` : ""}\n\n` +
    `👉 Digite *menu* para visualizar.`
  );
}

async function alreadyQueued({ assinaturaId, tipo, referenciaId }) {
  const { data, error } = await supabase
    .from("fila_notificacoes")
    .select("id")
    .eq("assinatura_id", assinaturaId)
    .eq("tipo", tipo)
    .eq("referencia_id", referenciaId)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("❌ erro ao verificar duplicidade:", error);
    return true;
  }

  return !!data;
}

async function enqueueForActiveSubscriptions() {
  const now = new Date().toISOString();

  const { data: assinaturas, error } = await supabase
    .from("alerta_planos_usuarios")
    .select("*")
    .eq("status", "ativo")
    .gt("expires_at", now);

  if (error) {
    console.error("❌ erro ao buscar assinaturas ativas:", error);
    return;
  }

  if (!assinaturas || assinaturas.length === 0) {
    return;
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: vagas, error: vagasError } = await supabase
    .from("vagas")
    .select("*")
    .eq("status", "ativa")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(20);

  if (vagasError) {
    console.error("❌ erro ao buscar vagas:", vagasError);
  }

  const { data: missoes, error: missoesError } = await supabase
    .from("missoes")
    .select("*")
    .eq("status", "aberta")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(20);

  if (missoesError) {
    console.error("❌ erro ao buscar missões:", missoesError);
  }

  for (const assinatura of assinaturas) {
    if (assinatura.receber_vagas === true && Array.isArray(vagas)) {
      for (const vaga of vagas) {
        const exists = await alreadyQueued({
          assinaturaId: assinatura.id,
          tipo: "vaga",
          referenciaId: vaga.id,
        });

        if (exists) continue;

        await supabase.from("fila_notificacoes").insert({
          assinatura_id: assinatura.id,
          referencia_id: vaga.id,
          tipo: "vaga",
          telefone: assinatura.telefone,
          payload: vaga,
          status: "pendente",
          criado_em: new Date().toISOString(),
          tentativas: 0,
        });
      }
    }

    if (assinatura.receber_missoes === true && Array.isArray(missoes)) {
      for (const missao of missoes) {
        const exists = await alreadyQueued({
          assinaturaId: assinatura.id,
          tipo: "missao",
          referenciaId: missao.id,
        });

        if (exists) continue;

        await supabase.from("fila_notificacoes").insert({
          assinatura_id: assinatura.id,
          referencia_id: missao.id,
          tipo: "missao",
          telefone: assinatura.telefone,
          payload: missao,
          status: "pendente",
          criado_em: new Date().toISOString(),
          tentativas: 0,
        });
      }
    }
  }
}

export async function processNotificationQueue(limit = 20) {
  console.log("🟡 [QUEUE] Iniciando processamento...");

  await enqueueForActiveSubscriptions();

  const { data: fila, error } = await supabase
    .from("fila_notificacoes")
    .select("*")
    .eq("status", "pendente")
    .order("criado_em", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("❌ erro ao buscar fila:", error);
    return;
  }

  console.log("🟡 [QUEUE] itens encontrados:", fila?.length || 0);

  if (!fila || fila.length === 0) {
    console.log("🟡 [QUEUE] nada para processar");
    return;
  }

  for (const item of fila) {
    try {
      let message = "";

      if (item.tipo === "vaga") {
        message = buildJobMessage(item.payload || {});
      }

      if (item.tipo === "missao") {
        message = buildMissionMessage(item.payload || {});
      }

      if (!message) {
        await supabase
          .from("fila_notificacoes")
          .update({
            status: "erro",
            erro: "Tipo desconhecido",
            tentativas: Number(item.tentativas || 0) + 1,
          })
          .eq("id", item.id);

        continue;
      }

      await sendText(item.telefone, message);

      await supabase
        .from("fila_notificacoes")
        .update({
          status: "enviado",
          enviado_em: new Date().toISOString(),
        })
        .eq("id", item.id);

      console.log("✅ notificação enviada:", item.telefone);
    } catch (err) {
      console.error("❌ erro ao enviar notificação:", err);

      await supabase
        .from("fila_notificacoes")
               .update({
          status: "erro",
          erro: err.message,
          tentativas: Number(item.tentativas || 0) + 1,
        })
        .eq("id", item.id);
    }
  }

  console.log("🟢 [QUEUE] processamento finalizado");
}