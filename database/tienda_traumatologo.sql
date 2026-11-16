-- Script de base de datos - La Tienda del Traumatólogo (AE4)
-- Uso: importar en phpMyAdmin (XAMPP) o:  mysql -u root < tienda_traumatologo.sql
--
-- TRAZABILIDAD CON LOS CASOS DE USO (AE1)
--   UC1 Consultar catálogo en tabla  -> productos
--   UC2 Consultar catálogo en grilla -> productos
--   UC3 Ver detalle de producto      -> productos
--   UC4 Realizar compra              -> pedidos + pedido_items (+ productos.stock)
--   Autenticación / roles            -> usuarios
--
SET NAMES utf8mb4;

CREATE DATABASE IF NOT EXISTS tienda_traumatologo CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE tienda_traumatologo;

DROP TABLE IF EXISTS pedido_items;
DROP TABLE IF EXISTS pedidos;
DROP TABLE IF EXISTS productos;
DROP TABLE IF EXISTS usuarios;

CREATE TABLE usuarios (
  id        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre    VARCHAR(100) NOT NULL,
  email     VARCHAR(150) NOT NULL UNIQUE,
  password  VARCHAR(255) NOT NULL,            -- hash BCRYPT (password_hash)
  rol       ENUM('cliente','admin') NOT NULL DEFAULT 'cliente',
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE productos (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre      VARCHAR(120) NOT NULL,
  descripcion VARCHAR(255) NOT NULL DEFAULT '',
  precio      DECIMAL(10,2) NOT NULL CHECK (precio >= 0),
  stock       INT UNSIGNED NOT NULL DEFAULT 0,
  categoria   VARCHAR(40)  NOT NULL DEFAULT 'osteosintesis',
  area        VARCHAR(30)  NULL,                -- zona anatómica del esqueleto interactivo (NULL = sin zona)
  INDEX idx_productos_categoria (categoria),
  INDEX idx_productos_area (area)
) ENGINE=InnoDB;

-- UC4: cabecera de la orden (datos de envío y medio de pago del formulario de compra)
CREATE TABLE pedidos (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  usuario_id    INT UNSIGNED NOT NULL,
  estado        ENUM('pendiente','pagado','enviado','cancelado') NOT NULL DEFAULT 'pendiente',
  forma_pago    ENUM('efectivo','transferencia','tarjeta') NOT NULL,
  nombre_envio  VARCHAR(100) NOT NULL,
  direccion     VARCHAR(200) NOT NULL,
  telefono      VARCHAR(30)  NOT NULL,
  email_contacto VARCHAR(150) NOT NULL,
  total         DECIMAL(12,2) NOT NULL CHECK (total >= 0),
  creado_en     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_pedidos_usuario (usuario_id),
  CONSTRAINT fk_pedidos_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- UC4: líneas de la orden. precio_unitario es una copia del precio al comprar,
-- así un cambio posterior de precio no altera pedidos históricos.
CREATE TABLE pedido_items (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  pedido_id       INT UNSIGNED NOT NULL,
  producto_id     INT UNSIGNED NOT NULL,
  cantidad        INT UNSIGNED NOT NULL CHECK (cantidad > 0),
  precio_unitario DECIMAL(10,2) NOT NULL CHECK (precio_unitario >= 0),
  INDEX idx_items_pedido (pedido_id),
  CONSTRAINT fk_items_pedido   FOREIGN KEY (pedido_id)   REFERENCES pedidos(id)   ON DELETE CASCADE,
  CONSTRAINT fk_items_producto FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

INSERT INTO productos (nombre, descripcion, precio, stock, categoria, area) VALUES
  ('Férula de Muñeca', 'Férula ajustable para inmovilización de muñeca', 25000, 15, 'ortopedia', 'mano'),
  ('Ortesis de Rodilla', 'Ortesis con bisagras para soporte de rodilla', 45000, 10, 'ortopedia', NULL),
  ('Collares Cervicales', 'Collares cervicales ortopédicos para descanso', 18000, 20, 'ortopedia', NULL),
  ('Muletas de Aluminio', 'Muletas ligeras de aluminio, ajustables en altura', 32000, 8, 'ortopedia', NULL),
  ('Faja Lumbar', 'Faja elástica de soporte para la zona lumbar', 28000, 12, 'ortopedia', NULL),
  ('Placa DCP Reconstrucción', 'Placa para reconstrucción ósea en cadera', 500, 5, 'osteosintesis', 'cadera'),
  ('Placa Bloqueada', 'Placa bloqueada para fijación ósea', 600, 7, 'osteosintesis', 'cadera'),
  ('Kit Instrumental', 'Kit completo de instrumentos quirúrgicos', 45000, 3, 'osteosintesis', 'cadera'),
  ('Tornillo Bloqueado 3.5', 'Tornillo bloqueado de 3.5 mm para fijación ósea', 354.67, 10, 'osteosintesis', 'cadera'),
  ('Placa Bloqueada en T', 'Placa bloqueada en forma de T para tibia', 2006.13, 4, 'osteosintesis', 'tibia'),
  ('Placa Bloqueada Ligera', 'Placa bloqueada ligera para tibia', 2674.93, 6, 'osteosintesis', 'tibia'),
  ('Placa de Mano', 'Placa para fijación ósea en mano', 1200, 9, 'osteosintesis', 'mano'),
  ('Placa de Antebrazo', 'Placa para fijación ósea en antebrazo', 1500, 5, 'osteosintesis', 'antebrazo'),
  ('Placa de Húmero', 'Placa para fijación ósea en húmero', 1800, 7, 'osteosintesis', 'humero'),
  ('Placa de Clavícula', 'Placa para fijación ósea en clavícula', 1100, 8, 'osteosintesis', 'clavicula'),
  ('Placa de Peroné', 'Placa para fijación ósea en peroné', 1400, 6, 'osteosintesis', 'perone'),
  ('Placa DCP Tubo Doble Pared 135°', 'Placa DCP en tubo de doble pared a 135° para fémur', 1859.47, 6, 'osteosintesis', 'femur'),
  ('Tornillo Bloqueado 6.5 Canulado', 'Tornillo bloqueado canulado de 6.5 mm para fémur', 1859.47, 8, 'osteosintesis', 'femur'),
  ('Placa Bloqueada/DCP Mano en T Oblicua', 'Placa en T oblicua para fracturas distales de radio y cúbito', 3972.27, 4, 'osteosintesis', 'radio-cubito'),
  ('Mini Placa de Pie', 'Mini placas y tornillos para fracturas de pie', 3454.13, 6, 'osteosintesis', 'pie');

-- Usuario administrador de DEMO (cambiar la contraseña en producción).
-- Credenciales: admin@tienda.com / Admin123!
INSERT INTO usuarios (nombre, email, password, rol) VALUES
  ('Administrador', 'admin@tienda.com', '$2y$10$KhEZRntz.ZwAuktQ9yLLPuiz7au5zs5ASsrYSJnqgfrEQ7XQBR0qm', 'admin');