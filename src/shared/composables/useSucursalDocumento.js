import { computed, ref } from 'vue';
import { useAuthStore } from '../../modules/auth/stores/authStore';

/**
 * Taller/sucursal emisor para documentos (recepción, inspección, cotización,
 * orden de trabajo).
 *
 * Reglas:
 * - Solo la administración (ADMIN_EMPRESA / ADMIN_SISTEMA) sin taller activo
 *   («Todos los talleres») ve el selector; en ese caso es obligatorio.
 * - Con un taller activo (o para el resto de roles) el selector se oculta y el
 *   payload lleva el taller ya asignado al documento (edición) o, si no hay,
 *   el taller activo de la sesión: el mismo que viaja en `X-Taller-ID`.
 *
 * Nunca se envía `sucursal: null` habiendo un taller conocido: en una edición
 * eso dejaría el documento sin taller.
 */
export function useSucursalDocumento() {
  const authStore = useAuthStore();

  const tallerId = ref(null);
  const error = ref('');

  const esAdminTalleres = computed(() => Boolean(authStore.user?.es_admin_talleres));
  const sinTallerActivo = computed(() => authStore.esTodosLosTalleres);
  const mostrar = computed(() => esAdminTalleres.value && sinTallerActivo.value);

  /** Valor para el campo `sucursal` del payload. */
  const sucursal = computed(() => {
    if (mostrar.value) return tallerId.value;
    return tallerId.value ?? authStore.tallerId ?? null;
  });

  /** Precarga el taller del documento cargado (modo edición). */
  function cargarSucursal(valor) {
    tallerId.value = valor != null && valor !== '' ? String(valor) : null;
  }

  function validar() {
    if (mostrar.value && !tallerId.value) {
      error.value = 'Selecciona el taller que emite el documento.';
      return false;
    }
    error.value = '';
    return true;
  }

  function limpiarError() {
    error.value = '';
  }

  return {
    tallerId,
    error,
    mostrar,
    sucursal,
    cargarSucursal,
    validar,
    limpiarError,
  };
}
