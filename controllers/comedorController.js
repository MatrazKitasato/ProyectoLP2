const comedorModel = require('../models/comedorModel');

async function listar(req, res) {
  try {
    const comedores = await comedorModel.listar();
    res.status(200).json(comedores);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = { listar };