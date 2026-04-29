import { supabase, hasSupabaseConfig } from "./supabaseClient.js";
import { mockJobs, mockProfessionals, mockMissions, mockPlans } from "../data/mockData.js";

function applySearch(items, search, fields) {
  const term = String(search || "").trim().toLowerCase();
  if (!term) return items;
  return items.filter((item) =>
    fields.some((field) => String(item?.[field] || "").toLowerCase().includes(term))
  );
}

export async function listJobs({ search = "", cidade = "", estado = "", categoria = "" } = {}) {
  if (!hasSupabaseConfig) {
    return applySearch(mockJobs, search, ["titulo", "nome_empresa", "cidade", "descricao"]);
  }

  let query = supabase
    .from("vagas")
    .select("*")
    .eq("status", "ativa")
    .order("created_at", { ascending: false })
    .limit(50);

  if (cidade) query = query.ilike("cidade", cidade);
  if (estado) query = query.eq("estado", estado.toUpperCase());
  if (categoria) query = query.eq("categoria_chave", categoria);

  const { data, error } = await query;
  if (error) throw error;

  return applySearch(data || [], search, ["titulo", "nome_empresa", "cidade", "descricao"]);
}

export async function listProfessionals({ search = "", cidade = "", estado = "", categoria = "" } = {}) {
  if (!hasSupabaseConfig) {
    return applySearch(mockProfessionals, search, ["titulo", "cidade", "descricao"]);
  }

  let query = supabase
    .from("servicos")
    .select("*, usuarios(nome)")
    .eq("ativo", true)
    .order("nivel_visibilidade", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(50);

  if (cidade) query = query.ilike("cidade", cidade);
  if (estado) query = query.eq("estado", estado.toUpperCase());
  if (categoria) query = query.eq("categoria_chave", categoria);

  const { data, error } = await query;
  if (error) throw error;

  return applySearch(data || [], search, ["titulo", "cidade", "descricao"]);
}

export async function listMissions({ search = "", cidade = "", estado = "" } = {}) {
  if (!hasSupabaseConfig) {
    return applySearch(mockMissions, search, ["titulo", "cidade", "descricao"]);
  }

  let query = supabase
    .from("missoes")
    .select("*")
    .in("status", ["aberta", "pendente_pagamento", "em_andamento"])
    .order("created_at", { ascending: false })
    .limit(50);

  if (cidade) query = query.ilike("cidade", cidade);
  if (estado) query = query.eq("estado", estado.toUpperCase());

  const { data, error } = await query;
  if (error) throw error;

  return applySearch(data || [], search, ["titulo", "cidade", "descricao"]);
}

export async function listPlans() {
  if (!hasSupabaseConfig) return mockPlans;

  const { data, error } = await supabase
    .from("planos_precos")
    .select("*")
    .eq("ativo", true)
    .order("valor", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function createMission(payload) {
  if (!hasSupabaseConfig) {
    console.log("Payload de missão pronto para Supabase:", payload);
    return { id: "mock_mission", ...payload };
  }

  const { data, error } = await supabase
    .from("missoes")
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function createServiceProfile(payload) {
  if (!hasSupabaseConfig) {
    console.log("Payload de perfil profissional pronto para Supabase:", payload);
    return { id: "mock_profile", ...payload };
  }

  const { data, error } = await supabase
    .from("servicos")
    .upsert(payload, { onConflict: "usuario_id,categoria_chave" })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function createJob(payload) {
  if (!hasSupabaseConfig) {
    console.log("Payload de vaga pronto para Supabase:", payload);
    return { id: "mock_job", ...payload };
  }

  const { data, error } = await supabase
    .from("vagas")
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data;
}
