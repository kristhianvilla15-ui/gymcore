const db = require('../config/db');

exports.login = async (req, res) => {
    const { correo, cedula, rol } = req.body;

    try {
        const tablas = {
            entrenador: 'entrenadores',
            usuario: 'usuarios',
            admin: 'administradores'
        };

        const nombreTabla = tablas[rol];

        if (!nombreTabla) {
            return res.status(400).json({ error: 'El rol seleccionado no es válido.' });
        }

        const sql = `SELECT * FROM ${nombreTabla} WHERE correo = ? AND cedula = ?`;
        const [rows] = await db.query(sql, [correo, cedula]);

        if (rows.length === 0) {
            return res.status(401).json({ error: 'Credenciales incorrectas. Verifica tu correo y cédula.' });
        }

        const datos = rows[0];

        const usuario = {
            id: datos.id_usuario || datos.id_entrenador || datos.id_admin || null,
            id_usuario: datos.id_usuario || null,
            id_entrenador: datos.id_entrenador || null,
            id_admin: datos.id_admin || null,
            nombre: datos.nombre,
            apellido: datos.apellido || null,
            correo: datos.correo,
            cedula: datos.cedula,
            rol: rol
        };

        return res.status(200).json({
            mensaje: 'Login exitoso',
            usuario
        });
    } catch (err) {
        console.error('Error en el servidor durante el login:', err);
        return res.status(500).json({ error: 'Hubo un fallo en el servidor. Intenta más tarde.' });
    }
};