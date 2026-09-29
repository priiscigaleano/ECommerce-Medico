document.addEventListener('DOMContentLoaded', () => {
    const formLogin = document.getElementById('formulario-login');
    const btnLogout = document.getElementById('btn-logout');
    
    const vistaVisitante = document.getElementById('vista-visitante');
    const vistaAutenticado = document.getElementById('vista-autenticado');
    const mensajeDiv = document.getElementById('mensaje-login');
    const msjBienvenida = document.getElementById('mensaje-bienvenida');

    // 1. DESACOPLAMIENTO: Escuchamos el evento submit sin usar onsubmit en el HTML
    if (formLogin) {
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault(); // Evitamos que la página se recargue

            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value.trim();

            // Validación de longitud mínima de la consigna
            if (password.length < 6) {
                mensajeDiv.innerHTML = '<p class="msg-error">La contraseña debe tener al menos 6 caracteres.</p>';
                return;
            }

            mensajeDiv.innerHTML = '<p class="msg-exito">Verificando credenciales...</p>';

            try {
                // 2. ASINCRONÍA Y HTTP: Consumimos el JSON local simulando un servidor
                const respuesta = await fetch('usuarios.json');
                const usuarios = await respuesta.json();

                // Verificamos si existe el usuario
                const usuarioValido = usuarios.find(user => user.email === email && user.password === password);

                if (usuarioValido) {
                    // Cambiamos la visibilidad (Aplicación de VSDM)
                    vistaVisitante.classList.add('hidden');
                    vistaAutenticado.classList.remove('hidden');
                    msjBienvenida.textContent = `¡Hola, ${usuarioValido.nombre}! Bienvenido a La Tienda del Traumatólogo.`;
                    formLogin.reset();
                    mensajeDiv.innerHTML = '';
                } else {
                    mensajeDiv.innerHTML = '<p class="msg-error">Credenciales incorrectas. Intente nuevamente.</p>';
                }

            } catch (error) {
                mensajeDiv.innerHTML = '<p class="msg-error">Error al conectar con el servidor.</p>';
            }
        });
    }

    // Desacoplamiento para el botón de cerrar sesión
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            vistaAutenticado.classList.add('hidden');
            vistaVisitante.classList.remove('hidden');
        });
    }
});