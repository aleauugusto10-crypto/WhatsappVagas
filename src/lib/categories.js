export const AREAS = [
  { id: "construcao", title: "Construção e reparos" },
  { id: "limpeza", title: "Limpeza" },
  { id: "beleza", title: "Beleza" },
  { id: "informatica", title: "Informática" },
  { id: "transporte", title: "Transporte" },
  { id: "aulas", title: "Aulas e reforço" },
  { id: "cozinha", title: "Cozinha e eventos" },
  { id: "saude", title: "Saúde" },
  { id: "outros", title: "Outros" },
];

export const CATEGORIES = {
  construcao: [
    { id: "eletricista", title: "Eletricista" },
    { id: "encanador", title: "Encanador" },
    { id: "pedreiro", title: "Pedreiro" },
    { id: "pintor", title: "Pintor" },
    { id: "marceneiro", title: "Marceneiro" },
  ],
  limpeza: [
    { id: "faxineira", title: "Faxineira / Diarista" },
    { id: "limpeza_pos_obra", title: "Limpeza pós-obra" },
  ],
  beleza: [
    { id: "cabeleireiro", title: "Cabeleireiro" },
    { id: "manicure", title: "Manicure" },
  ],
  informatica: [
    { id: "tecnico_pc", title: "Técnico de computador" },
    { id: "designer", title: "Designer" },
  ],
  transporte: [
    { id: "frete", title: "Frete / Mudança" },
    { id: "motorista", title: "Motorista" },
  ],
  aulas: [
    { id: "reforco", title: "Reforço escolar" },
    { id: "idiomas", title: "Idiomas" },
  ],
  cozinha: [
    { id: "cozinheira", title: "Cozinheira" },
    { id: "garcom", title: "Garçom" },
  ],
  saude: [
    { id: "cuidador", title: "Cuidador" },
    { id: "enfermagem", title: "Auxiliar de enfermagem" },
  ],
  outros: [
    { id: "outros", title: "Outros" },
  ],
};

// fallback simples por palavras-chave (v1)
const KEYWORDS = [
  { cat: "eletricista", words: ["eletric", "tomada", "chuveiro", "disjuntor"] },
  { cat: "encanador", words: ["cano", "vazamento", "pia", "torneira"] },
  { cat: "faxineira", words: ["limp", "faxina", "lavar"] },
  { cat: "frete", words: ["frete", "mudan", "transportar", "móvel"] },
];

export function inferCategoryFromText(text = "") {
  const t = text.toLowerCase();
  for (const k of KEYWORDS) {
    if (k.words.some(w => t.includes(w))) return k.cat;
  }
  return null;
}