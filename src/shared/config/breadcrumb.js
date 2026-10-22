/**
 * Migas de pan centralizadas para la topbar.
 *
 * El proyecto no tiene router: cada enlace provoca una carga completa, así que
 * la ruta se deriva de `window.location.pathname`. El último nivel se toma del
 * `title` de la página (que Hugo ya renderiza) para no inventar etiquetas.
 */

/** Prefijos de ruta que no son el módulo en sí (van seguidos del módulo). */
const PREFIJOS = new Set(['crud', 'configuracion', 'reportes']);

/** Sección visible → etiqueta del primer nivel. */
const GRUPOS = {
  panel: 'Panel',
  taller: 'Taller',
  clientes: 'Clientes y vehículos',
  catalogo: 'Catálogo',
  negocio: 'Negocio',
  sistema: 'Sistema',
  cuenta: 'Cuenta',
  administracion: 'Administración',
  reportes: 'Reportes',
};

/** Módulo (segmento de URL) → grupo + etiqueta de la entidad. */
const MODULOS = {
  citas: { grupo: 'taller', entidad: 'Citas' },
  calendario: { grupo: 'taller', entidad: 'Calendario' },
  recepciones: { grupo: 'taller', entidad: 'Recepciones' },
  inspecciones: { grupo: 'taller', entidad: 'Inspecciones' },
  cotizaciones: { grupo: 'taller', entidad: 'Cotizaciones' },
  ordenes: { grupo: 'taller', entidad: 'Órdenes de Trabajo' },
  repuestos: { grupo: 'catalogo', entidad: 'Repuestos' },
  servicios: { grupo: 'catalogo', entidad: 'Servicios' },
  clientes: { grupo: 'clientes', entidad: 'Clientes' },
  proveedores: { grupo: 'catalogo', entidad: 'Proveedores' },
  vehiculos: { grupo: 'clientes', entidad: 'Vehículos' },
  empleados: { grupo: 'sistema', entidad: 'Empleados' },
  gastos: { grupo: 'negocio', entidad: 'Gastos' },
  notificaciones: { grupo: 'clientes', entidad: 'Notificaciones' },
  empresa: { grupo: 'sistema', entidad: 'Empresa' },
  talleres: { grupo: 'sistema', entidad: 'Talleres' },
  usuarios: { grupo: 'sistema', entidad: 'Usuarios' },
  roles: { grupo: 'sistema', entidad: 'Roles' },
  auditoria: { grupo: 'sistema', entidad: 'Auditoría' },
  rentabilidad: { grupo: 'negocio', entidad: 'Rentabilidad' },
  'reportes-rentabilidad': { grupo: 'negocio', entidad: 'Rentabilidad' },
  perfil: { grupo: 'cuenta', entidad: 'Editar perfil' },
  empresas: { grupo: 'administracion', entidad: 'Empresas' },
};

/**
 * Construye las migas de pan a partir de la ruta y el título de la página.
 *
 * @param {string} pathname - `window.location.pathname`.
 * @param {string} [tituloPagina] - `title` de la página (Hugo).
 * @returns {Array<{ label: string, href?: string }>}
 */
export function construirMigas(pathname, tituloPagina = '') {
  const ruta = (pathname || '/').replace(/\/+$/, '') || '/';

  if (ruta === '/') {
    return [{ label: 'Panel' }];
  }

  const partes = ruta.split('/').filter(Boolean);
  const conPrefijo = PREFIJOS.has(partes[0]);
  const modulo = conPrefijo ? partes[1] : partes[0];
  const meta = MODULOS[modulo];

  if (!meta) {
    return [{ label: tituloPagina || 'Inicio' }];
  }

  const raiz = `/${partes.slice(0, conPrefijo ? 2 : 1).join('/')}/`;
  const migas = [
    { label: GRUPOS[meta.grupo] },
    { label: meta.entidad, href: raiz },
  ];

  if (tituloPagina && tituloPagina !== meta.entidad) {
    migas.push({ label: tituloPagina });
  }

  return migas;
}
