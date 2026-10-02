const supabase = require('../config/supabaseClient');

// Publica un excedente con varios productos, de forma atómica usando la función RPC 'publicar_excedente' definida en la base de datos.
async function publicar(negocioId, horaLimite, items) {
  const { data, error } = await supabase.rpc('publicar_excedente', {
    p_negocio_id: negocioId,
    p_hora_limite: horaLimite,
    p_items: items,
  });

  if (error) throw new Error(error.message);
  return data; // id de la publicación creada
}

// Lista publicaciones con su negocio, su detalle de productos y los reclamos asociados. Se puede filtrar por negocioId.
async function listar({ negocioId } = {}) {
  let query = supabase
    .from('publicaciones')
    .select(
      `id, hora_limite, estado, created_at,
       negocios ( id, nombre, zona ),
       publicacion_detalle ( id, producto, cantidad, unidad ),
       reclamos ( comedor_id, fecha, comedores ( nombre ) )`
    )
    .order('created_at', { ascending: false });

  if (negocioId) {
    query = query.eq('negocio_id', negocioId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
}

module.exports = { publicar, listar };