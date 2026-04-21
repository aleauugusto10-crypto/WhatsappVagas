const ESTADOS_BR = {
  ac: "Acre",
  al: "Alagoas",
  ap: "Amapá",
  am: "Amazonas",
  ba: "Bahia",
  ce: "Ceará",
  df: "Distrito Federal",
  es: "Espírito Santo",
  go: "Goiás",
  ma: "Maranhão",
  mt: "Mato Grosso",
  ms: "Mato Grosso do Sul",
  mg: "Minas Gerais",
  pa: "Pará",
  pb: "Paraíba",
  pr: "Paraná",
  pe: "Pernambuco",
  pi: "Piauí",
  rj: "Rio de Janeiro",
  rn: "Rio Grande do Norte",
  rs: "Rio Grande do Sul",
  ro: "Rondônia",
  rr: "Roraima",
  sc: "Santa Catarina",
  sp: "São Paulo",
  se: "Sergipe",
  to: "Tocantins",
};

function stripAccents(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function normalizeKey(value = "") {
  return stripAccents(String(value).trim().toLowerCase());
}

export function capitalizeWords(value = "") {
  return String(value)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export function normalizeEstado(input = "") {
  const raw = normalizeKey(input);
  if (!raw) return null;

  if (ESTADOS_BR[raw]) return raw.toUpperCase();

  const found = Object.entries(ESTADOS_BR).find(
    ([sigla, nome]) => normalizeKey(nome) === raw
  );

  return found ? found[0].toUpperCase() : null;
}

export function parseCidadeEstado(input = "") {
  const raw = String(input).trim();
  if (!raw) return { cidade: null, estado: null };

  const normalizedSeparators = raw
    .replace(/\s*-\s*/g, "|")
    .replace(/\s*\/\s*/g, "|")
    .replace(/\s*,\s*/g, "|");

  const parts = normalizedSeparators
    .split("|")
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length >= 2) {
    return {
      cidade: capitalizeWords(parts[0]),
      estado: normalizeEstado(parts[1]),
    };
  }

  const tokens = raw.split(/\s+/).filter(Boolean);
  if (tokens.length >= 2) {
    const maybeEstado = normalizeEstado(tokens[tokens.length - 1]);
    if (maybeEstado) {
      return {
        cidade: capitalizeWords(tokens.slice(0, -1).join(" ")),
        estado: maybeEstado,
      };
    }
  }

  return {
    cidade: capitalizeWords(raw),
    estado: null,
  };
}

export function estadosRows() {
  return Object.entries(ESTADOS_BR).map(([sigla, nome]) => ({
    id: `estado_${sigla.toUpperCase()}`,
    title: `${sigla.toUpperCase()} - ${nome}`,
  }));
}