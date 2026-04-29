import { sendText } from "../services/whatsapp.js";
import { sendActionButtons } from "./menus.js";

const ADMIN_PHONE = process.env.ADMIN_PHONE;
const ADMIN_NAME = process.env.ADMIN_NAME || "Alexandre";

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

  await supabase.from("atendimento_mensagens").insert({
    atendimento_id: atendimentoId,
    sender,
    mensagem,
  });
}

async function getAtendimentoCliente(supabase, phone) {
  const { data } = await supabase
    .from("atendimentos")
    .select("*")
    .eq("cliente_phone", phone)
    .in("status", ["aguardando", "ativo"])
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return data || null;
}

async function getAtendimentoAtivoAdmin(supabase) {
  const { data } = await supabase
    .from("atendimentos")
    .select("*")
    .eq("admin_phone", ADMIN_PHONE)
    .eq("status", "ativo")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return data || null;
}

async function getFila(supabase) {
  const { data } = await supabase
    .from("atendimentos")
    .select("*")
    .eq("status", "aguardando")
    .order("created_at", { ascending: true });

  return data || [];
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
  const { data } = await supabase
    .from("atendimentos")
    .update({ status: "finalizado" })
    .eq("id", atendimentoId)
    .select()
    .single();

  return data || null;
}

async function recusarAtendimento(supabase, atendimentoId) {
  const { data } = await supabase
    .from("atendimentos")
    .update({ status: "recusado" })
    .eq("id", atendimentoId)
    .select()
    .single();

  return data || null;
}

async function notificarAdminNovoAtendimento({ supabase, user, phone, atendimento }) {
  const adminOcupado = await getAtendimentoAtivoAdmin(supabase);
  const fila = await getFila(supabase);
  const posicao = fila.findIndex((a) => a.id === atendimento.id);

  await sendText(
    ADMIN_PHONE,
    `🛟 *Novo pedido de suporte*\n\n` +
      `👤 Nome: ${getNomeUsuario(user)}\n` +
      `📱 WhatsApp: ${phone}\n` +
      `🏙️ Cidade: ${getCidadeEstado(user)}\n` +
      `🧾 Tipo: ${user?.tipo || "Não informado"}\n\n` +
      `💬 Assunto:\n${atendimento.assunto}\n\n` +
      `📌 Status: ${adminOcupado ? `Na fila (${Math.max(0, posicao)} na frente)` : "Aguardando você iniciar"}`
  );

  return sendActionButtons(
    ADMIN_PHONE,
    "O que deseja fazer?",
    [
      { id: `support_accept_${atendimento.id}`, title: "Iniciar" },
      { id: `support_refuse_${atendimento.id}`, title: "Recusar" },
    ]
  );
}

async function chamarProximoDaFila(supabase) {
  const fila = await getFila(supabase);
  if (!fila.length) return true;

  const proximo = fila[0];

  await sendText(
    ADMIN_PHONE,
    `📌 *Próximo da fila*\n\n` +
      `👤 Nome: ${proximo.nome || "Não informado"}\n` +
      `📱 WhatsApp: ${proximo.cliente_phone}\n\n` +
      `💬 Assunto:\n${proximo.assunto || "Não informado"}`
  );

  return sendActionButtons(
    ADMIN_PHONE,
    "Deseja iniciar esse atendimento?",
    [
      { id: `support_accept_${proximo.id}`, title: "Iniciar" },
      { id: `support_refuse_${proximo.id}`, title: "Recusar" },
    ]
  );
}

async function abrirSolicitacao({ supabase, user, phone, assunto, updateUser }) {
  const existente = await getAtendimentoCliente(supabase, phone);

  if (existente) {
    if (existente.status === "ativo") {
      return sendText(
        phone,
        `👤 Você já está em atendimento com ${ADMIN_NAME}.\n\nPode enviar sua mensagem por aqui.`
      );
    }

    const fila = await getFila(supabase);
    const posicao = fila.findIndex((a) => a.id === existente.id);

    return sendText(
      phone,
      `⏳ Sua solicitação de suporte já está na fila.\n\n` +
        `📌 Pessoas na sua frente: ${Math.max(0, posicao)}\n\n` +
        `Assim que possível, vamos te chamar por aqui.`
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

  await updateUser({
    etapa: "suporte_aguardando",
  });

  await notificarAdminNovoAtendimento({
    supabase,
    user,
    phone,
    atendimento,
  });

  const adminOcupado = await getAtendimentoAtivoAdmin(supabase);

  if (adminOcupado) {
    const fila = await getFila(supabase);
    const posicao = fila.findIndex((a) => a.id === atendimento.id);

    return sendText(
      phone,
      `⏳ Recebemos sua solicitação de suporte.\n\n` +
        `No momento o atendente está em outro atendimento.\n` +
        `📌 Pessoas na sua frente: ${Math.max(0, posicao)}\n\n` +
        `Assim que chegar sua vez, você será chamado aqui mesmo 👍`
    );
  }

  return sendText(
    phone,
    `✅ Recebemos sua solicitação de suporte.\n\n` +
      `Um atendente vai iniciar a conversa com você por aqui.\n` +
      `Pode aguardar rapidinho 👍`
  );
}

async function handleAdmin({ supabase, text }) {
  const atendimentoAtivo = await getAtendimentoAtivoAdmin(supabase);

  if (text.startsWith("support_accept_")) {
    const atendimentoId = text.replace("support_accept_", "");

    if (atendimentoAtivo) {
      return sendText(
        ADMIN_PHONE,
        "Você já está em um atendimento ativo. Finalize antes de iniciar outro."
      );
    }

    const atendimento = await ativarAtendimento(supabase, atendimentoId);

    if (!atendimento) {
      return sendText(ADMIN_PHONE, "Não consegui iniciar esse atendimento.");
    }

    await sendText(
      atendimento.cliente_phone,
      `👤 Olá! Aqui é ${ADMIN_NAME}, suporte do RendaJá.\n\n` +
        `Já estou com sua solicitação e vou te ajudar por aqui. Pode mandar sua mensagem 👍`
    );

    await sendActionButtons(
      ADMIN_PHONE,
      "Atendimento iniciado.",
      [{ id: "admin_finalizar_atendimento", title: "Finalizar" }]
    );

    return sendText(
      ADMIN_PHONE,
      `✅ Atendimento iniciado com ${atendimento.nome || "usuário"}.\n\n` +
        `Tudo que você enviar agora será encaminhado para ele.`
    );
  }

  if (text.startsWith("support_refuse_")) {
    const atendimentoId = text.replace("support_refuse_", "");
    const atendimento = await recusarAtendimento(supabase, atendimentoId);

    if (atendimento?.cliente_phone) {
      await sendText(
        atendimento.cliente_phone,
        "No momento não conseguimos iniciar o atendimento.\n\nDigite *suporte* para tentar novamente mais tarde."
      );
    }

    return sendText(ADMIN_PHONE, "Atendimento recusado.");
  }

  if (text === "admin_finalizar_atendimento") {
    if (!atendimentoAtivo) {
      return sendText(ADMIN_PHONE, "Você não tem atendimento ativo no momento.");
    }

    await finalizarAtendimento(supabase, atendimentoAtivo.id);

    await sendText(
      atendimentoAtivo.cliente_phone,
      `✅ Atendimento finalizado por ${ADMIN_NAME}.\n\nObrigado por falar com o RendaJá.`
    );

    await sendText(ADMIN_PHONE, "✅ Atendimento finalizado.");

    await chamarProximoDaFila(supabase);

    return true;
  }

  if (atendimentoAtivo) {
    await salvarMensagem(supabase, atendimentoAtivo.id, "admin", text);
    await sendText(atendimentoAtivo.cliente_phone, text);
    return true;
  }

  return false;
}

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

  // ATENDENTE
  if (phone === ADMIN_PHONE) {
    return handleAdmin({ supabase, text });
  }

  // TERMOS
  if (text === "suporte_termos") {
    return sendText(
      phone,
      "📄 *Termos de uso - RendaJá*\n\n" +
        "O RendaJá é uma plataforma que conecta pessoas para oportunidades, serviços e missões.\n\n" +
        "• O usuário deve fornecer informações verdadeiras\n" +
        "• Cada pessoa pode ter apenas uma conta\n" +
        "• O CPF é usado para segurança e prevenção de fraudes\n" +
        "• A responsabilidade pelos serviços é dos envolvidos\n" +
        "• Contas podem ser bloqueadas em caso de fraude, informações falsas ou uso indevido."
    );
  }

  // REGRAS
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
        "🚨 Comportamentos suspeitos podem ser reportados ao suporte."
    );
  }

  // PEDIR ATENDENTE
  if (text === "suporte_atendente") {
    if (!user.nome && !user.nome_empresa) {
      await updateUser({ etapa: "suporte_nome" });

      return sendText(
        phone,
        "👤 Antes de chamar um atendente, me diga seu nome:"
      );
    }

    await updateUser({ etapa: "suporte_assunto" });

    return sendText(
      phone,
      "💬 Me diga rapidamente qual é sua dúvida.\n\n" +
        "Ex: problema com cadastro, vaga, pagamento..."
    );
  }

  // CLIENTE EM ATENDIMENTO OU FILA
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
      const fila = await getFila(supabase);
      const posicao = fila.findIndex((a) => a.id === atendimentoCliente.id);

      return sendText(
        phone,
        `⏳ Sua solicitação está na fila.\n\n` +
          `📌 Pessoas na sua frente: ${Math.max(0, posicao)}\n\n` +
          `Assim que o atendimento começar, avisaremos por aqui.`
      );
    }
  }

  // PEGAR NOME
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

  // PEGAR ASSUNTO
  if (user.etapa === "suporte_assunto") {
    if (!text || text.length < 3) {
      return sendText(phone, "Me diga um pouco melhor o assunto:");
    }

    return abrirSolicitacao({
      supabase,
      user,
      phone,
      assunto: text,
      updateUser,
    });
  }

  return false;
}