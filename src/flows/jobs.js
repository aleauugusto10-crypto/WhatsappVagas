import { sendText } from "../services/whatsapp.js";
import { sendMenuUsuario } from "./menus.js";

export async function handleJobsMenu({ user, text, phone, supabase }) {
  if (text === "user_redefinir_interesses") {
    return sendText(phone, "Envie 'menu' para refazer seu cadastro de interesses.");
  }

  if (text === "user_ver_vagas") {
    const query = supabase
      .from("vagas")
      .select("*")
      .eq("status", "aberta")
      .limit(5);

    if (user.categoria_principal) {
      query.eq("categoria_chave", user.categoria_principal);
    }

    if (user.cidade) {
      query.ilike("cidade", user.cidade);
    }

    if (user.estado) {
      query.eq("estado", user.estado);
    }

    const { data: vagas, error } = await query;

    if (error) {
      console.error("❌ erro ao buscar vagas:", error);
      return sendText(phone, "Erro ao buscar vagas.");
    }

    if (!vagas?.length) {
      return sendText(phone, "Sem vagas no momento para seu perfil.");
    }

    let out = "💼 Vagas encontradas:\n";
    for (const vaga of vagas) {
      out += `\n• ${vaga.titulo} (${vaga.cidade || "Sem cidade"})`;
    }

    out += "\n\n🔒 Para ver contato e detalhes completos: R$ 4,90";
    return sendText(phone, out);
  }

  return false;
}

export async function handleUserFallback(phone) {
  return sendMenuUsuario(phone);
}