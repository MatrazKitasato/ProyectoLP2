const publicacionModel = require('../models/publicacionModel');

async function publicar(req, res) {
  const { negocio_id, hora_limite, items } = req.body;

  if (!negocio_id) {
    return res.status(400).json({ error: 'El negocio es obligatorio' });
  }
  if (!hora_limite) {
    return res.status(400).json({ error: 'La hora límite es obligatoria' });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res
      .status(400)
      .json({ error: 'La publicación debe tener al menos un producto' });
  }

  try {
    const publicacionId = await publicacionModel.publicar(
      negocio_id,
      hora_limite,
      items
    );
    res.status(201).json({ id: publicacionId, mensaje: 'Excedente publicado' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

// RF07: historial del donante (requiere negocio_id).
async function listarPorNegocio(req, res) {
  const negocioId = Number(req.query.negocio_id);

  if (!negocioId) {
    return res.status(400).json({ error: 'Falta el negocio' });
  }

  try {
    const publicaciones = await publicacionModel.listarPorNegocio(negocioId);
    res.status(200).json(publicaciones);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// RF09: lo que ve el receptor, ya filtrado a solo disponibles.
async function listarDisponibles(req, res) {
  try {
    const publicaciones = await publicacionModel.listarDisponibles();
    res.status(200).json(publicaciones);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = { publicar, listarPorNegocio, listarDisponibles };