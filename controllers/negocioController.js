const negocioModel = require('../models/negocioModel');

async function listar(req, res) {
  try {
    const negocios = await negocioModel.listar();
    res.status(200).json(negocios);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = { listar };