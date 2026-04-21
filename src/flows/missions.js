import { sendText } from "../services/whatsapp.js";

function inferCategoria(text = "") {
  const t = String(text).toLowerCase();

  if (t.includes("limp") || t.includes("faxina") || t.includes("lavar")) return "limpeza";
  if (t.includes("frete") || t.includes("mudan") || t.includes("transport")) return "frete";
  if (t.includes("pet") || t.includes("cachorro") || t.includes("passear")) return "passeio_pet";
  if (t.includes("jard")) return "jardinagem";
  if (t.includes("mont")) return "montagem";
  if (t.includes("entrega")) return "entrega";

  return "outros";
}

export async function handleMissions({
  user,
  text,
  phone,
  supabase,
  updateUser,
}) {
  if (text === "contratar_criar_missao") {
    await updateUser({ etapa: "missao_titulo" });
    return sendText(phone, "Qual o título da missão?\nEx: Lavar garagem");
  }

  if (text === "user_ver_missoes") {
    const { data: missoes, error } = await supabase
      .from("missoes")
      .select("*")
      .eq("status", "aberta")
      .limit(5);

    if (error) {
      console.error("❌ erro ao buscar missões:", error);
      return sendText(phone, "Erro ao buscar missões.");
    }

    if (!missoes?.length) {
      return sendText(phone, "Sem missões no momento.");
    }

    let out = "🔥 Missões disponíveis:\n";
    for (const m of missoes) {
      out += `\n• ${m.titulo} - R$ ${Number(m.valor).toFixed(2)}`;
    }

    return sendText(phone, out);
  }

  if (user.etapa === "missao_titulo") {
    if (!text || text.length < 3) {
      return sendText(phone, "Digite um título válido para a missão:");
    }

    await updateUser({
      missao_titulo: text,
      etapa: "missao_desc",
    });

    return sendText(phone, "Agora descreva melhor o que precisa:");
  }

  if (user.etapa === "missao_desc") {
    if (!text || text.length < 5) {
      return sendText(phone, "Descreva melhor a missão:");
    }

    await updateUser({
      missao_desc: text,
      etapa: "missao_valor",
    });

    return sendText(phone, "Qual valor você quer pagar?\nEx: 50");
  }

  if (user.etapa === "missao_valor") {
    const valor = Number(String(text).replace(",", "."));

    if (!valor || valor <= 0) {
      return sendText(phone, "Digite um valor válido.\nEx: 50");
    }

    const categoria = inferCategoria(user.missao_desc || "");

    const { error } = await supabase.from("missoes").insert({
      usuario_id: user.id,
      titulo: user.missao_titulo,
      descricao: user.missao_desc,
      valor,
      categoria_chave: categoria,
      cidade: user.cidade,
      estado: user.estado,
      status: "aberta",
      pagamento_status: "pendente",
    });

    if (error) {
      console.error("❌ erro ao criar missão:", error);
      return sendText(phone, "Erro ao criar missão.");
    }

    await updateUser({
      etapa: "menu",
      missao_titulo: null,
      missao_desc: null,
    });

    return sendText(
      phone,
      `🚀 Missão criada com sucesso!\n\nTítulo: ${user.missao_titulo}\nValor: R$ ${valor.toFixed(2)}`
    );
  }

  return false;
}