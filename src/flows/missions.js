import { sendText } from "../services/whatsapp.js";
import { sendActionButtons } from "./menus.js";

function inferCategoria(text = "") {
  const t = String(text).toLowerCase();

  if (t.includes("limp") || t.includes("faxina") || t.includes("lavar") || t.includes("capin"))
    return "limpeza";
  if (t.includes("frete") || t.includes("mudan") || t.includes("transport"))
    return "frete";
  if (t.includes("pet") || t.includes("cachorro") || t.includes("passear"))
    return "passeio_pet";
  if (t.includes("jard"))
    return "jardinagem";
  if (t.includes("mont"))
    return "montagem";
  if (t.includes("entrega"))
    return "entrega";

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
    await updateUser({
      etapa: "missao_titulo",
      missao_titulo: null,
      missao_desc: null,
    });

    return sendText(phone, "Qual o título da missão?\nEx: Capinar jardim");
  }

  if (text === "user_ver_missoes") {
    const { data: missoes, error } = await supabase
      .from("missoes")
      .select("*")
      .eq("status", "aberta")
      .order("created_at", { ascending: false })
      .limit(5);

    if (error) {
      console.error("❌ erro ao buscar missões:", error);
      await sendText(phone, "Erro ao buscar missões.");
      return sendActionButtons(phone, "O que deseja fazer agora?", [
        { id: "voltar_menu", title: "Voltar ao menu" },
      ]);
    }

    if (!missoes?.length) {
      await sendText(phone, "Sem missões no momento.");
      return sendActionButtons(phone, "O que deseja fazer agora?", [
        { id: "voltar_menu", title: "Voltar ao menu" },
      ]);
    }

    let out = "🔥 Missões disponíveis:\n";
    for (const m of missoes) {
      out += `\n• ${m.titulo} - R$ ${Number(m.valor).toFixed(2)}`;
    }

    await sendText(phone, out);
    return sendActionButtons(phone, "O que deseja fazer agora?", [
      { id: "voltar_menu", title: "Voltar ao menu" },
    ]);
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

    return sendText(phone, "Qual valor você quer pagar?\nEx: 40");
  }

  if (user.etapa === "missao_valor") {
    const valor = Number(String(text).replace(",", "."));

    if (!valor || valor <= 0) {
      return sendText(phone, "Digite um valor válido.\nEx: 40");
    }

    const categoria = inferCategoria(user.missao_desc || user.missao_titulo || "");

    const payload = {
      usuario_id: user.id,
      titulo: user.missao_titulo,
      descricao: user.missao_desc,
      valor,
      categoria_chave: categoria,
      cidade: user.cidade,
      estado: user.estado,
      status: "aberta",
      pagamento_status: "pendente",
    };

    const { error } = await supabase.from("missoes").insert(payload);

    if (error) {
      console.error("❌ erro ao criar missão:", error);
      await sendText(phone, "Erro ao criar missão.");
      return sendActionButtons(phone, "O que deseja fazer agora?", [
        { id: "contratar_criar_missao", title: "Tentar novamente" },
        { id: "voltar_menu", title: "Voltar ao menu" },
      ]);
    }

    await updateUser({
      etapa: "menu",
      missao_titulo: null,
      missao_desc: null,
    });

    await sendText(
      phone,
      `🚀 Missão criada com sucesso!\n\nTítulo: ${payload.titulo}\nValor: R$ ${valor.toFixed(2)}`
    );

    return sendActionButtons(phone, "O que deseja fazer agora?", [
      { id: "contratar_criar_missao", title: "Criar outra missão" },
      { id: "voltar_menu", title: "Voltar ao menu" },
    ]);
  }

  return false;
}