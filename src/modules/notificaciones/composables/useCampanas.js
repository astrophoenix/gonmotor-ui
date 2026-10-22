import { ref } from 'vue';
import { notificacionesService } from '../services/notificacionesService';
import { createLatestRequest, isAbortError } from '../../../shared/utils/search';

/** Listado paginado de campañas masivas, filtrable por estado. */
export function useCampanas() {
  const items = ref([]);
  const estado = ref('');
  const currentPage = ref(1);
  const total = ref(0);
  const nextUrl = ref(null);
  const previousUrl = ref(null);
  const isLoading = ref(false);
  const errorMessage = ref('');

  const listRequest = createLatestRequest();

  async function fetchCampanas(page = 1) {
    const { signal, id } = listRequest.begin();
    isLoading.value = true;
    errorMessage.value = '';
    try {
      const data = await notificacionesService.listarCampanas({ page, estado: estado.value, signal });
      if (!listRequest.isCurrent(id)) return;
      items.value = data.results || [];
      total.value = data.count || 0;
      nextUrl.value = data.next;
      previousUrl.value = data.previous;
      currentPage.value = page;
    } catch (error) {
      if (!listRequest.isCurrent(id) || isAbortError(error)) return;
      errorMessage.value = error.message || 'No se pudieron cargar las campañas.';
    } finally {
      if (listRequest.isCurrent(id)) isLoading.value = false;
    }
  }

  return {
    items,
    estado,
    currentPage,
    total,
    nextUrl,
    previousUrl,
    isLoading,
    errorMessage,
    fetchCampanas,
  };
}
