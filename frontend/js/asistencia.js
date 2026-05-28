// ======================================
// URL BASE DEL BACKEND
// ======================================

const API = 'http://localhost:3000/api/asistencia';


// ======================================
// FUNCION PARA MOSTRAR MENSAJES
// ======================================

function mostrarMensaje(texto, tipo = '') {

    const mensaje = document.getElementById('mensaje');

    // Limpia clases anteriores
    mensaje.className = '';

    // Agrega la clase correspondiente
    mensaje.classList.add(tipo);

    // Cambia el texto
    mensaje.textContent = texto;
}


// ======================================
// OBTENER CEDULA
// ======================================

function obtenerCedula() {

    const cedula = document
        .getElementById('cedula')
        .value
        .trim();

    return cedula;
}


// ======================================
// REGISTRAR ENTRADA
// ======================================

async function registrarEntrada() {

    const cedula = obtenerCedula();

    // Validación
    if (!cedula) {

        mostrarMensaje(
            'Debes ingresar la cédula.',
            'error'
        );

        return;
    }

    try {

        // Petición al backend
        const response = await fetch(`${API}/entrada`, {

            method: 'POST',

            headers: {
                'Content-Type': 'application/json'
            },

            body: JSON.stringify({
                cedula
            })
        });

        const data = await response.json();

        // Si hubo error
        if (!response.ok) {

            mostrarMensaje(
                data.error || 'Error al registrar entrada.',
                'error'
            );

            return;
        }

        // Éxito
        mostrarMensaje(
            data.mensaje,
            'ok'
        );

    } catch (error) {

        console.error(error);

        mostrarMensaje(
            'Error de conexión con el servidor.',
            'error'
        );
    }
}


// ======================================
// REGISTRAR SALIDA
// ======================================

async function registrarSalida() {

    const cedula = obtenerCedula();

    // Validación
    if (!cedula) {

        mostrarMensaje(
            'Debes ingresar la cédula.',
            'error'
        );

        return;
    }

    try {

        // Petición al backend
        const response = await fetch(`${API}/salida`, {

            method: 'POST',

            headers: {
                'Content-Type': 'application/json'
            },

            body: JSON.stringify({
                cedula
            })
        });

        const data = await response.json();

        // Si hubo error
        if (!response.ok) {

            mostrarMensaje(
                data.error || 'Error al registrar salida.',
                'error'
            );

            return;
        }

        // Éxito
        mostrarMensaje(
            data.mensaje,
            'ok'
        );

    } catch (error) {

        console.error(error);

        mostrarMensaje(
            'Error de conexión con el servidor.',
            'error'
        );
    }
}