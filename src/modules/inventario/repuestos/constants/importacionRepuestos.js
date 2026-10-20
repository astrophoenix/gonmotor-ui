import { Boxes, CircleCheck, Package, RefreshCw } from 'lucide-vue-next';
import { crearServicioImportacion } from '../../../../shared/services/importacionService';

/**
 * Configuración del asistente de importación (`shared/components/ImportWizardModal.vue`).
 * Las columnas deben coincidir con `ImportadorRepuestos` de gonmotor-api
 * (`apps/inventario/excel_import.py`).
 */
export const IMPORTACION_REPUESTOS = {
  titulo: 'Importar repuestos',
  subtitulo: 'Catálogo de repuestos desde Excel',
  icono: Package,
  entidad: { singular: 'repuesto', plural: 'repuestos' },
  plantilla: {
    nombre: 'plantilla_importacion_repuestos.xlsx',
    muestra: {
      columnas: ['Código', 'Nombre', 'Categoría', 'Precio de Venta', 'IVA', 'Stock'],
      fila: ['FIL-001', 'Filtro de aceite', 'FILTROS', '8.00', '15', '20'],
    },
  },
  columnas: {
    obligatorias: ['Código', 'Nombre'],
    grupos: [
      { titulo: 'Repuesto', columnas: ['Código', 'Nombre', 'Categoría', 'Marca', 'Número de Parte', 'Unidad', 'Descripción'] },
      { titulo: 'Precios e inventario', columnas: ['Costo', 'Precio de Venta', 'IVA', 'Stock', 'Stock Mínimo', 'Ubicación', 'Proveedor'] },
      { titulo: 'Contífico (opcional)', columnas: ['ID Contífico', 'Cuenta Contable Contífico'] },
    ],
  },
  reglas: [
    { icono: RefreshCw, titulo: 'El código manda', texto: 'Si el código ya existe, solo se actualizan las celdas con valor.' },
    { icono: Boxes, titulo: 'Stock inicial', texto: 'El stock solo se toma al crear: en un repuesto existente no se cambia.' },
    { icono: CircleCheck, titulo: 'Solo 2 obligatorios', texto: 'Código y Nombre. El resto es opcional.' },
  ],
  fila: { principal: 'nombre', secundaria: 'codigo' },
  contadores: [],
};

export const SERVICIO_IMPORTACION_REPUESTOS = crearServicioImportacion('/api/repuestos/', 'repuestos');
