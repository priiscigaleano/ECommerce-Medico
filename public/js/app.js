'use strict';
/* SPA de La Tienda del Traumatólogo (AE4) — JavaScript Vanilla, fetch + async/await.
   Datos dinámicos siempre con .textContent (mitigación XSS, OWASP A03). */
const API = '../api/';
const vista = document.getElementById('vista');
const sesion = { usuario: null };
const $ = (sel) => vista.querySelector(sel);
const moneda = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' });

async function api(ruta, opciones = {}) {
  try {
    const resp = await fetch(API + ruta, { credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, ...opciones });
    const cuerpo = await resp.json().catch(() => ({}));
    return { ok: resp.ok, codigo: resp.status, ...cuerpo };
  } catch (e) {
    return { ok: false, codigo: 0, mensaje: 'No se pudo conectar con el servidor.' };
  }
}

function aviso(elemento, texto, exito) {
  elemento.textContent = texto;
  elemento.className = exito ? 'msg-ok' : 'msg-error';
}

function montar(idPlantilla, titulo) {
  vista.replaceChildren(document.getElementById(idPlantilla).content.cloneNode(true));
  document.title = titulo + ' | La Tienda del Traumatólogo';
}

/* ---------- Sesión (estado + enlaces del menú) ---------- */
function pintarSesion() {
  document.querySelectorAll('.enlace-sesion').forEach((a) => {
    a.textContent = sesion.usuario ? `Salir (${sesion.usuario.nombre})` : 'Ingresar';
    a.setAttribute('href', sesion.usuario ? '#/salir' : '#/ingresar');
  });
}
async function cargarSesion() {
  const r = await api('perfil.php'); // 401 si no hay sesión activa
  sesion.usuario = r.ok ? r.data : null;
  pintarSesion();
}
const esAdmin = () => sesion.usuario?.rol === 'admin';

/* ---------- Vista: inicio (esqueleto interactivo) ---------- */
const BASE_MAPA = 280; // ancho para el que se midieron las coordenadas originales
function escalarMapa() {
  const img = document.querySelector('.esqueleto-img');
  if (!img || !img.clientWidth) return;
  const k = img.clientWidth / BASE_MAPA;
  document.querySelectorAll('map[name="mapa-huesos"] area').forEach((a) => {
    if (!a.dataset.base) a.dataset.base = a.getAttribute('coords');
    a.setAttribute('coords', a.dataset.base.split(',').map((n) => Math.round(n * k)).join(','));
  });
  const interactivo = document.querySelector('.esqueleto-interactivo');
  if (interactivo) interactivo.style.setProperty('--escala', k);
}

function configurarEsqueletoInteractivo() {
  const img = $('.esqueleto-img');
  if (img) {
    img.complete ? escalarMapa() : img.addEventListener('load', escalarMapa);
  }
  
  // Interceptar clics en el mapa de huesos para filtrar el catálogo sin recargar la SPA
  vista.querySelectorAll('area[data-area]').forEach(area => {
    area.setAttribute('tabindex', '0');
    area.addEventListener('click', (e) => {
      e.preventDefault();
      const zona = area.dataset.area;
      location.hash = `#/catalogo?area=${encodeURIComponent(zona)}`;
    });
    area.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        area.click();
      }
    });
  });
}

function vistaInicio() {
  montar('tpl-inicio', 'Inicio');
  configurarEsqueletoInteractivo();
}
window.addEventListener('resize', escalarMapa);

/* ---------- Vista: catálogo (lee y, si es admin, administra por la API REST) ---------- */
let vistaActualCatalogo = 'tabla'; // 'tabla' | 'box'
let zonaFiltroActual = null;

function celda(texto, clase) {
  const td = document.createElement('td');
  td.textContent = texto;
  if (clase) td.className = clase;
  return td;
}

function boton(texto, accion, id, clase = '') {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = `btn-peq ${clase}`.trim();
  b.textContent = texto;
  b.dataset.accion = accion;
  b.dataset.id = id;
  return b;
}

function renderizarTablaProductos(prods) {
  const wrapper = document.createElement('div');
  wrapper.className = 'tabla-scroll';
  
  const table = document.createElement('table');
  table.className = 'product-table';
  
  const caption = document.createElement('caption');
  caption.className = 'sr-only';
  caption.textContent = 'Listado de productos con precio y stock';
  
  const thead = document.createElement('thead');
  const trHead = document.createElement('tr');
  
  // Armamos los encabezados de la tabla
  ['ID', 'Producto', 'Descripción', 'Precio', 'Stock', 'Acciones'].forEach((txt, index) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = txt;
    if (txt === 'Acciones') {
      th.id = 'th-acciones';
      if (!esAdmin()) th.hidden = true; // Ocultar para no administradores
    }
    trHead.append(th);
  });
  thead.append(trHead);

  const tbody = document.createElement('tbody');
  tbody.id = 'cat-cuerpo';

  // Recorremos cada producto
  prods.forEach(p => {
    const tr = document.createElement('tr');
    
    // 1. Agregamos las celdas de datos del producto
    tr.append(
      celda(p.id), 
      celda(p.nombre), 
      celda(p.descripcion || '—'), 
      celda(moneda.format(Number(p.precio))), 
      celda(p.stock)
    );

    // 2. Creamos la celda de Acciones
    const tdAcciones = document.createElement('td');
    tdAcciones.className = 'acciones';

    // Botón de Comprar y Ver (disponible para todos)
    const btnComprar = boton('Comprar', 'comprar', p.id, 'btn-comprar-spa');
    btnComprar.addEventListener('click', () => { location.hash = '#/comprar?id=' + p.id; });
    const btnVer = boton('Ver', 'ver', p.id, 'btn-sec'); 
    btnVer.style.padding = '6px 12px';
    btnVer.style.fontSize = '0.85em';
    btnVer.style.marginRight = '4px';
    btnVer.addEventListener('click', () => vistaProducto(p.id));
    
    tdAcciones.append(btnVer, btnComprar);

    // Si es admin, agregamos botones de Editar y Eliminar
    if (esAdmin()) {
      const btnEditar = boton('Editar', 'editar', p.id);
      btnEditar.addEventListener('click', () => abrirForm(productos.find((prod) => String(prod.id) === String(p.id))));
      
      const btnEliminar = boton('Eliminar', 'eliminar', p.id, 'peligro');
      // La acción de eliminar se mantiene delegada a accionFila
      
      tdAcciones.append(btnEditar, btnEliminar);
    }

    tr.append(tdAcciones);
    tbody.append(tr);
  });

  table.append(caption, thead, tbody);
  wrapper.append(table);
  return wrapper;
}

function renderizarGridProductos(prods) {
  const grid = document.createElement('div');
  grid.className = 'grid-productos';
  grid.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 1rem; margin-top: 1rem;';

  prods.forEach(p => {
    const article = document.createElement('article');
    article.className = 'card-producto';
    article.style.cssText = 'border: 1px solid #ddd; padding: 1rem; border-radius: 8px; background: #fff; display: flex; flex-direction: column; justify-content: space-between;';

    const infoDiv = document.createElement('div');
    const h3 = document.createElement('h3');
    h3.textContent = p.nombre;
    h3.style.marginBottom = '0.5rem';

    const pDesc = document.createElement('p');
    pDesc.textContent = p.descripcion || 'Sin descripción';
    pDesc.style.fontSize = '0.9rem';
    pDesc.style.color = '#555';

    infoDiv.append(h3, pDesc);

    const footerDiv = document.createElement('div');
    footerDiv.style.cssText = 'margin-top: 1rem; display: flex; justify-content: space-between; align-items: center;';

    const spanPrecio = document.createElement('span');
    spanPrecio.textContent = moneda.format(Number(p.precio));
    spanPrecio.style.fontWeight = 'bold';
    spanPrecio.style.color = '#2c3e50';

    // Crear los botones y asignarles el evento directamente
    const btnComprar = boton('Comprar', 'comprar', p.id, 'btn-comprar-spa');
    btnComprar.addEventListener('click', () => { location.hash = '#/comprar?id=' + p.id; });

    const btnVer = boton('Ver', 'ver', p.id, 'btn-sec');
    btnVer.style.padding = '6px 12px';
    btnVer.style.fontSize = '0.85em';
    btnVer.addEventListener('click', () => { location.hash = '#/producto?id=' + p.id; });
    const btnGroup = document.createElement('div');
    btnGroup.style.display = 'flex';
    btnGroup.style.gap = '5px';
    btnGroup.append(btnVer, btnComprar);

    footerDiv.append(spanPrecio, btnGroup);

    if (esAdmin()) {
      const adminDiv = document.createElement('div');
      adminDiv.style.cssText = 'margin-top: 0.5rem; display: flex; gap: 0.5rem;';
      adminDiv.append(boton('Editar', 'editar', p.id), boton('Eliminar', 'eliminar', p.id, 'peligro'));
      infoDiv.append(adminDiv);
    }

    article.append(infoDiv, footerDiv);
    grid.append(article);
  });

  return grid;
}

function actualizarContenedorCatalogo(prods) {
  const contenedor = $('#catalogo-contenido-dinamico');
  if (!contenedor) return;
  contenedor.replaceChildren(
    vistaActualCatalogo === 'tabla' ? renderizarTablaProductos(prods) : renderizarGridProductos(prods)
  );
}

let productos = [];
const NOMBRES_AREA = { clavicula: 'Clavícula', humero: 'Húmero', antebrazo: 'Antebrazo', 'radio-cubito': 'Radio y Cúbito',
  mano: 'Mano', cadera: 'Cadera', femur: 'Fémur', tibia: 'Tibia', perone: 'Peroné', pie: 'Pie' };

async function listarProductos() {
  const estado = $('#cat-estado');
  const nombreZona = NOMBRES_AREA[zonaFiltroActual];
  $('#t-cat').textContent = nombreZona ? `Productos para ${nombreZona}` : 'Catálogo de productos';
  aviso(estado, 'Cargando productos…', true);
  
  // El filtro lo resuelve el servidor (columna area): no depende de tildes ni de texto libre
  const r = await api(zonaFiltroActual ? `productos.php?area=${encodeURIComponent(zonaFiltroActual)}` : 'productos.php');
  if (!r.ok) {
    aviso(estado, r.codigo === 400 ? 'Esa zona del esqueleto no existe.' : 'No se pudo cargar el catálogo. Reintentá más tarde.', false);
    actualizarContenedorCatalogo([]);
    return;
  }
  productos = r.data;
  if (nombreZona) {
    aviso(estado, productos.length ? `${productos.length} producto(s) para ${nombreZona}.` : `Todavía no hay productos cargados para ${nombreZona}.`, productos.length > 0);
  } else {
    aviso(estado, `${productos.length} productos disponibles.`, true);
  }
  actualizarContenedorCatalogo(productos);
}

function abrirForm(p) {
  const f = $('#form-producto');
  f.hidden = false;
  $('#t-form').textContent = p ? 'Editar producto' : 'Nuevo producto';
  $('#p-id').value = p ? p.id : '';
  $('#p-nombre').value = p ? p.nombre : '';
  $('#p-descripcion').value = p ? p.descripcion : '';
  $('#p-precio').value = p ? p.precio : '';
  $('#p-stock').value = p ? p.stock : 0;
  $('#p-categoria').value = p ? p.categoria : 'osteosintesis';
  $('#p-area').value = p && p.area ? p.area : (p ? '' : (zonaFiltroActual || ''));
  $('#p-nombre').focus();
}

async function guardarProducto(e) {
  e.preventDefault();
  const id = $('#p-id').value;
  const datos = {
    nombre: $('#p-nombre').value, descripcion: $('#p-descripcion').value,
    precio: $('#p-precio').value, stock: $('#p-stock').value, categoria: $('#p-categoria').value, area: $('#p-area').value,
  };
  const r = await api(id ? `productos.php?id=${encodeURIComponent(id)}` : 'productos.php',
    { method: id ? 'PUT' : 'POST', body: JSON.stringify(datos) });
  aviso($('#p-mensaje'), r.mensaje || 'No se pudo guardar.', r.ok);
  if (r.ok) { e.target.hidden = true; await listarProductos(); }
}

async function accionFila(e) {
  const b = e.target.closest('button[data-accion]');
  if (!b) return;

  // 1. Si es editar, abre el formulario
  if (b.dataset.accion === 'editar') {
    return abrirForm(productos.find((p) => String(p.id) === b.dataset.id));
  }

  // 2. Si es comprar, llama a la vista de compra con el ID
  if (b.dataset.accion === 'comprar') {
    return vistaComprar(b.dataset.id);
  }

  // 3. Si es eliminar, pide confirmación
  if (b.dataset.accion === 'eliminar') {
    if (!window.confirm('¿Eliminar este producto?')) return;
    const r = await api(`productos.php?id=${encodeURIComponent(b.dataset.id)}`, { method: 'DELETE' });
    aviso($('#cat-estado'), r.mensaje || 'No se pudo eliminar.', r.ok);
    if (r.ok) await listarProductos();
  }
}

async function vistaCatalogo() {
  montar('tpl-catalogo', 'Catálogo');

  // Leer query params del hash (ej: #/catalogo?zona=cadera)
  const hashParts = location.hash.split('?');
  if (hashParts.length > 1) {
    const params = new URLSearchParams(hashParts[1]);
    zonaFiltroActual = params.get('area');
  } else {
    zonaFiltroActual = null;
  }

  // Configurar botones de alternancia de vista (Tabla / Tarjetas)
  const btnBox = $('#btn-vista-box');
  const btnTabla = $('#btn-vista-tabla');
  if (btnBox) {
    btnBox.addEventListener('click', () => {
      vistaActualCatalogo = 'box';
      listarProductos();
    });
  }
  if (btnTabla) {
    btnTabla.addEventListener('click', () => {
      vistaActualCatalogo = 'tabla';
      listarProductos();
    });
  }

  if (zonaFiltroActual) {
    const todo = document.createElement('a');
    todo.href = '#/catalogo';
    todo.textContent = 'Ver todo el catálogo';
    todo.className = 'enlace-volver';
    $('#cat-estado').after(todo);
  }

  if (esAdmin()) {
    const nuevo = boton('Nuevo producto', 'nuevo', '');
    nuevo.addEventListener('click', () => abrirForm(null));
    $('#t-cat').after(nuevo);
    $('#form-producto').addEventListener('submit', guardarProducto);
    $('#p-cancelar').addEventListener('click', () => { $('#form-producto').hidden = true; });
  }

  // Delegación de eventos para la tabla y el grid de tarjetas
  const contenidoDinamico = $('#catalogo-contenido-dinamico');
  if (contenidoDinamico) {
    contenidoDinamico.addEventListener('click', accionFila);
  }

  await listarProductos();
}

/* ---------- Vistas: ingresar / salir ---------- */
function vistaIngresar() {
  montar('tpl-ingresar', 'Ingresar');
  $('#form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const r = await api('login.php', { method: 'POST', body: JSON.stringify({ email: $('#email').value, password: $('#password').value }) });
    aviso($('#msg-login'), r.mensaje || 'No se pudo iniciar sesión.', r.ok);
    if (r.ok) { await cargarSesion(); location.hash = '#/catalogo'; }
  });
  $('#form-registro').addEventListener('submit', async (e) => {
    e.preventDefault();
    const r = await api('registro.php', { method: 'POST', body: JSON.stringify({ nombre: $('#reg-nombre').value, email: $('#reg-email').value, password: $('#reg-password').value }) });
    aviso($('#msg-registro'), r.mensaje || 'No se pudo registrar.', r.ok);
    if (r.ok) e.target.reset();
  });
}

async function vistaSalir() {
  await api('logout.php', { method: 'POST' });
  sesion.usuario = null;
  pintarSesion();
  location.hash = '#/inicio';
}

/* ---------- Vista: comprar ---------- */
async function vistaComprar(id) { // <-- El parámetro se llama 'id'
  // Si no hay sesión, al login
  if (!sesion.usuario) {
    location.hash = '#/ingresar';
    return;
  }

  montar('tpl-comprar', 'Comprar');
  const estado = $('#compra-estado');
  const form = $('#form-compra');
  const cargando = $('#compra-cargando');
  
  // Si nos pasan el ID por parámetro lo usamos, sino lo buscamos en la URL
  const prodId = id || new URLSearchParams(location.hash.split('?')[1] || '').get('id');

  if (!prodId) {
    aviso(estado, 'No seleccionaste ningún producto válido.', false);
    if (cargando) cargando.hidden = true;
    return;
  }

  // Buscar los datos del producto en la API
  const r = await api(`productos.php?id=${encodeURIComponent(prodId)}`);
  if (!r.ok) {
    aviso(estado, 'Error al cargar el producto: ' + (r.mensaje || 'No existe'), false);
    if (cargando) cargando.hidden = true;
    return;
  }

  const producto = r.data;
  if (cargando) cargando.hidden = true;
  if (form) form.hidden = false;

  // Rellenar los datos
  $('#c-producto-id').value = producto.id;
  $('#c-producto-nombre').textContent = producto.nombre;
  $('#c-producto-precio').textContent = moneda.format(Number(producto.precio));
  
  if (sesion.usuario) {
    $('#c-email').value = sesion.usuario.email || '';
    $('#c-cliente').value = sesion.usuario.nombre || '';
  }

  // Evento de envío del formulario (le ponemos { once: true } para que no se duplique)
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const datosPedido = {
      producto_id: parseInt($('#c-producto-id').value),
      cantidad: parseInt($('#c-cantidad').value),
      cliente: $('#c-cliente').value,
      direccion: $('#c-direccion').value,
      telefono: $('#c-telefono').value,
      email: $('#c-email').value,
      pago: $('#c-pago').value
    };

    const btnSubmit = form.querySelector('button[type="submit"]');
    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Procesando...';

    const respuesta = await api('pedidos.php', {
      method: 'POST',
      body: JSON.stringify(datosPedido)
    });

    if (respuesta.ok) {
      aviso(estado, '¡Compra realizada con éxito! Pedido N.° ' + (respuesta.data ? respuesta.data.pedido_id : ''), true);
      // Y después de 2 segundos, redirigir:
      setTimeout(() => { location.hash = '#/inicio'; }, 2000);
    } else {
      aviso(estado, respuesta.mensaje || 'Error al procesar la compra.', false);
      btnSubmit.disabled = false;
      btnSubmit.textContent = 'Confirmar Compra';
    }
  });

  $('#btn-cancelar-compra').addEventListener('click', () => {
    location.hash = '#/catalogo';
  });

}

/* ---------- Vista: detalle de producto ---------- */
async function vistaProducto(id) {
  montar('tpl-producto', 'Detalle de Producto');
  
  const prodId = id || new URLSearchParams(location.hash.split('?')[1] || '').get('id');
  if (!prodId) {
    vista.replaceChildren(document.createTextNode('No se seleccionó un producto.'));
    return;
  }

  const r = await api(`productos.php?id=${encodeURIComponent(prodId)}`);
  if (!r.ok) {
    vista.replaceChildren(document.createTextNode('Error al cargar el producto.'));
    return;
  }

  const p = r.data;
  $('#det-nombre').textContent = p.nombre;
  $('#det-desc').textContent = p.descripcion || 'Sin descripción.';
  $('#det-cat').textContent = p.categoria;
  $('#det-stock').textContent = p.stock;
  $('#det-precio').textContent = moneda.format(Number(p.precio)).replace('$', '').trim();
  
  const btnComprar = $('#btn-det-comprar');
  btnComprar.addEventListener('click', () => vistaComprar(p.id));
  
  if (p.stock < 1) {
    btnComprar.disabled = true;
    btnComprar.textContent = 'Sin Stock';
    btnComprar.style.background = '#999';
  }

  const btnVolver = $('#btn-volver-catalogo');
  if (btnVolver) {
    btnVolver.addEventListener('click', (e) => {
      e.preventDefault(); // Evita que el navegador haga cosas raras
      location.hash = '#/catalogo'; // Forzamos el cambio de hash
    });
  }

}

/* ---------- Vista: presupuesto ---------- */
function vistaPresupuesto() {
  montar('tpl-presupuesto', 'Presupuesto');

  const form = $('#form-presupuesto');
  const formatoARS = (n) => moneda.format(n);

  function calcular() {
    const servicioSelect = $('#pres-servicio');
    const optionServicio = servicioSelect.options[servicioSelect.selectedIndex];
    if (!optionServicio.value) return; // Si no hay selección, no calculamos

    const precioUnitario = Number(optionServicio.dataset.precio);
    const cantidad = parseInt($('#pres-cantidad').value) || 1;
    const subtotal = precioUnitario * cantidad;

    // 1. Descuento por Volumen (según AE2)
    let pctVolumen = 0;
    if (cantidad >= 20) pctVolumen = 22;
    else if (cantidad >= 10) pctVolumen = 15;
    else if (cantidad >= 5) pctVolumen = 8;
    const montoVolumen = subtotal * (pctVolumen / 100);

    // 2. Descuento por Cliente
    const clienteSelect = $('#pres-cliente');
    const pctCliente = Number(clienteSelect.options[clienteSelect.selectedIndex].dataset.desc) || 0;
    const baseCliente = subtotal - montoVolumen;
    const montoCliente = baseCliente * (pctCliente / 100);

    // 3. Ajuste por Pago
    const pagoSelect = $('#pres-pago');
    const pctPago = Number(pagoSelect.options[pagoSelect.selectedIndex].dataset.ajuste) || 0;
    const basePago = baseCliente - montoCliente;
    const montoPago = basePago * (pctPago / 100);
    const subtotalAjustado = basePago + montoPago;

    // 4. IVA
    const conIva = $('#pres-iva').checked;
    const montoIva = conIva ? subtotalAjustado * 0.21 : 0;
    const total = subtotalAjustado + montoIva;

    // Pintar resultados en el DOM (usando .textContent)
    $('#out-subtotal').textContent = formatoARS(subtotal);
    $('#out-volumen').textContent = pctVolumen > 0 ? `-${formatoARS(montoVolumen)} (${pctVolumen}%)` : 'Sin descuento';
    $('#out-cliente').textContent = pctCliente > 0 ? `-${formatoARS(montoCliente)} (${pctCliente}%)` : 'Sin descuento';
    $('#out-pago').textContent = pctPago !== 0 ? `${formatoARS(montoPago)} (${pctPago}%)` : 'Sin ajuste';
    $('#out-iva').textContent = conIva ? formatoARS(montoIva) : 'No aplica';
    $('#out-total').textContent = formatoARS(total);
  }

  // Escuchar cambios para calcular en tiempo real
  form.addEventListener('input', calcular);
  form.addEventListener('change', calcular);
}

/* ---------- Router por hash + menú hamburguesa accesible ---------- */
const rutas = { inicio: vistaInicio, catalogo: vistaCatalogo, ingresar: vistaIngresar, salir: vistaSalir, comprar: () => vistaComprar(), producto: () => vistaProducto(), presupuesto: vistaPresupuesto};
let primeraCarga = true;

async function navegar() {
  // 1. Limpiamos la URL para obtener solo la ruta base (ej: "producto" o "catalogo")
  const hashCompleto = location.hash || '#/inicio';
  const hashClean = hashCompleto.split('?')[0].replace('#/', '') || 'inicio';
  
  // 2. Buscamos la función de la ruta. Si no existe, va a inicio.
  const ruta = rutas[hashClean] || vistaInicio;
  
  // 3. Cerramos el menú móvil
  cerrarMenu();
  
  // 4. Ejecutamos la vista (solo una vez)
  await ruta();
  
  // 5. Movemos el foco al contenido principal por accesibilidad
  if (!primeraCarga) vista.focus(); 
  primeraCarga = false;
}

// --- Eventos del Menú Hamburguesa ---
const btnMenu = document.getElementById('btn-menu');
const menuMovil = document.getElementById('menu-movil');

function cerrarMenu() { 
  if (menuMovil && btnMenu) {
    menuMovil.classList.remove('abierto'); 
    btnMenu.setAttribute('aria-expanded', 'false'); 
  }
}

if (btnMenu && menuMovil) {
  btnMenu.addEventListener('click', () => {
    const abierto = menuMovil.classList.toggle('abierto');
    btnMenu.setAttribute('aria-expanded', String(abierto));
  });
  btnMenu.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!e.repeat) btnMenu.click();
    }
  });
}

// Cerrar menú con la tecla Escape
document.addEventListener('keydown', (e) => { 
  if (e.key === 'Escape') cerrarMenu(); 
});

// Escuchar cambios en la URL
window.addEventListener('hashchange', navegar);

// Iniciar la aplicación
(async () => { 
  await cargarSesion(); 
  await navegar(); 
})();