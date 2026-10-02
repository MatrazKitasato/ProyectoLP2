const express = require('express');
const router = express.Router();
const publicacionController = require('../controllers/publicacionController');
const reclamoController = require('../controllers/reclamoController');

router.get('/', publicacionController.listar);
router.post('/', publicacionController.publicar);
router.post('/:id/reclamar', reclamoController.reclamar);

module.exports = router;