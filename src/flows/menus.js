import { sendButtons, sendList } from "../services/whatsapp.js";

export function sendRootMenu(phone) {
  return sendButtons(
    phone,
    "🚀 Bem-vindo ao RendaJá!\n\n💸 Ganhe dinheiro, encontre profissionais\nou descubra oportunidades perto de você.\n\nAqui você pode:\n\n💰 Trabalhar\n\n🧑‍🔧 Contratar\n\n📢 Divulgar oportunidades\n\nComo você quer usar a plataforma?",
    [
      { id: "tipo_usuario", title: "Quero trabalhar" },
      { id: "tipo_contratante", title: "Buscar profissional" },
      { id: "tipo_empresa", title: "Sou empresa" },
    ]
  );
}

export function sendMenuUsuario(phone) {
  return sendList(phone, "💼 Menu do trabalhador:", [
    {
      title: "Buscar oportunidades",
      rows: [
        { id: "user_ver_vagas", title: "Ver vagas" },
        { id: "user_ver_missoes", title: "Ver bicos / missões" },
        { id: "jobs_pacotes", title: "Pacotes de notificações" },
      ],
    },
    {
      title: "Perfil profissional",
      rows: [
        { id: "prof_criar_perfil", title: "Criar perfil" },
        { id: "prof_ver_perfil", title: "Ver meu perfil" },
        { id: "prof_pacotes", title: "Pacotes de divulgação" },
      ],
    },
    {
      title: "Perfil",
      rows: [{ id: "redefinir_perfil", title: "Redefinir perfil" }],
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
        { id: "contratar_minhas_missoes", title: "Ver minhas missões" },
      ],
    },
    {
      title: "Perfil",
      rows: [{ id: "redefinir_perfil", title: "Redefinir perfil" }],
    },
  ]);
}

export function sendMenuEmpresa(phone) {
  return sendList(phone, "🏢 Menu da empresa:", [
    {
      title: "Empresa",
      rows: [
        { id: "empresa_criar_vaga", title: "Criar vaga" },
        { id: "empresa_pacotes", title: "Pacotes" },
        { id: "empresa_buscar_profissionais", title: "Buscar profissionais" },
        { id: "empresa_minhas_vagas", title: "Ver minhas vagas" },
      ],
    },
    {
      title: "Perfil",
      rows: [{ id: "redefinir_perfil", title: "Redefinir perfil" }],
    },
  ]);
}

export function sendActionButtons(phone, body, buttons) {
  return sendButtons(phone, body, buttons.slice(0, 3));
}