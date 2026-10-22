<script setup>
import { computed, onMounted, onScopeDispose, ref } from 'vue';
import { Banknote, BellRing, Building2, Car, Filter, HandCoins, IdCard, Phone, Search } from 'lucide-vue-next';
import Alert from '../../../shared/components/Alert.vue';
import EntityHeader from '../../../shared/components/EntityHeader.vue';
import EntityTable from '../../../shared/components/EntityTable.vue';
import FilterActions from '../../../shared/components/FilterActions.vue';
import ModoConsultaChip from '../../../shared/components/ModoConsultaChip.vue';
import Pagination from '../../../shared/components/Pagination.vue';
import SinAcceso from '../../../shared/components/SinAcceso.vue';
import TallerSelect from '../../../shared/components/TallerSelect.vue';
import { useFiltrosReactivos } from '../../../shared/composables/useFiltrosReactivos';
import { usePermisos } from '../../../shared/composables/usePermisos';
import { formatCurrency } from '../../../shared/utils/format';
import { formatDateOnly, formatDateTime } from '../../../shared/utils/datetime';
import { createLatestRequest, isAbortError } from '../../../shared/utils/search';
import { vSanitizeSearch } from '../../../shared/directives/sanitizeSearch';
import { useAuthStore } from '../../auth/stores/authStore';
import { pagosService } from '../services/pagosService';
import RecordarSaldoModal from './RecordarSaldoModal.vue';
import RegistrarPagoModal from './RegistrarPagoModal.vue';

/**
 * Cuentas por cobrar: órdenes entregadas a crédito que aún tienen saldo.
 * La más antigua primero. Desde cada fila se registra el pago o se envía un
 * recordatorio al cliente.
 */
const authStore = useAuthStore();
const { puede, soloConsulta, sinAcceso, cargarPermisos } = usePermisos();
const puedeCobrar = computed(() => puede('facturacion'));

const ORDENES = [
  { value: 'fecha_entrega', label: 'Más antiguas primero' },
  { value: '-saldo_db', label: 'Mayor saldo primero' },
];

const cuentas = ref([]);
const resumen = ref(null);
const total = ref(0);
const currentPage = ref(1);
const nextUrl = ref(null);
const previousUrl = ref(null);
const isLoading = ref(false);
const alert = ref({ type: 'default', message: '' });

const search = ref('');
const tallerId = ref(null);
const ordering = ref('fecha_entrega');

const cuentaPago = ref(null);
const cuentaRecordatorio = ref(null);

const mostrarPago = computed({
  get: () => Boolean(cuentaPago.value),
  set: (valor) => { if (!valor) cuentaPago.value = null; },
});
const mostrarRecordatorio = computed({
  get: () => Boolean(cuentaRecordatorio.value),
  set: (valor) => { if (!valor) cuentaRecordatorio.value = null; },
});

// El modal de pago trabaja con la orden: `saldo` y `pagado_neto` de la fila.
const ordenPago = computed(() => cuentaPago.value && {
  id: cuentaPago.value.id,
  numero_orden: cuentaPago.value.numero_orden,
  saldo: cuentaPago.value.saldo,
  pagado_neto: cuentaPago.value.pagado_neto,
});

const porTaller = computed(() => (authStore.esTodosLosTalleres && !tallerId.value ? resumen.value?.por_taller || [] : []));

const listRequest = createLatestRequest();
onScopeDispose(() => listRequest.cancel());

async function cargar(page = 1) {
  const { signal, id } = listRequest.begin();
  isLoading.value = true;
  try {
    const data = await pagosService.cuentasPorCobrar({
      page,
      signal,
      search: search.value.trim(),
      sucursal: tallerId.value,
      ordering: ordering.value,
    });
    if (!listRequest.isCurrent(id)) return;
    cuentas.value = data.results || [];
    resumen.value = data.resumen || null;
    total.value = data.count;
    nextUrl.value = data.next;
    previousUrl.value = data.previous;
    currentPage.value = page;
  } catch (error) {
    if (!listRequest.isCurrent(id) || isAbortError(error)) return;
    alert.value = { type: 'error', message: error.message || 'No se pudieron cargar las cuentas por cobrar.' };
  } finally {
    if (listRequest.isCurrent(id)) isLoading.value = false;
  }
}

function limpiar() {
  search.value = '';
  tallerId.value = null;
  ordering.value = 'fecha_entrega';
  marcarAplicado();
  cargar(1);
}

const { aplicarYa, marcarAplicado } = useFiltrosReactivos({
  filtros: [tallerId, ordering],
  busqueda: search,
  firma: () => [search.value.trim(), tallerId.value, ordering.value],
  aplicar: () => cargar(1),
});

async function onPagoRegistrado(pago) {
  alert.value = { type: 'success', message: `Pago de ${formatCurrency(pago.monto)} registrado en la orden ${pago.numero_orden}.` };
  await cargar(currentPage.value);
}

async function onRecordatorioEnviado(respuesta) {
  alert.value = { type: 'success', message: respuesta?.resultado?.descripcion || 'Recordatorio enviado al cliente.' };
  await cargar(currentPage.value);
}

function claseAtraso(dias) {
  if (dias > 30) return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200';
  if (dias > 7) return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200';
  return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
}

function textoAtraso(dias) {
  if (!dias) return 'Hoy';
  return `${dias} ${dias === 1 ? 'día' : 'días'}`;
}

onMounted(async () => {
  await cargarPermisos().catch(() => {});
  if (!sinAcceso('facturacion')) cargar();
});
</script>

<template>
  <SinAcceso v-if="sinAcceso('facturacion')" seccion="Cuentas por cobrar" />
  <div v-else class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <EntityHeader
      mode="list"
      entity="Cuentas por cobrar"
      :icon="HandCoins"
      :breadcrumb="[
        { label: 'Inicio', href: '/' },
        { label: 'Cuentas por cobrar' },
      ]"
    >
      <template #title-aside>
        <ModoConsultaChip v-if="soloConsulta('facturacion')" objeto="las cuentas por cobrar" acciones="registrar pagos o enviar recordatorios" />
      </template>
    </EntityHeader>

    <div v-if="alert.message" class="px-4 pt-3">
      <Alert :type="alert.type" :message="alert.message" dismissible @dismiss="alert.message = ''" />
    </div>

    <div class="px-4 pb-4 mt-4 space-y-4 sm:px-6 lg:px-8">
      <!-- Resumen -->
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div class="p-4 bg-white border border-gray-200 rounded-lg shadow-xs dark:bg-gray-800 dark:border-gray-700">
          <p class="text-xs font-medium text-gray-500 uppercase tracking-wide dark:text-gray-400">Total por cobrar</p>
          <p class="mt-1 text-2xl font-bold text-gray-900 tabular-nums dark:text-white">{{ formatCurrency(resumen?.total_por_cobrar) }}</p>
        </div>
        <div class="p-4 bg-white border border-gray-200 rounded-lg shadow-xs dark:bg-gray-800 dark:border-gray-700">
          <p class="text-xs font-medium text-gray-500 uppercase tracking-wide dark:text-gray-400">Órdenes con saldo</p>
          <p class="mt-1 text-2xl font-bold text-gray-900 tabular-nums dark:text-white">{{ resumen?.ordenes ?? 0 }}</p>
        </div>
        <div class="p-4 bg-white border border-gray-200 rounded-lg shadow-xs dark:bg-gray-800 dark:border-gray-700">
          <p class="text-xs font-medium text-gray-500 uppercase tracking-wide dark:text-gray-400">Clientes que deben</p>
          <p class="mt-1 text-2xl font-bold text-gray-900 tabular-nums dark:text-white">{{ resumen?.clientes ?? 0 }}</p>
        </div>
      </div>

      <!-- Desglose por taller (solo en «Todos los talleres») -->
      <div v-if="porTaller.length > 1" class="flex flex-wrap gap-2">
        <span
          v-for="taller in porTaller"
          :key="taller.taller || 'sin-taller'"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-full dark:bg-gray-800 dark:border-gray-700">
          <Building2 class="w-4 h-4 text-gray-400" />
          <span class="text-gray-700 dark:text-gray-300">{{ taller.nombre || 'Sin taller' }}:</span>
          <span class="font-semibold text-gray-900 tabular-nums dark:text-white">{{ formatCurrency(taller.saldo) }}</span>
          <span class="text-xs text-gray-500 dark:text-gray-400">({{ taller.ordenes }})</span>
        </span>
      </div>

      <!-- Filtros -->
      <div class="bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
        <div class="flex flex-col gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700 md:flex-row md:items-center md:justify-between">
          <h3 class="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
            <Filter class="w-5 h-5" />
            Filtros
          </h3>
          <FilterActions :loading="isLoading" :show-search="false" @clear="limpiar" />
        </div>
        <div class="flex flex-wrap items-end gap-3 p-4">
          <div class="w-full min-w-60 lg:flex-1 lg:max-w-xl">
            <label for="cxc-search" class="block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">Buscar</label>
            <form class="relative" @submit.prevent="aplicarYa">
              <div class="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                <Search class="w-4 h-4 text-gray-400" />
              </div>
              <input
                id="cxc-search"
                v-model="search"
                v-sanitize-search
                type="search"
                maxlength="100"
                placeholder="N.º orden, cliente, identificación o placa"
                class="block w-full py-2 text-sm bg-white border border-gray-300 rounded-lg ps-9 pe-3 focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
            </form>
          </div>
          <div class="w-full sm:w-auto">
            <label for="cxc-orden" class="block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">Ordenar</label>
            <select
              id="cxc-orden"
              v-model="ordering"
              class="block w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg sm:w-52 focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
              <option v-for="opcion in ORDENES" :key="opcion.value" :value="opcion.value">{{ opcion.label }}</option>
            </select>
          </div>
          <!-- Solo con «Todos los talleres»: con un taller activo el backend ya filtra por él. -->
          <div v-if="authStore.esTodosLosTalleres" class="w-full sm:w-auto sm:max-w-[22rem]">
            <label class="block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">Taller</label>
            <TallerSelect v-model="tallerId" variante="campo" placeholder="Todos los talleres" permitirTodos />
          </div>
        </div>
      </div>

      <!-- Listado -->
      <div class="relative overflow-x-auto bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
        <div class="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2 class="text-base font-semibold text-slate-900 dark:text-white">Órdenes entregadas con saldo</h2>
        </div>
        <EntityTable
          :columns="['Orden', 'Cliente', 'Vehículo', 'Entregada', 'Atraso', 'Saldo', 'Acciones']"
          :items="cuentas"
          :loading="isLoading"
          loading-text="Cargando cuentas por cobrar..."
          empty-text="No hay órdenes entregadas con saldo pendiente."
          :empty-colspan="7"
          :wrapper-class="'w-full'"
        >
          <template #row="{ item }">
            <tr class="transition-colors hover:bg-brand-50/60 dark:hover:bg-gray-700/40">
              <td class="px-4 py-3 whitespace-nowrap align-top">
                <a
                  :href="`/crud/ordenes/ver/?id=${encodeURIComponent(item.id)}`"
                  class="font-semibold text-primary-600 hover:text-accent-500 dark:text-primary-400 dark:hover:text-accent-400">
                  {{ item.numero_orden }}
                </a>
                <p v-if="item.sucursal_nombre && authStore.esTodosLosTalleres" class="mt-1 text-xs text-gray-500 dark:text-gray-400">{{ item.sucursal_nombre }}</p>
              </td>
              <td class="px-4 py-3 whitespace-nowrap align-top">
                <a
                  :href="`/crud/clientes/ver/?id=${encodeURIComponent(item.cliente.id)}`"
                  class="font-medium text-gray-800 hover:text-primary-600 dark:text-white dark:hover:text-primary-400">
                  {{ item.cliente.nombre }}
                </a>
                <div class="mt-1 flex flex-col gap-1 text-xs text-gray-500 dark:text-gray-400">
                  <span v-if="item.cliente.identificacion" class="flex items-center gap-1.5"><IdCard class="w-3.5 h-3.5" />{{ item.cliente.identificacion }}</span>
                  <span v-if="item.cliente.telefono" class="flex items-center gap-1.5"><Phone class="w-3.5 h-3.5" />{{ item.cliente.telefono }}</span>
                </div>
              </td>
              <td class="px-4 py-3 whitespace-nowrap align-top">
                <span class="font-mono font-medium text-gray-800 dark:text-white">{{ item.vehiculo.placa }}</span>
                <p class="mt-1 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                  <Car class="w-3.5 h-3.5" />
                  {{ [item.vehiculo.marca, item.vehiculo.modelo].filter(Boolean).join(' ') || '—' }}
                </p>
              </td>
              <td class="px-4 py-3 whitespace-nowrap align-top text-gray-800 dark:text-gray-300">
                {{ formatDateOnly(item.fecha_entrega) }}
                <p v-if="item.entrega_credito_autorizada_por_nombre" class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Autorizó: {{ item.entrega_credito_autorizada_por_nombre }}
                </p>
              </td>
              <td class="px-4 py-3 whitespace-nowrap align-top">
                <span class="inline-flex px-2 py-0.5 text-xs font-medium rounded-full tabular-nums" :class="claseAtraso(item.dias_atraso)">
                  {{ textoAtraso(item.dias_atraso) }}
                </span>
                <p v-if="item.ultimo_recordatorio" class="mt-1 text-xs text-gray-500 dark:text-gray-400" :title="formatDateTime(item.ultimo_recordatorio)">
                  Recordado: {{ formatDateOnly(item.ultimo_recordatorio) }}
                </p>
              </td>
              <td class="px-4 py-3 whitespace-nowrap align-top text-right">
                <p class="font-semibold text-gray-900 tabular-nums dark:text-white">{{ formatCurrency(item.saldo) }}</p>
                <p class="mt-1 text-xs text-gray-500 tabular-nums dark:text-gray-400">de {{ formatCurrency(item.total) }}</p>
              </td>
              <td class="px-4 py-3 whitespace-nowrap align-top">
                <div v-if="puedeCobrar" class="flex items-center gap-2">
                  <button
                    type="button"
                    class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white rounded-lg bg-brand-900 hover:bg-brand-800 focus:ring-4 focus:ring-brand-200"
                    @click="cuentaPago = item">
                    <Banknote class="w-4 h-4" />
                    Cobrar
                  </button>
                  <button
                    type="button"
                    class="inline-flex items-center justify-center w-8 h-8 text-gray-500 border border-gray-300 rounded-lg hover:bg-gray-100 hover:text-emerald-600 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-emerald-400"
                    title="Recordar el saldo al cliente"
                    aria-label="Recordar el saldo al cliente"
                    @click="cuentaRecordatorio = item">
                    <BellRing class="w-4 h-4" />
                  </button>
                </div>
                <a
                  v-else
                  :href="`/crud/ordenes/ver/?id=${encodeURIComponent(item.id)}`"
                  class="text-sm font-medium text-primary-600 hover:underline dark:text-primary-400">
                  Ver orden
                </a>
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
              item-word="orden"
              item-plural="órdenes"
              empty-text="No hay órdenes entregadas con saldo pendiente."
              @page="cargar"
            />
          </template>
        </EntityTable>
      </div>
    </div>

    <RegistrarPagoModal v-model="mostrarPago" :orden="ordenPago" tipo="PAGO" @registrado="onPagoRegistrado" />
    <RecordarSaldoModal v-model="mostrarRecordatorio" :cuenta="cuentaRecordatorio" @enviado="onRecordatorioEnviado" />
  </div>
</template>
