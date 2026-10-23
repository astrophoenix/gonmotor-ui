<script setup>
import ModalCabecera from '@/shared/components/ModalCabecera.vue';
import { computed, reactive, ref, watch } from 'vue';
import { BellRing, PencilLine, Save } from 'lucide-vue-next';
import Alert from '../../../shared/components/Alert.vue';
import FichaCampos from '../../../shared/components/FichaCampos.vue';
import { formatDateOnly, formatDateTime, toIsoFromLocalInput, toLocalDatetimeInput } from '../../../shared/utils/datetime';
import { notificacionesService } from '../services/notificacionesService';
import { CANALES, canalLabel, tipoNotificacionLabel } from '../constants/notificaciones';
import EstadoNotificacionBadge from './EstadoNotificacionBadge.vue';

/**
 * Ficha de una notificación de la cola. Si está PENDIENTE y el usuario puede
 * modificar, permite cambiar canal, fecha de envío, asunto, mensaje y (en un
 * mantenimiento) el objetivo. Contrato de modales: no se cierra al hacer clic
 * fuera y pide confirmar antes de descartar cambios.
 */
const props = defineProps({
  modelValue: { type: Boolean, default: false },
  notificacion: { type: Object, default: null },
  soloLectura: { type: Boolean, default: false },
});

const emit = defineEmits(['update:modelValue', 'updated']);

const form = reactive({
  canal: 'whatsapp',
  fecha_programada: '',
  asunto: '',
  mensaje: '',
  km_objetivo: '',
  fecha_tope: '',
});

const isSaving = ref(false);
const errorMessage = ref('');
const fieldErrors = ref({});
const snapshot = ref('');
const showDiscardWarning = ref(false);

const editable = computed(() => !props.soloLectura && props.notificacion?.estado === 'PENDIENTE');
const esMantenimiento = computed(() => props.notificacion?.tipo === 'MANTENIMIENTO');
const hasChanges = computed(() => snapshot.value !== JSON.stringify(form));

const camposFicha = computed(() => {
  const n = props.notificacion;
  if (!n) return [];
  return [
    { etiqueta: 'Tipo', valor: tipoNotificacionLabel(n.tipo, n.tipo_display) },
    { etiqueta: 'Origen', valor: n.origen_display },
    { etiqueta: 'Cliente', valor: n.cliente_nombre },
    { etiqueta: 'Vehículo', valor: n.vehiculo_resumen },
    ...(n.orden_numero ? [{ etiqueta: 'Orden de trabajo', valor: n.orden_numero }] : []),
    ...(n.campana_nombre ? [{ etiqueta: 'Campaña', valor: n.campana_nombre }] : []),
    { etiqueta: 'Canal preferido', valor: canalLabel(n.canal) },
    { etiqueta: n.estado === 'ENVIADA' ? 'Enviada el' : 'Enviar a partir de', valor: formatDateTime(n.fecha_envio || n.fecha_programada) },
    ...(n.km_objetivo ? [{ etiqueta: 'Kilometraje objetivo', valor: `${Number(n.km_objetivo).toLocaleString('es-EC')} km` }] : []),
    ...(n.fecha_tope ? [{ etiqueta: 'Fecha tope', valor: formatDateOnly(n.fecha_tope) }] : []),
    { etiqueta: 'Intentos', valor: String(n.intentos ?? 0) },
    ...(n.ultimo_error ? [{ etiqueta: 'Último error', valor: n.ultimo_error, ancho: 'completo' }] : []),
    ...(n.asunto ? [{ etiqueta: 'Asunto (correo)', valor: n.asunto, ancho: 'completo' }] : []),
    { etiqueta: 'Mensaje', valor: n.mensaje, ancho: 'completo' },
  ];
});

function cargar() {
  const n = props.notificacion || {};
  form.canal = n.canal || 'whatsapp';
  form.fecha_programada = toLocalDatetimeInput(n.fecha_programada);
  form.asunto = n.asunto || '';
  form.mensaje = n.mensaje || '';
  form.km_objetivo = n.km_objetivo ?? '';
  form.fecha_tope = n.fecha_tope || '';
  snapshot.value = JSON.stringify(form);
  errorMessage.value = '';
  fieldErrors.value = {};
  showDiscardWarning.value = false;
}

watch(() => props.modelValue, (abierto) => {
  if (abierto) cargar();
});

function validar() {
  const errores = {};
  if (!form.fecha_programada) errores.fecha_programada = 'Indica cuándo enviar el mensaje.';
  if (!form.mensaje.trim()) errores.mensaje = 'El mensaje no puede quedar vacío.';
  fieldErrors.value = errores;
  return Object.keys(errores).length === 0;
}

function aplicarErroresBackend(data) {
  if (!data || typeof data !== 'object') return;
  const errores = { ...fieldErrors.value };
  Object.entries(data).forEach(([clave, valor]) => {
    if (Array.isArray(valor) && valor.length) errores[clave] = valor[0];
    else if (typeof valor === 'string' && clave !== 'detail') errores[clave] = valor;
  });
  fieldErrors.value = errores;
}

async function guardar() {
  errorMessage.value = '';
  if (!validar()) return;
  isSaving.value = true;
  try {
    const payload = {
      canal: form.canal,
      fecha_programada: toIsoFromLocalInput(form.fecha_programada),
      asunto: form.asunto,
      mensaje: form.mensaje,
    };
    if (esMantenimiento.value) {
      payload.km_objetivo = form.km_objetivo === '' ? null : Number(form.km_objetivo);
      payload.fecha_tope = form.fecha_tope || null;
    }
    const actualizada = await notificacionesService.actualizarProgramada(props.notificacion.id, payload);
    emit('updated', actualizada);
  } catch (error) {
    errorMessage.value = error.message || 'No se pudo guardar la notificación.';
    aplicarErroresBackend(error.data);
  } finally {
    isSaving.value = false;
  }
}

function cerrar() {
  if (editable.value && hasChanges.value && !isSaving.value && !showDiscardWarning.value) {
    showDiscardWarning.value = true;
    return;
  }
  showDiscardWarning.value = false;
  emit('update:modelValue', false);
}

const INPUT = 'block w-full px-3 py-2 bg-white border border-gray-300 text-sm rounded focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white';
const INPUT_ERROR = 'block w-full px-3 py-2 bg-white border border-red-500 text-sm rounded focus:ring-red-500 focus:border-red-500 dark:bg-gray-700 dark:text-white';
const ETIQUETA = 'block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300';
</script>

<template>
  <div v-if="modelValue && notificacion" class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4">
    <div class="relative w-full max-w-2xl rounded-lg bg-white shadow-xl dark:bg-gray-800 my-auto">
      <ModalCabecera
        :icono="editable ? PencilLine : BellRing"
        :titulo="editable ? 'Editar notificación' : 'Detalle de la notificación'"
        @cerrar="cerrar"
      >
        <template #titulo>
          <EstadoNotificacionBadge :estado="notificacion.estado" :estado-display="notificacion.estado_display" size="sm" />
        </template>
      </ModalCabecera>

      <div class="px-6 py-4">
        <Alert v-if="errorMessage" type="error" :message="errorMessage" dismissible @dismiss="errorMessage = ''" />
        <Alert
          v-if="showDiscardWarning"
          type="info"
          title="Cambios sin guardar"
          message="Puedes seguir editando o cerrar de nuevo para descartar los cambios."
          dismissible
          @dismiss="showDiscardWarning = false"
        />

        <FichaCampos v-if="!editable" :campos="camposFicha" />

        <div v-else class="grid grid-cols-6 gap-4">
          <p class="col-span-6 text-sm text-gray-600 dark:text-gray-300">
            {{ tipoNotificacionLabel(notificacion.tipo, notificacion.tipo_display) }} para
            <span class="font-semibold text-gray-900 dark:text-white">{{ notificacion.cliente_nombre || 'el cliente' }}</span>
            <template v-if="notificacion.vehiculo_resumen"> · {{ notificacion.vehiculo_resumen }}</template>
          </p>

          <div class="col-span-6 sm:col-span-3">
            <label for="notif_fecha" :class="ETIQUETA">Enviar a partir de <span class="text-accent-500 dark:text-accent-400">*</span></label>
            <input id="notif_fecha" v-model="form.fecha_programada" type="datetime-local" :class="fieldErrors.fecha_programada ? INPUT_ERROR : INPUT" />
            <p v-if="fieldErrors.fecha_programada" class="mt-1 text-sm text-red-600 dark:text-red-400">{{ fieldErrors.fecha_programada }}</p>
          </div>

          <div class="col-span-6 sm:col-span-3">
            <label for="notif_canal" :class="ETIQUETA">Canal preferido</label>
            <select id="notif_canal" v-model="form.canal" :class="INPUT">
              <option v-for="opcion in CANALES" :key="opcion.value" :value="opcion.value">{{ opcion.label }}</option>
            </select>
          </div>

          <template v-if="esMantenimiento">
            <div class="col-span-6 sm:col-span-3">
              <label for="notif_km" :class="ETIQUETA">Kilometraje objetivo</label>
              <input id="notif_km" v-model="form.km_objetivo" type="number" min="1" step="1" :class="fieldErrors.km_objetivo ? INPUT_ERROR : INPUT" />
              <p v-if="fieldErrors.km_objetivo" class="mt-1 text-sm text-red-600 dark:text-red-400">{{ fieldErrors.km_objetivo }}</p>
            </div>
            <div class="col-span-6 sm:col-span-3">
              <label for="notif_tope" :class="ETIQUETA">Fecha tope</label>
              <input id="notif_tope" v-model="form.fecha_tope" type="date" :class="fieldErrors.fecha_tope ? INPUT_ERROR : INPUT" />
              <p v-if="fieldErrors.fecha_tope" class="mt-1 text-sm text-red-600 dark:text-red-400">{{ fieldErrors.fecha_tope }}</p>
            </div>
          </template>

          <div class="col-span-6">
            <label for="notif_asunto" :class="ETIQUETA">Asunto (solo correo)</label>
            <input id="notif_asunto" v-model="form.asunto" type="text" maxlength="200" :class="INPUT" />
          </div>

          <div class="col-span-6">
            <label for="notif_mensaje" :class="ETIQUETA">Mensaje <span class="text-accent-500 dark:text-accent-400">*</span></label>
            <textarea id="notif_mensaje" v-model="form.mensaje" rows="5" :class="fieldErrors.mensaje ? INPUT_ERROR : INPUT"></textarea>
            <p v-if="fieldErrors.mensaje" class="mt-1 text-sm text-red-600 dark:text-red-400">{{ fieldErrors.mensaje }}</p>
          </div>
        </div>
      </div>

      <div class="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4 dark:border-gray-700">
        <button
          type="button"
          class="text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 focus:ring-4 focus:ring-gray-200 font-medium text-sm px-4 py-2.5"
          :disabled="isSaving"
          @click="cerrar"
        >
          {{ editable ? 'Cancelar' : 'Cerrar' }}
        </button>
        <button
          v-if="editable"
          type="button"
          :disabled="isSaving"
          class="inline-flex items-center gap-1.5 text-white bg-primary-700 rounded hover:bg-primary-800 focus:ring-4 focus:ring-primary-300 shadow-xs font-medium text-sm px-4 py-2.5 disabled:opacity-50"
          @click="guardar"
        >
          <Save class="w-5 h-5" />
          {{ isSaving ? 'Guardando...' : 'Actualizar' }}
        </button>
      </div>
    </div>
  </div>
</template>
