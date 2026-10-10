<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { MoreVertical } from 'lucide-vue-next';

defineProps({
  disabled: { type: Boolean, default: false },
  width: { type: String, default: 'w-52' },
});

const abierto = ref(false);
const pos = ref({ top: 0, left: 0 });
const triggerRef = ref(null);
const menuRef = ref(null);

async function alternar(event) {
  if (abierto.value) {
    cerrar();
    return;
  }
  triggerRef.value = event.currentTarget;
  abierto.value = true;
  await nextTick();
  posicionar();
}

function posicionar() {
  const trigger = triggerRef.value;
  if (!trigger) return;
  const rect = trigger.getBoundingClientRect();
  const ancho = menuRef.value?.offsetWidth || 208;
  const alto = menuRef.value?.offsetHeight || 140;
  let top = rect.bottom + 4;
  if (top + alto > window.innerHeight - 8) top = Math.max(8, rect.top - alto - 4);
  let left = rect.right - ancho;
  if (left < 8) left = 8;
  pos.value = { top, left };
}

function cerrar() {
  abierto.value = false;
}

function onKeydown(event) {
  if (event.key === 'Escape') cerrar();
}

onMounted(() => document.addEventListener('keydown', onKeydown));
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown));
</script>

<template>
  <button
    ref="triggerRef"
    type="button"
    title="Más acciones"
    aria-label="Más acciones"
    :aria-expanded="abierto"
    :disabled="disabled"
    class="px-1.5 py-1.5 inline-flex items-center p-2 text-gray-900 rounded border border-gray-300 hover:bg-primary-100 hover:text-primary-600 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-100 dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:text-primary-400"
    @click.stop="alternar"
  >
    <MoreVertical class="w-5 h-5" />
  </button>
  <Teleport to="body">
    <div v-if="abierto" class="fixed inset-0 z-40" @click="cerrar" @contextmenu.prevent="cerrar" />
    <div
      v-if="abierto"
      ref="menuRef"
      class="fixed z-50 overflow-hidden rounded-base border border-default bg-white py-1 shadow-md dark:border-default dark:bg-gray-800"
      :class="width"
      :style="{ top: `${pos.top}px`, left: `${pos.left}px` }"
      role="menu"
      aria-label="Más acciones"
    >
      <slot :cerrar="cerrar" />
    </div>
  </Teleport>
</template>