const db = require('../config/db');

// =====================================================
// REGISTRAR USUARIO
// =====================================================
exports.registrarUsuario = async (req, res) => {
    const {
        cedula,
        nombre,
        apellido,
        telefono,
        correo,
        objetivo_general,
        fecha_nacimiento,
        sexo
    } = req.body;

    try {
        const sql = `
            INSERT INTO usuarios
            (cedula, nombre, apellido, telefono, correo, objetivo_general, fecha_nacimiento, sexo)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const [result] = await db.query(sql, [
            cedula,
            nombre,
            apellido,
            telefono,
            correo,
            objetivo_general,
            fecha_nacimiento || null,
            sexo || null
        ]);

        res.status(201).json({
            mensaje: 'Usuario registrado con éxito',
            id: result.insertId
        });
    } catch (err) {
        console.error('Error al registrar usuario:', err);

        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({
                error: 'La cédula o el correo ya existen en la base de datos'
            });
        }

        res.status(500).json({ error: 'Error interno al registrar el usuario' });
    }
};

async function obtenerUsuarioIdPorCedula(cedula) {
    const [rows] = await db.query(
        'SELECT id_usuario FROM usuarios WHERE cedula = ?',
        [String(cedula).trim()]
    );

    if (rows.length === 0) return null;
    return rows[0].id_usuario;
}

function diaIdHoy() {
    const mapa = [7, 1, 2, 3, 4, 5, 6];
    return mapa[new Date().getDay()];
}

function normalizarHora(horaInicio) {
    if (!horaInicio) return '00:00:00';
    if (typeof horaInicio === 'string') return horaInicio.slice(0, 8);
    if (horaInicio instanceof Date) {
        const h = horaInicio.getHours();
        const m = horaInicio.getMinutes();
        const s = horaInicio.getSeconds();
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return String(horaInicio).slice(0, 8);
}

function minutosHastaHora(horaInicio) {
    const ahora = new Date();
    const horaStr = normalizarHora(horaInicio);
    const partes = horaStr.split(':').map(Number);
    const inicio = new Date(ahora);
    inicio.setHours(partes[0] || 0, partes[1] || 0, partes[2] || 0, 0);
    return (inicio.getTime() - ahora.getTime()) / 60000;
}

async function evaluarCancelacionClase(claseId) {
    const [rows] = await db.query(`
        SELECT c.hora_inicio, c.estado,
               GROUP_CONCAT(DISTINCT cd.dia_id ORDER BY cd.dia_id) AS dias_ids
        FROM clases c
        LEFT JOIN clase_dias cd ON c.id_clase = cd.clase_id
        WHERE c.id_clase = ?
        GROUP BY c.id_clase, c.hora_inicio, c.estado
        LIMIT 1
    `, [claseId]);

    if (rows.length === 0) {
        return { permitido: false, error: 'Clase no encontrada' };
    }

    const clase = rows[0];
    if (clase.estado !== 'activa') {
        return { permitido: false, error: 'Esta clase ya no está disponible' };
    }

    const diasIds = (clase.dias_ids || '')
        .split(',')
        .map(d => parseInt(d.trim(), 10))
        .filter(Boolean);

    const hoyEsDiaClase = diasIds.length === 0 || diasIds.includes(diaIdHoy());

    if (hoyEsDiaClase) {
        const minutos = minutosHastaHora(clase.hora_inicio);
        if (minutos <= 0) {
            return { permitido: false, error: 'No puedes cancelar: la clase ya comenzó' };
        }
        if (minutos < 30) {
            return {
                permitido: false,
                error: 'Solo puedes cancelar con al menos 30 minutos de anticipación'
            };
        }
    }

    return { permitido: true };
}

// =====================================================
// GUARDAR MEDIDAS
// =====================================================
exports.registrarMedidas = async (req, res) => {
    const {
        cedula,
        id_usuario,
        peso,
        medida_brazo,
        medida_pecho,
        medida_pierna,
        observacion
    } = req.body;

    try {
        let usuarioId = id_usuario || null;

        if (!usuarioId) {
            if (!cedula) {
                return res.status(400).json({ error: 'Falta la cédula del usuario' });
            }

            usuarioId = await obtenerUsuarioIdPorCedula(cedula);

            if (!usuarioId) {
                return res.status(404).json({ error: 'Usuario no existe' });
            }
        }

        await db.query(`
            INSERT INTO seguimiento_medidas
            (usuario_id, peso, medida_brazo, medida_pecho, medida_pierna, observacion)
            VALUES (?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                peso = VALUES(peso),
                medida_brazo = VALUES(medida_brazo),
                medida_pecho = VALUES(medida_pecho),
                medida_pierna = VALUES(medida_pierna),
                observacion = VALUES(observacion)
        `, [
            usuarioId,
            peso,
            medida_brazo || null,
            medida_pecho || null,
            medida_pierna || null,
            observacion || null
        ]);

        res.json({ mensaje: 'Medidas guardadas correctamente' });
    } catch (err) {
        console.error('Error al guardar medidas:', err);
        res.status(500).json({ error: 'Error al guardar medidas' });
    }
};

// =====================================================
// OBTENER HISTORIAL DE MEDIDAS
// =====================================================
exports.getMedidas = async (req, res) => {
    const { cedula } = req.params;

    try {
        const [data] = await db.query(`
            SELECT
                m.fecha,
                m.peso,
                m.medida_brazo,
                m.medida_pecho,
                m.medida_pierna,
                m.observacion
            FROM seguimiento_medidas m
            JOIN usuarios u ON m.usuario_id = u.id_usuario
            WHERE u.cedula = ?
            ORDER BY m.fecha DESC, m.id_medicion DESC
        `, [cedula]);

        res.json(data);
    } catch (err) {
        res.status(500).json({ error: 'Error al cargar medidas' });
    }
};

// =====================================================
// OBTENER RUTINAS ACTIVAS
// =====================================================
exports.getRutinas = async (req, res) => {
    const { nivel, grupo_muscular } = req.query;

    try {
        let sql = `
            SELECT
                r.id_rutina,
                r.nombre,
                r.descripcion,
                r.nivel,
                r.grupo_muscular,
                r.objetivo,
                r.duracion_semanas,
                CONCAT(e.nombre, ' ', e.apellido) AS entrenador
            FROM rutinas r
            JOIN entrenadores e ON r.entrenador_id = e.id_entrenador
            WHERE r.estado = 'activa'
        `;

        const params = [];

        if (nivel) {
            sql += ' AND r.nivel = ?';
            params.push(nivel);
        }

        if (grupo_muscular) {
            sql += ' AND r.grupo_muscular = ?';
            params.push(grupo_muscular);
        }

        sql += ' ORDER BY r.nombre';

        const [data] = await db.query(sql, params);
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: 'Error al cargar rutinas' });
    }
};

// =====================================================
// ASIGNAR RUTINA A VARIOS DÍAS
// =====================================================
exports.asignarRutina = async (req, res) => {
    const { cedula, rutina_id, dias_ids, dia_id, id_usuario } = req.body;

    try {
        let usuarioId = id_usuario || null;

        if (!usuarioId) {
            usuarioId = await obtenerUsuarioIdPorCedula(cedula);
            if (!usuarioId) {
                return res.status(404).json({ error: 'Usuario no encontrado' });
            }
        }

        const dias = Array.isArray(dias_ids) && dias_ids.length > 0
            ? dias_ids
            : (dia_id ? [dia_id] : []);

        if (dias.length === 0) {
            return res.status(400).json({ error: 'Debes seleccionar al menos un día' });
        }

        const queries = dias.map(d => db.query(`
            INSERT INTO usuarios_rutinas (usuario_id, rutina_id, dia_id, estado)
            VALUES (?, ?, ?, 'activa')
            ON DUPLICATE KEY UPDATE
                rutina_id = VALUES(rutina_id),
                fecha_asignacion = CURRENT_DATE,
                estado = 'activa'
        `, [usuarioId, rutina_id, d]));

        await Promise.all(queries);

        res.json({ mensaje: 'Rutina asignada correctamente para los días seleccionados' });
    } catch (err) {
        console.error('Error al asignar rutina:', err);
        res.status(500).json({ error: 'Error al asignar rutina' });
    }
};

// =====================================================
// OBTENER RUTINAS DEL USUARIO
// =====================================================
exports.getRutinasUsuario = async (req, res) => {
    const { cedula } = req.params;

    try {
        const [data] = await db.query(`
            SELECT
                r.id_rutina,
                r.nombre,
                r.nivel,
                r.grupo_muscular,
                r.objetivo,
                GROUP_CONCAT(DISTINCT d.nombre_dia ORDER BY d.id_dia SEPARATOR ', ') AS dias
            FROM usuarios u
            JOIN usuarios_rutinas ur ON u.id_usuario = ur.usuario_id
            JOIN rutinas r ON ur.rutina_id = r.id_rutina
            JOIN dias d ON ur.dia_id = d.id_dia
            WHERE u.cedula = ? AND ur.estado = 'activa'
            GROUP BY r.id_rutina, r.nombre, r.nivel, r.grupo_muscular, r.objetivo
            ORDER BY r.nombre
        `, [cedula]);

        res.json(data);
    } catch (err) {
        console.error('Error al cargar rutinas del usuario:', err);
        res.status(500).json({ error: 'Error al cargar rutinas del usuario' });
    }
};

// =====================================================
// OBTENER DIETAS ACTIVAS
// =====================================================
exports.getDietas = async (req, res) => {
    try {
        const [data] = await db.query(`
            SELECT
                d.id_dieta,
                d.nombre,
                d.descripcion,
                d.objetivo,
                CONCAT(e.nombre, ' ', e.apellido) AS entrenador
            FROM dietas d
            JOIN entrenadores e ON d.entrenador_id = e.id_entrenador
            WHERE d.estado = 'activa'
            ORDER BY d.nombre
        `);

        res.json(data);
    } catch (err) {
        console.error('Error al cargar dietas:', err);
        res.status(500).json({ error: 'Error al cargar dietas' });
    }
};

// =====================================================
// ASIGNAR DIETA AL USUARIO
// =====================================================
exports.asignarDieta = async (req, res) => {
    const { cedula, dieta_id, id_usuario } = req.body;

    try {
        let usuarioId = id_usuario || null;

        if (!usuarioId) {
            usuarioId = await obtenerUsuarioIdPorCedula(cedula);
            if (!usuarioId) {
                return res.status(404).json({ error: 'Usuario no encontrado' });
            }
        }

        const [actual] = await db.query(`
            SELECT dieta_id
            FROM usuarios_dietas
            WHERE usuario_id = ? AND estado = 'activa'
            ORDER BY fecha_asignacion DESC
            LIMIT 1
        `, [usuarioId]);

        if (actual.length > 0 && Number(actual[0].dieta_id) === Number(dieta_id)) {
            return res.json({ mensaje: 'La dieta ya está activa' });
        }

        await db.query(`
            UPDATE usuarios_dietas
            SET estado = 'inactiva'
            WHERE usuario_id = ? AND estado = 'activa'
        `, [usuarioId]);

        await db.query(`
            INSERT INTO usuarios_dietas (usuario_id, dieta_id, estado)
            VALUES (?, ?, 'activa')
        `, [usuarioId, dieta_id]);

        res.json({ mensaje: 'Dieta asignada con éxito' });
    } catch (err) {
        console.error('Error al asignar dieta:', err);
        res.status(500).json({ error: 'Error al asignar la dieta' });
    }
};

// =====================================================
// PROGRESO DEL USUARIO (con racha corregida)
// =====================================================
// =====================================================
// PROGRESO DEL USUARIO (con racha CORREGIDA)
// =====================================================
exports.getProgreso = async (req, res) => {
    const { cedula } = req.params;

    try {
        const usuarioId = await obtenerUsuarioIdPorCedula(cedula);

        if (!usuarioId) {
            return res.status(404).json({ error: 'Usuario no existe' });
        }

        // --- Asistencia del mes actual (porcentaje) ---
        const [asistenciaRows] = await db.query(`
            SELECT COUNT(DISTINCT fecha) AS total
            FROM asistencia
            WHERE usuario_id = ?
              AND YEAR(fecha) = YEAR(CURDATE())
              AND MONTH(fecha) = MONTH(CURDATE())
        `, [usuarioId]);

        const asistenciaMes = Number(asistenciaRows[0]?.total || 0);
        const diaDelMes = new Date().getDate();
        const porcentajeAsistencia = Math.min(100, Math.round((asistenciaMes / diaDelMes) * 100));

        // --- RACHA CORREGIDA ---
        // Obtener todas las fechas de asistencia como DATE (sin hora)
        const [fechasRows] = await db.query(`
            SELECT DISTINCT DATE(fecha) as fecha
            FROM asistencia
            WHERE usuario_id = ?
            ORDER BY fecha DESC
        `, [usuarioId]);

        let racha = 0;
        
        if (fechasRows.length > 0) {
            // Fecha de hoy sin hora
            const hoy = new Date();
            hoy.setHours(0, 0, 0, 0);
            
            // Fecha esperada para comparar (empezamos desde hoy)
            let fechaEsperada = new Date(hoy);
            
            // Verificar si el usuario asistió hoy
            const fechaHoyStr = hoy.toISOString().split('T')[0];
            const asisitioHoy = fechasRows.some(r => {
                const fechaRow = new Date(r.fecha);
                fechaRow.setHours(0, 0, 0, 0);
                return fechaRow.getTime() === hoy.getTime();
            });
            
            // Si NO asistió hoy, empezamos a contar desde ayer
            if (!asisitioHoy) {
                fechaEsperada.setDate(fechaEsperada.getDate() - 1);
            }
            
            // Recorrer las fechas de asistencia y contar racha
            for (const fila of fechasRows) {
                const fechaActual = new Date(fila.fecha);
                fechaActual.setHours(0, 0, 0, 0);
                
                if (fechaActual.getTime() === fechaEsperada.getTime()) {
                    racha++;
                    fechaEsperada.setDate(fechaEsperada.getDate() - 1);
                } else {
                    break; // Se rompió la racha
                }
            }
        }

        // --- Rutina de hoy ---
        const [rutinaRows] = await db.query(`
            SELECT r.nombre
            FROM usuarios_rutinas ur
            JOIN rutinas r ON ur.rutina_id = r.id_rutina
            WHERE ur.usuario_id = ?
              AND ur.estado = 'activa'
              AND ur.dia_id = CASE
                  WHEN DAYOFWEEK(CURDATE()) = 1 THEN 7
                  ELSE DAYOFWEEK(CURDATE()) - 1
              END
            LIMIT 1
        `, [usuarioId]);

        // --- Dieta activa ---
        const [dietaRows] = await db.query(`
            SELECT d.nombre
            FROM usuarios_dietas ud
            JOIN dietas d ON ud.dieta_id = d.id_dieta
            WHERE ud.usuario_id = ?
              AND ud.estado = 'activa'
            ORDER BY ud.fecha_asignacion DESC
            LIMIT 1
        `, [usuarioId]);

        let nivel = 'Bajo';
        if (porcentajeAsistencia >= 75) nivel = 'Alto';
        else if (porcentajeAsistencia >= 40) nivel = 'Medio';

        res.json({
            asistenciaMes: porcentajeAsistencia,
            nivel,
            racha,
            rutina: rutinaRows[0]?.nombre || 'Descanso o sin asignar',
            dieta: dietaRows[0]?.nombre || 'Sin dieta asignada'
        });
    } catch (err) {
        console.error('Error al obtener progreso:', err);
        res.status(500).json({ error: 'Error al obtener progreso' });
    }
};
// =====================================================
// CLASES DISPONIBLES (incluye clases inactivas si el usuario está inscrito)
// =====================================================
exports.getClases = async (req, res) => {
    const { cedula } = req.query;

    try {
        let usuarioId = -1;

        if (cedula) {
            usuarioId = await obtenerUsuarioIdPorCedula(cedula) || -1;
        }

        // Consulta que incluye clases activas (siempre) y clases inactivas donde el usuario esté inscrito
        const [data] = await db.query(`
            SELECT
                c.id_clase,
                c.nombre,
                c.descripcion,
                c.hora_inicio,
                c.hora_fin,
                c.cupo_maximo,
                c.estado AS estado_clase,
                CONCAT(e.nombre, ' ', e.apellido) AS coach,
                GROUP_CONCAT(DISTINCT d.nombre_dia ORDER BY d.id_dia SEPARATOR ', ') AS dias,
                COUNT(DISTINCT uc.usuario_id) AS inscritos,
                CASE
                    WHEN c.cupo_maximo IS NULL OR c.cupo_maximo = 0 THEN 1
                    WHEN COUNT(DISTINCT uc.usuario_id) < c.cupo_maximo THEN 1
                    ELSE 0
                END AS cupo_disponible,
                CASE
                    WHEN TIME(NOW()) < c.hora_inicio THEN 1
                    ELSE 0
                END AS puede_inscribirse,
                CASE
                    WHEN ucl.usuario_id IS NULL THEN 0
                    ELSE 1
                END AS ya_inscrito
            FROM clases c
            JOIN entrenadores e ON c.entrenador_id = e.id_entrenador
            LEFT JOIN clase_dias cd ON c.id_clase = cd.clase_id
            LEFT JOIN dias d ON cd.dia_id = d.id_dia
            LEFT JOIN usuarios_clases uc ON c.id_clase = uc.clase_id AND uc.estado = 'activa'
            LEFT JOIN usuarios_clases ucl ON c.id_clase = ucl.clase_id AND ucl.usuario_id = ? AND ucl.estado = 'activa'
            WHERE 
                c.estado = 'activa' 
                OR (c.estado = 'inactiva' AND ucl.usuario_id IS NOT NULL) -- incluye inactivas si el usuario está inscrito
            GROUP BY c.id_clase, c.nombre, c.descripcion, c.hora_inicio, c.hora_fin, c.cupo_maximo, coach, ucl.usuario_id, c.estado
            ORDER BY 
                c.estado DESC, -- primero activas, luego inactivas
                c.nombre
        `, [usuarioId]);

        const clasesConCancelacion = await Promise.all(
            data.map(async (clase) => {
                if (!clase.ya_inscrito || clase.estado_clase !== 'activa') {
                    return { ...clase, puede_cancelar: 0 };
                }
                const evaluacion = await evaluarCancelacionClase(clase.id_clase);
                return { ...clase, puede_cancelar: evaluacion.permitido ? 1 : 0 };
            })
        );

        res.json(clasesConCancelacion);
    } catch (err) {
        console.error('Error al cargar clases:', err);
        res.status(500).json({ error: 'Error al cargar clases' });
    }
};

// =====================================================
// INSCRIBIRSE A CLASE
// =====================================================
exports.inscribirClase = async (req, res) => {
    const { cedula, clase_id, id_usuario } = req.body;

    try {
        let usuarioId = id_usuario || null;

        if (!usuarioId) {
            usuarioId = await obtenerUsuarioIdPorCedula(cedula);
            if (!usuarioId) {
                return res.status(404).json({ error: 'Usuario no encontrado' });
            }
        }

        // Verificar que la clase esté activa antes de inscribir
        const [claseRows] = await db.query(`
            SELECT id_clase, hora_inicio, cupo_maximo, estado
            FROM clases
            WHERE id_clase = ?
            LIMIT 1
        `, [clase_id]);

        if (claseRows.length === 0) {
            return res.status(404).json({ error: 'Clase no encontrada' });
        }

        const clase = claseRows[0];
        if (clase.estado !== 'activa') {
            return res.status(400).json({ error: 'Esta clase ya no está disponible (fue cancelada por el entrenador).' });
        }

        const horaActual = new Date().toTimeString().slice(0, 8);
        if (horaActual >= String(clase.hora_inicio).slice(0, 8)) {
            return res.status(400).json({
                error: 'Solo puedes inscribirte antes de la hora de inicio'
            });
        }

        const [existente] = await db.query(`
            SELECT id_usuario_clase
            FROM usuarios_clases
            WHERE usuario_id = ? AND clase_id = ? AND estado = 'activa'
            LIMIT 1
        `, [usuarioId, clase_id]);

        if (existente.length > 0) {
            return res.status(400).json({ error: 'Ya estás inscrito en esta clase' });
        }

        const [conteo] = await db.query(`
            SELECT COUNT(*) AS total
            FROM usuarios_clases
            WHERE clase_id = ? AND estado = 'activa'
        `, [clase_id]);

        const inscritos = Number(conteo[0]?.total || 0);

        if (clase.cupo_maximo && inscritos >= clase.cupo_maximo) {
            return res.status(400).json({ error: 'La clase ya completó su cupo' });
        }

        await db.query(`
            INSERT INTO usuarios_clases (usuario_id, clase_id, estado)
            VALUES (?, ?, 'activa')
        `, [usuarioId, clase_id]);

        res.json({ mensaje: 'Inscripción registrada con éxito' });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Ya estás inscrito en esta clase' });
        }

        console.error('Error al inscribirse en la clase:', err);
        res.status(500).json({ error: 'Error al inscribirse en la clase' });
    }
};

// =====================================================
// CANCELAR INSCRIPCIÓN A CLASE (libera cupo)
// =====================================================
exports.cancelarClase = async (req, res) => {
    const { cedula, clase_id, id_usuario } = req.body;

    try {
        let usuarioId = id_usuario || null;

        if (!usuarioId) {
            usuarioId = await obtenerUsuarioIdPorCedula(cedula);
            if (!usuarioId) {
                return res.status(404).json({ error: 'Usuario no encontrado' });
            }
        }

        const [inscripcion] = await db.query(`
            SELECT usuario_id
            FROM usuarios_clases
            WHERE usuario_id = ? AND clase_id = ? AND estado = 'activa'
            LIMIT 1
        `, [usuarioId, clase_id]);

        if (inscripcion.length === 0) {
            return res.status(400).json({ error: 'No tienes una inscripción activa en esta clase' });
        }

        const evaluacion = await evaluarCancelacionClase(clase_id);
        if (!evaluacion.permitido) {
            return res.status(400).json({ error: evaluacion.error });
        }

        try {
            await db.query(`
                UPDATE usuarios_clases
                SET estado = 'cancelada'
                WHERE usuario_id = ? AND clase_id = ? AND estado = 'activa'
            `, [usuarioId, clase_id]);
        } catch (updateErr) {
            if (updateErr.code === 'WARN_DATA_TRUNCATED' || updateErr.code === 'ER_TRUNCATED_WRONG_VALUE') {
                await db.query(`
                    UPDATE usuarios_clases
                    SET estado = 'inactiva'
                    WHERE usuario_id = ? AND clase_id = ? AND estado = 'activa'
                `, [usuarioId, clase_id]);
            } else {
                throw updateErr;
            }
        }

        res.json({ mensaje: 'Inscripción cancelada. El cupo quedó disponible.' });
    } catch (err) {
        console.error('Error al cancelar clase:', err);
        res.status(500).json({ error: err.message || 'Error al cancelar la inscripción' });
    }
};