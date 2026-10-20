import { CircleCheck, IdCard, RefreshCw, Truck } from 'lucide-vue-next';
import { crearServicioImportacion } from '../../../shared/services/importacionService';

/**
 * Configuración del asistente de importación (`shared/components/ImportWizardModal.vue`).
 * Las columnas deben coincidir con `ImportadorProveedores` de gonmotor-api
 * (`apps/proveedores/excel_import.py`).
 */
export const IMPORTACION_PROVEEDORES = {
  titulo: 'Importar proveedores',
  subtitulo: 'Proveedores desde Excel',
  icono: Truck,
  entidad: { singular: 'proveedor', plural: 'proveedores' },
  plantilla: {
    nombre: 'plantilla_importacion_proveedores.xlsx',
    muestra: {
      columnas: ['Tipo Ident.', 'Identificación', 'Nombre', 'Teléfono', 'Persona de Contacto'],
      fila: ['RUC', '1790012345001', 'Repuestos del Valle', '022345678', 'María Torres'],
    },
  },
  columnas: {
    obligatorias: ['Identificación', 'Nombre'],
    grupos: [
      { titulo: 'Proveedor', columnas: ['Tipo Identificación', 'Identificación', 'Nombre', 'Email', 'Teléfono', 'Dirección', 'Persona de Contacto'] },
    ],
  },
  reglas: [
    { icono: RefreshCw, titulo: 'Sin duplicados', texto: 'Si la identificación ya existe, solo se actualizan las celdas con valor.' },
    { icono: IdCard, titulo: 'RUC por defecto', texto: 'Si dejas vacío el tipo de identificación, se toma como RUC.' },
    { icono: CircleCheck, titulo: 'Solo 2 obligatorios', texto: 'Identificación y Nombre. El resto es opcional.' },
  ],
  fila: { principal: 'nombre', secundaria: 'identificacion' },
  contadores: [],
};

export const SERVICIO_IMPORTACION_PROVEEDORES = crearServicioImportacion('/api/proveedores/', 'proveedores');
