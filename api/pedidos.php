<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/../models/PedidoModel.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    responder(405, ['estado' => 'error', 'mensaje' => 'Método no permitido. Use POST.']);
}

// Control de acceso OWASP A01/A07: inicia sesión y corta con 401 si no hay usuario
exigirSesion();

$input = json_decode(file_get_contents('php://input') ?: '{}', true);
if (!is_array($input)) {
    responder(400, ['estado' => 'error', 'mensaje' => 'JSON inválido.']);
}

$nombreEnvio   = trim((string)($input['cliente'] ?? ''));
$direccion     = trim((string)($input['direccion'] ?? ''));
$telefono      = trim((string)($input['telefono'] ?? ''));
$emailContacto = trim((string)($input['email'] ?? ''));
$pagoRaw       = trim((string)($input['pago'] ?? ''));
$productoId    = (int)($input['producto_id'] ?? 1);
$cantidad      = (int)($input['cantidad'] ?? 1);

if ($nombreEnvio === '' || $direccion === '' || $telefono === '' || !filter_var($emailContacto, FILTER_VALIDATE_EMAIL) || $cantidad < 1) {
    responder(400, ['estado' => 'error', 'mensaje' => 'Datos de envío inválidos o incompletos.']);
}

// Mapear medio de pago al ENUM('efectivo','transferencia','tarjeta') de tienda_traumatologo.sql
$mapaPagos = [
    'efectivo'        => 'efectivo',
    'transferencia'   => 'transferencia',
    'tarjeta'         => 'tarjeta',
    'tarjeta_credito' => 'tarjeta',
    'tarjeta_debito'  => 'tarjeta',
    'mercadopago'     => 'transferencia'
];
$formaPago = $mapaPagos[$pagoRaw] ?? 'tarjeta';

try {
    $modelo = new PedidoModel();
    $resultado = $modelo->crearPedido(
        (int) $_SESSION['usuario_id'],
        $formaPago,
        $nombreEnvio,
        $direccion,
        $telefono,
        $emailContacto,
        $productoId,
        $cantidad
    );

    responder(201, [
        'estado'  => 'exito',
        'mensaje' => 'Compra registrada con éxito. Pedido N.° ' . $resultado['pedido_id'],
        'data'    => $resultado
    ]);
} catch (RuntimeException $e) {
    // 400 para validaciones de negocio (producto inexistente, stock insuficiente); el resto es 500
    $codigo = $e->getCode() === 400 ? 400 : 500;
    responder($codigo, ['estado' => 'error', 'mensaje' => $e->getMessage()]);
} catch (PDOException $e) {
    error_log('pedidos.php: ' . $e->getMessage()); // detalle solo en el log
    responder(500, ['estado' => 'error', 'mensaje' => 'Error interno en la base de datos.']);
}