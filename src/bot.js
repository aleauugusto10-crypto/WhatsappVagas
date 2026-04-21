import { supabase } from "./supabase.js";
import { sendText } from "./services/whatsapp.js";
import {
  sendRootMenu,
  sendMenuUsuario,
  sendMenuContratante,
  sendMenuEmpresa,
} from "./flows/menus.js";
import { handleOnboarding } from "./flows/onboarding.js";
import { handleJobsMenu, handleUserFallback } from "./flows/jobs.js";
import {
  handleServicesMenu,
  handleContratanteFallback,
} from "./flows/services.js";
import { handleMissions } from "./flows/missions.js";
import {
  handleCompanyMenu,
  handleCompanyFallback,
} from "./flows/company.js";

const processingUsers = new Set();

async function getCategorias(contexto) {
  const { data, error } = await supabase
    .from("categorias")
    .select("*")
    .eq("contexto", contexto)
    .eq("ativo", true)
    .order("nome");

  if (error) {
    console.error("❌ erro getCategorias:", error);
    return [];
  }

  return data || [];
}

async function getCategoriasPorGrupo(contexto, grupo) {
  const { data, error } = await supabase
    .from("categorias")
    .select("*")
    .eq("contexto", contexto)
    .eq("grupo", grupo)
    .eq("ativo", true)
    .order("nome");

  if (error) {
    console.error("❌ erro getCategoriasPorGrupo:", error);
    return [];
  }

  return data || [];
}

export async function handleMessage(msg) {
  const phone = msg?.from;
  if (!phone) return;

  if (processingUsers.has(phone)) {
    console.log("⏳ ignorado (já processando):", phone);
    return;
  }

  processingUsers.add(phone);

  try {
    const text =
      msg?.interactive?.button_reply?.id ||
      msg?.interactive?.list_reply?.id ||
      msg?.text?.body?.toLowerCase().trim() ||
      "";

    let { data: user, error: userError } = await supabase
      .from("usuarios")
      .select("*")
      .eq("telefone", phone)
      .maybeSingle();

    if (userError) {
      console.error("❌ erro ao buscar usuário:", userError);
      return sendText(phone, "Erro ao buscar usuário.");
    }

    if (!user) {
      const { data: created, error: createError } = await supabase
        .from("usuarios")
        .insert({
          telefone: phone,
          tipo: "usuario",
          etapa: "tipo",
          ativo: true,
        })
        .select()
        .single();

      if (createError) {
        console.error("❌ erro ao criar usuário:", createError);
        return sendText(phone, "Erro ao iniciar cadastro.");
      }

      user = created;
      return sendRootMenu(phone);
    }

    const updateUser = async (data) => {
      const { data: updated, error } = await supabase
        .from("usuarios")
        .update(data)
        .eq("id", user.id)
        .select()
        .single();

      if (error) {
        console.error("❌ erro ao atualizar usuário:", error);
        return null;
      }

      Object.assign(user, updated);
      return updated;
    };

    if (["oi", "menu", "inicio", "início"].includes(text)) {
      await updateUser({ etapa: "tipo" });
      return sendRootMenu(phone);
    }

    const onboardingResponse = await handleOnboarding({
      user,
      text,
      phone,
      updateUser,
      getCategorias,
      getCategoriasPorGrupo,
    });

    if (onboardingResponse) return onboardingResponse;

    if (user.tipo === "usuario") {
      const jobsResponse = await handleJobsMenu({
        user,
        text,
        phone,
        supabase,
      });
      if (jobsResponse) return jobsResponse;

      const missionsResponse = await handleMissions({
        user,
        text,
        phone,
        supabase,
        updateUser,
      });
      if (missionsResponse) return missionsResponse;

      return handleUserFallback(phone);
    }

    if (user.tipo === "contratante") {
      const servicesResponse = await handleServicesMenu({
        user,
        text,
        phone,
        supabase,
        updateUser,
        getCategorias,
        getCategoriasPorGrupo,
      });
      if (servicesResponse) return servicesResponse;

      const missionsResponse = await handleMissions({
        user,
        text,
        phone,
        supabase,
        updateUser,
      });
      if (missionsResponse) return missionsResponse;

      return handleContratanteFallback(phone);
    }

    if (user.tipo === "empresa") {
      const companyResponse = await handleCompanyMenu({
        user,
        text,
        phone,
        supabase,
        updateUser,
        getCategorias,
        getCategoriasPorGrupo,
      });
      if (companyResponse) return companyResponse;

      return handleCompanyFallback(phone);
    }

    if (user.tipo === "profissional") {
      return sendText(phone, "Fluxo de profissional ainda não foi separado nesta versão.");
    }

    return sendRootMenu(phone);
  } catch (err) {
    console.error("❌ erro geral no bot:", err);
    return sendText(phone, "Erro ao processar sua mensagem.");
  } finally {
    processingUsers.delete(phone);
  }
}