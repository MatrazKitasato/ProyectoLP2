const reclamoModel = require('../models/reclamoModel');

async function reclamar(req, res) {
  const { comedor_id } = req.body;
  const publicacionId = Number(req.params.id);

  if (!comedor_id) {
    return res.status(400).json({ error: 'El comedor es obligatorio' });
  }

  try {
    await reclamoModel.reclamar(publicacionId, comedor_id);
    res.status(200).json({ mensaje: 'Publicación reclamada' });
  } catch (error) {
    // 409 Conflict: la publicación ya fue tomada por otro comedor o
    // venció entre que se cargó la lista y se intentó reclamar (RN06).
    res.status(409).json({ error: error.message });
  }
}

module.exports = { reclamar };