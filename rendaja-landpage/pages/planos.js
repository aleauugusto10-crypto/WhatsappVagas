
import Head from "next/head";

import { useMemo, useState } from "react";

const PLANOS = [
  {
    id: "alerta_basico",
    nome: "Plano Básico",
    preco: 9.90,
    descricao: "Receba vagas diretamente no WhatsApp.",
    vagas: true,
    missoes: false,
  },

  {
    id: "alerta_plus",
    nome: "Plano Plus",
    preco: 19.90,
    descricao: "Receba vagas e missões em tempo real.",
    vagas: true,
    missoes: true,
  },

  {
    id: "alerta_total",
    nome: "Plano Total",
    preco: 29.90,
    descricao: "Tudo liberado com prioridade nas notificações.",
    vagas: true,
    missoes: true,
    destaque: true,
  },
];

function maskPhone(value = "") {
  const numbers = value.replace(/\D/g, "").slice(0, 11);

  if (numbers.length <= 10) {
    return numbers.replace(
      /(\d{0,2})(\d{0,4})(\d{0,4})/,
      (_, a, b, c) => {
        let out = "";

        if (a) out += `(${a}`;
        if (a.length === 2) out += ") ";
        if (b) out += b;
        if (c) out += `-${c}`;

        return out;
      }
    );
  }

  return numbers.replace(
    /(\d{0,2})(\d{0,5})(\d{0,4})/,
    (_, a, b, c) => {
      let out = "";

      if (a) out += `(${a}`;
      if (a.length === 2) out += ") ";
      if (b) out += b;
      if (c) out += `-${c}`;

      return out;
    }
  );
}

export default function PlanosPage() {
  const [selectedPlan, setSelectedPlan] = useState(null);

  return (
    <>
      <Head>
        <title>Planos CompreTudo.shop</title>
      </Head>

      <main className="planosPage">
        <section className="planosHero">
          <span>📲 Alertas Inteligentes</span>

          <h1>
            Receba vagas e missões direto no seu WhatsApp
          </h1>

          <p>
            Escolha um plano e seja avisado automaticamente
            quando novas oportunidades surgirem perto de você.
          </p>
        </section>

        <section className="planosGrid">
          {PLANOS.map((plan) => (
            <article
              key={plan.id}
              className={`planCard ${
                plan.destaque ? "featured" : ""
              }`}
            >
              {plan.destaque && (
                <div className="planBadge">
                  MAIS ESCOLHIDO
                </div>
              )}

              <h2>{plan.nome}</h2>

              <strong>
                R$ {plan.preco.toFixed(2).replace(".", ",")}
              </strong>

              <p>{plan.descricao}</p>

              <ul>
                {plan.vagas && (
                  <li>✅ Alertas de vagas</li>
                )}

                {plan.missoes && (
                  <li>✅ Alertas de missões</li>
                )}

                <li>✅ WhatsApp automático</li>
                <li>✅ Oportunidades em tempo real</li>
              </ul>

              <button
                onClick={() => setSelectedPlan(plan)}
              >
                Contratar plano
              </button>
            </article>
          ))}
        </section>

        {selectedPlan && (
          <CheckoutModal
            plan={selectedPlan}
            onClose={() => setSelectedPlan(null)}
          />
        )}
      </main>
    </>
  );
}

function CheckoutModal({ plan, onClose }) {
  const [nome, setNome] = useState("");
  const [sobrenome, setSobrenome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");

  const [loading, setLoading] = useState(false);

  const [payment, setPayment] = useState(null);

  async function generatePix() {
    try {
      if (!nome || !telefone || !email) {
        alert("Preencha os dados.");
        return;
      }

      setLoading(true);

      const res = await fetch(
        "http://localhost:3000/payments/create-alert-plan",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            nome,
            sobrenome,
            email,
            telefone,
            plano_codigo: plan.id,
          }),
        }
      );

      const json = await res.json();

      if (!res.ok) {
        alert(json.error || "Erro ao gerar pagamento.");
        return;
      }

      setPayment(json);
    } catch (err) {
      console.error(err);
      alert("Erro ao gerar PIX.");
    } finally {
      setLoading(false);
    }
  }

  async function copyPix() {
    if (!payment?.qr_code) return;

    try {
      await navigator.clipboard.writeText(
        payment.qr_code
      );

      alert("PIX copiado.");
    } catch {
      alert("Erro ao copiar.");
    }
  }

  return (
    <div className="checkoutOverlay">
      <div className="checkoutModal">
        <button
          className="closeButton"
          onClick={onClose}
        >
          ✕
        </button>

        {!payment ? (
          <>
            <span>Assinatura</span>

            <h2>{plan.nome}</h2>

            <strong>
              R$ {plan.preco
                .toFixed(2)
                .replace(".", ",")}
            </strong>

            <div className="checkoutFields">
              <input
                placeholder="Nome"
                value={nome}
                onChange={(e) =>
                  setNome(e.target.value)
                }
              />

              <input
                placeholder="Sobrenome"
                value={sobrenome}
                onChange={(e) =>
                  setSobrenome(e.target.value)
                }
              />

              <input
                placeholder="E-mail"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
              />

              <input
                placeholder="(79) 99999-9999"
                value={telefone}
                onChange={(e) =>
                  setTelefone(
                    maskPhone(e.target.value)
                  )
                }
              />
            </div>

            <button
              className="generatePixButton"
              onClick={generatePix}
              disabled={loading}
            >
              {loading
                ? "Gerando PIX..."
                : "Gerar pagamento PIX"}
            </button>
          </>
        ) : (
          <div className="pixSuccessArea">
            <span>Pagamento PIX</span>

            <h2>
              Escaneie o QR Code
            </h2>

            <div className="pixQrArea">
  {payment.qr_code_base64 ? (
    <img
      src={`data:image/png;base64,${payment.qr_code_base64}`}
      alt="QR Code Pix"
      style={{
        width: 220,
        height: 220,
        objectFit: "contain",
      }}
    />
  ) : (
    <div className="pixQrFallback">
      QR Code indisponível. Use o Pix copia e cola abaixo.
    </div>
  )}
</div>

            <textarea
              readOnly
              value={payment.qr_code}
            />

            <button onClick={copyPix}>
              Copiar PIX
            </button>

            <p>
              Após o pagamento sua assinatura
              será ativada automaticamente.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}