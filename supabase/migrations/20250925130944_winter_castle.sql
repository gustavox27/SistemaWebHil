/*
  # Create Thread Sales System Tables

  1. New Tables
    - `usuarios`
      - `id` (uuid, primary key)
      - `nombre` (text)
      - `telefono` (text)
      - `dni` (text, unique)
      - `created_at` (timestamp)
    
    - `productos`
      - `id` (uuid, primary key)
      - `nombre` (text)
      - `color` (text)
      - `descripcion` (text)
      - `estado` (text) - En Cono or Sin Cono
      - `precio_base` (decimal)
      - `precio_uni` (decimal)
      - `stock` (integer)
      - `fecha_ingreso` (timestamp)
      - `created_at` (timestamp)
    
    - `ventas`
      - `id` (uuid, primary key)
      - `id_usuario` (uuid, foreign key)
      - `fecha_venta` (timestamp)
      - `total` (decimal)
      - `vendedor` (text)
      - `codigo_qr` (text)
      - `created_at` (timestamp)
    
    - `ventas_detalle`
      - `id` (uuid, primary key)
      - `id_venta` (uuid, foreign key)
      - `id_producto` (uuid, foreign key)
      - `cantidad` (integer)
      - `precio_unitario` (decimal)
      - `subtotal` (decimal)
      - `created_at` (timestamp)
    
    - `eventos`
      - `id` (uuid, primary key)
      - `tipo` (text)
      - `descripcion` (text)
      - `fecha` (timestamp)
      - `usuario` (text)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Usuarios table
CREATE TABLE IF NOT EXISTS usuarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  telefono text,
  dni text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Productos table
CREATE TABLE IF NOT EXISTS productos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  color text NOT NULL,
  descripcion text,
  estado text NOT NULL CHECK (estado IN ('En Cono', 'Sin Cono')),
  precio_base decimal(10,2) NOT NULL,
  precio_uni decimal(10,2) NOT NULL,
  stock integer NOT NULL DEFAULT 0,
  fecha_ingreso timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Ventas table
CREATE TABLE IF NOT EXISTS ventas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_usuario uuid REFERENCES usuarios(id) ON DELETE CASCADE,
  fecha_venta timestamptz DEFAULT now(),
  total decimal(10,2) NOT NULL,
  vendedor text NOT NULL DEFAULT 'Freddy STG',
  codigo_qr text,
  created_at timestamptz DEFAULT now()
);

-- Ventas detalle table
CREATE TABLE IF NOT EXISTS ventas_detalle (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_venta uuid REFERENCES ventas(id) ON DELETE CASCADE,
  id_producto uuid REFERENCES productos(id) ON DELETE CASCADE,
  cantidad integer NOT NULL,
  precio_unitario decimal(10,2) NOT NULL,
  subtotal decimal(10,2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Eventos table
CREATE TABLE IF NOT EXISTS eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL,
  descripcion text NOT NULL,
  fecha timestamptz DEFAULT now(),
  usuario text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventas_detalle ENABLE ROW LEVEL SECURITY;
ALTER TABLE eventos ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (adjust as needed for your authentication setup)
CREATE POLICY "Allow all operations on usuarios" ON usuarios FOR ALL USING (true);
CREATE POLICY "Allow all operations on productos" ON productos FOR ALL USING (true);
CREATE POLICY "Allow all operations on ventas" ON ventas FOR ALL USING (true);
CREATE POLICY "Allow all operations on ventas_detalle" ON ventas_detalle FOR ALL USING (true);
CREATE POLICY "Allow all operations on eventos" ON eventos FOR ALL USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_usuarios_dni ON usuarios(dni);
CREATE INDEX IF NOT EXISTS idx_productos_nombre ON productos(nombre);
CREATE INDEX IF NOT EXISTS idx_productos_color ON productos(color);
CREATE INDEX IF NOT EXISTS idx_ventas_fecha ON ventas(fecha_venta);
CREATE INDEX IF NOT EXISTS idx_ventas_usuario ON ventas(id_usuario);
CREATE INDEX IF NOT EXISTS idx_eventos_fecha ON eventos(fecha);