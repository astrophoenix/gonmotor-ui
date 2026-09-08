import { ref } from 'vue';
import { ordenesService } from '../services/ordenesService';

export function useOrdenes() {
  const ordenes = ref([]);
  const loading = ref(false);
  const error = ref(null);
  const search = ref('');
  const currentPage = ref(1);
  const total = ref(0);
  const nextUrl = ref(null);
  const previousUrl = ref(null);
  const isDeleting = ref(false);

  const lastItem = ref(0);
  const firstItem = ref(0);
  const rangeLabel = ref('');

  async function loadOrdenes(page = 1) {
    loading.value = true;
    error.value = null;
    currentPage.value = page;

    try {
      const data = await ordenesService.list({
        page,
        search: search.value,
        ordering: '-created_at',
      });
      const list = Array.isArray(data) ? data : (data.results || []);
      ordenes.value = list;
      total.value = data.count ?? list.length;
      nextUrl.value = data.next ?? null;
      previousUrl.value = data.previous ?? null;

      const perPage = Array.isArray(data) && !data.results ? list.length : (data.results?.length || list.length) || 1;
      firstItem.value = total.value === 0 ? 0 : (page - 1) * perPage + 1;
      lastItem.value = page * perPage;
      rangeLabel.value = `Mostrando ${firstItem.value}-${lastItem.value} de ${total.value} órdenes`;
    } catch (err) {
      error.value = err.message || 'Error al cargar las órdenes de trabajo.';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function loadOrden(id) {
    loading.value = true;
    error.value = null;

    try {
      const data = await ordenesService.getById(id);
      return data;
    } catch (err) {
      error.value = err.message || 'Error al cargar la orden de trabajo.';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function saveOrden(id, payload) {
    loading.value = true;
    error.value = null;

    try {
      const data = await ordenesService.update(id, payload);
      return data;
    } catch (err) {
      error.value = err.message || 'Error al guardar la orden de trabajo.';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function removeOrden(id) {
    isDeleting.value = true;
    error.value = null;

    try {
      await ordenesService.delete(id);
    } catch (err) {
      error.value = err.message || 'Error al eliminar la orden de trabajo.';
      throw err;
    } finally {
      isDeleting.value = false;
    }
  }

  return {
    ordenes,
    loading,
    error,
    search,
    currentPage,
    total,
    nextUrl,
    previousUrl,
    rangeLabel,
    isDeleting,
    loadOrdenes,
    loadOrden,
    saveOrden,
    removeOrden,
  };
}