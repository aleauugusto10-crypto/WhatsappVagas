import { sendList, sendText } from "../services/whatsapp.js";
import { sendMenuContratante, sendActionButtons } from "./menus.js";
import {
  buildJobsPreview,
  createPendingPayment,
  getPlanoByCodigo,
  hasPaidAccessForProfessionals,
} from "../lib/monetization.js";

const gruposMap = {
  construcao: "construcao",
  saude: "saude",
  logistica: "transporte",
  vendas: "comercio",
  administrativo: "administracao",
  servicos_gerais: "limpeza",
  tecnologia: "tecnologia",
  outros: "tarefas",
};

function buildProfessionalsPreview(servicos = [], locked = true) {
  if (!servicos.length) {
    return "Nenhum profissional encontrado no momento.";
  }

  let out = locked
    ? "🔎 Encontramos profissionais para sua busca:\n"
    : "🧑‍🔧 Profissionais encontrados:\n";

  servicos.forEach((s) => {
    out += `\n• ${s.titulo} - ${s.cidade || "Sem cidade"}`;
  });

  if (locked) {
    out += "\n\n🔒 Para ver a lista completa e os detalhes, escolha uma opção abaixo:";
  }

  return out;
}

export async function handleServicesMenu({
  user,
  text,
  phone,
  supabase,
  updateUser,
  getCategorias,
  getCategoriasPorGrupo,
}) {
  if (text === "contratar_buscar_profissionais") {
    const areas = await getCategorias("geral");

    await updateUser({ etapa: "contratar_area" });

    return sendList(phone, "Em qual área você quer buscar profissionais?", [
      {
        title: "Áreas",
        rows: areas
          .filter((a) => a.chave !== "profissional")
          .map((a) => ({
            id: `contratar_area_${a.chave}`,
            title: a.nome,
          })),
      },
    ]);
  }

  if (user.etapa === "contratar_area") {
    if (!text.startsWith("contratar_area_")) return false;

    const area = text.replace("contratar_area_", "");
    await updateUser({ area_principal: area, etapa: "contratar_categoria" });

    const grupo = gruposMap[area] || area;
    const categorias = await getCategoriasPorGrupo("servico", grupo);

    if (!categorias.length) {
      await updateUser({ etapa: "menu" });
      await sendText(phone, "Não encontrei categorias nessa área.");
      return sendActionButtons(phone, "O que deseja fazer agora?", [
        { id: "voltar_menu", title: "Voltar ao menu" },
      ]);
    }

    return sendList(phone, "Escolha a categoria do profissional:", [
      {
        title: "Categorias",
        rows: categorias.map((c) => ({
          id: `contratar_cat_${c.chave}`,
          title: c.nome,
        })),
      },
    ]);
  }

  if (user.etapa === "contratar_categoria") {
    if (!text.startsWith("contratar_cat_")) return false;

    const categoria = text.replace("contratar_cat_", "");
    const paidAccess = await hasPaidAccessForProfessionals(supabase, user.id);

    const { data: servicos, error } = await supabase
      .from("servicos")
      .select("*")
      .eq("ativo", true)
      .eq("categoria_chave", categoria)
      .ilike("cidade", user.cidade || "")
      .limit(paidAccess ? 10 : 3);

    await updateUser({ etapa: "menu" });

    if (error) {
      console.error("❌ erro ao buscar profissionais:", error);
      await sendText(phone, "Erro ao buscar profissionais.");
      return sendActionButtons(phone, "O que deseja fazer agora?", [
        { id: "voltar_menu", title: "Voltar ao menu" },
      ]);
    }

    if (!servicos?.length) {
      await sendText(phone, "Nenhum profissional encontrado nessa categoria no momento.");
      return sendActionButtons(phone, "O que deseja fazer agora?", [
        { id: "voltar_menu", title: "Voltar ao menu" },
      ]);
    }

    if (paidAccess) {
      await sendText(phone, buildProfessionalsPreview(servicos, false));
      return sendActionButtons(phone, "O que deseja fazer agora?", [
        { id: "contratar_buscar_profissionais", title: "Buscar novamente" },
        { id: "voltar_menu", title: "Voltar ao menu" },
      ]);
    }

    await sendText(phone, buildProfessionalsPreview(servicos, true));

    return sendActionButtons(phone, "Escolha como deseja desbloquear:", [
      { id: "prof_buy_single", title: "Pagar R$ 7,90" },
      { id: "prof_buy_week", title: "7 dias R$ 14,90" },
      { id: "prof_buy_month", title: "30 dias R$ 29,90" },
    ]);
  }

  if (text === "prof_buy_single") {
    const plano = await getPlanoByCodigo(supabase, "empresa_busca_prof_avulso");

    if (!plano) {
      await sendText(phone, "Plano indisponível no momento.");
      return sendActionButtons(phone, "O que deseja fazer agora?", [
        { id: "voltar_menu", title: "Voltar ao menu" },
      ]);
    }

    const payment = await createPendingPayment(supabase, {
      usuarioId: user.id,
      referenciaTipo: "contratante_busca_prof_avulso",
      planoCodigo: plano.codigo,
      valor: plano.valor,
      metadata: {
        telefone: user.telefone,
        cidade: user.cidade,
        estado: user.estado,
      },
    });

    if (!payment) {
      await sendText(phone, "Erro ao gerar cobrança.");
      return sendActionButtons(phone, "O que deseja fazer agora?", [
        { id: "contratar_buscar_profissionais", title: "Tentar novamente" },
        { id: "voltar_menu", title: "Voltar ao menu" },
      ]);
    }

    await sendText(
      phone,
      `💳 Cobrança criada com sucesso!\n\nAcesso: ${plano.nome}\nValor: R$ ${Number(plano.valor).toFixed(
        2
      )}\nPedido: ${payment.id}`
    );

    return sendActionButtons(phone, "O que deseja fazer agora?", [
      { id: "contratar_buscar_profissionais", title: "Buscar novamente" },
      { id: "voltar_menu", title: "Voltar ao menu" },
    ]);
  }

  if (text === "prof_buy_week") {
    const plano = await getPlanoByCodigo(supabase, "empresa_busca_prof_semanal");

    if (!plano) {
      await sendText(phone, "Plano indisponível no momento.");
      return sendActionButtons(phone, "O que deseja fazer agora?", [
        { id: "voltar_menu", title: "Voltar ao menu" },
      ]);
    }

    const payment = await createPendingPayment(supabase, {
      usuarioId: user.id,
      referenciaTipo: "contratante_busca_prof_semanal",
      planoCodigo: plano.codigo,
      valor: plano.valor,
      metadata: {
        telefone: user.telefone,
        cidade: user.cidade,
        estado: user.estado,
      },
    });

    if (!payment) {
      await sendText(phone, "Erro ao gerar cobrança.");
      return sendActionButtons(phone, "O que deseja fazer agora?", [
        { id: "contratar_buscar_profissionais", title: "Tentar novamente" },
        { id: "voltar_menu", title: "Voltar ao menu" },
      ]);
    }

    await sendText(
      phone,
      `💳 Cobrança criada com sucesso!\n\nPlano: ${plano.nome}\nValor: R$ ${Number(plano.valor).toFixed(
        2
      )}\nPedido: ${payment.id}`
    );

    return sendActionButtons(phone, "O que deseja fazer agora?", [
      { id: "contratar_buscar_profissionais", title: "Buscar novamente" },
      { id: "voltar_menu", title: "Voltar ao menu" },
    ]);
  }

  if (text === "prof_buy_month") {
    const plano = await getPlanoByCodigo(supabase, "empresa_busca_prof_mensal");

    if (!plano) {
      await sendText(phone, "Plano indisponível no momento.");
      return sendActionButtons(phone, "O que deseja fazer agora?", [
        { id: "voltar_menu", title: "Voltar ao menu" },
      ]);
    }

    const payment = await createPendingPayment(supabase, {
      usuarioId: user.id,
      referenciaTipo: "contratante_busca_prof_mensal",
      planoCodigo: plano.codigo,
      valor: plano.valor,
      metadata: {
        telefone: user.telefone,
        cidade: user.cidade,
        estado: user.estado,
      },
    });

    if (!payment) {
      await sendText(phone, "Erro ao gerar cobrança.");
      return sendActionButtons(phone, "O que deseja fazer agora?", [
        { id: "contratar_buscar_profissionais", title: "Tentar novamente" },
        { id: "voltar_menu", title: "Voltar ao menu" },
      ]);
    }

    await sendText(
      phone,
      `💳 Cobrança criada com sucesso!\n\nPlano: ${plano.nome}\nValor: R$ ${Number(plano.valor).toFixed(
        2
      )}\nPedido: ${payment.id}`
    );

    return sendActionButtons(phone, "O que deseja fazer agora?", [
      { id: "contratar_buscar_profissionais", title: "Buscar novamente" },
      { id: "voltar_menu", title: "Voltar ao menu" },
    ]);
  }

  return false;
}

export async function handleContratanteFallback(phone) {
  return sendMenuContratante(phone);
}