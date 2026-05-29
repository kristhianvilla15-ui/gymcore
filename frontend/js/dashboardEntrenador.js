// API base
const API_BASE = 'https://gymcore-wf8t.onrender.com/api/entrenador';

let currentUser = null;
let chartInstance = null;
let chartPeso = null;
let chartPlanes = null;

document.addEventListener('DOMContentLoaded', () => {
    const userData = localStorage.getItem('userGymCore');
    if (!userData) {
        // ✅ CORRECCIÓN: Paso atrás para salir de /pages/ e ir al login principal
        window.location.replace('../index.html');
        return;
    }
    currentUser = JSON.parse(userData);
    if (currentUser.rol !== 'entrenador') {
        // ✅ CORRECCIÓN: Paso atrás de seguridad
        window.location.replace('../index.html');
        return;
    }
    if (document.getElementById('userName')) {
        document.getElementById('userName').textContent = currentUser.nombre;
    }
    
    cargarDatosEntrenador();
    cargarMisClases();
    cargarUsuariosParaReporte();

    history.pushState(null, null, location.href);
    window.onpopstate = function () {
        history.pushState(null, null, location.href);
    };
});

function mostrarSeccion(id) {
    document.querySelectorAll('.seccion-dashboard').forEach(s => s.style.display = 'none');
    const seccion = document.getElementById(id);
    if (seccion) seccion.style.display = 'block';
    if (id === 'usuarios') cargarDatosEntrenador();
    if (id === 'gestion-clases') cargarMisClases();
    if (id === 'reportes') {
        cargarUsuariosParaReporte();
        generarReporte();
        cargarEvolucionPeso();
        cargarRendimientoPlanes();
    }
}

// ==================== SUPERVISIÓN ====================
async function cargarDatosEntrenador() {
    if (!currentUser || !currentUser.id_entrenador) {
        console.error('No se encontró ID del entrenador');
        return;
    }
    try {
        const res = await fetch(`${API_BASE}/supervision?entrenadorId=${currentUser.id_entrenador}`);
        if (!res.ok) throw new Error('Error en la petición');
        const data = await res.json();
        
        document.getElementById('totalActivos').textContent = data.usuariosActivos || 0;
        document.getElementById('asistenciasHoy').textContent = data.asistenciasHoy || 0;
        
        const tabla = document.getElementById('tablaUsuarios');
        if (tabla && data.listaUsuarios) {
            tabla.innerHTML = data.listaUsuarios.map(u => `
                <tr>
                    <td>${u.nombre} ${u.apellido}</td>
                    <td><strong>${u.nivel}</strong></td>
                    <td>${u.ultimaAsistencia || 'Sin registro'}</td>
                    <td><button class="btn-small" onclick="gestionarUsuario(${u.id_usuario})">Ver más</button></td>
                </tr>
            `).join('');
        }
    } catch (error) {
        console.error('Error cargando supervisión:', error);
        alert('No se pudieron cargar los datos. Verifica la conexión.');
    }
}

// 🔄 SE REMOVIÓ LA FUNCIÓN DUPLICADA DE GESTIONAR USUARIO QUE ESTABA AQUÍ

// ==================== RUTINAS ====================
async function publicarRutina() {
    if (!currentUser || !currentUser.id_entrenador) {
        alert('Error: No se identificó al entrenador');
        return;
    }
    const payload = {
        nombre: document.getElementById('nombreRutina').value,
        descripcion: document.getElementById('descripcionRutina').value,
        nivel: document.getElementById('nivelRutina').value,
        grupo_muscular: document.getElementById('grupoMuscularRutina').value,
        objetivo: document.getElementById('objetivoRutina').value,
        duracion_semanas: document.getElementById('duracionSemanas').value,
        entrenador_id: currentUser.id_entrenador
    };
    if (!payload.nombre || !payload.descripcion || !payload.grupo_muscular) {
        alert('Completa todos los campos de la rutina.');
        return;
    }
    try {
        const res = await fetch(`${API_BASE}/rutinas/crear`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok) {
            alert('¡Rutina publicada con éxito!');
            document.getElementById('formRutina').reset();
        } else {
            alert('Error: ' + (data.error || 'No se pudo crear la rutina'));
        }
    } catch (error) {
        alert('Error de conexión al publicar rutina.');
    }
}

// ==================== DIETAS ====================
async function publicarDieta() {
    if (!currentUser || !currentUser.id_entrenador) {
        alert('Error: No se identificó al entrenador');
        return;
    }
    const payload = {
        nombre: document.getElementById('nombreDieta').value,
        descripcion: document.getElementById('descripcionDieta').value,
        objetivo: document.getElementById('objetivoDieta').value,
        entrenador_id: currentUser.id_entrenador
    };
    if (!payload.nombre || !payload.descripcion) {
        alert('Completa todos los campos de la dieta.');
        return;
    }
    try {
        const res = await fetch(`${API_BASE}/dietas/crear`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok) {
            alert('¡Dieta publicada con éxito!');
            document.getElementById('formDieta').reset();
        } else {
            alert('Error: ' + (data.error || 'No se pudo crear la dieta'));
        }
    } catch (error) {
        alert('Error de conexión al publicar dieta.');
    }
}

// ==================== CLASES ====================
async function crearClase() {
    if (!currentUser || !currentUser.id_entrenador) {
        alert('Error: No se identificó al entrenador');
        return;
    }
    const horaInicio = document.getElementById('horaInicio').value;
    const horaFin = document.getElementById('horaFin').value;
    const cupoMaximo = document.getElementById('cupoMaximo').value;
    const dia = document.getElementById('diaClase').value;
    if (!horaInicio || !horaFin || !cupoMaximo || !dia) {
        alert('Completa todos los campos de la clase.');
        return;
    }
    const payload = {
        nombre: document.getElementById('nombreClase').value,
        dia_id: parseInt(dia),
        hora_inicio: horaInicio + ':00',
        hora_fin: horaFin + ':00',
        cupo_maximo: cupoMaximo,
        entrenador_id: currentUser.id_entrenador
    };
    try {
        const res = await fetch(`${API_BASE}/clases/crear`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok) {
            alert('¡Clase publicada correctamente!');
            document.getElementById('horaInicio').value = '';
            document.getElementById('horaFin').value = '';
            document.getElementById('cupoMaximo').value = '';
            cargarMisClases();
        } else {
            alert('Error: ' + (data.error || 'No se pudo crear la clase'));
        }
    } catch (error) {
        alert('Error de conexión al crear la clase.');
    }
}

async function cargarMisClases() {
    if (!currentUser || !currentUser.id_entrenador) return;
    const tabla = document.getElementById('tablaClasesProgramadas');
    if (!tabla) return;
    try {
        const res = await fetch(`${API_BASE}/mis-clases/${currentUser.id_entrenador}`);
        if (!res.ok) throw new Error('Error al cargar clases');
        const clases = await res.json();
        if (!clases.length) {
            tabla.innerHTML = '<tr><td colspan="7">No hay clases programadas.</td></tr>';
            return;
        }
        tabla.innerHTML = clases.map(c => `
            <tr>
                <td>${c.nombre}</td>
                <td>${c.dias || '-'}</td>
                <td>${c.hora_inicio} - ${c.hora_fin}</td>
                <td>${c.cupo_maximo || '∞'}</td>
                <td>${c.inscritos || 0}</td>
                <td style="color: ${c.estado === 'activa' ? '#4caf50' : '#f44336'}; font-weight:bold;">${c.estado === 'activa' ? 'ACTIVA' : 'INACTIVA'}</td>
                <td><button class="btn-small ${c.estado === 'activa' ? 'btn-deshabilitar' : 'btn-habilitar'}" onclick="toggleEstadoClase(${c.id_clase}, '${c.estado}')">${c.estado === 'activa' ? 'Deshabilitar' : 'Habilitar'}</button></td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error cargando clases:', error);
    }
}

async function toggleEstadoClase(claseId, estadoActual) {
    const nuevoEstado = estadoActual === 'activa' ? 'inactiva' : 'activa';
    if (!confirm(`¿${nuevoEstado === 'activa' ? 'Habilitar' : 'Deshabilitar'} esta clase?`)) return;
    try {
        const res = await fetch(`${API_BASE}/clases/${claseId}/estado`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ estado: nuevoEstado })
        });
        const data = await res.json();
        if (res.ok) {
            alert(data.mensaje);
            cargarMisClases();
        } else {
            alert('Error: ' + (data.error || 'No se pudo cambiar el estado'));
        }
    } catch (error) {
        alert('Error de conexión al cambiar estado.');
    }
}

// ==================== REPORTES (BACKEND REAL) ====================
async function cargarUsuariosParaReporte() {
    if (!currentUser || !currentUser.id_entrenador) return;
    try {
        const res = await fetch(`${API_BASE}/supervision?entrenadorId=${currentUser.id_entrenador}`);
        if (!res.ok) throw new Error('Error al cargar usuarios');
        const data = await res.json();
        const selectUsuario = document.getElementById('usuarioReporte');
        if (selectUsuario && data.listaUsuarios) {
            selectUsuario.innerHTML = '<option value="">Todos los usuarios</option>' +
                data.listaUsuarios.map(u => `<option value="${u.id_usuario}">${u.nombre} ${u.apellido}</option>`).join('');
        }
    } catch (error) {
        console.error('Error cargando usuarios para reporte:', error);
    }
}

async function generarReporte() {
    if (!currentUser || !currentUser.id_entrenador) {
        alert('Error: No se identificó al entrenador');
        return;
    }
    const tipo = document.getElementById('tipoReporte').value;
    const usuarioId = document.getElementById('usuarioReporte').value;
    const periodo = document.getElementById('periodoReporte').value;

    const btnGen = document.querySelector('#reportes .btn-gym:first-of-type');
    if (btnGen) { btnGen.textContent = 'Cargando...'; btnGen.disabled = true; }

    try {
        const params = new URLSearchParams({ entrenadorId: currentUser.id_entrenador, tipo, periodo });
        if (usuarioId) params.append('usuarioId', usuarioId);
        const res = await fetch(`${API_BASE}/reportes?${params}`);
        if (!res.ok) throw new Error('Error en el servidor');
        const data = await res.json();

        actualizarEstadisticasReporte(data);
        actualizarGrafico(data, tipo);
        actualizarTablaReporte(data);

        // 🔄 Actualizar gráficos adicionales con el mismo usuarioId
        await cargarEvolucionPeso(usuarioId || null);
        await cargarRendimientoPlanes(usuarioId || null);

    } catch (error) {
        console.error('Error generando reporte:', error);
        alert('Error al generar el reporte: ' + error.message);
    } finally {
        if (btnGen) { btnGen.textContent = 'Generar Reporte'; btnGen.disabled = false; }
    }
}

function actualizarEstadisticasReporte(data) {
    document.getElementById('reportTotalUsuarios').textContent = data.totalUsuarios || 0;
    document.getElementById('reportTasaAsistencia').textContent = (data.tasaAsistencia || 0) + '%';
    document.getElementById('reportUsuariosActivos').textContent = data.usuariosActivos || 0;
    document.getElementById('reportPromedioAsistencia').textContent = data.promedioAsistencia || 0;
}

function actualizarGrafico(data, tipo) {
    const canvas = document.getElementById('graficoAsistencias');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (chartInstance) chartInstance.destroy();
    
    let labels = [], valores = [], labelTexto = '', tipoGrafico = 'line';
    if (tipo === 'asistencias' || tipo === 'progreso') {
        labels = data.fechas?.length ? data.fechas : ['Sin datos'];
        valores = data.asistenciasPorPeriodo?.length ? data.asistenciasPorPeriodo : [0];
        labelTexto = 'Asistencias';
        tipoGrafico = 'line';
    } else if (tipo === 'rendimiento') {
        labels = data.nombresPlanes?.length ? data.nombresPlanes : ['Sin planes'];
        valores = data.rendimientoPlanes?.length ? data.rendimientoPlanes : [0];
        labelTexto = 'Rendimiento (%)';
        tipoGrafico = 'bar';
    } else if (tipo === 'comparativa') {
        labels = data.meses?.length ? data.meses : ['Sin datos'];
        valores = data.comparativaMensual?.length ? data.comparativaMensual : [0];
        labelTexto = 'Asistencias Mensuales';
        tipoGrafico = 'line';
    }
    
    chartInstance = new Chart(ctx, {
        type: tipoGrafico,
        data: { labels, datasets: [{ label: labelTexto, data: valores, borderColor: '#00ff88', backgroundColor: tipoGrafico === 'bar' ? 'rgba(0, 255, 136, 0.2)' : 'rgba(0, 255, 136, 0.1)', borderWidth: 2, fill: true, tension: 0.3, pointBackgroundColor: '#00ff88', pointBorderColor: '#fff' }] },
        options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { labels: { color: '#fff' } } }, scales: { y: { beginAtZero: true, grid: { color: '#333' }, ticks: { color: '#fff' } }, x: { grid: { color: '#333' }, ticks: { color: '#fff' } } } }
    });
}

function actualizarTablaReporte(data) {
    const tabla = document.getElementById('tablaReporte');
    if (!tabla) return;
    const usuarios = data.detalleUsuarios || [];
    if (usuarios.length === 0) { tabla.innerHTML = '<tr><td colspan="5">No hay datos para mostrar.</td></tr>'; return; }
    tabla.innerHTML = usuarios.map(user => `
        <tr style="border-bottom: 1px solid #2a2a2a;">
            <td><strong>${user.nombre} ${user.apellido}</strong></td>
            <td>${user.asistencias}</td>
            <td><div style="background:#2a2a2a; border-radius:10px; overflow:hidden; width:100px;"><div style="background:#00ff88; width:${user.progreso}%; height:20px; display:flex; align-items:center; justify-content:center; color:#000; font-size:11px;">${user.progreso}%</div></div></td>
            <td><span style="color: ${user.rendimiento >= 70 ? '#4caf50' : user.rendimiento >= 40 ? '#ff9800' : '#f44336'}">${user.rendimiento}%</span></td>
            <td>${user.ultimaActividad}</td>
        </tr>
    `).join('');
}

// ==================== EVOLUCIÓN Y RENDIMIENTO REAL ====================
async function cargarEvolucionPeso(usuarioId = null) {
    if (!currentUser || !currentUser.id_entrenador) return;
    const canvas = document.getElementById('graficoEvolucionPeso');
    if (!canvas) return;
    try {
        let url = `${API_BASE}/evolucion-peso?entrenadorId=${currentUser.id_entrenador}`;
        if (usuarioId) url += `&usuarioId=${usuarioId}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Error al cargar evolución de peso');
        const data = await res.json();
        const ctx = canvas.getContext('2d');
        if (chartPeso) chartPeso.destroy();
        if (data.length === 0) {
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            ctx.fillStyle = '#888';
            ctx.font = '14px Inter';
            ctx.fillText('No hay datos de peso disponibles', 10, 50);
            return;
        }
        chartPeso = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map(d => new Date(d.fecha).toLocaleDateString()),
                datasets: [{ label: 'Peso promedio (kg)', data: data.map(d => parseFloat(d.peso_promedio).toFixed(1)), borderColor: '#ff6b00', backgroundColor: 'rgba(255, 107, 0, 0.1)', borderWidth: 2, fill: true, tension: 0.3, pointBackgroundColor: '#ff6b00', pointBorderColor: '#fff' }]
            },
            options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { labels: { color: '#fff' } }, tooltip: { callbacks: { label: (ctx) => `${ctx.raw} kg` } } }, scales: { y: { beginAtZero: false, grid: { color: '#333' }, ticks: { color: '#fff', callback: (v) => v + ' kg' } }, x: { grid: { color: '#333' }, ticks: { color: '#fff', rotation: 45, autoSkip: true } } } }
        });
    } catch (error) {
        console.error('Error en evolución de peso:', error);
    }
}

async function cargarRendimientoPlanes(usuarioId = null) {
    if (!currentUser || !currentUser.id_entrenador) return;
    const canvas = document.getElementById('graficoRendimientoPlanes');
    if (!canvas) return;
    try {
        let url = `${API_BASE}/rendimiento-planes?entrenadorId=${currentUser.id_entrenador}`;
        if (usuarioId) url += `&usuarioId=${usuarioId}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Error al cargar rendimiento por planes');
        const data = await res.json();
        const ctx = canvas.getContext('2d');
        if (chartPlanes) chartPlanes.destroy();
        if (data.length === 0) {
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            ctx.fillStyle = '#888';
            ctx.font = '14px Inter';
            ctx.fillText('No hay datos de planes disponibles', 10, 50);
            return;
        }
        chartPlanes = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.map(p => p.objetivo),
                datasets: [{ label: 'Asistencias promedio (último mes)', data: data.map(p => Math.round(p.asistencias_promedio || 0)), backgroundColor: '#00ff88', borderColor: '#00cc6e', borderWidth: 1, borderRadius: 8 }]
            },
            options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { labels: { color: '#fff' } }, tooltip: { callbacks: { label: (ctx) => `${ctx.raw} asistencias` } } }, scales: { y: { beginAtZero: true, grid: { color: '#333' }, ticks: { color: '#fff', stepSize: 1 } }, x: { grid: { color: '#333' }, ticks: { color: '#fff' } } } }
        });
    } catch (error) {
        console.error('Error en rendimiento por planes:', error);
    }
}

// ✅ SE DEJA ESTA VERSIÓN QUE CONECTA CON LA API BASE REAL
async function gestionarUsuario(id) {
    try {
        const res = await fetch(`${API_BASE}/peso-usuario?usuarioId=${id}`);
        if (!res.ok) throw new Error('Error al obtener datos');
        const data = await res.json();

        let mensaje = '';
        if (data.tendencia === 'bajando') {
            mensaje = `✅ Ha bajado ${Math.abs(data.diferencia)} kg. ¡Excelente progreso!`;
        } else if (data.tendencia === 'subiendo') {
            mensaje = `⚠️ Ha subido ${data.diferencia} kg. Revisar plan de entrenamiento.`;
        } else {
            mensaje = `⚖️ Se mantiene estable (diferencia de ${data.diferencia} kg).`;
        }

        alert(`Usuario ID: ${id}\n${mensaje}\n\nPeso inicial: ${data.primerPeso} kg\nPeso actual: ${data.ultimoPeso} kg`);
    } catch (error) {
        alert('No se pudo obtener la evolución de peso');
    }
}

// ==================== LOGOUT ====================
function logout() {
    localStorage.removeItem('userGymCore');
    // ✅ CORRECCIÓN DEFINITIVA: Regresa al login saliendo de la carpeta 'pages'
    window.location.replace('../index.html');
}