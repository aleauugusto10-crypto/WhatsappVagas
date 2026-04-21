import { supabase } from "./supabase.js";
import { sendText, sendButtons, sendList } from "./services/whatsapp.js";
import { getVagasForUser } from "./modules/vagas.js";
import { getServicos } from "./modules/servicos.js";

export async function handleMessage(msg){
  try {
    const phone = msg.from;

    const text =
      msg.text?.body?.toLowerCase().trim() ||
      msg.interactive?.button_reply?.id ||
      msg.interactive?.list_reply?.id ||
      "";

    console.log("📱 telefone:", phone);
    console.log("💬 texto:", text);

    // 🔥 CORREÇÃO CRÍTICA AQUI
    let { data: user, error } = await supabase
      .from("usuarios")
      .select("*")
      .eq("telefone", phone)
      .maybeSingle();

    if(error){
      console.error("❌ erro ao buscar usuário:", error);
      return;
    }

    // 🟡 NOVO USUÁRIO
    if(!user){
      console.log("🆕 criando novo usuário");

      const { data: newUser, error: insertError } = await supabase
        .from("usuarios")
        .insert({
          telefone: phone,
          etapa: "onboarding",
          ativo: true
        })
        .select()
        .single();

      if(insertError){
        console.error("❌ erro ao criar usuário:", insertError);
        return sendText(phone, "Erro ao iniciar cadastro.");
      }

      return sendButtons(phone,
`👋 Bem-vindo ao seu hub de oportunidades locais.

💼 Encontre empregos  
🧑‍🔧 Encontre ou divulgue serviços  
🏢 Empresas contratam rápido  

Como você quer usar?`,
      [
        { id: "emprego", title: "Procurar emprego" },
        { id: "empresa", title: "Sou empresa" },
        { id: "profissional", title: "Oferecer serviços" }
      ]);
    }

    // 🔁 FLUXO PRINCIPAL
    switch(user.etapa){

      case "onboarding":
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

        return sendText(phone, "Qual seu nome?");

      case "cadastro_nome":
        if(!text) return sendText(phone, "Digite seu nome:");

        await supabase
          .from("usuarios")
          .update({
            nome: text,
            etapa: "cadastro_cidade"
          })
          .eq("id", user.id);

        return sendText(phone, "Qual sua cidade?");

      case "cadastro_cidade":
        if(!text) return sendText(phone, "Digite sua cidade:");

        await supabase
          .from("usuarios")
          .update({
            cidade: text,
            etapa: "menu"
          })
          .eq("id", user.id);

        return sendList(phone,
          "✅ Cadastro concluído! Escolha uma opção:",
          [
            {
              title: "Empregos",
              rows: [
                { id: "ver_vagas", title: "Ver vagas disponíveis" }
              ]
            },
            {
              title: "Serviços",
              rows: [
                { id: "buscar_servico", title: "Buscar profissional" },
                { id: "cadastrar_servico", title: "Cadastrar meu serviço" }
              ]
            },
            {
              title: "Empresa",
              rows: [
                { id: "criar_vaga", title: "Publicar vaga" }
              ]
            }
          ]
        );

      case "menu":

        if(text === "ver_vagas"){
          const vagas = await getVagasForUser(user);

          if(!vagas.length){
            return sendText(phone, "Sem vagas no momento.");
          }

          let out = "💼 Vagas disponíveis:\n";
          vagas.slice(0,5).forEach(v=>{
            out += `\n• ${v.titulo} (${v.cidade})`;
          });

          return sendText(phone, out);
        }

        if(text === "buscar_servico"){
          await supabase
            .from("usuarios")
            .update({ etapa: "buscando_servico" })
            .eq("id", user.id);

          return sendText(phone, "Digite o serviço que procura:");
        }

        if(text === "cadastrar_servico"){
          await supabase
            .from("usuarios")
            .update({ etapa: "cadastro_servico_titulo" })
            .eq("id", user.id);

          return sendText(phone, "Qual o nome do seu serviço?");
        }

        if(text === "criar_vaga"){
          await supabase
            .from("usuarios")
            .update({ etapa: "cadastro_vaga_titulo" })
            .eq("id", user.id);

          return sendText(phone, "Qual o título da vaga?");
        }

        return sendList(phone,
          "Menu principal:",
          [
            {
              title: "Opções",
              rows: [
                { id: "ver_vagas", title: "Ver vagas" },
                { id: "buscar_servico", title: "Buscar serviço" },
                { id: "cadastrar_servico", title: "Cadastrar serviço" },
                { id: "criar_vaga", title: "Criar vaga" }
              ]
            }
          ]
        );

      case "buscando_servico":

        const servicos = await getServicos(text, user);

        if(!servicos.length){
          return sendText(phone, "Nenhum profissional encontrado.");
        }

        let out = "🧑‍🔧 Profissionais:\n";
        servicos.slice(0,5).forEach(s=>{
          out += `\n• ${s.titulo} - ${s.cidade}`;
        });

        return sendText(phone, out);

      case "cadastro_servico_titulo":

        await supabase.from("servicos").insert({
          usuario_id: user.id,
          titulo: text,
          ativo: true
        });

        await supabase
          .from("usuarios")
          .update({ etapa: "menu" })
          .eq("id", user.id);

        return sendText(phone, "✅ Serviço cadastrado!");

      case "cadastro_vaga_titulo":

        await supabase.from("vagas").insert({
          empresa_id: user.id,
          titulo: text,
          status: "aberta"
        });

        await supabase
          .from("usuarios")
          .update({ etapa: "menu" })
          .eq("id", user.id);

        return sendText(phone, "✅ Vaga criada!");

      default:
        console.log("⚠️ etapa desconhecida:", user.etapa);
        return sendText(phone, "Algo deu errado, vamos recomeçar.");
    }

  } catch (err) {
    console.error("❌ erro geral no bot:", err);
  }
}