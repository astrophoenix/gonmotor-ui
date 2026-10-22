<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import {
  ArrowRightLeft,
  CalendarPlus,
  Mail,
  MessageCircle,
  MoreVertical,
} from 'lucide-vue-next';
import { usePermisos } from '../../../shared/composables/usePermisos';

/**
 * Menú desplegable con las acciones secundarias de una cita.
 * Editar y eliminar se muestran siempre como botones en la fila, así que aquí
 * solo quedan compartir, avisos al cliente por WhatsApp/correo y convertir a recepción.
 *
 * El menú se teletransporta a `body` y se posiciona de forma fija: la tabla vive
 * dentro de contenedores con `overflow-x-auto`, que recortarían el desplegable.
 */
const props = defineProps({
  cita: {
    type: Object,
    required: true,
  },
  /** Bloquea todo el menú (mientras se elimina/convirtiere otra cita). */
  disabled: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['accion']);

const { puede } = usePermisos();

// Convertir crea una recepción y cambia la cita: hace falta poder hacer ambas
// cosas. Sin ese permiso la opción no se muestra (no es algo que el rol haga).
const puedeConvertir = computed(() => puede('citas') && puede('recepciones'));

// Si el rol puede convertir pero el estado de la cita no lo permite, la opción
// se ve deshabilitada con el motivo: es una restricción del momento, no del rol.
const motivoNoConvertible = computed(() => {
  if (props.cita.es_convertible) return '';
  if (props.cita.recepcion_generada) {
    return `Ya generó la recepción ${props.cita.recepcion_generada_numero || ''}`.trim();
  }
  return `La cita está ${String(props.cita.estado_display || '').toLowerCase()}`;
});

// Avisar al cliente depende del permiso de notificaciones; solo una cita
// programada o confirmada admite el aviso (restricción del estado: se muestra
// deshabilitada con el motivo).
const puedeAvisar = computed(() => puede('notificaciones', 'modificar'));
const motivoNoAvisable = computed(() => (
  ['PROGRAMADA', 'CONFIRMADA'].includes(props.cita.estado)
    ? ''
    : `La cita está ${String(props.cita.estado_display || '').toLowerCase()}`
));

const ANCHO_MENU = 240;
const MARGEN_VENTANA = 8;

const abierto = ref(false);
const botonRef = ref(null);
const menuRef = ref(null);
const posicion = ref({ top: 0, left: 0 });

/** Coloca el menú junto al botón; si no cabe debajo, se abre hacia arriba. */
function medir() {
  const boton = botonRef.value;
  if (!boton) return;

  const rect = boton.getBoundingClientRect();
  const alto = menuRef.value ? menuRef.value.offsetHeight : 190;

  let top = rect.bottom + 4;
  if (top + alto > window.innerHeight - MARGEN_VENTANA) {
    top = rect.top - alto - 4;
  }
  top = Math.min(Math.max(top, MARGEN_VENTANA), Math.max(MARGEN_VENTANA, window.innerHeight - alto - MARGEN_VENTANA));

  const left = Math.min(
    Math.max(rect.right - ANCHO_MENU, MARGEN_VENTANA),
    Math.max(MARGEN_VENTANA, window.innerWidth - ANCHO_MENU - MARGEN_VENTANA)
  );

  posicion.value = { top, left };
}

async function abrir() {
  abierto.value = true;
  await nextTick();
  medir();
  window.addEventListener('resize', medir);
  window.addEventListener('scroll', medir, true);
}

function cerrar() {
  abierto.value = false;
  window.removeEventListener('resize', medir);
  window.removeEventListener('scroll', medir, true);
}

function alternar() {
  if (abierto.value) {
    cerrar();
    return;
  }
  if (props.disabled) return;
  abrir();
}

function elegir(tipo) {
  cerrar();
  emit('accion', tipo);
}

function onTecla(event) {
  if (event.key === 'Escape' && abierto.value) cerrar();
}

onMounted(() => document.addEventListener('keydown', onTecla));

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onTecla);
  cerrar();
});
</script>

<template>
  <button
    ref="botonRef"
    type="button"
    title="Más acciones"
    aria-label="Más acciones de la cita"
    :aria-expanded="abierto"
    :disabled="disabled"
    class="inline-flex items-center p-2 rounded-lg text-slate-500 hover:bg-brand-100 hover:text-brand-900 hover:ring-1 hover:ring-inset hover:ring-brand-200 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-400 dark:hover:bg-gray-600 dark:hover:text-white dark:hover:ring-gray-500 aria-expanded:bg-brand-100 aria-expanded:text-brand-900 aria-expanded:ring-1 aria-expanded:ring-inset aria-expanded:ring-brand-200 dark:aria-expanded:bg-gray-600 dark:aria-expanded:text-white dark:aria-expanded:ring-gray-500"
    @click.stop="alternar"
  >
    <MoreVertical class="w-4 h-4" />
  </button>

  <Teleport to="body">
    <div
      v-if="abierto"
      class="fixed inset-0 z-40"
      @click="cerrar"
      @contextmenu.prevent="cerrar"
    />

    <div
      v-if="abierto"
      ref="menuRef"
      class="fixed z-50 w-60 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800"
      :style="{ top: `${posicion.top}px`, left: `${posicion.left}px` }"
      role="menu"
    >
      <button
        type="button"
        role="menuitem"
        class="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
        @click="elegir('compartir')"
      >
        <CalendarPlus class="w-4 h-4 text-primary-600 dark:text-primary-400" />
        Compartir / agregar al calendario
      </button>

      <template v-if="puedeAvisar">
        <button
          v-for="opcion in [{ tipo: 'whatsapp', label: 'Avisar por WhatsApp', icon: MessageCircle, color: 'text-emerald-600 dark:text-emerald-400' }, { tipo: 'correo', label: 'Avisar por correo', icon: Mail, color: 'text-primary-600 dark:text-primary-400' }]"
          :key="opcion.tipo"
          type="button"
          role="menuitem"
          :disabled="Boolean(motivoNoAvisable) || disabled"
          class="group flex w-full items-start gap-3 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:hover:bg-transparent dark:text-gray-300 dark:hover:bg-gray-700"
          @click="elegir(opcion.tipo)"
        >
          <component :is="opcion.icon" :class="['w-4 h-4 mt-0.5 group-disabled:opacity-40', opcion.color]" />
          <span>
            <span class="block group-disabled:opacity-40">{{ opcion.label }}</span>
            <span v-if="motivoNoAvisable" class="block text-xs text-gray-500 dark:text-gray-400">{{ motivoNoAvisable }}</span>
          </span>
        </button>
      </template>

      <template v-if="puedeConvertir">
        <div class="my-1 border-t border-gray-200 dark:border-gray-700" />

        <button
          type="button"
          role="menuitem"
          :disabled="!cita.es_convertible || disabled"
          class="group flex w-full items-start gap-3 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:hover:bg-transparent dark:text-gray-300 dark:hover:bg-gray-700"
          @click="elegir('convertir')"
        >
          <ArrowRightLeft class="w-4 h-4 mt-0.5 text-emerald-600 group-disabled:opacity-40 dark:text-emerald-400" />
          <span>
            <span class="block group-disabled:opacity-40">Convertir a recepción</span>
            <span v-if="motivoNoConvertible" class="block text-xs text-gray-500 dark:text-gray-400">{{ motivoNoConvertible }}</span>
          </span>
        </button>
      </template>
    </div>
  </Teleport>
</template>
