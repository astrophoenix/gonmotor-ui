import { ref, computed, onScopeDispose } from 'vue';
import { usuariosService } from '../services/usuariosService';
import { createLatestRequest, isAbortError } from '../../../shared/utils/search';

export function useUsuarios() {
  const usuarios = ref([]);
  const search = ref('');
  const estado = ref('');
  const rol = ref('');
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
    if (!total.value) return 'No se encontraron usuarios.';
    return `Mostrando ${firstItem.value}-${lastItem.value} de ${total.value} usuario${total.value === 1 ? '' : 's'}`;
  });

  const listRequest = createLatestRequest();

  async function fetchUsuarios(page = 1, extra = {}) {
    const { signal, id } = listRequest.begin();
    isLoading.value = true;
    errorMessage.value = '';
    try {
      const data = await usuariosService.list({
        page,
        search: search.value.trim(),
        estado: estado.value,
        rol: rol.value,
        acceso: 'con',
        ...extra,
        signal,
      });
      if (!listRequest.isCurrent(id)) return;
      usuarios.value = Array.isArray(data) ? data : (data.results || []);
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

  async function removeUsuario(id, label) {
    isDeleting.value = true;
    errorMessage.value = '';
    try {
      const response = await usuariosService.delete(id, label);
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
    usuarios,
    search,
    estado,
    rol,
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
    fetchUsuarios,
    removeUsuario,
  };
}