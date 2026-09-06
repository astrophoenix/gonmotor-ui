<script setup>
defineProps({
  path: { type: String, required: true },
});
</script>

<template>
  <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path :d="path" />
  </svg>
</template>