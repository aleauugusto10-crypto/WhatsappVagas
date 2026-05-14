import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { QRCodeCanvas } from "qrcode.react";

import { supabase } from "../src/lib/supabaseClient";

const MercadoPayment = dynamic(
  () => import("@mercadopago/sdk-react").then((mod) => mod.Payment),
  { ssr: false }
);

const PLAN_LABELS = {
  free: "Plano Gratuito",
  store_start: "Loja Start",
  equipe_pro: "Equipe Pro",
  complete_pro: "Finance Premium",
};

function money(value = 0) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function buildFileName(file) {
  const ext = file?.name?.split(".")?.pop() || "jpg";
  return `profile-reference-${Date.now()}.${ext}`;
}

async function uploadReferenceImage(file) {
  if (!file) return "";

  if (!supabase) {
    throw new Error(
      "Supabase não está configurado no navegador. Verifique NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY no Vercel."
    );
  }

  const fileName = buildFileName(file);

  const { error } = await supabase.storage
    .from("profile-pages")
    .upload(fileName, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });

  if (error) {
    console.error("Erro upload imagem:", error);
    throw new Error("Erro ao enviar imagem.");
  }

  const { data } = supabase.storage
    .from("profile-pages")
    .getPublicUrl(fileName);

  return data?.publicUrl || "";
}

export default function ProfilePlanSignupModal({
  plan,
  city = "",
  state = "",
  onClose,
}) {
  const [form, setForm] = useState({
    name: "",
    businessName: "",
    phone: "",
    workArea: "",
    city: city || "",
    state: state || "",
    referenceImage: null,
  });

  const [sending, setSending] = useState(false);
  const [createdProfile, setCreatedProfile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");

  const [paymentMethod, setPaymentMethod] = useState("card");
  const [payment, setPayment] = useState(null);
  const [preparedPixPayment, setPreparedPixPayment] = useState(null);
  const [paymentProfile, setPaymentProfile] = useState(null);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [cardError, setCardError] = useState("");
  const [cardResult, setCardResult] = useState(null);
  
  const [copied, setCopied] = useState(false);
const [step, setStep] = useState("form");
const [pendingSignupId, setPendingSignupId] = useState(null);
const [creatingProfile, setCreatingProfile] = useState(false);
  if (!plan) return null;

  function setField(field, value) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }
  function getAffiliateCode() {
  if (typeof window === "undefined") return "";

  const params = new URLSearchParams(window.location.search);
  const refFromUrl = params.get("ref") || params.get("affiliate") || "";

  if (refFromUrl) {
    localStorage.setItem("affiliate_ref", refFromUrl);
    return refFromUrl;
  }

  return localStorage.getItem("affiliate_ref") || "";
}
useEffect(() => {
  const checkPaymentId = payment?.platform_payment_id || payment?.payment_id;

  if (!checkPaymentId) return;
  if (createdProfile) return;

  let statusTimer = null;
  let profileTimer = null;

  function stopStatusTimer() {
    if (statusTimer) {
      clearInterval(statusTimer);
      statusTimer = null;
    }
  }

  function stopProfileTimer() {
    if (profileTimer) {
      clearInterval(profileTimer);
      profileTimer = null;
    }
  }

  function showCreatedProfile(profile) {
    setTimeout(() => {
      setCreatedProfile({
        ...profile,
        publicUrl: `/p/${profile.slug}`,
      });

      setCreatingProfile(false);
    }, 1800);
  }

  function startProfilePolling() {
    if (profileTimer) return;

    profileTimer = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/plans/check-payment?paymentId=${checkPaymentId}&pendingSignupId=${pendingSignupId || ""}`
        );

        const data = await res.json().catch(() => ({}));

        if (data.profile?.slug) {
          stopProfileTimer();
          showCreatedProfile(data.profile);
        }
      } catch (err) {
        console.error("Erro ao buscar vitrine criada:", err);
      }
    }, 1800);
  }

  statusTimer = setInterval(async () => {
    try {
      const res = await fetch(
        `/api/profile-payment-status?paymentId=${checkPaymentId}`
      );

      const data = await res.json().catch(() => ({}));

      if (data.paid === true || data.payment_status === "pago") {
        stopStatusTimer();

        // AQUI aparece a tela imediatamente após confirmar pagamento
        setPaymentConfirmed(true);
        setCreatingProfile(true);

        if (data.profile?.slug) {
          showCreatedProfile(data.profile);
        } else {
          startProfilePolling();
        }
      }
    } catch (err) {
      console.error("Erro ao verificar pagamento:", err);
    }
  }, 1200);

  return () => {
    stopStatusTimer();
    stopProfileTimer();
  };
}, [
  payment?.platform_payment_id,
  payment?.payment_id,
  pendingSignupId,
  createdProfile,
]);
  async function submitSignup() {
    if (sending) return;

    if (!form.name.trim()) {
      alert("Informe seu nome.");
      return;
    }

    if (!form.businessName.trim()) {
      alert("Informe o nome comercial.");
      return;
    }

    if (!form.phone.trim()) {
      alert("Informe seu WhatsApp.");
      return;
    }

    if (!form.workArea.trim()) {
      alert("Informe seu ramo de trabalho.");
      return;
    }

    if (!form.city.trim()) {
      alert("Informe sua cidade.");
      return;
    }

    if (!form.state.trim()) {
      alert("Informe seu estado.");
      return;
    }

    setSending(true);

    try {
      let referenceImageUrl = "";

      if (plan.code !== "free" && form.referenceImage) {
        referenceImageUrl = await uploadReferenceImage(form.referenceImage);
      }

      const res = await fetch("/api/profile-plan-signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
   body: JSON.stringify({
  planCode: plan.code,

  affiliateRef:
    typeof window !== "undefined"
      ? localStorage.getItem("affiliate_ref")
      : null,

  name: form.name.trim(),
  businessName: form.businessName.trim(),
  phone: form.phone.trim(),
  workArea: form.workArea.trim(),
  referenceImageUrl,
  city: form.city.trim(),
  state: form.state.trim().toUpperCase(),
}),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(data.error || "Erro ao criar cadastro.");
        return;
      }

      if (plan.code === "free") {
  setCreatedProfile({
    ...data.profile,
    publicUrl: data.profile_url || `/p/${data.profile?.slug}`,
  });
  return;
}

setPendingSignupId(data.pendingSignupId || null);
setPreparedPixPayment(
  data.payment
    ? {
        ...data.payment,
        platform_payment_id: data.platformPaymentId || data.payment.platform_payment_id,
      }
    : null
);
setPayment(null);

setPaymentProfile({
  pendingSignupId: data.pendingSignupId || null,
  platformPaymentId:
    data.platformPaymentId ||
    data.payment?.platform_payment_id ||
    null,
});

setCardError("");
setCardResult(null);
setPaymentConfirmed(false);
setCreatingProfile(false);

setPaymentMethod("card");
setStep("payment");
    } catch (err) {
      console.error("Erro ao cadastrar plano:", err);
      alert(err?.message || "Erro ao criar cadastro.");
    } finally {
      setSending(false);
    }
  }

  async function generatePixPayment() {
  if (sending) return;

  if (!preparedPixPayment?.qr_code) {
    alert("Pix ainda não foi preparado. Volte e tente novamente.");
    return;
  }

  setPayment(preparedPixPayment);
}

  async function processCardPayment({ formData }) {
  if (
    !paymentProfile?.pendingSignupId ||
    !paymentProfile?.platformPaymentId ||
    !plan?.code
  ) {
    setCardError("Cadastro de pagamento incompleto. Volte e tente novamente.");
    return;
  }

  setSending(true);
  setCardError("");
  setCardResult(null);

  try {
    const res = await fetch("/api/plans/process-card-signup-payment", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        pendingSignupId: paymentProfile.pendingSignupId,
        paymentId: paymentProfile.platformPaymentId,
        planCode: plan.code,
        formData,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setCardError(data.error || "Erro ao processar cartão.");
      return;
    }

    setCardResult(data);

    if (data.approved && data.profile?.slug) {
  setPaymentConfirmed(true);
  setCreatingProfile(true);

  setTimeout(() => {
    setCreatedProfile({
      ...data.profile,
      publicUrl: `/p/${data.profile.slug}`,
    });

    setCreatingProfile(false);
    setPaymentProfile(null);
  }, 2200);
}
  } catch (err) {
    console.error("Erro no cartão:", err);
    setCardError("Erro ao processar cartão.");
  } finally {
    setSending(false);
  }
}

  async function copyPix() {
    if (!payment?.qr_code) return;

    await navigator.clipboard.writeText(payment.qr_code);
    setCopied(true);

    setTimeout(() => {
      setCopied(false);
    }, 1800);
  }

  return (
    <div className="plan-signup-backdrop" onClick={onClose}>
      <div className="plan-signup-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="plan-signup-close" onClick={onClose}>
          ×
        </button>

        {step === "payment" && !createdProfile ? (
          <div className="plan-payment-content">
            {creatingProfile ? (
  <div className="plan-signup-success">
    <span>✅ Pagamento confirmado</span>
    <h2>Criando sua vitrine com IA...</h2>
    <p>
      Estamos preparando sua página profissional. Isso pode levar alguns segundos.
    </p>
  </div>
) : !payment?.qr_code ? (
              <>
                <div className="plan-signup-head">
                  <span>{PLAN_LABELS[plan.code] || plan.name}</span>
                  <h2>Finalize sua ativação</h2>
                  <p>Escolha como deseja pagar sem sair da página.</p>
                </div>

                <div className="plan-signup-summary">
                  <strong>{PLAN_LABELS[plan.code] || plan.name}</strong>
                  <span>Ativação hoje: {money(plan.setup || 0)}</span>
                </div>

                <div className="payment-method-box">
                  <button
                    type="button"
                    className={paymentMethod === "card" ? "active" : ""}
                onClick={() => {
  setPaymentMethod("card");
  setPayment(null);
  setCardError("");
  setCardResult(null);
}}
                  >
                    Cartão
                  </button>

                  <button
                    type="button"
                    className={paymentMethod === "pix" ? "active" : ""}
                 onClick={() => {
  setPaymentMethod("pix");
  setCardError("");
  setCardResult(null);
}}
                  >
                    Pix
                  </button>
                </div>

                {paymentMethod === "card" && (
                  <div className="card-brick-box">
                    <MercadoPayment
                      key={`payment-${plan.code}-${plan.setup}`}
                      initialization={{
                        amount: Number(plan.setup || 0),
                      }}
                      customization={{
                        paymentMethods: {
                          creditCard: "all",
                          debitCard: "all",
                        },
                      }}
                      onSubmit={async ({ formData }) => {
                        await processCardPayment({ formData });
                      }}
                      onReady={() => {
                        console.log("✅ Payment Brick pronto");
                      }}
                      onError={(error) => {
                        console.error("❌ Payment Brick erro:", error);

                        setCardError(
                          error?.message ||
                            error?.cause?.[0]?.description ||
                            "Erro ao carregar pagamento com cartão."
                        );
                      }}
                    />

                    {sending && (
                      <p className="dashboard-note">Processando pagamento...</p>
                    )}

                    {cardError && (
                      <div className="card-payment-error">{cardError}</div>
                    )}

                    {cardResult?.approved && (
                      <div className="card-payment-success">
                        <strong>Pagamento aprovado ✅</strong>
                        <p>Seu plano foi ativado com sucesso.</p>
                      </div>
                    )}

                    {cardResult && !cardResult.approved && (
                      <div className="card-payment-error">
                        <strong>Pagamento não aprovado</strong>
                        <p>
                          {cardResult.message ||
                            "O Mercado Pago não aprovou esse pagamento."}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {paymentMethod === "pix" && (
                  <>
                    <div className="pix-owner-notice">
                      <strong>Pagamento via Pix</strong>
                    <p>
  Gere o Pix, copie o código ou escaneie o QR Code. Assim que o pagamento for
  confirmado, sua vitrine será ativada automaticamente.
  <br />
  <br />
  🔒 O Pix poderá aparecer em nome de{" "}
  <strong>ALEXANDRE AUGUSTO S. CARVALHO</strong>, responsável pela plataforma.
  Não se preocupe, este pagamento é totalmente seguro.
</p>
                    </div>

                    <button
                      type="button"
                      className="plan-signup-submit"
                      onClick={generatePixPayment}
                      disabled={sending}
                    >
                      {sending ? "Gerando Pix..." : "Gerar Pix"}
                    </button>
                  </>
                )}
              </>
            ) : (
              <>
                <div className="plan-signup-head">
                  <span>Pix gerado</span>
                  <h2>Finalize o pagamento</h2>
                  <p>
                    Copie o código Pix abaixo ou escaneie o QR Code. A ativação
                    será automática após confirmação.
                  </p>
                </div>

                <div className="pix-qr-wrapper">
                  <QRCodeCanvas value={payment.qr_code} size={220} level="H" />
                </div>

                <textarea
                  readOnly
                  value={payment.qr_code}
                  className="pix-copy-code"
                />

                <button
                  type="button"
                  className="plan-signup-submit"
                  onClick={copyPix}
                >
                  {copied ? "Código copiado ✅" : "Copiar código Pix"}
                </button>

                <small>Aguardando confirmação automática do pagamento...</small>
              </>
            )}
          </div>
        ) : createdProfile ? (
          <div className="plan-signup-success">
            <span>✨ Sua vitrine foi criada</span>

            <h2>Seu perfil profissional já está online</h2>

            <p>
              Sempre que quiser editar sua vitrine, acessar pedidos, produtos ou
              serviços, basta entrar no painel usando seu WhatsApp.
            </p>

            <div className="created-profile-link">
              <small>Link do seu perfil</small>
              <strong>{createdProfile.publicUrl}</strong>
            </div>

            <a href={createdProfile.publicUrl} target="_blank" rel="noreferrer">
              Ver minha vitrine
            </a>

            <a href="/login" className="secondary">
              Acessar painel
            </a>
          </div>
        ) : (
          <>
            <div className="plan-signup-head">
              <span>{PLAN_LABELS[plan.code] || plan.name}</span>

              <h2>Vamos criar sua vitrine</h2>

              <p>
                Nossa IA irá gerar automaticamente uma página profissional
                elegante baseada no seu negócio.
              </p>
            </div>

            <div className="plan-signup-grid">
              <label>
                <span>Seu nome</span>

                <input
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                  placeholder="Ex: Alexandre Carvalho"
                />
              </label>

              <label>
                <span>Nome comercial</span>

                <input
                  value={form.businessName}
                  onChange={(e) => setField("businessName", e.target.value)}
                  placeholder="Ex: CompreTudo.shop"
                />
              </label>

              <label>
                <span>WhatsApp</span>

                <input
                  value={form.phone}
                  onChange={(e) => setField("phone", e.target.value)}
                  placeholder="Ex: 79999999999"
                />
              </label>

              <label>
                <span>Ramo de trabalho</span>

                <input
                  value={form.workArea}
                  onChange={(e) => setField("workArea", e.target.value)}
                  placeholder="Ex: Loja de roupas, pizzaria, estética..."
                />
              </label>

              <label>
                <span>Cidade</span>

                <input
                  value={form.city}
                  onChange={(e) => setField("city", e.target.value)}
                  placeholder="Ex: Itabaiana"
                />
              </label>

              <label>
                <span>Estado</span>

                <input
                  value={form.state}
                  onChange={(e) =>
                    setField("state", e.target.value.toUpperCase())
                  }
                  placeholder="Ex: SE"
                  maxLength={2}
                />
              </label>

              {plan.code !== "free" && (
                <label className="full">
                  <span>Imagem de referência</span>

                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;

                      setField("referenceImage", file);

                      if (file) {
                        setPreviewUrl(URL.createObjectURL(file));
                      } else {
                        setPreviewUrl("");
                      }
                    }}
                  />

                  <small>
                    Pode ser uma logomarca, fachada, cartão, produto ou
                    identidade visual da marca.
                  </small>

                  {previewUrl && (
                    <div className="plan-signup-preview">
                      <img src={previewUrl} alt="Prévia" />
                    </div>
                  )}
                </label>
              )}
            </div>

            <div className="plan-signup-summary">
              <strong>{PLAN_LABELS[plan.code] || plan.name}</strong>

              {plan.code === "free" ? (
                <span>Cadastro gratuito</span>
              ) : (
                <span>Ativação: {money(plan.setup || 0)}</span>
              )}
            </div>

            <button
              type="button"
              className="plan-signup-submit"
              onClick={submitSignup}
              disabled={sending}
            >
              {sending
                ? "Criando sua vitrine..."
                : plan.code === "free"
                ? "Criar vitrine grátis"
                : "Criar vitrine e escolher pagamento"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}