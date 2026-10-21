<?php
header('Content-Type: application/json; charset=utf-8');
require_once '../config/conexion.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["estado" => "error", "mensaje" => "Método no permitido."]);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$email    = trim($input['email'] ?? '');
$password = $input['password'] ?? '';

if (empty($email) || empty($password)) {
    http_response_code(400);
    echo json_encode(["estado" => "error", "mensaje" => "Ingrese correo y contraseña."]);
    exit;
}

try {
    $stmt = $pdo->prepare('SELECT id, nombre, email, password, rol FROM usuarios WHERE email = :email');
    $stmt->execute(['email' => $email]);
    $usuario = $stmt->fetch();

    if ($usuario && password_verify($password, $usuario['password'])) {
        // Inicializamos sesión en el servidor
        session_start();
        session_regenerate_id(true);

        $_SESSION['usuario_id']     = $usuario['id'];
        $_SESSION['usuario_nombre'] = $usuario['nombre'];
        $_SESSION['usuario_rol']    = $usuario['rol'];

        http_response_code(200);
        echo json_encode([
            "estado"  => "exito",
            "mensaje" => "Autenticación exitosa.",
            "usuario" => [
                "nombre" => $usuario['nombre'],
                "email"  => $usuario['email'],
                "rol"    => $usuario['rol']
            ]
        ]);
    } else {
        http_response_code(401); // Unauthorized
        echo json_encode(["estado" => "error", "mensaje" => "Credenciales incorrectas."]);
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["estado" => "error", "mensaje" => "Error interno del servidor."]);
}