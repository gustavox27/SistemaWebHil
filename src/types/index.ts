export interface Usuario {
  id: string;
  nombre: string;
  telefono?: string;
  dni: string;
  created_at?: string;
}

export interface Producto {
  id: string;
  nombre: string;
  color: string;
  descripcion?: string;
  estado: 'Por Hilandar' | 'Conos Devanados' | 'Conos Veteados';
  precio_base: number;
  precio_uni: number;
  stock: number;
  cantidad?: number;
  fecha_ingreso: string;
  created_at?: string;
}

export interface Venta {
  id: string;
  id_usuario: string;
  fecha_venta: string;
  total: number;
  vendedor: string;
  codigo_qr?: string;
  created_at?: string;
  usuario?: Usuario;
  detalles?: VentaDetalle[];
}

export interface VentaDetalle {
  id: string;
  id_venta: string;
  id_producto: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  created_at?: string;
  producto?: Producto;
}

export interface Evento {
  id: string;
  tipo: string;
  descripcion: string;
  fecha: string;
  usuario?: string;
  created_at?: string;
}

export interface CarritoItem {
  producto: Producto;
  cantidad: number;
}

export interface MetricasVentas {
  totalVentas: number;
  ventasPorPeriodo: Array<{ fecha: string; ventas: number }>;
  productosPopulares: Array<{ nombre: string; cantidad: number }>;
  estadoStock: Array<{ estado: string; cantidad: number }>;
}