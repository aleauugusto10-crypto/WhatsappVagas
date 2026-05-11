import { useState } from "react";
import { useRouter } from "next/router";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://whatsappvagas.onrender.com";

function normalizePhone(value = "") {
  const digits = String(value).replace(/\D/g, "");

  if (!digits) return "";

  if (digits.startsWith("55") && digits.length >= 12) {
    return digits;
  }

  return `55${digits}`;
}

function maskPhoneBR(value = "") {
  const digits = String(value).replace(/\D/g, "").slice(0, 11);

  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;

  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export default function Login() {
  const router = useRouter();

  const [step, setStep] = useState("phone");
  const [telefone, setTelefone] = useState("");
  const [telefoneNormalizado, setTelefoneNormalizado] = useState("");
  const [codigo, setCodigo] = useState("");
  const [loading, setLoading] = useState(false);

  async function pedirCodigo() {
    try {
      setLoading(true);

      const telefoneLimpo = telefone.replace(/\D/g, "");

      const res = await fetch(`${API_URL}/auth/request-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telefone: telefoneLimpo }),
      });

      const json = await res.json();

      if (!res.ok) {
        alert(json.error || "Erro ao enviar código.");
        return;
      }

      setTelefoneNormalizado(normalizePhone(telefoneLimpo));
      setStep("code");
    } catch (err) {
      console.error("ERRO DE CONEXÃO:", err);
      alert("Erro de conexão ao enviar o código.");
    } finally {
      setLoading(false);
    }
  }

  async function validarCodigo() {
    const phone = telefoneNormalizado || normalizePhone(telefone);

    if (!codigo.trim()) {
      alert("Digite o código recebido no WhatsApp.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/verify-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telefone: phone, codigo: codigo.trim() }),
      });

      const json = await res.json();

      if (!res.ok) {
        alert(json.error || "Código inválido.");
        return;
      }

      localStorage.setItem("rendaja_token", json.token);
      localStorage.setItem("rendaja_user", JSON.stringify(json.user));

      router.push("/dashboard");
    } catch (err) {
      console.error("Erro ao validar código:", err);
      alert("Erro de conexão ao validar o código.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={styles.page}>
      <div style={styles.bgGlowOne} />
      <div style={styles.bgGlowTwo} />

      <section style={styles.shell}>
        <aside style={styles.visual}>
          <div style={styles.visualOverlay} />

          <div style={styles.brandPill}>CompreTudo.shop</div>

          <div style={styles.visualContent}>
            <span style={styles.visualKicker}>Sua presença digital local</span>

            <h2 style={styles.visualTitle}>
              Acesse sua vitrine, pedidos e configurações em poucos segundos.
            </h2>

            <p style={styles.visualText}>
              Entre com o WhatsApp cadastrado para administrar sua página
              profissional, produtos, serviços e informações públicas.
            </p>

            <div style={styles.visualCards}>
              <div style={styles.miniCard}>
                <strong>🛍️ Vitrine</strong>
                <span>Página pública profissional</span>
              </div>

              <div style={styles.miniCard}>
                <strong>📲 WhatsApp</strong>
                <span>Acesso simples por código</span>
              </div>
            </div>
          </div>
        </aside>

        <section style={styles.card}>
          <div style={styles.mobileBrand}>CompreTudo.shop</div>

          <div style={styles.badge}>Painel da vitrine</div>

          <h1 style={styles.title}>
            {step === "phone" ? "Entrar no painel" : "Confirme seu acesso"}
          </h1>

          <p style={styles.text}>
            {step === "phone"
              ? "Use o WhatsApp cadastrado na sua vitrine CompreTudo.shop para acessar o painel."
              : "Enviamos um código para seu WhatsApp. Digite abaixo para continuar."}
          </p>

          {step === "phone" && (
            <>
              <label style={styles.label}>Número do WhatsApp</label>

              <input
                style={styles.input}
                placeholder="Ex: (79) 99999-9999"
                value={telefone}
                onChange={(e) => setTelefone(maskPhoneBR(e.target.value))}
              />

              <button style={styles.button} onClick={pedirCodigo} disabled={loading}>
                {loading ? "Enviando código..." : "Receber código"}
              </button>
            </>
          )}

          {step === "code" && (
            <>
              <label style={styles.label}>Código recebido no WhatsApp</label>

              <input
                style={styles.input}
                placeholder="Digite o código"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
              />

              <button style={styles.button} onClick={validarCodigo} disabled={loading}>
                {loading ? "Validando..." : "Entrar no painel"}
              </button>

              <button
                style={styles.linkButton}
                onClick={() => {
                  setStep("phone");
                  setCodigo("");
                }}
              >
                Trocar número
              </button>
            </>
          )}

          <div style={styles.divider}>
            <span />
            <small>ou</small>
            <span />
          </div>

          <button
            type="button"
            style={styles.createButton}
            onClick={() => router.push("/p/compretudo-shop-itabaiana-se#criar-vitrine")}
          >
            Criar minha vitrine
          </button>

          <p style={styles.helper}>
            Ainda não tem uma página? Crie sua vitrine profissional e comece a
            divulgar seu negócio.
          </p>
        </section>
      </section>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    position: "relative",
    overflow: "hidden",
    background:
      "radial-gradient(circle at top left, #2b174d 0%, #07111f 42%, #030712 100%)",
    display: "grid",
    placeItems: "center",
    padding: 24,
    fontFamily:
      "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
  },

  bgGlowOne: {
    position: "absolute",
    width: 420,
    height: 420,
    borderRadius: "999px",
    background: "rgba(217, 168, 78, 0.24)",
    filter: "blur(90px)",
    top: -120,
    left: -120,
  },

  bgGlowTwo: {
    position: "absolute",
    width: 520,
    height: 520,
    borderRadius: "999px",
    background: "rgba(99, 102, 241, 0.25)",
    filter: "blur(110px)",
    right: -160,
    bottom: -180,
  },

  shell: {
    position: "relative",
    zIndex: 2,
    width: "100%",
    maxWidth: 980,
    display: "grid",
    gridTemplateColumns: "1.1fr 0.9fr",
    borderRadius: 34,
    overflow: "hidden",
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.16)",
    boxShadow: "0 40px 120px rgba(0,0,0,.45)",
    backdropFilter: "blur(20px)",
  },

  visual: {
    minHeight: 580,
    position: "relative",
    padding: 34,
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    backgroundImage:
      "url('https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?q=80&w=1600&auto=format&fit=crop')",
    backgroundSize: "cover",
    backgroundPosition: "center",
  },

  visualOverlay: {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(135deg, rgba(7,17,31,.92), rgba(7,17,31,.58), rgba(217,168,78,.22))",
  },

  brandPill: {
    position: "relative",
    zIndex: 2,
    width: "fit-content",
    padding: "10px 14px",
    borderRadius: 999,
    background: "rgba(255,255,255,.13)",
    border: "1px solid rgba(255,255,255,.22)",
    color: "#fff",
    fontWeight: 900,
    letterSpacing: ".02em",
  },

  visualContent: {
    position: "relative",
    zIndex: 2,
    color: "#fff",
  },

  visualKicker: {
    display: "inline-flex",
    padding: "8px 12px",
    borderRadius: 999,
    background: "rgba(217,168,78,.18)",
    color: "#f5d28b",
    fontSize: 13,
    fontWeight: 900,
    marginBottom: 18,
  },

  visualTitle: {
    margin: 0,
    maxWidth: 520,
    fontSize: 44,
    lineHeight: 1.03,
    letterSpacing: "-.05em",
  },

  visualText: {
    maxWidth: 460,
    color: "rgba(255,255,255,.78)",
    lineHeight: 1.7,
    fontSize: 15,
    marginTop: 18,
  },

  visualCards: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
    marginTop: 26,
  },

  miniCard: {
    padding: 16,
    borderRadius: 20,
    background: "rgba(255,255,255,.12)",
    border: "1px solid rgba(255,255,255,.14)",
  },

  card: {
    background: "rgba(255,255,255,.96)",
    padding: 38,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
  },

  mobileBrand: {
    display: "none",
    marginBottom: 18,
    fontWeight: 950,
    color: "#07111f",
  },

  badge: {
    display: "inline-block",
    width: "fit-content",
    background: "#f5d28b",
    color: "#06111d",
    padding: "8px 12px",
    borderRadius: 999,
    fontWeight: 950,
    marginBottom: 18,
    fontSize: 13,
  },

  title: {
    margin: "0 0 10px",
    fontSize: 36,
    lineHeight: 1.05,
    letterSpacing: "-.04em",
    color: "#07111f",
  },

  text: {
    color: "#64748b",
    lineHeight: 1.6,
    marginBottom: 26,
    fontSize: 15,
  },

  label: {
    display: "block",
    color: "#07111f",
    fontWeight: 900,
    marginBottom: 8,
    fontSize: 14,
  },

  input: {
    width: "100%",
    padding: "16px 16px",
    borderRadius: 16,
    border: "1px solid #dbe3ef",
    marginBottom: 16,
    fontSize: 16,
    outline: "none",
    background: "#ffffff",
    color: "#07111f",
    boxSizing: "border-box",
  },

  button: {
    width: "100%",
    padding: "16px",
    borderRadius: 16,
    border: 0,
    background: "#07111f",
    color: "#fff",
    fontWeight: 950,
    cursor: "pointer",
    boxShadow: "0 16px 34px rgba(7,17,31,.22)",
  },

  linkButton: {
    width: "100%",
    marginTop: 12,
    border: 0,
    background: "transparent",
    color: "#07111f",
    fontWeight: 900,
    cursor: "pointer",
  },

  divider: {
    display: "grid",
    gridTemplateColumns: "1fr auto 1fr",
    alignItems: "center",
    gap: 12,
    margin: "24px 0 16px",
    color: "#94a3b8",
  },

  createButton: {
    width: "100%",
    padding: "15px",
    borderRadius: 16,
    border: "1px solid #d9a84e",
    background: "#fff7e6",
    color: "#07111f",
    fontWeight: 950,
    cursor: "pointer",
  },

  helper: {
    textAlign: "center",
    color: "#64748b",
    fontSize: 13,
    lineHeight: 1.5,
    marginTop: 14,
  },
};