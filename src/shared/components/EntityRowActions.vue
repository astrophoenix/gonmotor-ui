<script setup>
// Botones Editar / Eliminar de una fila en la columna "Acciones" de los listados.
// Renderiza solo los dos botones (sin contenedor) para convivir dentro del mismo
// flex con otras acciones de la fila (reactivar, WhatsApp, EntityActionsMenu…).
import { Pen, Trash2 } from 'lucide-vue-next';

defineOptions({ inheritAttrs: false });

const props = defineProps({
  // Nombre de la entidad en singular para title/aria-label: "Editar <entity>".
  entity: { type: String, required: true },
  showEdit: { type: Boolean, default: true },
  showDelete: { type: Boolean, default: true },
  deleteDisabled: { type: Boolean, default: false },
});

const emit = defineEmits(['edit', 'delete']);
</script>

<template>
  <button
    v-if="props.showEdit"
    type="button"
    :title="`Editar ${props.entity}`"
    :aria-label="`Editar ${props.entity}`"
    class="inline-flex items-center p-2 rounded-lg text-slate-500 hover:bg-brand-100 hover:text-brand-900 hover:ring-1 hover:ring-inset hover:ring-brand-200 dark:text-gray-400 dark:hover:bg-gray-600 dark:hover:text-white dark:hover:ring-gray-500"
    @click="emit('edit')">
    <Pen class="w-4.5 h-4.5" />
  </button>
  <button
    v-if="props.showDelete"
    type="button"
    :title="`Eliminar ${props.entity}`"
    :aria-label="`Eliminar ${props.entity}`"
    :disabled="props.deleteDisabled"
    class="inline-flex items-center p-2 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 hover:ring-1 hover:ring-inset hover:ring-red-200 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-400 dark:hover:bg-red-500/10 dark:hover:text-red-400 dark:hover:ring-red-500/30"
    @click="emit('delete')">
    <Trash2 class="w-4.5 h-4.5" />
  </button>
</template>
