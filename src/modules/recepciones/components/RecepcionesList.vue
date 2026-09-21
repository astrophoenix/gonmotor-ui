<script setup>
import { onMounted, ref, watch, onUnmounted } from 'vue';
import { ClipboardList, Pencil, Loader2, Trash2, CircleX, CircleCheck, Search} from 'lucide-vue-next';
import { IconReportSearch } from '@tabler/icons-vue';
import { Icon } from '@iconify/vue';
import filePdfIcon from '@iconify-icons/fa6-regular/file-pdf';
import { useRecepciones } from '../composables/useRecepciones';
import { talleresService } from '../../configuracion/services/talleresService';
import { inspeccionesService } from '../../inspecciones/services/inspeccionesService';
import { recepcionesService } from '../services/recepcionesService';
import EntityActionButtons from '../../../shared/components/EntityActionButtons.vue';
import { vSanitizeSearch } from '../../../shared/directives/sanitizeSearch';
import { SEARCH_DEBOUNCE_MS, isSearchable } from '../../../shared/utils/search';
import Alert from '../../../shared/components/Alert.vue';
import ConfirmModal from '../../../shared/components/ConfirmModal.vue';
import EntityTable from '../../../shared/components/EntityTable.vue';
import Pagination from '../../../shared/components/Pagination.vue';

const { recepciones, loading, error, loadRecepciones, currentPage, total, nextUrl, previousUrl } = useRecepciones();

const prefijoRecepcionBySucursal = ref({});
const creandoId = ref(null);
const showDeleteModal = ref(false);
const recepcionToDelete = ref(null);
const isDeleting = ref(false);
const showCreateInspeccionModal = ref(false);
const recepcionParaInspeccion = ref(null);

async function loadPrefijosRecepcion() {
  try {
    const data = await talleresService.listTalleres();
    const list = Array.isArray(data) ? data : data?.results || [];
    const map = {};
    list.forEach((taller) => {
      if (taller.id && taller.prefijo_recepcion) {
        map[taller.id] = taller.prefijo_recepcion;
      }
    });
    prefijoRecepcionBySucursal.value = map;
  } catch (error) {
    prefijoRecepcionBySucursal.value = {};
  }
}

function numeroDisplay(item) {
  if (item.numero_recepcion) return item.numero_recepcion;
  const prefijo = prefijoRecepcionBySucursal.value[item.sucursal] || '';
  return `#${prefijo}${item.id}`;
}

function vehiculoUrl(item) {
  const id = item?.vehiculo?.id;
  return id ? `/crud/vehiculos/ver/?id=${encodeURIComponent(id)}` : null;
}

function clienteUrl(item) {
  const id = item?.cliente?.id;
  return id ? `/crud/clientes/ver/?id=${encodeURIComponent(id)}` : null;
}

const alert = ref({
  type: 'default',
  title: '',
  message: '',
});

const search = ref('');
let searchTimer;

function showAlert(type, title, message) {
  alert.value = { type, title, message };
}

function hideAlert() {
  alert.value = { type: 'default', title: '', message: '' };
}

function formatDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function getEstadoFirmaBadge(recepcion) {
  const estado = recepcion.estado || 'PENDIENTE';
  const map = {
    ACEPTADA: { label: 'Aceptada y Firmada', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
    NO_ACEPTADA: { label: 'No Aceptada / Sin Firma', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
    PENDIENTE: { label: 'Pendiente de Firma', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
  };
  return map[estado] || map.PENDIENTE;
}

function getEstadoBadge(recepcion) {
  if (recepcion.inspecciones?.length > 0) {
    const inspeccion = recepcion.inspecciones[0];
    if (recepcion.cotizaciones_generadas?.length > 0) {
      const cotizacion = recepcion.cotizaciones_generadas[0];
      return {
        label: cotizacion.numero_cotizacion ? `Con cotización ${cotizacion.numero_cotizacion}` : 'Con cotización',
        color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
        href: `/crud/cotizaciones/editar/?id=${encodeURIComponent(cotizacion.id)}`,
      };
    }
    if (recepcion.orden_trabajo) {
      return {
        label: recepcion.orden_trabajo_numero ? `Convertida a OT ${recepcion.orden_trabajo_numero}` : 'Convertida a OT',
        color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
        href: `/crud/ordenes/ver/?id=${encodeURIComponent(recepcion.orden_trabajo)}`,
      };
    }
    return {
      label: inspeccion.numero_inspeccion ? `Con diagnóstico ${inspeccion.numero_inspeccion}` : 'Con diagnóstico',
      color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      href: `/crud/inspecciones/ver/?id=${encodeURIComponent(inspeccion.id)}`,
    };
  }
  return { label: 'Sin diagnóstico', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200' };
}

function handleEditar(id) {
  window.location.assign(`/crud/recepciones/editar/?id=${encodeURIComponent(id)}`);
}

function openDeleteModal(item) {
  recepcionToDelete.value = item;
  showDeleteModal.value = true;
}

async function confirmDelete() {
  if (!recepcionToDelete.value) return;
  isDeleting.value = true;
  hideAlert();
  try {
    await recepcionesService.delete(recepcionToDelete.value.id);
    showDeleteModal.value = false;
    recepcionToDelete.value = null;
    showAlert('success', '', 'Recepción eliminada correctamente.');
    await loadRecepciones(currentPage.value, search.value);
  } catch (err) {
    showDeleteModal.value = false;
    recepcionToDelete.value = null;
    showAlert('error', '', err?.message || 'No se pudo eliminar la recepción.');
  } finally {
    isDeleting.value = false;
  }
}

function openCrearInspeccionModal(item) {
  recepcionParaInspeccion.value = item;
  showCreateInspeccionModal.value = true;
}

async function confirmCrearInspeccion() {
  if (!recepcionParaInspeccion.value) return;
  creandoId.value = recepcionParaInspeccion.value.id;
  hideAlert();
  try {
    await inspeccionesService.crearDesdeRecepcion(recepcionParaInspeccion.value.id);
    showCreateInspeccionModal.value = false;
    recepcionParaInspeccion.value = null;
    showAlert('success', '', 'Inspección generada correctamente.');
    await loadRecepciones(currentPage.value, search.value);
  } catch (err) {
    showCreateInspeccionModal.value = false;
    recepcionParaInspeccion.value = null;
    showAlert('error', '', err?.message || 'No se pudo crear la inspección.');
  } finally {
    creandoId.value = null;
  }
}

function handlePdfError(message) {
  showAlert('error', '', message || 'No se pudo generar el PDF.');
}

function handleExcelError(message) {
  showAlert('error', '', message || 'No se pudo generar el Excel.');
}

function scheduleSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => loadRecepciones(1, search.value), SEARCH_DEBOUNCE_MS);
}

watch(search, () => {
  if (isSearchable(search.value)) scheduleSearch();
});

onMounted(async () => {
  loadPrefijosRecepcion();
  try {
    await loadRecepciones();
  } catch (err) {
    showAlert('error', '', err.message || 'No se pudieron cargar las recepciones.');
  }
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
            <li class="text-gray-400" aria-current="page">/ Recepciones</li>
          </ol>
        </nav>
        <h1 class="text-xl font-semibold text-gray-900 sm:text-2xl dark:text-white">
          <ClipboardList class="w-6 h-6 inline-block text-gray-90 dark:text-gray-400" />
          Recepciones
        </h1>
      </div>

      <Alert
        :type="alert.type"
        :title="alert.title"
        :message="alert.message"
        dismissible
        @dismiss="hideAlert"
      />
    </div>
  </div>

  <div class="px-4 pb-4 sm:px-6 lg:px-8 mt-4">
    <div class="relative overflow-x-auto bg-neutral-primary-soft shadow-xs rounded-base border border-default">
      <div class="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-default-medium">
        <div class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
          <form class="relative" @submit.prevent="loadRecepciones(1, search.value)">
            <label for="recepciones-search" class="sr-only">Buscar recepciones</label>
            <div class="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
              <Search class="w-4 h-4 text-body" />
            </div>
            <input id="recepciones-search" v-model="search" v-sanitize-search type="search" maxlength="100" placeholder="Buscar por placa, cliente u orden" class="block w-full sm:w-64 ps-9 pe-3 py-2 bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base shadow-xs placeholder:text-body focus:ring-brand focus:border-brand" />
          </form>
        </div>
        <div class="flex items-center gap-2">
          <EntityActionButtons
            entity="recepciones"
            @pdfExportError="handlePdfError"
            @excelExportError="handleExcelError"
          />
        </div>
      </div>
      <EntityTable
        :columns="['Nº Recepción', 'Vehículo', 'Cliente', 'Fecha ingreso', 'Grúa', 'Estado', 'Acciones']"
        :items="recepciones"
        :loading="loading"
        loading-text="Cargando recepciones..."
        empty-text="No hay recepciones registradas."
        :empty-colspan="8"
        :wrapper-class="'w-full'"
      >
    <template #row="{ item, index }">
      <tr class="bg-neutral-primary-soft border-b border-default hover:bg-neutral-secondary-medium">
        <td class="p-4 whitespace-nowrap">
          <a
            :href="`/crud/recepciones/ver/?id=${encodeURIComponent(item.id)}`"
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
          >{{ item.vehiculo?.placa || '-' }}</a>
          <span v-else class="font-medium text-gray-800 dark:text-white">{{ item.vehiculo?.placa || '-' }}</span>
          <span class="block text-xs text-gray-500 dark:text-gray-400">
            {{ item.vehiculo?.marca }} {{ item.vehiculo?.modelo }}
          </span>
        </td>
        <td class="p-4 whitespace-nowrap">
          <a
            v-if="clienteUrl(item)"
            :href="clienteUrl(item)"
            class="font-medium text-gray-800 hover:text-primary-600 dark:text-white dark:hover:text-primary-400"
          >{{ item.cliente?.nombre || '-' }}</a>
          <span v-else class="font-medium text-gray-800 dark:text-white">{{ item.cliente?.nombre || '-' }}</span>
        </td>
        <td class="p-4 text-gray-800 whitespace-nowrap dark:text-white">{{ formatDate(item.created_at) }}</td>
        <td class="p-4 text-gray-800 whitespace-nowrap dark:text-white">
          <CircleX v-if="!item.ingreso_en_grua" class="w-5 h-5 text-gray-600 dark:text-gray-400" title="No ingresó en grúa" />
          <CircleCheck v-else class="w-5 h-5 text-green-600 dark:text-green-400" title="Ingresó en grúa" />
        </td>
        <td class="p-4 text-gray-800 whitespace-nowrap dark:text-white">
          <span class="inline-block px-2 py-1 rounded-full text-xs font-medium mr-1" :class="getEstadoFirmaBadge(item).color">
            {{ getEstadoFirmaBadge(item).label }}
          </span>
          <template v-if="item.estado === 'ACEPTADA'">
            <a
              v-if="getEstadoBadge(item).href"
              :href="getEstadoBadge(item).href"
              class="inline-block px-2 py-1 rounded-full text-xs font-medium"
              :class="getEstadoBadge(item).color"
            >{{ getEstadoBadge(item).label }}</a>
            <span v-else class="inline-block px-2 py-1 rounded-full text-xs font-medium" :class="getEstadoBadge(item).color">
              {{ getEstadoBadge(item).label }}
            </span>
          </template>
        </td>
        <td class="p-4 whitespace-nowrap">
          <div class="flex items-center gap-2">
            <button v-if="item.estado === 'PENDIENTE'" type="button" title="Editar recepción" aria-label="Editar recepción" class="px-1.5 py-1.5 inline-flex items-center p-2 text-primary-600 rounded border border-primary-200 hover:bg-primary-100 dark:text-primary-400 dark:border-primary-500 dark:hover:bg-gray-700" @click="handleEditar(item.id)">
              <Pencil class="w-5 h-5" />
            </button>
            <button v-if="item.estado === 'PENDIENTE'" type="button" title="Eliminar recepción" aria-label="Eliminar recepción" :disabled="isDeleting" class="px-1.5 py-1.5 inline-flex items-center p-2 text-red-600 rounded border border-red-200 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-400 dark:border-red-500 dark:hover:bg-gray-700" @click="openDeleteModal(item)">
              <Trash2 class="w-5 h-5" />
            </button>
            <button v-if="item.estado === 'ACEPTADA' && !item.inspecciones?.length" type="button" title="Crear inspección" aria-label="Crear inspección" :disabled="creandoId === item.id" class="px-1.5 py-1.5 inline-flex items-center p-2 text-gray-900 rounded border border-gray-300 hover:bg-primary-100 hover:text-primary-600 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-100 dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:text-primary-400" @click="openCrearInspeccionModal(item)">
              <Loader2 v-if="creandoId === item.id" class="w-5 h-5 animate-spin" />
              <IconReportSearch class="w-5.5 h-5.5" />
            </button>
            <button type="button" title="Descargar PDF" aria-label="Descargar PDF" class="px-1.5 py-1.5 inline-flex items-center p-2 text-gray-900 rounded border border-gray-300 hover:bg-primary-100 hover:text-primary-600 dark:text-gray-100 dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:text-primary-400">
              <Icon :icon="filePdfIcon" class="w-5 h-5" />
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
        :disabled="loading"
        item-word="recepción"
        item-plural="recepciones"
        empty-text="No hay recepciones registradas."
        @page="(page) => loadRecepciones(page, search.value)"
      />
    </template>
    </EntityTable>
    </div>
  </div>

  <ConfirmModal
    v-model="showDeleteModal"
    entity-name="recepción"
    :icon="Trash2"
    :item-name="recepcionToDelete ? numeroDisplay(recepcionToDelete) : ''"
    :is-deleting="isDeleting"
    @confirm="confirmDelete"
    @cancel="recepcionToDelete = null"
  />

  <ConfirmModal
    v-model="showCreateInspeccionModal"
    title="Crear inspección"
    :icon="IconReportSearch"
    :message="recepcionParaInspeccion ? `Se generará una inspección en estado pendiente a partir de la recepción ${numeroDisplay(recepcionParaInspeccion)}. ¿Deseas continuar?` : ''"
    variant="primary"
    confirm-text="Sí, crear"
    confirming-text="Creando inspección..."
    :is-deleting="creandoId !== null"
    @confirm="confirmCrearInspeccion"
    @cancel="recepcionParaInspeccion = null"
  />
</template>
