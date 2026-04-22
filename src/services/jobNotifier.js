import { supabase } from "../supabase.js";
import { sendText } from "./whatsapp.js";

function normalizeArray(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  return [];
}

function buildJobNotificationMessage(vaga) {
  return (
    `📢 *Nova vaga para você!*\n\n` +
    `🏢 *Empresa:* ${vaga.nome_empresa || "Empresa não informada"}\n` +
    `💼 *Vaga:* ${vaga.titulo || "-"}\n` +
    `📍 *Local:* ${vaga.cidade || "-"}${vaga.estado ? `/${vaga.estado}` : ""}\n` +
    `💰 *Salário:* ${vaga.salario || "A combinar"}\n` +
    `📌 *Contratação:* ${vaga.tipo_contratacao || "A combinar"}\n\n` +
    `Entre no menu para ver mais detalhes.`
  );
}

function userMatchesJob(user, vaga) {
  if (!user || !vaga) return false;

  if (!user.telefone) return false;
  if (user.ativo === false) return false;
  if (vaga.status !== "ativa") return false;

  const userCidade = String(user.cidade || "").trim().toLowerCase();
  const vagaCidade = String(vaga.cidade || "").trim().toLowerCase();
  const userEstado = String(user.estado || "").trim().toUpperCase();
  const vagaEstado = String(vaga.estado || "").trim().toUpperCase();

  if (userCidade && vagaCidade && userCidade !== vagaCidade) return false;
  if (userEstado && vagaEstado && userEstado !== vagaEstado) return false;

  const categoriaPrincipal = user.categoria_principal || null;
  const scope = user.notificacao_scope || "categoria_atual";
  const categoriasExtras = normalizeArray(user.categorias_extras);

  if (scope === "todas") {
    return true;
  }

  if (scope === "mais_2") {
    const categoriasPermitidas = new Set(
      [categoriaPrincipal, ...categoriasExtras].filter(Boolean)
    );
    return categoriasPermitidas.has(vaga.categoria_chave);
  }

  return categoriaPrincipal === vaga.categoria_chave;
}

async function alreadyNotified(vagaId, usuarioId) {
  const { data, error } = await supabase
    .from("vagas_notificadas")
    .select("id")
    .eq("vaga_id", vagaId)
    .eq("usuario_id", usuarioId)
    .maybeSingle();

  if (error) {
    console.error("❌ erro ao verificar vaga já notificada:", error);
    return true;
  }

  return !!data;
}

async function registerNotification(vagaId, usuario) {
  const { error } = await supabase
    .from("vagas_notificadas")
    .insert({
      vaga_id: vagaId,
      usuario_id: usuario.id,
      telefone: usuario.telefone || null,
    });

  if (error) {
    console.error("❌ erro ao registrar notificação de vaga:", error);
    return false;
  }

  return true;
}

export async function notifyUsersAboutNewJob(vaga) {
  if (!vaga?.id) return { sent: 0, eligible: 0 };

  if (vaga.status !== "ativa") {
    return { sent: 0, eligible: 0 };
  }

  const now = new Date().toISOString();

  const { data: assinaturas, error } = await supabase
    .from("assinaturas_usuario")
    .select(`
      id,
      usuario_id,
      tipo,
      status,
      inicio_em,
      fim_em,
      notificacao_scope,
      categorias_extras,
      usuarios (
        id,
        nome,
        telefone,
        cidade,
        estado,
        categoria_principal,
        ativo
      )
    `)
    .eq("status", "ativa")
    .gt("fim_em", now)
    .in("tipo", ["usuario_vagas_semanal", "usuario_alerta_mensal"]);

  if (error) {
    console.error("❌ erro ao buscar assinaturas para notificação:", error);
    return { sent: 0, eligible: 0 };
  }

  const candidates = (assinaturas || [])
    .map((row) => ({
      assinatura_id: row.id,
      usuario_id: row.usuario_id,
      tipo: row.tipo,
      notificacao_scope: row.notificacao_scope,
      categorias_extras: row.categorias_extras,
      ...(row.usuarios || {}),
    }))
    .filter((user) => userMatchesJob(user, vaga));

  let sent = 0;

  for (const user of candidates) {
    const notified = await alreadyNotified(vaga.id, user.id);
    if (notified) continue;

    const ok = await registerNotification(vaga.id, user);
    if (!ok) continue;

    try {
      await sendText(user.telefone, buildJobNotificationMessage(vaga));
      sent += 1;
    } catch (err) {
      console.error("❌ erro ao enviar notificação de vaga:", {
        usuario_id: user.id,
        vaga_id: vaga.id,
        err,
      });
    }
  }

  return {
    sent,
    eligible: candidates.length,
  };
}