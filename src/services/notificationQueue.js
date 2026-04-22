import { supabase } from "../supabase.js";
import { sendText } from "./whatsapp.js";

/**
 * 📩 Monta mensagem de vaga
 */
function buildJobMessage(payload) {
  return (
    `📢 *Nova vaga para você!*\n\n` +
    `🏢 ${payload.nome_empresa || "Empresa"}\n` +
    `💼 ${payload.titulo || "Vaga"}\n` +
    `📍 ${payload.cidade || "-"}${payload.estado ? `/${payload.estado}` : ""}\n` +
    `💰 ${payload.salario || "A combinar"}\n\n` +
    `👉 Entre no menu e veja mais detalhes.`
  );
}

/**
 * 📩 Monta mensagem de missão
 */
function buildMissionMessage(payload) {
  return (
    `🔥 *Nova missão disponível!*\n\n` +
    `📌 ${payload.titulo}\n` +
    `📝 ${payload.descricao}\n` +
    `💰 R$ ${payload.valor}\n` +
    `📍 ${payload.cidade || "-"}${payload.estado ? `/${payload.estado}` : ""}\n\n` +
    `👉 Entre no menu para visualizar.`
  );
}

/**
 * 🚀 PROCESSA FILA DE NOTIFICAÇÕES
 */
export async function processNotificationQueue(limit = 20) {
  console.log("🟡 [QUEUE] Iniciando processamento...");

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
    console.log("📦 processando item:", item.id);

    try {
      let message = "";

      if (item.tipo === "vaga") {
        message = buildJobMessage(item.payload || {});
      }

      if (item.tipo === "missao") {
        message = buildMissionMessage(item.payload || {});
      }

      if (!message) {
        console.log("⚠️ tipo desconhecido:", item.tipo);
        continue;
      }

      // 🚀 ENVIO WHATSAPP
      await sendText(item.telefone, message);

      console.log("✅ enviado para:", item.telefone);

      // ✅ MARCAR COMO ENVIADO
      await supabase
        .from("fila_notificacoes")
        .update({
          status: "enviado",
          enviado_em: new Date().toISOString(),
        })
        .eq("id", item.id);

    } catch (err) {
      console.error("❌ erro ao enviar notificação:", err);

      // ❌ MARCAR ERRO
      await supabase
        .from("fila_notificacoes")
        .update({
          status: "erro",
          erro: err.message,
          tentativas: (item.tentativas || 0) + 1,
        })
        .eq("id", item.id);
    }
  }

  console.log("🟢 [QUEUE] processamento finalizado");
}