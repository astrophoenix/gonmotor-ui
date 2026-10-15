import { ref, onScopeDispose } from 'vue';
import { empresasService } from '../services/empresasService';
import { createLatestRequest, isAbortError } from '../../../shared/utils/search';

export function useEmpresas() {
  const empresas = ref([]);
  const search = ref('');
  const estado = ref('');
  const currentPage = ref(1);
  const total = ref(0);
  const nextUrl = ref(null);
  const previousUrl = ref(null);
  const isLoading = ref(false);
  const isDeleting = ref(false);
  const errorMessage = ref('');

  const listRequest = createLatestRequest();

  async function fetchEmpresas(page = 1, extra = {}) {
    const { signal, id } = listRequest.begin();
    isLoading.value = true;
    errorMessage.value = '';
    try {
      const data = await empresasService.list({
        page,
        search: search.value.trim(),
        estado: estado.value,
        ...extra,
        signal,
      });
      if (!listRequest.isCurrent(id)) return;
      empresas.value = data.results || [];
      total.value = data.count || 0;
      nextUrl.value = data.next;
      previousUrl.value = data.previous;
      currentPage.value = page;
    } catch (error) {
      if (!listRequest.isCurrent(id) || isAbortError(error)) return;
      errorMessage.value = error.message;
      throw error;
    } finally {
      if (listRequest.isCurrent(id)) isLoading.value = false;
    }
  }

  async function removeEmpresa(id, label) {
    isDeleting.value = true;
    errorMessage.value = '';
    try {
      return await empresasService.delete(id, label);
    } catch (error) {
      errorMessage.value = error.message;
      throw error;
    } finally {
      isDeleting.value = false;
    }
  }

  onScopeDispose(() => listRequest.cancel());

  return {
    empresas,
    search,
    estado,
    currentPage,
    total,
    nextUrl,
    previousUrl,
    isLoading,
    isDeleting,
    errorMessage,
    fetchEmpresas,
    removeEmpresa,
  };
}
