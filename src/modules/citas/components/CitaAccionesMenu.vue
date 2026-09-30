<script setup>
import { ref } from 'vue';
import {
  ArrowRightLeft,
  CalendarPlus,
  Mail,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Trash2,
} from 'lucide-vue-next';

defineProps({
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

const abierto = ref(false);

function elegir(tipo) {
  abierto.value = false;
  emit('accion', tipo);
}
</script>

<template>
  <div class="relative inline-block text-left align-middle">
    <div v-if="abierto" class="fixed inset-0 z-30 cursor-default" @click="abierto = false" />
    <button
      type="button"
      title="Acciones de la cita"
      aria-label="Acciones de la cita"
      :aria-expanded="abierto"
      :disabled="disabled"
      class="inline-flex items-center p-2 text-gray-600 rounded-lg hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-300 dark:hover:bg-gray-700"
      @click.stop="abierto = !abierto"
    >
      <MoreHorizontal class="w-5 h-5" />
    </button>

    <div
      v-if="abierto"
      class="absolute right-0 z-40 mt-1 w-60 origin-top-right rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800"
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

      <button
        type="button"
        role="menuitem"
        :disabled="!cita.es_convertible"
        class="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-300 dark:hover:bg-gray-700"
        @click="elegir('editar')"
      >
        <Pencil class="w-4 h-4 text-primary-600 dark:text-primary-400" />
        Editar cita
      </button>

      <button
        type="button"
        role="menuitem"
        :disabled="disabled"
        class="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 dark:text-red-400 dark:hover:bg-gray-700"
        @click="elegir('eliminar')"
      >
        <Trash2 class="w-4 h-4" />
        Eliminar cita
      </button>
    </div>
  </div>
</template>
