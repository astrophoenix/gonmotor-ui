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
  maxSize: {
    type: Number,
    default: 2 * 1024 * 1024,
  },
  allowedTypes: {
    type: Array,
    default: () => ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  },
  hint: {
    type: String,
    default: 'JPG, PNG o WebP.',
  },
  previewable: {
    type: Boolean,
    default: false,
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
    :max-size="maxSize"
    :allowed-types="allowedTypes"
    :hint="hint"
    :previewable="previewable"
    :disabled="disabled"
    aspect="landscape"
    empty-label="Subir imagen"
    @upload="onUpload"
    @remove="onRemove"
    @update:image-url="onUpdateImageUrl"
  />
</template>
