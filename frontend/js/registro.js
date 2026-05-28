function adaptarFormulario() {
    const rol = document.getElementById('tipoRol').value;
    const divEntrenador = document.getElementById('seccionEntrenador');
    const divUsuario = document.getElementById('seccionUsuario');
    const btn = document.getElementById('btnAccion');

    if (rol === 'entrenador') {
        divEntrenador.style.display = 'block';
        divUsuario.style.display = 'none';
        btn.textContent = 'Registrar Entrenador';
    } else {
        divEntrenador.style.display = 'none';
        divUsuario.style.display = 'block';
        btn.textContent = 'Registrar Usuario';
    }
}

// Función para validar la cédula
function validarCedula(cedula) {
    const soloNumeros = /^\d+$/.test(cedula);
    return cedula.length === 10 && soloNumeros;
}

// evento submit corregido
document.getElementById('formGymCore').addEventListener('submit', async (e) => {
    e.preventDefault();

    // Validar cédula
    const cedula = document.getElementById('cedula').value.trim();
    if (!validarCedula(cedula)) {
        alert('La cédula debe tener exactamente 10 dígitos numéricos.');
        document.getElementById('cedula').focus();
        return;
    }

    const rol = document.getElementById('tipoRol').value;

    const rutas = {
        entrenador: 'entrenador',
        usuario: 'usuario'
    };

    const datos = {
        cedula: cedula,
        nombre: document.getElementById('nombre').value,
        apellido: document.getElementById('apellido').value,
        telefono: document.getElementById('telefono').value,
        correo: document.getElementById('correo').value,
        especialidad: document.getElementById('especialidad')?.value || null,
        objetivo_general: document.getElementById('objetivo')?.value || null,
        fecha_nacimiento: document.getElementById('fechaNacimiento')?.value || null
    };

    try {
        const response = await fetch(`https://gymcore-wf8t.onrender.com/api/${rutas[rol]}/registrar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datos)
        });

        const data = await response.json();

        if (response.ok) {
            alert('¡Registro completado!');
            document.getElementById('formGymCore').reset();
            // Redirigir al login
            window.location.href = 'login.html';
        } else {
            alert('Error: ' + data.error);
        }
    } catch (error) {
        alert('No se pudo conectar con el servidor');
    }
});