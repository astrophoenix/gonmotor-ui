<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import {
  ArrowRightLeft,
  CalendarPlus,
  Mail,
  MessageCircle,
  MoreHorizontal,
} from 'lucide-vue-next';

/**
 * Menú desplegable con las acciones secundarias de una cita.
 * Editar y eliminar se muestran siempre como botones en la fila, así que aquí
 * solo quedan compartir, avisos por WhatsApp/correo y convertir a recepción.
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
    class="inline-flex items-center p-2 text-gray-600 rounded border border-gray-200 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
    @click.stop="alternar"
  >
    <MoreHorizontal class="w-5 h-5" />
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

      <button
        type="button"
        role="menuitem"
        class="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
        @click="elegir('whatsapp')"
      >
        <MessageCircle class="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
        Enviar por WhatsApp
      </button>

      <button
        type="button"
        role="menuitem"
        class="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
        @click="elegir('correo')"
      >
        <Mail class="w-4 h-4 text-primary-600 dark:text-primary-400" />
        Enviar por correo
      </button>

      <div class="my-1 border-t border-gray-200 dark:border-gray-700" />

      <button
        type="button"
        role="menuitem"
        :disabled="!cita.es_convertible || disabled"
        class="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-300 dark:hover:bg-gray-700"
        @click="elegir('convertir')"
      >
        <ArrowRightLeft class="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
        Convertir a recepción
      </button>
    </div>
  </Teleport>
</template>
