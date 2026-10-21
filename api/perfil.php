<?php
session_start();
header('Content-Type: application/json; charset=utf-8');

// Control de Acceso: Verificamos si existe sesión activa
if (!isset($_SESSION['usuario_id'])) {
    http_response_code(401); // Unauthorized
    echo json_encode(["estado" => "error", "mensaje" => "Acceso no autorizado. Inicie sesión."]);
    exit;
}

// Retornamos los datos protegidos en formato JSON
http_response_code(200);
echo json_encode([
    "estado" => "exito",
    "data"   => [
        "id"     => $_SESSION['usuario_id'],
        "nombre" => $_SESSION['usuario_nombre'],
        "rol"    => $_SESSION['usuario_rol']
    ]
], JSON_UNESCAPED_UNICODE);