<script setup>
import { reactive, ref, watch } from 'vue';

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
    default: 2 * 1024 * 1024,
  },
  allowedTypes: {
    type: Array,
    default: () => ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  },
  previewable: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['update:files', 'change']);

const previewSrc = ref('');
const showImageModal = ref(false);

const files = reactive(
  Object.fromEntries(
    props.slots.map((s) => [s.key, { file: null, previewUrl: null, existingUrl: props.existing[s.key] || null }])
  )
);
const slotErrors = reactive(
  Object.fromEntries(props.slots.map((s) => [s.key, '']))
);

function onFileSelected(key, event) {
  const input = event.target;
  const file = input && input.files[0];
  if (!file) {
    return;
  }

  if (!props.allowedTypes.includes(file.type)) {
    slotErrors[key] = 'Formato no permitido. Solo JPG, PNG o WebP.';
    return;
  }

  if (file.size > props.maxSize) {
    slotErrors[key] = 'La imagen supera el tamaño máximo permitido (' + Math.round(props.maxSize / (1024 * 1024)) + 'MB).';
    return;
  }

  slotErrors[key] = '';
  if (files[key].previewUrl) {
    URL.revokeObjectURL(files[key].previewUrl);
  }
  files[key].file = file;
  files[key].previewUrl = URL.createObjectURL(file);
  files[key].existingUrl = null;
  emitFilesChanged();
}

function removeFile(key) {
  if (files[key].previewUrl) {
    URL.revokeObjectURL(files[key].previewUrl);
  }
  files[key].file = null;
  files[key].previewUrl = null;
  files[key].existingUrl = null;
  slotErrors[key] = '';
  emitFilesChanged();
}

function emitFilesChanged() {
  emit('update:files', files);
  emit('change');
}

function resetError(key) {
  slotErrors[key] = '';
}

watch(
  () => props.existing,
  (existing) => {
    Object.keys(existing).forEach((key) => {
      if (files[key]) {
        files[key].existingUrl = existing[key] || null;
      }
    });
  },
  { deep: true }
);

defineExpose({
  getFiles,
  reset,
  hasAllFiles,
  getPresence,
});

function openPreview(key) {
  if (!props.previewable) return;
  const src = files[key].previewUrl || files[key].existingUrl;
  if (src) {
    previewSrc.value = src;
    showImageModal.value = true;
  }
}

function closePreview() {
  showImageModal.value = false;
  previewSrc.value = '';
}

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
    if (files[s.key].previewUrl) {
      URL.revokeObjectURL(files[s.key].previewUrl);
    }
    files[s.key].file = null;
    files[s.key].previewUrl = null;
    files[s.key].existingUrl = null;
    slotErrors[s.key] = '';
  });
}

function hasAllFiles() {
  return props.slots.every((s) => files[s.key].file || files[s.key].existingUrl);
}
</script>

<template>
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
    <div
      v-for="s in slots"
      :key="s.key"
      class="border border-gray-200 rounded-lg p-3 dark:border-gray-600 bg-gray-50 dark:bg-gray-700"
      :class="{ 'border-red-500': errors[s.key] || slotErrors[s.key] }"
    >
      <p class="mb-2 text-sm font-medium text-gray-900 dark:text-white">{{ s.label }}</p>

      <div
        class="relative aspect-square w-full overflow-hidden rounded-lg bg-gray-200 dark:bg-gray-800 flex items-center justify-center"
        :class="{ 'cursor-zoom-in': previewable && (files[s.key].previewUrl || files[s.key].existingUrl) }"
        @click="openPreview(s.key)"
      >
        <img
          v-if="files[s.key].previewUrl || files[s.key].existingUrl"
          :src="files[s.key].previewUrl || files[s.key].existingUrl"
          :alt="s.label"
          class="h-full w-full object-cover"
        />
        <span
          v-if="previewable && (files[s.key].previewUrl || files[s.key].existingUrl)"
          class="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition hover:bg-black/20 hover:opacity-100"
        >
          <svg class="w-8 h-8 text-white drop-shadow" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
            <path stroke="currentColor" stroke-linecap="round" strokeWidth="2" d="m21 21-4-4m-1-7a6 6 0 1 1-12 0 6 6 0 0 1 12 0Z"/>
            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" strokeWidth="2" d="M8 11h6m-3-3v6"/>
          </svg>
        </span>
        <span v-if="!files[s.key].previewUrl && !files[s.key].existingUrl" class="text-xs text-gray-500 dark:text-gray-400">Sin foto</span>

        <button
          v-if="files[s.key].previewUrl || files[s.key].existingUrl"
          type="button"
          class="absolute top-1 right-1 inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-600 text-white hover:bg-red-700"
          aria-label="Eliminar foto"
          @click.stop="removeFile(s.key)"
        >
          <svg class="w-4 h-4" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18 17.94 6M18 18 6.06 6"/>
          </svg>
        </button>
      </div>

      <label class="mt-2 flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:border-gray-500 dark:text-gray-300 dark:hover:bg-gray-600">
        <svg class="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
          <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v14m-7-7h14"/>
        </svg>
        {{ files[s.key].file || files[s.key].existingUrl ? 'Reemplazar' : 'Subir foto' }}
        <input
          type="file"
          :accept="allowedTypes.join(',')"
          class="sr-only"
          @change="onFileSelected(s.key, $event)"
        />
      </label>
      <p v-if="errors[s.key]" class="mt-1 text-xs text-red-600 dark:text-red-400">{{ errors[s.key] }}</p>
      <p v-else-if="slotErrors[s.key]" class="mt-1 text-xs text-red-600 dark:text-red-400">{{ slotErrors[s.key] }}</p>
    </div>
  </div>

  <div
    v-if="showImageModal"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
    @click="closePreview"
  >
    <div
      class="relative max-h-[90vh] max-w-[90vw] overflow-hidden rounded-lg bg-white dark:bg-gray-800 shadow-xl"
      @click.stop
    >
      <button
        type="button"
        class="absolute top-2 right-2 z-10 inline-flex items-center justify-center w-8 h-8 rounded-full bg-black/50 text-white hover:bg-black/70"
        aria-label="Cerrar"
        @click="closePreview"
      >
        <svg class="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
          <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18 17 7M18 6 7 17"/>
        </svg>
      </button>
      <img
        :src="previewSrc"
        class="max-h-[90vh] max-w-[90vw] object-contain"
        alt="Foto ampliada"
      />
    </div>
  </div>
</template>