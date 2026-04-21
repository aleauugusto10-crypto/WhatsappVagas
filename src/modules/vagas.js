
import { supabase } from "../supabase.js";
import { calcDistance } from "../utils/distance.js";

export async function getVagasForUser(user){
  const { data: vagas } = await supabase.from("vagas").select("*");

  return vagas.filter(v =>
    calcDistance(
      user.latitude || 0,
      user.longitude || 0,
      v.latitude || 0,
      v.longitude || 0
    ) <= (user.raio_km || 20)
  );
}
