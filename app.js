document.addEventListener('DOMContentLoaded', () => {

    /* ============================================================
       MÓDULO 1: AUTENTICACIÓN (PHP + MYSQL)
       ============================================================ */
    const formLogin = document.getElementById('formulario-login');
    const formRegistro = document.getElementById('formulario-registro');
    const btnLogout = document.getElementById('btn-logout');
    
    const vistaVisitante = document.getElementById('vista-visitante');
    const vistaAutenticado = document.getElementById('vista-autenticado');
    
    // Elementos de las pestañas
    const tabLogin = document.getElementById('tab-login');
    const tabRegistro = document.getElementById('tab-registro');
    const boxLogin = document.getElementById('form-login-box');
    const boxRegistro = document.getElementById('form-registro-box');

    // Cambio de pestañas
    if(tabLogin && tabRegistro) {
        tabLogin.addEventListener('click', () => {
            boxLogin.style.display = 'block';
            boxRegistro.style.display = 'none';
            tabLogin.style.backgroundColor = '#09246e';
            tabRegistro.style.backgroundColor = '#aaa';
        });
        tabRegistro.addEventListener('click', () => {
            boxLogin.style.display = 'none';
            boxRegistro.style.display = 'block';
            tabLogin.style.backgroundColor = '#aaa';
            tabRegistro.style.backgroundColor = '#27ae60';
        });
    }

    // 1. Login con PHP
    if (formLogin) {
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value.trim();
            const mensajeDiv = document.getElementById('mensaje-login');

            mensajeDiv.style.color = '#555';
            mensajeDiv.textContent = 'Verificando credenciales...';

            try {
                // Conexión a la API de Login
                const res = await fetch('api/login.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                
                const data = await res.json();

                if (res.ok && data.estado === 'exito') {
                    // Sanitización XSS: Usamos textContent
                    document.getElementById('mensaje-bienvenida').textContent = `¡Hola, ${data.usuario.nombre}! Bienvenido a La Tienda del Traumatólogo.`;
                    document.getElementById('user-email').textContent = data.usuario.email;
                    
                    vistaVisitante.classList.add('hidden');
                    vistaAutenticado.classList.remove('hidden');
                    formLogin.reset();
                    mensajeDiv.textContent = '';
                } else {
                    mensajeDiv.style.color = 'red';
                    mensajeDiv.textContent = data.mensaje || 'Credenciales incorrectas.';
                }
            } catch (error) {
                mensajeDiv.style.color = 'red';
                mensajeDiv.textContent = 'Error al conectar con el servidor.';
            }
        });
    }

    // 2. Registro con PHP
    if (formRegistro) {
        formRegistro.addEventListener('submit', async (e) => {
            e.preventDefault();
            const nombre = document.getElementById('reg-nombre').value.trim();
            const email = document.getElementById('reg-email').value.trim();
            const password = document.getElementById('reg-password').value.trim();
            const mensajeDiv = document.getElementById('mensaje-registro');

            mensajeDiv.textContent = 'Registrando usuario...';

            try {
                const res = await fetch('api/registro.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nombre, email, password })
                });
                
                const data = await res.json();

                if (res.ok && data.estado === 'exito') {
                    mensajeDiv.style.color = 'green';
                    mensajeDiv.textContent = '¡Usuario registrado! Ya podés iniciar sesión.';
                    formRegistro.reset();
                    // Pasamos a la pestaña de login automáticamente
                    setTimeout(() => tabLogin.click(), 2000);
                } else {
                    mensajeDiv.style.color = 'red';
                    mensajeDiv.textContent = data.mensaje || 'Error al registrar.';
                }
            } catch (error) {
                mensajeDiv.style.color = 'red';
                mensajeDiv.textContent = 'Error al conectar con el servidor.';
            }
        });
    }

    // 3. Logout
    if (btnLogout) {
        btnLogout.addEventListener('click', async () => {
            try {
                await fetch('api/logout.php', { method: 'POST' });
            } catch(e) {}
            vistaAutenticado.classList.add('hidden');
            vistaVisitante.classList.remove('hidden');
        });
    }

    /* ============================================================
       MÓDULO 2: CALCULADOR DE PRESUPUESTOS (Opción 5)
       ============================================================ */
    const formPresupuesto = document.getElementById('form-presupuesto');
    
    if (formPresupuesto) {
        let tarifas = null;
        const formatoMoneda = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2 }).format(n);

        async function cargarTarifas() {
            try {
                const res = await fetch('tarifas.json');
                if (!res.ok) throw new Error('Error');
                tarifas = await res.json();
                poblarServicios(tarifas.servicios);
            } catch (error) {
                console.error('Error al cargar tarifas', error);
            }
        }

        function poblarServicios(servicios) {
            const select = document.getElementById('servicio');
            if (!select) return;
            select.innerHTML = '<option value="">— Seleccioná un servicio —</option>';
            servicios.forEach(serv => {
                const opt = document.createElement('option');
                opt.value = serv.id;
                opt.textContent = `${serv.nombre} — ${formatoMoneda(serv.precioUnitario)} / ${serv.unidad}`;
                select.appendChild(opt);
            });
        }

        function calcularPresupuesto() {
            if (!tarifas) return;
            const servicioId  = document.getElementById('servicio').value;
            const cantidad    = parseInt(document.getElementById('cantidad').value, 10) || 0;
            const tipoCliente = document.getElementById('tipo-cliente').value;
            const formaPago   = document.getElementById('pago').value;
            const conIva      = document.getElementById('con-iva').checked;

            if (!servicioId || cantidad < 1) return;

            const servicio = tarifas.servicios.find(s => s.id === servicioId);
            if (!servicio) return;

            const subtotal = servicio.precioUnitario * cantidad;
            
            const tramo = tarifas.descuentosPorVolumen.find(t => cantidad >= t.minimo && (t.maximo === null || cantidad <= t.maximo));
            const pctVolumen = tramo ? tramo.porcentaje : 0;
            const montoVolumen = subtotal * (pctVolumen / 100);

            const pctCliente = tarifas.descuentosPorCliente[tipoCliente]?.porcentaje ?? 0;
            const baseCliente = subtotal - montoVolumen;
            const montoCliente = baseCliente * (pctCliente / 100);

            const pctPago = tarifas.ajustesPorPago[formaPago]?.porcentaje ?? 0;
            const basePago = baseCliente - montoCliente;
            const montoPago = basePago * (pctPago / 100);

            const subtotalAjustado = basePago + montoPago;
            const montoIva = conIva ? subtotalAjustado * (tarifas.iva / 100) : 0;
            const total = subtotalAjustado + montoIva;

            // Actualizamos el DOM
            document.querySelector('#out-subtotal').textContent = formatoMoneda(subtotal);
            document.querySelector('#out-volumen').textContent = pctVolumen > 0 ? `-${formatoMoneda(montoVolumen)} (${pctVolumen}%)` : 'Sin descuento';
            document.querySelector('#out-cliente').textContent = pctCliente > 0 ? `-${formatoMoneda(montoCliente)} (${pctCliente}%)` : 'Sin descuento';
            document.querySelector('#out-pago').textContent = pctPago !== 0 ? `${formatoMoneda(montoPago)} (${pctPago}%)` : 'Sin ajuste';
            document.querySelector('#out-subtotal-ajustado').textContent = formatoMoneda(subtotalAjustado);
            document.querySelector('#out-iva').textContent = conIva ? formatoMoneda(montoIva) : 'No aplica';
            document.querySelector('#out-total').textContent = formatoMoneda(total);
        }

        formPresupuesto.addEventListener('change', (e) => {
            if (['servicio', 'cantidad', 'tipo-cliente', 'pago', 'con-iva'].includes(e.target.id)) calcularPresupuesto();
        });
        
        document.getElementById('cantidad')?.addEventListener('input', calcularPresupuesto);
        
        cargarTarifas();
    }
});