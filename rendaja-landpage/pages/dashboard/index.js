import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";

import { supabase } from "../../src/lib/supabase";
import Hero from "../../components/Hero";
import Gallery from "../../components/Gallery";
import Reviews from "../../components/Reviews";
import StoreSection from "../../components/StoreSection";
import BookingSection from "../../components/BookingSection";
import ServicesSection from "../../components/ServicesSection";
import StaffPanel from "../../components/dashboard/StaffPanel";
import FinancePanel from "../../components/dashboard/FinancePanel";
import { getProfileStaff } from "../../src/modules/staff/staffService";
import { QRCodeCanvas } from "qrcode.react";
function money(value = 0) {

  return Number(value || 0).toLocaleString("pt-BR", {

    style: "currency",

    currency: "BRL",

  });

}


const DEFAULT_PROFILE = {
  slug: "",
  nome: "",
  servico: "",
  cidade: "",
  estado: "",
  descricao: "",
  whatsapp: "",

  logo_url: "",
  hero_image_url: "",
  about_image_url: "",

  primary_color: "#d9a84e",
  secondary_color: "#06111d",
  accent_color: "#f5d28b",
  background_color: "#f7f3ed",
  text_color: "#07111f",
store_bg_color: "#ffffff",
store_text_color: "#07111f",
reviews_require_approval: true,
services_bg_color: "#f7f3ed",
services_text_color: "#07111f",

  hero_bg_color: "#06111d",
  topbar_bg_color: "#06111d",
  hero_overlay_color: "#06111d",
  about_bg_color: "#f7f3ed",
  portfolio_bg_color: "#06111d",
  reviews_bg_color: "#f7f3ed",

  cta_bg_color: "#d9a84e",

  show_about: true,
  show_services: true,
  show_portfolio: true,
  show_reviews: true,
  show_store: true,
  show_booking: false,
  show_final_cta: true,

  font_heading: "Georgia",
  font_body: "Inter",

  hero_kicker: "Atendimento profissional com excelência",

  about_title: "Sobre meu trabalho",
  about_text: "",

  services_title: "Serviços",
  services_text: "Conheça as principais soluções que ofereço.",
  services_items: [
    {
      id: "service-1",
      icon: "⚖️",
      title: "Consultoria",
      description: "Atendimento profissional com orientação clara e personalizada.",
      active: true,
    },
  ],

  gallery: [],
  reviews: [],

  store_items: [],
  store_categories: [],
  store_title: "Escolha o que você precisa",
store_text: "Veja as opções disponíveis e solicite direto pelo WhatsApp.",

  working_days: [1, 2, 3, 4, 5, 6],
  working_hours: {
    start: 8,
    end: 18,
    interval: 1,
  },
business_hours: {
  monday: [],
  tuesday: [],
  wednesday: [],
  thursday: [],
  friday: [],
  saturday: [],
  sunday: [],
},

delivery_enabled: false,
pickup_enabled: false,
home_service_enabled: false,
free_delivery: false,
delivery_fee: "",
  instagram_url: "",
  youtube_url: "",
  facebook_url: "",
  tiktok_url: "",
  linkedin_url: "",

  cta_title: "Pronto para contratar com confiança?",
  cta_text: "Fale comigo agora pelo WhatsApp e solicite seu orçamento.",
  cta_button_text: "Falar agora",
  cta_action_type: "whatsapp",
  cta_custom_link: "",
};

const MENU = [
  { id: "overview", label: "Visão geral", icon: "🏠" },

  { id: "store", label: "Produtos e serviços", icon: "🛒" },

  { id: "orders", label: "Pedidos", icon: "📦" },

  { id: "bookings", label: "Agendamentos", icon: "📅" },
  { id: "staff", label: "Equipe", icon: "👥" },
{ id: "finance", label: "Financeiro", icon: "💰" },

  { id: "reviews", label: "Avaliações", icon: "⭐" },
  { id: "jobs", label: "Vagas", icon: "💼" },
  { id: "missions", label: "Missões", icon: "🎯" },

];
export default function Dashboard() {
  const router = useRouter();
  const [active, setActive] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
const [previewMode, setPreviewMode] = useState("desktop");
const [overviewTab, setOverviewTab] = useState("data");
const [reviewsAdmin, setReviewsAdmin] = useState([]);
const [loadingReviews, setLoadingReviews] = useState(false);
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [previewVersion, setPreviewVersion] = useState(Date.now());
const [bookings, setBookings] = useState([]);
const [loadingBookings, setLoadingBookings] = useState(false);
const [orders, setOrders] = useState([]);
const [loadingOrders, setLoadingOrders] = useState(false);
const [alertsEnabled, setAlertsEnabled] = useState(false);
const [dashboardAlert, setDashboardAlert] = useState(null);

const alertsEnabledRef = useRef(false);
const alertAudioRef = useRef(null);

  const publicUrl = useMemo(() => {
    if (!profile.slug) return "";
    return `/p/${profile.slug}`;
  }, [profile.slug]);

  useEffect(() => {
  const savedUser = localStorage.getItem("rendaja_user");
  const token = localStorage.getItem("rendaja_token");

  if (!savedUser || !token) {
    router.push("/login");
    return;
  }

  loadProfile();
}, []);
useEffect(() => {
  if (typeof window === "undefined") return;

  const timer = setTimeout(() => {
    sessionStorage.setItem("rendaja_preview_profile", JSON.stringify(profile));
    setPreviewVersion(Date.now());
  }, 150);

  return () => clearTimeout(timer);
}, [profile]);
useEffect(() => {
  alertsEnabledRef.current = alertsEnabled;
}, [alertsEnabled]);
useEffect(() => {
  if (!profile?.id) return;

  console.log("🧩 DASHBOARD PROFILE ID:", profile.id);

  const channel = supabase
    .channel(`dashboard-profile-${profile.id}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "profile_orders",
        filter: `profile_page_id=eq.${profile.id}`,
      },
      async (payload) => {
        console.log("📦 NOVO PEDIDO REALTIME:", payload);

        await loadOrders(profile.id);

        if (alertsEnabledRef.current) {
          playDashboardAlert("order");
        }
      }
    )
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "profile_bookings",
        filter: `profile_page_id=eq.${profile.id}`,
      },
      async (payload) => {
        console.log("📅 NOVO AGENDAMENTO REALTIME:", payload);

        await loadBookings(profile.id);

        if (alertsEnabledRef.current) {
          playDashboardAlert("booking");
        }
      }
    )
    .subscribe((status) => {
      console.log("🔥 REALTIME STATUS:", status);
    });

  return () => {
    supabase.removeChannel(channel);
  };
}, [profile?.id]);
  async function loadProfile() {
    setLoading(true);

    const savedUser = localStorage.getItem("rendaja_user");
const user = savedUser ? JSON.parse(savedUser) : null;

    if (!user) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("profiles_pages")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!error && data) {
  setProfile({ ...DEFAULT_PROFILE, ...data });
  loadBookings(data.id);
loadOrders(data.id);
loadReviewsAdmin(data.id);
}

    setLoading(false);
  }
function logout() {
  localStorage.removeItem("rendaja_user");
  localStorage.removeItem("rendaja_token");
  sessionStorage.removeItem("rendaja_preview_profile");
  router.push("/login");
}
  function setField(field, value) {
    setProfile((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function normalizeSlug(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  async function saveProfile() {
    setSaving(true);

const savedUser = localStorage.getItem("rendaja_user");
const user = savedUser ? JSON.parse(savedUser) : null;

if (!user?.id) {
  alert("Você precisa entrar pelo WhatsApp primeiro.");
  setSaving(false);
  router.push("/login");
  return;
}

    const payload = {
      ...profile,
      user_id: user.id,
      slug: normalizeSlug(profile.slug || profile.nome),
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("profiles_pages")
      .upsert(payload, { onConflict: "user_id" });

    setSaving(false);
if (error) {
  console.error("🔥 ERRO REAL:", error);
  alert(error.message || "Erro ao salvar página.");
  return;
}
    setProfile(payload);
    alert("Página salva com sucesso!");
  }


  async function loadBookings(profileId) {
  if (!profileId) return;

  setLoadingBookings(true);

  const { data, error } = await supabase
    .from("profile_bookings")
    .select("*")
    .eq("profile_page_id", profileId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erro ao buscar agendamentos:", error);
    setBookings([]);
  } else {
    setBookings(data || []);
  }

  setLoadingBookings(false);
}


async function loadOrders(profileId) {
  if (!profileId) return;

  setLoadingOrders(true);

  const { data, error } = await supabase
    .from("profile_orders")
    .select("*")
    .eq("profile_page_id", profileId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erro ao buscar pedidos:", error);
    setOrders([]);
  } else {
    setOrders(data || []);
  }

  setLoadingOrders(false);
}
function playDashboardAlert(type = "order") {
  try {
    const audio = alertAudioRef.current || new Audio("/sounds/dashboard-alert.mp3");

    alertAudioRef.current = audio;
    audio.pause();
    audio.currentTime = 0;
    audio.volume = 1;

    audio.play().catch((err) => {
      console.warn("🔇 Navegador bloqueou o áudio:", err);
    });
  } catch (err) {
    console.warn("Erro ao tocar alerta:", err);
  }

  setDashboardAlert({
    type,
    title:
      type === "booking"
        ? "Novo agendamento recebido!"
        : type === "test"
        ? "Alertas ativados!"
        : "Novo pedido recebido!",
    text:
      type === "booking"
        ? "Um cliente acabou de solicitar um agendamento."
        : type === "test"
        ? "Agora o painel vai avisar quando chegar pedido ou agendamento."
        : "Um cliente acabou de fazer um novo pedido.",
  });

  setTimeout(() => {
    setDashboardAlert(null);
  }, 9000);
}

async function loadReviewsAdmin(profileId) {
  if (!profileId) return;

  setLoadingReviews(true);

  try {
    const res = await fetch(`/api/reviews/admin?profileId=${profileId}`);
    const data = await res.json().catch(() => []);

    if (!res.ok) {
      console.error("Erro ao buscar avaliações admin:", data);
      setReviewsAdmin([]);
      return;
    }

    setReviewsAdmin(Array.isArray(data) ? data : []);
  } catch (err) {
    console.error("Erro geral ao buscar avaliações admin:", err);
    setReviewsAdmin([]);
  } finally {
    setLoadingReviews(false);
  }
}
  async function uploadImage(event, field, callback) {
  const file = event.target.files?.[0];
  if (!file) return;

  const savedUser = localStorage.getItem("rendaja_user");
  const user = savedUser ? JSON.parse(savedUser) : null;

  if (!user) {
    alert("Você precisa estar logado.");
    return;
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const safeField = String(field || "image").replace(/[^a-z0-9_-]/gi, "");
  const fileName = `${safeField}-${Date.now()}.${ext}`;
  const path = `${user.id}/${fileName}`;

  const { error } = await supabase.storage
    .from("profile-pages")
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });

  if (error) {
    console.error("Erro no upload:", error);
    alert(error.message || "Erro ao enviar imagem.");
    return;
  }

  const { data } = supabase.storage
    .from("profile-pages")
    .getPublicUrl(path);

  const publicUrl = data?.publicUrl;

  if (!publicUrl) {
    alert("Imagem enviada, mas não foi possível gerar a URL pública.");
    return;
  }

  if (typeof callback === "function") {
    callback(publicUrl);
    return;
  }

  setField(field, publicUrl);
}
  if (loading) {
    return (
      <div className="dash-loading">
        <div className="dash-spinner" />
        <p>Carregando painel...</p>
      </div>
    );
  }
return (
  <main className="dashboard-shell">
    {dashboardAlert && (
      <div className={`dashboard-live-alert ${dashboardAlert.type}`}>
        <div>
          <strong>{dashboardAlert.title}</strong>
          <span>{dashboardAlert.text}</span>
        </div>

        <button type="button" onClick={() => setDashboardAlert(null)}>
          ×
        </button>
      </div>
    )}
      <aside className="dashboard-sidebar">
        <div className="dashboard-brand">
          <div className="dashboard-brand-icon">
            {profile.logo_url ? (
              <img src={profile.logo_url} alt={profile.nome} />
            ) : (
              <span>{profile.nome?.charAt(0) || "R"}</span>
            )}
          </div>

          <div>
            <strong>RendaJá</strong>
            <small>Painel profissional</small>
          </div>
        </div>

        <nav className="dashboard-menu">
          {MENU.map((item) => (
                        <button
              key={item.id}
              type="button"
              className={`dashboard-menu-item ${active === item.id ? "active" : ""}`}
              onClick={() => setActive(item.id)}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="dashboard-sidebar-footer">
          <button className="save-button" onClick={saveProfile} disabled={saving}>
            {saving ? "Salvando..." : "Salvar alterações"}
          </button>

       
          <button
  type="button"
  className="logout-button"
  onClick={logout}
>
  Sair do painel
</button>
        </div>
      </aside>

      <section className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <span className="dashboard-kicker">Dashboard</span>
            <h1>{profile.nome || "Sua página profissional"}</h1>
            <p>Controle sua página, visual, imagens e ferramentas comerciais.</p>
          </div>

<div className="dashboard-header-actions">
  <button
    type="button"
    className={`dashboard-alert-toggle ${alertsEnabled ? "active" : ""}`}
    onClick={() => {
      setAlertsEnabled(true);
      playDashboardAlert("test");
    }}
  >
    {alertsEnabled ? "🔔 Alertas ativos" : "🔕 Ativar alertas"}
  </button>

  {publicUrl && (
    <a
      href={publicUrl}
      target="_blank"
      rel="noreferrer"
      className="visit-top-button"
    >
      Ver página
      <span>↗</span>
    </a>
  )}
</div>
        </header>

        {active === "overview" && (
  <OverviewPanel
  profile={profile}
  publicUrl={publicUrl}
  setField={setField}
  uploadImage={uploadImage}
  normalizeSlug={normalizeSlug}
  previewMode={previewMode}
  setPreviewMode={setPreviewMode}
  previewVersion={previewVersion}
  overviewTab={overviewTab}
  setOverviewTab={setOverviewTab}
/>
)}
{active === "content" && (
  <SectionsEditor
    profile={profile}
    setField={setField}
    uploadImage={uploadImage}
  />
)}
{active === "store" && (
  <StoreItemsEditor
    profile={profile}
    setField={setField}
    uploadImage={uploadImage}
  />
)}
{active === "bookings" && (
  <BookingsPanel
    bookings={bookings}
    loading={loadingBookings}
    reload={() => loadBookings(profile.id)}
  />
)}

{active === "orders" && (
  <OrdersPanel
    orders={orders}
    loading={loadingOrders}
    reload={() => loadOrders(profile.id)}
  />
)}
{active === "staff" && <StaffPanel />}
{active === "finance" && <FinancePanel profileFromDashboard={profile} />}
{active === "schedule" && <SchedulePanel />}
{active === "reviews" && (
  <ReviewsPanel
  profile={profile}
  setField={setField}
  reviews={reviewsAdmin}
  loading={loadingReviews}
  reload={() => loadReviewsAdmin(profile.id)}
/>
)}
        {active === "jobs" && <JobsPanel />}

{active === "missions" && <MissionsPanel />}
        

      </section>
    </main>
  );
}
function orderStatusLabel(status) {
  if (status === "confirmed") return "Confirmado";
  if (status === "cancelled") return "Cancelado";
  if (status === "delivered") return "Entregue";
  return "Pendente";
}

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

function ServicesEditor({ profile, setField }) {
  const services = Array.isArray(profile.services_items)
    ? profile.services_items
    : [];

  function updateService(id, field, value) {
    const next = services.map((item) =>
      item.id === id ? { ...item, [field]: value } : item
    );

    setField("services_items", next);
  }

  function addService() {
    const next = [
      ...services,
      {
        id: `service-${Date.now()}`,
        icon: "⭐",
        title: "Novo serviço",
        description: "Descreva aqui esse serviço.",
        active: true,
      },
    ];

    setField("services_items", next);
  }

  function removeService(id) {
    setField(
      "services_items",
      services.filter((item) => item.id !== id)
    );
  }

  return (
    <div className="overview-stack">
      <SectionTitle
        title="Serviços profissionais"
        text="Essa seção aparece na landing page para profissionais que querem mostrar serviços sem depender da loja."
      />

      <div className="form-grid">
        <Field label="Título da seção">
          <input
            value={profile.services_title || ""}
            onChange={(e) => setField("services_title", e.target.value)}
            placeholder="Ex: Serviços"
          />
        </Field>

        <Field label="Texto da seção">
          <input
            value={profile.services_text || ""}
            onChange={(e) => setField("services_text", e.target.value)}
            placeholder="Ex: Conheça minhas principais soluções"
          />
        </Field>
      </div>

      <div className="dash-card">
        <div className="store-editor-head">
          <div>
            <span className="card-label">Cards de serviços</span>
            <h3>Serviços exibidos na página</h3>
            <p>Escolha um ícone, título e descrição para cada serviço.</p>
          </div>

          <div>
            <button type="button" onClick={addService}>
              + Adicionar serviço
            </button>
          </div>
        </div>

        {services.length === 0 ? (
          <div className="store-empty">
            <strong>Nenhum serviço cadastrado</strong>
            <p>Adicione um serviço para aparecer na seção Serviços.</p>
          </div>
        ) : (
          <div className="store-items-editor">
            {services.map((service) => (
              <div key={service.id} className="store-item-editor">
                <div className="store-item-editor-head">
                  <div>
                    <span>Serviço</span>
                    <strong>{service.icon} {service.title}</strong>
                  </div>

                  <button
                    type="button"
                    className="danger-button"
                    onClick={() => removeService(service.id)}
                  >
                    Remover
                  </button>
                </div>

                <div className="form-grid">
                  <Field label="Ícone">
  <EmojiPicker
    value={service.icon || "⭐"}
    onChange={(emoji) => updateService(service.id, "icon", emoji)}
  />
</Field>

                  <Field label="Nome do serviço">
                    <input
                      value={service.title || ""}
                      onChange={(e) =>
                        updateService(service.id, "title", e.target.value)
                      }
                      placeholder="Ex: Consultoria"
                    />
                  </Field>

                  <Field label="Descrição" full>
                    <textarea
                      value={service.description || ""}
                      onChange={(e) =>
                        updateService(service.id, "description", e.target.value)
                      }
                      placeholder="Explique esse serviço"
                    />
                  </Field>
                </div>

                <div className="store-item-actions">
                  <ToggleField
                    label="Serviço ativo"
                    value={service.active !== false}
                    onChange={(v) => updateService(service.id, "active", v)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function OrdersPanel({ orders, loading, reload }) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedImage, setExpandedImage] = useState(null);
  const [paymentModalOrder, setPaymentModalOrder] = useState(null);

  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    payment_method: "pix",
    note: "",
  });

  const [finishingPayment, setFinishingPayment] = useState(false);

  const counts = {
    all: orders.length,
    pending: orders.filter((item) => item.status === "pending").length,
    confirmed: orders.filter((item) => item.status === "confirmed").length,
    delivered: orders.filter((item) => item.status === "delivered").length,
    cancelled: orders.filter((item) => item.status === "cancelled").length,
  };

  const filteredOrders =
    statusFilter === "all"
      ? orders
      : orders.filter((item) => item.status === statusFilter);

  function openPaymentModal(order) {
    const suggestedAmount = order.has_quote ? "" : Number(order.total || 0);

    setPaymentModalOrder(order);
    setPaymentForm({
      amount: suggestedAmount,
      payment_method: "pix",
      note: "",
    });
  }

  function closePaymentModal() {
    setPaymentModalOrder(null);
    setPaymentForm({
      amount: "",
      payment_method: "pix",
      note: "",
    });
  }

  async function finalizeOrderPayment() {
    if (!paymentModalOrder?.id || finishingPayment) return;

    const amount = Number(paymentForm.amount || 0);

    if (!amount || amount <= 0) {
      alert("Informe o valor recebido.");
      return;
    }

    setFinishingPayment(true);

    try {
      const response = await fetch("/api/finance/finalize-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId: paymentModalOrder.id,
          amount,
          payment_method: paymentForm.payment_method,
          note: paymentForm.note,
        }),
      });

      const json = await response.json().catch(() => ({}));

      if (!response.ok) {
        alert(json.error || "Erro ao finalizar venda.");
        return;
      }

      await reload();
      closePaymentModal();

      alert("Venda finalizada e registrada no financeiro!");
    } catch (err) {
      console.error("Erro ao finalizar venda:", err);
      alert("Erro ao finalizar venda.");
    } finally {
      setFinishingPayment(false);
    }
  }

  async function updateOrderStatus(order, status) {
  if (!order?.id) return;

  try {
    const response = await fetch("/api/orders/update-status", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        orderId: order.id,
        status,
      }),
    });

    const json = await response.json().catch(() => ({}));

    if (!response.ok) {
      alert(json.error || "Erro ao atualizar pedido.");
      return;
    }

    await reload();

    if (status === "confirmed") {
      alert("Pedido confirmado e cliente avisado automaticamente!");
    }

    if (status === "cancelled") {
      alert("Pedido cancelado e cliente avisado automaticamente!");
    }
  } catch (err) {
    console.error("Erro ao atualizar pedido:", err);
    alert("Erro ao atualizar pedido.");
  }
}

  async function deleteOrder(order) {
    const ok = confirm(
      "Excluir este pedido? Use isso apenas para trote, teste ou pedido inválido."
    );

    if (!ok) return;

    const { error } = await supabase
      .from("profile_orders")
      .delete()
      .eq("id", order.id);

    if (error) {
      console.error("Erro ao excluir pedido:", error);
      alert(error.message || "Erro ao excluir pedido.");
      return;
    }

    await reload();
  }

  return (
    <div className="dash-panel orders-dashboard-panel">
      <div className="bookings-panel-head">
        <PanelTitle
          title="Pedidos"
          text="Acompanhe compras, orçamentos e solicitações feitas pela sua página."
        />

        <button type="button" onClick={reload} disabled={loading}>
          {loading ? "Atualizando..." : "Atualizar pedidos"}
        </button>
      </div>

      <div className="booking-stats-grid">
        <button className={statusFilter === "all" ? "active" : ""} onClick={() => setStatusFilter("all")}>
          <span>Total</span>
          <strong>{counts.all}</strong>
        </button>

        <button className={statusFilter === "pending" ? "active" : ""} onClick={() => setStatusFilter("pending")}>
          <span>Pendentes</span>
          <strong>{counts.pending}</strong>
        </button>

        <button className={statusFilter === "confirmed" ? "active" : ""} onClick={() => setStatusFilter("confirmed")}>
          <span>Confirmados</span>
          <strong>{counts.confirmed}</strong>
        </button>

        <button className={statusFilter === "delivered" ? "active" : ""} onClick={() => setStatusFilter("delivered")}>
          <span>Entregues</span>
          <strong>{counts.delivered}</strong>
        </button>

        <button className={statusFilter === "cancelled" ? "active" : ""} onClick={() => setStatusFilter("cancelled")}>
          <span>Cancelados</span>
          <strong>{counts.cancelled}</strong>
        </button>
      </div>

      {loading ? (
        <div className="coming-box">
          <strong>Carregando pedidos...</strong>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="coming-box">
          <strong>Nenhum pedido nesta visualização</strong>
          <p>Use o botão de atualizar para verificar se chegaram novos pedidos.</p>
        </div>
      ) : (
        <div className="bookings-list order-cards-grid">
          {filteredOrders.map((order) => {
            const items = Array.isArray(order.items) ? order.items : [];

            return (
              <div key={order.id} className="booking-admin-card order-mini-card">
                <div className="booking-admin-top">
                  <div>
                    <span className={`booking-status ${order.status || "pending"}`}>
                      {orderStatusLabel(order.status)}
                    </span>

                    <h3>{order.customer_name || "Cliente não informado"}</h3>
                  </div>

                  <strong>
                    {order.has_quote ? "Sob orçamento" : money(order.total || 0)}
                  </strong>
                </div>

                <div className="booking-admin-services">
                  {items.length > 0 ? (
                    items.map((item, index) => (
                      <div key={`${order.id}-${index}`} className="order-clean-item">
                        {item.image_url && (
                          <button
                            type="button"
                            className="order-clean-image"
                            onClick={() =>
                              setExpandedImage({
                                url: item.image_url,
                                title: item.title || item.name || "Produto",
                              })
                            }
                          >
                            <img src={item.image_url} alt={item.title || "Produto"} />
                          </button>
                        )}

                        <div className="order-clean-content">
                          <strong>{item.title || item.name || "Item"}</strong>

                          {Array.isArray(item.selected_variants) &&
                            item.selected_variants.length > 0 && (
                              <div className="order-clean-variants">
                                {item.selected_variants.map((variant, vIndex) => (
                                  <span key={`${item.id}-${vIndex}`}>
                                    {variant.image_url && (
                                      <img src={variant.image_url} alt={variant.label} />
                                    )}
                                    <b>{variant.variant_name}:</b> {variant.label}
                                  </span>
                                ))}
                              </div>
                            )}

                          <small>
                            {item.qty || 1}x •{" "}
                            {item.price_type === "quote"
                              ? "Sob orçamento"
                              : money(Number(item.price || 0) * Number(item.qty || 1))}
                          </small>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div>
                      <strong>Itens não informados</strong>
                    </div>
                  )}
                </div>

                <div className="booking-admin-info">
                  {order.customer_phone && (
                    <span>WhatsApp: {order.customer_phone}</span>
                  )}

                  {order.note && <span>Obs: {order.note}</span>}
                </div>

                <div className="booking-admin-actions">
                  {order.status !== "confirmed" && order.status !== "delivered" && (
                    <button
                      type="button"
                      className="confirm-button"
                      onClick={() => updateOrderStatus(order, "confirmed")}
                    >
                      Confirmar
                    </button>
                  )}

                  {order.status !== "delivered" && order.status !== "cancelled" && (
                    <button
                      type="button"
                      className="delivered-button"
                      onClick={() => openPaymentModal(order)}
                    >
                      Finalizar venda
                    </button>
                  )}

                  {order.status !== "cancelled" && order.status !== "delivered" && (
                    <button
                      type="button"
                      className="danger-button"
                      onClick={() => updateOrderStatus(order, "cancelled")}
                    >
                      Cancelar
                    </button>
                  )}

                  <button
                    type="button"
                    className="danger-button"
                    onClick={() => deleteOrder(order)}
                  >
                    Excluir
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {paymentModalOrder && (
        <div className="payment-modal-backdrop" onClick={closePaymentModal}>
          <div className="payment-modal" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="payment-modal-close" onClick={closePaymentModal}>
              ×
            </button>

            <span className="card-label">Finalizar venda</span>

            <h3>Registrar pagamento recebido</h3>

            <p>Informe quanto foi recebido para lançar essa entrada no financeiro.</p>

            <div className="payment-summary">
              <span>Cliente</span>
              <strong>{paymentModalOrder.customer_name || "Cliente"}</strong>
            </div>

            <div className="payment-summary">
              <span>Total do pedido</span>
              <strong>
                {paymentModalOrder.has_quote
                  ? "Sob orçamento"
                  : money(paymentModalOrder.total || 0)}
              </strong>
            </div>

            <div className="form-grid">
              <Field label="Valor recebido">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={paymentForm.amount}
                  onChange={(e) =>
                    setPaymentForm((prev) => ({
                      ...prev,
                      amount: e.target.value,
                    }))
                  }
                  placeholder="Ex: 150"
                />
              </Field>

              <Field label="Forma de pagamento">
                <select
                  value={paymentForm.payment_method}
                  onChange={(e) =>
                    setPaymentForm((prev) => ({
                      ...prev,
                      payment_method: e.target.value,
                    }))
                  }
                >
                  <option value="pix">Pix</option>
                  <option value="cash">Dinheiro</option>
                  <option value="card">Cartão</option>
                  <option value="transfer">Transferência</option>
                  <option value="other">Outro</option>
                </select>
              </Field>

              <Field label="Observação" full>
                <textarea
                  value={paymentForm.note}
                  onChange={(e) =>
                    setPaymentForm((prev) => ({
                      ...prev,
                      note: e.target.value,
                    }))
                  }
                  placeholder="Ex: Cliente pagou no Pix da loja"
                />
              </Field>
            </div>

            <button
              type="button"
              className="payment-finish-button"
              onClick={finalizeOrderPayment}
              disabled={finishingPayment}
            >
              {finishingPayment ? "Finalizando..." : "Confirmar pagamento"}
            </button>
          </div>
        </div>
      )}

      {expandedImage && (
        <div className="order-image-modal-backdrop" onClick={() => setExpandedImage(null)}>
          <div className="order-image-modal" onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={() => setExpandedImage(null)}>
              ×
            </button>

            <img src={expandedImage.url} alt={expandedImage.title} />

            <strong>{expandedImage.title}</strong>
          </div>
        </div>
      )}
    </div>
  );
}
function PanelTitle({ title, text }) {
  return (
    <div className="panel-title">
      <span>RendaJá Pages</span>
      <h2>{title}</h2>
      <p>{text}</p>
    </div>
  );
}

function Field({ label, children, full }) {
  return (
    <label className={`field ${full ? "full" : ""}`}>
      <span>{label}</span>
      {children}
    </label>
  );
}

function ColorField({ label, value, onChange }) {
  return (
    <label className="field color-field">
      <span>{label}</span>
      <div>
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} />
        <input value={value} onChange={(e) => onChange(e.target.value)} />
      </div>
    </label>
  );
}
function ToggleField({ label, value, onChange }) {
  return (
    <button
      type="button"
      className={`toggle-field ${value ? "active" : ""}`}
      onClick={() => onChange(!value)}
    >
      <span>{label}</span>
      <strong>{value ? "Ativo" : "Oculto"}</strong>
      <i />
    </button>
  );
}
function UploadBox({ title, image, onChange }) {
  return (
    <div className="upload-box">
      <div className="upload-preview">
        {image ? <img src={image} alt={title} /> : <span>🖼️</span>}
      </div>

      <div>
        <h3>{title}</h3>
        <p>Envie uma imagem do seu dispositivo.</p>
        <label className="upload-button">
          Escolher imagem
          <input type="file" accept="image/*" onChange={onChange} />
        </label>
      </div>
    </div>
  );
}


function SectionTitle({ title, text }) {
  return (
    <div className="visual-section-title">
      <h3>{title}</h3>
      {text && <p>{text}</p>}
    </div>
  );
}

function InlineTextEdit({ label, value, onChange, textarea }) {
  return (
    <label className="preview-edit-field">
      <span>{label}</span>
      {textarea ? (
        <textarea value={value || ""} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input value={value || ""} onChange={(e) => onChange(e.target.value)} />
      )}
    </label>
  );
}

function hexToRgbPreview(hex = "#06111d") {
  const clean = String(hex || "").replace("#", "");
  if (clean.length !== 6) return "6, 17, 29";

  return `${parseInt(clean.slice(0, 2), 16)}, ${parseInt(
    clean.slice(2, 4),
    16
  )}, ${parseInt(clean.slice(4, 6), 16)}`;
}
function FullSitePreview({ previewMode, setPreviewMode, previewVersion }) {
  const previewSrc = `/dashboard-preview?v=${previewVersion}&t=${Date.now()}`;

  return (
    <div className="dash-card preview-card full-preview-card">
      <div className="preview-card-head">
        <div>
          <span className="card-label">Prévia real</span>
          <h3>Página profissional</h3>
          <p>Veja sua página dentro de uma tela real de desktop ou celular.</p>
        </div>

        <div className="preview-mode-switch">
          <button
            type="button"
            className={previewMode === "desktop" ? "active" : ""}
            onClick={() => setPreviewMode("desktop")}
          >
            🖥️ Desktop
          </button>

          <button
            type="button"
            className={previewMode === "mobile" ? "active" : ""}
            onClick={() => setPreviewMode("mobile")}
          >
            📱 Celular
          </button>
        </div>
      </div>

      <div className={`preview-device ${previewMode}`}>
        <div className="preview-device-label">
          {previewMode === "desktop" ? "Desktop" : "Celular"}
        </div>

        <div className="preview-screen">
          <iframe
            key={`${previewMode}-${previewVersion}`}
            src={previewSrc}
            title="Prévia da página profissional"
            className="preview-iframe"
          />
        </div>
      </div>
    </div>
  );
}
function OverviewPanel({
  profile,
  publicUrl,
  setField,
  uploadImage,
  normalizeSlug,
  previewMode,
  setPreviewMode,
  previewVersion,
  overviewTab,
  setOverviewTab,
}) {
  const checklist = [
    { label: "Nome ou marca", ok: !!profile.nome },
    { label: "Serviço principal", ok: !!profile.servico },
    { label: "Cidade de atendimento", ok: !!profile.cidade },
    { label: "WhatsApp configurado", ok: !!profile.whatsapp },
    { label: "Descrição profissional", ok: !!profile.descricao },
    { label: "Logomarca enviada", ok: !!profile.logo_url },
    { label: "Imagem principal enviada", ok: !!profile.hero_image_url },
    { label: "Cores personalizadas", ok: !!profile.primary_color },
  ];

  const completed = checklist.filter((item) => item.ok).length;
  const percent = Math.round((completed / checklist.length) * 100);

  return (
    <div className="overview-layout">
      <section className="overview-hero-card compact">
        <div>
          <span className="card-label">Visão geral</span>
          <h2>Sua página está {percent}% configurada</h2>
          <p>
            Configure dados, visual, textos e acompanhe a prévia completa da página.
          </p>
        </div>

        <div className="progress-box">
          <strong>{percent}%</strong>
          <div className="progress-bar">
            <span style={{ width: `${percent}%` }} />
          </div>
          <small>{completed} de {checklist.length} etapas concluídas</small>
        </div>
      </section>

      <section className="overview-content-grid improved">
        <div className="dash-card overview-editor-card">
          <div className="overview-tabs">
            <button className={overviewTab === "data" ? "active" : ""} onClick={() => setOverviewTab("data")}>
              Dados
            </button>
            <button className={overviewTab === "visual" ? "active" : ""} onClick={() => setOverviewTab("visual")}>
              Visual
            </button>
            <button className={overviewTab === "media" ? "active" : ""} onClick={() => setOverviewTab("media")}>
              Imagens
            </button>
              <button

    className={overviewTab === "sections" ? "active" : ""}

    onClick={() => setOverviewTab("sections")}

  >

    Seções

  </button>
  <button
  className={overviewTab === "availability" ? "active" : ""}
  onClick={() => setOverviewTab("availability")}
>
  Funcionamento
</button>
          </div>
{overviewTab === "availability" && (
  <AvailabilityPanel profile={profile} setField={setField} />
)}
          {overviewTab === "data" && (
            <div className="form-grid">
              <Field label="Slug da página">
                <input
                  value={profile.slug}
                  onChange={(e) => setField("slug", normalizeSlug(e.target.value))}
                  placeholder="ex: joao-pintor"
                />
              </Field>

              <Field label="Nome profissional">
                <input value={profile.nome} onChange={(e) => setField("nome", e.target.value)} />
              </Field>

              <Field label="Serviço principal">
                <input value={profile.servico} onChange={(e) => setField("servico", e.target.value)} />
              </Field>

              <Field label="Cidade">
                <input value={profile.cidade} onChange={(e) => setField("cidade", e.target.value)} />
              </Field>

              <Field label="Estado">
                <input value={profile.estado} onChange={(e) => setField("estado", e.target.value)} />
              </Field>

              <Field label="WhatsApp">
                <input value={profile.whatsapp} onChange={(e) => setField("whatsapp", e.target.value)} />
              </Field>
            </div>
          )}

          {overviewTab === "visual" && (
            <div className="overview-stack">
              <SectionTitle title="Cores principais" text="Controlam identidade geral, botões, destaques e textos." />

              <div className="form-grid">
  <ColorField label="Cor principal / botões" value={profile.primary_color} onChange={(v) => setField("primary_color", v)} />
  <ColorField label="Cor secundária / contraste" value={profile.secondary_color} onChange={(v) => setField("secondary_color", v)} />
  <ColorField label="Cor de apoio" value={profile.accent_color} onChange={(v) => setField("accent_color", v)} />
  <ColorField label="Cor geral dos textos" value={profile.text_color} onChange={(v) => setField("text_color", v)} />
</div>

              <SectionTitle title="Cores por seção" text="Aqui o usuário controla cada bloco sem bagunçar o restante." />

              <div className="form-grid">
                <ColorField label="Barra superior" value={profile.topbar_bg_color} onChange={(v) => setField("topbar_bg_color", v)} />
                <ColorField label="Hero / degradê da imagem" value={profile.hero_bg_color} onChange={(v) => {
                  setField("hero_bg_color", v);
                  setField("hero_overlay_color", v);
                }} />
                <ColorField label="Fundo do Sobre" value={profile.about_bg_color} onChange={(v) => setField("about_bg_color", v)} />
                <ColorField
  label="Fundo da seção Serviços"
  value={profile.services_bg_color || profile.background_color || "#f7f3ed"}
  onChange={(v) => setField("services_bg_color", v)}
/>

<ColorField
  label="Textos da seção Serviços"
  value={profile.services_text_color || profile.text_color || "#07111f"}
  onChange={(v) => setField("services_text_color", v)}
/>
                <ColorField
  label="Fundo da Loja"
  value={profile.store_bg_color || profile.sales_bg_color || "#ffffff"}
  onChange={(v) => {
    setField("store_bg_color", v);
    setField("sales_bg_color", v);
  }}
/>


<ColorField
  label="Textos da Loja"
  value={profile.store_text_color || profile.text_color || "#07111f"}
  onChange={(v) => setField("store_text_color", v)}
/>
                <ColorField label="Fundo do Portfólio" value={profile.portfolio_bg_color} onChange={(v) => setField("portfolio_bg_color", v)} />
                <ColorField label="Fundo das Avaliações" value={profile.reviews_bg_color} onChange={(v) => setField("reviews_bg_color", v)} />
                <ColorField label="Fundo do CTA final" value={profile.cta_bg_color} onChange={(v) => setField("cta_bg_color", v)} />
              </div>
            </div>
          )}

          {overviewTab === "media" && (
            <div className="upload-grid fixed">
              <UploadBox title="Logomarca" image={profile.logo_url} onChange={(e) => uploadImage(e, "logo_url")} />
              <UploadBox title="Imagem principal do Hero" image={profile.hero_image_url} onChange={(e) => uploadImage(e, "hero_image_url")} />
              <UploadBox title="Imagem sobre o profissional" image={profile.about_image_url} onChange={(e) => uploadImage(e, "about_image_url")} />
            </div>
          )}
{overviewTab === "sections" && (
  <SectionsEditor
    profile={profile}
    setField={setField}
    uploadImage={uploadImage}
  />
)}
          
        </div>

        <FullSitePreview
  previewMode={previewMode}
  setPreviewMode={setPreviewMode}
  previewVersion={previewVersion}
/>
      </section>
    </div>
  );
}



function SectionsEditor({ profile, setField, uploadImage }) {
  
  const services = Array.isArray(profile.services_items)
    ? profile.services_items
    : [];

  const gallery = Array.isArray(profile.gallery) ? profile.gallery : [];
  

  function updateArrayItem(field, id, key, value) {
    const list = Array.isArray(profile[field]) ? profile[field] : [];

    setField(
      field,
      list.map((item) =>
        item.id === id ? { ...item, [key]: value } : item
      )
    );
  }

  function removeArrayItem(field, id) {
    const list = Array.isArray(profile[field]) ? profile[field] : [];
    setField(
      field,
      list.filter((item) => item.id !== id)
    );
  }

  function addService() {
    setField("services_items", [
      ...services,
      {
        id: `service-${Date.now()}`,
        icon: "⭐",
        title: "Novo serviço",
        description: "Descreva esse serviço.",
        active: true,
      },
    ]);
  }

  function addGalleryImage(url = "") {
  const imageUrl =
    typeof url === "string"
      ? url
      : url?.publicUrl || url?.url || "";

  if (!imageUrl) return;

  setField("gallery", [
    ...gallery,
    {
      id: `gallery-${Date.now()}`,
      url: imageUrl,
      title: "Imagem da galeria",
      active: true,
    },
  ]);
}
  return (
    <div className="overview-stack">
      <SectionTitle
        title="Editor das seções da página"
        text="Controle textos, cards, galeria, avaliações e chamada final da landing page."
      />

      <div className="toggle-grid clean">
        <ToggleField
          label="Mostrar Sobre"
          value={profile.show_about}
          onChange={(v) => setField("show_about", v)}
        />

        <ToggleField
          label="Mostrar Serviços"
          value={profile.show_services}
          onChange={(v) => setField("show_services", v)}
        />

        <ToggleField
          label="Mostrar Portfólio"
          value={profile.show_portfolio}
          onChange={(v) => setField("show_portfolio", v)}
        />

        <ToggleField
          label="Mostrar Avaliações"
          value={profile.show_reviews}
          onChange={(v) => setField("show_reviews", v)}
        />

        <ToggleField
          label="Mostrar Loja"
          value={profile.show_store}
          onChange={(v) => setField("show_store", v)}
        />

        <ToggleField
          label="Mostrar CTA final"
          value={profile.show_final_cta}
          onChange={(v) => setField("show_final_cta", v)}
        />
      </div>

      <div className="dash-card">
        <span className="card-label">Sobre</span>
        <h3>Texto da seção Sobre</h3>

        <div className="form-grid">
          <Field label="Título do Sobre">
            <input
              value={profile.about_title || ""}
              onChange={(e) => setField("about_title", e.target.value)}
              placeholder="Ex: Sobre meu trabalho"
            />
          </Field>

          <Field label="Texto do Sobre" full>
            <textarea
              value={profile.about_text || ""}
              onChange={(e) => setField("about_text", e.target.value)}
              placeholder="Conte a história, experiência e diferenciais do profissional."
            />
          </Field>
        </div>
      </div>

      <div className="dash-card">
        <div className="store-editor-head">
          <div>
            <span className="card-label">Serviços</span>
            <h3>Cards de serviços</h3>
            <p>Ideal para profissionais que não vendem produtos, mas querem explicar suas soluções.</p>
          </div>

          <button type="button" onClick={addService}>
            + Serviço
          </button>
        </div>

        <div className="form-grid">
          <Field label="Título da seção">
            <input
              value={profile.services_title || ""}
              onChange={(e) => setField("services_title", e.target.value)}
              placeholder="Ex: Serviços"
            />
          </Field>

          <Field label="Texto da seção">
            <input
              value={profile.services_text || ""}
              onChange={(e) => setField("services_text", e.target.value)}
              placeholder="Ex: Conheça minhas principais soluções"
            />
          </Field>
        </div>

        <div className="store-items-editor">
          {services.map((service) => (
            <div key={service.id} className="store-item-editor">
              <div className="store-item-editor-head">
                <div>
                  <span>Serviço</span>
                  <strong>{service.icon} {service.title}</strong>
                </div>

                <button
                  type="button"
                  className="danger-button"
                  onClick={() => removeArrayItem("services_items", service.id)}
                >
                  Remover
                </button>
              </div>

              <div className="form-grid">
                <Field label="Ícone">
  <EmojiPicker
    value={service.icon || "⭐"}
    onChange={(emoji) =>
      updateArrayItem("services_items", service.id, "icon", emoji)
    }
  />
</Field>

                <Field label="Título">
                  <input
                    value={service.title || ""}
                    onChange={(e) =>
                      updateArrayItem("services_items", service.id, "title", e.target.value)
                    }
                    placeholder="Ex: Consultoria"
                  />
                </Field>

                <Field label="Descrição" full>
                  <textarea
                    value={service.description || ""}
                    onChange={(e) =>
                      updateArrayItem("services_items", service.id, "description", e.target.value)
                    }
                    placeholder="Explique esse serviço"
                  />
                </Field>
              </div>

              <ToggleField
                label="Serviço ativo"
                value={service.active !== false}
                onChange={(v) =>
                  updateArrayItem("services_items", service.id, "active", v)
                }
              />
            </div>
          ))}
        </div>
      </div>

      <div className="dash-card">
        <div className="store-editor-head">
          <div>
            <span className="card-label">Galeria / Portfólio</span>
            <h3>Imagens da galeria</h3>
            <p>Use URLs de imagens para montar o portfólio da página.</p>
          </div>

  <label className="upload-button">
  + Enviar imagem
  <input
    type="file"
    accept="image/*"
    onChange={(e) =>
      uploadImage(e, "gallery", (url) => {
        addGalleryImage(url);
      })
    }
  />
</label>
        </div>

        <div className="store-items-editor">
          {gallery.map((image) => (
            <div key={image.id} className="store-item-editor">
              <div className="store-item-editor-head">
                <div>
                  <span>Imagem</span>
                  <strong>{image.title || "Imagem da galeria"}</strong>
                </div>

                <button
                  type="button"
                  className="danger-button"
                  onClick={() => removeArrayItem("gallery", image.id)}
                >
                  Remover
                </button>
              </div>

              <div className="form-grid">
                <Field label="Título">
                  <input
                    value={image.title || ""}
                    onChange={(e) =>
                      updateArrayItem("gallery", image.id, "title", e.target.value)
                    }
                  />
                </Field>

                <Field label="URL da imagem" full>
                  <input
                    value={image.url || ""}
                    onChange={(e) =>
                      updateArrayItem("gallery", image.id, "url", e.target.value)
                    }
                    placeholder="https://..."
                  />
                </Field>
              </div>
            </div>
          ))}
        </div>
      </div>

  

      <div className="dash-card">
        <span className="card-label">CTA final</span>
        <h3>Chamada final da página</h3>

        <div className="form-grid">
          <Field label="Título do CTA">
            <input
              value={profile.cta_title || ""}
              onChange={(e) => setField("cta_title", e.target.value)}
              placeholder="Ex: Pronto para contratar?"
            />
          </Field>

          <Field label="Texto do CTA" full>
            <textarea
              value={profile.cta_text || ""}
              onChange={(e) => setField("cta_text", e.target.value)}
              placeholder="Ex: Fale comigo agora pelo WhatsApp."
            />
          </Field>
          <Field label="Texto do botão">
  <input
    value={profile.cta_button_text || ""}
    onChange={(e) => setField("cta_button_text", e.target.value)}
    placeholder="Ex: Falar agora"
  />
</Field>

<Field label="Ação do botão">
  <select
    value={profile.cta_action_type || "whatsapp"}
    onChange={(e) => setField("cta_action_type", e.target.value)}
  >
    <option value="whatsapp">Abrir WhatsApp cadastrado</option>
    <option value="custom_link">Abrir link personalizado</option>
  </select>
</Field>

{profile.cta_action_type === "custom_link" && (
  <Field label="Link personalizado" full>
    <input
      value={profile.cta_custom_link || ""}
      onChange={(e) => setField("cta_custom_link", e.target.value)}
      placeholder="https://..."
    />
  </Field>
)}
        </div>
      </div>
    </div>
  );
}

const WEEK_DAYS_CONFIG = [
  { key: "monday", label: "Segunda" },
  { key: "tuesday", label: "Terça" },
  { key: "wednesday", label: "Quarta" },
  { key: "thursday", label: "Quinta" },
  { key: "friday", label: "Sexta" },
  { key: "saturday", label: "Sábado" },
  { key: "sunday", label: "Domingo" },
];

function AvailabilityPanel({ profile, setField }) {
  const businessHours = profile.business_hours || {};

  function getDayPeriods(dayKey) {
    return Array.isArray(businessHours[dayKey])
      ? businessHours[dayKey]
      : [];
  }

  function setDayPeriods(dayKey, periods) {
    setField("business_hours", {
      ...businessHours,
      [dayKey]: periods,
    });
  }

  function toggleDay(dayKey) {
    const periods = getDayPeriods(dayKey);

    setDayPeriods(
      dayKey,
      periods.length > 0 ? [] : [{ open: "08:00", close: "18:00" }]
    );
  }

  function updatePeriod(dayKey, index, field, value) {
    const periods = getDayPeriods(dayKey);

    setDayPeriods(
      dayKey,
      periods.map((period, pIndex) =>
        pIndex === index ? { ...period, [field]: value } : period
      )
    );
  }

  function addSecondPeriod(dayKey) {
    const periods = getDayPeriods(dayKey);
    if (periods.length >= 2) return;

    setDayPeriods(dayKey, [
      ...periods,
      { open: "14:00", close: "18:00" },
    ]);
  }

  function removePeriod(dayKey, index) {
    const periods = getDayPeriods(dayKey);

    setDayPeriods(
      dayKey,
      periods.filter((_, pIndex) => pIndex !== index)
    );
  }

  return (
    <div className="overview-stack">
      <SectionTitle
        title="Funcionamento e entrega"
        text="Configure quando sua empresa aparece como aberta e quais formas de entrega, busca ou atendimento oferece."
      />

      <div className="dash-card">
        <span className="card-label">Horário comercial</span>
        <h3>Dias e horários de atendimento</h3>
        <p>
          Use um período para atendimento direto ou dois períodos para intervalo.
        </p>

        <div className="business-hours-editor">
          {WEEK_DAYS_CONFIG.map((day) => {
            const periods = getDayPeriods(day.key);
            const enabled = periods.length > 0;

            return (
              <div key={day.key} className="business-day-row">
                <button
                  type="button"
                  className={`business-day-toggle ${enabled ? "active" : ""}`}
                  onClick={() => toggleDay(day.key)}
                >
                  <strong>{day.label}</strong>
                  <span>{enabled ? "Aberto" : "Fechado"}</span>
                </button>

                {enabled && (
                  <div className="business-periods">
                    {periods.map((period, index) => (
                      <div
                        key={`${day.key}-${index}`}
                        className="business-period-row"
                      >
                        <Field label="Abertura">
                          <input
                            type="time"
                            value={period.open || ""}
                            onChange={(e) =>
                              updatePeriod(day.key, index, "open", e.target.value)
                            }
                          />
                        </Field>

                        <Field label="Fechamento">
                          <input
                            type="time"
                            value={period.close || ""}
                            onChange={(e) =>
                              updatePeriod(day.key, index, "close", e.target.value)
                            }
                          />
                        </Field>

                        {periods.length > 1 && (
                          <button
                            type="button"
                            className="danger-button"
                            onClick={() => removePeriod(day.key, index)}
                          >
                            Remover
                          </button>
                        )}
                      </div>
                    ))}

                    {periods.length < 2 && (
                      <button
                        type="button"
                        className="ghost-admin-button"
                        onClick={() => addSecondPeriod(day.key)}
                      >
                        + Adicionar segundo período
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="dash-card">
        <span className="card-label">Entrega e deslocamento</span>
        <h3>Como você atende o cliente?</h3>

        <div className="toggle-grid clean">
          <ToggleField
            label="Faz entrega"
            value={profile.delivery_enabled === true}
            onChange={(v) => setField("delivery_enabled", v)}
          />

          <ToggleField
            label="Frete grátis"
            value={profile.free_delivery === true}
            onChange={(v) => setField("free_delivery", v)}
          />

          <ToggleField
            label="Busca produto/equipamento no cliente"
            value={profile.pickup_enabled === true}
            onChange={(v) => setField("pickup_enabled", v)}
          />

          <ToggleField
            label="Atende em domicílio"
            value={profile.home_service_enabled === true}
            onChange={(v) => setField("home_service_enabled", v)}
          />
        </div>

        {!profile.free_delivery && profile.delivery_enabled && (
          <div className="form-grid">
            <Field label="Valor fixo da entrega/deslocamento">
              <input
                type="number"
                min="0"
                value={profile.delivery_fee || ""}
                onChange={(e) => setField("delivery_fee", e.target.value)}
                placeholder="Ex: 10"
              />
            </Field>
          </div>
        )}

        <p className="dashboard-note">
          Se não oferecer entrega, busca ou atendimento externo, nenhuma pílula
          será exibida no shopping.
        </p>
      </div>
    </div>
  );
}


function StoreItemsEditor({ profile, setField, uploadImage }) {
  const items = Array.isArray(profile.store_items) ? profile.store_items : [];
  const [itemSearch, setItemSearch] = useState("");
const [itemTypeFilter, setItemTypeFilter] = useState("all");
const [categoryFilter, setCategoryFilter] = useState("all");
const [editingItemId, setEditingItemId] = useState(null);
const [staffMembers, setStaffMembers] = useState([]);
const [loadingStaff, setLoadingStaff] = useState(false);
const filteredItems = items.filter((item) => {
  const search = itemSearch.toLowerCase();

  const matchesSearch =
    !search ||
    String(item.title || "").toLowerCase().includes(search) ||
    String(item.description || "").toLowerCase().includes(search);

  const matchesType =
    itemTypeFilter === "all" || item.type === itemTypeFilter;

  const matchesCategory =
    categoryFilter === "all" ||
    item.category_id === categoryFilter ||
    (categoryFilter === "none" && !item.category_id);

  return matchesSearch && matchesType && matchesCategory;
});
  const categories = Array.isArray(profile.store_categories)
    ? profile.store_categories
    : [];

  const workingDays = Array.isArray(profile.working_days)
    ? profile.working_days
    : [1, 2, 3, 4, 5, 6];

  const workingHours = profile.working_hours || {
    
    start: 8,
    end: 18,
    interval: 1,
  };
  useEffect(() => {
  async function loadStaff() {
    if (!profile?.id) return;

    try {
      setLoadingStaff(true);

      const data = await getProfileStaff(profile.id);

      setStaffMembers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("❌ erro ao carregar funcionários:", err);
    } finally {
      setLoadingStaff(false);
    }
  }

  loadStaff();
}, [profile?.id]);
function productHasVariants(item) {
  return item?.variants_enabled === true;
}

function getItemVariants(item) {
  return Array.isArray(item?.variants) ? item.variants : [];
}

function addVariant(itemId) {
  const item = items.find((i) => i.id === itemId);
  const variants = getItemVariants(item);

  updateItem(itemId, "variants", [
    ...variants,
    {
      id: `variant-${Date.now()}`,
      name: "Nova variação",
      required: true,
      options: [],
    },
  ]);
}

function updateVariant(itemId, variantId, field, value) {
  const item = items.find((i) => i.id === itemId);
  const variants = getItemVariants(item);

  updateItem(
    itemId,
    "variants",
    variants.map((variant) =>
      variant.id === variantId ? { ...variant, [field]: value } : variant
    )
  );
}

function removeVariant(itemId, variantId) {
  const item = items.find((i) => i.id === itemId);
  const variants = getItemVariants(item);

  updateItem(
    itemId,
    "variants",
    variants.filter((variant) => variant.id !== variantId)
  );
}

function addVariantOption(itemId, variantId) {
  const item = items.find((i) => i.id === itemId);
  const variants = getItemVariants(item);

  updateItem(
    itemId,
    "variants",
    variants.map((variant) => {
      if (variant.id !== variantId) return variant;

      return {
        ...variant,
        options: [
          ...(Array.isArray(variant.options) ? variant.options : []),
          {
            id: `option-${Date.now()}`,
            label: "Nova opção",
            image_url: "",
          },
        ],
      };
    })
  );
}

function updateVariantOption(itemId, variantId, optionId, field, value) {
  const item = items.find((i) => i.id === itemId);
  const variants = getItemVariants(item);

  updateItem(
    itemId,
    "variants",
    variants.map((variant) => {
      if (variant.id !== variantId) return variant;

      return {
        ...variant,
        options: (variant.options || []).map((option) =>
          option.id === optionId ? { ...option, [field]: value } : option
        ),
      };
    })
  );
}

function removeVariantOption(itemId, variantId, optionId) {
  const item = items.find((i) => i.id === itemId);
  const variants = getItemVariants(item);

  updateItem(
    itemId,
    "variants",
    variants.map((variant) => {
      if (variant.id !== variantId) return variant;

      return {
        ...variant,
        options: (variant.options || []).filter(
          (option) => option.id !== optionId
        ),
      };
    })
  );
}
  function updateWorkingHours(field, value) {
    setField("working_hours", {
      ...workingHours,
      [field]: Number(value),
    });
  }

  function toggleWorkingDay(day) {
    const next = workingDays.includes(day)
      ? workingDays.filter((item) => item !== day)
      : [...workingDays, day].sort((a, b) => a - b);

    setField("working_days", next);
  }

  function addCategory() {
    const newCategory = {
      id: `category-${Date.now()}`,
      name: "Nova categoria",
      active: true,
    };

    setField("store_categories", [...categories, newCategory]);
  }

  function updateCategory(id, field, value) {
    const next = categories.map((category) =>
      category.id === id ? { ...category, [field]: value } : category
    );

    setField("store_categories", next);
  }

  function removeCategory(id) {
    const nextCategories = categories.filter((category) => category.id !== id);

    const nextItems = items.map((item) =>
      item.category_id === id ? { ...item, category_id: "" } : item
    );

    setField("store_categories", nextCategories);
    setField("store_items", nextItems);
  }

  
function toggleItemStaff(itemId, staffId) {
  const item = items.find((i) => i.id === itemId);
  if (!item) return;

  const current = Array.isArray(item.allowed_staff_ids)
    ? item.allowed_staff_ids.map(String)
    : [];

  const id = String(staffId);
  const exists = current.includes(id);

  const nextStaffIds = exists
    ? current.filter((staffId) => staffId !== id)
    : [...current, id];

  const nextItems = items.map((currentItem) => {
    if (currentItem.id !== itemId) return currentItem;

    return {
      ...currentItem,
      allow_all_staff: false,
      allowed_staff_ids: nextStaffIds,
    };
  });

  setField("store_items", nextItems);
}

function itemCanUseAllStaff(item) {
  return item.allow_all_staff === true;
}

function getItemStaffIds(item) {
  return Array.isArray(item.allowed_staff_ids)
    ? item.allowed_staff_ids.map(String)
    : [];
}

  function addItem() {
    const firstCategory = categories[0];

    const newItem = {
  id: `item-${Date.now()}`,
  type: "service",
  title: "Novo serviço",
  description: "",
  price: 0,
  price_type: "fixed",
  image_url: "",
  category_id: firstCategory?.id || "",
  active: true,
  booking_enabled: false,
  duration_minutes: 60,
  variants_enabled: false,
variants: [],

allow_all_staff: true,
allowed_staff_ids: [],
};

    setField("store_items", [...items, newItem]);
  }

  function updateItem(id, field, value) {
    const next = items.map((item) => {
      if (item.id !== id) return item;

      const updated = {
        ...item,
        [field]: value,
      };

      if (field === "type" && value === "product") {
  updated.booking_enabled = false;
  updated.duration_minutes = null;
  updated.variants_enabled = updated.variants_enabled || false;
  updated.variants = Array.isArray(updated.variants) ? updated.variants : [];
}

      if (field === "type" && value === "service") {
  updated.duration_minutes = updated.duration_minutes || 60;
  updated.variants_enabled = false;
  updated.variants = [];
}

      if (field === "price_type" && value === "quote") {
        updated.price = 0;
      }

      return updated;
    });

    setField("store_items", next);
  }

  function removeItem(id) {
    setField(
      "store_items",
      items.filter((item) => item.id !== id)
    );
  }

  return (
    <div className="overview-stack">
      <ToggleField
        label="Ativar sistema de agendamento"
        value={profile.show_booking === true}
        onChange={(v) => setField("show_booking", v)}
      />

      {profile.show_booking === true && (
        <div className="dash-card">
          <span className="card-label">Agenda</span>
          <h3>Dias e horários de atendimento</h3>
          <p>
            Esses horários serão usados apenas nos serviços que tiverem agendamento
            ativado.
          </p>

          <div className="week-days-editor">
            {[
              { id: 0, label: "Dom" },
              { id: 1, label: "Seg" },
              { id: 2, label: "Ter" },
              { id: 3, label: "Qua" },
              { id: 4, label: "Qui" },
              { id: 5, label: "Sex" },
              { id: 6, label: "Sáb" },
            ].map((day) => (
              <button
                key={day.id}
                type="button"
                className={workingDays.includes(day.id) ? "active" : ""}
                onClick={() => toggleWorkingDay(day.id)}
              >
                {day.label}
              </button>
            ))}
          </div>

          <div className="form-grid">
            <Field label="Início do atendimento">
              <input
                type="number"
                min="0"
                max="23"
                value={workingHours.start}
                onChange={(e) => updateWorkingHours("start", e.target.value)}
              />
            </Field>

            <Field label="Fim do atendimento">
              <input
                type="number"
                min="1"
                max="24"
                value={workingHours.end}
                onChange={(e) => updateWorkingHours("end", e.target.value)}
              />
            </Field>

            <Field label="Intervalo entre horários">
              <select
                value={workingHours.interval}
                onChange={(e) => updateWorkingHours("interval", e.target.value)}
              >
                <option value={0.5}>30 minutos</option>
                <option value={1}>1 hora</option>
                <option value={2}>2 horas</option>
              </select>
            </Field>
          </div>
        </div>
      )}

      <div className="dash-card">
        <div className="store-editor-head">
          <div>
            <span className="card-label">Categorias</span>
            <h3>Organize sua loja</h3>
            <p>
              Crie categorias como Cortes masculinos, Barba, Calças, Shorts,
              Pacotes ou Orçamentos.
            </p>
          </div>

          <div>
            <button type="button" onClick={addCategory}>
              + Categoria
            </button>
          </div>
        </div>

        {categories.length === 0 ? (
          <div className="store-empty">
            <strong>Nenhuma categoria criada</strong>
            <p>
              Você pode cadastrar itens sem categoria, mas categorias deixam a
              página mais organizada.
            </p>
          </div>
        ) : (
          <div className="category-editor-list">
            {categories.map((category) => (
              <div key={category.id} className="category-editor-item">
                <Field label="Nome da categoria">
                  <input
                    value={category.name || ""}
                    onChange={(e) =>
                      updateCategory(category.id, "name", e.target.value)
                    }
                    placeholder="Ex: Cortes masculinos"
                  />
                </Field>

                <ToggleField
                  label="Categoria ativa"
                  value={category.active !== false}
                  onChange={(v) => updateCategory(category.id, "active", v)}
                />

                <button
                  type="button"
                  className="danger-button"
                  onClick={() => removeCategory(category.id)}
                >
                  Remover
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="dash-card">
        <div className="store-editor-head">
          <div>
            <span className="card-label">Produtos e serviços</span>
            <h3>Itens da sua página</h3>
            <p>
              Produto vai para carrinho. Serviço pode ser orçamento, solicitação
              simples ou agendamento.
            </p>
          </div>

          <div>
            <button type="button" onClick={addItem}>
              + Adicionar item
            </button>
          </div>
        </div>
<div className="store-admin-filters">
  <input
    value={itemSearch}
    onChange={(e) => setItemSearch(e.target.value)}
    placeholder="Buscar produto ou serviço..."
  />

  <select
    value={itemTypeFilter}
    onChange={(e) => setItemTypeFilter(e.target.value)}
  >
    <option value="all">Todos os tipos</option>
    <option value="service">Serviços</option>
    <option value="product">Produtos</option>
  </select>

  <select
    value={categoryFilter}
    onChange={(e) => setCategoryFilter(e.target.value)}
  >
    <option value="all">Todas as categorias</option>
    <option value="none">Sem categoria</option>
    {categories.map((category) => (
      <option key={category.id} value={category.id}>
        {category.name}
      </option>
    ))}
  </select>
</div>
        {items.length === 0 ? (
          <div className="store-empty">
            <strong>Nenhum produto ou serviço cadastrado</strong>
            <p>Adicione um item para aparecer na página pública.</p>
          </div>
        ) : (
          <div className="store-items-editor">
            {filteredItems.map((item) => {
              const isProduct = item.type === "product";
              const isService = item.type === "service";
              const isQuote = item.price_type === "quote";

              return (
                <div key={item.id} className="store-item-editor">

                 <div
  className="store-item-editor-head"
  onClick={() =>
    setEditingItemId(editingItemId === item.id ? null : item.id)
  }
  style={{ cursor: "pointer" }}
>
                    <div>
                      <span>{isProduct ? "Produto" : "Serviço"}</span>
                      <strong>{item.title || "Item sem nome"}</strong>
                    </div>

                    <button
                      type="button"
                      className="danger-button"
                      onClick={() => removeItem(item.id)}
                    >
                      Remover
                    </button>
                  </div>

                  <div className="form-grid">
                    <Field label="Tipo">
                      <select
                        value={item.type || "service"}
                        onChange={(e) =>
                          updateItem(item.id, "type", e.target.value)
                        }
                      >
                        <option value="service">Serviço</option>
                        <option value="product">Produto</option>
                      </select>
                    </Field>

                    <Field label="Categoria">
                      <select
                        value={item.category_id || ""}
                        onChange={(e) =>
                          updateItem(item.id, "category_id", e.target.value)
                        }
                      >
                        <option value="">Sem categoria</option>
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </Field>

                    <Field label="Nome">
                      <input
                        value={item.title || ""}
                        onChange={(e) =>
                          updateItem(item.id, "title", e.target.value)
                        }
                        placeholder="Ex: Corte masculino"
                      />
                    </Field>

                    <Field label="Preço">
                      <select
                        value={item.price_type || "fixed"}
                        onChange={(e) =>
                          updateItem(item.id, "price_type", e.target.value)
                        }
                      >
                        <option value="fixed">Preço fixo</option>
                        <option value="quote">Sob orçamento / A combinar</option>
                      </select>
                    </Field>

                    {!isQuote && (
                      <Field label="Valor">
                        <input
                          type="number"
                          value={item.price || 0}
                          onChange={(e) =>
                            updateItem(item.id, "price", Number(e.target.value))
                          }
                        />
                      </Field>
                    )}

                    {isService && (
                      <Field label="Duração em minutos">
                        <input
                          type="number"
                          value={item.duration_minutes || 60}
                          onChange={(e) =>
                            updateItem(
                              item.id,
                              "duration_minutes",
                              Number(e.target.value)
                            )
                          }
                        />
                      </Field>
                    )}

                    <Field label="Descrição" full>
                      <textarea
                        value={item.description || ""}
                        onChange={(e) =>
                          updateItem(item.id, "description", e.target.value)
                        }
                        placeholder="Descreva o produto ou serviço"
                      />
                    </Field>

                    <Field label="Imagem do item" full>
  <div className="upload-inline">
    {item.image_url && (
      <img
        src={item.image_url}
        alt={item.title}
        style={{
          width: 80,
          height: 80,
          objectFit: "cover",
          borderRadius: 8,
          marginBottom: 8,
        }}
      />
    )}

    <label className="upload-button">
      Enviar imagem
      <input
        type="file"
        accept="image/*"
        onChange={(e) =>
          uploadImage(e, "store_items", (url) => {
            updateItem(item.id, "image_url", url);
          })
        }
      />
    </label>

    <small>ou cole uma URL abaixo</small>

    <input
      value={item.image_url || ""}
      onChange={(e) =>
        updateItem(item.id, "image_url", e.target.value)
      }
      placeholder="https://..."
    />
  </div>
</Field>
                  </div>

                  <div className="store-item-actions">
                    <ToggleField
                      label="Item ativo"
                      value={item.active !== false}
                      onChange={(v) => updateItem(item.id, "active", v)}
                    />

                    {isService && profile.show_booking === true && (
                      <ToggleField
                        label="Permitir agendamento neste serviço"
                        value={item.booking_enabled === true}
                        onChange={(v) =>
                          updateItem(item.id, "booking_enabled", v)
                        }
                      />
                    )}

                    {isService && profile.show_booking !== true && (
                      <div className="dashboard-note">
                        Para permitir agendamento neste serviço, ative o sistema
                        de agendamento acima.
                      </div>
                    )}

                    {isProduct && (
                      <div className="dashboard-note">
                        Produto não usa agenda. Ele aparece no carrinho.
                      </div>
                    )}
{isProduct && (
  <div className="product-variants-editor">
    <ToggleField
      label="Este produto tem variações"
      value={item.variants_enabled === true}
      onChange={(v) => {
        updateItem(item.id, "variants_enabled", v);

        if (v && !Array.isArray(item.variants)) {
          updateItem(item.id, "variants", []);
        }
      }}
    />

    {item.variants_enabled === true && (
      <div className="dash-card product-variants-box">
        <div className="store-editor-head">
          <div>
            <span className="card-label">Variações do produto</span>
            <h3>Opções selecionáveis</h3>
            <p>
              Crie variações como Tamanho, Cor, Modelo, Sabor ou Voltagem.
              Imagem por opção é opcional.
            </p>
          </div>

          <button type="button" onClick={() => addVariant(item.id)}>
            + Variação
          </button>
        </div>

        {getItemVariants(item).length === 0 ? (
          <div className="store-empty">
            <strong>Nenhuma variação criada</strong>
            <p>Adicione uma variação, exemplo: Tamanho ou Cor.</p>
          </div>
        ) : (
          <div className="variants-list">
  {getItemVariants(item).map((variant) => (
    <div key={variant.id} className="variant-editor-card">
      <div className="store-item-editor-head">
        <div>
          <span>Variação</span>
          <strong>{variant.name || "Variação sem nome"}</strong>
        </div>

        <button
          type="button"
          className="danger-button"
          onClick={() => removeVariant(item.id, variant.id)}
        >
          Remover
        </button>
      </div>

      <div className="variant-card-scroll">
        <div className="form-grid">
          <Field label="Nome da variação">
            <input
              value={variant.name || ""}
              onChange={(e) =>
                updateVariant(item.id, variant.id, "name", e.target.value)
              }
              placeholder="Ex: Tamanho, Cor, Sabor"
            />
          </Field>

          <ToggleField
            label="Obrigatória"
            value={variant.required !== false}
            onChange={(v) =>
              updateVariant(item.id, variant.id, "required", v)
            }
          />
        </div>

        <div className="variant-options-head">
          <strong>Opções</strong>

          <button
            type="button"
            onClick={() => addVariantOption(item.id, variant.id)}
          >
            + Opção
          </button>
        </div>

        {(variant.options || []).length === 0 ? (
          <div className="dashboard-note">
            Nenhuma opção criada. Exemplo: P, M, G ou Preto, Branco.
          </div>
        ) : (
          <div className="variant-options-list">
            {(variant.options || []).map((option) => (
              <div key={option.id} className="variant-option-row">
                <Field label="Nome da opção">
                  <input
                    value={option.label || ""}
                    onChange={(e) =>
                      updateVariantOption(
                        item.id,
                        variant.id,
                        option.id,
                        "label",
                        e.target.value
                      )
                    }
                    placeholder="Ex: P, M, Preto, Azul"
                  />
                </Field>

                <Field label="Imagem opcional da opção">
                  <div className="upload-inline">
                    {option.image_url && (
                      <img
                        src={option.image_url}
                        alt={option.label || "Opção"}
                        style={{
                          width: 70,
                          height: 70,
                          objectFit: "cover",
                          borderRadius: 10,
                          marginBottom: 8,
                        }}
                      />
                    )}

                    <label className="upload-button">
                      Enviar imagem
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) =>
                          uploadImage(e, "store_items", (url) => {
                            updateVariantOption(
                              item.id,
                              variant.id,
                              option.id,
                              "image_url",
                              url
                            );
                          })
                        }
                      />
                    </label>

                    <input
                      value={option.image_url || ""}
                      onChange={(e) =>
                        updateVariantOption(
                          item.id,
                          variant.id,
                          option.id,
                          "image_url",
                          e.target.value
                        )
                      }
                      placeholder="https://..."
                    />
                  </div>
                </Field>

                <button
                  type="button"
                  className="danger-button"
                  onClick={() =>
                    removeVariantOption(item.id, variant.id, option.id)
                  }
                >
                  Remover opção
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  ))}
</div>
        )}
      </div>
    )}
  </div>
)}

{(isService || isProduct) && (
  <div className="dash-card staff-assignment-box">
    <div className="store-editor-head">
      <div>
        <span className="card-label">
          {isService ? "Profissionais do serviço" : "Vendedores do produto"}
        </span>

        <h3>
          {isService
            ? "Quem pode atender este serviço?"
            : "Quem pode vender este produto?"}
        </h3>

        <p>
          Escolha profissionais específicos ou permita todos.
        </p>
      </div>
    </div>
{!loadingStaff && staffMembers.length === 0 && (
  <div className="dashboard-note">
    Nenhum funcionário cadastrado ainda. Vá na aba Equipe e cadastre pelo menos
    um profissional para poder vincular este item.
  </div>
)}
    <ToggleField
      label={
        isService
          ? "Todos os profissionais podem atender"
          : "Todos os vendedores podem receber pedidos"
      }
      value={itemCanUseAllStaff(item)}
      onChange={(v) => updateItem(item.id, "allow_all_staff", v)}
    />

    {!itemCanUseAllStaff(item) && (
      <div className="staff-selector-grid">
        {staffMembers.map((staff) => {
          const selected = getItemStaffIds(item).includes(String(staff.id));

          return (
            <button
              key={staff.id}
              type="button"
              className={`staff-selector-card ${
                selected ? "active" : ""
              }`}
              onClick={() => toggleItemStaff(item.id, staff.id)}
            >
              <strong>{staff.nome}</strong>

              <span>
                {staff.role === "admin"
                  ? "Administrador"
                  : staff.role === "cashier"
                  ? "Caixa"
                  : staff.role === "manager"
                  ? "Gerente"
                  : "Profissional"}
              </span>
            </button>
          );
        })}
      </div>
    )}

    {loadingStaff && (
      <div className="dashboard-note">
        Carregando profissionais...
      </div>
    )}
  </div>
)}
                    {isQuote && (
                      <div className="dashboard-note">
                        Este item será exibido como “Sob orçamento”.
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function ReviewsPanel({ profile, setField, reviews, loading, reload }) {
  async function updateReviewStatus(id, nextStatus) {
  const res = await fetch(`/api/reviews/admin/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      status: nextStatus,
    }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    console.error("Erro ao atualizar avaliação:", data);
    alert(data?.error || "Erro ao atualizar avaliação.");
    return;
  }

  await reload();
}

  async function deleteReview(id) {
  const ok = confirm("Remover esta avaliação?");
  if (!ok) return;

  const res = await fetch(`/api/reviews/admin/${id}`, {
    method: "DELETE",
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    console.error("Erro ao remover avaliação:", data);
    alert(data?.error || "Erro ao remover avaliação.");
    return;
  }

  await reload();
}

  return (
    <div className="dash-panel">
      <div className="bookings-panel-head">
        <PanelTitle
          title="Avaliações"
          text="Acompanhe, aprove, oculte ou remova comentários enviados pelos clientes."
        />

        <button type="button" onClick={reload} disabled={loading}>
          {loading ? "Atualizando..." : "Atualizar avaliações"}
        </button>
      </div>
<div className="dash-card">
  <ToggleField
    label="Reter avaliações para aprovação"
    value={profile.reviews_require_approval !== false}
    onChange={(v) => setField("reviews_require_approval", v)}
  />

  <p className="dashboard-note">
    Ativado: comentários ficam pendentes até você aprovar.  
    Desativado: comentários aparecem automaticamente na página.
  </p>
</div>
      {loading ? (
        <div className="coming-box">
          <strong>Carregando avaliações...</strong>
        </div>
      ) : reviews.length === 0 ? (
        <div className="coming-box">
          <strong>Nenhuma avaliação ainda</strong>
          <p>Quando clientes comentarem na página, elas aparecerão aqui.</p>
        </div>
      ) : (
        <div className="bookings-list">
          {reviews.map((review) => {
            const approved = review.status === "approved";

            return (
              <div key={review.id} className="booking-admin-card">
                <div className="booking-admin-top">
                  <div>
                    <span
                      className={`booking-status ${
                        approved ? "confirmed" : "pending"
                      }`}
                    >
                      {approved ? "Publicada" : "Pendente"}
                    </span>

                    <h3>{review.name || "Cliente"}</h3>
                  </div>

                  <strong>{"⭐".repeat(Number(review.rating || 5))}</strong>
                </div>

                <div className="booking-admin-info">
                  <span>{review.comment || "Sem comentário"}</span>
                </div>

                <div className="booking-admin-actions">
                  {approved ? (
                    <button
                      type="button"
                      onClick={() => updateReviewStatus(review.id, "pending")}
                    >
                      Ocultar
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => updateReviewStatus(review.id, "approved")}
                    >
                      Publicar
                    </button>
                  )}

                  <button
                    type="button"
                    className="danger-button"
                    onClick={() => deleteReview(review.id)}
                  >
                    Remover
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
function formatBookingDate(date) {
  if (!date) return "";

  return new Date(`${date}T00:00:00`).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function bookingStatusLabel(status) {
  if (status === "confirmed") return "Confirmado";
  if (status === "completed") return "Finalizado";
  if (status === "cancelled") return "Cancelado";
  if (status === "expired") return "Expirado";
  return "Pendente";
}

function BookingsPanel({ bookings, loading, reload }) {
  const [paymentModalBooking, setPaymentModalBooking] = useState(null);

  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    payment_method: "pix",
    note: "",
  });

  const [finishingPayment, setFinishingPayment] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [staffFilter, setStaffFilter] = useState("all");

  const counts = {
    all: bookings.length,
    pending: bookings.filter((item) => item.status === "pending").length,
    confirmed: bookings.filter((item) => item.status === "confirmed").length,
    completed: bookings.filter((item) => item.status === "completed").length,
    cancelled: bookings.filter((item) => item.status === "cancelled").length,
  };

  const staffOptions = useMemo(() => {
    const map = new Map();

    bookings.forEach((booking) => {
      const staffId =
        booking.assigned_staff_id ||
        booking.staff_id ||
        booking.staff?.id ||
        null;

      const staffName =
        booking.staff_name ||
        booking.assigned_staff_name ||
        booking.professional_name ||
        booking.staff?.nome ||
        "";

      if (staffId && staffName) {
        map.set(String(staffId), {
          id: String(staffId),
          name: staffName,
          count: 0,
        });
      }
    });

    bookings.forEach((booking) => {
      const staffId =
        booking.assigned_staff_id ||
        booking.staff_id ||
        booking.staff?.id ||
        null;

      if (staffId && map.has(String(staffId))) {
        map.get(String(staffId)).count += 1;
      }
    });

    return Array.from(map.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, [bookings]);

  const filteredBookings = bookings.filter((booking) => {
    const matchesStatus =
      statusFilter === "all" || booking.status === statusFilter;

    const bookingStaffId = String(
      booking.assigned_staff_id ||
        booking.staff_id ||
        booking.staff?.id ||
        ""
    );

    const matchesStaff =
      staffFilter === "all" || bookingStaffId === String(staffFilter);

    return matchesStatus && matchesStaff;
  });

  

  function shortText(text = "", limit = 140) {
    const clean = String(text || "").trim();
    if (clean.length <= limit) return clean;
    return `${clean.slice(0, limit)}...`;
  }

  function getServiceName(service) {
    return service?.name || service?.title || service?.service_title || "Serviço";
  }

  function getBookingStaffName(booking) {
    return (
      booking.staff_name ||
      booking.assigned_staff_name ||
      booking.professional_name ||
      booking.staff?.nome ||
      ""
    );
  }

  function buildServicesText(services = []) {
    if (!services.length) return "Serviço não informado";

    return services
      .map((service) => {
        const qty = service.qty > 1 ? `${service.qty}x ` : "";
        const name = getServiceName(service);
        return `${qty}${name}`;
      })
      .join(" • ");
  }

  function getBookingTotal(booking) {
    if (booking.total) return Number(booking.total || 0);

    const services = Array.isArray(booking.services) ? booking.services : [];

    return services.reduce((acc, service) => {
      if (service.price_type === "quote") return acc;

      return (
        acc +
        Number(service.price || service.value || 0) *
          Number(service.qty || 1)
      );
    }, 0);
  }
async function updateBookingStatus(bookingId, status) {
  if (!bookingId) return;

  try {
    const response = await fetch("/api/bookings/update-status", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        bookingId,
        status,
      }),
    });

    const json = await response.json().catch(() => ({}));

    if (!response.ok) {
      alert(json.error || "Erro ao atualizar agendamento.");
      return;
    }

    await reload();

    if (status === "confirmed") {
      alert("Agendamento confirmado e cliente avisado automaticamente!");
    }

    if (status === "cancelled") {
      alert("Agendamento cancelado e cliente avisado automaticamente!");
    }
  } catch (err) {
    console.error("Erro ao atualizar agendamento:", err);
    alert("Erro ao atualizar agendamento.");
  }
}
  async function deleteBooking(booking) {
    const ok = confirm(
      "Excluir este agendamento? Use isso apenas para trote, teste ou solicitação inválida."
    );

    if (!ok) return;

    const { error } = await supabase
      .from("profile_bookings")
      .delete()
      .eq("id", booking.id);

    if (error) {
      console.error("Erro ao excluir agendamento:", error);
      alert(error.message || "Erro ao excluir agendamento.");
      return;
    }

    await reload();
  }

  function openPaymentModal(booking) {
    const suggestedAmount = getBookingTotal(booking);

    setPaymentModalBooking(booking);

    setPaymentForm({
      amount: suggestedAmount > 0 ? suggestedAmount : "",
      payment_method: "pix",
      note: "",
    });
  }

  function closePaymentModal() {
    setPaymentModalBooking(null);

    setPaymentForm({
      amount: "",
      payment_method: "pix",
      note: "",
    });
  }

  async function finalizeBookingPayment() {
    if (!paymentModalBooking?.id || finishingPayment) return;

    const amount = Number(paymentForm.amount || 0);

    if (!amount || amount <= 0) {
      alert("Informe o valor recebido.");
      return;
    }

    setFinishingPayment(true);

    try {
      const response = await fetch("/api/finance/finalize-booking", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bookingId: paymentModalBooking.id,
          profilePageId: paymentModalBooking.profile_page_id,
          amount,
          paymentMethod: paymentForm.payment_method,
          note: paymentForm.note,
          staffId:
            paymentModalBooking.assigned_staff_id ||
            paymentModalBooking.staff_id ||
            null,
        }),
      });

      const json = await response.json().catch(() => ({}));

      if (!response.ok) {
        alert(json.error || "Erro ao finalizar atendimento.");
        return;
      }

      await reload();
      closePaymentModal();

      alert("Atendimento finalizado com sucesso!");
    } catch (err) {
      console.error(err);
      alert("Erro ao finalizar atendimento.");
    } finally {
      setFinishingPayment(false);
    }
  }

  return (
    <div className="dash-panel bookings-dashboard-panel">
      <div className="bookings-panel-head">
        <PanelTitle
          title="Agendamentos"
          text="Acompanhe solicitações, confirme horários, filtre por profissional e finalize atendimentos."
        />

        <button type="button" onClick={reload} disabled={loading}>
          {loading ? "Atualizando..." : "Atualizar agendamentos"}
        </button>
      </div>

      <div className="booking-stats-grid">
        <button
          type="button"
          className={statusFilter === "all" ? "active" : ""}
          onClick={() => setStatusFilter("all")}
        >
          <span>Total</span>
          <strong>{counts.all}</strong>
        </button>

        <button
          type="button"
          className={statusFilter === "pending" ? "active" : ""}
          onClick={() => setStatusFilter("pending")}
        >
          <span>Pendentes</span>
          <strong>{counts.pending}</strong>
        </button>

        <button
          type="button"
          className={statusFilter === "confirmed" ? "active" : ""}
          onClick={() => setStatusFilter("confirmed")}
        >
          <span>Confirmados</span>
          <strong>{counts.confirmed}</strong>
        </button>

        <button
          type="button"
          className={statusFilter === "completed" ? "active" : ""}
          onClick={() => setStatusFilter("completed")}
        >
          <span>Finalizados</span>
          <strong>{counts.completed}</strong>
        </button>

        <button
          type="button"
          className={statusFilter === "cancelled" ? "active" : ""}
          onClick={() => setStatusFilter("cancelled")}
        >
          <span>Cancelados</span>
          <strong>{counts.cancelled}</strong>
        </button>
      </div>

      <div className="booking-staff-carousel">
        <button
          type="button"
          className={staffFilter === "all" ? "active" : ""}
          onClick={() => setStaffFilter("all")}
        >
          <span>👥</span>
          <strong>Todos</strong>
          <small>{bookings.length}</small>
        </button>

        {staffOptions.map((staff) => (
          <button
            key={staff.id}
            type="button"
            className={staffFilter === staff.id ? "active" : ""}
            onClick={() => setStaffFilter(staff.id)}
          >
            <span>{staff.name?.[0] || "P"}</span>
            <strong>{staff.name}</strong>
            <small>{staff.count}</small>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="coming-box">
          <strong>Carregando agendamentos...</strong>
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="coming-box">
          <strong>Nenhum agendamento nesta visualização</strong>
          <p>Altere o filtro de status ou profissional para ver outros agendamentos.</p>
        </div>
      ) : (
        <div className="bookings-list booking-cards-grid">
          {filteredBookings.map((booking) => {
            const services = Array.isArray(booking.services)
              ? booking.services
              : [];

            const staffName = getBookingStaffName(booking);
            const total = getBookingTotal(booking);

            return (
              <div key={booking.id} className="booking-admin-card booking-mini-card">
                <div className="booking-admin-top">
                  <div>
                    <span className={`booking-status ${booking.status || "pending"}`}>
                      {bookingStatusLabel(booking.status)}
                    </span>

                    <h3>
                      {formatBookingDate(booking.date)} às {booking.time}
                    </h3>

                    {staffName && (
                      <small className="booking-staff-line">
                        Profissional: {staffName}
                      </small>
                    )}
                  </div>

                  <strong>{total > 0 ? money(total) : `${services.length || 1} serviço(s)`}</strong>
                </div>

                <div className="booking-admin-services">
                  {services.length > 0 ? (
                    services.map((service, index) => (
                      <div key={`${booking.id}-${index}`}>
                        <strong>{getServiceName(service)}</strong>

                        <span>
                          {service.qty > 1 ? `${service.qty}x` : "1x"}
                          {service.price_type === "quote"
                            ? " • Sob orçamento"
                            : service.price
                            ? ` • ${money(service.price)}`
                            : ""}
                          {service.duration || service.duration_minutes
                            ? ` • ${service.duration || service.duration_minutes} min`
                            : ""}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div>
                      <strong>Serviço não informado</strong>
                    </div>
                  )}
                </div>

                <div className="booking-admin-info">
                  {booking.customer_name && (
                    <span>Cliente: {booking.customer_name}</span>
                  )}

                  {booking.customer_phone && (
  <span>WhatsApp: {booking.customer_phone}</span>
)}

                  {booking.note && <span>Obs: {booking.note}</span>}

                  
                </div>

                <div className="booking-admin-actions">
                  {booking.status === "confirmed" && (
                    <button
                      type="button"
                      className="delivered-button"
                      onClick={() => openPaymentModal(booking)}
                    >
                      Finalizar atendimento
                    </button>
                  )}

                  {booking.status !== "confirmed" &&
                    booking.status !== "completed" &&
                    booking.status !== "cancelled" && (
                    <button
  type="button"
  className="confirm-button"
  onClick={() => updateBookingStatus(booking.id, "confirmed")}
>
  Confirmar
</button>
                    )}

                  {booking.status !== "cancelled" &&
                    booking.status !== "completed" && (
                      <button
                        type="button"
                        className="danger-button"
                        onClick={() => updateBookingStatus(booking.id, "cancelled")}
                      >
                        Cancelar
                      </button>
                    )}

                  <button
                    type="button"
                    className="danger-button"
                    onClick={() => deleteBooking(booking)}
                  >
                    Excluir
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {paymentModalBooking && (
        <div className="payment-modal-backdrop" onClick={closePaymentModal}>
          <div className="payment-modal" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="payment-modal-close"
              onClick={closePaymentModal}
            >
              ×
            </button>

            <span className="card-label">Finalizar atendimento</span>

            <h3>Registrar pagamento do agendamento</h3>

            <p>
              Informe o valor recebido e a forma de pagamento para lançar essa
              entrada no financeiro.
            </p>

            <div className="payment-summary">
              <span>Cliente</span>
              <strong>{paymentModalBooking.customer_name || "Cliente"}</strong>
            </div>

            <div className="payment-summary">
              <span>Agendamento</span>
              <strong>
                {formatBookingDate(paymentModalBooking.date)} às{" "}
                {paymentModalBooking.time}
              </strong>
            </div>

            {getBookingStaffName(paymentModalBooking) && (
              <div className="payment-summary">
                <span>Profissional</span>
                <strong>{getBookingStaffName(paymentModalBooking)}</strong>
              </div>
            )}

            <div className="form-grid">
              <Field label="Valor recebido">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={paymentForm.amount}
                  onChange={(e) =>
                    setPaymentForm((prev) => ({
                      ...prev,
                      amount: e.target.value,
                    }))
                  }
                  placeholder="Ex: 80"
                />
              </Field>

              <Field label="Forma de pagamento">
                <select
                  value={paymentForm.payment_method}
                  onChange={(e) =>
                    setPaymentForm((prev) => ({
                      ...prev,
                      payment_method: e.target.value,
                    }))
                  }
                >
                  <option value="pix">Pix</option>
                  <option value="cash">Dinheiro</option>
                  <option value="card">Cartão</option>
                  <option value="transfer">Transferência</option>
                  <option value="other">Outro</option>
                </select>
              </Field>

              <Field label="Observação" full>
                <textarea
                  value={paymentForm.note}
                  onChange={(e) =>
                    setPaymentForm((prev) => ({
                      ...prev,
                      note: e.target.value,
                    }))
                  }
                  placeholder="Ex: Cliente pagou no Pix da loja"
                />
              </Field>
            </div>

            <button
              type="button"
              className="payment-finish-button"
              onClick={finalizeBookingPayment}
              disabled={finishingPayment}
            >
              {finishingPayment ? "Finalizando..." : "Confirmar pagamento"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "";

function getDashboardUser() {
  if (typeof window === "undefined") return null;

  try {
    const saved = localStorage.getItem("rendaja_user");
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

function calcMissaoTaxaWeb(valor) {
  return Number((Number(valor || 0) * 0.1).toFixed(2));
}

function statusMissaoLabel(status) {
  const map = {
    pendente_pagamento: "Pendente pagamento",
    aberta: "Aberta",
    aguardando_aprovacao_dono: "Aguardando aprovação",
    em_andamento: "Em andamento",
    encerrada: "Encerrada",
    concluida: "Concluída",
    cancelada: "Cancelada",
  };

  return map[status] || status || "Pendente";
}

function tipoContratacaoLabel(value) {
  const map = {
    clt: "CLT",
    diaria: "Diária",
    freelance: "Freelance",
    mei: "MEI",
    meio_periodo: "Meio período",
    comissao: "Comissão",
    a_combinar: "A combinar",
  };

  return map[value] || value || "-";
}
function PaymentModal({ open, title, description, amount, loading, payment, onConfirm, onClose }) {
  if (!open) return null;

  return (
    <div className="payment-modal-backdrop">
      <div className="payment-modal">
        <button className="payment-modal-close" onClick={onClose}>×</button>

        {!payment?.qr_code ? (
          <>
            <span className="card-label">Pagamento via Pix</span>
            <h2>{title}</h2>
            <p>{description}</p>

            <div className="payment-summary">
              <span>Método</span>
              <strong>Pix</strong>
            </div>

            <div className="payment-summary">
              <span>Total</span>
              <strong>{money(amount)}</strong>
            </div>

            <div className="booking-admin-actions">
              <button type="button" onClick={onConfirm} disabled={loading}>
                {loading ? "Gerando Pix..." : "Gerar QR Code"}
              </button>

              <button type="button" className="danger-button" onClick={onClose}>
                Cancelar
              </button>
            </div>
          </>
        ) : (
          <>
            <span className="card-label">Pix gerado</span>
            <h2>Pagamento pronto</h2>
            <p>Copie o código Pix abaixo ou abra o link de pagamento.</p>

            {payment.checkout_url && (
              <a href={payment.checkout_url} target="_blank" rel="noreferrer">
                Abrir pagamento
              </a>
            )}

            <div className="pix-qr-wrapper">
  <QRCodeCanvas
    value={payment.qr_code}
    size={220}
    level="H"
  />
</div>

<textarea readOnly value={payment.qr_code} />

            <div className="booking-admin-actions">
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(payment.qr_code)}
              >
                Copiar Pix
              </button>

              <button type="button" onClick={onClose}>
                Fechar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
function JobsPanel() {
  const [paymentModal, setPaymentModal] = useState(null);
  const [tab, setTab] = useState("create");
  const [loading, setLoading] = useState(true);
  const [areas, setAreas] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [credits, setCredits] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [saving, setSaving] = useState(false);
  const [payment, setPayment] = useState(null);

  const [form, setForm] = useState({
    area_chave: "",
    categoria_chave: "",
    titulo: "",
    descricao: "",
    requisitos: "",
    tipo_contratacao: "clt",
    salario: "",
    jornada: "",
    quantidade_vagas: 1,
    destaque: false,
  });

  const user = getDashboardUser();

  const totalCreditos = credits.reduce(
    (acc, item) => acc + Number(item.total_creditos || 0),
    0
  );

  const usados = credits.reduce(
    (acc, item) => acc + Number(item.creditos_usados || 0),
    0
  );

  const restantes = Math.max(0, totalCreditos - usados);

  useEffect(() => {
    loadJobsPanel();
  }, []);

  async function loadJobsPanel() {
    if (!user?.id) return;

    setLoading(true);

    const now = new Date().toISOString();

    const [areasRes, creditsRes, jobsRes] = await Promise.all([
      supabase
        .from("areas")
        .select("chave,nome,ativo,ordem")
        .eq("ativo", true)
        .order("ordem", { ascending: true })
        .order("nome", { ascending: true }),

      supabase
        .from("empresa_creditos_vagas")
        .select("*")
        .eq("empresa_id", user.id)
        .eq("status", "ativo")
        .gt("validade_em", now)
        .order("created_at", { ascending: true }),

      supabase
        .from("vagas")
        .select("*")
        .eq("empresa_id", user.id)
        .order("created_at", { ascending: false }),
    ]);

    setAreas((areasRes.data || []).filter((item) => item.chave !== "profissional"));
    setCredits(creditsRes.data || []);
    setJobs(jobsRes.data || []);

    setLoading(false);
  }

  async function loadCategorias(areaChave) {
    setForm((prev) => ({
      ...prev,
      area_chave: areaChave,
      categoria_chave: "",
    }));

    const { data, error } = await supabase
      .from("categorias")
      .select("chave,nome,ativo,area_chave,ordem")
      .eq("ativo", true)
      .eq("area_chave", areaChave)
      .order("ordem", { ascending: true })
      .order("nome", { ascending: true });

    if (error) {
      console.error("Erro ao buscar categorias:", error);
      setCategorias([]);
      return;
    }

    setCategorias(data || []);
  }

  function setJobField(field, value) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  async function comprarPacote(planoCodigo) {
    if (!user?.id) {
      alert("Usuário não encontrado.");
      return;
    }

    setSaving(true);
    setPayment(null);

    const { data: plano, error: planoError } = await supabase
      .from("planos_precos")
      .select("*")
      .eq("codigo", planoCodigo)
      .eq("ativo", true)
      .maybeSingle();

    if (planoError || !plano) {
      setSaving(false);
      alert("Plano indisponível.");
      return;
    }

    const { data: pagamento, error } = await supabase
      .from("pagamentos_plataforma")
      .insert({
        usuario_id: user.id,
        referencia_tipo: "empresa_pacote_vagas",
        plano_codigo: plano.codigo,
        valor: plano.valor,
        status: "pendente",
        metadata: {
          empresa_id: user.id,
          nome_empresa: user.nome_empresa || user.nome || null,
          telefone: user.telefone,
          cidade: user.cidade,
          estado: user.estado,
          modo: "pacote_vagas_empresa_dashboard",
        },
      })
      .select()
      .single();

    if (error || !pagamento) {
      setSaving(false);
      console.error("Erro ao criar pagamento:", error);
      alert("Erro ao criar cobrança.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/payments/create-intent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paymentId: pagamento.id,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Erro ao gerar Pix.");
      }

      setPayment(data.payment);
    } catch (err) {
      console.error("Erro Pix:", err);
      alert("Pagamento criado, mas não consegui gerar o Pix.");
    } finally {
      setSaving(false);
    }
  }

  async function consumirCredito() {
    const disponivel = credits.find(
      (c) => Number(c.creditos_usados || 0) < Number(c.total_creditos || 0)
    );

    if (!disponivel) return null;

    const novosUsados = Number(disponivel.creditos_usados || 0) + 1;
    const novoStatus =
      novosUsados >= Number(disponivel.total_creditos || 0) ? "esgotado" : "ativo";

    const { data, error } = await supabase
      .from("empresa_creditos_vagas")
      .update({
        creditos_usados: novosUsados,
        status: novoStatus,
      })
      .eq("id", disponivel.id)
      .select()
      .single();

    if (error) {
      console.error("Erro ao consumir crédito:", error);
      return null;
    }

    return data;
  }

  async function publicarVaga() {
    if (!user?.id) {
      alert("Usuário não encontrado.");
      return;
    }

    if (restantes <= 0) {
      alert("Você precisa comprar um pacote antes de publicar vagas.");
      setTab("packages");
      return;
    }

    if (!form.categoria_chave || !form.titulo || !form.descricao || !form.requisitos) {
      alert("Preencha área, função, título, descrição e requisitos.");
      return;
    }

    setSaving(true);

    const credito = await consumirCredito();

    if (!credito) {
      setSaving(false);
      alert("Não consegui consumir o crédito da vaga.");
      return;
    }

    const payload = {
      empresa_id: user.id,
      nome_empresa: user.nome_empresa || user.nome || null,
      titulo: form.titulo,
      descricao: form.descricao,
      requisitos: form.requisitos,
      tipo_contratacao: form.tipo_contratacao,
      salario: form.salario,
      jornada: form.jornada,
      quantidade_vagas: Number(form.quantidade_vagas || 1),
      categoria_chave: form.categoria_chave,
      cidade: user.cidade,
      estado: user.estado,
      destaque: !!form.destaque,
      status: "ativa",
      publicada_em: new Date().toISOString(),
      contato_whatsapp: user.telefone || null,
    };

    const { error } = await supabase.from("vagas").insert(payload);

    setSaving(false);

    if (error) {
      console.error("Erro ao publicar vaga:", error);
      alert("Erro ao publicar vaga.");
      return;
    }

    alert("Vaga publicada com sucesso!");

    setForm({
      area_chave: "",
      categoria_chave: "",
      titulo: "",
      descricao: "",
      requisitos: "",
      tipo_contratacao: "clt",
      salario: "",
      jornada: "",
      quantidade_vagas: 1,
      destaque: false,
    });

    setCategorias([]);
    setTab("list");
    loadJobsPanel();
  }

  async function removerVaga(id) {
    const ok = confirm("Remover esta vaga?");
    if (!ok) return;

    const { error } = await supabase
      .from("vagas")
      .delete()
      .eq("id", id)
      .eq("empresa_id", user.id);

    if (error) {
      console.error("Erro ao remover vaga:", error);
      alert("Erro ao remover vaga.");
      return;
    }

    loadJobsPanel();
  }

  return (
    <div className="dash-panel">
      <div className="bookings-panel-head">
        <PanelTitle
          title="Vagas"
          text="Crie vagas usando áreas, categorias, créditos e pacotes do sistema RendaJá."
        />

        <button type="button" onClick={loadJobsPanel} disabled={loading}>
          {loading ? "Atualizando..." : "Atualizar"}
        </button>
      </div>

      <div className="booking-stats-grid">
        <button className={tab === "create" ? "active" : ""} onClick={() => setTab("create")}>
          <span>Criar vaga</span>
          <strong>+</strong>
        </button>

        <button className={tab === "list" ? "active" : ""} onClick={() => setTab("list")}>
          <span>Minhas vagas</span>
          <strong>{jobs.length}</strong>
        </button>

        <button className={tab === "packages" ? "active" : ""} onClick={() => setTab("packages")}>
          <span>Créditos</span>
          <strong>{restantes}</strong>
        </button>
      </div>

      {tab === "packages" && (
        <div className="overview-stack">
          <div className="dash-card">
            <span className="card-label">Pacotes de vagas</span>
            <h3>Créditos disponíveis: {restantes}</h3>
            <p>Total comprado: {totalCreditos} • Usados: {usados}</p>

            <div className="booking-admin-actions">
             <button disabled={saving} onClick={() => setPaymentModal({
  type: "empresa_1_vaga",
  title: "Pacote com 1 vaga",
  description: "Você compra 1 crédito para publicar uma vaga no RendaJá.",
  amount: 9.9,
})}>
  1 vaga - R$ 9,90
</button>

             <button disabled={saving} onClick={() => setPaymentModal({
  type: "empresa_3_vagas",
  title: "Pacote com 3 vagas",
  description: "Você compra 3 créditos para publicar vagas no RendaJá.",
  amount: 24.9,
})}>
  3 vagas - R$ 24,90
</button>

<button disabled={saving} onClick={() => setPaymentModal({
  type: "empresa_10_vagas",
  title: "Pacote com 10 vagas",
  description: "Você compra 10 créditos para publicar vagas no RendaJá.",
  amount: 79.9,
})}>
  10 vagas - R$ 79,90
</button>
            </div>
          </div>

          {payment?.qr_code && (
            <div className="dash-card">
              <span className="card-label">Pagamento Pix</span>
              <h3>Pix gerado</h3>

              {payment.checkout_url && (
                <p>
                  <a href={payment.checkout_url} target="_blank" rel="noreferrer">
                    Abrir link de pagamento
                  </a>
                </p>
              )}

              <textarea readOnly value={payment.qr_code} style={{ width: "100%", minHeight: 130 }} />

              <p className="dashboard-note">
                Após pagar, use o WhatsApp ou atualize o painel depois da confirmação.
              </p>
            </div>
          )}
        </div>
      )}

      {tab === "create" && (
        <div className="dash-card">
          <span className="card-label">Nova vaga</span>
          <h3>Publicar oportunidade</h3>

          {restantes <= 0 && (
            <div className="dashboard-note">
              Você não tem créditos de vaga. Compre um pacote na aba Créditos.
            </div>
          )}

          <div className="form-grid">
            <Field label="Área">
              <select
                value={form.area_chave}
                onChange={(e) => loadCategorias(e.target.value)}
              >
                <option value="">Selecione uma área</option>
                {areas.map((area) => (
                  <option key={area.chave} value={area.chave}>
                    {area.nome}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Função / Categoria">
              <select
                value={form.categoria_chave}
                onChange={(e) => setJobField("categoria_chave", e.target.value)}
              >
                <option value="">Selecione uma função</option>
                {categorias.map((cat) => (
                  <option key={cat.chave} value={cat.chave}>
                    {cat.nome}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Título da vaga">
              <input
                value={form.titulo}
                onChange={(e) => setJobField("titulo", e.target.value)}
                placeholder="Ex: Vendedor interno"
              />
            </Field>

            <Field label="Tipo de contratação">
              <select
                value={form.tipo_contratacao}
                onChange={(e) => setJobField("tipo_contratacao", e.target.value)}
              >
                <option value="clt">CLT</option>
                <option value="diaria">Diária</option>
                <option value="freelance">Freelance</option>
                <option value="mei">MEI</option>
                <option value="meio_periodo">Meio período</option>
                <option value="comissao">Comissão</option>
                <option value="a_combinar">A combinar</option>
              </select>
            </Field>

            <Field label="Salário">
              <input
                value={form.salario}
                onChange={(e) => setJobField("salario", e.target.value)}
                placeholder="Ex: 1600 + comissão"
              />
            </Field>

            <Field label="Jornada">
              <input
                value={form.jornada}
                onChange={(e) => setJobField("jornada", e.target.value)}
                placeholder="Ex: Segunda a sábado"
              />
            </Field>

            <Field label="Quantidade de vagas">
              <input
                type="number"
                min="1"
                value={form.quantidade_vagas}
                onChange={(e) => setJobField("quantidade_vagas", e.target.value)}
              />
            </Field>

            <Field label="Descrição" full>
              <textarea
                value={form.descricao}
                onChange={(e) => setJobField("descricao", e.target.value)}
                placeholder="Descreva as atividades da vaga."
              />
            </Field>

            <Field label="Requisitos" full>
              <textarea
                value={form.requisitos}
                onChange={(e) => setJobField("requisitos", e.target.value)}
                placeholder="Ex: ensino médio, experiência, disponibilidade..."
              />
            </Field>
          </div>

          <ToggleField
            label="Publicar com destaque"
            value={form.destaque}
            onChange={(v) => setJobField("destaque", v)}
          />

          <div className="booking-admin-actions">
            <button type="button" disabled={saving} onClick={publicarVaga}>
              {saving ? "Publicando..." : "Publicar vaga"}
            </button>

            <button type="button" onClick={() => setTab("packages")}>
              Comprar pacote
            </button>
          </div>
        </div>
      )}

      {tab === "list" && (
        <div className="bookings-list">
          {jobs.length === 0 ? (
            <div className="coming-box">
              <strong>Nenhuma vaga publicada</strong>
              <p>Crie sua primeira vaga usando os créditos disponíveis.</p>
            </div>
          ) : (
            jobs.map((vaga) => (
              <div key={vaga.id} className="booking-admin-card">
                <div className="booking-admin-top">
                  <div>
                    <span className={`booking-status ${vaga.status || "pending"}`}>
                      {vaga.status || "ativa"}
                    </span>
                    <h3>{vaga.titulo}</h3>
                  </div>

                  <strong>{vaga.quantidade_vagas || 1} vaga(s)</strong>
                </div>

                <div className="booking-admin-info">
                  <span>{vaga.nome_empresa || "Empresa"}</span>
                  <span>
                    {vaga.cidade || "-"}
                    {vaga.estado ? `/${vaga.estado}` : ""}
                  </span>
                  <span>{vaga.salario || "A combinar"}</span>
                  <span>{tipoContratacaoLabel(vaga.tipo_contratacao)}</span>
                </div>

                <div className="booking-admin-actions">
                  <button type="button" className="danger-button" onClick={() => removerVaga(vaga.id)}>
                    Remover
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
      <PaymentModal
  open={!!paymentModal}
  title={paymentModal?.title}
  description={paymentModal?.description}
  amount={paymentModal?.amount}
  loading={saving}
  payment={payment}
  onClose={() => {
    setPaymentModal(null);
    setPayment(null);
  }}
  onConfirm={() => comprarPacote(paymentModal.type)}
/>
    </div>
  );
}

function MissionsPanel() {
  const [paymentModal, setPaymentModal] = useState(null);
  const [tab, setTab] = useState("create");
  const [loading, setLoading] = useState(true);
  const [missions, setMissions] = useState([]);
  const [selectedMission, setSelectedMission] = useState(null);
  const [interessados, setInteressados] = useState([]);
  const [saving, setSaving] = useState(false);
  const [payment, setPayment] = useState(null);

  const [form, setForm] = useState({
    tipo: "individual",
    titulo: "",
    descricao: "",
    valorModo: "fixo",
    valor: "",
    vagas_total: 1,
  });

  const user = getDashboardUser();

  useEffect(() => {
    loadMissionsPanel();
  }, []);

  async function loadMissionsPanel() {
    if (!user?.id) return;

    setLoading(true);

    const { data, error } = await supabase
      .from("missoes")
      .select("*")
      .eq("usuario_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao buscar missões:", error);
      setMissions([]);
    } else {
      setMissions(data || []);
    }

    setLoading(false);
  }

  function setMissionField(field, value) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
      ...(field === "tipo" && value === "individual" ? { vagas_total: 1 } : {}),
    }));
  }

  function inferCategoriaMissao(text = "") {
    const t = String(text).toLowerCase();

    if (t.includes("limp") || t.includes("faxina") || t.includes("lavar")) return "limpeza";
    if (t.includes("frete") || t.includes("mudan") || t.includes("transport")) return "frete";
    if (t.includes("pet") || t.includes("cachorro") || t.includes("passear")) return "passeio_pet";
    if (t.includes("jard")) return "jardinagem";
    if (t.includes("mont")) return "montagem";
    if (t.includes("entrega")) return "entrega";

    return "outros";
  }

  async function criarMissao() {
    if (!user?.id) {
      alert("Usuário não encontrado.");
      return;
    }

    if (!form.titulo || !form.descricao) {
      alert("Preencha título e descrição.");
      return;
    }

    const valorACombinar = form.valorModo === "combinar";
    const valorBase = valorACombinar ? 0 : Number(String(form.valor).replace(",", "."));
    const vagasTotal = form.tipo === "campanha" ? Number(form.vagas_total || 1) : 1;

    if (!valorACombinar && (!valorBase || valorBase <= 0)) {
      alert("Informe um valor válido ou marque a combinar.");
      return;
    }

    if (form.tipo === "campanha" && vagasTotal <= 0) {
      alert("Informe a quantidade de pessoas.");
      return;
    }

    const taxa = valorACombinar ? 9.9 : calcMissaoTaxaWeb(valorBase);
    const total = valorACombinar ? taxa : valorBase + taxa;
    const valorPorPessoa =
      form.tipo === "campanha" && vagasTotal > 0 ? valorBase / vagasTotal : valorBase;

    setSaving(true);
    setPayment(null);

    const { data: pagamento, error } = await supabase
      .from("pagamentos_plataforma")
      .insert({
        usuario_id: user.id,
        referencia_tipo: "missao_publicacao",
        plano_codigo: null,
        valor: total,
        status: "pendente",
        metadata: {
          titulo: form.titulo,
          descricao: form.descricao,
          tipo: form.tipo,
          vagas_total: vagasTotal,
          valor_total: valorBase,
          valor_por_pessoa: valorPorPessoa,
          valor_missao: valorACombinar ? 0 : valorBase,
          taxa_plataforma: taxa,
          urgencia: false,
          valor_a_combinar: valorACombinar,
          taxa_fixa_publicacao: valorACombinar ? 9.9 : null,
          categoria_chave: inferCategoriaMissao(`${form.titulo} ${form.descricao}`),
          cidade: user.cidade,
          estado: user.estado,
        },
      })
      .select()
      .single();

    if (error || !pagamento) {
      setSaving(false);
      console.error("Erro ao criar pagamento da missão:", error);
      alert("Erro ao gerar cobrança da missão.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/payments/create-intent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paymentId: pagamento.id,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Erro ao gerar Pix.");
      }

      setPayment(data.payment);

      alert("Cobrança Pix gerada. A missão será publicada após confirmação do pagamento.");

      setForm({
        tipo: "individual",
        titulo: "",
        descricao: "",
        valorModo: "fixo",
        valor: "",
        vagas_total: 1,
      });

      setTab("payment");
    } catch (err) {
      console.error("Erro Pix missão:", err);
      alert("Pedido criado, mas não consegui gerar o Pix.");
    } finally {
      setSaving(false);
    }
  }

  async function carregarInteressados(missao) {
    setSelectedMission(missao);

    const { data, error } = await supabase
      .from("missoes_interessados")
      .select(`
        *,
        usuarios (
          id,
          nome,
          telefone
        )
      `)
      .eq("missao_id", missao.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao buscar interessados:", error);
      setInteressados([]);
    } else {
      setInteressados(data || []);
    }

    setTab("details");
  }

  async function cancelarMissao(id) {
    const motivo = prompt("Informe o motivo do cancelamento:");
    if (!motivo || motivo.length < 3) return;

    const { error } = await supabase
      .from("missoes")
      .update({
        status: "cancelada",
        motivo_cancelamento: motivo,
        cancelada_em: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("usuario_id", user.id);

    if (error) {
      console.error("Erro ao cancelar missão:", error);
      alert("Erro ao cancelar missão.");
      return;
    }

    loadMissionsPanel();
  }

  return (
    <div className="dash-panel">
      <div className="bookings-panel-head">
        <PanelTitle
          title="Missões"
          text="Crie missões individuais ou campanhas e acompanhe interessados, execução e status."
        />

        <button type="button" onClick={loadMissionsPanel} disabled={loading}>
          {loading ? "Atualizando..." : "Atualizar"}
        </button>
      </div>

      <div className="booking-stats-grid">
        <button className={tab === "create" ? "active" : ""} onClick={() => setTab("create")}>
          <span>Criar missão</span>
          <strong>+</strong>
        </button>

        <button className={tab === "list" ? "active" : ""} onClick={() => setTab("list")}>
          <span>Minhas missões</span>
          <strong>{missions.length}</strong>
        </button>

        <button className={tab === "payment" ? "active" : ""} onClick={() => setTab("payment")}>
          <span>Pagamento</span>
          <strong>Pix</strong>
        </button>
      </div>

      {tab === "create" && (
        <div className="dash-card">
          <span className="card-label">Nova missão</span>
          <h3>Publicar missão</h3>

          <div className="form-grid">
            <Field label="Tipo da missão">
              <select
                value={form.tipo}
                onChange={(e) => setMissionField("tipo", e.target.value)}
              >
                <option value="individual">Para 1 pessoa</option>
                <option value="campanha">Para várias pessoas</option>
              </select>
            </Field>

            <Field label="Título">
              <input
                value={form.titulo}
                onChange={(e) => setMissionField("titulo", e.target.value)}
                placeholder="Ex: Divulgar meu vídeo"
              />
            </Field>

            <Field label="Descrição" full>
              <textarea
                value={form.descricao}
                onChange={(e) => setMissionField("descricao", e.target.value)}
                placeholder="Explique o que precisa ser feito."
              />
            </Field>

            <Field label="Valor">
              <select
                value={form.valorModo}
                onChange={(e) => setMissionField("valorModo", e.target.value)}
              >
                <option value="fixo">Valor fixo</option>
                <option value="combinar">A combinar</option>
              </select>
            </Field>

            {form.valorModo === "fixo" && (
              <Field label={form.tipo === "campanha" ? "Valor total da campanha" : "Valor da missão"}>
                <input
                  type="number"
                  value={form.valor}
                  onChange={(e) => setMissionField("valor", e.target.value)}
                  placeholder="Ex: 100"
                />
              </Field>
            )}

            {form.tipo === "campanha" && (
              <Field label="Quantidade de pessoas">
                <input
                  type="number"
                  min="1"
                  value={form.vagas_total}
                  onChange={(e) => setMissionField("vagas_total", e.target.value)}
                />
              </Field>
            )}
          </div>

          <div className="dashboard-note">
            Taxa:{" "}
            {form.valorModo === "combinar"
              ? money(9.9)
              : money(calcMissaoTaxaWeb(Number(form.valor || 0)))}{" "}
            {form.tipo === "campanha" && form.valor && form.vagas_total
              ? `• Por pessoa: ${money(Number(form.valor || 0) / Number(form.vagas_total || 1))}`
              : ""}
          </div>

          <div className="booking-admin-actions">
            <button
  type="button"
  disabled={saving}
  onClick={() => {
    const valorACombinar = form.valorModo === "combinar";
    const valorBase = valorACombinar ? 0 : Number(String(form.valor).replace(",", "."));
    const taxa = valorACombinar ? 9.9 : calcMissaoTaxaWeb(valorBase);
    const total = valorACombinar ? taxa : valorBase + taxa;

    setPaymentModal({
      title: "Publicação de missão",
      description:
        form.tipo === "campanha"
          ? "Você está criando uma campanha para várias pessoas. A missão será publicada após confirmação do Pix."
          : "Você está criando uma missão para uma pessoa. A missão será publicada após confirmação do Pix.",
      amount: total,
    });
  }}
>
  {saving ? "Gerando Pix..." : "Publicar missão"}
</button>
          </div>
        </div>
      )}

      {tab === "payment" && (
        <div className="dash-card">
          <span className="card-label">Pagamento Pix</span>
          <h3>{payment?.qr_code ? "Pix gerado" : "Nenhum Pix gerado ainda"}</h3>

          {payment?.checkout_url && (
            <p>
              <a href={payment.checkout_url} target="_blank" rel="noreferrer">
                Abrir link de pagamento
              </a>
            </p>
          )}

          {payment?.qr_code && (
            <textarea readOnly value={payment.qr_code} style={{ width: "100%", minHeight: 130 }} />
          )}

          <p className="dashboard-note">
            A missão será criada automaticamente quando o pagamento for aprovado pelo Mercado Pago.
          </p>
        </div>
      )}

      {tab === "list" && (
        <div className="bookings-list">
          {missions.length === 0 ? (
            <div className="coming-box">
              <strong>Nenhuma missão criada</strong>
              <p>Crie uma missão para encontrar pessoas disponíveis.</p>
            </div>
          ) : (
            missions.map((missao) => (
              <div key={missao.id} className="booking-admin-card">
                <div className="booking-admin-top">
                  <div>
                    <span className={`booking-status ${missao.status || "pending"}`}>
                      {statusMissaoLabel(missao.status)}
                    </span>
                    <h3>{missao.titulo}</h3>
                  </div>

                  <strong>
                    {missao.tipo === "campanha"
                      ? `${missao.vagas_ocupadas || 0}/${missao.vagas_total || 1}`
                      : money(missao.valor || missao.valor_por_pessoa || 0)}
                  </strong>
                </div>

                <div className="booking-admin-info">
                  <span>{missao.descricao}</span>
                  <span>
                    {missao.cidade || "-"}
                    {missao.estado ? `/${missao.estado}` : ""}
                  </span>
                  <span>Taxa: {money(missao.taxa_plataforma || 0)}</span>
                </div>

                <div className="booking-admin-actions">
                  <button type="button" onClick={() => carregarInteressados(missao)}>
                    Ver interessados
                  </button>

                  {missao.status !== "cancelada" && missao.status !== "concluida" && (
                    <button type="button" className="danger-button" onClick={() => cancelarMissao(missao.id)}>
                      Cancelar
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "details" && selectedMission && (
        <div className="overview-stack">
          <div className="dash-card">
            <span className="card-label">Detalhes da missão</span>
            <h3>{selectedMission.titulo}</h3>
            <p>{selectedMission.descricao}</p>
            <p>Status: {statusMissaoLabel(selectedMission.status)}</p>
          </div>

          <div className="bookings-list">
            {interessados.length === 0 ? (
              <div className="coming-box">
                <strong>Nenhum interessado ainda</strong>
              </div>
            ) : (
              interessados.map((item) => (
                <div key={item.id} className="booking-admin-card">
                  <div className="booking-admin-top">
                    <div>
                      <span className={`booking-status ${item.status || "pending"}`}>
                        {item.status}
                      </span>
                      <h3>{item.usuarios?.nome || "Usuário"}</h3>
                    </div>
                  </div>

                  <div className="booking-admin-info">
                    {item.usuarios?.telefone && (
                      <a
                        href={`https://wa.me/${item.usuarios.telefone}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        WhatsApp: {item.usuarios.telefone}
                      </a>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
      <PaymentModal
  open={!!paymentModal}
  title={paymentModal?.title}
  description={paymentModal?.description}
  amount={paymentModal?.amount}
  loading={saving}
  payment={payment}
  onClose={() => {
    setPaymentModal(null);
    setPayment(null);
  }}
  onConfirm={criarMissao}
/>
    </div>
  );
}
function FeaturePanel({ title, text, button }) {
  return (
    <div className="dash-panel feature-panel">
      <PanelTitle title={title} text={text} />

      <div className="coming-box">
        <strong>Próximo passo</strong>
        <p>
          Vamos ligar essa tela nas tabelas e rotas que já existem no seu sistema,
          reaproveitando o fluxo atual do WhatsApp.
        </p>
        <button>{button}</button>
      </div>
    </div>
  );
}