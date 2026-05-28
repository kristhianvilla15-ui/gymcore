const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// Dashboard
router.get('/dashboard', adminController.getDashboard);

// Usuarios
router.get('/usuarios', adminController.getUsuarios);
router.post('/usuarios', adminController.crearUsuario);
router.put('/usuarios/:id', adminController.actualizarUsuario);
router.delete('/usuarios/:id', adminController.desactivarUsuario); // o desactivar

// Entrenadores
router.get('/entrenadores', adminController.getEntrenadores);
router.post('/entrenadores', adminController.crearEntrenador);
router.put('/entrenadores/:id', adminController.actualizarEntrenador);
router.delete('/entrenadores/:id', adminController.desactivarEntrenador);

// Rutinas
router.get('/rutinas', adminController.getRutinas);
router.post('/rutinas', adminController.crearRutina);
router.put('/rutinas/:id', adminController.actualizarRutina);
router.delete('/rutinas/:id', adminController.eliminarRutina);

// Clases
router.get('/clases', adminController.getClases);
router.post('/clases', adminController.crearClase);
router.put('/clases/:id', adminController.actualizarClase);
router.delete('/clases/:id', adminController.eliminarClase);

// Membresías
router.get('/tipos-membresia', adminController.getTiposMembresia);
router.post('/tipos-membresia', adminController.crearTipoMembresia);
router.get('/membresias-usuario', adminController.getMembresiasUsuario);
router.post('/membresias-usuario', adminController.asignarMembresia);

// Reportes
router.get('/reportes', adminController.getReportes);

router.get('/reportes-avanzados', adminController.getReportesAvanzados);

module.exports = router;