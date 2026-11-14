<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/conexion.php';

/** Registro de pedidos e ítems con PDO Prepared Statements (UC4 - AE1). */
class PedidoModel
{
    private PDO $pdo;

    public function __construct()
    {
        $this->pdo = Conexion::getInstancia();
    }

    /**
     * Registra un pedido en las tablas `pedidos` y `pedido_items` y descuenta el stock (UC4 - AE1)
     */
    public function crearPedido(
        int $usuarioId,
        string $formaPago,
        string $nombreEnvio,
        string $direccion,
        string $telefono,
        string $emailContacto,
        int $productoId,
        int $cantidad
    ): array {
        $this->pdo->beginTransaction();

        try {
            // 1. Verificar producto y stock con PDO Prepared Statement
            $sqlProd = 'SELECT id, nombre, precio, stock FROM productos WHERE id = :id FOR UPDATE';
            $stmtProd = $this->pdo->prepare($sqlProd);
            $stmtProd->execute([':id' => $productoId]);
            $producto = $stmtProd->fetch();

            if (!$producto) {
                throw new RuntimeException('El producto seleccionado no existe.', 400);
            }

            if ((int) $producto['stock'] < $cantidad) {
                throw new RuntimeException('Stock insuficiente para realizar la compra.', 400);
            }

            $precioUnitario = (float) $producto['precio'];
            $total = $precioUnitario * $cantidad;

            // 2. Insertar cabecera en `pedidos`
            $sqlPedido = "INSERT INTO pedidos (usuario_id, estado, forma_pago, nombre_envio, direccion, telefono, email_contacto, total)
                          VALUES (:usuario_id, 'pendiente', :forma_pago, :nombre_envio, :direccion, :telefono, :email_contacto, :total)";
            $stmtPedido = $this->pdo->prepare($sqlPedido);
            $stmtPedido->execute([
                ':usuario_id'     => $usuarioId,
                ':forma_pago'     => $formaPago,
                ':nombre_envio'   => $nombreEnvio,
                ':direccion'      => $direccion,
                ':telefono'       => $telefono,
                ':email_contacto' => $emailContacto,
                ':total'          => $total,
            ]);

            $pedidoId = (int) $this->pdo->lastInsertId();

            // 3. Insertar detalle en `pedido_items`
            $sqlItem = 'INSERT INTO pedido_items (pedido_id, producto_id, cantidad, precio_unitario)
                        VALUES (:pedido_id, :producto_id, :cantidad, :precio_unitario)';
            $stmtItem = $this->pdo->prepare($sqlItem);
            $stmtItem->execute([
                ':pedido_id'       => $pedidoId,
                ':producto_id'     => $productoId,
                ':cantidad'        => $cantidad,
                ':precio_unitario' => $precioUnitario,
            ]);

            // 4. Descontar stock en `productos`
            $sqlStock = 'UPDATE productos SET stock = stock - :cantidad WHERE id = :id';
            $stmtStock = $this->pdo->prepare($sqlStock);
            $stmtStock->execute([
                ':cantidad' => $cantidad,
                ':id'       => $productoId,
            ]);

            $this->pdo->commit();

            return [
                'pedido_id' => $pedidoId,
                'producto'  => $producto['nombre'],
                'cantidad'  => $cantidad,
                'total'     => $total,
            ];
        } catch (Throwable $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }
}