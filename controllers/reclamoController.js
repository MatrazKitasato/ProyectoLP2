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
    res.status(400).json({ error: error.message });
  }
}

module.exports = { reclamar };