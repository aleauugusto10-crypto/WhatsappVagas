export function toTitleCase(text = "") {
  const lowerWords = ["de", "da", "do", "dos", "das", "e", "em", "para"];
  return String(text || "")
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word, index) => {
      if (index !== 0 && lowerWords.includes(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

export function money(value) {
  if (value === null || value === undefined || value === "") return "A combinar";
  const n = Number(value);
  if (Number.isNaN(n)) return String(value);
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function normalizePhoneBR(phone = "") {
  let num = String(phone || "").replace(/\D/g, "");

  if (!num) return "";

  if (num.startsWith("55")) {
    const ddd = num.slice(2, 4);
    let rest = num.slice(4);
    if (rest.length === 8) rest = "9" + rest;
    return `55${ddd}${rest}`;
  }

  if (num.length >= 10) {
    const ddd = num.slice(0, 2);
    let rest = num.slice(2);
    if (rest.length === 8) rest = "9" + rest;
    return `55${ddd}${rest}`;
  }

  return num;
}
function capitalizeText(value = "") {
  const text = String(value || "")
    .replace(/_/g, " ")
    .trim()
    .toLowerCase();

  if (!text) return "-";

  return text.charAt(0).toUpperCase() + text.slice(1);
}

function capitalizeName(value = "") {
  const text = String(value || "")
    .replace(/_/g, " ")
    .trim()
    .toLowerCase();

  if (!text) return "-";

  return text
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function buildWhatsappLink(phone = "") {
  const numero = normalizePhoneBR(phone);
  return numero ? `https://wa.me/${numero}` : "-";
}
export function whatsappLink(number = "", text = "como funciona? 🤔") {
  const fallback = import.meta.env.VITE_RENDAJA_WHATSAPP || "5579999033717";
  const clean = normalizePhoneBR(number || fallback);
  return `https://wa.me/${clean}?text=${encodeURIComponent(text)}`;
}

export function place(city, state) {
  return `${toTitleCase(city || "Sem cidade")}${state ? `/${String(state).toUpperCase()}` : ""}`;
}
