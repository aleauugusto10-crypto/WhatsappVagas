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
  if (digits.length <= 7) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }

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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          telefone: telefoneLimpo,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        alert(json.error || "Erro ao enviar código.");
        return;
      }

      setTelefoneNormalizado(normalizePhone(telefoneLimpo));
      setStep("code");
    } catch (err) {
      console.error(err);
      alert("Erro de conexão.");
    } finally {
      setLoading(false);
    }
  }

  async function validarCodigo() {
    try {
      setLoading(true);

      const phone =
        telefoneNormalizado || normalizePhone(telefone);

      const res = await fetch(`${API_URL}/auth/verify-code`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          telefone: phone,
          codigo,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        alert(json.error || "Código inválido.");
        return;
      }

      localStorage.setItem(
        "rendaja_token",
        json.token
      );

      localStorage.setItem(
        "rendaja_user",
        JSON.stringify(json.user)
      );

      router.push("/dashboard");
    } catch (err) {
      console.error(err);
      alert("Erro ao validar código.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <main className="login-page">
        <div className="login-glow login-glow-1" />
        <div className="login-glow login-glow-2" />

        <section className="login-shell">
          <aside className="login-visual">
            <div className="login-overlay" />

            <div className="login-brand">
              CompreTudo.shop
            </div>

            <div className="login-visual-content">
              <span className="login-kicker">
                Sua presença digital local
              </span>

              <h1>
                Acesse sua vitrine, pedidos e
                configurações em poucos segundos.
              </h1>

              <p>
                Entre com o WhatsApp cadastrado
                para administrar sua página,
                produtos e serviços.
              </p>

              <div className="login-mini-grid">
                <div className="login-mini-card">
                  <strong>🛍️ Vitrine</strong>
                  <span>
                    Página pública profissional
                  </span>
                </div>

                <div className="login-mini-card">
                  <strong>📲 WhatsApp</strong>
                  <span>
                    Login simples e rápido
                  </span>
                </div>
              </div>
            </div>
          </aside>

          <section className="login-card">
            <div className="login-badge">
              Painel da vitrine
            </div>

            <h2>
              {step === "phone"
                ? "Entrar no painel"
                : "Confirme seu acesso"}
            </h2>

            <p className="login-description">
              {step === "phone"
                ? "Use o WhatsApp cadastrado na sua vitrine."
                : "Digite o código enviado no WhatsApp."}
            </p>

            {step === "phone" && (
              <>
                <label>Número do WhatsApp</label>

                <input
                  type="tel"
                  placeholder="(79) 99999-9999"
                  value={telefone}
                  onChange={(e) =>
                    setTelefone(
                      maskPhoneBR(e.target.value)
                    )
                  }
                />

                <button
                  onClick={pedirCodigo}
                  disabled={loading}
                >
                  {loading
                    ? "Enviando..."
                    : "Receber código"}
                </button>
              </>
            )}

            {step === "code" && (
              <>
                <label>Código</label>

                <input
                  type="text"
                  placeholder="Digite o código"
                  value={codigo}
                  onChange={(e) =>
                    setCodigo(e.target.value)
                  }
                />

                <button
                  onClick={validarCodigo}
                  disabled={loading}
                >
                  {loading
                    ? "Validando..."
                    : "Entrar"}
                </button>

                <button
                  className="secondary-btn"
                  onClick={() => {
                    setStep("phone");
                    setCodigo("");
                  }}
                >
                  Trocar número
                </button>
              </>
            )}

            <div className="login-divider">
              <span />
              <small>ou</small>
              <span />
            </div>

            <button
              className="create-btn"
              onClick={() =>
                router.push(
                  "/p/compretudo-shop-itabaiana-se#criar-vitrine"
                )
              }
            >
              Criar minha vitrine
            </button>
          </section>
        </section>
      </main>

      <style jsx>{`
        .login-page {
          min-height: 100vh;
          position: relative;
          overflow-x: hidden;
          background:
            radial-gradient(
              circle at top left,
              #2b174d 0%,
              #07111f 42%,
              #030712 100%
            );
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }

        .login-glow {
          position: absolute;
          border-radius: 999px;
          filter: blur(100px);
        }

        .login-glow-1 {
          width: 420px;
          height: 420px;
          background: rgba(217,168,78,.25);
          top: -100px;
          left: -100px;
        }

        .login-glow-2 {
          width: 520px;
          height: 520px;
          background: rgba(99,102,241,.22);
          right: -180px;
          bottom: -180px;
        }

        .login-shell {
          width: 100%;
          max-width: 1050px;
          display: grid;
          grid-template-columns: 1.1fr .9fr;
          border-radius: 34px;
          overflow: hidden;
          background: rgba(255,255,255,.08);
          border: 1px solid rgba(255,255,255,.12);
          backdrop-filter: blur(18px);
          box-shadow: 0 40px 120px rgba(0,0,0,.45);
          position: relative;
          z-index: 2;
        }

        .login-visual {
          position: relative;
          min-height: 640px;
          padding: 42px;
          display: flex;
          align-items: flex-end;
          background-image:
            url("https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?q=80&w=1600&auto=format&fit=crop");
          background-size: cover;
          background-position: center;
        }

        .login-overlay {
          position: absolute;
          inset: 0;
          background:
            linear-gradient(
              135deg,
              rgba(7,17,31,.94),
              rgba(7,17,31,.65),
              rgba(217,168,78,.25)
            );
        }

        .login-brand {
          position: absolute;
          top: 24px;
          left: 24px;
          z-index: 2;
          padding: 10px 14px;
          border-radius: 999px;
          background: rgba(255,255,255,.14);
          color: #fff;
          font-weight: 900;
        }

        .login-visual-content {
          position: relative;
          z-index: 2;
          color: white;
        }

        .login-kicker {
          display: inline-flex;
          padding: 8px 14px;
          border-radius: 999px;
          background: rgba(217,168,78,.18);
          color: #f5d28b;
          font-weight: 900;
          margin-bottom: 18px;
        }

        .login-visual-content h1 {
          font-size: 54px;
          line-height: .95;
          letter-spacing: -.06em;
          margin: 0;
        }

        .login-visual-content p {
          margin-top: 18px;
          color: rgba(255,255,255,.78);
          line-height: 1.7;
        }

        .login-mini-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-top: 28px;
        }

        .login-mini-card {
          padding: 16px;
          border-radius: 20px;
          background: rgba(255,255,255,.12);
          border: 1px solid rgba(255,255,255,.14);
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .login-card {
          background: rgba(255,255,255,.97);
          padding: 42px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .login-badge {
          width: fit-content;
          padding: 8px 12px;
          border-radius: 999px;
          background: #f5d28b;
          color: #111827;
          font-weight: 900;
          margin-bottom: 18px;
        }

        .login-card h2 {
          margin: 0;
          font-size: 40px;
          line-height: 1;
          letter-spacing: -.05em;
          color: #07111f;
        }

        .login-description {
          margin: 16px 0 28px;
          color: #64748b;
          line-height: 1.6;
        }

        .login-card label {
          margin-bottom: 8px;
          font-size: 14px;
          font-weight: 800;
          color: #07111f;
        }

        .login-card input {
          width: 100%;
          height: 56px;
          border-radius: 16px;
          border: 1px solid #dbe3ef;
          padding: 0 16px;
          margin-bottom: 16px;
          font-size: 16px;
          outline: none;
          box-sizing: border-box;
        }

        .login-card input:focus {
          border-color: #d9a84e;
          box-shadow: 0 0 0 4px rgba(217,168,78,.18);
        }

        .login-card button {
          width: 100%;
          min-height: 56px;
          border: 0;
          border-radius: 16px;
          background: #07111f;
          color: white;
          font-weight: 900;
          cursor: pointer;
          font-size: 15px;
        }

        .secondary-btn {
          margin-top: 12px;
          background: transparent !important;
          color: #07111f !important;
        }

        .login-divider {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          gap: 12px;
          align-items: center;
          margin: 24px 0;
          color: #94a3b8;
        }

        .login-divider span {
          height: 1px;
          background: #dbe3ef;
        }

        .create-btn {
          background:
            linear-gradient(
              135deg,
              #f5d28b,
              #d9a84e
            ) !important;
          color: #111827 !important;
        }

        @media (max-width: 768px) {
          .login-page {
            display: block;
            padding: 0;
          }

          .login-shell {
            display: flex;
            flex-direction: column;
            border-radius: 0;
            min-height: 100vh;
          }

          .login-visual {
            min-height: auto;
            padding: 90px 22px 34px;
            align-items: flex-start;
          }

          .login-visual-content h1 {
            font-size: 34px;
            line-height: 1.02;
          }

          .login-mini-grid {
            display: none;
          }

          .login-card {
            margin: -18px 16px 24px;
            border-radius: 28px;
            padding: 26px 22px;
            position: relative;
            z-index: 3;
            box-shadow:
              0 24px 70px rgba(0,0,0,.28);
          }

          .login-card h2 {
            font-size: 32px;
          }

          .login-card input {
            height: 58px;
            font-size: 16px;
          }

          .login-card button {
            min-height: 58px;
          }
        }
      `}</style>
    </>
  );
}