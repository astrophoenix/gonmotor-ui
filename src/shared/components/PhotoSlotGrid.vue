<script setup>
import { reactive, watch } from 'vue';
import ImageField from './ImageField.vue';

const props = defineProps({
  slots: {
    type: Array,
    required: true,
  },
  existing: {
    type: Object,
    default: () => ({}),
  },
  errors: {
    type: Object,
    default: () => ({}),
  },
  maxSize: {
    type: Number,
    default: 5 * 1024 * 1024,
  },
  allowedTypes: {
    type: Array,
    default: () => ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  },
  previewable: {
    type: Boolean,
    default: false,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['update:files', 'change']);

const files = reactive(
  Object.fromEntries(
    props.slots.map((s) => [
      s.key,
      { file: null, previewUrl: null, existingUrl: props.existing[s.key] || null },
    ])
  )
);

function onChange(key, payload) {
  const file = payload.file || null;
  files[key].file = file;
  files[key].previewUrl = file ? payload.src : null;
  // La imagen guardada deja de aplicar: se reemplazó o se quitó.
  files[key].existingUrl = null;
  emit('update:files', files);
  emit('change');
}

watch(
  () => props.existing,
  (existing) => {
    Object.keys(existing).forEach((key) => {
      if (files[key] && !files[key].file) {
        files[key].existingUrl = existing[key] || null;
      }
    });
  },
  { deep: true }
);

function getPresence() {
  const presence = {};
  props.slots.forEach((s) => {
    presence[s.key] = Boolean(files[s.key].file || files[s.key].existingUrl);
  });
  return presence;
}

function getFiles() {
  const result = {};
  props.slots.forEach((s) => {
    if (files[s.key].file) {
      result[s.key] = files[s.key].file;
    }
  });
  return result;
}

function reset() {
  props.slots.forEach((s) => {
    files[s.key].file = null;
    files[s.key].previewUrl = null;
    files[s.key].existingUrl = null;
  });
}

function hasAllFiles() {
  return props.slots.every((s) => files[s.key].file || files[s.key].existingUrl);
}

defineExpose({ getFiles, reset, hasAllFiles, getPresence });
</script>

<template>
  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
    <ImageField
      v-for="s in slots"
      :key="s.key"
      :label="s.label"
      :alt="s.label"
      :required="s.required"
      :file="files[s.key].file"
      :image-url="files[s.key].existingUrl || ''"
      :error="errors[s.key] || ''"
      :max-size="maxSize"
      :allowed-types="allowedTypes"
      :previewable="previewable"
      :disabled="disabled"
      empty-label="Subir foto"
      @upload="onChange(s.key, { file: $event, src: '', hasImage: true })"
      @change="onChange(s.key, $event)"
    />
  </div>
</template>
