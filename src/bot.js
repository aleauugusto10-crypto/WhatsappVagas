import { supabase } from "./supabase.js";
import { sendText, sendButtons, sendList } from "./services/whatsapp.js";
import { getVagasForUser } from "./modules/vagas.js";
import { getServicos } from "./modules/servicos.js";

export async function handleMessage(msg){
  try {

    const phone = msg.from;

    const text =
      msg.interactive?.button_reply?.id ||
      msg.interactive?.list_reply?.id ||
      msg.text?.body?.toLowerCase().trim() ||
      "";

    const isText = msg.type === "text";

    console.log("📱 telefone:", phone);
    console.log("💬 texto:", text);

    // 🔍 BUSCAR USUÁRIO
    let { data: user } = await supabase
      .from("usuarios")
      .select("*")
      .eq("telefone", phone)
      .maybeSingle();

    // 🆕 NOVO USUÁRIO
    if(!user){
      await supabase
        .from("usuarios")
        .insert({
          telefone: phone,
          etapa: "onboarding",
          ativo: true
        });

      return sendWelcome(phone);
    }

    // 🔥 RESET (SÓ TEXTO)
    if (isText && ["oi", "menu", "inicio"].includes(text)) {

      console.log("🔄 RESETANDO USUÁRIO");

      await supabase
        .from("usuarios")
        .update({
          etapa: "onboarding",
          tipo: null,
          nome: null,
          cidade: null
        })
        .eq("id", user.id);

      return sendWelcome(phone);
    }

    // 🔁 SEMPRE PEGAR ESTADO ATUALIZADO
    user = (await supabase
      .from("usuarios")
      .select("*")
      .eq("id", user.id)
      .single()).data;

    // 🔁 FLUXO
    switch(user.etapa){

      case "onboarding":

        if(!["emprego","empresa","profissional"].includes(text)){
          return sendWelcome(phone);
        }

        let tipo = "usuario";
        if(text === "empresa") tipo = "empresa";
        if(text === "profissional") tipo = "profissional";

        await updateUser(user.id, {
          tipo,
          etapa: "cadastro_nome"
        });

        return sendText(phone, "Qual seu nome?");

      case "cadastro_nome":

        if(!text || text.length < 3){
          return sendText(phone, "Digite seu nome:");
        }

        await updateUser(user.id, {
          nome: text,
          etapa: "cadastro_cidade"
        });

        return sendText(phone, "Qual sua cidade?");

      case "cadastro_cidade":

        if(!text || text.length < 3){
          return sendText(phone, "Digite uma cidade válida:");
        }

        await updateUser(user.id, {
          cidade: text,
          etapa: "menu"
        });

        return sendMenu(phone);

      case "menu":

        if(text === "ver_vagas"){
          const vagas = await getVagasForUser(user);

          if(!vagas.length){
            return sendText(phone, "Sem vagas no momento.");
          }

          let out = "💼 Vagas:\n";
          vagas.slice(0,5).forEach(v=>{
            out += `\n• ${v.titulo} (${v.cidade})`;
          });

          return sendText(phone, out);
        }

        if(text === "buscar_servico"){
          await updateUser(user.id, { etapa: "buscando_servico" });
          return sendText(phone, "Digite o serviço:");
        }

        if(text === "cadastrar_servico"){
          await updateUser(user.id, { etapa: "cadastro_servico" });
          return sendText(phone, "Nome do serviço:");
        }

        if(text === "criar_vaga"){
          await updateUser(user.id, { etapa: "cadastro_vaga" });
          return sendText(phone, "Título da vaga:");
        }

        return sendMenu(phone);

      case "buscando_servico":

        const servicos = await getServicos(text, user);

        if(!servicos.length){
          return sendText(phone, "Nada encontrado.");
        }

        let lista = "🧑‍🔧 Profissionais:\n";
        servicos.slice(0,5).forEach(s=>{
          lista += `\n• ${s.titulo} - ${s.cidade}`;
        });

        return sendText(phone, lista);

      case "cadastro_servico":

        await supabase.from("servicos").insert({
          usuario_id: user.id,
          titulo: text,
          ativo: true
        });

        await updateUser(user.id, { etapa: "menu" });

        return sendText(phone, "✅ Serviço cadastrado!");

      case "cadastro_vaga":

        await supabase.from("vagas").insert({
          empresa_id: user.id,
          titulo: text,
          status: "aberta"
        });

        await updateUser(user.id, { etapa: "menu" });

        return sendText(phone, "✅ Vaga criada!");

      default:
        return sendWelcome(phone);
    }

  } catch (err) {
    console.error("❌ ERRO GERAL:", err);
  }
}

// 🔧 HELPERS

async function updateUser(userId, data){
  await supabase
    .from("usuarios")
    .update(data)
    .eq("id", userId);
}

function sendWelcome(phone){
  return sendButtons(
    phone,
`👋 Bem-vindo ao seu hub de oportunidades locais.

Como você quer usar?`,
    [
      { id: "emprego", title: "Procurar emprego" },
      { id: "empresa", title: "Sou empresa" },
      { id: "profissional", title: "Oferecer serviços" }
    ]
  );
}

function sendMenu(phone){
  return sendList(phone,
    "Menu principal:",
    [
      {
        title: "Empregos",
        rows: [
          { id: "ver_vagas", title: "Ver vagas" }
        ]
      },
      {
        title: "Serviços",
        rows: [
          { id: "buscar_servico", title: "Buscar serviço" },
          { id: "cadastrar_servico", title: "Cadastrar serviço" }
        ]
      },
      {
        title: "Empresa",
        rows: [
          { id: "criar_vaga", title: "Criar vaga" }
        ]
      }
    ]
  );
}