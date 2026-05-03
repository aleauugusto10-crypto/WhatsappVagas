import express from "express";
import jwt from "jsonwebtoken";
import { supabaseAdmin as supabase } from "../lib/supabaseAdmin.js";
import { sendText } from "../services/whatsapp.js";

const router = express.Router();

function onlyDigits(value = "") {
  return String(value || "").replace(/\D/g, "");
}

function normalizarTelefone(value = "") {
  let digits = onlyDigits(value);

  if (!digits) return "";

  if (digits.startsWith("55")) {
    digits = digits.slice(2);
  }

  const ddd = digits.slice(0, 2);
  let numero = digits.slice(2);

  // Se vier celular com 9 dígitos começando com 9,
  // salva no padrão antigo do WhatsApp/banco: DDD + 8 dígitos
  if (numero.length === 9 && numero.startsWith("9")) {
    numero = numero.slice(1);
  }

  return `55${ddd}${numero}`;
}

function variantesTelefone(value = "") {
  const principal = normalizarTelefone(value);
  const digits = onlyDigits(principal);

  if (!digits.startsWith("55") || digits.length < 12) {
    return [principal].filter(Boolean);
  }

  const ddd = digits.slice(2, 4);
  const numero = digits.slice(4);

  const semNove = `55${ddd}${numero.length === 9 && numero.startsWith("9") ? numero.slice(1) : numero}`;
  const comNove = `55${ddd}${numero.length === 8 ? `9${numero}` : numero}`;

  return Array.from(new Set([principal, semNove, comNove].filter(Boolean)));
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
    const telefonesPossiveis = variantesTelefone(req.body?.telefone);
const telefone = telefonesPossiveis[0];

    if (!telefone) {
      return res.status(400).json({ error: "Telefone obrigatório." });
    }

    console.log("🔐 LOGIN REQUEST:", { telefone });

    const { data: user, error: userError } = await supabase
      .from("usuarios")
      .select("id,nome,telefone")
      .in("telefone", telefonesPossiveis)
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
    const telefonesPossiveis = variantesTelefone(req.body?.telefone);
const telefone = telefonesPossiveis[0];
const codigo = String(req.body?.codigo || "").trim();
    if (!telefone || !codigo) {
      return res.status(400).json({ error: "Telefone e código são obrigatórios." });
    }

    console.log("🔐 LOGIN VERIFY:", { telefone, codigo });

    const { data: codeData, error: codeError } = await supabase
      .from("login_codes")
      .select("*")
    .in("telefone", telefonesPossiveis)
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
      .in("telefone", telefonesPossiveis)
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