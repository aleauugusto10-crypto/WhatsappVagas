
import { getOrCreateUser } from "./modules/users.js";
import { sendMessage } from "./services/whatsapp.js";
import { getVagasForUser } from "./modules/vagas.js";
import { getServicos } from "./modules/servicos.js";

export async function handleMessage(msg){
  const phone = msg.from;
  const text = msg.text?.body || "";

  const user = await getOrCreateUser(phone);

  if(text === "1"){
    const vagas = await getVagasForUser(user);

    if(!vagas.length){
      return sendMessage(phone, "Sem vagas no momento.");
    }

    let out = "💼 Vagas próximas:\n";
    vagas.slice(0,5).forEach(v=>{
      out += `\n- ${v.titulo} (${v.cidade})`;
    });

    return sendMessage(phone, out);
  }

  if(text === "2"){
    return sendMessage(phone, "Digite o serviço (ex: pintor)");
  }

  const servicos = await getServicos(text, user);

  if(servicos.length){
    let out = "🧑‍🔧 Profissionais:\n";
    servicos.slice(0,5).forEach(s=>{
      out += `\n- ${s.titulo} - ${s.cidade}`;
    });

    return sendMessage(phone, out);
  }

  return sendMessage(phone, "Menu:\n1 Vagas\n2 Serviços");
}
