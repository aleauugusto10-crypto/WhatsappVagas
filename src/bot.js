import { supabase } from "./supabase.js";
import { sendText } from "./services/whatsapp.js";

import { sendRootMenu, sendMenuUsuario, sendMenuContratante, sendMenuEmpresa } from "./flows/menus.js";
import { onboardingStart, onboardingHandle } from "./flows/onboarding.js";
import { handleJobsMenu } from "./flows/jobs.js";
import { handleServicesMenu } from "./flows/services.js";
import { handleMissions } from "./flows/missions.js";

const processingUsers = new Set();

export async function handleMessage(msg) {
  const phone = msg?.from;
  if (!phone) return;

  if (processingUsers.has(phone)) return;
  processingUsers.add(phone);

  try {
    const text =
      msg?.interactive?.button_reply?.id ||
      msg?.interactive?.list_reply?.id ||
      msg?.text?.body?.toLowerCase().trim() ||
      "";

    let { data: user } = await supabase
      .from("usuarios")
      .select("*")
      .eq("telefone", phone)
      .maybeSingle();

    // cria usuário base
    if (!user) {
      const { data: created } = await supabase
        .from("usuarios")
        .insert({
          telefone: phone,
          tipo: "usuario",
          etapa: "onb_tipo",
          ativo: true,
        })
        .select()
        .single();

      user = created;
      return sendRootMenu(phone);
    }

    const updateUser = async (data) => {
      const { data: u } = await supabase
        .from("usuarios")
        .update(data)
        .eq("id", user.id)
        .select()
        .single();
      Object.assign(user, u);
      return u;
    };

    // reset
    if (["oi", "menu", "inicio", "início"].includes(text)) {
      await updateUser({ etapa: "onb_tipo" });
      return sendRootMenu(phone);
    }

    // ONBOARDING
    const onb = await onboardingHandle(user, text, phone, updateUser);
    if (onb === "DONE") {
      if (user.tipo === "usuario") return sendMenuUsuario(phone);
      if (user.tipo === "contratante") return sendMenuContratante(phone);
      if (user.tipo === "empresa") return sendMenuEmpresa(phone);
    }
    if (onb) return onb;

    // MENUS
    if (user.tipo === "usuario") {
      const r1 = await handleJobsMenu(user, text, phone);
      if (r1) return r1;

      const r2 = await handleMissions(user, text, phone, supabase, updateUser);
      if (r2) return r2;

      return sendMenuUsuario(phone);
    }

    if (user.tipo === "contratante") {
      const r1 = await handleServicesMenu(user, text, phone);
      if (r1) return r1;

      const r2 = await handleMissions(user, text, phone, supabase, updateUser);
      if (r2) return r2;

      return sendMenuContratante(phone);
    }

    if (user.tipo === "empresa") {
      return sendMenuEmpresa(phone);
    }

    return sendRootMenu(phone);

  } catch (err) {
    console.error(err);
    return sendText(phone, "Erro ao processar.");
  } finally {
    processingUsers.delete(phone);
  }
}