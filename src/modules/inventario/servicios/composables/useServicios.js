import { ref, computed, onScopeDispose } from 'vue';
import { serviciosService } from '../services/serviciosService';
import { createLatestRequest, isAbortError } from '../../../../shared/utils/search';

export function useServicios() {
  const servicios = ref([]);
  const search = ref('');
  const categoria = ref('');
  const currentPage = ref(1);
  const total = ref(0);
  const nextUrl = ref(null);
  const previousUrl = ref(null);
  const isLoading = ref(false);
  const isDeleting = ref(false);
  const errorMessage = ref('');

  const PAGE_SIZE = 10;

  const firstItem = computed(() =>
    total.value ? ((currentPage.value - 1) * PAGE_SIZE) + 1 : 0
  );

  const lastItem = computed(() =>
    Math.min(currentPage.value * PAGE_SIZE, total.value)
  );

  const rangeLabel = computed(() => {
    if (!total.value) return 'No se encontraron servicios.';
    return `Mostrando ${firstItem.value}-${lastItem.value} de ${total.value} servicio${total.value === 1 ? '' : 's'}`;
  });

  const listRequest = createLatestRequest();

  async function fetchServicios(page = 1) {
    const { signal, id } = listRequest.begin();
    isLoading.value = true;
    errorMessage.value = '';
    try {
      const data = await serviciosService.list({
        page,
        search: search.value.trim(),
        categoria: categoria.value || null,
        signal,
      });
      if (!listRequest.isCurrent(id)) return;
      servicios.value = Array.isArray(data) ? data : (data.results || []);
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

  async function removeServicio(id, label) {
    isDeleting.value = true;
    errorMessage.value = '';
    try {
      return await serviciosService.delete(id, label);
    } catch (error) {
      errorMessage.value = error.message;
      throw error;
    } finally {
      isDeleting.value = false;
    }
  }

  onScopeDispose(() => listRequest.cancel());

  return {
    servicios,
    search,
    categoria,
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
    fetchServicios,
    removeServicio,
  };
}