import { onMounted, ref } from 'vue';
import { request } from '../services/httpClient';
import { ROLES } from '../constants/roles';

export function useRolesOtorgables() {
  const rolesOtorgables = ref([]);
  const rolesDisponibles = ref([]);
  const isLoading = ref(false);

  async function cargar() {
    isLoading.value = true;
    try {
      const data = await request('/api/auth/me/');
      rolesOtorgables.value = Array.isArray(data.roles_otorgables) ? data.roles_otorgables : [];
      const catalogo = Array.isArray(data.roles_otorgables_catalogo) ? data.roles_otorgables_catalogo : [];
      rolesDisponibles.value = catalogo.length
        ? catalogo.map((rol) => ({ value: rol.codigo, label: rol.nombre }))
        : ROLES.filter((rol) => rolesOtorgables.value.includes(rol.value));
    } catch (error) {
      rolesOtorgables.value = [];
      rolesDisponibles.value = [];
    } finally {
      isLoading.value = false;
    }
  }

  onMounted(cargar);

  return { rolesOtorgables, rolesDisponibles, isLoading, cargar };
}