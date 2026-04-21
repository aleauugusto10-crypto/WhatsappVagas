import { sendList, sendText } from "../services/whatsapp.js";
import { sendMenuContratante } from "./menus.js";

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
          id: `contratar_cat_${c.chave}`,
          title: c.nome,
        })),
      },
    ]);
  }

  if (user.etapa === "contratar_categoria") {
    if (!text.startsWith("contratar_cat_")) return false;

    const categoria = text.replace("contratar_cat_", "");

    const { data: servicos, error } = await supabase
      .from("servicos")
      .select("*")
      .eq("ativo", true)
      .eq("categoria_chave", categoria)
      .ilike("cidade", user.cidade || "")
      .limit(10);

    await updateUser({ etapa: "menu" });

    if (error) {
      console.error("❌ erro ao buscar serviços:", error);
      return sendText(phone, "Erro ao buscar profissionais.");
    }

    if (!servicos?.length) {
      return sendText(phone, "Nenhum profissional encontrado nessa categoria no momento.");
    }

    let out = "🧑‍🔧 Profissionais encontrados:\n";
    for (const s of servicos) {
      out += `\n• ${s.titulo} - ${s.cidade || "Sem cidade"}`;
    }

    return sendText(phone, out);
  }

  return false;
}

export async function handleContratanteFallback(phone) {
  return sendMenuContratante(phone);
}