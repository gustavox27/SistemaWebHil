import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import QRCode from 'qrcode';

export class ExportUtils {
  // Exportar a Excel
  static exportToExcel(data: any[], filename: string, sheetName: string = 'Data') {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, `${filename}.xlsx`);
  }

  // Exportar a PDF
  static async exportToPDF(data: any[], columns: string[], filename: string, title: string) {
    const doc = new jsPDF();
    
    // Título
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 105, 20, { align: 'center' });
    
    // Fecha actual
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-ES')}`, 20, 30);
    
    // Tabla
    (doc as any).autoTable({
      startY: 40,
      head: [columns],
      body: data.map(item => columns.map(col => item[col] || '')),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    });
    
    doc.save(`${filename}.pdf`);
  }

  // Generar boleta de venta en PDF
  static async generateSalePDF(venta: any, usuario: any, detalles: any[]) {
    const doc = new jsPDF();
    
    try {
      // Encabezado de la empresa
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('HILOSdeCALIDAD.SAC', 105, 20, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('RUC: 10897612560', 105, 28, { align: 'center' });
      doc.text('Av. la Capitana 190 - Lurigancho Huachipa', 105, 34, { align: 'center' });
      
      // Título de boleta
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('BOLETA ELECTRÓNICA', 105, 45, { align: 'center' });
      
      // Línea separadora
      doc.line(20, 50, 190, 50);
      
      // Datos del cliente
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Cliente: ${usuario.nombre}`, 20, 60);
      doc.text(`DNI: ${usuario.dni}`, 20, 66);
      doc.text(`Fecha: ${new Date(venta.fecha_venta).toLocaleDateString('es-ES')}`, 120, 60);
      doc.text(`Vendedor: ${venta.vendedor}`, 120, 66);
      
      // Tabla de productos
      const tableData = detalles.map(detalle => [
        detalle.producto?.nombre || '',
        detalle.cantidad.toString(),
        `S/ ${detalle.precio_unitario.toFixed(2)}`,
        `S/ ${detalle.subtotal.toFixed(2)}`
      ]);
      
      (doc as any).autoTable({
        startY: 75,
        head: [['Producto', 'Cant.', 'P. Unit.', 'Subtotal']],
        body: tableData,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [52, 152, 219] },
        foot: [['', '', 'TOTAL:', `S/ ${venta.total.toFixed(2)}`]],
        footStyles: { fillColor: [52, 152, 219], fontStyle: 'bold' },
      });
      
      // Total en letras
      const totalEnLetras = this.numeroALetras(venta.total);
      const yPosition = (doc as any).lastAutoTable.finalY + 10;
      
      doc.setFont('helvetica', 'bold');
      doc.text('Total:', 20, yPosition);
      doc.setFont('helvetica', 'normal');
      doc.text(totalEnLetras, 20, yPosition + 6);
      
      // Generar código QR
      if (venta.codigo_qr) {
        const qrDataUrl = await QRCode.toDataURL(venta.codigo_qr);
        doc.addImage(qrDataUrl, 'PNG', 150, yPosition, 30, 30);
      }
      
      // Pie de página
      const footerY = yPosition + 40;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.text('Representación impresa de la boleta de venta electrónica', 105, footerY, { align: 'center' });
      doc.text('Gracias por la Compra.', 105, footerY + 6, { align: 'center' });
      
      doc.save(`boleta-${venta.id}.pdf`);
    } catch (error) {
      console.error('Error generando PDF:', error);
    }
  }

  // Convertir número a letras
  private static numeroALetras(num: number): string {
    const unidades = ['', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
    const decenas = ['', '', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
    const especiales = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISEIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
    const centenas = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];
    
    if (num === 0) return 'CERO SOLES';
    
    const entero = Math.floor(num);
    const decimal = Math.round((num - entero) * 100);
    
    let resultado = '';
    
    if (entero >= 1000) {
      const miles = Math.floor(entero / 1000);
      resultado += this.convertirCentenas(miles) + ' MIL ';
      resultado += this.convertirCentenas(entero % 1000);
    } else {
      resultado = this.convertirCentenas(entero);
    }
    
    resultado += entero === 1 ? ' SOL' : ' SOLES';
    
    if (decimal > 0) {
      resultado += ` CON ${decimal.toString().padStart(2, '0')}/100`;
    }
    
    return resultado.trim();
  }

  private static convertirCentenas(num: number): string {
    if (num === 0) return '';
    
    const centenas = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];
    const decenas = ['', '', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
    const unidades = ['', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
    const especiales = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISEIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
    
    let resultado = '';
    
    const c = Math.floor(num / 100);
    const d = Math.floor((num % 100) / 10);
    const u = num % 10;
    
    if (c > 0) {
      if (num === 100) {
        resultado += 'CIEN';
      } else {
        resultado += centenas[c];
      }
    }
    
    if (d > 0) {
      if (d === 1 && u > 0) {
        resultado += ' ' + especiales[u];
      } else {
        resultado += ' ' + decenas[d];
        if (u > 0) {
          if (d === 2) {
            resultado += u === 1 ? 'UN' : unidades[u];
          } else {
            resultado += ' Y ' + unidades[u];
          }
        }
      }
    } else if (u > 0) {
      resultado += ' ' + unidades[u];
    }
    
    return resultado.trim();
  }

  // Generar plantilla Excel para carga masiva
  static generateProductTemplate() {
    const template = [
      {
        nombre: 'Hilo Algodón',
        color: 'Rojo',
        descripcion: 'Hilo de algodón 100%',
        estado: 'En Cono',
        precio_base: 10.50,
        precio_uni: 12.00,
        stock: 100
      },
      {
        nombre: 'Hilo Poliéster',
        color: 'Azul',
        descripcion: 'Hilo sintético resistente',
        estado: 'Sin Cono',
        precio_base: 8.75,
        precio_uni: 10.00,
        stock: 75
      }
    ];
    
    this.exportToExcel(template, 'plantilla-productos', 'Productos');
  }

  static generateUserTemplate() {
    const template = [
      {
        nombre: 'Juan Pérez',
        telefono: '987654321',
        dni: '12345678'
      },
      {
        nombre: 'María González',
        telefono: '876543210',
        dni: '87654321'
      }
    ];
    
    this.exportToExcel(template, 'plantilla-usuarios', 'Usuarios');
  }
}