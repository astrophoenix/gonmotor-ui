<script setup>
import { computed, ref } from 'vue';
import ImageField from './ImageField.vue';

const props = defineProps({
  imageUrl: {
    type: String,
    default: '',
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  // Por defecto, los límites publicados por el backend para el perfil.
  maxSize: {
    type: Number,
    default: null,
  },
  allowedTypes: {
    type: Array,
    default: null,
  },
  hint: {
    type: String,
    default: '',
  },
  previewable: {
    type: Boolean,
    default: false,
  },
  // `landscape` (4:3) o `wide` (2:1) para formularios densos.
  aspect: {
    type: String,
    default: 'landscape',
  },
});

const emit = defineEmits(['update:imageUrl', 'upload', 'remove']);

const field = ref(null);

const alt = computed(() =>
  props.previewable ? 'Vista previa (clic para ampliar)' : 'Imagen del vehículo',
);

function resetPreview() {
  if (field.value) field.value.resetPreview();
}

function clear() {
  if (field.value) field.value.clearImage();
}

function onUpload(file) {
  emit('upload', file);
}

function onUpdateImageUrl(url) {
  emit('update:imageUrl', url);
}

function onRemove() {
  emit('remove');
  emit('update:imageUrl', '');
}

defineExpose({ resetPreview, clear });
</script>

<template>
  <ImageField
    ref="field"
    :image-url="imageUrl"
    :alt="alt"
    perfil="vehiculo"
    :max-size="maxSize"
    :allowed-types="allowedTypes"
    :hint="hint"
    :previewable="previewable"
    :disabled="disabled"
    :aspect="aspect"
    empty-label="Subir imagen"
    @upload="onUpload"
    @remove="onRemove"
    @update:image-url="onUpdateImageUrl"
  />
</template>
