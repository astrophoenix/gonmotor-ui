<script setup>
import { onMounted, ref } from 'vue';
import { Wallet, Pen, Trash2, Filter, Calendar, Tag, Wrench } from 'lucide-vue-next';
import { useGastos } from '../composables/useGastos';
import { categoriaLabel, COLOR_CATEGORIA, CATEGORIAS_GASTO } from '../constants/categoriasGasto';
import { formatCurrency } from '../../../shared/utils/format';
import EntityHeader from '../../../shared/components/EntityHeader.vue';
import Alert from '../../../shared/components/Alert.vue';
import EntityTable from '../../../shared/components/EntityTable.vue';
import Pagination from '../../../shared/components/Pagination.vue';
import EntityActionButtons from '../../../shared/components/EntityActionButtons.vue';
import FilterActions from '../../../shared/components/FilterActions.vue';
import ConfirmModal from '../../../shared/components/ConfirmModal.vue';
import TallerSelect from '../../../shared/components/TallerSelect.vue';
import GastosModal from './GastosModal.vue';
import { useAuthStore } from '../../auth/stores/authStore';

const authStore = useAuthStore();

const {
  gastos,
  categoria,
  tallerId,
  fechaDesde,
  fechaHasta,
  isLoading,
  isDeleting,
  total,
  nextUrl,
  previousUrl,
  currentPage,
  fetchGastos,
  removeGasto,
} = useGastos();

const alert = ref({ type: 'default', title: '', message: '' });

function showAlert(type, message, title = '') {
  alert.value = { type, title, message };
}

function hideAlert() {
  alert.value = { type: 'default', title: '', message: '' };
}

const showModal = ref(false);
const gastoModalId = ref(null);

const showDeleteModal = ref(false);
const gastoToDelete = ref(null);

function openCreateModal() {
  gastoModalId.value = null;
  showModal.value = true;
}

function openEditModal(id) {
  gastoModalId.value = id;
  showModal.value = true;
}

function openDeleteModal(gasto) {
  gastoToDelete.value = gasto;
  showDeleteModal.value = true;
}

async function onGastoCreated() {
  showModal.value = false;
  showAlert('success', 'Gasto creado correctamente.');
  await loadGastos();
}

async function onGastoUpdated(gasto) {
  showModal.value = false;
  showAlert('success', 'Gasto actualizado correctamente.');
  const index = gastos.value.findIndex((g) => g.id === gasto.id);
  if (index !== -1) gastos.value.splice(index, 1, { ...gastos.value[index], ...gasto });
}

async function confirmDelete() {
  if (!gastoToDelete.value) return;
  try {
    await removeGasto(gastoToDelete.value.id, categoriaLabel(gastoToDelete.value.categoria));
    showAlert('success', 'Gasto eliminado correctamente.');
    const page = gastos.value.length === 1 && currentPage.value > 1
      ? currentPage.value - 1
      : currentPage.value;
    await fetchGastos(page);
  } catch (error) {
    showAlert('error', error.message || 'No se pudo eliminar el gasto.');
  } finally {
    gastoToDelete.value = null;
    showDeleteModal.value = false;
  }
}

function loadGastos(page = 1) {
  return fetchGastos(page, {
    categoria: categoria.value,
    taller_id: tallerId.value,
    fecha_desde: fechaDesde.value,
    fecha_hasta: fechaHasta.value,
  });
}

function applyFilters() {
  loadGastos(1);
}

function clearFilters() {
  categoria.value = '';
  tallerId.value = null;
  fechaDesde.value = '';
  fechaHasta.value = '';
  loadGastos(1);
}

function formatearFecha(fecha) {
  if (!fecha) return '—';
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return fecha;
  return d.toLocaleDateString('es-EC', { year: 'numeric', month: 'short', day: '2-digit' });
}

onMounted(() => loadGastos());
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <EntityHeader
      mode="list"
      entity="Gastos"
      :icon="Wallet"
      :breadcrumb="[
        { label: 'Inicio', href: '/' },
        { label: 'Gastos' },
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
      <div class="bg-white shadow-sm rounded-lg border border-gray-200 dark:bg-gray-800 dark:border-gray-700 mb-4">
        <div class="flex flex-col gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700 md:flex-row md:items-center md:justify-between">
          <h3 class="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
            <Filter class="w-5 h-5" />
            Filtros
          </h3>
          <div class="flex flex-wrap items-center gap-2">
            <FilterActions
              :loading="isLoading"
              @clear="clearFilters"
              @search="applyFilters"
            />
          </div>
        </div>

        <div class="p-4">
          <div class="flex flex-wrap items-end gap-3 min-w-0">
            <div class="w-full sm:w-auto sm:max-w-[18rem]">
              <label for="filtro-categoria" class="block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">Categoría</label>
              <select
                id="filtro-categoria"
                v-model="categoria"
                class="block w-full px-3 py-2 bg-white border border-gray-300 text-sm rounded-lg focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">Todas las categorías</option>
                <option v-for="cat in CATEGORIAS_GASTO" :key="cat.value" :value="cat.value">{{ cat.label }}</option>
              </select>
            </div>

            <!-- Solo con «Todos los talleres»: con un taller activo el backend ya filtra por él. -->
            <div v-if="authStore.esTodosLosTalleres" class="w-full sm:w-auto sm:max-w-[22rem]">
              <label class="block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">Taller</label>
              <TallerSelect
                v-model="tallerId"
                variante="campo"
                placeholder="Todos los talleres"
                permitirTodos
              />
            </div>

            <div class="w-full sm:w-auto sm:max-w-[16rem]">
              <label for="filtro-fecha-desde" class="block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">Desde</label>
              <div class="relative">
                <Calendar class="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-400" />
                <input
                  id="filtro-fecha-desde"
                  v-model="fechaDesde"
                  type="date"
                  class="block w-full pl-9 pr-3 py-2 bg-white border border-gray-300 text-sm rounded-lg focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
            </div>

            <div class="w-full sm:w-auto sm:max-w-[16rem]">
              <label for="filtro-fecha-hasta" class="block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">Hasta</label>
              <div class="relative">
                <Calendar class="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-400" />
                <input
                  id="filtro-fecha-hasta"
                  v-model="fechaHasta"
                  type="date"
                  class="block w-full pl-9 pr-3 py-2 bg-white border border-gray-300 text-sm rounded-lg focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="relative overflow-x-auto bg-white shadow-sm rounded-lg border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
        <div class="flex flex-col gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700 md:flex-row md:items-center md:justify-between">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Listado de Gastos</h2>
          <div class="flex flex-wrap items-center gap-2">
            <EntityActionButtons
              entity="gastos"
              :show-export-pdf="false"
              :show-export-excel="false"
              @add="openCreateModal"
            />
          </div>
        </div>

        <EntityTable
          :columns="['Taller', 'Fecha', 'Categoría', 'Monto', 'Descripción', 'Acciones']"
          :items="gastos"
          :loading="isLoading"
          loading-text="Cargando gastos..."
          empty-text="No se encontraron gastos."
          :empty-colspan="6"
          :wrapper-class="'w-full'"
        >
          <template #row="{ item }">
            <tr class="border-b border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700">
              <td class="p-4 whitespace-nowrap text-gray-800 dark:text-gray-300">
                <Wrench v-if="!item.taller_nombre" class="w-4 h-4 inline-block mr-1 text-gray-400" />
                {{ item.taller_nombre || 'Sin taller' }}
              </td>
              <td class="p-4 whitespace-nowrap text-gray-800 dark:text-gray-300">{{ formatearFecha(item.fecha) }}</td>
              <td class="p-4 whitespace-nowrap">
                <span
                  :class="['inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', COLOR_CATEGORIA[item.categoria] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200']"
                >
                  <Tag class="w-3 h-3 mr-1" />
                  {{ categoriaLabel(item.categoria) }}
                </span>
              </td>
              <td class="p-4 whitespace-nowrap font-medium text-gray-900 dark:text-white">{{ formatCurrency(item.monto) }}</td>
              <td class="p-4 text-gray-600 dark:text-gray-300 max-w-xs truncate">{{ item.descripcion || '—' }}</td>
              <td class="p-4 whitespace-nowrap">
                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    title="Editar gasto"
                    aria-label="Editar gasto"
                    class="px-1.5 py-1.5 inline-flex items-center p-2 text-primary-600 rounded border border-primary-200 hover:bg-primary-100 dark:text-primary-400 dark:border-primary-500 dark:hover:bg-gray-700"
                    @click="openEditModal(item.id)"
                  >
                    <Pen class="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    title="Eliminar gasto"
                    aria-label="Eliminar gasto"
                    :disabled="isDeleting"
                    class="px-1.5 py-1.5 inline-flex items-center p-2 text-red-600 rounded border border-red-200 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-400 dark:border-red-500 dark:hover:bg-gray-700"
                    @click="openDeleteModal(item)"
                  >
                    <Trash2 class="w-5 h-5" />
                  </button>
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
              item-word="gasto"
              empty-text="No se encontraron gastos."
              @page="fetchGastos"
            />
          </template>
        </EntityTable>
      </div>
    </div>

    <ConfirmModal
      v-model="showDeleteModal"
      entity-name="gasto"
      :icon="Trash2"
      :item-name="gastoToDelete?.descripcion || categoriaLabel(gastoToDelete?.categoria)"
      :is-deleting="isDeleting"
      @confirm="confirmDelete"
      @cancel="gastoToDelete = null"
    />

    <GastosModal
      v-model="showModal"
      :gasto-id="gastoModalId"
      @created="onGastoCreated"
      @updated="onGastoUpdated"
    />
  </div>
</template>
