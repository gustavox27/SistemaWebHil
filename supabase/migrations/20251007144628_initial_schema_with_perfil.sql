/*
  # Esquema completo para HILOSdeCALIDAD - Sistema de Gestión de Ventas con Perfiles

  1. Nuevas Tablas
    - `usuarios` - Gestión de clientes y usuarios del sistema
      - `id` (uuid, primary key)
      - `nombre` (text, nombre completo del usuario)
      - `telefono` (text, opcional)
      - `dni` (text, único, documento de identidad)
      - `perfil` (text, tipo de usuario: Administrador, Vendedor, Almacenero, Cliente)
      - `created_at` (timestamp)
    
    - `productos` - Inventario de hilos
      - `id` (uuid, primary key)
      - `nombre` (text, nombre del producto)
      - `color` (text, color del hilo)
      - `descripcion` (text, opcional)
      - `estado` (text, Por Hilandar | Conos Devanados | Conos Veteados)
      - `precio_base` (decimal, precio de costo)
      - `precio_uni` (decimal, precio de venta)
      - `stock` (integer, cantidad disponible)
      - `cantidad` (integer, opcional, para productos en proceso)
      - `fecha_ingreso` (timestamp, fecha de ingreso al inventario)
      - `created_at` (timestamp)
    
    - `ventas` - Registro de transacciones
      - `id` (uuid, primary key)
      - `id_usuario` (uuid, foreign key a usuarios)
      - `fecha_venta` (timestamp, fecha y hora de la venta)
      - `total` (decimal, monto total de la venta)
      - `vendedor` (text, nombre del vendedor)
      - `codigo_qr` (text, opcional, código QR para la boleta)
      - `created_at` (timestamp)
    
    - `ventas_detalle` - Detalles de cada venta
      - `id` (uuid, primary key)
      - `id_venta` (uuid, foreign key a ventas)
      - `id_producto` (uuid, foreign key a productos)
      - `cantidad` (integer, cantidad vendida)
      - `precio_unitario` (decimal, precio al momento de la venta)
      - `subtotal` (decimal, cantidad * precio_unitario)
      - `created_at` (timestamp)
    
    - `eventos` - Log de actividades del sistema
      - `id` (uuid, primary key)
      - `tipo` (text, tipo de evento)
      - `descripcion` (text, descripción del evento)
      - `fecha` (timestamp, fecha del evento)
      - `usuario` (text, opcional, usuario que realizó la acción)
      - `created_at` (timestamp)

  2. Seguridad
    - Habilitar RLS en todas las tablas
    - Políticas para operaciones públicas (se ajustará con autenticación)
    - Restricciones de integridad referencial

  3. Índices
    - Índices para mejorar rendimiento en consultas frecuentes
    - Índices únicos para campos que lo requieren

  4. Perfiles de Usuario
    - Administrador: acceso completo al sistema
    - Vendedor: acceso a ventas e inventario
    - Almacenero: acceso a inventario
    - Cliente: cliente normal del negocio
*/

-- Crear tabla usuarios con campo perfil
CREATE TABLE IF NOT EXISTS usuarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  telefono text,
  dni text UNIQUE NOT NULL,
  perfil text NOT NULL DEFAULT 'Cliente' CHECK (perfil IN ('Administrador', 'Vendedor', 'Almacenero', 'Cliente')),
  created_at timestamptz DEFAULT now()
);

-- Crear tabla productos
CREATE TABLE IF NOT EXISTS productos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  color text NOT NULL,
  descripcion text,
  estado text NOT NULL CHECK (estado IN ('Por Hilandar', 'Conos Devanados', 'Conos Veteados')),
  precio_base decimal(10,2) DEFAULT 0,
  precio_uni decimal(10,2) DEFAULT 0,
  stock integer DEFAULT 0,
  cantidad integer,
  fecha_ingreso timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Crear tabla ventas
CREATE TABLE IF NOT EXISTS ventas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_usuario uuid NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  fecha_venta timestamptz NOT NULL DEFAULT now(),
  total decimal(10,2) NOT NULL DEFAULT 0,
  vendedor text NOT NULL DEFAULT 'Sistema',
  codigo_qr text,
  created_at timestamptz DEFAULT now()
);

-- Crear tabla ventas_detalle
CREATE TABLE IF NOT EXISTS ventas_detalle (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_venta uuid NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
  id_producto uuid NOT NULL REFERENCES productos(id) ON DELETE RESTRICT,
  cantidad integer NOT NULL DEFAULT 1,
  precio_unitario decimal(10,2) NOT NULL DEFAULT 0,
  subtotal decimal(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Crear tabla eventos
CREATE TABLE IF NOT EXISTS eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL,
  descripcion text NOT NULL,
  fecha timestamptz NOT NULL DEFAULT now(),
  usuario text,
  created_at timestamptz DEFAULT now()
);

-- Crear índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_usuarios_dni ON usuarios(dni);
CREATE INDEX IF NOT EXISTS idx_usuarios_perfil ON usuarios(perfil);
CREATE INDEX IF NOT EXISTS idx_productos_estado ON productos(estado);
CREATE INDEX IF NOT EXISTS idx_productos_stock ON productos(stock);
CREATE INDEX IF NOT EXISTS idx_ventas_fecha ON ventas(fecha_venta);
CREATE INDEX IF NOT EXISTS idx_ventas_usuario ON ventas(id_usuario);
CREATE INDEX IF NOT EXISTS idx_ventas_detalle_venta ON ventas_detalle(id_venta);
CREATE INDEX IF NOT EXISTS idx_ventas_detalle_producto ON ventas_detalle(id_producto);
CREATE INDEX IF NOT EXISTS idx_eventos_fecha ON eventos(fecha);
CREATE INDEX IF NOT EXISTS idx_eventos_tipo ON eventos(tipo);

-- Habilitar Row Level Security (RLS)
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventas_detalle ENABLE ROW LEVEL SECURITY;
ALTER TABLE eventos ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad (acceso público por ahora, se ajustará con autenticación)
CREATE POLICY "Permitir todas las operaciones en usuarios" ON usuarios
  FOR ALL 
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Permitir todas las operaciones en productos" ON productos
  FOR ALL 
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Permitir todas las operaciones en ventas" ON ventas
  FOR ALL 
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Permitir todas las operaciones en ventas_detalle" ON ventas_detalle
  FOR ALL 
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Permitir todas las operaciones en eventos" ON eventos
  FOR ALL 
  USING (true)
  WITH CHECK (true);

-- Función para actualizar automáticamente el subtotal en ventas_detalle
CREATE OR REPLACE FUNCTION actualizar_subtotal()
RETURNS TRIGGER AS $$
BEGIN
  NEW.subtotal = NEW.cantidad * NEW.precio_unitario;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para calcular subtotal automáticamente
CREATE TRIGGER trigger_actualizar_subtotal
  BEFORE INSERT OR UPDATE ON ventas_detalle
  FOR EACH ROW
  EXECUTE FUNCTION actualizar_subtotal();

-- Función para actualizar el total de la venta
CREATE OR REPLACE FUNCTION actualizar_total_venta()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE ventas 
  SET total = (
    SELECT COALESCE(SUM(subtotal), 0) 
    FROM ventas_detalle 
    WHERE id_venta = COALESCE(NEW.id_venta, OLD.id_venta)
  )
  WHERE id = COALESCE(NEW.id_venta, OLD.id_venta);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar total de venta cuando se modifican los detalles
CREATE TRIGGER trigger_actualizar_total_venta
  AFTER INSERT OR UPDATE OR DELETE ON ventas_detalle
  FOR EACH ROW
  EXECUTE FUNCTION actualizar_total_venta();

-- Insertar usuario administrador Gustavo_Corrales
INSERT INTO usuarios (nombre, telefono, dni, perfil) VALUES
  ('Gustavo_Corrales', '960950894', '70471912', 'Administrador')
ON CONFLICT (dni) DO NOTHING;

-- Insertar datos de ejemplo para testing
INSERT INTO usuarios (nombre, telefono, dni, perfil) VALUES
  ('Juan Pérez García', '987654321', '12345678', 'Cliente'),
  ('María González López', '876543210', '87654321', 'Cliente'),
  ('Carlos Rodríguez Silva', '765432109', '23456789', 'Cliente'),
  ('Ana Martínez Torres', '654321098', '34567890', 'Cliente'),
  ('Luis Fernández Ruiz', '543210987', '45678901', 'Cliente')
ON CONFLICT (dni) DO NOTHING;

INSERT INTO productos (nombre, color, descripcion, estado, precio_base, precio_uni, stock, fecha_ingreso) VALUES
  ('Hilo Algodón Premium', 'Rojo', 'Hilo de algodón 100% de alta calidad', 'Conos Devanados', 8.50, 12.00, 150, now()),
  ('Hilo Poliéster Resistente', 'Azul', 'Hilo sintético de alta resistencia', 'Conos Devanados', 6.75, 9.50, 200, now()),
  ('Hilo Mixto Suave', 'Verde', 'Mezcla algodón-poliéster', 'Conos Veteados', 7.25, 10.75, 120, now()),
  ('Hilo Algodón Básico', 'Blanco', 'Hilo de algodón estándar', 'Conos Devanados', 5.50, 8.00, 300, now()),
  ('Hilo Decorativo', 'Amarillo', 'Hilo especial para decoración', 'Conos Veteados', 12.00, 18.50, 75, now()),
  ('Fibra Natural', 'Marrón', 'Producto en proceso de hilandería', 'Por Hilandar', 0, 0, 0, now()),
  ('Algodón Crudo', 'Beige', 'Materia prima sin procesar', 'Por Hilandar', 0, 0, 0, now())
ON CONFLICT DO NOTHING;

-- Actualizar cantidad para productos "Por Hilandar"
UPDATE productos 
SET cantidad = 50 
WHERE estado = 'Por Hilandar' AND cantidad IS NULL;

INSERT INTO eventos (tipo, descripcion, usuario) VALUES
  ('Sistema', 'Base de datos inicializada correctamente con sistema de perfiles', 'Sistema'),
  ('Inventario', 'Productos de ejemplo agregados al inventario', 'Sistema'),
  ('Usuarios', 'Usuarios de ejemplo creados', 'Sistema'),
  ('Usuarios', 'Usuario administrador Gustavo_Corrales creado', 'Sistema')
ON CONFLICT DO NOTHING;