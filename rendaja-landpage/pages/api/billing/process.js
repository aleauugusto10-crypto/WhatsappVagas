import { processBillingCycle } from "../../../src/services/billing.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido." });
  }

  try {
    const result = await processBillingCycle();

    return res.status(200).json(result);
  } catch (err) {
    console.error("❌ erro ao processar cobranças:", err);

    return res.status(500).json({
      ok: false,
      error: err?.message || "Erro ao processar cobranças.",
    });
  }
}