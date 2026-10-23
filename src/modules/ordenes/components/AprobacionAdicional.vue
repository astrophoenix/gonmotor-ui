<script setup>
import { computed, ref } from 'vue';
import { X } from 'lucide-vue-next';
import Alert from '../../../shared/components/Alert.vue';
import ConfirmModal from '../../../shared/components/ConfirmModal.vue';
import { ordenesService } from '../services/ordenesService';
import { formatCurrency, formatNumber } from '../../../shared/utils/format';
import { formatDateTime } from '../../../shared/utils/datetime';

const props = defineProps({
  linea: { type: Object, required: true },
  tipo: { type: String, required: true },
  pendiente: { type: Boolean, default: false },
  puedeAprobar: { type: Boolean, default: false },
});
const emit = defineEmits(['aprobada']);
const abierto = ref(false);
const confirmarDescarte = ref(false);
const guardando = ref(false);
const error = ref('');
const erroresCampos = ref({});
const medio = ref('');
const fecha = ref('');
const fechaInicial = ref('');
const etiqueta = computed(() => props.pendiente ? 'Adicional pendiente de aprobación' : 'Adicional aprobado');

function abrir() {
  const ahora = new Date();
  fecha.value = new Date(ahora.getTime() - ahora.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  fechaInicial.value = fecha.value;
  medio.value = '';
  error.value = '';
  erroresCampos.value = {};
  abierto.value = true;
}
function cerrar() {
  if (guardando.value) return;
  if (medio.value || fecha.value !== fechaInicial.value) confirmarDescarte.value = true;
  else abierto.value = false;
}
async function guardar() {
  if (guardando.value) return;
  error.value = '';
  erroresCampos.value = {};
  if (!medio.value || !fecha.value || Number.isNaN(new Date(fecha.value).getTime())) {
    error.value = 'Indica el medio y la fecha de aprobación del cliente.';
    return;
  }
  guardando.value = true;
  try {
    await ordenesService.aprobarAdicional(props.tipo, props.linea.id, {
      version_aprobacion: props.linea.version_aprobacion,
      medio_aprobacion: medio.value,
      fecha_aprobacion: new Date(fecha.value).toISOString(),
    });
    abierto.value = false;
    emit('aprobada');
  } catch (err) {
    error.value = err.message || 'No se pudo registrar la aprobación.';
    for (const campo of ['medio_aprobacion', 'fecha_aprobacion']) {
      if (err.data?.[campo]) erroresCampos.value[campo] = [].concat(err.data[campo]).join(' ');
    }
  } finally {
    guardando.value = false;
  }
}
</script>

<template>
  <div v-if="linea.es_adicional" class="mt-2 space-y-1 text-xs">
    <span class="inline-flex rounded px-2 py-1 font-medium" :class="pendiente ? 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200' : 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200'">{{ etiqueta }}</span>
    <p v-if="pendiente" class="text-brand-500 dark:text-brand-300">Importe propuesto; no incluido en el total ni en el saldo.</p>
    <p v-else class="text-brand-500 dark:text-brand-300">
      {{ { WHATSAPP: 'WhatsApp', LLAMADA: 'Llamada', PRESENCIAL: 'Presencial', EMAIL: 'Correo', OTRO: 'Otro' }[linea.medio_aprobacion] }}
      · {{ formatDateTime(linea.fecha_aprobacion) }} · {{ linea.aprobado_por_nombre || 'Usuario no disponible' }}
    </p>
    <button v-if="pendiente && puedeAprobar && linea.id" type="button" class="px-3 py-2 text-sm font-medium text-white rounded-lg bg-primary-700 hover:bg-primary-800 dark:bg-primary-600 dark:hover:bg-primary-500" @click="abrir">Registrar aprobación</button>
  </div>

  <Teleport to="body">
    <div v-if="abierto" class="patio-screen fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4" @keydown.esc="cerrar">
      <section role="dialog" aria-modal="true" :aria-labelledby="`aprobacion-${tipo}-${linea.id}`" class="relative mx-auto my-6 w-full max-w-lg rounded-lg border border-brand-200 bg-white p-4 shadow-xl dark:border-brand-700 dark:bg-brand-900 dark:text-white">
        <button type="button" aria-label="Cerrar" class="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-lg hover:bg-brand-100 dark:hover:bg-brand-700" :disabled="guardando" @click="cerrar"><X class="h-5 w-5" /></button>
        <h2 :id="`aprobacion-${tipo}-${linea.id}`" class="mb-4 pr-10 text-lg font-semibold">Registrar aprobación del cliente</h2>
        <p class="mb-3 break-words text-sm">{{ linea.descripcion }}</p>
        <div class="mb-4 rounded-lg bg-brand-50 p-3 text-sm dark:bg-brand-800">
          <p>{{ tipo === 'svc' && !linea.es_subcontratado ? 'Horas' : 'Cantidad' }}: {{ formatNumber(linea.es_subcontratado ? linea.cantidad : (linea.horas_aplicadas ?? linea.cantidad)) }} × {{ formatCurrency(linea.precio_unitario) }}</p>
          <p>Descuento: {{ formatCurrency(linea.descuento) }} · IVA: {{ formatNumber(Number(linea.iva_porcentaje) * 100, 0) }} %</p>
          <p class="mt-1 font-semibold">Adicional con IVA: {{ formatCurrency(Number(linea.subtotal) + Number(linea.monto_iva ?? Number(linea.subtotal) * Number(linea.iva_porcentaje))) }}</p>
        </div>
        <Alert v-if="error" type="error" :message="error" class="mb-4" />
        <form class="space-y-4" @submit.prevent="guardar">
          <label class="block text-sm font-medium">Medio de aprobación
            <select v-model="medio" :aria-invalid="Boolean(erroresCampos.medio_aprobacion)" required :disabled="guardando" class="mt-1 block w-full rounded-lg border border-brand-300 bg-white p-2.5 text-base dark:border-brand-500 dark:bg-brand-800">
              <option value="">Selecciona el medio</option>
              <option value="WHATSAPP">WhatsApp</option><option value="LLAMADA">Llamada</option><option value="PRESENCIAL">Presencial</option><option value="EMAIL">Correo</option><option value="OTRO">Otro</option>
            </select>
            <span v-if="erroresCampos.medio_aprobacion" class="mt-1 block text-red-600 dark:text-red-400">{{ erroresCampos.medio_aprobacion }}</span>
          </label>
          <label class="block text-sm font-medium">Fecha y hora de aprobación
            <input v-model="fecha" :aria-invalid="Boolean(erroresCampos.fecha_aprobacion)" type="datetime-local" required :disabled="guardando" class="mt-1 block w-full min-w-0 rounded-lg border border-brand-300 bg-white p-2.5 text-base dark:border-brand-500 dark:bg-brand-800" />
            <span v-if="erroresCampos.fecha_aprobacion" class="mt-1 block text-red-600 dark:text-red-400">{{ erroresCampos.fecha_aprobacion }}</span>
          </label>
          <p class="text-sm text-brand-500 dark:text-brand-300">Confirma que el cliente aprobó esta propuesta. El importe se sumará al total y al saldo de la orden.</p>
          <div class="flex flex-wrap justify-end gap-2">
            <button type="button" :disabled="guardando" class="min-h-11 rounded-lg border border-brand-300 px-3 py-2 text-sm" @click="cerrar">Cancelar</button>
            <button type="submit" :disabled="guardando" class="min-h-11 rounded-lg bg-primary-700 hover:bg-primary-800 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-primary-600">{{ guardando ? 'Guardando…' : 'Confirmar aprobación' }}</button>
          </div>
        </form>
      </section>
    </div>
    <ConfirmModal v-model="confirmarDescarte" title="Descartar aprobación sin guardar" message="Los datos de aprobación ingresados se perderán. ¿Deseas cerrar?" confirm-text="Descartar" @confirm="abierto = false; confirmarDescarte = false" />
  </Teleport>
</template>
