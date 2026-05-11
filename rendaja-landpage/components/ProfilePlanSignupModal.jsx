import { useState } from "react";

import { supabase } from "../src/lib/supabaseClient";

const PLAN_LABELS = {

  free: "Plano Gratuito",

  store_start: "Loja Start",

  equipe_pro: "Equipe Pro",

  complete_pro: "Finance Premium",

};

function buildFileName(file) {

  const ext = file?.name?.split(".")?.pop() || "jpg";

  return `profile-reference-${Date.now()}.${ext}`;

}

async function uploadReferenceImage(file) {

  if (!file) return "";

  const fileName = buildFileName(file);

  const { error } = await supabase.storage

    .from("profile-pages")

    .upload(fileName, file, {

      cacheControl: "3600",

      upsert: false,

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

  const [pixData, setPixData] = useState(null);

  const [copied, setCopied] = useState(false);

  if (!plan) return null;

  function setField(field, value) {

    setForm((prev) => ({

      ...prev,

      [field]: value,

    }));

  }

  function startPaymentPolling(paymentId) {

    const interval = setInterval(async () => {

      try {

        const res = await fetch(

          `/api/profile-payment-status?paymentId=${paymentId}`

        );

        const data = await res.json().catch(() => ({}));

        if (!data?.paid || !data?.profile) return;

        clearInterval(interval);

        setPixData(null);

        setCreatedProfile({

          ...data.profile,

          publicUrl: `/p/${data.profile.slug}`,

        });

      } catch (err) {

        console.error("Erro verificando pagamento:", err);

      }

    }, 4000);

  }

  async function copyPixCode() {

    if (!pixData?.copyPaste) return;

    await navigator.clipboard.writeText(pixData.copyPaste);

    setCopied(true);

    setTimeout(() => setCopied(false), 1600);

  }

  async function submitSignup() {

    if (sending) return;

    if (!form.name.trim()) return alert("Informe seu nome.");

    if (!form.businessName.trim()) return alert("Informe o nome comercial.");

    if (!form.phone.trim()) return alert("Informe seu WhatsApp.");

    if (!form.workArea.trim()) return alert("Informe seu ramo de trabalho.");

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

      if (data.payment) {

        setPixData({

          paymentId: data.payment.id,

          qrCode: data.payment.qr_code,

          qrCodeBase64: data.payment.qr_code_base64,

          copyPaste: data.payment.qr_code,

          profileUrl: data.profile_url,

        });

        startPaymentPolling(data.payment.id);

        return;

      }

      setCreatedProfile({

        ...data.profile,

        publicUrl: data.profile_url || `/p/${data.profile?.slug}`,

      });

    } catch (err) {

      console.error("Erro ao cadastrar plano:", err);

      alert(err?.message || "Erro ao criar cadastro.");

    } finally {

      setSending(false);

    }

  }

  return (

    <div className="plan-signup-backdrop" onClick={onClose}>

      <div className="plan-signup-modal" onClick={(e) => e.stopPropagation()}>

        <button type="button" className="plan-signup-close" onClick={onClose}>

          ×

        </button>

        {pixData ? (

          <div className="plan-signup-success">

            <span>💳 Pagamento Pix</span>

            <h2>Finalize o pagamento para ativar sua vitrine</h2>

            <p>

              Assim que o Pix for confirmado, sua página será ativada

              automaticamente.

            </p>

            {pixData.qrCodeBase64 && (

              <img

                src={`data:image/png;base64,${pixData.qrCodeBase64}`}

                alt="QR Code Pix"

                className="pix-qrcode"

              />

            )}

            <textarea

              readOnly

              value={pixData.copyPaste || ""}

              className="pix-copy-code"

            />

            <button

              type="button"

              className="plan-signup-submit"

              onClick={copyPixCode}

            >

              {copied ? "Código copiado ✅" : "Copiar código Pix"}

            </button>

            <small>Aguardando confirmação automática do pagamento...</small>

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
    onChange={(e) => setField("state", e.target.value.toUpperCase())}
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
        }
      }}
    />

    <small>
      Pode ser uma logomarca, fachada, cartão, produto ou identidade visual da marca.
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

                <span>

                  Ativação: R$ {Number(plan.setup || 0).toFixed(2)}

                </span>

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

                : "Gerar Pix e criar vitrine"}

            </button>

          </>

        )}

      </div>

    </div>

  );

}