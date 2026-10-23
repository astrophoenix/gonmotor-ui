<script setup>
import { computed, onMounted, reactive } from 'vue';
import { Loader2, MessageCircle, RefreshCw, Send, Settings2 } from 'lucide-vue-next';
import FichaCampos from '../../../shared/components/FichaCampos.vue';
import { useNotificaciones } from '../composables/useNotificaciones';

/**
 * Proveedor de WhatsApp, preferencias de los avisos y mensaje de prueba.
 * Cambiar algo exige administrar la empresa
 * (`puedeConfigurar`); sin ese permiso las preferencias se muestran como ficha.
 */
const props = defineProps({
  puedeConfigurar: { type: Boolean, default: false },
});

const emit = defineEmits(['aviso']);

const {
  isLoadingEstado,
  isSending,
  isGuardandoPreferencias,
  configuracion,
  preferencias,
  fetchEstado,
  enviarPrueba,
  guardarPreferencias,
} = useNotificaciones();

const prueba = reactive({ celular: '', mensaje: '' });

const formPreferencias = reactive({
  intervalo_km: 5000,
  intervalo_meses: 6,
  dias_antelacion: 7,
  frecuencia_dias: 30,
  notificaciones_activas: true,
  recordatorios_cita_activos: true,
  mensaje_plantilla: '',
});

const modoLabel = computed(() => {
  const modo = configuracion.value?.modo;
  if (modo === 'mock') return 'Modo de prueba (mock) — sin costo';
  if (modo === 'twilio_sandbox') return 'Twilio WhatsApp Sandbox';
  if (modo === 'meta_api') return 'Meta WhatsApp Cloud API';
  return modo || '';
});

const estadoProveedorClass = computed(() => {
  if (!configuracion.value) return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
  return configuracion.value.configurado
    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
});

const siNo = (valor) => (valor ? 'Sí' : 'No');

const camposPreferencias = computed(() => [
  { etiqueta: 'Intervalo de mantenimiento', valor: `${formPreferencias.intervalo_km} km` },
  { etiqueta: 'Tope por tiempo', valor: `${formPreferencias.intervalo_meses} meses` },
  { etiqueta: 'Antelación del aviso', valor: `${formPreferencias.dias_antelacion} días` },
  { etiqueta: 'Avisos de mantenimiento automáticos', valor: siNo(formPreferencias.notificaciones_activas) },
  { etiqueta: 'Recordatorios de cita (24 h y 2 h)', valor: siNo(formPreferencias.recordatorios_cita_activos) },
  { etiqueta: 'Plantilla del mensaje', valor: formPreferencias.mensaje_plantilla, ancho: 'completo' },
]);

function aplicarPreferenciasEnForm() {
  const p = preferencias.value;
  if (!p) return;
  formPreferencias.intervalo_km = p.intervalo_km ?? 5000;
  formPreferencias.intervalo_meses = p.intervalo_meses ?? 6;
  formPreferencias.dias_antelacion = p.dias_antelacion ?? 7;
  formPreferencias.frecuencia_dias = p.frecuencia_dias ?? 30;
  formPreferencias.notificaciones_activas = Boolean(p.notificaciones_activas);
  formPreferencias.recordatorios_cita_activos = Boolean(p.recordatorios_cita_activos);
  formPreferencias.mensaje_plantilla = p.mensaje_plantilla || '';
}

async function init() {
  try {
    await fetchEstado();
    aplicarPreferenciasEnForm();
  } catch (error) {
    emit('aviso', { type: 'error', message: error.message });
  }
}

async function onEnviarPrueba() {
  if (!prueba.celular.trim()) {
    emit('aviso', { type: 'error', message: 'Escribe un número de teléfono para la prueba.' });
    return;
  }
  try {
    const resultado = await enviarPrueba({ celular: prueba.celular.trim(), mensaje: prueba.mensaje.trim() });
    if (resultado?.ok) {
      emit('aviso', { type: 'success', message: resultado.descripcion || 'Mensaje de prueba procesado correctamente.' });
      prueba.mensaje = '';
    } else {
      emit('aviso', { type: 'error', message: resultado?.descripcion || 'No se pudo enviar el mensaje de prueba.' });
    }
  } catch (error) {
    emit('aviso', { type: 'error', message: error.message });
  }
}

async function onGuardarPreferencias() {
  try {
    await guardarPreferencias({
      intervalo_km: Number(formPreferencias.intervalo_km) || 5000,
      intervalo_meses: Number(formPreferencias.intervalo_meses) || 6,
      dias_antelacion: Number(formPreferencias.dias_antelacion) || 0,
      frecuencia_dias: Number(formPreferencias.frecuencia_dias) || 30,
      notificaciones_activas: formPreferencias.notificaciones_activas,
      recordatorios_cita_activos: formPreferencias.recordatorios_cita_activos,
      mensaje_plantilla: formPreferencias.mensaje_plantilla,
    });
    aplicarPreferenciasEnForm();
    emit('aviso', { type: 'success', message: 'Preferencias guardadas correctamente.' });
  } catch (error) {
    emit('aviso', { type: 'error', message: error.message });
  }
}

const TARJETA = 'p-6 bg-white rounded-lg border border-gray-200 shadow-sm dark:bg-gray-800 dark:border-gray-700';
const TITULO = 'flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white mb-4';
const INPUT = 'block w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-gray-50 text-gray-900 focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white';
const ETIQUETA = 'block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300';
const BOTON_PRIMARIO = 'inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded bg-primary-700 hover:bg-primary-800 focus:ring-4 focus:ring-primary-300 disabled:opacity-50 disabled:cursor-wait';

onMounted(init);
</script>

<template>
  <div class="space-y-4">
    <div :class="TARJETA">
      <div class="flex flex-wrap items-center gap-2">
        <span class="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full" :class="estadoProveedorClass">
          <Loader2 v-if="isLoadingEstado" class="w-3.5 h-3.5 animate-spin" />
          <RefreshCw v-else class="w-3.5 h-3.5" />
          {{ configuracion?.modo || 'cargando…' }}
        </span>
        <span class="text-sm text-gray-600 dark:text-gray-300">{{ modoLabel }}</span>
      </div>
      <p v-if="configuracion?.descripcion" class="mt-2 text-sm text-gray-500 dark:text-gray-400">{{ configuracion.descripcion }}</p>
    </div>

    <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <!-- Preferencias -->
      <div :class="TARJETA">
        <h2 :class="TITULO">
          <Settings2 class="w-5 h-5 text-brand-700 dark:text-brand-200" />
          Preferencias de los avisos
        </h2>
        <FichaCampos v-if="!props.puedeConfigurar" :campos="camposPreferencias" />
        <template v-else>
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label :class="ETIQUETA" for="pf-intervalo">Intervalo (km)</label>
              <input id="pf-intervalo" v-model.number="formPreferencias.intervalo_km" type="number" min="1" :class="INPUT" />
            </div>
            <div>
              <label :class="ETIQUETA" for="pf-meses">Tope (meses)</label>
              <input id="pf-meses" v-model.number="formPreferencias.intervalo_meses" type="number" min="1" :class="INPUT" />
            </div>
            <div>
              <label :class="ETIQUETA" for="pf-antelacion">Antelación (días)</label>
              <input id="pf-antelacion" v-model.number="formPreferencias.dias_antelacion" type="number" min="0" :class="INPUT" />
            </div>
          </div>
          <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Al entregar una orden se programa el próximo mantenimiento con estos valores, salvo que los servicios realizados definan su propio intervalo.
          </p>
          <label class="flex items-start mt-4 text-sm text-gray-700 dark:text-gray-300">
            <input v-model="formPreferencias.notificaciones_activas" type="checkbox" class="mt-0.5 mr-2 w-4 h-4 rounded border-gray-300 text-brand-700 dark:bg-gray-700" />
            Programar avisos de mantenimiento al entregar una orden
          </label>
          <label class="flex items-start mt-2 text-sm text-gray-700 dark:text-gray-300">
            <input v-model="formPreferencias.recordatorios_cita_activos" type="checkbox" class="mt-0.5 mr-2 w-4 h-4 rounded border-gray-300 text-brand-700 dark:bg-gray-700" />
            Recordar las citas 24 h y 2 h antes
          </label>
          <label :class="[ETIQUETA, 'mt-4']" for="pf-plantilla">Plantilla del mensaje de mantenimiento</label>
          <textarea
            id="pf-plantilla"
            v-model="formPreferencias.mensaje_plantilla"
            rows="4"
            placeholder="{cliente}, {empresa}, {marca}, {modelo}, {placa}, {kilometraje}"
            :class="[INPUT, 'mb-2']"
          ></textarea>
          <p class="mb-3 text-xs text-gray-400">Placeholders: {cliente} {empresa} {marca} {modelo} {placa} {kilometraje}</p>
          <button type="button" :disabled="isGuardandoPreferencias" :class="BOTON_PRIMARIO" @click="onGuardarPreferencias">
            <Loader2 v-if="isGuardandoPreferencias" class="w-4 h-4 animate-spin" />
            <Settings2 v-else class="w-4 h-4" />
            Guardar preferencias
          </button>
        </template>
      </div>

      <!-- Mensaje de prueba -->
      <div v-if="props.puedeConfigurar" :class="TARJETA">
        <h2 :class="TITULO">
          <Send class="w-5 h-5 text-brand-700 dark:text-brand-200" />
          Mensaje de prueba
        </h2>
        <p class="mb-4 text-sm text-gray-500 dark:text-gray-400">
          Verifica la integración enviando un mensaje a tu propio número de WhatsApp.
        </p>
        <label :class="ETIQUETA" for="prueba-celular">Número de WhatsApp (ej. 0991234567)</label>
        <input id="prueba-celular" v-model="prueba.celular" type="tel" placeholder="0991234567" :class="[INPUT, 'mb-3']" />
        <label :class="ETIQUETA" for="prueba-mensaje">Mensaje (opcional)</label>
        <textarea id="prueba-mensaje" v-model="prueba.mensaje" rows="3" placeholder="Mensaje de prueba desde Gonmotor…" :class="[INPUT, 'mb-4']"></textarea>
        <button type="button" :disabled="isSending" :class="BOTON_PRIMARIO" @click="onEnviarPrueba">
          <Loader2 v-if="isSending" class="w-4 h-4 animate-spin" />
          <MessageCircle v-else class="w-4 h-4" />
          Enviar prueba
        </button>
      </div>
    </div>
  </div>
</template>
