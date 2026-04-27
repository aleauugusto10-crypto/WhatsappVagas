import { sendList, sendText } from "../services/whatsapp.js";
import { sendMenuContratante, sendActionButtons } from "./menus.js";
import {
  createPendingPayment,
  getPlanoByCodigo,
} from "../lib/monetization.js";
import { createMercadoPagoPixIntent } from "../services/payments.js";
import { getSubcategoriasByCategoria } from "../lib/subcategories.js";



function shortTitle(value = "") {
  const text = String(value || "").trim();
  return text.length > 24 ? `${text.slice(0, 21)}...` : text;
}

function buildPreviewList(items = []) {
  return items
    .slice(0, 10)
    .map((item, index) => `${index + 1}. ${item.nome}`)
    .join("\n");
}
const PROFESSIONALS_PAGE_SIZE = 10;
async function getAreasAtivas(supabase) {
  const { data, error } = await supabase
    .from("areas")
   .select("chave,nome,ativo,ordem")
    .eq("ativo", true)
    .order("ordem", { ascending: true })
    .order("nome", { ascending: true });

  if (error) {
    console.log("❌ erro ao buscar áreas:", error.message);
    return [];
  }

  return Array.isArray(data) ? data : [];
}

async function getCategoriasPorArea(supabase, areaChave) {
  const { data, error } = await supabase
    .from("categorias")
    .select("chave,nome,ativo,area_chave,ordem")
    .eq("ativo", true)
    .eq("area_chave", areaChave)
    .order("ordem", { ascending: true })
    .order("nome", { ascending: true });

  if (error) {
    console.log("❌ erro ao buscar categorias por área:", error.message);
    return [];
  }

  return Array.isArray(data) ? data : [];
}


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

function buildProfessionalsPreview(servicos = [], page = 0) {
  if (!servicos.length) {
    return "Nenhum profissional encontrado no momento.";
  }

  let out = `🔎 *Profissionais encontrados:*\n\nPágina ${page + 1}`;

  servicos.forEach((s) => {
    out +=
      `\n\n• *${s.titulo || "Profissional"}*` +
      `\n📍 ${s.cidade || "Sem cidade"}${s.estado ? `/${s.estado}` : ""}` +
      `\n📝 ${s.descricao || "Sem descrição informada."}` +
      `\n📞 WhatsApp: ${s.contato_whatsapp || "Não informado"}`;
  });

  return out;
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
    valor: 4.9,
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
        `📦 *Plano:* Busca avulsa de profissionais\n` +
        `💵 *Valor:* R$ 4,90\n` +
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

  await sendText(
    phone,
    buildPixResumo(intent, { nome: "Busca avulsa de profissionais", valor: 4.9 })
  );
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

  let query = supabase
    .from("servicos")
    .select("*")
    .eq("ativo", true)
    .eq("categoria_chave", categoria)
    .limit(50);

  if (user.cidade) {
    query = query.ilike("cidade", user.cidade);
  }

  if (user.estado) {
    query = query.eq("estado", user.estado);
  }

  const { data: servicos, error } = await query;

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
  getCategoriasPorGrupos,
}) {
  // =====================
  // BUSCAR PROFISSIONAIS
  // =====================

  if (text === "contratar_buscar_profissionais") {
  const areas = await getAreasAtivas(supabase);

  await updateUser({
    etapa: "contratar_area",
    subcategorias_temp: [],
    categoria_principal: null,
    area_principal: null,
  });

  await sendText(
    phone,
    `Em qual área você quer buscar profissionais?\n\n${buildPreviewList(areas)}\n\n👇 Toque em "Ver opções" para selecionar.`
  );

  return sendList(phone, "Selecione uma área:", [
    {
      title: "Áreas",
      rows: areas.slice(0, 10).map((a) => ({
        id: `contratar_area_${a.chave}`,
        title: shortTitle(a.nome),
      })),
    },
  ]);
}

  if (user.etapa === "contratar_area") {
    if (!text.startsWith("contratar_area_")) return false;

    const area = text.replace("contratar_area_", "");
    const categorias = await getCategoriasPorArea(supabase, area);

    await updateUser({
      area_principal: area,
      etapa: "contratar_categoria",
      subcategorias_temp: [],
    });

    if (!categorias.length) {
      await updateUser({ etapa: "contratar_area" });
      await sendText(phone, "Não encontrei categorias nessa área.");
      return sendActionButtons(phone, "O que deseja fazer agora?", [
        { id: "contratar_buscar_profissionais", title: "Buscar novamente" },
        { id: "voltar_menu", title: "Voltar ao menu" },
      ]);
    }
await sendText(
  phone,
  `Escolha a categoria do profissional:\n\n${buildPreviewList(categorias)}\n\n👇 Toque em "Ver opções" para selecionar.`
);
    return sendList(phone, "Escolha a categoria do profissional:", [
      {
        title: "Categorias",
        rows: categorias.slice(0, 10).map((c) => ({
          id: `contratar_cat_${c.chave}`,
          title: shortTitle(c.nome),
        })),
      },
    ]);
  }
if (
  user.etapa === "contratar_categoria" ||
  text.startsWith("contratar_prof_next_")
) {
  let categoria = null;
  let page = 0;

  if (text.startsWith("contratar_prof_next_")) {
    const raw = text.replace("contratar_prof_next_", "");
    const parts = raw.split("__page_");

    categoria = parts[0];
    page = Number(parts[1] || 0);
  } else {
    if (!text.startsWith("contratar_cat_")) return false;

    categoria = text.replace("contratar_cat_", "");
    page = 0;
  }

  const from = page * PROFESSIONALS_PAGE_SIZE;
  const to = from + PROFESSIONALS_PAGE_SIZE;

  await updateUser({
    categoria_principal: categoria,
    etapa: "menu",
    subcategorias_temp: [],
  });

  let query = supabase
    .from("servicos")
    .select("*")
    .eq("ativo", true)
    .eq("categoria_chave", categoria)
    .order("nivel_visibilidade", { ascending: false })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (user.cidade) {
    query = query.ilike("cidade", user.cidade);
  }

  if (user.estado) {
    query = query.eq("estado", user.estado);
  }

  const { data: servicos, error } = await query;

  if (error) {
    console.error("❌ erro ao buscar profissionais:", error);
    await sendText(phone, "Erro ao buscar profissionais.");
    return sendActionButtons(phone, "O que deseja fazer agora?", [
      { id: "contratar_buscar_profissionais", title: "Buscar novamente" },
      { id: "voltar_menu", title: "Voltar ao menu" },
    ]);
  }

  const lista = (servicos || []).slice(0, PROFESSIONALS_PAGE_SIZE);
  const temProximaPagina = (servicos || []).length > PROFESSIONALS_PAGE_SIZE;

  if (!lista.length) {
    await sendText(phone, "Nenhum profissional encontrado nessa categoria no momento.");
    return sendActionButtons(phone, "O que deseja fazer agora?", [
      { id: "contratar_buscar_profissionais", title: "Buscar novamente" },
      { id: "voltar_menu", title: "Voltar ao menu" },
    ]);
  }

  await sendText(phone, buildProfessionalsPreview(lista, page));

  const botoes = [];

  if (temProximaPagina) {
    botoes.push({
      id: `contratar_prof_next_${categoria}__page_${page + 1}`,
      title: "Próxima página",
    });
  }

  botoes.push(
    { id: "contratar_buscar_profissionais", title: "Nova busca" },
    { id: "voltar_menu", title: "Voltar ao menu" }
  );

  return sendActionButtons(phone, "O que deseja fazer agora?", botoes);
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

    const { servicos, error } =
      await buscarProfissionaisPorCategoriaESubcategorias({
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