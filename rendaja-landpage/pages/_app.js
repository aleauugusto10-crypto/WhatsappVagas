import { initMercadoPago } from "@mercadopago/sdk-react";

import "../styles/Dashboard.css";
import "../styles/globals.css";
import "../styles/shopping.css";
import "../components/dashboard/printshop/printshop.css";

if (typeof window !== "undefined") {
  const publicKey = process.env.NEXT_PUBLIC_MP_PUBLIC_KEY;

  console.log("🔑 MP PUBLIC KEY EXISTE?", !!publicKey);
  console.log("🔑 MP PUBLIC KEY PREFIXO:", publicKey?.slice(0, 12));

  if (publicKey) {
    initMercadoPago(publicKey);
  }
}

export default function App({ Component, pageProps }) {
  return <Component {...pageProps} />;
}