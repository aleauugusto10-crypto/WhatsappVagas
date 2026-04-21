
import { supabase } from "../supabase.js";
import { calcDistance } from "../utils/distance.js";

export async function getServicos(query, user){
  const { data } = await supabase.from("servicos").select("*");

  return data.filter(s =>
    s.titulo?.toLowerCase().includes(query.toLowerCase()) &&
    calcDistance(
      user.latitude || 0,
      user.longitude || 0,
      s.latitude || 0,
      s.longitude || 0
    ) <= (user.raio_km || 20)
  );
}
