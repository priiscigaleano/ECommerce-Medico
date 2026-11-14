<?php
require_once __DIR__ . '/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    responder(405, ['estado' => 'error', 'mensaje' => 'Método no permitido.']);
}

$in       = entradaJson();
$email    = trim((string) ($in['email'] ?? ''));
$password = (string) ($in['password'] ?? '');
if ($email === '' || $password === '') {
    responder(400, ['estado' => 'error', 'mensaje' => 'Ingrese correo y contraseña.']);
}

try {
    $u = (new UsuarioModel())->buscarPorEmail($email);
    if ($u && password_verify($password, $u['password'])) {
        session_start();
        session_regenerate_id(true); // previene fijación de sesión (OWASP A07)
        $_SESSION['usuario_id']     = $u['id'];
        $_SESSION['usuario_nombre'] = $u['nombre'];
        $_SESSION['usuario_rol']    = $u['rol'];
        responder(200, ['estado' => 'exito', 'mensaje' => 'Autenticación exitosa.',
            'usuario' => ['nombre' => $u['nombre'], 'email' => $u['email'], 'rol' => $u['rol']]]);
    }
    responder(401, ['estado' => 'error', 'mensaje' => 'Credenciales incorrectas.']);
} catch (PDOException $e) {
    error_log('login.php: ' . $e->getMessage());
    responder(500, ['estado' => 'error', 'mensaje' => 'Error interno del servidor.']);
}