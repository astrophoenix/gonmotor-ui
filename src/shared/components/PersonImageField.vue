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
    default: true,
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
    perfil="avatar"
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
