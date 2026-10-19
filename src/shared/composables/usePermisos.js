import { ref } from 'vue';
import { request } from '../services/httpClient';

let payload = null;
let promesa = null;

function cargar() {
  if (payload) return Promise.resolve(payload);
  if (promesa) return promesa;
  promesa = request('/api/auth/me/')
    .then((data) => {
      payload = data;
      return data;
    })
    .catch((error) => {
      payload = null;
      throw error;
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
  // Un grupo desplegable (Operación, Inventario…) sin enlaces visibles sobra.
  document.querySelectorAll('ul.sidebar-submenu').forEach((submenu) => {
    if (!submenu.querySelector('li')) submenu.closest('li')?.remove();
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
  const isLoading = ref(false);
  // `true` cuando los permisos ya llegaron: evita mostrar avisos de consulta o
  // la pantalla «sin acceso» mientras `puede()` todavía devuelve `false`.
  const cargado = ref(Boolean(payload));

  async function cargarPermisos() {
    isLoading.value = true;
    try {
      const data = await cargar();
      permisos.value = data.permisos || {};
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

  /** El rol puede consultar el recurso pero no modificarlo. */
  function soloConsulta(recurso) {
    return cargado.value && puede(recurso, 'ver') && !puede(recurso, 'modificar');
  }

  /** El rol no puede ni consultar el recurso (solo tras cargar los permisos). */
  function sinAcceso(recurso) {
    return cargado.value && !puede(recurso, 'ver');
  }

  cargarPermisos().catch(() => {});

  return { permisos, isLoading, cargado, cargarPermisos, puede, soloConsulta, sinAcceso };
}