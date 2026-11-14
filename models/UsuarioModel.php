<?php
require_once __DIR__ . '/../config/conexion.php';

/** Acceso a datos de usuarios: solo PDO Prepared Statements con marcadores nombrados. */
class UsuarioModel
{
    private PDO $pdo;

    public function __construct() { $this->pdo = Conexion::getInstancia(); }

    public function buscarPorEmail(string $email): ?array
    {
        $st = $this->pdo->prepare(
            'SELECT id, nombre, email, password, rol FROM usuarios WHERE email = :email'
        );
        $st->execute([':email' => $email]);
        return $st->fetch() ?: null;
    }

    public function crear(string $nombre, string $email, string $passwordPlano): int
    {
        $st = $this->pdo->prepare(
            'INSERT INTO usuarios (nombre, email, password) VALUES (:nombre, :email, :pass)'
        );
        $st->execute([
            ':nombre' => $nombre,
            ':email'  => $email,
            ':pass'   => password_hash($passwordPlano, PASSWORD_BCRYPT), // OWASP A02
        ]);
        return (int) $this->pdo->lastInsertId();
    }
}