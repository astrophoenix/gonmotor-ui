import { ref, computed, onScopeDispose } from 'vue';
import { gastosService } from '../services/gastosService';
import { createLatestRequest, isAbortError } from '../../../shared/utils/search';

export function useGastos() {
  const gastos = ref([]);
  const categoria = ref('');
  const tallerId = ref(null);
  const fechaDesde = ref('');
  const fechaHasta = ref('');
  const currentPage = ref(1);
  const total = ref(0);
  const nextUrl = ref(null);
  const previousUrl = ref(null);
  const isLoading = ref(false);
  const isDeleting = ref(false);
  const errorMessage = ref('');

  const PAGE_SIZE = 10;

  const firstItem = computed(() =>
    total.value ? (currentPage.value - 1) * PAGE_SIZE + 1 : 0
  );
  const lastItem = computed(() =>
    Math.min(currentPage.value * PAGE_SIZE, total.value)
  );
  const rangeLabel = computed(() => {
    if (!total.value) return 'No se encontraron gastos.';
    return `Mostrando ${firstItem.value}-${lastItem.value} de ${total.value} gasto${total.value === 1 ? '' : 's'}`;
  });

  const appliedFilters = computed(() => ({
    categoria: categoria.value,
    taller_id: tallerId.value,
    fecha_desde: fechaDesde.value,
    fecha_hasta: fechaHasta.value,
  }));

  const listRequest = createLatestRequest();

  async function fetchGastos(page = 1, extra = {}) {
    const { signal, id } = listRequest.begin();
    isLoading.value = true;
    errorMessage.value = '';
    try {
      const data = await gastosService.list({
        ...appliedFilters.value,
        ...extra,
        page,
        signal,
      });
      if (!listRequest.isCurrent(id)) return;
      gastos.value = data.results || [];
      total.value = data.count;
      nextUrl.value = data.next;
      previousUrl.value = data.previous;
      currentPage.value = page;
    } catch (error) {
      if (!listRequest.isCurrent(id) || isAbortError(error)) return;
      errorMessage.value = error.message || 'No se pudieron cargar los gastos.';
    } finally {
      if (listRequest.isCurrent(id)) isLoading.value = false;
    }
  }

  async function removeGasto(id, label) {
    isDeleting.value = true;
    errorMessage.value = '';
    try {
      const response = await gastosService.delete(id, label);
      return response;
    } catch (error) {
      errorMessage.value = error.message || 'No se pudo eliminar el gasto.';
      throw error;
    } finally {
      isDeleting.value = false;
    }
  }

  function pageFromUrl(url) {
    if (!url) return null;
    const u = new URL(url, window.location.origin);
    const p = u.searchParams.get('page');
    return p ? parseInt(p, 10) : null;
  }

  async function goToPage(page) {
    if (!page || page === currentPage.value) return;
    await fetchGastos(page, appliedFilters.value);
  }

  async function nextPage() {
    const page = pageFromUrl(nextUrl.value);
    if (page) await fetchGastos(page, appliedFilters.value);
  }

  async function prevPage() {
    const page = pageFromUrl(previousUrl.value);
    if (page) await fetchGastos(page, appliedFilters.value);
  }

  onScopeDispose(() => listRequest.cancel());

  return {
    gastos,
    categoria,
    tallerId,
    fechaDesde,
    fechaHasta,
    currentPage,
    total,
    nextUrl,
    previousUrl,
    isLoading,
    isDeleting,
    errorMessage,
    firstItem,
    lastItem,
    rangeLabel,
    appliedFilters,
    fetchGastos,
    removeGasto,
    goToPage,
    nextPage,
    prevPage,
  };
}
