const API_BASE_URL = 'https://gymcore-wf8t.onrender.com/api/usuario';

let rutinaCache = [];
let clasesCache = [];
let graficaPesoInstance = null;

const userData = localStorage.getItem('userGymCore');
const user = userData ? JSON.parse(userData) : null;

// Variables globales para almacenar valores calculados
let ultimaAsistencia = 0;
let ultimaRacha = 0;

document.addEventListener('DOMContentLoaded', () => {
    if (!user || !user.cedula) {
        window.location.replace('login.html');
        return;
    }

    const userNameEl = document.getElementById('userName');
    if (userNameEl) {
        userNameEl.textContent = user.nombre || 'Usuario';
    }

    cargarDatosUsuario(user.cedula);
    cargarRutinas();
    cargarMisRutinas(user.cedula);
    cargarClases();
    cargarDietas();
    cargarMedidas();
    initClasesListeners();

    const formMedidas = document.getElementById('formMedidas');
    if (formMedidas) {
        formMedidas.addEventListener('submit', guardarMedidas);
    }

});

function mostrarSeccion(id) {
    document.querySelectorAll('.seccion-dashboard').forEach(seccion => {
        seccion.style.display = 'none';
    });

    const seccionActiva = document.getElementById(id);
    if (seccionActiva) {
        seccionActiva.style.display = 'block';
    }

    if (id === 'progreso') {
        cargarDatosUsuario(user.cedula);
        cargarMisRutinas(user.cedula);
        cargarMedidas();
    }

    if (id === 'rutinas') cargarRutinas();
    if (id === 'dietas') cargarDietas();
    if (id === 'clases') cargarClases();
}

async function cargarDatosUsuario(cedula) {
    try {
        const res = await fetch(`${API_BASE_URL}/progreso/${cedula}`);
        if (!res.ok) return;

        const data = await res.json();

        // Guardar para usar en otras funciones
        ultimaAsistencia = data.asistenciaMes || 0;
        ultimaRacha = data.racha || 0;

        console.log('📊 Datos del backend:', {
            asistencia: ultimaAsistencia,
            racha: ultimaRacha
        });

        // Mostrar en la interfaz
        const asistenciaEl = document.getElementById('asistenciaTotal');
        const nivelEl = document.getElementById('nivelProgreso');
        const rachaEl = document.getElementById('rachaDias');

        if (asistenciaEl) asistenciaEl.textContent = `${ultimaAsistencia}%`;
        if (nivelEl) nivelEl.textContent = data.nivel ?? 'Bajo';
        if (rachaEl) rachaEl.textContent = `${ultimaRacha} días 🔥`;

        const detalleRutina = document.getElementById('detalle-rutina');
        const detalleDieta = document.getElementById('detalle-dieta');

        if (detalleRutina) {
            detalleRutina.innerHTML = `<strong>Rutina de hoy:</strong> ${data.rutina || 'Descanso o no asignada'}`;
        }

        if (detalleDieta) {
            detalleDieta.innerHTML = `<strong>Plan nutricional:</strong> ${data.dieta || 'No asignada'}`;
        }

        // Actualizar barra de asistencia
        const barraAsistencia = document.getElementById('barraAsistencia');
        const porcentajeAsistenciaSpan = document.getElementById('porcentajeAsistencia');
        if (barraAsistencia) barraAsistencia.style.width = `${ultimaAsistencia}%`;
        if (porcentajeAsistenciaSpan) porcentajeAsistenciaSpan.textContent = `${ultimaAsistencia}%`;

        // Actualizar constancia con la nueva racha
        actualizarBarraConstancia();

    } catch (error) {
        console.error('Error cargando progreso:', error);
    }
}

function actualizarBarraConstancia() {
    // Constancia basada en la racha: (racha / 30) * 100, máximo 100%
    let constanciaPorcentaje = 0;
    if (ultimaRacha > 0) {
        constanciaPorcentaje = Math.min(100, Math.round((ultimaRacha / 30) * 100));
    }

    console.log('📈 Constancia calculada:', {
        racha: ultimaRacha,
        constancia: constanciaPorcentaje
    });

    const barraConstancia = document.getElementById('barraConstancia');
    const porcentajeConstanciaSpan = document.getElementById('porcentajeConstancia');
    if (barraConstancia) barraConstancia.style.width = `${constanciaPorcentaje}%`;
    if (porcentajeConstanciaSpan) porcentajeConstanciaSpan.textContent = `${constanciaPorcentaje}%`;
}

async function cargarMisRutinas(cedula) {
    const contenedor = document.getElementById('tablaRutinasAsignadas');
    if (!contenedor) return;

    try {
        const res = await fetch(`${API_BASE_URL}/mis-rutinas/${cedula}`);
        if (!res.ok) {
            contenedor.innerHTML = '<tr><td colspan="4">No se pudieron cargar las rutinas.</td></tr>';
            return;
        }

        const data = await res.json();

        if (!Array.isArray(data) || data.length === 0) {
            contenedor.innerHTML = '<tr><td colspan="4">Sin rutinas asignadas</td></tr>';
            return;
        }

        contenedor.innerHTML = data.map(r => `
            <tr>
                <td style="padding: 10px;">${r.nombre}</td>
                <td style="padding: 10px;">${r.nivel}</td>
                <td style="padding: 10px;">${r.grupo_muscular || '-'}</td>
                <td style="padding: 10px;">${r.dias}</td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error cargando rutinas asignadas:', error);
    }
}

async function cargarRutinas() {
    const contenedor = document.getElementById('lista-rutinas');
    const selectRutinas = document.getElementById('rutinaSelect');
    if (!contenedor && !selectRutinas) return;

    const nivel = document.getElementById('filtroNivel')?.value || '';
    const grupo_muscular = document.getElementById('filtroGrupo')?.value || '';

    const params = new URLSearchParams();
    if (nivel) params.append('nivel', nivel);
    if (grupo_muscular) params.append('grupo_muscular', grupo_muscular);

    try {
        const res = await fetch(`${API_BASE_URL}/rutinas?${params.toString()}`);
        if (!res.ok) throw new Error('Error al obtener rutinas');

        const data = await res.json();
        rutinaCache = Array.isArray(data) ? data : [];

        if (contenedor) {
            if (rutinaCache.length === 0) {
                contenedor.innerHTML = '<p>No hay rutinas disponibles en este momento.</p>';
            } else {
                contenedor.innerHTML = rutinaCache.map(r => `
                    <div class="card">
                        <h4>${r.nombre}</h4>
                        <p><strong>Grupo:</strong> ${r.grupo_muscular || '-'}</p>
                        <p>${r.descripcion || ''}</p>
                        <p><small><strong>Nivel:</strong> ${r.nivel} | <strong>Semanas:</strong> ${r.duracion_semanas || '-'}</small></p>
                        <p><strong>Coach:</strong> ${r.entrenador || 'Staff'}</p>
                    </div>
                `).join('');
            }
        }

        if (selectRutinas) {
            selectRutinas.innerHTML = rutinaCache.length
                ? rutinaCache.map(r => `<option value="${r.id_rutina}">${r.nombre}</option>`).join('')
                : '<option value="">Sin rutinas</option>';
        }
    } catch (error) {
        console.error('Error cargando rutinas:', error);
    }
}

function aplicarFiltrosRutinas() {
    cargarRutinas();
}

async function asignarRutina() {
    const rutinaId = document.getElementById('rutinaSelect')?.value;
    const diasSeleccionados = Array.from(
        document.querySelectorAll('input[name="diasRutina"]:checked')
    ).map(el => parseInt(el.value));

    if (!rutinaId) {
        alert('Selecciona una rutina.');
        return;
    }

    if (diasSeleccionados.length === 0) {
        alert('Selecciona al menos un día.');
        return;
    }

    try {
        const res = await fetch(`${API_BASE_URL}/asignar-rutina`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                cedula: user.cedula,
                rutina_id: rutinaId,
                dias_ids: diasSeleccionados
            })
        });

        const data = await res.json();

        if (res.ok) {
            alert(data.mensaje || 'Rutina asignada correctamente');
            cargarMisRutinas(user.cedula);
            cargarDatosUsuario(user.cedula);
        } else {
            alert(data.error || 'Error al asignar');
        }
    } catch (error) {
        alert('Error de conexión al asignar rutina');
    }
}

async function cargarDietas() {
    const contenedor = document.getElementById('lista-dietas');
    if (!contenedor) return;

    try {
        const res = await fetch(`${API_BASE_URL}/dietas`);
        if (!res.ok) return;

        const data = await res.json();

        if (!Array.isArray(data) || data.length === 0) {
            contenedor.innerHTML = '<p>No hay dietas disponibles.</p>';
            return;
        }

        contenedor.innerHTML = data.map(d => `
            <div class="card">
                <h4>${d.nombre}</h4>
                <p>${d.descripcion || 'Sin descripción'}</p>
                <p><strong>Objetivo:</strong> ${d.objetivo}</p>
                <p><strong>Entrenador:</strong> ${d.entrenador}</p>
                <button type="button" class="btn-primary" style="margin-top:10px;" onclick="seleccionarDieta(${d.id_dieta})">
                    Seleccionar
                </button>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error cargando dietas:', error);
    }
}

async function seleccionarDieta(dieta_id) {
    const user = JSON.parse(localStorage.getItem('userGymCore'));

    try {
        const res = await fetch(`${API_BASE_URL}/asignar-dieta`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                cedula: user.cedula,
                dieta_id
            })
        });

        const data = await res.json();

        if (res.ok) {
            alert(data.mensaje || 'Plan alimenticio actualizado');
            cargarDatosUsuario(user.cedula);
        } else {
            alert(data.error || 'No se pudo asignar la dieta');
        }
    } catch (error) {
        alert('No se pudo asignar la dieta');
    }
}

function initClasesListeners() {
    const contenedor = document.getElementById('lista-clases');
    if (!contenedor || contenedor.dataset.listeners === '1') return;
    contenedor.dataset.listeners = '1';

    contenedor.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-action]');
        if (!btn || btn.disabled) return;

        const action = btn.dataset.action;
        const claseId = Number(btn.dataset.claseId);

        if (action === 'inscribir') inscribirClase(claseId);
        if (action === 'cancelar') cancelarInscripcionClase(claseId);
    });
}

function renderClases(lista) {
    const contenedor = document.getElementById('lista-clases');
    if (!contenedor) return;

    if (!Array.isArray(lista) || lista.length === 0) {
        contenedor.innerHTML = '<p>No hay clases disponibles.</p>';
        return;
    }

    contenedor.innerHTML = lista.map(c => {
        const cupoTotal = c.cupo_maximo || 0;
        const inscritos = Number(c.inscritos || 0);
        const cupoLlena = cupoTotal > 0 && inscritos >= cupoTotal;
        const cerrada = Number(c.puede_inscribirse || 0) === 0;
        const yaInscrito = Number(c.ya_inscrito || 0) === 1;
        const puedeCancelar = Number(c.puede_cancelar || 0) === 1;
        const claseInactiva = (c.estado_clase || c.estado) === 'inactiva';
        const disponible = !cupoLlena && !cerrada && !yaInscrito && !claseInactiva;

        let estado = yaInscrito ? 'Ya inscrito' : '';
        if (claseInactiva && yaInscrito) estado = '❌ Clase cancelada';
        else if (claseInactiva) estado = 'No disponible';
        else if (cupoLlena) estado = 'Cupo lleno';
        else if (cerrada) estado = 'Cerrada';
        else if (yaInscrito && !puedeCancelar) estado = 'Inscrito (hoy: cancelar solo con 30 min de anticipación)';
        else estado = 'Disponible';

        let botones = '';
        if (yaInscrito && !claseInactiva) {
            botones = `
                <button type="button" class="btn-secondary" style="margin-top:10px;" disabled>Inscrito</button>
                <button
                    type="button"
                    class="btn-primary btn-cancelar-clase"
                    data-action="cancelar"
                    data-clase-id="${c.id_clase}"
                    style="margin-top:10px; margin-left:8px; background:#ff4d4d; cursor:pointer;"
                    title="${puedeCancelar ? 'Cancelar inscripción' : 'Pulsa para ver si puedes cancelar (30 min de anticipación el día de la clase)'}"
                >
                    Cancelar inscripción
                </button>
            `;
        } else {
            botones = `
                <button
                    type="button"
                    class="btn-primary"
                    data-action="inscribir"
                    data-clase-id="${c.id_clase}"
                    style="margin-top:10px;"
                    ${disponible ? '' : 'disabled'}
                >
                    ${cupoLlena ? 'Lleno' : (cerrada ? 'Cerrada' : (claseInactiva ? 'No disponible' : 'Inscribirme'))}
                </button>
            `;
        }

        return `
            <div class="card">
                <h4>${c.nombre}</h4>
                <p><strong>Días:</strong> ${c.dias || '-'}</p>
                <p><strong>Horario:</strong> ${c.hora_inicio} - ${c.hora_fin}</p>
                <p><strong>Coach:</strong> ${c.coach}</p>
                <p><strong>Cupo:</strong> ${inscritos}/${cupoTotal || '∞'}</p>
                <p><strong>Estado:</strong> <span style="color: ${yaInscrito && claseInactiva ? '#ff4d4d' : (yaInscrito ? '#00ff88' : '#ffaa00')}">${estado}</span></p>
                ${botones}
            </div>
        `;
    }).join('');
}

async function cargarClases() {
    try {
        const res = await fetch(`${API_BASE_URL}/clases?cedula=${encodeURIComponent(user.cedula)}`);
        if (!res.ok) return;

        const data = await res.json();
        clasesCache = Array.isArray(data) ? data : [];
        renderClases(clasesCache);
    } catch (error) {
        console.error('Error cargando clases:', error);
    }
}

async function inscribirClase(clase_id) {
    const user = JSON.parse(localStorage.getItem('userGymCore'));

    try {
        const res = await fetch(`${API_BASE_URL}/clases/inscribirse`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                cedula: user.cedula,
                clase_id
            })
        });

        const data = await res.json();

        if (res.ok) {
            alert(data.mensaje || 'Inscripción registrada con éxito');
            cargarClases();
        } else {
            alert(data.error || 'No se pudo inscribir');
        }
    } catch (error) {
        alert('Error de conexión');
    }
}

async function cancelarInscripcionClase(clase_id) {
    const userActual = JSON.parse(localStorage.getItem('userGymCore'));
    if (!userActual?.cedula) {
        alert('Sesión no válida. Vuelve a iniciar sesión.');
        return;
    }

    if (!confirm('¿Cancelar tu inscripción en esta clase? Se liberará el cupo.')) return;

    try {
        const res = await fetch(`${API_BASE_URL}/cancelar-clase`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                cedula: String(userActual.cedula).trim(),
                clase_id: Number(clase_id)
            })
        });

        let data = {};
        const texto = await res.text();
        try {
            data = texto ? JSON.parse(texto) : {};
        } catch {
            data = { error: texto || 'Respuesta inválida del servidor' };
        }

        if (res.ok) {
            alert(data.mensaje || 'Inscripción cancelada');
            cargarClases();
        } else {
            alert(data.error || 'No se pudo cancelar la inscripción');
        }
    } catch (error) {
        console.error('Error cancelando clase:', error);
        alert('Error de conexión con el servidor. Por favor, intenta más tarde.');
    }
}

async function guardarMedidas(e) {
    e.preventDefault();

    const payload = {
        cedula: String(user.cedula).trim(),
        peso: document.getElementById('peso').value,
        medida_brazo: document.getElementById('brazo').value || null,
        medida_pecho: document.getElementById('pecho').value || null,
        medida_pierna: document.getElementById('pierna').value || null,
        observacion: document.getElementById('observacion').value || null
    };

    try {
        const res = await fetch(`${API_BASE_URL}/medidas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (res.ok) {
            alert('Medidas guardadas con éxito');
            document.getElementById('formMedidas').reset();
            cargarMedidas();
            cargarDatosUsuario(user.cedula);
            mostrarSeccion('progreso');
        } else {
            alert(data.error || 'Error al guardar medidas');
        }
    } catch (error) {
        alert('Error de conexión');
    }
}

async function cargarMedidas() {
    const contenedor = document.getElementById('tablaMedidas');
    if (!contenedor) return;

    try {
        const res = await fetch(`${API_BASE_URL}/medidas/${user.cedula}`);
        if (!res.ok) {
            contenedor.innerHTML = '<tr><td colspan="6">No se pudieron cargar las medidas.</td></tr>';
            return;
        }

        const data = await res.json();

        if (!Array.isArray(data) || data.length === 0) {
            contenedor.innerHTML = '<tr><td colspan="6">Sin registros previos</td></tr>';
            actualizarReporteProgreso([]);
            renderGraficaPeso([]);
            return;
        }

        actualizarReporteProgreso(data);
        renderGraficaPeso(data);

        contenedor.innerHTML = data.map(m => `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 10px;">${new Date(m.fecha).toLocaleDateString()}</td>
                <td style="padding: 10px;">${Number(m.peso).toFixed(2)} kg</td>
                <td style="padding: 10px;">${m.medida_brazo || '-'}</td>
                <td style="padding: 10px;">${m.medida_pecho || '-'}</td>
                <td style="padding: 10px;">${m.medida_pierna || '-'}</td>
                <td style="padding: 10px;"><small>${m.observacion || '-'}</small></td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error cargando historial de medidas:', error);
    }
}

function calcularProgresoFisico(medidas) {
    if (!Array.isArray(medidas) || medidas.length < 2) return 0;

    const ultima = medidas[0];
    const primera = medidas[medidas.length - 1];
    const cambios = [];

    if (ultima.peso && primera.peso) {
        const diff = Math.abs(Number(ultima.peso) - Number(primera.peso));
        cambios.push(Math.min(100, (diff / 10) * 100));
    }
    if (ultima.medida_brazo && primera.medida_brazo) {
        const diff = Math.abs(Number(ultima.medida_brazo) - Number(primera.medida_brazo));
        cambios.push(Math.min(100, (diff / 10) * 100));
    }
    if (ultima.medida_pecho && primera.medida_pecho) {
        const diff = Math.abs(Number(ultima.medida_pecho) - Number(primera.medida_pecho));
        cambios.push(Math.min(100, (diff / 10) * 100));
    }
    if (ultima.medida_pierna && primera.medida_pierna) {
        const diff = Math.abs(Number(ultima.medida_pierna) - Number(primera.medida_pierna));
        cambios.push(Math.min(100, (diff / 10) * 100));
    }

    if (cambios.length === 0) return 0;
    const promedio = cambios.reduce((a, b) => a + b, 0) / cambios.length;
    return Math.min(100, Math.round(promedio));
}

function actualizarReporteProgreso(medidas) {
    if (Array.isArray(medidas) && medidas.length > 0) {
        const actual = medidas[0];
        document.getElementById('pesoActual').textContent = `${Number(actual.peso || 0).toFixed(2)} kg`;
        document.getElementById('brazoActual').textContent = `${Number(actual.medida_brazo || 0).toFixed(2)} cm`;
        document.getElementById('pechoActual').textContent = `${Number(actual.medida_pecho || 0).toFixed(2)} cm`;
        document.getElementById('piernaActual').textContent = `${Number(actual.medida_pierna || 0).toFixed(2)} cm`;
    }

    actualizarBarraConstancia();

    const progresoFisico = calcularProgresoFisico(medidas);
    const barraFisico = document.getElementById('barraFisico');
    const porcentajeFisicoSpan = document.getElementById('porcentajeFisico');
    if (barraFisico) barraFisico.style.width = `${progresoFisico}%`;
    if (porcentajeFisicoSpan) porcentajeFisicoSpan.textContent = `${progresoFisico}%`;
}

function renderGraficaPeso(medidas) {
    const canvas = document.getElementById('graficaPeso');
    if (!canvas) return;

    if (graficaPesoInstance) {
        graficaPesoInstance.destroy();
        graficaPesoInstance = null;
    }

    if (!Array.isArray(medidas) || medidas.length === 0) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
    }

    const ordenadas = [...medidas].reverse();
    const labels = ordenadas.map(m => new Date(m.fecha).toLocaleDateString());
    const pesos = ordenadas.map(m => Number(m.peso || 0));

    graficaPesoInstance = new Chart(canvas.getContext('2d'), {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Peso (kg)',
                data: pesos,
                tension: 0.3,
                fill: true,
                borderColor: '#00ff88',
                backgroundColor: 'rgba(0, 255, 136, 0.1)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: '#ffffff' } }
            },
            scales: {
                x: { ticks: { color: '#ffffff' }, grid: { color: '#333333' } },
                y: { ticks: { color: '#ffffff' }, grid: { color: '#333333' } }
            }
        }
    });
}

function logout() {
    localStorage.removeItem('userGymCore');
    window.location.replace('../index.html');
}