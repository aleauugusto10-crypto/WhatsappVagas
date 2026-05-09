import { supabase } from "../../../src/lib/supabase";

function startOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfWeek(date = new Date()) {
  const d = startOfDay(date);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  return d;
}

function startOfMonth(date = new Date()) {
  const d = startOfDay(date);
  d.setDate(1);
  return d;
}

function sumByType(items, type) {
  return items
    .filter((item) => item.type === type)
    .reduce((acc, item) => acc + Number(item.amount || 0), 0);
}

async function getMovements(profilePageId, fromDate) {
  const { data, error } = await supabase
    .from("finance_movements")
    .select("*")
    .eq("profile_page_id", profilePageId)
    .gte("created_at", fromDate.toISOString())
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data || [];
}

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Método não permitido." });
    }

    const { profilePageId } = req.query;

    if (!profilePageId) {
      return res.status(400).json({ error: "profilePageId obrigatório." });
    }

    const [todayItems, weekItems, monthItems] = await Promise.all([
      getMovements(profilePageId, startOfDay()),
      getMovements(profilePageId, startOfWeek()),
      getMovements(profilePageId, startOfMonth()),
    ]);

    function buildSummary(items) {
      const income = sumByType(items, "income");
      const expense = sumByType(items, "expense");

      return {
        income,
        expense,
        balance: income - expense,
        count: items.length,
      };
    }

    return res.status(200).json({
      today: buildSummary(todayItems),
      week: buildSummary(weekItems),
      month: buildSummary(monthItems),
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("❌ finance/summary:", err);
    return res.status(500).json({ error: err.message || "Erro ao gerar resumo financeiro." });
  }
}