<script setup>
import { computed } from 'vue';
import { Save } from 'lucide-vue-next';
// import { IconX } from '@tabler/icons-vue';


const props = defineProps({
  isLoading: {
    type: Boolean,
    default: false,
  },
  isEditMode: {
    type: Boolean,
    default: false,
  },
  cancelHref: {
    type: String,
    required: true,
  },
  onSubmit: {
    type: Function,
    required: true,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  icon: {
    type: [Object, Function],
    default: () => Save,
  },
  text: {
    type: String,
    default: 'Guardar',
  },
  color: {
    type: String,
    default: 'primary',
  },
});

const COLORES = {
  primary: 'bg-primary-500 border-primary-500 hover:bg-primary-600 focus:ring-primary-300',
  brand: 'bg-brand-900 border-brand-900 hover:bg-brand-700 focus:ring-brand-300',
  info: 'bg-info border-info hover:bg-blue-700 focus:ring-blue-300',
  success: 'bg-success border-success hover:bg-green-700 focus:ring-green-300',
  warning: 'bg-warning border-warning hover:bg-amber-700 focus:ring-amber-300',
  danger: 'bg-danger border-danger hover:bg-red-700 focus:ring-red-300',
};

const colorClass = computed(() => COLORES[props.color] || COLORES.primary);

function handleSubmit() {
  if (props.isLoading || props.disabled) {
    return;
  }
  props.onSubmit();
}
</script>

<template>
  <div class="flex items-center justify-end gap-3">
    <!--a
      :href="disabled ? undefined : cancelHref"
      :aria-disabled="disabled"
      :tabindex="disabled ? -1 : undefined"
      class="inline-flex items-center gap-2 px-5 py-2.5 text-body bg-neutral-primary border border-default shadow-xs hover:bg-neutral-secondary-soft hover:text-heading focus:ring-4 focus:ring-neutral-tertiary font-medium leading-5 rounded-base text-sm focus:outline-none"
      :class="{ 'pointer-events-none opacity-60 cursor-not-allowed': disabled }">
      <IconX class="w-5 h-5 text-gray-900" />
      Cancelar
    </a-->
    <button
      type="button"
      :disabled="isLoading || disabled"
      @click="handleSubmit"
      class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white rounded border focus:ring-4 disabled:opacity-50 disabled:cursor-not-allowed"
      :class="colorClass">
      <component :is="icon" class="w-5 h-5 text-white" />
      {{ isLoading ? 'Guardando...' : text }}
    </button>
  </div>
</template>
