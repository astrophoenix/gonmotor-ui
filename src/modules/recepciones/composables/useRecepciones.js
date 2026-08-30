import { ref } from 'vue';
import { fetchRecepciones, fetchRecepcion } from '../services/recepcionesService';

export function useRecepciones() {
  const recepciones = ref([]);
  const loading = ref(false);
  const error = ref(null);

   async function loadRecepciones() {
    loading.value = true;
    error.value = null;

    try {
      const token = localStorage.getItem('gonmotor_access_token') || sessionStorage.getItem('gonmotor_access_token');
      const empresaId = localStorage.getItem('gonmotor_empresa_id') || sessionStorage.getItem('gonmotor_empresa_id');
      const data = await fetchRecepciones(token, empresaId);
      recepciones.value = Array.isArray(data) ? data : (data.results || []);
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
    loadRecepciones,
    loadRecepcion,
  };
}
