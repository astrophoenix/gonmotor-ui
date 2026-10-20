import { Car, CircleCheck, RefreshCw, Users } from 'lucide-vue-next';
import { clientsService } from '../services/clientesService';

/**
 * Configuración del asistente de importación (`shared/components/ImportWizardModal.vue`).
 * Las columnas deben coincidir con `CLIENT_COLUMNS` de gonmotor-api
 * (`apps/clientes/excel_import.py`).
 */
export const IMPORTACION_CLIENTES = {
  titulo: 'Importar clientes',
  subtitulo: 'Clientes y vehículos desde Excel',
  icono: Users,
  entidad: { singular: 'cliente', plural: 'clientes' },
  plantilla: {
    nombre: 'plantilla_importacion_clientes.xlsx',
    muestra: {
      columnas: ['Tipo Ident.', 'Identificación', 'Nombre', 'Teléfono', 'Placa', 'Marca'],
      fila: ['Cédula', '1712345678', 'Juan Pérez', '0991234567', 'PBA-1234', 'Kia'],
    },
  },
  columnas: {
    obligatorias: ['Identificación', 'Nombre'],
    grupos: [
      { titulo: 'Cliente', columnas: ['Tipo Identificación', 'Identificación', 'Nombre', 'Email', 'Teléfono', 'Dirección', 'ID Contífico'] },
      { titulo: 'Vehículo (opcional)', columnas: ['Placa', 'Chasis/VIN', 'Nº Motor', 'Marca', 'Modelo', 'Año', 'Color', 'Transmisión', 'Combustible', 'Tipo', 'País de Origen', 'Kilometraje'] },
    ],
  },
  reglas: [
    { icono: Car, titulo: 'Una fila por vehículo', texto: 'Si un cliente tiene varios, repite su identificación.' },
    { icono: RefreshCw, titulo: 'Sin duplicados', texto: 'Si la identificación existe, sus datos se actualizan.' },
    { icono: CircleCheck, titulo: 'Solo 2 obligatorios', texto: 'Identificación y Nombre. El resto es opcional.' },
  ],
  fila: { principal: 'nombre', secundaria: 'identificacion', extra: 'vehiculo', extraEtiqueta: 'Vehículo' },
  contadores: [{ clave: 'vehiculos', etiqueta: 'vehículos' }],
};

export const SERVICIO_IMPORTACION_CLIENTES = {
  descargarPlantilla: () => clientsService.descargarPlantilla(),
  validar: (archivo) => clientsService.validarImportacion(archivo),
  importar: (archivo) => clientsService.importarArchivo(archivo),
  descargarErrores: (errores) => clientsService.descargarErrores(errores),
};
