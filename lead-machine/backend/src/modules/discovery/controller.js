import * as service from "./service.js";
import { DEFAULT_CATEGORIES } from "./categories.js";

export async function startCityDiscovery(req, res) {
  try {
    const { city } = req.body;

    if (!city) {
      return res.status(400).json({
        error: "Cidade obrigatória.",
      });
    }

    const results = [];

    for (const category of DEFAULT_CATEGORIES) {
      console.log(`Buscando ${category} em ${city}`);

      const leads = await service.discoverBusinesses({
        city,
        category,
      });

      results.push({
        category,
        count: leads.length,
      });
    }

    return res.json({
      success: true,
      city,
      results,
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      error: err.message,
    });
  }
}