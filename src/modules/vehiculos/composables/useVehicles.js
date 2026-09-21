import { ref, computed, onScopeDispose } from 'vue';
import { vehiclesService } from '../services/vehiclesService';
import { createLatestRequest, isAbortError } from '../../../shared/utils/search';

export function useVehicles() {
  const vehicles = ref([]);
  const search = ref('');
  const anio = ref('');
  const estado = ref('');
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
    if (!total.value) return 'No se encontraron vehículos.';
    return `Mostrando ${firstItem.value}-${lastItem.value} de ${total.value} vehículo${total.value === 1 ? '' : 's'}`;
  });

  const listRequest = createLatestRequest();

  async function fetchVehicles(page = 1) {
    const { signal, id } = listRequest.begin();
    isLoading.value = true;
    errorMessage.value = '';
    try {
      const data = await vehiclesService.list({
        page,
        search: search.value.trim(),
        anio: anio.value,
        estado: estado.value,
        signal,
      });
      if (!listRequest.isCurrent(id)) return;
      vehicles.value = Array.isArray(data) ? data : (data.results || []);
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

  async function removeVehicle(id, label) {
    isDeleting.value = true;
    errorMessage.value = '';
    try {
      const response = await vehiclesService.delete(id, label);
      return response;
    } catch (error) {
      errorMessage.value = error.message;
      throw error;
    } finally {
      isDeleting.value = false;
    }
  }

  onScopeDispose(() => listRequest.cancel());

  return {
    vehicles,
    search,
    anio,
    estado,
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
    fetchVehicles,
    removeVehicle,
  };
}
