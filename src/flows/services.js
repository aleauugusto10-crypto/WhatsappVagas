import { sendList, sendText } from "../services/whatsapp.js";
import { sendMenuContratante, sendActionButtons } from "./menus.js";
import {
  createPendingPayment,
  getPlanoByCodigo,
} from "../lib/monetization.js";
import { createMercadoPagoPixIntent } from "../services/payments.js";
import { getSubcategoriasByCategoria } from "../lib/subcategories.js";

const gruposMap = {
  construcao: "construcao",
  saude: "saude",
  logistica: "logistica",
  vendas: "vendas",
  administrativo: "administrativo",
  servicos_gerais: "servicos_gerais",
  tecnologia: "tecnologia",
  outros: "outros",
};

function buildPixResumo(intent, plano) {
  const checkoutUrl = intent?.checkout_url || null;

  let out =
    `💳 *Pagamento gerado com sucesso!*\n\n` +
    `📦 *Plano:* ${plano.nome}\n` +
    `💵 *Valor:* R$ ${Number(plano.valor).toFixed(2)}`;

  if (checkoutUrl) {
    out += `\n\n🔗 *Link de pagamento:*\n${checkoutUrl}`;
  }

  out += `\n\n📌 *PIX copia e cola:*`;

  return out;
}

function buildPixCodeOnly(intent) {
  return intent?.qr_code || "Código Pix indisponível no momento.";
}

function formatEspecialidades(especialidades = []) {
  if (!especialidades.length) return "Não informadas";
  return especialidades.join(" • ");
}

function buildProfessionalsPreview(servicos = [], locked = true) {
  if (!servicos.length) {
    return "Nenhum profissional encontrado no momento.";
  }

  let out = locked
    ? "🔎 *Encontramos profissionais para sua busca:*\n"
    : "🧑‍🔧 *Profissionais encontrados:*\n";

  servicos.forEach((s) => {
    out +=
      `\n\n• *${s.titulo || "Profissional"}*` +
      `\n📍 ${s.cidade || "Sem cidade"}${s.estado ? `/${s.estado}` : ""}` +
      `\n🧩 Especialidades: ${formatEspecialidades(s.especialidades || [])}` +
      `\n🎯 Compatibilidade: ${s.match_count || 0}`;
  });

  if (locked) {
    out +=
      "\n\n🔒 Para liberar a lista completa dessa busca e os detalhes, o desbloqueio é avulso.";
  }

  return out;
}

function buildProfessionalCard(servico) {
  return (
    `🧑‍🔧 *Profissional encontrado*\n\n` +
    `💼 *Serviço:* ${servico.titulo || "-"}\n` +
    `📍 *Cidade:* ${servico.cidade || "-"}${servico.estado ? `/${servico.estado}` : ""}\n` +
    `📝 *Descrição:* ${servico.descricao || "-"}\n` +
    `🧩 *Especialidades:* ${formatEspecialidades(servico.especialidades || [])}\n` +
    `🎯 *Compatibilidade:* ${servico.match_count || 0}`
  );
}

async function gerarPagamentoPixBuscaProfissional({
  supabase,
  phone,
  user,
  planoCodigo,
  referenciaTipo,
  afterSuccessLabel = "Acesso liberado após a aprovação do pagamento.",
}) {
  const plano = await getPlanoByCodigo(supabase, planoCodigo);

  if (!plano) {
    await sendText(phone, "Plano indisponível no momento.");
    return sendActionButtons(phone, "O que deseja fazer agora?", [
      { id: "contratar_buscar_profissionais", title: "Buscar novamente" },
      { id: "voltar_menu", title: "Voltar ao menu" },
    ]);
  }

  const payment = await createPendingPayment(supabase, {
    usuarioId: user.id,
    referenciaTipo,
    planoCodigo: plano.codigo,
    valor: plano.valor,
    metadata: {
      telefone: user.telefone,
      cidade: user.cidade,
      estado: user.estado,
      area_principal: user.area_principal,
      categoria_principal: user.categoria_principal,
      subcategorias_busca: user.subcategorias_temp || [],
      modo: "busca_profissional_avulsa",
    },
  });

  if (!payment) {
    await sendText(phone, "Erro ao gerar cobrança.");
    return sendActionButtons(phone, "O que deseja fazer agora?", [
      { id: "contratar_buscar_profissionais", title: "Buscar novamente" },
      { id: "voltar_menu", title: "Voltar ao menu" },
    ]);
  }

  let intent = null;
  try {
    intent = await createMercadoPagoPixIntent(payment.id);
  } catch (err) {
    console.error("❌ erro ao gerar Pix da busca de profissionais:", err);
  }

  if (!intent) {
    await sendText(
      phone,
      `💳 *Pedido criado com sucesso!*\n\n` +
        `📦 *Plano:* ${plano.nome}\n` +
        `💵 *Valor:* R$ ${Number(plano.valor).toFixed(2)}\n` +
        `🆔 *Pedido:* ${payment.id}\n\n` +
        `Não consegui gerar o Pix automaticamente agora, mas o pedido foi criado.`
    );

    await sendText(phone, afterSuccessLabel);

    return sendActionButtons(phone, "Depois do pagamento:", [
      { id: "payment_check_status", title: "Já paguei" },
      { id: "contratar_buscar_profissionais", title: "Buscar novamente" },
      { id: "voltar_menu", title: "Voltar ao menu" },
    ]);
  }

  await sendText(phone, buildPixResumo(intent, plano));
  await sendText(phone, buildPixCodeOnly(intent));
  await sendText(phone, afterSuccessLabel);

  return sendActionButtons(phone, "Depois do pagamento:", [
    { id: "payment_check_status", title: "Já paguei" },
    { id: "contratar_buscar_profissionais", title: "Buscar novamente" },
    { id: "voltar_menu", title: "Voltar ao menu" },
  ]);
}

async function buscarProfissionaisPorCategoriaESubcategorias({
  supabase,
  user,
  limit = 10,
}) {
  const categoria = user.categoria_principal;
  const subcategoriasBusca = Array.from(
    new Set((user.subcategorias_temp || []).filter(Boolean))
  ).slice(0, 3);

  if (!categoria || !subcategoriasBusca.length) {
    return { servicos: [], error: null };
  }

  const { data: servicos, error } = await supabase
    .from("servicos")
    .select("*")
    .eq("ativo", true)
    .eq("categoria_chave", categoria)
    .ilike("cidade", user.cidade || "")
    .limit(50);

  if (error) {
    console.error("❌ erro ao buscar serviços base:", error);
    return { servicos: [], error };
  }

  if (!servicos?.length) {
    return { servicos: [], error: null };
  }

  const usuarioIds = Array.from(
    new Set(servicos.map((s) => s.usuario_id).filter(Boolean))
  );

  if (!usuarioIds.length) {
    return { servicos: [], error: null };
  }

  const { data: subRows, error: subError } = await supabase
    .from("usuarios_subcategorias")
    .select("*")
    .in("usuario_id", usuarioIds)
    .eq("categoria_chave", categoria);

  if (subError) {
    console.error("❌ erro ao buscar subcategorias dos profissionais:", subError);
    return { servicos: [], error: subError };
  }

  const subcategoriasMap = new Map();
  for (const row of subRows || []) {
    if (!subcategoriasMap.has(row.usuario_id)) {
      subcategoriasMap.set(row.usuario_id, []);
    }
    subcategoriasMap.get(row.usuario_id).push(row.subcategoria_chave);
  }

  const filtrados = servicos
    .map((servico) => {
      const subsProfissional = Array.from(
        new Set(subcategoriasMap.get(servico.usuario_id) || [])
      );

      const matchCount = subsProfissional.filter((s) =>
        subcategoriasBusca.includes(s)
      ).length;

      return {
        ...servico,
        especialidades: subsProfissional,
        match_count: matchCount,
      };
    })
    .filter((s) => s.match_count > 0)
    .sort((a, b) => {
      const visA = Number(a.nivel_visibilidade || 0);
      const visB = Number(b.nivel_visibilidade || 0);

      if (visB !== visA) return visB - visA;
      if (b.match_count !== a.match_count) return b.match_count - a.match_count;

      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateB - dateA;
    })
    .slice(0, limit);

  return { servicos: filtrados, error: null };
}

async function pedirListaDeSubcategorias({
  supabase,
  phone,
  categoria,
  etapa,
  usadas = [],
  titulo = "Escolha uma subcategoria:",
}) {
  const subcategorias = await getSubcategoriasByCategoria(supabase, categoria);
  const usadasSet = new Set(usadas || []);
  const disponiveis = subcategorias.filter((s) => !usadasSet.has(s.chave));

  if (!disponiveis.length) {
    return null;
  }

  return sendList(phone, titulo, [
    {
      title: "Subcategorias",
      rows: disponiveis.slice(0, 10).map((s) => ({
        id: `${etapa}_${s.chave}`,
        title: s.nome,
      })),
    },
  ]);
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
  // =====================
  // BUSCAR PROFISSIONAIS
  // =====================

  if (text === "contratar_buscar_profissionais") {
    const areas = await getCategorias("geral");

    await updateUser({
      etapa: "contratar_area",
      subcategorias_temp: [],
      categoria_principal: null,
      area_principal: null,
    });

    return sendList(phone, "🧑‍🔧 Em qual área você quer buscar profissionais?", [
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
    const grupo = gruposMap[area] || area;
    const categorias = await getCategoriasPorGrupo("servico", grupo);

    await updateUser({
      area_principal: area,
      etapa: "contratar_categoria",
      subcategorias_temp: [],
    });

    if (!categorias.length) {
      await updateUser({ etapa: "menu" });
      await sendText(phone, "Não encontrei categorias nessa área.");
      return sendActionButtons(phone, "O que deseja fazer agora?", [
        { id: "contratar_buscar_profissionais", title: "Buscar novamente" },
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

    await updateUser({
      categoria_principal: categoria,
      etapa: "contratar_subcat_1",
      subcategorias_temp: [],
    });

    const firstList = await pedirListaDeSubcategorias({
      supabase,
      phone,
      categoria,
      etapa: "contratar_subcat_1",
      usadas: [],
      titulo: "Escolha a 1ª subcategoria que deseja buscar:",
    });

    if (!firstList) {
      await updateUser({ etapa: "menu" });
      await sendText(
        phone,
        "Não encontrei subcategorias para essa categoria. Tente outra busca."
      );
      return sendActionButtons(phone, "O que deseja fazer agora?", [
        { id: "contratar_buscar_profissionais", title: "Buscar novamente" },
        { id: "voltar_menu", title: "Voltar ao menu" },
      ]);
    }

    return firstList;
  }

  if (user.etapa === "contratar_subcat_1") {
    if (!text.startsWith("contratar_subcat_1_")) return false;

    const sub = text.replace("contratar_subcat_1_", "");

    await updateUser({
      subcategorias_temp: [sub],
      etapa: "contratar_subcat_2_confirm",
    });

    return sendActionButtons(
      phone,
      "Deseja adicionar outra subcategoria ao filtro?",
      [
        { id: "contratar_add_more_subcat", title: "Adicionar mais" },
        { id: "contratar_finish_subcat", title: "Buscar agora" },
      ]
    );
  }

  if (user.etapa === "contratar_subcat_2_confirm") {
    if (text === "contratar_finish_subcat") {
      const { servicos, error } =
        await buscarProfissionaisPorCategoriaESubcategorias({
          supabase,
          user,
          limit: 5,
        });

      await updateUser({ etapa: "menu" });

      if (error) {
        await sendText(phone, "Erro ao buscar profissionais.");
        return sendActionButtons(phone, "O que deseja fazer agora?", [
          { id: "contratar_buscar_profissionais", title: "Buscar novamente" },
          { id: "voltar_menu", title: "Voltar ao menu" },
        ]);
      }

      if (!servicos.length) {
        await sendText(
          phone,
          "Nenhum profissional encontrado com essa combinação de categoria e subcategorias no momento."
        );
        return sendActionButtons(phone, "O que deseja fazer agora?", [
          { id: "contratar_buscar_profissionais", title: "Buscar novamente" },
          { id: "voltar_menu", title: "Voltar ao menu" },
        ]);
      }

      await sendText(phone, buildProfessionalsPreview(servicos, true));

      return sendActionButtons(phone, "Deseja liberar a lista completa dessa busca?", [
        { id: "prof_buy_single", title: "Pagar R$ 4,90" },
        { id: "contratar_buscar_profissionais", title: "Nova busca" },
        { id: "voltar_menu", title: "Voltar ao menu" },
      ]);
    }

    if (text !== "contratar_add_more_subcat") return false;

    await updateUser({ etapa: "contratar_subcat_2" });

    return pedirListaDeSubcategorias({
      supabase,
      phone,
      categoria: user.categoria_principal,
      etapa: "contratar_subcat_2",
      usadas: user.subcategorias_temp || [],
      titulo: "Escolha a 2ª subcategoria que deseja buscar:",
    });
  }

  if (user.etapa === "contratar_subcat_2") {
    if (!text.startsWith("contratar_subcat_2_")) return false;

    const sub = text.replace("contratar_subcat_2_", "");
    const atuais = Array.from(new Set([...(user.subcategorias_temp || []), sub]));

    await updateUser({
      subcategorias_temp: atuais,
      etapa: "contratar_subcat_3_confirm",
    });

    return sendActionButtons(
      phone,
      "Deseja adicionar mais uma subcategoria ao filtro?",
      [
        { id: "contratar_add_last_subcat", title: "Adicionar mais uma" },
        { id: "contratar_finish_subcat", title: "Buscar agora" },
      ]
    );
  }

  if (user.etapa === "contratar_subcat_3_confirm") {
    if (text === "contratar_finish_subcat") {
      const { servicos, error } =
        await buscarProfissionaisPorCategoriaESubcategorias({
          supabase,
          user,
          limit: 5,
        });

      await updateUser({ etapa: "menu" });

      if (error) {
        await sendText(phone, "Erro ao buscar profissionais.");
        return sendActionButtons(phone, "O que deseja fazer agora?", [
          { id: "contratar_buscar_profissionais", title: "Buscar novamente" },
          { id: "voltar_menu", title: "Voltar ao menu" },
        ]);
      }

      if (!servicos.length) {
        await sendText(
          phone,
          "Nenhum profissional encontrado com essa combinação de categoria e subcategorias no momento."
        );
        return sendActionButtons(phone, "O que deseja fazer agora?", [
          { id: "contratar_buscar_profissionais", title: "Buscar novamente" },
          { id: "voltar_menu", title: "Voltar ao menu" },
        ]);
      }

      await sendText(phone, buildProfessionalsPreview(servicos, true));

      return sendActionButtons(phone, "Deseja liberar a lista completa dessa busca?", [
        { id: "prof_buy_single", title: "Pagar R$ 4,90" },
        { id: "contratar_buscar_profissionais", title: "Nova busca" },
        { id: "voltar_menu", title: "Voltar ao menu" },
      ]);
    }

    if (text !== "contratar_add_last_subcat") return false;

    await updateUser({ etapa: "contratar_subcat_3" });

    return pedirListaDeSubcategorias({
      supabase,
      phone,
      categoria: user.categoria_principal,
      etapa: "contratar_subcat_3",
      usadas: user.subcategorias_temp || [],
      titulo: "Escolha a 3ª subcategoria que deseja buscar:",
    });
  }

  if (user.etapa === "contratar_subcat_3") {
    if (!text.startsWith("contratar_subcat_3_")) return false;

    const sub = text.replace("contratar_subcat_3_", "");
    const atuais = Array.from(
      new Set([...(user.subcategorias_temp || []), sub])
    ).slice(0, 3);

    await updateUser({
      subcategorias_temp: atuais,
      etapa: "menu",
    });

    const { servicos, error } = await buscarProfissionaisPorCategoriaESubcategorias({
      supabase,
      user: { ...user, subcategorias_temp: atuais },
      limit: 5,
    });

    if (error) {
      await sendText(phone, "Erro ao buscar profissionais.");
      return sendActionButtons(phone, "O que deseja fazer agora?", [
        { id: "contratar_buscar_profissionais", title: "Buscar novamente" },
        { id: "voltar_menu", title: "Voltar ao menu" },
      ]);
    }

    if (!servicos.length) {
      await sendText(
        phone,
        "Nenhum profissional encontrado com essa combinação de categoria e subcategorias no momento."
      );
      return sendActionButtons(phone, "O que deseja fazer agora?", [
        { id: "contratar_buscar_profissionais", title: "Buscar novamente" },
        { id: "voltar_menu", title: "Voltar ao menu" },
      ]);
    }

    await sendText(phone, buildProfessionalsPreview(servicos, true));

    return sendActionButtons(phone, "Deseja liberar a lista completa dessa busca?", [
      { id: "prof_buy_single", title: "Pagar R$ 4,90" },
      { id: "contratar_buscar_profissionais", title: "Nova busca" },
      { id: "voltar_menu", title: "Voltar ao menu" },
    ]);
  }

  // =====================
  // DESBLOQUEIO AVULSO DA BUSCA
  // =====================

  if (text === "prof_buy_single") {
    return gerarPagamentoPixBuscaProfissional({
      supabase,
      phone,
      user,
      planoCodigo: "empresa_busca_prof_avulso",
      referenciaTipo: "contratante_busca_prof_avulso",
      afterSuccessLabel:
        "Assim que o pagamento for aprovado, a lista completa dessa busca ficará liberada.",
    });
  }

  return false;
}

export async function handleContratanteFallback(phone) {
  return sendMenuContratante(phone);
}