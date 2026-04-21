import { sendText } from "../services/whatsapp.js";
import { inferCategoryFromText } from "../lib/categories.js";

export async function handleMissions(user, text, phone, supabase, updateUser) {
  switch (user.etapa) {
    case "missao_titulo": {
      if (!text || text.length < 3) return sendText(phone, "Título da missão:");
      await updateUser({ missao_titulo: text, etapa: "missao_desc" });
      return sendText(phone, "Descreva melhor o que precisa:");
    }

    case "missao_desc": {
      if (!text || text.length < 5) return sendText(phone, "Descreva melhor:");
      const cat = inferCategoryFromText(text) || "outros";
      await updateUser({ missao_desc: text, missao_categoria: cat, etapa: "missao_valor" });
      return sendText(phone, "Qual valor você paga? (ex: 50)");
    }

    case "missao_valor": {
      const valor = Number(text.replace(",", "."));
      if (!valor || valor <= 0) return sendText(phone, "Digite um valor válido:");
      await updateUser({ missao_valor: valor, etapa: "missao_confirm" });
      return sendText(phone, `Confirmar missão?\n\n"${user.missao_titulo}"\n💰 R$ ${valor}\n\nResponda: confirmar`);
    }

    case "missao_confirm": {
      if (text !== "confirmar") return sendText(phone, "Digite 'confirmar' para publicar.");

      // cria missão
      const { error } = await supabase.from("missoes").insert({
        usuario_id: user.id,
        titulo: user.missao_titulo,
        descricao: user.missao_desc,
        categoria: user.missao_categoria,
        valor: user.missao_valor,
        cidade: user.cidade,
        status: "aberta",
      });

      if (error) {
        console.error(error);
        return sendText(phone, "Erro ao criar missão.");
      }

      await updateUser({ etapa: "menu" });
      return sendText(phone, "🚀 Missão publicada!");
    }
  }

  if (text === "contratar_criar_missao") {
    await updateUser({ etapa: "missao_titulo" });
    return sendText(phone, "Título da missão:\nEx: Lavar garagem");
  }

  if (text === "user_ver_missoes") {
    // MOCK v1
    return sendText(
      phone,
      "🔥 Missões disponíveis:\n\n• Lavar garagem - R$ 50\n• Frete pequeno - R$ 80\n• Passear com cachorro - R$ 30\n\n(Em breve com botão de aceitar + fila)"
    );
  }

  return false;
}