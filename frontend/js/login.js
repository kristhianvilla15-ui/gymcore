document.addEventListener('DOMContentLoaded', () => {
    localStorage.removeItem('userGymCore');
});

document.getElementById('formLogin').addEventListener('submit', async (e) => {
    e.preventDefault();

    const rol = document.getElementById('rolLogin').value;
    const correo = document.getElementById('correoLogin').value;
    const cedula = document.getElementById('cedulaLogin').value;

    try {
        const response = await fetch('https://gymcore-wf8t.onrender.com/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rol, correo, cedula })
        });

        const data = await response.json();

        if (!response.ok) {
            return alert('Error: ' + (data.error || 'No se pudo iniciar sesión'));
        }

        const usuario = data.usuario || {};

        const userFinal = {
            id_usuario: usuario.id_usuario || null,
            id_entrenador: usuario.id_entrenador || null,
            id_admin: usuario.id_admin || null,
            id: usuario.id || null,
            cedula: usuario.cedula ? String(usuario.cedula).trim() : cedula,
            nombre: usuario.nombre || '',
            apellido: usuario.apellido || '',
            rol: usuario.rol || rol
        };

        localStorage.setItem('userGymCore', JSON.stringify(userFinal));

        alert(`Bienvenido ${userFinal.nombre}`);

        if (userFinal.rol === 'entrenador') {
            window.location.replace('entrenador.html');
        } else if (userFinal.rol === 'admin') {
            window.location.replace('admin.html');
        } else {
            window.location.replace('usuario.html');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error de conexión con el servidor');
    }
});