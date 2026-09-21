import { ref, computed, onScopeDispose } from 'vue';
import { citasService } from '../services/citasService';
import { createLatestRequest, isAbortError } from '../../../shared/utils/search';

export function useCitas() {
  const citas = ref([]);
  const search = ref('');
  const estadoFiltro = ref('');
  const fechaFiltro = ref('');
  const currentPage = ref(1);
  const total = ref(0);
  const nextUrl = ref(null);
  const previousUrl = ref(null);
  const isLoading = ref(false);
  const isDeleting = ref(false);
  const isConverting = ref(false);
  const errorMessage = ref('');

  const PAGE_SIZE = 10;

  const firstItem = computed(() =>
    total.value ? ((currentPage.value - 1) * PAGE_SIZE) + 1 : 0
  );

  const lastItem = computed(() =>
    Math.min(currentPage.value * PAGE_SIZE, total.value)
  );

  const rangeLabel = computed(() => {
    if (!total.value) return 'No se encontraron citas.';
    return `Mostrando ${firstItem.value}-${lastItem.value} de ${total.value} cita${total.value === 1 ? '' : 's'}`;
  });

  const proximasCitas = computed(() =>
    citas.value.filter((cita) => ['PROGRAMADA', 'CONFIRMADA'].includes(cita.estado))
  );

  const listRequest = createLatestRequest();

  async function fetchCitas(page = 1) {
    const { signal, id } = listRequest.begin();
    isLoading.value = true;
    errorMessage.value = '';
    try {
      const data = await citasService.list({
        page,
        search: search.value.trim(),
        estado: estadoFiltro.value,
        fecha: fechaFiltro.value,
        signal,
      });
      if (!listRequest.isCurrent(id)) return;
      citas.value = Array.isArray(data) ? data : (data.results || []);
      total.value = Array.isArray(data) ? data.length : data.count;
      nextUrl.value = Array.isArray(data) ? null : data.next;
      previousUrl.value = Array.isArray(data) ? null : data.previous;
      currentPage.value = page;
    } catch (error) {
      if (!listRequest.isCurrent(id) || isAbortError(error)) return;
      errorMessage.value = error.message;
      throw error;
    } finally {
      if (listRequest.isCurrent(id)) isLoading.value = false;
    }
  }

  async function removeCita(id, label) {
    isDeleting.value = true;
    errorMessage.value = '';
    try {
      const response = await citasService.delete(id, label);
      return response;
    } catch (error) {
      errorMessage.value = error.message;
      throw error;
    } finally {
      isDeleting.value = false;
    }
  }

  async function convertirARecepcion(id) {
    isConverting.value = true;
    errorMessage.value = '';
    try {
      const response = await citasService.convertirARecepcion(id);
      return response;
    } catch (error) {
      errorMessage.value = error.message;
      throw error;
    } finally {
      isConverting.value = false;
    }
  }

  function resetFilters() {
    search.value = '';
    estadoFiltro.value = '';
    fechaFiltro.value = '';
  }

  onScopeDispose(() => listRequest.cancel());

  return {
    citas,
    search,
    estadoFiltro,
    fechaFiltro,
    currentPage,
    total,
    nextUrl,
    previousUrl,
    isLoading,
    isDeleting,
    isConverting,
    errorMessage,
    firstItem,
    lastItem,
    rangeLabel,
    proximasCitas,
    fetchCitas,
    removeCita,
    convertirARecepcion,
    resetFilters,
  };
}