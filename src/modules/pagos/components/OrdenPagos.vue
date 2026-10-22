<script setup>
import { computed, ref, watch } from 'vue';
import { Ban, Banknote, Loader2, Undo2, Wallet, X } from 'lucide-vue-next';
import Alert from '../../../shared/components/Alert.vue';
import { formatDateTime } from '../../../shared/utils/datetime';
import { pagosService } from '../services/pagosService';
import EstadoPagoBadge from './EstadoPagoBadge.vue';
import RegistrarPagoModal from './RegistrarPagoModal.vue';

/**
 * Cobro de la orden en el panel lateral del detalle.
 *
 * El resumen (pagado, saldo, estado de pago) viene en la propia orden y lo ve
 * quien vea la orden. Los movimientos y las acciones dependen del recurso
 * `facturacion`. Emite `cambio` tras registrar o anular para que el padre
 * recargue la orden (saldo e historial).
 */
const props = defineProps({
  orden: { type: Object, required: true },
  puedeVer: { type: Boolean, default: false },
  puedeModificar: { type: Boolean, default: false },
});

const emit = defineEmits(['cambio']);

const SECCION = 'p-4 sm:p-5 bg-white border border-gray-200 rounded-lg shadow-xs dark:bg-gray-800 dark:border-gray-700';
const TITULO_SECCION = 'flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-200';
const BOTON = 'inline-flex flex-1 items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg shadow-xs focus:ring-4 disabled:opacity-60';

const movimientos = ref([]);
const cargando = ref(false);
const errorMessage = ref('');
const modalTipo = ref(null);
const anulando = ref(null);
const motivo = ref('');
const errorMotivo = ref('');
const guardandoAnulacion = ref(false);

const saldo = computed(() => Number(props.orden.saldo) || 0);
const pagadoNeto = computed(() => Number(props.orden.pagado_neto) || 0);
const devuelto = computed(() => Number(props.orden.total_devuelto) || 0);
const anulada = computed(() => props.orden.estado === 'CANCELADO');
const puedePagar = computed(() => props.puedeModificar && !anulada.value && saldo.value > 0);
const puedeDevolver = computed(() => props.puedeModificar && pagadoNeto.value > 0);

const mostrarModal = computed({
  get: () => Boolean(modalTipo.value),
  set: (valor) => { if (!valor) modalTipo.value = null; },
});

function formatNumber(value) {
  return Number(value || 0).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function cargar() {
  if (!props.puedeVer || !props.orden?.id) return;
  cargando.value = true;
  errorMessage.value = '';
  try {
    const respuesta = await pagosService.listarDeOrden(props.orden.id);
    movimientos.value = respuesta.results || [];
  } catch (error) {
    errorMessage.value = error.message || 'No se pudieron cargar los pagos de la orden.';
  } finally {
    cargando.value = false;
  }
}

// La orden se recarga tras cada cambio (también los de estado o líneas).
watch(() => [props.orden?.id, props.orden?.pagado_neto, props.puedeVer], cargar, { immediate: true });

function onRegistrado(pago) {
  emit('cambio', pago.tipo === 'DEVOLUCION' ? 'Devolución registrada.' : 'Pago registrado.');
}

function abrirAnulacion(movimiento) {
  anulando.value = movimiento;
  motivo.value = '';
  errorMotivo.value = '';
}

async function confirmarAnulacion() {
  if (!anulando.value || guardandoAnulacion.value) return;
  if (!motivo.value.trim()) {
    errorMotivo.value = 'Indica el motivo de la anulación.';
    return;
  }
  guardandoAnulacion.value = true;
  errorMotivo.value = '';
  try {
    const anulado = await pagosService.anular(anulando.value.id, motivo.value.trim());
    anulando.value = null;
    emit('cambio', `${anulado.tipo_display} anulado.`);
  } catch (error) {
    errorMotivo.value = (Array.isArray(error.data?.motivo) ? error.data.motivo[0] : null)
      || error.message
      || 'No se pudo anular el movimiento.';
  } finally {
    guardandoAnulacion.value = false;
  }
}
</script>

<template>
  <section :class="SECCION">
    <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
      <h4 :class="TITULO_SECCION">
        <Wallet class="w-4 h-4" />
        Cobro
      </h4>
      <EstadoPagoBadge :estado="orden.estado_pago" :estado-display="orden.estado_pago_display" size="sm" />
    </div>

    <dl class="space-y-1.5 text-sm">
      <div class="flex justify-between gap-2 text-gray-600 dark:text-gray-300">
        <dt>Total de la orden</dt>
        <dd class="font-medium tabular-nums">$ {{ formatNumber(orden.total) }}</dd>
      </div>
      <div class="flex justify-between gap-2 text-gray-600 dark:text-gray-300">
        <dt>Pagado</dt>
        <dd class="font-medium tabular-nums">$ {{ formatNumber(orden.total_pagado) }}</dd>
      </div>
      <div v-if="devuelto" class="flex justify-between gap-2 text-gray-600 dark:text-gray-300">
        <dt>Devuelto</dt>
        <dd class="font-medium tabular-nums">− $ {{ formatNumber(devuelto) }}</dd>
      </div>
    </dl>
    <div class="flex items-baseline justify-between gap-2 pt-3 mt-3 border-t border-gray-200 dark:border-gray-700">
      <span class="text-sm font-semibold text-gray-900 dark:text-white">Saldo pendiente</span>
      <span
        class="text-xl font-bold tabular-nums"
        :class="saldo ? 'text-gray-900 dark:text-white' : 'text-emerald-700 dark:text-emerald-300'">
        $ {{ formatNumber(saldo) }}
      </span>
    </div>

    <p
      v-if="orden.saldo_al_entregar"
      class="px-3 py-2 mt-3 text-xs rounded-md bg-amber-50 text-amber-900 ring-1 ring-inset ring-amber-200 dark:bg-amber-900/20 dark:text-amber-100 dark:ring-amber-700/60">
      Entregada a crédito con saldo de
      <span class="font-semibold tabular-nums">$ {{ formatNumber(orden.saldo_al_entregar) }}</span>
      · autorizó {{ orden.entrega_credito_autorizada_por_nombre || '—' }}.
    </p>

    <div v-if="puedePagar || puedeDevolver" class="flex flex-wrap gap-2 mt-4">
      <button
        v-if="puedePagar"
        type="button"
        :class="[BOTON, 'text-white bg-brand-900 hover:bg-brand-800 focus:ring-brand-200 dark:focus:ring-brand-700']"
        @click="modalTipo = 'PAGO'">
        <Banknote class="w-4 h-4" />
        Registrar pago
      </button>
      <button
        v-if="puedeDevolver"
        type="button"
        :class="[BOTON, 'text-gray-900 bg-white border border-gray-300 hover:bg-gray-100 focus:ring-gray-100 dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700 dark:focus:ring-gray-700']"
        @click="modalTipo = 'DEVOLUCION'">
        <Undo2 class="w-4 h-4" />
        Devolución
      </button>
    </div>

    <template v-if="puedeVer">
      <p class="mt-4 mb-2 text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">Movimientos</p>
      <Alert v-if="errorMessage" type="error" :message="errorMessage" dismissible @dismiss="errorMessage = ''" />
      <div v-if="cargando" class="flex items-center gap-2 py-2 text-sm text-gray-500 dark:text-gray-400">
        <Loader2 class="w-4 h-4 animate-spin" />
        Cargando...
      </div>
      <p v-else-if="!movimientos.length" class="text-sm text-gray-500 dark:text-gray-400">Sin pagos registrados.</p>
      <ul v-else class="divide-y divide-gray-100 dark:divide-gray-700">
        <li v-for="mov in movimientos" :key="mov.id" class="py-2" :class="mov.anulado ? 'opacity-60' : ''">
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <p class="text-sm font-medium text-gray-900 dark:text-white">
                <span :class="mov.anulado ? 'line-through' : ''">
                  {{ mov.tipo === 'DEVOLUCION' ? 'Devolución' : (mov.es_anticipo ? 'Anticipo' : 'Pago') }} · {{ mov.forma_pago_display }}
                </span>
              </p>
              <p class="text-xs text-gray-500 truncate dark:text-gray-400" :title="mov.referencia || ''">
                {{ formatDateTime(mov.fecha) }}<template v-if="mov.referencia"> · {{ mov.referencia }}</template>
              </p>
              <p v-if="mov.observacion" class="text-xs text-gray-500 truncate dark:text-gray-400" :title="mov.observacion">{{ mov.observacion }}</p>
              <p v-if="mov.anulado" class="text-xs text-red-700 dark:text-red-400">
                Anulado por {{ mov.anulado_por_nombre || '—' }}: {{ mov.motivo_anulacion }}
              </p>
            </div>
            <div class="flex items-center gap-1 shrink-0">
              <span
                class="text-sm font-semibold tabular-nums"
                :class="[mov.tipo === 'DEVOLUCION' ? 'text-red-700 dark:text-red-400' : 'text-gray-900 dark:text-white', mov.anulado ? 'line-through' : '']">
                {{ mov.tipo === 'DEVOLUCION' ? '−' : '' }}$ {{ formatNumber(mov.monto) }}
              </span>
              <button
                v-if="puedeModificar && !mov.anulado"
                type="button"
                class="inline-flex items-center justify-center w-7 h-7 text-gray-400 rounded hover:bg-gray-100 hover:text-red-600 dark:hover:bg-gray-700 dark:hover:text-red-400"
                :title="`Anular ${mov.tipo_display.toLowerCase()}`"
                :aria-label="`Anular ${mov.tipo_display.toLowerCase()}`"
                @click="abrirAnulacion(mov)">
                <Ban class="w-4 h-4" />
              </button>
            </div>
          </div>
        </li>
      </ul>
    </template>
  </section>

  <RegistrarPagoModal v-model="mostrarModal" :orden="orden" :tipo="modalTipo || 'PAGO'" @registrado="onRegistrado" />

  <!-- Anulación con motivo obligatorio -->
  <div v-if="anulando" class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4">
    <div class="relative w-full max-w-md rounded-lg bg-white shadow-xl dark:bg-gray-800 my-auto">
      <div class="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
        <h3 class="inline-flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
          <Ban class="w-5 h-5 text-red-600 dark:text-red-400" />
          Anular {{ anulando.tipo_display.toLowerCase() }}
        </h3>
        <button
          type="button"
          class="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200"
          aria-label="Cerrar"
          :disabled="guardandoAnulacion"
          @click="anulando = null">
          <X class="w-5 h-5" />
        </button>
      </div>
      <div class="px-6 py-4 space-y-3">
        <p class="text-sm text-gray-600 dark:text-gray-300">
          {{ anulando.tipo_display }} de
          <span class="font-semibold text-gray-900 tabular-nums dark:text-white">$ {{ formatNumber(anulando.monto) }}</span>
          ({{ anulando.forma_pago_display }}). El movimiento queda en el registro como anulado.
        </p>
        <div>
          <label for="motivo-anulacion" class="block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
            Motivo <span class="text-accent-500 dark:text-accent-400">*</span>
          </label>
          <input
            id="motivo-anulacion"
            v-model="motivo"
            type="text"
            maxlength="255"
            placeholder="Ej.: monto mal digitado"
            class="block w-full p-2.5 text-sm rounded shadow-xs focus:outline-none focus:ring-2 dark:bg-gray-700 dark:placeholder-gray-400"
            :class="errorMotivo
              ? 'bg-red-50 border border-red-500 text-red-900 focus:ring-red-200 focus:border-red-500 dark:text-red-400 dark:border-red-500'
              : 'bg-gray-50 border border-gray-300 text-gray-900 focus:ring-brand-200 focus:border-brand-500 dark:border-gray-600 dark:text-white'"
            @keydown.enter.prevent="confirmarAnulacion">
          <p v-if="errorMotivo" class="mt-1 text-sm text-red-600 dark:text-red-400">{{ errorMotivo }}</p>
        </div>
      </div>
      <div class="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4 dark:border-gray-700">
        <button
          type="button"
          class="text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 focus:ring-4 focus:ring-gray-200 font-medium text-sm px-4 py-2.5"
          :disabled="guardandoAnulacion"
          @click="anulando = null">
          Cancelar
        </button>
        <button
          type="button"
          :disabled="guardandoAnulacion"
          class="inline-flex items-center gap-1.5 text-white bg-red-600 rounded hover:bg-red-700 focus:ring-4 focus:ring-red-300 font-medium text-sm px-4 py-2.5 disabled:opacity-50"
          @click="confirmarAnulacion">
          <Loader2 v-if="guardandoAnulacion" class="w-5 h-5 animate-spin" />
          {{ guardandoAnulacion ? 'Anulando...' : 'Anular' }}
        </button>
      </div>
    </div>
  </div>
</template>
