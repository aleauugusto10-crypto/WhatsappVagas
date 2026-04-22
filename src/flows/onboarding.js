import { sendText, sendList } from "../services/whatsapp.js";
import { parseCidadeEstado, estadosRows } from "../lib/location.js";
import {
  sendMenuUsuario,
  sendMenuContratante,
  sendMenuEmpresa,
  sendActionButtons,
} from "./menus.js";
import {
  getSubcategoriasByCategoria,
  replaceUserSubcategorias,
} from "../lib/subcategories.js";

function isValidEmail(value = "") {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim().toLowerCase());
}

function cleanCPF(cpf = "") {
  return String(cpf).replace(/\D/g, "");
}

function isValidCPF(cpf = "") {
  cpf = cleanCPF(cpf);

  if (!cpf || cpf.length !== 11) return false;
  if (/^(\d)\1+$/.test(cpf)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += Number(cpf[i]) * (10 - i);
  }

  let firstDigit = (sum * 10) % 11;
  if (firstDigit === 10) firstDigit = 0;
  if (firstDigit !== Number(cpf[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += Number(cpf[i]) * (11 - i);
  }

  let secondDigit = (sum * 10) % 11;
  if (secondDigit === 10) secondDigit = 0;

  return secondDigit === Number(cpf[10]);
}

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

function buildRaioList(phone) {
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

export async function handleOnboarding({
  user,
  text,
  phone,
  supabase,
  updateUser,
  getCategorias,
  getCategoriasPorGrupo,
}) {
  // =====================
  // ESCOLHA DO TIPO
  // =====================

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

  // =====================
  // NOME
  // =====================

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

  // =====================
  // CIDADE
  // =====================

  if (user.etapa === "cidade") {
    const { cidade, estado } = parseCidadeEstado(text);

    if (!cidade || cidade.length < 2) {
      return sendText(phone, "Digite uma cidade válida:");
    }

    if (estado) {
      await updateUser({
        cidade,
        estado,
        etapa: "email",
      });

      return sendText(phone, "Qual seu e-mail?");
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

  // =====================
  // ESTADO
  // =====================

  if (user.etapa === "estado") {
    if (!text.startsWith("estado_")) {
      return sendText(phone, "Escolha o estado pela lista.");
    }

    const estado = text.replace("estado_", "").toUpperCase();

    await updateUser({
      estado,
      etapa: "email",
    });

    return sendText(phone, "Qual seu e-mail?");
  }

  // =====================
  // EMAIL
  // =====================

  if (user.etapa === "email") {
    if (!isValidEmail(text)) {
      return sendText(phone, "Digite um e-mail válido.\nEx: nome@email.com");
    }

    await updateUser({
      email: text.trim().toLowerCase(),
      etapa: "cpf",
    });

    return sendText(phone, "Digite seu CPF (apenas números):");
  }

  // =====================
  // CPF
  // =====================

  if (user.etapa === "cpf") {
    const cpfLimpo = cleanCPF(text);

    if (!isValidCPF(cpfLimpo)) {
      return sendText(
        phone,
        "CPF inválido. Digite um CPF válido.\nEx: 12345678909"
      );
    }

    await updateUser({
      cpf: cpfLimpo,
    });

    if (user.tipo === "empresa") {
      await updateUser({
        etapa: "nome_empresa",
      });

      return sendText(phone, "Qual o nome da empresa?");
    }

    if (user.tipo === "contratante") {
      await updateUser({
        etapa: "menu",
        onboarding_finalizado: true,
      });

      return sendMenuContratante(phone);
    }

    await updateUser({
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

  // =====================
  // NOME DA EMPRESA
  // =====================

  if (user.etapa === "nome_empresa") {
    if (!text || text.length < 2) {
      return sendText(phone, "Digite o nome da empresa:");
    }

    await updateUser({
      nome_empresa: text,
      etapa: "menu",
      onboarding_finalizado: true,
    });

    return sendMenuEmpresa(phone);
  }

  // =====================
  // ÁREA
  // =====================

  if (user.etapa === "area") {
    if (!text.startsWith("area_")) return false;

    const area = text.replace("area_", "");

    await updateUser({
      area_principal: area,
      etapa: "categoria",
    });

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

  // =====================
  // CATEGORIA
  // =====================

  if (user.etapa === "categoria") {
    if (!text.startsWith("cat_")) return false;

    const categoria = text.replace("cat_", "");

    await updateUser({
      categoria_principal: categoria,
      etapa: "subcategoria_1",
      subcategorias_temp: [],
    });

    const subcategorias = await getSubcategoriasByCategoria(supabase, categoria);

    if (!subcategorias.length) {
      await updateUser({ etapa: "raio" });
      return buildRaioList(phone);
    }

    return sendList(phone, "Escolha sua 1ª especialidade:", [
      {
        title: "Subcategorias",
        rows: subcategorias.slice(0, 10).map((s) => ({
          id: `subcat_${s.chave}`,
          title: s.nome,
        })),
      },
    ]);
  }

  // =====================
  // SUBCATEGORIA 1
  // =====================

  if (user.etapa === "subcategoria_1") {
    if (!text.startsWith("subcat_")) return false;

    const sub = text.replace("subcat_", "");
    const atuais = [sub];

    await updateUser({
      subcategorias_temp: atuais,
      etapa: "subcategoria_2_confirm",
    });

    return sendActionButtons(phone, "Deseja adicionar outra especialidade?", [
      { id: "subcat_add_more", title: "Adicionar mais" },
      { id: "subcat_finish", title: "Concluir" },
    ]);
  }

  // =====================
  // CONFIRMAR SUBCATEGORIA 2
  // =====================

  if (user.etapa === "subcategoria_2_confirm") {
    if (text === "subcat_finish") {
      const ok = await replaceUserSubcategorias(
        supabase,
        user.id,
        user.categoria_principal,
        user.subcategorias_temp || []
      );

      if (!ok) {
        return sendText(phone, "Erro ao salvar suas especialidades.");
      }

      await updateUser({ etapa: "raio" });
      return buildRaioList(phone);
    }

    if (text !== "subcat_add_more") return false;

    const subcategorias = await getSubcategoriasByCategoria(
      supabase,
      user.categoria_principal
    );

    const usadas = new Set(user.subcategorias_temp || []);
    const disponiveis = subcategorias.filter((s) => !usadas.has(s.chave));

    if (!disponiveis.length) {
      const ok = await replaceUserSubcategorias(
        supabase,
        user.id,
        user.categoria_principal,
        user.subcategorias_temp || []
      );

      if (!ok) {
        return sendText(phone, "Erro ao salvar suas especialidades.");
      }

      await updateUser({ etapa: "raio" });
      return buildRaioList(phone);
    }

    await updateUser({ etapa: "subcategoria_2" });

    return sendList(phone, "Escolha sua 2ª especialidade:", [
      {
        title: "Subcategorias",
        rows: disponiveis.slice(0, 10).map((s) => ({
          id: `subcat_${s.chave}`,
          title: s.nome,
        })),
      },
    ]);
  }

  // =====================
  // SUBCATEGORIA 2
  // =====================

  if (user.etapa === "subcategoria_2") {
    if (!text.startsWith("subcat_")) return false;

    const sub = text.replace("subcat_", "");
    const atuais = Array.from(
      new Set([...(user.subcategorias_temp || []), sub])
    );

    await updateUser({
      subcategorias_temp: atuais,
      etapa: "subcategoria_3_confirm",
    });

    return sendActionButtons(phone, "Deseja adicionar mais uma especialidade?", [
      { id: "subcat_add_last", title: "Adicionar mais uma" },
      { id: "subcat_finish", title: "Concluir" },
    ]);
  }

  // =====================
  // CONFIRMAR SUBCATEGORIA 3
  // =====================

  if (user.etapa === "subcategoria_3_confirm") {
    if (text === "subcat_finish") {
      const ok = await replaceUserSubcategorias(
        supabase,
        user.id,
        user.categoria_principal,
        user.subcategorias_temp || []
      );

      if (!ok) {
        return sendText(phone, "Erro ao salvar suas especialidades.");
      }

      await updateUser({ etapa: "raio" });
      return buildRaioList(phone);
    }

    if (text !== "subcat_add_last") return false;

    const subcategorias = await getSubcategoriasByCategoria(
      supabase,
      user.categoria_principal
    );

    const usadas = new Set(user.subcategorias_temp || []);
    const disponiveis = subcategorias.filter((s) => !usadas.has(s.chave));

    if (!disponiveis.length) {
      const ok = await replaceUserSubcategorias(
        supabase,
        user.id,
        user.categoria_principal,
        user.subcategorias_temp || []
      );

      if (!ok) {
        return sendText(phone, "Erro ao salvar suas especialidades.");
      }

      await updateUser({ etapa: "raio" });
      return buildRaioList(phone);
    }

    await updateUser({ etapa: "subcategoria_3" });

    return sendList(phone, "Escolha sua 3ª especialidade:", [
      {
        title: "Subcategorias",
        rows: disponiveis.slice(0, 10).map((s) => ({
          id: `subcat_${s.chave}`,
          title: s.nome,
        })),
      },
    ]);
  }

  // =====================
  // SUBCATEGORIA 3
  // =====================

  if (user.etapa === "subcategoria_3") {
    if (!text.startsWith("subcat_")) return false;

    const sub = text.replace("subcat_", "");
    const atuais = Array.from(
      new Set([...(user.subcategorias_temp || []), sub])
    ).slice(0, 3);

    const ok = await replaceUserSubcategorias(
      supabase,
      user.id,
      user.categoria_principal,
      atuais
    );

    if (!ok) {
      return sendText(phone, "Erro ao salvar suas especialidades.");
    }

    await updateUser({
      subcategorias_temp: atuais,
      etapa: "raio",
    });

    return buildRaioList(phone);
  }

  // =====================
  // RAIO
  // =====================

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