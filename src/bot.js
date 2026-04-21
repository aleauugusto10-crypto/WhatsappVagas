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

    console.log("📱 telefone:", phone);
    console.log("💬 texto:", text);

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

      return sendButtons(phone,
`👋 Bem-vindo ao seu hub de oportunidades locais.

Como você quer usar?`,
      [
        { id: "emprego", title: "Procurar emprego" },
        { id: "empresa", title: "Sou empresa" },
        { id: "profissional", title: "Oferecer serviços" }
      ]);
    }

    // 🔥 RESET CONTROLADO (SÓ NO MENU)
    if (["oi", "menu", "inicio"].includes(text)) {
  console.log("🔄 resetando fluxo do usuário");

  await supabase
    .from("usuarios")
    .update({
      etapa: "onboarding",
      tipo: null,
      nome: null,
      cidade: null
    })
    .eq("id", user.id);

  return sendButtons(phone,
`👋 Vamos começar do zero.

Como você quer usar?`,
  [
    { id: "emprego", title: "Procurar emprego" },
    { id: "empresa", title: "Sou empresa" },
    { id: "profissional", title: "Oferecer serviços" }
  ]);
}

    // 🔁 FLUXO
    switch(user.etapa){

      // 🟢 ONBOARDING
      case "onboarding":

  if(!["emprego","empresa","profissional"].includes(text)){
    return sendButtons(phone,
      "Escolha uma opção 👇",
      [
        { id: "emprego", title: "Procurar emprego" },
        { id: "empresa", title: "Sou empresa" },
        { id: "profissional", title: "Oferecer serviços" }
      ]
    );
  }

  let tipo = "usuario";
  if(text === "empresa") tipo = "empresa";
  if(text === "profissional") tipo = "profissional";

  await supabase
    .from("usuarios")
    .update({
      tipo,
      etapa: "cadastro_nome"
    })
    .eq("id", user.id);

  user.etapa = "cadastro_nome"; // 🔥 CRÍTICO

  return sendText(phone, "Qual seu nome?");

      // 🟢 NOME
      case "cadastro_nome":

        if(!text || text.length < 3){
          return sendText(phone, "Digite seu nome:");
        }

        await supabase
          .from("usuarios")
          .update({
            nome: text,
            etapa: "cadastro_cidade"
          })
          .eq("id", user.id);

        return sendText(phone, "Qual sua cidade?");

      // 🟢 CIDADE
      case "cadastro_cidade":

        if(!text || text.length < 3){
          return sendText(phone, "Digite uma cidade válida:");
        }

        await supabase
          .from("usuarios")
          .update({
            cidade: text,
            etapa: "menu"
          })
          .eq("id", user.id);

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
          await updateEtapa(user.id, "buscando_servico");
          return sendText(phone, "Digite o serviço:");
        }

        if(text === "cadastrar_servico"){
          await updateEtapa(user.id, "cadastro_servico");
          return sendText(phone, "Nome do serviço:");
        }

        if(text === "criar_vaga"){
          await updateEtapa(user.id, "cadastro_vaga");
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

        await updateEtapa(user.id, "menu");
        return sendText(phone, "✅ Serviço cadastrado!");

      // 🟢 CADASTRAR VAGA
      case "cadastro_vaga":

        await supabase.from("vagas").insert({
          empresa_id: user.id,
          titulo: text,
          status: "aberta"
        });

        await updateEtapa(user.id, "menu");
        return sendText(phone, "✅ Vaga criada!");

      default:
        return sendMenu(phone);
    }

  } catch (err) {
    console.error("❌ ERRO GERAL:", err);
  }
}

// 🔧 HELPERS

async function updateEtapa(userId, etapa){
  await supabase
    .from("usuarios")
    .update({ etapa })
    .eq("id", userId);
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