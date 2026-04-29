export const mockJobs = [
  { id: "vaga_1", titulo: "Vendedor Externo", nome_empresa: "JRVP Proteção Veicular", cidade: "Itabaiana", estado: "SE", salario: "A combinar", tipo_contratacao: "comissao", descricao: "Atendimento, prospecção e vendas externas.", status: "ativa" },
  { id: "vaga_2", titulo: "Atendente", nome_empresa: "Comércio Local", cidade: "Aracaju", estado: "SE", salario: "R$ 1.500", tipo_contratacao: "clt", descricao: "Atendimento ao cliente e organização do ambiente.", status: "ativa" },
  { id: "vaga_3", titulo: "Designer para Redes Sociais", nome_empresa: "Agência Parceira", cidade: "Remoto", estado: "BR", salario: "Por projeto", tipo_contratacao: "freelance", descricao: "Criação de artes para Instagram, stories e campanhas.", status: "ativa" },
];

export const mockProfessionals = [
  { id: "prof_1", titulo: "Desenvolvedor de Apps para Empresas e Negócios", descricao: "Especialista em automação de WhatsApp, sistemas web e aplicativos sob medida.", cidade: "Itabaiana", estado: "SE", contato_whatsapp: "5579998192216", usuarios: { nome: "Alexandre Augusto" }, ativo: true },
  { id: "prof_2", titulo: "Social Media", descricao: "Gestão de conteúdo, calendário editorial e campanhas para Instagram.", cidade: "Aracaju", estado: "SE", contato_whatsapp: "5579999033717", usuarios: { nome: "Maria Eduarda" }, ativo: true },
  { id: "prof_3", titulo: "Eletricista Residencial", descricao: "Instalações, tomadas, chuveiros e manutenção elétrica.", cidade: "Itabaiana", estado: "SE", contato_whatsapp: "5579999033717", usuarios: { nome: "João Pedro" }, ativo: true },
];

export const mockMissions = [
  { id: "missao_1", titulo: "Divulgar vídeo no Instagram", descricao: "Curtir, comentar e compartilhar o último vídeo da empresa.", cidade: "Itabaiana", estado: "SE", tipo: "campanha", valor_total: 100, valor_por_pessoa: 10, vagas_total: 10, vagas_ocupadas: 2, status: "aberta" },
  { id: "missao_2", titulo: "Entregar panfletos no centro", descricao: "Retirar material e entregar em pontos próximos ao comércio.", cidade: "Aracaju", estado: "SE", tipo: "individual", valor_total: 35, valor_por_pessoa: 35, vagas_total: 1, vagas_ocupadas: 0, status: "aberta" },
  { id: "missao_3", titulo: "Avaliar atendimento de uma loja", descricao: "Visitar o local, observar atendimento e enviar feedback.", cidade: "Estância", estado: "SE", tipo: "individual", valor_total: 20, valor_por_pessoa: 20, vagas_total: 1, vagas_ocupadas: 0, status: "aberta" },
];

export const mockPlans = [
  { id: "plano_1", nome: "Alertas de vagas", codigo: "alerta_mensal_usuario", valor: 9.9, descricao: "Receba notificações quando surgirem vagas na sua área.", tipo: "usuario" },
  { id: "plano_2", nome: "Destaque profissional", codigo: "profissional_destaque_7d", valor: 9.9, descricao: "Apareça com mais visibilidade nas buscas.", tipo: "profissional" },
  { id: "plano_3", nome: "Destaque de vaga", codigo: "empresa_destaque_vaga", valor: 4.9, descricao: "Dê mais alcance para uma vaga publicada.", tipo: "empresa" },
];
