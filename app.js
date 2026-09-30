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

    /* ============================================================
   MÓDULO 3: RESPONSIVE DEL ESQUELETO INTERACTIVO
   Recalcula las coordenadas del <map> cuando cambia el tamaño
   de la imagen (el <map> HTML solo acepta píxeles).
   ============================================================ */
    function inicializarEsqueletoResponsive() {
        const img = document.querySelector('.esqueleto-img');
        const areas = document.querySelectorAll('map[name="mapa-huesos"] area');
        if (!img || areas.length === 0) return;

        // Guardamos las coordenadas originales una sola vez
        areas.forEach((area) => {
            if (!area.dataset.originalCoords) {
                area.dataset.originalCoords = area.getAttribute('coords');
            }
        });

        function reescalarMapa() {
            // Si la imagen todavía no cargó, esperamos
            if (!img.naturalWidth) return;

            const factor = img.clientWidth / img.naturalWidth;

            areas.forEach((area) => {
                const [x, y, r] = area.dataset.originalCoords.split(',').map(Number);
                area.setAttribute(
                    'coords',
                    `${Math.round(x * factor)},${Math.round(y * factor)},${Math.round(r * factor)}`
                );
            });
        }

        // Recalcular cuando la imagen termine de cargar
        if (img.complete) {
            reescalarMapa();
        } else {
            img.addEventListener('load', reescalarMapa);
        }

        // Recalcular cuando cambia el tamaño de la ventana
        window.addEventListener('resize', reescalarMapa);
    }

    // Llamada a la inicialización
    inicializarEsqueletoResponsive();

    // Desacoplamiento para el botón de cerrar sesión
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            vistaAutenticado.classList.add('hidden');
            vistaVisitante.classList.remove('hidden');
        });
    }
});