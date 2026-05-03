import express from "express";
import jwt from "jsonwebtoken";
import { supabaseAdmin as supabase } from "../lib/supabaseAdmin.js";
import { sendText } from "../services/whatsapp.js";

const router = express.Router();

function normalizarTelefone(value = "") {
  let digits = String(value).replace(/\D/g, "");

  if (!digits) return "";

  if (digits.startsWith("55") && digits.length >= 12) {
    return digits;
  }

  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }

  return digits;
}

function gerarCodigo() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function gerarToken(user) {
  return jwt.sign(
    {
      id: user.id,
      telefone: user.telefone,
    },
    process.env.JWT_SECRET || "rendaja_dev_secret",
    { expiresIn: "7d" }
  );
}

router.post("/request-code", async (req, res) => {
  try {
    const telefone = normalizarTelefone(req.body?.telefone);

    if (!telefone) {
      return res.status(400).json({ error: "Telefone obrigatório." });
    }

    console.log("🔐 LOGIN REQUEST:", { telefone });

    const { data: user, error: userError } = await supabase
      .from("usuarios")
      .select("id,nome,telefone")
      .eq("telefone", telefone)
      .maybeSingle();

    if (userError) {
      console.error("❌ erro ao buscar usuário:", userError);
      return res.status(500).json({ error: "Erro ao buscar usuário." });
    }

    if (!user) {
      return res.status(404).json({
        error: "Número não encontrado. Use o mesmo WhatsApp cadastrado no RendaJá.",
      });
    }
const { data: profile, error: profileError } = await supabase
  .from("profiles_pages")
  .select("id, is_active, subscription_expires_at")
  .eq("user_id", user.id)
  .maybeSingle();

if (profileError) {
  console.error("❌ erro ao buscar página no login:", profileError);
  return res.status(500).json({
    error: "Erro ao verificar sua página.",
  });
}

const paginaAtiva =
  profile?.is_active === true &&
  (!profile.subscription_expires_at ||
    new Date(profile.subscription_expires_at) > new Date());

if (!paginaAtiva) {
  await sendText(
    telefone,
    "🔒 Sua página profissional não está ativa no momento.\n\nPara acessar o painel, ative sua página pelo WhatsApp."
  );

  return res.status(403).json({
    error: "Sua página não está ativa. Ative sua página pelo WhatsApp para acessar o painel.",
    code: "PAGE_NOT_ACTIVE",
  });
}
    const codigo = gerarCodigo();
    const expires = new Date(Date.now() + 5 * 60 * 1000);

    const { error: insertError } = await supabase.from("login_codes").insert({
      telefone,
      codigo,
      usado: false,
      expires_at: expires.toISOString(),
    });

    if (insertError) {
      console.error("❌ erro ao salvar código:", insertError);
      return res.status(500).json({ error: "Erro ao gerar código." });
    }

    await sendText(
      telefone,
      `🔐 *Código de acesso RendaJá*\n\nSeu código é: *${codigo}*\n\nEle expira em 5 minutos.`
    );

    return res.json({ success: true });
  } catch (err) {
    console.error("❌ request-code error:", err);
    return res.status(500).json({ error: "Erro interno ao enviar código." });
  }
});

router.post("/verify-code", async (req, res) => {
  try {
    const telefone = normalizarTelefone(req.body?.telefone);
    const codigo = String(req.body?.codigo || "").trim();

    if (!telefone || !codigo) {
      return res.status(400).json({ error: "Telefone e código são obrigatórios." });
    }

    console.log("🔐 LOGIN VERIFY:", { telefone, codigo });

    const { data: codeData, error: codeError } = await supabase
      .from("login_codes")
      .select("*")
      .eq("telefone", telefone)
      .eq("codigo", codigo)
      .eq("usado", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (codeError) {
      console.error("❌ erro ao buscar código:", codeError);
      return res.status(500).json({ error: "Erro ao validar código." });
    }

    if (!codeData) {
      return res.status(400).json({ error: "Código inválido." });
    }

    if (new Date(codeData.expires_at) < new Date()) {
      return res.status(400).json({ error: "Código expirado." });
    }

    const { data: user, error: userError } = await supabase
      .from("usuarios")
      .select("id,nome,telefone,tipo,cidade,estado")
      .eq("telefone", telefone)
      .maybeSingle();

    if (userError) {
      console.error("❌ erro ao buscar usuário:", userError);
      return res.status(500).json({ error: "Erro ao buscar usuário." });
    }

    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado." });
    }

    await supabase
      .from("login_codes")
      .update({ usado: true })
      .eq("id", codeData.id);

    const token = gerarToken(user);

    return res.json({
      success: true,
      token,
      user,
    });
  } catch (err) {
    console.error("❌ verify-code error:", err);
    return res.status(500).json({ error: "Erro interno ao validar código." });
  }
});

export default router;