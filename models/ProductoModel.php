<?php
require_once __DIR__ . '/../config/conexion.php';

/** CRUD de productos con PDO Prepared Statements (sin concatenar SQL). */
class ProductoModel
{
    private PDO $pdo;

    public function __construct() { $this->pdo = Conexion::getInstancia(); }

    /** Filtros opcionales por categoría y/o zona. Sin concatenar SQL: (:x IS NULL OR col = :x2). */
    public function listar(?string $categoria = null, ?string $area = null): array
    {
        $st = $this->pdo->prepare(
            'SELECT * FROM productos
             WHERE (:cat IS NULL OR categoria = :cat2) AND (:area IS NULL OR area = :area2)
             ORDER BY id'
        );
        $st->execute([':cat' => $categoria, ':cat2' => $categoria, ':area' => $area, ':area2' => $area]);
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
            'INSERT INTO productos (nombre, descripcion, precio, stock, categoria, area)
             VALUES (:nombre, :descripcion, :precio, :stock, :categoria, :area)'
        );
        $st->execute($this->params($d));
        return (int) $this->pdo->lastInsertId();
    }

    public function actualizar(int $id, array $d): bool
    {
        $st = $this->pdo->prepare(
            'UPDATE productos SET nombre = :nombre, descripcion = :descripcion,
             precio = :precio, stock = :stock, categoria = :categoria, area = :area WHERE id = :id'
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
            ':area'        => $d['area'],
        ];
    }
}