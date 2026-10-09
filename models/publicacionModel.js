const supabase = require('../config/supabaseClient');

// Publica un excedente con varios productos, de forma atómica,
// llamando a la función SQL "publicar_excedente".
async function publicar(negocioId, horaLimite, items) {
  const { data, error } = await supabase.rpc('publicar_excedente', {
    p_negocio_id: negocioId,
    p_hora_limite: horaLimite,
    p_items: items, // [{ producto, cantidad, unidad }, ...]
  });

  if (error) throw new Error(error.message);
  return data; // id de la publicación creada
}

// RN05: una publicación "disponible" cuya hora límite ya pasó se
// considera vencida aunque la base todavía no la haya actualizado
// (eso solo ocurre cuando alguien intenta reclamarla). Esta función
// calcula el estado real para mostrarlo, sin modificar la base.
function calcularEstado(fila) {
  if (fila.estado === 'disponible' && new Date(fila.hora_limite) < new Date()) {
    return 'vencida';
  }
  return fila.estado;
}

// Historial del donante: todas sus publicaciones, con el comedor y
// la fecha del reclamo (si lo hubo) como columnas de la propia
// publicación, tal como define el modelo de datos (5.7.1).
async function listarPorNegocio(negocioId) {
  const { data, error } = await supabase
    .from('publicaciones')
    .select(
      `id, hora_limite, estado, created_at, fecha_reclamo,
       negocios ( id, nombre, zona ),
       publicacion_detalle ( id, producto, cantidad, unidad ),
       comedores ( nombre )`
    )
    .eq('negocio_id', negocioId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data.map((fila) => ({ ...fila, estado: calcularEstado(fila) }));
}

// RF09/RN08: el receptor solo debe ver publicaciones realmente
// disponibles: estado "disponible" Y hora límite todavía no pasada.
async function listarDisponibles() {
  const { data, error } = await supabase
    .from('publicaciones')
    .select(
      `id, hora_limite, estado, created_at,
       negocios ( id, nombre, zona ),
       publicacion_detalle ( id, producto, cantidad, unidad )`
    )
    .eq('estado', 'disponible')
    .gt('hora_limite', new Date().toISOString())
    .order('hora_limite', { ascending: true });

  if (error) throw new Error(error.message);
  return data;
}

module.exports = { publicar, listarPorNegocio, listarDisponibles };