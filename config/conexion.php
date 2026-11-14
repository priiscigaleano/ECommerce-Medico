<?php
/**
 * Conexión PDO a MySQL con patrón Singleton.
 * Los errores se registran en el log del servidor y NUNCA se exponen al cliente.
 */
class Conexion
{
    private const HOST = 'localhost';
    private const BD   = 'tienda_traumatologo';
    private const USER = 'root';
    private const PASS = '';

    private static ?PDO $instancia = null;

    private function __construct() {}

    public static function getInstancia(): PDO
    {
        if (self::$instancia === null) {
            $dsn = 'mysql:host=' . self::HOST . ';dbname=' . self::BD . ';charset=utf8mb4';
            try {
                self::$instancia = new PDO($dsn, self::USER, self::PASS, [
                    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES   => false,
                ]);
            } catch (PDOException $e) {
                error_log('Conexion BD: ' . $e->getMessage());
                throw $e; // el endpoint responde 500 genérico
            }
        }
        return self::$instancia;
    }
}