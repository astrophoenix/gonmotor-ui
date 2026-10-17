<script setup>
import { onMounted, ref } from 'vue';
import { Users, Search, Filter, ShieldCheck } from 'lucide-vue-next';
import { useUsuarios } from '../composables/useUsuarios';
import ConfirmModal from '../../../shared/components/ConfirmModal.vue';
import Alert from '../../../shared/components/Alert.vue';
import EntityHeader from '../../../shared/components/EntityHeader.vue';
import EntityActionButtons from '../../../shared/components/EntityActionButtons.vue';
import FilterActions from '../../../shared/components/FilterActions.vue';
import { vSanitizeSearch } from '../../../shared/directives/sanitizeSearch';
import { useFiltrosReactivos } from '../../../shared/composables/useFiltrosReactivos';
import EntityTable from '../../../shared/components/EntityTable.vue';
import EntityRowActions from '../../../shared/components/EntityRowActions.vue';
import Pagination from '../../../shared/components/Pagination.vue';
import UsuarioModal from './UsuarioModal.vue';
import { useRolesOtorgables } from '../../../shared/composables/useRolesOtorgables';
import EstadoActivoBadge from '../../../shared/components/EstadoActivoBadge.vue';

const {
  usuarios,
  isLoading,
  isDeleting,
  search,
  estado,
  rol,
  currentPage,
  total,
  nextUrl,
  previousUrl,
  fetchUsuarios,
  removeUsuario,
} = useUsuarios();

const { rolesDisponibles: roles } = useRolesOtorgables();

const alert = ref({
  type: 'default',
  title: '',
  message: '',
});

function showAlert(type, title, message) {
  alert.value = { type, title, message };
}

function hideAlert() {
  alert.value = { type: 'default', title: '', message: '' };
}

function emptyAdvancedFilters() {
  return { estado: '', rol: '' };
}

const draftFilters = ref({ ...emptyAdvancedFilters(), estado: estado.value, rol: rol.value });
const appliedFilters = ref({ ...draftFilters.value });

function applyAdvancedFilters() {
  estado.value = draftFilters.value.estado;
  rol.value = draftFilters.value.rol;
  appliedFilters.value = { ...draftFilters.value };
  loadUsuarios(1);
}

function clearAdvancedFilters() {
  search.value = '';
  estado.value = '';
  rol.value = '';
  draftFilters.value = emptyAdvancedFilters();
  appliedFilters.value = emptyAdvancedFilters();
  marcarAplicado();
  loadUsuarios(1);
}

const { aplicarYa, marcarAplicado } = useFiltrosReactivos({
  filtros: draftFilters,
  busqueda: search,
  firma: () => ({
    ...draftFilters.value,
    search: search.value.trim(),
  }),
  aplicar: () => {
    applyAdvancedFilters();
  },
});

const showDeleteModal = ref(false);
const usuarioToDelete = ref(null);

function editUsuario(id) {
  openEditModal(id);
}

const showUsuarioModal = ref(false);
const usuarioModalId = ref(null);

function openCreateModal() {
  usuarioModalId.value = null;
  showUsuarioModal.value = true;
}

function openEditModal(id) {
  usuarioModalId.value = id;
  showUsuarioModal.value = true;
}

async function loadUsuarios(page = 1) {
  try {
    await fetchUsuarios(page, appliedFilters.value);
  } catch (error) {
    showAlert('error', '', error.message || 'No se pudieron cargar los usuarios.');
  }
}

async function onUsuarioSaved(message) {
  showUsuarioModal.value = false;
  showAlert('success', '', message);
  await loadUsuarios(currentPage.value);
}

function onUsuarioCreated() {
  onUsuarioSaved('Usuario creado correctamente.');
}

function onUsuarioUpdated() {
  onUsuarioSaved('Usuario actualizado correctamente.');
}

function openDeleteModal(usuario) {
  usuarioToDelete.value = usuario;
  showDeleteModal.value = true;
}

async function confirmDelete() {
  if (!usuarioToDelete.value) return;

  try {
    const response = await removeUsuario(usuarioToDelete.value.id, usuarioToDelete.value.user?.first_name || 'usuario');
    showAlert('success', '', response.message);

    const page = usuarios.value.length === 1 && currentPage.value > 1
      ? currentPage.value - 1
      : currentPage.value;
    await loadUsuarios(page);
  } catch (error) {
    showAlert('error', '', error.message || 'No se pudo eliminar el usuario.');
  } finally {
    usuarioToDelete.value = null;
    showDeleteModal.value = false;
  }
}


onMounted(() => {
  loadUsuarios();
});
</script>

<template>
  <EntityHeader
    mode="list"
    :icon="Users"
    entity="Usuarios"
    :breadcrumb="[
      { label: 'Inicio', href: '/' },
      { label: 'Configuración' },
      { label: 'Usuarios' },
    ]"
  />

  <div v-if="alert.message" class="px-4 pt-3">
    <Alert
      :type="alert.type"
      :title="alert.title"
      :message="alert.message"
      dismissible
      @dismiss="hideAlert"
    />
  </div>
  <div class="px-4 pb-4 sm:px-6 lg:px-8 mt-4">
    <!-- PANEL DE FILTROS -->
    <div class="bg-neutral-primary-soft shadow-xs rounded-base border border-default mb-4">
      <div class="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between border-b border-default-medium">
        <h2 class="flex items-center gap-2 text-lg font-semibold text-heading">
          <Filter class="w-5 h-5" />
          Búsqueda
        </h2>

        <div class="flex flex-wrap items-center gap-2">
          <FilterActions
            :loading="isLoading"
            :show-search="false"
            @clear="clearAdvancedFilters" />
        </div>
      </div>

      <div class="p-4">
        <div class="flex flex-wrap items-end gap-3 min-w-0">
          <div class="w-full min-w-60 shrink-0 lg:flex-1 lg:max-w-md">
            <label for="usuarios-search" class="block mb-1 text-sm font-medium text-heading">Buscar usuario</label>
            <form class="relative" @submit.prevent="aplicarYa">
              <div class="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                <Search class="w-4 h-4 text-body" />
              </div>
              <input id="usuarios-search" v-model="search" v-sanitize-search type="search" maxlength="100" placeholder="Identificación, nombre, correo o dirección" class="block w-full ps-9 pe-3 py-2 bg-white border border-default-medium text-heading text-sm rounded-base shadow-xs placeholder:text-body focus:ring-brand focus:border-brand dark:bg-gray-800">
            </form>
          </div>

          <div class="w-full sm:w-auto sm:shrink-0">
            <label for="filtro-estado-usuario" class="block mb-1 text-sm font-medium text-heading">Estado</label>
            <select
              id="filtro-estado-usuario"
              v-model="draftFilters.estado"
              class="block w-full sm:w-36 px-3 py-2 bg-white border border-default-medium text-heading text-sm rounded-base shadow-xs focus:ring-brand focus:border-brand dark:bg-gray-800"
            >
              <option value="">Todos</option>
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </select>
          </div>

          <div class="w-full sm:w-auto sm:shrink-0">
            <label for="filtro-rol-usuario" class="block mb-1 text-sm font-medium text-heading">Rol</label>
            <select
              id="filtro-rol-usuario"
              v-model="draftFilters.rol"
              class="block w-full sm:w-56 px-3 py-2 bg-white border border-default-medium text-heading text-sm rounded-base shadow-xs focus:ring-brand focus:border-brand dark:bg-gray-800"
            >
              <option value="">Todos</option>
              <option v-for="item in roles" :key="item.value" :value="item.value">{{ item.label }}</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <!-- PANEL DE LISTADO -->
    <div class="relative overflow-x-auto bg-neutral-primary-soft shadow-xs rounded-base border border-default">
      <div class="flex flex-col gap-3 px-4 py-3 border-b border-default-medium md:flex-row md:items-center md:justify-between">
        <h2 class="text-base font-semibold text-slate-900 dark:text-white">Listado de Usuarios</h2>
        <div class="flex flex-wrap items-center gap-2">
          <EntityActionButtons
            entity="usuarios"
            :show-export-pdf="false"
            :show-export-excel="false"
            @add="openCreateModal" />
        </div>
      </div>
      <EntityTable
        :columns="['Identificación', 'Usuario', 'Correo', 'Rol', 'Talleres', 'Estado', 'Acciones']"
        :items="usuarios"
        :loading="isLoading"
        loading-text="Cargando usuarios..."
        empty-text="No se encontraron usuarios."
        :empty-colspan="8"
        :wrapper-class="'w-full'"
      >
    <template #row="{ item }">
      <tr class="transition-colors hover:bg-brand-50/60 dark:hover:bg-gray-700/40">
        <td class="px-4 py-3 whitespace-nowrap">
          <button type="button" title="Editar usuario" class="inline-flex items-center gap-1.5 font-medium text-primary-600 cursor-pointer hover:text-brand-coral dark:text-primary-400" @click="editUsuario(item.id)">
            <ShieldCheck class="w-4 h-4" />
            {{ item.user?.identificacion || '—' }}
          </button>
        </td>
        <td class="px-4 py-3 text-gray-800 whitespace-nowrap dark:text-white">
          {{ item.user?.first_name }} {{ item.user?.last_name }}
        </td>
        <td class="px-4 py-3 text-gray-800 whitespace-nowrap dark:text-gray-400">
          {{ item.user?.email || 'Sin correo' }}
        </td>
        <td class="px-4 py-3 text-gray-800 whitespace-nowrap dark:text-white">
          {{ item.rol_display || item.rol }}
        </td>
        <td class="px-4 py-3 text-gray-800 dark:text-gray-400">
          <div v-if="!item.talleres || !item.talleres.length" class="text-gray-500 dark:text-gray-400">
            Sin talleres
          </div>
          <div v-else>
            {{ item.talleres.map(t => t.nombre).join(', ') }}
          </div>
        </td>
        <td class="px-4 py-3 whitespace-nowrap">
          <EstadoActivoBadge :activo="item.is_active" />
        </td>
        <td class="px-4 py-3 whitespace-nowrap">
          <div class="flex items-center gap-2">
            <EntityRowActions entity="usuario" :delete-disabled="isDeleting" @edit="editUsuario(item.id)" @delete="openDeleteModal(item)" />
          </div>
        </td>
      </tr>
    </template>
    <template #pagination>
      <Pagination
        :total="total"
        :current-page="currentPage"
        :next-url="nextUrl"
        :previous-url="previousUrl"
        :disabled="isLoading"
        item-word="usuario"
        empty-text="No se encontraron usuarios."
        @page="loadUsuarios"
      />
    </template>
    </EntityTable>
    </div>
  </div>

  <ConfirmModal
    v-model="showDeleteModal"
    entity-name="usuario"
    :item-name="usuarioToDelete?.user?.first_name || ''"
    :is-deleting="isDeleting"
    @confirm="confirmDelete"
    @cancel="usuarioToDelete = null"
  />

  <UsuarioModal
    v-model="showUsuarioModal"
    :usuario-id="usuarioModalId"
    @created="onUsuarioCreated"
    @updated="onUsuarioUpdated"
  />
</template>