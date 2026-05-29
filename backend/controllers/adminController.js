const db = require('../config/db');

// ==================== DASHBOARD / RESÚMEN ====================
exports.getDashboard = async (req, res) => {
    try {
        // ✅ CORREGIDO: Comillas simples para el estado en SQL
        const [totalUsuarios] = await db.query(`SELECT COUNT(*) as total FROM usuarios WHERE estado = 'activo'`);
        const [totalEntrenadores] = await db.query(`SELECT COUNT(*) as total FROM entrenadores WHERE estado = 'activo'`);
        const [totalClases] = await db.query(`SELECT COUNT(*) as total FROM clases WHERE estado = 'activa'`);
        const [totalRutinas] = await db.query(`SELECT COUNT(*) as total FROM rutinas WHERE estado = 'activa'`);

        // Actividad reciente: últimas 5 acciones (puedes definir una tabla logs, pero por ahora usamos asistencias, inscripciones, etc.)
        const [actividad] = await db.query(`
            (SELECT u.nombre AS usuario, 'Registró asistencia' AS accion, a.fecha AS fecha
             FROM asistencia a JOIN usuarios u ON a.usuario_id = u.id_usuario
             ORDER BY a.fecha DESC LIMIT 3)
            UNION
            (SELECT u.nombre AS usuario, 'Se inscribió a una clase' AS accion, uc.fecha_inscripcion AS fecha
             FROM usuarios_clases uc JOIN usuarios u ON uc.usuario_id = u.id_usuario
             ORDER BY uc.fecha_inscripcion DESC LIMIT 2)
            ORDER BY fecha DESC LIMIT 5
        `);

        res.json({
            totalUsuarios: totalUsuarios[0].total,
            totalEntrenadores: totalEntrenadores[0].total,
            totalClases: totalClases[0].total,
            totalRutinas: totalRutinas[0].total,
            actividadReciente: actividad
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener datos del dashboard' });
    }
};

// ==================== USUARIOS ====================
exports.getUsuarios = async (req, res) => {
    try {
        const [usuarios] = await db.query(`
            SELECT u.id_usuario, u.cedula, u.nombre, u.apellido, u.correo, u.telefono, u.estado,
                   (SELECT COUNT(*) FROM membresia_usuario WHERE usuario_id = u.id_usuario AND estado = 'activa') as membresia_activa
            FROM usuarios u
        `);
        res.json(usuarios);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener usuarios' });
    }
};

exports.crearUsuario = async (req, res) => {
    const { cedula, nombre, apellido, telefono, correo, objetivo_general, fecha_nacimiento, sexo } = req.body;
    if (!cedula || !nombre || !apellido || !correo) {
        return res.status(400).json({ error: 'Faltan datos obligatorios' });
    }
    try {
        const [result] = await db.query(
            `INSERT INTO usuarios (cedula, nombre, apellido, telefono, correo, objetivo_general, fecha_nacimiento, sexo, estado)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'activo')`,
            [cedula, nombre, apellido, telefono, correo, objetivo_general || null, fecha_nacimiento || null, sexo || null]
        );
        res.status(201).json({ mensaje: 'Usuario creado', id: result.insertId });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'La cédula o correo ya existe' });
        }
        console.error(err);
        res.status(500).json({ error: 'Error al crear usuario' });
    }
};

exports.actualizarUsuario = async (req, res) => {
    const { id } = req.params;
    const updates = req.body; 

    if (!updates || Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'No hay datos para actualizar' });
    }

    const campos = [];
    const valores = [];
    for (const [key, value] of Object.entries(updates)) {
        let campoDB = key;
        if (key === 'objetivo_general') campoDB = 'objetivo_general';
        if (key === 'id_usuario') continue; 
        campos.push(`${campoDB} = ?`);
        valores.push(value);
    }
    if (campos.length === 0) {
        return res.status(400).json({ error: 'No hay campos válidos para actualizar' });
    }
    valores.push(id);
    const sql = `UPDATE usuarios SET ${campos.join(', ')} WHERE id_usuario = ?`;

    try {
        await db.query(sql, valores);
        res.json({ mensaje: 'Usuario actualizado correctamente' });
    } catch (err) {
        console.error('Error al actualizar usuario:', err);
        res.status(500).json({ error: 'Error al actualizar usuario' });
    }
};

exports.desactivarUsuario = async (req, res) => {
    const { id } = req.params;
    try {
        // ✅ CORREGIDO: Comillas simples en inactivo
        await db.query(`UPDATE usuarios SET estado = 'inactivo' WHERE id_usuario = ?`, [id]);
        res.json({ mensaje: 'Usuario desactivado' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al desactivar usuario' });
    }
};

// ==================== ENTRENADORES ====================
exports.getEntrenadores = async (req, res) => {
    try {
        const [entrenadores] = await db.query('SELECT * FROM entrenadores');
        res.json(entrenadores);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener entrenadores' });
    }
};

exports.crearEntrenador = async (req, res) => {
    const { cedula, nombre, apellido, telefono, correo, especialidad } = req.body;
    if (!cedula || !nombre || !apellido || !correo) {
        return res.status(400).json({ error: 'Faltan datos obligatorios' });
    }
    try {
        const [result] = await db.query(
            `INSERT INTO entrenadores (cedula, nombre, apellido, telefono, correo, especialidad, estado)
             VALUES (?, ?, ?, ?, ?, ?, 'activo')`,
            [cedula, nombre, apellido, telefono, correo, especialidad || null]
        );
        res.status(201).json({ mensaje: 'Entrenador creado', id: result.insertId });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'La cédula o correo ya existe' });
        }
        console.error(err);
        res.status(500).json({ error: 'Error al crear entrenador' });
    }
};

exports.actualizarEntrenador = async (req, res) => {
    const { id } = req.params;
    const updates = req.body;

    if (!updates || Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'No hay datos para actualizar' });
    }

    const campos = [];
    const valores = [];
    for (const [key, value] of Object.entries(updates)) {
        if (key === 'id_entrenador') continue;
        campos.push(`${key} = ?`);
        valores.push(value);
    }
    if (campos.length === 0) {
        return res.status(400).json({ error: 'No hay campos válidos' });
    }
    valores.push(id);
    const sql = `UPDATE entrenadores SET ${campos.join(', ')} WHERE id_entrenador = ?`;

    try {
        await db.query(sql, valores);
        res.json({ mensaje: 'Entrenador actualizado correctamente' });
    } catch (err) {
        console.error('Error al actualizar entrenador:', err);
        res.status(500).json({ error: 'Error al actualizar entrenador' });
    }
};

exports.desactivarEntrenador = async (req, res) => {
    const { id } = req.params;
    try {
        // ✅ CORREGIDO: Comillas simples en inactivo
        await db.query(`UPDATE entrenadores SET estado = 'inactivo' WHERE id_entrenador = ?`, [id]);
        res.json({ mensaje: 'Entrenador desactivado' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al desactivar entrenador' });
    }
};

// ==================== RUTINAS ====================
exports.getRutinas = async (req, res) => {
    try {
        const [rutinas] = await db.query(`
            SELECT r.*, e.nombre AS entrenador_nombre
            FROM rutinas r
            JOIN entrenadores e ON r.entrenador_id = e.id_entrenador
        `);
        res.json(rutinas);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener rutinas' });
    }
};

exports.crearRutina = async (req, res) => {
    const { nombre, descripcion, nivel, grupo_muscular, objetivo, duracion_semanas, entrenador_id } = req.body;
    if (!nombre || !nivel || !grupo_muscular || !objetivo || !entrenador_id) {
        return res.status(400).json({ error: 'Faltan datos obligatorios' });
    }
    try {
        const [result] = await db.query(
            `INSERT INTO rutinas (nombre, descripcion, nivel, grupo_muscular, objetivo, duracion_semanas, entrenador_id, estado)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'activa')`,
            [nombre, descripcion, nivel, grupo_muscular, objetivo, duracion_semanas, entrenador_id]
        );
        res.status(201).json({ mensaje: 'Rutina creada', id: result.insertId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al crear rutina' });
    }
};

exports.actualizarRutina = async (req, res) => {
    const { id } = req.params;
    const { nombre, descripcion, nivel, grupo_muscular, objetivo, duracion_semanas, entrenador_id, estado } = req.body;
    try {
        await db.query(
            `UPDATE rutinas SET nombre = ?, descripcion = ?, nivel = ?, grupo_muscular = ?, objetivo = ?, duracion_semanas = ?, entrenador_id = ?, estado = ? WHERE id_rutina = ?`,
            [nombre, descripcion, nivel, grupo_muscular, objetivo, duracion_semanas, entrenador_id, estado, id]
        );
        res.json({ mensaje: 'Rutina actualizada' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al actualizar rutina' });
    }
};

exports.eliminarRutina = async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM rutinas WHERE id_rutina = ?', [id]);
        res.json({ mensaje: 'Rutina eliminada' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al eliminar rutina' });
    }
};

// ==================== CLASES ====================
exports.getClases = async (req, res) => {
    try {
        const [clases] = await db.query(`
            SELECT c.*, e.nombre AS entrenador_nombre,
                   (SELECT COUNT(*) FROM usuarios_clases WHERE clase_id = c.id_clase AND estado = 'activa') as inscritos
            FROM clases c
            JOIN entrenadores e ON c.entrenador_id = e.id_entrenador
        `);
        res.json(clases);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener clases' });
    }
};

exports.crearClase = async (req, res) => {
    const { nombre, descripcion, entrenador_id, cupo_maximo, hora_inicio, hora_fin, dias } = req.body; 
    if (!nombre || !entrenador_id || !hora_inicio || !hora_fin || !dias || dias.length === 0) {
        return res.status(400).json({ error: 'Faltan datos obligatorios' });
    }
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const [result] = await connection.query(
            `INSERT INTO clases (nombre, descripcion, entrenador_id, cupo_maximo, hora_inicio, hora_fin, estado)
             VALUES (?, ?, ?, ?, ?, ?, 'activa')`,
            [nombre, descripcion, entrenador_id, cupo_maximo, hora_inicio, hora_fin]
        );
        const claseId = result.insertId;
        for (let dia_id of dias) {
            await connection.query(`INSERT INTO clase_dias (clase_id, dia_id) VALUES (?, ?)`, [claseId, dia_id]);
        }
        await connection.commit();
        res.status(201).json({ mensaje: 'Clase creada', id: claseId });
    } catch (err) {
        await connection.rollback();
        console.error(err);
        res.status(500).json({ error: 'Error al crear clase' });
    } finally {
        connection.release();
    }
};

exports.actualizarClase = async (req, res) => {
    const { id } = req.params;
    const { nombre, descripcion, entrenador_id, cupo_maximo, hora_inicio, hora_fin, estado, dias } = req.body;
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        await connection.query(
            `UPDATE clases SET nombre = ?, descripcion = ?, entrenador_id = ?, cupo_maximo = ?, hora_inicio = ?, hora_fin = ?, estado = ? WHERE id_clase = ?`,
            [nombre, descripcion, entrenador_id, cupo_maximo, hora_inicio, hora_fin, estado, id]
        );
        if (dias) {
            await connection.query(`DELETE FROM clase_dias WHERE clase_id = ?`, [id]);
            for (let dia_id of dias) {
                await connection.query(`INSERT INTO clase_dias (clase_id, dia_id) VALUES (?, ?)`, [id, dia_id]);
            }
        }
        await connection.commit();
        res.json({ mensaje: 'Clase actualizada' });
    } catch (err) {
        await connection.rollback();
        console.error(err);
        res.status(500).json({ error: 'Error al actualizar clase' });
    } finally {
        connection.release();
    }
};

exports.eliminarClase = async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM clases WHERE id_clase = ?', [id]);
        res.json({ mensaje: 'Clase eliminada' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al eliminar clase' });
    }
};

// ==================== MEMBRESÍAS ====================
exports.getTiposMembresia = async (req, res) => {
    try {
        const [tipos] = await db.query('SELECT * FROM tipo_mensualidad');
        res.json(tipos);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener tipos de membresía' });
    }
};

exports.crearTipoMembresia = async (req, res) => {
    const { nombre, duracion_meses, descripcion } = req.body;
    if (!nombre || !duracion_meses) {
        return res.status(400).json({ error: 'Faltan datos obligatorios' });
    }
    try {
        const [result] = await db.query(
            `INSERT INTO tipo_mensualidad (nombre, duracion_meses, descripcion) VALUES (?, ?, ?)`,
            [nombre, duracion_meses, descripcion || null]
        );
        res.status(201).json({ mensaje: 'Tipo de membresía creado', id: result.insertId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al crear tipo de membresía' });
    }
};

exports.getMembresiasUsuario = async (req, res) => {
    try {
        const [membresias] = await db.query(`
            SELECT mu.*, u.nombre AS usuario_nombre, tm.nombre AS tipo_nombre
            FROM membresia_usuario mu
            JOIN usuarios u ON mu.usuario_id = u.id_usuario
            JOIN tipo_mensualidad tm ON mu.tipo_mensualidad_id = tm.id_tipo_mensualidad
        `);
        res.json(membresias);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener membresías de usuarios' });
    }
};

exports.asignarMembresia = async (req, res) => {
    const { usuario_id, tipo_mensualidad_id, fecha_inicio, fecha_fin } = req.body;
    if (!usuario_id || !tipo_mensualidad_id || !fecha_inicio || !fecha_fin) {
        return res.status(400).json({ error: 'Faltan datos' });
    }
    try {
        await db.query(
            `INSERT INTO membresia_usuario (usuario_id, tipo_mensualidad_id, fecha_inicio, fecha_fin, estado)
             VALUES (?, ?, ?, ?, 'activa')`,
            [usuario_id, tipo_mensualidad_id, fecha_inicio, fecha_fin]
        );
        res.status(201).json({ mensaje: 'Membresía asignada' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al asignar membresía' });
    }
};

// ==================== REPORTES ====================
exports.getReportes = async (req, res) => {
    try {
        const [usuariosPorMes] = await db.query(`
            SELECT DATE_FORMAT(fecha_registro, '%Y-%m') as mes, COUNT(*) as total
            FROM usuarios
            WHERE fecha_registro >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
            GROUP BY DATE_FORMAT(fecha_registro, '%Y-%m')
            ORDER BY mes ASC
        `);
        const [asistenciasPromedio] = await db.query(`
            SELECT AVG(asistencias_diarias) as promedio
            FROM (
                SELECT COUNT(*) as asistencias_diarias
                FROM asistencia
                WHERE fecha >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
                GROUP BY fecha
            ) AS diarias
        `);
        res.json({
            usuariosPorMes,
            asistenciasPromedio: asistenciasPromedio[0].promedio || 0
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener reportes' });
    }
};

exports.getReportesAvanzados = async (req, res) => {
    try {
        const hoy = new Date().toISOString().slice(0, 10);
        const hace30 = new Date();
        hace30.setDate(hace30.getDate() - 30);
        const defaultDesde = hace30.toISOString().slice(0, 10);

        const fechaDesde = req.query.fechaDesde || defaultDesde;
        const fechaHasta = req.query.fechaHasta || hoy;

        if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaDesde) || !/^\d{4}-\d{2}-\d{2}$/.test(fechaHasta)) {
            return res.status(400).json({ error: 'Formato de fecha inválido (YYYY-MM-DD)' });
        }
        if (fechaDesde > fechaHasta) {
            return res.status(400).json({ error: 'La fecha inicial no puede ser mayor que la final' });
        }

        // 1. Métricas generales
        const [[totalUsuarios]] = await db.query('SELECT COUNT(*) as total FROM usuarios');
        
        // ✅ CORREGIDO: Comillas simples para las siguientes consultas de estado
        const [[usuariosActivos]] = await db.query(`SELECT COUNT(*) as total FROM usuarios WHERE estado = 'activo'`);
        const [[usuariosInactivos]] = await db.query(`SELECT COUNT(*) as total FROM usuarios WHERE estado = 'inactivo'`);
        
        const [[totalEntrenadores]] = await db.query('SELECT COUNT(*) as total FROM entrenadores');
        const [[asistenciasPeriodo]] = await db.query(
            'SELECT COUNT(*) as total FROM asistencia WHERE fecha BETWEEN ? AND ?',
            [fechaDesde, fechaHasta]
        );
        const [[nuevosUsuariosPeriodo]] = await db.query(
            'SELECT COUNT(*) as total FROM usuarios WHERE DATE(fecha_registro) BETWEEN ? AND ?',
            [fechaDesde, fechaHasta]
        );
        
        // 2. Tasa de ocupación de clases (inscritos / cupo total)
        const [ocupacionClases] = await db.query(`
            SELECT 
                SUM(inscritos) as total_inscritos,
                SUM(cupo_maximo) as total_cupo,
                ROUND((SUM(inscritos) / NULLIF(SUM(cupo_maximo), 0)) * 100, 2) as porcentaje
            FROM (
                SELECT 
                    c.id_clase,
                    c.cupo_maximo,
                    (SELECT COUNT(*) FROM usuarios_clases WHERE clase_id = c.id_clase AND estado = 'activa') as inscritos
                FROM clases c
                WHERE c.estado = 'activa'
            ) AS sub
        `);
        
        // 3. Rutinas más populares (agrupadas por nombre, sin duplicar por id)
        const [rutinasPopulares] = await db.query(`
            SELECT MIN(r.nombre) AS nombre, COUNT(DISTINCT ur.usuario_id) AS usuarios_asignados
            FROM rutinas r
            JOIN usuarios_rutinas ur ON r.id_rutina = ur.rutina_id
            WHERE ur.estado = 'activa'
            GROUP BY LOWER(TRIM(r.nombre))
            ORDER BY usuarios_asignados DESC
            LIMIT 5
        `);
        
        // 4. Asistencia por día de la semana en el rango de fechas
        const [asistenciaPorDia] = await db.query(`
            SELECT DAYOFWEEK(fecha) as dia_num, COUNT(*) as total_asistencias
            FROM asistencia
            WHERE fecha BETWEEN ? AND ?
            GROUP BY DAYOFWEEK(fecha)
            ORDER BY dia_num
        `, [fechaDesde, fechaHasta]);
        const nombresDias = {1:'Dom',2:'Lun',3:'Mar',4:'Mié',5:'Jue',6:'Vie',7:'Sáb'};
        const asistenciaPorDiaFormateado = asistenciaPorDia.map(d => ({
            dia: nombresDias[d.dia_num],
            total: d.total_asistencias
        }));
        
        // 5. Objetivos de usuarios más comunes
        const [objetivosUsuarios] = await db.query(`
            SELECT objetivo_general, COUNT(*) as cantidad
            FROM usuarios
            WHERE objetivo_general IS NOT NULL AND objetivo_general != ''
            GROUP BY objetivo_general
            ORDER BY cantidad DESC
            LIMIT 5
        `);
        
        // 6. Clases con mayor demanda (agrupadas por nombre, sin duplicar por id)
        const [clasesDemandadas] = await db.query(`
            SELECT MIN(c.nombre) AS nombre, COUNT(uc.usuario_id) AS inscritos
            FROM clases c
            LEFT JOIN usuarios_clases uc ON c.id_clase = uc.clase_id
                AND uc.estado = 'activa'
                AND DATE(uc.fecha_inscripcion) BETWEEN ? AND ?
            WHERE c.estado = 'activa'
            GROUP BY LOWER(TRIM(c.nombre))
            ORDER BY inscritos DESC
            LIMIT 5
        `, [fechaDesde, fechaHasta]);
        
        // 7. Evolución de usuarios por mes en el rango
        const [evolucionUsuarios] = await db.query(`
            SELECT 
                DATE_FORMAT(fecha_registro, '%Y-%m') as mes,
                COUNT(*) as nuevos
            FROM usuarios
            WHERE DATE(fecha_registro) BETWEEN ? AND ?
            GROUP BY DATE_FORMAT(fecha_registro, '%Y-%m')
            ORDER BY mes ASC
        `, [fechaDesde, fechaHasta]);
        
        // 8. Entrenadores con más usuarios a cargo (a través de rutinas)
        const [topEntrenadores] = await db.query(`
            SELECT e.nombre, COUNT(DISTINCT ur.usuario_id) as usuarios
            FROM entrenadores e
            JOIN rutinas r ON e.id_entrenador = r.entrenador_id
            JOIN usuarios_rutinas ur ON r.id_rutina = ur.rutina_id
            GROUP BY e.id_entrenador
            ORDER BY usuarios DESC
            LIMIT 5
        `);
        
        res.json({
            rango: { fechaDesde, fechaHasta },
            metricas: {
                totalUsuarios: totalUsuarios.total,
                usuariosActivos: usuariosActivos.total,
                usuariosInactivos: usuariosInactivos.total,
                totalEntrenadores: totalEntrenadores.total,
                ocupacionClases: ocupacionClases[0]?.porcentaje || 0,
                asistenciasPeriodo: asistenciasPeriodo.total,
                nuevosUsuariosPeriodo: nuevosUsuariosPeriodo.total
            },
            rutinasPopulares,
            asistenciaPorDia: asistenciaPorDiaFormateado,
            objetivosUsuarios,
            clasesDemandadas,
            evolucionUsuarios,
            topEntrenadores
        });
    } catch (err) {
        console.error('Error en reportes avanzados:', err);
        res.status(500).json({ error: 'Error al obtener reportes avanzados' });
    }
};