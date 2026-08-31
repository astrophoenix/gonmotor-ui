import { ref, computed } from 'vue';
import { empleadosService } from '../services/empleadosService';

export function useEmpleados() {
  const empleados = ref([]);
  const search = ref('');
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
    if (!total.value) return 'No se encontraron empleados.';
    return `Mostrando ${firstItem.value}-${lastItem.value} de ${total.value} empleado${total.value === 1 ? '' : 's'}`;
  });

  async function fetchEmpleados(page = 1) {
    isLoading.value = true;
    errorMessage.value = '';
    try {
      const data = await empleadosService.list({
        page,
        search: search.value.trim(),
      });
      empleados.value = Array.isArray(data) ? data : (data.results || []);
      total.value = Array.isArray(data) ? data.length : data.count;
      nextUrl.value = Array.isArray(data) ? null : data.next;
      previousUrl.value = Array.isArray(data) ? null : data.previous;
      currentPage.value = page;
    } catch (error) {
      errorMessage.value = error.message;
      throw error;
    } finally {
      isLoading.value = false;
    }
  }

  async function removeEmpleado(id, label) {
    isDeleting.value = true;
    errorMessage.value = '';
    try {
      const response = await empleadosService.delete(id, label);
      return response;
    } catch (error) {
      errorMessage.value = error.message;
      throw error;
    } finally {
      isDeleting.value = false;
    }
  }

  return {
    empleados,
    search,
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
    fetchEmpleados,
    removeEmpleado,
  };
}
