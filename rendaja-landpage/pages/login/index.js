import { useState } from "react";
import { useRouter } from "next/router";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://whatsappvagas.onrender.com";

const WHATSAPP_LOGIN_NUMBER =
  process.env.NEXT_PUBLIC_WHATSAPP_LOGIN_NUMBER || "5579999033717";

function normalizePhone(value = "") {
  const digits = String(value).replace(/\D/g, "");

  if (!digits) return "";

  if (digits.startsWith("55") && digits.length >= 12) {
    return digits;
  }

  return `55${digits}`;
}

function buildWhatsAppLoginUrl(phone) {
  const message =
    `Olá! Vim buscar meu código de login do CompreTudo.shop. ` +
    `Meu número é ${phone}.`;

  return `https://wa.me/${WHATSAPP_LOGIN_NUMBER}?text=${encodeURIComponent(
    message
  )}`;
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
  const [showWhatsappModal, setShowWhatsappModal] = useState(false);

  async function pedirCodigo() {
    try {
      setLoading(true);

      const telefoneLimpo = telefone.replace(/\D/g, "");

      if (!telefoneLimpo || telefoneLimpo.length < 10) {
        alert("Digite um número de WhatsApp válido.");
        return;
      }

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

      const phone = normalizePhone(telefoneLimpo);

      setTelefoneNormalizado(phone);
      setStep("code");
      setShowWhatsappModal(true);
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

      const phone = telefoneNormalizado || normalizePhone(telefone);

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

      localStorage.setItem("rendaja_token", json.token);
      localStorage.setItem("rendaja_user", JSON.stringify(json.user));

      router.push("/dashboard");
    } catch (err) {
      console.error(err);
      alert("Erro ao validar código.");
    } finally {
      setLoading(false);
    }
  }

  function abrirWhatsappLogin() {
    const phone = telefoneNormalizado || normalizePhone(telefone);

    if (!phone) {
      alert("Digite seu WhatsApp primeiro.");
      return;
    }

    window.open(buildWhatsAppLoginUrl(phone), "_blank", "noopener,noreferrer");
  }

  return (
    <>
      <main className="login-page">
        <div className="login-glow login-glow-1" />
        <div className="login-glow login-glow-2" />

        <section className="login-shell">
          <aside className="login-visual">
            <div className="login-overlay" />

            <div className="login-brand">CompreTudo.shop</div>

            <div className="login-visual-content">
              <span className="login-kicker">Sua presença digital local</span>

              <h1>Acesse sua vitrine, pedidos e configurações em poucos segundos.</h1>

              <p>
                Entre com o WhatsApp cadastrado para administrar sua página,
                produtos e serviços.
              </p>

              <div className="login-mini-grid">
                <div className="login-mini-card">
                  <strong>🛍️ Vitrine</strong>
                  <span>Página pública profissional</span>
                </div>

                <div className="login-mini-card">
                  <strong>📲 WhatsApp</strong>
                  <span>Login simples e rápido</span>
                </div>
              </div>
            </div>
          </aside>

          <section className="login-card">
            <div className="login-badge">Painel da vitrine</div>

            <h2>{step === "phone" ? "Entrar no painel" : "Confirme seu acesso"}</h2>

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
                  onChange={(e) => setTelefone(maskPhoneBR(e.target.value))}
                />

                <button onClick={pedirCodigo} disabled={loading}>
                  {loading ? "Enviando..." : "Receber código"}
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
                  onChange={(e) => setCodigo(e.target.value)}
                />

                <button onClick={validarCodigo} disabled={loading}>
                  {loading ? "Validando..." : "Entrar"}
                </button>

                <button
                  className="secondary-btn"
                  onClick={() => {
                    setStep("phone");
                    setCodigo("");
                    setShowWhatsappModal(false);
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
                router.push("/p/compretudo-shop-itabaiana-se#criar-vitrine")
              }
            >
              Criar minha vitrine
            </button>
          </section>
        </section>

        {showWhatsappModal && (
          <div className="whatsapp-modal-backdrop">
            <div className="whatsapp-modal">
              <button
                className="modal-close"
                onClick={() => setShowWhatsappModal(false)}
                aria-label="Fechar"
              >
                ×
              </button>

              <div className="whatsapp-icon">📲</div>

              <h3>Código solicitado</h3>

              <p>
                Se o código não chegar automaticamente no seu WhatsApp, abra
                nossa conversa e envie a mensagem pronta para buscar seu acesso.
              </p>

              <div className="modal-info">
                Seu número: <strong>{telefoneNormalizado}</strong>
              </div>

              <button className="whatsapp-open-btn" onClick={abrirWhatsappLogin}>
                Abrir conversa no WhatsApp
              </button>

              <button
                className="modal-secondary-btn"
                onClick={() => setShowWhatsappModal(false)}
              >
                Já recebi o código
              </button>
            </div>
          </div>
        )}
      </main>

      <style jsx>{`
        .login-page {
          min-height: 100vh;
          position: relative;
          overflow-x: hidden;
          background: radial-gradient(
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
          background: rgba(217, 168, 78, 0.25);
          top: -100px;
          left: -100px;
        }

        .login-glow-2 {
          width: 520px;
          height: 520px;
          background: rgba(99, 102, 241, 0.22);
          right: -180px;
          bottom: -180px;
        }

        .login-shell {
          width: 100%;
          max-width: 1050px;
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          border-radius: 34px;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.12);
          backdrop-filter: blur(18px);
          box-shadow: 0 40px 120px rgba(0, 0, 0, 0.45);
          position: relative;
          z-index: 2;
        }

        .login-visual {
          position: relative;
          min-height: 640px;
          padding: 42px;
          display: flex;
          align-items: flex-end;
          background-image: url("https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?q=80&w=1600&auto=format&fit=crop");
          background-size: cover;
          background-position: center;
        }

        .login-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            135deg,
            rgba(7, 17, 31, 0.94),
            rgba(7, 17, 31, 0.65),
            rgba(217, 168, 78, 0.25)
          );
        }

        .login-brand {
          position: absolute;
          top: 24px;
          left: 24px;
          z-index: 2;
          padding: 10px 14px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.14);
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
          background: rgba(217, 168, 78, 0.18);
          color: #f5d28b;
          font-weight: 900;
          margin-bottom: 18px;
        }

        .login-visual-content h1 {
          font-size: 54px;
          line-height: 0.95;
          letter-spacing: -0.06em;
          margin: 0;
        }

        .login-visual-content p {
          margin-top: 18px;
          color: rgba(255, 255, 255, 0.78);
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
          background: rgba(255, 255, 255, 0.12);
          border: 1px solid rgba(255, 255, 255, 0.14);
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .login-card {
          background: rgba(255, 255, 255, 0.97);
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
          letter-spacing: -0.05em;
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
          box-shadow: 0 0 0 4px rgba(217, 168, 78, 0.18);
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

        .login-card button:disabled {
          opacity: 0.65;
          cursor: not-allowed;
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
          background: linear-gradient(135deg, #f5d28b, #d9a84e) !important;
          color: #111827 !important;
        }

        .whatsapp-modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 20;
          background: rgba(3, 7, 18, 0.72);
          backdrop-filter: blur(10px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .whatsapp-modal {
          width: 100%;
          max-width: 430px;
          position: relative;
          border-radius: 30px;
          padding: 34px 28px 26px;
          background:
            radial-gradient(circle at top left, rgba(217, 168, 78, 0.22), transparent 34%),
            #ffffff;
          box-shadow: 0 30px 90px rgba(0, 0, 0, 0.45);
          text-align: center;
          animation: modalIn 0.22s ease-out;
        }

        .modal-close {
          position: absolute;
          top: 14px;
          right: 14px;
          width: 38px;
          height: 38px;
          border: 0;
          border-radius: 999px;
          background: #f1f5f9;
          color: #07111f;
          font-size: 24px;
          cursor: pointer;
          line-height: 1;
        }

        .whatsapp-icon {
          width: 66px;
          height: 66px;
          border-radius: 24px;
          background: #07111f;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 18px;
          font-size: 30px;
          box-shadow: 0 18px 40px rgba(7, 17, 31, 0.28);
        }

        .whatsapp-modal h3 {
          margin: 0;
          color: #07111f;
          font-size: 30px;
          letter-spacing: -0.04em;
        }

        .whatsapp-modal p {
          margin: 14px 0 18px;
          color: #64748b;
          line-height: 1.65;
        }

        .modal-info {
          margin-bottom: 18px;
          padding: 12px 14px;
          border-radius: 16px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          color: #475569;
          font-size: 14px;
        }

        .whatsapp-open-btn {
          width: 100%;
          min-height: 56px;
          border: 0;
          border-radius: 16px;
          background: #16a34a;
          color: #ffffff;
          font-weight: 900;
          cursor: pointer;
          font-size: 15px;
          box-shadow: 0 18px 40px rgba(22, 163, 74, 0.25);
        }

        .modal-secondary-btn {
          width: 100%;
          min-height: 52px;
          margin-top: 10px;
          border: 0;
          border-radius: 16px;
          background: transparent;
          color: #07111f;
          font-weight: 900;
          cursor: pointer;
          font-size: 15px;
        }

        @keyframes modalIn {
          from {
            opacity: 0;
            transform: translateY(12px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
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
            box-shadow: 0 24px 70px rgba(0, 0, 0, 0.28);
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

          .whatsapp-modal {
            border-radius: 26px;
            padding: 32px 22px 22px;
          }

          .whatsapp-modal h3 {
            font-size: 28px;
          }
        }
      `}</style>
    </>
  );
}