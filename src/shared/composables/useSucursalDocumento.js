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
 *   backend resuelve el taller desde la cabecera `X-Taller-ID` (storage).
 *
 * El payload debe incluir `sucursal` únicamente cuando el selector está
 * visible; en caso contrario se omite (null) para que el backend lo derive.
 */
export function useSucursalDocumento() {
  const authStore = useAuthStore();

  const tallerId = ref(null);
  const error = ref('');

  const esAdminTalleres = computed(() => Boolean(authStore.user?.es_admin_talleres));
  const sinTallerActivo = computed(() => authStore.esTodosLosTalleres);
  const mostrar = computed(() => esAdminTalleres.value && sinTallerActivo.value);

  /** Valor para el campo `sucursal` del payload (solo si hay que elegirlo). */
  const sucursal = computed(() => (mostrar.value ? tallerId.value : null));

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
