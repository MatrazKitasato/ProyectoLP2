const supabase = require('../config/supabaseClient');

// Reclama una publicación llamando a la función SQL
// "reclamar_publicacion", que valida que siga disponible.
async function reclamar(publicacionId, comedorId) {
  const { error } = await supabase.rpc('reclamar_publicacion', {
    p_publicacion_id: publicacionId,
    p_comedor_id: comedorId,
  });

  if (error) throw new Error(error.message);
}

module.exports = { reclamar };