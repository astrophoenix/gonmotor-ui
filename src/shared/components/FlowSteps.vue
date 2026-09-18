<script setup>
defineProps({
  steps: {
    type: Array,
    required: true,
  },
});
</script>

<template>
  <ol class="flex items-center w-full text-sm font-medium text-center text-gray-500 dark:text-gray-400 sm:text-base">
    <li
      v-for="(step, index) in steps"
      :key="step.label"
      class="flex items-center"
      :class="[
        index < steps.length - 1
          ? 'md:w-full after:content-[\'\'] after:w-full after:h-1 after:inline-block after:mx-6 xl:after:mx-10'
          : 'flex-none',
        index < steps.length - 1
          ? (step.completed ? 'after:bg-primary-600 dark:after:bg-primary-500' : 'after:bg-gray-200 dark:after:bg-gray-700')
          : '',
      ]"
    >
      <span class="flex items-center">
        <span
          class="me-2 inline-flex flex-none items-center justify-center w-6 h-6 rounded-full text-white text-xs font-semibold whitespace-nowrap"
          :class="step.completed ? 'bg-primary-600 dark:bg-primary-500' : 'bg-gray-400 dark:bg-gray-600'"
        >
          {{ index + 1 }}
        </span>
        <span
          class="whitespace-nowrap"
          :class="step.completed ? 'text-primary-600 dark:text-primary-400' : ''"
        >
          {{ step.label }}
        </span>
      </span>
    </li>
  </ol>
</template>
