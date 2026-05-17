import express from "express";
import cors from "cors";
import leadsRoutes from "./modules/leads/routes.js";
import discoveryRoutes from "./modules/discovery/routes.js";

export function registerLeadMachine(app) {
  app.use(cors());
  app.use(express.json());

  app.use("/api/leads", leadsRoutes);
  app.use("/api/discovery", discoveryRoutes);

  console.log("✅ Lead Machine registrada");
}