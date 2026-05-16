import { supabase } from "../../supabase.js";
import { searchGoogleMaps } from "./googleMaps.service.js";

function normalizePhone(value = "") {
  return String(value || "").replace(/\D/g, "");
}

function withTimeout(promise, ms, label = "Operação") {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => {
        reject(new Error(`${label} excedeu ${ms / 1000}s`));
      }, ms)
    ),
  ]);
}

export async function discoverBusinesses({
  city,
  state = "SE",
  category,
  discoveryJobId = null,
  timeoutMs = 90000,
}) {
  const places = await withTimeout(
    searchGoogleMaps({
      city: `${city} ${state}`.trim(),
      category,
    }),
    timeoutMs,
    `Busca ${category} em ${city}`
  );

  const saved = [];
  let totalFound = places.length;

  for (const place of places) {
    const phone = normalizePhone(place.phone || place.phoneNumber || "");

    if (!phone) continue;

    const empresa = place.title || place.name || "";

    if (!empresa) continue;

    const alreadyExists = await supabase
      .from("lead_leads")
      .select("id")
      .or(`telefone.eq.${phone},whatsapp.eq.${phone}`)
      .limit(1);

    if (alreadyExists.error) {
      console.error("Erro ao checar duplicado:", alreadyExists.error);
      continue;
    }

    if (alreadyExists.data?.length) continue;

    const payload = {
      empresa,
      categoria: category,
      telefone: phone,
      whatsapp: phone,
      website: place.website || "",
      cidade: city,
      estado: state,
      endereco: place.address || "",
      google_maps_url: place.url || "",
      rating: place.totalScore || place.rating || null,
      reviews_count: place.reviewsCount || 0,
      source: "google_maps",
      source_city: city,
      discovery_job_id: discoveryJobId,
      status: "ready_to_contact",
      conversation_mode: "ai",
    };

    const { data, error } = await supabase
      .from("lead_leads")
      .insert(payload)
      .select()
      .single();

    if (!error && data) {
      saved.push(data);
    } else {
      console.error("Erro ao salvar lead:", error);
    }
  }

  return {
    totalFound,
    totalCreated: saved.length,
    leads: saved,
  };
}