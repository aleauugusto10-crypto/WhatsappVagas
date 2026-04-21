import { sendText, sendList } from "../services/whatsapp.js";
import { parseCidadeEstado, estadosRows } from "../lib/location.js";
import {
  sendMenuUsuario,
  sendMenuContratante,
  sendMenuEmpresa,
} from "./menus.js";

export async function handleOnboarding({
  user,
  text,
  phone,
  updateUser,
  getCategorias,
  getCategoriasPorGrupo,
}) {
  if (user.etapa === "tipo") {
    if (!["tipo_usuario", "tipo_contratante", "tipo_empresa"].includes(text)) {
      return false;
    }

    let tipo = "usuario";
    if (text === "tipo_contratante") tipo = "contratante";
    if (text === "tipo_empresa") tipo = "empresa";

    await updateUser({
      tipo,
      etapa: "nome",
      onboarding_finalizado: false,
    });

    return sendText(phone, "Qual seu nome e sobrenome?");
  }

  if (user.etapa === "nome") {
    if (!text || text.length < 3) {
      return sendText(phone, "Digite seu nome e sobrenome:");
    }

    await updateUser({
      nome: text,
      etapa: "cidade",
    });

    return sendText(
      phone,
      "Qual sua cidade?\n\nVocê pode escrever só a cidade ou cidade + estado.\nExemplos:\n• Itabaiana\n• Itabaiana - SE"
    );
  }

  if (user.etapa === "cidade") {
    const { cidade, estado } = parseCidadeEstado(text);

    if (!cidade || cidade.length < 2) {
      return sendText(phone, "Digite uma cidade válida:");
    }

    if (estado) {
      if (user.tipo === "empresa") {
        await updateUser({
          cidade,
          estado,
          etapa: "menu",
          onboarding_finalizado: true,
        });
        return sendMenuEmpresa(phone);
      }

      if (user.tipo === "contratante") {
        await updateUser({
          cidade,
          estado,
          etapa: "menu",
          onboarding_finalizado: true,
        });
        return sendMenuContratante(phone);
      }

      await updateUser({
        cidade,
        estado,
        etapa: "area",
      });

      const areas = await getCategorias("geral");
      return sendList(phone, "Escolha sua área de interesse:", [
        {
          title: "Áreas",
          rows: areas
            .filter((a) => a.chave !== "profissional")
            .map((a) => ({
              id: `area_${a.chave}`,
              title: a.nome,
            })),
        },
      ]);
    }

    await updateUser({
      cidade,
      etapa: "estado",
    });

    return sendList(phone, "Agora escolha o estado:", [
      {
        title: "Estados",
        rows: estadosRows(),
      },
    ]);
  }

  if (user.etapa === "estado") {
    if (!text.startsWith("estado_")) {
      return sendText(phone, "Escolha o estado pela lista.");
    }

    const estado = text.replace("estado_", "").toUpperCase();

    if (user.tipo === "empresa") {
      await updateUser({
        estado,
        etapa: "menu",
        onboarding_finalizado: true,
      });
      return sendMenuEmpresa(phone);
    }

    if (user.tipo === "contratante") {
      await updateUser({
        estado,
        etapa: "menu",
        onboarding_finalizado: true,
      });
      return sendMenuContratante(phone);
    }

    await updateUser({
      estado,
      etapa: "area",
    });

    const areas = await getCategorias("geral");
    return sendList(phone, "Escolha sua área de interesse:", [
      {
        title: "Áreas",
        rows: areas
          .filter((a) => a.chave !== "profissional")
          .map((a) => ({
            id: `area_${a.chave}`,
            title: a.nome,
          })),
      },
    ]);
  }

  if (user.etapa === "area") {
    if (!text.startsWith("area_")) return false;

    const area = text.replace("area_", "");

    await updateUser({
      area_principal: area,
      etapa: "categoria",
    });

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
    let categorias = await getCategoriasPorGrupo("vaga", grupo);

    if (!categorias.length) {
      categorias = await getCategoriasPorGrupo("servico", grupo);
    }

    if (!categorias.length) {
      return sendText(
        phone,
        "Ainda não encontrei categorias para essa área. Envie 'menu' para recomeçar."
      );
    }

    return sendList(phone, "Escolha a categoria que mais combina com você:", [
      {
        title: "Categorias",
        rows: categorias.map((c) => ({
          id: `cat_${c.chave}`,
          title: c.nome,
        })),
      },
    ]);
  }

  if (user.etapa === "categoria") {
    if (!text.startsWith("cat_")) return false;

    const categoria = text.replace("cat_", "");

    await updateUser({
      categoria_principal: categoria,
      etapa: "raio",
    });

    return sendList(phone, "Até quantos km você aceita trabalhar?", [
      {
        title: "Raio",
        rows: [3, 5, 10, 20, 50].map((km) => ({
          id: `raio_${km}`,
          title: `${km} km`,
        })),
      },
    ]);
  }

  if (user.etapa === "raio") {
    if (!text.startsWith("raio_")) return false;

    const raio = Number(text.replace("raio_", ""));
    if (!raio) {
      return sendText(phone, "Escolha o raio pela lista.");
    }

    await updateUser({
      raio_km: raio,
      etapa: "menu",
      onboarding_finalizado: true,
    });

    return sendMenuUsuario(phone);
  }

  return false;
}