import { useEffect, useMemo, useState } from "react";

const SERVICE_EMOJI_CATEGORIES = [
  {
    id: "recentes",
    label: "Recentes",
    icon: "⭐",
    emojis: ["⭐", "✅", "🔥", "💼", "🛠️", "📦", "🏠", "🚗", "📱", "💰"],
  },
  {
    id: "servicos",
    label: "Serviços",
    icon: "🛠️",
    emojis: [
      "🛠️", "🔧", "🔨", "🪛", "🪚", "🧰", "⚙️", "🔩", "🧱", "🚧",
      "⚡", "💡", "🔌", "🚿", "🚰", "🧯", "🪠", "🧹", "🧼", "🧽",
      "🪣", "🧺", "🧴", "🧻", "🪒", "✂️", "💈", "💅", "💄", "👗",
      "👔", "👞", "🧵", "🪡", "🧶", "🧷", "🧑‍🍳", "🍽️", "🥘", "🍳",
      "📸", "🎥", "🎬", "🎤", "🎧", "🎨", "🖌️", "🖼️", "🖥️", "💻",
      "📱", "🖨️", "⌨️", "🖱️", "📡", "📚", "🧾", "📄", "📑", "📝",
    ],
  },
  {
    id: "profissoes",
    label: "Profissões",
    icon: "👷",
    emojis: [
      "👷", "👷‍♂️", "👷‍♀️", "🧑‍🔧", "👨‍🔧", "👩‍🔧", "🧑‍🏭", "👨‍🏭", "👩‍🏭",
      "🧑‍💼", "👨‍💼", "👩‍💼", "🧑‍💻", "👨‍💻", "👩‍💻", "🧑‍🍳", "👨‍🍳", "👩‍🍳",
      "🧑‍⚕️", "👨‍⚕️", "👩‍⚕️", "🧑‍🏫", "👨‍🏫", "👩‍🏫", "🧑‍⚖️", "👨‍⚖️", "👩‍⚖️",
      "🧑‍🌾", "👨‍🌾", "👩‍🌾", "🧑‍🎨", "👨‍🎨", "👩‍🎨", "🧑‍✈️", "👨‍✈️", "👩‍✈️",
      "🧑‍🚒", "👨‍🚒", "👩‍🚒", "🧑‍🔬", "👨‍🔬", "👩‍🔬", "🧑‍🚀", "👨‍🚀", "👩‍🚀",
      "👮", "👮‍♂️", "👮‍♀️", "🕵️", "🕵️‍♂️", "🕵️‍♀️", "💂", "💂‍♂️", "💂‍♀️",
    ],
  },
  {
    id: "loja",
    label: "Loja",
    icon: "🛒",
    emojis: [
      "🛒", "🛍️", "🏷️", "💳", "💰", "💵", "🧾", "📦", "📫", "📬",
      "🚚", "🚛", "🚐", "🏪", "🏬", "🏢", "🏭", "🏦", "💎", "👑",
      "🎁", "🎀", "🧺", "🪑", "🛋️", "🛏️", "🪞", "🚪", "🪟", "🧸",
      "👕", "👖", "👗", "👚", "🧥", "🥼", "🦺", "👟", "👠", "👜",
      "🎒", "🧢", "⌚", "💍", "💄", "🧴", "🧼", "🧽", "🪥", "🧻",
    ],
  },
  {
    id: "casa",
    label: "Casa",
    icon: "🏠",
    emojis: [
      "🏠", "🏡", "🏘️", "🏚️", "🏗️", "🧱", "🚪", "🪟", "🛏️", "🛋️",
      "🪑", "🚽", "🚿", "🛁", "🪠", "🧹", "🧼", "🧽", "🪣", "🧺",
      "🪴", "🌿", "🌱", "🌳", "🌵", "🌷", "🌹", "🌻", "🌼", "🍃",
      "🔥", "💧", "⚡", "💡", "🔌", "🔒", "🔑", "🗝️", "🧯", "🪜",
    ],
  },
  {
    id: "transporte",
    label: "Transporte",
    icon: "🚗",
    emojis: [
      "🚗", "🚕", "🚙", "🚌", "🚎", "🏎️", "🚓", "🚑", "🚒", "🚐",
      "🛻", "🚚", "🚛", "🚜", "🏍️", "🛵", "🚲", "🛴", "🛺", "🚂",
      "🚆", "🚇", "🚊", "✈️", "🛫", "🛬", "🚁", "🚤", "⛵", "🛥️",
      "🚢", "⚓", "⛽", "🛞", "🚦", "🚥", "🛣️", "🗺️", "📍", "📌",
    ],
  },
  {
    id: "saude",
    label: "Saúde",
    icon: "🏥",
    emojis: [
      "🏥", "🚑", "⚕️", "🩺", "💊", "💉", "🩹", "🩼", "🦷", "🦴",
      "👁️", "👂", "🧠", "🫀", "🫁", "🧬", "🦠", "🧪", "🌡️", "🧫",
      "🧑‍⚕️", "👨‍⚕️", "👩‍⚕️", "😷", "🤒", "🤕", "🤧", "🥼", "🛌", "🧘",
    ],
  },
  {
    id: "comida",
    label: "Comida",
    icon: "🍽️",
    emojis: [
      "🍽️", "🍴", "🥄", "🔪", "🍳", "🥘", "🍲", "🍛", "🍜", "🍝",
      "🍕", "🍔", "🍟", "🌭", "🥪", "🌮", "🌯", "🥗", "🍱", "🍣",
      "🍤", "🍙", "🍚", "🍘", "🥟", "🥠", "🥡", "🍞", "🥐", "🥖",
      "🥨", "🧀", "🥚", "🥓", "🥩", "🍗", "🍖", "🌽", "🥕", "🍅",
      "🍎", "🍌", "🍓", "🍇", "🍉", "🍰", "🎂", "🧁", "☕", "🥤",
    ],
  },
  {
    id: "pessoas",
    label: "Pessoas",
    icon: "🤝",
    emojis: [
      "🤝", "👍", "👏", "🙌", "🙏", "💪", "👋", "👌", "✌️", "🤙",
      "🙂", "😄", "😁", "😊", "😍", "🤩", "😎", "🥳", "😇", "😉",
      "👨", "👩", "🧑", "👴", "👵", "👦", "👧", "👶", "🧔", "👱",
      "👥", "🫂", "💬", "📞", "📲", "📢", "📣", "💌", "❤️", "💙",
    ],
  },
  {
    id: "simbolos",
    label: "Símbolos",
    icon: "✅",
    emojis: [
      "✅", "☑️", "✔️", "❌", "❎", "⚠️", "🚨", "🔔", "📌", "📍",
      "⭐", "🌟", "✨", "🔥", "💥", "💫", "🎯", "🏆", "🥇", "💎",
      "💡", "🔎", "🔒", "🔓", "🔑", "🛡️", "⚖️", "♻️", "🔁", "🔄",
      "⬆️", "⬇️", "➡️", "⬅️", "🔝", "🆕", "🆗", "🆒", "🆓", "💯",
    ],
  },
  {
    id: "natureza",
    label: "Natureza",
    icon: "🌿",
    emojis: [
      "🌿", "🌱", "🌳", "🌴", "🌵", "🍀", "🍃", "🌾", "🌷", "🌹",
      "🌺", "🌸", "🌼", "🌻", "🌞", "🌝", "🌛", "⭐", "🌈", "☁️",
      "⛅", "🌧️", "⛈️", "⚡", "🔥", "💧", "🌊", "❄️", "☃️", "🌪️",
      "🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐷", "🐮",
      "🐔", "🐦", "🐴", "🐝", "🦋", "🐞", "🐟", "🐠", "🐢", "🦜",
    ],
  },
];

function EmojiPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState(
    SERVICE_EMOJI_CATEGORIES[0].id
  );

  const currentCategory =
    SERVICE_EMOJI_CATEGORIES.find((cat) => cat.id === activeCategory) ||
    SERVICE_EMOJI_CATEGORIES[0];

  return (
    <div className="emoji-picker-wrap">
      <button
        type="button"
        className="emoji-picker-button"
        onClick={() => setOpen((prev) => !prev)}
      >
        <span>{value || "⭐"}</span>
        <strong>Escolher ícone</strong>
      </button>

      {open && (
        <div className="emoji-picker-pop">
          <div className="emoji-picker-categories">
            {SERVICE_EMOJI_CATEGORIES.map((category) => (
              <button
                key={category.id}
                type="button"
                title={category.label}
                className={activeCategory === category.id ? "active" : ""}
                onClick={() => setActiveCategory(category.id)}
              >
                {category.icon}
              </button>
            ))}
          </div>

          <div className="emoji-picker-title">
            <strong>{currentCategory.label}</strong>
            <span>{currentCategory.emojis.length} opções</span>
          </div>

          <div className="emoji-picker-grid">
            {currentCategory.emojis.map((emoji) => (
              <button
                key={`${currentCategory.id}-${emoji}`}
                type="button"
                className={value === emoji ? "active" : ""}
                onClick={() => {
                  onChange(emoji);
                  setOpen(false);
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
function money(value = 0) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}
function recurringPaidThisMonth(item) {
  if (!item?.last_paid_at) return false;

  const paidMonth = String(item.last_paid_at).slice(0, 7);
  const currentMonth = todayKey().slice(0, 7);

  return paidMonth === currentMonth;
}

function getRecurringCardStatus(item) {
  if (item.is_active === false) {
    return "inactive";
  }

  if (!item.next_due_date) {
    return "ok";
  }

  const today = new Date(`${todayKey()}T00:00:00`);
  const dueDate = new Date(`${item.next_due_date}T00:00:00`);

  const diffDays = Math.ceil(
    (dueDate - today) / (1000 * 60 * 60 * 24)
  );

  // atrasada
  if (diffDays < 0) {
    return "overdue";
  }

  // vence em breve
  if (diffDays <= 5) {
    return "warning";
  }

  // paga e em dia
  if (recurringPaidThisMonth(item)) {
    return "paid";
  }

  return "ok";
}
function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function formatDateBR(date) {
  if (!date) return "";

  return new Date(`${date}T00:00:00`).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatDateTime(value) {
  if (!value) return "";

  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function paymentMethodLabel(method) {
  if (method === "pix") return "Pix";
  if (method === "cash") return "Dinheiro";
  if (method === "card") return "Cartão";
  if (method === "transfer") return "Transferência";
  if (method === "manual") return "Manual";
  if (method === "other") return "Outro";
  return method || "Não informado";
}

function typeLabel(type) {
  if (type === "expense") return "Saída";
  return "Entrada";
}

function emptyExpenseForm() {

  return {
    amount: "",
    description: "",
    payment_method: "cash",
    note: "",
  };
}
function emptyIncomeForm() {
  return {
    amount: "",
    description: "",
    payment_method: "cash",
    customer_name: "",
    customer_phone: "",
    note: "",

    product_id: null,
    product_title: "",
    product_reference: "",
    product_qty: 1,
    product_price: "",
    staff_id: "",
staff_name: "",
commission_type: "",
commission_value: 0,
commission_amount: 0,
  };
}

export default function FinancePanel({ profileFromDashboard = null }) {
  const storeItems = Array.isArray(profileFromDashboard?.store_items)
  ? profileFromDashboard.store_items
  : [];
  const saleItemOptions = storeItems.filter(
  (item) =>
    (item.type === "product" || item.type === "service") &&
    item.active !== false
);
  const [summary, setSummary] = useState(null);
  const [movements, setMovements] = useState([]);
  const [profile, setProfile] = useState(null);
const [dateMode, setDateMode] = useState("single");
const [selectedDate, setSelectedDate] = useState(todayKey());
const [startDate, setStartDate] = useState("");
const [endDate, setEndDate] = useState("");
const [search, setSearch] = useState("");
const [typeFilter, setTypeFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [loadingMovements, setLoadingMovements] = useState(false);

  const [selectedMovement, setSelectedMovement] = useState(null);
const [showExportModal, setShowExportModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseForm, setExpenseForm] = useState(emptyExpenseForm());
  const [savingExpense, setSavingExpense] = useState(false);
  const [showIncomeModal, setShowIncomeModal] = useState(false);
const [incomeForm, setIncomeForm] = useState(emptyIncomeForm());
const [savingIncome, setSavingIncome] = useState(false);
const [staffOptions, setStaffOptions] = useState([]);
const [staffSearch, setStaffSearch] = useState("");
const [staffResults, setStaffResults] = useState([]);
const [incomeProductSearch, setIncomeProductSearch] = useState("");
const [incomeProductResults, setIncomeProductResults] = useState([]);
const [searchingIncomeProduct, setSearchingIncomeProduct] = useState(false);
  const [recurringExpenses, setRecurringExpenses] = useState([]);
  const [staffMembers, setStaffMembers] = useState([]);
const [loadingRecurring, setLoadingRecurring] = useState(false);
const [showRecurringModal, setShowRecurringModal] = useState(false);
const [selectedRecurringExpense, setSelectedRecurringExpense] = useState(null);
const [recurringFilter, setRecurringFilter] = useState("bills");
const balanceViews = ["day", "week", "month"];
const [balanceViewIndex, setBalanceViewIndex] = useState(0);
const expenseViews = ["day", "week", "month"];
const [expenseViewIndex, setExpenseViewIndex] = useState(0);

const incomeViews = ["day", "week", "month"];
const [incomeViewIndex, setIncomeViewIndex] = useState(0);
const [recurringForm, setRecurringForm] = useState({
  icon: "💸",
  title: "",
  amount: "",
  paymentMethod: "cash",
  category: "fixed_expense",
  frequency: "monthly",
  nextDueDate: "",
  note: "",
});
  useEffect(() => {
    loadInitialFinance();
  }, []);
useEffect(() => {
  if (profile?.id) {
    loadMovements(profile.id);
  }
}, [profile?.id, dateMode, selectedDate, startDate, endDate, search, typeFilter]);
useEffect(() => {
  const timer = setInterval(() => {
    setExpenseViewIndex((prev) => (prev + 1) % expenseViews.length);
  }, 10000);

  return () => clearInterval(timer);
}, []);
useEffect(() => {
  const timer = setInterval(() => {
    setIncomeViewIndex((prev) => (prev + 1) % incomeViews.length);
  }, 10000);

  return () => clearInterval(timer);
}, []);
useEffect(() => {
  const timer = setInterval(() => {
    setBalanceViewIndex((prev) => (prev + 1) % balanceViews.length);
  }, 10000);

  return () => clearInterval(timer);
}, []);
function getAnimatedBalanceCard() {
  const view = balanceViews[balanceViewIndex];

  if (view === "week") {
    return {
      label: "Saldo da semana",
      value: summary?.week?.balance ?? 0,
      detail: "Entradas menos saídas da semana",
    };
  }

  if (view === "month") {
    return {
      label: "Saldo do mês",
      value: summary?.month?.balance ?? 0,
      detail: "Entradas menos saídas deste mês",
    };
  }

  return {
    label: "Saldo do dia",
    value: dailySummary.balance,
    detail: formatDateBR(selectedDate),
  };
}
function getAnimatedIncomeCard() {
  const view = incomeViews[incomeViewIndex];

  if (view === "week") {
    return {
      label: "Entradas da semana",
      value: summary?.week?.income ?? summary?.week?.total_income ?? 0,
      detail: "Total de entradas da semana",
    };
  }

  if (view === "month") {
    return {
      label: "Entradas do mês",
      value: summary?.month?.income ?? summary?.month?.total_income ?? 0,
      detail: "Total de entradas deste mês",
    };
  }

  return {
    label: "Entradas do dia",
    value: dailySummary.income,
    detail: `${dailySummary.count} movimentação(ões)`,
  };
}
function getAnimatedExpenseCard() {
  const view = expenseViews[expenseViewIndex];

  if (view === "week") {
    return {
      label: "Saídas da semana",
      value: summary?.week?.expense ?? summary?.week?.total_expense ?? 0,
      detail: "Total de saídas nos últimos 7 dias",
    };
  }

  if (view === "month") {
    return {
      label: "Saídas do mês",
      value: summary?.month?.expense ?? summary?.month?.total_expense ?? 0,
      detail: "Total de saídas deste mês",
    };
  }

  return {
    label: "Saídas do dia",
    value: dailySummary.expense,
    detail: "Despesas e comissões",
  };
}
function getStaffByRecurring(item) {
  if (!item) return null;

  const staffId =
    item.staff_id ||
    item.staffId ||
    item.related_staff_id ||
    item.metadata?.staff_id ||
    item.metadata?.staffId;

  if (!staffId) return null;

  return staffMembers.find(
    (staff) => String(staff.id) === String(staffId)
  );
}

function getRecurringDisplayAmount(item) {
  if (item.category === "staff_payment") {
    const salary = Number(item.fixed_salary || item.base_amount || 0);
    const commission = Number(item.pending_commission_amount || 0);

    return salary + commission;
  }

  return Number(item.amount || 0);
}

function getRecurringStaffBreakdown(item) {
  if (item.category !== "staff_payment") return null;

  const salary = Number(item.fixed_salary || item.base_amount || 0);
  const commission = Number(item.pending_commission_amount || 0);

  return {
    salary,
    commission,
    total: salary + commission,
  };
}
const filteredRecurringExpenses = useMemo(() => {
  const today = todayKey();
  const currentMonth = today.slice(0, 7);

  function getStatusPriority(item) {
    if (!item.next_due_date) return 3;

    const due = item.next_due_date;
    const diffDays = Math.ceil(
      (new Date(`${due}T00:00:00`) - new Date(`${today}T00:00:00`)) /
        (1000 * 60 * 60 * 24)
    );

    if (diffDays < 0) return 0; // atrasada
    if (diffDays <= 5) return 1; // atenção
    return 2; // em dia
  }

  function wasPaidThisMonth(item) {
    if (!item.last_paid_at) return false;
    return String(item.last_paid_at).slice(0, 7) === currentMonth;
  }

  
  let list = recurringExpenses;

  if (recurringFilter === "bills") {
    list = recurringExpenses.filter(
      (item) => item.is_active !== false && !wasPaidThisMonth(item)
    );
  }

  if (recurringFilter === "inactive") {
    list = recurringExpenses.filter((item) => item.is_active === false);
  }

  if (recurringFilter === "all") {
    list = recurringExpenses;
  }

  return [...list].sort((a, b) => {
    const priorityA = getStatusPriority(a);
    const priorityB = getStatusPriority(b);

    if (priorityA !== priorityB) return priorityA - priorityB;

    const dateA = a.next_due_date || "9999-12-31";
    const dateB = b.next_due_date || "9999-12-31";

    return dateA.localeCompare(dateB);
  });
}, [recurringExpenses, recurringFilter]);


  const dailySummary = useMemo(() => {
    const income = movements
      .filter((item) => item.type !== "expense")
      .reduce((acc, item) => acc + Number(item.amount || 0), 0);

    const expense = movements
      .filter((item) => item.type === "expense")
      .reduce((acc, item) => acc + Number(item.amount || 0), 0);

    return {
      income,
      expense,
      balance: income - expense,
      count: movements.length,
    };
  }, [movements]);
  async function exportMovementsToPdf() {
  if (!movements.length) {
    alert("Nenhuma movimentação para exportar.");
    return;
  }

  const { default: jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF();

  const totalIncome = movements
    .filter((item) => item.type !== "expense")
    .reduce((acc, item) => acc + Number(item.amount || 0), 0);

  const totalExpense = movements
    .filter((item) => item.type === "expense")
    .reduce((acc, item) => acc + Number(item.amount || 0), 0);

  const periodo =
    startDate || endDate
      ? `${startDate || "início"} até ${endDate || "hoje"}`
      : selectedDate;

  const companyName =
  profile?.nome ||
  profile?.empresa_nome ||
  "Empresa";

doc.setFontSize(18);

doc.text(
  `Relatório de movimentação financeira`,
  14,
  18
);

doc.setFontSize(12);

doc.text(
  companyName,
  14,
  28
);

  doc.setFontSize(10);
  doc.text(`Período: ${periodo}`, 14, 40);
doc.text(`Entradas: ${money(totalIncome)}`, 14, 48);
doc.text(`Saídas: ${money(totalExpense)}`, 14, 56);
doc.text(`Saldo: ${money(totalIncome - totalExpense)}`, 14, 64);

  autoTable(doc, {
    startY: 74,
    head: [["Data", "Tipo", "Descrição", "Pagamento", "Valor"]],
    body: movements.map((item) => [
      formatDateTime(item.created_at),
      typeLabel(item.type),
      item.description || "",
      paymentMethodLabel(item.payment_method),
      money(item.amount),
    ]),
    styles: {
      fontSize: 8,
    },
    headStyles: {
      fillColor: [7, 17, 31],
    },
  });

  doc.save(`relatorio-financeiro-${periodo}.pdf`);
}
async function exportMovementsToXlsx() {
  if (!movements.length) {
    alert("Nenhuma movimentação para exportar.");
    return;
  }

  const XLSX = await import("xlsx");

  const totalIncome = movements
    .filter((item) => item.type !== "expense")
    .reduce((acc, item) => acc + Number(item.amount || 0), 0);

  const totalExpense = movements
    .filter((item) => item.type === "expense")
    .reduce((acc, item) => acc + Number(item.amount || 0), 0);

  const periodo =
    startDate || endDate
      ? `${startDate || "início"} até ${endDate || "hoje"}`
      : selectedDate;

  const resumo = [
    ["Relatório financeiro"],
    ["Período", periodo],
    ["Total de entradas", totalIncome],
    ["Total de saídas", totalExpense],
    ["Saldo final", totalIncome - totalExpense],
  ];

  const linhas = movements.map((item) => ({
    Data: formatDateTime(item.created_at),
    Tipo: typeLabel(item.type),
    Descrição: item.description || "",
    Pagamento: paymentMethodLabel(item.payment_method),
    Cliente: item.customer_name || "",
    WhatsApp: item.customer_phone || "",
    "Comissionado": item.commission_to_staff_name || "",
    "Comissão": Number(item.commission_amount || 0),
    Valor: Number(item.amount || 0),
    Observação: item.note || "",
  }));

  const wb = XLSX.utils.book_new();

  const resumoSheet = XLSX.utils.aoa_to_sheet(resumo);
  const movimentosSheet = XLSX.utils.json_to_sheet(linhas);

  XLSX.utils.book_append_sheet(wb, resumoSheet, "Resumo");
  XLSX.utils.book_append_sheet(wb, movimentosSheet, "Movimentações");

  const nomeArquivo = `relatorio-financeiro-${periodo.replaceAll("/", "-")}.xlsx`;

  XLSX.writeFile(wb, nomeArquivo);
}
  async function loadInitialFinance() {
    try {
      setLoading(true);

      const savedUser = localStorage.getItem("rendaja_user");
      const user = savedUser ? JSON.parse(savedUser) : null;

      if (!user?.id) {
        console.log("❌ Financeiro: usuário local não encontrado");
        return;
      }

      const profileReq = await fetch(`/api/profiles/search?userId=${user.id}`);
      const profileJson = await profileReq.json();

      const foundProfile = Array.isArray(profileJson) ? profileJson[0] : profileJson;

      if (!foundProfile?.id) {
        console.log("❌ Financeiro: perfil não encontrado", profileJson);
        return;
      }

      setProfile(foundProfile);

      const summaryReq = await fetch(
        `/api/finance/summary?profilePageId=${foundProfile.id}`
      );

      const summaryJson = await summaryReq.json();
      setSummary(summaryJson);

      await loadMovements(foundProfile.id);
      await loadRecurringExpenses(foundProfile.id);
      await loadStaffOptions(foundProfile.id);
    } catch (err) {
      console.error("❌ Erro FinancePanel:", err);
    } finally {
      setLoading(false);
    }
  }

  async function loadMovements(profileId = profile?.id) {
    if (!profileId) return;

    try {
      setLoadingMovements(true);

      const params = new URLSearchParams();

      params.set("profilePageId", profileId);

      if (dateMode === "period") {
  if (startDate) params.set("startDate", `${startDate}T00:00:00`);
  if (endDate) params.set("endDate", `${endDate}T23:59:59.999`);
} else {
  if (selectedDate) params.set("date", selectedDate);
}
      if (search.trim()) {
        params.set("search", search.trim());
      }

      if (typeFilter !== "all") {
        params.set("type", typeFilter);
      }

      const response = await fetch(`/api/finance/movements?${params.toString()}`);
      const json = await response.json();

      if (!response.ok) {
        console.error("Erro movements:", json);
        setMovements([]);
        return;
      }

      setMovements(Array.isArray(json) ? json : []);
    } catch (err) {
      console.error("❌ Erro ao carregar movimentações:", err);
      setMovements([]);
    } finally {
      setLoadingMovements(false);
    }
  }

async function loadRecurringExpenses(profileId = profile?.id) {
  if (!profileId) return;

  try {
    setLoadingRecurring(true);

    const [recurringReq, staffReq] = await Promise.all([
      fetch(`/api/finance/recurring-expenses?profilePageId=${profileId}`),
      fetch(`/api/staff?profilePageId=${profileId}`),
    ]);

    const recurringJson = await recurringReq.json().catch(() => []);
    const staffJson = await staffReq.json().catch(() => []);

    if (!recurringReq.ok) {
      console.error("Erro despesas recorrentes:", recurringJson);
      setRecurringExpenses([]);
      return;
    }

    setRecurringExpenses(Array.isArray(recurringJson) ? recurringJson : []);
    setStaffMembers(Array.isArray(staffJson) ? staffJson : []);
  } catch (err) {
    console.error("❌ Erro ao carregar despesas recorrentes:", err);
    setRecurringExpenses([]);
    setStaffMembers([]);
  } finally {
    setLoadingRecurring(false);
  }
}
async function loadStaffOptions(profileId = profile?.id) {
  if (!profileId) return;

  try {
    const response = await fetch(`/api/staff?profilePageId=${profileId}`);
    const json = await response.json().catch(() => []);

    if (!response.ok) {
      console.error("Erro ao carregar funcionários:", json);
      setStaffOptions([]);
      return;
    }

    setStaffOptions(Array.isArray(json) ? json : []);
  } catch (err) {
    console.error("Erro funcionários comissão:", err);
    setStaffOptions([]);
  }
}
  async function refreshAll() {
    if (!profile?.id) {
      await loadInitialFinance();
      return;
    }

    const summaryReq = await fetch(`/api/finance/summary?profilePageId=${profile.id}`);
    const summaryJson = await summaryReq.json();

    setSummary(summaryJson);
    await loadMovements(profile.id);
    await loadRecurringExpenses(profile.id);
  }

  async function saveRecurringExpense(event) {
  event.preventDefault();

  if (!profile?.id) return;

  const amount = Number(recurringForm.amount || 0);

  if (!recurringForm.title.trim()) {
    alert("Informe o nome da despesa fixa.");
    return;
  }

  if (!amount || amount <= 0) {
    alert("Informe o valor da despesa fixa.");
    return;
  }

  const payload = {
    icon: recurringForm.icon || "💸",
    title: recurringForm.title.trim(),
    amount,
    paymentMethod: recurringForm.paymentMethod,
    category: recurringForm.category || "fixed_expense",
    frequency: recurringForm.frequency || "monthly",
    nextDueDate: recurringForm.nextDueDate || null,
    note: recurringForm.note || "",
  };

  try {
    const response = await fetch("/api/finance/recurring-expenses", {
      method: selectedRecurringExpense ? "PATCH" : "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(
        selectedRecurringExpense
          ? {
              id: selectedRecurringExpense.id,
              updates: {
                icon: payload.icon,
                title: payload.title,
                amount: payload.amount,
                payment_method: payload.paymentMethod,
                category: payload.category,
                frequency: payload.frequency,
                next_due_date: payload.nextDueDate,
                note: payload.note,
              },
            }
          : {
              profilePageId: profile.id,
              ...payload,
            }
      ),
    });

    const json = await response.json().catch(() => ({}));

    if (!response.ok) {
      alert(json.error || "Erro ao salvar despesa fixa.");
      return;
    }

    setRecurringForm({
      icon: "💸",
      title: "",
      amount: "",
      paymentMethod: "cash",
      category: "fixed_expense",
      frequency: "monthly",
      nextDueDate: "",
      note: "",
    });

    setSelectedRecurringExpense(null);
    setShowRecurringModal(false);

    await refreshAll();

    alert(
      selectedRecurringExpense
        ? "Despesa fixa atualizada!"
        : "Despesa fixa cadastrada!"
    );
  } catch (err) {
    console.error("Erro despesa recorrente:", err);
    alert("Erro ao salvar despesa fixa.");
  }
}

function openRecurringModal(item = null) {
  if (item) {
    setSelectedRecurringExpense(item);

    setRecurringForm({
      icon: item.icon || "💸",
      title: item.title || "",
      amount: item.amount || "",
      paymentMethod: item.payment_method || "cash",
      category: item.category || "fixed_expense",
      frequency: item.frequency || "monthly",
      nextDueDate: item.next_due_date || "",
      note: item.note || "",
    });
  } else {
    setSelectedRecurringExpense(null);

    setRecurringForm({
      icon: "💸",
      title: "",
      amount: "",
      paymentMethod: "cash",
      category: "fixed_expense",
      frequency: "monthly",
      nextDueDate: "",
      note: "",
    });
  }

  setShowRecurringModal(true);
}
function getNextDueDate(date, frequency) {
  if (!date) return null;

  const current = new Date(`${date}T00:00:00`);

  if (frequency === "weekly") {
    current.setDate(current.getDate() + 7);
  } else if (frequency === "biweekly") {
    current.setDate(current.getDate() + 15);
  } else if (frequency === "yearly") {
    current.setFullYear(current.getFullYear() + 1);
  } else {
    current.setMonth(current.getMonth() + 1);
  }

  return current.toISOString().slice(0, 10);
}
function getRecurringStatusClass(item) {
  if (item.is_active === false || !item.next_due_date) return "";

  const today = new Date(`${todayKey()}T00:00:00`);
  const dueDate = new Date(`${item.next_due_date}T00:00:00`);

  const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return "overdue";
  if (diffDays <= 5) return "due-soon";

  return "paid-ok";
}
async function confirmRecurringPayment(item) {
  if (!profile?.id || !item?.id) return;

  const ok = confirm(`Confirmar pagamento de ${item.title}?`);
  if (!ok) return;

  const amount = Number(item.amount || 0);

  if (!amount || amount <= 0) {
    alert("Valor inválido nessa despesa fixa.");
    return;
  }

  const movementReq = await fetch("/api/finance/movements", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      profilePageId: profile.id,
      type: "expense",
      amount,
      description: `Despesa fixa - ${item.title}`,
      paymentMethod: item.payment_method || "cash",
      note: item.note || "Pagamento confirmado em despesa recorrente",
      sourceType: "recurring_expense",
      sourceId: item.id,
      registeredById: profile.user_id || null,
      registeredByName: profile.nome || "Dono da conta",
      registeredByRole: "owner",
    }),
  });

  const movementJson = await movementReq.json().catch(() => ({}));

  if (!movementReq.ok) {
    alert(movementJson.error || "Erro ao registrar pagamento.");
    return;
  }

  

  await fetch("/api/finance/recurring-expenses", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: item.id,
      updates: {
        next_due_date: nextDueDate,
        is_active: true,
      },
    }),
  });

  await refreshAll();

  alert("Pagamento confirmado e saída registrada!");
}
async function deleteRecurringExpense(item) {
  const ok = confirm("Excluir definitivamente esta despesa fixa?");
  if (!ok) return;

  const response = await fetch("/api/finance/recurring-expenses", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: item.id,
    }),
  });

  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    alert(json.error || "Erro ao excluir despesa fixa.");
    return;
  }

  setShowRecurringModal(false);
  setSelectedRecurringExpense(null);

  await loadRecurringExpenses(profile.id);
}

async function toggleRecurringExpense(item) {
  const willActivate = item.is_active === false;

  const ok = confirm(
    willActivate
      ? "Reativar esta despesa fixa?"
      : "Desativar esta despesa fixa?"
  );

  if (!ok) return;

  const response = await fetch("/api/finance/recurring-expenses", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: item.id,
      updates: {
        is_active: willActivate,
      },
    }),
  });

  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    alert(json.error || "Erro ao atualizar despesa fixa.");
    return;
  }

  await loadRecurringExpenses(profile.id);
}
async function confirmRecurringPayment(item) {
  if (!profile?.id) return;

  const ok = confirm(
    `Confirmar pagamento de "${item.title}"?`
  );

  if (!ok) return;

  try {
    const movementResponse = await fetch(
      "/api/finance/movements",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          profilePageId: profile.id,

          type: "expense",

          amount: getRecurringDisplayAmount(item),

          description: `Pagamento - ${item.title}`,

          paymentMethod:
            item.payment_method || "cash",

          note:
            item.note ||
            "Pagamento confirmado manualmente",

          sourceType: "recurring_expense",

          sourceId: item.id,

          registeredById:
            profile.user_id || null,

          registeredByName:
            profile.nome || "Dono da conta",

          registeredByRole: "owner",
        }),
      }
    );

    const movementJson =
      await movementResponse
        .json()
        .catch(() => ({}));

    if (!movementResponse.ok) {
      alert(
        movementJson.error ||
          "Erro ao registrar pagamento."
      );

      return;
    }

    const movementId =
      movementJson?.id || null;

    const recurringResponse = await fetch(
      "/api/finance/recurring-expenses",
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          id: item.id,

          updates: {
            last_paid_at:
              new Date().toISOString(),

            last_payment_movement_id:
              movementId,
          },
        }),
      }
    );

    const recurringJson =
      await recurringResponse
        .json()
        .catch(() => ({}));

    if (!recurringResponse.ok) {
      alert(
        recurringJson.error ||
          "Pagamento registrado mas não foi possível atualizar a recorrência."
      );

      return;
    }
const staff = getStaffByRecurring(item);

if (staff?.id) {
  await fetch("/api/staff", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      staffId: staff.id,
      updates: {
        commission_pending: 0,
        last_commission_payment_at: new Date().toISOString(),
      },
    }),
  });
}
    await refreshAll();

  } catch (err) {
    console.error(
      "Erro confirmar pagamento:",
      err
    );

    alert(
      "Erro ao confirmar pagamento."
    );
  }
}
  async function createExpense(event) {
    event.preventDefault();

    if (!profile?.id || savingExpense) return;

    const amount = Number(expenseForm.amount || 0);

    if (!amount || amount <= 0) {
      alert("Informe o valor da saída.");
      return;
    }

    if (!expenseForm.description.trim()) {
      alert("Informe a descrição da saída.");
      return;
    }

    try {
      setSavingExpense(true);

      const response = await fetch("/api/finance/movements", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
       body: JSON.stringify({
  profilePageId: profile.id,
  type: "expense",
  amount,
  description: expenseForm.description,
  paymentMethod: expenseForm.payment_method,
  note: expenseForm.note,

  registeredById: profile.user_id || null,
  registeredByName: profile.nome || "Dono da conta",
  registeredByRole: "owner",
}),
      });

      const json = await response.json().catch(() => ({}));

      if (!response.ok) {
        alert(json.error || "Erro ao adicionar saída.");
        return;
      }

      setExpenseForm(emptyExpenseForm());
      setShowExpenseModal(false);

      await refreshAll();

      alert("Saída registrada no financeiro!");
    } catch (err) {
      console.error("Erro ao criar saída:", err);
      alert("Erro ao adicionar saída.");
    } finally {
      setSavingExpense(false);
    }
  }


  async function searchIncomeProducts(value) {
  const q = String(value || "").trim().toLowerCase();

  setIncomeProductSearch(value);
if (q.length < 2) {
  setIncomeProductResults([]);
    setIncomeForm((prev) => ({
      ...prev,
      product_id: null,
      product_title: "",
      product_reference: "",
      product_price: "",
    }));
    return;
  }

  const results = saleItemOptions
    .filter((item) => {
      const text = `
        ${item.title || ""}
        ${item.name || ""}
        ${item.description || ""}
        ${item.reference_code || ""}
        ${item.reference || ""}
        ${item.codigo || ""}
        ${item.sku || ""}
      `.toLowerCase();

      return text.includes(q);
    })
    .slice(0, 8);

  setIncomeProductResults(results);
}

function searchStaffForIncome(value) {
  const q = String(value || "").trim().toLowerCase();

  setStaffSearch(value);

 if (q.length < 2) {
  setStaffResults([]);
    setIncomeForm((prev) => ({
      ...prev,
      staff_id: "",
      staff_name: "",
      commission_type: "",
      commission_value: 0,
      commission_amount: 0,
    }));
    return;
  }

  const results = staffOptions
    .filter((staff) => {
      const text = `
        ${staff.nome || ""}
        ${staff.email || ""}
        ${staff.telefone || ""}
        ${staff.role || ""}
      `.toLowerCase();

      return text.includes(q);
    })
    .slice(0, 8);

  setStaffResults(results);
}

function calcStaffCommission(staff, amount) {
  const value = Number(staff?.commission_value || 0);
  const saleAmount = Number(amount || 0);

  if (!staff || staff.commission_type === "none") return 0;

  if (staff.commission_type === "percent") {
    return Number(((saleAmount * value) / 100).toFixed(2));
  }

  if (staff.commission_type === "fixed") {
    return Number(value.toFixed(2));
  }

  return 0;
}
async function createIncome(event) {
  event.preventDefault();

  if (!profile?.id || savingIncome) return;

  const amount = Number(incomeForm.amount || 0);

  if (!amount || amount <= 0) {
    alert("Informe o valor da entrada.");
    return;
  }

  if (!incomeForm.description.trim()) {
    alert("Informe a descrição da entrada.");
    return;
  }

  try {
    setSavingIncome(true);

    const response = await fetch("/api/finance/movements", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
  profilePageId: profile.id,
  type: "income",
  amount,
  description: incomeForm.description,
  paymentMethod: incomeForm.payment_method,
  note: incomeForm.note,

  customerName: incomeForm.customer_name,
  customerPhone: incomeForm.customer_phone,

  sourceType: incomeForm.product_id ? "manual_store_item_income" : "manual_income",
  sourceId: null,

  items: incomeForm.product_id
    ? [
        {
          product_id: incomeForm.product_id,
          title: incomeForm.product_title,
          reference: incomeForm.product_reference,
          qty: Number(incomeForm.product_qty || 1),
          price: Number(incomeForm.product_price || amount),
        },
      ]
    : null,

  registeredById: profile.user_id || null,
  registeredByName: profile.nome || "Dono da conta",
  registeredByRole: "owner",
  staffId: incomeForm.staff_id || null,

commissionAmount: calcStaffCommission(
  {
    commission_type: incomeForm.commission_type,
    commission_value: incomeForm.commission_value,
  },
  amount
),
commissionType: incomeForm.commission_type || "",
commissionToStaffId: incomeForm.staff_id || null,
commissionToStaffName: incomeForm.staff_name || "",
}),
    });

    const json = await response.json().catch(() => ({}));

    if (!response.ok) {
      alert(json.error || "Erro ao adicionar entrada.");
      return;
    }

    setIncomeForm(emptyIncomeForm());
    setShowIncomeModal(false);

    await refreshAll();

    alert("Entrada registrada no financeiro!");
  } catch (err) {
    console.error("Erro ao criar entrada:", err);
    alert("Erro ao adicionar entrada.");
  } finally {
    setSavingIncome(false);
  }
}
  if (loading) {
    return <div className="dashboard-loading">Carregando financeiro...</div>;
  }

  return (
    <div className="dashboard-section finance-dashboard">
      <div className="dashboard-page-header finance-page-head">
        <div>
          <span className="dashboard-eyebrow">Financeiro</span>
          <h2>Controle financeiro</h2>
          <p>
            Caixa diário, entradas, saídas e histórico completo da sua vitrine.
          </p>
        </div>

        <div className="finance-head-actions">
  <button
    type="button"
    className="finance-secondary-button"
    onClick={refreshAll}
  >
    Atualizar
  </button>

  <button
    type="button"
    className="finance-secondary-button"
    onClick={() => openRecurringModal()}
  >
    + Despesa fixa
  </button>

  <button
    type="button"
    className="finance-primary-button"
    onClick={() => setShowExpenseModal(true)}
  >
    + Adicionar saída
  </button>
  <button
  type="button"
  className="finance-primary-button"
  onClick={() => setShowIncomeModal(true)}
>
  + Adicionar entrada
</button>
</div>
      </div>

      <div className="finance-main-cards">
        <div className="finance-main-card active animated-balance-card">
  <div key={balanceViewIndex} className="balance-card-inner">
    <span>{getAnimatedBalanceCard().label}</span>
    <strong>{money(getAnimatedBalanceCard().value)}</strong>
    <small>{getAnimatedBalanceCard().detail}</small>
  </div>
</div>

        <div className="finance-main-card income animated-income-card">
  <div key={incomeViewIndex} className="income-card-inner">
    <span>{getAnimatedIncomeCard().label}</span>
    <strong>{money(getAnimatedIncomeCard().value)}</strong>
    <small>{getAnimatedIncomeCard().detail}</small>
  </div>
</div>

        <div className="finance-main-card expense animated-expense-card">
  <div key={expenseViewIndex} className="expense-card-inner">
    <span>{getAnimatedExpenseCard().label}</span>
    <strong>{money(getAnimatedExpenseCard().value)}</strong>
    <small>{getAnimatedExpenseCard().detail}</small>
  </div>
</div>
      </div>

      
<div className="finance-recurring-card">
  <div className="finance-recurring-head">
    <div>
      <span className="card-label">Despesas fixas</span>
      <h3>Contas recorrentes</h3>
      <p>
        Cadastre aluguel, internet, energia, assinatura, funcionário ou qualquer
        custo mensal que sempre volta.
      </p>
    </div>

    <div className="finance-recurring-filters">
   <button
  type="button"
  className={recurringFilter === "bills" ? "active" : ""}
  onClick={() => setRecurringFilter("bills")}
>
  Contas
</button>

      <button
        type="button"
        className={recurringFilter === "all" ? "active" : ""}
        onClick={() => setRecurringFilter("all")}
      >
        Todas
      </button>

      <button
        type="button"
        className={recurringFilter === "inactive" ? "active" : ""}
        onClick={() => setRecurringFilter("inactive")}
      >
        Desativadas
      </button>
    </div>
  </div>

  {loadingRecurring ? (
    <div className="finance-recurring-empty">
      Carregando despesas fixas...
    </div>
  ) : filteredRecurringExpenses.length === 0 ? (
    <div className="finance-recurring-empty">
      <strong>Nenhuma despesa fixa encontrada</strong>
      <p>
        Use os filtros acima para alternar entre despesas ativas, desativadas ou todas.
      </p>
    </div>
  ) : (
    <div className="finance-recurring-list">
      {filteredRecurringExpenses.map((item) => {
        const isInactive = item.is_active === false;

        return (
      <div
  key={item.id}
  className={`finance-recurring-item ${getRecurringCardStatus(item)}`}
  onClick={() => openRecurringModal(item)}
>
            <div className="finance-recurring-top">
              <span className="finance-recurring-icon">
                {item.icon || "💸"}
              </span>

              <div>
                <strong>{item.title}</strong>

                <small>
                  {item.frequency === "weekly"
  ? "Semana"
  : item.frequency === "biweekly"
  ? "Quinzena"
  : item.frequency === "monthly"
  ? "Mês"
  : item.frequency === "yearly"
  ? "Ano"
  : item.frequency}

                  {item.next_due_date
                    ? ` • ${formatDateBR(item.next_due_date)}`
                    : ""}
                </small>
              </div>
            </div>

            <div className="finance-recurring-value">
  <strong>{money(getRecurringDisplayAmount(item))}</strong>

{getRecurringStaffBreakdown(item) && (
  <div className="recurring-staff-breakdown">
    <span>
      Salário: {money(getRecurringStaffBreakdown(item).salary)}
    </span>

    <span>
      Comissão: {money(getRecurringStaffBreakdown(item).commission)}
    </span>
  </div>
)}

  <div className="recurring-card-actions">
    <button
      type="button"
      className="recurring-pill-action pay"
      onClick={(e) => {
        e.stopPropagation();
        confirmRecurringPayment(item);
      }}
      title="Confirmar pagamento"
    >
      <span>✔</span>
      <strong>Confirmar pagamento</strong>
    </button>

  </div>
</div>
          </div>
        );
      })}
    </div>
  )}
</div>

      <div className="finance-tools-card">
        <div className="finance-tools-grid">
          <label>
            <span>Data do caixa</span>
        <input
  type="date"
  value={selectedDate}
  disabled={dateMode !== "single"}
  onChange={(e) => setSelectedDate(e.target.value)}
/>
          </label>
          <div className="finance-date-mode">
  <button
    type="button"
    className={dateMode === "single" ? "active" : ""}
    onClick={() => {
      setDateMode("single");
      setStartDate("");
      setEndDate("");
    }}
  >
    Data específica
  </button>

  <button
    type="button"
    className={dateMode === "period" ? "active" : ""}
    onClick={() => {
      setDateMode("period");
      setSelectedDate("");
    }}
  >
    Período
  </button>
</div>
<label>

  <span>Data inicial</span>

<input
  type="date"
  value={startDate}
  disabled={dateMode !== "period"}
  onChange={(e) => setStartDate(e.target.value)}
/>

</label>

<label>

  <span>Data final</span>

 <input
  type="date"
  value={endDate}
  disabled={dateMode !== "period"}
  onChange={(e) => setEndDate(e.target.value)}
/>

</label>
          <label>
            <span>Buscar movimentação</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cliente, pedido, serviço, Pix..."
            />
          </label>

          <label>
            <span>Tipo</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="all">Tudo</option>
              <option value="income">Entradas</option>
              <option value="expense">Saídas</option>
            </select>
          </label>
        </div>
      </div>

      <div className="dashboard-card finance-movements-card">
        <div className="dashboard-card-head finance-card-head">
  <div>
    <strong>
      {startDate || endDate ? "Movimentações do período" : "Movimentações do dia"}
    </strong>

    <span>
      {startDate || endDate
        ? `${startDate ? formatDateBR(startDate) : "Início"} até ${
            endDate ? formatDateBR(endDate) : "Hoje"
          }`
        : formatDateBR(selectedDate)}
    </span>
  </div>

  <div className="finance-card-actions">
    {loadingMovements && <small>Atualizando...</small>}

 <button
  type="button"
  className="finance-export-button"
  onClick={() => setShowExportModal(true)}
  disabled={loadingMovements || movements.length === 0}
>
  Exportar
</button>
  </div>
</div>

        <div className="finance-list">
          {movements.map((item) => {
            const isExpense = item.type === "expense";

            return (
              <button
                key={item.id}
                type="button"
                className={`finance-item ${isExpense ? "expense" : "income"}`}
                onClick={() => setSelectedMovement(item)}
              >
                <div className="finance-item-left">

                  <span className="finance-item-icon">
                    {isExpense ? "↘" : "↗"}
                  </span>

                  <div>
                    <strong>{item.description || "Movimentação"}</strong>

                    <small>
                      {typeLabel(item.type)} • {paymentMethodLabel(item.payment_method)}
                    </small>
                  </div>
                </div>

                <div className="finance-item-right">
                  <strong>{isExpense ? "-" : "+"}{money(item.amount)}</strong>
                  <small>{formatDateTime(item.created_at)}</small>
                </div>
              </button>
            );
          })}

          {!loadingMovements && movements.length === 0 && (
            <div className="dashboard-empty finance-empty">
              <strong>Nenhuma movimentação nesta data</strong>
              <p>
                Finalize vendas, serviços ou adicione uma saída manual para o
                caixa aparecer aqui.
              </p>
            </div>
          )}
        </div>
      </div>

    {selectedMovement && (
  <div className="finance-modal-backdrop" onClick={() => setSelectedMovement(null)}>
    <div className="finance-receipt-modal" onClick={(e) => e.stopPropagation()}>
      <button type="button" className="finance-modal-close" onClick={() => setSelectedMovement(null)}>
        ×
      </button>

      <div className="finance-receipt-head">
        <span className="card-label">Detalhes da movimentação</span>
        <h3>{selectedMovement.description || "Movimentação financeira"}</h3>

        <div className={`finance-receipt-amount ${selectedMovement.type === "expense" ? "expense" : "income"}`}>
          {selectedMovement.type === "expense" ? "-" : "+"}
          {money(selectedMovement.amount)}
        </div>
      </div>

      {(selectedMovement.customer_name || selectedMovement.customer_phone) && (
        <div className="finance-receipt-section">
          <span>Cliente</span>

          {selectedMovement.customer_name && (
            <div className="finance-receipt-row">
              <strong>Nome</strong>
              <p>{selectedMovement.customer_name}</p>
            </div>
          )}

          {selectedMovement.customer_phone && (
            <div className="finance-receipt-row">
              <strong>WhatsApp</strong>
              <p>{selectedMovement.customer_phone}</p>
            </div>
          )}
        </div>
      )}

      {Array.isArray(selectedMovement.items) && selectedMovement.items.length > 0 && (
        <div className="finance-receipt-section">
          <span>Venda / Serviço</span>

          <div className="finance-receipt-items">
            {selectedMovement.items.map((item, index) => (
              <div key={index} className="finance-receipt-item">
                <strong>{item.title || item.name || "Item"}</strong>
                <p>
                  {item.qty || 1}x {item.price ? `• ${money(item.price)}` : ""}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="finance-receipt-section">
        <span>Movimentação</span>

        <div className="finance-receipt-grid">
          {selectedMovement.type && (
            <div>
              <strong>Tipo</strong>
              <p>{typeLabel(selectedMovement.type)}</p>
            </div>
          )}

          {selectedMovement.payment_method && (
            <div>
              <strong>Pagamento</strong>
              <p>{paymentMethodLabel(selectedMovement.payment_method)}</p>
            </div>
          )}

          {selectedMovement.source_type && (
            <div>
              <strong>Origem</strong>
              <p>{selectedMovement.source_type}</p>
            </div>
          )}

          {selectedMovement.created_at && (
            <div>
              <strong>Data</strong>
              <p>{formatDateTime(selectedMovement.created_at)}</p>
            </div>
          )}
        </div>
      </div>

      {(selectedMovement.registered_by_name ||
        selectedMovement.staff_name ||
        selectedMovement.registered_by_role) && (
        <div className="finance-receipt-section">
          <span>Responsável pelo registro</span>

          {(selectedMovement.registered_by_name || selectedMovement.staff_name) && (
            <div className="finance-receipt-row">
              <strong>Registrado por</strong>
              <p>{selectedMovement.registered_by_name || selectedMovement.staff_name}</p>
            </div>
          )}

          {selectedMovement.registered_by_role && (
            <div className="finance-receipt-row">
              <strong>Cargo</strong>
              <p>{selectedMovement.registered_by_role}</p>
            </div>
          )}
        </div>
      )}

      {Number(selectedMovement.commission_amount || 0) > 0 && (
        <div className="finance-receipt-section">
          <span>Comissão</span>

          {selectedMovement.commission_to_staff_name && (
            <div className="finance-receipt-row">
              <strong>Comissionado</strong>
              <p>{selectedMovement.commission_to_staff_name}</p>
            </div>
          )}

          <div className="finance-receipt-row">
            <strong>Valor da comissão</strong>
            <p>{money(selectedMovement.commission_amount)}</p>
          </div>

          {selectedMovement.commission_type && (
            <div className="finance-receipt-row">
              <strong>Tipo</strong>
              <p>{selectedMovement.commission_type}</p>
            </div>
          )}
        </div>
      )}

      {selectedMovement.note && (
        <div className="finance-receipt-section">
          <span>Observação</span>
          <p className="finance-receipt-note">{selectedMovement.note}</p>
        </div>
      )}
    </div>
  </div>
)}
{showExportModal && (
  <div
    className="finance-modal-backdrop"
    onClick={() => setShowExportModal(false)}
  >
    <div
      className="finance-export-modal"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className="finance-modal-close"
        onClick={() => setShowExportModal(false)}
      >
        ×
      </button>

      <span className="card-label">Exportar relatório</span>

      <h3>Escolha o formato</h3>

      <p>
        Exporte as movimentações filtradas por data, período, busca ou tipo.
      </p>

      <div className="finance-export-options">
        <button
          type="button"
          onClick={() => {
            setShowExportModal(false);
            exportMovementsToXlsx();
          }}
        >
          <strong>Excel</strong>
          <span>Planilha editável .xlsx</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setShowExportModal(false);
            exportMovementsToPdf();
          }}
        >
          <strong>PDF</strong>
          <span>Relatório pronto para enviar</span>
        </button>
      </div>
    </div>
  </div>
)}
{showRecurringModal && (
  <div
    className="finance-modal-backdrop"
    onClick={() => {
      setShowRecurringModal(false);
      setSelectedRecurringExpense(null);
    }}
  >
    <form
      className="finance-detail-modal"
      onSubmit={saveRecurringExpense}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className="finance-modal-close"
        onClick={() => {
          setShowRecurringModal(false);
          setSelectedRecurringExpense(null);
        }}
      >
        ×
      </button>

      <span className="card-label">
        {selectedRecurringExpense ? "Editar despesa fixa" : "Nova despesa fixa"}
      </span>

      <h3>
        {selectedRecurringExpense ? "Editar conta recorrente" : "Cadastrar conta recorrente"}
      </h3>

      <p>
        Escolha um ícone, informe o valor e marque o próximo vencimento.
        O sistema usa essa data como referência da recorrência.
      </p>

      <div className="finance-form-grid">
        <label className="full">
          <span>Ícone da despesa</span>

          <EmojiPicker
            value={recurringForm.icon}
            onChange={(emoji) =>
              setRecurringForm((prev) => ({
                ...prev,
                icon: emoji,
              }))
            }
          />
        </label>

        <label className="full">
          <span>Nome da despesa</span>

          <input
            value={recurringForm.title}
            onChange={(e) =>
              setRecurringForm((prev) => ({
                ...prev,
                title: e.target.value,
              }))
            }
            placeholder="Ex: Aluguel da loja"
          />
        </label>

        <label>
          <span>Valor</span>

          <input
            type="number"
            min="0"
            step="0.01"
            value={recurringForm.amount}
            onChange={(e) =>
              setRecurringForm((prev) => ({
                ...prev,
                amount: e.target.value,
              }))
            }
            placeholder="Ex: 1500"
          />
        </label>

        <label>
          <span>Forma de pagamento</span>

          <select
            value={recurringForm.paymentMethod}
            onChange={(e) =>
              setRecurringForm((prev) => ({
                ...prev,
                paymentMethod: e.target.value,
              }))
            }
          >
            <option value="cash">Dinheiro</option>
            <option value="pix">Pix</option>
            <option value="card">Cartão</option>
            <option value="transfer">Transferência</option>
            <option value="other">Outro</option>
          </select>
        </label>

        <label>
          <span>Frequência</span>

          <select
            value={recurringForm.frequency}
            onChange={(e) =>
              setRecurringForm((prev) => ({
                ...prev,
                frequency: e.target.value,
              }))
            }
          >
         <option value="weekly">Semana</option>
<option value="biweekly">Quinzena</option>
<option value="monthly">Mês</option>
<option value="yearly">Ano</option>
          </select>
        </label>

        <label>
          <span>Próximo vencimento</span>

          <input
            type="date"
            value={recurringForm.nextDueDate}
            onChange={(e) =>
              setRecurringForm((prev) => ({
                ...prev,
                nextDueDate: e.target.value,
              }))
            }
          />
        </label>

        <label className="full">
          <span>Observação</span>

          <textarea
            value={recurringForm.note}
            onChange={(e) =>
              setRecurringForm((prev) => ({
                ...prev,
                note: e.target.value,
              }))
            }
            placeholder="Detalhes opcionais"
          />
        </label>
      </div>

      <div className="finance-recurring-modal-actions">
        <button type="submit" className="finance-primary-button">
          {selectedRecurringExpense ? "Salvar alterações" : "Salvar despesa fixa"}
        </button>

        {selectedRecurringExpense && (
          <>
            <button
              type="button"
              className="finance-secondary-button"
              onClick={() => toggleRecurringExpense(selectedRecurringExpense)}
            >
              {selectedRecurringExpense?.is_active === false
  ? "Ativar"
  : "Desativar"}
            </button>

            <button
              type="button"
              className="danger-button"
              onClick={() => deleteRecurringExpense(selectedRecurringExpense)}
            >
              Excluir
            </button>
          </>
        )}
      </div>
    </form>
  </div>
)}
{showExpenseModal && (
  <div
    className="finance-modal-backdrop"
    onClick={() => setShowExpenseModal(false)}
  >
    <form
      className="finance-detail-modal"
      onSubmit={createExpense}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className="finance-modal-close"
        onClick={() => setShowExpenseModal(false)}
      >
        ×
      </button>

      <span className="card-label">Nova saída</span>

      <h3>Registrar saída</h3>

      <p>
        Use para registrar despesas, compras, comissões, combustível,
        material, manutenção ou qualquer saída do caixa.
      </p>

      <div className="finance-form-grid">
        <label>
          <span>Valor da saída</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={expenseForm.amount}
            onChange={(e) =>
              setExpenseForm((prev) => ({
                ...prev,
                amount: e.target.value,
              }))
            }
            placeholder="Ex: 50"
          />
        </label>

        <label>
          <span>Forma de pagamento</span>
          <select
            value={expenseForm.payment_method}
            onChange={(e) =>
              setExpenseForm((prev) => ({
                ...prev,
                payment_method: e.target.value,
              }))
            }
          >
            <option value="cash">Dinheiro</option>
            <option value="pix">Pix</option>
            <option value="card">Cartão</option>
            <option value="transfer">Transferência</option>
            <option value="other">Outro</option>
          </select>
        </label>

        <label className="full">
          <span>Descrição</span>
          <input
            value={expenseForm.description}
            onChange={(e) =>
              setExpenseForm((prev) => ({
                ...prev,
                description: e.target.value,
              }))
            }
            placeholder="Ex: Compra de material, gasolina, comissão..."
          />
        </label>

        <label className="full">
          <span>Observação</span>
          <textarea
            value={expenseForm.note}
            onChange={(e) =>
              setExpenseForm((prev) => ({
                ...prev,
                note: e.target.value,
              }))
            }
            placeholder="Detalhes opcionais"
          />
        </label>
      </div>

      <button
        type="submit"
        className="finance-primary-button full"
        disabled={savingExpense}
      >
        {savingExpense ? "Salvando..." : "Registrar saída"}
      </button>
    </form>
  </div>
)}
{showIncomeModal && (
  <div
    className="finance-modal-backdrop"
    onClick={() => setShowIncomeModal(false)}
  >
    <form
      className="finance-detail-modal"
      onSubmit={createIncome}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className="finance-modal-close"
        onClick={() => setShowIncomeModal(false)}
      >
        ×
      </button>

      <span className="card-label">Nova entrada</span>

      <h3>Registrar entrada</h3>

      <p>
        Use para registrar vendas presenciais, recebimentos avulsos,
        pagamentos em balcão ou qualquer entrada manual no caixa.
      </p>

      <div className="finance-form-grid">
        <label>
          <span>Valor da entrada</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={incomeForm.amount}
            onChange={(e) =>
              setIncomeForm((prev) => ({
                ...prev,
                amount: e.target.value,
              }))
            }
            placeholder="Ex: 120"
          />
        </label>

        <label>
          <span>Forma de pagamento</span>
          <select
            value={incomeForm.payment_method}
            onChange={(e) =>
              setIncomeForm((prev) => ({
                ...prev,
                payment_method: e.target.value,
              }))
            }
          >
            <option value="cash">Dinheiro</option>
            <option value="pix">Pix</option>
            <option value="card">Cartão</option>
            <option value="transfer">Transferência</option>
            <option value="other">Outro</option>
          </select>
        </label>

        <label className="full income-search-field">
  <span>Vincular produto existente</span>

 <input
  value={incomeProductSearch}
  onChange={(e) => searchIncomeProducts(e.target.value)}
  onBlur={() => {
    setTimeout(() => setIncomeProductResults([]), 120);
  }}
  placeholder="Busque pelo nome ou referência do produto..."
/>

  {incomeProductResults.length > 0 && (
    <div className="income-search-results">
      {incomeProductResults.map((product) => (
        <button
          key={product.id}
          type="button"
          onClick={() => {
            setIncomeForm((prev) => ({
              ...prev,
              product_id: product.id,
              product_title: product.title || "Produto",
              product_reference: product.reference_code || "",
              product_price: product.price || "",
              amount: product.price || prev.amount,
              description:
                prev.description ||
                `Venda presencial - ${product.title || "Produto"}`,
            }));

            setIncomeProductSearch(product.title || "Produto");
            setIncomeProductResults([]);
          }}
        >
          <span className="income-result-thumb">
            {product.image_url ? (
              <img src={product.image_url} alt={product.title || "Produto"} />
            ) : (
              "📦"
            )}
          </span>

          <span className="income-result-info">
            <strong>{product.title || "Produto"}</strong>
            <small>
              {product.reference_code
                ? `Ref: ${product.reference_code}`
                : "Sem referência"}
            </small>
          </span>

          <span className="income-result-price">{money(product.price)}</span>
        </button>
      ))}
    </div>
  )}
</label>

<label className="full income-search-field">
  <span>Funcionário responsável / comissão</span>
<input
  value={staffSearch}
  onChange={(e) => searchStaffForIncome(e.target.value)}
  onBlur={() => {
    setTimeout(() => setStaffResults([]), 120);
  }}
  placeholder="Busque o funcionário que receberá comissão..."
/>

  {staffResults.length > 0 && (
    <div className="income-search-results">
      {staffResults.map((staff) => {
        const commissionAmount = calcStaffCommission(staff, incomeForm.amount);

        return (
          <button
            key={staff.id}
            type="button"
            onClick={() => {
              setIncomeForm((prev) => ({
                ...prev,
                staff_id: staff.id,
                staff_name: staff.nome || "Funcionário",
                commission_type: staff.commission_type || "none",
                commission_value: Number(staff.commission_value || 0),
                commission_amount: calcStaffCommission(staff, prev.amount),
              }));

              setStaffSearch(staff.nome || "Funcionário");
              setStaffResults([]);
            }}
          >
            <span className="income-result-thumb">👤</span>

            <span className="income-result-info">
              <strong>{staff.nome}</strong>
              <small>
                {staff.commission_type === "percent"
                  ? `${Number(staff.commission_value || 0)}% de comissão`
                  : staff.commission_type === "fixed"
                  ? `${money(staff.commission_value)} por venda`
                  : "Sem comissão"}
              </small>
            </span>

            <span className="income-result-price">
              {commissionAmount > 0 ? money(commissionAmount) : "—"}
            </span>
          </button>
        );
      })}
    </div>
  )}

  {incomeForm.staff_id && (
    <small className="income-selected-commission">
      Comissão para {incomeForm.staff_name}:{" "}
      {money(
        calcStaffCommission(
          {
            commission_type: incomeForm.commission_type,
            commission_value: incomeForm.commission_value,
          },
          incomeForm.amount
        )
      )}
    </small>
  )}
</label>

        <label className="full">
          <span>Descrição</span>
          <input
            value={incomeForm.description}
            onChange={(e) =>
              setIncomeForm((prev) => ({
                ...prev,
                description: e.target.value,
              }))
            }
            placeholder="Ex: Venda presencial, serviço realizado..."
          />
        </label>

        <label>
          <span>Cliente</span>
          <input
            value={incomeForm.customer_name}
            onChange={(e) =>
              setIncomeForm((prev) => ({
                ...prev,
                customer_name: e.target.value,
              }))
            }
            placeholder="Nome opcional"
          />
        </label>

        <label>
          <span>WhatsApp</span>
          <input
            value={incomeForm.customer_phone}
            onChange={(e) =>
              setIncomeForm((prev) => ({
                ...prev,
                customer_phone: e.target.value,
              }))
            }
            placeholder="Opcional"
          />
        </label>

        <label className="full">
          <span>Observação</span>
          <textarea
            value={incomeForm.note}
            onChange={(e) =>
              setIncomeForm((prev) => ({
                ...prev,
                note: e.target.value,
              }))
            }
            placeholder="Detalhes opcionais"
          />
        </label>
      </div>

      <button
        type="submit"
        className="finance-primary-button full"
        disabled={savingIncome}
      >
        {savingIncome ? "Salvando..." : "Registrar entrada"}
      </button>
    </form>
  </div>
)}
    </div>
  );
}