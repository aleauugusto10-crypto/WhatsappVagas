import { supabase } from "./supabase.js";
import { sendText, sendButtons, sendList } from "./services/whatsapp.js";
import { getVagasForUser } from "./modules/vagas.js";
import { getServicos } from "./modules/servicos.js";

// 🔥 LOCK DE PROCESSAMENTO POR USUÁRIO
const processingUsers = new Set();

export async function handleMessage(msg) {
  const phone = msg?.from;

  if (!phone) {
    console.log("⛔ mensagem sem telefone");
    return;
  }

  if (processingUsers.has(phone)) {
    console.log("⏳ ignorado (já processando):", phone);
    return;
  }

  processingUsers.add(phone);

  try {
    const text =
      msg?.interactive?.button_reply?.id ||
      msg?.interactive?.list_reply?.id ||
      msg?.text?.body?.toLowerCase().trim() ||
      "";

    const isText = msg?.type === "text";

    console.log("📱 telefone:", phone);
    console.log("💬 texto:", text);

    let { data: user, error: userError } = await supabase
      .from("usuarios")
      .select("*")
      .eq("telefone", phone)
      .maybeSingle();

    if (userError) {
      console.error("❌ erro ao buscar usuário:", userError);
      return;
    }

    if (!user) {
      console.log("🆕 usuário não encontrado, tentando criar...");

      const { data: createdUser, error: createError } = await supabase
        .from("usuarios")
        .insert({
          telefone: phone,
          etapa: "onboarding",
          tipo: "usuario",
          ativo: true,
        })
        .select()
        .single();

      if (createError) {
        console.error("❌ erro ao criar usuário:", createError);
        return;
      }

      console.log("✅ usuário criado:", createdUser);
      return sendWelcome(phone);
    }

    console.log("📌 etapa atual:", user.etapa);

    if (isText && ["oi", "menu", "inicio", "início"].includes(text)) {
      console.log("🔄 RESETANDO USUÁRIO");

      const updated = await updateUser(user.id, {
        etapa: "onboarding",
        tipo: "usuario",
        nome: null,
        cidade: null,
      });

      if (!updated) return;

      return sendWelcome(phone);
    }

    const { data: freshUser, error: freshUserError } = await supabase
      .from("usuarios")
      .select("*")
      .eq("id", user.id)
      .single();

    if (freshUserError) {
      console.error("❌ erro ao recarregar usuário:", freshUserError);
      return;
    }

    user = freshUser;

    switch (user.etapa) {
      case "onboarding": {
        if (!["emprego", "empresa", "profissional"].includes(text)) {
          return sendWelcome(phone);
        }

        let tipo = "usuario";
        if (text === "empresa") tipo = "empresa";
        if (text === "profissional") tipo = "profissional";

        const updated = await updateUser(user.id, {
          tipo,
          etapa: "cadastro_nome",
        });

        if (!updated) return;

        return sendText(phone, "Qual seu nome?");
      }

      case "cadastro_nome": {
        if (!text || text.length < 3) {
          return sendText(phone, "Digite seu nome:");
        }

        const updated = await updateUser(user.id, {
          nome: text,
          etapa: "cadastro_cidade",
        });

        if (!updated) return;

        return sendText(phone, "Qual sua cidade?");
      }

      case "cadastro_cidade": {
        if (!text || text.length < 3) {
          return sendText(phone, "Digite uma cidade válida:");
        }

        const updated = await updateUser(user.id, {
          cidade: text,
          etapa: "menu",
        });

        if (!updated) return;

        return sendMenu(phone);
      }

      case "menu": {
        if (text === "ver_vagas") {
          const vagas = await getVagasForUser(user);

          if (!vagas || !vagas.length) {
            return sendText(phone, "Sem vagas no momento.");
          }

          let out = "💼 Vagas:\n";
          vagas.slice(0, 5).forEach((v) => {
            out += `\n• ${v.titulo} (${v.cidade || "Sem cidade"})`;
          });

          return sendText(phone, out);
        }

        if (text === "buscar_servico") {
          const updated = await updateUser(user.id, { etapa: "buscando_servico" });
          if (!updated) return;

          return sendText(phone, "Digite o serviço:");
        }

        if (text === "cadastrar_servico") {
          const updated = await updateUser(user.id, { etapa: "cadastro_servico" });
          if (!updated) return;

          return sendText(phone, "Nome do serviço:");
        }

        if (text === "criar_vaga") {
          const updated = await updateUser(user.id, { etapa: "cadastro_vaga" });
          if (!updated) return;

          return sendText(phone, "Título da vaga:");
        }

        return sendMenu(phone);
      }

      case "buscando_servico": {
        if (!text || text.length < 2) {
          return sendText(phone, "Digite o serviço que deseja buscar:");
        }

        const servicos = await getServicos(text, user);

        await updateUser(user.id, { etapa: "menu" });

        if (!servicos || !servicos.length) {
          return sendText(phone, "Nada encontrado.");
        }

        let lista = "🧑‍🔧 Profissionais:\n";
        servicos.slice(0, 5).forEach((s) => {
          lista += `\n• ${s.titulo} - ${s.cidade || "Sem cidade"}`;
        });

        return sendText(phone, lista);
      }

      case "cadastro_servico": {
        if (!text || text.length < 3) {
          return sendText(phone, "Nome do serviço:");
        }

        const { error: serviceError } = await supabase.from("servicos").insert({
          usuario_id: user.id,
          titulo: text,
          ativo: true,
          cidade: user.cidade || null,
          estado: user.estado || null,
        });

        if (serviceError) {
          console.error("❌ erro ao cadastrar serviço:", serviceError);
          return sendText(phone, "Erro ao cadastrar serviço.");
        }

        await updateUser(user.id, { etapa: "menu" });

        return sendText(phone, "✅ Serviço cadastrado!");
      }

      case "cadastro_vaga": {
        if (!text || text.length < 3) {
          return sendText(phone, "Título da vaga:");
        }

        const { error: vagaError } = await supabase.from("vagas").insert({
          empresa_id: user.id,
          titulo: text,
          status: "aberta",
          cidade: user.cidade || null,
          estado: user.estado || null,
        });

        if (vagaError) {
          console.error("❌ erro ao criar vaga:", vagaError);
          return sendText(phone, "Erro ao criar vaga.");
        }

        await updateUser(user.id, { etapa: "menu" });

        return sendText(phone, "✅ Vaga criada!");
      }

      default: {
        const updated = await updateUser(user.id, {
          etapa: "onboarding",
          tipo: "usuario",
        });

        if (!updated) return;

        return sendWelcome(phone);
      }
    }
  } catch (err) {
    console.error("❌ ERRO GERAL:", err);
    return sendText(phone, "Ocorreu um erro ao processar sua mensagem.");
  } finally {
    processingUsers.delete(phone);
  }
}

async function updateUser(userId, data) {
  const { data: updated, error } = await supabase
    .from("usuarios")
    .update(data)
    .eq("id", userId)
    .select()
    .single();

  if (error) {
    console.error("❌ erro ao atualizar usuário:", error);
    return null;
  }

  console.log("✅ usuário atualizado:", updated);
  return updated;
}

function sendWelcome(phone) {
  return sendButtons(
    phone,
    `👋 Bem-vindo ao seu hub de oportunidades locais.

Como você quer usar?`,
    [
      { id: "emprego", title: "Procurar emprego" },
      { id: "empresa", title: "Sou empresa" },
      { id: "profissional", title: "Oferecer serviços" },
    ]
  );
}

function sendMenu(phone) {
  return sendList(phone, "Menu principal:", [
    {
      title: "Empregos",
      rows: [{ id: "ver_vagas", title: "Ver vagas" }],
    },
    {
      title: "Serviços",
      rows: [
        { id: "buscar_servico", title: "Buscar serviço" },
        { id: "cadastrar_servico", title: "Cadastrar serviço" },
      ],
    },
    {
      title: "Empresa",
      rows: [{ id: "criar_vaga", title: "Criar vaga" }],
    },
  ]);
}