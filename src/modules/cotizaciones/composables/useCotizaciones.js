import { ref } from 'vue';
import { cotizacionesService } from '../services/cotizacionesService';

export function useCotizaciones() {
  const cotizaciones = ref([]);
  const loading = ref(false);
  const error = ref(null);
  const search = ref('');
  const currentPage = ref(1);
  const total = ref(0);
  const nextUrl = ref(null);
  const previousUrl = ref(null);
  const isDeleting = ref(false);

  const rangeLabel = ref('');

  async function loadCotizaciones(page = 1) {
    loading.value = true;
    error.value = null;
    currentPage.value = page;

    try {
      const data = await cotizacionesService.list({
        page,
        search: search.value,
        ordering: '-created_at',
      });
      const list = Array.isArray(data) ? data : (data.results || []);
      cotizaciones.value = list;
      total.value = data.count ?? list.length;
      nextUrl.value = data.next ?? null;
      previousUrl.value = data.previous ?? null;

      const perPage = Array.isArray(data) && !data.results ? list.length : (data.results?.length || list.length) || 1;
      const firstItem = total.value === 0 ? 0 : (page - 1) * perPage + 1;
      const lastItem = page * perPage;
      rangeLabel.value = `Mostrando ${firstItem}-${lastItem} de ${total.value} cotizaciones`;
    } catch (err) {
      error.value = err.message || 'Error al cargar las cotizaciones.';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function loadCotizacion(id) {
    loading.value = true;
    error.value = null;

    try {
      return await cotizacionesService.getById(id);
    } catch (err) {
      error.value = err.message || 'Error al cargar la cotización.';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function removeCotizacion(id) {
    isDeleting.value = true;
    error.value = null;

    try {
      await cotizacionesService.delete(id);
    } catch (err) {
      error.value = err.message || 'Error al eliminar la cotización.';
      throw err;
    } finally {
      isDeleting.value = false;
    }
  }

  return {
    cotizaciones,
    loading,
    error,
    search,
    currentPage,
    total,
    nextUrl,
    previousUrl,
    rangeLabel,
    isDeleting,
    loadCotizaciones,
    loadCotizacion,
    removeCotizacion,
  };
}