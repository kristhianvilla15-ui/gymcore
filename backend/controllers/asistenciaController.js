const db = require('../config/db');


// ======================================
// REGISTRAR ENTRADA
// ======================================

exports.registrarEntrada = async (req, res) => {

    const { cedula } = req.body;

    try {

        // =========================
        // VALIDAR CEDULA
        // =========================

        if (!cedula) {

            return res.status(400).json({
                error: 'La cédula es obligatoria.'
            });
        }

        // =========================
        // BUSCAR USUARIO
        // =========================

        const [usuarios] = await db.query(
            'SELECT id_usuario FROM usuarios WHERE cedula = ?',
            [cedula]
        );

        // Si no existe
        if (usuarios.length === 0) {

            return res.status(404).json({
                error: 'Usuario no encontrado.'
            });
        }

        const usuarioId = usuarios[0].id_usuario;

        // =========================
        // REVISAR SI YA EXISTE
        // ASISTENCIA HOY
        // =========================

        const [asistenciaHoy] = await db.query(
            `
            SELECT *
            FROM asistencia
            WHERE usuario_id = ?
            AND fecha = CURDATE()
            `,
            [usuarioId]
        );

        // Si ya registró entrada
        if (
            asistenciaHoy.length > 0 &&
            asistenciaHoy[0].hora_entrada
        ) {

            return res.status(400).json({
                error: 'La entrada ya fue registrada hoy.'
            });
        }

        // =========================
        // INSERTAR ASISTENCIA
        // =========================

        await db.query(
            `
            INSERT INTO asistencia
            (usuario_id, fecha, hora_entrada)
            VALUES (?, CURDATE(), CURTIME())
            `,
            [usuarioId]
        );

        // =========================
        // RESPUESTA
        // =========================

        res.json({
            mensaje: 'Entrada registrada correctamente.'
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            error: 'Error interno del servidor.'
        });
    }
};


// ======================================
// REGISTRAR SALIDA
// ======================================

exports.registrarSalida = async (req, res) => {

    const { cedula } = req.body;

    try {

        // =========================
        // VALIDAR CEDULA
        // =========================

        if (!cedula) {

            return res.status(400).json({
                error: 'La cédula es obligatoria.'
            });
        }

        // =========================
        // BUSCAR USUARIO
        // =========================

        const [usuarios] = await db.query(
            'SELECT id_usuario FROM usuarios WHERE cedula = ?',
            [cedula]
        );

        // Si no existe
        if (usuarios.length === 0) {

            return res.status(404).json({
                error: 'Usuario no encontrado.'
            });
        }

        const usuarioId = usuarios[0].id_usuario;

        // =========================
        // BUSCAR ASISTENCIA DE HOY
        // =========================

        const [asistencia] = await db.query(
            `
            SELECT *
            FROM asistencia
            WHERE usuario_id = ?
            AND fecha = CURDATE()
            `,
            [usuarioId]
        );

        // Si no existe entrada
        if (asistencia.length === 0) {

            return res.status(400).json({
                error: 'Primero debes registrar la entrada.'
            });
        }

        // Si ya tiene salida
        if (asistencia[0].hora_salida) {

            return res.status(400).json({
                error: 'La salida ya fue registrada.'
            });
        }

        // =========================
        // ACTUALIZAR SALIDA
        // =========================

        await db.query(
            `
            UPDATE asistencia
            SET hora_salida = CURTIME()
            WHERE id_asistencia = ?
            `,
            [asistencia[0].id_asistencia]
        );

        // =========================
        // RESPUESTA
        // =========================

        res.json({
            mensaje: 'Salida registrada correctamente.'
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            error: 'Error interno del servidor.'
        });
    }
};