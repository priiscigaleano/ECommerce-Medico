document.addEventListener('DOMContentLoaded', () => {

    /* ============================================================
       MÓDULO 1: LOGIN
       ============================================================ */
    const formLogin = document.getElementById('formulario-login');
    const btnLogout = document.getElementById('btn-logout');

    const vistaVisitante = document.getElementById('vista-visitante');
    const vistaAutenticado = document.getElementById('vista-autenticado');
    const mensajeDiv = document.getElementById('mensaje-login');
    const msjBienvenida = document.getElementById('mensaje-bienvenida');

    if (formLogin) {
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value.trim();

            if (password.length < 6) {
                mensajeDiv.innerHTML = '<p class="msg-error">La contraseña debe tener al menos 6 caracteres.</p>';
                return;
            }

            mensajeDiv.innerHTML = '<p class="msg-exito">Verificando credenciales...</p>';

            try {
                const respuesta = await fetch('usuarios.json');
                const usuarios = await respuesta.json();
                const usuarioValido = usuarios.find(u => u.email === email && u.password === password);

                if (usuarioValido) {
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

    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            vistaAutenticado.classList.add('hidden');
            vistaVisitante.classList.remove('hidden');
        });
    }


    /* ============================================================
       MÓDULO 2: RESPONSIVE DEL ESQUELETO INTERACTIVO
       ============================================================ */
    function inicializarEsqueletoResponsive() {
        const img = document.querySelector('.esqueleto-img');
        const areas = document.querySelectorAll('map[name="mapa-huesos"] area');
        if (!img || areas.length === 0) return;

        areas.forEach((area) => {
            if (!area.dataset.originalCoords) {
                area.dataset.originalCoords = area.getAttribute('coords');
            }
        });

        function reescalarMapa() {
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

        if (img.complete) {
            reescalarMapa();
        } else {
            img.addEventListener('load', reescalarMapa);
        }

        window.addEventListener('resize', reescalarMapa);
    }

    inicializarEsqueletoResponsive();


    /* ============================================================
       MÓDULO 3: CALCULADOR DE PRESUPUESTOS (Opción 5)
       ============================================================ */
    const formPresupuesto = document.getElementById('form-presupuesto');

    if (formPresupuesto) {
        let tarifas = null;

        const formatoMoneda = (n) =>
            new Intl.NumberFormat('es-AR', {
                style: 'currency',
                currency: 'ARS',
                minimumFractionDigits: 2
            }).format(n);

        /* ---------- Carga asíncrona ---------- */
        async function cargarTarifas() {
            try {
                const respuesta = await fetch('tarifas.json');
                if (!respuesta.ok) throw new Error(`Error HTTP ${respuesta.status}`);
                tarifas = await respuesta.json();
                console.log('Tarifas cargadas:', tarifas);
                return tarifas;
            } catch (error) {
                console.error('No se pudieron cargar las tarifas:', error);
                mostrarError('No se pudo cargar la tabla de precios. Reintentá más tarde.');
                return null;
            }
        }

        /* ---------- Poblar el <select> ---------- */
        function poblarProductos(productos) {
            const select = document.getElementById('producto');
            if (!select) return;

            select.innerHTML = '<option value="">— Seleccioná un producto —</option>';

            productos.forEach((prod) => {
                const opt = document.createElement('option');
                opt.value = prod.id;
                opt.textContent = `${prod.nombre} — ${formatoMoneda(prod.precioUnitario)} / ${prod.unidad}`;
                opt.dataset.precio = prod.precioUnitario;
                select.appendChild(opt);
            });
        }

        /* ---------- Cálculo condicional ---------- */
        function calcularPresupuesto() {
            if (!tarifas) return;

            const productoId  = document.getElementById('producto').value;
            const cantidad    = parseInt(document.getElementById('cantidad').value, 10) || 0;
            const tipoCliente = document.getElementById('tipo-cliente').value;
            const formaPago   = document.getElementById('pago').value;
            const conIva      = document.getElementById('con-iva').checked;

            if (!productoId || cantidad < 1) {
                limpiarResultado();
                return;
            }

            const producto = tarifas.productos.find((p) => p.id === productoId);
            if (!producto) return;

            const subtotal = producto.precioUnitario * cantidad;

            const tramo = tarifas.descuentosPorVolumen.find(
                (t) => cantidad >= t.minimo && (t.maximo === null || cantidad <= t.maximo)
            );
            const pctVolumen   = tramo ? tramo.porcentaje : 0;
            const montoVolumen = subtotal * (pctVolumen / 100);

            const pctCliente   = tarifas.descuentosPorCliente[tipoCliente]?.porcentaje ?? 0;
            const baseCliente  = subtotal - montoVolumen;
            const montoCliente = baseCliente * (pctCliente / 100);

            const pctPago   = tarifas.ajustesPorPago[formaPago]?.porcentaje ?? 0;
            const basePago  = baseCliente - montoCliente;
            const montoPago = basePago * (pctPago / 100);

            const subtotalAjustado = basePago + montoPago;

            const montoIva = conIva ? subtotalAjustado * (tarifas.iva / 100) : 0;
            const total = subtotalAjustado + montoIva;

            actualizarResultado({
                subtotal,
                pctVolumen, montoVolumen,
                pctCliente, montoCliente,
                pctPago,    montoPago,
                subtotalAjustado,
                montoIva,
                total,
                conIva
            });
        }

        /* ---------- DOM ---------- */
        function actualizarResultado(r) {
            const set = (id, texto) => {
                const el = document.querySelector(id);
                if (el) el.textContent = texto;
            };

            set('#out-subtotal', formatoMoneda(r.subtotal));

            set('#out-volumen',
                r.pctVolumen > 0
                    ? `-${formatoMoneda(r.montoVolumen)} (${r.pctVolumen}%)`
                    : 'Sin descuento');

            set('#out-cliente',
                r.pctCliente > 0
                    ? `-${formatoMoneda(r.montoCliente)} (${r.pctCliente}%)`
                    : 'Sin descuento');

            set('#out-pago',
                r.pctPago === 0
                    ? 'Sin ajuste'
                    : `${formatoMoneda(r.montoPago)} (${r.pctPago > 0 ? '+' : ''}${r.pctPago}%)`);

            set('#out-subtotal-ajustado', formatoMoneda(r.subtotalAjustado));
            set('#out-iva', r.conIva ? formatoMoneda(r.montoIva) : 'No aplica');
            set('#out-total', formatoMoneda(r.total));
        }

        function limpiarResultado() {
            ['#out-subtotal', '#out-volumen', '#out-cliente', '#out-pago',
             '#out-subtotal-ajustado', '#out-iva', '#out-total']
                .forEach((id) => {
                    const el = document.querySelector(id);
                    if (el) el.textContent = '—';
                });
        }

        function mostrarError(mensaje) {
            const panel = document.getElementById('resultado-presupuesto');
            if (!panel) return;
            panel.insertAdjacentHTML(
                'afterbegin',
                `<p class="msg-error" role="alert">${mensaje}</p>`
            );
        }

        /* ---------- Inicialización ---------- */
        async function inicializarCalculadora() {
            const datos = await cargarTarifas();
            if (!datos) return;

            poblarProductos(datos.productos);

            formPresupuesto.addEventListener('change', (evento) => {
                const idsRelevantes = ['producto', 'cantidad', 'tipo-cliente', 'pago', 'con-iva'];
                if (idsRelevantes.includes(evento.target.id)) {
                    calcularPresupuesto();
                }
            });

            const inputCantidad = document.getElementById('cantidad');
            if (inputCantidad) {
                inputCantidad.addEventListener('input', calcularPresupuesto);
            }
        }

        inicializarCalculadora();
    }

});