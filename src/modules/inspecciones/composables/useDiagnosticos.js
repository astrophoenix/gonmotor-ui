import { ref } from 'vue';
import { diagnosticosService } from '../services/diagnosticosService';

export function useDiagnosticos() {
  const diagnostico = ref(null);
  const loading = ref(false);
  const error = ref(null);

  async function loadDiagnostico(id) {
    loading.value = true;
    error.value = null;

    try {
      const data = await diagnosticosService.getById(id);
      diagnostico.value = data;
      return data;
    } catch (err) {
      error.value = err.message || 'Error al cargar el diagnóstico.';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function loadDiagnosticoByRecepcion(recepcionId) {
    loading.value = true;
    error.value = null;

    try {
      const data = await diagnosticosService.getByRecepcion(recepcionId);
      if (Array.isArray(data) && data.length > 0) {
        diagnostico.value = data[0];
        return data[0];
      }
      if (data && Array.isArray(data.results) && data.results.length > 0) {
        diagnostico.value = data.results[0];
        return data.results[0];
      }
      diagnostico.value = null;
      return null;
    } catch (err) {
      error.value = err.message || 'Error al cargar el diagnóstico.';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function saveDiagnostico(id, payload) {
    loading.value = true;
    error.value = null;

    try {
      let data;
      if (id) {
        data = await diagnosticosService.update(id, payload);
      } else {
        data = await diagnosticosService.create(payload);
      }
      diagnostico.value = data;
      return data;
    } catch (err) {
      error.value = err.message || 'Error al guardar el diagnóstico.';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  return {
    diagnostico,
    loading,
    error,
    loadDiagnostico,
    loadDiagnosticoByRecepcion,
    saveDiagnostico,
  };
}
