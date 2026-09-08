<script setup>
import { onMounted, ref, watch, onUnmounted } from 'vue';
import { ClipboardList, Pencil, FileText } from 'lucide-vue-next';
import { useRecepciones } from '../composables/useRecepciones';
import { talleresService } from '../../configuracion/services/talleresService';
import EntityActionButtons from '../../../shared/components/EntityActionButtons.vue';
import Alert from '../../../shared/components/Alert.vue';
import EntityTable from '../../../shared/components/EntityTable.vue';

const { recepciones, loading, error, loadRecepciones, currentPage, nextUrl, previousUrl, rangeLabel } = useRecepciones();

const prefijoRecepcionBySucursal = ref({});

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
      href: `/crud/inspecciones/editar/?id=${encodeURIComponent(inspeccion.id)}`,
    };
  }
  return { label: 'Sin diagnóstico', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200' };
}

function handleEditar(id) {
  window.location.assign(`/crud/recepciones/editar/?id=${encodeURIComponent(id)}`);
}

function handleCrearDiagnostico(id) {
  window.location.assign(`/crud/inspecciones/nuevo/?recepcion=${id}`);
}

function handleVerDiagnostico(recepcion) {
  if (recepcion.inspecciones?.length > 0) {
    const diagnosticoId = recepcion.inspecciones[0].id;
    window.location.assign(`/crud/inspecciones/editar/?id=${diagnosticoId}`);
  } else {
    handleCrearDiagnostico(recepcion.id);
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
  searchTimer = setTimeout(() => loadRecepciones(1, search.value), 300);
}

watch(search, scheduleSearch);

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

      <div class="sm:flex">
        <div class="items-center hidden mb-3 sm:flex sm:divide-x sm:divide-gray-100 sm:mb-0 dark:divide-gray-700">
          <form class="flex items-center mb-3 sm:mb-0 lg:pr-3" @submit.prevent="loadRecepciones(1, search.value)">
            <label for="recepciones-search" class="sr-only">Buscar recepciones</label>
            <input id="recepciones-search" v-model="search" type="search" placeholder="Buscar por placa, cliente u orden" class="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full lg:w-64 xl:w-96 p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white" />
          </form>
        </div>
        <div class="flex items-center ml-auto space-x-2 sm:space-x-3">
          <EntityActionButtons
            entity="recepciones"
            @pdfExportError="handlePdfError"
            @excelExportError="handleExcelError"
          />
        </div>
      </div>
    </div>
  </div>

  <EntityTable
    :columns="['Nº Recepción', 'Vehículo', 'Cliente', 'Fecha ingreso', 'Grúa', 'Estado', 'Acciones']"
    :items="recepciones"
    :loading="loading"
    loading-text="Cargando recepciones..."
    empty-text="No hay recepciones registradas."
    :empty-colspan="8"
    :show-pagination="true"
    :previous-url="previousUrl"
    :next-url="nextUrl"
    :pagination-disabled="loading"
    :range-label="rangeLabel"
    @page-change="(delta) => loadRecepciones(currentPage + delta, search.value)"
  >
    <template #row="{ item, index }">
      <tr class="hover:bg-gray-100 dark:hover:bg-gray-700">
        <td class="p-4 whitespace-nowrap">
          <a
            :href="`/crud/recepciones/ver/?id=${encodeURIComponent(item.id)}`"
            class="font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            {{ numeroDisplay(item) }}
          </a>
        </td>
        <td class="p-4 text-gray-800 whitespace-nowrap dark:text-white">
          <span class="font-medium">{{ item.vehiculo?.placa || '-' }}</span>
          <span class="block text-xs text-gray-500 dark:text-gray-400">
            {{ item.vehiculo?.marca }} {{ item.vehiculo?.modelo }}
          </span>
        </td>
        <td class="p-4 text-gray-800 whitespace-nowrap dark:text-white">{{ item.cliente?.nombre || '-' }}</td>
        <td class="p-4 text-gray-800 whitespace-nowrap dark:text-white">{{ formatDate(item.created_at) }}</td>
        <td class="p-4 text-gray-800 whitespace-nowrap dark:text-white">{{ item.ingreso_en_grua ? 'Sí' : 'No' }}</td>
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
            <button v-if="item.estado === 'PENDIENTE'" type="button" title="Editar recepción" aria-label="Editar recepción" class="inline-flex items-center p-2 text-primary-600 rounded-lg hover:bg-primary-100 dark:text-primary-400 dark:hover:bg-gray-700" @click="handleEditar(item.id)">
              <Pencil class="w-5 h-5" />
            </button>
            <button v-if="item.estado === 'ACEPTADA'" type="button" :title="item.inspecciones?.length > 0 ? 'Ver Diagnóstico' : 'Crear Diagnóstico'" :aria-label="item.inspecciones?.length > 0 ? 'Ver Diagnóstico' : 'Crear Diagnóstico'" class="inline-flex items-center p-2 text-purple-600 rounded-lg hover:bg-purple-100 dark:text-purple-400 dark:hover:bg-gray-700" @click="handleVerDiagnostico(item)">
              <FileText class="w-5 h-5" />
            </button>
          </div>
        </td>
      </tr>
    </template>
  </EntityTable>
</template>
