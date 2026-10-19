<script setup>
import { Compass } from 'lucide-vue-next';

/**
 * Pantalla neutra para cuando se llega por URL directa a una página que el rol
 * no puede consultar (normalmente el enlace ya no aparece en el menú). Sin
 * candados ni rojo: explica y ofrece un camino de vuelta.
 */
const props = defineProps({
  /** Nombre de la sección, p. ej. «Clientes». */
  seccion: { type: String, default: 'esta sección' },
});
</script>

<template>
  <div class="flex min-h-[60vh] items-center justify-center p-4">
    <div class="max-w-md text-center">
      <span class="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-gray-700 dark:text-gray-400">
        <Compass class="h-6 w-6" aria-hidden="true" />
      </span>
      <h1 class="mt-4 text-lg font-semibold text-gray-900 dark:text-white">{{ props.seccion }} no está disponible para tu usuario</h1>
      <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
        Si la necesitas para tu trabajo, un administrador de la empresa puede darte acceso.
      </p>
      <a
        href="/"
        class="mt-6 inline-flex items-center px-4 py-2 text-sm font-medium text-white rounded-lg bg-brand-900 hover:bg-brand-700 focus:outline-none focus:ring-4 focus:ring-brand-300 dark:bg-brand-600 dark:hover:bg-brand-500 dark:focus:ring-brand-700"
      >
        Ir al inicio
      </a>
    </div>
  </div>
</template>
