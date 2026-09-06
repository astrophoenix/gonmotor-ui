<script setup>
import { TESTIGOS } from '../config/testigos';
import MdiIcon from './MdiIcon.vue';

const modelValue = defineModel({ type: Object, required: true });

function toggleTestigo(key) {
  modelValue.value[key] = !modelValue.value[key];
}

function updateObservaciones(value) {
  modelValue.value.otros_testigos_observaciones = value;
}

function getIconClasses(testigo) {
  const isActive = modelValue.value[testigo.key];
  const baseClass = 'w-8 h-8 transition-all duration-200';
  if (!isActive) return `${baseClass} text-gray-400 dark:text-gray-500`;
  if (testigo.color === 'red') return `${baseClass} text-red-500 dark:text-red-400 drop-shadow-[0_0_6px_rgba(239,68,68,0.5)]`;
  if (testigo.color === 'green') return `${baseClass} text-green-500 dark:text-green-400 drop-shadow-[0_0_6px_rgba(34,197,94,0.5)]`;
  return `${baseClass} text-yellow-500 dark:text-yellow-400 drop-shadow-[0_0_6px_rgba(234,179,8,0.5)]`;
}

function getCardClasses(testigo) {
  const isActive = modelValue.value[testigo.key];
  const baseClass = 'flex flex-col items-center justify-center p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 hover:scale-105';
  if (!isActive) return `${baseClass} bg-gray-50 border-gray-200 dark:bg-gray-700 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500`;
  if (testigo.color === 'red') return `${baseClass} bg-red-50 border-red-300 dark:bg-red-900/20 dark:border-red-500 hover:border-red-400`;
  if (testigo.color === 'green') return `${baseClass} bg-green-50 border-green-300 dark:bg-green-900/20 dark:border-green-500 hover:border-green-400`;
  return `${baseClass} bg-yellow-50 border-yellow-300 dark:bg-yellow-900/20 dark:border-yellow-500 hover:border-yellow-400`;
}
</script>

<template>
  <div class="space-y-4">
    <div class="grid grid-cols-5 lg:grid-cols-10 gap-2 lg:gap-3">
      <div
        v-for="testigo in TESTIGOS"
        :key="testigo.key"
        :class="getCardClasses(testigo)"
        @click="toggleTestigo(testigo.key)"
      >
        <MdiIcon :path="testigo.path" :class="getIconClasses(testigo)" />

        <span class="mt-2 text-xs font-medium text-center text-gray-700 dark:text-gray-300">
          {{ testigo.label }}
        </span>
      </div>
    </div>

    <div class="col-span-1">
      <label for="otros_testigos_observaciones" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Otros Testigos u Observaciones del Tablero</label>
      <input
        id="otros_testigos_observaciones"
        :value="modelValue.otros_testigos_observaciones"
        maxlength="255"
        placeholder="Otros testigos o notas adicionales..."
        class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white dark:border-gray-600"
        @input="updateObservaciones($event.target.value)"
      />
    </div>
  </div>
</template>
