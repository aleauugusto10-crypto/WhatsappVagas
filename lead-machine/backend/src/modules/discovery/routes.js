import { Router } from "express";
import { supabase } from "../../supabase.js";
import * as service from "./service.js";

const router = Router();

/*
|--------------------------------------------------------------------------
| Health
|--------------------------------------------------------------------------
*/

router.get("/health", (req, res) => {
  res.json({
    ok: true,
    module: "discovery",
  });
});

/*
|--------------------------------------------------------------------------
| Criar fila de cidades
|--------------------------------------------------------------------------
*/

router.post("/jobs", async (req, res) => {
  try {
    const {
      cities = [],
      categories = [],
      state = "SE",
    } = req.body;

    if (!Array.isArray(cities) || !cities.length) {
      return res.status(400).json({
        error: "Nenhuma cidade enviada.",
      });
    }

    const jobsToInsert = cities
      .map((city) => String(city).trim())
      .filter(Boolean)
      .map((city) => ({
        city,
        state,
        categories,
        status: "pending",
      }));

    const { data, error } = await supabase
      .from("lead_discovery_jobs")
      .insert(jobsToInsert)
      .select();

    if (error) throw error;

    return res.json({
      success: true,
      total: data.length,
      jobs: data,
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      error: err.message,
    });
  }
});

/*
|--------------------------------------------------------------------------
| Listar fila
|--------------------------------------------------------------------------
*/

router.get("/jobs", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("lead_discovery_jobs")
      .select("*")
      .order("created_at", {
        ascending: false,
      });

    if (error) throw error;

    return res.json(data || []);
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      error: err.message,
    });
  }
});

/*
|--------------------------------------------------------------------------
| Processar próxima cidade da fila
|--------------------------------------------------------------------------
*/

router.post("/jobs/process-next", async (req, res) => {
  try {
    const runningCheck = await supabase
      .from("lead_discovery_jobs")
      .select("*")
      .eq("status", "running")
      .limit(1);

    if (runningCheck.error) {
      throw runningCheck.error;
    }

    if (runningCheck.data?.length) {
      return res.status(409).json({
        error: "Já existe uma cidade sendo processada.",
        running: runningCheck.data[0],
      });
    }

    const { data: job, error: jobError } =
      await supabase
        .from("lead_discovery_jobs")
        .select("*")
        .eq("status", "pending")
        .order("created_at", {
          ascending: true,
        })
        .limit(1)
        .maybeSingle();

    if (jobError) throw jobError;

    if (!job) {
      return res.json({
        success: true,
        message: "Nenhuma cidade pendente na fila.",
      });
    }

    await supabase
      .from("lead_discovery_jobs")
      .update({
        status: "running",
        started_at: new Date().toISOString(),
        error_message: null,
      })
      .eq("id", job.id);

    console.log("🔎 PROCESSANDO CIDADE:", {
      city: job.city,
      state: job.state,
      categories: job.categories,
    });

    let totalFound = 0;
    let totalCreated = 0;

    const categories = Array.isArray(job.categories)
      ? job.categories
      : [];

    for (const category of categories) {
      try {
        console.log(`🔍 Buscando ${category} em ${job.city}`);

        const result = await service.discoverBusinesses({
          city: job.city,
          state: job.state || "SE",
          category,
          discoveryJobId: job.id,
          timeoutMs: 90000,
        });

        totalFound += result.totalFound || 0;
        totalCreated += result.totalCreated || 0;

        console.log(
          `✅ ${category} em ${job.city}: ${result.totalCreated} criados de ${result.totalFound} encontrados`
        );
      } catch (err) {
        console.error(
          `❌ Erro em ${category} / ${job.city}:`,
          err.message
        );

        continue;
      }
    }

    await supabase
      .from("lead_discovery_jobs")
      .update({
        status: "completed",
        finished_at: new Date().toISOString(),
        total_found: totalFound,
        total_created: totalCreated,
      })
      .eq("id", job.id);

    return res.json({
      success: true,
      message: "Cidade processada com busca real.",
      city: job.city,
      state: job.state,
      totalFound,
      totalCreated,
    });
  } catch (err) {
    console.error("Erro ao processar próxima cidade:", err);

    return res.status(500).json({
      error: err.message,
    });
  }
});

export default router;