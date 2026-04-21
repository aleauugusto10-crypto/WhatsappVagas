import { sendList, sendText } from "../services/whatsapp.js";
import { sendMenuEmpresa } from "./menus.js";

export async function handleCompanyMenu({
  user,
  text,
  phone,
  supabase,
  updateUser,
  getCategorias,
  getCategoriasPorGrupo,
}) {
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
    await updateUser({ etapa: "empresa_buscar_categoria" });

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

    const grupo = gruposMap[area] || area;
    const categorias = await getCategoriasPorGrupo("servico", grupo);

    if (!categorias.length) {
      return sendText(phone, "Não encontrei categorias nessa área.");
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
      console.error("❌ erro ao buscar profissionais para empresa:", error);
      return sendText(phone, "Erro ao buscar profissionais.");
    }

    if (!servicos?.length) {
      return sendText(phone, "Nenhum profissional encontrado no momento.");
    }

    let out = "🧑‍🔧 Profissionais encontrados:\n";
    for (const s of servicos) {
      out += `\n• ${s.titulo} - ${s.cidade || "Sem cidade"}`;
    }

    return sendText(phone, out);
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

    const grupo = gruposMap[area] || area;
    const categorias = await getCategoriasPorGrupo("vaga", grupo);

    await updateUser({ etapa: "empresa_vaga_categoria" });

    if (!categorias.length) {
      return sendText(phone, "Não encontrei categorias de vaga nessa área.");
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

    return sendText(
      phone,
      "Qual o título da vaga?\nEx: Vendedor de loja, Auxiliar administrativo"
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
      return sendText(phone, "Erro ao criar vaga.");
    }

    await updateUser({
      etapa: "menu",
      vaga_titulo_temp: null,
    });

    return sendText(phone, "✅ Vaga criada com sucesso!");
  }

  if (text === "empresa_minhas_vagas") {
    const { data: vagas, error } = await supabase
      .from("vagas")
      .select("*")
      .eq("empresa_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      console.error("❌ erro ao listar vagas da empresa:", error);
      return sendText(phone, "Erro ao buscar suas vagas.");
    }

    if (!vagas?.length) {
      return sendText(phone, "Você ainda não criou nenhuma vaga.");
    }

    let out = "📋 Suas vagas:\n";
    for (const v of vagas) {
      out += `\n• ${v.titulo} - ${v.status}`;
    }

    return sendText(phone, out);
  }

  return false;
}

export async function handleCompanyFallback(phone) {
  return sendMenuEmpresa(phone);
}