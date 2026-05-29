const db = require('../config/db');
console.log('📦 Controlador de entrenador cargado');

// ==================== REGISTRO ====================
exports.registrarEntrenador = async (req, res) => {
    const { cedula, nombre, apellido, telefono, correo, especialidad } = req.body;
    try {
        const [result] = await db.query(
            `INSERT INTO entrenadores (cedula, nombre, apellido, telefono, correo, especialidad, estado)
             VALUES (?, ?, ?, ?, ?, ?, 'activo')`,
            [cedula, nombre, apellido, telefono, correo, especialidad || null]
        );
        res.status(201).json({ mensaje: 'Entrenador registrado', id: result.insertId });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'La cédula o correo ya existe' });
        }
        console.error(err);
        res.status(500).json({ error: 'Error al registrar entrenador' });
    }
};

// ==================== SUPERVISIÓN ====================
exports.getSupervision = async (req, res) => {
    const entrenadorId = req.query.entrenadorId;
    if (!entrenadorId) {
        return res.status(400).json({ error: 'Falta el ID del entrenador' });
    }

    // Verificar que el entrenador existe
    const [existe] = await db.query('SELECT id_entrenador FROM entrenadores WHERE id_entrenador = ?', [entrenadorId]);
    if (existe.length === 0) {
        return res.status(404).json({ error: 'Entrenador no encontrado' });
    }

    try {
        // Total de usuarios activos
        const [totalUsuarios] = await db.query(`SELECT COUNT(*) AS total FROM usuarios WHERE estado = 'activo'`);
        const usuariosActivos = totalUsuarios[0].total;

        // Asistencias de hoy
        const [asistenciasHoy] = await db.query(
            'SELECT COUNT(DISTINCT usuario_id) AS total FROM asistencia WHERE fecha = CURDATE()'
        );
        const asistenciasHoyCount = asistenciasHoy[0].total;

        // Lista de usuarios con nivel calculado
        const [usuarios] = await db.query(`
            SELECT u.id_usuario, u.nombre, u.apellido,
                   (SELECT COUNT(*) FROM asistencia a WHERE a.usuario_id = u.id_usuario AND MONTH(a.fecha) = MONTH(CURDATE())) as asistencias_mes,
                   (SELECT MAX(fecha) FROM asistencia a WHERE a.usuario_id = u.id_usuario) as ultima_asistencia
            FROM usuarios u
            WHERE u.estado = 'activo'
        `);

        const hoy = new Date();
        const diasDelMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate();
        const listaUsuarios = usuarios.map(u => {
            let asistenciasMes = u.asistencias_mes || 0;
            let porcentaje = diasDelMes ? Math.min(100, Math.round((asistenciasMes / diasDelMes) * 100)) : 0;
            let nivel = 'Bajo';
            if (porcentaje >= 75) nivel = 'Alto';
            else if (porcentaje >= 40) nivel = 'Medio';
            return {
                id_usuario: u.id_usuario,
                nombre: u.nombre,
                apellido: u.apellido,
                nivel,
                ultimaAsistencia: u.ultima_asistencia ? new Date(u.ultima_asistencia).toLocaleDateString() : 'Sin registro'
            };
        });

        res.json({
            usuariosActivos,
            asistenciasHoy: asistenciasHoyCount,
            listaUsuarios
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener datos de supervisión' });
    }
};

// ==================== REPORTES (NUEVO) ====================
exports.getReportes = async (req, res) => {
    const { entrenadorId, tipo, periodo, usuarioId } = req.query;

    if (!entrenadorId) {
        return res.status(400).json({ error: 'ID del entrenador requerido' });
    }

    // Determinar intervalo en días según período
    let intervaloDias = 30; // mensual por defecto
    if (periodo === 'semanal') intervaloDias = 7;
    else if (periodo === 'trimestral') intervaloDias = 90;
    else if (periodo === 'anual') intervaloDias = 365;

    try {
        // 1. Obtener usuarios asociados a este entrenador (a través de rutinas o dietas)
        let usuariosQuery = `
            SELECT DISTINCT 
                u.id_usuario, u.nombre, u.apellido, u.cedula, u.objetivo_general, u.estado,
                (SELECT COUNT(*) FROM asistencia WHERE usuario_id = u.id_usuario AND fecha >= DATE_SUB(CURDATE(), INTERVAL ? DAY)) as asistencias_periodo,
                (SELECT MAX(fecha) FROM asistencia WHERE usuario_id = u.id_usuario) as ultima_asistencia
            FROM usuarios u
            LEFT JOIN usuarios_rutinas ur ON u.id_usuario = ur.usuario_id
            LEFT JOIN usuarios_dietas ud ON u.id_usuario = ud.usuario_id
            LEFT JOIN rutinas r ON ur.rutina_id = r.id_rutina
            LEFT JOIN dietas d ON ud.dieta_id = d.id_dieta
            WHERE (r.entrenador_id = ? OR d.entrenador_id = ?)
        `;
        const params = [intervaloDias, entrenadorId, entrenadorId];

        if (usuarioId) {
            usuariosQuery += ' AND u.id_usuario = ?';
            params.push(usuarioId);
        }
        usuariosQuery += ' GROUP BY u.id_usuario';

        const [usuarios] = await db.query(usuariosQuery, params);

        if (usuarios.length === 0) {
            return res.json({
                totalUsuarios: 0,
                tasaAsistencia: 0,
                usuariosActivos: 0,
                promedioAsistencia: 0,
                detalleUsuarios: [],
                asistenciasPorPeriodo: [],
                fechas: [],
                nombresPlanes: [],
                rendimientoPlanes: [],
                comparativaMensual: [],
                meses: []
            });
        }

        // Calcular estadísticas generales
        let usuariosActivos = 0;
        let sumaAsistencias = 0;
        const detalle = usuarios.map(u => {
            const asistencias = u.asistencias_periodo || 0;
            sumaAsistencias += asistencias;
            // Activo si tiene al menos 2 asistencias por semana (aprox)
            const esActivo = asistencias >= (intervaloDias / 7) * 2;
            if (esActivo) usuariosActivos++;

            // Progreso basado en asistencia (máx 100%)
            let progreso = Math.min(100, Math.round((asistencias / (intervaloDias * 0.6)) * 100));
            if (progreso === 0) progreso = 5; // mínimo 5%

            // Rendimiento: combinación de asistencia
            let rendimiento = Math.min(100, Math.round((asistencias / (intervaloDias * 0.7)) * 100));

            return {
                id_usuario: u.id_usuario,
                nombre: u.nombre,
                apellido: u.apellido,
                asistencias: asistencias,
                progreso: progreso,
                rendimiento: rendimiento,
                ultimaActividad: u.ultima_asistencia ? new Date(u.ultima_asistencia).toLocaleDateString() : 'Sin actividad'
            };
        });

        const totalUsuarios = usuarios.length;
        const promedioAsistencia = totalUsuarios > 0 ? Math.round(sumaAsistencias / totalUsuarios) : 0;
        const tasaAsistencia = totalUsuarios > 0 ? Math.round((usuariosActivos / totalUsuarios) * 100) : 0;

        // 2. Datos para gráficos según tipo
        let asistenciasPorPeriodo = [];
        let fechas = [];
        let nombresPlanes = [];
        let rendimientoPlanes = [];
        let comparativaMensual = [];
        let meses = [];

        if (tipo === 'asistencias' || tipo === 'progreso') {
            // Agrupar asistencias por fecha
            const [asistenciasAgrupadas] = await db.query(`
                SELECT 
                    DATE(fecha) as fecha,
                    COUNT(*) as total
                FROM asistencia a
                JOIN usuarios u ON a.usuario_id = u.id_usuario
                JOIN usuarios_rutinas ur ON u.id_usuario = ur.usuario_id
                JOIN rutinas r ON ur.rutina_id = r.id_rutina
                WHERE r.entrenador_id = ? 
                    AND a.fecha >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
                GROUP BY DATE(fecha)
                ORDER BY fecha ASC
            `, [entrenadorId, intervaloDias]);

            fechas = asistenciasAgrupadas.map(a => {
                const d = new Date(a.fecha);
                return `${d.getDate()}/${d.getMonth()+1}`;
            });
            asistenciasPorPeriodo = asistenciasAgrupadas.map(a => a.total);
        }

        if (tipo === 'rendimiento') {
            const [planes] = await db.query(`
                SELECT 
                    r.objetivo as plan,
                    COUNT(DISTINCT ur.usuario_id) as usuarios_activos
                FROM rutinas r
                JOIN usuarios_rutinas ur ON r.id_rutina = ur.rutina_id
                WHERE r.entrenador_id = ? AND ur.estado = 'activa'
                GROUP BY r.objetivo
                LIMIT 5
            `, [entrenadorId]);

            nombresPlanes = planes.map(p => p.plan);
            const maxUsuarios = Math.max(...planes.map(p => p.usuarios_activos), 1);
            rendimientoPlanes = planes.map(p => Math.round((p.usuarios_activos / maxUsuarios) * 100));
        }

        if (tipo === 'comparativa') {
            const [mensual] = await db.query(`
                SELECT 
                    DATE_FORMAT(fecha, '%Y-%m') as mes,
                    COUNT(*) as total_asistencias
                FROM asistencia a
                JOIN usuarios u ON a.usuario_id = u.id_usuario
                JOIN usuarios_rutinas ur ON u.id_usuario = ur.usuario_id
                JOIN rutinas r ON ur.rutina_id = r.id_rutina
                WHERE r.entrenador_id = ? 
                    AND a.fecha >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
                GROUP BY DATE_FORMAT(fecha, '%Y-%m')
                ORDER BY mes ASC
            `, [entrenadorId]);

            meses = mensual.map(m => {
                const [year, month] = m.mes.split('-');
                return new Date(year, month-1).toLocaleString('es', { month: 'short' });
            });
            comparativaMensual = mensual.map(m => m.total_asistencias);
        }

        res.json({
            totalUsuarios,
            tasaAsistencia,
            usuariosActivos,
            promedioAsistencia,
            detalleUsuarios: detalle,
            asistenciasPorPeriodo,
            fechas,
            nombresPlanes,
            rendimientoPlanes,
            comparativaMensual,
            meses
        });

    } catch (err) {
        console.error('Error en reportes:', err);
        res.status(500).json({ error: 'Error interno al generar reporte' });
    }
};
console.log('✅ getReportes definido correctamente');
// ==================== CLASES ====================
exports.crearClase = async (req, res) => {
    const { nombre, dia_id, hora_inicio, hora_fin, cupo_maximo, entrenador_id } = req.body;

    if (!nombre || !dia_id || !hora_inicio || !hora_fin || !entrenador_id) {
        return res.status(400).json({ error: 'Faltan datos obligatorios' });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const [result] = await connection.query(
            `INSERT INTO clases (nombre, entrenador_id, cupo_maximo, hora_inicio, hora_fin, estado)
             VALUES (?, ?, ?, ?, ?, 'activa')`,
            [nombre, entrenador_id, cupo_maximo || null, hora_inicio, hora_fin]
        );
        const claseId = result.insertId;

        await connection.query(
            `INSERT INTO clase_dias (clase_id, dia_id) VALUES (?, ?)`,
            [claseId, dia_id]
        );

        await connection.commit();
        res.status(201).json({ mensaje: 'Clase creada exitosamente', id_clase: claseId });
    } catch (err) {
        await connection.rollback();
        console.error(err);
        res.status(500).json({ error: 'Error al crear la clase' });
    } finally {
        connection.release();
    }
};

exports.getMisClases = async (req, res) => {
    const entrenadorId = req.params.id;
    if (!entrenadorId) {
        return res.status(400).json({ error: 'ID de entrenador requerido' });
    }

    try {
        const [clases] = await db.query(`
            SELECT c.id_clase, c.nombre, c.hora_inicio, c.hora_fin, c.cupo_maximo, c.estado,
                   GROUP_CONCAT(DISTINCT d.nombre_dia ORDER BY d.id_dia SEPARATOR ', ') AS dias,
                   (SELECT COUNT(*) FROM usuarios_clases WHERE clase_id = c.id_clase AND estado = 'activa') AS inscritos
            FROM clases c
            LEFT JOIN clase_dias cd ON c.id_clase = cd.clase_id
            LEFT JOIN dias d ON cd.dia_id = d.id_dia
            WHERE c.entrenador_id = ?
            GROUP BY c.id_clase
            ORDER BY c.id_clase DESC
        `, [entrenadorId]);

        res.json(clases);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener clases' });
    }
};

exports.cambiarEstadoClase = async (req, res) => {
    const { claseId } = req.params;
    const { estado } = req.body;

    if (!['activa', 'inactiva'].includes(estado)) {
        return res.status(400).json({ error: 'Estado no válido' });
    }

    try {
        await db.query('UPDATE clases SET estado = ? WHERE id_clase = ?', [estado, claseId]);
        res.json({ mensaje: `Clase ${estado === 'activa' ? 'habilitada' : 'deshabilitada'} correctamente` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al cambiar estado' });
    }
};

// ==================== RUTINAS ====================
exports.crearRutina = async (req, res) => {
    const { nombre, descripcion, nivel, grupo_muscular, objetivo, duracion_semanas, entrenador_id } = req.body;

    if (!nombre || !descripcion || !nivel || !grupo_muscular || !objetivo || !entrenador_id) {
        return res.status(400).json({ error: 'Faltan datos obligatorios' });
    }

    try {
        const [result] = await db.query(
            `INSERT INTO rutinas (nombre, descripcion, nivel, grupo_muscular, objetivo, duracion_semanas, entrenador_id, estado)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'activa')`,
            [nombre, descripcion, nivel, grupo_muscular, objetivo, duracion_semanas || null, entrenador_id]
        );
        res.status(201).json({ mensaje: 'Rutina publicada', id_rutina: result.insertId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al crear rutina' });
    }
};

// ==================== DIETAS ====================
exports.crearDieta = async (req, res) => {
    const { nombre, descripcion, objetivo, entrenador_id } = req.body;

    if (!nombre || !descripcion || !objetivo || !entrenador_id) {
        return res.status(400).json({ error: 'Faltan datos obligatorios' });
    }

    try {
        const [result] = await db.query(
            `INSERT INTO dietas (nombre, descripcion, objetivo, entrenador_id, estado)
             VALUES (?, ?, ?, ?, 'activa')`,
            [nombre, descripcion, objetivo, entrenador_id]
        );
        res.status(201).json({ mensaje: 'Dieta publicada', id_dieta: result.insertId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al crear dieta' });
    }
};
exports.getEvolucionPeso = async (req, res) => {
    const { entrenadorId, usuarioId } = req.query;
    if (!entrenadorId) return res.status(400).json({ error: 'Entrenador ID requerido' });

    try {
        let query = `
            SELECT DATE(sm.fecha) as fecha, AVG(sm.peso) as peso_promedio
            FROM seguimiento_medidas sm
            JOIN usuarios u ON sm.usuario_id = u.id_usuario
            JOIN usuarios_rutinas ur ON u.id_usuario = ur.usuario_id
            JOIN rutinas r ON ur.rutina_id = r.id_rutina
            WHERE r.entrenador_id = ?
        `;
        const params = [entrenadorId];

        if (usuarioId) {
            query += ` AND u.id_usuario = ?`;
            params.push(usuarioId);
        }

        query += ` AND sm.fecha >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)
                   GROUP BY DATE(sm.fecha)
                   ORDER BY fecha ASC`;

        const [data] = await db.query(query, params);
        res.json(data);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener evolución de peso' });
    }
};

// Rendimiento por tipo de plan (objetivo de rutina)
exports.getRendimientoPorPlan = async (req, res) => {
    const { entrenadorId, usuarioId } = req.query;
    if (!entrenadorId) return res.status(400).json({ error: 'Entrenador ID requerido' });

    try {
        let query = `
            SELECT r.objetivo, 
                   AVG((SELECT COUNT(*) FROM asistencia 
                        WHERE usuario_id = u.id_usuario 
                          AND fecha >= DATE_SUB(CURDATE(), INTERVAL 30 DAY))) as asistencias_promedio
            FROM rutinas r
            JOIN usuarios_rutinas ur ON r.id_rutina = ur.rutina_id
            JOIN usuarios u ON ur.usuario_id = u.id_usuario
            WHERE r.entrenador_id = ?
        `;
        const params = [entrenadorId];

        if (usuarioId) {
            query += ` AND u.id_usuario = ?`;
            params.push(usuarioId);
        }

        query += ` GROUP BY r.objetivo
                   ORDER BY asistencias_promedio DESC`;

        const [planes] = await db.query(query, params);
        res.json(planes);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener rendimiento por plan' });
    }
};

// Evolución de peso de un usuario específico (para reportes)
exports.getPesoUsuario = async (req, res) => {
    const { usuarioId } = req.query;
    if (!usuarioId) return res.status(400).json({ error: 'ID de usuario requerido' });

    try {
        const [medidas] = await db.query(`
            SELECT fecha, peso
            FROM seguimiento_medidas
            WHERE usuario_id = ?
            ORDER BY fecha ASC
        `, [usuarioId]);

        if (medidas.length === 0) {
            return res.json({ tendencia: 'sin datos', ultimoPeso: null, primerPeso: null, diferencia: 0 });
        }

        const primerPeso = parseFloat(medidas[0].peso);
        const ultimoPeso = parseFloat(medidas[medidas.length - 1].peso);
        const diferencia = ultimoPeso - primerPeso;
        let tendencia = 'estable';
        if (diferencia < -0.5) tendencia = 'bajando';
        else if (diferencia > 0.5) tendencia = 'subiendo';

        res.json({
            tendencia,
            ultimoPeso,
            primerPeso,
            diferencia: diferencia.toFixed(1),
            historial: medidas.map(m => ({ fecha: m.fecha, peso: parseFloat(m.peso) }))
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener evolución de peso' });
    }
};