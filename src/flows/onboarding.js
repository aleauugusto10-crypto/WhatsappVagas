import { sendText, sendList } from "../services/whatsapp.js";
import { AREAS, CATEGORIES } from "../lib/categories.js";

export async function onboardingStart(phone, updateUser) {
  await updateUser({ etapa: "onb_tipo" });
  return sendText(phone, "Você quer:\n\n1) Trabalhar / ganhar dinheiro\n2) Preciso de alguém\n3) Sou empresa\n\n(Use os botões acima 👆)");
}

export async function onboardingHandle(user, text, phone, updateUser) {
  switch (user.etapa) {
    case "onb_tipo": {
      if (text === "root_trabalhar") {
        await updateUser({ tipo: "usuario", etapa: "onb_nome" });
        return sendText(phone, "Qual seu nome?");
      }
      if (text === "root_contratar") {
        await updateUser({ tipo: "contratante", etapa: "onb_nome" });
        return sendText(phone, "Qual seu nome?");
      }
      if (text === "root_empresa") {
        await updateUser({ tipo: "empresa", etapa: "onb_nome" });
        return sendText(phone, "Qual seu nome?");
      }
      return false;
    }

    case "onb_nome": {
      if (!text || text.length < 3) {
        return sendText(phone, "Digite seu nome:");
      }
      await updateUser({ nome: text, etapa: "onb_cidade" });
      return sendText(phone, "Qual sua cidade?");
    }

    case "onb_cidade": {
      if (!text || text.length < 3) {
        return sendText(phone, "Digite uma cidade válida:");
      }
      await updateUser({ cidade: text, etapa: "onb_area" });
      return sendList(
        phone,
        "Escolha a área principal:",
        [{ title: "Áreas", rows: AREAS.map(a => ({ id: `area_${a.id}`, title: a.title })) }]
      );
    }

    case "onb_area": {
      if (!text.startsWith("area_")) return false;
      const area = text.replace("area_", "");
      await updateUser({ area_principal: area, etapa: "onb_categoria" });

      const cats = CATEGORIES[area] || [];
      return sendList(
        phone,
        "Escolha a categoria mais próxima:",
        [{ title: "Categorias", rows: cats.map(c => ({ id: `cat_${c.id}`, title: c.title })) }]
      );
    }

    case "onb_categoria": {
      if (!text.startsWith("cat_")) return false;
      const categoria = text.replace("cat_", "");
      await updateUser({ categoria_principal: categoria, etapa: "onb_raio" });

      return sendList(
        phone,
        "Até quantos km você aceita?",
        [{
          title: "Raio",
          rows: [3,5,10,20,50].map(km => ({ id: `raio_${km}`, title: `${km} km` }))
        }]
      );
    }

    case "onb_raio": {
      if (!text.startsWith("raio_")) return false;
      const km = parseInt(text.replace("raio_", ""), 10);
      await updateUser({ raio_km: km, etapa: "menu" });
      return "DONE"; // sinal para abrir menu correto
    }

    default:
      return false;
  }
}