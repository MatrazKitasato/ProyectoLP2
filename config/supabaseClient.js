require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    'Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el archivo .env'
  );
}

// Un único cliente para todo el servidor. Usa la clave service_role
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

module.exports = supabase;