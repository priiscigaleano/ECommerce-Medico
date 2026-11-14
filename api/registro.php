<?php
require_once __DIR__ . '/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    responder(405, ['estado' => 'error', 'mensaje' => 'Método no permitido.']);
}

$in       = entradaJson();
$nombre   = trim((string) ($in['nombre'] ?? ''));   // sin htmlspecialchars: el XSS se evita al mostrar con .textContent
$email    = trim((string) ($in['email'] ?? ''));
$password = (string) ($in['password'] ?? '');

if ($nombre === '' || $email === '' || $password === ''
    || mb_strlen($nombre) > 100 || !filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($password) < 8) {
    responder(400, ['estado' => 'error', 'mensaje' => 'Datos inválidos (contraseña de al menos 8 caracteres).']);
}

try {
    (new UsuarioModel())->crear($nombre, $email, $password);
    responder(201, ['estado' => 'exito', 'mensaje' => 'Usuario registrado correctamente.']);
} catch (PDOException $e) {
    if ($e->getCode() === '23000') {
        responder(409, ['estado' => 'error', 'mensaje' => 'El correo electrónico ya existe.']);
    }
    error_log('registro.php: ' . $e->getMessage());
    responder(500, ['estado' => 'error', 'mensaje' => 'Error interno al registrar el usuario.']);
}