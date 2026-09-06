import { ref, computed } from 'vue';
import { fetchRecepciones, fetchRecepcion } from '../services/recepcionesService';

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

  async function loadRecepciones(page = 1, search = '') {
    loading.value = true;
    error.value = null;

    try {
      const token = localStorage.getItem('gonmotor_access_token') || sessionStorage.getItem('gonmotor_access_token');
      const empresaId = localStorage.getItem('gonmotor_empresa_id') || sessionStorage.getItem('gonmotor_empresa_id');
      const data = await fetchRecepciones(token, empresaId, page, search);
      recepciones.value = Array.isArray(data) ? data : (data.results || []);
      total.value = Array.isArray(data) ? data.length : data.count;
      nextUrl.value = Array.isArray(data) ? null : data.next;
      previousUrl.value = Array.isArray(data) ? null : data.previous;
      currentPage.value = page;
    } catch (err) {
      error.value = err.message || 'Error al cargar las recepciones.';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function loadRecepcion(id) {
    loading.value = true;
    error.value = null;

    try {
      const token = localStorage.getItem('gonmotor_access_token') || sessionStorage.getItem('gonmotor_access_token');
      const empresaId = localStorage.getItem('gonmotor_empresa_id') || sessionStorage.getItem('gonmotor_empresa_id');
      return await fetchRecepcion(token, empresaId, id);
    } catch (err) {
      error.value = err.message || 'Error al cargar la recepción.';
      throw err;
    } finally {
      loading.value = false;
    }
  }

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