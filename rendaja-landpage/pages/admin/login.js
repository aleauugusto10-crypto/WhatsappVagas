import { useState } from "react";
import { useRouter } from "next/router";

export default function AdminLogin() {
  const [password, setPassword] =
    useState("");

  const router = useRouter();

  function handleLogin(e) {
    e.preventDefault();

    const expected =
      process.env
        .NEXT_PUBLIC_CRM_ADMIN_TOKEN;

    if (password === expected) {
      localStorage.setItem(
        "crm_admin_token",
        password
      );

      router.push(
        "/admin/leads-conversations"
      );

      return;
    }

    alert("Senha inválida.");
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "#f6f3ee",
      }}
    >
      <form
        onSubmit={handleLogin}
        style={{
          width: 360,
          background: "#fff",
          padding: 30,
          borderRadius: 24,
          boxShadow:
            "0 20px 60px rgba(0,0,0,.08)",
        }}
      >
        <h1>CRM Admin</h1>

        <p>
          Digite a senha para entrar.
        </p>

        <input
          type="password"
          value={password}
          onChange={(e) =>
            setPassword(e.target.value)
          }
          placeholder="Senha"
          style={{
            width: "100%",
            padding: 14,
            borderRadius: 14,
            border:
              "1px solid #ddd",
            marginTop: 12,
          }}
        />

        <button
          type="submit"
          style={{
            width: "100%",
            marginTop: 14,
            padding: 14,
            border: 0,
            borderRadius: 14,
            background: "#07111f",
            color: "#fff",
            fontWeight: 900,
            cursor: "pointer",
          }}
        >
          Entrar
        </button>
      </form>
    </main>
  );
}