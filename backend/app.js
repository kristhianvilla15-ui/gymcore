const express = require('express');
const cors = require('cors');

const app = express();

/* =========================================
   MIDDLEWARES
========================================= */

// Permite conexiones del frontend
app.use(cors({
    origin: 'https://gymcore-finalkris.vercel.app', // Tu URL de Vercel
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Permite recibir JSON
app.use(express.json());

/* =========================================
   IMPORTAR RUTAS
========================================= */

const entrenadorRoutes = require('./routes/entrenadorRoutes');
const usuarioRoutes = require('./routes/usuarioRoutes');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const usuarioController = require('./controllers/usuarioController');

// NUEVAS RUTAS DE ASISTENCIA
const asistenciaRoutes = require('./routes/asistenciaRoutes');

/* =========================================
   USAR RUTAS
========================================= */

app.use('/api/entrenador', entrenadorRoutes);

app.use('/api/usuario', usuarioRoutes);

// Cancelar inscripción a clase (registro explícito para evitar 404 si el router no recargó)
app.post('/api/usuario/clases/cancelar', usuarioController.cancelarClase);
app.post('/api/usuario/cancelar-clase', usuarioController.cancelarClase);

app.use('/api/auth', authRoutes);

app.use('/api/admin', adminRoutes);


// RUTA PARA ENTRADA Y SALIDA
app.use('/api/asistencia', asistenciaRoutes);

/* =========================================
   RUTA PRINCIPAL
========================================= */

app.get('/', (req, res) => {
    res.send('Servidor de GymCore funcionando correctamente');
});

/* =========================================
   RUTA NO ENCONTRADA
========================================= */

app.use((req, res) => {
    res.status(404).json({
        error: 'Ruta no encontrada'
    });
});

/* =========================================
   MANEJO DE ERRORES
========================================= */

app.use((err, req, res, next) => {
    console.error('Error interno:', err);

    res.status(500).json({
        error: 'Error interno del servidor'
    });
});

module.exports = app;