<?php
require_once __DIR__ . '/../config/conexion.php';

/** CRUD de productos con PDO Prepared Statements (sin concatenar SQL). */
class ProductoModel
{
    private PDO $pdo;

    public function __construct() { $this->pdo = Conexion::getInstancia(); }

    public function listar(?string $categoria = null): array
    {
        if ($categoria !== null) {
            $st = $this->pdo->prepare('SELECT * FROM productos WHERE categoria = :cat ORDER BY id');
            $st->execute([':cat' => $categoria]);
        } else {
            $st = $this->pdo->query('SELECT * FROM productos ORDER BY id');
        }
        return $st->fetchAll();
    }

    public function obtener(int $id): ?array
    {
        $st = $this->pdo->prepare('SELECT * FROM productos WHERE id = :id');
        $st->execute([':id' => $id]);
        return $st->fetch() ?: null;
    }

    public function crear(array $d): int
    {
        $st = $this->pdo->prepare(
            'INSERT INTO productos (nombre, descripcion, precio, stock, categoria)
             VALUES (:nombre, :descripcion, :precio, :stock, :categoria)'
        );
        $st->execute($this->params($d));
        return (int) $this->pdo->lastInsertId();
    }

    public function actualizar(int $id, array $d): bool
    {
        $st = $this->pdo->prepare(
            'UPDATE productos SET nombre = :nombre, descripcion = :descripcion,
             precio = :precio, stock = :stock, categoria = :categoria WHERE id = :id'
        );
        $st->execute($this->params($d) + [':id' => $id]);
        return $this->obtener($id) !== null; // rowCount() es 0 si no hubo cambios
    }

    public function eliminar(int $id): bool
    {
        $st = $this->pdo->prepare('DELETE FROM productos WHERE id = :id');
        $st->execute([':id' => $id]);
        return $st->rowCount() > 0;
    }

    private function params(array $d): array
    {
        return [
            ':nombre'      => $d['nombre'],
            ':descripcion' => $d['descripcion'],
            ':precio'      => $d['precio'],
            ':stock'       => $d['stock'],
            ':categoria'   => $d['categoria'],
        ];
    }
}