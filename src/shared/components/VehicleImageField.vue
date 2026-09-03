<script setup>
import { ref, watch } from 'vue';

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

const localPreview = ref('');
const imageError = ref('');
const dragging = ref(false);
const showImageModal = ref(false);

const maxSizeMB = Math.round(props.maxSize / (1024 * 1024));

function isTypeAllowed(type) {
  return props.allowedTypes.some((allowed) => {
    if (allowed.includes('*')) {
      return new RegExp('^' + allowed.replace('*', '.*') + '$').test(type);
    }
    // soporta "image/*"
    if (allowed.endsWith('/*')) {
      return type.startsWith(allowed.slice(0, -2));
    }
    return allowed === type;
  });
}

function onFileChange(event) {
  const file = event.target.files[0];
  if (!file) return;
  handleFile(file);
}

function onDrop(event) {
  dragging.value = false;
  const file = event.dataTransfer.files[0];
  if (!file) return;
  handleFile(file);
}

function handleFile(file) {
  if (!isTypeAllowed(file.type)) {
    imageError.value = 'Formato no permitido. Solo JPG, PNG o WebP.';
    return;
  }

  if (file.size > props.maxSize) {
    imageError.value = `La imagen supera el tamaño máximo permitido de ${maxSizeMB}MB.`;
    return;
  }

  imageError.value = '';

  if (localPreview.value) {
    URL.revokeObjectURL(localPreview.value);
  }

  const previewUrl = URL.createObjectURL(file);
  localPreview.value = previewUrl;
  emit('upload', file);
  emit('update:imageUrl', previewUrl);
}

function cancelImage() {
  if (localPreview.value) {
    URL.revokeObjectURL(localPreview.value);
    localPreview.value = '';
  }
  imageError.value = '';
  emit('remove');
  emit('update:imageUrl', '');
}

function resetPreview() {
  if (localPreview.value) {
    URL.revokeObjectURL(localPreview.value);
    localPreview.value = '';
  }
}

function currentImage() {
  return localPreview.value || props.imageUrl;
}

function openPreview() {
  if (props.previewable && currentImage()) {
    showImageModal.value = true;
  }
}

function closePreview() {
  showImageModal.value = false;
}

watch(
  () => props.imageUrl,
  (newUrl) => {
    if (!newUrl && localPreview.value) {
      localPreview.value = '';
    }
  }
);

defineExpose({ resetPreview });
</script>

<template>
  <div
    class="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-600 dark:bg-gray-700"
    :class="[
      dragging ? 'border-primary-500 ring-2 ring-primary-300' : '',
      imageError ? 'border-red-500' : '',
    ]"
    @dragover.prevent="dragging = true"
    @dragleave.prevent="dragging = false"
    @drop.prevent="onDrop"
  >
    <div
      class="relative h-40 w-full overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center"
      :class="{ 'cursor-zoom-in': previewable && (localPreview || imageUrl) }"
      @click="openPreview"
    >
      <img
        v-if="localPreview || imageUrl"
        :src="localPreview || imageUrl"
        class="h-full w-full object-cover"
        :alt="previewable ? 'Vista previa (clic para ampliar)' : 'Imagen del vehículo'"
      />
      <span
        v-if="previewable && (localPreview || imageUrl)"
        class="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition hover:bg-black/20 hover:opacity-100"
      >
        <svg class="w-8 h-8 text-white drop-shadow" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
          <path stroke="currentColor" stroke-linecap="round" strokeWidth="2" d="m21 21-4-4m-1-7a6 6 0 1 1-12 0 6 6 0 0 1 12 0Z"/>
          <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" strokeWidth="2" d="M8 11h6m-3-3v6"/>
        </svg>
      </span>
      <span v-else-if="!localPreview && !imageUrl" class="flex flex-col items-center justify-center gap-2 px-4 text-center">
        <svg class="w-10 h-10 text-gray-400 dark:text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
          <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m3 16 5-7 2 2 3-4 8.5 9H3Z"/>
          <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 20h8m-4-4v4"/>
        </svg>
        <span class="text-xs text-gray-500 dark:text-gray-400">{{ hint }}</span>
      </span>
    </div>

    <label
      class="mt-2 flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:border-gray-500 dark:text-gray-300 dark:hover:bg-gray-600"
      :class="{ 'opacity-50 cursor-not-allowed': disabled }"
    >
      <svg class="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v14m-7-7h14"/>
      </svg>
      {{ localPreview || imageUrl ? 'Reemplazar' : 'Subir' }}
      <input type="file" class="sr-only" :accept="allowedTypes.join(',')" :disabled="disabled" @change="onFileChange" />
    </label>

    <p v-if="imageError" class="mt-2 text-xs text-red-600 dark:text-red-400">{{ imageError }}</p>
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
        :src="currentImage()"
        class="max-h-[90vh] max-w-[90vw] object-contain"
        alt="Imagen ampliada del vehículo"
      />
    </div>
  </div>
</template>