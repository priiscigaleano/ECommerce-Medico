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
  vista.querySelectorAll('area[data-zona]').forEach(area => {
    area.addEventListener('click', (e) => {
      e.preventDefault();
      const zona = area.dataset.zona;
      location.hash = `#/catalogo?zona=${encodeURIComponent(zona)}`;
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
  ['ID', 'Producto', 'Descripción', 'Precio', 'Stock'].forEach(txt => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = txt;
    trHead.append(th);
  });
  
  const thAcciones = document.createElement('th');
  thAcciones.scope = 'col';
  thAcciones.id = 'th-acciones';
  if (!esAdmin()) thAcciones.hidden = true;
  thAcciones.textContent = 'Acciones';
  trHead.append(thAcciones);
  thead.append(trHead);

  const tbody = document.createElement('tbody');
  tbody.id = 'cat-cuerpo';

  prods.forEach(p => {
    const tr = document.createElement('tr');
    tr.append(celda(p.id), celda(p.nombre), celda(p.descripcion), celda(moneda.format(Number(p.precio))), celda(p.stock));
    if (esAdmin()) {
      const td = celda('', 'acciones');
      td.append(boton('Editar', 'editar', p.id), boton('Eliminar', 'eliminar', p.id, 'peligro'));
      tr.append(td);
    }
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
    const h4 = document.createElement('h4');
    h4.textContent = p.nombre;
    h4.style.marginBottom = '0.5rem';

    const pDesc = document.createElement('p');
    pDesc.textContent = p.descripcion || 'Sin descripción';
    pDesc.style.fontSize = '0.9rem';
    pDesc.style.color = '#555';

    infoDiv.append(h4, pDesc);

    const footerDiv = document.createElement('div');
    footerDiv.style.cssText = 'margin-top: 1rem; display: flex; justify-content: space-between; align-items: center;';

    const spanPrecio = document.createElement('span');
    spanPrecio.textContent = moneda.format(Number(p.precio));
    spanPrecio.style.fontWeight = 'bold';
    spanPrecio.style.color = '#2c3e50';

    footerDiv.append(spanPrecio);

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
async function listarProductos() {
  const estado = $('#cat-estado');
  aviso(estado, 'Cargando productos…', true);
  const r = await api('productos.php');
  if (!r.ok) { aviso(estado, 'No se pudo cargar el catálogo. Reintentá más tarde.', false); return; }
  
  productos = r.data;

  // Filtrar por zona si viene especificada por hash (ej: #/catalogo?zona=femur)
  let prodsFiltrados = productos;
  if (zonaFiltroActual) {
    const z = zonaFiltroActual.toLowerCase();
    prodsFiltrados = productos.filter(p => {
      const texto = `${p.nombre} ${p.descripcion || ''} ${p.categoria || ''}`.toLowerCase();
      return texto.includes(z);
    });
    aviso(estado, `${prodsFiltrados.length} productos filtrados para el área: ${zonaFiltroActual.toUpperCase()}.`, true);
  } else {
    aviso(estado, `${productos.length} productos disponibles.`, true);
  }

  actualizarContenedorCatalogo(prodsFiltrados);
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
  $('#p-nombre').focus();
}

async function guardarProducto(e) {
  e.preventDefault();
  const id = $('#p-id').value;
  const datos = {
    nombre: $('#p-nombre').value, descripcion: $('#p-descripcion').value,
    precio: $('#p-precio').value, stock: $('#p-stock').value, categoria: $('#p-categoria').value,
  };
  const r = await api(id ? `productos.php?id=${encodeURIComponent(id)}` : 'productos.php',
    { method: id ? 'PUT' : 'POST', body: JSON.stringify(datos) });
  aviso($('#p-mensaje'), r.mensaje || 'No se pudo guardar.', r.ok);
  if (r.ok) { e.target.hidden = true; await listarProductos(); }
}

async function accionFila(e) {
  const b = e.target.closest('button[data-accion]');
  if (!b) return;
  if (b.dataset.accion === 'editar') return abrirForm(productos.find((p) => String(p.id) === b.dataset.id));
  if (!window.confirm('¿Eliminar este producto?')) return;
  const r = await api(`productos.php?id=${encodeURIComponent(b.dataset.id)}`, { method: 'DELETE' });
  aviso($('#cat-estado'), r.mensaje || 'No se pudo eliminar.', r.ok);
  if (r.ok) await listarProductos();
}

async function vistaCatalogo() {
  montar('tpl-catalogo', 'Catálogo');

  // Leer query params del hash (ej: #/catalogo?zona=cadera)
  const hashParts = location.hash.split('?');
  if (hashParts.length > 1) {
    const params = new URLSearchParams(hashParts[1]);
    zonaFiltroActual = params.get('zona');
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

/* ---------- Router por hash + menú hamburguesa accesible ---------- */
const rutas = { inicio: vistaInicio, catalogo: vistaCatalogo, ingresar: vistaIngresar, salir: vistaSalir };
let primeraCarga = true;

async function navegar() {
  const hashClean = location.hash.split('?')[0].replace('#/', '');
  const ruta = rutas[hashClean] || vistaInicio;
  cerrarMenu();
  await ruta();
  if (!primeraCarga) vista.focus(); // tras navegar, el foco pasa al contenido nuevo
  primeraCarga = false;
}

const btnMenu = document.getElementById('btn-menu');
const menuMovil = document.getElementById('menu-movil');
function cerrarMenu() { menuMovil.classList.remove('abierto'); btnMenu.setAttribute('aria-expanded', 'false'); }

if (btnMenu && menuMovil) {
  btnMenu.addEventListener('click', () => {
    const abierto = menuMovil.classList.toggle('abierto');
    btnMenu.setAttribute('aria-expanded', String(abierto));
  });
}

document.addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrarMenu(); });
window.addEventListener('hashchange', navegar);

(async () => { await cargarSesion(); await navegar(); })();