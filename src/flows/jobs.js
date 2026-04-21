import { sendText } from "../services/whatsapp.js";

export async function handleJobsMenu(user, text, phone) {
  if (text === "user_ver_vagas") {
    // MOCK (v1)
    const vagas = [
      { titulo: "Vendedor", cidade: user.cidade },
      { titulo: "Atendente", cidade: user.cidade },
      { titulo: "Auxiliar", cidade: user.cidade },
      { titulo: "Caixa", cidade: user.cidade },
      { titulo: "Repositor", cidade: user.cidade },
    ];

    let preview = "🔎 Encontramos 5 vagas na sua área 👇\n";
    vagas.slice(0, 3).forEach(v => {
      preview += `\n• ${v.titulo} - ${v.cidade}`;
    });

    preview += `\n\n🔒 Para ver todas e acessar contatos:\n👉 R$ 4,90`;

    return sendText(phone, preview);
  }

  return false;
}