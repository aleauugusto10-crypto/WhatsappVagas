import { sendButtons, sendList } from "../services/whatsapp.js";

export function sendRootMenu(phone) {
  return sendButtons(
    phone,
    "👋 Bem-vindo!\n\nComo você quer usar o app?",
    [
      { id: "root_trabalhar", title: "Quero trabalhar" },
      { id: "root_contratar", title: "Preciso de alguém" },
      { id: "root_empresa", title: "Sou empresa" },
    ]
  );
}

export function sendMenuUsuario(phone) {
  return sendList(phone, "💼 Oportunidades:", [
    {
      title: "Trabalho",
      rows: [
        { id: "user_ver_vagas", title: "Ver vagas" },
        { id: "user_ver_missoes", title: "Ver bicos / missões" },
      ],
    },
    {
      title: "Configurações",
      rows: [
        { id: "user_config_interesses", title: "Configurar interesses" },
      ],
    },
  ]);
}

export function sendMenuContratante(phone) {
  return sendList(phone, "🛠️ O que você precisa?", [
    {
      title: "Serviços",
      rows: [
        { id: "contratar_buscar_prof", title: "Buscar profissionais" },
        { id: "contratar_criar_missao", title: "Criar missão (bico)" },
      ],
    },
  ]);
}

export function sendMenuEmpresa(phone) {
  return sendList(phone, "🏢 Área da empresa:", [
    {
      title: "Vagas",
      rows: [
        { id: "empresa_criar_vaga", title: "Criar vaga" },
        { id: "empresa_buscar_prof", title: "Buscar profissionais" },
      ],
    },
  ]);
}