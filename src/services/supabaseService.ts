import { supabase } from '../lib/supabase';
import { Usuario, Producto, Venta, VentaDetalle, Evento } from '../types';

export class SupabaseService {
  // USUARIOS
  static async getUsuarios() {
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  static async createUsuario(usuario: Omit<Usuario, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('usuarios')
      .insert([usuario])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async updateUsuario(id: string, updates: Partial<Usuario>) {
    const { data, error } = await supabase
      .from('usuarios')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async deleteUsuario(id: string) {
    const { error } = await supabase
      .from('usuarios')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }

  // PRODUCTOS
  static async getProductos() {
    const { data, error } = await supabase
      .from('productos')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  static async getProductosDisponibles() {
    const { data, error } = await supabase
      .from('productos')
      .select('*')
      .gt('stock', 0)
      .order('nombre');
    
    if (error) throw error;
    return data;
  }

  static async getProductosVendibles() {
    const { data, error } = await supabase
      .from('productos')
      .select('*')
      .eq('estado', 'Conos Devanados')
      .gt('stock', 0)
      .order('nombre');
    
    if (error) throw error;
    return data;
  }

  static async createProducto(producto: Omit<Producto, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('productos')
      .insert([producto])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async createProductos(productos: Omit<Producto, 'id' | 'created_at'>[]) {
    const { data, error } = await supabase
      .from('productos')
      .insert(productos)
      .select();
    
    if (error) throw error;
    return data;
  }

  static async updateProducto(id: string, updates: Partial<Producto>) {
    const { data, error } = await supabase
      .from('productos')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async deleteProducto(id: string) {
    const { error } = await supabase
      .from('productos')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }

  static async actualizarStock(id: string, nuevoStock: number) {
    const { data, error } = await supabase
      .from('productos')
      .update({ stock: nuevoStock })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  // VENTAS
  static async getVentas() {
    const { data, error } = await supabase
      .from('ventas')
      .select(`
        *,
        usuario:usuarios(*),
        detalles:ventas_detalle(
          *,
          producto:productos(*)
        )
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  static async getVentasPorFecha(fechaInicio: string, fechaFin: string) {
    const { data, error } = await supabase
      .from('ventas')
      .select(`
        *,
        usuario:usuarios(*),
        detalles:ventas_detalle(
          *,
          producto:productos(*)
        )
      `)
      .gte('fecha_venta', fechaInicio)
      .lte('fecha_venta', fechaFin)
      .order('fecha_venta', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  static async createVenta(venta: Omit<Venta, 'id' | 'created_at'>, detalles: Omit<VentaDetalle, 'id' | 'id_venta' | 'created_at'>[]) {
    try {
      // Crear la venta
      const { data: ventaData, error: ventaError } = await supabase
        .from('ventas')
        .insert([venta])
        .select()
        .single();

      if (ventaError) throw ventaError;

      // Crear los detalles de la venta
      const detallesConVenta = detalles.map(detalle => ({
        ...detalle,
        id_venta: ventaData.id
      }));

      const { data: detallesData, error: detallesError } = await supabase
        .from('ventas_detalle')
        .insert(detallesConVenta)
        .select();

      if (detallesError) throw detallesError;

      // Actualizar stock de productos
      for (const detalle of detalles) {
        const { data: producto } = await supabase
          .from('productos')
          .select('stock')
          .eq('id', detalle.id_producto)
          .single();

        if (producto) {
          await supabase
            .from('productos')
            .update({ stock: producto.stock - detalle.cantidad })
            .eq('id', detalle.id_producto);
        }
      }

      // Registrar evento
      await this.createEvento({
        tipo: 'Venta',
        descripcion: `Nueva venta realizada por un total de S/ ${venta.total}`,
        usuario: venta.vendedor
      });

      return { ...ventaData, detalles: detallesData };
    } catch (error) {
      throw error;
    }
  }

  // EVENTOS
  static async getEventos(limit = 10) {
    const { data, error } = await supabase
      .from('eventos')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data;
  }

  static async createEvento(evento: Omit<Evento, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('eventos')
      .insert([evento])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  // MÉTRICAS
  static async getMetricasVentas() {
    try {
      // Total de ventas del mes actual
      const inicioMes = new Date();
      inicioMes.setDate(1);
      inicioMes.setHours(0, 0, 0, 0);
      
      const { data: ventasDelMes } = await supabase
        .from('ventas')
        .select('total')
        .gte('fecha_venta', inicioMes.toISOString());

      const totalVentas = ventasDelMes?.reduce((acc, venta) => acc + venta.total, 0) || 0;

      // Ventas por los últimos 7 días
      const hace7Dias = new Date();
      hace7Dias.setDate(hace7Dias.getDate() - 7);
      
      const { data: ventasSemana } = await supabase
        .from('ventas')
        .select('fecha_venta, total')
        .gte('fecha_venta', hace7Dias.toISOString())
        .order('fecha_venta');

      // Productos más vendidos
      const { data: productosVendidos } = await supabase
        .from('ventas_detalle')
        .select(`
          cantidad,
          producto:productos(nombre)
        `);

      const productosPopulares = productosVendidos
        ?.reduce((acc: any[], detalle: any) => {
          const nombreProducto = detalle.producto?.nombre || 'Desconocido';
          const existente = acc.find(p => p.nombre === nombreProducto);
          
          if (existente) {
            existente.cantidad += detalle.cantidad;
          } else {
            acc.push({ nombre: nombreProducto, cantidad: detalle.cantidad });
          }
          
          return acc;
        }, [])
        .sort((a, b) => b.cantidad - a.cantidad)
        .slice(0, 5) || [];

      // Estado de stock
      const { data: productos } = await supabase
        .from('productos')
        .select('estado, stock');

      const estadoStock = productos
        ?.reduce((acc: any[], producto) => {
          const existente = acc.find(e => e.estado === producto.estado);
          
          if (existente) {
            existente.cantidad += producto.stock;
          } else {
            acc.push({ estado: producto.estado, cantidad: producto.stock });
          }
          
          return acc;
        }, []) || [];

      return {
        totalVentas,
        ventasPorPeriodo: ventasSemana || [],
        productosPopulares,
        estadoStock
      };
    } catch (error) {
      throw error;
    }
  }
}