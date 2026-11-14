<?php
/** Utilidades comunes de los endpoints REST (cabeceras, respuestas JSON y control de sesión). */
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

require_once __DIR__ . '/../models/UsuarioModel.php';
require_once __DIR__ . '/../models/ProductoModel.php';

function responder(int $codigo, array $cuerpo): void
{
    http_response_code($codigo);
    echo json_encode($cuerpo, JSON_UNESCAPED_UNICODE);
    exit;
}

function entradaJson(): array
{
    $datos = json_decode(file_get_contents('php://input'), true);
    return is_array($datos) ? $datos : [];
}

/** OWASP A01/A07: corta con 401 si no hay sesión; con 403 si se exige admin y el rol no alcanza. */
function exigirSesion(bool $soloAdmin = false): void
{
    if (session_status() !== PHP_SESSION_ACTIVE) session_start();
    if (empty($_SESSION['usuario_id'])) {
        responder(401, ['estado' => 'error', 'mensaje' => 'Acceso no autorizado. Inicie sesión.']);
    }
    if ($soloAdmin && ($_SESSION['usuario_rol'] ?? '') !== 'admin') {
        responder(403, ['estado' => 'error', 'mensaje' => 'Permisos insuficientes.']);
    }
}