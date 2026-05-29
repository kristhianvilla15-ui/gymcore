const API_BASE = 'https://gymcore-wf8t.onrender.com/api/admin';
let currentAdmin = null;

document.addEventListener('DOMContentLoaded', () => {
    const adminData = localStorage.getItem('userGymCore');
    if (!adminData || JSON.parse(adminData).rol !== 'admin') {
        window.location.href = '../index.html';
        return;
    }
    currentAdmin = JSON.parse(adminData);
    const badge = document.querySelector('.admin-badge');
    if (badge) badge.textContent = `Admin: ${currentAdmin.nombre}`;

    document.querySelectorAll('.menu li').forEach(li => {
        li.addEventListener('click', () => {
            const section = li.getAttribute('data-section');
            if (section === 'logout') {
                logout();
                return;
            }
            document.querySelectorAll('.menu li').forEach(l => l.classList.remove('active'));
            li.classList.add('active');
            if (section === 'dashboard') cargarDashboard();
            else if (section === 'usuarios') cargarUsuarios();
            else if (section === 'entrenadores') cargarEntrenadores();
            else if (section === 'rutinas') cargarRutinas();
            else if (section === 'clases') cargarClases();
            else if (section === 'reportes') cargarReportes();
        });
    });
    cargarDashboard();
});

// ========== DASHBOARD ==========
async function cargarDashboard() {
    try {
        const res = await fetch(`${API_BASE}/dashboard`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        const content = document.getElementById('dynamicContent');
        content.innerHTML = `
            <div class="cards-grid">
                <div class="stat-card"><h3>Usuarios registrados</h3><p>${data.totalUsuarios}</p></div>
                <div class="stat-card"><h3>Entrenadores activos</h3><p>${data.totalEntrenadores}</p></div>
                <div class="stat-card"><h3>Clases activas</h3><p>${data.totalClases}</p></div>
                <div class="stat-card"><h3>Rutinas publicadas</h3><p>${data.totalRutinas}</p></div>
            </div>
            <div class="table-card">
                <h2>Actividad reciente</h2>
                <table>
                    <thead><tr><th>Usuario</th><th>Acción</th><th>Fecha</th></tr></thead>
                    <tbody>
                        ${data.actividadReciente.map(a => `<tr><td>${a.usuario}</td><td>${a.accion}</td><td>${new Date(a.fecha).toLocaleDateString()}</td></tr>`).join('')}
                    </tbody>
                </table>
            </div>
        `;
        setTitulo('Panel de Administrador', 'Vista general del sistema GymCore');
    } catch (err) {
        console.error(err);
        alert('Error al cargar dashboard');
    }
}

// ========== USUARIOS (con activar/desactivar) ==========
async function cargarUsuarios() {
    try {
        const res = await fetch(`${API_BASE}/usuarios`);
        const usuarios = await res.json();
        const content = document.getElementById('dynamicContent');
        content.innerHTML = `
            <div style="margin-bottom:1rem;"><button class="btn-primary" onclick="mostrarModalUsuario()">+ Nuevo Usuario</button></div>
            <div class="table-card">
                <table>
                    <thead><tr><th>ID</th><th>Cédula</th><th>Nombre</th><th>Correo</th><th>Estado</th><th>Acciones</th></tr></thead>
                    <tbody>
                        ${usuarios.map(u => `
                            <tr>
                                <td>${u.id_usuario}</td><td>${u.cedula}</td><td>${u.nombre} ${u.apellido}</td><td>${u.correo}</td>
                                <td><span class="estado-badge ${u.estado}">${u.estado}</span></td>
                                <td>
                                    <button class="btn-edit" onclick="editarUsuario(${u.id_usuario})">✏️ Editar</button>
                                    ${u.estado === 'activo'
                ? `<button class="btn-delete" onclick="cambiarEstadoUsuario(${u.id_usuario}, 'inactivo')">🔴 Desactivar</button>`
                : `<button class="btn-activate" onclick="cambiarEstadoUsuario(${u.id_usuario}, 'activo')">🟢 Activar</button>`
            }
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        setTitulo('Gestión de Usuarios', 'Lista, crea, edita o cambia estado de usuarios');
    } catch (err) {
        console.error(err);
        alert('Error al cargar usuarios');
    }
}

window.cambiarEstadoUsuario = async (id, nuevoEstado) => {
    const accion = nuevoEstado === 'activo' ? 'activar' : 'desactivar';
    if (!confirm(`¿${accion} este usuario?`)) return;
    try {
        await fetch(`${API_BASE}/usuarios/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ estado: nuevoEstado })
        });
        cargarUsuarios();
    } catch (err) {
        alert('Error al cambiar estado');
    }
};

// ========== ENTRENADORES (con activar/desactivar) ==========
async function cargarEntrenadores() {
    try {
        const res = await fetch(`${API_BASE}/entrenadores`);
        const entrenadores = await res.json();
        const content = document.getElementById('dynamicContent');
        content.innerHTML = `
            <div style="margin-bottom:1rem;"><button class="btn-primary" onclick="mostrarModalEntrenador()">+ Nuevo Entrenador</button></div>
            <div class="table-card">
                <table>
                    <thead><tr><th>ID</th><th>Cédula</th><th>Nombre</th><th>Correo</th><th>Especialidad</th><th>Estado</th><th>Acciones</th></tr></thead>
                    <tbody>
                        ${entrenadores.map(e => `
                            <tr>
                                <td>${e.id_entrenador}</td><td>${e.cedula}</td><td>${e.nombre} ${e.apellido}</td><td>${e.correo}</td>
                                <td>${e.especialidad || '-'}</td>
                                <td><span class="estado-badge ${e.estado}">${e.estado}</span></td>
                                <td>
                                    <button class="btn-edit" onclick="editarEntrenador(${e.id_entrenador})">✏️ Editar</button>
                                    ${e.estado === 'activo'
                ? `<button class="btn-delete" onclick="cambiarEstadoEntrenador(${e.id_entrenador}, 'inactivo')">🔴 Desactivar</button>`
                : `<button class="btn-activate" onclick="cambiarEstadoEntrenador(${e.id_entrenador}, 'activo')">🟢 Activar</button>`
            }
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        setTitulo('Gestión de Entrenadores', 'Lista, crea, edita o cambia estado de entrenadores');
    } catch (err) {
        console.error(err);
        alert('Error al cargar entrenadores');
    }
}

window.cambiarEstadoEntrenador = async (id, nuevoEstado) => {
    const accion = nuevoEstado === 'activo' ? 'activar' : 'desactivar';
    if (!confirm(`¿${accion} este entrenador?`)) return;
    try {
        await fetch(`${API_BASE}/entrenadores/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ estado: nuevoEstado })
        });
        cargarEntrenadores();
    } catch (err) {
        alert('Error al cambiar estado');
    }
};

// ========== RUTINAS ==========
async function cargarRutinas() {
    try {
        const res = await fetch(`${API_BASE}/rutinas`);
        const rutinas = await res.json();
        const content = document.getElementById('dynamicContent');
        content.innerHTML = `
            <div style="margin-bottom:1rem;"><button class="btn-primary" onclick="mostrarModalRutina()">+ Nueva Rutina</button></div>
            <div class="table-card">
                <table>
                    <thead><tr><th>ID</th><th>Nombre</th><th>Nivel</th><th>Grupo Muscular</th><th>Objetivo</th><th>Entrenador</th><th>Estado</th><th>Acciones</th></tr></thead>
                    <tbody>
                        ${rutinas.map(r => `
                            <tr>
                                <td>${r.id_rutina}</td><td>${r.nombre}</td><td>${r.nivel}</td><td>${r.grupo_muscular}</td>
                                <td>${r.objetivo}</td><td>${r.entrenador_nombre || '-'}</td>
                                <td><span class="estado-badge ${r.estado}">${r.estado}</span></td>
                                <td>
                                    <button class="btn-edit" onclick="editarRutina(${r.id_rutina})">✏️ Editar</button>
                                    <button class="btn-delete" onclick="eliminarRutina(${r.id_rutina})">🗑️ Eliminar</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        setTitulo('Gestión de Rutinas', 'Lista, crea, edita o elimina rutinas');
    } catch (err) {
        alert('Error al cargar rutinas');
    }
}

// ========== CLASES ==========
async function cargarClases() {
    try {
        const res = await fetch(`${API_BASE}/clases`);
        const clases = await res.json();
        const content = document.getElementById('dynamicContent');
        content.innerHTML = `
            <div style="margin-bottom:1rem;"><button class="btn-primary" onclick="mostrarModalClase()">+ Nueva Clase</button></div>
            <div class="table-card">
                <table>
                    <thead><tr><th>ID</th><th>Nombre</th><th>Horario</th><th>Cupo</th><th>Inscritos</th><th>Entrenador</th><th>Estado</th><th>Acciones</th></tr></thead>
                    <tbody>
                        ${clases.map(c => `
                            <tr>
                                <td>${c.id_clase}</td><td>${c.nombre}</td><td>${c.hora_inicio.slice(0, 5)} - ${c.hora_fin.slice(0, 5)}</td>
                                <td>${c.cupo_maximo || '∞'}</td><td>${c.inscritos || 0}</td><td>${c.entrenador_nombre || '-'}</td>
                                <td><span class="estado-badge ${c.estado}">${c.estado}</span></td>
                                <td>
                                    <button class="btn-edit" onclick="editarClase(${c.id_clase})">✏️ Editar</button>
                                    <button class="btn-delete" onclick="eliminarClase(${c.id_clase})">🗑️ Eliminar</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        setTitulo('Gestión de Clases', 'Lista, crea, edita o elimina clases');
    } catch (err) {
        alert('Error al cargar clases');
    }
}

// ========== FUNCIONES AUXILIARES ==========
function setTitulo(titulo, descripcion) {
    document.getElementById('pageTitle').innerText = titulo;
    document.getElementById('pageDescription').innerText = descripcion;
}

// Funciones para abrir modales (placeholder, puedes implementar después)
window.mostrarModalUsuario = () => alert('Crear usuario - pendiente de implementar modal');
window.editarUsuario = (id) => alert(`Editar usuario ${id} - pendiente`);
window.mostrarModalEntrenador = () => alert('Crear entrenador - pendiente');
window.editarEntrenador = (id) => alert(`Editar entrenador ${id} - pendiente`);
window.mostrarModalRutina = () => alert('Crear rutina - pendiente');
window.editarRutina = (id) => alert(`Editar rutina ${id} - pendiente`);
window.eliminarRutina = async (id) => {
    if (confirm('¿Eliminar esta rutina?')) {
        await fetch(`${API_BASE}/rutinas/${id}`, { method: 'DELETE' });
        cargarRutinas();
    }
};
window.mostrarModalClase = () => alert('Crear clase - pendiente');
window.editarClase = (id) => alert(`Editar clase ${id} - pendiente`);
window.eliminarClase = async (id) => {
    if (confirm('¿Eliminar esta clase?')) {
        await fetch(`${API_BASE}/clases/${id}`, { method: 'DELETE' });
        cargarClases();
    }
};

let reportCharts = [];

function getRangoFechasReporte() {
    const hoy = new Date();
    const hace30 = new Date(hoy);
    hace30.setDate(hoy.getDate() - 30);
    const fmt = (d) => d.toISOString().slice(0, 10);
    return { desde: fmt(hace30), hasta: fmt(hoy) };
}

async function cargarReportes(fechaDesde, fechaHasta) {
    try {
        const rango = getRangoFechasReporte();
        const desde = fechaDesde || rango.desde;
        const hasta = fechaHasta || rango.hasta;

        const params = new URLSearchParams({ fechaDesde: desde, fechaHasta: hasta });
        const res = await fetch(`${API_BASE}/reportes-avanzados?${params}`);
        if (!res.ok) throw new Error('Error al cargar reportes');
        const data = await res.json();

        reportCharts.forEach(c => c.destroy());
        reportCharts = [];

        const content = document.getElementById('dynamicContent');
        content.innerHTML = `
            <div class="filtros-reporte">
                <div>
                    <label for="reporteFechaDesde">Desde</label>
                    <input type="date" id="reporteFechaDesde" class="input-gym" value="${desde}">
                </div>
                <div>
                    <label for="reporteFechaHasta">Hasta</label>
                    <input type="date" id="reporteFechaHasta" class="input-gym" value="${hasta}">
                </div>
                <button type="button" class="btn-primary" id="btnFiltrarReportes">Filtrar</button>
            </div>
            <p class="rango-reporte">Período: ${desde} — ${hasta}</p>
            <div class="cards-grid">
                <div class="stat-card"><h3>📊 Total Usuarios</h3><p>${data.metricas.totalUsuarios}</p></div>
                <div class="stat-card"><h3>✅ Activos</h3><p>${data.metricas.usuariosActivos}</p></div>
                <div class="stat-card"><h3>❌ Inactivos</h3><p>${data.metricas.usuariosInactivos}</p></div>
                <div class="stat-card"><h3>👨‍🏫 Entrenadores</h3><p>${data.metricas.totalEntrenadores}</p></div>
                <div class="stat-card"><h3>🏋️ Ocupación Clases</h3><p>${data.metricas.ocupacionClases}%</p></div>
                <div class="stat-card"><h3>📅 Asistencias (período)</h3><p>${data.metricas.asistenciasPeriodo ?? 0}</p></div>
                <div class="stat-card"><h3>🆕 Nuevos usuarios (período)</h3><p>${data.metricas.nuevosUsuariosPeriodo ?? 0}</p></div>
            </div>
            
            <div class="cards-grid">
                <div class="card-chart">
                    <h3>📈 Evolución de Usuarios (6 meses)</h3>
                    <canvas id="chartEvolucion"></canvas>
                </div>
                <div class="card-chart">
                    <h3>📅 Asistencia por Día</h3>
                    <canvas id="chartAsistenciaDia"></canvas>
                </div>
            </div>
            
            <div class="cards-grid">
                <div class="card-chart">
                    <h3>🏆 Rutinas Más Populares</h3>
                    <canvas id="chartRutinas"></canvas>
                </div>
                <div class="card-chart">
                    <h3>🎯 Objetivos de Usuarios</h3>
                    <canvas id="chartObjetivos"></canvas>
                </div>
            </div>
            
            <div class="cards-grid">
                <div class="card-chart">
                    <h3>🔥 Clases con Mayor Demanda</h3>
                    <canvas id="chartClases"></canvas>
                </div>
                <div class="card-chart">
                    <h3>⭐ Top Entrenadores (por usuarios)</h3>
                    <canvas id="chartEntrenadores"></canvas>
                </div>
            </div>
        `;

        setTitulo('Reportes Avanzados', 'Estadísticas completas del gimnasio');

        document.getElementById('btnFiltrarReportes')?.addEventListener('click', () => {
            const d = document.getElementById('reporteFechaDesde').value;
            const h = document.getElementById('reporteFechaHasta').value;
            if (!d || !h) return alert('Selecciona ambas fechas');
            if (d > h) return alert('La fecha inicial no puede ser mayor que la final');
            cargarReportes(d, h);
        });

        [
            renderChart('chartEvolucion', 'line', data.evolucionUsuarios.map(m => m.mes), data.evolucionUsuarios.map(m => m.nuevos), 'Nuevos usuarios'),
            renderChart('chartAsistenciaDia', 'bar', data.asistenciaPorDia.map(d => d.dia), data.asistenciaPorDia.map(d => d.total), 'Asistencias'),
            renderChart('chartRutinas', 'bar', data.rutinasPopulares.map(r => r.nombre), data.rutinasPopulares.map(r => r.usuarios_asignados), 'Usuarios asignados'),
            renderChart('chartObjetivos', 'pie', data.objetivosUsuarios.map(o => o.objetivo_general), data.objetivosUsuarios.map(o => o.cantidad), 'Cantidad'),
            renderChart('chartClases', 'bar', data.clasesDemandadas.map(c => c.nombre), data.clasesDemandadas.map(c => c.inscritos), 'Inscripciones'),
            renderChart('chartEntrenadores', 'bar', data.topEntrenadores.map(e => e.nombre), data.topEntrenadores.map(e => e.usuarios), 'Usuarios a cargo')
        ].filter(Boolean).forEach(c => reportCharts.push(c));

    } catch (err) {
        console.error(err);
        alert('Error al cargar reportes avanzados');
    }
}

// Función auxiliar para dibujar gráficos
function renderChart(elementId, type, labels, data, labelText) {
    const ctx = document.getElementById(elementId)?.getContext('2d');
    if (!ctx) return null;
    return new Chart(ctx, {
        type: type,
        data: {
            labels: labels,
            datasets: [{
                label: labelText,
                data: data,
                backgroundColor: type === 'pie' ? ['#00ff88', '#ff6b00', '#3a6ea5', '#ff4d4d', '#28a745'] : '#00ff88',
                borderColor: '#00cc6e',
                borderWidth: 1,
                tension: 0.3,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { labels: { color: '#fff' } }
            },
            scales: type !== 'pie' ? {
                y: { beginAtZero: true, grid: { color: '#333' }, ticks: { color: '#fff' } },
                x: { grid: { color: '#333' }, ticks: { color: '#fff', rotation: 45, autoSkip: true } }
            } : {}
        }
    });
}

// ==================== USUARIOS ====================
window.mostrarModalUsuario = (usuario = null) => {
    const modal = document.getElementById('modalUsuario');
    const title = document.getElementById('modalUsuarioTitle');
    const form = document.getElementById('formUsuario');
    form.reset();
    document.getElementById('usuarioId').value = '';
    if (usuario) {
        title.innerText = 'Editar Usuario';
        document.getElementById('usuarioId').value = usuario.id_usuario;
        document.getElementById('usuarioCedula').value = usuario.cedula;
        document.getElementById('usuarioNombre').value = usuario.nombre;
        document.getElementById('usuarioApellido').value = usuario.apellido;
        document.getElementById('usuarioTelefono').value = usuario.telefono || '';
        document.getElementById('usuarioCorreo').value = usuario.correo;
        document.getElementById('usuarioObjetivo').value = usuario.objetivo_general || '';
        document.getElementById('usuarioFechaNac').value = usuario.fecha_nacimiento || '';
        document.getElementById('usuarioSexo').value = usuario.sexo || '';
    } else {
        title.innerText = 'Nuevo Usuario';
    }
    modal.style.display = 'flex';
};

window.editarUsuario = async (id) => {
    // Obtener datos del usuario desde el servidor
    const res = await fetch(`${API_BASE}/usuarios`);
    const usuarios = await res.json();
    const usuario = usuarios.find(u => u.id_usuario == id);
    if (usuario) mostrarModalUsuario(usuario);
};

window.guardarUsuario = async () => {
    const id = document.getElementById('usuarioId').value;
    const payload = {
        cedula: document.getElementById('usuarioCedula').value,
        nombre: document.getElementById('usuarioNombre').value,
        apellido: document.getElementById('usuarioApellido').value,
        telefono: document.getElementById('usuarioTelefono').value,
        correo: document.getElementById('usuarioCorreo').value,
        objetivo_general: document.getElementById('usuarioObjetivo').value,
        fecha_nacimiento: document.getElementById('usuarioFechaNac').value || null,
        sexo: document.getElementById('usuarioSexo').value || null
    };
    try {
        let url = `${API_BASE}/usuarios`;
        let method = 'POST';
        if (id) {
            url += `/${id}`;
            method = 'PUT';
        }
        const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (res.ok) {
            alert('Usuario guardado correctamente');
            cerrarModal('modalUsuario');
            cargarUsuarios();
        } else {
            const err = await res.json();
            alert('Error: ' + (err.error || 'No se pudo guardar'));
        }
    } catch (error) {
        alert('Error de conexión');
    }
};

// ==================== ENTRENADORES ====================
window.mostrarModalEntrenador = (entrenador = null) => {
    const modal = document.getElementById('modalEntrenador');
    const title = document.getElementById('modalEntrenadorTitle');
    document.getElementById('formEntrenador').reset();
    document.getElementById('entrenadorId').value = '';
    if (entrenador) {
        title.innerText = 'Editar Entrenador';
        document.getElementById('entrenadorId').value = entrenador.id_entrenador;
        document.getElementById('entrenadorCedula').value = entrenador.cedula;
        document.getElementById('entrenadorNombre').value = entrenador.nombre;
        document.getElementById('entrenadorApellido').value = entrenador.apellido;
        document.getElementById('entrenadorTelefono').value = entrenador.telefono || '';
        document.getElementById('entrenadorCorreo').value = entrenador.correo;
        document.getElementById('entrenadorEspecialidad').value = entrenador.especialidad || '';
    } else {
        title.innerText = 'Nuevo Entrenador';
    }
    modal.style.display = 'flex';
};

window.editarEntrenador = async (id) => {
    const res = await fetch(`${API_BASE}/entrenadores`);
    const entrenadores = await res.json();
    const entrenador = entrenadores.find(e => e.id_entrenador == id);
    if (entrenador) mostrarModalEntrenador(entrenador);
};

window.guardarEntrenador = async () => {
    const id = document.getElementById('entrenadorId').value;
    const payload = {
        cedula: document.getElementById('entrenadorCedula').value,
        nombre: document.getElementById('entrenadorNombre').value,
        apellido: document.getElementById('entrenadorApellido').value,
        telefono: document.getElementById('entrenadorTelefono').value,
        correo: document.getElementById('entrenadorCorreo').value,
        especialidad: document.getElementById('entrenadorEspecialidad').value
    };
    try {
        let url = `${API_BASE}/entrenadores`;
        let method = 'POST';
        if (id) {
            url += `/${id}`;
            method = 'PUT';
        }
        const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (res.ok) {
            alert('Entrenador guardado');
            cerrarModal('modalEntrenador');
            cargarEntrenadores();
        } else {
            const err = await res.json();
            alert('Error: ' + err.error);
        }
    } catch (error) {
        alert('Error de conexión');
    }
};

// ==================== RUTINAS ====================
window.mostrarModalRutina = (rutina = null) => {
    const modal = document.getElementById('modalRutina');
    const title = document.getElementById('modalRutinaTitle');
    document.getElementById('formRutina').reset();
    document.getElementById('rutinaId').value = '';
    if (rutina) {
        title.innerText = 'Editar Rutina';
        document.getElementById('rutinaId').value = rutina.id_rutina;
        document.getElementById('rutinaNombre').value = rutina.nombre;
        document.getElementById('rutinaDescripcion').value = rutina.descripcion || '';
        document.getElementById('rutinaNivel').value = rutina.nivel;
        document.getElementById('rutinaGrupo').value = rutina.grupo_muscular;
        document.getElementById('rutinaObjetivo').value = rutina.objetivo;
        document.getElementById('rutinaDuracion').value = rutina.duracion_semanas || '';
        document.getElementById('rutinaEntrenadorId').value = rutina.entrenador_id;
    } else {
        title.innerText = 'Nueva Rutina';
    }
    modal.style.display = 'flex';
};

window.editarRutina = async (id) => {
    const res = await fetch(`${API_BASE}/rutinas`);
    const rutinas = await res.json();
    const rutina = rutinas.find(r => r.id_rutina == id);
    if (rutina) mostrarModalRutina(rutina);
};

window.guardarRutina = async () => {
    const id = document.getElementById('rutinaId').value;
    const payload = {
        nombre: document.getElementById('rutinaNombre').value,
        descripcion: document.getElementById('rutinaDescripcion').value,
        nivel: document.getElementById('rutinaNivel').value,
        grupo_muscular: document.getElementById('rutinaGrupo').value,
        objetivo: document.getElementById('rutinaObjetivo').value,
        duracion_semanas: document.getElementById('rutinaDuracion').value,
        entrenador_id: document.getElementById('rutinaEntrenadorId').value
    };
    try {
        let url = `${API_BASE}/rutinas`;
        let method = 'POST';
        if (id) {
            url += `/${id}`;
            method = 'PUT';
        }
        const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (res.ok) {
            alert('Rutina guardada');
            cerrarModal('modalRutina');
            cargarRutinas();
        } else {
            const err = await res.json();
            alert('Error: ' + err.error);
        }
    } catch (error) {
        alert('Error de conexión');
    }
};

// ==================== CLASES ====================
window.mostrarModalClase = (clase = null) => {
    const modal = document.getElementById('modalClase');
    const title = document.getElementById('modalClaseTitle');
    document.getElementById('formClase').reset();
    document.getElementById('claseId').value = '';
    if (clase) {
        title.innerText = 'Editar Clase';
        document.getElementById('claseId').value = clase.id_clase;
        document.getElementById('claseNombre').value = clase.nombre;
        document.getElementById('claseDescripcion').value = clase.descripcion || '';
        document.getElementById('claseEntrenadorId').value = clase.entrenador_id;
        document.getElementById('claseCupo').value = clase.cupo_maximo || '';
        document.getElementById('claseHoraInicio').value = clase.hora_inicio.slice(0, 5);
        document.getElementById('claseHoraFin').value = clase.hora_fin.slice(0, 5);
        // Para los días, necesitarías una lógica especial; por simplicidad dejamos vacío
    } else {
        title.innerText = 'Nueva Clase';
    }
    modal.style.display = 'flex';
};

window.editarClase = async (id) => {
    const res = await fetch(`${API_BASE}/clases`);
    const clases = await res.json();
    const clase = clases.find(c => c.id_clase == id);
    if (clase) mostrarModalClase(clase);
};

window.guardarClase = async () => {
    const id = document.getElementById('claseId').value;
    const diasStr = document.getElementById('claseDias').value;
    const dias = diasStr ? diasStr.split(',').map(d => parseInt(d.trim())) : [];
    const payload = {
        nombre: document.getElementById('claseNombre').value,
        descripcion: document.getElementById('claseDescripcion').value,
        entrenador_id: document.getElementById('claseEntrenadorId').value,
        cupo_maximo: document.getElementById('claseCupo').value || null,
        hora_inicio: document.getElementById('claseHoraInicio').value + ':00',
        hora_fin: document.getElementById('claseHoraFin').value + ':00',
        dias: dias
    };
    try {
        let url = `${API_BASE}/clases`;
        let method = 'POST';
        if (id) {
            url += `/${id}`;
            method = 'PUT';
        }
        const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (res.ok) {
            alert('Clase guardada');
            cerrarModal('modalClase');
            cargarClases();
        } else {
            const err = await res.json();
            alert('Error: ' + err.error);
        }
    } catch (error) {
        alert('Error de conexión');
    }
};

// Función auxiliar para cerrar modales
function cerrarModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}


function logout() {
    localStorage.removeItem('userGymCore');
    window.location.replace('../index.html');
}