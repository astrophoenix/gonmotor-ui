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
}

export async function iniciarPermisosGlobal() {
  try {
    const data = await cargar();
    ocultarEnlacesSinPermiso(data.permisos || {});
  } catch {
    // Sin sesión (login/registro): no se oculta nada del sidebar.
  }
}

export function usePermisos() {
  const permisos = ref(payload?.permisos || {});
  const isLoading = ref(false);

  async function cargarPermisos() {
    isLoading.value = true;
    try {
      const data = await cargar();
      permisos.value = data.permisos || {};
      return permisos.value;
    } finally {
      isLoading.value = false;
    }
  }

  function puede(recurso, accion = 'modificar') {
    const acciones = permisos.value[recurso] || [];
    return acciones.includes(accion);
  }

  cargarPermisos().catch(() => {});

  return { permisos, isLoading, cargarPermisos, puede };
}