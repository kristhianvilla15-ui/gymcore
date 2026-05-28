const express = require('express');
const router = express.Router();
const controller = require('../controllers/entrenadorController');

// Registro y supervisión
router.post('/registrar', controller.registrarEntrenador);
router.get('/supervision', controller.getSupervision); // sin parámetro, el entrenador se obtiene de sesión/token

// Clases
router.post('/clases/crear', controller.crearClase);
router.get('/mis-clases/:id', controller.getMisClases);       // :id = entrenador_id
router.put('/clases/:claseId/estado', controller.cambiarEstadoClase); // 🆕 NUEVO

// Rutinas y dietas
router.post('/rutinas/crear', controller.crearRutina);
router.post('/dietas/crear', controller.crearDieta);

router.get('/reportes', controller.getReportes);
router.get('/evolucion-peso', controller.getEvolucionPeso);
router.get('/rendimiento-planes', controller.getRendimientoPorPlan);

router.get('/peso-usuario', controller.getPesoUsuario);



module.exports = router;