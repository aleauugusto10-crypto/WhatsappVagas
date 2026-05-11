import { supabase } from "../../../../src/supabase.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Método não permitido." });
  }

  const { paymentId } = req.query;

  if (!paymentId) {
    return res.status(400).json({ error: "paymentId obrigatório." });
  }

  const { data, error } = await supabase
    .from("pagamentos_plataforma")
    .select("id,status,plano_codigo,metadata")
    .eq("id", paymentId)
    .maybeSingle();

  if (error || !data) {
    return res.status(404).json({ error: "Pagamento não encontrado." });
  }

  return res.status(200).json({
    ok: true,
    status: data.status,
    planCode: data.plano_codigo,
    metadata: data.metadata || {},
  });
}