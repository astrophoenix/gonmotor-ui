<script setup>
import { onBeforeUnmount, onMounted, ref, useId } from 'vue';
import { Popover } from 'flowbite';
import { Eye } from 'lucide-vue-next';

/**
 * Chip «Modo consulta» para vistas donde el rol puede ver pero no modificar.
 *
 * Es discreto a propósito (gris neutro, ojo, sin candado): describe lo que el
 * usuario SÍ puede hacer. La explicación se abre al tocarlo (`click`, no
 * `hover`) para que funcione igual en táctil. Va en el slot `#title-aside` de
 * `EntityHeader`, junto al título.
 */
const props = defineProps({
  /** Qué se puede consultar, con artículo: «los clientes», «este cliente». */
  objeto: { type: String, required: true },
  /** Qué acciones requieren acceso: «registrar o editar». */
  acciones: { type: String, default: 'registrar o editar' },
});

const id = `modo-consulta-${useId()}`;

const disparadorRef = ref(null);
const popoverRef = ref(null);
let instancia = null;

onMounted(() => {
  instancia = new Popover(popoverRef.value, disparadorRef.value, {
    placement: 'bottom-start',
    triggerType: 'click',
    offset: 8,
  }, { id, override: true });
});

onBeforeUnmount(() => {
  instancia?.destroy();
  instancia = null;
});
</script>

<template>
  <button
    ref="disparadorRef"
    type="button"
    class="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-200 transition-colors hover:bg-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:bg-gray-700 dark:text-gray-300 dark:ring-gray-600 dark:hover:bg-gray-600"
    :aria-describedby="id"
  >
    <Eye class="h-3.5 w-3.5" aria-hidden="true" />
    Modo consulta
  </button>
  <div
    :id="id"
    ref="popoverRef"
    role="tooltip"
    class="absolute z-50 invisible inline-block w-72 text-sm font-normal text-gray-600 transition-opacity duration-300 bg-white border border-gray-200 rounded-lg shadow-sm opacity-0 dark:text-gray-300 dark:bg-gray-800 dark:border-gray-600"
  >
    <p class="p-3">
      Puedes consultar {{ props.objeto }}. Si necesitas {{ props.acciones }}, un administrador de la empresa puede darte acceso.
    </p>
    <div data-popper-arrow></div>
  </div>
</template>
