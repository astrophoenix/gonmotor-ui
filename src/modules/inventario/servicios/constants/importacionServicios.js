import { CircleCheck, Clock, RefreshCw, ToolCase } from 'lucide-vue-next';
import { crearServicioImportacion } from '../../../../shared/services/importacionService';

/**
 * Configuración del asistente de importación (`shared/components/ImportWizardModal.vue`).
 * Las columnas deben coincidir con `ImportadorServicios` de gonmotor-api
 * (`apps/inventario/excel_import.py`).
 */
export const IMPORTACION_SERVICIOS = {
  titulo: 'Importar servicios',
  subtitulo: 'Catálogo de mano de obra desde Excel',
  icono: ToolCase,
  entidad: { singular: 'servicio', plural: 'servicios' },
  plantilla: {
    nombre: 'plantilla_importacion_servicios.xlsx',
    muestra: {
      columnas: ['Código', 'Nombre', 'Categoría', 'Tiempo (minutos)', 'Precio', 'IVA'],
      fila: ['MO-001', 'Cambio de aceite', 'MANTENIMIENTO', '45', '15.00', '15'],
    },
  },
  columnas: {
    obligatorias: ['Código', 'Nombre'],
    grupos: [
      { titulo: 'Servicio', columnas: ['Código', 'Nombre', 'Categoría', 'Tiempo (minutos)', 'Tareas Incluidas', 'Descripción'] },
      { titulo: 'Precios', columnas: ['Precio', 'Costo', 'IVA'] },
      { titulo: 'Contífico (opcional)', columnas: ['ID Contífico'] },
    ],
  },
  reglas: [
    { icono: RefreshCw, titulo: 'El código manda', texto: 'Si el código ya existe, solo se actualizan las celdas con valor.' },
    { icono: Clock, titulo: 'Tiempo en minutos', texto: 'Escribe el tiempo estimado en minutos (ej. 45).' },
    { icono: CircleCheck, titulo: 'Solo 2 obligatorios', texto: 'Código y Nombre. El resto es opcional.' },
  ],
  fila: { principal: 'nombre', secundaria: 'codigo' },
  contadores: [],
};

export const SERVICIO_IMPORTACION_SERVICIOS = crearServicioImportacion('/api/servicios/', 'servicios');
