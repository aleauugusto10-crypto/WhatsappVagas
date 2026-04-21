import { sendButtons, sendList } from "../services/whatsapp.js";

export function sendRootMenu(phone) {
  return sendButtons(
    phone,
    "👋 Bem-vindo!\n\nComo você quer usar a plataforma?",
    [
      { id: "tipo_usuario", title: "Quero trabalhar" },
      { id: "tipo_contratante", title: "Preciso de alguém" },
      { id: "tipo_empresa", title: "Sou empresa" },
    ]
  );
}

export function sendMenuUsuario(phone) {
  return sendList(phone, "💼 Menu do trabalhador:", [
    {
      title: "Oportunidades",
      rows: [
        { id: "user_ver_vagas", title: "Ver vagas" },
        { id: "user_ver_missoes", title: "Ver bicos / missões" },
      ],
    },
    {
      title: "Perfil",
      rows: [
        { id: "user_redefinir_interesses", title: "Atualizar interesses" },
        { id: "redefinir_perfil", title: "Redefinir perfil" },
      ],
    },
  ]);
}

export function sendMenuContratante(phone) {
  return sendList(phone, "🛠️ Menu de contratação:", [
    {
      title: "Serviços",
      rows: [
        { id: "contratar_buscar_profissionais", title: "Buscar profissionais" },
        { id: "contratar_criar_missao", title: "Criar missão" },
      ],
    },
    {
      title: "Perfil",
      rows: [
        { id: "redefinir_perfil", title: "Redefinir perfil" },
      ],
    },
  ]);
}

export function sendMenuEmpresa(phone) {
  return sendList(phone, "🏢 Menu da empresa:", [
    {
      title: "Empresa",
      rows: [
        { id: "empresa_criar_vaga", title: "Criar vaga" },
        { id: "empresa_buscar_profissionais", title: "Buscar profissionais" },
        { id: "empresa_minhas_vagas", title: "Ver minhas vagas" },
      ],
    },
    {
      title: "Perfil",
      rows: [
        { id: "redefinir_perfil", title: "Redefinir perfil" },
      ],
    },
  ]);
}