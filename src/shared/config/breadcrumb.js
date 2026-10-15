/**
 * Migas de pan centralizadas para la topbar.
 *
 * El proyecto no tiene router: cada enlace provoca una carga completa, así que
 * la ruta se deriva de `window.location.pathname`. El último nivel se toma del
 * `title` de la página (que Hugo ya renderiza) para no inventar etiquetas.
 */

/** Prefijos de ruta que no son el módulo en sí (van seguidos del módulo). */
const PREFIJOS = new Set(['crud', 'configuracion']);

/** Sección visible → etiqueta del primer nivel. */
const GRUPOS = {
  panel: 'Panel',
  operacion: 'Operación',
  inventario: 'Inventario',
  negocio: 'Negocio',
  sistema: 'Sistema',
  cuenta: 'Cuenta',
  administracion: 'Administración',
};

/** Módulo (segmento de URL) → grupo + etiqueta de la entidad. */
const MODULOS = {
  citas: { grupo: 'operacion', entidad: 'Citas' },
  calendario: { grupo: 'operacion', entidad: 'Calendario' },
  recepciones: { grupo: 'operacion', entidad: 'Recepciones' },
  inspecciones: { grupo: 'operacion', entidad: 'Inspecciones' },
  cotizaciones: { grupo: 'operacion', entidad: 'Cotizaciones' },
  ordenes: { grupo: 'operacion', entidad: 'Órdenes de Trabajo' },
  repuestos: { grupo: 'inventario', entidad: 'Repuestos' },
  servicios: { grupo: 'inventario', entidad: 'Servicios' },
  clientes: { grupo: 'negocio', entidad: 'Clientes' },
  proveedores: { grupo: 'negocio', entidad: 'Proveedores' },
  vehiculos: { grupo: 'negocio', entidad: 'Vehículos' },
  empleados: { grupo: 'negocio', entidad: 'Empleados' },
  notificaciones: { grupo: 'negocio', entidad: 'Notificaciones WhatsApp' },
  empresa: { grupo: 'sistema', entidad: 'Empresa' },
  talleres: { grupo: 'sistema', entidad: 'Talleres' },
  usuarios: { grupo: 'sistema', entidad: 'Usuarios' },
  roles: { grupo: 'sistema', entidad: 'Roles' },
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
