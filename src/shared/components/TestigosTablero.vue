<script setup>
import { computed } from 'vue';

const modelValue = defineModel({ type: Object, required: true });

const testigos = computed(() => [
  {
    key: 'testigo_check_engine',
    label: 'Check Engine',
    color: 'yellow',
    icon: 'checkEngine',
  },
  {
    key: 'testigo_abs',
    label: 'ABS',
    color: 'yellow',
    icon: 'abs',
  },
  {
    key: 'testigo_airbag',
    label: 'Airbag',
    color: 'red',
    icon: 'airbag',
  },
  {
    key: 'testigo_bateria',
    label: 'Batería',
    color: 'red',
    icon: 'battery',
  },
  {
    key: 'testigo_aceite',
    label: 'Presión de Aceite',
    color: 'red',
    icon: 'oil',
  },
  {
    key: 'testigo_temperatura',
    label: 'Temperatura',
    color: 'yellow',
    icon: 'temperature',
  },
]);

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
  return `${baseClass} text-yellow-500 dark:text-yellow-400 drop-shadow-[0_0_6px_rgba(234,179,8,0.5)]`;
}

function getCardClasses(testigo) {
  const isActive = modelValue.value[testigo.key];
  const baseClass = 'flex flex-col items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 hover:scale-105';
  if (!isActive) return `${baseClass} bg-gray-50 border-gray-200 dark:bg-gray-700 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500`;
  if (testigo.color === 'red') return `${baseClass} bg-red-50 border-red-300 dark:bg-red-900/20 dark:border-red-500 hover:border-red-400`;
  return `${baseClass} bg-yellow-50 border-yellow-300 dark:bg-yellow-900/20 dark:border-yellow-500 hover:border-yellow-400`;
}
</script>

<template>
  <div class="space-y-4">
    <div class="grid grid-cols-3 md:grid-cols-6 gap-3">
      <div
        v-for="testigo in testigos"
        :key="testigo.key"
        :class="getCardClasses(testigo)"
        @click="toggleTestigo(testigo.key)"
      >
        <svg
          v-if="testigo.icon === 'checkEngine'"
          :class="getIconClasses(testigo)"
          fill="none"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
          stroke="currentColor"
          stroke-width="2"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>

        <svg
          v-else-if="testigo.icon === 'abs'"
          :class="getIconClasses(testigo)"
          fill="none"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
          stroke="currentColor"
          stroke-width="2"
        >
          <circle cx="12" cy="12" r="9" />
          <text x="12" y="15" text-anchor="middle" font-size="6" font-weight="bold" fill="currentColor" stroke="none">ABS</text>
        </svg>

        <svg
          v-else-if="testigo.icon === 'airbag'"
          :class="getIconClasses(testigo)"
          fill="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M12 2C8.13 2 5 5.13 5 9c0 2.5 1.5 4.5 3.5 5.5L12 22l3.5-7.5C17.5 13.5 19 11.5 19 9c0-3.87-3.13-7-7-7zm0 2c2.76 0 5 2.24 5 5s-2.24 5-5 5-5-2.24-5-5 2.24-5 5-5z" />
          <circle cx="12" cy="9" r="2.5" fill="white" />
        </svg>

        <svg
          v-else-if="testigo.icon === 'battery'"
          :class="getIconClasses(testigo)"
          fill="none"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
          stroke="currentColor"
          stroke-width="2"
        >
          <rect x="2" y="7" width="18" height="10" rx="2" ry="2" />
          <line x1="22" y1="11" x2="22" y2="13" />
          <line x1="6" y1="11" x2="6" y2="13" />
          <line x1="10" y1="11" x2="10" y2="13" />
          <line x1="14" y1="11" x2="14" y2="13" />
        </svg>

        <svg
          v-else-if="testigo.icon === 'oil'"
          :class="getIconClasses(testigo)"
          fill="none"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M12 2C12 2 19 9 19 14C19 17.87 15.87 21 12 21C8.13 21 5 17.87 5 14C5 9 12 2 12 2Z" />
          <path d="M9 14C9 14 10 16 12 16C14 16 15 14 15 14" />
        </svg>

        <svg
          v-else-if="testigo.icon === 'temperature'"
          :class="getIconClasses(testigo)"
          fill="none"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" />
          <circle cx="11.5" cy="17.5" r="1.5" fill="currentColor" />
        </svg>

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
