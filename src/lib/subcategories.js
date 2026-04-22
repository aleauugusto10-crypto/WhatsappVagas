export async function getSubcategoriasByCategoria(supabase, categoriaChave) {
  const { data, error } = await supabase
    .from("subcategorias")
    .select("*")
    .eq("categoria_chave", categoriaChave)
    .order("nome");

  if (error) {
    console.error("❌ erro ao buscar subcategorias:", error);
    return [];
  }

  return data || [];
}

export async function replaceUserSubcategorias(
  supabase,
  usuarioId,
  categoriaChave,
  subcategorias = []
) {
  const lista = Array.from(
    new Set(
      (subcategorias || [])
        .map((s) => String(s || "").trim())
        .filter(Boolean)
    )
  ).slice(0, 3);

  const { error: deleteError } = await supabase
    .from("usuarios_subcategorias")
    .delete()
    .eq("usuario_id", usuarioId);

  if (deleteError) {
    console.error("❌ erro ao limpar subcategorias do usuário:", deleteError);
    return false;
  }

  if (!lista.length) return true;

  const payload = lista.map((subcategoriaChave) => ({
    usuario_id: usuarioId,
    categoria_chave: categoriaChave,
    subcategoria_chave: subcategoriaChave,
  }));

  const { error: insertError } = await supabase
    .from("usuarios_subcategorias")
    .insert(payload);

  if (insertError) {
    console.error("❌ erro ao salvar subcategorias do usuário:", insertError);
    return false;
  }

  return true;
}

export async function getUserSubcategorias(supabase, usuarioId) {
  const { data, error } = await supabase
    .from("usuarios_subcategorias")
    .select("*")
    .eq("usuario_id", usuarioId)
    .order("subcategoria_chave");

  if (error) {
    console.error("❌ erro ao buscar subcategorias do usuário:", error);
    return [];
  }

  return data || [];
}