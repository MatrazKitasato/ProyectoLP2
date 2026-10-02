const express = require('express');
const router = express.Router();
const negocioController = require('../controllers/negocioController');

router.get('/', negocioController.listar);

module.exports = router;