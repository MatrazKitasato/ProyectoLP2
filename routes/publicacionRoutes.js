const express = require('express');
const router = express.Router();
const publicacionController = require('../controllers/publicacionController');
const reclamoController = require('../controllers/reclamoController');

router.get('/historial', publicacionController.listarPorNegocio);
router.get('/disponibles', publicacionController.listarDisponibles);
router.post('/', publicacionController.publicar);
router.post('/:id/reclamar', reclamoController.reclamar);

module.exports = router;