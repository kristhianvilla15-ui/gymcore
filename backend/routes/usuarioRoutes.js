const express = require('express');
const router = express.Router();
const controller = require('../controllers/usuarioController');


router.post('/registrar', controller.registrarUsuario);

router.post('/medidas', controller.registrarMedidas);
router.get('/medidas/:cedula', controller.getMedidas);

router.get('/rutinas', controller.getRutinas);
router.post('/asignar-rutina', controller.asignarRutina);
router.get('/mis-rutinas/:cedula', controller.getRutinasUsuario);

router.get('/dietas', controller.getDietas);
router.post('/asignar-dieta', controller.asignarDieta);

router.get('/progreso/:cedula', controller.getProgreso);

router.get('/clases', controller.getClases);
router.post('/clases/inscribirse', controller.inscribirClase);
router.post('/clases/cancelar', controller.cancelarClase);
router.post('/cancelar-clase', controller.cancelarClase);

module.exports = router;