import { supabase } from "./supabase.js";
import { sendText, sendButtons, sendList } from "./services/whatsapp.js";

const processingUsers = new Set();

// 🔥 helpers banco

async function getCategorias(contexto) {
  const { data } = await supabase
    .from("categorias")
    .select("*")
    .eq("contexto", contexto)
    .eq("ativo", true)
    .order("nome");

  return data || [];
}

async function getCategoriasPorGrupo(contexto, grupo) {
  const { data } = await supabase
    .from("categorias")
    .select("*")
    .eq("contexto", contexto)
    .eq("grupo", grupo)
    .eq("ativo", true)
    .order("nome");

  return data || [];
}

// 🔥 inferência simples
function inferCategoria(text) {
  text = text.toLowerCase();

  if (text.includes("limp") || text.includes("faxina")) return "limpeza";
  if (text.includes("frete") || text.includes("mudan")) return "frete";
  if (text.includes("eletric")) return "eletricista";
  if (text.includes("cano") || text.includes("vazamento")) return "encanador";

  return "outros";
}

// 🚀 MAIN

export async function handleMessage(msg) {
  const phone = msg?.from;
  if (!phone) return;

  if (processingUsers.has(phone)) return;
  processingUsers.add(phone);

  try {
    const text =
      msg?.interactive?.button_reply?.id ||
      msg?.interactive?.list_reply?.id ||
      msg?.text?.body?.toLowerCase().trim() ||
      "";

    let { data: user } = await supabase
      .from("usuarios")
      .select("*")
      .eq("telefone", phone)
      .maybeSingle();

    // 🔥 cria usuário
    if (!user) {
      const { data: created } = await supabase
        .from("usuarios")
        .insert({
          telefone: phone,
          tipo: "usuario",
          etapa: "tipo",
          ativo: true,
        })
        .select()
        .single();

      user = created;

      return sendButtons(
        phone,
        "👋 Bem-vindo!\n\nComo você quer usar?",
        [
          { id: "trabalhar", title: "Quero trabalhar" },
          { id: "contratar", title: "Preciso de alguém" },
          { id: "empresa", title: "Sou empresa" },
        ]
      );
    }

    const updateUser = async (data) => {
      const { data: u } = await supabase
        .from("usuarios")
        .update(data)
        .eq("id", user.id)
        .select()
        .single();

      Object.assign(user, u);
    };

    // 🔁 reset
    if (["oi", "menu"].includes(text)) {
      await updateUser({ etapa: "tipo" });
      return sendText(phone, "Digite algo novamente 👇");
    }

    // =====================
    // ONBOARDING
    // =====================

    if (user.etapa === "tipo") {
      let tipo = "usuario";

      if (text === "contratar") tipo = "contratante";
      if (text === "empresa") tipo = "empresa";

      await updateUser({ tipo, etapa: "nome" });

      return sendText(phone, "Qual seu nome?");
    }

    if (user.etapa === "nome") {
      await updateUser({ nome: text, etapa: "cidade" });
      return sendText(phone, "Qual sua cidade?");
    }

    if (user.etapa === "cidade") {
      await updateUser({ cidade: text, etapa: "area" });

      const areas = await getCategorias("geral");

      return sendList(
        phone,
        "Escolha uma área:",
        [
          {
            title: "Áreas",
            rows: areas.map((a) => ({
              id: `area_${a.chave}`,
              title: a.nome,
            })),
          },
        ]
      );
    }

    if (user.etapa === "area") {
      const area = text.replace("area_", "");

      await updateUser({
        area_principal: area,
        etapa: "categoria",
      });

      const cats = await getCategoriasPorGrupo("servico", area);

      return sendList(
        phone,
        "Escolha a categoria:",
        [
          {
            title: "Categorias",
            rows: cats.map((c) => ({
              id: `cat_${c.chave}`,
              title: c.nome,
            })),
          },
        ]
      );
    }

    if (user.etapa === "categoria") {
      const cat = text.replace("cat_", "");

      await updateUser({
        categoria_principal: cat,
        etapa: "raio",
      });

      return sendList(
        phone,
        "Até quantos km?",
        [
          {
            title: "Raio",
            rows: [3, 5, 10, 20, 50].map((km) => ({
              id: `raio_${km}`,
              title: `${km} km`,
            })),
          },
        ]
      );
    }

    if (user.etapa === "raio") {
      const km = parseInt(text.replace("raio_", ""));

      await updateUser({
        raio_km: km,
        etapa: "menu",
      });
    }

    // =====================
    // MENU USUÁRIO
    // =====================

    if (user.tipo === "usuario") {
      if (text === "ver_vagas") {
        const { data: vagas } = await supabase
          .from("vagas")
          .select("*")
          .eq("categoria_chave", user.categoria_principal)
          .eq("cidade", user.cidade)
          .limit(5);

        if (!vagas?.length)
          return sendText(phone, "Sem vagas no momento.");

        let msgOut = "💼 Vagas:\n";

        vagas.forEach((v) => {
          msgOut += `\n• ${v.titulo}`;
        });

        msgOut += "\n\n🔒 Para ver contato: R$4,90";

        return sendText(phone, msgOut);
      }

      if (text === "ver_missoes") {
        const { data: missoes } = await supabase
          .from("missoes")
          .select("*")
          .eq("status", "aberta")
          .limit(5);

        if (!missoes?.length)
          return sendText(phone, "Sem missões.");

        let msgOut = "🔥 Missões:\n";

        missoes.forEach((m) => {
          msgOut += `\n• ${m.titulo} - R$${m.valor}`;
        });

        return sendText(phone, msgOut);
      }

      return sendList(phone, "Menu:", [
        {
          title: "Opções",
          rows: [
            { id: "ver_vagas", title: "Ver vagas" },
            { id: "ver_missoes", title: "Ver bicos" },
          ],
        },
      ]);
    }

    // =====================
    // CONTRATANTE
    // =====================

    if (user.tipo === "contratante") {
      if (text === "criar_missao") {
        await updateUser({ etapa: "missao_titulo" });
        return sendText(phone, "Título da missão:");
      }

      if (user.etapa === "missao_titulo") {
        await updateUser({
          missao_titulo: text,
          etapa: "missao_desc",
        });
        return sendText(phone, "Descreva:");
      }

      if (user.etapa === "missao_desc") {
        await updateUser({
          missao_desc: text,
          etapa: "missao_valor",
        });
        return sendText(phone, "Valor:");
      }

      if (user.etapa === "missao_valor") {
        const valor = Number(text);

        const categoria = inferCategoria(user.missao_desc);

        await supabase.from("missoes").insert({
          usuario_id: user.id,
          titulo: user.missao_titulo,
          descricao: user.missao_desc,
          valor,
          categoria_chave: categoria,
          cidade: user.cidade,
          status: "aberta",
        });

        await updateUser({ etapa: "menu" });

        return sendText(phone, "🚀 Missão criada!");
      }

      return sendList(phone, "Menu:", [
        {
          title: "Opções",
          rows: [
            { id: "criar_missao", title: "Criar missão" },
          ],
        },
      ]);
    }

    // =====================
    // EMPRESA
    // =====================

    if (user.tipo === "empresa") {
      return sendText(phone, "Fluxo empresa em breve 🚀");
    }

  } catch (err) {
    console.error(err);
    return sendText(phone, "Erro.");
  } finally {
    processingUsers.delete(phone);
  }
}