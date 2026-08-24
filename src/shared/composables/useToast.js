import { ref } from 'vue';

const toasts = ref([]);
const DEFAULT_DURATION = 5000;
let counter = 0;

function remove(id) {
  toasts.value = toasts.value.filter((t) => t.id !== id);
}

function add({ message, type = 'info', duration = DEFAULT_DURATION }) {
  const id = counter++;
  const toast = { id, message, type, duration };

  toasts.value.push(toast);

  if (duration > 0) {
    setTimeout(() => remove(id), duration);
  }

  return id;
}

export function useToast() {
  return {
    toasts,
    showSuccess: (message, duration) => add({ message, type: 'success', duration }),
    showError: (message, duration) => add({ message, type: 'error', duration }),
    showInfo: (message, duration) => add({ message, type: 'info', duration }),
    removeToast: remove,
  };
}
