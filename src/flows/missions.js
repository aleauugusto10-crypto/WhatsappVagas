import { sendText } from "../services/whatsapp.js";
import { sendActionButtons } from "./menus.js";
import {
  calcMissaoTaxa,
  calcMissaoTotal,
  createPendingPayment,
} from "../lib/monetization.js";

function inferCategoria(text = "") {
  const t = String(text).toLowerCase();

  if (
    t.includes("limp") ||
    t.includes("faxina") ||
    t.includes("lavar") ||
    t.includes("capin")
  ) {
    return "limpeza";
  }

  if (t.includes("frete") || t.includes("mudan") || t.includes("transport")) {
    return "frete";
  }

  if (t.includes("pet") || t.includes("cachorro") || t.includes("passear")) {
    return "passeio_pet";
  }

  if (t.includes("jard")) {
    return "jardinagem";
  }

  if (t.includes("mont")) {
    return "montagem";
  }

  if (t.includes("entrega")) {
    return "entrega";
  }

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

    await updateUser({
      etapa: "missao_urgencia",
      missao_valor_temp: String(valor),
    });

    const taxa = calcMissaoTaxa(valor);

    return sendActionButtons(
      phone,
      `Resumo da missão:\n\nValor da missão: R$ ${valor.toFixed(
        2
      )}\nTaxa da plataforma (10%): R$ ${taxa.toFixed(
        2
      )}\n\nQuer adicionar urgência por +R$ 4,90?`,
      [
        { id: "missao_urgencia_sim", title: "Com urgência" },
        { id: "missao_urgencia_nao", title: "Sem urgência" },
        { id: "voltar_menu", title: "Voltar ao menu" },
      ]
    );
  }

  if (
    user.etapa === "missao_urgencia" &&
    ["missao_urgencia_sim", "missao_urgencia_nao"].includes(text)
  ) {
    const urgencia = text === "missao_urgencia_sim";
    const valorBase = Number(user.missao_valor_temp || 0);
    const resumo = calcMissaoTotal(valorBase, urgencia);
    const categoria = inferCategoria(user.missao_desc || user.missao_titulo || "");

    const payment = await createPendingPayment(supabase, {
      usuarioId: user.id,
      referenciaTipo: "missao_publicacao",
      planoCodigo: urgencia ? "missao_urgencia" : null,
      valor: resumo.total,
      metadata: {
        titulo: user.missao_titulo,
        descricao: user.missao_desc,
        valor_missao: resumo.valorMissao,
        taxa_plataforma: resumo.taxa,
        urgencia,
        categoria_chave: categoria,
        cidade: user.cidade,
        estado: user.estado,
      },
    });

    if (!payment) {
      await sendText(phone, "Erro ao gerar cobrança da missão.");
      return sendActionButtons(phone, "O que deseja fazer agora?", [
        { id: "contratar_criar_missao", title: "Tentar novamente" },
        { id: "voltar_menu", title: "Voltar ao menu" },
      ]);
    }

    await updateUser({
      etapa: "menu",
      missao_titulo: null,
      missao_desc: null,
      missao_valor_temp: null,
    });

    await sendText(
      phone,
      `💳 Pedido criado com sucesso!\n\nMissão: ${
        payment.metadata?.titulo || "Missão"
      }\nValor da missão: R$ ${resumo.valorMissao.toFixed(
        2
      )}\nTaxa da plataforma: R$ ${resumo.taxa.toFixed(2)}\nUrgência: R$ ${resumo.urgencia.toFixed(
        2
      )}\nTotal: R$ ${resumo.total.toFixed(2)}\nPedido: ${payment.id}\n\nDepois do pagamento aprovado, a missão pode ser publicada.`
    );

    return sendActionButtons(phone, "O que deseja fazer agora?", [
      { id: "contratar_criar_missao", title: "Criar outra missão" },
      { id: "voltar_menu", title: "Voltar ao menu" },
    ]);
  }

  return false;
}