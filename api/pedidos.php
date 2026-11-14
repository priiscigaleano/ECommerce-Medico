<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/../models/PedidoModel.php';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Método no permitido. Use POST.']);
    exit;
}

// Control de Acceso OWASP A01/A07: Validar sesión activa
if (empty($_SESSION['usuario']['id'])) {
    http_response_code(401);
    echo json_encode([
        'ok'    => false,
        'error' => 'Debe iniciar sesión antes de confirmar una compra (HTTP 401).'
    ]);
    exit;
}

$input = json_decode(file_get_contents('php://input') ?: '{}', true);
if (!is_array($input)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'JSON inválido.']);
    exit;
}

$nombreEnvio   = trim((string)($input['cliente'] ?? ''));
$direccion     = trim((string)($input['direccion'] ?? ''));
$telefono      = trim((string)($input['telefono'] ?? ''));
$emailContacto = trim((string)($input['email'] ?? ''));
$pagoRaw       = trim((string)($input['pago'] ?? ''));
$productoId    = (int)($input['producto_id'] ?? 1);
$cantidad      = (int)($input['cantidad'] ?? 1);

if ($nombreEnvio === '' || $direccion === '' || $telefono === '' || !filter_var($emailContacto, FILTER_VALIDATE_EMAIL) || $cantidad < 1) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Datos de envío inválidos o incompletos (HTTP 400).']);
    exit;
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
        (int)$_SESSION['usuario']['id'],
        $formaPago,
        $nombreEnvio,
        $direccion,
        $telefono,
        $emailContacto,
        $productoId,
        $cantidad
    );

    http_response_code(201);
    echo json_encode([
        'ok'      => true,
        'mensaje' => '¡Compra registrada con éxito! Pedido N.° ' . $resultado['pedido_id'],
        'data'    => $resultado
    ]);
} catch (RuntimeException $e) {
    $codigo = $e->getCode() === 400 ? 400 : 500;
    http_response_code($codigo);
    echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Error interno en la base de datos (HTTP 500).']);
}