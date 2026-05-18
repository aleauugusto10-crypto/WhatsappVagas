// rendaja-landpage/pages/admin/leads-conversations.js

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
const API_BASE =
  process.env.NEXT_PUBLIC_LEAD_API_URL || "http://localhost:3000";

async function safeJson(res) {
  const text = await res.text();

  try {
    return JSON.parse(text);
  } catch {
    console.error("Resposta não JSON:", {
      status: res.status,
      url: res.url,
      text,
    });

    throw new Error("A API retornou uma resposta inválida.");
  }
}

function normalizeText(value = "") {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function hasConversation(lead) {
  return Boolean(
    lead?.last_message ||
      lead?.prospection_started_at ||
      lead?.last_reply_at ||
      lead?.preview_url ||
      lead?.conversation_mode === "human" ||
      lead?.conversation_mode === "waiting_human" ||
      lead?.status === "contacted" ||
      lead?.status === "accepted"
  );
}

function getLeadStatusLabel(lead) {
  if (lead?.status === "ignored") return "Ignorado";
  if (lead?.conversation_mode === "waiting_human") return "Aguardando humano";
  if (lead?.conversation_mode === "human") return "Humano assumiu";
  if (lead?.last_message?.toLowerCase?.().includes("pix")) return "Pagamento";
  if (lead?.preview_url || lead?.preview_status === "generated") return "Vitrine gerada";
  if (lead?.status === "contacted") return "Contato iniciado";
  if (!hasConversation(lead)) return "Novo lead";
  return lead?.status || "Aberto";
}

function getLeadBadgeStyle(lead) {
  if (lead?.status === "ignored") {
    return {
      background: "#fee2e2",
      color: "#991b1b",
      border: "1px solid #fecaca",
    };
  }

  if (lead?.conversation_mode === "waiting_human") {
    return {
      background: "#fef3c7",
      color: "#92400e",
      border: "1px solid #fde68a",
    };
  }

  if (lead?.conversation_mode === "human") {
    return {
      background: "#dbeafe",
      color: "#1e40af",
      border: "1px solid #bfdbfe",
    };
  }

  if (lead?.last_message?.toLowerCase?.().includes("pix")) {
    return {
      background: "#dcfce7",
      color: "#166534",
      border: "1px solid #bbf7d0",
    };
  }

  if (lead?.preview_url || lead?.preview_status === "generated") {
    return {
      background: "#ffedd5",
      color: "#9a3412",
      border: "1px solid #fed7aa",
    };
  }

  return {
    background: "#f1f5f9",
    color: "#334155",
    border: "1px solid #e2e8f0",
  };
}

function getPriorityScore(lead) {
  if (lead?.conversation_mode === "waiting_human") return 1000;
  if (lead?.last_message?.toLowerCase?.().includes("pix")) return 900;
  if (lead?.conversation_mode === "human") return 800;
  if (lead?.preview_url || lead?.preview_status === "generated") return 700;
  if (lead?.status === "contacted") return 600;
  if (hasConversation(lead)) return 500;
  if (lead?.status === "ignored") return 100;
  return 200;
}

function formatDate(value) {
  if (!value) return "";

  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "";
  }
}
const PIPELINE_TABS = [
  {
    key: "open",
    label: "Conversas abertas",
    description: "Leads com conversa iniciada",
    filter: (lead) =>
      hasConversation(lead) &&
      lead.status !== "ignored" &&
      lead.conversation_mode !== "waiting_human",
  },
  {
    key: "all",
    label: "Todos",
    description: "Todos os leads",
    filter: () => true,
  },
  {
    key: "new",
    label: "Novos leads",
    description: "Ainda sem conversa",
    filter: (lead) => !hasConversation(lead) && lead.status !== "ignored",
  },
  {
    key: "contacted",
    label: "Contato iniciado",
    description: "IA já chamou o lead",
    filter: (lead) => lead.status === "contacted",
  },
  {
    key: "interested",
    label: "Interessados",
    description: "Leads com sinal de interesse",
    filter: (lead) =>
      Boolean(lead.preview_url) ||
      lead.preview_status === "generated" ||
      normalizeText(lead.last_message).includes("gostei") ||
      normalizeText(lead.last_message).includes("ativacao") ||
      normalizeText(lead.last_message).includes("ativação") ||
      normalizeText(lead.last_message).includes("plano"),
  },
  {
    key: "waiting_human",
    label: "Aguardando humano",
    description: "Cliente pediu atendimento",
    filter: (lead) => lead.conversation_mode === "waiting_human",
  },
  {
    key: "human",
    label: "Humano assumiu",
    description: "IA pausada",
    filter: (lead) => lead.conversation_mode === "human",
  },
  {
    key: "preview",
    label: "Vitrine gerada",
    description: "Leads com prévia pronta",
    filter: (lead) =>
      Boolean(lead.preview_url) || lead.preview_status === "generated",
  },
  {
    key: "payment",
    label: "Pagamento",
    description: "Pix ou pagamento em andamento",
    filter: (lead) =>
      normalizeText(lead.last_message).includes("pix") ||
      normalizeText(lead.last_message).includes("pagamento") ||
      normalizeText(lead.last_message).includes("ativacao") ||
      normalizeText(lead.last_message).includes("ativação") ||
      lead.preview_status === "payment",
  },
  {
    key: "ignored",
    label: "Ignorados",
    description: "Leads descartados",
    filter: (lead) => lead.status === "ignored",
  },
];
async function cancelProspection() {
  if (!selectedLead?.id) return;

  const confirmed = confirm(
    "Cancelar a prospecção desse lead e parar a IA?"
  );

  if (!confirmed) return;

  const res = await fetch(
    `${API_BASE}/api/leads/${selectedLead.id}/cancel-prospection`,
    {
      method: "POST",
    }
  );

  const data = await safeJson(res);

  if (!res.ok) {
    alert(data.error || "Erro ao cancelar prospecção.");
    return;
  }

  await loadLeads({ silent: true });
  await openLead(data.lead);

  alert("Prospecção cancelada.");
}
export default function LeadsConversationsPage() {
  const router = useRouter();

const [isAuthorized, setIsAuthorized] =
  useState(false);

const [checkingAuth, setCheckingAuth] =
  useState(true);
  const [leads, setLeads] = useState([]);
  const [selectedLead, setSelectedLead] = useState(null);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState("");
  const [activeTab, setActiveTab] = useState("open");
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeCity, setActiveCity] = useState("all");
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [showPaymentOptions, setShowPaymentOptions] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
const [discoveryCitiesText, setDiscoveryCitiesText] = useState("");
const [discoveryState, setDiscoveryState] = useState("SE");
const [loadingCities, setLoadingCities] = useState(false);
const [discoveryCategoriesText, setDiscoveryCategoriesText] = useState(
  "academia\npizzaria\npadaria\nrestaurante\nbarbearia\nsalão de beleza\noficina\nclínica"
);
const [discoveryJobs, setDiscoveryJobs] = useState([]);
const [loadingJobs, setLoadingJobs] = useState(false);
  const activeTabData =
    PIPELINE_TABS.find((tab) => tab.key === activeTab) || PIPELINE_TABS[0];

  const tabCounts = useMemo(() => {
    return PIPELINE_TABS.reduce((acc, tab) => {
      acc[tab.key] = leads.filter(tab.filter).length;
      return acc;
    }, {});
  }, [leads]);

const discoveredCategories = useMemo(() => {
  const map = new Map();

  leads.forEach((lead) => {
    const category = lead.categoria || "Sem categoria";
    map.set(category, (map.get(category) || 0) + 1);
  });

  return Array.from(map.entries())
    .map(([category, count]) => ({
      category,
      count,
    }))
    .sort((a, b) => b.count - a.count);
}, [leads]);
const discoveredCities = useMemo(() => {
  const map = new Map();

  leads.forEach((lead) => {
    const city = lead.cidade || "Sem cidade";
    map.set(city, (map.get(city) || 0) + 1);
  });

  return Array.from(map.entries())
    .map(([city, count]) => ({
      city,
      count,
    }))
    .sort((a, b) => b.count - a.count);
}, [leads]);
  const filteredLeads = useMemo(() => {
    const query = normalizeText(search);

    return leads
      .filter(activeTabData.filter)
      .filter((lead) => {
  if (activeCategory === "all") return true;
  return normalizeText(lead.categoria) === normalizeText(activeCategory);
})
.filter((lead) => {
  if (activeCity === "all") return true;
  return normalizeText(lead.cidade) === normalizeText(activeCity);
})
      .filter((lead) => {
        if (!query) return true;

        const haystack = normalizeText(`
          ${lead.empresa || ""}
          ${lead.telefone || ""}
          ${lead.whatsapp || ""}
          ${lead.cidade || ""}
          ${lead.estado || ""}
          ${lead.categoria || ""}
          ${lead.last_message || ""}
        `);

        return haystack.includes(query);
      })
      .sort((a, b) => {
        const priority = getPriorityScore(b) - getPriorityScore(a);
        if (priority !== 0) return priority;

        const dateA = new Date(
          a.last_reply_at ||
            a.preview_generated_at ||
            a.prospection_started_at ||
            a.created_at ||
            0
        ).getTime();

        const dateB = new Date(
          b.last_reply_at ||
            b.preview_generated_at ||
            b.prospection_started_at ||
            b.created_at ||
            0
        ).getTime();

        return dateB - dateA;
      });
  }, [activeTabData, leads, search]);

  async function processNextDiscoveryJob() {
  try {
    const res = await fetch(
      `${API_BASE}/api/discovery/jobs/process-next`,
      {
        method: "POST",
      }
    );

    const data = await safeJson(res);

    if (!res.ok) {
      alert(data.error || "Erro ao processar próxima cidade.");
      return;
    }

    alert(data.message || "Próxima cidade processada.");

    await loadDiscoveryJobs();
    await loadLeads({ silent: true });
  } catch (err) {
    console.error("Erro ao processar fila:", err);
    alert("Erro ao processar fila. Veja o console.");
  }
}
async function fetchCitiesByState() {
  try {
    setLoadingCities(true);

    const uf = discoveryState
      .trim()
      .toUpperCase();

    if (!uf || uf.length !== 2) {
      alert("Digite uma UF válida. Ex: SE, BA, SP");
      return;
    }

    const res = await fetch(
      `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`
    );

    const data = await res.json();

    if (!Array.isArray(data)) {
      alert("Erro ao buscar cidades.");
      return;
    }

    const cities = data
      .map((city) => city.nome)
      .sort((a, b) =>
        a.localeCompare(b, "pt-BR")
      );

    setDiscoveryCitiesText(
      cities.join("\n")
    );

    alert(
      `${cities.length} cidades carregadas de ${uf}`
    );
  } catch (err) {
    console.error(err);
    alert(
      "Erro ao buscar cidades do estado."
    );
  } finally {
    setLoadingCities(false);
  }
}
  async function loadDiscoveryJobs() {
  try {
    setLoadingJobs(true);

    const res = await fetch(
      `${API_BASE}/api/discovery/jobs`
    );

    const data = await safeJson(res);

    setDiscoveryJobs(
      Array.isArray(data) ? data : []
    );
  } catch (err) {
    console.error(
      "Erro ao carregar filas:",
      err
    );
  } finally {
    setLoadingJobs(false);
  }
}

async function createDiscoveryJobs() {
  try {
    const cities = discoveryCitiesText
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);

    const categories =
      discoveryCategoriesText
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean);

    if (!cities.length) {
      alert("Digite ao menos uma cidade.");
      return;
    }

    const res = await fetch(
      `${API_BASE}/api/discovery/jobs`,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          cities,
          categories,
          state: "SE",
        }),
      }
    );

    const data = await safeJson(res);

    if (!res.ok) {
      alert(
        data.error ||
          "Erro ao criar fila."
      );
      return;
    }

    alert(
      `${data.total} cidades adicionadas à fila.`
    );

    setDiscoveryCitiesText("");

    await loadDiscoveryJobs();
  } catch (err) {
    console.error(err);
    alert(
      "Erro ao criar fila."
    );
  }
}
    async function loadLeads({ silent = false } = {}) {
    try {
      if (!silent) setLoading(true);

      const res = await fetch(`${API_BASE}/api/leads`);
      const data = await safeJson(res);

      const list = Array.isArray(data) ? data : [];
      setLeads(list);
      setLastUpdatedAt(new Date());

      if (selectedLead?.id) {
        const updatedSelected = list.find((item) => item.id === selectedLead.id);
        if (updatedSelected) setSelectedLead(updatedSelected);
      }
    } catch (err) {
      console.error("Erro ao carregar leads:", err);
    } finally {
      if (!silent) setLoading(false);
    }
  }

  async function openLead(lead) {
    setSelectedLead(lead);
    setLoadingMessages(true);
    setShowPaymentOptions(false);

    try {
      const convRes = await fetch(
        `${API_BASE}/api/leads/${lead.id}/conversations`,
        {
          method: "POST",
        }
      );

      const conv = await safeJson(convRes);
      setConversation(conv);

      await loadMessages(conv.id, { silent: false });
    } catch (err) {
      console.error("Erro ao abrir conversa:", err);
      alert("Erro ao abrir conversa. Veja o console.");
    } finally {
      setLoadingMessages(false);
    }
  }
async function loadMessages(conversationId, { silent = true } = {}) {
  if (!conversationId) return;

  try {
    if (!silent) setLoadingMessages(true);

    const msgRes = await fetch(
      `${API_BASE}/api/leads/conversations/${conversationId}/messages`
    );

    const msgs = await safeJson(msgRes);

    setMessages(Array.isArray(msgs) ? msgs : []);
  } catch (err) {
    console.error("Erro ao atualizar mensagens:", err);
  } finally {
    if (!silent) setLoadingMessages(false);
  }
}
  async function assumeConversation() {
    if (!selectedLead?.id) {
      alert("Selecione uma conversa primeiro.");
      return;
    }

    try {
      const res = await fetch(
        `${API_BASE}/api/leads/${selectedLead.id}/assume`,
        {
          method: "POST",
        }
      );

      const updated = await safeJson(res);

      if (!res.ok) {
        alert(updated.error || "Erro ao assumir conversa.");
        return;
      }

      setSelectedLead(updated);
      await loadLeads({ silent: true });
      alert("Conversa assumida. IA pausada para esse lead.");
    } catch (err) {
      console.error("Erro ao assumir conversa:", err);
      alert("Erro ao assumir conversa. Veja o console.");
    }
  }

  async function generatePayment(planCode) {
    if (!selectedLead?.id || !conversation?.id) {
      alert("Selecione uma conversa antes de gerar pagamento.");
      return;
    }

    try {
      const res = await fetch(
        `${API_BASE}/api/leads/${selectedLead.id}/generate-payment`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            conversationId: conversation.id,
            planCode,
          }),
        }
      );

      const data = await safeJson(res);

      if (!res.ok) {
        console.error("API respondeu erro:", data);
        alert(data.error || "Erro ao gerar pagamento.");
        return;
      }

      setMessages((prev) => [
        ...prev,
        ...(Array.isArray(data.messages) ? data.messages : []),
      ]);

      setShowPaymentOptions(false);
      setReply("");
      await loadLeads({ silent: true });
      alert("Pagamento gerado e enviado na conversa.");
    } catch (err) {
      console.error("Erro ao gerar pagamento:", err);
      alert("Erro ao gerar pagamento. Veja o console.");
    }
  }

  async function sendReply() {
    if (!reply.trim() || !conversation?.id) return;

    if (reply.trim().toLowerCase() === "/gerar pagamento") {
      setShowPaymentOptions(true);
      setReply("");
      return;
    }

    const messageToSend = reply;

    try {
      const res = await fetch(
        `${API_BASE}/api/leads/conversations/${conversation.id}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            role: "assistant",
            message: messageToSend,
            metadata: {
              source: "human_agent",
            },
          }),
        }
      );

      const saved = await safeJson(res);

      if (!res.ok) {
        alert(saved.error || "Erro ao enviar mensagem.");
        return;
      }

      setMessages((prev) => [...prev, saved]);
      setReply("");
      await openLead(selectedLead);
      await loadLeads({ silent: true });
    } catch (err) {
      console.error("Erro ao enviar mensagem:", err);
      alert("Erro ao enviar mensagem. Veja o console.");
    }
  }

  function handleReplyChange(value) {
    setReply(value);
    setShowPaymentOptions(value.trim().toLowerCase() === "/gerar pagamento");
  }
async function startFilteredProspection() {
  try {
    const eligibleLeads = filteredLeads.filter((lead) => {
      return (
        !hasConversation(lead) &&
        lead.status !== "ignored"
      );
    });

    if (!eligibleLeads.length) {
      alert("Todos os leads dessa seleção já foram iniciados ou não estão disponíveis para prospecção.");
      return;
    }

    const confirmed = confirm(
      `Iniciar prospecção de ${eligibleLeads.length} leads?`
    );

    if (!confirmed) return;

    let success = 0;
    let failed = 0;
    let skipped = 0;

    function fetchWithTimeout(url, options = {}, timeoutMs = 20000) {
      return Promise.race([
        fetch(url, options),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("Timeout: esse lead travou por mais de 20s.")),
            timeoutMs
          )
        ),
      ]);
    }

    for (const lead of eligibleLeads) {
      try {
        console.log("🚀 Iniciando prospecção:", lead.empresa);

        const res = await fetchWithTimeout(
          `${API_BASE}/api/leads/${lead.id}/start-prospection`,
          {
            method: "POST",
          },
          20000
        );

        const data = await safeJson(res);

        if (!res.ok) {
          failed++;

          console.error("❌ Falhou prospecção:", {
            lead: lead.empresa,
            status: res.status,
            data,
          });

          continue;
        }

        success++;

        const wait =
          Math.floor(Math.random() * 12000) + 8000;

        await new Promise((resolve) =>
          setTimeout(resolve, wait)
        );
      } catch (err) {
        failed++;

        console.error("⏭️ Pulando lead travado:", {
          lead: lead.empresa,
          error: err.message,
        });

        continue;
      }
    }

    await loadLeads();

    alert(
      `Prospecção finalizada.\n\n✅ Iniciados: ${success}\n❌ Falharam/pulados: ${failed}\n⏭️ Ignorados: ${skipped}`
    );
  } catch (err) {
    console.error("Erro geral na prospecção:", err);

    alert(
      "A prospecção travou de um jeito que não deu para continuar. Veja o console do navegador."
    );
  }
}
 useEffect(() => {
  if (!isAuthorized) return;

  loadLeads();
  loadDiscoveryJobs();

  const interval = setInterval(() => {
    loadLeads({ silent: true });
    loadDiscoveryJobs();
  }, 15000);

  return () => clearInterval(interval);
}, [isAuthorized]);
useEffect(() => {
  if (!isAuthorized || !conversation?.id) return;

  const interval = setInterval(() => {
    loadMessages(conversation.id, { silent: true });
    loadLeads({ silent: true });
  }, 5000);

  return () => clearInterval(interval);
}, [isAuthorized, conversation?.id]);

useEffect(() => {
  const adminToken =
    localStorage.getItem("crm_admin_token");

  const expectedToken =
    process.env.NEXT_PUBLIC_CRM_ADMIN_TOKEN;

  if (
    adminToken &&
    adminToken === expectedToken
  ) {
    setIsAuthorized(true);
  } else {
    router.replace("/admin/login");
  }

  setCheckingAuth(false);
}, []);

if (checkingAuth) {
  return null;
}

if (!isAuthorized) {
  return null;
}
    return (
  <>
    <style jsx global>{`
      .crm-scroll-row {
        scrollbar-width: none;
        -ms-overflow-style: none;
        -webkit-overflow-scrolling: touch;
      }

      .crm-scroll-row::-webkit-scrollbar {
        display: none;
        width: 0;
        height: 0;
      }
    `}</style>

    <main style={styles.page}>
      <section style={styles.crm}>
        <header style={styles.header}>
          <div>
            <h1 style={styles.title}>CRM de Conversas</h1>
            <p style={styles.subtitle}>
              Acompanhe prospecção, vitrines, pagamento e atendimento humano.
            </p>
          </div>

          <div style={styles.headerActions}>
            {lastUpdatedAt && (
              <span style={styles.updatedAt}>
                Atualizado {formatDate(lastUpdatedAt)}
              </span>
            )}

            <button onClick={() => loadLeads()} style={styles.refreshButton}>
              Atualizar
            </button>
          </div>
        </header>
<section style={styles.discoveryBox}>
  <div style={styles.discoveryHeader}>
    <div>
      <strong style={styles.discoveryTitle}>Central de busca por cidade</strong>
      <p style={styles.discoverySubtitle}>
        Cole cidades e categorias. O sistema cria uma fila para buscar uma cidade por vez.
      </p>
    </div>

   <div style={styles.discoveryActions}>
  <button
    onClick={createDiscoveryJobs}
    style={styles.discoveryButton}
  >
    Criar fila
  </button>

  <button
    onClick={processNextDiscoveryJob}
    style={styles.discoveryButtonDark}
  >
    Buscar próxima cidade
  </button>
  <button
  onClick={cancelProspection}
  style={styles.cancelButton}
>
  Cancelar
</button>
</div>
  </div>

  <div style={styles.discoveryGrid}>
    <label style={styles.discoveryLabel}>
  Estado + cidades automáticas

  <div style={styles.stateRow}>
    <input
      value={discoveryState}
      onChange={(e) =>
        setDiscoveryState(
          e.target.value.toUpperCase()
        )
      }
      placeholder="SE"
      maxLength={2}
      style={styles.stateInput}
    />

    <button
      onClick={fetchCitiesByState}
      style={styles.fetchCitiesButton}
      disabled={loadingCities}
    >
      {loadingCities
        ? "Buscando..."
        : "Buscar cidades"}
    </button>
  </div>

  <textarea
    value={discoveryCitiesText}
    onChange={(e) =>
      setDiscoveryCitiesText(
        e.target.value
      )
    }
    placeholder="As cidades aparecerão aqui"
    style={styles.discoveryTextarea}
  />
</label>

    <label style={styles.discoveryLabel}>
      Categorias, uma por linha
      <textarea
        value={discoveryCategoriesText}
        onChange={(e) => setDiscoveryCategoriesText(e.target.value)}
        style={styles.discoveryTextarea}
      />
    </label>
  </div>

  <div style={styles.discoveryJobs}>
    {loadingJobs ? (
      <span style={styles.discoveryMuted}>Carregando fila...</span>
    ) : discoveryJobs.length === 0 ? (
      <span style={styles.discoveryMuted}>Nenhuma cidade na fila ainda.</span>
    ) : (
      discoveryJobs.slice(0, 8).map((job) => (
        <span key={job.id} style={styles.discoveryJobPill}>
          {job.city}
          <small>{job.status}</small>
        </span>
      ))
    )}
  </div>
</section>
        <div className="crm-scroll-row" style={styles.pipeline}>

          {PIPELINE_TABS.map((tab) => {
            const isActive = tab.key === activeTab;

            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  ...styles.pipelineTab,
                  ...(isActive ? styles.pipelineTabActive : {}),
                }}
              >
                <span style={styles.pipelineLabel}>{tab.label}</span>
                <span
                  style={{
                    ...styles.pipelineCount,
                    ...(isActive ? styles.pipelineCountActive : {}),
                  }}
                >
                  {tabCounts[tab.key] || 0}
                </span>
              </button>
            );
          })}
        </div>
<div className="crm-scroll-row" style={styles.categoryBar}>
  <button
    onClick={() => setActiveCategory("all")}
    style={{
      ...styles.categoryButton,
      ...(activeCategory === "all" ? styles.categoryButtonActive : {}),
    }}
  >
    Todas categorias
  </button>

  {discoveredCategories.map((item) => (
    <button
      key={item.category}
      onClick={() => setActiveCategory(item.category)}
      style={{
        ...styles.categoryButton,
        ...(activeCategory === item.category
          ? styles.categoryButtonActive
          : {}),
      }}
    >
      {item.category}
      <span>{item.count}</span>
    </button>
  ))}
</div>
<div className="crm-scroll-row" style={styles.categoryBar}>
  <button
    onClick={() => setActiveCity("all")}
    style={{
      ...styles.cityButton,
      ...(activeCity === "all" ? styles.cityButtonActive : {}),
    }}
  >
    Todas cidades
  </button>

  {discoveredCities.map((item) => (
    <button
      key={item.city}
      onClick={() => setActiveCity(item.city)}
      style={{
        ...styles.cityButton,
        ...(activeCity === item.city ? styles.cityButtonActive : {}),
      }}
    >
      {item.city}
      <span>{item.count}</span>
    </button>
  ))}
</div>
        <div style={styles.toolbar}>
          <div>
            <strong style={styles.sectionTitle}>{activeTabData.label}</strong>
            <p style={styles.sectionSubtitle}>{activeTabData.description}</p>
          </div>

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar empresa, telefone, cidade..."
            style={styles.searchInput}
          />
          <button
  onClick={startFilteredProspection}
  style={styles.prospectButton}
>
  Iniciar prospecção
</button>
        </div>

        {loading ? (
          <div style={styles.loadingBox}>Carregando leads...</div>
        ) : filteredLeads.length === 0 ? (
          <div style={styles.emptyList}>
            Nenhum lead encontrado nessa aba.
          </div>
        ) : (
          <div style={styles.grid}>
            {filteredLeads.map((lead) => {
              const selected = selectedLead?.id === lead.id;

              return (
                <button
                  key={lead.id}
                  onClick={() => openLead(lead)}
                  style={{
                    ...styles.card,
                    ...(selected ? styles.cardSelected : {}),
                  }}
                >
                  <div style={styles.cardTop}>
                    <strong style={styles.name}>
                      {lead.empresa || "Empresa sem nome"}
                    </strong>

                    <span
                      style={{
                        ...styles.badge,
                        ...getLeadBadgeStyle(lead),
                      }}
                    >
                      {getLeadStatusLabel(lead)}
                    </span>
                  </div>

                  <div style={styles.cardMeta}>
                    <span>{lead.categoria || "Sem categoria"}</span>
                    <span>•</span>
                    <span>{lead.cidade || "Sem cidade"}</span>
                  </div>

                  <p style={styles.lastMessage}>
                    {lead.last_message || "Lead ainda sem conversa iniciada."}
                  </p>

                  <div style={styles.cardFooter}>
                    <span>{lead.whatsapp || lead.telefone || "Sem WhatsApp"}</span>
                    {lead.preview_url ? (
                      <span style={styles.miniFlag}>Vitrine</span>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <aside style={styles.panel}>
        {!selectedLead ? (
          <div style={styles.emptyPanel}>
            <strong>Selecione uma conversa</strong>
            <span>Escolha um lead para acompanhar as mensagens.</span>
          </div>
        ) : (
          <>
            <header style={styles.panelHeader}>
              <div style={styles.panelLeadInfo}>
                <div style={styles.panelTitleRow}>
                  <h2 style={styles.panelTitle}>
                    {selectedLead.empresa || "Lead sem nome"}
                  </h2>

                  <span
                    style={{
                      ...styles.badge,
                      ...getLeadBadgeStyle(selectedLead),
                    }}
                  >
                    {getLeadStatusLabel(selectedLead)}
                  </span>
                </div>

                <p style={styles.panelMeta}>
                  {selectedLead.categoria || "Sem categoria"} •{" "}
                  {selectedLead.cidade || "Sem cidade"}
                </p>

                <p style={styles.panelPhone}>
                  {selectedLead.whatsapp ||
                    selectedLead.telefone ||
                    "Sem WhatsApp cadastrado"}
                </p>
              </div>

              <div style={styles.panelActions}>
                <button
                  onClick={assumeConversation}
                  style={styles.assumeButton}
                >
                  Assumir
                </button>

                {selectedLead.preview_url && (
                  <a
                    href={selectedLead.preview_url}
                    target="_blank"
                    rel="noreferrer"
                    style={styles.previewButton}
                  >
                    Vitrine
                  </a>
                )}

                <button
                  onClick={() => setShowPaymentOptions((value) => !value)}
                  style={styles.paymentTopButton}
                >
                  Pagamento
                </button>
              </div>
            </header>
                        <div style={styles.messages}>
              {loadingMessages ? (
                <div style={styles.loadingBox}>Carregando mensagens...</div>
              ) : messages.length === 0 ? (
                <div style={styles.emptyMessages}>
                  Nenhuma mensagem nessa conversa ainda.
                </div>
              ) : (
                messages.map((msg, index) => {
                  const isClient = msg.role === "user";
                  const isHuman =
                    msg.metadata?.source === "human_agent" ||
                    msg.metadata?.source === "human_payment";

                  return (
                    <div
                      key={msg.id || index}
                      style={{
                        ...styles.bubble,
                        ...(isClient ? styles.clientBubble : styles.agentBubble),
                      }}
                    >
                      <div style={styles.bubbleHeader}>
                        <strong style={styles.role}>
                          {isClient ? "Cliente" : isHuman ? "Atendente" : "IA"}
                        </strong>

                        {msg.created_at && (
                          <span style={styles.messageTime}>
                            {formatDate(msg.created_at)}
                          </span>
                        )}
                      </div>

                      <p style={styles.bubbleText}>{msg.message}</p>
                    </div>
                  );
                })
              )}
            </div>

            {showPaymentOptions && (
              <div style={styles.paymentBox}>
                <div>
                  <strong>Gerar pagamento</strong>
                  <p style={styles.paymentText}>
                    Escolha o plano para enviar o Pix em dois balões.
                  </p>
                </div>

                <div style={styles.paymentActions}>
                  <button
                    onClick={() => generatePayment("store_start")}
                    style={styles.paymentButton}
                  >
                    <strong>Vitrine Inteligente</strong>
                    <span>R$ 19,90/mês</span>
                  </button>

                  <button
                    onClick={() => generatePayment("complete_pro")}
                    style={styles.paymentButtonDark}
                  >
                    <strong>Gestão Completa</strong>
                    <span>R$ 49,90/mês</span>
                  </button>
                </div>
              </div>
            )}

            <footer style={styles.composer}>
              <textarea
                value={reply}
                onChange={(e) => handleReplyChange(e.target.value)}
                placeholder='Digite sua resposta. Use "/gerar pagamento" para abrir os planos.'
                style={styles.textarea}
              />

              <button onClick={sendReply} style={styles.sendButton}>
                Enviar
              </button>
            </footer>
          </>
        )}
      </aside>
    </main>
</>
);
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) 520px",
    gap: 20,
    padding: 20,
    background: "#f6f3ee",
    color: "#07111f",
    fontFamily: "Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
  },

  crm: {
    minWidth: 0,
  },
categoryBar: {
  display: "flex",
  gap: 8,
  overflowX: "auto",
  padding: "2px 0 10px",
  marginBottom: 10,
  maxWidth: "100%",
},

categoryButton: {
  border: "1px solid rgba(7,17,31,.08)",
  background: "#fff",
  color: "#07111f",
  borderRadius: 999,
  padding: "9px 12px",
  fontWeight: 900,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: 7,
  whiteSpace: "nowrap",
},

categoryButtonActive: {
  background: "#f59e0b",
  color: "#07111f",
},
  header: {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    alignItems: "flex-start",
    marginBottom: 16,
  },

  title: {
    margin: 0,
    fontSize: 28,
    letterSpacing: "-.03em",
  },

  subtitle: {
    margin: "5px 0 0",
    color: "#64748b",
    fontSize: 14,
  },
discoveryActions: {
  display: "flex",
  gap: 8,
},

discoveryButtonDark: {
  border: 0,
  borderRadius: 14,
  padding: "11px 15px",
  background: "#07111f",
  color: "#fff",
  fontWeight: 900,
  cursor: "pointer",
  whiteSpace: "nowrap",
},
  headerActions: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },

  updatedAt: {
    fontSize: 12,
    color: "#64748b",
    whiteSpace: "nowrap",
  },
  cityButton: {
  border: "1px solid rgba(7,17,31,.08)",
  background: "#fff",
  color: "#07111f",
  borderRadius: 999,
  padding: "9px 12px",
  fontWeight: 900,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: 7,
  whiteSpace: "nowrap",
},

cityButtonActive: {
  background: "#07111f",
  color: "#fff",
},
discoveryBox: {
  background: "#fff",
  borderRadius: 22,
  padding: 16,
  marginBottom: 16,
  boxShadow: "0 12px 30px rgba(7,17,31,.06)",
  border: "1px solid rgba(7,17,31,.06)",
},

discoveryHeader: {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "flex-start",
  marginBottom: 12,
},

discoveryTitle: {
  fontSize: 16,
},

discoverySubtitle: {
  margin: "4px 0 0",
  color: "#64748b",
  fontSize: 13,
},

discoveryButton: {
  border: 0,
  borderRadius: 14,
  padding: "11px 15px",
  background: "#f59e0b",
  color: "#07111f",
  fontWeight: 900,
  cursor: "pointer",
  whiteSpace: "nowrap",
},

discoveryGrid: {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 12,
},

discoveryLabel: {
  display: "flex",
  flexDirection: "column",
  gap: 7,
  fontSize: 13,
  fontWeight: 900,
  color: "#334155",
},

discoveryTextarea: {
  minHeight: 110,
  resize: "vertical",
  border: "1px solid #e2e8f0",
  borderRadius: 15,
  padding: 12,
  fontFamily: "inherit",
  outline: "none",
},

discoveryJobs: {
  display: "flex",
  gap: 8,
  overflowX: "auto",
  flexWrap: "nowrap",
  marginTop: 12,
  paddingBottom: 2,
  maxWidth: "100%",
},
cancelButton: {
  background: "#fee2e2",
  color: "#991b1b",
  border: "1px solid #fecaca",
  padding: "10px 12px",
  borderRadius: 13,
  fontWeight: 900,
  cursor: "pointer",
},
discoveryMuted: {
  color: "#64748b",
  fontSize: 13,
},
prospectButton: {
  border: 0,
  borderRadius: 14,
  padding: "12px 18px",
  background:
    "linear-gradient(135deg,#f59e0b,#d97706)",
  color: "#07111f",
  fontWeight: 900,
  cursor: "pointer",
  whiteSpace: "nowrap",
  boxShadow:
    "0 12px 24px rgba(245,158,11,.22)",
},
discoveryJobPill: {
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  borderRadius: 999,
  padding: "7px 10px",
  background: "#f1f5f9",
  color: "#334155",
  fontWeight: 900,
  fontSize: 12,
},
  refreshButton: {
    border: 0,
    borderRadius: 14,
    padding: "11px 15px",
    background: "#07111f",
    color: "#fff",
    fontWeight: 900,
    cursor: "pointer",
  },

  pipeline: {
  display: "flex",
  gap: 10,
  overflowX: "auto",
  padding: "2px 0 10px",
  marginBottom: 10,
  maxWidth: "100%",
},

  pipelineTab: {
    border: "1px solid rgba(7,17,31,.08)",
    background: "#fff",
    color: "#07111f",
    borderRadius: 999,
    padding: "10px 13px",
    fontWeight: 900,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 8,
    boxShadow: "0 8px 18px rgba(7,17,31,.05)",
    whiteSpace: "nowrap",
  },

  pipelineTabActive: {
    background: "#07111f",
    color: "#fff",
  },

  pipelineLabel: {
    fontSize: 13,
  },

  pipelineCount: {
    minWidth: 24,
    height: 24,
    borderRadius: 999,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#f1f5f9",
    color: "#334155",
    fontSize: 12,
  },

  pipelineCountActive: {
    background: "rgba(255,255,255,.16)",
    color: "#fff",
  },
    toolbar: {
    background: "#fff",
    borderRadius: 20,
    padding: 14,
    marginBottom: 14,
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
    boxShadow: "0 12px 30px rgba(7,17,31,.06)",
  },

  sectionTitle: {
    display: "block",
    fontSize: 16,
  },

  sectionSubtitle: {
    margin: "3px 0 0",
    color: "#64748b",
    fontSize: 13,
  },

  searchInput: {
    width: 310,
    maxWidth: "45%",
    border: "1px solid #e2e8f0",
    borderRadius: 14,
    padding: "12px 14px",
    outline: "none",
    fontFamily: "inherit",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(235px, 1fr))",
    gap: 12,
  },

  card: {
    background: "#fff",
    borderRadius: 18,
    padding: 15,
    textAlign: "left",
    cursor: "pointer",
    border: "1px solid rgba(7,17,31,.06)",
    boxShadow: "0 14px 34px rgba(7,17,31,.07)",
    transition: "transform .18s ease, box-shadow .18s ease, border-color .18s ease",
  },

  cardSelected: {
    border: "2px solid #d97706",
    boxShadow: "0 18px 42px rgba(217,119,6,.18)",
  },

  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    alignItems: "flex-start",
  },

  name: {
    fontSize: 15,
    lineHeight: 1.2,
  },

  badge: {
    fontSize: 11,
    padding: "5px 8px",
    borderRadius: 999,
    fontWeight: 900,
    whiteSpace: "nowrap",
  },

  cardMeta: {
    display: "flex",
    gap: 6,
    color: "#64748b",
    fontSize: 12,
    marginTop: 9,
  },

  lastMessage: {
    color: "#334155",
    lineHeight: 1.35,
    fontSize: 13,
    height: 54,
    overflow: "hidden",
    margin: "10px 0",
  },

  cardFooter: {
    borderTop: "1px solid #f1f5f9",
    paddingTop: 10,
    color: "#64748b",
    fontSize: 12,
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
  },

  miniFlag: {
    background: "#ffedd5",
    color: "#9a3412",
    borderRadius: 999,
    padding: "3px 7px",
    fontWeight: 900,
  },

  panel: {
    position: "sticky",
    top: 20,
    height: "calc(100vh - 40px)",
    background: "#fff",
    borderRadius: 24,
    boxShadow: "0 18px 50px rgba(7,17,31,.12)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    minWidth: 0,
  },

  emptyPanel: {
    margin: "auto",
    color: "#64748b",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 6,
  },

  panelHeader: {
    padding: 18,
    borderBottom: "1px solid #eef2f7",
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr)",
    gap: 12,
  },

  panelLeadInfo: {
    minWidth: 0,
  },

  panelTitleRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
  },

  panelTitle: {
    margin: 0,
    fontSize: 20,
    lineHeight: 1.15,
  },

  panelMeta: {
    margin: "5px 0 0",
    color: "#64748b",
    fontSize: 13,
  },

  panelPhone: {
    margin: "5px 0 0",
    color: "#334155",
    fontSize: 13,
    fontWeight: 800,
  },

  panelActions: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr 1fr",
    gap: 8,
  },
stateRow: {
  display: "flex",
  gap: 8,
},

stateInput: {
  width: 80,
  border: "1px solid #e2e8f0",
  borderRadius: 14,
  padding: "12px",
  fontWeight: 900,
  textAlign: "center",
  outline: "none",
},

fetchCitiesButton: {
  border: 0,
  borderRadius: 14,
  padding: "0 16px",
  background: "#07111f",
  color: "#fff",
  fontWeight: 900,
  cursor: "pointer",
},
  assumeButton: {
    background: "#07111f",
    color: "#fff",
    border: 0,
    padding: "10px 12px",
    borderRadius: 13,
    fontWeight: 900,
    cursor: "pointer",
  },

  previewButton: {
    background: "#f59e0b",
    color: "#07111f",
    padding: "10px 12px",
    borderRadius: 13,
    fontWeight: 900,
    textDecoration: "none",
    textAlign: "center",
  },

  paymentTopButton: {
    background: "#fff7ed",
    color: "#9a3412",
    border: "1px solid #fed7aa",
    padding: "10px 12px",
    borderRadius: 13,
    fontWeight: 900,
    cursor: "pointer",
  },

  messages: {
    flex: 1,
    overflowY: "auto",
    padding: 18,
    display: "flex",
    flexDirection: "column",
    gap: 12,
    background: "#f8fafc",
  },

  bubble: {
    maxWidth: "86%",
    borderRadius: 18,
    padding: 14,
    boxShadow: "0 8px 18px rgba(7,17,31,.06)",
    whiteSpace: "pre-wrap",
  },

  clientBubble: {
    alignSelf: "flex-end",
    background: "#07111f",
    color: "#fff",
  },

  agentBubble: {
    alignSelf: "flex-start",
    background: "#fff",
    color: "#07111f",
    border: "1px solid #eef2f7",
  },

  bubbleHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 6,
    opacity: 0.76,
  },

  role: {
    fontSize: 12,
  },

  messageTime: {
    fontSize: 11,
  },

  bubbleText: {
    margin: 0,
    lineHeight: 1.45,
    fontSize: 14,
  },

  paymentBox: {
    margin: 14,
    padding: 15,
    borderRadius: 18,
    background: "#fff7ed",
    border: "1px solid #fed7aa",
  },

  paymentText: {
    margin: "5px 0 12px",
    color: "#92400e",
    fontSize: 13,
  },

  paymentActions: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
  },

  paymentButton: {
    border: 0,
    borderRadius: 14,
    padding: 13,
    background: "#f59e0b",
    color: "#07111f",
    fontWeight: 900,
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },

  paymentButtonDark: {
    border: 0,
    borderRadius: 14,
    padding: 13,
    background: "#07111f",
    color: "#fff",
    fontWeight: 900,
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },

  composer: {
    borderTop: "1px solid #eef2f7",
    padding: 14,
    display: "flex",
    gap: 10,
    background: "#fff",
  },

  textarea: {
    flex: 1,
    minHeight: 74,
    borderRadius: 15,
    border: "1px solid #e2e8f0",
    padding: 12,
    resize: "none",
    fontFamily: "inherit",
    outline: "none",
  },

  sendButton: {
    border: 0,
    borderRadius: 15,
    padding: "0 18px",
    background: "#07111f",
    color: "#fff",
    fontWeight: 900,
    cursor: "pointer",
  },

  loadingBox: {
    padding: 20,
    color: "#64748b",
  },

  emptyList: {
    background: "#fff",
    borderRadius: 20,
    padding: 30,
    color: "#64748b",
    textAlign: "center",
    boxShadow: "0 12px 30px rgba(7,17,31,.06)",
  },

  emptyMessages: {
    margin: "auto",
    color: "#64748b",
    textAlign: "center",
  },
};