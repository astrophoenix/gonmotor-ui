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
});

const emit = defineEmits(['update:imageUrl', 'upload', 'remove']);

const localPreview = ref('');
const imageError = ref('');

function onFileChange(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (!props.allowedTypes.includes(file.type)) {
    imageError.value = 'Formato no permitido. Solo JPG, PNG o WebP.';
    return;
  }

  if (file.size > props.maxSize) {
    imageError.value = 'La imagen supera el tamaño máximo permitido de 2MB.';
    return;
  }

  imageError.value = '';

  if (localPreview.value) {
    URL.revokeObjectURL(localPreview.value);
  }

  const previewUrl = URL.createObjectURL(file);
  localPreview.value = previewUrl;
  emit('upload', file);
}

function cancelImage() {
  if (localPreview.value) {
    URL.revokeObjectURL(localPreview.value);
    localPreview.value = '';
  }
  imageError.value = '';
  emit('remove');
}

function resetPreview() {
  if (localPreview.value) {
    URL.revokeObjectURL(localPreview.value);
    localPreview.value = '';
  }
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
  <div class="flex items-start space-x-6 p-2.5 border border-gray-200 rounded-lg dark:border-gray-700">
    <div class="h-40 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700 overflow-hidden border border-gray-200 dark:border-gray-600">
      <img v-if="localPreview || imageUrl" :src="localPreview || imageUrl" class="w-full h-full object-contain" alt="Imagen del vehículo">
      <svg v-if="!localPreview && !imageUrl" 
      class="w-full h-full vehicle-placeholder-icon" 
      viewBox="0 0 256 158.7" xmlns="http://www.w3.org/2000/svg" 
      aria-hidden="true">
        <path fill="currentColor" d="M80.1 129.2c0 15.2-12.3 27.5-27.5 27.5-15.2 0-27.5-12.3-27.5-27.5s12.3-27.5 27.5-27.5c15.2 0 27.5 12.3 27.5 27.5zm-13.5 0c0-7.4-6.1-13.5-13.5-13.5-7.4 0-13.5 6.1-13.5 13.5 0 7.4 6.1 13.5 13.5 13.5s13.5-6.1 13.5-13.5zM231.2 129.2c0 15.2-12.3 27.5-27.5 27.5s-27.5-12.3-27.5-27.5 12.3-27.5 27.5-27.5 27.5 12.3 27.5 27.5zm-13.5 0c0-7.4-6.1-13.5-13.5-13.5-7.4 0-13.5 6.1-13.5 13.5 0 7.4 6.1 13.5 13.5 13.5s13.5-6.1 13.5-13.5zM253.8 104.7H248v0l0-28.1c0-8.8-7.1-15.9-16-15.9h-26c-.6 0-1.2-.3-1.6-.7l-44.5-49c-2-2-4.8-3.2-7.7-3.3l-83.5 0c-6.8 0-12.6 4.4-15.1 10.6L34.4 58.9c-.2 1-1.1 1.7-2.2 1.7h0C22.2 60.7 8 60.7 8 78.9v23.5c0 1.2-1 2.2-2.2 2.2H2.2c-1.2 0-2.2 1-2.2 2.2v7.5c0 5.6 4.6 10.2 10.2 10.2h4.1c1.1 0 2-.8 2.2-1.8 3-17.2 18.1-30.4 36.2-30.4 18.1 0 33.1 13.1 36.1 30.3.2 1.1 1.1 1.8 2.2 1.8h74.4c1.1 0 2-.8 2.2-1.8 3-17.2 18-30.3 36.1-30.3 18.1 0 33.1 13.1 36.1 30.3.2 1.1 1.1 1.8 2.2 1.8h3.8c5.7 0 10.2-4.6 10.2-10.2v-7.4c0-1.2-1-2.2-2.2-2.2zM103.8 57.7c0 1.2-1 2.1-2.1 2.1H52.9c-1.4 0-2.4-1.3-2.1-2.6l14.1-33.8c.4-1.7 1.8-3 3.6-3h33.2c1.2 0 2.1 1 2.1 2.1v34.3zm69.8 1.5h-59.2c-1.1 0-2.1-.9-2.1-2.1v-34c0-1.1.9-2.1 2.1-2.1h29.3c.6 0 1.1.2 1.5.7l29.9 34c.6.6.8 1.4.6 2.3z"/>
      </svg>
    </div>
    <div class="flex-1">
      <p class="mb-4 text-sm text-gray-500 dark:text-gray-400">JPG, PNG o WebP. Máximo 2MB</p>
      <div class="flex items-center space-x-3">
        <label class="inline-flex items-center px-4 py-2 text-sm font-medium text-center text-white rounded-lg bg-primary-700 hover:bg-primary-800 focus:ring-4 focus:ring-primary-300 dark:bg-primary-600 dark:hover:bg-primary-700 dark:focus:ring-primary-800 cursor-pointer">
          <svg class="w-4 h-4 mr-2 -ml-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M5.5 13a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.977A4.5 4.5 0 1113.5 13H11V9.413l1.293 1.293a1 1 0 001.414-1.414l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13H5.5z"></path><path d="M9 13h2v5a1 1 0 11-2 0v-5z"></path></svg>
          Subir
          <input type="file" class="hidden" accept="image/*" @change="onFileChange">
        </label>
        <button type="button" :disabled="disabled || (!imageUrl && !localPreview)" @click="cancelImage" class="inline-flex items-center py-2 px-3 text-sm font-medium text-gray-900 focus:outline-none bg-white rounded-lg border border-gray-200 hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-4 focus:ring-gray-200 dark:focus:ring-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600 dark:hover:text-white dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed">
          <svg class="w-4 h-4 mr-2 -ml-1 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 7h14m-9 3v8m4-8v8M10 3h4a1 1 0 0 1 1 1v3H9V4a1 1 0 0 1 1-1ZM6 7h12v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V7Z"/>
          </svg>
          Borrar
        </button>
      </div>
      <p v-if="imageError" class="mt-3 text-sm text-red-600 dark:text-red-500">{{ imageError }}</p>
      <p v-if="!imageUrl" class="mt-3 text-sm text-gray-500 dark:text-gray-400">Sin imagen registrada</p>
    </div>
  </div>
</template>

<style scoped>
.vehicle-placeholder-icon {
  color: #9d9b9b;
  padding: 15px;
}
</style>
