import { ref, computed, onScopeDispose } from 'vue';
import { clientsService } from '../services/clientesService';
import { createLatestRequest, isAbortError } from '../../../shared/utils/search';

export function useClients() {
  const clients = ref([]);
  const search = ref('');
  const estado = ref('');
  const currentPage = ref(1);
  const total = ref(0);
  const nextUrl = ref(null);
  const previousUrl = ref(null);
  const isLoading = ref(false);
  const isDeleting = ref(false);
  const isReactivating = ref(false);
  const errorMessage = ref('');

  const PAGE_SIZE = 10;

  const firstItem = computed(() =>
    total.value ? ((currentPage.value - 1) * PAGE_SIZE) + 1 : 0
  );

  const lastItem = computed(() =>
    Math.min(currentPage.value * PAGE_SIZE, total.value)
  );

  const rangeLabel = computed(() => {
    if (!total.value) return 'No se encontraron clientes.';
    return `Mostrando ${firstItem.value}-${lastItem.value} de ${total.value} cliente${total.value === 1 ? '' : 's'}`;
  });

  const listRequest = createLatestRequest();

  async function fetchClients(page = 1, extra = {}) {
    const { signal, id } = listRequest.begin();
    isLoading.value = true;
    errorMessage.value = '';
    try {
      const data = await clientsService.list({
        page,
        search: search.value.trim(),
        estado: estado.value,
        ...extra,
        signal,
      });
      if (!listRequest.isCurrent(id)) return;
      clients.value = Array.isArray(data) ? data : (data.results || []);
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

  async function removeClient(id, label) {
    isDeleting.value = true;
    errorMessage.value = '';
    try {
      const response = await clientsService.delete(id, label);
      return response;
    } catch (error) {
      errorMessage.value = error.message;
      throw error;
    } finally {
      isDeleting.value = false;
    }
  }

  async function reactivateClient(id) {
    isReactivating.value = true;
    errorMessage.value = '';
    try {
      return await clientsService.reactivar(id);
    } catch (error) {
      errorMessage.value = error.message;
      throw error;
    } finally {
      isReactivating.value = false;
    }
  }

  onScopeDispose(() => listRequest.cancel());

  return {
    clients,
    search,
    estado,
    currentPage,
    total,
    nextUrl,
    previousUrl,
    isLoading,
    isDeleting,
    isReactivating,
    errorMessage,
    firstItem,
    lastItem,
    rangeLabel,
    fetchClients,
    removeClient,
    reactivateClient,
  };
}
