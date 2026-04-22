import { sendList, sendText } from "../services/whatsapp.js";
import { sendMenuEmpresa, sendActionButtons } from "./menus.js";
import {
  createPendingPayment,
  getPlanoByCodigo,
} from "../lib/monetization.js";
import { createMercadoPagoPixIntent } from "../services/payments.js";

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

function limparTempVagaPayload() {
  return {
    vaga_titulo_temp: null,
    vaga_descricao_temp: null,
    vaga_requisitos_temp: null,
    vaga_tipo_contratacao_temp: null,
    vaga_salario_temp: null,
    vaga_jornada_temp: null,
    vaga_quantidade_temp: null,
    vaga_destaque_temp: false,
  };
}

function formatTipoContratacao(tipo = "") {
  const map = {
    clt: "CLT",
    diaria: "Diária",
    freelance: "Freelance",
    mei: "MEI",
    meio_periodo: "Meio período",
    comissao: "Comissão",
    a_combinar: "A combinar",
  };

  return map[tipo] || tipo || "-";
}

function formatCategoria(chave = "") {
  const map = {
    auxiliar_limpeza: "Auxiliar de Limpeza",
    auxiliar_administrativo: "Auxiliar Administrativo",
    recepcionista: "Recepcionista",
    atendente: "Atendente",
    caixa: "Caixa",
    vendedor: "Vendedor",
    cozinheira: "Cozinheira",
    garcom: "Garçom",
    motoboy: "Motoboy",
    motorista: "Motorista",
  };

  return map[chave] || chave || "-";
}

function resumoVaga(user) {
  const qtd = Number(user.vaga_quantidade_temp || 1);

  return (
    `📋 *Resumo da vaga*\n\n` +
    `🏢 *Empresa:* ${user.nome_empresa || "Não informada"}\n` +
    `💼 *Função:* ${formatCategoria(user.categoria_principal)}\n` +
    `📝 *Título:* ${user.vaga_titulo_temp || "-"}\n` +
    `📄 *Descrição:* ${user.vaga_descricao_temp || "-"}\n` +
    `✅ *Requisitos:* ${user.vaga_requisitos_temp || "-"}\n` +
    `📌 *Tipo de contratação:* ${formatTipoContratacao(user.vaga_tipo_contratacao_temp)}\n` +
    `💰 *Salário:* ${user.vaga_salario_temp || "-"}\n` +
    `🕒 *Jornada:* ${user.vaga_jornada_temp || "-"}\n` +
    `👥 *Quantidade de posições:* ${qtd}\n` +
    `⭐ *Destaque:* ${user.vaga_destaque_temp ? "Sim" : "Não"}`
  );
}

function buildPixResumo(intent, plano, total, destaqueValor) {
  const checkoutUrl = intent?.checkout_url || null;

  let out =
    `💳 *Pagamento da vaga gerado com sucesso*\n\n` +
    `📢 *Anúncio:* ${plano.nome}\n` +
    `💵 *Valor base:* R$ ${Number(plano.valor).toFixed(2)}\n` +
    `⭐ *Destaque:* R$ ${Number(destaqueValor || 0).toFixed(2)}\n` +
    `🧾 *Total:* R$ ${Number(total || 0).toFixed(2)}`;

  if (checkoutUrl) {
    out += `\n\n🔗 *Link de pagamento:*\n${checkoutUrl}`;
  }

  out += `\n\n📌 *PIX copia e cola:*`;

  return out;
}

function buildPixCodeOnly(intent) {
  return intent?.qr_code || "Código Pix indisponível no momento.";
}

async function criarCobrancaPublicacaoVaga({ supabase, user }) {
  const plano = await getPlanoByCodigo(supabase, "empresa_1_vaga");

  if (!plano) {
    console.error("❌ plano empresa_1_vaga não encontrado");
    return { plano: null, payment: null, total: null, destaqueValor: 0 };
  }

  let total = Number(plano.valor);
  let destaqueValor = 0;

  if (user.vaga_destaque_temp) {
    const destaquePlano = await getPlanoByCodigo(supabase, "empresa_destaque_vaga");

    if (!destaquePlano) {
      console.error("❌ plano empresa_destaque_vaga não encontrado");
    } else {
      destaqueValor = Number(destaquePlano.valor);
      total += destaqueValor;
    }
  }

  const payload = {
    usuarioId: user.id,
    referenciaTipo: "empresa_publicar_vaga",
    planoCodigo: plano.codigo,
    valor: Number(total.toFixed(2)),
    metadata: {
      empresa_id: user.id,
      nome_empresa: user.nome_empresa || null,
      contato_whatsapp: user.telefone,
      categoria_chave: user.categoria_principal,
      titulo: user.vaga_titulo_temp,
      descricao: user.vaga_descricao_temp,
      requisitos: user.vaga_requisitos_temp,
      tipo_contratacao: user.vaga_tipo_contratacao_temp,
      salario: user.vaga_salario_temp,
      jornada: user.vaga_jornada_temp,
      quantidade_vagas: Number(user.vaga_quantidade_temp || 1),
      destaque: !!user.vaga_destaque_temp,
      cidade: user.cidade,
      estado: user.estado,
      pacote_codigo: plano.codigo,
      pacote_nome: plano.nome,
      pacote_valor: Number(plano.valor),
      destaque_valor: Number(destaqueValor.toFixed(2)),
    },
  };

  console.log("📦 payload cobrança vaga:", JSON.stringify(payload, null, 2));

  const payment = await createPendingPayment(supabase, payload);

  if (!payment) {
    console.error("❌ createPendingPayment retornou null para vaga");
  }

  return {
    plano,
    payment,
    total: Number(total.toFixed(2)),
    destaqueValor: Number(destaqueValor.toFixed(2)),
  };
}

export async function handleCompanyMenu({
  user,
  text,
  phone,
  supabase,
  updateUser,
  getCategorias,
  getCategoriasPorGrupo,
}) {
  if (text === "voltar_menu") {
    await updateUser({ etapa: "menu" });
    return sendMenuEmpresa(phone);
  }

  // =====================
  // BUSCAR PROFISSIONAIS
  // =====================

  if (text === "empresa_buscar_profissionais") {
    const areas = await getCategorias("geral");
    await updateUser({ etapa: "empresa_buscar_area" });

    return sendList(phone, "🧑‍🔧 Em qual área você quer buscar profissionais?", [
      {
        title: "Áreas",
        rows: areas
          .filter((a) => a.chave !== "profissional")
          .map((a) => ({
            id: `empresa_area_${a.chave}`,
            title: a.nome,
          })),
      },
    ]);
  }

  if (user.etapa === "empresa_buscar_area") {
    if (!text.startsWith("empresa_area_")) return false;

    const area = text.replace("empresa_area_", "");
    const grupo = gruposMap[area] || area;
    const categorias = await getCategoriasPorGrupo("servico", grupo);

    await updateUser({ etapa: "empresa_buscar_categoria" });

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
          id: `empresa_buscar_cat_${c.chave}`,
          title: c.nome,
        })),
      },
    ]);
  }

  if (user.etapa === "empresa_buscar_categoria") {
    if (!text.startsWith("empresa_buscar_cat_")) return false;

    const categoria = text.replace("empresa_buscar_cat_", "");

    const { data: servicos, error } = await supabase
      .from("servicos")
      .select("*")
      .eq("ativo", true)
      .eq("categoria_chave", categoria)
      .ilike("cidade", user.cidade || "")
      .limit(3);

    await updateUser({ etapa: "menu" });

    if (error) {
      console.error("❌ erro ao buscar profissionais para empresa:", error);
      await sendText(phone, "Erro ao buscar profissionais.");
      return sendActionButtons(phone, "O que deseja fazer agora?", [
        { id: "voltar_menu", title: "Voltar ao menu" },
      ]);
    }

    if (!servicos?.length) {
      await sendText(phone, "Nenhum profissional encontrado no momento.");
      return sendActionButtons(phone, "O que deseja fazer agora?", [
        { id: "voltar_menu", title: "Voltar ao menu" },
      ]);
    }

    let out = "🧑‍🔧 *Prévia de profissionais:*\n";
    for (const s of servicos) {
      out += `\n• ${s.titulo} - ${s.cidade || "Sem cidade"}`;
    }
    out += "\n\n🔒 Para desbloquear a busca completa, use o plano de busca.";

    await sendText(phone, out);
    return sendActionButtons(phone, "O que deseja fazer agora?", [
      { id: "voltar_menu", title: "Voltar ao menu" },
    ]);
  }

  // =====================
  // CRIAR VAGA
  // =====================

  if (text === "empresa_criar_vaga") {
    const areas = await getCategorias("geral");

    await updateUser({
      etapa: "empresa_vaga_area",
      ...limparTempVagaPayload(),
    });

    return sendList(phone, "🏢 Escolha a área da vaga:", [
      {
        title: "Áreas",
        rows: areas
          .filter((a) => a.chave !== "profissional")
          .map((a) => ({
            id: `vaga_area_${a.chave}`,
            title: a.nome,
          })),
      },
    ]);
  }

  if (user.etapa === "empresa_vaga_area") {
    if (!text.startsWith("vaga_area_")) return false;

    const area = text.replace("vaga_area_", "");
    const grupo = gruposMap[area] || area;
    const categorias = await getCategoriasPorGrupo("vaga", grupo);

    await updateUser({ etapa: "empresa_vaga_categoria" });

    if (!categorias.length) {
      await updateUser({ etapa: "menu" });
      await sendText(phone, "Não encontrei categorias de vaga nessa área.");
      return sendActionButtons(phone, "O que deseja fazer agora?", [
        { id: "voltar_menu", title: "Voltar ao menu" },
      ]);
    }

    return sendList(phone, "💼 Escolha a função da vaga:", [
      {
        title: "Funções",
        rows: categorias.map((c) => ({
          id: `vaga_cat_${c.chave}`,
          title: c.nome,
        })),
      },
    ]);
  }

  if (user.etapa === "empresa_vaga_categoria") {
    if (!text.startsWith("vaga_cat_")) return false;

    const categoria = text.replace("vaga_cat_", "");

    await updateUser({
      categoria_principal: categoria,
      etapa: "empresa_vaga_titulo",
    });

    return sendText(
      phone,
      "📝 Qual o título da vaga?\nEx: Vendedor interno, Auxiliar administrativo"
    );
  }

  if (user.etapa === "empresa_vaga_titulo") {
    if (!text || text.length < 3) {
      return sendText(phone, "Digite um título válido para a vaga:");
    }

    await updateUser({
      vaga_titulo_temp: text,
      etapa: "empresa_vaga_descricao",
    });

    return sendText(
      phone,
      "📄 Descreva a vaga em poucas palavras.\nEx: Atendimento ao cliente, organização da loja e fechamento de vendas."
    );
  }

  if (user.etapa === "empresa_vaga_descricao") {
    if (!text || text.length < 5) {
      return sendText(phone, "Descreva melhor a vaga:");
    }

    await updateUser({
      vaga_descricao_temp: text,
      etapa: "empresa_vaga_requisitos",
    });

    return sendText(
      phone,
      "✅ Quais os requisitos básicos?\nEx: ensino médio completo, boa comunicação, experiência com vendas."
    );
  }

  if (user.etapa === "empresa_vaga_requisitos") {
    if (!text || text.length < 5) {
      return sendText(phone, "Informe requisitos básicos válidos:");
    }

    await updateUser({
      vaga_requisitos_temp: text,
      etapa: "empresa_vaga_tipo_contratacao",
    });

    return sendList(phone, "📌 Escolha o tipo de contratação:", [
      {
        title: "Contratação",
        rows: [
          { id: "contratacao_clt", title: "CLT" },
          { id: "contratacao_diaria", title: "Diária" },
          { id: "contratacao_freelance", title: "Freelance" },
          { id: "contratacao_mei", title: "MEI" },
          { id: "contratacao_meio_periodo", title: "Meio período" },
          { id: "contratacao_comissao", title: "Comissão" },
          { id: "contratacao_a_combinar", title: "A combinar" },
        ],
      },
    ]);
  }

  if (user.etapa === "empresa_vaga_tipo_contratacao") {
    if (!text.startsWith("contratacao_")) return false;

    const tipoContratacao = text.replace("contratacao_", "");

    await updateUser({
      vaga_tipo_contratacao_temp: tipoContratacao,
      etapa: "empresa_vaga_salario",
    });

    return sendText(
      phone,
      "💰 Qual o salário ou faixa salarial?\nEx: 1600, 1800 + comissão, a combinar"
    );
  }

  if (user.etapa === "empresa_vaga_salario") {
    if (!text || text.length < 2) {
      return sendText(phone, "Digite um salário ou faixa válida:");
    }

    await updateUser({
      vaga_salario_temp: text,
      etapa: "empresa_vaga_jornada",
    });

    return sendText(
      phone,
      "🕒 Qual a jornada ou horário?\nEx: segunda a sábado, horário comercial"
    );
  }

  if (user.etapa === "empresa_vaga_jornada") {
    if (!text || text.length < 3) {
      return sendText(phone, "Digite uma jornada válida:");
    }

    await updateUser({
      vaga_jornada_temp: text,
      etapa: "empresa_vaga_quantidade",
    });

    return sendList(phone, "👥 Quantas posições essa vaga possui?", [
      {
        title: "Quantidade",
        rows: [
          { id: "vaga_qtd_1", title: "1 posição" },
          { id: "vaga_qtd_2", title: "2 posições" },
          { id: "vaga_qtd_3", title: "3 posições" },
          { id: "vaga_qtd_5", title: "5 posições" },
          { id: "vaga_qtd_10", title: "10 posições" },
        ],
      },
    ]);
  }

  if (user.etapa === "empresa_vaga_quantidade") {
    if (!text.startsWith("vaga_qtd_")) return false;

    const quantidade = Number(text.replace("vaga_qtd_", ""));
    if (!quantidade) {
      return sendText(phone, "Escolha a quantidade pela lista.");
    }

    await updateUser({
      vaga_quantidade_temp: String(quantidade),
      etapa: "empresa_vaga_destaque",
    });

    return sendActionButtons(
      phone,
      "⭐ Quer colocar esse anúncio em destaque por +R$ 4,90?",
      [
        { id: "vaga_destaque_sim", title: "Com destaque" },
        { id: "vaga_destaque_nao", title: "Sem destaque" },
        { id: "voltar_menu", title: "Voltar ao menu" },
      ]
    );
  }

  if (
    user.etapa === "empresa_vaga_destaque" &&
    ["vaga_destaque_sim", "vaga_destaque_nao"].includes(text)
  ) {
    const destaque = text === "vaga_destaque_sim";

    await updateUser({
      vaga_destaque_temp: destaque,
      etapa: "empresa_vaga_confirmar_cobranca",
    });

    const fakeUser = { ...user, vaga_destaque_temp: destaque };
    await sendText(phone, resumoVaga(fakeUser));

    const valorBase = 9.9;
    const valorDestaque = destaque ? 4.9 : 0;
    const total = valorBase + valorDestaque;

    return sendActionButtons(
      phone,
      `💳 *Publicação deste anúncio*\n\n📢 *Anúncio:* R$ ${valorBase.toFixed(
        2
      )}\n⭐ *Destaque:* R$ ${valorDestaque.toFixed(
        2
      )}\n🧾 *Total:* R$ ${total.toFixed(2)}\n\nDeseja gerar o pagamento agora?`,
      [
        { id: "vaga_confirmar_pagamento", title: "Gerar pagamento" },
        { id: "empresa_criar_vaga", title: "Refazer vaga" },
        { id: "voltar_menu", title: "Voltar ao menu" },
      ]
    );
  }

  if (text === "vaga_confirmar_pagamento") {
    const { plano, payment, total, destaqueValor } =
      await criarCobrancaPublicacaoVaga({
        supabase,
        user,
      });

    if (!plano) {
  console.error("❌ plano não encontrado para publicação da vaga");
  await sendText(phone, "Erro ao gerar cobrança: plano de publicação não encontrado.");
  return sendActionButtons(phone, "O que deseja fazer agora?", [
    { id: "empresa_criar_vaga", title: "Tentar novamente" },
    { id: "voltar_menu", title: "Voltar ao menu" },
  ]);
}

if (!payment) {
  console.error("❌ createPendingPayment retornou null para vaga");
  await sendText(phone, "Erro ao gerar cobrança da vaga. Verifique os logs do servidor.");
  return sendActionButtons(phone, "O que deseja fazer agora?", [
    { id: "empresa_criar_vaga", title: "Tentar novamente" },
    { id: "voltar_menu", title: "Voltar ao menu" },
  ]);
}

    let intent = null;
    try {
      intent = await createMercadoPagoPixIntent(payment.id);
    } catch (err) {
      console.error("❌ erro ao gerar Pix da vaga:", err);
    }

    await updateUser({
      etapa: "menu",
      ...limparTempVagaPayload(),
    });

    if (!intent) {
      await sendText(
        phone,
        `💳 *Pedido criado com sucesso!*\n\n` +
          `📢 *Anúncio:* ${plano.nome}\n` +
          `💵 *Valor base:* R$ ${Number(plano.valor).toFixed(2)}\n` +
          `⭐ *Destaque:* R$ ${Number(destaqueValor).toFixed(2)}\n` +
          `🧾 *Total:* R$ ${Number(total).toFixed(2)}\n` +
          `🆔 *Pedido:* ${payment.id}\n\n` +
          `Não consegui gerar o Pix automaticamente agora, mas o pedido foi criado.`
      );

      return sendActionButtons(phone, "O que deseja fazer agora?", [
        { id: "empresa_criar_vaga", title: "Criar outra vaga" },
        { id: "empresa_minhas_vagas", title: "Ver minhas vagas" },
        { id: "voltar_menu", title: "Voltar ao menu" },
      ]);
    }

    await sendText(phone, buildPixResumo(intent, plano, total, destaqueValor));
await sendText(phone, buildPixCodeOnly(intent));

    return sendActionButtons(phone, "Depois do pagamento:", [
      { id: "payment_check_status", title: "Já paguei" },
      { id: "empresa_minhas_vagas", title: "Ver minhas vagas" },
      { id: "voltar_menu", title: "Voltar ao menu" },
    ]);
  }

  // =====================
  // MINHAS VAGAS
  // =====================

  if (text === "empresa_minhas_vagas") {
    const { data: vagas, error } = await supabase
      .from("vagas")
      .select("*")
      .eq("empresa_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    await updateUser({ etapa: "menu" });

    if (error) {
      console.error("❌ erro ao listar vagas da empresa:", error);
      await sendText(phone, "Erro ao buscar suas vagas.");
      return sendActionButtons(phone, "O que deseja fazer agora?", [
        { id: "voltar_menu", title: "Voltar ao menu" },
      ]);
    }

    if (!vagas?.length) {
      await sendText(phone, "Você ainda não criou nenhuma vaga.");
      return sendActionButtons(phone, "O que deseja fazer agora?", [
        { id: "empresa_criar_vaga", title: "Criar vaga" },
        { id: "voltar_menu", title: "Voltar ao menu" },
      ]);
    }

    let out = "📋 *Suas vagas:*\n";
    for (const v of vagas) {
      out += `\n• ${v.titulo} - ${v.status}`;
    }

    await sendText(phone, out);
    return sendActionButtons(phone, "O que deseja fazer agora?", [
      { id: "empresa_remover_vaga", title: "Remover vaga" },
      { id: "voltar_menu", title: "Voltar ao menu" },
    ]);
  }

  if (text === "empresa_remover_vaga") {
    const { data: vagas, error } = await supabase
      .from("vagas")
      .select("id,titulo,status")
      .eq("empresa_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      console.error("❌ erro ao carregar vagas para remoção:", error);
      await sendText(phone, "Erro ao carregar vagas.");
      return sendActionButtons(phone, "O que deseja fazer agora?", [
        { id: "voltar_menu", title: "Voltar ao menu" },
      ]);
    }

    if (!vagas?.length) {
      await sendText(phone, "Você não tem vagas para remover.");
      return sendActionButtons(phone, "O que deseja fazer agora?", [
        { id: "voltar_menu", title: "Voltar ao menu" },
      ]);
    }

    await updateUser({ etapa: "empresa_remover_vaga_lista" });

    return sendList(phone, "Escolha a vaga que deseja remover:", [
      {
        title: "Suas vagas",
        rows: vagas.map((v) => ({
          id: `empresa_delete_vaga_${v.id}`,
          title: v.titulo.slice(0, 24),
          description: (v.status || "sem status").slice(0, 72),
        })),
      },
    ]);
  }

  if (user.etapa === "empresa_remover_vaga_lista") {
    if (!text.startsWith("empresa_delete_vaga_")) return false;

    const vagaId = text.replace("empresa_delete_vaga_", "");

    const { error } = await supabase
      .from("vagas")
      .delete()
      .eq("id", vagaId)
      .eq("empresa_id", user.id);

    await updateUser({ etapa: "menu" });

    if (error) {
      console.error("❌ erro ao remover vaga:", error);
      await sendText(phone, "Erro ao remover vaga.");
      return sendActionButtons(phone, "O que deseja fazer agora?", [
        { id: "empresa_minhas_vagas", title: "Ver minhas vagas" },
        { id: "voltar_menu", title: "Voltar ao menu" },
      ]);
    }

    await sendText(phone, "🗑️ Vaga removida com sucesso.");
    return sendActionButtons(phone, "O que deseja fazer agora?", [
      { id: "empresa_minhas_vagas", title: "Ver minhas vagas" },
      { id: "voltar_menu", title: "Voltar ao menu" },
    ]);
  }

  return false;
}

export async function handleCompanyFallback(phone) {
  return sendMenuEmpresa(phone);
}