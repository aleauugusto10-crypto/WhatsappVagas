import { useState } from "react";
import { QRCodeCanvas } from "qrcode.react";

function onlyDigits(value = "") {
  return String(value || "").replace(/\D/g, "");
}

function maskPhoneBR(value = "") {
  const digits = onlyDigits(value).slice(0, 11);

  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;

  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)} ${digits.slice(7)}`;
}

export default function NotificationCheckoutModal({ open, plan, onClose }) {
  const [form, setForm] = useState({
    nome: "",
    sobrenome: "",
    email: "",
    telefone: "",
  });

  const [loading, setLoading] = useState(false);
  const [payment, setPayment] = useState(null);

  if (!open || !plan) return null;

  function setField(field, value) {
    setForm((prev) => ({
      ...prev,
      [field]: field === "telefone" ? maskPhoneBR(value) : value,
    }));
  }

  async function generatePix() {
    const nome = form.nome.trim();
    const sobrenome = form.sobrenome.trim();
    const email = form.email.trim().toLowerCase();
    const telefone = onlyDigits(form.telefone);

    if (!nome || !sobrenome || !email || telefone.length < 10) {
      alert("Preencha nome, sobrenome, e-mail e WhatsApp válido.");
      return;
    }

    setLoading(true);
    setPayment(null);

    try {

    const res = await fetch(
  "/api/notifications/create-payment",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },

    body: JSON.stringify({
      plano_codigo: plan.code,
      nome,
      sobrenome,
      email,
      telefone,
    }),
  }
);

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
  console.error("ERRO DETALHADO PIX:", data);
  throw new Error(data?.error || data?.details || "Erro ao gerar Pix.");
}

      setPayment(data.payment);
    } catch (err) {
      console.error("Erro ao gerar Pix:", err);
      alert(err.message || "Erro ao gerar Pix.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="notificationModalBackdrop">
      <div className="notificationModal">
        <button
          type="button"
          className="notificationModalClose"
          onClick={onClose}
        >
          ×
        </button>

        {!payment?.qr_code ? (
          <>
            <small>Assinar alertas</small>

            <h2>{plan.title}</h2>

            <p>
              Preencha seus dados para receber vagas e missões direto no WhatsApp.
            </p>

            <div className="notificationCheckoutSummary">
              <span>Plano</span>
              <strong>{plan.name}</strong>
            </div>

            <div className="notificationCheckoutSummary">
              <span>Total</span>
              <strong>
                R$ {Number(plan.price).toFixed(2).replace(".", ",")}
              </strong>
            </div>

            <div className="notificationFormGrid">
              <label>
                <span>Nome</span>
                <input
                  value={form.nome}
                  onChange={(e) => setField("nome", e.target.value)}
                  placeholder="Seu nome"
                />
              </label>

              <label>
                <span>Sobrenome</span>
                <input
                  value={form.sobrenome}
                  onChange={(e) => setField("sobrenome", e.target.value)}
                  placeholder="Seu sobrenome"
                />
              </label>

              <label className="full">
                <span>E-mail</span>
                <input
                  value={form.email}
                  onChange={(e) => setField("email", e.target.value)}
                  placeholder="seuemail@gmail.com"
                />
              </label>

              <label className="full">
                <span>WhatsApp</span>
                <input
                  value={form.telefone}
                  onChange={(e) => setField("telefone", e.target.value)}
                  placeholder="(79) 99999 9999"
                />
              </label>
            </div>

            <button
              type="button"
              className="notificationPrimaryButton"
              onClick={generatePix}
              disabled={loading}
            >
              {loading ? "Gerando Pix..." : "Gerar Pix"}
            </button>
          </>
        ) : (
          <>
            <small>Pix gerado</small>

            <h2>Finalize seu pagamento</h2>

            <p>
              Escaneie o QR Code ou copie o Pix copia e cola abaixo.
            </p>

            <div className="notificationQrBox">
              <QRCodeCanvas value={payment.qr_code} size={220} level="H" />
            </div>

            <textarea readOnly value={payment.qr_code} />

            <button
              type="button"
              className="notificationPrimaryButton"
              onClick={() => navigator.clipboard.writeText(payment.qr_code)}
            >
              Copiar Pix
            </button>

            {payment.checkout_url && (
              <a
                href={payment.checkout_url}
                target="_blank"
                rel="noreferrer"
                className="notificationCheckoutLink"
              >
                Abrir pagamento
              </a>
            )}
          </>
        )}
      </div>
    </div>
  );
}