import { supabase } from "./supabase.js";
import { sendText, sendButtons, sendList } from "./services/whatsapp.js";
import { getVagasForUser } from "./modules/vagas.js";
import { getServicos } from "./modules/servicos.js";

// 🔒 anti duplicação simples em memória
const processed = new Set();

export async function handleMessage(msg){
  try {

    // 🔥 IGNORAR STATUS / EVENTOS SEM TEXTO
    if (!msg || !msg.from) return;

    if (processed.has(msg.id)) {
      console.log("🔁 duplicado ignorado:", msg.id);
      return;
    }

    processed.add(msg.id);
    setTimeout(() => processed.delete(msg.id), 30000);

    const phone = msg.from;

    // 🔥 PRIORIDADE CORRETA
    const text =
      msg.interactive?.button_reply?.id ||
      msg.interactive?.list_reply?.id ||
      msg.text?.body?.toLowerCase().trim() ||
      "";

    const isText = msg.type === "text";

    console.log("📱 telefone:", phone);
    console.log("💬 texto:", text);
    console.log("📦 tipo:", msg.type);

    if (!text) {
      console.log("⚠️ mensagem vazia ignorada");
      return;
    }

    // 🔥 BUSCAR USUÁRIO
    let { data: user } = await supabase
      .from("usuarios")
      .select("*")
      .eq("telefone", phone)
      .maybeSingle();

    // 🟡 NOVO USUÁRIO
    if(!user){
      const { data: newUser } = await supabase
        .from("usuarios")
        .insert({
          telefone: phone,
          etapa: "onboarding",
          ativo: true
        })
        .select()
        .single();

      return sendWelcome(phone);
    }

    // 🔥 RESET CONTROLADO (SÓ TEXTO REAL)
    if (isText && ["oi", "menu", "inicio"].includes(text)) {
      console.log("🔄 resetando usuário");

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

    // 🔁 FLUXO PRINCIPAL
    switch(user.etapa){

      // 🟢 ONBOARDING
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

        user.etapa = "cadastro_nome";

        return sendText(phone, "Qual seu nome?");


      // 🟢 NOME
      case "cadastro_nome":

        if(!text || text.length < 3){
          return sendText(phone, "Digite seu nome:");
        }

        await updateUser(user.id, {
          nome: text,
          etapa: "cadastro_cidade"
        });

        user.etapa = "cadastro_cidade";

        return sendText(phone, "Qual sua cidade?");


      // 🟢 CIDADE
      case "cadastro_cidade":

        if(!text || text.length < 3){
          return sendText(phone, "Digite uma cidade válida:");
        }

        await updateUser(user.id, {
          cidade: text,
          etapa: "menu"
        });

        user.etapa = "menu";

        return sendMenu(phone);


      // 🟢 MENU
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
          user.etapa = "buscando_servico";

          return sendText(phone, "Digite o serviço:");
        }

        if(text === "cadastrar_servico"){
          await updateUser(user.id, { etapa: "cadastro_servico" });
          user.etapa = "cadastro_servico";

          return sendText(phone, "Nome do serviço:");
        }

        if(text === "criar_vaga"){
          await updateUser(user.id, { etapa: "cadastro_vaga" });
          user.etapa = "cadastro_vaga";

          return sendText(phone, "Título da vaga:");
        }

        return sendMenu(phone);


      // 🟢 BUSCA
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


      // 🟢 CADASTRAR SERVIÇO
      case "cadastro_servico":

        await supabase.from("servicos").insert({
          usuario_id: user.id,
          titulo: text,
          ativo: true
        });

        await updateUser(user.id, { etapa: "menu" });
        user.etapa = "menu";

        return sendText(phone, "✅ Serviço cadastrado!");


      // 🟢 CADASTRAR VAGA
      case "cadastro_vaga":

        await supabase.from("vagas").insert({
          empresa_id: user.id,
          titulo: text,
          status: "aberta"
        });

        await updateUser(user.id, { etapa: "menu" });
        user.etapa = "menu";

        return sendText(phone, "✅ Vaga criada!");


      default:
        console.log("⚠️ etapa desconhecida:", user.etapa);
        return sendMenu(phone);
    }

  } catch (err) {
    console.error("❌ ERRO GERAL:", err);
  }
}


// ==========================
// 🔧 HELPERS
// ==========================

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
  return sendList(
    phone,
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