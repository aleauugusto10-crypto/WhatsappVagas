import React from "react";
import { Route, Routes } from "react-router-dom";
import Shell from "./components/Shell.jsx";
import Home from "./pages/Home.jsx";
import Jobs from "./pages/Jobs.jsx";
import Professionals from "./pages/Professionals.jsx";
import Missions from "./pages/Missions.jsx";
import Companies from "./pages/Companies.jsx";
import Plans from "./pages/Plans.jsx";
export default function App() {
  return (
    <Shell>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/vagas" element={<Jobs />} />
        <Route path="/profissionais" element={<Professionals />} />
        <Route path="/missoes" element={<Missions />} />
        <Route path="/empresas" element={<Companies />} />
        <Route path="/planos" element={<Plans />} />
      </Routes>
    </Shell>
  );
}
