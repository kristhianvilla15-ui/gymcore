const app = require('./app');
const db = require('./config/db');
require('dotenv').config();

const PORT = process.env.PORT || 3000;

async function startServer() {
    try {
        await db.query('SELECT 1');
        console.log('Conexión exitosa a la BD GymCore');

        app.listen(PORT, () => {
            console.log(`Servidor corriendo en http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('Error crítico al iniciar el servidor');
        console.error(error.message);
        process.exit(1);
    }
}

startServer();