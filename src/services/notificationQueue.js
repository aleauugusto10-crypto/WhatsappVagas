import { supabase } from "../supabase.js";
import { sendText } from "./whatsapp.js";
import { sendActionButtons } from "../flows/menus.js";

function buildVagaMensagem(item) {
  const p = item.payload || {};

  return (
    `📢 *Nova vaga para você!*\n\n` +
    `🏢 *Empresa:* ${p.nome_empresa || "Empresa não informada"}\n` +
    `💼 *Vaga:* ${p.titulo || "-"}\n` +
    `📍 *Local:* ${p.cidade || "-"}${p.estado ? `/${p.estado}` : ""}\n\n` +
    `Entre no menu para ver mais detalhes.`
  );
}

function buildMissaoMensagem(item) {
  const p = item.payload || {};

  return (
    `🛠️ *Nova missão disponível!*\n\n` +
    `📌 *Título:* ${p.titulo || "-"}\n` +
    `📝 *Descrição:* ${p.descricao || "-"}\n` +
    `💰 *Valor:* R$ ${Number(p.valor || 0).toFixed(2)}\n` +
    `📍 *Local:* ${p.cidade || "-"}${p.estado ? `/${p.estado}` : ""}\n\n` +
    `Entre no menu para ver mais detalhes.`
  );
}

async function marcarComoEnviado(id) {
  const { error } = await supabase
    .from("fila_notificacoes")
    .update({
      status: "enviado",
      enviado_em: new Date().toISOString(),
      erro: null,
    })
    .eq("id", id);

  if (error) {
    console.error("❌ erro ao marcar notificação como enviada:", error);
  }
}

async function marcarComoErro(id, tentativas = 0, erro = "erro desconhecido") {
  const { error } = await supabase
    .from("fila_notificacoes")
    .update({
      status: "erro",
      tentativas: Number(tentativas || 0) + 1,
      erro: String(erro).slice(0, 500),
    })
    .eq("id", id);

  if (error) {
    console.error("❌ erro ao marcar notificação como erro:", error);
  }
}

export async function processNotificationQueue(limit = 20) {
  const { data: fila, error } = await supabase
    .from("fila_notificacoes")
    .select("*")
    .eq("status", "pendente")
    .order("criado_em", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("❌ erro ao buscar fila_notificacoes:", error);
    return;
  }

  if (!fila?.length) {
    return;
  }

  for (const item of fila) {
    try {
      if (!item.telefone) {
        await marcarComoErro(item.id, item.tentativas, "telefone ausente");
        continue;
      }

      if (item.tipo === "vaga") {
        await sendText(item.telefone, buildVagaMensagem(item));
        await sendActionButtons(item.telefone, "O que deseja fazer agora?", [
          { id: "user_ver_vagas", title: "Ver vagas" },
          { id: "jobs_pacotes", title: "Pacotes" },
          { id: "voltar_menu", title: "Menu" },
        ]);
      } else if (item.tipo === "missao") {
        await sendText(item.telefone, buildMissaoMensagem(item));
        await sendActionButtons(item.telefone, "O que deseja fazer agora?", [
          { id: "user_ver_missoes", title: "Ver missões" },
          { id: "jobs_pacotes", title: "Pacotes" },
          { id: "voltar_menu", title: "Menu" },
        ]);
      } else {
        await marcarComoErro(
          item.id,
          item.tentativas,
          `tipo inválido: ${item.tipo}`
        );
        continue;
      }

      await marcarComoEnviado(item.id);
    } catch (err) {
      console.error("❌ erro ao processar fila_notificacoes:", {
        id: item.id,
        tipo: item.tipo,
        err,
      });

      await marcarComoErro(
        item.id,
        item.tentativas,
        err?.message || String(err)
      );
    }
  }
}