<?php
/**
 * Endpoint REST de productos.
 *   GET    /api/productos.php[?id=1|?categoria=x|?area=x]  público   200 | 400 | 404
 *   POST   /api/productos.php        (admin, JSON)  crea         201 | 400 | 401 | 403
 *   PUT    /api/productos.php?id=1   (admin, JSON)  actualiza    200 | 400 | 401 | 403 | 404
 *   DELETE /api/productos.php?id=1   (admin)        elimina      200 | 401 | 403 | 404
 */
require_once __DIR__ . '/bootstrap.php';

/** Zonas del esqueleto interactivo (lista blanca: cualquier otro valor se rechaza con 400). */
const AREAS_VALIDAS = ['clavicula', 'humero', 'antebrazo', 'radio-cubito', 'mano', 'cadera', 'femur', 'tibia', 'perone', 'pie'];

function validarProducto(array $d): array
{
    $nombre = trim((string) ($d['nombre'] ?? ''));
    $precio = $d['precio'] ?? null;
    $stock  = $d['stock'] ?? 0;
    if ($nombre === '' || mb_strlen($nombre) > 120
        || !is_numeric($precio) || $precio < 0
        || filter_var($stock, FILTER_VALIDATE_INT) === false || $stock < 0) {
        responder(400, ['estado' => 'error', 'mensaje' => 'Datos de producto inválidos.']);
    }
    $area = trim((string) ($d['area'] ?? ''));
    if ($area !== '' && !in_array($area, AREAS_VALIDAS, true)) {
        responder(400, ['estado' => 'error', 'mensaje' => 'Área inválida.']);
    }
    return [
        'nombre'      => $nombre,
        'descripcion' => mb_substr(trim((string) ($d['descripcion'] ?? '')), 0, 255),
        'precio'      => round((float) $precio, 2),
        'stock'       => (int) $stock,
        'categoria'   => mb_substr(trim((string) ($d['categoria'] ?? 'osteosintesis')), 0, 40),
        'area'        => $area === '' ? null : $area,
    ];
}

try {
    $modelo = new ProductoModel();
    $metodo = $_SERVER['REQUEST_METHOD'];
    $id = null;
    if (isset($_GET['id'])) {
        $id = filter_var($_GET['id'], FILTER_VALIDATE_INT);
        if ($id === false || $id < 1) responder(400, ['estado' => 'error', 'mensaje' => 'Id inválido.']);
    }

    switch ($metodo) {
        case 'GET':
            if ($id !== null) {
                $p = $modelo->obtener($id);
                if ($p === null) responder(404, ['estado' => 'error', 'mensaje' => 'Producto no encontrado.']);
                responder(200, ['estado' => 'exito', 'data' => $p]);
            }
            $cat = isset($_GET['categoria']) ? (string) $_GET['categoria'] : null;
            $area = isset($_GET['area']) ? (string) $_GET['area'] : null;
            if ($area !== null && !in_array($area, AREAS_VALIDAS, true)) {
                responder(400, ['estado' => 'error', 'mensaje' => 'Área inválida.']);
            }
            responder(200, ['estado' => 'exito', 'data' => $modelo->listar($cat, $area)]);

        case 'POST':
            exigirSesion(true);
            $nuevoId = $modelo->crear(validarProducto(entradaJson()));
            responder(201, ['estado' => 'exito', 'mensaje' => 'Producto creado.', 'id' => $nuevoId]);

        case 'PUT':
            exigirSesion(true);
            if ($id === null) responder(400, ['estado' => 'error', 'mensaje' => 'Falta el id.']);
            $ok = $modelo->actualizar($id, validarProducto(entradaJson()));
            if (!$ok) responder(404, ['estado' => 'error', 'mensaje' => 'Producto no encontrado.']);
            responder(200, ['estado' => 'exito', 'mensaje' => 'Producto actualizado.']);

        case 'DELETE':
            exigirSesion(true);
            if ($id === null) responder(400, ['estado' => 'error', 'mensaje' => 'Falta el id.']);
            if (!$modelo->eliminar($id)) responder(404, ['estado' => 'error', 'mensaje' => 'Producto no encontrado.']);
            responder(200, ['estado' => 'exito', 'mensaje' => 'Producto eliminado.']);

        default:
            responder(405, ['estado' => 'error', 'mensaje' => 'Método no permitido.']);
    }
} catch (PDOException $e) {
    error_log('productos.php: ' . $e->getMessage()); // detalle solo en el log del servidor
    responder(500, ['estado' => 'error', 'mensaje' => 'Error interno del servidor.']);
}