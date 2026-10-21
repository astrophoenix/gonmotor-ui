import { ref } from 'vue';
import { haySesion, request } from '../services/httpClient';

// Copia de /me/ junto a la sesión: cada página es una recarga completa y, sin ella,
// los botones condicionados a permisos tardaban lo que tarda /me/ en aparecer.
// Se usa al instante y se revalida una vez por página; ocultar es cosmético.
const CLAVE_CACHE = 'gonmotor_permisos';

function almacenSesion() {
  if (localStorage.getItem('gonmotor_access_token')) return localStorage;
  if (sessionStorage.getItem('gonmotor_access_token')) return sessionStorage;
  return null;
}

/** La copia solo vale para el mismo usuario y empresa con que se guardó. */
function duenoSesion(almacen) {
  return `${almacen.getItem('gonmotor_user')}|${almacen.getItem('gonmotor_empresa_id')}`;
}

function leerCache() {
  try {
    const almacen = almacenSesion();
    const cache = almacen && JSON.parse(almacen.getItem(CLAVE_CACHE));
    return cache?.dueno === duenoSesion(almacen) ? cache.data : null;
  } catch {
    return null;
  }
}

function guardarCache(data) {
  try {
    const almacen = almacenSesion();
    almacen?.setItem(CLAVE_CACHE, JSON.stringify({ dueno: duenoSesion(almacen), data }));
  } catch {
    // Storage lleno o bloqueado: se sigue con la copia en memoria.
  }
}

let payload = leerCache();
let revalidado = false;
let promesa = null;

function cargar() {
  if (payload && revalidado) return Promise.resolve(payload);
  if (promesa) return promesa;
  // Sin token (login/registro) /me/ respondería 401: ni se consulta.
  if (!haySesion()) return Promise.reject(new Error('Sin sesión'));
  promesa = request('/api/auth/me/')
    .then((data) => {
      payload = data;
      revalidado = true;
      guardarCache(data);
      return data;
    })
    .finally(() => {
      promesa = null;
    });
  return promesa;
}

function ocultarEnlacesSinPermiso(permisos) {
  document.querySelectorAll('[data-recurso]').forEach((el) => {
    const acciones = permisos[el.dataset.recurso] || [];
    if (acciones.includes('ver')) return;
    el.closest('li')?.remove();
  });
  // Una sección (Taller, Catálogo…) sin enlaces visibles sobra, con su etiqueta.
  document.querySelectorAll('[data-sidebar-seccion]').forEach((seccion) => {
    if (!seccion.querySelector('a')) seccion.remove();
  });
}

/** Enlaces del administrador del SaaS: ocultos (`hidden`) salvo para el superusuario. */
function mostrarEnlacesAdminSaas(esSuperusuario) {
  document.querySelectorAll('[data-solo-admin-saas]').forEach((el) => {
    if (esSuperusuario) el.removeAttribute('hidden');
    else el.remove();
  });
}

export async function iniciarPermisosGlobal() {
  if (payload) {
    ocultarEnlacesSinPermiso(payload.permisos || {});
    mostrarEnlacesAdminSaas(Boolean(payload.es_superusuario));
  }
  try {
    const data = await cargar();
    ocultarEnlacesSinPermiso(data.permisos || {});
    mostrarEnlacesAdminSaas(Boolean(data.es_superusuario));
  } catch {
    // Sin sesión (login/registro): no se oculta nada del sidebar.
  }
}

export function usePermisos() {
  const permisos = ref(payload?.permisos || {});
  // Acciones especiales del rol (`AccionEspecial.codigo`), p. ej. `historial_ordenes`.
  const acciones = ref(payload?.acciones || []);
  const isLoading = ref(false);
  // `true` cuando los permisos ya llegaron: evita mostrar avisos de consulta o
  // la pantalla «sin acceso» mientras `puede()` todavía devuelve `false`.
  const cargado = ref(Boolean(payload));

  async function cargarPermisos() {
    isLoading.value = true;
    try {
      const data = await cargar();
      permisos.value = data.permisos || {};
      acciones.value = data.acciones || [];
      cargado.value = true;
      return permisos.value;
    } finally {
      isLoading.value = false;
    }
  }

  function puede(recurso, accion = 'modificar') {
    const acciones = permisos.value[recurso] || [];
    return acciones.includes(accion);
  }

  function tieneAccion(codigo) {
    return acciones.value.includes(codigo);
  }

  /** El rol puede consultar el recurso pero no modificarlo. */
  function soloConsulta(recurso) {
    return cargado.value && puede(recurso, 'ver') && !puede(recurso, 'modificar');
  }

  /** El rol no puede ni consultar el recurso (solo tras cargar los permisos). */
  function sinAcceso(recurso) {
    return cargado.value && !puede(recurso, 'ver');
  }

  cargarPermisos().catch(() => {});

  return { permisos, acciones, isLoading, cargado, cargarPermisos, puede, tieneAccion, soloConsulta, sinAcceso };
}