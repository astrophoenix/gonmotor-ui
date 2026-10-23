<script setup>
import ModalCabecera from '@/shared/components/ModalCabecera.vue';
import { computed, reactive, ref, watch } from 'vue';
import { Ban, Banknote, Loader2, ShoppingCart } from 'lucide-vue-next';
import Alert from '../../../shared/components/Alert.vue';
import FichaCampos from '../../../shared/components/FichaCampos.vue';
import { formatCurrency } from '../../../shared/utils/format';
import { formatDateOnly, formatDateTime } from '../../../shared/utils/datetime';
import { FORMAS_CON_REFERENCIA, FORMAS_PAGO } from '../../pagos/constants/pagos';
import { comprasService } from '../services/comprasService';
import EstadoCompraBadge from './EstadoCompraBadge.vue';

/**
 * Ficha de una compra: líneas, pagos al proveedor y anulación. Con
 * `puedeModificar` (compras/modificar) registra y anula pagos y anula la
 * compra. Emite `cambio` (mensaje) tras cada operación.
 */
const props = defineProps({
  modelValue: { type: Boolean, default: false },
  compraId: { type: String, default: '' },
  puedeModificar: { type: Boolean, default: false },
});

const emit = defineEmits(['update:modelValue', 'cambio']);

const compra = ref(null);
const cargando = ref(false);
const errorMessage = ref('');
const guardando = ref(false);

const pagando = ref(false);
const pago = reactive({ monto: '', forma_pago: 'TRANSFERENCIA', referencia: '', observacion: '' });
const erroresPago = ref({});

// { tipo: 'pago' | 'compra', objeto } con su motivo.
const anulacion = ref(null);
const motivo = ref('');
const errorMotivo = ref('');

const saldo = computed(() => Number(compra.value?.saldo) || 0);
const vigente = computed(() => compra.value?.estado === 'REGISTRADA');

const campos = computed(() => {
  const c = compra.value;
  if (!c) return [];
  return [
    { etiqueta: 'Proveedor', valor: `${c.proveedor_nombre} · ${c.proveedor_identificacion}`, ancho: 'completo' },
    { etiqueta: 'Factura', valor: c.numero_factura },
    { etiqueta: 'Fecha', valor: formatDateOnly(c.fecha) },
    { etiqueta: 'Condición', valor: c.condicion_display },
    { etiqueta: 'Vence', valor: c.fecha_vencimiento ? formatDateOnly(c.fecha_vencimiento) : '—' },
    { etiqueta: 'Taller', valor: c.taller_nombre || '—' },
    { etiqueta: 'Registró', valor: c.registrado_por_nombre || '—' },
    { etiqueta: 'Observaciones', valor: c.observaciones || '—', ancho: 'completo' },
  ];
});

async function cargar() {
  if (!props.compraId) return;
  cargando.value = true;
  errorMessage.value = '';
  try {
    compra.value = await comprasService.getById(props.compraId);
  } catch (error) {
    errorMessage.value = error.message || 'No se pudo cargar la compra.';
  } finally {
    cargando.value = false;
  }
}

watch(() => props.modelValue, (abierto) => {
  if (!abierto) return;
  compra.value = null;
  pagando.value = false;
  anulacion.value = null;
  cargar();
});

function cerrar() {
  if (guardando.value) return;
  emit('update:modelValue', false);
}

function abrirPago() {
  Object.assign(pago, { monto: saldo.value.toFixed(2), forma_pago: 'TRANSFERENCIA', referencia: '', observacion: '' });
  erroresPago.value = {};
  pagando.value = true;
}

async function guardarPago() {
  const errores = {};
  const monto = Number(pago.monto);
  if (!(monto > 0)) errores.monto = 'Ingresa un monto mayor a cero.';
  else if (monto > saldo.value + 0.0001) errores.monto = `No puede superar el saldo (${formatCurrency(saldo.value)}).`;
  if (FORMAS_CON_REFERENCIA.includes(pago.forma_pago) && !pago.referencia.trim()) errores.referencia = 'Indica el número de comprobante.';
  erroresPago.value = errores;
  if (Object.keys(errores).length) return;

  guardando.value = true;
  try {
    await comprasService.registrarPago({
      compra: compra.value.id,
      monto: monto.toFixed(2),
      forma_pago: pago.forma_pago,
      referencia: pago.referencia.trim(),
      observacion: pago.observacion.trim(),
    });
    pagando.value = false;
    await cargar();
    emit('cambio', `Pago de ${formatCurrency(monto)} registrado al proveedor.`);
  } catch (error) {
    const data = error.data && !Array.isArray(error.data) ? error.data : {};
    erroresPago.value = { monto: [].concat(data.monto || [])[0], referencia: [].concat(data.referencia || [])[0] };
    if (!erroresPago.value.monto && !erroresPago.value.referencia) errorMessage.value = error.message || 'No se pudo registrar el pago.';
  } finally {
    guardando.value = false;
  }
}

function pedirAnulacion(tipo, objeto) {
  anulacion.value = { tipo, objeto };
  motivo.value = '';
  errorMotivo.value = '';
}

async function confirmarAnulacion() {
  if (!motivo.value.trim()) {
    errorMotivo.value = 'Indica el motivo de la anulación.';
    return;
  }
  guardando.value = true;
  errorMotivo.value = '';
  const { tipo, objeto } = anulacion.value;
  try {
    if (tipo === 'compra') await comprasService.anular(objeto.id, motivo.value.trim());
    else await comprasService.anularPago(objeto.id, motivo.value.trim());
    anulacion.value = null;
    await cargar();
    emit('cambio', tipo === 'compra' ? `Compra ${objeto.numero_factura} anulada; el stock se revirtió.` : 'Pago anulado.');
  } catch (error) {
    errorMotivo.value = error.message || 'No se pudo anular.';
  } finally {
    guardando.value = false;
  }
}
</script>

<template>
  <div v-if="modelValue" class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4">
    <div class="relative w-full max-w-4xl rounded-lg bg-white shadow-xl dark:bg-gray-800 my-auto">
      <ModalCabecera
        :icono="ShoppingCart"
        :titulo="compra ? `Compra ${compra.numero_factura}` : 'Compra'"
        @cerrar="cerrar"
      >
        <template #titulo>
          <EstadoCompraBadge v-if="compra" :compra="compra" size="sm" />
        </template>
      </ModalCabecera>

      <div class="px-6 py-4 space-y-5">
        <Alert v-if="errorMessage" type="error" :message="errorMessage" dismissible @dismiss="errorMessage = ''" />
        <div v-if="cargando && !compra" class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <Loader2 class="w-4 h-4 animate-spin" />
          Cargando compra...
        </div>

        <template v-if="compra">
          <Alert
            v-if="compra.estado === 'ANULADA'"
            type="warning"
            title="Compra anulada"
            :message="`${compra.anulada_por_nombre || '—'} · ${formatDateTime(compra.fecha_anulacion)}: ${compra.motivo_anulacion}`" />

          <FichaCampos :campos="campos" />

          <!-- Líneas -->
          <div class="overflow-x-auto border border-gray-200 rounded-lg dark:border-gray-700">
            <table class="w-full text-sm">
              <thead class="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-700/50 dark:text-gray-400">
                <tr>
                  <th class="px-3 py-2 font-medium text-left">Repuesto</th>
                  <th class="px-3 py-2 font-medium text-right">Cant.</th>
                  <th class="px-3 py-2 font-medium text-right">Costo unit.</th>
                  <th class="px-3 py-2 font-medium text-right">IVA</th>
                  <th class="px-3 py-2 font-medium text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody class="text-gray-700 divide-y divide-gray-100 dark:text-gray-300 dark:divide-gray-700">
                <tr v-for="linea in compra.detalles" :key="linea.id">
                  <td class="px-3 py-2 text-gray-900 dark:text-white"><span class="font-mono">{{ linea.repuesto_codigo }}</span> · {{ linea.repuesto_nombre }}</td>
                  <td class="px-3 py-2 text-right tabular-nums">{{ linea.cantidad }}</td>
                  <td class="px-3 py-2 text-right tabular-nums">{{ formatCurrency(linea.costo_unitario) }}</td>
                  <td class="px-3 py-2 text-right tabular-nums">{{ Number(linea.iva_porcentaje) ? '15 %' : '0 %' }}</td>
                  <td class="px-3 py-2 text-right tabular-nums">{{ formatCurrency(linea.subtotal) }}</td>
                </tr>
              </tbody>
              <tfoot class="text-sm border-t border-gray-200 dark:border-gray-700">
                <tr><td colspan="4" class="px-3 py-1 text-right text-gray-500 dark:text-gray-400">Subtotal</td><td class="px-3 py-1 text-right tabular-nums">{{ formatCurrency(compra.subtotal) }}</td></tr>
                <tr><td colspan="4" class="px-3 py-1 text-right text-gray-500 dark:text-gray-400">IVA</td><td class="px-3 py-1 text-right tabular-nums">{{ formatCurrency(compra.monto_iva) }}</td></tr>
                <tr><td colspan="4" class="px-3 py-1 font-semibold text-right">Total</td><td class="px-3 py-1 font-semibold text-right tabular-nums">{{ formatCurrency(compra.total) }}</td></tr>
              </tfoot>
            </table>
          </div>

          <!-- Pagos al proveedor -->
          <div>
            <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
              <p class="text-sm font-semibold text-gray-900 dark:text-white">
                Pagos al proveedor · saldo
                <span class="tabular-nums" :class="saldo ? 'text-red-700 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-300'">{{ formatCurrency(saldo) }}</span>
              </p>
              <button
                v-if="puedeModificar && vigente && saldo > 0 && !pagando"
                type="button"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white rounded-lg bg-primary-700 hover:bg-primary-800"
                @click="abrirPago">
                <Banknote class="w-4 h-4" />
                Registrar pago
              </button>
            </div>

            <form v-if="pagando" class="grid grid-cols-1 gap-3 p-3 mb-3 border border-gray-200 rounded-lg sm:grid-cols-4 bg-gray-50 dark:bg-gray-900/40 dark:border-gray-700" novalidate @submit.prevent="guardarPago">
              <div>
                <label for="pago-compra-monto" class="block mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">Monto</label>
                <input id="pago-compra-monto" v-model="pago.monto" type="number" min="0.01" step="0.01" class="block w-full p-2 text-sm border rounded tabular-nums dark:bg-gray-700 dark:text-white" :class="erroresPago.monto ? 'bg-red-50 border-red-500' : 'bg-white border-gray-300 dark:border-gray-600'">
                <p v-if="erroresPago.monto" class="mt-1 text-xs text-red-600 dark:text-red-400">{{ erroresPago.monto }}</p>
              </div>
              <div>
                <label for="pago-compra-forma" class="block mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">Forma de pago</label>
                <select id="pago-compra-forma" v-model="pago.forma_pago" class="block w-full p-2 text-sm bg-white border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                  <option v-for="f in FORMAS_PAGO" :key="f.value" :value="f.value">{{ f.label }}</option>
                </select>
              </div>
              <div>
                <label for="pago-compra-ref" class="block mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">Comprobante</label>
                <input id="pago-compra-ref" v-model="pago.referencia" type="text" maxlength="100" class="block w-full p-2 text-sm border rounded dark:bg-gray-700 dark:text-white" :class="erroresPago.referencia ? 'bg-red-50 border-red-500' : 'bg-white border-gray-300 dark:border-gray-600'">
                <p v-if="erroresPago.referencia" class="mt-1 text-xs text-red-600 dark:text-red-400">{{ erroresPago.referencia }}</p>
              </div>
              <div class="flex items-end gap-2">
                <button type="submit" :disabled="guardando" class="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-white rounded bg-primary-700 hover:bg-primary-800 disabled:opacity-50">
                  <Loader2 v-if="guardando" class="w-4 h-4 animate-spin" />
                  Guardar
                </button>
                <button type="button" class="px-3 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600" @click="pagando = false">Cancelar</button>
              </div>
            </form>

            <p v-if="!compra.pagos.length" class="text-sm text-gray-500 dark:text-gray-400">Sin pagos registrados.</p>
            <ul v-else class="divide-y divide-gray-100 border border-gray-100 rounded-lg dark:divide-gray-700 dark:border-gray-700">
              <li v-for="p in compra.pagos" :key="p.id" class="flex items-start justify-between gap-3 px-4 py-2.5 text-sm" :class="p.anulado ? 'opacity-60' : ''">
                <div class="min-w-0">
                  <p class="font-medium text-gray-900 dark:text-white" :class="p.anulado ? 'line-through' : ''">{{ p.forma_pago_display }}<template v-if="p.referencia"> · {{ p.referencia }}</template></p>
                  <p class="text-xs text-gray-500 dark:text-gray-400">{{ formatDateTime(p.fecha) }} · {{ p.registrado_por_nombre || '—' }}<template v-if="p.observacion"> · {{ p.observacion }}</template></p>
                  <p v-if="p.anulado" class="text-xs text-red-700 dark:text-red-400">Anulado por {{ p.anulado_por_nombre || '—' }}: {{ p.motivo_anulacion }}</p>
                </div>
                <div class="flex items-center gap-1 shrink-0">
                  <span class="font-semibold tabular-nums" :class="p.anulado ? 'line-through' : ''">{{ formatCurrency(p.monto) }}</span>
                  <button
                    v-if="puedeModificar && vigente && !p.anulado"
                    type="button"
                    class="inline-flex items-center justify-center w-7 h-7 text-gray-400 rounded hover:bg-gray-100 hover:text-red-600 dark:hover:bg-gray-700"
                    title="Anular pago"
                    aria-label="Anular pago"
                    @click="pedirAnulacion('pago', p)">
                    <Ban class="w-4 h-4" />
                  </button>
                </div>
              </li>
            </ul>
          </div>

          <!-- Anulación (pago o compra) con motivo -->
          <div v-if="anulacion" class="p-4 space-y-2 border rounded-lg bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800/60">
            <p class="text-sm text-red-900 dark:text-red-100">
              <template v-if="anulacion.tipo === 'compra'">
                Anular la compra resta del stock lo que ingresó y anula sus pagos vigentes.
              </template>
              <template v-else>Anular el pago de {{ formatCurrency(anulacion.objeto.monto) }}.</template>
            </p>
            <label for="anular-motivo" class="block text-sm font-medium text-red-900 dark:text-red-100">Motivo <span class="text-accent-500 dark:text-accent-400">*</span></label>
            <div class="flex flex-col gap-2 sm:flex-row">
              <input id="anular-motivo" v-model="motivo" type="text" maxlength="255" class="block w-full p-2 text-sm bg-white border border-red-300 rounded sm:flex-1 dark:bg-gray-700 dark:border-red-700 dark:text-white" @keydown.enter.prevent="confirmarAnulacion">
              <div class="flex gap-2">
                <button type="button" :disabled="guardando" class="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-white bg-red-600 rounded hover:bg-red-700 disabled:opacity-50" @click="confirmarAnulacion">
                  <Loader2 v-if="guardando" class="w-4 h-4 animate-spin" />
                  Anular
                </button>
                <button type="button" class="px-3 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600" @click="anulacion = null">Cancelar</button>
              </div>
            </div>
            <p v-if="errorMotivo" class="text-sm text-red-700 dark:text-red-300">{{ errorMotivo }}</p>
          </div>
        </template>
      </div>

      <div class="flex items-center justify-between gap-3 border-t border-gray-200 px-6 py-4 dark:border-gray-700">
        <button
          v-if="compra && puedeModificar && vigente && !anulacion"
          type="button"
          class="inline-flex items-center gap-1.5 text-sm font-medium text-red-700 hover:underline dark:text-red-400"
          @click="pedirAnulacion('compra', compra)">
          <Ban class="w-4 h-4" />
          Anular compra
        </button>
        <span v-else></span>
        <button type="button" class="text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 font-medium text-sm px-4 py-2.5" @click="cerrar">
          Cerrar
        </button>
      </div>
    </div>
  </div>
</template>
