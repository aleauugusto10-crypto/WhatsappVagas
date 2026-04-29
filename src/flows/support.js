import { sendText } from "../services/whatsapp.js";
import { sendActionButtons } from "./menus.js";

const ADMIN_PHONE = process.env.ADMIN_PHONE;

// =====================
// HELPERS
// =====================

function getNomeUsuario(user) {
  return user?.nome || user?.nome_empresa || "Usuário não cadastrado";
}

function getCidadeEstado(user) {
  const cidade = user?.cidade || "Não informada";
  const estado = user?.estado ? `/${user.estado}` : "";
  return `${cidade}${estado}`;
}

async function salvarMensagem(supabase, atendimentoId, sender, mensagem) {
  if (!atendimentoId || !mensagem) return;

  try {
    await supabase.from("atendimento_mensagens").insert({
      atendimento_id: atendimentoId,
      sender,
      mensagem,
    });
  } catch (err) {
    console.error("❌ erro ao salvar mensagem do atendimento:", err);
  }
}

async function criarAtendimento(supabase, user, phone, assunto) {
  const { data, error } = await supabase
    .from("atendimentos")
    .insert({
      cliente_phone: phone,
      admin_phone: ADMIN_PHONE,
      nome: getNomeUsuario(user),
      assunto,
      status: "aguardando",
    })
    .select()
    .single();

  if (error) {
    console.error("❌ erro ao criar atendimento:", error);
    return null;
  }

  return data;
}

async function getAtendimentoCliente(supabase, phone) {
  const { data, error } = await supabase
    .from("atendimentos")
    .select("*")
    .eq("cliente_phone", phone)
    .in("status", ["aguardando", "ativo"])
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("❌ erro ao buscar atendimento do cliente:", error);
    return null;
  }

  return data;
}

async function getAtendimentoAtivoAdmin(supabase) {
  const { data, error } = await supabase
    .from("atendimentos")
    .select("*")
    .eq("admin_phone", ADMIN_PHONE)
    .eq("status", "ativo")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("❌ erro ao buscar atendimento ativo do admin:", error);
    return null;
  }

  return data;
}

async function getFila(supabase) {
  const { data, error } = await supabase
    .from("atendimentos")
    .select("*")
    .eq("status", "aguardando")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("❌ erro ao buscar fila:", error);
    return [];
  }

  return data || [];
}

async function ativarAtendimento(supabase, atendimentoId) {
  const { data, error } = await supabase
    .from("atendimentos")
    .update({
      status: "ativo",
      admin_phone: ADMIN_PHONE,
    })
    .eq("id", atendimentoId)
    .select()
    .single();

  if (error) {
    console.error("❌ erro ao ativar atendimento:", error);
    return null;
  }

  return data;
}

async function finalizarAtendimento(supabase, atendimentoId) {
  const { data, error } = await supabase
    .from("atendimentos")
    .update({
      status: "finalizado",
    })
    .eq("id", atendimentoId)
    .select()
    .single();

  if (error) {
    console.error("❌ erro ao finalizar atendimento:", error);
    return null;
  }

  return data;
}

async function tentarChamarProximoDaFila(supabase) {
  const adminOcupado = await getAtendimentoAtivoAdmin(supabase);
  if (adminOcupado) return true;

  const fila = await getFila(supabase);
  if (!fila.length) return true;

  const proximo = fila[0];
  const atendimentoAtivo = await ativarAtendimento(supabase, proximo.id);

  if (!atendimentoAtivo) return false;

  await sendText(
    ADMIN_PHONE,
    `🚨 *Próximo atendimento da fila*\n\n` +
      `👤 Nome: ${atendimentoAtivo.nome || "Não informado"}\n` +
      `📱 WhatsApp: ${atendimentoAtivo.cliente_phone}\n\n` +
      `💬 Assunto:\n${atendimentoAtivo.assunto || "Não informado"}`
  );

  await sendActionButtons(
    ADMIN_PHONE,
    "Você está conectado a esse atendimento.",
    [{ id: "admin_finalizar_atendimento", title: "Finalizar" }]
  );

  await sendText(
    atendimentoAtivo.cliente_phone,
    "👤 Chegou sua vez!\n\n" +
      "Você foi conectado a um atendente.\n" +
      "Agora é só enviar sua mensagem normalmente 👍"
  );

  return true;
}

async function abrirAtendimento({ supabase, user, phone, assunto, updateUser }) {
  const existente = await getAtendimentoCliente(supabase, phone);

  if (existente) {
    if (existente.status === "ativo") {
      return sendText(
        phone,
        "👤 Você já está conectado a um atendente.\n\nPode enviar sua mensagem por aqui."
      );
    }

    const filaAtual = await getFila(supabase);
    const posicao = filaAtual.findIndex((a) => a.id === existente.id);

    return sendText(
      phone,
      `⏳ Você já está na fila de atendimento.\n\n` +
        `📌 Pessoas na sua frente: ${Math.max(0, posicao)}\n\n` +
        `Assim que possível vamos te chamar por aqui.`
    );
  }

  const atendimento = await criarAtendimento(supabase, user, phone, assunto);

  if (!atendimento) {
    return sendText(
      phone,
      "Não consegui abrir seu atendimento agora. Tente novamente em instantes."
    );
  }

  await salvarMensagem(supabase, atendimento.id, "cliente", assunto);

  const adminOcupado = await getAtendimentoAtivoAdmin(supabase);

  if (adminOcupado) {
    const filaAtual = await getFila(supabase);
    const posicao = filaAtual.findIndex((a) => a.id === atendimento.id);

    await updateUser({
      etapa: "suporte_fila",
    });

    return sendText(
      phone,
      `⏳ No momento o atendente está em outro atendimento.\n\n` +
        `Você entrou na fila.\n` +
        `📌 Pessoas na sua frente: ${Math.max(0, posicao)}\n\n` +
        `Assim que chegar sua vez, você será atendido aqui mesmo 👍`
    );
  }

  const atendimentoAtivo = await ativarAtendimento(supabase, atendimento.id);

  if (!atendimentoAtivo) {
    return sendText(
      phone,
      "Seu atendimento foi registrado, mas não consegui conectar agora. Aguarde um momento."
    );
  }

  await updateUser({
    etapa: "suporte_em_atendimento",
  });

  await sendText(
    ADMIN_PHONE,
    `🚨 *Novo atendimento solicitado*\n\n` +
      `👤 Nome: ${getNomeUsuario(user)}\n` +
      `📱 WhatsApp: ${phone}\n` +
      `🏙️ Cidade: ${getCidadeEstado(user)}\n` +
      `🧾 Tipo: ${user?.tipo || "Não informado"}\n\n` +
      `💬 Assunto:\n${assunto}`
  );

  await sendActionButtons(
    ADMIN_PHONE,
    "Você está conectado a esse atendimento.",
    [{ id: "admin_finalizar_atendimento", title: "Finalizar" }]
  );

  return sendText(
    phone,
    "✅ Solicitação enviada.\n\n" +
      "👤 Você foi conectado a um atendente.\n" +
      "Agora é só enviar sua mensagem normalmente 👍"
  );
}

// =====================
// HANDLE PRINCIPAL
// =====================

export async function handleSupport({
  user,
  text,
  phone,
  updateUser,
  supabase,
}) {
  if (!supabase) {
    console.error("❌ handleSupport chamado sem supabase");
    return false;
  }

  if (!ADMIN_PHONE) {
    console.error("❌ ADMIN_PHONE não configurado no .env");
    return false;
  }

  // =====================
  // ADMIN RESPONDENDO
  // =====================

  if (phone === ADMIN_PHONE) {
    const atendimentoAdmin = await getAtendimentoAtivoAdmin(supabase);

    if (!atendimentoAdmin) return false;

    if (text === "admin_finalizar_atendimento") {
      await finalizarAtendimento(supabase, atendimentoAdmin.id);

      await sendText(
        atendimentoAdmin.cliente_phone,
        "✅ Atendimento finalizado.\n\nObrigado por falar com o RendaJá."
      );

      await sendText(ADMIN_PHONE, "✅ Atendimento finalizado.");

      await tentarChamarProximoDaFila(supabase);

      return true;
    }

    await salvarMensagem(supabase, atendimentoAdmin.id, "admin", text);

    await sendText(atendimentoAdmin.cliente_phone, text);

    return true;
  }

  // =====================
  // CLIENTE JÁ EM ATENDIMENTO/FILA
  // =====================

  const atendimentoCliente = await getAtendimentoCliente(supabase, phone);

  if (atendimentoCliente) {
    if (atendimentoCliente.status === "ativo") {
      await salvarMensagem(supabase, atendimentoCliente.id, "cliente", text);

      await sendText(
        ADMIN_PHONE,
        `💬 *Mensagem do usuário:*\n\n` +
          `👤 ${atendimentoCliente.nome || getNomeUsuario(user)}\n` +
          `📱 ${phone}\n\n` +
          `${text}`
      );

      return true;
    }

    if (atendimentoCliente.status === "aguardando") {
      const filaAtual = await getFila(supabase);
      const posicao = filaAtual.findIndex((a) => a.id === atendimentoCliente.id);

      return sendText(
        phone,
        `⏳ Você já está na fila de atendimento.\n\n` +
          `📌 Pessoas na sua frente: ${Math.max(0, posicao)}\n\n` +
          `Assim que possível vamos te chamar por aqui.`
      );
    }
  }

  // =====================
  // MENU DO SUPORTE
  // =====================

  if (
  user.etapa === "suporte_menu" ||
  ["suporte_termos", "suporte_regras", "suporte_atendente"].includes(text)
) {
   if (text === "suporte_termos") {
  return sendText(
    phone,
    "📄 *Termos de uso - RendaJá*\n\n" +
    "O RendaJá é uma plataforma que conecta pessoas para oportunidades, serviços e missões.\n\n" +

    "📌 *Sobre o uso:*\n" +
    "• O usuário deve fornecer informações verdadeiras\n" +
    "• Cada pessoa pode ter apenas uma conta\n" +
    "• O CPF é usado para segurança e prevenção de fraudes\n\n" +

    "💸 *Sobre pagamentos:*\n" +
    "• O RendaJá não garante acordos entre usuários\n" +
    "• A responsabilidade pelos serviços é dos envolvidos\n\n" +

    "⚠️ *Responsabilidade:*\n" +
    "• Não nos responsabilizamos por negociações externas\n" +
    "• Evite pagamentos fora da plataforma\n\n" +

    "🔒 *Privacidade:*\n" +
    "• Seus dados não são compartilhados com terceiros\n" +
    "• Usamos informações apenas para funcionamento do sistema\n\n" +

    "🚫 *Penalidades:*\n" +
    "Contas podem ser bloqueadas em caso de:\n" +
    "• Fraude\n" +
    "• Informações falsas\n" +
    "• Uso indevido da plataforma"
  );
}
if (text === "suporte_regras") {
  return sendText(
    phone,
    "📌 *Regras da plataforma*\n\n" +

    "✔️ *Permitido:*\n" +
    "• Publicar vagas reais\n" +
    "• Oferecer serviços legítimos\n" +
    "• Buscar renda de forma honesta\n\n" +

    "❌ *Proibido:*\n" +
    "• Vagas falsas ou enganosas\n" +
    "• Golpes ou promessas irreais\n" +
    "• Pedir dinheiro antecipado sem garantia\n" +
    "• Criar múltiplas contas\n\n" +

    "⚠️ *Importante:*\n" +
    "• Sempre verifique antes de aceitar uma proposta\n" +
    "• O RendaJá não intermedia pagamentos diretos entre usuários\n\n" +

    "🚨 *Denúncias:*\n" +
    "Comportamentos suspeitos podem ser reportados ao suporte\n\n" +

    "🔒 O descumprimento pode resultar em bloqueio da conta."
  );
}

    if (text === "suporte_atendente") {
      if (!user.nome && !user.nome_empresa) {
        await updateUser({
          etapa: "suporte_nome",
        });

        return sendText(
          phone,
          "👤 Antes de chamar um atendente, me diga seu nome:"
        );
      }

      await updateUser({
        etapa: "suporte_assunto",
      });

      return sendText(
        phone,
        "💬 Me diga rapidamente qual é sua dúvida.\n\n" +
          "Ex: problema com cadastro, vaga, pagamento..."
      );
    }

    return false;
  }

  // =====================
  // PEGAR NOME ANTES DO SUPORTE
  // =====================

  if (user.etapa === "suporte_nome") {
    if (!text || text.length < 2) {
      return sendText(phone, "Digite seu nome para continuar:");
    }

    await updateUser({
      nome: text,
      etapa: "suporte_assunto",
    });

    return sendText(
      phone,
      "💬 Agora me diga rapidamente qual é sua dúvida.\n\n" +
        "Ex: problema com cadastro, vaga, pagamento..."
    );
  }

  // =====================
  // PEGAR ASSUNTO E ABRIR ATENDIMENTO
  // =====================

  if (user.etapa === "suporte_assunto") {
    if (!text || text.length < 3) {
      return sendText(
        phone,
        "Me diga um pouco melhor o assunto do atendimento:"
      );
    }

    return abrirAtendimento({
      supabase,
      user,
      phone,
      assunto: text,
      updateUser,
    });
  }

  return false;
}