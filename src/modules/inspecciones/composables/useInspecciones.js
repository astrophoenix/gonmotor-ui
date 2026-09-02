import { ref } from 'vue';
import { inspeccionesService } from '../services/inspeccionesService';

export function useInspecciones() {
  const inspecciones = ref([]);
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

  async function loadInspecciones(page = 1) {
    loading.value = true;
    error.value = null;
    currentPage.value = page;

    try {
      const data = await inspeccionesService.list({
        page,
        search: search.value,
        ordering: '-created_at',
      });
      const list = Array.isArray(data) ? data : (data.results || []);
      inspecciones.value = list;
      total.value = data.count ?? list.length;
      nextUrl.value = data.next ?? null;
      previousUrl.value = data.previous ?? null;

      const perPage = Array.isArray(data) && !data.results ? list.length : (data.results?.length || list.length) || 1;
      firstItem.value = total.value === 0 ? 0 : (page - 1) * perPage + 1;
      lastItem.value = page * perPage;
      rangeLabel.value = `Mostrando ${firstItem.value}-${lastItem.value} de ${total.value} inspecciones`;
    } catch (err) {
      error.value = err.message || 'Error al cargar las inspecciones.';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function loadInspeccion(id) {
    loading.value = true;
    error.value = null;

    try {
      const data = await inspeccionesService.getById(id);
      return data;
    } catch (err) {
      error.value = err.message || 'Error al cargar la inspección.';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function loadInspeccionByRecepcion(recepcionId) {
    loading.value = true;
    error.value = null;

    try {
      const data = await inspeccionesService.getByRecepcion(recepcionId);
      if (Array.isArray(data) && data.length > 0) {
        return data[0];
      }
      if (data && Array.isArray(data.results) && data.results.length > 0) {
        return data.results[0];
      }
      return null;
    } catch (err) {
      error.value = err.message || 'Error al cargar la inspección.';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function saveInspeccion(id, payload) {
    loading.value = true;
    error.value = null;

    try {
      let data;
      if (id) {
        data = await inspeccionesService.update(id, payload);
      } else {
        data = await inspeccionesService.create(payload);
      }
      return data;
    } catch (err) {
      error.value = err.message || 'Error al guardar la inspección.';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function removeInspeccion(id) {
    isDeleting.value = true;
    error.value = null;

    try {
      await inspeccionesService.delete(id);
    } catch (err) {
      error.value = err.message || 'Error al eliminar la inspección.';
      throw err;
    } finally {
      isDeleting.value = false;
    }
  }

  return {
    inspecciones,
    loading,
    error,
    search,
    currentPage,
    total,
    nextUrl,
    previousUrl,
    rangeLabel,
    isDeleting,
    loadInspecciones,
    loadInspeccion,
    loadInspeccionByRecepcion,
    saveInspeccion,
    removeInspeccion,
  };
}
