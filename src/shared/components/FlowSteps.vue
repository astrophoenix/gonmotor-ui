<script setup>
import { Check, X } from 'lucide-vue-next';

defineProps({
  steps: {
    type: Array,
    required: true,
  },
});

function stateOf(step) {
  return step.state || (step.completed ? 'completed' : 'pending');
}

function circleClass(step) {
  const state = stateOf(step);
  if (state === 'completed') return 'bg-primary-600 dark:bg-primary-500 text-white';
  if (state === 'current')
    return 'bg-white border-2 border-primary-600 text-primary-600 dark:bg-gray-800 dark:border-primary-500 dark:text-primary-400';
  if (state === 'rejected') return 'bg-red-600 dark:bg-red-500 text-white';
  return 'bg-gray-400 dark:bg-gray-600 text-white';
}

function connectorClass(step) {
  const state = stateOf(step);
  if (state === 'completed') return 'bg-primary-600 dark:bg-primary-500';
  if (state === 'rejected') return 'bg-red-400 dark:bg-red-500';
  return 'bg-gray-200 dark:bg-gray-700';
}

function labelClass(step) {
  const state = stateOf(step);
  if (state === 'completed' || state === 'current')
    return 'text-primary-600 dark:text-primary-400';
  if (state === 'rejected') return 'text-red-600 dark:text-red-400';
  return '';
}

function statusClass(step) {
  const state = stateOf(step);
  if (state === 'completed' || state === 'current')
    return 'text-primary-600 dark:text-primary-400';
  if (state === 'rejected') return 'text-red-600 dark:text-red-400';
  return 'text-gray-500 dark:text-gray-400';
}
</script>

<template>
  <ol
    class="flex items-start w-full text-sm font-medium text-center text-gray-500 dark:text-gray-400 sm:text-base"
  >
    <li
      v-for="(step, index) in steps"
      :key="step.label"
      class="flex flex-col"
      :class="index < steps.length - 1 ? 'md:w-full' : 'flex-none'"
    >
      <div class="flex items-center">
        <span
          class="me-2 inline-flex flex-none items-center justify-center w-6 h-6 rounded-full text-xs font-semibold whitespace-nowrap"
          :class="circleClass(step)"
        >
          <Check v-if="stateOf(step) === 'completed'" class="w-3.5 h-3.5" />
          <X v-else-if="stateOf(step) === 'rejected'" class="w-3.5 h-3.5" />
          <template v-else>{{ index + 1 }}</template>
        </span>
        <span class="whitespace-nowrap" :class="labelClass(step)">
          <h3 class="font-medium leading-tight">{{ step.label }}</h3>
          <p v-if="step.status" class="text-xs font-medium whitespace-nowrap text-gray-500 dark:text-gray-400" :class="statusClass(step)">
            {{ step.status }}
          </p>
        </span>
        <span
          v-if="index < steps.length - 1"
          class="hidden md:block h-1 flex-1 mx-6 rounded-full"
          :class="connectorClass(step)"
        ></span>
      </div>
      
    </li>
  </ol>
</template>