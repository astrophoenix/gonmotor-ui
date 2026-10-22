import { ref } from 'vue';
import { notificacionesService } from '../services/notificacionesService';
import { createLatestRequest, isAbortError } from '../../../shared/utils/search';

/**
 * Listado paginado de la cola `NotificacionProgramada` con sus filtros
 * (estado, tipo, canal). Cancela la petición anterior al cambiar filtros.
 */
export function useProgramadas() {
  const items = ref([]);
  const estado = ref('PENDIENTE');
  const tipo = ref('');
  const canal = ref('');
  const currentPage = ref(1);
  const total = ref(0);
  const nextUrl = ref(null);
  const previousUrl = ref(null);
  const isLoading = ref(false);
  const errorMessage = ref('');

  const listRequest = createLatestRequest();

  async function fetchProgramadas(page = 1) {
    const { signal, id } = listRequest.begin();
    isLoading.value = true;
    errorMessage.value = '';
    try {
      const data = await notificacionesService.listarProgramadas({
        page,
        filtros: { estado: estado.value, tipo: tipo.value, canal: canal.value },
        signal,
      });
      if (!listRequest.isCurrent(id)) return;
      items.value = data.results || [];
      total.value = data.count || 0;
      nextUrl.value = data.next;
      previousUrl.value = data.previous;
      currentPage.value = page;
    } catch (error) {
      if (!listRequest.isCurrent(id) || isAbortError(error)) return;
      errorMessage.value = error.message || 'No se pudo cargar la cola de notificaciones.';
    } finally {
      if (listRequest.isCurrent(id)) isLoading.value = false;
    }
  }

  return {
    items,
    estado,
    tipo,
    canal,
    currentPage,
    total,
    nextUrl,
    previousUrl,
    isLoading,
    errorMessage,
    fetchProgramadas,
  };
}
