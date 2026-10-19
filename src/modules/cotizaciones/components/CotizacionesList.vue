<script setup>
import { onMounted, ref } from 'vue';
import { Search, Filter, CalendarDays, Car, Gauge, IdCard, Phone, CalendarPlus, Send, CheckCircle2, Receipt, Mail } from 'lucide-vue-next';
import { IconBrandWhatsapp } from '@tabler/icons-vue';
import { Icon } from '@iconify/vue';
import filePdfIcon from '@iconify-icons/fa6-regular/file-pdf';
import { useCotizaciones } from '../composables/useCotizaciones';
import { cotizacionesService } from '../services/cotizacionesService';
import { correoCotizacionHref, whatsappCotizacionHref } from '../utils/envioCotizacion';
import { useAuthStore } from '../../auth/stores/authStore';
import { talleresService } from '../../configuracion/services/talleresService';
import FilterActions from '../../../shared/components/FilterActions.vue';
import { vSanitizeSearch } from '../../../shared/directives/sanitizeSearch';
import { useFiltrosReactivos } from '../../../shared/composables/useFiltrosReactivos';
import { estadoADisplay } from '../../../shared/utils/estadoFlujo';
import { ESTADOS_COTIZACION_FILTRABLE } from '../constants/estadosCotizacion';
import EstadoCotizacionBadge from './EstadoCotizacionBadge.vue';
import ConfirmModal from '../../../shared/components/ConfirmModal.vue';
import Alert from '../../../shared/components/Alert.vue';
import EntityHeader from '../../../shared/components/EntityHeader.vue';
import EntityTable from '../../../shared/components/EntityTable.vue';
import EntityRowActions from '../../../shared/components/EntityRowActions.vue';
import Pagination from '../../../shared/components/Pagination.vue';
import RelacionesFlujo from '../../../shared/components/RelacionesFlujo.vue';
import { relacionesDeCotizacion } from '../../../shared/utils/relacionesFlujo';
import EntityActionButtons from '../../../shared/components/EntityActionButtons.vue';
import EntityActionsMenu from '../../../shared/components/EntityActionsMenu.vue';
import { referenciaCorta } from '../../../shared/utils/format';

const {
  cotizaciones,
  loading,
  isDeleting,
  currentPage,
  total,
  nextUrl,
  previousUrl,
  loadCotizaciones,
  removeCotizacion,
} = useCotizaciones();

const authStore = useAuthStore();

const alert = ref({ type: 'default', title: '', message: '' });

function showAlert(type, title, message) {
  alert.value = { type, title, message };
}

function hideAlert() {
  alert.value = { type: 'default', title: '', message: '' };
}

const showDeleteModal = ref(false);
const cotizacionToDelete = ref(null);

const talleres = ref([]);

async function loadTalleres() {
  try {
    const data = await talleresService.listTalleres();
    talleres.value = Array.isArray(data) ? data : (data?.results || []);
  } catch (error) {
    talleres.value = [];
  }
}

function tallerLabel(taller) {
  return [taller.nombre, taller.ciudad].filter(Boolean).join(' · ') || `Taller ${taller.id}`;
}

// --- PANEL DE FILTROS (se aplican al cambiar: useFiltrosReactivos) ---
const search = ref('');

const emptyAdvancedFilters = () => ({
  estado: '',
  sucursal: '',
  fechaDesde: '',
  fechaHasta: '',
});

const draftFilters = ref(emptyAdvancedFilters());
const appliedFilters = ref({ ...draftFilters.value });

// Flowbite escribe directamente en input.value (no emite input/change), por eso
// estos campos se leen del DOM en vez de usar v-model.
const fechaDesdeInput = ref(null);
const fechaHastaInput = ref(null);

function fechaInputAIso(elemento) {
  const valor = (elemento?.value || '').trim();
  if (!valor) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) return valor;
  const match = valor.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (!match) return '';
  const [, dia, mes, anio] = match;
  return `${anio}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
}

function limpiarCamposFecha() {
  [fechaDesdeInput, fechaHastaInput].forEach((campo) => {
    const elemento = campo.value;
    if (!elemento) return;
    elemento.value = '';
    if (typeof elemento.datepicker?.clear === 'function') elemento.datepicker.clear();
  });
}

function buildQuery() {
  return {
    search: search.value.trim(),
    estado: appliedFilters.value.estado,
    sucursal: appliedFilters.value.sucursal,
    fecha_desde: appliedFilters.value.fechaDesde,
    fecha_hasta: appliedFilters.value.fechaHasta,
  };
}

async function reloadList(page = 1) {
  try {
    await loadCotizaciones(page, buildQuery());
  } catch (err) {
    showAlert('error', '', err?.message || 'No se pudieron cargar las cotizaciones.');
  }
}

function applyAdvancedFilters() {
  appliedFilters.value = {
    ...draftFilters.value,
    fechaDesde: fechaInputAIso(fechaDesdeInput.value),
    fechaHasta: fechaInputAIso(fechaHastaInput.value),
  };
  reloadList(1);
}

function clearAdvancedFilters() {
  search.value = '';
  draftFilters.value = emptyAdvancedFilters();
  appliedFilters.value = emptyAdvancedFilters();
  limpiarCamposFecha();
  marcarAplicado();
  reloadList(1);
}

const { aplicarYa, marcarAplicado } = useFiltrosReactivos({
  filtros: draftFilters,
  busqueda: search,
  camposFecha: [fechaDesdeInput, fechaHastaInput],
  firma: () => ({
    ...draftFilters.value,
    fechaDesde: fechaInputAIso(fechaDesdeInput.value),
    fechaHasta: fechaInputAIso(fechaHastaInput.value),
    search: search.value.trim(),
  }),
  aplicar: () => {
    applyAdvancedFilters();
  },
});

function handleEditar(id) {
  window.location.assign(`/crud/cotizaciones/editar/?id=${encodeURIComponent(id)}`);
}

function openDeleteModal(cotizacion) {
  cotizacionToDelete.value = cotizacion;
  showDeleteModal.value = true;
}

async function confirmDelete() {
  if (!cotizacionToDelete.value) return;

  try {
    await removeCotizacion(cotizacionToDelete.value.id);
    showAlert('success', '', 'Cotización eliminada correctamente.');

    const page = cotizaciones.value.length === 1 && currentPage.value > 1
      ? currentPage.value - 1
      : currentPage.value;
    await reloadList(page);
  } catch (error) {
    showAlert('error', '', error.message || 'No se pudo eliminar la cotización.');
  } finally {
    cotizacionToDelete.value = null;
    showDeleteModal.value = false;
  }
}

function formatMoney(value) {
  const numero = Number(value || 0);
  return numero.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function kmVehiculoDisplay(item) {
  const km = item.vehiculo_kilometraje;
  if (km === null || km === undefined || km === '') return 'Sin km registrado';
  const numero = Number(km);
  if (Number.isNaN(numero)) return 'Sin km registrado';
  return `${numero.toLocaleString('es-EC')} km`;
}

function vehiculoUrl(item) {
  return item?.vehiculo ? `/crud/vehiculos/ver/?id=${encodeURIComponent(item.vehiculo)}` : null;
}

function clienteUrl(item) {
  return item?.cliente ? `/crud/clientes/ver/?id=${encodeURIComponent(item.cliente)}` : null;
}

function formatoFechaHora(valor) {
  if (!valor) return null;
  const date = new Date(valor);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString('es-EC', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function filasFechasCotizacion(item) {
  return [
    { key: 'creada', label: 'Creada', icon: CalendarPlus, valor: formatoFechaHora(item.created_at) },
    { key: 'enviada', label: 'Enviada', icon: Send, valor: formatoFechaHora(item.fecha_envio) },
    { key: 'aceptada', label: 'Aceptada', icon: CheckCircle2, valor: formatoFechaHora(item.fecha_aceptacion) },
  ];
}

function canalesEnvio(item) {
  return [
    { key: 'whatsapp', label: 'WhatsApp', icon: IconBrandWhatsapp, iconClass: 'text-green-600 dark:text-green-400', href: whatsappCotizacionHref(item), falta: 'El cliente no tiene teléfono registrado' },
    { key: 'correo', label: 'Correo electrónico', icon: Mail, iconClass: 'text-brand-700 dark:text-brand-200', href: correoCotizacionHref(item), falta: 'El cliente no tiene correo registrado' },
  ];
}

// Igual que en el detalle: la ventana se abre antes del await (evita el bloqueo
// de popups) y una cotización pendiente queda marcada como enviada.
async function enviarPor(item, canal, cerrar) {
  cerrar();
  if (!canal.href) return;
  window.open(canal.href, '_blank', 'noopener');
  if (item.estado !== 'PENDIENTE') return;
  try {
    await cotizacionesService.update(item.id, { estado: 'ENVIADA' });
    showAlert('success', '', `Cotización ${item.numero_cotizacion} enviada al cliente por ${canal.label}.`);
    await reloadList(currentPage.value);
  } catch (error) {
    showAlert('error', '', error.message || 'No se pudo marcar la cotización como enviada.');
  }
}

function handlePdfError(message) {
  showAlert('error', '', message || 'No se pudo generar el PDF.');
}

function handleExcelError(message) {
  showAlert('error', '', message || 'No se pudo generar el Excel.');
}


onMounted(() => {
  loadTalleres();
  reloadList();
});
</script>

<template>
  <EntityHeader
    mode="list"
    :icon="Receipt"
    entity="Cotizaciones"
    :breadcrumb="[
      { label: 'Inicio', href: '/' },
      { label: 'Cotizaciones' },
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
      <div class="flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between border-b border-default-medium">
        <h2 class="flex items-center gap-2 text-md font-semibold text-heading">
          <Filter class="w-5 h-5" />
          Búsqueda
        </h2>

        <div class="flex flex-wrap items-center gap-2">
          <FilterActions
            :loading="loading"
            :show-search="false"
            @clear="clearAdvancedFilters" />
        </div>
      </div>

      <div class="p-4">
        <div class="flex flex-wrap items-end gap-3 min-w-0">
          <div class="w-full min-w-60 shrink-0 lg:flex-1 lg:max-w-2xl">
            <label for="cotizaciones-search" class="block mb-1 text-sm font-medium text-heading">
              Buscar cotización
            </label>
            <form class="relative" @submit.prevent="aplicarYa">
              <div class="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                <Search class="w-4 h-4 text-body" />
              </div>
              <input id="cotizaciones-search" v-model="search" v-sanitize-search type="search" maxlength="100" placeholder="N.º cotización, placa, marca o cliente" class="block w-full ps-9 pe-3 py-2 bg-white border border-default-medium text-heading text-sm rounded shadow-xs placeholder:text-body focus:ring-brand focus:border-brand dark:bg-gray-800">
            </form>
          </div>

          <div class="w-full sm:w-auto sm:shrink-0">
            <label for="filtro-estado" class="block mb-1 text-sm font-medium text-heading">Estado</label>
            <select
              id="filtro-estado"
              v-model="draftFilters.estado"
              class="block w-full sm:w-40 px-3 py-2 bg-white border border-default-medium text-heading text-sm rounded shadow-xs focus:ring-brand focus:border-brand dark:bg-gray-800">
              <option value="">Todos</option>
              <option v-for="item in ESTADOS_COTIZACION_FILTRABLE" :key="item" :value="item">{{ estadoADisplay('cotizacion', item) }}</option>
            </select>
          </div>

          <div v-if="authStore.esTodosLosTalleres" class="w-full sm:w-auto sm:shrink-0">
            <label for="filtro-taller" class="block mb-1 text-sm font-medium text-heading">Taller</label>
            <select
              id="filtro-taller"
              v-model="draftFilters.sucursal"
              class="block w-full sm:w-48 px-3 py-2 bg-white border border-default-medium text-heading text-sm rounded shadow-xs focus:ring-brand focus:border-brand dark:bg-gray-800">
              <option value="">Todos los talleres</option>
              <option v-for="taller in talleres" :key="taller.id" :value="taller.id">{{ tallerLabel(taller) }}</option>
            </select>
          </div>

          <div class="w-full sm:w-40 sm:shrink-0">
            <label for="filtro-fecha-desde" class="block mb-1 text-sm font-medium text-heading">Desde</label>
            <div class="relative">
              <div class="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                <CalendarDays class="w-4 h-4 text-body" aria-hidden="true" />
              </div>
              <input
                id="filtro-fecha-desde"
                ref="fechaDesdeInput"
                datepicker
                datepicker-autohide
                datepicker-format="dd/mm/yyyy"
                type="text"
                autocomplete="off"
                placeholder="dd/mm/aaaa"
                class="block w-full ps-9 pe-3 py-2 bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded focus:ring-brand focus:border-brand shadow-xs placeholder:text-body dark:bg-gray-800" />
            </div>
          </div>

          <div class="w-full sm:w-40 sm:shrink-0">
            <label for="filtro-fecha-hasta" class="block mb-1 text-sm font-medium text-heading">Hasta</label>
            <div class="relative">
              <div class="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                <CalendarDays class="w-4 h-4 text-body" aria-hidden="true" />
              </div>
              <input
                id="filtro-fecha-hasta"
                ref="fechaHastaInput"
                datepicker
                datepicker-autohide
                datepicker-format="dd/mm/yyyy"
                type="text"
                autocomplete="off"
                placeholder="dd/mm/aaaa"
                class="block w-full ps-9 pe-3 py-2 bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded focus:ring-brand focus:border-brand shadow-xs placeholder:text-body dark:bg-gray-800" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- PANEL DE LISTADO -->
    <div class="relative overflow-x-auto bg-neutral-primary-soft shadow-xs rounded-base border border-default">
      <div class="flex flex-col gap-3 px-4 py-3 border-b border-default-medium md:flex-row md:items-center md:justify-between">
        <h2 class="text-base font-semibold text-slate-900 dark:text-white">Listado de Cotizaciones</h2>
        <div class="flex flex-wrap items-center gap-2">
          <EntityActionButtons
            entity="cotizaciones"
            :export-params="buildQuery()"
            @pdfExportError="handlePdfError"
            @excelExportError="handleExcelError"
          />
        </div>
      </div>
      <EntityTable
        :columns="['Nº Cotización', 'Vehículo', 'Cliente', 'Total', 'Estado', 'Fechas', 'Relaciones', 'Acciones']"
        :items="cotizaciones"
        :loading="loading"
        loading-text="Cargando cotizaciones..."
        empty-text="No se encontraron cotizaciones."
        :empty-colspan="8"
        :wrapper-class="'w-full'"
      >
    <template #row="{ item, index }">
      <tr class="transition-colors hover:bg-brand-50/60 dark:hover:bg-gray-700/40">
        <td class="px-4 py-3 whitespace-nowrap">
          <a
            :href="`/crud/cotizaciones/ver/?id=${encodeURIComponent(item.id)}`"
            class="font-semibold text-primary-600 hover:text-brand-coral dark:text-primary-400"
          >
            {{ item.numero_cotizacion }}
          </a>
        </td>
        <td class="px-4 py-3 whitespace-nowrap align-top">
          <a
            v-if="vehiculoUrl(item)"
            :href="vehiculoUrl(item)"
            class="font-medium text-gray-800 hover:text-primary-600 dark:text-white dark:hover:text-primary-400"
          >{{ item.vehiculo_placa || '-' }}</a>
          <span v-else class="font-medium text-gray-800 dark:text-white">{{ item.vehiculo_placa || '-' }}</span>
<div class="mt-1 flex flex-col gap-1 ps-0.5 text-xs text-gray-500 dark:text-gray-400">
              <span class="flex items-center gap-1.5">
                <Car class="w-3.5 h-3.5 shrink-0" />
                <span class="max-w-32 truncate">
                  {{ [item.vehiculo_marca, item.vehiculo_modelo].filter(Boolean).join(' ') || '-' }}
                  <span v-if="item.vehiculo_color" class="text-gray-400 dark:text-gray-500">· {{ item.vehiculo_color }}</span>
                </span>
              </span>
              <span class="flex items-center gap-1.5">
                <Gauge class="w-3.5 h-3.5 shrink-0" />
                <span>{{ kmVehiculoDisplay(item) }}</span>
              </span>
            </div>
        </td>
        <td class="px-4 py-3 whitespace-nowrap align-top">
          <a
            v-if="clienteUrl(item)"
            :href="clienteUrl(item)"
            :title="item.cliente_nombre || '-'"
            class="block max-w-56 truncate font-medium text-gray-800 hover:text-primary-600 dark:text-white dark:hover:text-primary-400"
          >{{ item.cliente_nombre || '-' }}</a>
          <span v-else :title="item.cliente_nombre || '-'" class="block max-w-56 truncate font-medium text-gray-800 dark:text-white">{{ item.cliente_nombre || '-' }}</span>
          <div class="mt-1 flex flex-col gap-1 ps-0.5 text-xs text-gray-500 dark:text-gray-400">
            <span v-if="item.cliente_identificacion" class="flex items-center gap-1.5">
              <IdCard class="w-3.5 h-3.5 shrink-0" />
              <span>{{ item.cliente_identificacion }}</span>
            </span>
            <span v-if="item.cliente_telefono" class="flex items-center gap-1.5">
              <Phone class="w-3.5 h-3.5 shrink-0" />
              <span>{{ item.cliente_telefono }}</span>
            </span>
          </div>
        </td>
        <td class="px-4 py-3 text-gray-800 whitespace-nowrap dark:text-white font-medium">$ {{ formatMoney(item.total) }}</td>
        <td class="px-4 py-3 whitespace-nowrap align-top">
          <EstadoCotizacionBadge :estado="item.estado" :estado-display="item.estado_display" />
        </td>
        <td class="px-4 py-3 whitespace-nowrap align-top">
          <div class="flex flex-col gap-1 min-w-48">
            <div v-for="fila in filasFechasCotizacion(item)" :key="fila.key" class="flex items-center gap-1.5">
              <component :is="fila.icon" class="w-3.5 h-3.5 shrink-0 text-gray-400 dark:text-gray-500" />
              <span class="text-xs font-medium text-gray-500 dark:text-gray-400">{{ fila.label }}:</span>
              <span class="text-sm text-gray-800 dark:text-white">{{ fila.valor || '—' }}</span>
            </div>
          </div>
        </td>
        <td class="px-4 py-3 whitespace-nowrap align-top">
          <RelacionesFlujo :pasos="relacionesDeCotizacion(item)" />
        </td>
        <td class="px-4 py-3 whitespace-nowrap align-top">
          <div class="flex items-center gap-2">
            <EntityRowActions entity="cotización" :delete-disabled="isDeleting" @edit="handleEditar(item.id)" @delete="openDeleteModal(item)" />
            <EntityActionsMenu>
              <template #default="{ cerrar }">
                <button type="button" role="menuitem" title="Descargar PDF" class="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-heading hover:bg-neutral-secondary-soft dark:hover:bg-gray-700" @click="cerrar">
                  <Icon :icon="filePdfIcon" class="w-4 h-4 shrink-0 text-accent-600 dark:text-accent-400" />
                  Descargar PDF
                </button>
                <div class="my-1 border-t border-default" role="separator" />
                <button
                  v-for="canal in canalesEnvio(item)"
                  :key="canal.key"
                  type="button"
                  role="menuitem"
                  :disabled="!canal.href"
                  :title="canal.href ? `Enviar por ${canal.label}` : canal.falta"
                  class="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-heading hover:bg-neutral-secondary-soft disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent dark:hover:bg-gray-700"
                  @click="enviarPor(item, canal, cerrar)"
                >
                  <component :is="canal.icon" class="w-4 h-4 shrink-0" :class="canal.iconClass" />
                  {{ canal.label }}
                </button>
              </template>
            </EntityActionsMenu>
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
        item-word="cotización"
        item-plural="cotizaciones"
        empty-text="No se encontraron cotizaciones."
        @page="reloadList"
      />
    </template>
    </EntityTable>
    </div>
  </div>

  <ConfirmModal
    v-model="showDeleteModal"
    entity-name="cotización"
    :item-name="cotizacionToDelete?.numero_cotizacion || referenciaCorta(cotizacionToDelete?.id)"
    :is-deleting="isDeleting"
    @confirm="confirmDelete"
    @cancel="cotizacionToDelete = null"
  />
</template>