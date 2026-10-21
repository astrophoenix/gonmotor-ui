import { computed, onScopeDispose, ref } from 'vue';
import { createLatestRequest, isAbortError } from '../../../shared/utils/search';
import { listarAuditoria } from '../services/auditoriaService';

export function useAuditoria() {
  const registros = ref([]);
  const isLoading = ref(false);
  const error = ref('');
  const page = ref(1);
  const total = ref(0);
  const next = ref(null);
  const previous = ref(null);
  const solicitudes = createLatestRequest();
  const rangeLabel = computed(() => `${total.value} acciones registradas · Página ${page.value}`);

  async function cargar(filtros, pagina = 1) {
    const { signal, id } = solicitudes.begin();
    isLoading.value = true;
    error.value = '';
    try {
      const data = await listarAuditoria(filtros, pagina, signal);
      if (!solicitudes.isCurrent(id)) return;
      registros.value = data.results;
      total.value = data.count;
      next.value = data.next;
      previous.value = data.previous;
      page.value = pagina;
    } catch (e) {
      if (!solicitudes.isCurrent(id) || isAbortError(e)) return;
      registros.value = [];
      next.value = previous.value = null;
      total.value = 0;
      error.value = e.message || 'No se pudo cargar el historial.';
    } finally {
      if (solicitudes.isCurrent(id)) isLoading.value = false;
    }
  }
  onScopeDispose(() => solicitudes.cancel());
  return { registros, isLoading, error, page, total, next, previous, rangeLabel, cargar };
}
