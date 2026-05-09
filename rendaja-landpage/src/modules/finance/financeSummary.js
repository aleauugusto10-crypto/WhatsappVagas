export function calculateFinanceSummary(entries = []) {
  const now = new Date();

  const summary = {
    total: {
      income: 0,
      expense: 0,
      balance: 0,
      count: 0,
    },
    today: {
      income: 0,
      expense: 0,
      balance: 0,
      count: 0,
    },
    week: {
      income: 0,
      expense: 0,
      balance: 0,
      count: 0,
    },
    month: {
      income: 0,
      expense: 0,
      balance: 0,
      count: 0,
    },
  };

  function addToBucket(bucket, entry) {
    const amount = Number(entry.amount || 0);
    const isExpense = entry.type === "expense";

    if (isExpense) {
      bucket.expense += amount;
    } else {
      bucket.income += amount;
    }

    bucket.balance = bucket.income - bucket.expense;
    bucket.count += 1;
  }

  entries.forEach((entry) => {
    const created = new Date(entry.created_at);
    const amount = Number(entry.amount || 0);

    if (!amount || Number.isNaN(created.getTime())) return;

    const sameDay = created.toDateString() === now.toDateString();

    const diffDays = (now - created) / (1000 * 60 * 60 * 24);

    const sameMonth =
      created.getMonth() === now.getMonth() &&
      created.getFullYear() === now.getFullYear();

    addToBucket(summary.total, entry);

    if (sameDay) addToBucket(summary.today, entry);
    if (diffDays <= 7) addToBucket(summary.week, entry);
    if (sameMonth) addToBucket(summary.month, entry);
  });

  return summary;
}

export function calculateStaffRanking(entries = []) {
  const ranking = new Map();

  entries.forEach((entry) => {
    const key = entry.staff_id || entry.staff_name || "unknown";

    if (!ranking.has(key)) {
      ranking.set(key, {
        staff_id: entry.staff_id || null,
        staff_name: entry.staff_name || "Sem profissional",
        total: 0,
        count: 0,
      });
    }

    const current = ranking.get(key);

    current.total += Number(entry.amount || 0);
    current.count += 1;
  });

  return Array.from(ranking.values()).sort((a, b) => b.total - a.total);
}