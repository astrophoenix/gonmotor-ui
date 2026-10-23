<script setup>
import { CarFront, ClipboardPlus, UserPlus } from 'lucide-vue-next';
import ConsultaPlaca from './ConsultaPlaca.vue';
import { usePermisos } from '../../../shared/composables/usePermisos';

// Cada atajo crea un registro: solo se muestra a quien puede crearlo.
const { puede } = usePermisos();

const BTN = 'inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded shadow-xs focus:ring-4';
const BTN_PRIMARIO = `${BTN} text-white bg-primary-700 hover:bg-primary-800 focus:ring-primary-200 dark:focus:ring-primary-800`;
const BTN_SECUNDARIO = `${BTN} text-heading bg-white border border-default-medium hover:bg-neutral-secondary-medium focus:ring-primary-500/20 dark:bg-gray-800`;
</script>

<template>
  <section class="p-4 mb-4 bg-neutral-primary-soft shadow-xs rounded-base border border-default">
    <div class="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
      <div class="min-w-0">
        <h2 class="text-lg font-semibold text-heading">Accesos rápidos</h2>
        <p class="text-sm text-body">Atajos para lo que más se hace en el taller.</p>
      </div>

      <nav class="flex flex-wrap gap-2" aria-label="Accesos rápidos del dashboard">
        <a v-if="puede('recepciones')" href="/crud/recepciones/agregar/" :class="BTN_PRIMARIO">
          <ClipboardPlus class="w-4 h-4" aria-hidden="true" />
          Nueva recepción
        </a>
        <a v-if="puede('clientes')" href="/crud/clientes/agregar/" :class="BTN_SECUNDARIO">
          <UserPlus class="w-4 h-4" aria-hidden="true" />
          Nuevo cliente
        </a>
        <a v-if="puede('vehiculos')" href="/crud/vehiculos/agregar/" :class="BTN_SECUNDARIO">
          <CarFront class="w-4 h-4" aria-hidden="true" />
          Nuevo vehículo
        </a>
      </nav>
    </div>

    <ConsultaPlaca />
  </section>
</template>
