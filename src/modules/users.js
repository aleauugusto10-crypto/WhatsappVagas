import { supabase } from "../supabase.js";

export async function getOrCreateUser(phone){

  const { data, error } = await supabase
    .from("usuarios")
    .select("*")
    .eq("telefone", phone)
    .maybeSingle(); // 🔥 CORREÇÃO AQUI

  if(error){
    console.error("❌ erro ao buscar usuário:", error);
    return null;
  }

  if(!data){
    const { data: newUser, error: insertError } = await supabase
      .from("usuarios")
      .insert({
        telefone: phone,
        etapa: "onboarding",
        ativo: true
      })
      .select()
      .single();

    if(insertError){
      console.error("❌ erro ao criar usuário:", insertError);
      return null;
    }

    return newUser;
  }

  return data;
}