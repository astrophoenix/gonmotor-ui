<script setup>
import { onMounted, ref } from 'vue';
import { Loader2, Wallet } from 'lucide-vue-next';
import Alert from '../../../shared/components/Alert.vue';
import Pagination from '../../../shared/components/Pagination.vue';
import { formatCurrency } from '../../../shared/utils/format';
import { formatDateOnly, formatDateTime } from '../../../shared/utils/datetime';
import { pagosService } from '../services/pagosService';

/**
 * Cuenta del cliente en su ficha: deuda de órdenes entregadas a crédito y
 * su historial de pagos. Solo se monta con `facturacion`/`ver`.
 */
const props = defineProps({
  clienteId: { type: String, required: true },
});

const deuda = ref(null);
const ordenesConSaldo = ref([]);
const pagos = ref([]);
const totalPagos = ref(0);
const paginaPagos = ref(1);
const siguiente = ref(null);
const anterior = ref(null);
const cargando = ref(true);
const cargandoPagos = ref(false);
const errorMessage = ref('');

async function cargarPagos(page = 1) {
  cargandoPagos.value = true;
  try {
    const data = await pagosService.listarDeCliente(props.clienteId, { page });
    pagos.value = data.results || [];
    totalPagos.value = data.count;
    siguiente.value = data.next;
    anterior.value = data.previous;
    paginaPagos.value = page;
  } finally {
    cargandoPagos.value = false;
  }
}

onMounted(async () => {
  try {
    const [cuentas] = await Promise.all([
      pagosService.cuentasPorCobrar({ cliente: props.clienteId }),
      cargarPagos(),
    ]);
    deuda.value = cuentas.resumen;
    ordenesConSaldo.value = cuentas.results || [];
  } catch (error) {
    errorMessage.value = error.message || 'No se pudo cargar la cuenta del cliente.';
  } finally {
    cargando.value = false;
  }
});
</script>

<template>
  <section class="shadow-sm rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
    <div class="flex flex-wrap items-center justify-between gap-3 px-6 pt-5 pb-4">
      <h3 class="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
        <Wallet class="w-4 h-4" aria-hidden="true" />
        Cuenta del cliente
      </h3>
      <p v-if="deuda" class="text-sm text-gray-600 dark:text-gray-300">
        Debe
        <span class="text-lg font-bold tabular-nums" :class="Number(deuda.total_por_cobrar) ? 'text-red-700 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-300'">
          {{ formatCurrency(deuda.total_por_cobrar) }}
        </span>
      </p>
    </div>

    <div class="px-6 pb-6 space-y-4">
      <Alert v-if="errorMessage" type="error" :message="errorMessage" />
      <div v-if="cargando" class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <Loader2 class="w-4 h-4 animate-spin" />
        Cargando...
      </div>

      <template v-else-if="!errorMessage">
        <!-- Órdenes entregadas con saldo -->
        <div v-if="ordenesConSaldo.length">
          <p class="mb-2 text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">Órdenes con saldo</p>
          <ul class="divide-y divide-gray-100 border border-gray-100 rounded-lg dark:divide-gray-700 dark:border-gray-700">
            <li v-for="cuenta in ordenesConSaldo" :key="cuenta.id" class="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
              <span class="min-w-0">
                <a :href="`/crud/ordenes/ver/?id=${encodeURIComponent(cuenta.id)}`" class="font-semibold text-primary-600 hover:underline dark:text-primary-400">{{ cuenta.numero_orden }}</a>
                <span class="text-gray-500 dark:text-gray-400"> · {{ cuenta.vehiculo.placa }} · entregada {{ formatDateOnly(cuenta.fecha_entrega) }}</span>
              </span>
              <span class="font-semibold text-gray-900 tabular-nums whitespace-nowrap dark:text-white">{{ formatCurrency(cuenta.saldo) }}</span>
            </li>
          </ul>
          <p v-if="deuda && deuda.ordenes > ordenesConSaldo.length" class="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Y {{ deuda.ordenes - ordenesConSaldo.length }} más en <a href="/crud/cuentas-por-cobrar/" class="underline">Cuentas por cobrar</a>.
          </p>
        </div>

        <!-- Historial de pagos -->
        <div>
          <p class="mb-2 text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">Historial de pagos</p>
          <p v-if="!pagos.length" class="text-sm text-gray-500 dark:text-gray-400">Este cliente aún no tiene pagos registrados.</p>
          <div v-else class="overflow-x-auto border border-gray-100 rounded-lg dark:border-gray-700">
            <table class="w-full text-sm" :class="cargandoPagos ? 'opacity-60' : ''">
              <thead class="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-700/50 dark:text-gray-400">
                <tr>
                  <th class="px-4 py-2 font-medium text-left">Fecha</th>
                  <th class="px-4 py-2 font-medium text-left">Orden</th>
                  <th class="px-4 py-2 font-medium text-left">Movimiento</th>
                  <th class="px-4 py-2 font-medium text-right">Monto</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
                <tr v-for="pago in pagos" :key="pago.id" :class="pago.anulado ? 'opacity-60' : ''">
                  <td class="px-4 py-2 text-gray-700 whitespace-nowrap dark:text-gray-300" :title="formatDateTime(pago.fecha)">{{ formatDateOnly(pago.fecha) }}</td>
                  <td class="px-4 py-2 whitespace-nowrap">
                    <a :href="`/crud/ordenes/ver/?id=${encodeURIComponent(pago.orden_trabajo)}`" class="font-medium text-primary-600 hover:underline dark:text-primary-400">{{ pago.numero_orden }}</a>
                  </td>
                  <td class="px-4 py-2 text-gray-700 dark:text-gray-300">
                    <span :class="pago.anulado ? 'line-through' : ''">
                      {{ pago.tipo === 'DEVOLUCION' ? 'Devolución' : (pago.es_anticipo ? 'Anticipo' : 'Pago') }} · {{ pago.forma_pago_display }}
                    </span>
                    <span v-if="pago.anulado" class="ms-1 text-xs text-red-700 dark:text-red-400">(anulado)</span>
                  </td>
                  <td
                    class="px-4 py-2 font-semibold text-right tabular-nums whitespace-nowrap"
                    :class="[pago.tipo === 'DEVOLUCION' ? 'text-red-700 dark:text-red-400' : 'text-gray-900 dark:text-white', pago.anulado ? 'line-through' : '']">
                    {{ pago.tipo === 'DEVOLUCION' ? '−' : '' }}{{ formatCurrency(pago.monto) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <Pagination
            v-if="totalPagos > pagos.length"
            :total="totalPagos"
            :current-page="paginaPagos"
            :next-url="siguiente"
            :previous-url="anterior"
            :disabled="cargandoPagos"
            item-word="movimiento"
            @page="cargarPagos"
          />
        </div>
      </template>
    </div>
  </section>
</template>
