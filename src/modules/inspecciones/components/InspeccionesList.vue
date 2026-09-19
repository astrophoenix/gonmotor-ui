<script setup>
import { onMounted, ref, watch, onUnmounted } from 'vue';
import { FileSearchCorner, Pencil, Trash2 } from 'lucide-vue-next';
import { IconLockOpen2 } from '@tabler/icons-vue';
import { QuoteIcon } from 'gonmotor-icons';
import { Icon } from '@iconify/vue';
import filePdfIcon from '@iconify-icons/fa6-regular/file-pdf';
import { useInspecciones } from '../composables/useInspecciones';
import { inspeccionesService } from '../services/inspeccionesService';
import { talleresService } from '../../configuracion/services/talleresService';
import EntityActionButtons from '../../../shared/components/EntityActionButtons.vue';
import ConfirmModal from '../../../shared/components/ConfirmModal.vue';
import Alert from '../../../shared/components/Alert.vue';
import EntityTable from '../../../shared/components/EntityTable.vue';

const {
  inspecciones,
  loading,
  isDeleting,
  search,
  currentPage,
  nextUrl,
  previousUrl,
  rangeLabel,
  loadInspecciones,
  removeInspeccion,
} = useInspecciones();

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

const prefijoInspeccionBySucursal = ref({});

async function loadPrefijosInspeccion() {
  try {
    const data = await talleresService.listTalleres();
    const list = Array.isArray(data) ? data : data?.results || [];
    const map = {};
    list.forEach((taller) => {
      if (taller.id && taller.prefijo_inspeccion) {
        map[taller.id] = taller.prefijo_inspeccion;
      }
    });
    prefijoInspeccionBySucursal.value = map;
  } catch (error) {
    prefijoInspeccionBySucursal.value = {};
  }
}

function numeroDisplay(item) {
  if (item.numero_inspeccion) return item.numero_inspeccion;
  const prefijo = prefijoInspeccionBySucursal.value[item.sucursal] || '';
  return `#${prefijo}${item.id}`;
}

function vehiculoUrl(item) {
  const id = item?.vehiculo?.id || item?.recepcion?.vehiculo?.id;
  return id ? `/crud/vehiculos/ver/?id=${encodeURIComponent(id)}` : null;
}

function clienteUrl(item) {
  const id = item?.cliente?.id || item?.recepcion?.cliente?.id;
  return id ? `/crud/clientes/ver/?id=${encodeURIComponent(id)}` : null;
}

const showDeleteModal = ref(false);
const inspeccionToDelete = ref(null);

const showReabrirModal = ref(false);
const inspeccionToReabrir = ref(null);
const isReopening = ref(false);
let searchTimer;

function handleEditar(inspeccion) {
  window.location.assign(`/crud/inspecciones/editar/?id=${encodeURIComponent(inspeccion.id)}`);
}

function solicitarReabrir(inspeccion) {
  inspeccionToReabrir.value = inspeccion;
  showReabrirModal.value = true;
}

async function confirmarReabrir() {
  if (!inspeccionToReabrir.value || isReopening.value) return;
  isReopening.value = true;
  const numero = numeroDisplay(inspeccionToReabrir.value);
  try {
    await inspeccionesService.update(inspeccionToReabrir.value.id, { estado: 'EN_PROCESO' });
    inspeccionToReabrir.value = null;
    showReabrirModal.value = false;
    showAlert('success', '', `Inspección ${numero} reabierta. Ahora está en proceso.`);
    await loadInspecciones(currentPage.value);
  } catch (error) {
    showAlert('error', '', error.message || 'No se pudo reabrir la inspección.');
    showReabrirModal.value = false;
  } finally {
    isReopening.value = false;
  }
}

function handleCrearCotizacion(id) {
  window.location.assign(`/crud/cotizaciones/nuevo/?inspeccion=${encodeURIComponent(id)}`);
}

function handlePdfError(message) {
  showAlert('error', 'Error al exportar PDF', message);
}

function handleExcelError(message) {
  showAlert('error', 'Error al exportar Excel', message);
}

function openDeleteModal(inspeccion) {
  inspeccionToDelete.value = inspeccion;
  showDeleteModal.value = true;
}

async function confirmDelete() {
  if (!inspeccionToDelete.value) return;

  try {
    await removeInspeccion(inspeccionToDelete.value.id);
    showAlert('success', '', 'Inspección eliminada correctamente.');

    const page = inspecciones.value.length === 1 && currentPage.value > 1
      ? currentPage.value - 1
      : currentPage.value;
    await loadInspecciones(page);
  } catch (error) {
    showAlert('error', '', error.message || 'No se pudo eliminar la inspección.');
  } finally {
    inspeccionToDelete.value = null;
    showDeleteModal.value = false;
  }
}

function formatDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function tipoBadge(tipo) {
  const map = {
    PREVENTIVO: { label: 'Preventivo', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
    CORRECTIVO: { label: 'Correctivo', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' },
    DIAGNOSTICO: { label: 'Diagnóstico / Escaneo', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300' },
    ESTETICA: { label: 'Estética', color: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300' },
    GARANTIA: { label: 'Garantía', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300' },
  };
  return map[tipo] || { label: tipo || '-', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' };
}

function estadoBadge(estado) {
  const map = {
    PENDIENTE: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' },
    EN_PROCESO: { label: 'En proceso', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
    FINALIZADA: { label: 'Finalizada', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
  };
  return map[estado] || { label: estado || '-', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' };
}

function scheduleSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => loadInspecciones(1), 300);
}

watch(search, scheduleSearch);
onMounted(() => {
  loadPrefijosInspeccion();
  loadInspecciones();
});

onUnmounted(() => {
  clearTimeout(searchTimer);
});
</script>

<template>
  <div class="p-4 bg-white block sm:flex items-center justify-between border-b border-gray-200 lg:mt-1.5 dark:bg-gray-800 dark:border-gray-700">
    <div class="w-full mb-1">
      <div class="mb-4">
        <nav class="flex mb-5" aria-label="Breadcrumb">
          <ol class="inline-flex items-center space-x-1 text-sm font-medium md:space-x-2">
            <li class="inline-flex items-center">
              <a href="/" class="inline-flex items-center text-gray-700 hover:text-primary-600 dark:text-gray-300 dark:hover:text-white">Inicio</a>
            </li>
            <li class="text-gray-400" aria-current="page">/ Inspecciones</li>
          </ol>
        </nav>
        <h1 class="text-xl font-semibold text-gray-900 sm:text-2xl dark:text-white">
          <FileSearchCorner class="w-6 h-6 inline-block text-gray-900 dark:text-gray-400" />
          Inspecciones
        </h1>
      </div>
      <Alert
        :type="alert.type"
        :title="alert.title"
        :message="alert.message"
        dismissible
        @dismiss="hideAlert"
      />
      <div class="sm:flex">
        <div class="items-center hidden mb-3 sm:flex sm:divide-x sm:divide-gray-100 sm:mb-0 dark:divide-gray-700">
          <form class="flex items-center mb-3 sm:mb-0 lg:pr-3" @submit.prevent="loadInspecciones(1)">
            <label for="inspecciones-search" class="sr-only">Buscar inspecciones</label>
            <input id="inspecciones-search" v-model="search" type="search" placeholder="Buscar por placa o cliente" class="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full lg:w-64 xl:w-96 p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white">
          </form>
        </div>
        <div class="flex items-center ml-auto space-x-2 sm:space-x-3">
          <EntityActionButtons
            entity="inspecciones"
            @pdfExportError="handlePdfError"
            @excelExportError="handleExcelError"
          />
        </div>
      </div>
    </div>
  </div>

  <EntityTable
    :columns="['#', 'Nº Inspección', 'Vehículo', 'Cliente', 'Tipo', 'Estado', 'Fecha', 'Acciones']"
    :items="inspecciones"
    :loading="loading"
    loading-text="Cargando inspecciones..."
    empty-text="No se encontraron inspecciones."
    :empty-colspan="8"
    :show-pagination="true"
    :previous-url="previousUrl"
    :next-url="nextUrl"
    :pagination-disabled="loading"
    :range-label="rangeLabel"
    @page-change="(delta) => loadInspecciones(currentPage + delta)"
  >
    <template #row="{ item, index }">
      <tr class="hover:bg-gray-100 dark:hover:bg-gray-700">
        <td class="p-4 text-gray-800 whitespace-nowrap dark:text-white">{{ index + 1 }}</td>
        <td class="p-4 whitespace-nowrap">
          <a
            :href="`/crud/inspecciones/ver/?id=${encodeURIComponent(item.id)}`"
            class="font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
          >
            {{ numeroDisplay(item) }}
          </a>
        </td>
        <td class="p-4 whitespace-nowrap">
          <a
            v-if="vehiculoUrl(item)"
            :href="vehiculoUrl(item)"
            class="font-medium text-gray-800 hover:text-primary-600 dark:text-white dark:hover:text-primary-400"
          >{{ item.recepcion?.placa || '-' }}</a>
          <span v-else class="font-medium text-gray-800 dark:text-white">{{ item.recepcion?.placa || '-' }}</span>
          <span class="block text-xs text-gray-500 dark:text-gray-400">
            {{ item.recepcion?.marca || '' }} {{ item.recepcion?.modelo || '' }}
          </span>
        </td>
        <td class="p-4 whitespace-nowrap">
          <a
            v-if="clienteUrl(item)"
            :href="clienteUrl(item)"
            class="font-medium text-gray-800 hover:text-primary-600 dark:text-white dark:hover:text-primary-400"
          >{{ item.recepcion?.cliente_nombre || '-' }}</a>
          <span v-else class="font-medium text-gray-800 dark:text-white">{{ item.recepcion?.cliente_nombre || '-' }}</span>
        </td>
        <td class="p-4 whitespace-nowrap">
          <span :class="['px-2 py-1 rounded-full text-xs font-medium', tipoBadge(item.tipo_inspeccion).color]">
            {{ tipoBadge(item.tipo_inspeccion).label }}
          </span>
        </td>
        <td class="p-4 whitespace-nowrap">
          <span :class="['px-2 py-1 rounded-full text-xs font-medium', estadoBadge(item.estado).color]">
            {{ estadoBadge(item.estado).label }}
          </span>
        </td>
        <td class="p-4 text-gray-800 whitespace-nowrap dark:text-white">{{ formatDate(item.created_at) }}</td>
        <td class="p-4 whitespace-nowrap">
          <div class="flex items-center gap-2">
            <button v-if="item.estado !== 'FINALIZADA'" type="button" title="Editar inspección" aria-label="Editar inspección" class="px-1.5 py-1.5 inline-flex items-center p-2 text-primary-600 rounded-lg border border-primary-200 hover:bg-primary-100 dark:text-primary-400 dark:border-primary-500 dark:hover:bg-gray-700" @click="handleEditar(item)">
              <Pencil class="w-5 h-5" />
            </button>
            <button v-if="item.estado === 'FINALIZADA'" type="button" title="Reabrir inspección" aria-label="Reabrir inspección" :disabled="isReopening" class="px-1.5 py-1.5 inline-flex items-center p-2 text-primary-600 rounded-lg border border-primary-200 hover:bg-primary-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-primary-400 dark:border-primary-500 dark:hover:bg-gray-700" @click="solicitarReabrir(item)">
              <IconLockOpen2 class="w-5 h-5" />
            </button>
            <button v-if="item.estado === 'PENDIENTE'" type="button" title="Crear cotización" aria-label="Crear cotización" class="px-1.5 py-1.5 inline-flex items-center p-2 text-gray-900 rounded-lg border border-gray-300 hover:bg-primary-100 hover:text-primary-600 dark:text-gray-100 dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:text-primary-400" @click="handleCrearCotizacion(item.id)">
              <QuoteIcon class="w-5 h-5" />
            </button>


            <button type="button" title="Eliminar inspección" aria-label="Eliminar inspección" :disabled="isDeleting" class="px-1.5 py-1.5 inline-flex items-center p-2 text-red-600 rounded-lg border border-red-200 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-400 dark:border-red-500 dark:hover:bg-gray-700" @click="openDeleteModal(item)">
              <Trash2 class="w-5 h-5" />
            </button>
            <button type="button" title="Descargar PDF" aria-label="Descargar PDF" class="px-1.5 py-1.5 inline-flex items-center p-2 text-gray-900 rounded-lg border border-gray-300 hover:bg-primary-100 hover:text-primary-600 dark:text-gray-100 dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:text-primary-400">
              <Icon :icon="filePdfIcon" class="w-5 h-5" />
            </button>
          </div>
        </td>
      </tr>
    </template>
  </EntityTable>

  <ConfirmModal
    v-model="showDeleteModal"
    entity-name="inspección"
    :item-name="`#${inspeccionToDelete?.id || ''}`"
    :is-deleting="isDeleting"
    @confirm="confirmDelete"
    @cancel="inspeccionToDelete = null"
  />

  <ConfirmModal
    v-model="showReabrirModal"
    title="Reabrir inspección"
    :message="'Se reabrirá la inspección para poder modificar el diagnóstico y volver a generar la cotización. El cliente deberá aceptar nuevamente la cotización antes de modificar la orden de trabajo. ¿Deseas continuar?'"
    :icon="IconLockOpen2"
    icon-class="text-primary-600 dark:text-primary-400"
    confirm-text="Sí, reabrir"
    confirming-text="Reabriendo..."
    variant="primary"
    :is-deleting="isReopening"
    @confirm="confirmarReabrir"
    @cancel="showReabrirModal = false"
  />
</template>
