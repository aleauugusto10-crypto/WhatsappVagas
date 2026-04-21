import { sendList, sendText } from "../services/whatsapp.js";
import { sendMenuEmpresa, sendActionButtons } from "./menus.js";

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

  if (text === "empresa_buscar_profissionais") {
    const areas = await getCategorias("geral");
    await updateUser({ etapa: "empresa_buscar_area" });

    return sendList(phone, "Em qual área você quer buscar profissionais?", [
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
      .limit(10);

    await updateUser({ etapa: "menu" });

    if (error) {
      console.error("❌ erro ao buscar profissionais:", error);
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

    let out = "🧑‍🔧 Profissionais encontrados:\n";
    for (const s of servicos) {
      out += `\n• ${s.titulo} - ${s.cidade || "Sem cidade"}`;
    }

    await sendText(phone, out);
    return sendActionButtons(phone, "O que deseja fazer agora?", [
      { id: "voltar_menu", title: "Voltar ao menu" },
    ]);
  }

  if (text === "empresa_criar_vaga") {
    const areas = await getCategorias("geral");
    await updateUser({ etapa: "empresa_vaga_area" });

    return sendList(phone, "Escolha a área da vaga:", [
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

    return sendList(phone, "Escolha a função da vaga:", [
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

    return sendText(phone, "Qual o título da vaga?");
  }

  if (user.etapa === "empresa_vaga_titulo") {
    if (!text || text.length < 3) {
      return sendText(phone, "Digite um título válido para a vaga:");
    }

    await updateUser({
      vaga_titulo_temp: text,
      etapa: "empresa_vaga_descricao",
    });

    return sendText(phone, "Descreva a vaga em poucas palavras:");
  }

  if (user.etapa === "empresa_vaga_descricao") {
    if (!text || text.length < 5) {
      return sendText(phone, "Descreva melhor a vaga:");
    }

    const { error } = await supabase.from("vagas").insert({
      empresa_id: user.id,
      titulo: user.vaga_titulo_temp,
      descricao: text,
      categoria_chave: user.categoria_principal,
      cidade: user.cidade,
      estado: user.estado,
      status: "aberta",
      contato_whatsapp: user.telefone,
    });

    if (error) {
      console.error("❌ erro ao criar vaga:", error);
      await sendText(phone, "Erro ao criar vaga.");
      return sendActionButtons(phone, "O que deseja fazer agora?", [
        { id: "voltar_menu", title: "Voltar ao menu" },
      ]);
    }

    await updateUser({
      etapa: "menu",
      vaga_titulo_temp: null,
    });

    await sendText(phone, "✅ Vaga criada com sucesso!");
    return sendActionButtons(phone, "O que deseja fazer agora?", [
      { id: "empresa_criar_vaga", title: "Criar outra vaga" },
      { id: "empresa_minhas_vagas", title: "Ver minhas vagas" },
      { id: "voltar_menu", title: "Voltar ao menu" },
    ]);
  }

  if (text === "empresa_minhas_vagas") {
    const { data: vagas, error } = await supabase
      .from("vagas")
      .select("*")
      .eq("empresa_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    await updateUser({ etapa: "menu" });

    if (error) {
      console.error("❌ erro ao listar vagas:", error);
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

    let out = "📋 Suas vagas:\n";
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
      console.error("❌ erro ao carregar vagas:", error);
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