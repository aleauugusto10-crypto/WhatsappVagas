
import { supabase } from "../supabase.js";

export async function getOrCreateUser(phone){
  let { data } = await supabase
    .from("usuarios")
    .select("*")
    .eq("telefone", phone)
    .single();

  if(!data){
    const { data: newUser } = await supabase
      .from("usuarios")
      .insert({ telefone: phone, tipo:"usuario" })
      .select()
      .single();

    return newUser;
  }

  return data;
}
