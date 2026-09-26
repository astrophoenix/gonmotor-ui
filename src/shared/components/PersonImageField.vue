<script setup>
import { ref } from 'vue';
import ImageField from './ImageField.vue';

defineProps({
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
    default: 1 * 1024 * 1024,
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
  imgAlt: {
    type: String,
    default: 'Foto de la persona',
  },
});

const emit = defineEmits(['update:imageUrl', 'upload', 'remove']);

const field = ref(null);

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
    :alt="imgAlt"
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
