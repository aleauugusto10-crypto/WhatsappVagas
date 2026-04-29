import { useEffect, useState } from "react";

export function useAsyncData(loader, deps = []) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;

    async function run() {
      setLoading(true);
      setError("");
      try {
        const result = await loader();
        if (alive) setData(result || []);
      } catch (err) {
        console.error(err);
        if (alive) setError(err.message || "Erro ao carregar dados.");
      } finally {
        if (alive) setLoading(false);
      }
    }

    run();
    return () => {
      alive = false;
    };
  }, deps);

  return { data, loading, error };
}
