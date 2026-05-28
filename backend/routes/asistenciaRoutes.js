const express = require('express');

const router = express.Router();

// Importar controlador
const asistenciaController = require('../controllers/asistenciaController');


// ======================================
// RUTA ENTRADA
// ======================================

router.post(
    '/entrada',
    asistenciaController.registrarEntrada
);


// ======================================
// RUTA SALIDA
// ======================================

router.post(
    '/salida',
    asistenciaController.registrarSalida
);


// Exportar rutas
module.exports = router;