import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../../src/lib/supabase";

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

  font_heading: "Georgia",
  font_body: "Inter",

  hero_kicker: "Atendimento profissional com excelência",
  hero_title: "",
  hero_subtitle: "",
  about_title: "Sobre meu trabalho",
  about_text: "",
  cta_title: "Pronto para contratar com confiança?",
  cta_text: "Fale comigo agora pelo WhatsApp e solicite seu orçamento.",
};

const MENU = [
  { id: "overview", label: "Visão geral", icon: "🏠" },
  { id: "page", label: "Página", icon: "🌐" },
  { id: "visual", label: "Visual", icon: "🎨" },
  { id: "media", label: "Imagens", icon: "🖼️" },
  { id: "jobs", label: "Vagas", icon: "💼" },
  { id: "missions", label: "Missões", icon: "🎯" },
  { id: "professionals", label: "Profissionais", icon: "🔎" },
  { id: "settings", label: "Configurações", icon: "⚙️" },
];

export default function Dashboard() {
  const router = useRouter();
  const [active, setActive] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [profile, setProfile] = useState(DEFAULT_PROFILE);

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
    }

    setLoading(false);
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
      console.error("Erro ao salvar página:", error);
      alert("Erro ao salvar página.");
      return;
    }

    setProfile(payload);
    alert("Página salva com sucesso!");
  }

  async function uploadImage(event, field) {
    const file = event.target.files?.[0];
    if (!file) return;

    const savedUser = localStorage.getItem("rendaja_user");
const user = savedUser ? JSON.parse(savedUser) : null;

    if (!user) {
      alert("Você precisa estar logado.");
      return;
    }

    const ext = file.name.split(".").pop();
    const fileName = `${field}-${Date.now()}.${ext}`;
    const path = `${user.id}/${fileName}`;

    const { error } = await supabase.storage
      .from("profile-pages")
      .upload(path, file, {
        cacheControl: "3600",
        upsert: true,
      });

    if (error) {
      console.error("Erro no upload:", error);
      alert("Erro ao enviar imagem.");
      return;
    }

    const { data } = supabase.storage.from("profile-pages").getPublicUrl(path);

    setField(field, data.publicUrl);
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

          {publicUrl && (
            <a className="visit-button" href={publicUrl} target="_blank" rel="noreferrer">
              Visitar site
            </a>
          )}
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
            {publicUrl ? <span className="page-url">{publicUrl}</span> : null}
            <button onClick={saveProfile} disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </header>

        {active === "overview" && (
          <div className="dashboard-grid">
            <div className="dash-card large">
              <span className="card-label">Resumo</span>
              <h2>Configure sua presença profissional</h2>
              <p>
                Complete os dados básicos, envie imagens, ajuste as cores e publique uma
                página pronta para vender seus serviços.
              </p>

              <div className="quick-stats">
                <div>
                  <strong>{profile.slug ? "Ativo" : "Pendente"}</strong>
                  <span>Status da página</span>
                </div>
                <div>
                  <strong>{profile.cidade || "Não definida"}</strong>
                  <span>Cidade</span>
                </div>
                <div>
                  <strong>{profile.whatsapp ? "Configurado" : "Pendente"}</strong>
                  <span>WhatsApp</span>
                </div>
              </div>
            </div>

            <div className="dash-card preview-card">
              <span className="card-label">Prévia rápida</span>
              <div
                className="mini-preview"
                style={{
                  background: profile.secondary_color,
                  color: "#fff",
                }}
              >
                {profile.hero_image_url && <img src={profile.hero_image_url} alt="" />}
                <div>
                  <small style={{ color: profile.primary_color }}>
                    {profile.hero_kicker}
                  </small>
                  <h3>{profile.hero_title || profile.servico || "Seu serviço"}</h3>
                  <p>{profile.hero_subtitle || "Sua chamada principal aparecerá aqui."}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {active === "page" && (
          <div className="dash-panel">
            <PanelTitle
              title="Dados da página"
              text="Essas informações alimentam a página pública do profissional."
            />

            <div className="form-grid">
              <Field label="Slug da página">
                <input
                  value={profile.slug}
                  onChange={(e) => setField("slug", normalizeSlug(e.target.value))}
                  placeholder="ex: joao-pintor"
                />
              </Field>

              <Field label="Nome profissional">
                <input
                  value={profile.nome}
                  onChange={(e) => setField("nome", e.target.value)}
                  placeholder="Nome ou marca"
                />
              </Field>

              <Field label="Serviço principal">
                <input
                  value={profile.servico}
                  onChange={(e) => setField("servico", e.target.value)}
                  placeholder="Ex: Pintor residencial"
                />
              </Field>

              <Field label="Cidade">
                <input
                  value={profile.cidade}
                  onChange={(e) => setField("cidade", e.target.value)}
                  placeholder="Ex: Itabaiana"
                />
              </Field>

              <Field label="Estado">
                <input
                  value={profile.estado}
                  onChange={(e) => setField("estado", e.target.value)}
                  placeholder="Ex: SE"
                />
              </Field>

              <Field label="WhatsApp">
                <input
                  value={profile.whatsapp}
                  onChange={(e) => setField("whatsapp", e.target.value)}
                  placeholder="557999999999"
                />
              </Field>

              <Field label="Descrição" full>
                <textarea
                  value={profile.descricao}
                  onChange={(e) => setField("descricao", e.target.value)}
                  placeholder="Fale sobre seu trabalho, experiência e diferenciais."
                />
              </Field>
            </div>
          </div>
        )}

        {active === "visual" && (
          <div className="dash-panel">
            <PanelTitle
              title="Identidade visual"
              text="Defina cores, estilo e tipografia da página."
            />

            <div className="form-grid">
              <ColorField label="Cor principal" value={profile.primary_color} onChange={(v) => setField("primary_color", v)} />
              <ColorField label="Cor secundária" value={profile.secondary_color} onChange={(v) => setField("secondary_color", v)} />
              <ColorField label="Cor de destaque" value={profile.accent_color} onChange={(v) => setField("accent_color", v)} />
              <ColorField label="Fundo" value={profile.background_color} onChange={(v) => setField("background_color", v)} />
              <ColorField label="Texto" value={profile.text_color} onChange={(v) => setField("text_color", v)} />

              <Field label="Fonte dos títulos">
                <select
                  value={profile.font_heading}
                  onChange={(e) => setField("font_heading", e.target.value)}
                >
                  <option value="Georgia">Georgia</option>
                  <option value="Inter">Inter</option>
                  <option value="Arial">Arial</option>
                  <option value="Poppins">Poppins</option>
                </select>
              </Field>

              <Field label="Fonte do corpo">
                <select
                  value={profile.font_body}
                  onChange={(e) => setField("font_body", e.target.value)}
                >
                  <option value="Inter">Inter</option>
                  <option value="Arial">Arial</option>
                  <option value="Roboto">Roboto</option>
                  <option value="Poppins">Poppins</option>
                </select>
              </Field>
            </div>
          </div>
        )}

        {active === "media" && (
          <div className="dash-panel">
            <PanelTitle
              title="Imagens da página"
              text="Envie as imagens por upload. Nada de URL manual."
            />

            <div className="upload-grid">
              <UploadBox
                title="Logomarca"
                image={profile.logo_url}
                onChange={(e) => uploadImage(e, "logo_url")}
              />

              <UploadBox
                title="Imagem principal do Hero"
                image={profile.hero_image_url}
                onChange={(e) => uploadImage(e, "hero_image_url")}
              />

              <UploadBox
                title="Imagem sobre o profissional"
                image={profile.about_image_url}
                onChange={(e) => uploadImage(e, "about_image_url")}
              />
            </div>
          </div>
        )}

        {active === "jobs" && (
          <FeaturePanel
            title="Divulgar vaga"
            text="Aqui vamos conectar o Dashboard com o mesmo fluxo de vagas que já existe no WhatsApp."
            button="Criar vaga"
          />
        )}

        {active === "missions" && (
          <FeaturePanel
            title="Criar missão"
            text="Aqui vamos usar o mesmo sistema de missões do WhatsApp, só que com formulário visual."
            button="Criar missão"
          />
        )}

        {active === "professionals" && (
          <FeaturePanel
            title="Buscar profissionais"
            text="Aqui o usuário poderá buscar profissionais por cidade, categoria e subcategoria."
            button="Buscar agora"
          />
        )}

        {active === "settings" && (
          <div className="dash-panel">
            <PanelTitle
              title="Textos principais"
              text="Esses textos também poderão ser editados direto na Home quando o usuário estiver logado como administrador."
            />

            <div className="form-grid">
              <Field label="Frase pequena do Hero" full>
                <input
                  value={profile.hero_kicker}
                  onChange={(e) => setField("hero_kicker", e.target.value)}
                />
              </Field>

              <Field label="Título principal" full>
                <input
                  value={profile.hero_title}
                  onChange={(e) => setField("hero_title", e.target.value)}
                  placeholder="Ex: Pintura profissional em Itabaiana"
                />
              </Field>

              <Field label="Subtítulo do Hero" full>
                <textarea
                  value={profile.hero_subtitle}
                  onChange={(e) => setField("hero_subtitle", e.target.value)}
                />
              </Field>

              <Field label="Título do sobre" full>
                <input
                  value={profile.about_title}
                  onChange={(e) => setField("about_title", e.target.value)}
                />
              </Field>

              <Field label="Texto do sobre" full>
                <textarea
                  value={profile.about_text}
                  onChange={(e) => setField("about_text", e.target.value)}
                />
              </Field>

              <Field label="Título CTA final" full>
                <input
                  value={profile.cta_title}
                  onChange={(e) => setField("cta_title", e.target.value)}
                />
              </Field>

              <Field label="Texto CTA final" full>
                <textarea
                  value={profile.cta_text}
                  onChange={(e) => setField("cta_text", e.target.value)}
                />
              </Field>
            </div>
          </div>
        )}
      </section>
    </main>
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