const supabase = require('../config/supabaseClient');

async function listar() {
  const { data, error } = await supabase
    .from('comedores')
    .select('id, nombre, zona, responsable')
    .order('nombre', { ascending: true });

  if (error) throw new Error(error.message);
  return data;
}

module.exports = { listar };