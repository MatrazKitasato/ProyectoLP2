const express = require('express');
const router = express.Router();
const comedorController = require('../controllers/comedorController');

router.get('/', comedorController.listar);

module.exports = router;