export const RECURSOS = [
  'empresa',
  'talleres',
  'usuarios',
  'empleados',
  'clientes',
  'vehiculos',
  'proveedores',
  'citas',
  'recepciones',
  'inspecciones',
  'cotizaciones',
  'ordenes',
  'inventario',
  'facturacion',
  'reportes',
];

export const ACCIONES = ['ver', 'modificar'];

export const ROLES = [
  { value: 'ADMIN_SISTEMA', label: 'Superadmin SaaS' },
  { value: 'ADMIN_EMPRESA', label: 'Dueño / Admin de Empresa' },
  { value: 'ADMIN_TALLER', label: 'Gerente de Taller' },
  { value: 'ASESOR', label: 'Asesor de Servicio' },
  { value: 'MECANICO', label: 'Técnico / Mecánico' },
  { value: 'CAJERO', label: 'Caja / Facturación' },
];

export function obtenerRol(value) {
  return ROLES.find((item) => item.value === value) || null;
}

export function rolLabel(value) {
  const rol = obtenerRol(value);
  return rol ? rol.label : value;
}