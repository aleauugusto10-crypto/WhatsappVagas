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

    const res = await fetch(`${API_URL}/auth/request-code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ telefone }),
    });

    const json = await res.json();

    if (!res.ok) {
      alert(json.error || "Erro ao enviar código.");
      return;
    }

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

      <section style={styles.card}>

        <div style={styles.badge}>RendaJá</div>

        <h1 style={styles.title}>Entrar no painel</h1>

        <p style={styles.text}>

          Use o número cadastrado no WhatsApp do RendaJá para acessar seu painel.

        </p>

        {step === "phone" && (

          <>

            <label style={styles.label}>Número do WhatsApp</label>

            <input

              style={styles.input}

              placeholder="Ex: (79) 99819-2216"

              value={telefone}

              onChange={(e) => setTelefone(e.target.value)}

            />

            <button style={styles.button} onClick={pedirCodigo} disabled={loading}>

              {loading ? "Enviando..." : "Receber código"}

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

      </section>

    </main>

  );

}

const styles = {

  page: {

    minHeight: "100vh",

    background: "#06111d",

    display: "grid",

    placeItems: "center",

    padding: 24,

  },

  card: {

    width: "100%",

    maxWidth: 430,

    background: "#fff",

    borderRadius: 24,

    padding: 32,

    boxShadow: "0 30px 90px rgba(0,0,0,.35)",

  },

  badge: {

    display: "inline-block",

    background: "#f5d28b",

    color: "#06111d",

    padding: "8px 12px",

    borderRadius: 999,

    fontWeight: 900,

    marginBottom: 18,

  },

  title: {

    margin: "0 0 10px",

    fontSize: 34,

  },

  text: {

    color: "#64748b",

    lineHeight: 1.6,

    marginBottom: 26,

  },

  label: {

    display: "block",

    fontWeight: 800,

    marginBottom: 8,

  },

  input: {

    width: "100%",

    padding: "15px 16px",

    borderRadius: 14,

    border: "1px solid #dbe3ef",

    marginBottom: 16,

    fontSize: 16,

  },

  button: {

    width: "100%",

    padding: "15px",

    borderRadius: 14,

    border: 0,

    background: "#06111d",

    color: "#fff",

    fontWeight: 900,

    cursor: "pointer",

  },

  linkButton: {

    width: "100%",

    marginTop: 12,

    border: 0,

    background: "transparent",

    color: "#06111d",

    fontWeight: 800,

    cursor: "pointer",

  },

};