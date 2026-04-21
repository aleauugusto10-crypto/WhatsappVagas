import { sendText } from "../services/whatsapp.js";

export async function handleServicesMenu(user, text, phone) {
  if (text === "contratar_buscar_prof") {
    return sendText(phone, "Digite o serviço que você precisa:\nEx: eletricista, faxina, frete...");
  }

  // aqui você conectaria com DB + categorias
  return false;
}