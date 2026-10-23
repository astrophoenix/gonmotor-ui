<script setup>
import { computed, onMounted, onScopeDispose, ref } from 'vue';
import { Filter, Search, ShoppingCart } from 'lucide-vue-next';
import Alert from '../../../shared/components/Alert.vue';
import EntityActionButtons from '../../../shared/components/EntityActionButtons.vue';
import EntityHeader from '../../../shared/components/EntityHeader.vue';
import EntityRowActions from '../../../shared/components/EntityRowActions.vue';
import EntityTable from '../../../shared/components/EntityTable.vue';
import FilterActions from '../../../shared/components/FilterActions.vue';
import ModoConsultaChip from '../../../shared/components/ModoConsultaChip.vue';
import Pagination from '../../../shared/components/Pagination.vue';
import SinAcceso from '../../../shared/components/SinAcceso.vue';
import TallerSelect from '../../../shared/components/TallerSelect.vue';
import { useFiltrosReactivos } from '../../../shared/composables/useFiltrosReactivos';
import { usePermisos } from '../../../shared/composables/usePermisos';
import { vSanitizeSearch } from '../../../shared/directives/sanitizeSearch';
import { formatCurrency } from '../../../shared/utils/format';
import { formatDateOnly } from '../../../shared/utils/datetime';
import { createLatestRequest, isAbortError } from '../../../shared/utils/search';
import { useAuthStore } from '../../auth/stores/authStore';
import { comprasService } from '../services/comprasService';
import CompraDetalleModal from './CompraDetalleModal.vue';
import CompraModal from './CompraModal.vue';
import EstadoCompraBadge from './EstadoCompraBadge.vue';

/**
 * Compras a proveedores y cuentas por pagar. El resumen de arriba suma el
 * saldo pendiente de las compras del filtro, con su desglose por proveedor.
 */
const authStore = useAuthStore();
const { puede, soloConsulta, sinAcceso, cargarPermisos } = usePermisos();
const puedeModificar = computed(() => puede('compras'));

const compras = ref([]);
const resumen = ref(null);
const total = ref(0);
const currentPage = ref(1);
const nextUrl = ref(null);
const previousUrl = ref(null);
const isLoading = ref(false);
const alert = ref({ type: 'default', message: '' });

const search = ref('');
const estado = ref('');
const conSaldo = ref(false);
const tallerId = ref(null);
const fechaDesde = ref('');
const fechaHasta = ref('');

const mostrarAlta = ref(false);
const compraDetalle = ref('');
const mostrarDetalle = computed({
  get: () => Boolean(compraDetalle.value),
  set: (valor) => { if (!valor) compraDetalle.value = ''; },
});

const listRequest = createLatestRequest();
onScopeDispose(() => listRequest.cancel());

async function cargar(page = 1) {
  const { signal, id } = listRequest.begin();
  isLoading.value = true;
  try {
    const data = await comprasService.list({
      page,
      signal,
      search: search.value.trim(),
      estado: estado.value,
      con_saldo: conSaldo.value ? 'true' : '',
      taller_id: tallerId.value,
      fecha_desde: fechaDesde.value,
      fecha_hasta: fechaHasta.value,
    });
    if (!listRequest.isCurrent(id)) return;
    compras.value = data.results || [];
    resumen.value = data.resumen || null;
    total.value = data.count;
    nextUrl.value = data.next;
    previousUrl.value = data.previous;
    currentPage.value = page;
  } catch (error) {
    if (!listRequest.isCurrent(id) || isAbortError(error)) return;
    alert.value = { type: 'error', message: error.message || 'No se pudieron cargar las compras.' };
  } finally {
    if (listRequest.isCurrent(id)) isLoading.value = false;
  }
}

function limpiar() {
  search.value = '';
  estado.value = '';
  conSaldo.value = false;
  tallerId.value = null;
  fechaDesde.value = '';
  fechaHasta.value = '';
  marcarAplicado();
  cargar(1);
}

const { aplicarYa, marcarAplicado } = useFiltrosReactivos({
  filtros: [estado, conSaldo, tallerId, fechaDesde, fechaHasta],
  busqueda: search,
  firma: () => [search.value.trim(), estado.value, conSaldo.value, tallerId.value, fechaDesde.value, fechaHasta.value],
  aplicar: () => cargar(1),
});

async function onCreada(compra) {
  alert.value = {
    type: 'success',
    message: `Compra ${compra.numero_factura} registrada: el stock de ${compra.detalles.length} ${compra.detalles.length === 1 ? 'repuesto subió' : 'repuestos subió'}.`,
  };
  await cargar(1);
}

async function onCambio(mensaje) {
  alert.value = { type: 'success', message: mensaje };
  await cargar(currentPage.value);
}

onMounted(async () => {
  await cargarPermisos().catch(() => {});
  if (!sinAcceso('compras')) cargar();
});
</script>

<template>
  <SinAcceso v-if="sinAcceso('compras')" seccion="Compras" />
  <div v-else class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <EntityHeader
      mode="list"
      entity="Compras"
      :icon="ShoppingCart"
      :breadcrumb="[
        { label: 'Inicio', href: '/' },
        { label: 'Compras' },
      ]"
    >
      <template #title-aside>
        <ModoConsultaChip v-if="soloConsulta('compras')" objeto="las compras" acciones="registrar compras o pagos" />
      </template>
    </EntityHeader>

    <div v-if="alert.message" class="px-4 pt-3">
      <Alert :type="alert.type" :message="alert.message" dismissible @dismiss="alert.message = ''" />
    </div>

    <div class="px-4 pb-4 mt-4 space-y-4 sm:px-6 lg:px-8">
      <!-- Cuentas por pagar -->
      <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
        <button
          type="button"
          class="p-4 text-left bg-white border border-gray-200 rounded-lg shadow-xs hover:border-brand-300 dark:bg-gray-800 dark:border-gray-700"
          title="Ver solo las compras con saldo"
          @click="conSaldo = true">
          <p class="text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">Por pagar a proveedores</p>
          <p class="mt-1 text-2xl font-bold text-gray-900 tabular-nums dark:text-white">{{ formatCurrency(resumen?.total_por_pagar) }}</p>
          <p class="text-xs text-gray-500 dark:text-gray-400">{{ resumen?.compras_con_saldo ?? 0 }} compras con saldo</p>
        </button>
        <div class="p-4 bg-white border border-gray-200 rounded-lg shadow-xs md:col-span-2 dark:bg-gray-800 dark:border-gray-700">
          <p class="mb-2 text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">Saldo por proveedor</p>
          <p v-if="!resumen?.por_proveedor?.length" class="text-sm text-gray-500 dark:text-gray-400">No hay saldos pendientes.</p>
          <ul v-else class="space-y-1 text-sm">
            <li v-for="fila in resumen.por_proveedor.slice(0, 5)" :key="fila.proveedor" class="flex justify-between gap-2">
              <span class="truncate text-gray-700 dark:text-gray-300">{{ fila.nombre }} <span class="text-xs text-gray-500">({{ fila.compras }})</span></span>
              <span class="font-semibold text-gray-900 tabular-nums dark:text-white">{{ formatCurrency(fila.saldo) }}</span>
            </li>
          </ul>
        </div>
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
          <div class="w-full min-w-60 lg:flex-1 lg:max-w-md">
            <label for="compras-search" class="block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">Buscar</label>
            <form class="relative" @submit.prevent="aplicarYa">
              <div class="absolute inset-y-0 flex items-center pointer-events-none start-0 ps-3">
                <Search class="w-4 h-4 text-gray-400" />
              </div>
              <input
                id="compras-search"
                v-model="search"
                v-sanitize-search
                type="search"
                maxlength="100"
                placeholder="N.º factura, proveedor o RUC"
                class="block w-full py-2 text-sm bg-white border border-gray-300 rounded-lg ps-9 pe-3 focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
            </form>
          </div>
          <div class="w-full sm:w-auto">
            <label for="compras-estado" class="block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">Estado</label>
            <select id="compras-estado" v-model="estado" class="block w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg sm:w-40 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
              <option value="">Todas</option>
              <option value="REGISTRADA">Registradas</option>
              <option value="ANULADA">Anuladas</option>
            </select>
          </div>
          <div class="w-full sm:w-auto">
            <label for="compras-desde" class="block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">Desde</label>
            <input id="compras-desde" v-model="fechaDesde" type="date" class="block w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white">
          </div>
          <div class="w-full sm:w-auto">
            <label for="compras-hasta" class="block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">Hasta</label>
            <input id="compras-hasta" v-model="fechaHasta" type="date" class="block w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white">
          </div>
          <div v-if="authStore.esTodosLosTalleres" class="w-full sm:w-auto sm:max-w-[22rem]">
            <label class="block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">Taller</label>
            <TallerSelect v-model="tallerId" variante="campo" placeholder="Todos los talleres" permitirTodos />
          </div>
          <label class="inline-flex items-center gap-2 pb-2.5 text-sm text-gray-700 dark:text-gray-300">
            <input v-model="conSaldo" type="checkbox" class="w-4 h-4 border-gray-300 rounded">
            Solo con saldo por pagar
          </label>
        </div>
      </div>

      <!-- Listado -->
      <div class="relative overflow-x-auto bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
        <div class="flex flex-col gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700 md:flex-row md:items-center md:justify-between">
          <h2 class="text-base font-semibold text-slate-900 dark:text-white">Listado de compras</h2>
          <EntityActionButtons
            entity="compras"
            :show-export-pdf="false"
            :show-export-excel="false"
            :show-add="puedeModificar"
            @add="mostrarAlta = true"
          />
        </div>
        <EntityTable
          :columns="['Factura', 'Proveedor', 'Fecha', 'Condición', 'Total', 'Saldo', 'Estado', 'Acciones']"
          :items="compras"
          :loading="isLoading"
          loading-text="Cargando compras..."
          empty-text="No se encontraron compras."
          :empty-colspan="8"
          :wrapper-class="'w-full'"
        >
          <template #row="{ item }">
            <tr class="transition-colors hover:bg-brand-50/60 dark:hover:bg-gray-700/40">
              <td class="px-4 py-3 whitespace-nowrap">
                <button type="button" class="font-mono font-semibold text-primary-600 hover:text-accent-500 dark:text-primary-400" @click="compraDetalle = item.id">
                  {{ item.numero_factura }}
                </button>
                <p v-if="item.taller_nombre && authStore.esTodosLosTalleres" class="mt-1 text-xs text-gray-500 dark:text-gray-400">{{ item.taller_nombre }}</p>
              </td>
              <td class="px-4 py-3 text-gray-800 dark:text-gray-200">
                {{ item.proveedor_nombre }}
                <p class="text-xs text-gray-500 dark:text-gray-400">{{ item.proveedor_identificacion }}</p>
              </td>
              <td class="px-4 py-3 text-gray-800 whitespace-nowrap dark:text-gray-300">{{ formatDateOnly(item.fecha) }}</td>
              <td class="px-4 py-3 text-gray-800 whitespace-nowrap dark:text-gray-300">
                {{ item.condicion_display }}
                <p v-if="item.fecha_vencimiento" class="text-xs text-gray-500 dark:text-gray-400">Vence {{ formatDateOnly(item.fecha_vencimiento) }}</p>
              </td>
              <td class="px-4 py-3 text-right text-gray-900 tabular-nums whitespace-nowrap dark:text-white">{{ formatCurrency(item.total) }}</td>
              <td class="px-4 py-3 font-semibold text-right tabular-nums whitespace-nowrap" :class="Number(item.saldo) ? 'text-red-700 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'">
                {{ formatCurrency(item.saldo) }}
              </td>
              <td class="px-4 py-3 whitespace-nowrap"><EstadoCompraBadge :compra="item" size="sm" /></td>
              <td class="px-4 py-3 whitespace-nowrap">
                <EntityRowActions entity="compra" :show-view="true" :show-edit="false" :show-delete="false" @view="compraDetalle = item.id" />
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
              item-word="compra"
              empty-text="No se encontraron compras."
              @page="cargar"
            />
          </template>
        </EntityTable>
      </div>
    </div>

    <CompraModal v-model="mostrarAlta" @created="onCreada" />
    <CompraDetalleModal v-model="mostrarDetalle" :compra-id="compraDetalle" :puede-modificar="puedeModificar" @cambio="onCambio" />
  </div>
</template>
