import { ref, computed, onScopeDispose } from 'vue';
import { recepcionesService } from '../services/recepcionesService';
import { createLatestRequest, isAbortError } from '../../../shared/utils/search';

export function useRecepciones() {
  const recepciones = ref([]);
  const loading = ref(false);
  const error = ref(null);
  const currentPage = ref(1);
  const total = ref(0);
  const nextUrl = ref(null);
  const previousUrl = ref(null);

  const PAGE_SIZE = 10;

  const firstItem = computed(() =>
    total.value ? ((currentPage.value - 1) * PAGE_SIZE) + 1 : 0
  );

  const lastItem = computed(() =>
    Math.min(currentPage.value * PAGE_SIZE, total.value)
  );

  const rangeLabel = computed(() => {
    if (!total.value) return 'No se encontraron recepciones.';
    return `Mostrando ${firstItem.value}-${lastItem.value} de ${total.value} recepción${total.value === 1 ? '' : 'es'}`;
  });

  const listRequest = createLatestRequest();

  async function loadRecepciones(page = 1, filters = {}) {
    const { signal, id } = listRequest.begin();
    loading.value = true;
    error.value = null;

    try {
      const { search = '', ...resto } = filters;
      const data = await recepcionesService.list({
        page,
        search,
        filters: resto,
        signal,
      });
      if (!listRequest.isCurrent(id)) return;
      recepciones.value = Array.isArray(data) ? data : (data.results || []);
      total.value = Array.isArray(data) ? data.length : data.count;
      nextUrl.value = Array.isArray(data) ? null : data.next;
      previousUrl.value = Array.isArray(data) ? null : data.previous;
      currentPage.value = page;
    } catch (err) {
      if (!listRequest.isCurrent(id) || isAbortError(err)) return;
      error.value = err.message || 'Error al cargar las recepciones.';
      throw err;
    } finally {
      if (listRequest.isCurrent(id)) loading.value = false;
    }
  }

  async function loadRecepcion(id) {
    loading.value = true;
    error.value = null;

    try {
      return await recepcionesService.getById(id);
    } catch (err) {
      error.value = err.message || 'Error al cargar la recepción.';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  onScopeDispose(() => listRequest.cancel());

  return {
    recepciones,
    loading,
    error,
    currentPage,
    total,
    nextUrl,
    previousUrl,
    firstItem,
    lastItem,
    rangeLabel,
    loadRecepciones,
    loadRecepcion,
  };
}