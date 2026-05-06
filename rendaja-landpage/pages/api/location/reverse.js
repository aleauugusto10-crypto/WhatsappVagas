export default async function handler(req, res) {
  try {
    const { lat, lng } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        error: "Latitude e longitude são obrigatórias.",
      });
    }

    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=pt-BR`,
      {
        headers: {
          "User-Agent": "RendaJaShopping/1.0",
        },
      }
    );

    const data = await response.json();

    const address = data?.address || {};

    const city =
      address.city ||
      address.town ||
      address.village ||
      address.municipality ||
      address.county ||
      "";

    let state =
      address.state_code ||
      address["ISO3166-2-lvl4"] ||
      address.state ||
      "";

    state = String(state)
      .replace("BR-", "")
      .replace("Sergipe", "SE")
      .replace("Bahia", "BA")
      .replace("Alagoas", "AL")
      .replace("Pernambuco", "PE")
      .replace("São Paulo", "SP")
      .replace("Rio de Janeiro", "RJ")
      .trim()
      .toUpperCase();

    return res.status(200).json({
      city,
      state,
    });
  } catch (err) {
    console.error("Erro reverse location:", err);

    return res.status(500).json({
      error: "Erro ao detectar localização.",
    });
  }
}